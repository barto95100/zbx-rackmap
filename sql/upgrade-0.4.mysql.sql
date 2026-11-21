-- Mise à niveau 0.3 -> 0.4 (MySQL / MariaDB) : interface Zabbix optionnelle par extrémité de câble.
-- À exécuter une seule fois (erreur "Duplicate column" si déjà appliqué : sans gravité).
ALTER TABLE rackmap_link ADD COLUMN a_iface varchar(64) NOT NULL DEFAULT '';
ALTER TABLE rackmap_link ADD COLUMN b_iface varchar(64) NOT NULL DEFAULT '';
