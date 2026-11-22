-- Mise à niveau 0.5 -> 0.6 (MySQL / MariaDB) : datacenter (site) par baie. À exécuter une seule fois.
ALTER TABLE rackmap_rack ADD COLUMN site varchar(128) NOT NULL DEFAULT '';
