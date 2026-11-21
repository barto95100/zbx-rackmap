-- Baie de démonstration (MySQL / MariaDB), sans hôte associé : tous les équipements apparaissent « Passif ».
INSERT INTO rackmap_rack (name, units, description) VALUES ('Baie demo', 12, 'Exemple');
SET @r = LAST_INSERT_ID();
INSERT INTO rackmap_device (rackid, name, type, u_pos, u_height, ports) VALUES
	(@r, 'Switch cœur', 'switch', 11, 1, 24), (@r, 'Firewall', 'firewall', 10, 1, 8),
	(@r, 'PVE1', 'server', 7, 2, 4), (@r, 'PVE2', 'server', 5, 2, 4),
	(@r, 'NAS', 'storage', 3, 2, 4), (@r, 'Onduleur', 'ups', 1, 2, 0);
INSERT INTO rackmap_link (rackid, a_device, a_port, b_device, b_port, cable_type)
SELECT @r, a.deviceid, p.ap, b.deviceid, p.bp, p.ct FROM rackmap_device a, rackmap_device b,
	(SELECT 'Switch cœur' an, '1' ap, 'Firewall' bn, '1' bp, 'rj45' ct UNION ALL SELECT 'Switch cœur','2','PVE1','1','rj45'
	 UNION ALL SELECT 'Switch cœur','3','PVE2','1','rj45' UNION ALL SELECT 'Switch cœur','4','NAS','1','fiber') p
WHERE a.rackid = @r AND b.rackid = @r AND a.name = p.an AND b.name = p.bn;
