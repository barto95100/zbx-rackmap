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
		t_pdu: 'PDU', t_ups: 'UPS', t_storage: 'Storage', t_other: 'Other',
		close: 'Close', loading: 'Loading\u2026', p_metrics: 'Metrics', p_ifaces: 'Interfaces', p_groups: 'Host groups',
		p_problems: 'Active problems', since: 'since', maintenance: 'In maintenance', btn_problems: 'Problems', btn_latest: 'Latest data',
		btn_dash: 'Dashboard', btn_graphs: 'Graphs', btn_host: 'Settings', if_ok: 'Available', if_ko: 'Unavailable', if_unk: 'Unknown',
		passive_note: 'Passive device (no Zabbix host linked).', error: 'Loading error', metric_names: {}, graph_nodata: 'No history',
		severities: ['Not classified', 'Information', 'Warning', 'Average', 'High', 'Disaster'],
		cable_view: 'Cables', cm_sel: 'Selected / hovered device', cm_all: 'All', cm_none: 'None',
		cable_hint: 'Hover or click a device to see its cables.', conn_to: 'to', c_rj45: 'RJ45', c_fiber: 'Fiber', c_dac: 'DAC', c_power: 'Power', c_other: 'Other', new_device: 'New device', animate: 'Animate traffic', iface: 'Interface', iface_hint: 'Zabbix interface (optional)', rate_none: 'no data', mouse_hint: 'Tip: click a port, then another port, to draw a cable.', mouse_from: 'From', mouse_to: 'click the destination port.'
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

	function currentRack() {
		if (state.edit) { return state.edit.rack; }
		var racks = state.data ? state.data.racks : [];
		return racks.filter(function (r) { return r.id === state.current; })[0] || racks[0] || null;
	}


	/* ---------- panneau d'informations (clic sur un équipement) ---------- */

	function deviceById(id) {
		var rack = currentRack();
		return rack ? rack.devices.filter(function (d) { return d.id === id; })[0] : null;
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

		var rackNow = currentRack();
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

	function fits(rack, dev, pos, height) {
		if (pos < 1 || pos + height - 1 > rack.units) { return false; }
		return !rack.devices.some(function (o) {
			return o !== dev && pos <= o.u_pos + o.u_height - 1 && o.u_pos <= pos + height - 1;
		});
	}

	function firstFreeSlot(rack, height) {
		for (var pos = rack.units - height + 1; pos >= 1; pos--) {
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
		drawRack(left, rack, data.hosts || {}, !!edit);
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
			if (state.cableMode === 'sel' && rack.links.length) {
				html('div', {style: 'opacity:.6;font-size:12px;margin-top:6px'}, L.cable_hint, left);
			}
			drawLegend();
		}
	}

	function drawToolbar(rack) {
		var edit = state.edit;
		var bar = html('div', {style: 'display:flex;gap:10px;align-items:center;margin-bottom:10px;flex-wrap:wrap'}, undefined, root);

		if (!edit) {
			if (state.data.racks.length) {
				html('label', {}, L.rack + ' : ', bar);
				var sel = html('select', {}, undefined, bar);
				state.data.racks.forEach(function (r) {
					var o = html('option', {value: r.id}, r.name, sel);
					if (rack && r.id === rack.id) { o.selected = true; }
				});
				sel.addEventListener('change', function () { state.current = parseInt(sel.value, 10); render(); });
				html('span', {style: 'opacity:.6'}, L.updated + ' ' + new Date(state.data.time * 1000).toLocaleTimeString(), bar);
			}
			if (rack && rack.links.length) {
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
			if (CFG.can_edit) {
				if (rack) { button(L.edit, 'btn-alt', function () { startEdit(rack); }, bar); }
				button(L.new_rack, 'btn-alt', function () { startEdit(null); }, bar);
			}
			return;
		}

		button(L.save, '', save, bar);
		button(L.cancel, 'btn-alt', function () { state.edit = null; render(); }, bar);
		if (edit.rack.id > 0) { button(L.delete_rack, 'btn-alt', deleteRack, bar); }
		edit.msg = html('span', {style: 'color:#d9534f'}, edit.message || '', bar);
	}

	function setMessage(text, ok) {
		if (state.edit && state.edit.msg) {
			state.edit.msg.textContent = text;
			state.edit.msg.style.color = ok ? '#2e9e5b' : '#d9534f';
		}
		if (state.edit) { state.edit.message = text; }
	}

	function grad(parent, id, stops, x2, y2) {
		var g = el('linearGradient', {id: id, x1: 0, y1: 0, x2: x2, y2: y2}, parent);
		stops.forEach(function (s) { el('stop', {offset: s[0], 'stop-color': s[1]}, g); });
	}

	var FACE = {
		server: ['#4d545e', '#2a2f36'], 'switch': ['#3d4c61', '#232c39'], router: ['#4b4560', '#2b2837'],
		firewall: ['#5b4040', '#33252a'], patch: ['#4f5762', '#30363e'], pdu: ['#3e4a40', '#252d27'],
		ups: ['#464a50', '#292c31'], storage: ['#3e4f56', '#243035'], other: ['#4a5058', '#2e3238']
	};

	function defsFor(svg) {
		var d = el('defs', {}, svg);
		Object.keys(FACE).forEach(function (t) {
			grad(d, 'rm-f-' + t, [[0, FACE[t][0]], [0.12, FACE[t][0]], [1, FACE[t][1]]], 0, 1);
		});
		grad(d, 'rm-rail', [[0, '#7c828b'], [0.45, '#c9ced5'], [1, '#6f757e']], 1, 0);
		grad(d, 'rm-ear', [[0, '#707780'], [1, '#4a5058']], 0, 1);
		grad(d, 'rm-body', [[0, '#1b1e23'], [1, '#101215']], 0, 1);
		grad(d, 'rm-cap', [[0, '#5a6068'], [1, '#30353b']], 0, 1);
		var f = el('filter', {id: 'rm-glow', x: '-80%', y: '-80%', width: '260%', height: '260%'}, d);
		el('feGaussianBlur', {stdDeviation: 2.2, result: 'b'}, f);
		var m = el('feMerge', {}, f);
		el('feMergeNode', {'in': 'b'}, m);
		el('feMergeNode', {'in': 'SourceGraphic'}, m);
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

	function portGrid(g, x1, y, h, n, rows, used, reg) {
		n = Math.min(n, 48);
		rows = Math.max(1, Math.min(rows, Math.floor((h - 8) / 11)));
		var cols = Math.ceil(n / rows), pw = 10, ph2 = 8, gap = 2.5, W = cols * (pw + gap) - gap, x0 = x1 - W;
		var y0 = y + (h - (rows * ph2 + (rows - 1) * gap)) / 2;
		el('rect', {x: x0 - 4, y: y0 - 3, width: W + 8, height: rows * ph2 + (rows - 1) * gap + 6, rx: 2, fill: '#15181c', opacity: .55}, g);
		for (var i = 0; i < n; i++) {
			var px = x0 + Math.floor(i / rows) * (pw + gap), py = y0 + (i % rows) * (ph2 + gap);
			if (reg) { reg(i, px + pw / 2, py + ph2 / 2); }
			el('rect', {x: px, y: py, width: pw, height: ph2, rx: 1, fill: '#0c0e10', stroke: '#8c939c', 'stroke-width': .6}, g);
			el('rect', {x: px + 2, y: py + ph2 - 3, width: pw - 4, height: 2, fill: '#c9a43a', opacity: .75}, g);
			if (used[i]) { el('rect', {x: px + 1.5, y: py + 1.2, width: pw - 3, height: 2.4, rx: 1, fill: used[i], filter: 'url(#rm-glow)'}, g); }
		}
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

	function drawFace(g, d, x1, y, h, used, reg) {
		var n = d.ports || 0, t = d.type, w = 0;

		if (t === 'server') {
			var rows = Math.min(d.u_height, 4), cols = d.u_height >= 2 ? 6 : 4;
			w = bayGrid(g, x1 - 26, y, h, cols, rows, 30, true) + 26;
			el('circle', {cx: x1 - 10, cy: y + h / 2, r: 5.5, fill: '#1c1f23', stroke: '#aab1bb', 'stroke-width': 1}, g);
			el('rect', {x: x1 - 10.6, y: y + h / 2 - 3.6, width: 1.2, height: 3.6, fill: '#aab1bb'}, g);
		}
		else if (t === 'switch' || t === 'router' || t === 'firewall') {
			var np = n || 0;
			if (np > 0) { w = portGrid(g, x1, y, h, np, np > 8 ? 2 : 1, used, reg); }
		}
		else if (t === 'storage') {
			w = bayGrid(g, x1, y, h, 4, Math.max(1, d.u_height >= 2 ? 2 : 1), 38, true);
		}
		else if (t === 'ups') {
			el('rect', {x: x1 - 84, y: y + 7, width: 70, height: Math.min(h - 14, 32), rx: 3, fill: '#13281b', stroke: '#0a150e', 'stroke-width': 1.5}, g);
			for (var b = 0; b < 5; b++) {
				el('rect', {x: x1 - 78 + b * 12, y: y + 13, width: 8, height: Math.min(h - 26, 20), fill: '#46c37b', opacity: .85 - b * .12}, g);
			}
			el('circle', {cx: x1 - 100, cy: y + h / 2, r: 7, fill: '#1c1f23', stroke: '#aab1bb', 'stroke-width': 1}, g);
			w = 112;
		}
		else if (t === 'patch') {
			var pn = Math.min(n || 24, 48), pw = 9, gap = 2, gx = 3, W = pn * (pw + gap) + Math.floor((pn - 1) / 6) * gx, px0 = x1 - W;
			for (var i = 0; i < pn; i++) {
				var px = px0 + i * (pw + gap) + Math.floor(i / 6) * gx;
				if (reg) { reg(i, px + pw / 2, y + 12 + Math.min(11, h - 16) / 2); }
				var tn = el('text', {x: px + pw / 2, y: y + 9, 'text-anchor': 'middle', 'font-size': 5, fill: '#aab1bb'}, g);
				tn.textContent = i + 1;
				el('rect', {x: px, y: y + 12, width: pw, height: Math.min(11, h - 16), rx: 1, fill: '#0c0e10', stroke: '#8c939c', 'stroke-width': .6}, g);
				if (used[i]) { el('rect', {x: px + 1.5, y: y + 13, width: pw - 3, height: 2.4, rx: 1, fill: used[i], filter: 'url(#rm-glow)'}, g); }
			}
			w = W + 8;
		}
		else if (t === 'pdu') {
			var on = Math.min(n || 8, 16), ow = 24;
			for (var k = 0; k < on; k++) {
				var ox = x1 - (on - k) * (ow + 4) + 4;
				el('rect', {x: ox, y: y + 6, width: ow, height: h - 12, rx: 4, fill: '#15181b', stroke: '#8c939c', 'stroke-width': .8}, g);
				[0, 1].forEach(function (s) {
					el('rect', {x: ox + 6 + s * 8, y: y + h / 2 - 4, width: 2.4, height: 8, rx: 1, fill: '#c9a43a'}, g);
				});
				if (reg) { reg(k, ox + ow / 2, y + h / 2); }
				if (used[k]) { el('circle', {cx: ox + ow - 4, cy: y + 9, r: 1.8, fill: used[k], filter: 'url(#rm-glow)'}, g); }
			}
			w = on * (ow + 4) + 6;
		}
		else {
			for (var v = 0; v < 6; v++) { el('rect', {x: x1 - 70 + v * 11, y: y + 8, width: 6, height: h - 16, rx: 3, fill: '#15181b'}, g); }
			w = 76;
		}

		if ((t === 'server' || t === 'storage' || t === 'ups' || t === 'other') && n > 0) {
			w += portGrid(g, x1 - w - 6, y, h, n, n > 4 ? 2 : 1, used, reg);
		}

		return w;
	}

	function drawDevice(svg, d, x, y, w, h, color, st, tipText, selected, used, reg) {
		var EAR = 16;
		var g = el('g', {style: state.edit ? 'cursor:grab' : 'cursor:pointer'}, svg);
		el('title', {}, g).textContent = tipText;

		el('rect', {x: x, y: y + .5, width: w, height: h - 1, rx: 2, fill: 'url(#rm-f-' + (FACE[d.type] ? d.type : 'other') + ')',
			stroke: '#0e1013', 'stroke-width': 1}, g);
		el('rect', {x: x + EAR, y: y + 1.5, width: w - 2 * EAR, height: 1, fill: '#fff', opacity: .14}, g);

		[0, 1].forEach(function (side) {
			var ex = side ? x + w - EAR : x;
			el('rect', {x: ex, y: y + .5, width: EAR, height: h - 1, rx: 2, fill: 'url(#rm-ear)', stroke: '#0e1013', 'stroke-width': .8}, g);
			for (var u = 0; u < d.u_height; u++) {
				[.27, .73].forEach(function (f) {
					el('circle', {cx: ex + EAR / 2, cy: y + u * UH + UH * f, r: 1.9, fill: '#16191d', stroke: '#a3a9b1', 'stroke-width': .6}, g);
				});
			}
		});

		el('rect', {x: x + EAR - 3, y: y + 3, width: 3, height: h - 6, rx: 1.5, fill: color}, g);
		el('circle', {cx: x + w - EAR / 2, cy: y + h / 2, r: 3.6, fill: color, filter: 'url(#rm-glow)'}, g);

		var reserved = drawFace(g, d, x + w - EAR - 8, y, h, used || {}, reg);

		var nx = x + EAR + 10, avail = (x + w - EAR - 8) - nx - reserved - 6;
		var maxc = Math.max(3, Math.floor(avail / 7.6));
		var label = d.name.length > maxc ? d.name.slice(0, Math.max(1, maxc - 1)) + '…' : d.name;
		var ny = y + (d.u_height > 1 ? 20 : UH / 2 + 4.5);
		var halo = el('text', {x: nx, y: ny, 'font-size': 12.5, 'font-weight': 700, fill: '#15181c', stroke: '#15181c',
			'stroke-width': 3.5, 'stroke-linejoin': 'round', opacity: .8}, g);
		halo.textContent = label;
		var tx = el('text', {x: nx, y: ny, 'font-size': 12.5, 'font-weight': 700, fill: '#f4f6f8'}, g);
		tx.textContent = label;
		if (d.u_height > 1 && TYPE_LABEL[d.type] !== undefined) {
			var tg = el('text', {x: nx, y: y + 34, 'font-size': 9.5, fill: '#aab1bb', 'letter-spacing': '.05em'}, g);
			tg.textContent = (L['t_' + d.type] || '').toUpperCase() + '  ·  U' + d.u_pos + '–U' + (d.u_pos + d.u_height - 1);
		}

		if (selected) {
			el('rect', {x: x - 1, y: y - .5, width: w + 2, height: h + 1, rx: 3, fill: 'none', stroke: '#ffffff', 'stroke-width': 2.4}, g);
		}

		return g;
	}

	function cablePath(x0, ya, x1, yb) {
		var r = 9, dir = yb > ya ? 1 : -1;
		if (Math.abs(yb - ya) < 2 * r) { return 'M' + x0 + ' ' + ya + ' H' + x1 + ' V' + yb + ' H' + x0; }
		return 'M' + x0 + ' ' + ya + ' H' + (x1 - r) + ' Q' + x1 + ' ' + ya + ' ' + x1 + ' ' + (ya + dir * r) +
			' V' + (yb - dir * r) + ' Q' + x1 + ' ' + yb + ' ' + (x1 - r) + ' ' + yb + ' H' + x0;
	}

	function drawRack(parent, rack, hosts, editing) {
		var RAIL = 22, ROOF = 16, PLINTH = 16;
		var width = RACK_X + RACK_W + RAIL + 24;
		var bodyH = rack.units * UH;
		var height = TOP + bodyH + PLINTH + 26;
		var svg = el('svg', {width: width, height: height, viewBox: '0 0 ' + width + ' ' + height, style: 'user-select:none'}, null);
		parent.appendChild(svg);
		defsFor(svg);

		var fx = RACK_X - RAIL, fw = RACK_W + 2 * RAIL;

		// ombre au sol, caisson, toit et socle
		el('ellipse', {cx: fx + fw / 2, cy: TOP + bodyH + PLINTH + 14, rx: fw / 2 + 6, ry: 6, fill: '#000', opacity: .35}, svg);
		el('rect', {x: fx - 6, y: TOP - ROOF, width: fw + 12, height: bodyH + ROOF + 4, rx: 5, fill: 'url(#rm-body)', stroke: '#050607', 'stroke-width': 2}, svg);
		el('rect', {x: fx - 8, y: TOP - ROOF - 2, width: fw + 16, height: ROOF, rx: 4, fill: 'url(#rm-cap)', stroke: '#0a0b0d', 'stroke-width': 1.5}, svg);
		el('rect', {x: fx - 8, y: TOP + bodyH + 2, width: fw + 16, height: PLINTH, rx: 4, fill: 'url(#rm-cap)', stroke: '#0a0b0d', 'stroke-width': 1.5}, svg);
		[fx + 4, fx + fw - 4].forEach(function (cx) {
			el('rect', {x: cx - 6, y: TOP + bodyH + PLINTH + 2, width: 12, height: 6, rx: 2, fill: '#1c1f23'}, svg);
		});

		// intérieur sombre + montants perforés
		el('rect', {x: RACK_X, y: TOP, width: RACK_W, height: bodyH, fill: '#0c0e10'}, svg);
		[fx, RACK_X + RACK_W].forEach(function (rx0) {
			el('rect', {x: rx0, y: TOP, width: RAIL, height: bodyH, fill: 'url(#rm-rail)', stroke: '#2a2e34', 'stroke-width': .8}, svg);
		});

		var occupied = {};
		rack.devices.forEach(function (d) {
			for (var u = d.u_pos; u < d.u_pos + d.u_height; u++) { occupied[u] = true; }
		});

		for (var u = 1; u <= rack.units; u++) {
			var y = TOP + (rack.units - u) * UH;
			[fx, RACK_X + RACK_W].forEach(function (rx0) {
				[.2, .5, .8].forEach(function (f) {
					el('rect', {x: rx0 + RAIL / 2 - 3, y: y + UH * f - 3.5, width: 6, height: 7, rx: 1.4, fill: '#15181c', stroke: '#5e646d', 'stroke-width': .5}, svg);
				});
			});
			var t = el('text', {x: fx - 12, y: y + UH / 2 + 4, 'text-anchor': 'end', 'font-size': 10.5, fill: '#8a8f98'}, svg);
			t.textContent = u;
			if (!occupied[u]) {
				el('rect', {x: RACK_X + 1, y: y + 1, width: RACK_W - 2, height: UH - 2, fill: '#14171a', stroke: '#1d2126', 'stroke-width': 1}, svg);
			}
		}

		// ports effectifs : numéro explicite -> index ; sinon premier port libre (aucun câble n'est attaché sur le côté)
		var resolved = {}, effPorts = {}, usedPorts = {}, devEnds = {};
		rack.links.forEach(function (l) {
			[['a', l.a, l.a_port], ['b', l.b, l.b_port]].forEach(function (e) {
				(devEnds[e[1]] = devEnds[e[1]] || []).push({key: l.id + ':' + e[0], idx: portIndex(e[2]), l: l});
			});
		});
		rack.devices.forEach(function (d) {
			var ends = devEnds[d.id] || [], taken = {}, max = -1;
			ends.forEach(function (e) { if (e.idx >= 0 && e.idx < 48) { taken[e.idx] = true; max = Math.max(max, e.idx); } else { e.idx = -1; } });
			var next = 0;
			ends.forEach(function (e) {
				if (e.idx < 0) {
					while (taken[next] && next < 48) { next++; }
					if (next < 48) { e.idx = next; taken[next] = true; max = Math.max(max, next); }
				}
				resolved[e.key] = e.idx;
				if (e.idx >= 0) {
					(usedPorts[d.id] = usedPorts[d.id] || {})[e.idx] = e.l.color || CABLE_COLOR[e.l.cable] || CABLE_COLOR.other;
				}
			});
			effPorts[d.id] = Math.min(48, Math.max(d.ports || 0, max + 1));
		});

		var pos = {}, ports = {}, cableEls = [], devEls = {};
		var cableMode = editing ? 'all' : state.cableMode;

		function applyCables(devId) {
			var focus = devId !== null && devId !== undefined;
			var peers = {};
			cableEls.forEach(function (c) {
				var mine = focus && (c.l.a === devId || c.l.b === devId);
				var on = cableMode === 'all' || (cableMode === 'sel' && mine);
				c.g.style.display = on ? '' : 'none';
				c.g.style.opacity = (focus && cableMode === 'all' && !mine) ? .25 : 1;
				if (mine) { peers[c.l.a] = true; peers[c.l.b] = true; }
			});
			Object.keys(devEls).forEach(function (id) {
				var dim = focus && !editing && cableMode !== 'none' && !peers[id] && String(id) !== String(devId);
				devEls[id].style.opacity = dim ? .45 : 1;
			});
		}

		rack.devices.forEach(function (d) {
			var st = deviceState(d, hosts);
			var y = TOP + (rack.units - (d.u_pos + d.u_height - 1)) * UH;
			var h = d.u_height * UH;
			pos[d.id] = {y: y, h: h, cy: y + h / 2};
			var color = st.state === 'problem' && st.severity >= 0 ? SEV_COLOR[st.severity] : (st.state === 'down' ? COL_DOWN : STATE_COLOR[st.state]);
			var selected = editing ? state.edit.selected === d.id : state.sel === d.id;
			var tip = d.name + ' - ' + L['st_' + st.state] + (st.problems ? ' (' + st.problems + ' ' + L.problems + ')' : '');
			ports[d.id] = {};
			var g = drawDevice(svg, Object.assign({}, d, {ports: effPorts[d.id]}), RACK_X, y, RACK_W, h, color, st, tip, selected, usedPorts[d.id], function (i, px, py) { ports[d.id][i] = {x: px, y: py}; });
			devEls[d.id] = g;
			g.addEventListener('mouseenter', function () { applyCables(d.id); });
			g.addEventListener('mouseleave', function () { applyCables(editing ? state.edit.selected : state.sel); });

			if (editing) {
				g.addEventListener('mousedown', function (ev) { startDrag(ev, rack, d, g); });
			}
			else {
				g.addEventListener('click', function () { openPanel(d); });
			}
		});

		var devState = {};
		rack.devices.forEach(function (d) { devState[d.id] = deviceState(d, hosts).state; });

		var fall = {};
		var endpoint = function (id, key) {
			var idx = resolved[key], p = ports[id] && ports[id][idx];
			if (p) { return p; }
			var k = fall[id] = (fall[id] || 0) + 1;
			return {x: RACK_X + RACK_W - 24, y: pos[id].cy + (k - 1) * 7 - 3};
		};

		var traffic = (state.data && state.data.traffic) || {};
		var layer = el('g', {}, svg);
		rack.links.forEach(function (l) {
			if (!pos[l.a] || !pos[l.b]) { return; }
			var A = endpoint(l.a, l.id + ':a'), B = endpoint(l.b, l.id + ':b');
			var bad = devState[l.a] === 'down' || devState[l.b] === 'down';
			var color = bad ? '#d9534f' : (l.color || CABLE_COLOR[l.cable] || CABLE_COLOR.other);
			var sag = 22 + Math.min(70, Math.abs(B.x - A.x) * 0.12 + Math.abs(B.y - A.y) * 0.18);
			var dd = 'M' + A.x + ' ' + A.y + ' C' + A.x + ' ' + (A.y + sag) + ' ' + B.x + ' ' + (B.y + sag) + ' ' + B.x + ' ' + B.y;
			var dd2 = 'M' + B.x + ' ' + B.y + ' C' + B.x + ' ' + (B.y + sag) + ' ' + A.x + ' ' + (A.y + sag) + ' ' + A.x + ' ' + A.y;
			var cg = el('g', {style: 'pointer-events:none'}, layer);
			el('path', {d: dd, fill: 'none', stroke: '#050607', 'stroke-width': 5, opacity: .5, 'stroke-linecap': 'round'}, cg);
			el('path', {d: dd, fill: 'none', stroke: color, 'stroke-width': 2.6, 'stroke-linecap': 'round',
				'stroke-dasharray': l.cable === 'power' ? '6 3' : ''}, cg);
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
			[A, B].forEach(function (e) {
				el('rect', {x: e.x - 3, y: e.y - 6, width: 6, height: 9, rx: 1.2, fill: '#101215', stroke: color, 'stroke-width': 1.3}, cg);
			});
			el('title', {}, cg).textContent = (l.label ? l.label + ' - ' : '') + (l.a_port || '?') + ' <-> ' + (l.b_port || '?') +
				(tr ? '  (A\u2192B ' + fmtBps(tr.ab) + ' / B\u2192A ' + fmtBps(tr.ba) + ')' : '');
			cableEls.push({l: l, g: cg});
		});

		if (editing) {
			var pend = state.edit.pending;
			rack.devices.forEach(function (d) {
				Object.keys(ports[d.id] || {}).forEach(function (k) {
					var pt = ports[d.id][k], i = parseInt(k, 10);
					var isP = pend && pend.dev === d.id && pend.idx === i;
					var hit = el('rect', {x: pt.x - 6.5, y: pt.y - 6, width: 13, height: 12, rx: 2, fill: isP ? '#ffffff' : '#ffffff',
						'fill-opacity': isP ? .35 : 0, stroke: isP ? '#ffffff' : 'none', 'stroke-width': 1.6, style: 'cursor:crosshair'}, svg);
					el('title', {}, hit).textContent = d.name + ' - ' + L.port + ' ' + (i + 1);
					hit.addEventListener('mousedown', function (ev) { ev.stopPropagation(); });
					hit.addEventListener('click', function (ev) {
						ev.stopPropagation();
						portClick(rack, d, i);
					});
				});
			});
		}

		applyCables(editing ? state.edit.selected : state.sel);
	}

	/* ---------- tracé d'un câble à la souris : port de départ puis port d'arrivée ---------- */

	function portClick(rack, d, i) {
		var e = state.edit, p = e.pending;
		if (!p || p.dev === d.id) {
			e.pending = (p && p.dev === d.id && p.idx === i) ? null : {dev: d.id, idx: i};
		}
		else {
			var nl = e.newLink;
			rack.links.push({id: --state.tmp, a: p.dev, a_port: String(p.idx + 1), b: d.id, b_port: String(i + 1),
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
			var delta = Math.round((startY - e.clientY) / UH);
			if (delta !== 0) { moved = true; }
			var np = startPos + delta;
			if (fits(rack, dev, np, dev.u_height)) { target = np; }
			g.setAttribute('transform', 'translate(0,' + (-(target - startPos) * UH) + ')');
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
		field(b1, L.description, textInput(rack.description, function (v) { rack.description = v; }));

		var b2 = box(L.device);
		button('+ ' + L.add_device, 'btn-alt', function () {
			var pos = firstFreeSlot(rack, 1);
			if (!pos) { setMessage(L.no_space, false); return; }
			var id = --state.tmp;
			rack.devices.push({id: id, name: L.new_device, type: 'server', hostid: null, u_pos: pos, u_height: 1, ports: 0});
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
		field(form, L.type, select(TYPES.map(function (t) { return [t, L['t_' + t]]; }), dev.type, function (v) { dev.type = v; render(); }));

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
		field(form, L.ports, numInput(dev.ports, 0, 96, function (v) { dev.ports = v; render(); }));

		button(L.remove, 'btn-alt', function () {
			rack.devices = rack.devices.filter(function (d) { return d !== dev; });
			rack.links = rack.links.filter(function (l) { return l.a !== dev.id && l.b !== dev.id; });
			state.edit.selected = null;
			render();
		}, form);
	}

	function drawLinks(parent, rack) {
		var name = function (id) {
			var d = rack.devices.filter(function (x) { return x.id === id; })[0];
			return d ? d.name : '?';
		};

		var pd = state.edit.pending, pdev = pd ? rack.devices.filter(function (x) { return x.id === pd.dev; })[0] : null;
		html('div', {style: 'margin:4px 0;font-size:12px;' + (pdev ? 'font-weight:700' : 'opacity:.7')},
			pdev ? L.mouse_from + ' : ' + pdev.name + ' ' + L.port + ' ' + (pd.idx + 1) + ' \u2192 ' + L.mouse_to : L.mouse_hint, parent);
		if (pdev) { button(L.cancel, 'btn-alt', function () { state.edit.pending = null; render(); }, parent); }

		if (!rack.links.length) { html('div', {style: 'opacity:.6;margin:4px 0'}, L.no_cables, parent); }

		rack.links.forEach(function (l) {
			var row = html('div', {style: 'display:flex;gap:6px;align-items:center;margin:4px 0'}, undefined, parent);
			html('span', {style: 'flex:1'}, name(l.a) + (l.a_port ? ':' + l.a_port : '') + '  ↔  ' + name(l.b) + (l.b_port ? ':' + l.b_port : '') +
				'  (' + (L['c_' + l.cable] || l.cable) + ')', row);
			button('✕', 'btn-alt', function () {
				rack.links = rack.links.filter(function (x) { return x !== l; });
				render();
			}, row);
		});

		if (rack.devices.length < 2) { return; }

		var opts = rack.devices.map(function (d) { return [d.id, d.name]; });
		var nl = state.edit.newLink || (state.edit.newLink = {a: opts[0][0], b: opts[1][0], a_port: '', b_port: '', a_iface: '', b_iface: '', cable: 'rj45'});
		var form = html('div', {style: 'margin-top:8px;border-top:1px solid #4a5058;padding-top:6px'}, undefined, parent);
		html('b', {}, L.add_cable, form);
		field(form, 'A', select(opts, nl.a, function (v) { nl.a = parseInt(v, 10); }));
		field(form, L.port + ' A', textInput(nl.a_port, function (v) { nl.a_port = v; }));
		field(form, L.iface + ' A', textInput(nl.a_iface, function (v) { nl.a_iface = v; }, {placeholder: L.iface_hint}));
		field(form, 'B', select(opts, nl.b, function (v) { nl.b = parseInt(v, 10); }));
		field(form, L.port + ' B', textInput(nl.b_port, function (v) { nl.b_port = v; }));
		field(form, L.iface + ' B', textInput(nl.b_iface, function (v) { nl.b_iface = v; }, {placeholder: L.iface_hint}));
		field(form, L.cable_type, select(CABLES.map(function (c) { return [c, L['c_' + c]]; }), nl.cable, function (v) { nl.cable = v; }));
		button('+ ' + L.add_cable, 'btn-alt', function () {
			if (nl.a === nl.b) { return; }
			rack.links.push({id: --state.tmp, a: nl.a, a_port: nl.a_port, b: nl.b, b_port: nl.b_port, a_iface: nl.a_iface, b_iface: nl.b_iface, cable: nl.cable, color: '', label: ''});
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
		var work = rack ? clone(rack) : {id: 0, name: L.new_rack, units: 42, description: '', devices: [], links: []};
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
			id: r.id, name: r.name, units: r.units, description: r.description,
			devices: r.devices.map(function (d) {
				return {id: d.id, name: d.name, type: d.type, hostid: d.hostid, u_pos: d.u_pos, u_height: d.u_height, ports: d.ports};
			}),
			links: r.links.map(function (l) {
				return {a: l.a, b: l.b, a_port: l.a_port, b_port: l.b_port, a_iface: l.a_iface || '', b_iface: l.b_iface || '', cable: l.cable, color: l.color, label: l.label};
			})
		};

		post('rackmap.save', {payload: JSON.stringify(payload)}).then(function (res) {
			if (!res.ok) { setMessage(L.err_save + (res.error ? ' : ' + res.error : ''), false); return; }
			state.current = res.id;
			state.edit = null;
			refresh();
		}).catch(function () { setMessage(L.err_save, false); });
	}

	function deleteRack() {
		if (!window.confirm(L.confirm_delete_rack)) { return; }
		post('rackmap.save', {'delete': state.edit.rack.id}).then(function (res) {
			if (!res.ok) { setMessage(L.err_save + (res.error ? ' : ' + res.error : ''), false); return; }
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
