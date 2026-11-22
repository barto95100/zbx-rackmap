-- Mise à niveau 0.8 -> 0.9 : nombre et disposition des disques (serveurs, NAS).
-- sudo -u postgres psql zabbix -f upgrade-0.9.postgresql.sql
ALTER TABLE rackmap_device ADD COLUMN IF NOT EXISTS disks smallint NOT NULL DEFAULT -1;
ALTER TABLE rackmap_device ADD COLUMN IF NOT EXISTS disk_orient smallint NOT NULL DEFAULT 0;
