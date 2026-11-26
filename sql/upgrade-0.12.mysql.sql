-- Mise à niveau 0.11 -> 0.12 (MySQL / MariaDB) : vue avant/arrière. À exécuter une seule fois.
ALTER TABLE rackmap_device ADD COLUMN port_face smallint NOT NULL DEFAULT 0;
ALTER TABLE rackmap_device ADD COLUMN pp_media smallint NOT NULL DEFAULT 0;
ALTER TABLE rackmap_link ADD COLUMN a_face smallint NOT NULL DEFAULT 0;
ALTER TABLE rackmap_link ADD COLUMN b_face smallint NOT NULL DEFAULT 0;
