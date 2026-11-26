-- Mise à niveau 0.11 -> 0.12 : vue avant/arrière (face des ports, média des patch panels, face des câbles).
-- sudo -u postgres psql zabbix -f upgrade-0.12.postgresql.sql
ALTER TABLE rackmap_device ADD COLUMN IF NOT EXISTS port_face smallint NOT NULL DEFAULT 0;
ALTER TABLE rackmap_device ADD COLUMN IF NOT EXISTS pp_media smallint NOT NULL DEFAULT 0;
ALTER TABLE rackmap_link ADD COLUMN IF NOT EXISTS a_face smallint NOT NULL DEFAULT 0;
ALTER TABLE rackmap_link ADD COLUMN IF NOT EXISTS b_face smallint NOT NULL DEFAULT 0;
