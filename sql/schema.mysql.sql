-- Rackmap : tables du module (MySQL / MariaDB). À exécuter une fois, sur la base Zabbix.
-- Exemple : mysql -u root -p zabbix < schema.mysql.sql
-- hostid n'est volontairement pas une clé étrangère : supprimer un hôte ne casse pas la baie.

CREATE TABLE IF NOT EXISTS rackmap_rack (
	rackid       bigint unsigned NOT NULL AUTO_INCREMENT,
	name         varchar(128) NOT NULL,
	units        int NOT NULL DEFAULT 42,
	description  varchar(255) NOT NULL DEFAULT '',
	site         varchar(128) NOT NULL DEFAULT '',
	u_desc       smallint NOT NULL DEFAULT 0,
	PRIMARY KEY (rackid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE IF NOT EXISTS rackmap_device (
	deviceid  bigint unsigned NOT NULL AUTO_INCREMENT,
	rackid    bigint unsigned NOT NULL,
	name      varchar(128) NOT NULL,
	type      varchar(32)  NOT NULL DEFAULT 'server',
	hostid    bigint unsigned NULL,
	u_pos     int NOT NULL,
	u_height  int NOT NULL DEFAULT 1,
	ports     int NOT NULL DEFAULT 0,
	sfp_ports int NOT NULL DEFAULT 0,
	sfp_speed int NOT NULL DEFAULT 10,
	sfp_spec  varchar(128) NOT NULL DEFAULT '',
	slot      smallint NOT NULL DEFAULT 0,
	disks     smallint NOT NULL DEFAULT -1,
	disk_orient smallint NOT NULL DEFAULT 0,
	PRIMARY KEY (deviceid),
	KEY rackmap_device_rack (rackid),
	CONSTRAINT rackmap_device_rack_fk FOREIGN KEY (rackid) REFERENCES rackmap_rack (rackid) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE IF NOT EXISTS rackmap_link (
	linkid      bigint unsigned NOT NULL AUTO_INCREMENT,
	rackid      bigint unsigned NOT NULL,
	a_device    bigint unsigned NOT NULL,
	a_port      varchar(32)  NOT NULL DEFAULT '',
	b_device    bigint unsigned NOT NULL,
	b_port      varchar(32)  NOT NULL DEFAULT '',
	cable_type  varchar(32)  NOT NULL DEFAULT 'rj45',
	color       varchar(16)  NOT NULL DEFAULT '',
	label       varchar(128) NOT NULL DEFAULT '',
	a_iface     varchar(64)  NOT NULL DEFAULT '',
	b_iface     varchar(64)  NOT NULL DEFAULT '',
	PRIMARY KEY (linkid),
	KEY rackmap_link_rack (rackid),
	CONSTRAINT rackmap_link_rack_fk FOREIGN KEY (rackid) REFERENCES rackmap_rack (rackid) ON DELETE CASCADE,
	CONSTRAINT rackmap_link_a_fk FOREIGN KEY (a_device) REFERENCES rackmap_device (deviceid) ON DELETE CASCADE,
	CONSTRAINT rackmap_link_b_fk FOREIGN KEY (b_device) REFERENCES rackmap_device (deviceid) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- Droits : si le frontend utilise un autre utilisateur que celui qui exécute ce script
-- GRANT SELECT,INSERT,UPDATE,DELETE ON zabbix.rackmap_rack TO 'zabbix'@'%';  (idem rackmap_device, rackmap_link)
