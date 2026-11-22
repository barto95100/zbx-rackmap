-- Mise à niveau 0.8 -> 0.9 (MySQL / MariaDB) : nombre et disposition des disques. À exécuter une seule fois.
ALTER TABLE rackmap_device ADD COLUMN disks smallint NOT NULL DEFAULT -1;
ALTER TABLE rackmap_device ADD COLUMN disk_orient smallint NOT NULL DEFAULT 0;
