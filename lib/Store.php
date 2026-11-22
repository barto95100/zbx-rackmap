<?php declare(strict_types = 0);

namespace Modules\Rackmap\Lib;

/**
 * Accès aux tables rackmap_* (SQL brut via l'API base de données du frontend Zabbix).
 * PostgreSQL et MySQL/MariaDB.
 */
class Store {

	private static array $cols = [];

	/** La colonne existe-t-elle (mises à niveau 0.4 / 0.6 appliquées) ? */
	private static function hasCol(string $table, string $col): bool {
		$k = $table.'.'.$col;

		if (!isset(self::$cols[$k])) {
			global $DB;

			$schema = $DB['TYPE'] == ZBX_DB_POSTGRESQL ? 'current_schema()' : 'DATABASE()';
			self::$cols[$k] = (bool) DBfetch(DBselect('SELECT 1 FROM information_schema.columns WHERE table_schema='.$schema.
				" AND table_name=".zbx_dbstr($table).' AND column_name='.zbx_dbstr($col)));
		}

		return self::$cols[$k];
	}

	private static function hasIface(): bool {
		return self::hasCol('rackmap_link', 'a_iface');
	}

	public static function ready(): bool {
		try {
			DBfetch(DBselect('SELECT 1 FROM rackmap_rack WHERE 1=0'));
			return true;
		}
		catch (\Throwable $e) {
			return false;
		}
	}

	/** Toutes les baies avec équipements et liens. */
	public static function all(): array {
		$racks = [];

		foreach (DBfetchArray(DBselect('SELECT rackid,name,units,description'.(self::hasCol('rackmap_rack', 'site') ? ',site' : '').' FROM rackmap_rack ORDER BY name')) as $r) {
			$racks[(int) $r['rackid']] = [
				'id' => (int) $r['rackid'], 'name' => $r['name'], 'units' => (int) $r['units'],
				'description' => $r['description'], 'site' => $r['site'] ?? '', 'devices' => [], 'links' => []
			];
		}

		foreach (DBfetchArray(DBselect('SELECT deviceid,rackid,name,type,hostid,u_pos,u_height,ports'.(self::hasCol('rackmap_device', 'sfp_ports') ? ',sfp_ports,sfp_speed' : '').' FROM rackmap_device ORDER BY u_pos')) as $d) {
			if (!isset($racks[(int) $d['rackid']])) {
				continue;
			}
			$racks[(int) $d['rackid']]['devices'][] = [
				'id' => (int) $d['deviceid'], 'name' => $d['name'], 'type' => $d['type'],
				'hostid' => $d['hostid'] === null ? null : (string) $d['hostid'],
				'u_pos' => (int) $d['u_pos'], 'u_height' => (int) $d['u_height'], 'ports' => (int) $d['ports'],
				'sfp' => (int) ($d['sfp_ports'] ?? 0), 'sfp_speed' => (int) ($d['sfp_speed'] ?? 10)
			];
		}

		$ifc = self::hasIface() ? ',a_iface,b_iface' : '';

		foreach (DBfetchArray(DBselect('SELECT linkid,rackid,a_device,a_port,b_device,b_port,cable_type,color,label'.$ifc.' FROM rackmap_link')) as $l) {
			if (!isset($racks[(int) $l['rackid']])) {
				continue;
			}
			$racks[(int) $l['rackid']]['links'][] = [
				'id' => (int) $l['linkid'], 'a' => (int) $l['a_device'], 'a_port' => $l['a_port'],
				'b' => (int) $l['b_device'], 'b_port' => $l['b_port'],
				'cable' => $l['cable_type'], 'color' => $l['color'], 'label' => $l['label'],
				'a_iface' => $l['a_iface'] ?? '', 'b_iface' => $l['b_iface'] ?? ''
			];
		}

		return array_values($racks);
	}

