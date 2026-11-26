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

	private const SFP_SPEEDS = [1, 10, 25, 40, 100, 200, 400];

	/** "10:4,100:2" -> [['n' => 4, 'speed' => 10], ['n' => 2, 'speed' => 100]] (ancien format : sfp_ports + sfp_speed). */
	private static function parseSfp(string $spec, int $count, int $speed): array {
		$groups = [];

		if ($spec !== '') {
			foreach (explode(',', $spec) as $part) {
				[$sp, $n] = array_pad(explode(':', $part), 2, '0');

				if ((int) $n > 0 && in_array((int) $sp, self::SFP_SPEEDS, true)) {
					$groups[] = ['n' => (int) $n, 'speed' => (int) $sp];
				}
			}
		}
		elseif ($count > 0) {
			$groups[] = ['n' => $count, 'speed' => in_array($speed, self::SFP_SPEEDS, true) ? $speed : 10];
		}

		return $groups;
	}

	/** Toutes les baies avec équipements et liens. */
	public static function all(): array {
		$racks = [];

		foreach (DBfetchArray(DBselect('SELECT rackid,name,units,description'.(self::hasCol('rackmap_rack', 'site') ? ',site' : '').(self::hasCol('rackmap_rack', 'u_desc') ? ',u_desc' : '').' FROM rackmap_rack ORDER BY name')) as $r) {
			$racks[(int) $r['rackid']] = [
				'id' => (int) $r['rackid'], 'name' => $r['name'], 'units' => (int) $r['units'],
				'description' => $r['description'], 'site' => $r['site'] ?? '', 'u_desc' => (int) ($r['u_desc'] ?? 0), 'devices' => [], 'links' => []
			];
		}

		foreach (DBfetchArray(DBselect('SELECT deviceid,rackid,name,type,hostid,u_pos,u_height,ports'.(self::hasCol('rackmap_device', 'sfp_ports') ? ',sfp_ports,sfp_speed' : '').(self::hasCol('rackmap_device', 'sfp_spec') ? ',sfp_spec' : '').(self::hasCol('rackmap_device', 'slot') ? ',slot' : '').(self::hasCol('rackmap_device', 'disks') ? ',disks,disk_orient' : '').(self::hasCol('rackmap_device', 'port_face') ? ',port_face,pp_media' : '').' FROM rackmap_device ORDER BY u_pos')) as $d) {
			if (!isset($racks[(int) $d['rackid']])) {
				continue;
			}
			$racks[(int) $d['rackid']]['devices'][] = [
				'id' => (int) $d['deviceid'], 'name' => $d['name'], 'type' => $d['type'],
				'hostid' => $d['hostid'] === null ? null : (string) $d['hostid'],
				'u_pos' => (int) $d['u_pos'], 'u_height' => (int) $d['u_height'], 'ports' => (int) $d['ports'],
				'sfp_groups' => self::parseSfp((string) ($d['sfp_spec'] ?? ''), (int) ($d['sfp_ports'] ?? 0), (int) ($d['sfp_speed'] ?? 10)),
				'slot' => (int) ($d['slot'] ?? 0),
				'disks' => (int) ($d['disks'] ?? -1), 'disk_orient' => (int) ($d['disk_orient'] ?? 0),
				'port_face' => (int) ($d['port_face'] ?? 0), 'pp_media' => (int) ($d['pp_media'] ?? 0)
			];
		}

		$ifc = (self::hasIface() ? ',a_iface,b_iface' : '').(self::hasCol('rackmap_link', 'a_face') ? ',a_face,b_face' : '');

		foreach (DBfetchArray(DBselect('SELECT linkid,rackid,a_device,a_port,b_device,b_port,cable_type,color,label'.$ifc.' FROM rackmap_link')) as $l) {
			if (!isset($racks[(int) $l['rackid']])) {
				continue;
			}
			$racks[(int) $l['rackid']]['links'][] = [
				'id' => (int) $l['linkid'], 'a' => (int) $l['a_device'], 'a_port' => $l['a_port'],
				'b' => (int) $l['b_device'], 'b_port' => $l['b_port'],
				'cable' => $l['cable_type'], 'color' => $l['color'], 'label' => $l['label'],
				'a_iface' => $l['a_iface'] ?? '', 'b_iface' => $l['b_iface'] ?? '',
				'a_face' => (int) ($l['a_face'] ?? 0), 'b_face' => (int) ($l['b_face'] ?? 0)
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
		$hasDesc = self::hasCol('rackmap_rack', 'u_desc');
		$udesc = (int) ($rack['u_desc'] ?? 0) === 1 ? 1 : 0;
		$desc = zbx_dbstr(mb_substr((string) ($rack['description'] ?? ''), 0, 255));

		DBstart();
		$ok = false;

		try {
			$rackid = (int) ($rack['id'] ?? 0);
			$existing = [];

			if ($rackid > 0) {
				DBexecute('UPDATE rackmap_rack SET name='.zbx_dbstr($name).',units='.$units.',description='.$desc.
					($hasSite ? ',site='.zbx_dbstr($site) : '').($hasDesc ? ',u_desc='.$udesc : '').' WHERE rackid='.$rackid);
				DBexecute('DELETE FROM rackmap_link WHERE rackid='.$rackid);

				foreach (DBfetchArray(DBselect('SELECT deviceid FROM rackmap_device WHERE rackid='.$rackid)) as $r) {
					$existing[(string) $r['deviceid']] = true;
				}
			}
			else {
				$rackid = self::nextId('rackmap_rack', 'rackid');
				DBexecute('INSERT INTO rackmap_rack (rackid,name,units,description'.($hasSite ? ',site' : '').($hasDesc ? ',u_desc' : '').') VALUES ('.
					$rackid.','.zbx_dbstr($name).','.$units.','.$desc.($hasSite ? ','.zbx_dbstr($site) : '').($hasDesc ? ','.$udesc : '').')');
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
				$groups = [];
				$totalSfp = 0;

				foreach (array_slice((array) ($d['sfp_groups'] ?? []), 0, 6) as $gx) {
					$gn = max(0, min(48 - $totalSfp, (int) ($gx['n'] ?? 0)));
					$gs = (int) ($gx['speed'] ?? 10);

					if ($gn > 0 && in_array($gs, self::SFP_SPEEDS, true)) {
						$groups[] = $gs.':'.$gn;
						$totalSfp += $gn;
					}
				}

				$extra = [];

				if (self::hasCol('rackmap_device', 'sfp_ports')) {
					$extra['sfp_ports'] = (string) $totalSfp;
					$extra['sfp_speed'] = (string) ($groups ? (int) explode(':', $groups[0])[0] : 10);
				}
				if (self::hasCol('rackmap_device', 'sfp_spec')) {
					$extra['sfp_spec'] = zbx_dbstr(implode(',', $groups));
				}
				if (self::hasCol('rackmap_device', 'disks')) {
					$extra['disks'] = (string) max(-1, min(60, (int) ($d['disks'] ?? -1)));
					$extra['disk_orient'] = (string) ((int) ($d['disk_orient'] ?? 0) === 1 ? 1 : 0);
				}
				if (self::hasCol('rackmap_device', 'port_face')) {
					$extra['port_face'] = (string) ((int) ($d['port_face'] ?? 0) === 1 ? 1 : 0);
					$extra['pp_media'] = (string) ((int) ($d['pp_media'] ?? 0) === 1 ? 1 : 0);
				}
				if (self::hasCol('rackmap_device', 'slot')) {
					$extra['slot'] = (string) max(0, min(2, (int) ($d['slot'] ?? 0)));
				}

				if ($cid !== '' && isset($existing[$cid])) {
					DBexecute('UPDATE rackmap_device SET name='.$dname.',type='.$type.',hostid='.$hostid.',u_pos='.$pos.
						',u_height='.$height.',ports='.$ports.self::setList($extra).' WHERE deviceid='.(int) $cid.' AND rackid='.$rackid);
					$map[$cid] = (int) $cid;
					$kept[$cid] = true;
					continue;
				}

				$id = self::nextId('rackmap_device', 'deviceid');
				$map[$cid !== '' ? $cid : (string) $id] = $id;
				DBexecute('INSERT INTO rackmap_device (deviceid,rackid,name,type,hostid,u_pos,u_height,ports'.($extra ? ','.implode(',', array_keys($extra)) : '').') VALUES ('.
					$id.','.$rackid.','.$dname.','.$type.','.$hostid.','.$pos.','.$height.','.$ports.($extra ? ','.implode(',', $extra) : '').')');
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

				if (self::hasCol('rackmap_link', 'a_face')) {
					$cols .= ',a_face,b_face';
					$vals .= ','.((int) ($l['a_face'] ?? 0) === 1 ? 1 : 0).','.((int) ($l['b_face'] ?? 0) === 1 ? 1 : 0);
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

	/** ['a' => '1', 'b' => "'x'"] -> ",a=1,b='x'" */
	private static function setList(array $extra): string {
		$out = '';

		foreach ($extra as $col => $val) {
			$out .= ','.$col.'='.$val;
		}

		return $out;
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
