(function () {
	'use strict';

	var CFG = window.RACKMAP_CFG || {};
	var NS = 'http://www.w3.org/2000/svg';
	var root = document.getElementById('rackmap');
	var L = Object.assign({
		rack: 'Rack', no_racks: 'No rack defined.',
		not_ready: 'Module tables are missing. Run sql/schema.postgresql.sql on the Zabbix database.',
		empty_unit: 'Free U', st_ok: 'OK', st_problem: 'Problem', st_down: 'Unreachable', st_disabled: 'Disabled',
		st_unknown: 'Unknown', st_passive: 'Passive', problems: 'problems', updated: 'Updated', legend: 'Legend',
		edit: 'Edit', new_rack: 'New rack', save: 'Save', cancel: 'Cancel', delete_rack: 'Delete rack',
		confirm_delete_rack: 'Delete this rack and all its devices and cables?',
		rack_props: 'Rack', name: 'Name', units: 'Height (U)', description: 'Description',
		add_device: 'Add a device', device: 'Device', type: 'Type', host: 'Zabbix host', host_hint: 'empty = passive device',
		u_height: 'Height (U)', ports: 'Ports', remove: 'Remove', cables: 'Cables', add_cable: 'Add a cable',
		port: 'Port', cable_type: 'Cable', select_hint: 'Click a device to edit it, drag it to move it.',
		no_space: 'No free space for this device.', err_host: 'Host not found', host_linked: 'linked', err_units: 'Some devices are above this height.',
		err_move: 'Not enough free space there.', err_save: 'Save failed', saved: 'Saved', no_cables: 'No cable.',
		t_server: 'Server', t_switch: 'Switch', t_router: 'Router', t_firewall: 'Firewall', t_patch: 'Patch panel',
		rear_theme: 'Rear theme', rt_light: 'Light', rt_color: 'Color', rt_dark: 'Dark', rack_style: 'Rack style', rs_cabinet: 'Cabinet', rs_open: 'Open frame', rs_card: 'Modern card', face_view: 'View', face_front: 'Front', face_rear: 'Rear', face_both: 'Front + rear', port_face: 'Ports on', pf_front: 'Front', pf_rear: 'Rear', pp_media: 'Ports', pp_rj45: 'RJ45', pp_fiber: 'Fiber (LC)', t_pdu: 'PDU', t_ups: 'UPS', t_storage: 'Storage', t_other: 'Other',
		close: 'Close', loading: 'Loading\u2026', p_metrics: 'Metrics', p_ifaces: 'Interfaces', p_groups: 'Host groups',
		p_problems: 'Active problems', since: 'since', maintenance: 'In maintenance', btn_problems: 'Problems', btn_latest: 'Latest data',
		btn_dash: 'Dashboard', btn_graphs: 'Graphs', btn_host: 'Settings', if_ok: 'Available', if_ko: 'Unavailable', if_unk: 'Unknown',
		passive_note: 'Passive device (no Zabbix host linked).', error: 'Loading error', metric_names: {}, graph_nodata: 'No history',
		severities: ['Not classified', 'Information', 'Warning', 'Average', 'High', 'Disaster'],
		cable_view: 'Cables', cm_sel: 'Selected / hovered device', cm_all: 'All', cm_none: 'None',
		cable_hint: 'Hover or click a device to see its cables.', conn_to: 'to', c_rj45: 'RJ45', c_fiber: 'Fiber', c_dac: 'DAC', c_power: 'Power', c_other: 'Other', new_device: 'New device', animate: 'Animate traffic', iface: 'Interface', iface_hint: 'Zabbix interface (optional)', rate_none: 'no data', mouse_hint: 'Tip: drag from a port to another port (or click one, then the other) to draw a cable.', mouse_from: 'From', mouse_to: 'click the destination port.', zoom: 'Zoom', zoom_fit: 'Fit to window', export_png: 'Export PNG', datacenter: 'Datacenter', ports_rj45: 'RJ45 ports', ports_sfp: 'SFP ports', sfp_speed: 'SFP speed', sfp_group: 'SFP group', width: 'Width', u_numbering: 'U numbering', u_bottom: 'Bottom to top (1 at the bottom)', u_top: 'Top to bottom (1 at the top)', disks: 'Drives', disk_orient: 'Drive layout', disk_h: 'Horizontal bays', disk_v: 'Vertical bays', w_full: 'Full width', w_left: 'Half - left', w_right: 'Half - right', all_dc: 'All datacenters', racks: 'Racks'
	}, CFG.labels || {});

	var UH = 36, RACK_X = 64, RACK_W = 460, TOP = 34, LANE = 16;
	var STATE_COLOR = {ok: '#2e9e5b', problem: '#d9534f', down: '#e08a1e', disabled: '#8a8f98', unknown: '#8a8f98', passive: '#5b8def'};
	var SEV_COLOR = ['#97aab3', '#7499ff', '#ffc859', '#ffa059', '#e97659', '#e45959'];
	var CABLE_COLOR = {rj45: '#4a90d9', fiber: '#e0a21e', dac: '#8e6bd1', power: '#c0392b', other: '#7f8c8d'};
	var TYPE_LABEL = {server: 'SRV', switch: 'SW', router: 'RTR', firewall: 'FW', patch: 'PP', pdu: 'PDU', ups: 'UPS', storage: 'NAS', other: ''};
	var TYPES = ['server', 'switch', 'router', 'firewall', 'patch', 'pdu', 'ups', 'storage', 'other'];
	var CABLES = ['rj45', 'fiber', 'dac', 'power', 'other'];

	var state = {data: null, current: null, edit: null, hosts: null, tmp: 0, sel: null, detail: {}, scroll: 0, cableMode: 'sel'};
	try { state.cableMode = localStorage.getItem('rackmap.cables') || 'sel'; } catch (e) { /* ignore */ }
	state.zoom = 'fit';
	try { state.zoom = localStorage.getItem('rackmap.zoom') || 'fit'; } catch (e) { /* ignore */ }
	state.rackSvg = null;
	state.site = '';
	state.shown = null;
	try {
		state.site = localStorage.getItem('rackmap.site') || '';
		var shn = JSON.parse(localStorage.getItem('rackmap.shown') || 'null');
		if (Array.isArray(shn)) { state.shown = shn; }
	} catch (e) { /* ignore */ }

	state.faces = {};
	try {
		var fcs = JSON.parse(localStorage.getItem('rackmap.faces') || 'null');
		if (fcs && typeof fcs === 'object') { state.faces = fcs; }
	} catch (e) { /* ignore */ }

	function saveFaces() {
		try { localStorage.setItem('rackmap.faces', JSON.stringify(state.faces)); } catch (e) { /* ignore */ }
	}

	/** Faces affichées d'une baie : 'f' avant (défaut), 'r' arrière, 'fr' les deux côte à côte. -> [0], [1] ou [0, 1] */
	function facesOf(r) {
		var v = state.faces[String(r.id)] || 'f';
		return v === 'fr' ? [0, 1] : (v === 'r' ? [1] : [0]);
	}

	function saveShown() {
		try {
			localStorage.setItem('rackmap.site', state.site);
			localStorage.setItem('rackmap.shown', JSON.stringify(state.shown || []));
		} catch (e) { /* ignore */ }
	}
	var COL_OK = '#2e9e5b', COL_DOWN = '#e08a1e', COL_WARN = '#f2c230', COL_UPLINK = '#5b8def';

	var style = document.createElement('style');
	style.textContent =
		'#rackmap .rm-panel{width:340px;flex:none;position:sticky;top:10px;max-height:calc(100vh - 40px);overflow:auto;border:1px solid rgba(127,127,127,.35);border-radius:16px;box-shadow:0 12px 40px rgba(0,0,0,.55);font-size:12px}' +
		'#rackmap .rm-strip{height:4px;background:linear-gradient(90deg,var(--c),transparent)}' +
		'#rackmap .rm-ph{display:flex;align-items:center;gap:12px;padding:14px 12px 8px}' +
		'#rackmap .rm-pt{flex:1;min-width:0}#rackmap .rm-pn{font-size:15px;font-weight:700;line-height:1.25}' +
		'#rackmap .rm-pip{opacity:.6;margin-top:3px;font-size:11.5px}' +
		'#rackmap .rm-px{background:rgba(127,127,127,.15);border:0;color:inherit;font-size:18px;line-height:1;cursor:pointer;width:26px;height:26px;border-radius:50%;padding:0}#rackmap .rm-px:hover{background:rgba(127,127,127,.35)}' +
		'#rackmap .rm-pdot{width:14px;height:14px;border-radius:50%;flex:none;display:inline-block}#rackmap .rm-pdot.rm-small{width:7px;height:7px;margin-right:6px}' +
		'#rackmap .rm-pb{padding:2px 12px 14px}' +
		'#rackmap .rm-ps{margin:16px 0 7px;font-size:10px;letter-spacing:.09em;text-transform:uppercase;opacity:.5;font-weight:700}' +
		'#rackmap .rm-pills{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0 2px}' +
		'#rackmap .rm-pill2{display:inline-block;padding:3px 10px;border-radius:999px;font-size:11px;font-weight:700;color:var(--c);background:color-mix(in srgb,var(--c) 16%,transparent);border:1px solid color-mix(in srgb,var(--c) 45%,transparent)}' +
		'#rackmap .rm-tiles{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px}' +
		'#rackmap .rm-tile{background:rgba(127,127,127,.12);border:1px solid rgba(127,127,127,.18);border-radius:10px;padding:8px 10px;min-width:0}' +
		'#rackmap .rm-tl{font-size:10px;opacity:.6;text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px}' +
		'#rackmap .rm-tv{font-size:15px;font-weight:700;word-break:break-word}' +
		'#rackmap .rm-card{background:rgba(127,127,127,.08);border:1px solid rgba(127,127,127,.18);border-radius:12px;padding:10px}' +
		'#rackmap .rm-link{display:flex;align-items:center;flex-wrap:wrap;gap:6px}' +
		'#rackmap svg.rm-spark{width:100%;height:64px;min-height:0;border:0;border-radius:0;cursor:crosshair;display:block}' +
		'#rackmap .rm-sw{display:flex;height:64px}#rackmap .rm-plot{position:relative;flex:1;min-width:0}' +
		'#rackmap .rm-vl{position:absolute;top:0;bottom:0;width:1px;background:currentColor;opacity:.35;pointer-events:none}' +
		'#rackmap .rm-hd{position:absolute;width:8px;height:8px;margin:-4px 0 0 -4px;border-radius:50%;border:1.5px solid rgba(255,255,255,.85);pointer-events:none}' +
		'#rackmap .rm-tip{position:absolute;top:2px;z-index:3;border:1px solid rgba(127,127,127,.45);border-radius:8px;padding:4px 8px;font-size:11px;font-weight:600;white-space:nowrap;pointer-events:none;box-shadow:0 4px 14px rgba(0,0,0,.45)}' +
		'#rackmap .rm-bar2{height:7px;border-radius:4px;background:rgba(127,127,127,.22);margin-top:10px;overflow:hidden}' +
		'#rackmap .rm-fill{height:100%;border-radius:4px}#rackmap .rm-ulab{display:flex;justify-content:space-between;margin-top:5px}' +
		'#rackmap .rm-pm{opacity:.6;font-size:11px}#rackmap .rm-pchips{display:flex;flex-wrap:wrap;gap:6px}' +
		'#rackmap .rm-chip{display:inline-flex;align-items:center;border:1px solid rgba(127,127,127,.35);background:rgba(127,127,127,.1);border-radius:999px;padding:2px 10px;font-size:11px}' +
		'#rackmap .rm-pprob{border-left:3px solid var(--c);background:color-mix(in srgb,var(--c) 9%,transparent);border-radius:4px 10px 10px 4px;padding:7px 10px;margin-bottom:7px}' +
		'#rackmap .rm-ptx{font-size:12px;line-height:1.35}#rackmap .rm-pmeta{display:flex;align-items:center;gap:8px;margin-top:5px}#rackmap .rm-pmeta .rm-pill2{padding:1px 8px;font-size:10px}' +
		'#rackmap .rm-pbtns{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:16px}' +
		'#rackmap .rm-pbtn{border:1px solid rgba(127,127,127,.4);border-radius:10px;padding:8px;text-align:center;color:inherit;text-decoration:none;font-weight:600}#rackmap .rm-pbtn:hover{background:rgba(127,127,127,.2)}' +
		'#rackmap .rm-pbtn.rm-primary{background:var(--c);border-color:var(--c);color:#fff}#rackmap .rm-pbtn.rm-primary:hover{filter:brightness(1.12);background:var(--c)}' +
		'#rackmap .rm-bar{display:flex;gap:12px;align-items:center;margin:0 0 8px;font-size:12px;opacity:.9;flex-wrap:wrap}' +
		'#rackmap .rm-bar button{cursor:pointer}' +
		'@keyframes rm-flow-a{to{stroke-dashoffset:-12}}@keyframes rm-flow-b{to{stroke-dashoffset:-12}}' +
		'@media (prefers-reduced-motion:reduce){#rackmap .rm-flow{animation:none!important}}' +
		'';
	document.head.appendChild(style);

	/* ---------- helpers DOM ---------- */

	function el(name, attrs, parent) {
		var e = document.createElementNS(NS, name);
		Object.keys(attrs || {}).forEach(function (k) { e.setAttribute(k, attrs[k]); });
		if (parent) { parent.appendChild(e); }
		return e;
	}

	function html(tag, attrs, text, parent) {
		var e = document.createElement(tag);
		Object.keys(attrs || {}).forEach(function (k) { e.setAttribute(k, attrs[k]); });
		if (text !== undefined && text !== null) { e.textContent = text; }
		if (parent) { parent.appendChild(e); }
		return e;
	}

	function button(text, cls, onclick, parent) {
		var b = html('button', {type: 'button', 'class': cls || 'btn-alt'}, text, parent);
		b.addEventListener('click', onclick);
		return b;
	}

	function field(parent, label, input) {
		var row = html('div', {style: 'display:flex;gap:8px;align-items:center;margin:4px 0'}, undefined, parent);
		html('label', {style: 'min-width:92px;opacity:.8'}, label, row);
		row.appendChild(input);
		return row;
	}

	function textInput(value, onchange, attrs) {
		var i = html('input', Object.assign({type: 'text', style: 'flex:1;min-width:0'}, attrs || {}));
		i.value = value === null || value === undefined ? '' : value;
		i.addEventListener('change', function () { onchange(i.value); });
		return i;
	}

	function numInput(value, min, max, onchange) {
		var i = html('input', {type: 'number', min: min, max: max, style: 'width:80px'});
		i.value = value;
		i.addEventListener('change', function () {
			var v = parseInt(i.value, 10);
			onchange(isNaN(v) ? value : Math.max(min, Math.min(max, v)));
		});
		return i;
	}

	function select(options, value, onchange) {
		var s = html('select', {style: 'flex:1;min-width:0'});
		options.forEach(function (o) {
			var opt = html('option', {value: o[0]}, o[1], s);
			if (String(o[0]) === String(value)) { opt.selected = true; }
		});
		s.addEventListener('change', function () { onchange(s.value); });
		return s;
	}

	function clone(o) { return JSON.parse(JSON.stringify(o)); }

	function pageBg() {
		var c = getComputedStyle(document.body).backgroundColor;
		if (!c || c === 'transparent' || c === 'rgba(0, 0, 0, 0)') { c = getComputedStyle(document.documentElement).backgroundColor; }
		return (!c || c === 'transparent' || c === 'rgba(0, 0, 0, 0)') ? '#0e1013' : c;
	}

	function ph(tag, cls, txt, parent) {
		var e = document.createElement(tag);
		if (cls) { e.className = cls; }
		if (txt !== undefined && txt !== null) { e.textContent = txt; }
		if (parent) { parent.appendChild(e); }
		return e;
	}

	function sevColor(s) { return s < 0 ? COL_OK : SEV_COLOR[Math.min(s, SEV_COLOR.length - 1)]; }

	function dur(sec) {
		sec = Math.max(0, Math.round(sec));
		var d = Math.floor(sec / 86400), hh = Math.floor(sec % 86400 / 3600), m = Math.floor(sec % 3600 / 60);
		if (d) { return d + ' j ' + hh + ' h'; }
		if (hh) { return hh + ' h ' + m + ' min'; }
		if (m) { return m + ' min'; }
		return sec + ' s';
	}

	function fmtMetric(it) {
		var v = parseFloat(it.lastvalue), u = it.units || '';
		if (isNaN(v)) { return it.lastvalue; }
		if (u === 'uptime') { return dur(v); }
		if (u === 's') { return v < 1 ? (v * 1000).toFixed(1) + ' ms' : v.toFixed(2) + ' s'; }
		if (u === 'B') {
			var sfx = ['B', 'KB', 'MB', 'GB', 'TB'], i = 0;
			while (v >= 1024 && i < sfx.length - 1) { v /= 1024; i++; }
			return v.toFixed(i ? 1 : 0) + ' ' + sfx[i];
		}
		if (u === '%') { return v.toFixed(1) + ' %'; }
		return +v.toFixed(2) + (u ? ' ' + u : '');
	}

	function sparkline(parent, list, opts) {
		var W = 300, H = 64, P = 4, NSV = 'http://www.w3.org/2000/svg', n = list[0].vals.length;
		var max = 0, fmt = opts.fmt;
		list.forEach(function (l) { l.vals.forEach(function (v) { if (v !== null && v > max) { max = v; } }); });
		if (max <= 0) { max = 1; }
		function xOf(i) { return P + i * (W - 2 * P) / (n - 1); }
		function yOf(v) { return H - P - (v / max) * (H - 2 * P - 6); }

		var wrap = ph('div', 'rm-sw', null, parent), plot = ph('div', 'rm-plot', null, wrap);
		var sv = document.createElementNS(NSV, 'svg');
		sv.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
		sv.setAttribute('preserveAspectRatio', 'none');
		sv.setAttribute('class', 'rm-spark');
		list.forEach(function (s) {
			var p = [];
			s.vals.forEach(function (v, i) { if (v !== null) { p.push([xOf(i), yOf(v)]); } });
			if (p.length < 2) { return; }
			var line = p.map(function (q, i) { return (i ? 'L' : 'M') + q[0].toFixed(1) + ',' + q[1].toFixed(1); }).join(' ');
			var area = document.createElementNS(NSV, 'path');
			area.setAttribute('d', line + ' L' + p[p.length - 1][0].toFixed(1) + ',' + (H - P) + ' L' + p[0][0].toFixed(1) + ',' + (H - P) + ' Z');
			area.setAttribute('fill', s.color);
			area.setAttribute('opacity', 0.16);
			sv.appendChild(area);
			var ln = document.createElementNS(NSV, 'path');
			ln.setAttribute('d', line);
			ln.setAttribute('fill', 'none');
			ln.setAttribute('stroke', s.color);
			ln.setAttribute('stroke-width', 1.6);
			ln.setAttribute('stroke-linejoin', 'round');
			ln.setAttribute('vector-effect', 'non-scaling-stroke');
			sv.appendChild(ln);
		});
		plot.appendChild(sv);

		// survol
		var vl = ph('div', 'rm-vl', null, plot), tip = ph('div', 'rm-tip', null, plot), dots = [];
		tip.style.background = pageBg();
		[vl, tip].forEach(function (e) { e.style.display = 'none'; });
		list.forEach(function (s) {
			var d = ph('div', 'rm-hd', null, plot);
			d.style.background = s.color;
			d.style.display = 'none';
			dots.push(d);
		});
		plot.addEventListener('mouseleave', function () {
			vl.style.display = tip.style.display = 'none';
			dots.forEach(function (d) { d.style.display = 'none'; });
		});
		plot.addEventListener('mousemove', function (ev) {
			var r = sv.getBoundingClientRect(), fx = (ev.clientX - r.left) / r.width * W;
			var i = Math.max(0, Math.min(n - 1, Math.round((fx - P) / (W - 2 * P) * (n - 1))));
			var left = xOf(i) / W * 100;
			vl.style.display = tip.style.display = 'block';
			vl.style.left = left + '%';
			tip.textContent = '';
			var t = opts.from + (i + 0.5) * (opts.to - opts.from) / n;
			ph('div', 'rm-pm', new Date(t * 1000).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'}), tip);
			list.forEach(function (s, k) {
				var v = s.vals[i], row = ph('div', null, null, tip);
				ph('span', 'rm-pdot rm-small', null, row).style.background = s.color;
				row.appendChild(document.createTextNode((s.name ? s.name + ' ' : '') + (v === null ? '—' : fmt(v))));
				dots[k].style.display = v === null ? 'none' : 'block';
				if (v !== null) { dots[k].style.left = left + '%'; dots[k].style.top = (yOf(v) / H * 100) + '%'; }
			});
			if (left > 55) { tip.style.left = 'auto'; tip.style.right = (100 - left + 2) + '%'; }
			else { tip.style.right = 'auto'; tip.style.left = (left + 2) + '%'; }
		});
		return max;
	}

	function tile(parent, label, value, color) {
		var t = ph('div', 'rm-tile', null, parent);
		ph('div', 'rm-tl', label, t);
		var v = ph('div', 'rm-tv', value, t);
		if (color) { v.style.color = color; }
		return t;
	}

	function pill(parent, txt, color) {
		var p = ph('span', 'rm-pill2', txt, parent);
		p.style.setProperty('--c', color);
		return p;
	}

	/* ---------- données ---------- */

	function getJSON(action) {
		return fetch('zabbix.php?action=' + action, {credentials: 'same-origin'}).then(function (r) { return r.json(); });
	}

	function post(action, params) {
		var body = new URLSearchParams();
		Object.keys(params).forEach(function (k) { body.append(k, params[k]); });
		body.append('_csrf_token', CFG.csrf || '');
		return fetch('zabbix.php?action=' + action, {method: 'POST', credentials: 'same-origin', body: body})
			.then(function (r) { return r.json(); });
	}

	function deviceState(d, hosts) {
		if (d.hostid === null || d.hostid === undefined || d.hostid === '') { return {state: 'passive', problems: 0, severity: -1}; }
		return hosts[d.hostid] || {state: 'unknown', problems: 0, severity: -1};
	}

	/** Baies choisies par l'utilisateur (par défaut : la première). */
	function shownRacks() {
		var racks = state.data ? state.data.racks : [];
		var ids = state.shown || [];
		var list = racks.filter(function (r) { return ids.indexOf(r.id) >= 0; });
		return list.length || !racks.length ? list : [racks.filter(function (r) { return r.id === state.current; })[0] || racks[0]];
	}

	/** Toutes les baies connues, la baie en cours d'édition remplaçant sa version enregistrée. */
	function allRacks() {
		var rs = state.data ? state.data.racks.slice() : [];
		if (state.edit) {
			var i = -1;
			rs.forEach(function (r, k) { if (r.id === state.edit.rack.id && r.id > 0) { i = k; } });
			if (i >= 0) { rs[i] = state.edit.rack; } else { rs.unshift(state.edit.rack); }
		}
		return rs;
	}

	/** Baies dessinées : en édition, les baies choisies + la baie éditée (les autres en lecture seule, pour relier les baies). */
	function drawList() {
		if (!state.edit) { return shownRacks(); }
		var ed = state.edit.rack, out = [];
		var found = false;
		shownRacks().forEach(function (r) {
			if (r.id === ed.id && ed.id > 0) { out.push(ed); found = true; } else { out.push(r); }
		});
		if (!found) { out.unshift(ed); }
		return out;
	}

	function currentRack() {
		if (state.edit) { return state.edit.rack; }
		return shownRacks()[0] || null;
	}


	/* ---------- panneau d'informations (clic sur un équipement) ---------- */

	function deviceById(id) {
		var rs = allRacks();
		for (var i = 0; i < rs.length; i++) {
			var f = rs[i].devices.filter(function (d) { return d.id === id; })[0];
			if (f) { return f; }
		}
		return null;
	}

	function openPanel(d) {
		state.sel = d.id;
		if (d.hostid) { fetchDetail(d.hostid); }
		render();
	}

	function closePanel() { state.sel = null; render(); }

	function fetchDetail(hostid) {
		getJSON('rackmap.host&hostid=' + encodeURIComponent(hostid))
			.then(function (r) { state.detail[hostid] = r; if (!state.edit) { render(); } })
			.catch(function () { state.detail[hostid] = {error: L.error}; if (!state.edit) { render(); } });
	}

	function renderPanel(parent, d, hosts) {
		var st = deviceState(d, hosts);
		var col = st.state === 'problem' && st.severity >= 0 ? SEV_COLOR[st.severity] : (st.state === 'down' ? COL_DOWN : STATE_COLOR[st.state]);
		var det = d.hostid ? state.detail[d.hostid] : null;
		var panel = ph('div', 'rm-panel', null, parent);
		panel.style.background = pageBg();
		panel.style.setProperty('--c', col);
		ph('div', 'rm-strip', null, panel);

		var head = ph('div', 'rm-ph', null, panel);
		var dot = ph('span', 'rm-pdot', null, head);
		dot.style.background = col;
		dot.style.boxShadow = '0 0 12px ' + col;
		var ttl = ph('div', 'rm-pt', null, head);
		ph('div', 'rm-pn', d.name, ttl);
		var ip = det && det.interfaces && det.interfaces[0] ? (det.interfaces[0].useip === '0' && det.interfaces[0].dns ? det.interfaces[0].dns : det.interfaces[0].ip) : '';
		ph('div', 'rm-pip', (ip ? ip + '  ·  ' : '') + L['t_' + d.type] + '  ·  U' + d.u_pos + (d.u_height > 1 ? '–U' + (d.u_pos + d.u_height - 1) : ''), ttl);
		var x = ph('button', 'rm-px', '×', head);
		x.title = L.close;
		x.addEventListener('click', closePanel);

		var body = ph('div', 'rm-pb', null, panel);
		var pills = ph('div', 'rm-pills', null, body);
		pill(pills, L['st_' + st.state] + (st.problems ? ' · ' + st.problems + ' ' + L.problems : ''), col);
		if (det && det.maintenance) { pill(pills, L.maintenance, COL_WARN); }

		var rackNow = {links: [].concat.apply([], allRacks().map(function (r) { return r.links; }))};
		var conns = rackNow ? rackNow.links.filter(function (l) { return l.a === d.id || l.b === d.id; }).map(function (l) {
			var mine = l.a === d.id, other = deviceById(mine ? l.b : l.a);
			var tr = (state.data && state.data.traffic || {})[l.id];
			return {port: mine ? l.a_port : l.b_port, other: other ? other.name : '?', oport: mine ? l.b_port : l.a_port,
				out: tr ? (mine ? tr.ab : tr.ba) : null, inn: tr ? (mine ? tr.ba : tr.ab) : null, tr: !!tr,
				cable: l.cable, color: l.color || CABLE_COLOR[l.cable] || CABLE_COLOR.other};
		}).sort(function (p, q) { return portIndex(p.port) - portIndex(q.port); }) : [];
		if (conns.length) {
			ph('div', 'rm-ps', L.cables + ' (' + conns.length + ')', body);
			var cc = ph('div', 'rm-card', null, body);
			conns.forEach(function (c) {
				var r = ph('div', null, null, cc);
				r.style.cssText = 'display:flex;align-items:center;gap:8px;padding:3px 0';
				ph('span', 'rm-pdot rm-small', null, r).style.background = c.color;
				ph('span', null, (c.port ? L.port + ' ' + c.port : '?') + '  \u2192  ' + c.other + (c.oport ? ' : ' + c.oport : ''), r).style.flex = '1';
				if (c.tr) { ph('span', 'rm-pm', '\u2191 ' + fmtBps(c.out) + '  \u2193 ' + fmtBps(c.inn), r); }
				ph('span', 'rm-pm', L['c_' + c.cable] || c.cable, r);
			});
		}

		if (!d.hostid) { ph('div', 'rm-pm', L.passive_note, body); return panel; }
		if (!det) { ph('div', 'rm-pm', L.loading, body); return panel; }
		if (det.error) { ph('div', 'rm-pm', det.error, body); return panel; }

		var sect = function (t) { ph('div', 'rm-ps', t, body); };

		(det.graphs || []).forEach(function (g) {
			var per = g.minutes >= 60 ? (g.minutes / 60) + ' h' : g.minutes + ' min';
			sect((L.metric_names[g.label] || g.label) + ' · ' + per);
			var card = ph('div', 'rm-card', null, body);
			var mfmt = function (v) { return fmtMetric({lastvalue: v, units: g.units}); };
			var mmax = sparkline(card, [{vals: g.values, color: COL_UPLINK, name: ''}], {from: g.from, to: g.to, fmt: mfmt}), last = null;
			g.values.forEach(function (v) { if (v !== null) { last = v; } });
			var gl = ph('div', 'rm-ulab', null, card);
			ph('span', 'rm-pm', 'max ' + fmtMetric({lastvalue: mmax, units: g.units}), gl);
			ph('b', null, last === null ? '—' : fmtMetric({lastvalue: last, units: g.units}), gl);
		});

		if (det.metrics && det.metrics.length) {
			sect(L.p_metrics);
			var mt = ph('div', 'rm-tiles', null, body);
			det.metrics.forEach(function (m) {
				var warn = /loss/i.test(m.label) && parseFloat(m.lastvalue) > 0;
				tile(mt, L.metric_names[m.label] || m.label, fmtMetric(m), warn ? SEV_COLOR[4] : null);
			});
		}

		if (det.interfaces && det.interfaces.length) {
			sect(L.p_ifaces);
			var chips = ph('div', 'rm-pchips', null, body), TY = {1: 'Agent', 2: 'SNMP', 3: 'IPMI', 4: 'JMX'};
			det.interfaces.forEach(function (i) {
				var c = ph('span', 'rm-chip', null, chips);
				ph('span', 'rm-pdot rm-small', null, c).style.background = i.available === '1' ? COL_OK : (i.available === '2' ? COL_DOWN : '#888');
				c.title = i.available === '1' ? L.if_ok : (i.available === '2' ? L.if_ko : L.if_unk);
				c.appendChild(document.createTextNode((TY[i.type] || '?') + ' ' + (i.useip === '0' && i.dns ? i.dns : i.ip) + ':' + i.port));
			});
		}

		if (det.groups && det.groups.length) {
			sect(L.p_groups);
			var gc = ph('div', 'rm-pchips', null, body);
			det.groups.forEach(function (g) { ph('span', 'rm-chip', g, gc); });
		}

		if (det.problems && det.problems.length) {
			sect(L.p_problems + ' (' + det.problems.length + (det.problems.length >= 15 ? '+' : '') + ')');
			var now = Date.now() / 1000;
			det.problems.forEach(function (p) {
				var r = ph('div', 'rm-pprob', null, body), pc = sevColor(p.severity);
				r.style.setProperty('--c', pc);
				ph('div', 'rm-ptx', p.name, r);
				var mm = ph('div', 'rm-pmeta', null, r);
				pill(mm, L.severities[p.severity] || '', pc);
				ph('span', 'rm-pm', L.since + ' ' + dur(now - p.clock) + (p.acknowledged ? '  ✓' : ''), mm);
			});
		}

		var bb = ph('div', 'rm-pbtns', null, body);
		var btn = function (label, url) { var a = ph('a', 'rm-pbtn', label, bb); a.href = url; return a; };
		btn(L.btn_problems, 'zabbix.php?action=problem.view&filter_set=1&hostids%5B%5D=' + d.hostid).classList.add('rm-primary');
		btn(L.btn_latest, 'zabbix.php?action=latest.view&filter_set=1&hostids%5B%5D=' + d.hostid);
		if (det.dashboardid) { btn(L.btn_dash, 'zabbix.php?action=host.dashboard.view&hostid=' + d.hostid + '&dashboardid=' + det.dashboardid); }
		else { btn(L.btn_graphs, 'zabbix.php?action=charts.view&filter_set=1&filter_hostids%5B%5D=' + d.hostid); }
		var hb = btn(L.btn_host, 'zabbix.php?action=host.list&filter_set=1&filter_name=' + encodeURIComponent(d.name));
		hb.addEventListener('click', function (ev) {
			if (typeof window.PopUp !== 'function') { return; }
			ev.preventDefault();
			try { window.PopUp('host.edit', {hostid: d.hostid}, {dialogueid: 'host_edit', dialogue_class: 'modal-popup-large', prevent_navigation: true}); }
			catch (err) { window.location.href = hb.href; }
		});

		return panel;
	}

	window.addEventListener('keydown', function (ev) { if (ev.key === 'Escape' && state.sel !== null && !state.edit) { closePanel(); } });

	/* ---------- règles de placement ---------- */

	/** Largeur : 0 = pleine, 1 = demi gauche, 2 = demi droite. Deux équipements se gênent s'ils partagent un U et un côté. */
	/** U physique (1 = bas de la baie) du bas d'un équipement, selon le sens de numérotation de la baie. */
	function bottomU(rack, d) {
		return rack.u_desc ? rack.units - (d.u_pos + d.u_height - 1) + 1 : d.u_pos;
	}

	function slotsClash(a, b) {
		return !a || !b || a === b;
	}

	function fits(rack, dev, pos, height, slot) {
		if (slot === undefined) { slot = dev ? (dev.slot || 0) : 0; }
		if (pos < 1 || pos + height - 1 > rack.units) { return false; }
		return !rack.devices.some(function (o) {
			return o !== dev && slotsClash(slot, o.slot || 0) && pos <= o.u_pos + o.u_height - 1 && o.u_pos <= pos + height - 1;
		});
	}

	function firstFreeSlot(rack, height) {
		for (var i = 1; i <= rack.units - height + 1; i++) {
			var pos = rack.u_desc ? i : rack.units - height + 2 - i;
			if (fits(rack, null, pos, height)) { return pos; }
		}
		return 0;
	}

	/* ---------- rendu ---------- */

	function render() {
		root.textContent = '';
		var data = state.data;

		if (!data) { return; }
		if (!data.ready) { html('div', {'class': 'msg-bad'}, L.not_ready, root); return; }

		var edit = state.edit;
		var rack = currentRack();

		drawToolbar(rack);

		if (!rack) { html('div', {'class': 'msg-info'}, L.no_racks, root); return; }

		var wrap = html('div', {style: 'display:flex;gap:18px;align-items:flex-start;flex-wrap:wrap'}, undefined, root);
		var left = html('div', {}, undefined, wrap);
		var list = drawList();
		drawRacks(left, list, data.hosts || {}, !!edit);
		if (edit) {
			html('div', {style: 'opacity:.6;font-size:12px;margin-top:6px'}, L.select_hint, left);
			drawPanel(html('div', {style: 'width:360px;flex:none'}, undefined, wrap), rack);
		}
		else {
			var sel = state.sel !== null ? deviceById(state.sel) : null;
			if (sel) {
				renderPanel(wrap, sel, data.hosts || {});
				var pn = wrap.querySelector('.rm-panel');
				if (pn) { pn.scrollTop = state.scroll; pn.addEventListener('scroll', function () { state.scroll = pn.scrollTop; }); }
			}
			else if (state.sel !== null) { state.sel = null; }
			if (state.cableMode === 'sel' && list.some(function (r) { return r.links.length; })) {
				html('div', {style: 'opacity:.6;font-size:12px;margin-top:6px'}, L.cable_hint, left);
			}
			drawLegend();
		}
	}

	function drawToolbar(rack) {
		var edit = state.edit;
		var bar = html('div', {style: 'display:flex;gap:10px;align-items:center;margin-bottom:10px;flex-wrap:wrap'}, undefined, root);

		if (!edit) {
			var racksAll = state.data.racks, shown = shownRacks().map(function (r) { return r.id; });
			if (racksAll.length) {
				var sites = [];
				racksAll.forEach(function (r) { if (r.site && sites.indexOf(r.site) < 0) { sites.push(r.site); } });
				if (state.site && sites.indexOf(state.site) < 0) { state.site = ''; }
				if (sites.length) {
					html('label', {}, L.datacenter + ' :', bar);
					var ss = select([['', L.all_dc]].concat(sites.map(function (x) { return [x, x]; })), state.site, function (v) {
						state.site = v;
						state.shown = racksAll.filter(function (r) { return !v || r.site === v; }).map(function (r) { return r.id; });
						saveShown();
						state.sel = null;
						render();
					});
					ss.style.flex = 'none';
					bar.appendChild(ss);
				}
				styleSelect(bar);
				html('label', {}, L.racks + ' :', bar);
				racksAll.filter(function (r) { return !state.site || r.site === state.site; }).forEach(function (r) {
					var lab = html('label', {style: 'display:inline-flex;gap:5px;align-items:center;cursor:pointer;border:1px solid rgba(127,127,127,.4);border-radius:999px;padding:2px 10px'}, undefined, bar);
					var cbx = html('input', {type: 'checkbox'}, undefined, lab);
					cbx.checked = shown.indexOf(r.id) >= 0;
					html('span', {}, r.name, lab);
					if (cbx.checked) {
						var fs = select([['f', L.face_front], ['r', L.face_rear], ['fr', L.face_both]], state.faces[String(r.id)] || 'f', function (v) {
							state.faces[String(r.id)] = v;
							saveFaces();
							render();
						});
						fs.style.cssText = 'flex:none;padding:0 4px;font-size:12px;min-height:0;height:22px';
						fs.addEventListener('click', function (ev) { ev.stopPropagation(); });
						lab.appendChild(fs);
					}
					cbx.addEventListener('change', function () {
						var ids = shown.filter(function (x) { return x !== r.id; });
						if (cbx.checked) { ids.push(r.id); }
						if (!ids.length) { ids = [r.id]; }
						state.shown = racksAll.filter(function (x) { return ids.indexOf(x.id) >= 0; }).map(function (x) { return x.id; });
						saveShown();
						render();
					});
				});
				html('span', {style: 'opacity:.6'}, L.updated + ' ' + new Date(state.data.time * 1000).toLocaleTimeString(), bar);
			}
			if (shownRacks().some(function (r) { return r.links.length; })) {
				html('label', {}, L.cable_view + ' :', bar);
				var cs = select([['sel', L.cm_sel], ['all', L.cm_all], ['none', L.cm_none]], state.cableMode, function (v) {
					state.cableMode = v;
					try { localStorage.setItem('rackmap.cables', v); } catch (e) { /* ignore */ }
					render();
				});
				cs.style.flex = 'none';
				bar.appendChild(cs);
				if (state.data.traffic && Object.keys(state.data.traffic).length) {
					var lab = html('label', {style: 'display:inline-flex;gap:4px;align-items:center;cursor:pointer'}, undefined, bar);
					var cb = html('input', {type: 'checkbox'}, undefined, lab);
					cb.checked = animOn();
					html('span', {}, L.animate, lab);
					cb.addEventListener('change', function () {
						try { localStorage.setItem('rackmap.anim', cb.checked ? '1' : '0'); } catch (e) { /* ignore */ }
						render();
					});
				}
			}
			if (rack) { zoomControls(bar, rack); }
			if (CFG.can_edit) {
				var sr = shownRacks();
				if (sr.length === 1) { button(L.edit, 'btn-alt', function () { startEdit(sr[0]); }, bar); }
				else if (sr.length > 1) {
					var es = select([['', L.edit + '\u2026']].concat(sr.map(function (r) { return [String(r.id), r.name]; })), '', function (v) {
						var tgt = sr.filter(function (r) { return String(r.id) === v; })[0];
						if (tgt) { startEdit(tgt); }
					});
					es.style.flex = 'none';
					bar.appendChild(es);
				}
				button(L.new_rack, 'btn-alt', function () { startEdit(null); }, bar);
			}
			return;
		}

		zoomControls(bar, null);
		html('label', {}, L.face_view + ' :', bar);
		var fe = select([['f', L.face_front], ['r', L.face_rear], ['fr', L.face_both]], state.faces[String(edit.rack.id)] || 'f', function (v) {
			state.faces[String(edit.rack.id)] = v;
			saveFaces();
			render();
		});
		fe.style.flex = 'none';
		bar.appendChild(fe);
		styleSelect(bar);
		button(L.save, '', save, bar);
		button(L.cancel, 'btn-alt', function () { state.edit = null; render(); }, bar);
		if (edit.rack.id > 0) { button(L.delete_rack, 'btn-alt', deleteRack, bar); }
		edit.msg = html('span', {style: 'color:#d9534f'}, edit.message || '', bar);
	}

	function zoomControls(bar, rack) {
		html('label', {}, L.zoom + ' :', bar);
		var zs = select([['fit', L.zoom_fit], ['0.5', '50 %'], ['0.75', '75 %'], ['1', '100 %'], ['1.25', '125 %'], ['1.5', '150 %']], String(state.zoom), function (v) {
			state.zoom = v;
			try { localStorage.setItem('rackmap.zoom', v); } catch (e) { /* ignore */ }
			render();
		});
		zs.style.flex = 'none';
		bar.appendChild(zs);
		if (rack) { button(L.export_png, 'btn-alt', function () { exportPng(); }, bar); }
	}

	/** Exporte la baie affichée en PNG (SVG -> canvas, x2 pour la netteté). */
	function exportPng() {
		var svg = state.rackSvg;
		if (!svg) { return; }
		var vb = svg.getAttribute('viewBox').split(' ').map(parseFloat), W = vb[2], H = vb[3];
		var clone = svg.cloneNode(true);
		clone.setAttribute('width', W);
		clone.setAttribute('height', H);
		clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
		var bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
		['x', 'y'].forEach(function (a) { bg.setAttribute(a, 0); });
		bg.setAttribute('width', W); bg.setAttribute('height', H); bg.setAttribute('fill', '#14171a');
		clone.insertBefore(bg, clone.children[1] || null);
		[].slice.call(clone.querySelectorAll('[fill="currentColor"]')).forEach(function (n) { n.setAttribute('fill', '#c9ced6'); });
		var cap = document.createElementNS('http://www.w3.org/2000/svg', 'text');
		cap.setAttribute('x', 10); cap.setAttribute('y', 16); cap.setAttribute('font-size', 13); cap.setAttribute('font-weight', 700);
		cap.setAttribute('fill', '#e6e9ee');
		cap.textContent = state.rackNames + '  -  ' + new Date().toLocaleString();
		clone.appendChild(cap);
		var url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)], {type: 'image/svg+xml;charset=utf-8'}));
		var img = new Image();
		img.onload = function () {
			var c = document.createElement('canvas');
			c.width = W * 2; c.height = H * 2;
			var ctx = c.getContext('2d');
			ctx.scale(2, 2);
			ctx.drawImage(img, 0, 0, W, H);
			URL.revokeObjectURL(url);
			c.toBlob(function (blob) {
				var a = document.createElement('a');
				a.href = URL.createObjectURL(blob);
				a.download = (state.rackNames || 'rack').replace(/[^\w.-]+/g, '_') + '.png';
				document.body.appendChild(a);
				a.click();
				document.body.removeChild(a);
			}, 'image/png');
		};
		img.src = url;
	}

	var resizeT = null;
	window.addEventListener('resize', function () {
		if (state.zoom !== 'fit') { return; }
		clearTimeout(resizeT);
		resizeT = setTimeout(function () { if (state.data && !state.edit) { render(); } }, 250);
	});

	function setMessage(text, ok) {
		if (state.edit && state.edit.msg) {
			state.edit.msg.textContent = text;
			state.edit.msg.style.color = ok ? '#2e9e5b' : '#d9534f';
		}
		if (state.edit) { state.edit.message = text; }
	}

	function grad(parent, id, stops, x2, y2) {
		var g = el('linearGradient', {id: id, x1: 0, y1: 0, x2: x2, y2: y2}, parent);
		stops.forEach(function (s) { el('stop', {offset: s[0], 'stop-color': s[1], 'stop-opacity': s.length > 2 ? s[2] : 1}, g); });
	}

	var FONT = "-apple-system,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif";
	var MONO = "ui-monospace,SFMono-Regular,Menlo,Consolas,monospace";
	// façades avant : couleur par type (clair -> foncé), arrière : tôle galvanisée claire
	var FACE = {
		server: ['#51627a', '#36445a'], 'switch': ['#2f73c4', '#1d4f93'], router: ['#7a58c9', '#563a9a'],
		firewall: ['#c4435a', '#8c2a40'], patch: ['#8a97a9', '#68768a'], pdu: ['#3a8a63', '#296a4a'],
		ups: ['#b8812f', '#87591c'], storage: ['#17999b', '#0f6f71'], other: ['#657285', '#4a5668']
	};
	var MESH = {};

	function defsFor(svg) {
		var d = el('defs', {}, svg);
		Object.keys(FACE).forEach(function (t) {
			grad(d, 'rm-f-' + t, [[0, FACE[t][0]], [1, FACE[t][1]]], 1, 0.35);
		});
		grad(d, 'rm-sheen', [[0, '#ffffff', .16], [0.22, '#ffffff', .03], [0.55, '#000000', 0], [1, '#000000', .22]], 0, 1);
		grad(d, 'rm-plate', [[0, '#dfe4ea'], [1, '#b6bec9']], 0, 1);
		grad(d, 'rm-plate-dark', [[0, '#2c3440'], [1, '#171c24']], 0, 1);
		grad(d, 'rm-rail', [[0, '#1a1f27'], [0.5, '#262d38'], [1, '#171b22']], 1, 0);
		grad(d, 'rm-ear', [[0, '#000000', .1], [1, '#000000', .3]], 0, 1);
		grad(d, 'rm-body', [[0, '#141920'], [1, '#0b0e13']], 0, 1);
		grad(d, 'rm-cap', [[0, '#313a47'], [1, '#1c222b']], 0, 1);
		grad(d, 'rm-cage', [[0, '#e3e8ee'], [0.5, '#a3abb6'], [1, '#6a727d']], 0, 1);
		grad(d, 'rm-tray', [[0, '#262c35'], [1, '#12161b']], 0, 1);
		grad(d, 'rm-sock', [[0, '#050607'], [1, '#14171b']], 0, 1);
		var pt = el('pattern', {id: 'rm-mesh', width: 5, height: 5, patternUnits: 'userSpaceOnUse'}, d);
		el('circle', {cx: 2.5, cy: 2.5, r: .9, fill: '#1c2430', opacity: .5}, pt);
		var bl = el('filter', {id: 'rm-blur', x: '-10%', y: '-30%', width: '120%', height: '170%'}, d);
		el('feGaussianBlur', {stdDeviation: 2}, bl);
		var f = el('filter', {id: 'rm-glow', x: '-80%', y: '-80%', width: '260%', height: '260%'}, d);
		el('feGaussianBlur', {stdDeviation: 2.2, result: 'b'}, f);
		var m = el('feMerge', {}, f);
		el('feMergeNode', {'in': 'b'}, m);
		el('feMergeNode', {'in': 'SourceGraphic'}, m);
	}

	/** Pictogramme de type (14x14) dessiné au trait. */
	function typeIcon(g, type, x, y) {
		var st = {fill: 'none', stroke: '#ffffff', 'stroke-width': 1.3, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', opacity: .92};
		var P = function (d2, extra) { el('path', Object.assign({d: d2}, st, extra || {}), g); };
		var tr = function (px, py) { return [x + px, y + py]; };
		if (type === 'server') {
			el('rect', Object.assign({x: x, y: y + 1, width: 14, height: 5, rx: 1.5}, st), g);
			el('rect', Object.assign({x: x, y: y + 8, width: 14, height: 5, rx: 1.5}, st), g);
			el('circle', {cx: x + 3, cy: y + 3.5, r: .8, fill: '#fff'}, g); el('circle', {cx: x + 3, cy: y + 10.5, r: .8, fill: '#fff'}, g);
		}
		else if (type === 'switch') {
			el('rect', Object.assign({x: x, y: y + 3, width: 14, height: 8, rx: 1.5}, st), g);
			[3.2, 6, 8.8, 11.2].forEach(function (px) { el('rect', {x: x + px - .9, y: y + 7, width: 1.8, height: 2.2, fill: '#fff', opacity: .92}, g); });
		}
		else if (type === 'router') {
			el('circle', Object.assign({cx: x + 7, cy: y + 7, r: 5.5}, st), g);
			P('M' + (x + 7) + ',' + (y + 3) + ' V' + (y + 11) + ' M' + (x + 3) + ',' + (y + 7) + ' H' + (x + 11));
		}
		else if (type === 'firewall') {
			P('M' + (x + 7) + ',' + (y + 1) + ' L' + (x + 13) + ',' + (y + 3.2) + ' V' + (y + 7) + ' C' + (x + 13) + ',' + (y + 10.5) + ' ' + (x + 10) + ',' + (y + 12.4) + ' ' + (x + 7) + ',' + (y + 13.4) + ' C' + (x + 4) + ',' + (y + 12.4) + ' ' + (x + 1) + ',' + (y + 10.5) + ' ' + (x + 1) + ',' + (y + 7) + ' V' + (y + 3.2) + ' Z');
		}
		else if (type === 'storage') {
			el('ellipse', Object.assign({cx: x + 7, cy: y + 3, rx: 5.5, ry: 2}, st), g);
			P('M' + (x + 1.5) + ',' + (y + 3) + ' V' + (y + 11) + ' C' + (x + 1.5) + ',' + (y + 13) + ' ' + (x + 12.5) + ',' + (y + 13) + ' ' + (x + 12.5) + ',' + (y + 11) + ' V' + (y + 3));
			P('M' + (x + 1.5) + ',' + (y + 7) + ' C' + (x + 1.5) + ',' + (y + 9) + ' ' + (x + 12.5) + ',' + (y + 9) + ' ' + (x + 12.5) + ',' + (y + 7));
		}
		else if (type === 'ups') {
			el('rect', Object.assign({x: x + 1, y: y + 3, width: 11, height: 8, rx: 1.5}, st), g);
			el('rect', {x: x + 12, y: y + 5.5, width: 1.6, height: 3, rx: .6, fill: '#fff', opacity: .92}, g);
			P('M' + (x + 7.2) + ',' + (y + 4.5) + ' L' + (x + 4.6) + ',' + (y + 7.4) + ' H' + (x + 7.6) + ' L' + (x + 5.8) + ',' + (y + 9.8));
		}
		else if (type === 'patch') {
			[2.5, 7, 11.5].forEach(function (px) {
				el('rect', Object.assign({x: x + px - 1.7, y: y + 4, width: 3.4, height: 6, rx: .8}, st), g);
			});
		}
		else if (type === 'pdu') {
			P('M' + (x + 4.5) + ',' + (y + 1) + ' V' + (y + 5) + ' M' + (x + 9.5) + ',' + (y + 1) + ' V' + (y + 5));
			el('rect', Object.assign({x: x + 2.5, y: y + 5, width: 9, height: 4.5, rx: 1.6}, st), g);
			P('M' + (x + 7) + ',' + (y + 9.5) + ' V' + (y + 13));
		}
		else {
			el('rect', Object.assign({x: x + 1, y: y + 1, width: 12, height: 12, rx: 2.5}, st), g);
		}
	}

	function fmtBps(v) {
		if (v === null || v === undefined) { return '-'; }
		var u = ['bit/s', 'kb/s', 'Mb/s', 'Gb/s', 'Tb/s'], i = 0;
		while (v >= 1000 && i < u.length - 1) { v /= 1000; i++; }
		return (v >= 100 || i === 0 ? Math.round(v) : v.toFixed(1)) + ' ' + u[i];
	}

	function animOn() {
		try { return localStorage.getItem('rackmap.anim') !== '0'; } catch (e) { return true; }
	}

	function portIndex(str) {
		var m = /(\d+)\s*$/.exec(String(str || ''));
		return m ? parseInt(m[1], 10) - 1 : -1;
	}

	var SFP_SPEEDS = [1, 10, 25, 40, 100, 200, 400];

	/** Groupes SFP d'un équipement : [{n, speed}] (ancien format sfp / sfp_speed accepté). */
	function sfpGroups(d) {
		if (Array.isArray(d.sfp_groups)) {
			return d.sfp_groups.filter(function (g) { return g && g.n > 0; });
		}
		return d.sfp > 0 ? [{n: d.sfp, speed: d.sfp_speed || 10}] : [];
	}

	function sfpCount(d) {
		return sfpGroups(d).reduce(function (t, g) { return t + g.n; }, 0);
	}

	/** Face (0 avant, 1 arrière) où sont les ports RJ45/SFP d'un équipement (le patch panel en a des deux côtés). */
	function portFace(d) { return d && d.port_face === 1 ? 1 : 0; }

	/** Clé d'un équipement sur une face : les ports de l'avant et de l'arrière sont distincts. */
	function pk(id, face) { return id + ':' + (face ? 1 : 0); }

	/** Face du port d'une extrémité de câble : choisie pour un patch panel, imposée par l'équipement sinon. */
	function endFace(l, side) {
		var d = deviceById(side === 'a' ? l.a : l.b);
		if (!d) { return 0; }
		return d.type === 'patch' ? ((side === 'a' ? l.a_face : l.b_face) === 1 ? 1 : 0) : portFace(d);
	}

	var SFP_COLOR = {1: '#9aa3ad', 10: '#46c3d6', 25: '#4a90d9', 40: '#8e6bd1', 100: '#e0a21e', 200: '#e07a3a', 400: '#e0457b'};
	var SFP_NAME = {1: 'SFP', 10: 'SFP+', 25: 'SFP28', 40: 'QSFP+', 100: 'QSFP28', 200: 'QSFP56', 400: 'QSFP-DD'};

	/**
	 * Ports RJ45 puis SFP (cages colorées selon le débit), alignés à droite et réduits pour tenir dans maxW.
	 * Les ports SFP prolongent la numérotation des RJ45 (ex. 48 RJ45 -> SFP = 49, 50...).
	 */
	function portBlock(g, xr, y, h, n, sg, used, reg, maxW) {
		n = Math.min(n || 0, 96);
		var groups = [], start = 0, left = 48;
		if (n) { groups.push({kind: 'rj45', count: n, start: 0, pw: 10}); start = n; }
		(sg || []).forEach(function (sx) {
			var c = Math.min(sx.n, left);
			if (c > 0) { groups.push({kind: 'sfp', count: c, start: start, pw: sx.speed >= 40 ? 17 : 13, speed: sx.speed}); start += c; left -= c; }
		});
		var total = start, sfp = start - n;
		if (!total) { return 0; }

		var maxRows = Math.max(1, Math.floor((h - 8) / 11));
		var rows = Math.min(total > 8 ? 2 : 1, maxRows);
		var gap = 2.5, sep = 9;
		var widthOf = function (r, k) {
			var W = 0;
			groups.forEach(function (gr, i) { W += Math.ceil(gr.count / r) * (gr.pw * k + gap * k) - gap * k + (i ? sep : 0); });
			return W;
		};
		while (widthOf(rows, 1) > maxW && rows < maxRows) { rows++; }
		var k = Math.max(0.45, Math.min(1, maxW / widthOf(rows, 1)));
		var W = widthOf(rows, k), ph2 = 8, x0 = xr - W;
		var blockH = rows * ph2 + (rows - 1) * gap, y0 = y + (h - blockH) / 2 + (sfp ? 2 : 0);

		el('rect', {x: x0 - 4, y: y0 - 3 - (sfp ? 6 : 0), width: W + 8, height: blockH + 6 + (sfp ? 6 : 0), rx: 3, fill: '#0e131a', opacity: .88}, g);

		var cx = x0;
		groups.forEach(function (gr) {
			var gw = Math.ceil(gr.count / rows) * (gr.pw * k + gap * k) - gap * k;
			var speed = gr.speed;
			if (gr.kind === 'sfp') {
				var lab = el('text', {x: cx + gw / 2, y: y0 - 2.5, 'text-anchor': 'middle', 'font-size': 6.5, 'font-weight': 700, 'font-family': FONT, fill: SFP_COLOR[speed] || '#aab1bb'}, g);
				lab.textContent = (speed || 10) + 'G';
			}
			for (var i = 0; i < gr.count; i++) {
				var idx = gr.start + i;
				var px = cx + Math.floor(i / rows) * (gr.pw * k + gap * k), py = y0 + (i % rows) * (ph2 + gap), pw = gr.pw * k;
				if (reg) { reg(idx, px + pw / 2, py + ph2 / 2); }
				if (gr.kind === 'sfp') {
					var sc = SFP_COLOR[speed] || '#aab1bb';
					el('rect', {x: px, y: py, width: pw, height: ph2, rx: 1.4, fill: 'url(#rm-cage)', stroke: '#1b1e23', 'stroke-width': .6}, g);
					el('rect', {x: px + 1.3, y: py + 1.3, width: pw - 2.6, height: ph2 - 2.6, rx: .8, fill: 'url(#rm-sock)'}, g);
					el('rect', {x: px + 2, y: py + ph2 - 3.1, width: pw - 4, height: 1.5, rx: .7, fill: sc}, g);
				}
				else {
					el('rect', {x: px, y: py, width: pw, height: ph2, rx: 1.3, fill: '#5d6671'}, g);
					el('rect', {x: px + .7, y: py + .7, width: pw - 1.4, height: ph2 - 1.4, rx: 1, fill: 'url(#rm-sock)'}, g);
					el('rect', {x: px + pw * .3, y: py + .7, width: pw * .4, height: 1.5, rx: .6, fill: '#262b31'}, g);
					el('rect', {x: px + 2 * k, y: py + ph2 - 2.9, width: pw - 4 * k, height: 1.6, rx: .5, fill: '#d4b04a', opacity: .85}, g);
				}
				if (used[idx]) { el('rect', {x: px + 1, y: py + 1.2, width: Math.max(2, pw - 2), height: 2.4, rx: 1, fill: used[idx], filter: 'url(#rm-glow)'}, g); }
			}
			cx += gw + sep;
		});
		return W + 12;
	}

	function bayGrid(g, x1, y, h, cols, rows, bw, led) {
		var gap = 4, W = cols * (bw + gap) - gap, x0 = x1 - W, bh = (h - 12 - (rows - 1) * gap) / rows;
		for (var r = 0; r < rows; r++) {
			for (var c = 0; c < cols; c++) {
				var bx = x0 + c * (bw + gap), by = y + 6 + r * (bh + gap);
				el('rect', {x: bx, y: by, width: bw, height: bh, rx: 2, fill: '#14171a', stroke: '#6c737c', 'stroke-width': .8}, g);
				el('rect', {x: bx + 2, y: by + bh / 2 - 1, width: bw - 4, height: 2, rx: 1, fill: '#2c3238'}, g);
				if (led) { el('circle', {cx: bx + 4, cy: by + 4, r: 1.3, fill: '#46c37b'}, g); }
			}
		}
		return W + 10;
	}

	/** Nombre de disques par défaut (ancien affichage) quand rien n'est configuré. */
	function autoDisks(d) {
		var half = d.slot > 0, u = d.u_height || 1;
		if (d.type === 'storage') { return (half ? 2 : 4) * (u >= 2 ? 2 : 1); }
		return Math.min(u, 4) * (half ? (u >= 2 ? 3 : 2) : (u >= 2 ? 6 : 4));
	}

	function diskCount(d) {
		return d.disks >= 0 && d.disks !== undefined && d.disks !== null ? Math.min(60, d.disks) : autoDisks(d);
	}

	/** Baies disques : orientation horizontale (disques posés à plat, grille type Supermicro 3,5") ou verticale (2,5"). */
	function diskBlock(g, x1, y, h, d, maxW) {
		var n = diskCount(d);
		if (n <= 0) { return 0; }
		var vert = d.disk_orient === 1, gap = 4, innerH = h - 12, rows, cols, bw, bh;

		if (!vert) {
			// disques à plat : on cherche la grille dont les baies sont les plus larges que hautes
			var rowsMax = Math.max(1, Math.floor((innerH + gap) / (10 + gap))), best = null;
			for (var c = 1; c <= n; c++) {
				var r = Math.ceil(n / c);
				if (r > rowsMax) { continue; }
				var h1 = (innerH - (r - 1) * gap) / r;
				var w1 = Math.min(76, h1 * 3.6, (maxW - (c - 1) * gap) / c);
				if (w1 < 14) { continue; }
				var ratio = w1 / h1, good = ratio >= 2.2, waste = c * r - n;
				if (!best || (good && !best.good) ||
					(good === best.good && (good ? (waste < best.waste || (waste === best.waste && w1 > best.w)) : ratio > best.ratio))) {
					best = {c: c, r: r, w: w1, good: good, ratio: ratio, waste: waste};
				}
			}
			if (!best) { cols = Math.ceil(n / rowsMax); rows = Math.ceil(n / cols); bw = Math.max(8, (maxW - (cols - 1) * gap) / cols); }
			else { cols = best.c; rows = best.r; bw = best.w; }
		}
		else {
			// disques debout : fines baies verticales, sur une seule rangée si possible
			var rowsMaxV = Math.max(1, Math.floor((innerH + gap) / (16 + gap)));
			rows = 1;
			cols = n;
			bw = (maxW - (cols - 1) * gap) / cols;
			while (bw < 7 && rows < rowsMaxV) {
				rows++;
				cols = Math.ceil(n / rows);
				bw = (maxW - (cols - 1) * gap) / cols;
			}
			bw = Math.max(5, Math.min(11, bw));
		}

		bh = (innerH - (rows - 1) * gap) / rows;
		// à plat : une baie est toujours nettement plus large que haute (jamais l'inverse)
		if (!vert) { bh = Math.max(9, Math.min(bh, bw / 3.4)); }
		var gridH = rows * bh + (rows - 1) * gap, top0 = y + (h - gridH) / 2;
		var W = cols * (bw + gap) - gap, x0 = x1 - W;
		for (var i = 0; i < n; i++) {
			var bx = x0 + (i % cols) * (bw + gap), by = (vert ? y + 6 : top0) + Math.floor(i / cols) * (bh + gap);
			el('rect', {x: bx, y: by, width: bw, height: bh, rx: 2.4, fill: 'url(#rm-tray)', stroke: '#0a0c0f', 'stroke-width': .9}, g);
			el('rect', {x: bx + .8, y: by + .8, width: bw - 1.6, height: bh - 1.6, rx: 1.8, fill: 'none', stroke: '#fff', 'stroke-opacity': .09, 'stroke-width': .8}, g);
			if (vert) { el('rect', {x: bx + bw / 2 - 1, y: by + 6, width: 2, height: Math.max(2, bh - 12), rx: 1, fill: '#090b0d'}, g); }
			else { el('rect', {x: bx + 5, y: by + bh / 2 - 1, width: bw - 10, height: 2, rx: 1, fill: '#090b0d'}, g); }
			if (bw >= 8) { el('circle', {cx: bx + 3.4, cy: by + 3.4, r: 1.15, fill: '#4ade80'}, g); }
		}
		return W + 10;
	}

	/** Patch panel : ports RJ45 ou fibre (LC duplex). À l'arrière la numérotation est en miroir (le port n est derrière le port n de l'avant). */
	function patchPorts(g, d, x1, y, h, used, reg, fw, rear) {
		var pn = Math.min(d.ports || 24, 96), fib = d.pp_media === 1, unit = fib ? 14 : 11;
		var W0 = pn * unit + Math.floor((pn - 1) / 6) * 3, kk = Math.max(0.4, Math.min(1, (fw - 80) / W0));
		var pw = (unit - 2) * kk, gap = 2 * kk, gx = 3 * kk, W = pn * (pw + gap) + Math.floor((pn - 1) / 6) * gx, px0 = x1 - W;
		var ph = Math.min(11, h - 16);
		for (var i = 0; i < pn; i++) {
			var pos = rear ? pn - 1 - i : i;
			var px = px0 + pos * (pw + gap) + Math.floor(pos / 6) * gx;
			if (reg) { reg(i, px + pw / 2, y + 12 + ph / 2); }
			if (kk > 0.7 || (i + 1) % 6 === 0) {
				var tn = el('text', {x: px + pw / 2, y: y + 9, 'text-anchor': 'middle', 'font-size': 5, 'font-family': FONT, fill: rear ? (rearTheme() === 'light' ? '#475569' : '#d5dce8') : '#eef1f5', opacity: .9}, g);
				tn.textContent = i + 1;
			}
			if (fib) {
				el('rect', {x: px, y: y + 12, width: pw, height: ph, rx: 1.4, fill: '#7c8590', stroke: '#1b1e23', 'stroke-width': .5}, g);
				[0, 1].forEach(function (s2) {
					el('rect', {x: px + pw * (s2 ? .54 : .1), y: y + 13.2, width: pw * .36, height: ph - 2.4, rx: .9, fill: 'url(#rm-sock)'}, g);
					el('circle', {cx: px + pw * (s2 ? .72 : .28), cy: y + 12 + ph / 2, r: Math.max(.7, pw * .07), fill: '#46c3d6', opacity: .85}, g);
				});
			}
			else {
				el('rect', {x: px, y: y + 12, width: pw, height: ph, rx: 1.2, fill: '#5d6671'}, g);
				el('rect', {x: px + .6, y: y + 12.6, width: pw - 1.2, height: ph - 1.2, rx: .9, fill: 'url(#rm-sock)'}, g);
			}
			if (used[i]) { el('rect', {x: px + 1.5, y: y + 13, width: pw - 3, height: 2.4, rx: 1, fill: used[i], filter: 'url(#rm-glow)'}, g); }
		}
		return W + 8;
	}

	/** Prises d'un bloc multiprise (PDU). */
	function pduBlock(g, d, x1, y, h, used, reg, fw) {
		var on = Math.min(d.ports || 8, 16), ow = Math.max(8, Math.min(24, (fw - 90) / on - 4));
		for (var k = 0; k < on; k++) {
			var ox = x1 - (on - k) * (ow + 4) + 4;
			el('rect', {x: ox, y: y + 6, width: ow, height: h - 12, rx: 4, fill: 'url(#rm-tray)', stroke: '#0a0c0f', 'stroke-width': .9}, g);
			[0, 1].forEach(function (s2) {
				el('rect', {x: ox + ow * 0.25 + s2 * ow / 3, y: y + h / 2 - 4, width: 2.4, height: 8, rx: 1, fill: '#c9a43a'}, g);
			});
			if (reg) { reg(k, ox + ow / 2, y + h / 2); }
			if (used[k]) { el('circle', {cx: ox + ow - 4, cy: y + 9, r: 1.8, fill: used[k], filter: 'url(#rm-glow)'}, g); }
		}
		return on * (ow + 4) + 6;
	}

	function drawFace(g, d, x1, y, h, used, reg, fw) {
		var n = d.ports || 0, sg = sfpGroups(d), t = d.type, w = 0, half = d.slot > 0;
		var pf = t === 'patch' || portFace(d) === 0;
		if (!pf) { n = 0; sg = []; }
		fw = fw || 410;
		var room = Math.min(110, fw * 0.3);
		var nport = n + sg.reduce(function (t, x) { return t + x.n; }, 0);
		var bayMax = Math.max(40, fw - room - 36 - (nport > 0 ? Math.min(0.35 * (fw - room), 12.5 * nport + 16, 120) : 0));

		if (t === 'server') {
			w = diskBlock(g, x1 - 26, y, h, d, bayMax) + 26;
			el('circle', {cx: x1 - 10, cy: y + h / 2, r: 5.6, fill: 'url(#rm-tray)', stroke: '#0a0c0f', 'stroke-width': 1}, g);
			el('path', {d: 'M' + (x1 - 12.2) + ',' + (y + h / 2 - 1.8) + ' A3.1,3.1 0 1 0 ' + (x1 - 7.8) + ',' + (y + h / 2 - 1.8), fill: 'none', stroke: '#9aa3ae', 'stroke-width': 1, 'stroke-linecap': 'round'}, g);
			el('rect', {x: x1 - 10.5, y: y + h / 2 - 4, width: 1, height: 3.6, rx: .5, fill: '#9aa3ae'}, g);
		}
		else if (t === 'switch' || t === 'router' || t === 'firewall') {
			w = portBlock(g, x1, y, h, n, sg, used, reg, fw - room);
		}
		else if (t === 'storage') {
			w = diskBlock(g, x1, y, h, d, bayMax);
		}
		else if (t === 'ups') {
			el('rect', {x: x1 - 84, y: y + 7, width: 70, height: Math.min(h - 14, 32), rx: 3, fill: '#0f2418', stroke: '#050a07', 'stroke-width': 1.5}, g);
			for (var b = 0; b < 5; b++) {
				el('rect', {x: x1 - 78 + b * 12, y: y + 13, width: 8, height: Math.min(h - 26, 20), fill: '#46c37b', opacity: .85 - b * .12}, g);
			}
			el('circle', {cx: x1 - 100, cy: y + h / 2, r: 7, fill: 'url(#rm-tray)', stroke: '#0a0c0f', 'stroke-width': 1}, g);
			w = 112;
		}
		else if (t === 'patch') {
			w = patchPorts(g, d, x1, y, h, used, reg, fw, false);
		}
		else if (t === 'pdu') {
			if (pf) { w = pduBlock(g, d, x1, y, h, used, reg, fw); }
			else {
				el('rect', {x: x1 - 44, y: y + 8, width: 34, height: h - 16, rx: 3, fill: 'url(#rm-tray)', stroke: '#0a0c0f', 'stroke-width': .9}, g);
				el('circle', {cx: x1 - 27, cy: y + h / 2, r: 4.2, fill: '#07080a', stroke: '#6f7782', 'stroke-width': .8}, g);
				w = 52;
			}
		}
		else {
			for (var v = 0; v < 6; v++) { el('rect', {x: x1 - 70 + v * 11, y: y + 8, width: 6, height: h - 16, rx: 3, fill: '#15181b'}, g); }
			w = 76;
		}

		if (!pf && (t === 'switch' || t === 'router' || t === 'firewall')) {
			for (var lq = 0; lq < 8; lq++) {
				el('circle', {cx: x1 - 8 - lq * 9, cy: y + h / 2, r: 1.5, fill: lq < 2 ? '#4ade80' : '#2b323a'}, g);
			}
			w = 82;
		}

		if ((t === 'server' || t === 'storage' || t === 'other') && (n > 0 || sg.length)) {
			w += portBlock(g, x1 - w - 6, y, h, n, sg, used, reg, Math.max(40, fw - room - 10 - w));
		}
		else if (t === 'ups' && n > 0) {
			w += portBlock(g, x1 - w - 6, y, h, n, [], used, reg, Math.max(40, fw - room - 10 - w));
		}

		return w;
	}

	/** Bloc d'alimentation (PSU) vu de l'arrière : grille de ventilation + prise C14 + voyant. */
	function psuModule(g, x, y, w, h) {
		el('rect', {x: x, y: y, width: w, height: h, rx: 3, fill: 'url(#rm-tray)', stroke: '#07080a', 'stroke-width': .9}, g);
		el('rect', {x: x + .8, y: y + .8, width: w - 1.6, height: h - 1.6, rx: 2.4, fill: 'none', stroke: '#fff', 'stroke-opacity': .08}, g);
		var bars = Math.max(2, Math.floor((h - 8) / 5));
		for (var i = 0; i < bars; i++) {
			el('rect', {x: x + 4, y: y + 4 + i * ((h - 8) / bars), width: w * .36, height: Math.max(1.4, (h - 8) / bars - 1.8), rx: .7, fill: '#07080a'}, g);
		}
		var iw = w * .42, ih = Math.min(h - 12, 15), ix = x + w - iw - 4, iy = y + (h - ih) / 2;
		el('rect', {x: ix, y: iy, width: iw, height: ih, rx: 2, fill: '#0b0d10', stroke: '#59616c', 'stroke-width': .7}, g);
		[.28, .5, .72].forEach(function (f) { el('rect', {x: ix + iw * f - .9, y: iy + 3, width: 1.8, height: ih - 6, rx: .6, fill: '#b8924a'}, g); });
		el('circle', {cx: x + w - 4.5, cy: y + 4.5, r: 1.3, fill: '#4ade80'}, g);
	}

	function fanModule(g, x, y, w, h) {
		el('rect', {x: x, y: y, width: w, height: h, rx: 3, fill: 'url(#rm-tray)', stroke: '#07080a', 'stroke-width': .9}, g);
		var r = Math.min(w, h) / 2 - 3.5, cx = x + w / 2, cy = y + h / 2;
		el('circle', {cx: cx, cy: cy, r: r, fill: '#07080a', stroke: '#3a4048', 'stroke-width': .8}, g);
		[0, 45, 90, 135].forEach(function (a) {
			var dx = Math.cos(a * Math.PI / 180) * (r - 1), dy = Math.sin(a * Math.PI / 180) * (r - 1);
			el('line', {x1: cx - dx, y1: cy - dy, x2: cx + dx, y2: cy + dy, stroke: '#2a3037', 'stroke-width': 1}, g);
		});
		el('circle', {cx: cx, cy: cy, r: Math.max(1.6, r * .28), fill: '#1b1f24', stroke: '#454c56', 'stroke-width': .6}, g);
	}

	/** Connecteurs de gestion d'un serveur : VGA, USB, RJ45 de supervision. */
	function ioBlock(g, xr, y, h) {
		var x0 = xr - 46, cy = y + h / 2;
		el('rect', {x: x0, y: cy - 4, width: 15, height: 8, rx: 1.5, fill: '#2f6fb5', stroke: '#0a0c0f', 'stroke-width': .6}, g);
		[0, 1].forEach(function (k) { el('rect', {x: x0 + 19 + k * 9, y: cy - 3, width: 7, height: 6, rx: 1, fill: '#0b0d10', stroke: '#59616c', 'stroke-width': .6}, g); });
		el('rect', {x: x0 + 37, y: cy - 4, width: 9, height: 8, rx: 1.2, fill: '#5d6671'}, g);
		el('rect', {x: x0 + 37.6, y: cy - 3.4, width: 7.8, height: 6.8, rx: .9, fill: 'url(#rm-sock)'}, g);
		return 52;
	}

	/** Contenu de la face arrière d'un équipement (alimentations, ventilateurs, ports). Retourne la largeur occupée à droite. */
	function drawRear(g, d, x1, y, h, used, reg, fw) {
		var t = d.type, w = 0, pf = portFace(d) === 1, n = pf ? (d.ports || 0) : 0, sg = pf ? sfpGroups(d) : [];
		var ph = Math.max(14, Math.min(h - 10, 42)), py = y + (h - ph) / 2;

		if (t === 'patch') { return patchPorts(g, d, x1, y, h, used, reg, fw, true); }

		if (t === 'pdu') {
			if (pf) { return pduBlock(g, d, x1, y, h, used, reg, fw); }
			el('rect', {x: x1 - 44, y: y + 8, width: 34, height: h - 16, rx: 3, fill: 'url(#rm-tray)', stroke: '#0a0c0f', 'stroke-width': .9}, g);
			el('circle', {cx: x1 - 27, cy: y + h / 2, r: 4.2, fill: '#07080a', stroke: '#6f7782', 'stroke-width': .8}, g);
			return 52;
		}

		if (t === 'ups') {
			for (var o = 0; o < 6; o++) {
				var ox = x1 - 28 * (6 - o) + 4;
				el('rect', {x: ox, y: y + 7, width: 22, height: Math.min(h - 14, 30), rx: 3, fill: '#0b0d10', stroke: '#59616c', 'stroke-width': .7}, g);
				[.3, .7].forEach(function (f) { el('rect', {x: ox + 22 * f - .9, y: y + 12, width: 1.8, height: 6, rx: .6, fill: '#b8924a'}, g); });
			}
			w = 28 * 6 + 8;
		}
		else {
			var big = fw >= 330, pw = Math.min(58, Math.max(34, fw * (big ? .12 : .17)));
			var count = big ? 2 : 1;
			if (t === 'router' || t === 'firewall' || t === 'switch') { count = big ? 2 : 1; }
			for (var i = 0; i < count; i++) { w += pw + 4; psuModule(g, x1 - w + 4, py, pw, ph); }
			w += 6;
		}

		if (n > 0 || sg.length) { w += portBlock(g, x1 - w, y, h, n, sg, used, reg, Math.max(40, fw - 130 - w)); }

		var rem = fw - 130 - w;
		if (t === 'server' && rem >= 52) { w += ioBlock(g, x1 - w, y, h); rem -= 52; }
		if ((t === 'storage' || t === 'switch' || t === 'router' || t === 'firewall' || t === 'other') && rem >= 38) {
			var fc = Math.min(t === 'storage' ? 3 : 2, Math.floor(rem / 38));
			for (var f = 0; f < fc; f++) { w += 38; fanModule(g, x1 - w + 4, py, 34, ph); }
		}
		return w;
	}

	function drawDeviceRear(svg, d, x, y, w, h, color, tipText, selected, used, reg) {
		var g = el('g', {style: state.edit ? 'cursor:grab' : 'cursor:pointer'}, svg);
		el('title', {}, g).textContent = tipText;
		var ft = FACE[d.type] ? d.type : 'other', RT = rearTheme(), lightP = RT === 'light';

		// tôle galvanisée perforée, avec un liseré de la couleur du type pour retrouver l'équipement
		el('rect', {x: x + 1, y: y + 3.5, width: w - 2, height: h - 2, rx: 6, fill: '#000', opacity: .5, filter: 'url(#rm-blur)'}, g);
		el('rect', {x: x, y: y + 1, width: w, height: h - 2, rx: 6, fill: RT === 'color' ? 'url(#rm-f-' + ft + ')' : (RT === 'dark' ? 'url(#rm-plate-dark)' : 'url(#rm-plate)')}, g);
		if (d.type !== 'patch') { el('rect', {x: x + 2, y: y + 2, width: w - 4, height: h - 4, fill: 'url(#rm-mesh)', opacity: lightP ? .35 : (RT === 'color' ? .22 : .6)}, g); }
		el('rect', {x: x, y: y + 1, width: w, height: h - 2, rx: 6, fill: 'url(#rm-sheen)', opacity: lightP ? .55 : .9}, g);
		el('rect', {x: x + .5, y: y + 1.5, width: w - 1, height: h - 3, rx: 5.6, fill: 'none', stroke: '#1b2230', 'stroke-opacity': .55, 'stroke-width': 1}, g);
		el('rect', {x: x + 1.5, y: y + 2.5, width: w - 3, height: h - 5, rx: 4.8, fill: 'none', stroke: '#fff', 'stroke-opacity': lightP ? .5 : .14, 'stroke-width': 1}, g);
		el('rect', {x: x + 8, y: y + 1, width: w - 16, height: 3, rx: 1.5, fill: RT === 'color' ? '#ffffff' : FACE[ft][0], opacity: RT === 'color' ? .35 : 1}, g);
		[[x + 8, y + 8], [x + w - 8, y + 8], [x + 8, y + h - 8], [x + w - 8, y + h - 8]].forEach(function (c) {
			el('circle', {cx: c[0], cy: c[1], r: 1.8, fill: '#8f98a5', stroke: '#5b6573', 'stroke-width': .6}, g);
		});

		el('rect', {x: x + 14, y: y + 9, width: 3, height: h - 18, rx: 1.5, fill: color, stroke: '#1b2230', 'stroke-opacity': .4, 'stroke-width': .6}, g);

		var reserved = drawRear(g, d, x + w - 12, y, h, used || {}, reg, w - 28);

		var nx = x + 24, avail = (x + w - 12) - nx - reserved - 6;
		var maxc = Math.max(3, Math.floor(avail / 6.8));
		var label = d.name.length > maxc ? d.name.slice(0, Math.max(1, maxc - 1)) + '\u2026' : d.name;
		var ny = y + (d.u_height > 1 ? 21 : UH / 2 + 4);
		var halo = el('text', {x: nx, y: ny, 'font-size': 12, 'font-weight': 600, 'font-family': FONT, fill: lightP ? '#ffffff' : '#07080a', stroke: lightP ? '#ffffff' : '#07080a', 'stroke-width': 3, 'stroke-linejoin': 'round', opacity: lightP ? .55 : .35}, g);
		halo.textContent = label;
		var tx = el('text', {x: nx, y: ny, 'font-size': 12, 'font-weight': 600, 'font-family': FONT, fill: lightP ? '#1c2433' : '#f2f5fa'}, g);
		tx.textContent = label;
		if (d.u_height > 1) {
			var tl = (L['t_' + d.type] || '').toUpperCase();
			if (tl) {
				el('rect', {x: nx, y: y + 27, width: tl.length * 6.1 + 9, height: 12, rx: 6, fill: RT === 'color' ? '#00000055' : FACE[ft][1]}, g);
				var tg = el('text', {x: nx + 4.5, y: y + 36, 'font-size': 8.2, 'font-weight': 600, 'font-family': FONT, fill: '#ffffff', 'letter-spacing': '.09em'}, g);
				tg.textContent = tl;
			}
		}

		if (selected) {
			el('rect', {x: x - 1, y: y - .5, width: w + 2, height: h + 1, rx: 7, fill: 'none', stroke: '#ffffff', 'stroke-width': 2.2}, g);
		}
		return g;
	}

	function drawDevice(svg, d, x, y, w, h, color, st, tipText, selected, used, reg, face) {
		if (face === 1) { return drawDeviceRear(svg, d, x, y, w, h, color, tipText, selected, used, reg); }
		var EAR = 15;
		var g = el('g', {style: state.edit ? 'cursor:grab' : 'cursor:pointer'}, svg);
		el('title', {}, g).textContent = tipText;
		var ft = FACE[d.type] ? d.type : 'other';

		// ombre portée, façade colorée, reflet
		el('rect', {x: x + 1, y: y + 3.5, width: w - 2, height: h - 2, rx: 6, fill: '#000', opacity: .5, filter: 'url(#rm-blur)'}, g);
		el('rect', {x: x, y: y + 1, width: w, height: h - 2, rx: 6, fill: 'url(#rm-f-' + ft + ')'}, g);
		el('rect', {x: x, y: y + 1, width: w, height: h - 2, rx: 6, fill: 'url(#rm-sheen)'}, g);
		el('rect', {x: x + .5, y: y + 1.5, width: w - 1, height: h - 3, rx: 5.6, fill: 'none', stroke: '#000', 'stroke-opacity': .35, 'stroke-width': 1}, g);
		el('rect', {x: x + 1.5, y: y + 2.5, width: w - 3, height: h - 5, rx: 4.8, fill: 'none', stroke: '#fff', 'stroke-opacity': .16, 'stroke-width': 1}, g);

		// oreilles : bandes plus sombres avec fentes oblongues
		[0, 1].forEach(function (side) {
			var ex = side ? x + w - EAR : x;
			el('rect', {x: ex, y: y + 1, width: EAR, height: h - 2, rx: 6, fill: 'url(#rm-ear)'}, g);
			el('rect', {x: side ? ex : ex + EAR - 1, y: y + 4, width: 1, height: h - 8, fill: '#000', opacity: .3}, g);
			for (var u = 0; u < d.u_height; u++) {
				[.27, .73].forEach(function (f) {
					el('rect', {x: ex + EAR / 2 - 2.4, y: y + u * UH + UH * f - 2.8, width: 4.8, height: 5.6, rx: 2.4, fill: '#0b0e13', opacity: .85}, g);
				});
			}
		});

		// voyant d'état : barre à gauche + LED vitrée à droite
		el('rect', {x: x + EAR + 2, y: y + 6, width: 3, height: h - 12, rx: 1.5, fill: color, stroke: '#000', 'stroke-opacity': .3, 'stroke-width': .6}, g);
		el('circle', {cx: x + w - EAR / 2, cy: y + h / 2, r: 4.4, fill: '#07080a'}, g);
		el('circle', {cx: x + w - EAR / 2, cy: y + h / 2, r: 3.1, fill: color, filter: 'url(#rm-glow)'}, g);
		el('circle', {cx: x + w - EAR / 2 - .9, cy: y + h / 2 - 1, r: 1, fill: '#fff', opacity: .55}, g);

		var reserved = drawFace(g, d, x + w - EAR - 8, y, h, used || {}, reg, w - 2 * EAR - 18);

		var ix = x + EAR + 12, half = d.slot > 0, nx = half ? ix : ix + 20, avail = (x + w - EAR - 8) - nx - reserved - 6;
		var maxc = Math.max(3, Math.floor(avail / 6.9));
		var label = d.name.length > maxc ? d.name.slice(0, Math.max(1, maxc - 1)) + '\u2026' : d.name;
		var ny = y + (d.u_height > 1 ? 21 : UH / 2 + 4.5);
		if (!half) { typeIcon(g, ft, ix, ny - 11.5); }
		var halo = el('text', {x: nx, y: ny, 'font-size': 12.5, 'font-weight': 600, 'font-family': FONT, fill: '#07080a', stroke: '#07080a',
			'stroke-width': 3, 'stroke-linejoin': 'round', opacity: .35}, g);
		halo.textContent = label;
		var tx = el('text', {x: nx, y: ny, 'font-size': 12.5, 'font-weight': 600, 'font-family': FONT, fill: '#ffffff'}, g);
		tx.textContent = label;
		if (d.u_height > 1 && TYPE_LABEL[d.type] !== undefined) {
			var tl = (L['t_' + d.type] || '').toUpperCase();
			if (tl) {
				el('rect', {x: ix, y: y + 27, width: tl.length * 6.1 + 9, height: 12, rx: 6, fill: '#000', opacity: .28}, g);
				var tg = el('text', {x: ix + 4.5, y: y + 36, 'font-size': 8.2, 'font-weight': 600, 'font-family': FONT, fill: '#ffffff', 'letter-spacing': '.09em', opacity: .9}, g);
				tg.textContent = tl;
			}
		}

		if (selected) {
			el('rect', {x: x - 1, y: y - .5, width: w + 2, height: h + 1, rx: 7, fill: 'none', stroke: '#ffffff', 'stroke-width': 2.2}, g);
		}

		return g;
	}

	function cablePath(x0, ya, x1, yb) {
		var r = 9, dir = yb > ya ? 1 : -1;
		if (Math.abs(yb - ya) < 2 * r) { return 'M' + x0 + ' ' + ya + ' H' + x1 + ' V' + yb + ' H' + x0; }
		return 'M' + x0 + ' ' + ya + ' H' + (x1 - r) + ' Q' + x1 + ' ' + ya + ' ' + x1 + ' ' + (ya + dir * r) +
			' V' + (yb - dir * r) + ' Q' + x1 + ' ' + yb + ' ' + (x1 - r) + ' ' + yb + ' H' + x0;
	}

	/** Ports effectifs (numéro explicite -> index ; sinon premier port libre), sur l'ensemble des baies affichées. */
	function resolvePorts(racks) {
		var resolved = {}, effPorts = {}, usedPorts = {}, devEnds = {}, devs = [];
		racks.forEach(function (rack) {
			devs = devs.concat(rack.devices);
			rack.links.forEach(function (l) {
				[['a', l.a, l.a_port], ['b', l.b, l.b_port]].forEach(function (e) {
					var k = pk(e[1], endFace(l, e[0]));
					(devEnds[k] = devEnds[k] || []).push({key: l.id + ':' + e[0], idx: portIndex(e[2]), l: l});
				});
			});
		});
		devs.forEach(function (d) {
			[0, 1].forEach(function (f) {
				var k = pk(d.id, f), ends = devEnds[k] || [], taken = {}, max = -1;
				ends.forEach(function (e) { if (e.idx >= 0 && e.idx < 96) { taken[e.idx] = true; max = Math.max(max, e.idx); } else { e.idx = -1; } });
				var next = 0;
				ends.forEach(function (e) {
					if (e.idx < 0) {
						while (taken[next] && next < 96) { next++; }
						if (next < 96) { e.idx = next; taken[next] = true; max = Math.max(max, next); }
					}
					resolved[e.key] = e.idx;
					if (e.idx >= 0) {
						(usedPorts[k] = usedPorts[k] || {})[e.idx] = e.l.color || CABLE_COLOR[e.l.cable] || CABLE_COLOR.other;
					}
				});
				effPorts[k] = Math.min(96, Math.max((d.ports || 0) + sfpCount(d), max + 1));
			});
		});

		return {resolved: resolved, effPorts: effPorts, usedPorts: usedPorts};
	}

	function rearTheme() {
		var v = 'light';
		try { v = localStorage.getItem('rackmap.rear') || v; } catch (e) {}
		return ['light', 'color', 'dark'].indexOf(v) >= 0 ? v : 'light';
	}

	function styleSelect(bar) {
		html('label', {}, L.rear_theme + ' :', bar);
		var rs = select([['light', L.rt_light], ['color', L.rt_color], ['dark', L.rt_dark]], rearTheme(), function (v) {
			try { localStorage.setItem('rackmap.rear', v); } catch (e) { /* ignore */ }
			render();
		});
		rs.style.flex = 'none';
		bar.appendChild(rs);

		html('label', {}, L.rack_style + ' :', bar);
		var ss = select([['cabinet', L.rs_cabinet], ['open', L.rs_open], ['card', L.rs_card]], rackStyle(), function (v) {
			try { localStorage.setItem('rackmap.style', v); } catch (e) { /* ignore */ }
			render();
		});
		ss.style.flex = 'none';
		bar.appendChild(ss);
	}

	function rackStyle() {
		var v = 'cabinet';
		try { v = localStorage.getItem('rackmap.style') || v; } catch (e) {}
		return ['cabinet', 'open', 'card'].indexOf(v) >= 0 ? v : 'cabinet';
	}

	function defsRack(svg) {
		if (svg.querySelector('#rm-post')) { return; }
		var d = svg.querySelector('defs') || el('defs', {}, svg);
		grad(d, 'rm-post', [[0, '#8e99a8'], [0.25, '#e4e9f0'], [0.5, '#b3bcc9'], [1, '#6e7a8a']], 1, 0);
		grad(d, 'rm-side', [[0, '#1b222c'], [0.5, '#121820'], [1, '#1b222c']], 1, 0);
		grad(d, 'rm-top', [[0, '#3a4452'], [1, '#202733']], 0, 1);
		grad(d, 'rm-glass', [[0, '#ffffff', 0.07], [0.45, '#ffffff', 0.02], [0.5, '#ffffff', 0], [1, '#ffffff', 0.04]], 1, 1);
		grad(d, 'rm-cardbg', [[0, '#141a22'], [1, '#0c1016']], 0, 1);
		grad(d, 'rm-strip', [[0, '#202833'], [1, '#161c24']], 0, 1);
	}

	// cadre de la baie selon le style : cabinet (armoire), open (cadre ouvert), card (carte moderne)
	function drawFrame(svg, RS, fx, fw, bodyH, ROOF, PLINTH, face) {
		defsRack(svg);
		var base = TOP + bodyH;
		el('ellipse', {cx: fx + fw / 2, cy: base + PLINTH + 16, rx: fw / 2 + 10, ry: 7, fill: '#000', opacity: RS === 'open' ? .5 : .35, filter: 'url(#rm-blur)'}, svg);
		if (RS === 'cabinet') {
			// panneaux latéraux + toit ventilé + plinthe avec roulettes
			el('rect', {x: fx - 9, y: TOP - ROOF - 2, width: fw + 18, height: bodyH + ROOF + PLINTH + 6, rx: 7, fill: 'url(#rm-side)', stroke: '#06080b', 'stroke-width': 1.6}, svg);
			el('rect', {x: fx - 9, y: TOP - ROOF - 2, width: fw + 18, height: ROOF + 2, rx: 7, fill: 'url(#rm-top)', stroke: '#06080b', 'stroke-width': 1.2}, svg);
			el('rect', {x: fx - 6, y: TOP - ROOF - 1, width: fw + 12, height: 1.2, rx: .6, fill: '#fff', opacity: .22}, svg);
			for (var i = 0; i < 9; i++) {
				el('rect', {x: fx + 16 + i * 9, y: TOP - ROOF + 5, width: 5, height: 2.4, rx: 1.2, fill: '#0a0d12', opacity: .8}, svg);
				el('rect', {x: fx + fw - 16 - 5 - i * 9, y: TOP - ROOF + 5, width: 5, height: 2.4, rx: 1.2, fill: '#0a0d12', opacity: .8}, svg);
			}
			el('rect', {x: fx + fw / 2 - 28, y: TOP - ROOF + 3, width: 56, height: 8, rx: 4, fill: '#0b0f14', stroke: '#394453', 'stroke-width': .8}, svg);
			el('circle', {cx: fx + fw / 2 - 18, cy: TOP - ROOF + 7, r: 1.8, fill: '#34d399', opacity: .95}, svg);
			el('rect', {x: fx - 9, y: base + 3, width: fw + 18, height: PLINTH, rx: 5, fill: 'url(#rm-top)', stroke: '#06080b', 'stroke-width': 1.2}, svg);
			for (var k = 0; k < 14; k++) {
				el('rect', {x: fx + 30 + k * ((fw - 60) / 13) - 6, y: base + 8, width: 12, height: 2.2, rx: 1.1, fill: '#0a0d12', opacity: .75}, svg);
			}
			[fx + 6, fx + fw - 6].forEach(function (cx) {
				el('circle', {cx: cx, cy: base + PLINTH + 9, r: 5, fill: '#10141a', stroke: '#2a323d', 'stroke-width': 1}, svg);
				el('circle', {cx: cx, cy: base + PLINTH + 9, r: 1.7, fill: '#3a4452'}, svg);
			});
			el('rect', {x: RACK_X - 2, y: TOP - 2, width: RACK_W + 4, height: bodyH + 4, fill: '#06080b'}, svg);
		}
		else if (RS === 'open') {
			el('rect', {x: RACK_X - 6, y: TOP - 8, width: RACK_W + 12, height: 6, rx: 3, fill: 'url(#rm-post)', opacity: .9}, svg);
			el('rect', {x: RACK_X - 6, y: base + 2, width: RACK_W + 12, height: 6, rx: 3, fill: 'url(#rm-post)', opacity: .9}, svg);
			el('rect', {x: RACK_X, y: TOP, width: RACK_W, height: bodyH, fill: '#0a0e13', opacity: .55}, svg);
			[fx - 2, fx + fw - 18].forEach(function (x0) {
				el('rect', {x: x0, y: TOP - 12, width: 20, height: bodyH + 12 + 14, rx: 4, fill: 'url(#rm-post)', stroke: '#4c5766', 'stroke-width': .8}, svg);
				el('rect', {x: x0 - 3, y: base + 14, width: 26, height: 6, rx: 3, fill: '#222a34', stroke: '#06080b', 'stroke-width': 1}, svg);
			});
		}
		else {
			el('rect', {x: fx - 10, y: TOP - ROOF - 4, width: fw + 20, height: bodyH + ROOF + PLINTH + 8, rx: 16, fill: 'url(#rm-cardbg)', stroke: '#26303c', 'stroke-width': 1.4}, svg);
			el('rect', {x: fx - 9, y: TOP - ROOF - 3, width: fw + 18, height: 1.4, rx: .7, fill: '#fff', opacity: .12}, svg);
			el('rect', {x: fx - 4, y: TOP - 4, width: fw + 8, height: bodyH + 8, rx: 8, fill: '#080b0f', stroke: '#1a222c', 'stroke-width': 1}, svg);
			[fx, RACK_X + RACK_W].forEach(function (x0) {
				el('rect', {x: x0 + 1, y: TOP, width: RAIL_W() - 2, height: bodyH, rx: 4, fill: 'url(#rm-strip)'}, svg);
			});
			el('circle', {cx: fx + 4, cy: base + PLINTH - 2, r: 2.4, fill: '#2b3542'}, svg);
			el('circle', {cx: fx + fw - 4, cy: base + PLINTH - 2, r: 2.4, fill: '#2b3542'}, svg);
		}
		if (RS !== 'card') {
			el('rect', {x: RACK_X, y: TOP, width: RACK_W, height: bodyH, fill: '#0b0f14', opacity: RS === 'open' ? 0 : 1}, svg);
			[fx, RACK_X + RACK_W].forEach(function (x0) {
				if (RS === 'open') { return; }
				el('rect', {x: x0, y: TOP, width: RAIL_W(), height: bodyH, fill: 'url(#rm-rail)', stroke: '#0a0d11', 'stroke-width': .8}, svg);
			});
		}
		else {
			el('rect', {x: RACK_X, y: TOP, width: RACK_W, height: bodyH, fill: '#0b0f14'}, svg);
		}
	}

	function RAIL_W() { return 22; }

	// décor d'une unité U : trous de montants, numéro, emplacement vide
	function drawUnit(svg, RS, rack, u, y, fx, oc) {
		var RAIL = RAIL_W();
		var num = rack.u_desc ? rack.units - u + 1 : u;
		[fx, RACK_X + RACK_W].forEach(function (rx0) {
			if (RS === 'card') {
				[.18, .5, .82].forEach(function (f) {
					el('rect', {x: rx0 + RAIL / 2 - 3.5, y: y + UH * f - .6, width: 7, height: 1.2, rx: .6, fill: u % 5 === 0 && f === .5 ? '#5b6a7e' : '#3a4656'}, svg);
				});
			}
			else if (RS === 'open') {
				[.2, .5, .8].forEach(function (f) {
					el('rect', {x: rx0 + RAIL / 2 - 2.7 - 1, y: y + UH * f - 3, width: 5.4, height: 6, rx: 2.2, fill: '#222a34', stroke: '#566174', 'stroke-width': .5}, svg);
				});
			}
			else {
				[.2, .5, .8].forEach(function (f) {
					el('rect', {x: rx0 + RAIL / 2 - 2.7, y: y + UH * f - 3, width: 5.4, height: 6, rx: 1.3, fill: '#070a0e', stroke: '#364150', 'stroke-opacity': .9, 'stroke-width': .5}, svg);
				});
			}
		});
		if (RS === 'card') {
			var pw = String(num).length > 1 ? 22 : 18;
			el('rect', {x: fx - 12 - pw + 4, y: y + UH / 2 - 8, width: pw, height: 16, rx: 8, fill: '#161d27', stroke: '#222c39', 'stroke-width': .8}, svg);
			var tn = el('text', {x: fx - 12 - pw / 2 + 4, y: y + UH / 2 + 3.5, 'text-anchor': 'middle', 'font-size': 9.5, 'font-family': MONO, fill: '#7e8da3'}, svg);
			tn.textContent = num;
		}
		else {
			var t = el('text', {x: fx - 12, y: y + UH / 2 + 3.5, 'text-anchor': 'end', 'font-size': 9.5, 'font-family': MONO, fill: RS === 'open' ? '#7b8798' : '#5b6678'}, svg);
			t.textContent = num;
		}
		var halves = [];
		if (!oc.l && !oc.r) { halves.push([RACK_X + 1, RACK_W - 2]); }
		else {
			if (!oc.l) { halves.push([RACK_X + 1, RACK_W / 2 - 2]); }
			if (!oc.r) { halves.push([RACK_X + RACK_W / 2 + 1, RACK_W / 2 - 2]); }
		}
		halves.forEach(function (hw) {
			if (RS === 'card') {
				el('rect', {x: hw[0], y: y + 1, width: hw[1], height: UH - 2, rx: 5, fill: u % 2 ? '#0f141b' : '#0c1117', stroke: '#171e28', 'stroke-width': .8}, svg);
				el('rect', {x: hw[0] + hw[1] / 2 - 10, y: y + UH / 2 - .5, width: 20, height: 1, rx: .5, fill: '#1e2733'}, svg);
			}
			else if (RS === 'open') {
				el('rect', {x: hw[0], y: y + 1, width: hw[1], height: UH - 2, rx: 3, fill: '#0c1117', opacity: .6, stroke: '#1d2631', 'stroke-width': .8, 'stroke-dasharray': '3 3'}, svg);
			}
			else {
				el('rect', {x: hw[0], y: y + 1, width: hw[1], height: UH - 2, rx: 3, fill: '#0e1319', stroke: '#18202a', 'stroke-width': 1}, svg);
				el('rect', {x: hw[0] + 3, y: y + UH - 3.5, width: hw[1] - 6, height: 1, fill: '#fff', opacity: .03}, svg);
			}
		});
	}

	function drawOne(svg, rack, ox, hosts, editing, ctx, ro, face) {
		face = face === 1 ? 1 : 0;
		var RAIL = 22, ROOF = 16, PLINTH = 16;
		var bodyH = rack.units * UH;

		var fx = RACK_X - RAIL, fw = RACK_W + 2 * RAIL;

		var RS = rackStyle();
		drawFrame(svg, RS, fx, fw, bodyH, ROOF, PLINTH, face);

		var occupied = {};
		rack.devices.forEach(function (d) {
			var bu0 = bottomU(rack, d);
			for (var u = bu0; u < bu0 + d.u_height; u++) {
				var oc = occupied[u] = occupied[u] || {};
				if (!d.slot) { oc.l = oc.r = true; } else if ((d.slot === 1) !== !!face) { oc.l = true; } else { oc.r = true; }
			}
		});

		for (var u = 1; u <= rack.units; u++) {
			var y = TOP + (rack.units - u) * UH;
			var oc2 = occupied[u] || {};
			drawUnit(svg, RS, rack, u, y, fx, oc2);
		}

		var tt = el('text', {x: fx + fw / 2, y: 11, 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 600, 'font-family': FONT, fill: 'currentColor', opacity: .85}, svg);
		tt.textContent = rack.name + (rack.site ? '  \u00b7  ' + rack.site : '');
		if (face === 1 || facesOf(rack).length > 1) {
			var fts = el('tspan', {fill: face ? '#f59e0b' : '#60a5fa', 'font-weight': 700}, tt);
			fts.textContent = '  \u00b7  ' + (face ? L.face_rear : L.face_front).toUpperCase();
		}

		rack.devices.forEach(function (d) {
			var st = deviceState(d, hosts);
			var y = TOP + (rack.units - (bottomU(rack, d) + d.u_height - 1)) * UH;
			var h = d.u_height * UH;
			var slot = d.slot || 0, dw = slot ? RACK_W / 2 - 1 : RACK_W;
			var dx = slot !== 0 && ((slot === 2) !== !!face) ? RACK_X + RACK_W / 2 + 1 : RACK_X;
			var key = pk(d.id, face);
			ctx.pos[key] = {y: y, h: h, cy: y + h / 2, ox: ox, rx: dx + dw};
			var color = st.state === 'problem' && st.severity >= 0 ? SEV_COLOR[st.severity] : (st.state === 'down' ? COL_DOWN : STATE_COLOR[st.state]);
			var selected = editing ? (!ro && state.edit.selected === d.id) : state.sel === d.id;
			var tip = d.name + ' - ' + L['st_' + st.state] + (st.problems ? ' (' + st.problems + ' ' + L.problems + ')' : '');
			ctx.ports[key] = {};
			var g = drawDevice(svg, Object.assign({}, d, {ports: Math.max(0, ctx.res.effPorts[key] - sfpCount(d))}), dx, y, dw, h, color, st, tip, selected, ctx.res.usedPorts[key],
				function (i, px, py) { ctx.ports[key][i] = {x: px + ox, y: py}; }, face);
			(ctx.devEls[d.id] = ctx.devEls[d.id] || []).push(g);
			// face opposée non affichée : on la dessine hors écran pour connaître la position réelle de ses ports (câbles « en transparence »)
			var of = 1 - face, oKey = pk(d.id, of);
			if (facesOf(rack).indexOf(of) < 0 && ctx.res.effPorts[oKey] !== undefined) {
				var dxo = slot !== 0 && ((slot === 2) !== !!of) ? RACK_X + RACK_W / 2 + 1 : RACK_X;
				ctx.gpos[oKey] = {y: y, h: h, cy: y + h / 2, ox: ox, rx: dx + dw};
				ctx.gports[oKey] = {};
				try {
					drawDevice(document.createElementNS('http://www.w3.org/2000/svg', 'g'), Object.assign({}, d, {ports: Math.max(0, ctx.res.effPorts[oKey] - sfpCount(d))}), dxo, y, dw, h, color, st, tip, false, ctx.res.usedPorts[oKey],
						function (i, px, py) {
							// vue en transparence : l'arrière est dessiné dans son propre emplacement puis ramené, en miroir, sur l'emplacement de l'équipement à l'écran
							ctx.gports[oKey][i] = {x: ox + (dx + dw) - (px - dxo), y: py};
						}, of);
				} catch (e) { /* ignore */ }
			}
			ctx.devState[d.id] = st.state;
			g.addEventListener('mouseenter', function () { ctx.apply(d.id); });
			g.addEventListener('mouseleave', function () { ctx.apply(editing ? state.edit.selected : state.sel); });

			if (editing) {
				if (ro) { g.style.cursor = 'default'; }
				else { g.addEventListener('mousedown', function (ev) { startDrag(ev, rack, d, g); }); }
			}
			else {
				g.addEventListener('click', function () { openPanel(d); });
			}
		});
	}

	/** Dessine une ou plusieurs baies côte à côte dans un même SVG ; les câbles (y compris entre baies) sont tracés par-dessus. */
	function drawRacks(parent, list, hosts, editing) {
		var RAIL = 22, GAP = 44;
		var panels = [];
		list.forEach(function (r) { facesOf(r).forEach(function (f) { panels.push({rack: r, face: f}); }); });
		var colW = RACK_X + RACK_W + RAIL + 24, step = colW + GAP;
		var shownKeys = {};
		panels.forEach(function (pn) { pn.rack.devices.forEach(function (d) { shownKeys[pk(d.id, pn.face)] = true; }); });
		var allRacks = list.slice();
		if (!editing) { ((state.data && state.data.racks) || []).forEach(function (r) { if (!list.some(function (x) { return x.id === r.id; })) { allRacks.push(r); } }); }
		var devInfo = {};
		allRacks.forEach(function (r) { r.devices.forEach(function (d) { devInfo[d.id] = {name: d.name, rack: r.name}; }); });
		var hasStub = allRacks.some(function (r) {
			return r.links.some(function (l) {
				var a = !!(shownKeys[pk(l.a, 0)] || shownKeys[pk(l.a, 1)]), b = !!(shownKeys[pk(l.b, 0)] || shownKeys[pk(l.b, 1)]);
				return a !== b;
			});
		});
		var width = panels.length * colW + (panels.length - 1) * GAP + (hasStub ? 80 : 0);
		var maxUnits = Math.max.apply(null, list.map(function (r) { return r.units; }));
		var height = TOP + maxUnits * UH + 16 + 26;
		var svg = el('svg', {width: width, height: height, viewBox: '0 0 ' + width + ' ' + height, style: 'user-select:none'}, null);
		parent.appendChild(svg);
		defsFor(svg);
		state.rackSvg = svg;
		state.rackNames = list.map(function (r) { return r.name; }).join(' + ');

		var scale = 1;
		if (state.zoom === 'fit') {
			var top = svg.getBoundingClientRect ? svg.getBoundingClientRect().top : 0;
			var availH = (window.innerHeight || 900) - (top > 0 ? top : 120) - 24;
			var availW = (root.clientWidth || 1200) - ((editing || state.sel !== null) ? 400 : 0);
			scale = Math.max(0.35, Math.min(1, availH / height, availW / width));
		}
		else if (parseFloat(state.zoom) > 0) {
			scale = parseFloat(state.zoom);
		}
		state.scale = scale;
		svg.setAttribute('width', Math.round(width * scale));
		svg.setAttribute('height', Math.round(height * scale));

		var ctx = {res: resolvePorts(list), pos: {}, ports: {}, gpos: {}, gports: {}, devEls: {}, devState: {}, cableEls: [], apply: function () {}};
		var cableMode = editing ? 'all' : state.cableMode;

		panels.forEach(function (pn, i) {
			var ro = editing && pn.rack !== state.edit.rack;
			drawOne(el('g', {transform: 'translate(' + (i * step) + ',0)'}, svg), pn.rack, i * step, hosts, editing, ctx, ro, pn.face);
		});

		function applyCables(devId) {
			var focus = devId !== null && devId !== undefined;
			var peers = {};
			ctx.cableEls.forEach(function (c) {
				var mine = focus && (c.l.a === devId || c.l.b === devId);
				var on = cableMode === 'all' || (cableMode === 'sel' && mine);
				c.g.style.display = on ? '' : 'none';
				c.g.style.opacity = (focus && cableMode === 'all' && !mine) ? .25 : 1;
				if (mine) { peers[c.l.a] = true; peers[c.l.b] = true; }
			});
			Object.keys(ctx.devEls).forEach(function (id) {
				var dim = focus && !editing && cableMode !== 'none' && !peers[id] && String(id) !== String(devId);
				ctx.devEls[id].forEach(function (e) { e.style.opacity = dim ? .45 : 1; });
			});
		}
		ctx.apply = applyCables;

		var devState = ctx.devState, fall = {};
		var endpoint = function (id, key, face) {
			var pkey = pk(id, face), idx = ctx.res.resolved[key], p = ctx.ports[pkey] && ctx.ports[pkey][idx];
			if (p) { return p; }
			var ps = ctx.pos[pkey], k = fall[pkey] = (fall[pkey] || 0) + 1;
			return {x: ps.ox + ps.rx - 24, y: ps.cy + (k - 1) * 7 - 3};
		};

		var traffic = (state.data && state.data.traffic) || {};
		var layer = el('g', {}, svg);
		allRacks.forEach(function (rack) {
			rack.links.forEach(function (l) {
				var fa = endFace(l, 'a'), fb = endFace(l, 'b');
				var pa = ctx.pos[pk(l.a, fa)], pb = ctx.pos[pk(l.b, fb)];
				var da = pa || ctx.pos[pk(l.a, 1 - fa)], db = pb || ctx.pos[pk(l.b, 1 - fb)];
				if (!da !== !db) {
					pa = da; pb = db;
					// une seule extrémité affichée : câble qui sort de la baie, avec rappel de l'équipement distant
					var near = pa ? 'a' : 'b', farId = pa ? l.b : l.a, farFace = pa ? fb : fa, farPort = pa ? l.b_port : l.a_port;
					var nid = pa ? l.a : l.b, nface = pa ? fa : fb, ps = pa || pb;
					var P = ctx.pos[pk(nid, nface)] ? endpoint(nid, l.id + ':' + near, nface) : (ctx.gports[pk(nid, nface)] && ctx.gports[pk(nid, nface)][ctx.res.resolved[l.id + ':' + near]]) || {x: ps.ox + ps.rx - 14, y: ps.cy};
					var scol = (devState[l.a] === 'down' || devState[l.b] === 'down') ? '#d9534f' : (l.color || CABLE_COLOR[l.cable] || CABLE_COLOR.other);
					var ex = ps.ox + ps.rx + RAIL + 8 + 34, ey = P.y + 10;
					var fi = devInfo[farId] || {name: '?', rack: ''};
					var sg = el('g', {style: 'pointer-events:none'}, layer);
					var sd = 'M' + P.x + ' ' + P.y + ' C' + P.x + ' ' + (P.y + 22) + ' ' + (ex - 30) + ' ' + ey + ' ' + ex + ' ' + ey;
					el('path', {d: sd, fill: 'none', stroke: '#050607', 'stroke-width': 5, opacity: .5, 'stroke-linecap': 'round'}, sg);
					el('path', {d: sd, fill: 'none', stroke: scol, 'stroke-width': 2.6, 'stroke-linecap': 'round', 'stroke-dasharray': '7 4'}, sg);
					el('rect', {x: P.x - 3, y: P.y - 6, width: 6, height: 9, rx: 1.2, fill: '#101215', stroke: scol, 'stroke-width': 1.3}, sg);
					var nm = fi.name.length > 9 ? fi.name.slice(0, 8) + '\u2026' : fi.name;
					var txt = (farFace ? 'R' : 'F') + ' \u00b7 ' + nm;
					var cw = txt.length * 5.6 + 12;
					el('rect', {x: ex + 2, y: ey - 8, width: cw, height: 16, rx: 8, fill: '#161d27', stroke: scol, 'stroke-width': 1}, sg);
					var ct = el('text', {x: ex + 2 + cw / 2, y: ey + 3.2, 'text-anchor': 'middle', 'font-size': 9, 'font-family': MONO, fill: '#d7deea'}, sg);
					ct.textContent = txt;
					el('title', {}, sg).textContent = (l.label ? l.label + ' - ' : '') + fi.name + (fi.rack ? ' (' + fi.rack + ')' : '') + ' - ' + L.port + ' ' + (farPort || '?') + ' - ' + (farFace ? L.face_rear : L.face_front);
					ctx.cableEls.push({l: l, g: sg});
					return;
				}
				if (!da || !db) { return; }
				var hidA = !pa, hidB = !pb;
				var ghostEnd = function (id, key, face, dpos) {
					var gp = ctx.gports[pk(id, face)], gi = ctx.res.resolved[key];
					return gp && gp[gi] ? gp[gi] : {x: dpos.ox + dpos.rx - 14, y: dpos.cy};
				};
				var A = hidA ? ghostEnd(l.a, l.id + ':a', fa, da) : endpoint(l.a, l.id + ':a', fa);
				var B = hidB ? ghostEnd(l.b, l.id + ':b', fb, db) : endpoint(l.b, l.id + ':b', fb);
				var bad = devState[l.a] === 'down' || devState[l.b] === 'down';
				var color = bad ? '#d9534f' : (l.color || CABLE_COLOR[l.cable] || CABLE_COLOR.other);
				var sag = 22 + Math.min(70, Math.abs(B.x - A.x) * 0.12 + Math.abs(B.y - A.y) * 0.18);
				var dd = 'M' + A.x + ' ' + A.y + ' C' + A.x + ' ' + (A.y + sag) + ' ' + B.x + ' ' + (B.y + sag) + ' ' + B.x + ' ' + B.y;
				var dd2 = 'M' + B.x + ' ' + B.y + ' C' + B.x + ' ' + (B.y + sag) + ' ' + A.x + ' ' + (A.y + sag) + ' ' + A.x + ' ' + A.y;
				var cg = el('g', {style: 'pointer-events:none'}, layer);
				el('path', {d: dd, fill: 'none', stroke: '#050607', 'stroke-width': 5, opacity: .5, 'stroke-linecap': 'round'}, cg);
				el('path', {d: dd, fill: 'none', stroke: color, 'stroke-width': 2.6, 'stroke-linecap': 'round',
					'stroke-dasharray': (hidA || hidB) ? '7 4' : (l.cable === 'power' ? '6 3' : '')}, cg);
				var tr = traffic[l.id];
				if (tr && animOn() && !editing) {
					[['ab', '#7fe9ff', 'rm-flow-a', 0], ['ba', '#ffc46b', 'rm-flow-b', 6]].forEach(function (f) {
						var v = tr[f[0]];
						if (v === null || v === undefined || v < 1000) { return; }
						var dur = Math.max(0.5, 2.4 - 1.9 * Math.sqrt(Math.min(1, v / 1e9)));
						var fp = el('path', {d: f[0] === 'ab' ? dd : dd2, 'class': 'rm-flow', fill: 'none', stroke: f[1], 'stroke-width': 2.2,
							'stroke-linecap': 'round', 'stroke-dasharray': '1 11', 'stroke-dashoffset': f[3]}, cg);
						fp.style.animation = f[2] + ' ' + dur.toFixed(2) + 's linear infinite';
					});
				}
				[[A, hidA, fa], [B, hidB, fb]].forEach(function (en) {
					var e = en[0];
					if (en[1]) {
						// extrémité sur la face non affichée : le câble contourne l'équipement et se raccorde à son dos
						el('rect', {x: e.x - 7, y: e.y - 8, width: 14, height: 14, rx: 3, fill: '#0b0f14', 'fill-opacity': .55, stroke: color, 'stroke-width': 1, 'stroke-dasharray': '2 2'}, cg);
						el('rect', {x: e.x - 3, y: e.y - 6, width: 6, height: 9, rx: 1.2, fill: '#101215', 'fill-opacity': .6, stroke: color, 'stroke-width': 1.3, 'stroke-opacity': .85}, cg);
						el('circle', {cx: e.x + 8, cy: e.y - 9, r: 5.5, fill: '#161d27', stroke: color, 'stroke-width': 1.2}, cg);
						var lt = el('text', {x: e.x + 8, y: e.y - 6, 'text-anchor': 'middle', 'font-size': 7.5, 'font-weight': 700, 'font-family': MONO, fill: '#e6ecf5'}, cg);
						lt.textContent = en[2] ? 'R' : 'F';
					}
					else {
						el('rect', {x: e.x - 3, y: e.y - 6, width: 6, height: 9, rx: 1.2, fill: '#101215', stroke: color, 'stroke-width': 1.3}, cg);
					}
				});
				el('title', {}, cg).textContent = (l.label ? l.label + ' - ' : '') + (l.a_port || '?') + ' <-> ' + (l.b_port || '?') +
					(tr ? '  (A\u2192B ' + fmtBps(tr.ab) + ' / B\u2192A ' + fmtBps(tr.ba) + ')' : '');
				ctx.cableEls.push({l: l, g: cg});
			});
		});

		if (editing) {
			var pend = state.edit.pending;
			list.forEach(function (rack) {
				rack.devices.forEach(function (d) {
					[0, 1].forEach(function (face) {
						var pm = ctx.ports[pk(d.id, face)] || {};
						Object.keys(pm).forEach(function (k) {
							var pt = pm[k], i = parseInt(k, 10);
							var isP = pend && pend.dev === d.id && pend.idx === i && (pend.face || 0) === face;
							var hit = el('rect', {x: pt.x - 7.5, y: pt.y - 6.5, width: 15, height: 13, rx: 2, fill: '#ffffff',
								'fill-opacity': isP ? .35 : 0, stroke: isP ? '#ffffff' : 'none', 'stroke-width': 1.6, style: 'cursor:crosshair'}, svg);
							hit._p = {d: d, i: i, face: face};
							el('title', {}, hit).textContent = d.name + ' - ' + L.port + ' ' + (i + 1) + (d.type === 'patch' ? ' (' + (face ? L.face_rear : L.face_front) + ')' : '');
							hit.addEventListener('mouseenter', function () { if (!isP) { hit.setAttribute('fill-opacity', .3); } });
							hit.addEventListener('mouseleave', function () { if (!isP) { hit.setAttribute('fill-opacity', 0); } });
							hit.addEventListener('mousedown', function (ev) {
								ev.stopPropagation();
								if (ev.button !== 0) { return; }
								ev.preventDefault();
								startPortDrag(ev, svg, pt, d, i, face);
							});
							hit.addEventListener('click', function (ev) {
								ev.stopPropagation();
								if (suppressClick) { suppressClick = false; return; }
								portClick(state.edit.rack, d, i, face);
							});
						});
					});
				});
			});
		}

		applyCables(editing ? state.edit.selected : state.sel);
	}

	/* ---------- tracé d'un câble à la souris : glisser d'un port à un autre, ou clic sur un port puis sur un autre ---------- */

	var suppressClick = false;

	function startPortDrag(ev, svg, pt, d, i, face) {
		var sx = ev.clientX, sy = ev.clientY, moved = false, line = null;

		function toSvg(e) {
			var r = svg.getBoundingClientRect(), k = state.scale || 1;
			return {x: (e.clientX - r.left) / k, y: (e.clientY - r.top) / k};
		}

		function onMove(e) {
			if (!moved && Math.abs(e.clientX - sx) + Math.abs(e.clientY - sy) < 5) { return; }
			moved = true;
			var q = toSvg(e);
			if (!line) {
				line = el('path', {fill: 'none', stroke: '#ffffff', 'stroke-width': 2.4, 'stroke-dasharray': '5 4', 'stroke-linecap': 'round',
					style: 'pointer-events:none'}, svg);
			}
			line.setAttribute('d', 'M' + pt.x + ' ' + pt.y + ' L' + q.x + ' ' + q.y);
		}

		function onUp(e) {
			window.removeEventListener('mousemove', onMove);
			window.removeEventListener('mouseup', onUp);
			if (line && line.parentNode) { line.parentNode.removeChild(line); }
			if (!moved) { return; }
			suppressClick = true;
			setTimeout(function () { suppressClick = false; }, 0);
			var tp = e.target && e.target._p;
			if (tp && !(tp.d.id === d.id && tp.i === i && tp.face === face)) {
				state.edit.pending = {dev: d.id, idx: i, face: face};
				portClick(state.edit.rack, tp.d, tp.i, tp.face);
			}
		}

		window.addEventListener('mousemove', onMove);
		window.addEventListener('mouseup', onUp);
	}

	function portClick(rack, d, i, face) {
		var e = state.edit, p = e.pending;
		var inRack = function (id) { return rack.devices.some(function (x) { return x.id === id; }); };
		if (!p || p.dev === d.id || (!inRack(p.dev) && !inRack(d.id))) {
			e.pending = (p && p.dev === d.id && p.idx === i && (p.face || 0) === (face || 0)) ? null : {dev: d.id, idx: i, face: face || 0};
		}
		else {
			var nl = e.newLink;
			rack.links.push({id: --state.tmp, a: p.dev, a_port: String(p.idx + 1), a_face: p.face || 0, b: d.id, b_port: String(i + 1), b_face: face || 0,
				a_iface: '', b_iface: '', cable: (nl && nl.cable) || 'rj45', color: '', label: ''});
			e.pending = null;
		}
		render();
	}

	/* ---------- glisser-déposer (changer de U) ---------- */

	function startDrag(ev, rack, dev, g) {
		if (ev.button !== 0) { return; }
		ev.preventDefault();
		var startY = ev.clientY, startPos = dev.u_pos, target = startPos, moved = false;

		function onMove(e) {
			var delta = Math.round((startY - e.clientY) / (UH * (state.scale || 1)));
			if (delta !== 0) { moved = true; }
			var sgn = rack.u_desc ? -1 : 1;
			var np = startPos + sgn * delta;
			if (fits(rack, dev, np, dev.u_height)) { target = np; }
			g.setAttribute('transform', 'translate(0,' + (-sgn * (target - startPos) * UH) + ')');
		}

		function onUp() {
			window.removeEventListener('mousemove', onMove);
			window.removeEventListener('mouseup', onUp);
			if (moved) {
				dev.u_pos = target;
				if (target === startPos) { setMessage('', true); }
			}
			state.edit.selected = dev.id;
			render();
		}

		window.addEventListener('mousemove', onMove);
		window.addEventListener('mouseup', onUp);
	}

	/* ---------- panneau d'édition ---------- */

	function drawPanel(panel, rack) {
		var box = function (title) {
			var b = html('div', {style: 'border:1px solid #4a5058;border-radius:6px;padding:8px 10px;margin-bottom:10px'}, undefined, panel);
			html('b', {}, title, b);
			return b;
		};

		var b1 = box(L.rack_props);
		field(b1, L.name, textInput(rack.name, function (v) { rack.name = v; }));
		field(b1, L.units, numInput(rack.units, 1, 60, function (v) {
			var top = Math.max.apply(null, [0].concat(rack.devices.map(function (d) { return d.u_pos + d.u_height - 1; })));
			if (v < top) { setMessage(L.err_units, false); render(); return; }
			rack.units = v; setMessage('', true); render();
		}));
		var sdl = html('datalist', {id: 'rackmap-sites'}, undefined, b1);
		var seen = {};
		allRacks().forEach(function (r) { if (r.site && !seen[r.site]) { seen[r.site] = 1; html('option', {value: r.site}, undefined, sdl); } });
		field(b1, L.datacenter, textInput(rack.site || '', function (v) { rack.site = v.trim(); }, {list: 'rackmap-sites'}));
		field(b1, L.u_numbering, select([['0', L.u_bottom], ['1', L.u_top]], String(rack.u_desc || 0), function (v) {
			v = parseInt(v, 10);
			if (v === (rack.u_desc || 0)) { return; }
			// la disposition physique est conservée : seuls les numéros changent
			rack.devices.forEach(function (d) { d.u_pos = rack.units - (d.u_pos + d.u_height - 1) + 1; });
			rack.u_desc = v;
			render();
		}));
		field(b1, L.description, textInput(rack.description, function (v) { rack.description = v; }));

		var b2 = box(L.device);
		button('+ ' + L.add_device, 'btn-alt', function () {
			var pos = firstFreeSlot(rack, 1);
			if (!pos) { setMessage(L.no_space, false); return; }
			var id = --state.tmp;
			rack.devices.push({id: id, name: L.new_device, type: 'server', hostid: null, u_pos: pos, u_height: 1, ports: 0, sfp_groups: [], slot: 0, disks: -1, disk_orient: 0, port_face: 0, pp_media: 0});
			state.edit.selected = id;
			setMessage('', true);
			render();
		}, b2);

		var dev = rack.devices.filter(function (d) { return d.id === state.edit.selected; })[0];
		if (dev) { drawDeviceForm(b2, rack, dev); }

		var b3 = box(L.cables);
		drawLinks(b3, rack);
	}

	function drawDeviceForm(parent, rack, dev) {
		var form = html('div', {style: 'margin-top:8px'}, undefined, parent);
		field(form, L.name, textInput(dev.name, function (v) { dev.name = v; render(); }));
		field(form, L.type, select(TYPES.map(function (t) { return [t, L['t_' + t]]; }), dev.type, function (v) {
			dev.type = v;
			// valeur par défaut réaliste : ports à l'arrière pour serveur/stockage/onduleur/autre, à l'avant sinon (modifiable ensuite)
			dev.port_face = ['server', 'storage', 'ups', 'other'].indexOf(v) >= 0 ? 1 : 0;
			if (dev.port_face === 1 && (state.faces[String(rack.id)] || 'f') === 'f') { state.faces[String(rack.id)] = 'fr'; saveFaces(); }
			render();
		}));

		var hostName = '';
		(state.hosts || []).forEach(function (h) { if (h.id === dev.hostid) { hostName = h.name; } });
		var listId = 'rackmap-hosts';
		var dl = html('datalist', {id: listId}, undefined, form);
		(state.hosts || []).forEach(function (h) { html('option', {value: h.name}, undefined, dl); });
		var hi = textInput(hostName, function (v) {
			v = v.trim();
			var found = (state.hosts || []).filter(function (h) { return h.name === v; })[0] ||
				(state.hosts || []).filter(function (h) { return h.name.toLowerCase() === v.toLowerCase(); })[0];
			dev.hostid = found ? found.id : null;
			setMessage(v !== '' && !found ? L.err_host + ' : ' + v : '', true);
			render();
		}, {list: listId, placeholder: L.host_hint});
		field(form, L.host, hi);
		if (dev.hostid) {
			html('div', {style: 'color:#2e9e5b;margin:0 0 4px 100px;font-size:12px'}, '\u2713 ' + L.host_linked + ' (#' + dev.hostid + ')', form);
		}

		field(form, L.u_height, numInput(dev.u_height, 1, rack.units, function (v) {
			if (!fits(rack, dev, dev.u_pos, v)) { setMessage(L.err_move, false); render(); return; }
			dev.u_height = v; setMessage('', true); render();
		}));
		if (dev.type !== 'pdu') {
			field(form, dev.type === 'patch' ? L.ports : L.ports_rj45, numInput(dev.ports, 0, 96, function (v) { dev.ports = v; render(); }));
		}
		else {
			field(form, L.ports, numInput(dev.ports, 0, 96, function (v) { dev.ports = v; render(); }));
		}
		if (dev.type === 'patch') {
			field(form, L.pp_media, select([['0', L.pp_rj45], ['1', L.pp_fiber]], String(dev.pp_media || 0), function (v) { dev.pp_media = parseInt(v, 10); render(); }));
		}
		else {
			field(form, L.port_face, select([['0', L.pf_front], ['1', L.pf_rear]], String(dev.port_face || 0), function (v) {
				dev.port_face = parseInt(v, 10);
				var fc = state.faces[String(rack.id)] || 'f';
				if (dev.port_face === 1 && fc === 'f') { state.faces[String(rack.id)] = 'fr'; saveFaces(); }
				render();
			}));
		}
		if (['switch', 'router', 'firewall', 'server', 'storage', 'other'].indexOf(dev.type) >= 0) {
			var gs = dev.sfp_groups = sfpGroups(dev).map(function (x) { return {n: x.n, speed: x.speed}; });
			html('div', {style: 'margin:6px 0 2px;font-weight:600'}, L.ports_sfp, form);
			gs.forEach(function (gx, gi) {
				var row = html('div', {style: 'display:flex;gap:6px;align-items:center;margin:3px 0'}, undefined, form);
				var ni = numInput(gx.n, 1, 48, function (v) { gx.n = v; render(); });
				ni.style.width = '64px';
				row.appendChild(ni);
				row.appendChild(select(SFP_SPEEDS.map(function (v) { return [String(v), v + 'G  ' + SFP_NAME[v]]; }), String(gx.speed), function (v) { gx.speed = parseInt(v, 10); render(); }));
				button('\u2715', 'btn-alt', function () { gs.splice(gi, 1); render(); }, row);
			});
			if (gs.length < 6) {
				button('+ ' + L.sfp_group, 'btn-alt', function () { gs.push({n: 2, speed: 10}); render(); }, form);
			}
		}
		if (dev.type === 'server' || dev.type === 'storage') {
			field(form, L.disks, numInput(diskCount(dev), 0, 60, function (v) { dev.disks = v; render(); }));
			field(form, L.disk_orient, select([['0', L.disk_h], ['1', L.disk_v]], String(dev.disk_orient || 0), function (v) { dev.disk_orient = parseInt(v, 10); render(); }));
		}
		field(form, L.width, select([['0', L.w_full], ['1', L.w_left], ['2', L.w_right]], String(dev.slot || 0), function (v) {
			v = parseInt(v, 10);
			if (!fits(rack, dev, dev.u_pos, dev.u_height, v)) { setMessage(L.err_move, false); render(); return; }
			dev.slot = v; setMessage('', true); render();
		}));

		button(L.remove, 'btn-alt', function () {
			rack.devices = rack.devices.filter(function (d) { return d !== dev; });
			rack.links = rack.links.filter(function (l) { return l.a !== dev.id && l.b !== dev.id; });
			state.edit.selected = null;
			render();
		}, form);
	}

	function drawLinks(parent, rack) {
		var name = function (id) {
			var d = deviceById(id), own = rack.devices.some(function (x) { return x.id === id; });
			if (!d) { return '?'; }
			if (own) { return d.name; }
			var r = allRacks().filter(function (x) { return x.devices.some(function (y) { return y.id === id; }); })[0];
			return (r ? r.name + ' \u00b7 ' : '') + d.name;
		};

		var pd = state.edit.pending, pdev = pd ? rack.devices.filter(function (x) { return x.id === pd.dev; })[0] : null;
		html('div', {style: 'margin:4px 0;font-size:12px;' + (pdev ? 'font-weight:700' : 'opacity:.7')},
			pdev ? L.mouse_from + ' : ' + pdev.name + ' ' + L.port + ' ' + (pd.idx + 1) + (pdev.type === 'patch' ? ' (' + (pd.face ? L.face_rear : L.face_front) + ')' : '') + ' \u2192 ' + L.mouse_to : L.mouse_hint, parent);
		if (pdev) { button(L.cancel, 'btn-alt', function () { state.edit.pending = null; render(); }, parent); }

		if (!rack.links.length) { html('div', {style: 'opacity:.6;margin:4px 0'}, L.no_cables, parent); }

		rack.links.forEach(function (l) {
			var row = html('div', {style: 'display:flex;gap:6px;align-items:center;margin:4px 0'}, undefined, parent);
			var fl = function (side) {
				var dd = deviceById(side === 'a' ? l.a : l.b);
				return dd && dd.type === 'patch' ? ' ' + (endFace(l, side) ? L.face_rear : L.face_front).toLowerCase() : '';
			};
			html('span', {style: 'flex:1'}, name(l.a) + (l.a_port ? ':' + l.a_port : '') + fl('a') + '  ↔  ' + name(l.b) + (l.b_port ? ':' + l.b_port : '') + fl('b') +
				'  (' + (L['c_' + l.cable] || l.cable) + ')', row);
			button('✕', 'btn-alt', function () {
				rack.links = rack.links.filter(function (x) { return x !== l; });
				render();
			}, row);
		});

		var opts = [];
		allRacks().sort(function (x, y) { return (y.id === rack.id) - (x.id === rack.id); }).forEach(function (r) {
			r.devices.forEach(function (d) { opts.push([d.id, (r.id === rack.id ? '' : r.name + ' \u00b7 ') + d.name]); });
		});
		if (opts.length < 2) { return; }
		var nl = state.edit.newLink || (state.edit.newLink = {a: opts[0][0], b: opts[1][0], a_port: '', b_port: '', a_iface: '', b_iface: '', a_face: 0, b_face: 0, cable: 'rj45'});
		var faceSel = function (id, key) {
			var dd = deviceById(id);
			if (dd && dd.type === 'patch') {
				field(form, L.port + ' ' + key.toUpperCase() + ' \u00b7 ' + L.face_view.toLowerCase(), select([['0', L.face_front], ['1', L.face_rear]], String(nl[key + '_face'] || 0), function (v) { nl[key + '_face'] = parseInt(v, 10); }));
			}
		};
		var form = html('div', {style: 'margin-top:8px;border-top:1px solid #4a5058;padding-top:6px'}, undefined, parent);
		html('b', {}, L.add_cable, form);
		field(form, 'A', select(opts, nl.a, function (v) { nl.a = parseInt(v, 10); render(); }));
		faceSel(nl.a, 'a');
		field(form, L.port + ' A', textInput(nl.a_port, function (v) { nl.a_port = v; }));
		field(form, L.iface + ' A', textInput(nl.a_iface, function (v) { nl.a_iface = v; }, {placeholder: L.iface_hint}));
		field(form, 'B', select(opts, nl.b, function (v) { nl.b = parseInt(v, 10); render(); }));
		faceSel(nl.b, 'b');
		field(form, L.port + ' B', textInput(nl.b_port, function (v) { nl.b_port = v; }));
		field(form, L.iface + ' B', textInput(nl.b_iface, function (v) { nl.b_iface = v; }, {placeholder: L.iface_hint}));
		field(form, L.cable_type, select(CABLES.map(function (c) { return [c, L['c_' + c]]; }), nl.cable, function (v) { nl.cable = v; }));
		button('+ ' + L.add_cable, 'btn-alt', function () {
			var ownIds = rack.devices.map(function (x) { return x.id; });
			if (nl.a === nl.b || (ownIds.indexOf(nl.a) < 0 && ownIds.indexOf(nl.b) < 0)) { return; }
			rack.links.push({id: --state.tmp, a: nl.a, a_port: nl.a_port, a_face: nl.a_face || 0, b: nl.b, b_port: nl.b_port, b_face: nl.b_face || 0,
				a_iface: nl.a_iface, b_iface: nl.b_iface, cable: nl.cable, color: '', label: ''});
			state.edit.newLink = null;
			render();
		}, form);
	}

	function drawLegend() {
		var box = html('div', {style: 'margin-top:10px;display:flex;gap:14px;flex-wrap:wrap;font-size:12px'}, undefined, root);
		html('b', {}, L.legend + ' :', box);
		['ok', 'problem', 'down', 'disabled', 'passive'].forEach(function (k) {
			var s = html('span', {}, undefined, box);
			var colors = k === 'problem' ? SEV_COLOR.slice(1) : [STATE_COLOR[k]];
			colors.forEach(function (c) {
				html('span', {style: 'display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:3px;background:' + c}, undefined, s);
			});
			s.appendChild(document.createTextNode(' ' + L['st_' + k]));
			if (k === 'problem') { s.title = (L.severities || []).slice(1).join(' / '); }
		});
	}

	/* ---------- actions ---------- */

	function startEdit(rack) {
		var work = rack ? clone(rack) : {id: 0, name: L.new_rack, units: 42, description: '', site: state.site || '', u_desc: 0, devices: [], links: []};
		state.edit = {rack: work, selected: null, message: '', newLink: null, pending: null};
		render();

		if (state.hosts === null) {
			state.hosts = [];
			getJSON('rackmap.hosts').then(function (r) { state.hosts = r.hosts || []; if (state.edit) { render(); } });
		}
	}

	function save() {
		var r = state.edit.rack;
		var payload = {
			id: r.id, name: r.name, units: r.units, description: r.description, site: r.site || '', u_desc: r.u_desc || 0,
			devices: r.devices.map(function (d) {
				return {id: d.id, name: d.name, type: d.type, hostid: d.hostid, u_pos: d.u_pos, u_height: d.u_height, ports: d.ports, sfp_groups: sfpGroups(d), slot: d.slot || 0,
					disks: d.disks === undefined || d.disks === null ? -1 : d.disks, disk_orient: d.disk_orient || 0,
					port_face: d.port_face === 1 ? 1 : 0, pp_media: d.pp_media === 1 ? 1 : 0};
			}),
			links: r.links.map(function (l) {
				return {a: l.a, b: l.b, a_port: l.a_port, b_port: l.b_port, a_face: endFace(l, 'a'), b_face: endFace(l, 'b'),
					a_iface: l.a_iface || '', b_iface: l.b_iface || '', cable: l.cable, color: l.color, label: l.label};
			})
		};

		post('rackmap.save', {payload: JSON.stringify(payload)}).then(function (res) {
			if (!res.ok) { setMessage(L.err_save + (res.error ? ' : ' + res.error : ''), false); return; }
			state.current = res.id;
			if (r.id <= 0 && state.faces[String(r.id)]) { state.faces[String(res.id)] = state.faces[String(r.id)]; saveFaces(); }
			state.shown = (state.shown || []).filter(function (x) { return x !== res.id; }).concat([res.id]);
			saveShown();
			state.edit = null;
			refresh();
		}).catch(function () { setMessage(L.err_save, false); });
	}

	function deleteRack() {
		if (!window.confirm(L.confirm_delete_rack)) { return; }
		post('rackmap.save', {'delete': state.edit.rack.id}).then(function (res) {
			if (!res.ok) { setMessage(L.err_save + (res.error ? ' : ' + res.error : ''), false); return; }
			var delId = state.edit.rack.id;
			state.shown = (state.shown || []).filter(function (x) { return x !== delId; });
			saveShown();
			state.edit = null;
			state.current = null;
			refresh();
		});
	}

	function refresh() {
		getJSON('rackmap.data').then(function (d) {
			if (state.edit) {
				// pendant l'édition on ne touche pas à l'affichage : on met seulement à jour les statuts
				state.data.hosts = d.hosts;
				state.data.traffic = d.traffic;
				state.data.time = d.time;
				return;
			}
			state.data = d;
			var sd = state.sel !== null ? deviceById(state.sel) : null;
			if (sd && sd.hostid) { fetchDetail(sd.hostid); }
			if (d.racks && d.racks.length && !d.racks.some(function (r) { return r.id === state.current; })) {
				state.current = d.racks[0].id;
			}
			render();
		}).catch(function () { /* on garde l'affichage précédent */ });
	}

	refresh();
	setInterval(refresh, Math.max(5, CFG.refresh || 30) * 1000);
})();
