# Changelog

## 0.13.0

- Rack frame styles, selectable by the user in the toolbar: cabinet (vented roof, castors), open frame (aluminium posts) and modern card. The choice is stored in the browser.
- Rear face theme (light, color or dark), selectable in the toolbar.
- Cables stay visible when an end is on a hidden face: they are drawn through the device to the real port position (mirrored), dashed, with an F/R badge. A cable to a device in a hidden rack leaves the rack with a label.
- New devices get a sensible default port face by type (rear for servers, storage, UPS).

## 0.12.0
- Front and rear views: for each rack choose front, rear or both side by side; show the front of one rack and the rear of another.
- Rear faces: power supplies, fan modules, management connectors, outlets.
- Each device has its RJ45/SFP ports on the front or on the rear.
- Patch panels with RJ45 or fiber (LC) ports; front port n is behind rear port n (rear numbering mirrored).
- Cables can join a rear port to a front port, including inside the same rack (draw them with the mouse on either face).
- Upgrade: `sql/upgrade-0.12.*.sql` (`port_face`, `pp_media`, `a_face`, `b_face` columns).

## 0.11.0
- New, more modern look: dark anodized rails, rounded bezels with soft shadows and subtle sheen, ventilation mesh, oblong rack-ear slots, glass status LEDs, metal SFP cages and drive trays, cleaner typography and a type chip on the device face.

## 0.10.0
- U numbering direction per rack (bottom-to-top or top-to-bottom).
- Horizontal drive bays are now flat (wider than tall), vertical ones are thin and tall; the U position is no longer repeated on the device face.
- Upgrade: `sql/upgrade-0.10.*.sql`.

## 0.9.0
- Configurable number of drives (servers, NAS) and horizontal (3.5") or vertical (2.5") layout.
- Upgrade: `sql/upgrade-0.9.*.sql`.

## 0.8.0
- Several SFP groups (count + speed) per device, e.g. 4×10G + 2×100G.
- Half-width devices (left / right): two small servers side by side in the same U.
- Upgrade: `sql/upgrade-0.8.*.sql`.

## 0.7.0
- RJ45 ports + SFP ports (1/10/25/40/100/200/400 G, cages colored by speed); ports fit inside the device face (48 ports, patch panels).
- Upgrade: `sql/upgrade-0.7.*.sql`.

## 0.6.0
- Datacenter per rack; choose which datacenter and racks to display (several racks side by side).
- Cables between racks (drawn with the mouse while editing, other racks shown read-only).
- Zoom / fit to window, PNG export.
- Saving keeps device identifiers.
- Upgrade: `sql/upgrade-0.6.*.sql` (`site` column).

## 0.5.0
- Cables drawn with the mouse in the editor (click a port, then another).
- MySQL/MariaDB support (`sql/*.mysql.sql`), portable column detection.

## 0.4.0
- Cables always attached to a real port (virtual ports), connected devices highlighted on click.
- Cable animation based on throughput (`net.if.in/out`), "Interface" field per end, "Animate traffic" checkbox.

## 0.3.0
- Realistic rack, Cablemap-style side panel, cables on demand.

## 0.1.0 – 0.2.0
- Skeleton, SQL tables, visual editor.
