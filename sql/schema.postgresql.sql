-- Rackmap : tables du module (PostgreSQL). À exécuter une fois, avec l'utilisateur de la base Zabbix.
-- Exemple : sudo -u postgres psql zabbix -f schema.postgresql.sql
-- hostid n'est volontairement pas une clé étrangère : supprimer un hôte ne casse pas la baie.

CREATE TABLE IF NOT EXISTS rackmap_rack (
	rackid       bigserial PRIMARY KEY,
	name         varchar(128) NOT NULL,
	units        integer      NOT NULL DEFAULT 42,
	description  varchar(255) NOT NULL DEFAULT '',
	site         varchar(128) NOT NULL DEFAULT ''   -- datacenter / site (regroupement des baies)
);

CREATE TABLE IF NOT EXISTS rackmap_device (
	deviceid  bigserial PRIMARY KEY,
	rackid    bigint       NOT NULL REFERENCES rackmap_rack (rackid) ON DELETE CASCADE,
	name      varchar(128) NOT NULL,
	type      varchar(32)  NOT NULL DEFAULT 'server',   -- server, switch, router, firewall, patch, pdu, ups, storage, other
	hostid    bigint       NULL,                        -- hôte Zabbix associé (NULL = équipement passif)
	u_pos     integer      NOT NULL,                    -- U du bas de l'équipement (1 = bas de la baie)
	u_height  integer      NOT NULL DEFAULT 1,
	ports     integer      NOT NULL DEFAULT 0,            -- ports RJ45
	sfp_ports integer      NOT NULL DEFAULT 0,            -- ports SFP/QSFP
	sfp_speed integer      NOT NULL DEFAULT 10            -- débit SFP en Gb/s (1, 10, 25, 40, 100, 200, 400)
);
CREATE INDEX IF NOT EXISTS rackmap_device_rack ON rackmap_device (rackid);

CREATE TABLE IF NOT EXISTS rackmap_link (
	linkid      bigserial PRIMARY KEY,
	rackid      bigint      NOT NULL REFERENCES rackmap_rack (rackid) ON DELETE CASCADE,
	a_device    bigint      NOT NULL REFERENCES rackmap_device (deviceid) ON DELETE CASCADE,
	a_port      varchar(32) NOT NULL DEFAULT '',
	b_device    bigint      NOT NULL REFERENCES rackmap_device (deviceid) ON DELETE CASCADE,
	b_port      varchar(32) NOT NULL DEFAULT '',
	cable_type  varchar(32) NOT NULL DEFAULT 'rj45',    -- rj45, fiber, dac, power, other
	color       varchar(16) NOT NULL DEFAULT '',
	label       varchar(128) NOT NULL DEFAULT '',
	a_iface     varchar(64)  NOT NULL DEFAULT '',   -- interface Zabbix côté A (vide = le port) pour le trafic
	b_iface     varchar(64)  NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS rackmap_link_rack ON rackmap_link (rackid);
