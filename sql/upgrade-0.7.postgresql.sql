-- Mise à niveau 0.6 -> 0.7 : ports SFP (nombre + débit en Gb/s) par équipement.
-- sudo -u postgres psql zabbix -f upgrade-0.7.postgresql.sql
ALTER TABLE rackmap_device ADD COLUMN IF NOT EXISTS sfp_ports integer NOT NULL DEFAULT 0;
ALTER TABLE rackmap_device ADD COLUMN IF NOT EXISTS sfp_speed integer NOT NULL DEFAULT 10;
