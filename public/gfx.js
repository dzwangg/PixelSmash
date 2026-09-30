// Pixel-art pipeline: characters are drawn with canvas paths into a small buffer,
// snapped to hard pixels + outlined, then blown up with nearest-neighbour.
const PX = 3;               // world units per art pixel
const SPR = 80, FOOT = 66;  // sprite buffer size and the feet row inside it (in art pixels)
// Graphics quality: 'fast' (default, lowest latency) or 'high'. Toggle with Q on the game screen.
const QUALITY = (() => { try { return localStorage.getItem('quality') || 'fast'; } catch { return 'fast'; } })();
const RES = QUALITY === 'high' ? 4 : 2; // sprite buffer pixels per art unit
const D2R = Math.PI / 180;
const FONT = "'Press Start 2P', monospace";

function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

// ---------- colour ----------
function rgb(hex) { const n = parseInt(hex.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
function shade(hex, amt) { // amt -100..100, negative darkens
  const t = amt < 0 ? 0 : 255, p = Math.abs(amt) / 100;
  return '#' + rgb(hex).map(v => Math.round(v + (t - v) * p).toString(16).padStart(2, '0')).join('');
}

// ---------- path helpers (art-pixel space) ----------
function limb(g, a, b, w, c) { g.strokeStyle = c; g.lineWidth = w; g.lineCap = 'round'; g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke(); }
function oval(g, x, y, rx, ry, c, rot = 0) { g.fillStyle = c; g.beginPath(); g.ellipse(x, y, Math.max(rx, .1), Math.max(ry, .1), rot, 0, Math.PI * 2); g.fill(); }
function poly(g, pts, c) { g.fillStyle = c; g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); g.fill(); }
function box(g, x, y, w, h, c) { g.fillStyle = c; g.fillRect(x, y, w, h); }
function arcS(g, x, y, r, a0, a1, w, c) { g.strokeStyle = c; g.lineWidth = w; g.lineCap = 'round'; g.beginPath(); g.arc(x, y, r, a0, a1); g.stroke(); }

// ---------- skeleton ----------
// angles in degrees: 0 = pointing down, 90 = forward (facing dir), 180 = up, -90 = back
const dirv = (a, l) => ({ x: Math.sin(a * D2R) * l, y: Math.cos(a * D2R) * l });
const add = (p, v) => ({ x: p.x + v.x, y: p.y + v.y });

function joints(b, p) {
  const hip = { x: p.x || 0, y: -(b.thigh + b.shin) + (p.y || 0) };
  const up = dirv(180 - p.tl, 1);
  const neck = add(hip, { x: up.x * b.torso, y: up.y * b.torso });
  const head = add(neck, { x: up.x * b.head * .85, y: up.y * b.head * .85 });
  const sh = add(neck, { x: -up.x * b.head * .2, y: -up.y * b.head * .2 + 1 });
  const arm = ([s, e], ext = 0) => { const el = add(sh, dirv(s, b.upper)); return { sh, el, h: add(el, dirv(s + e, b.fore * (1 + ext))), ang: s + e }; };
  const leg = ([h, k]) => { const kn = add(hip, dirv(h, b.thigh)); return { hip, kn, f: add(kn, dirv(h - k, b.shin)) }; };
  return { hip, neck, head, up, A1: arm(p.a1, p.ext), A2: arm(p.a2, p.ext2), L1: leg(p.l1), L2: leg(p.l2), p };
}

const BASE_POSE = { tl: 4, y: 0, x: 0, a1: [25, 35], a2: [-20, 30], l1: [12, 10], l2: [-12, 6], rot: 0, wep: 0, ext: 0, ext2: 0 };
const POSES = {
  idle: {},
  crouch:  { tl: 25, y: 5, a1: [50, 60], a2: [10, 60], l1: [75, 125], l2: [-10, 110] },
  jump:    { tl: 0, a1: [140, 20], a2: [-50, 40], l1: [50, 80], l2: [-10, 30] },
  fall:    { tl: -4, a1: [120, 30], a2: [100, 40], l1: [25, 35], l2: [-15, 25] },
  djump:   { tl: 20, a1: [100, 60], a2: [60, 60], l1: [80, 120], l2: [40, 110] },
  hurt:    { tl: -25, a1: [160, 10], a2: [-160, 10], l1: [35, 30], l2: [-25, 10] },
  shield:  { tl: 12, y: 2, a1: [70, 80], a2: [50, 90], l1: [30, 45], l2: [-25, 30] },
  ledge:   { tl: 0, a1: [175, 0], a2: [170, 0], l1: [8, 15], l2: [-6, 5] },
  hold:    { tl: 8, a1: [85, 10], a2: [80, 20] },
  held:    { tl: -10, a1: [130, 40], a2: [140, 30], l1: [20, 30], l2: [-20, 20] },
  dizzy:   { tl: -8, a1: [30, 90], a2: [-30, 90], l1: [10, 5], l2: [-10, 5] },
  helpless:{ tl: 10, a1: [150, 40], a2: [160, 40], l1: [15, 40], l2: [-20, 40] },
  jabW:    { tl: 6, a1: [40, 110], a2: [30, 70] },
  jab:     { tl: 14, a1: [92, 0], a2: [-30, 70], l1: [25, 10], l2: [-20, 5] },
  ftiltW:  { tl: -5, a1: [150, 30], a2: [-30, 40], l1: [10, 70] },
  ftilt:   { tl: 10, a1: [75, 5], a2: [-50, 40], l1: [45, 20], l2: [-25, 5] },
  kickW:   { tl: -5, a1: [20, 60], l1: [10, 70] },
  kick:    { tl: -12, a1: [60, 20], a2: [-50, 40], l1: [88, 0], l2: [-8, 5] },
  fsmashW: { tl: -22, a1: [-110, 40], a2: [-80, 40], l1: [25, 20], l2: [-35, 10], wep: -20 },
  fsmash:  { tl: 28, a1: [95, 0], a2: [80, 0], l1: [48, 20], l2: [-45, 5] },
  utiltW:  { tl: 0, a1: [40, 60] },
  utilt:   { tl: -8, a1: [178, 0], a2: [-30, 40] },
  usmashW: { tl: 15, y: 4, a1: [20, 40], a2: [10, 40], l1: [60, 100], l2: [-10, 90] },
  usmash:  { tl: -5, a1: [180, 0], a2: [175, 0], l1: [5, 0], l2: [-10, 0] },
  dtiltW:  { tl: 20, y: 5, a1: [50, 60], l1: [60, 110], l2: [-10, 110] },
  dtilt:   { tl: 30, y: 6, a1: [60, 30], a2: [10, 60], l1: [92, 0], l2: [-15, 120] },
  dsmashW: { tl: 10, y: 3, a1: [0, 90], a2: [-10, 90], l1: [40, 90], l2: [-40, 90] },
  dsmash:  { tl: 0, y: 7, a1: [100, 0], a2: [-100, 0], l1: [90, 0], l2: [-90, 0] },
  nair:    { tl: 0, a1: [100, 0], a2: [-100, 0], l1: [70, 0], l2: [-70, 0] },
  fairW:   { tl: -10, a1: [170, 20], a2: [-60, 30], l1: [30, 50], l2: [-10, 40] },
  fair:    { tl: 20, a1: [60, 0], a2: [-40, 30], l1: [40, 60], l2: [-20, 50] },
  bairW:   { tl: 15, l1: [20, 90], l2: [30, 80] },
  bair:    { tl: 35, a1: [120, 30], a2: [110, 30], l1: [10, 40], l2: [-105, 0] },
  uairW:   { tl: 0, l1: [40, 90], a1: [40, 40] },
  uair:    { tl: -20, a1: [150, 10], a2: [-80, 40], l1: [170, 0], l2: [30, 60] },
  dairW:   { tl: 0, l1: [60, 110], l2: [50, 100], a1: [150, 20], a2: [140, 20] },
  dair:    { tl: 0, a1: [160, 0], a2: [150, 0], l1: [5, 0], l2: [-5, 0] },
  castW:   { tl: -8, a1: [30, 110], a2: [-40, 60] },
  cast:    { tl: 12, a1: [90, 0], a2: [-40, 50], l1: [30, 10], l2: [-30, 5] },
  upcut:   { tl: -5, a1: [175, 0], a2: [60, 60], l1: [20, 40], l2: [-10, 70] },
  dash:    { tl: 35, a1: [95, 0], a2: [-70, 0], l1: [60, 30], l2: [-60, 10] },
  spin:    { tl: 0, a1: [90, 0], a2: [-90, 0], l1: [15, 30], l2: [-15, 30] },
  stomp:   { tl: 10, y: 4, a1: [60, 40], a2: [-40, 40], l1: [40, 70], l2: [-20, 10] },
  counter: { tl: -8, a1: [120, 70], a2: [110, 60], l1: [25, 20], l2: [-25, 10] },
  slide:   { tl: 80, y: 12, a1: [100, 0], a2: [80, 0], l1: [-80, 0], l2: [-95, 0] },
  grabW:   { tl: 10, a1: [70, 30], a2: [60, 30] },
  grab:    { tl: 18, a1: [90, 0], a2: [85, 0], l1: [30, 10], l2: [-25, 5] },
  throwF:  { tl: 25, a1: [100, 0], a2: [95, 0] },
  throwB:  { tl: -20, a1: [-110, 0], a2: [-100, 0] },
  throwU:  { tl: -10, a1: [175, 0], a2: [170, 0] },
  throwD:  { tl: 30, y: 4, a1: [30, 0], a2: [25, 0] },
  victory: { tl: -5, a1: [175, 0], a2: [-30, 60], l1: [15, 10], l2: [-15, 5] },
  pistol:  { tl: 14, a1: [92, 0], a2: [-30, 70], l1: [25, 10], l2: [-20, 5], ext: 5 },
  pistolS: { tl: 14, a1: [92, 0], a2: [-30, 70], l1: [25, 10], l2: [-20, 5], ext: 2 },
  bazooka: { tl: 28, a1: [95, 0], a2: [85, 0], l1: [48, 20], l2: [-45, 5], ext: 2.5, ext2: 2.5 },
  kickHigh:{ tl: -25, a1: [60, 20], a2: [-60, 40], l1: [125, 0], l2: [-5, 5] },
  palm:    { tl: 18, y: 2, a1: [95, 0], a2: [60, 40], l1: [40, 30], l2: [-35, 10] },
  palm2:   { tl: 18, y: 2, a1: [60, 40], a2: [95, 0], l1: [40, 30], l2: [-35, 10] },
};
function mixPose(a, b, t) {
  const o = {};
  for (const k in BASE_POSE) {
    const va = a[k] ?? BASE_POSE[k], vb = b[k] ?? BASE_POSE[k];
    o[k] = Array.isArray(va) ? [va[0] + (vb[0] - va[0]) * t, va[1] + (vb[1] - va[1]) * t] : va + (vb - va) * t;
  }
  return o;
}
function runPose(ph, amp) {
  const s = Math.sin(ph), c = Math.cos(ph);
  return { tl: 6 + amp * 12, y: -Math.abs(c) * amp * 1.5, a1: [-s * 50 * amp + 10, 60], a2: [s * 50 * amp - 10, 60],
    l1: [s * 42 * amp, 15 + Math.max(0, c) * 70 * amp], l2: [-s * 42 * amp, 15 + Math.max(0, -c) * 70 * amp] };
}

// shared humanoid rig; C = palette + widths, H = per-character hooks
function drawRig(g, J, C, H, f) {
  const dk = c => shade(c, -28);
  H.behind?.(g, J, f);
  const arm = (A, back) => {
    limb(g, A.sh, A.el, C.armW, back ? dk(C.sleeve) : C.sleeve);
    limb(g, A.el, A.h, C.armW - 0.5, back ? dk(C.fore || C.sleeve) : (C.fore || C.sleeve));
    oval(g, A.h.x, A.h.y, C.handR, C.handR, back ? dk(C.glove) : C.glove);
  };
  const leg = (L, back) => {
    const c = back ? dk(C.legs) : C.legs, c2 = C.shin ? (back ? dk(C.shin) : C.shin) : c;
    limb(g, L.kn, L.f, C.legW - 0.5, c2); limb(g, L.hip, L.kn, C.legW, c);
    const a = Math.atan2(L.f.y - L.kn.y, L.f.x - L.kn.x) - Math.PI / 2;
    oval(g, L.f.x + Math.cos(a) * 1.2, L.f.y + Math.sin(a) * 1.2, C.bootW, C.bootH, back ? dk(C.boots) : C.boots, a);
  };
  if (H.backArm) H.backArm(g, J, f); else arm(J.A2, true);
  leg(J.L2, true);
  H.backWeapon?.(g, J, f);
  leg(J.L1, false);
  if (H.torso) H.torso(g, J, f); else limb(g, J.hip, J.neck, C.torsoW, C.top);
  H.head(g, J, f);
  if (H.frontArm) H.frontArm(g, J, f); else arm(J.A1, false);
  H.weapon?.(g, J, f);
}

// Render a fighter-like object {ch, spr} with a pose into its own high-resolution buffer:
// the character is drawn with smooth (anti-aliased) shapes, then given a dark outline by stamping its
// silhouette around itself. All canvas compositing — no per-pixel loops.
const SPR_OUT = [18, 14, 28];
let sprScratch = null;
function renderSprite(o, pose, tint, grounded) {
  const S = SPR * RES;
  const c = o.spr || (o.spr = mkCanvas(S, S)), g = c.getContext('2d');
  const a = sprScratch || (sprScratch = mkCanvas(S, S)), ga = a.getContext('2d');
  ga.clearRect(0, 0, S, S);
  ga.save(); ga.scale(RES, RES); ga.translate(SPR / 2, FOOT);
  const J = joints(o.ch.body, pose);
  if (grounded) ga.translate(0, -Math.max(J.L1.f.y, J.L2.f.y) - 0.5);
  if (pose.rot) { const cy = -o.ch.body.cy; ga.translate(0, cy); ga.rotate(pose.rot * D2R); ga.translate(0, -cy); }
  o.ch.draw(ga, J, o);
  ga.restore();
  if (tint) { ga.globalCompositeOperation = 'source-atop'; ga.fillStyle = `rgba(${tint[0]},${tint[1]},${tint[2]},${tint[3]})`; ga.fillRect(0, 0, S, S); ga.globalCompositeOperation = 'source-over'; }
  g.clearRect(0, 0, S, S);
  const ow = RES * .85; // outline ≈ one art pixel
  for (const [dx, dy] of QUALITY === 'high' ? [[1, 0], [-1, 0], [0, 1], [0, -1], [.7, .7], [-.7, .7], [.7, -.7], [-.7, -.7]] : [[1, 0], [-1, 0], [0, 1], [0, -1]]) g.drawImage(a, dx * ow, dy * ow);
  g.globalCompositeOperation = 'source-in'; g.fillStyle = `rgb(${SPR_OUT})`; g.fillRect(0, 0, S, S);
  g.globalCompositeOperation = 'source-over'; g.drawImage(a, 0, 0);
  return c;
}
