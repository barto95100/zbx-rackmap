-- Mise à niveau 0.3 -> 0.4 : interface Zabbix optionnelle par extrémité de câble (animation selon le débit).
-- sudo -u postgres psql zabbix -f upgrade-0.4.postgresql.sql
ALTER TABLE rackmap_link ADD COLUMN IF NOT EXISTS a_iface varchar(64) NOT NULL DEFAULT '';
ALTER TABLE rackmap_link ADD COLUMN IF NOT EXISTS b_iface varchar(64) NOT NULL DEFAULT '';