	/**
	 * Remplace toute la définition d'une baie (équipements + liens) dans une transaction.
	 * Les équipements/liens du client portent des identifiants temporaires ; la correspondance est refaite ici.
	 */
	public static function save(array $rack): int {
		$name = trim((string) ($rack['name'] ?? ''));
		$units = max(1, min(60, (int) ($rack['units'] ?? 42)));

		if ($name === '') {
			throw new \InvalidArgumentException('name');
		}

		$site = mb_substr(trim((string) ($rack['site'] ?? '')), 0, 128);
		$hasSite = self::hasCol('rackmap_rack', 'site');
		$desc = zbx_dbstr(mb_substr((string) ($rack['description'] ?? ''), 0, 255));

		DBstart();
		$ok = false;

		try {
			$rackid = (int) ($rack['id'] ?? 0);
			$existing = [];

			if ($rackid > 0) {
				DBexecute('UPDATE rackmap_rack SET name='.zbx_dbstr($name).',units='.$units.',description='.$desc.
					($hasSite ? ',site='.zbx_dbstr($site) : '').' WHERE rackid='.$rackid);
				DBexecute('DELETE FROM rackmap_link WHERE rackid='.$rackid);

				foreach (DBfetchArray(DBselect('SELECT deviceid FROM rackmap_device WHERE rackid='.$rackid)) as $r) {
					$existing[(string) $r['deviceid']] = true;
				}
			}
			else {
				$rackid = self::nextId('rackmap_rack', 'rackid');
				DBexecute('INSERT INTO rackmap_rack (rackid,name,units,description'.($hasSite ? ',site' : '').') VALUES ('.
					$rackid.','.zbx_dbstr($name).','.$units.','.$desc.($hasSite ? ','.zbx_dbstr($site) : '').')');
			}

			// les équipements existants gardent leur identifiant (les câbles venant d'autres baies restent valides)
			$map = [];
			$kept = [];

			foreach ((array) ($rack['devices'] ?? []) as $d) {
				$cid = (string) ($d['id'] ?? '');
				$pos = max(1, min($units, (int) ($d['u_pos'] ?? 1)));
				$height = max(1, min($units - $pos + 1, (int) ($d['u_height'] ?? 1)));
				$hostid = (isset($d['hostid']) && ctype_digit((string) $d['hostid'])) ? (string) $d['hostid'] : 'NULL';
				$dname = zbx_dbstr(mb_substr((string) ($d['name'] ?? ''), 0, 128));
				$type = zbx_dbstr(preg_replace('/[^a-z_]/', '', strtolower((string) ($d['type'] ?? 'other'))));
				$ports = max(0, min(96, (int) ($d['ports'] ?? 0)));
				$hasSfp = self::hasCol('rackmap_device', 'sfp_ports');
				$sfp = max(0, min(48, (int) ($d['sfp'] ?? 0)));
				$speed = in_array((int) ($d['sfp_speed'] ?? 10), [1, 10, 25, 40, 100, 200, 400], true) ? (int) $d['sfp_speed'] : 10;

				if ($cid !== '' && isset($existing[$cid])) {
					DBexecute('UPDATE rackmap_device SET name='.$dname.',type='.$type.',hostid='.$hostid.',u_pos='.$pos.
						',u_height='.$height.',ports='.$ports.($hasSfp ? ',sfp_ports='.$sfp.',sfp_speed='.$speed : '').' WHERE deviceid='.(int) $cid.' AND rackid='.$rackid);
					$map[$cid] = (int) $cid;
					$kept[$cid] = true;
					continue;
				}

				$id = self::nextId('rackmap_device', 'deviceid');
				$map[$cid !== '' ? $cid : (string) $id] = $id;
				DBexecute('INSERT INTO rackmap_device (deviceid,rackid,name,type,hostid,u_pos,u_height,ports'.($hasSfp ? ',sfp_ports,sfp_speed' : '').') VALUES ('.
					$id.','.$rackid.','.$dname.','.$type.','.$hostid.','.$pos.','.$height.','.$ports.($hasSfp ? ','.$sfp.','.$speed : '').')');
			}

			foreach ($existing as $cid => $_) {
				if (!isset($kept[$cid])) {
					DBexecute('DELETE FROM rackmap_device WHERE deviceid='.(int) $cid);
				}
			}

			// extrémité située dans une autre baie : équipement existant uniquement
			$foreign = static function ($id) use ($rackid): ?int {
				if (!ctype_digit((string) $id) || (int) $id <= 0) {
					return null;
				}

				return DBfetch(DBselect('SELECT deviceid FROM rackmap_device WHERE deviceid='.(int) $id.' AND rackid<>'.$rackid))
					? (int) $id : null;
			};

			foreach ((array) ($rack['links'] ?? []) as $l) {
				$ka = (string) ($l['a'] ?? '');
				$kb = (string) ($l['b'] ?? '');

				if (!isset($map[$ka]) && !isset($map[$kb])) {
					continue;
				}

				$a = $map[$ka] ?? $foreign($ka);
				$b = $map[$kb] ?? $foreign($kb);

				if ($a === null || $b === null || $a === $b) {
					continue;
				}

				$cols = 'rackid,a_device,a_port,b_device,b_port,cable_type,color,label';
				$vals = $rackid.','.$a.','.zbx_dbstr(mb_substr((string) ($l['a_port'] ?? ''), 0, 32)).','.$b.','.
					zbx_dbstr(mb_substr((string) ($l['b_port'] ?? ''), 0, 32)).','.
					zbx_dbstr(preg_replace('/[^a-z0-9_]/', '', strtolower((string) ($l['cable'] ?? 'rj45')))).','.
					zbx_dbstr(preg_replace('/[^#0-9a-fA-F]/', '', (string) ($l['color'] ?? ''))).','.
					zbx_dbstr(mb_substr((string) ($l['label'] ?? ''), 0, 128));

				if (self::hasIface()) {
					$cols .= ',a_iface,b_iface';
					$vals .= ','.zbx_dbstr(mb_substr((string) ($l['a_iface'] ?? ''), 0, 64)).','.
						zbx_dbstr(mb_substr((string) ($l['b_iface'] ?? ''), 0, 64));
				}

				DBexecute('INSERT INTO rackmap_link ('.$cols.') VALUES ('.$vals.')');
			}

			$ok = true;
		}
		finally {
			DBend($ok);
		}

		return $rackid;
	}

	public static function delete(int $rackid): void {
		DBexecute('DELETE FROM rackmap_rack WHERE rackid='.$rackid);
	}

	/** PostgreSQL : séquence ; MySQL/MariaDB : MAX+1 (écriture réservée aux administrateurs, dans une transaction). */
	private static function nextId(string $table, string $column): int {
		global $DB;

		if ($DB['TYPE'] == ZBX_DB_POSTGRESQL) {
			$row = DBfetch(DBselect("SELECT nextval(pg_get_serial_sequence('".$table."','".$column."')) AS id"));
		}
		else {
			$row = DBfetch(DBselect('SELECT COALESCE(MAX('.$column.'),0)+1 AS id FROM '.$table));
		}

		return (int) $row['id'];
	}
}
