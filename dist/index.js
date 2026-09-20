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
}, E = [
	"ycbcr",
	"uv",
	"lab",
	"oklab"
], D = 255, fe = 256, O = [
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
function pe(e, t, n) {
	return Math.round(D * (e + (t - e) * n));
}
function me(e, t) {
	let n = O[e].rgb, r = O[(e + 1) % O.length].rgb;
	return [
		pe(n[0], r[0], t),
		pe(n[1], r[1], t),
		pe(n[2], r[2], t)
	];
}
function he(e) {
	let t = 0;
	for (let n = 0; n < O.length; n++) for (let r = 0; r < fe; r++) {
		let [i, a, o] = me(n, r / fe), [s, c] = e.project(i, a, o), l = Math.hypot(s, c);
		l > t && (t = l);
	}
	return t;
}
function ge(e) {
	let t = O.length * 24, n = new Float32Array(t * 2), r = new Uint8ClampedArray(t * 3), i = 0;
	for (let t = 0; t < O.length; t++) for (let a = 0; a < 24; a++) {
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
var Ae = D, je = Math.round(.75 * D), Me = [1, .75];
function Ne(e) {
	let t = [];
	for (let n of O) for (let r of Me) {
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
var A = [
	194,
	150,
	130
], j = [
	115,
	82,
	68
];
function Pe(e) {
	let [t, n] = e.project(A[0], A[1], A[2]), [r, i] = e.project(j[0], j[1], j[2]), a = Math.hypot(t, n), o = Math.hypot(r, i), s = t / a + r / o, c = n / a + i / o, l = Math.hypot(s, c);
	return [s / l, c / l];
}
var Fe = [
	.25,
	.5,
	.75
], Ie = 4e3, Le = 2222, Re = 4e3;
function ze(e) {
	let t = 1 / e, n = t * t, r = n * t;
	return e <= Ie ? -266123900 * r - 234358.9 * n + 877.6956 * t + .17991 : -3025846900 * r + 2107037.9 * n + 222.6347 * t + .24039;
}
function Be(e, t) {
	let n = t * t, r = n * t;
	return e <= Le ? -1.1063814 * r - 1.3481102 * n + 2.18555832 * t - .20219683 : e <= Re ? -.9549476 * r - 1.37418593 * n + 2.09137015 * t - .16748867 : 3.081758 * r - 5.8733867 * n + 3.75112997 * t - .37001483;
}
function Ve(e) {
	let t = ze(e);
	return [t, Be(e, t)];
}
function He(e, t) {
	let n = -2 * e + 12 * t + 3;
	return [4 * e / n - o[0], 9 * t / n - o[1]];
}
var Ue = 500, We = 61, Ge = 450 / 60, Ke = [
	2500,
	3200,
	4e3,
	5500,
	6500,
	1e4
];
function qe() {
	let e = [];
	for (let t = 0; t < We; t++) {
		let [n, r] = Ve(1e6 / (Ue - t * Ge));
		e.push(He(n, r));
	}
	return {
		points: e,
		ticks: Ke.map((e) => {
			let [t, n] = Ve(e), [r, i] = He(t, n);
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
var M = 255, N = 100;
function Je(e, t, n, r, i) {
	if (i === null || n.width <= 0 || n.height <= 0 || i.w <= 0 || i.h <= 0) return null;
	let a = r / n.width, o = (e - n.left) * a, s = (t - n.top) * a, c = (o - i.x) / i.w, l = (s - i.y) / i.h;
	return c < 0 || c > 1 || l < 0 || l > 1 ? null : {
		x: c,
		y: l
	};
}
function Ye(e, t) {
	let { data: n, width: r, height: i } = e, a = Math.max(0, Math.min(r - 1, Math.floor(t.x * r))), o = (Math.max(0, Math.min(i - 1, Math.floor(t.y * i))) * r + a) * 4;
	return [
		n[o],
		n[o + 1],
		n[o + 2]
	];
}
function Xe(e, t, n) {
	let [r, i] = e.project(...t), a = Math.hypot(r, i) / n;
	return {
		x: r,
		y: i,
		text: e.readout(r, i, a)
	};
}
function Ze(e, t, n, r) {
	let [i, a] = ke(t, n, r), o = Math.hypot(i, a) / r.unit;
	return e.readout(i, a, o);
}
function Qe(e, t) {
	let [n, r, i] = t;
	return e === "luma" ? `Y ${Math.round(N * c(n, r, i))} %` : `R ${Math.round(N * n / M)}  G ${Math.round(N * r / M)}  B ${Math.round(N * i / M)} %`;
}
//#endregion
//#region src/runtime.ts
var P = null;
function $e(e) {
	P = e;
}
function F() {
	if (P === null) throw Error("[vectorscope] api() called before activate()");
	return P;
}
function I(e, t, ...n) {
	return F().react.createElement(e, t, ...n);
}
//#endregion
//#region src/store.ts
var et = null;
function tt() {
	et = F().stores.create((e, t) => ({
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
function L() {
	if (et === null) throw Error("[vectorscope] store() called before activate()");
	return et;
}
//#endregion
//#region src/HoverOverlay.ts
var R = 0;
function nt() {
	let { useEffect: e, useRef: t } = F().react, n = t(null), r = F().develop.useDevelopOverlay(), i = L()((e) => e.panels);
	return e(() => {
		let e = n.current, t = r.rect;
		if (e === null || t === null || i === 0) return;
		let a = R, o = null, s = () => {
			L().getState().setHoverUv(null);
		}, c = () => {
			a = R;
			let n = o;
			if (o = null, n === null) return;
			let r = e.getBoundingClientRect();
			L().getState().setHoverUv(Je(n.clientX, n.clientY, r, e.clientWidth, t));
		}, l = (e) => {
			o = e, a === R && (a = requestAnimationFrame(c));
		};
		return window.addEventListener("pointermove", l), document.addEventListener("pointerleave", s), window.addEventListener("blur", s), () => {
			window.removeEventListener("pointermove", l), document.removeEventListener("pointerleave", s), window.removeEventListener("blur", s), a !== R && cancelAnimationFrame(a), s();
		};
	}, [
		r.rect,
		r.nonce,
		i
	]), I("div", {
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
var rt = {
	low: 192,
	medium: 320,
	high: 512
}, it = [
	"vector",
	"wave",
	"parade"
], at = ["luma", "rgb"], z = ["linear", "log"], B = [
	1,
	2,
	4
], ot = [
	"low",
	"medium",
	"high"
], V = {
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
}, st = [
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
], ct = .25, lt = 4;
function ut(e, t, n) {
	return Math.min(n, Math.max(t, e));
}
function H(e, t, n) {
	return t.includes(e) ? e : n;
}
function dt(e, t) {
	return typeof e == "boolean" ? e : t;
}
function ft(e, t) {
	return typeof e != "number" || !Number.isFinite(e) ? t : ut(e, ct, lt);
}
function pt(e, t) {
	switch (e) {
		case "scope": return H(t, it, V.scope);
		case "model": return H(t, E, V.model);
		case "trace": return H(t, at, V.trace);
		case "scale": return H(t, z, V.scale);
		case "zoom": return H(t, B, V.zoom);
		case "range": return H(t, l, V.range);
		case "sampleSize": return H(t, ot, V.sampleSize);
		case "intensity": return ft(t, V.intensity);
		default: return dt(t, V[e]);
	}
}
function mt(e, t, n) {
	e[t] = n;
}
function ht(e) {
	let t = { ...V };
	for (let n of st) mt(t, n, pt(n, e(n, V[n])));
	return t;
}
var gt = [
	{
		key: "sampleSize",
		label: "Sample resolution",
		hint: "Long edge of the frame the scopes sample after each render.",
		type: "select",
		default: V.sampleSize,
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
		default: V.intensity,
		min: ct,
		max: lt,
		step: .25
	},
	{
		key: "showRing",
		label: "Hue ring",
		hint: "The hue circle at the rim, coloured from the gamut outline.",
		type: "boolean",
		default: V.showRing
	},
	{
		key: "showTargets",
		label: "Colour-bar targets",
		hint: "75 % and 100 % boxes for R, Mg, B, Cy, G, Yl.",
		type: "boolean",
		default: V.showTargets
	},
	{
		key: "showSkin",
		label: "Skin-tone line",
		hint: "The mean direction of the ColorChecker skin patches.",
		type: "boolean",
		default: V.showSkin
	},
	{
		key: "showGamut",
		label: "Gamut outline",
		hint: "The reach of sRGB in the current model.",
		type: "boolean",
		default: V.showGamut
	},
	{
		key: "showGrid",
		label: "Grid",
		hint: "Axes and rings at 25, 50 and 75 % of the gamut reach.",
		type: "boolean",
		default: V.showGrid
	},
	{
		key: "showLocus",
		label: "Planckian locus",
		hint: "Blackbody colours from 2000 to 20000 K, in CIE u′v′ only.",
		type: "boolean",
		default: V.showLocus
	},
	{
		key: "showLevels",
		label: "Level lines",
		hint: "0 to 100 % lines on the waveform and parade.",
		type: "boolean",
		default: V.showLevels
	}
];
function U() {
	return ht(F().settings.get);
}
function W(e, t) {
	F().settings.set(e, t);
}
function _t() {
	for (let e of st) W(e, V[e]);
}
function G(e) {
	return e.scope === "parade" ? "rgb" : e.trace;
}
function vt() {
	let { useState: e, useEffect: t } = F().react, [n, r] = e(U);
	return t(() => F().settings.onChange(() => r(U())), []), n;
}
var K = null;
function yt(e, t) {
	if (e.width < 2 || e.height < 2) return null;
	let n = Math.min(1, t / Math.max(e.width, e.height)), r = Math.max(1, Math.round(e.width * n)), i = Math.max(1, Math.round(e.height * n));
	K === null ? K = new OffscreenCanvas(r, i) : (K.width !== r || K.height !== i) && (K.width = r, K.height = i);
	let a = K.getContext("2d", { willReadFrequently: !0 });
	if (a === null) return null;
	a.clearRect(0, 0, r, i), a.drawImage(e, 0, 0, r, i);
	let { data: o } = a.getImageData(0, 0, r, i);
	return {
		data: o,
		width: r,
		height: i
	};
}
function bt(e) {
	let { develop: t, capture: n, readback: r, publish: i } = e, a = e.throttleMs ?? 150, o = !1, s = !1, c = !1, l = null, u = -Infinity, d = 0;
	function f() {
		l = null;
		let { photoId: e, params: a, previewParams: f } = t.getState();
		if (o || e === null) return;
		s = !0, u = Date.now();
		let m = d;
		n(f ?? a).then((e) => {
			let t = !o && m === d, n;
			try {
				n = t ? r(e) : null;
			} catch {
				e.close?.(), t && i(null);
				return;
			}
			e.close?.(), t && i(n);
		}, () => {
			!o && m === d && i(null);
		}).finally(() => {
			s = !1, c && !o && (c = !1, p());
		});
	}
	function p() {
		if (!o) {
			if (s) {
				c = !0;
				return;
			}
			l === null && (l = setTimeout(f, Math.max(0, a - (Date.now() - u))));
		}
	}
	let m = t.subscribe((e, t) => {
		if (e.photoId !== t.photoId && d++, e.photoId === null) {
			c = !1, l !== null && (clearTimeout(l), l = null), i(null);
			return;
		}
		(e.histogram !== t.histogram || e.photoId !== t.photoId) && p();
	});
	return p(), () => {
		o = !0, m(), l !== null && (clearTimeout(l), l = null);
	};
}
function xt(e) {
	let t = 0, n = null;
	return () => {
		t++, t === 1 && (n = e());
		let r = !1;
		return () => {
			r || (r = !0, t--, t === 0 && (n?.(), n = null));
		};
	};
}
function St() {
	return bt({
		develop: F().stores.useDevelopStore,
		capture: (e) => F().develop.captureFrame(e),
		readback: (e) => yt(e, rt[U().sampleSize]),
		publish: (e) => L().getState().setSample(e)
	});
}
var Ct = xt(St), wt = 128, Tt = 384;
function Et(e, t) {
	return Math.min(t, Math.min(Tt, Math.max(wt, Math.round(Math.sqrt(e)))));
}
function Dt(e, t, n) {
	return Math.min(n, Math.max(t, e));
}
function Ot(e, t, n) {
	return t * n + e;
}
function kt(e, t, n, r, i) {
	let { data: a, width: o, height: s } = e, l = o * s, u = new Uint32Array(i * i), d = i / 2, p = d - .5;
	for (let e = 0; e < l; e++) {
		let o = e * 4, s = a[o], l = a[o + 1], m = a[o + 2];
		if (r !== "all" && !f(c(s, l, m), r)) continue;
		let [h, g] = t.project(s, l, m), _ = k(h, g, n);
		if (_ === null) continue;
		let [v, y] = _;
		if (!Number.isFinite(v) || !Number.isFinite(y)) continue;
		let b = Dt(Math.round(d + v * p), 0, i - 1), x = Dt(Math.round(d - y * p), 0, i - 1);
		u[Ot(b, x, i)]++;
	}
	return {
		size: i,
		counts: u,
		total: l
	};
}
var At = 8;
function jt(e, t, n, r) {
	return 1 - Math.exp(-e * r * t / (At * n));
}
function Mt(e, t, n) {
	return [
		e[0] + (t[0] - e[0]) * n,
		e[1] + (t[1] - e[1]) * n,
		e[2] + (t[2] - e[2]) * n
	];
}
var Nt = 360, Pt = .5, Ft = .4;
function It(e, t, n, r) {
	let { size: i, counts: a, total: o } = e, s = i * i, c = new Uint8ClampedArray(s * 4), l = i / 2, u = l - .5;
	for (let e = 0; e < i; e++) for (let d = 0; d < i; d++) {
		let f = a[Ot(d, e, i)];
		if (f === 0) continue;
		let p = jt(f, s, o, r), m = Ot(d, e, i) * 4;
		if (c[m + 3] = Math.round(255 * p), t === null) {
			c[m] = n.ink[0], c[m + 1] = n.ink[1], c[m + 2] = n.ink[2];
			continue;
		}
		let h = d - l, g = l - e, _ = Math.hypot(h, g) / u, v = Math.round(b(h, g)) % Nt, y = [
			t[v * 3],
			t[v * 3 + 1],
			t[v * 3 + 2]
		], x = Mt(Mt(n.neutral, y, Math.min(1, _ / Pt)), n.lift, Ft * p);
		c[m] = Math.round(x[0]), c[m + 1] = Math.round(x[1]), c[m + 2] = Math.round(x[2]);
	}
	return c;
}
function Lt(e) {
	let t = e / 2;
	return {
		cx: t,
		cy: t,
		r: t - 10
	};
}
function Rt(e) {
	return {
		unit: ve(T[e.model]).unit,
		scale: e.scale,
		zoom: e.zoom
	};
}
var q = Math.PI * 2, J = 360, zt = 1, Bt = .18, Vt = .45, Ht = .6, Ut = .85, Wt = .5, Gt = 5, Kt = 4, qt = 9, Jt = 8, Yt = [4, 3], Xt = 3, Zt = 72, Qt = 3, $t = 5, en = 1.5, tn = 10, nn = 6;
function rn(e) {
	return `rgb(${e[0]}, ${e[1]}, ${e[2]})`;
}
function Y(e, t, n) {
	e.globalAlpha = n, e.strokeStyle = t, e.lineWidth = zt;
}
function X(e, t, n) {
	return [e.cx + t * e.r, e.cy - n * e.r];
}
function an(e, t, n, r) {
	e.save(), Y(e, r, Bt), e.beginPath(), e.moveTo(t.cx - t.r, t.cy), e.lineTo(t.cx + t.r, t.cy), e.moveTo(t.cx, t.cy - t.r), e.lineTo(t.cx, t.cy + t.r);
	for (let r of Fe) {
		let i = Ee(r, n.scale) * n.zoom;
		i > 1 || (e.moveTo(t.cx + i * t.r, t.cy), e.arc(t.cx, t.cy, i * t.r, 0, q));
	}
	e.stroke(), e.restore();
}
function on(e, t, n, r, i) {
	e.save(), Y(e, i, Vt), e.beginPath();
	let a = !1, o = n.points.length / 2;
	for (let i = 0; i < o; i++) {
		let o = n.points[i * 2], s = n.points[i * 2 + 1], c = Math.hypot(o, s);
		if (c === 0) continue;
		let l = Math.min(1, Ee(c / r.unit, r.scale) * r.zoom), [u, d] = X(t, o / c * l, s / c * l);
		a ? e.lineTo(u, d) : (e.moveTo(u, d), a = !0);
	}
	e.closePath(), e.stroke(), e.restore();
}
function sn(e, t, n, r, i, a) {
	e.save(), Y(e, i, 1), e.fillStyle = i, e.font = `${qt}px ${a}`, e.textAlign = "center", e.textBaseline = "middle";
	for (let i of Ne(n)) {
		let n = k(i.x, i.y, r);
		if (n === null) continue;
		let [a, o] = X(t, n[0], n[1]), s = i.level === 1 ? Gt : Kt;
		if (e.strokeRect(a - s / 2, o - s / 2, s, s), i.level === 1) continue;
		let c = a - t.cx, l = o - t.cy, u = Math.hypot(c, l);
		if (u === 0) continue;
		let d = Jt / u;
		e.fillText(i.label, a + c * d, o + l * d);
	}
	e.restore();
}
function cn(e, t, n, r) {
	let [i, a] = Pe(n), [o, s] = X(t, i, a);
	e.save(), Y(e, r, Ht), e.setLineDash(Yt), e.beginPath(), e.moveTo(t.cx, t.cy), e.lineTo(o, s), e.stroke(), e.restore();
}
var ln = null;
function un() {
	return ln === null && (ln = qe()), ln;
}
function dn(e, t, n) {
	if (e.length < 2) return null;
	let r = 0, i = Infinity;
	for (let a = 0; a < e.length; a++) {
		let o = Math.hypot(e[a][0] - t, e[a][1] - n);
		o < i && (i = o, r = a);
	}
	let a = e[Math.max(0, r - 1)], o = e[Math.min(e.length - 1, r + 1)], s = o[0] - a[0], c = o[1] - a[1], l = Math.hypot(s, c);
	return l === 0 ? null : [-c / l, s / l];
}
function fn(e, t, n, r) {
	e.save(), Y(e, r, Ht);
	let i = [];
	e.beginPath();
	let a = !1;
	for (let [r, o] of un().points) {
		let s = k(r, o, n);
		if (s === null) {
			a = !1;
			continue;
		}
		let c = X(t, s[0], s[1]);
		i.push(c), a ? e.lineTo(c[0], c[1]) : (e.moveTo(c[0], c[1]), a = !0);
	}
	e.stroke();
	let o = Xt / 2;
	e.beginPath();
	for (let r of un().ticks) {
		let a = k(r.x, r.y, n);
		if (a === null) continue;
		let [s, c] = X(t, a[0], a[1]), l = dn(i, s, c);
		l !== null && (e.moveTo(s - l[0] * o, c - l[1] * o), e.lineTo(s + l[0] * o, c + l[1] * o));
	}
	e.stroke(), e.restore();
}
function pn(e, t, n) {
	e.save(), e.globalCompositeOperation = "source-over", e.imageSmoothingEnabled = !0, e.drawImage(n, t.cx - t.r, t.cy - t.r, t.r * 2, t.r * 2), e.restore();
}
function mn(e, t) {
	let n = t % J * 3;
	return `rgb(${e[n]}, ${e[n + 1]}, ${e[n + 2]})`;
}
function hn(e, t, n) {
	let r = e.createConicGradient(0, t.cx, t.cy);
	for (let e = 0; e <= Zt; e++) {
		let t = e / Zt, i = (J - t * J) % J;
		r.addColorStop(t, mn(n, Math.round(i)));
	}
	e.save(), e.globalAlpha = Ut, e.strokeStyle = r, e.lineWidth = Qt, e.beginPath(), e.arc(t.cx, t.cy, t.r, 0, q), e.stroke(), e.restore();
}
function gn(e, t, n, r, i) {
	e.save(), e.globalAlpha = Wt, e.strokeStyle = rn(r.lift), e.lineWidth = 3.5, e.beginPath(), e.arc(t, n, $t, 0, q), e.stroke(), e.globalAlpha = 1, e.strokeStyle = i, e.lineWidth = en, e.beginPath(), e.arc(t, n, $t, 0, q), e.stroke(), e.restore();
}
function _n(e, t, n, r, i) {
	e.save(), e.globalAlpha = r, e.fillStyle = i, e.font = `${tn}px ${t.mono}`, e.textAlign = "left", e.textBaseline = "alphabetic", e.fillText(n, nn, t.width - nn), e.restore();
}
function vn(e, t, n, r, i, a) {
	let { sample: o, hoverUv: s, cursor: c } = t;
	if (o !== null && s !== null) {
		let c = Xe(r, Ye(o, s), i.unit), l = k(c.x, c.y, i);
		if (l !== null) {
			let [r, i] = X(n, l[0], l[1]);
			gn(e, r, i, t.palette, a);
		}
		_n(e, t, c.text, 1, a);
		return;
	}
	if (c !== null && Math.hypot(c[0], c[1]) <= 1) {
		_n(e, t, Ze(r, c[0], c[1], i), 1, a);
		return;
	}
	_n(e, t, r.label, Ht, a);
}
function yn(e, t) {
	let { prefs: n } = t, r = Lt(t.width);
	if (r.r <= 0) return;
	let i = T[n.model], a = ve(i), o = Rt(n), s = rn(t.palette.ink);
	n.showGrid && an(e, r, o, s), n.showGamut && on(e, r, a, o, s), n.showTargets && sn(e, r, i, o, s, t.mono), n.showSkin && cn(e, r, i, s), n.showLocus && i.id === "uv" && fn(e, r, o, s), t.density !== null && pn(e, r, t.density), n.showRing && hn(e, r, t.hues), vn(e, t, r, i, o, s);
}
//#endregion
//#region src/waveform.ts
var bn = [
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
], xn = [
	0,
	.25,
	.5,
	.75,
	1
], Sn = 256;
function Cn(e, t, n) {
	return {
		width: Math.min(e.width, t),
		height: Math.min(Sn, n)
	};
}
function Z(e, t, n, r, i) {
	return (e * r + t) * i + n;
}
var wn = 255;
function Tn(e, t, n, r, i) {
	let { data: a, width: o, height: s } = e, l = o * s, u = t === "luma" ? 1 : 3, d = new Uint32Array(u * i * r), f = t === "luma" && n ? new Float32Array(3 * i * r) : null;
	for (let e = 0; e < l; e++) {
		let n = e * 4, s = a[n], l = a[n + 1], u = a[n + 2], p = e % o, m = Math.min(r - 1, Math.floor(p * r / o));
		if (t === "luma") {
			let e = c(s, l, u) * wn, t = Math.round(e / wn * (i - 1));
			d[Z(0, t, m, i, r)]++, f !== null && (f[Z(0, t, m, i, r)] += s, f[Z(1, t, m, i, r)] += l, f[Z(2, t, m, i, r)] += u);
		} else {
			let e = [
				s,
				l,
				u
			];
			for (let t = 0; t < 3; t++) {
				let n = Math.round(e[t] / wn * (i - 1));
				d[Z(t, n, m, i, r)]++;
			}
		}
	}
	return {
		width: r,
		height: i,
		channels: u,
		counts: d,
		sums: f,
		total: l
	};
}
var En = 4;
function Dn(e, t, n = En) {
	let r = Math.floor((e - n * (t - 1)) / t), i = [];
	for (let e = 0; e < t; e++) i.push({
		x0: e * (r + n),
		width: r
	});
	return i;
}
var On = .4;
function kn(e, t, n, r) {
	let { width: i, height: a, channels: o, counts: s, sums: c, total: l } = e, u = i * a, d = [];
	for (let e = 0; e < o; e++) {
		let f = new Uint8ClampedArray(u * 4);
		for (let d = 0; d < a; d++) for (let p = 0; p < i; p++) {
			let m = s[Z(e, d, p, a, i)];
			if (m === 0) continue;
			let h = jt(m, u, l, n), g = ((a - 1 - d) * i + p) * 4;
			f[g + 3] = Math.round(255 * h);
			let _;
			_ = o === 3 ? bn[e] : r && c !== null ? Mt([
				c[Z(0, d, p, a, i)] / m,
				c[Z(1, d, p, a, i)] / m,
				c[Z(2, d, p, a, i)] / m
			], t.lift, On * h) : t.ink, f[g] = Math.round(_[0]), f[g + 1] = Math.round(_[1]), f[g + 2] = Math.round(_[2]);
		}
		d.push(f);
	}
	return d;
}
var An = 4, jn = 3;
function Mn(e, t, n) {
	let r = e - 22 - An;
	return {
		x0: 22,
		y0: An,
		width: r,
		height: t - 8,
		lanes: Dn(r, n === "parade" ? jn : 1)
	};
}
var Nn = 255, Pn = 100, Fn = 1, In = .18, Ln = .6, Rn = .6, zn = 8, Bn = 3, Vn = Math.PI * 2, Hn = 10, Un = 6;
function Wn(e) {
	return `rgb(${e[0]}, ${e[1]}, ${e[2]})`;
}
function Gn(e, t) {
	return e.y0 + (1 - t) * e.height;
}
function Q(e, t, n) {
	return e.x0 + t.x0 + n * t.width;
}
function Kn(e, t, n, r) {
	e.save(), e.strokeStyle = n, e.lineWidth = Fn, e.globalAlpha = In, e.beginPath();
	for (let n of xn) {
		let r = Gn(t, n);
		e.moveTo(t.x0, r), e.lineTo(t.x0 + t.width, r);
	}
	e.stroke(), e.globalAlpha = Ln, e.fillStyle = n, e.font = `${zn}px ${r}`, e.textAlign = "right", e.textBaseline = "middle";
	for (let n of xn) e.fillText(String(Math.round(Pn * n)), 18, Gn(t, n));
	e.restore();
}
function qn(e, t, n) {
	return e.lanes[t === "parade" ? n : 0];
}
function Jn(e, t, n) {
	e.save(), e.imageSmoothingEnabled = !0, e.globalCompositeOperation = n.layers.length > 1 && n.dark ? "lighter" : "source-over";
	for (let r = 0; r < n.layers.length; r++) {
		let i = qn(t, n.prefs.scope, r);
		e.drawImage(n.layers[r], Q(t, i, 0), t.y0, i.width, t.height);
	}
	e.restore();
}
function Yn(e, t, n, r) {
	return G(t) === "luma" ? [{
		lane: qn(e, t.scope, 0),
		level: c(n[0], n[1], n[2]),
		colour: r
	}] : bn.map((r, i) => ({
		lane: qn(e, t.scope, i),
		level: n[i] / Nn,
		colour: Wn(r)
	}));
}
function Xn(e, t, n, r) {
	let { sample: i, hoverUv: a } = n;
	if (i === null || a === null) return;
	let o = Ye(i, a);
	e.save(), e.globalAlpha = Rn, e.strokeStyle = r, e.lineWidth = Fn, e.beginPath();
	for (let n of t.lanes) {
		let r = Q(t, n, a.x);
		e.moveTo(r, t.y0), e.lineTo(r, t.y0 + t.height);
	}
	e.stroke(), e.globalAlpha = 1;
	for (let i of Yn(t, n.prefs, o, r)) e.fillStyle = i.colour, e.beginPath(), e.arc(Q(t, i.lane, a.x), Gn(t, i.level), Bn / 2, 0, Vn), e.fill();
	e.fillStyle = r, e.font = `${Hn}px ${n.mono}`, e.textAlign = "left", e.textBaseline = "alphabetic", e.fillText(Qe(G(n.prefs), o), Un, n.height - Un), e.restore();
}
function Zn(e, t) {
	let n = Mn(t.width, t.height, t.prefs.scope);
	if (n.width <= 0 || n.height <= 0) return;
	let r = Wn(t.palette.ink);
	t.prefs.showLevels && Kn(e, n, r, t.mono), Jn(e, n, t), Xn(e, n, t, r);
}
//#endregion
//#region src/ScopeView.ts
var Qn = .55, $n = 96;
function er(e) {
	return Math.max($n, Math.round(Qn * e));
}
var tr = {
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
}, nr = {
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
}, rr = 128;
function ir(e, t, n) {
	return (e + t + n) / 3 < rr ? tr : nr;
}
var ar = /rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/;
function or(e) {
	let t = ar.exec(getComputedStyle(e).backgroundColor);
	return t === null ? tr : ir(Number(t[1]), Number(t[2]), Number(t[3]));
}
var sr = "ui-monospace, monospace";
function cr() {
	return getComputedStyle(document.documentElement).getPropertyValue("--font-mono").trim() || sr;
}
var lr = /* @__PURE__ */ new Map();
function ur(e) {
	let t = lr.get(e.id);
	if (t !== void 0) return t;
	let n = Ce(ve(e));
	return lr.set(e.id, n), n;
}
function dr(e, t) {
	return e.current.sample !== t && (e.current = {
		sample: t,
		id: e.current.id + 1
	}), e.current.id;
}
function fr(e, t, n, r) {
	return [
		e,
		t.scope,
		t.model,
		G(t),
		t.scale,
		t.zoom,
		t.range,
		t.colorize,
		t.intensity,
		n,
		r
	].join("|");
}
function pr(e, t, n) {
	let r = e.current;
	if (r !== null && r.key === t) return r.layers;
	let i = n();
	return e.current = {
		key: t,
		layers: i
	}, i;
}
function mr(e, t, n) {
	let r = document.createElement("canvas");
	r.width = t, r.height = n;
	let i = r.getContext("2d");
	if (i !== null) {
		let r = i.createImageData(t, n);
		r.data.set(e), i.putImageData(r, 0, 0);
	}
	return r;
}
function hr(e, t, n, r, i) {
	return [mr(It(kt(e, T[t.model], Rt(t), t.range, i), t.colorize ? r : null, n, t.intensity), i, i)];
}
function gr(e, t, n, r, i) {
	return kn(Tn(e, G(t), t.colorize, r, i), n, t.intensity, t.colorize).map((e) => mr(e, r, i));
}
var _r = 240, vr = 4, yr = "Hover the image to place its pixel on the scope";
function br({ prefs: e }) {
	let { useEffect: t, useRef: n, useState: r } = F().react, i = n(null), a = n(null), o = n(null), s = n({
		sample: null,
		id: 0
	}), [c, l] = r(_r), [u, d] = r(0), [f, p] = r(null), m = L()((e) => e.sample), h = L()((e) => e.hoverUv), g = e.scope === "vector" ? c : er(c);
	t(() => {
		let e = i.current;
		if (e === null) return;
		let t = new ResizeObserver((e) => {
			let t = Math.round(e[0].contentRect.width);
			t > 0 && l(t);
		});
		return t.observe(e), () => t.disconnect();
	}, []), t(() => F().stores.useThemeStore.subscribe((e, t) => {
		e.activeId !== t.activeId && d((e) => e + 1);
	}), []), t(() => {
		let t = a.current;
		if (t === null) return;
		let n = t.getContext("2d");
		if (n === null) return;
		let r = window.devicePixelRatio || 1, i = Math.round(c * r), l = Math.round(g * r);
		t.width !== i && (t.width = i), t.height !== l && (t.height = l), n.setTransform(r, 0, 0, r, 0, 0), n.clearRect(0, 0, c, g);
		let { palette: u, dark: d } = or(t), p = cr(), _ = dr(s, m);
		if (e.scope === "vector") {
			let t = Lt(c), i = ur(T[e.model]), a = m === null ? 0 : Et(m.width * m.height, Math.round(t.r * 2 * r)), s = m !== null && a > 0 ? pr(o, fr(_, e, String(a), d), () => hr(m, e, u, i, a))[0] : null;
			yn(n, {
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
		let v = Mn(c, g, e.scope), y = Math.round(v.lanes[0].width * r), b = Math.round(v.height * r), x = m === null ? null : Cn(m, y, b), ee = m !== null && x !== null && x.width > 0 && x.height > 0 ? pr(o, fr(_, e, `${x.width}x${x.height}`, d), () => gr(m, e, u, x.width, x.height)) : [];
		Zn(n, {
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
		let n = t.currentTarget, r = Lt(c);
		if (e.scope !== "vector" || r.r <= 0) {
			p(null);
			return;
		}
		let i = n.getBoundingClientRect();
		if (i.width <= 0) return;
		let a = n.clientWidth / i.width, o = (t.clientX - i.left) * a, s = (t.clientY - i.top) * a;
		p([(o - r.cx) / r.r, (r.cy - s) / r.r]);
	}
	return I("div", {
		ref: i,
		style: { width: "100%" }
	}, I("canvas", {
		ref: a,
		title: yr,
		onPointerMove: _,
		onPointerLeave: () => p(null),
		style: {
			width: c,
			height: g,
			display: "block",
			borderRadius: vr,
			background: "var(--color-surface-0)",
			touchAction: "none"
		}
	}));
}
//#endregion
//#region src/Panel.ts
var xr = 6, Sr = {
	vector: "Vectorscope",
	wave: "Waveform",
	parade: "Parade"
}, Cr = {
	luma: "Luma",
	rgb: "RGB"
}, wr = {
	linear: "Lin",
	log: "Log"
}, Tr = {
	linear: "Linear chroma",
	log: "Logarithmic chroma, expands the neutral core"
}, Er = {
	1: "1×",
	2: "2×",
	4: "4×"
}, Dr = {
	all: "All",
	shadows: "Shadows",
	mids: "Mids",
	highlights: "Highlights"
}, Or = "Isolate a tonal range, as the Color Grading wheels split it", kr = "Colour the trace by hue";
function $(e, t, n) {
	let r = t.find((t) => t === e);
	r !== void 0 && n(r);
}
function Ar(e) {
	let t = Number(e), n = B.find((e) => e === t);
	n !== void 0 && W("zoom", n);
}
function jr(e) {
	let { SegmentedControl: t } = F().ui;
	return I(t, {
		size: "sm",
		value: e.scope,
		options: it.map((e) => ({
			value: e,
			label: Sr[e]
		})),
		onChange: (e) => $(e, it, (e) => W("scope", e))
	});
}
function Mr(e) {
	let { Select: t } = F().ui;
	return I(t, {
		value: e.model,
		ariaLabel: "Colour model",
		options: E.map((e) => ({
			value: e,
			label: T[e].label
		})),
		onChange: (e) => $(e, E, (e) => W("model", e))
	});
}
function Nr(e) {
	let { Select: t } = F().ui;
	return I(t, {
		value: e.trace,
		ariaLabel: "Trace",
		options: at.map((e) => ({
			value: e,
			label: Cr[e]
		})),
		onChange: (e) => $(e, at, (e) => W("trace", e))
	});
}
function Pr(e) {
	return e.scope === "vector" ? Mr(e) : e.scope === "wave" ? Nr(e) : null;
}
function Fr(e) {
	let { Button: t, Row: n } = F().ui, r = Pr(e);
	return I(n, { gap: xr }, r === null ? null : I("div", { style: {
		flex: "1 1 auto",
		minWidth: 0
	} }, r), I(t, {
		size: "sm",
		active: e.colorize,
		disabled: e.scope !== "vector" && G(e) === "rgb",
		title: kr,
		onClick: () => W("colorize", !e.colorize)
	}, "Colorize"));
}
function Ir(e) {
	let { Row: t, SegmentedControl: n } = F().ui;
	return I(t, { gap: xr }, I(n, {
		size: "sm",
		value: e.scale,
		options: z.map((e) => ({
			value: e,
			label: wr[e],
			title: Tr[e]
		})),
		onChange: (e) => $(e, z, (e) => W("scale", e))
	}), I(n, {
		size: "sm",
		value: String(e.zoom),
		options: B.map((e) => ({
			value: String(e),
			label: Er[e]
		})),
		onChange: Ar
	}));
}
function Lr(e) {
	let { SegmentedControl: t } = F().ui;
	return I(t, {
		size: "sm",
		value: e.range,
		options: l.map((e) => ({
			value: e,
			label: Dr[e],
			title: Or
		})),
		onChange: (e) => $(e, l, (e) => W("range", e))
	});
}
function Rr() {
	let { useEffect: e } = F().react, t = vt(), { Stack: n } = F().ui;
	e(() => {
		let e = Ct();
		return L().getState().retainPanel(), () => {
			e(), L().getState().releasePanel();
		};
	}, []);
	let r = t.scope === "vector";
	return I(n, {
		gap: xr,
		style: {
			padding: "6px 8px 8px",
			userSelect: "text"
		}
	}, jr(t), I(br, { prefs: t }), Fr(t), r ? Ir(t) : null, r ? Lr(t) : null);
}
//#endregion
//#region src/index.ts
var zr = "vectorscope.panel", Br = "vectorscope.hover", Vr = 1.5, Hr = 268, Ur = 40;
function Wr(e) {
	$e(e), tt(), e.registerPanel({
		id: zr,
		title: "Scopes",
		component: Rr,
		defaultDock: {
			module: "develop",
			direction: "right",
			order: Vr,
			width: Hr
		},
		onReset: _t
	}), e.registerSlot({
		id: Br,
		slot: "develop-canvas-overlay",
		component: nt,
		order: Ur
	}), e.registerSettings({
		title: "Scopes",
		keywords: [
			"vectorscope",
			"waveform",
			"parade",
			"skin tone",
			"gamut"
		],
		fields: [...gt]
	});
}
function Gr() {
	try {
		let e = L().getState();
		e.setSample(null), e.setHoverUv(null), F().unregisterSlot(Br);
	} catch {}
}
//#endregion
export { Br as HOVER_ID, zr as PANEL_ID, Wr as activate, Gr as deactivate };

//# sourceMappingURL=index.js.map