-- Mise à niveau 0.6 -> 0.7 (MySQL / MariaDB) : ports SFP par équipement. À exécuter une seule fois.
ALTER TABLE rackmap_device ADD COLUMN sfp_ports int NOT NULL DEFAULT 0;
ALTER TABLE rackmap_device ADD COLUMN sfp_speed int NOT NULL DEFAULT 10;
