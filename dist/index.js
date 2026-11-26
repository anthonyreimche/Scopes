//#region src/colour.ts
function e(e) {
	return e <= .04045 ? e / 12.92 : ((e + .055) / 1.055) ** 2.4;
}
var t = /* @__PURE__ */ new Float32Array(256);
for (let n = 0; n < 256; n++) t[n] = e(n / 255);
var n = [
	.4124564,
	.3575761,
	.1804375,
	.2126729,
	.7151522,
	.072175,
	.0193339,
	.119192,
	.9503041
];
function r(e, t, r) {
	let i = n;
	return [
		i[0] * e + i[1] * t + i[2] * r,
		i[3] * e + i[4] * t + i[5] * r,
		i[6] * e + i[7] * t + i[8] * r
	];
}
var i = r(1, 1, 1);
function a() {
	let [e, t, n] = i, r = e + 15 * t + 3 * n;
	return [4 * e / r, 9 * t / r];
}
var o = a();
function s(e, t, n) {
	return .2126 * e + .7152 * t + .0722 * n;
}
function c(e, t, n) {
	return s(e / 255, t / 255, n / 255);
}
var l = [
	"all",
	"shadows",
	"mids",
	"highlights"
], u = 1 / 3, d = 2 / 3;
function f(e, t) {
	return t === "all" ? !0 : t === "shadows" ? e < u : t === "mids" ? e >= u && e < d : e >= d;
}
var p = 216 / 24389, m = 841 / 108, h = 4 / 29;
function g(e) {
	return e > p ? Math.cbrt(e) : e * m + h;
}
function _(e, t, n) {
	let [r, a, o] = i, s = g(e / r), c = g(t / a), l = g(n / o);
	return [
		116 * c - 16,
		500 * (s - c),
		200 * (c - l)
	];
}
function v(e, t, n) {
	let r = .4122214708 * e + .5363325363 * t + .0514459929 * n, i = .2119034982 * e + .6806995451 * t + .1073969566 * n, a = .0883024619 * e + .2817188376 * t + .6299787005 * n, o = Math.cbrt(r), s = Math.cbrt(i), c = Math.cbrt(a);
	return [
		.2104542553 * o + .793617785 * s - .0040720468 * c,
		1.9779984951 * o - 2.428592205 * s + .4505937099 * c,
		.0259040371 * o + .7827717662 * s - .808675766 * c
	];
}
var y = 360;
function b(e, t) {
	let n = Math.atan2(t, e) * 180 / Math.PI;
	return n < 0 ? n + y : n;
}
var x = "−";
function ee(e) {
	return e.startsWith("-") ? x + e.slice(1) : e;
}
function S(e, t) {
	return ee(e.toFixed(t));
}
function C(e) {
	return ee(String(Math.round(e)));
}
function w(e, t) {
	return String(Math.round(b(e, t)) % y);
}
function te(e) {
	return C(100 * e);
}
var ne = 1.8556, re = 1.5748;
function ie(e, t, n) {
	let r = e / 255, i = t / 255, a = n / 255, o = s(r, i, a);
	return [(a - o) / ne, (r - o) / re];
}
function ae(e, t, n) {
	return `Cb ${S(e, 2)}  Cr ${S(t, 2)} · ${w(e, t)}°  ${te(n)} %`;
}
function oe(e, n, i) {
	let [a, s, c] = r(t[e], t[n], t[i]), l = a + 15 * s + 3 * c;
	return l === 0 ? [0, 0] : [4 * a / l - o[0], 9 * s / l - o[1]];
}
function se(e, t, n) {
	let r = e + o[0], i = t + o[1];
	return `u′ ${S(r, 3)}  v′ ${S(i, 3)} · ${w(e, t)}°  ${te(n)} %`;
}
function ce(e, n, i) {
	let [a, o, s] = r(t[e], t[n], t[i]), [, c, l] = _(a, o, s);
	return [c, l];
}
function le(e, t, n) {
	let r = Math.hypot(e, t);
	return `a ${C(e)}  b ${C(t)} · C ${C(r)}  h ${w(e, t)}°`;
}
function ue(e, n, r) {
	let [, i, a] = v(t[e], t[n], t[r]);
	return [i, a];
}
function de(e, t, n) {
	let r = Math.hypot(e, t);
	return `a ${S(e, 2)}  b ${S(t, 2)} · C ${S(r, 2)}  h ${w(e, t)}°`;
}
var T = {
	ycbcr: {
		id: "ycbcr",
		label: "YCbCr (Rec. 709)",
		axes: ["Cb", "Cr"],
		project: ie,
		readout: ae
	},
	uv: {
		id: "uv",
		label: "CIE u′v′",
		axes: ["u′", "v′"],
		project: oe,
		readout: se
	},
	lab: {
		id: "lab",
		label: "CIELAB",
		axes: ["a", "b"],
		project: ce,
		readout: le
	},
	oklab: {
		id: "oklab",
		label: "Oklab",
		axes: ["a", "b"],
		project: ue,
		readout: de
	}
}, fe = [
	"ycbcr",
	"uv",
	"lab",
	"oklab"
], E = 255, pe = 256, D = [
	{
		label: "R",
		rgb: [
			1,
			0,
			0
		]
	},
	{
		label: "Yl",
		rgb: [
			1,
			1,
			0
		]
	},
	{
		label: "G",
		rgb: [
			0,
			1,
			0
		]
	},
	{
		label: "Cy",
		rgb: [
			0,
			1,
			1
		]
	},
	{
		label: "B",
		rgb: [
			0,
			0,
			1
		]
	},
	{
		label: "Mg",
		rgb: [
			1,
			0,
			1
		]
	}
];
function O(e, t, n) {
	return Math.round(E * (e + (t - e) * n));
}
function me(e, t) {
	let n = D[e].rgb, r = D[(e + 1) % D.length].rgb;
	return [
		O(n[0], r[0], t),
		O(n[1], r[1], t),
		O(n[2], r[2], t)
	];
}
function he(e) {
	let t = 0;
	for (let n = 0; n < D.length; n++) for (let r = 0; r < pe; r++) {
		let [i, a, o] = me(n, r / pe), [s, c] = e.project(i, a, o), l = Math.hypot(s, c);
		l > t && (t = l);
	}
	return t;
}
function ge(e) {
	let t = D.length * 24, n = new Float32Array(t * 2), r = new Uint8ClampedArray(t * 3), i = 0;
	for (let t = 0; t < D.length; t++) for (let a = 0; a < 24; a++) {
		let [o, s, c] = me(t, a / 24), [l, u] = e.project(o, s, c);
		n[i * 2] = l, n[i * 2 + 1] = u, r[i * 3] = o, r[i * 3 + 1] = s, r[i * 3 + 2] = c, i++;
	}
	return {
		points: n,
		colours: r,
		unit: he(e)
	};
}
var _e = /* @__PURE__ */ new Map();
function ve(e) {
	let t = _e.get(e.id);
	if (t) return t;
	let n = ge(e);
	return _e.set(e.id, n), n;
}
var ye = 360, be = 180, xe = 360;
function Se(e, t) {
	let n = Math.abs(e - t) % xe;
	return n > be ? xe - n : n;
}
function Ce(e) {
	let t = e.points.length / 2, n = new Float32Array(t);
	for (let r = 0; r < t; r++) n[r] = b(e.points[r * 2], e.points[r * 2 + 1]);
	let r = new Uint8ClampedArray(ye * 3);
	for (let i = 0; i < ye; i++) {
		let a = 0, o = Infinity;
		for (let e = 0; e < t; e++) {
			let t = Se(n[e], i);
			t < o && (o = t, a = e);
		}
		r[i * 3] = e.colours[a * 3], r[i * 3 + 1] = e.colours[a * 3 + 1], r[i * 3 + 2] = e.colours[a * 3 + 2];
	}
	return r;
}
var we = 15, Te = Math.log(16);
function Ee(e, t) {
	return t === "linear" ? e : Math.log1p(we * e) / Te;
}
function De(e, t) {
	return t === "linear" ? e : (Math.exp(e * Te) - 1) / we;
}
function Oe(e, t, n, r) {
	let i = r / n;
	return [e * i, t * i];
}
function k(e, t, n) {
	let r = Math.hypot(e, t);
	if (r === 0) return [0, 0];
	let i = Ee(r / n.unit, n.scale) * n.zoom;
	return i > 1 ? null : Oe(e, t, r, i);
}
function ke(e, t, n) {
	let r = Math.hypot(e, t);
	return r === 0 ? [0, 0] : Oe(e, t, r, De(r / n.zoom, n.scale) * n.unit);
}
var Ae = E, je = Math.round(.75 * E), Me = [1, .75];
function Ne(e) {
	let t = [];
	for (let n of D) for (let r of Me) {
		let i = r === 1 ? Ae : je, [a, o] = e.project(n.rgb[0] * i, n.rgb[1] * i, n.rgb[2] * i);
		t.push({
			label: n.label,
			level: r,
			x: a,
			y: o
		});
	}
	return t;
}
var Pe = [
	194,
	150,
	130
], Fe = [
	115,
	82,
	68
];
function Ie(e) {
	let [t, n] = e.project(Pe[0], Pe[1], Pe[2]), [r, i] = e.project(Fe[0], Fe[1], Fe[2]), a = Math.hypot(t, n), o = Math.hypot(r, i), s = t / a + r / o, c = n / a + i / o, l = Math.hypot(s, c);
	return [s / l, c / l];
}
var Le = [
	.25,
	.5,
	.75
], Re = 4e3, ze = 2222, Be = 4e3;
function Ve(e) {
	let t = 1 / e, n = t * t, r = n * t;
	return e <= Re ? -266123900 * r - 234358.9 * n + 877.6956 * t + .17991 : -3025846900 * r + 2107037.9 * n + 222.6347 * t + .24039;
}
function He(e, t) {
	let n = t * t, r = n * t;
	return e <= ze ? -1.1063814 * r - 1.3481102 * n + 2.18555832 * t - .20219683 : e <= Be ? -.9549476 * r - 1.37418593 * n + 2.09137015 * t - .16748867 : 3.081758 * r - 5.8733867 * n + 3.75112997 * t - .37001483;
}
function Ue(e) {
	let t = Ve(e);
	return [t, He(e, t)];
}
function We(e, t) {
	let n = -2 * e + 12 * t + 3;
	return [4 * e / n - o[0], 9 * t / n - o[1]];
}
var Ge = 500, Ke = 61, qe = 450 / 60, Je = [
	2500,
	3200,
	4e3,
	5500,
	6500,
	1e4
];
function Ye() {
	let e = [];
	for (let t = 0; t < Ke; t++) {
		let [n, r] = Ue(1e6 / (Ge - t * qe));
		e.push(We(n, r));
	}
	return {
		points: e,
		ticks: Je.map((e) => {
			let [t, n] = Ue(e), [r, i] = We(t, n);
			return {
				kelvin: e,
				x: r,
				y: i
			};
		})
	};
}
//#endregion
//#region src/hover.ts
var Xe = 255, A = 100;
function Ze(e, t, n, r, i) {
	if (i === null || n.width <= 0 || n.height <= 0 || i.w <= 0 || i.h <= 0) return null;
	let a = r / n.width, o = (e - n.left) * a, s = (t - n.top) * a, c = (o - i.x) / i.w, l = (s - i.y) / i.h;
	return c < 0 || c > 1 || l < 0 || l > 1 ? null : {
		x: c,
		y: l
	};
}
function Qe(e, t) {
	let { data: n, width: r, height: i } = e, a = Math.max(0, Math.min(r - 1, Math.floor(t.x * r))), o = (Math.max(0, Math.min(i - 1, Math.floor(t.y * i))) * r + a) * 4;
	return [
		n[o],
		n[o + 1],
		n[o + 2]
	];
}
function $e(e, t, n) {
	let [r, i] = e.project(...t), a = Math.hypot(r, i) / n;
	return {
		x: r,
		y: i,
		text: e.readout(r, i, a)
	};
}
function et(e, t, n, r) {
	let [i, a] = ke(t, n, r), o = Math.hypot(i, a) / r.unit;
	return e.readout(i, a, o);
}
function tt(e, t) {
	let [n, r, i] = t;
	return e === "luma" ? `Y ${Math.round(A * c(n, r, i))} %` : `R ${Math.round(A * n / Xe)}  G ${Math.round(A * r / Xe)}  B ${Math.round(A * i / Xe)} %`;
}
//#endregion
//#region src/runtime.ts
var j = null;
function nt(e) {
	j = e;
}
function M() {
	if (j === null) throw Error("[vectorscope] api() called before activate()");
	return j;
}
function N(e, t, ...n) {
	return M().react.createElement(e, t, ...n);
}
//#endregion
//#region src/store.ts
var P = null;
function rt() {
	P = M().stores.create((e, t) => ({
		sample: null,
		hoverUv: null,
		panels: 0,
		setSample(t) {
			e({ sample: t });
		},
		setHoverUv(t) {
			e({ hoverUv: t });
		},
		retainPanel() {
			e({ panels: t().panels + 1 });
		},
		releasePanel() {
			e({ panels: Math.max(0, t().panels - 1) });
		}
	}));
}
function F() {
	if (P === null) throw Error("[vectorscope] store() called before activate()");
	return P;
}
//#endregion
//#region src/HoverOverlay.ts
var I = 0;
function it() {
	let { useEffect: e, useRef: t } = M().react, n = t(null), r = M().develop.useDevelopOverlay(), i = F()((e) => e.panels);
	return e(() => {
		let e = n.current, t = r.rect;
		if (e === null || t === null || i === 0) return;
		let a = I, o = null, s = () => {
			F().getState().setHoverUv(null);
		}, c = () => {
			a = I;
			let n = o;
			if (o = null, n === null) return;
			let r = e.getBoundingClientRect();
			F().getState().setHoverUv(Ze(n.clientX, n.clientY, r, e.clientWidth, t));
		}, l = (e) => {
			o = e, a === I && (a = requestAnimationFrame(c));
		};
		window.addEventListener("pointermove", l);
		let u = document.documentElement;
		return u.addEventListener("pointerleave", s), window.addEventListener("blur", s), () => {
			window.removeEventListener("pointermove", l), u.removeEventListener("pointerleave", s), window.removeEventListener("blur", s), a !== I && cancelAnimationFrame(a), s();
		};
	}, [
		r.rect,
		r.nonce,
		i
	]), N("div", {
		ref: n,
		style: {
			position: "absolute",
			inset: 0,
			pointerEvents: "none"
		}
	});
}
//#endregion
//#region src/prefs.ts
var at = {
	low: 192,
	medium: 320,
	high: 512
}, L = [
	"vector",
	"wave",
	"parade"
], R = ["luma", "rgb"], ot = ["linear", "log"], st = [
	1,
	2,
	4
], ct = [
	"low",
	"medium",
	"high"
], z = {
	scope: "vector",
	model: "ycbcr",
	trace: "luma",
	scale: "linear",
	zoom: 1,
	range: "all",
	colorize: !0,
	sampleSize: "medium",
	intensity: 1,
	showRing: !0,
	showTargets: !0,
	showSkin: !0,
	showGamut: !0,
	showGrid: !0,
	showLocus: !0,
	showLevels: !0
}, lt = [
	"scope",
	"model",
	"trace",
	"scale",
	"zoom",
	"range",
	"colorize",
	"sampleSize",
	"intensity",
	"showRing",
	"showTargets",
	"showSkin",
	"showGamut",
	"showGrid",
	"showLocus",
	"showLevels"
], ut = .25, dt = 4;
function ft(e, t, n) {
	return Math.min(n, Math.max(t, e));
}
function B(e, t, n) {
	return t.includes(e) ? e : n;
}
function pt(e, t) {
	return typeof e == "boolean" ? e : t;
}
function mt(e, t) {
	return typeof e != "number" || !Number.isFinite(e) ? t : ft(e, ut, dt);
}
function ht(e, t) {
	switch (e) {
		case "scope": return B(t, L, z.scope);
		case "model": return B(t, fe, z.model);
		case "trace": return B(t, R, z.trace);
		case "scale": return B(t, ot, z.scale);
		case "zoom": return B(t, st, z.zoom);
		case "range": return B(t, l, z.range);
		case "sampleSize": return B(t, ct, z.sampleSize);
		case "intensity": return mt(t, z.intensity);
		default: return pt(t, z[e]);
	}
}
function gt(e, t, n) {
	e[t] = n;
}
function _t(e) {
	let t = { ...z };
	for (let n of lt) gt(t, n, ht(n, e(n, z[n])));
	return t;
}
var vt = [
	{
		key: "sampleSize",
		label: "Sample resolution",
		hint: "Long edge of the frame the scopes sample after each render.",
		type: "select",
		default: z.sampleSize,
		options: [
			{
				value: "low",
				label: "Low (192 px)"
			},
			{
				value: "medium",
				label: "Medium (320 px)"
			},
			{
				value: "high",
				label: "High (512 px)"
			}
		]
	},
	{
		key: "intensity",
		label: "Trace intensity",
		hint: "Brightness of the trace.",
		type: "number",
		default: z.intensity,
		min: ut,
		max: dt,
		step: .25
	},
	{
		key: "showRing",
		label: "Hue ring",
		hint: "The hue circle at the rim, coloured from the gamut outline.",
		type: "boolean",
		default: z.showRing
	},
	{
		key: "showTargets",
		label: "Colour-bar targets",
		hint: "75 % and 100 % boxes for R, Mg, B, Cy, G, Yl.",
		type: "boolean",
		default: z.showTargets
	},
	{
		key: "showSkin",
		label: "Skin-tone line",
		hint: "The mean direction of the ColorChecker skin patches.",
		type: "boolean",
		default: z.showSkin
	},
	{
		key: "showGamut",
		label: "Gamut outline",
		hint: "The reach of sRGB in the current model.",
		type: "boolean",
		default: z.showGamut
	},
	{
		key: "showGrid",
		label: "Grid",
		hint: "Axes and rings at 25, 50 and 75 % of the gamut reach.",
		type: "boolean",
		default: z.showGrid
	},
	{
		key: "showLocus",
		label: "Planckian locus",
		hint: "Blackbody colours from 2000 to 20000 K, in CIE u′v′ only.",
		type: "boolean",
		default: z.showLocus
	},
	{
		key: "showLevels",
		label: "Level lines",
		hint: "0 to 100 % lines on the waveform and parade.",
		type: "boolean",
		default: z.showLevels
	}
];
function V() {
	return _t(M().settings.get);
}
function H(e, t) {
	M().settings.set(e, t);
}
function yt() {
	for (let e of lt) H(e, z[e]);
}
function U(e) {
	return e.scope === "parade" ? "rgb" : e.trace;
}
function bt() {
	let { useState: e, useEffect: t } = M().react, [n, r] = e(V);
	return t(() => M().settings.onChange(() => r(V())), []), n;
}
var W = null;
function xt(e, t) {
	if (e.width < 2 || e.height < 2) return null;
	let n = Math.min(1, t / Math.max(e.width, e.height)), r = Math.max(1, Math.round(e.width * n)), i = Math.max(1, Math.round(e.height * n));
	W === null ? W = new OffscreenCanvas(r, i) : (W.width !== r || W.height !== i) && (W.width = r, W.height = i);
	let a = W.getContext("2d", { willReadFrequently: !0 });
	if (a === null) return null;
	a.clearRect(0, 0, r, i), a.drawImage(e, 0, 0, r, i);
	let { data: o } = a.getImageData(0, 0, r, i);
	return {
		data: o,
		width: r,
		height: i
	};
}
function St(e) {
	let { data: t, width: n, height: r } = e;
	if (n < 2 || r < 2) return null;
	let i = new Uint8ClampedArray(n * r * 4);
	for (let e = 0; e < i.length; e += 4) i[e] = Math.round(t[e] * 255), i[e + 1] = Math.round(t[e + 1] * 255), i[e + 2] = Math.round(t[e + 2] * 255), i[e + 3] = 255;
	return {
		data: i,
		floats: t,
		width: n,
		height: r
	};
}
function Ct(e) {
	let { develop: t, capture: n, readback: r, captureFloat: i, readbackFloat: a, publish: o } = e, s = e.throttleMs ?? 150, c = !1, l = !1, u = !1, d = null, f = -Infinity, p = 0;
	async function m(e) {
		if (i !== void 0 && a !== void 0) {
			let t = await i(e).catch(() => null);
			if (t !== null) return {
				read: () => a(t),
				release() {}
			};
		}
		let t = await n(e);
		return {
			read: () => r(t),
			release: () => t.close?.()
		};
	}
	function h() {
		d = null;
		let { photoId: e, params: n, previewParams: r } = t.getState();
		if (c || e === null) return;
		l = !0, f = Date.now();
		let i = p;
		m(r ?? n).then((e) => {
			let t = !c && i === p, n;
			try {
				n = t ? e.read() : null;
			} catch {
				e.release(), t && o(null);
				return;
			}
			e.release(), t && o(n);
		}, () => {
			!c && i === p && o(null);
		}).finally(() => {
			l = !1, u && !c && (u = !1, g());
		});
	}
	function g() {
		if (!c) {
			if (l) {
				u = !0;
				return;
			}
			d === null && (d = setTimeout(h, Math.max(0, s - (Date.now() - f))));
		}
	}
	let _ = t.subscribe((e, t) => {
		if (e.photoId !== t.photoId && p++, e.photoId === null) {
			u = !1, d !== null && (clearTimeout(d), d = null), o(null);
			return;
		}
		(e.histogram !== t.histogram || e.photoId !== t.photoId) && g();
	});
	return g(), () => {
		c = !0, _(), d !== null && (clearTimeout(d), d = null);
	};
}
function wt(e) {
	let t = 0, n = null;
	return () => {
		t++, t === 1 && (n = e());
		let r = !1;
		return () => {
			r || (r = !0, t--, t === 0 && (n?.(), n = null));
		};
	};
}
var Tt = {
	encoding: "perceptual",
	primaries: "rec709"
};
function Et() {
	let { develop: e } = M(), t = e.captureFloatFrame !== void 0;
	return Ct({
		develop: M().stores.useDevelopStore,
		capture: (t) => e.captureFrame(t),
		readback: (e) => xt(e, at[V().sampleSize]),
		captureFloat: t ? (t) => e.captureFloatFrame(t, {
			space: Tt,
			point: "pre-output",
			maxEdge: at[V().sampleSize]
		}) : void 0,
		readbackFloat: t ? St : void 0,
		publish: (e) => F().getState().setSample(e)
	});
}
var Dt = wt(Et), Ot = 128, kt = 384;
function At(e, t) {
	return Math.min(t, Math.min(kt, Math.max(Ot, Math.round(Math.sqrt(e)))));
}
function jt(e, t, n) {
	return Math.min(n, Math.max(t, e));
}
function Mt(e, t, n) {
	return t * n + e;
}
function Nt(e, t, n, r, i) {
	let { data: a, width: o, height: s } = e, l = o * s, u = new Uint32Array(i * i), d = i / 2, p = d - .5;
	for (let e = 0; e < l; e++) {
		let o = e * 4, s = a[o], l = a[o + 1], m = a[o + 2];
		if (r !== "all" && !f(c(s, l, m), r)) continue;
		let [h, g] = t.project(s, l, m), _ = k(h, g, n);
		if (_ === null) continue;
		let [v, y] = _;
		if (!Number.isFinite(v) || !Number.isFinite(y)) continue;
		let b = jt(Math.round(d + v * p), 0, i - 1), x = jt(Math.round(d - y * p), 0, i - 1);
		u[Mt(b, x, i)]++;
	}
	return {
		size: i,
		counts: u,
		total: l
	};
}
var Pt = 8;
function Ft(e, t, n, r) {
	return 1 - Math.exp(-e * r * t / (Pt * n));
}
function It(e, t, n) {
	return [
		e[0] + (t[0] - e[0]) * n,
		e[1] + (t[1] - e[1]) * n,
		e[2] + (t[2] - e[2]) * n
	];
}
var Lt = 360, Rt = .5, zt = .4;
function Bt(e, t, n, r) {
	let { size: i, counts: a, total: o } = e, s = i * i, c = new Uint8ClampedArray(s * 4), l = i / 2, u = l - .5;
	for (let e = 0; e < i; e++) for (let d = 0; d < i; d++) {
		let f = a[Mt(d, e, i)];
		if (f === 0) continue;
		let p = Ft(f, s, o, r), m = Mt(d, e, i) * 4;
		if (c[m + 3] = Math.round(255 * p), t === null) {
			c[m] = n.ink[0], c[m + 1] = n.ink[1], c[m + 2] = n.ink[2];
			continue;
		}
		let h = d - l, g = l - e, _ = Math.hypot(h, g) / u, v = Math.round(b(h, g)) % Lt, y = [
			t[v * 3],
			t[v * 3 + 1],
			t[v * 3 + 2]
		], x = It(It(n.neutral, y, Math.min(1, _ / Rt)), n.lift, zt * p);
		c[m] = Math.round(x[0]), c[m + 1] = Math.round(x[1]), c[m + 2] = Math.round(x[2]);
	}
	return c;
}
function Vt(e) {
	let t = e / 2;
	return {
		cx: t,
		cy: t,
		r: t - 10
	};
}
function Ht(e) {
	return {
		unit: ve(T[e.model]).unit,
		scale: e.scale,
		zoom: e.zoom
	};
}
var G = Math.PI * 2, K = 360, Ut = 1, Wt = .18, Gt = .45, Kt = .6, qt = .85, Jt = .5, Yt = 5, Xt = 4, Zt = 9, Qt = 8, $t = [4, 3], en = 3, tn = 72, nn = 3, rn = 5, an = 1.5, on = 10, sn = 6;
function cn(e) {
	return `rgb(${e[0]}, ${e[1]}, ${e[2]})`;
}
function q(e, t, n) {
	e.globalAlpha = n, e.strokeStyle = t, e.lineWidth = Ut;
}
function J(e, t, n) {
	return [e.cx + t * e.r, e.cy - n * e.r];
}
function ln(e, t, n, r) {
	e.save(), q(e, r, Wt), e.beginPath(), e.moveTo(t.cx - t.r, t.cy), e.lineTo(t.cx + t.r, t.cy), e.moveTo(t.cx, t.cy - t.r), e.lineTo(t.cx, t.cy + t.r);
	for (let r of Le) {
		let i = Ee(r, n.scale) * n.zoom;
		i > 1 || (e.moveTo(t.cx + i * t.r, t.cy), e.arc(t.cx, t.cy, i * t.r, 0, G));
	}
	e.stroke(), e.restore();
}
function un(e, t, n, r, i) {
	e.save(), q(e, i, Gt), e.beginPath();
	let a = !1, o = n.points.length / 2;
	for (let i = 0; i < o; i++) {
		let o = n.points[i * 2], s = n.points[i * 2 + 1], c = Math.hypot(o, s);
		if (c === 0) continue;
		let l = Math.min(1, Ee(c / r.unit, r.scale) * r.zoom), [u, d] = J(t, o / c * l, s / c * l);
		a ? e.lineTo(u, d) : (e.moveTo(u, d), a = !0);
	}
	e.closePath(), e.stroke(), e.restore();
}
function dn(e, t, n, r, i, a) {
	e.save(), q(e, i, 1), e.fillStyle = i, e.font = `${Zt}px ${a}`, e.textAlign = "center", e.textBaseline = "middle";
	for (let i of Ne(n)) {
		let n = k(i.x, i.y, r);
		if (n === null) continue;
		let [a, o] = J(t, n[0], n[1]), s = i.level === 1 ? Yt : Xt;
		if (e.strokeRect(a - s / 2, o - s / 2, s, s), i.level === 1) continue;
		let c = a - t.cx, l = o - t.cy, u = Math.hypot(c, l);
		if (u === 0) continue;
		let d = Qt / u;
		e.fillText(i.label, a + c * d, o + l * d);
	}
	e.restore();
}
function fn(e, t, n, r) {
	let [i, a] = Ie(n), [o, s] = J(t, i, a);
	e.save(), q(e, r, Kt), e.setLineDash($t), e.beginPath(), e.moveTo(t.cx, t.cy), e.lineTo(o, s), e.stroke(), e.restore();
}
var pn = null;
function mn() {
	return pn === null && (pn = Ye()), pn;
}
function hn(e, t, n) {
	if (e.length < 2) return null;
	let r = 0, i = Infinity;
	for (let a = 0; a < e.length; a++) {
		let o = Math.hypot(e[a][0] - t, e[a][1] - n);
		o < i && (i = o, r = a);
	}
	let a = e[Math.max(0, r - 1)], o = e[Math.min(e.length - 1, r + 1)], s = o[0] - a[0], c = o[1] - a[1], l = Math.hypot(s, c);
	return l === 0 ? null : [-c / l, s / l];
}
function gn(e, t, n, r) {
	e.save(), q(e, r, Kt);
	let i = [];
	e.beginPath();
	let a = !1;
	for (let [r, o] of mn().points) {
		let s = k(r, o, n);
		if (s === null) {
			a = !1;
			continue;
		}
		let c = J(t, s[0], s[1]);
		i.push(c), a ? e.lineTo(c[0], c[1]) : (e.moveTo(c[0], c[1]), a = !0);
	}
	e.stroke();
	let o = en / 2;
	e.beginPath();
	for (let r of mn().ticks) {
		let a = k(r.x, r.y, n);
		if (a === null) continue;
		let [s, c] = J(t, a[0], a[1]), l = hn(i, s, c);
		l !== null && (e.moveTo(s - l[0] * o, c - l[1] * o), e.lineTo(s + l[0] * o, c + l[1] * o));
	}
	e.stroke(), e.restore();
}
function _n(e, t, n) {
	e.save(), e.globalCompositeOperation = "source-over", e.imageSmoothingEnabled = !0, e.drawImage(n, t.cx - t.r, t.cy - t.r, t.r * 2, t.r * 2), e.restore();
}
function vn(e, t) {
	let n = t % K * 3;
	return `rgb(${e[n]}, ${e[n + 1]}, ${e[n + 2]})`;
}
function yn(e, t, n) {
	let r = e.createConicGradient(0, t.cx, t.cy);
	for (let e = 0; e <= tn; e++) {
		let t = e / tn, i = (K - t * K) % K;
		r.addColorStop(t, vn(n, Math.round(i)));
	}
	e.save(), e.globalAlpha = qt, e.strokeStyle = r, e.lineWidth = nn, e.beginPath(), e.arc(t.cx, t.cy, t.r, 0, G), e.stroke(), e.restore();
}
function bn(e, t, n, r, i) {
	e.save(), e.globalAlpha = Jt, e.strokeStyle = cn(r.lift), e.lineWidth = 3.5, e.beginPath(), e.arc(t, n, rn, 0, G), e.stroke(), e.globalAlpha = 1, e.strokeStyle = i, e.lineWidth = an, e.beginPath(), e.arc(t, n, rn, 0, G), e.stroke(), e.restore();
}
function xn(e, t, n, r, i) {
	e.save(), e.globalAlpha = r, e.fillStyle = i, e.font = `${on}px ${t.mono}`, e.textAlign = "left", e.textBaseline = "alphabetic", e.fillText(n, sn, t.width - sn), e.restore();
}
function Sn(e, t, n, r, i, a) {
	let { sample: o, hoverUv: s, cursor: c } = t;
	if (o !== null && s !== null) {
		let c = $e(r, Qe(o, s), i.unit), l = k(c.x, c.y, i);
		if (l !== null) {
			let [r, i] = J(n, l[0], l[1]);
			bn(e, r, i, t.palette, a);
		}
		xn(e, t, c.text, 1, a);
		return;
	}
	if (c !== null && Math.hypot(c[0], c[1]) <= 1) {
		xn(e, t, et(r, c[0], c[1], i), 1, a);
		return;
	}
	xn(e, t, r.label, Kt, a);
}
function Cn(e, t) {
	let { prefs: n } = t, r = Vt(t.width);
	if (r.r <= 0) return;
	let i = T[n.model], a = ve(i), o = Ht(n), s = cn(t.palette.ink);
	n.showGrid && ln(e, r, o, s), n.showGamut && un(e, r, a, o, s), n.showTargets && dn(e, r, i, o, s, t.mono), n.showSkin && fn(e, r, i, s), n.showLocus && i.id === "uv" && gn(e, r, o, s), t.density !== null && _n(e, r, t.density), n.showRing && yn(e, r, t.hues), Sn(e, t, r, i, o, s);
}
//#endregion
//#region src/waveform.ts
var wn = [
	[
		231,
		76,
		60
	],
	[
		46,
		204,
		113
	],
	[
		74,
		163,
		255
	]
], Tn = [
	0,
	.25,
	.5,
	.75,
	1
], En = 256;
function Dn(e, t, n) {
	return {
		width: Math.min(e.width, t),
		height: Math.min(En, n)
	};
}
var On = .0625, kn = 1.125;
function An(e) {
	return Math.min(1, Math.max(0, (e + On) / kn));
}
function Y(e, t, n, r, i) {
	return (e * r + t) * i + n;
}
var X = 255;
function jn(e, t) {
	return Math.round(An(e) * (t - 1));
}
function Mn(e, t, n, r, i) {
	let { data: a, floats: o, width: c, height: l } = e, u = c * l, d = t === "luma" ? 1 : 3, f = new Uint32Array(d * i * r), p = t === "luma" && n ? new Float32Array(3 * i * r) : null;
	for (let e = 0; e < u; e++) {
		let n = e * 4, l = a[n], u = a[n + 1], d = a[n + 2], m = o === void 0 ? null : [
			o[n],
			o[n + 1],
			o[n + 2]
		], h = e % c, g = Math.min(r - 1, Math.floor(h * r / c));
		if (t === "luma") {
			let [e, t, n] = m ?? [
				l / X,
				u / X,
				d / X
			], a = jn(s(e, t, n), i);
			f[Y(0, a, g, i, r)]++, p !== null && (p[Y(0, a, g, i, r)] += l, p[Y(1, a, g, i, r)] += u, p[Y(2, a, g, i, r)] += d);
		} else {
			let e = m ?? [
				l / X,
				u / X,
				d / X
			];
			for (let t = 0; t < 3; t++) {
				let n = jn(e[t], i);
				f[Y(t, n, g, i, r)]++;
			}
		}
	}
	return {
		width: r,
		height: i,
		channels: d,
		counts: f,
		sums: p,
		total: u
	};
}
var Nn = 4;
function Pn(e, t, n = Nn) {
	let r = Math.floor((e - n * (t - 1)) / t), i = [];
	for (let e = 0; e < t; e++) i.push({
		x0: e * (r + n),
		width: r
	});
	return i;
}
var Fn = .4;
function In(e, t, n, r) {
	let { width: i, height: a, channels: o, counts: s, sums: c, total: l } = e, u = i * a, d = [];
	for (let e = 0; e < o; e++) {
		let f = new Uint8ClampedArray(u * 4);
		for (let d = 0; d < a; d++) for (let p = 0; p < i; p++) {
			let m = s[Y(e, d, p, a, i)];
			if (m === 0) continue;
			let h = Ft(m, u, l, n), g = ((a - 1 - d) * i + p) * 4;
			f[g + 3] = Math.round(255 * h);
			let _;
			_ = o === 3 ? wn[e] : r && c !== null ? It([
				c[Y(0, d, p, a, i)] / m,
				c[Y(1, d, p, a, i)] / m,
				c[Y(2, d, p, a, i)] / m
			], t.lift, Fn * h) : t.ink, f[g] = Math.round(_[0]), f[g + 1] = Math.round(_[1]), f[g + 2] = Math.round(_[2]);
		}
		d.push(f);
	}
	return d;
}
var Ln = 4, Rn = 3;
function zn(e, t, n) {
	let r = e - 22 - Ln;
	return {
		x0: 22,
		y0: Ln,
		width: r,
		height: t - 8,
		lanes: Pn(r, n === "parade" ? Rn : 1)
	};
}
var Bn = 255, Vn = 100, Hn = 1, Un = .18, Wn = .6, Gn = .6, Kn = 8, qn = 3, Jn = Math.PI * 2, Yn = 10, Xn = 6;
function Zn(e) {
	return `rgb(${e[0]}, ${e[1]}, ${e[2]})`;
}
function Z(e, t) {
	return e.y0 + (1 - An(t)) * e.height;
}
function Qn(e, t, n) {
	return e.x0 + t.x0 + n * t.width;
}
function $n(e, t, n, r) {
	e.save(), e.strokeStyle = n, e.lineWidth = Hn, e.globalAlpha = Un, e.beginPath();
	for (let n of Tn) {
		let r = Z(t, n);
		e.moveTo(t.x0, r), e.lineTo(t.x0 + t.width, r);
	}
	e.stroke(), e.globalAlpha = Wn, e.fillStyle = n, e.font = `${Kn}px ${r}`, e.textAlign = "right", e.textBaseline = "middle";
	for (let n of Tn) e.fillText(String(Math.round(Vn * n)), 18, Z(t, n));
	e.restore();
}
function er(e, t, n) {
	return e.lanes[t === "parade" ? n : 0];
}
function tr(e, t, n) {
	e.save(), e.imageSmoothingEnabled = !0, e.globalCompositeOperation = n.layers.length > 1 && n.dark ? "lighter" : "source-over";
	for (let r = 0; r < n.layers.length; r++) {
		let i = er(t, n.prefs.scope, r);
		e.drawImage(n.layers[r], Qn(t, i, 0), t.y0, i.width, t.height);
	}
	e.restore();
}
function nr(e, t, n, r) {
	return U(t) === "luma" ? [{
		lane: er(e, t.scope, 0),
		level: c(n[0], n[1], n[2]),
		colour: r
	}] : wn.map((r, i) => ({
		lane: er(e, t.scope, i),
		level: n[i] / Bn,
		colour: Zn(r)
	}));
}
function rr(e, t, n, r) {
	let { sample: i, hoverUv: a } = n;
	if (i === null || a === null) return;
	let o = Qe(i, a);
	e.save(), e.globalAlpha = Gn, e.strokeStyle = r, e.lineWidth = Hn, e.beginPath();
	for (let n of t.lanes) {
		let r = Qn(t, n, a.x);
		e.moveTo(r, t.y0), e.lineTo(r, t.y0 + t.height);
	}
	e.stroke(), e.globalAlpha = 1;
	for (let i of nr(t, n.prefs, o, r)) e.fillStyle = i.colour, e.beginPath(), e.arc(Qn(t, i.lane, a.x), Z(t, i.level), qn / 2, 0, Jn), e.fill();
	e.fillStyle = r, e.font = `${Yn}px ${n.mono}`, e.textAlign = "left", e.textBaseline = "alphabetic", e.fillText(tt(U(n.prefs), o), Xn, n.height - Xn), e.restore();
}
function ir(e, t) {
	let n = zn(t.width, t.height, t.prefs.scope);
	if (n.width <= 0 || n.height <= 0) return;
	let r = Zn(t.palette.ink);
	t.prefs.showLevels && $n(e, n, r, t.mono), tr(e, n, t), rr(e, n, t, r);
}
//#endregion
//#region src/ScopeView.ts
var ar = .55, or = 96;
function sr(e) {
	return Math.max(or, Math.round(ar * e));
}
var cr = {
	palette: {
		ink: [
			235,
			235,
			235
		],
		neutral: [
			200,
			200,
			200
		],
		lift: [
			255,
			255,
			255
		]
	},
	dark: !0
}, lr = {
	palette: {
		ink: [
			25,
			25,
			25
		],
		neutral: [
			70,
			70,
			70
		],
		lift: [
			0,
			0,
			0
		]
	},
	dark: !1
}, ur = 128;
function dr(e, t, n) {
	return (e + t + n) / 3 < ur ? cr : lr;
}
var fr = /rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/;
function pr(e) {
	let t = fr.exec(getComputedStyle(e).backgroundColor);
	return t === null ? cr : dr(Number(t[1]), Number(t[2]), Number(t[3]));
}
function mr(e, t) {
	let n = e.subscribe((e, n) => {
		e.activeId !== n.activeId && t();
	}), r = new MutationObserver(t);
	return r.observe(document.documentElement, {
		attributes: !0,
		attributeFilter: ["style", "class"]
	}), () => {
		n(), r.disconnect();
	};
}
var hr = "ui-monospace, monospace";
function gr() {
	return getComputedStyle(document.documentElement).getPropertyValue("--font-mono").trim() || hr;
}
var _r = /* @__PURE__ */ new Map();
function vr(e) {
	let t = _r.get(e.id);
	if (t !== void 0) return t;
	let n = Ce(ve(e));
	return _r.set(e.id, n), n;
}
function yr(e, t) {
	return e.current.sample !== t && (e.current = {
		sample: t,
		id: e.current.id + 1
	}), e.current.id;
}
function br(e, t, n, r) {
	return [
		e,
		t.scope,
		t.model,
		U(t),
		t.scale,
		t.zoom,
		t.range,
		t.colorize,
		t.intensity,
		n,
		r
	].join("|");
}
function xr(e, t, n) {
	let r = e.current;
	if (r !== null && r.key === t) return r.layers;
	let i = n();
	return e.current = {
		key: t,
		layers: i
	}, i;
}
function Sr(e, t, n) {
	let r = document.createElement("canvas");
	r.width = t, r.height = n;
	let i = r.getContext("2d");
	if (i !== null) {
		let r = i.createImageData(t, n);
		r.data.set(e), i.putImageData(r, 0, 0);
	}
	return r;
}
function Cr(e, t, n, r, i) {
	return [Sr(Bt(Nt(e, T[t.model], Ht(t), t.range, i), t.colorize ? r : null, n, t.intensity), i, i)];
}
function wr(e, t, n, r, i) {
	return In(Mn(e, U(t), t.colorize, r, i), n, t.intensity, t.colorize).map((e) => Sr(e, r, i));
}
var Tr = 240, Er = 4, Dr = "Hover the image to place its pixel on the scope", Or = {
	vector: "Vectorscope",
	wave: "Waveform",
	parade: "RGB parade"
};
function kr({ prefs: e }) {
	let { useEffect: t, useRef: n, useState: r } = M().react, i = n(null), a = n(null), o = n(null), s = n({
		sample: null,
		id: 0
	}), [c, l] = r(Tr), [u, d] = r(0), [f, p] = r(null), m = F()((e) => e.sample), h = F()((e) => e.hoverUv), g = e.scope === "vector" ? c : sr(c);
	t(() => {
		let e = i.current;
		if (e === null) return;
		let t = new ResizeObserver((e) => {
			let t = Math.round(e[0].contentRect.width);
			t > 0 && l(t);
		});
		return t.observe(e), () => t.disconnect();
	}, []), t(() => mr(M().stores.useThemeStore, () => d((e) => e + 1)), []), t(() => {
		let t = a.current;
		if (t === null) return;
		let n = t.getContext("2d");
		if (n === null) return;
		let r = window.devicePixelRatio || 1, i = Math.round(c * r), l = Math.round(g * r);
		t.width !== i && (t.width = i), t.height !== l && (t.height = l), n.setTransform(r, 0, 0, r, 0, 0), n.clearRect(0, 0, c, g);
		let { palette: u, dark: d } = pr(t), p = gr(), _ = yr(s, m);
		if (e.scope === "vector") {
			let t = Vt(c), i = vr(T[e.model]), a = m === null ? 0 : At(m.width * m.height, Math.round(t.r * 2 * r)), s = m !== null && a > 0 ? xr(o, br(_, e, String(a), d), () => Cr(m, e, u, i, a))[0] : null;
			Cn(n, {
				width: c,
				prefs: e,
				sample: m,
				hoverUv: h,
				cursor: f,
				hues: i,
				density: s,
				palette: u,
				mono: p
			});
			return;
		}
		let v = zn(c, g, e.scope), y = Math.round(v.lanes[0].width * r), b = Math.round(v.height * r), x = m === null ? null : Dn(m, y, b), ee = m !== null && x !== null && x.width > 0 && x.height > 0 ? xr(o, br(_, e, `${x.width}x${x.height}`, d), () => wr(m, e, u, x.width, x.height)) : [];
		ir(n, {
			width: c,
			height: g,
			prefs: e,
			sample: m,
			hoverUv: h,
			layers: ee,
			palette: u,
			dark: d,
			mono: p
		});
	}, [
		m,
		h,
		f,
		e,
		c,
		u
	]);
	function _(t) {
		let n = t.currentTarget, r = Vt(c);
		if (e.scope !== "vector" || r.r <= 0) {
			p(null);
			return;
		}
		let i = n.getBoundingClientRect();
		if (i.width <= 0) return;
		let a = n.clientWidth / i.width, o = (t.clientX - i.left) * a, s = (t.clientY - i.top) * a;
		p([(o - r.cx) / r.r, (r.cy - s) / r.r]);
	}
	return N("div", {
		ref: i,
		style: { width: "100%" }
	}, N("canvas", {
		ref: a,
		title: Dr,
		role: "img",
		"aria-label": `${Or[e.scope]} of the open photo`,
		onPointerMove: _,
		onPointerLeave: () => p(null),
		style: {
			width: c,
			height: g,
			display: "block",
			borderRadius: Er,
			background: "var(--color-surface-0)",
			touchAction: "none"
		}
	}));
}
//#endregion
//#region src/Panel.ts
var Ar = 6, jr = {
	vector: "Vectorscope",
	wave: "Waveform",
	parade: "Parade"
}, Mr = {
	luma: "Luma",
	rgb: "RGB"
}, Nr = {
	linear: "Lin",
	log: "Log"
}, Pr = {
	linear: "Linear chroma",
	log: "Logarithmic chroma, expands the neutral core"
}, Fr = {
	1: "1×",
	2: "2×",
	4: "4×"
}, Ir = {
	all: "All",
	shadows: "Shadows",
	mids: "Mids",
	highlights: "Highlights"
}, Lr = "Isolate a tonal range, as the Colour Grading wheels split it", Rr = "Colour the trace by hue";
function Q(e, t, n) {
	let r = t.find((t) => t === e);
	r !== void 0 && n(r);
}
function zr(e) {
	let t = Number(e), n = st.find((e) => e === t);
	n !== void 0 && H("zoom", n);
}
function Br(e) {
	let { SegmentedControl: t } = M().ui;
	return N(t, {
		size: "sm",
		value: e.scope,
		options: L.map((e) => ({
			value: e,
			label: jr[e]
		})),
		onChange: (e) => Q(e, L, (e) => H("scope", e))
	});
}
function Vr(e) {
	let { Select: t } = M().ui;
	return N(t, {
		value: e.model,
		ariaLabel: "Colour model",
		options: fe.map((e) => ({
			value: e,
			label: T[e].label
		})),
		onChange: (e) => Q(e, fe, (e) => H("model", e))
	});
}
function Hr(e) {
	let { Select: t } = M().ui;
	return N(t, {
		value: e.trace,
		ariaLabel: "Trace",
		options: R.map((e) => ({
			value: e,
			label: Mr[e]
		})),
		onChange: (e) => Q(e, R, (e) => H("trace", e))
	});
}
function Ur(e) {
	return e.scope === "vector" ? Vr(e) : e.scope === "wave" ? Hr(e) : null;
}
function Wr(e) {
	let { Button: t, Row: n } = M().ui, r = Ur(e);
	return N(n, { gap: Ar }, r === null ? null : N("div", { style: {
		flex: "1 1 auto",
		minWidth: 0
	} }, r), N(t, {
		size: "sm",
		active: e.colorize,
		disabled: e.scope !== "vector" && U(e) === "rgb",
		title: Rr,
		onClick: () => H("colorize", !e.colorize)
	}, "Colorize"));
}
function Gr(e) {
	let { Row: t, SegmentedControl: n } = M().ui;
	return N(t, { gap: Ar }, N(n, {
		size: "sm",
		value: e.scale,
		options: ot.map((e) => ({
			value: e,
			label: Nr[e],
			title: Pr[e]
		})),
		onChange: (e) => Q(e, ot, (e) => H("scale", e))
	}), N(n, {
		size: "sm",
		value: String(e.zoom),
		options: st.map((e) => ({
			value: String(e),
			label: Fr[e]
		})),
		onChange: zr
	}));
}
function Kr(e) {
	let { SegmentedControl: t } = M().ui;
	return N(t, {
		size: "sm",
		value: e.range,
		options: l.map((e) => ({
			value: e,
			label: Ir[e],
			title: Lr
		})),
		onChange: (e) => Q(e, l, (e) => H("range", e))
	});
}
function qr() {
	let { useEffect: e } = M().react, t = bt(), { Stack: n } = M().ui;
	e(() => {
		let e = Dt();
		return F().getState().retainPanel(), () => {
			e(), F().getState().releasePanel();
		};
	}, []);
	let r = t.scope === "vector";
	return N(n, {
		gap: Ar,
		style: {
			padding: "6px 8px 8px",
			userSelect: "text"
		}
	}, Br(t), N(kr, { prefs: t }), Wr(t), r ? Gr(t) : null, r ? Kr(t) : null);
}
//#endregion
//#region src/index.ts
var Jr = "vectorscope.panel", $ = "vectorscope.hover", Yr = 1.5, Xr = 268, Zr = 40;
function Qr(e) {
	nt(e), rt(), e.registerPanel({
		id: Jr,
		title: "Scopes",
		component: qr,
		defaultDock: {
			module: "develop",
			direction: "right",
			order: Yr,
			width: Xr
		},
		modules: ["develop"],
		onReset: yt
	}), e.registerSlot({
		id: $,
		slot: "develop-canvas-overlay",
		component: it,
		order: Zr
	}), e.registerSettings({
		title: "Scopes",
		keywords: [
			"vectorscope",
			"waveform",
			"parade",
			"skin tone",
			"gamut"
		],
		fields: [...vt]
	});
}
function $r() {
	try {
		let e = F().getState();
		e.setSample(null), e.setHoverUv(null), M().unregisterSlot($);
	} catch {}
}
//#endregion
export { $ as HOVER_ID, Jr as PANEL_ID, Qr as activate, $r as deactivate };

//# sourceMappingURL=index.js.map