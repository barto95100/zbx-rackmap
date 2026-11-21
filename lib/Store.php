<?php declare(strict_types = 0);

namespace Modules\Rackmap\Lib;

/**
 * Accès aux tables rackmap_* (SQL brut via l'API base de données du frontend Zabbix).
 * PostgreSQL et MySQL/MariaDB.
 */
class Store {

	private static ?bool $hasIface = null;

	/** Les colonnes a_iface / b_iface existent-elles (mise à niveau 0.4 appliquée) ? */
	private static function hasIface(): bool {
		if (self::$hasIface === null) {
			global $DB;

			$schema = $DB['TYPE'] == ZBX_DB_POSTGRESQL ? 'current_schema()' : 'DATABASE()';
			self::$hasIface = (bool) DBfetch(DBselect("SELECT 1 FROM information_schema.columns WHERE table_schema=".$schema.
				" AND table_name='rackmap_link' AND column_name='a_iface'"));
		}

		return self::$hasIface;
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

		foreach (DBfetchArray(DBselect('SELECT rackid,name,units,description FROM rackmap_rack ORDER BY name')) as $r) {
			$racks[(int) $r['rackid']] = [
				'id' => (int) $r['rackid'], 'name' => $r['name'], 'units' => (int) $r['units'],
				'description' => $r['description'], 'devices' => [], 'links' => []
			];
		}

		foreach (DBfetchArray(DBselect('SELECT deviceid,rackid,name,type,hostid,u_pos,u_height,ports FROM rackmap_device ORDER BY u_pos')) as $d) {
			if (!isset($racks[(int) $d['rackid']])) {
				continue;
			}
			$racks[(int) $d['rackid']]['devices'][] = [
				'id' => (int) $d['deviceid'], 'name' => $d['name'], 'type' => $d['type'],
				'hostid' => $d['hostid'] === null ? null : (string) $d['hostid'],
				'u_pos' => (int) $d['u_pos'], 'u_height' => (int) $d['u_height'], 'ports' => (int) $d['ports']
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

		DBstart();
		$ok = false;

		try {
			$rackid = (int) ($rack['id'] ?? 0);

			if ($rackid > 0) {
				DBexecute('UPDATE rackmap_rack SET name='.zbx_dbstr($name).',units='.$units.',description='.
					zbx_dbstr(mb_substr((string) ($rack['description'] ?? ''), 0, 255)).' WHERE rackid='.$rackid);
				DBexecute('DELETE FROM rackmap_link WHERE rackid='.$rackid);
				DBexecute('DELETE FROM rackmap_device WHERE rackid='.$rackid);
			}
			else {
				$rackid = self::nextId('rackmap_rack', 'rackid');
				DBexecute('INSERT INTO rackmap_rack (rackid,name,units,description) VALUES ('.$rackid.','.zbx_dbstr($name).','.$units.','.
					zbx_dbstr(mb_substr((string) ($rack['description'] ?? ''), 0, 255)).')');
			}

			$map = [];

			foreach ((array) ($rack['devices'] ?? []) as $d) {
				$id = self::nextId('rackmap_device', 'deviceid');
				$map[(string) ($d['id'] ?? $id)] = $id;
				$pos = max(1, min($units, (int) ($d['u_pos'] ?? 1)));
				$height = max(1, min($units - $pos + 1, (int) ($d['u_height'] ?? 1)));
				$hostid = (isset($d['hostid']) && ctype_digit((string) $d['hostid'])) ? (string) $d['hostid'] : 'NULL';

				DBexecute('INSERT INTO rackmap_device (deviceid,rackid,name,type,hostid,u_pos,u_height,ports) VALUES ('.
					$id.','.$rackid.','.zbx_dbstr(mb_substr((string) ($d['name'] ?? ''), 0, 128)).','.
					zbx_dbstr(preg_replace('/[^a-z_]/', '', strtolower((string) ($d['type'] ?? 'other')))).','.
					$hostid.','.$pos.','.$height.','.max(0, min(96, (int) ($d['ports'] ?? 0))).')');
			}

			foreach ((array) ($rack['links'] ?? []) as $l) {
				$a = $map[(string) ($l['a'] ?? '')] ?? null;
				$b = $map[(string) ($l['b'] ?? '')] ?? null;

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
