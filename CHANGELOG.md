# Changelog

## 0.7.0
- Ports RJ45 + ports SFP (1/10/25/40/100/200/400 G, cages colorées par débit) ; les ports tiennent dans la face de l'équipement (48 ports, patch panels).
- Mise à niveau : `sql/upgrade-0.7.*.sql`.

## 0.6.0
- Datacenter par baie ; choix du datacenter et des baies à afficher (plusieurs baies côte à côte).
- Câbles entre baies (tracé à la souris en édition, les autres baies affichées en lecture seule).
- Zoom / ajustement à la fenêtre, export PNG.
- L'enregistrement conserve les identifiants des équipements.
- Mise à niveau : `sql/upgrade-0.6.*.sql` (colonne `site`).

## 0.5.0
- Câbles tracés à la souris dans l'éditeur (clic sur un port, puis sur un autre).
- Support MySQL/MariaDB (`sql/*.mysql.sql`), détection des colonnes portable.

## 0.4.0
- Câbles toujours reliés à un vrai port (ports virtuels), mise en évidence des équipements connectés au clic.
- Animation des câbles selon le débit (`net.if.in/out`), champ « Interface » par extrémité, case « Animer le trafic ».

## 0.3.0
- Baie réaliste, panneau latéral type Cablemap, câbles à la demande.

## 0.1.0 – 0.2.0
- Squelette, tables SQL, éditeur visuel.
