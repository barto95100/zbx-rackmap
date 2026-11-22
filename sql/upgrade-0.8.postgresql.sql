-- Mise à niveau 0.7 -> 0.8 : plusieurs débits SFP par équipement + équipements demi-largeur.
-- sudo -u postgres psql zabbix -f upgrade-0.8.postgresql.sql
ALTER TABLE rackmap_device ADD COLUMN IF NOT EXISTS sfp_spec varchar(128) NOT NULL DEFAULT '';
ALTER TABLE rackmap_device ADD COLUMN IF NOT EXISTS slot smallint NOT NULL DEFAULT 0;
