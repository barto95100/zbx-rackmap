-- Mise à niveau 0.9 -> 0.10 (MySQL / MariaDB) : sens de numérotation des U par baie. À exécuter une seule fois.
ALTER TABLE rackmap_rack ADD COLUMN u_desc smallint NOT NULL DEFAULT 0;
