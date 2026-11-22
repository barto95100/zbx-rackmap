-- Mise à niveau 0.5 -> 0.6 : datacenter (site) par baie.
-- sudo -u postgres psql zabbix -f upgrade-0.6.postgresql.sql
ALTER TABLE rackmap_rack ADD COLUMN IF NOT EXISTS site varchar(128) NOT NULL DEFAULT '';
