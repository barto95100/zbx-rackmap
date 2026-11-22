-- Mise à niveau 0.9 -> 0.10 : sens de numérotation des U par baie (0 bas->haut, 1 haut->bas).
-- sudo -u postgres psql zabbix -f upgrade-0.10.postgresql.sql
ALTER TABLE rackmap_rack ADD COLUMN IF NOT EXISTS u_desc smallint NOT NULL DEFAULT 0;
