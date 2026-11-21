-- Baie de démonstration (sans hôte associé : tous les équipements apparaissent « Passif »).
-- Associez ensuite un hôte à chaque équipement : UPDATE rackmap_device SET hostid = <hostid> WHERE name = '...';
WITH r AS (INSERT INTO rackmap_rack (name, units, description) VALUES ('Baie demo', 12, 'Exemple') RETURNING rackid),
d AS (
	INSERT INTO rackmap_device (rackid, name, type, u_pos, u_height, ports)
	SELECT rackid, v.name, v.type, v.u_pos, v.u_height, v.ports FROM r, (VALUES
		('Switch cœur', 'switch', 11, 1, 24),
		('Firewall', 'firewall', 10, 1, 8),
		('PVE1', 'server', 7, 2, 4),
		('PVE2', 'server', 5, 2, 4),
		('NAS', 'storage', 3, 2, 4),
		('Onduleur', 'ups', 1, 2, 0)
	) AS v(name, type, u_pos, u_height, ports)
	RETURNING deviceid, rackid, name
)
INSERT INTO rackmap_link (rackid, a_device, a_port, b_device, b_port, cable_type)
SELECT a.rackid, a.deviceid, p.ap, b.deviceid, p.bp, p.ct FROM d a, d b, (VALUES
	('Switch cœur','1','Firewall','1','rj45'), ('Switch cœur','2','PVE1','1','rj45'),
	('Switch cœur','3','PVE2','1','rj45'), ('Switch cœur','4','NAS','1','fiber')
) AS p(an, ap, bn, bp, ct) WHERE a.name = p.an AND b.name = p.bn;
