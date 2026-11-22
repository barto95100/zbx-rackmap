-- Mise à niveau 0.7 -> 0.8 (MySQL / MariaDB) : plusieurs débits SFP + demi-largeur. À exécuter une seule fois.
ALTER TABLE rackmap_device ADD COLUMN sfp_spec varchar(128) NOT NULL DEFAULT '';
ALTER TABLE rackmap_device ADD COLUMN slot smallint NOT NULL DEFAULT 0;
