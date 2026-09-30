// Roster expansion: anime-inspired fighters (One Piece, Demon Slayer, Jujutsu Kaisen) + two originals.
// Built from reusable special-move templates and a parametric humanoid "look".

// ================= special-move templates =================
const proj = (f, o) => spawn({ owner: f.i, x: f.x + f.face * 40, y: f.y + (o.y ?? -60), ...o, vx: (o.vx ?? 10) * f.face, vy: o.vy ?? 0 });
function mShot({ s = 10, e = 16, p = ['castW', 'cast'], sfx, fn, ...o }) {
  return { s, a: 0, e, p, tick(f, t) { if (t === s) { if (sfx) SFX.play(sfx); fn ? fn(f) : proj(f, o); } } };
}
function mStrike({ fx, ...o }) {
  const m = { s: 8, a: 4, e: 18, p: ['fsmashW', 'fsmash'], ...o };
  m.tick = (f, t) => { if (t === m.s + 1 && fx) fxBurst(f.x + f.face * 50, f.y - 60, fx, 8, 5); };
  return m;
}
function mDash({ s = 8, a = 16, e = 16, spd = 12, hb = [[45, -58, 30]], p = ['fsmashW', 'dash'], fx, sfx = 'swing', ...hit }) {
  return { s, a, e, p, hb, ...hit, tick(f, t) {
    if (t === s + 1) SFX.play(sfx);
    if (t > s && t <= s + a) { f.vx = f.face * spd; f.vy = Math.min(f.vy, 0); if (fx && t % 2) fxBurst(f.x - f.face * 20, f.y - 55, fx, 2, 3); }
  } };
}
function mBlink({ s = 8, dist = 190, e = 18, reps = 1, gap = 8, col = '#fff04a', sfx = 'zap', ...hit }) {
  const at = t => t >= s + 1 && (t - s - 1) % gap === 0 && (t - s - 1) / gap < reps;
  return { s, a: 0, e, dur: s + gap * reps + e, p: ['dash', 'dash'], ...hit,
    tick(f, t) {
      if (!at(t)) return;
      f.tx0 = f.x; f.x += f.face * dist; f.vx = f.face * 3; f.vy = Math.min(f.vy, 0); SFX.play(sfx);
      for (let d = 0; d < dist; d += 12) fxBurst(f.tx0 + f.face * d, f.y - 55 + (Math.random() - .5) * 30, col, 1, 1, 14);
    },
    hbAt(f, t) { if (!at(t)) return null; const o = []; for (let d = 0; d <= dist; d += 38) o.push([(f.tx0 + f.face * d - f.x) * f.face, -55, 34]); return o; },
    multi: 1 };
}
function mRise({ vy = -18, from = 5, to = 30, r = 44, col = '#ffffff', sfx = 'swing', spin = 36, dmg = 2, fin = 6, pose = 'upcut', ...hit }) {
  return { dur: to + 12, helpless: 1, multi: 5, dmg, b: 5, g: 0, ang: 88, grav: .6, ...hit,
    hbAt: (f, t) => t >= from && t < to ? (t >= to - 4 ? [[0, -70, r + 6, { dmg: fin, b: 7, g: .42, ang: 70 }]] : [[0, -70, r]]) : null,
    tick(f, t, inp) {
      if (t === from) { f.vy = vy; f.ground = null; SFX.play(sfx); }
      if (t > from) f.vx = inp.x * 4;
      if (t >= from && t < to) fxBurst(f.x, f.y - 40, col, 2, 4);
    },
    pose: (f, t) => t < from ? POSES.usmashW : { ...POSES[pose], rot: spin && t < to ? (t * spin) % 360 : 0 } };
}
function mWarp({ dist = 210, col = '#fff04a', sfx = 'zap' } = {}) {
  return { dur: 30, helpless: 1, grav: 0, dmg: 5, b: 5, g: .25, ang: 70, away: 1,
    tick(f, t, inp) {
      if (t < 12) { f.vx *= .8; f.vy *= .8; if (t > 8) f.intang = true; }
      if (t === 12) {
        const d = stickDir(inp); fxBurst(f.x, f.y - 50, col, 14, 6);
        teleport(f, f.x + d.x * dist, f.y + d.y * dist); f.vx = d.x * 4; f.vy = d.y * 4;
        fxBurst(f.x, f.y - 50, col, 14, 6); SFX.play(sfx);
      }
      if (t > 12) f.vy += .5;
    },
    hbAt: (f, t) => t >= 12 && t < 15 ? [[0, -55, 40]] : null,
    pose: (f, t) => t < 12 ? POSES.crouch : POSES.jump };
}
const mCounter = (col = '#ffd23f') => ({ dur: 40, p: ['counter', 'counter'], tick(f, t) { f.counter = t >= 5 && t <= 26; if (f.counter && t % 4 === 0) fxBurst(f.x, f.y - 55, col, 1, 2, 10); } });
function mReflect({ r = 50, col = '#9ff3ff', ...hit } = {}) {
  return { s: 3, a: 24, e: 10, grav: .3, multi: 6, hb: [[0, -50, r]], dmg: 3, b: 5, g: .1, ang: 50, away: 1, p: ['counter', 'spin'], ...hit,
    tick(f, t) { f.reflect = t > 3 && t <= 27; if (t % 3 === 0 && f.reflect) fxBurst(f.x, f.y - 55, col, 2, 6, 10); } };
}
function mBuff({ t: dur = 480, spd = 1.2, pow = 1.2, armor = 0, grow = 1, col = '#ffffff', sfx = 'counter' }) {
  return { s: 20, a: 0, e: 10, p: ['stomp', 'victory'], tick(f, t) {
    if (t === 20) { f.buff = { t: dur, spd, pow, armor, grow, col }; SFX.play(sfx); fxRing(f.x, f.y - 55, col, 60); fxBurst(f.x, f.y - 55, col, 20, 7); }
    else if (t < 20 && t % 3 === 0) fxBurst(f.x + (Math.random() - .5) * 60, f.y - Math.random() * 100, col, 1, 1, 14);
  } };
}
function mTrap({ draw, ...hit }) {
  return { s: 12, a: 0, e: 14, p: ['stomp', 'stomp'], tick(f, t) {
    if (t !== 12) return;
    killOwned(f, 'trap'); SFX.play('grab');
    spawn({ owner: f.i, kind: 'trap', x: f.x + f.face * 30, y: f.y - 10, vy: f.ground ? 0 : 4, grav: .5, r: 34, life: 600, onGround: 'stop', refl: false, inert: true, arm: 30,
      dmg: 10, b: 6, g: .45, ang: 85, away: 1, draw, ...hit, tick(p) { if (p.t === p.arm) p.inert = false; }, onHit(p) { p.bite = 1; p.life = 10; SFX.play('shadow'); } });
  } };
}

// ================= projectile art =================
const orbDraw = (c1, c2, c3 = '#ffffff') => (ctx, p) => { pxDisc(ctx, p.x, p.y, p.r + 3 + Math.sin(p.t * .4) * 2, c1); pxDisc(ctx, p.x, p.y, p.r * .7, c2); pxDisc(ctx, p.x + 2, p.y - 2, p.r * .3, c3); };
const slashDraw = (c, c2 = '#ffffff') => (ctx, p) => {
  const d = Math.sign(p.vx) || 1; ctx.lineCap = 'round';
  ctx.strokeStyle = c; ctx.lineWidth = p.r * .5; ctx.beginPath(); ctx.arc(p.x - d * p.r, p.y, p.r * 1.3, -1.1, 1.1, d < 0); ctx.stroke();
  ctx.strokeStyle = c2; ctx.lineWidth = p.r * .18; ctx.beginPath(); ctx.arc(p.x - d * p.r, p.y, p.r * 1.3, -.8, .8, d < 0); ctx.stroke();
};
function drawLightning(ctx, p) {
  let x = p.x, y = p.y - 420;
  for (let i = 0; i < 14; i++) { const nx = p.x + (Math.random() - .5) * 40, ny = y + 30; ctx.strokeStyle = i % 2 ? '#fff04a' : '#ffffff'; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(nx, ny); ctx.stroke(); x = nx; y = ny; }
  pxDisc(ctx, p.x, p.y, 20, '#fff6a0');
}
function drawCloud(ctx, p) { for (const [dx, dy, r] of [[-30, 0, 24], [0, -10, 30], [30, 0, 24]]) pxDisc(ctx, p.x + dx, p.y + dy, r, p.t > 20 && p.t % 4 < 2 ? '#8a8aa8' : '#4a4a68'); }
function drawGust(ctx, p) { for (let i = 0; i < 3; i++) { ctx.strokeStyle = ['#e8f6ff', '#bfe6ff', '#ffffff'][i]; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (.4 + i * .3), p.t * .4 + i, p.t * .4 + i + 4); ctx.stroke(); } }
function drawPellet(ctx, p) { pxDisc(ctx, p.x, p.y, 9, '#3a3a3a'); pxRect(ctx, p.x - Math.sign(p.vx) * 24, p.y - 1, 18, 3, '#ffffffaa'); }
function drawFirebird(ctx, p) {
  const d = Math.sign(p.vx), w = Math.sin(p.t * .6) * 12;
  ctx.fillStyle = '#ff6a1f'; ctx.beginPath(); ctx.moveTo(p.x + d * 24, p.y); ctx.lineTo(p.x - d * 12, p.y - 24 - w); ctx.lineTo(p.x - d * 6, p.y); ctx.lineTo(p.x - d * 12, p.y + 24 + w); ctx.fill();
  pxDisc(ctx, p.x + d * 6, p.y, 10, '#ffd23f'); pxRect(ctx, p.x - d * 40, p.y - 6, 24, 12, '#ff9a2a');
}
const plantDraw = (ctx, p) => { const open = p.t >= p.arm; pxRect(ctx, p.x - 24, p.y + 3, 48, 9, '#2f7a2a'); pxDisc(ctx, p.x, p.y - (p.bite ? 30 : 12), open ? 18 : 10, '#c0342a'); if (open) { pxRect(ctx, p.x - 12, p.y - (p.bite ? 30 : 12), 24, 3, '#ffffff'); } };
function drawDog(ctx, p) {
  const d = Math.sign(p.vx), b = (p.t >> 2) % 2 * 3;
  pxRect(ctx, p.x - 30, p.y - 24 + b, 54, 24, '#1a1428'); pxRect(ctx, p.x + d * 18, p.y - 36 + b, 21, 21, '#1a1428');
  pxRect(ctx, p.x + d * 24, p.y - 45 + b, 6, 12, '#1a1428'); pxRect(ctx, p.x + d * 27, p.y - 30 + b, 4, 4, '#ffffff');
  pxRect(ctx, p.x - 27, p.y, 6, 12 - b, '#1a1428'); pxRect(ctx, p.x + 12, p.y, 6, 12 + b - 3, '#1a1428');
}
function drawOwl(ctx, p) { const w = Math.sin(p.t * .7) * 18; pxDisc(ctx, p.x, p.y, 16, '#2a2440'); ctx.fillStyle = '#3a3458'; ctx.fillRect(p.x - 48, p.y - 6 - w, 36, 9); ctx.fillRect(p.x + 12, p.y - 6 - w, 36, 9); pxRect(ctx, p.x - 6, p.y - 6, 4, 4, '#ffe07a'); pxRect(ctx, p.x + 3, p.y - 6, 4, 4, '#ffe07a'); if (p.t % 6 < 3) fxBurst(p.x, p.y, '#aef6ff', 1, 3, 8); }
function drawElephant(ctx, p) { pxDisc(ctx, p.x, p.y, 50, '#5a5a78'); pxDisc(ctx, p.x - 30, p.y + 10, 24, '#4a4a68'); pxRect(ctx, p.x + 30, p.y + 6, 12, 50, '#5a5a78'); pxRect(ctx, p.x + 12, p.y - 15, 6, 6, '#fff'); for (let i = 0; i < 5; i++) pxRect(ctx, p.x - 40 + i * 20, p.y + 55 + (p.t * 7 + i * 13) % 60, 6, 18, '#6ab0ff'); }
function drawArrow(ctx, p) { const d = Math.sign(p.vx); pxRect(ctx, p.x - d * 60, p.y - 3, 70, 6, '#ffd23f'); ctx.fillStyle = '#ff6a1f'; ctx.beginPath(); ctx.moveTo(p.x + d * 30, p.y); ctx.lineTo(p.x, p.y - 18); ctx.lineTo(p.x, p.y + 18); ctx.fill(); for (let i = 0; i < 3; i++) pxDisc(ctx, p.x - d * (20 + i * 22), p.y + (Math.random() - .5) * 16, 10 - i * 2, i % 2 ? '#ff6a1f' : '#ffb13b'); }
function drawSalt(ctx, p) { pxRect(ctx, p.x - 3, p.y - 3, 6, 6, '#ffffff'); pxRect(ctx, p.x + 3, p.y + 3, 3, 3, '#e8f0ff'); }
function drawBits(ctx, p) { for (let i = 0; i < 4; i++) pxRect(ctx, p.x + ((i * 7 + p.t) % 5 - 2) * 4, p.y + (i % 2 ? -6 : 6), 9, 9, i % 2 ? '#3bf0ff' : '#ff3bd4'); }
function drawBlood(ctx, p) { pxDisc(ctx, p.x, p.y, p.r * (1 + p.t / 40), '#ff4f9a'); pxDisc(ctx, p.x, p.y, p.r * .6, '#ffb0d8'); if (p.t % 2) fxBurst(p.x, p.y, '#ff4f9a', 2, 4, 12); }

// ================= look builder =================
const SKIN = '#f2c8a0', TAN = '#d9a070', DARK = '#b07a4a';
const P2 = (h, pts) => pts.map(([x, y]) => [h.x + x, h.y + y]);
function face(g, h, skin, eye = '#222') { oval(g, h.x + .5, h.y + .5, 4.6, 5.1, skin); if (eye) box(g, h.x + 2.6, h.y - .6, 1.4, 2, eye); }
function dome(g, h, col, k = 1) { oval(g, h.x - .8, h.y - 2.3, 5.3 * k, 3.8 * k, col); oval(g, h.x - 2.8, h.y + .3, 2.8, 4.2, col); }
function spikes(g, h, col, k = 1) { poly(g, P2(h, [[-5, -2], [-10 * k, -5 * k], [-5, -5], [-7 * k, -9.5 * k], [-2, -6], [0, -10 * k], [2, -6], [5.5 * k, -8 * k], [4.5, -3]]), col); }
function drawKatana(g, A, p, L) {
  const d = dirv(A.ang + (p.wep || 0), 1), n = { x: d.y, y: -d.x }, len = L.bladeLen || 17;
  const tip = add(A.h, { x: d.x * len, y: d.y * len });
  limb(g, add(A.h, { x: -d.x * 3.5, y: -d.y * 3.5 }), A.h, 1.8, L.handle || '#2a2a3a');
  limb(g, add(A.h, { x: n.x * 2, y: n.y * 2 }), add(A.h, { x: -n.x * 2, y: -n.y * 2 }), 1.8, L.guard || '#c9a030');
  limb(g, add(A.h, { x: d.x * 1.5, y: d.y * 1.5 }), tip, 2, L.blade || '#dfe6f0');
  limb(g, add(A.h, { x: d.x * 3, y: d.y * 3 }), add(tip, { x: -d.x * 2, y: -d.y * 2 }), .8, L.edge || '#ffffff');
}
const WEAPONS = {
  katana: drawKatana,
  staff(g, A, p) { const d = dirv(A.ang + 70, 1); for (let i = -2; i < 3; i++) limb(g, add(A.h, { x: d.x * i * 4, y: d.y * i * 4 }), add(A.h, { x: d.x * (i * 4 + 3.5), y: d.y * (i * 4 + 3.5) }), 1.6, i % 2 ? '#2a5ad8' : '#6ab0ff'); },
  sling(g, A) { const d = dirv(A.ang, 1), n = { x: d.y, y: -d.x }, t = add(A.h, { x: d.x * 4, y: d.y * 4 }); limb(g, A.h, t, 1.5, '#6a4a2a'); limb(g, t, add(t, { x: n.x * 3 + d.x * 3, y: n.y * 3 + d.y * 3 }), 1.2, '#6a4a2a'); limb(g, t, add(t, { x: -n.x * 3 + d.x * 3, y: -n.y * 3 + d.y * 3 }), 1.2, '#6a4a2a'); },
};
function drawCape(g, J, f, c) {
  const flow = Math.min(8, Math.abs(f.vx || 0)), w = Math.sin(T * .12 + (f.i || 0)) * 1.5, len = c.len || 14;
  const pts = [[J.neck.x - 3, J.neck.y + 1], [J.neck.x + 2, J.neck.y + 1], [J.hip.x + 3, J.hip.y + len * .5], [J.hip.x - 6 - flow, J.hip.y + len * .45 - w]];
  poly(g, pts, c.col);
  if (!c.pat) return;
  g.save(); g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); g.clip();
  const x0 = J.hip.x - 20, y0 = J.neck.y - 2;
  if (c.pat === 'checker') for (let y = 0; y < 30; y += 3) for (let x = 0; x < 30; x += 3) if (((x + y) / 3) % 2 === 0) box(g, x0 + x, y0 + y, 3, 3, c.col2);
  if (c.pat === 'tri') for (let y = 0; y < 30; y += 5) for (let x = 0; x < 30; x += 5) poly(g, [[x0 + x, y0 + y + 4], [x0 + x + 2, y0 + y], [x0 + x + 4, y0 + y + 4]], c.col2);
  if (c.pat === 'flame') { const by = J.hip.y + len * .45 - w; for (let x = -12; x < 8; x += 3) poly(g, [[J.hip.x + x, by + 2], [J.hip.x + x + 1.5, by - 5 - (x & 3)], [J.hip.x + x + 3, by + 2]], x % 2 ? c.col2 : '#ffcf3a'); }
  g.restore();
}
function drawTorso(g, J, L) {
  const up = J.up, n = { x: -up.y, y: up.x }, W = L.torsoW || 8;
  limb(g, J.hip, J.neck, W, L.top);
  const at = k => ({ x: J.hip.x + (J.neck.x - J.hip.x) * k, y: J.hip.y + (J.neck.y - J.hip.y) * k });
  if (L.style === 'vest') limb(g, add(at(.15), { x: n.x * 2.5, y: n.y * 2.5 }), add(at(.95), { x: n.x * 2.5, y: n.y * 2.5 }), 3, L.skin);
  if (L.style === 'stripes') for (let k = .15; k < 1; k += .22) limb(g, add(at(k), { x: -n.x * 3.5, y: -n.y * 3.5 }), add(at(k), { x: n.x * 3.5, y: n.y * 3.5 }), 1.2, L.top2);
  if (L.style === 'suit') { poly(g, [[J.neck.x + n.x * 1, J.neck.y], [J.neck.x + n.x * 4, J.neck.y + 1], [at(.6).x + n.x * 2.5, at(.6).y]], L.top2); limb(g, at(.9), at(.55), .8, '#111'); }
  if (L.style === 'uniform') { for (let k = .2; k < .95; k += .2) box(g, at(k).x + n.x * 3 - .5, at(k).y - .5, 1.2, 1.2, '#f2c14e'); limb(g, J.neck, add(J.neck, { x: n.x * 2, y: n.y * 2 }), 4, L.top); }
  if (L.style === 'kimono') { limb(g, add(at(.95), { x: n.x * 3, y: n.y * 3 }), add(at(.55), { x: n.x * 3.5, y: n.y * 3.5 }), 1.2, L.top2); }
  if (L.style === 'overalls') { limb(g, at(.95), add(at(.4), { x: n.x * 3, y: n.y * 3 }), 1.2, L.top2); box(g, at(.5).x + n.x * 2, at(.5).y, 2, 2, '#f2c14e'); }
  if (L.sash) limb(g, add(at(.12), { x: -n.x * W * .55, y: -n.y * W * .55 }), add(at(.12), { x: n.x * W * .55, y: n.y * W * .55 }), L.sashW || 2.5, L.sash);
  if (L.skirt) { const h = J.hip, s = Math.sin(T * .1) * 1.2, k = L.skirt; poly(g, [[h.x - 4, h.y - 2], [h.x + 4, h.y - 2], [h.x + 8 + s, h.y + k.len], [h.x - 9 + s, h.y + k.len]], k.col); if (k.trim) limb(g, { x: h.x - 9 + s, y: h.y + k.len }, { x: h.x + 8 + s, y: h.y + k.len }, 1.2, k.trim); }
}
function look(L) {
  const C = { sleeve: L.sleeve ?? L.top, fore: L.fore ?? L.sleeve ?? L.top, glove: L.hand ?? L.skin, legs: L.legs, shin: L.shin, boots: L.boots, top: L.top,
    armW: L.armW ?? 3.5, legW: L.legW ?? 3.8, bootW: L.bootW ?? 3, bootH: L.bootH ?? 1.8, handR: L.handR ?? 1.8 };
  return function (g, J, f) {
    drawRig(g, J, C, {
      behind(g, J, f) { if (L.cape) drawCape(g, J, f, L.cape); L.back?.(g, J.head, f, J); },
      torso(g, J, f) { drawTorso(g, J, L); L.torso?.(g, J, f); },
      head(g, J, f) { face(g, J.head, L.skin, L.eye); L.head(g, J.head, f, J); },
      backWeapon: L.weapon2 ? (g, J) => WEAPONS[L.weapon2](g, J.A2, J.p, L) : undefined,
      weapon: L.weapon ? (g, J, f) => WEAPONS[L.weapon](g, J.A1, J.p, L, f) : undefined,
    }, f);
  };
}
const HUMAN = { thigh: 7, shin: 7, torso: 12, upper: 6, fore: 6, head: 5.5, cy: 20 };
const phys = (o = {}) => ({ walk: 5.5, air: 5, jump: 16, djump: 14, grav: .75, fall: 13, jumps: 1, weight: 100, hw: 48, hh: 108, body: HUMAN, ...o });
const KICKS = { jab: ['kickW', 'kick'], ftilt: ['kickW', 'kick'], fsmash: ['kickW', 'kickHigh'], utilt: ['uairW', 'uair'] };
const FIRE = '#ff6a1f', WATER = '#3bb0ff';

// ================= roster =================
const LUFFY_BASE = look({ skin: SKIN, top: '#d8322a', style: 'vest', sash: '#f2c14e', sleeve: SKIN, legs: '#3a6ad8', shin: SKIN, boots: '#8a5a2a',
  head(g, h) {
    dome(g, h, '#15151a'); spikes(g, h, '#15151a', .6);
    oval(g, h.x, h.y - 4, 9.5, 2, '#e8c860'); oval(g, h.x - .5, h.y - 6.5, 5.5, 3, '#f0d070');
    limb(g, { x: h.x - 5, y: h.y - 5.2 }, { x: h.x + 4.5, y: h.y - 5.2 }, 1.3, '#c0302a');
    limb(g, { x: h.x + 2, y: h.y + 2.4 }, { x: h.x + 4, y: h.y + 2.7 }, .6, '#a03030'); box(g, h.x + 3, h.y + 3.4, 2, .8, '#fff');
  } });
// Gear 5 "Sun God Nika": white flame hair, all-white outfit, cloud scarf, red-ringed eyes, huge grin, hat on his back
const LUFFY_G5 = look({ skin: '#f8e6d8', eye: null, top: '#f6f6fa', style: 'vest', sash: '#c8b8e8', sleeve: '#f8e6d8', legs: '#eeeef6', shin: '#f8e6d8', boots: '#d8d0c8',
  back(g, h, f, J) {
    const n = J.neck, s = Math.sin(T * .2) * 1.5;
    poly(g, P2(h, [[-4, -2], [-12, -8 + s], [-9, -3], [-16, -1 + s], [-8, 1], [-13, 6 + s], [-5, 3]]), '#ffffff'); // hair streaming back
    oval(g, n.x - 5, n.y + 6, 6.5, 2.3, '#e8c860', -1.1); oval(g, n.x - 5.5, n.y + 6, 3.6, 2.8, '#f0d070', -1.1); // hat on his back
    limb(g, { x: n.x - 7, y: n.y + 4 }, { x: n.x - 3, y: n.y + 8 }, 1, '#c0302a');
  },
  torso(g, J) { const n = J.neck; for (const [dx, dy, r] of [[-4, 2.5, 2.6], [-1, 1, 3.2], [2.5, 2, 2.8], [-6, 4.5, 2.2], [0, 4, 2]]) oval(g, n.x + dx, n.y + dy, r, r * .8, '#ffffff'); },
  head(g, h) {
    const w = Math.sin(T * .25) * 1.2;
    poly(g, P2(h, [[-6, 1], [-12, -3 + w], [-8, -5], [-13, -11 + w], [-6, -8], [-6, -15 + w], [-2, -9], [2, -16 - w], [3, -8], [8, -13 + w], [5, -4], [7, -1]]), '#ffffff');
    oval(g, h.x - 1, h.y - 3, 6, 4.3, '#ffffff');
    poly(g, P2(h, [[-3, -9], [-1, -13 - w], [1, -8]]), '#e8e4f4'); poly(g, P2(h, [[-9, -6], [-11, -9 + w], [-6, -7]]), '#e8e4f4');
    oval(g, h.x + 3, h.y - .5, 2, 2.3, '#e8263a'); oval(g, h.x + 3, h.y - .5, 1.2, 1.5, '#ffffff'); box(g, h.x + 3.1, h.y - .8, .7, .9, '#15151a');
    poly(g, P2(h, [[.8, 2.2], [6, 1.6], [5.4, 4.8], [1.6, 4.6]]), '#8a2a2a'); poly(g, P2(h, [[1.3, 2.5], [5.6, 2], [5.2, 3.4], [1.6, 3.4]]), '#ffffff');
    limb(g, { x: h.x + 1.5, y: h.y + 1.2 }, { x: h.x + 3.5, y: h.y + 1.5 }, .6, '#a03030');
  } });
CHARS.push(
  { // ---------- LUFFY ----------
    id: 'luffy', name: 'LUFFY', title: 'Straw Hat Captain', series: 'ONE PIECE', color: '#d8322a', fx: '#ffd0a0',
    desc: 'Rubber body: every punch stretches across the stage.', stats: { speed: 4, power: 3, weight: 3, jump: 4 },
    ...phys({ walk: 6.2, air: 5.5, jump: 16.5, weight: 98 }), pw: 1, rc: 1.35, sp: .95,
    specials: ['Gum-Gum Pistol', 'Gum-Gum Gatling', 'Gum-Gum Rocket', 'Gear Second'],
    poses: { jab: ['jabW', 'pistolS'], ftilt: ['jabW', 'pistol'], fsmash: ['fsmashW', 'bazooka'] },
    draw: (g, J, f) => (f?.fsBuff?.white ? LUFFY_G5 : LUFFY_BASE)(g, J, f), // Gear 5 swaps to the Sun God look
    specials_: {
      n: mStrike({ s: 10, a: 4, e: 20, hb: [[135, -64, 24], [90, -64, 20]], dmg: 9, b: 5, g: .4, ang: 35, p: ['jabW', 'pistol'], sfx: 'throw' }),
      s: { s: 8, a: 30, e: 16, multi: 4, hb: [[80, -62, 42]], dmg: 2, b: 3, g: 0, ang: 30,
        hbAt: (f, t) => t > 8 && t <= 38 ? (t > 34 ? [[90, -62, 46, { dmg: 5, b: 7, g: .4, ang: 38 }]] : [[80, -62, 42]]) : null,
        tick(f, t) { if (t > 8 && t <= 38) { if (t % 4 === 1) SFX.play('swing', .3); fxBurst(f.x + f.face * (50 + Math.random() * 70), f.y - 40 - Math.random() * 45, SKIN, 1, 1, 6); } },
        pose: (f, t) => t <= 8 ? POSES.jabW : { ...POSES.jab, ext: 2.5 + Math.sin(t * 1.7) * 2, ext2: 2.5 - Math.sin(t * 1.7) * 2, a2: [85, 0] } },
      u: mRise({ vy: -21, spin: 0, dmg: 6, fin: 7, pose: 'usmash', col: SKIN, sfx: 'throw' }),
      d: mBuff({ t: 480, spd: 1.25, pow: 1.2, col: '#ffb0b0' }),
    },
  },
  { // ---------- ZORO ----------
    id: 'zoro', name: 'ZORO', title: 'Three-Sword Style', series: 'ONE PIECE', color: '#3aa05a', fx: '#bfffd8',
    desc: 'Santoryu swordsman. Heavy slashes, huge reach.', stats: { speed: 3, power: 4, weight: 4, jump: 3 },
    ...phys({ walk: 5.3, weight: 108 }), pw: 1.15, rc: 1.25, sp: 1,
    specials: ['36 Pound Phoenix', 'Oni Giri', 'Tatsumaki', "Lion's Song"],
    draw: look({ skin: TAN, top: '#f0f0f0', sash: '#2e8b57', sashW: 4, sleeve: '#f0f0f0', fore: TAN, legs: '#2a2a2a', boots: '#15151a',
      weapon: 'katana', weapon2: 'katana', blade: '#e8eef8',
      head(g, h, f) {
        dome(g, h, '#3aa05a', .92); box(g, h.x - 1.5, h.y + 3, 1, 2, '#f2c14e');
        if (f.act === 'move') { limb(g, { x: h.x + 2, y: h.y + 3 }, { x: h.x + 13, y: h.y + 2 }, 1.4, '#e8eef8'); box(g, h.x, h.y + 2.2, 2.5, 1.6, '#c9a030'); }
      } }),
    specials_: {
      n: mShot({ s: 12, e: 18, p: ['fsmashW', 'fsmash'], sfx: 'swing', vx: 12, r: 24, life: 45, dmg: 9, b: 5, g: .35, ang: 35, draw: slashDraw('#8affb8') }),
      s: mBlink({ s: 10, dist: 200, dmg: 12, b: 6, g: .45, ang: 40, col: '#bfffd8', sfx: 'swing' }),
      u: mRise({ vy: -16, spin: 40, dmg: 3, fin: 6, col: '#bfffd8', r: 50, pose: 'spin' }),
      d: mCounter('#bfffd8'),
    },
  },
  { // ---------- SANJI ----------
    id: 'sanji', name: 'SANJI', title: 'Black Leg Cook', series: 'ONE PIECE', color: '#f5d76e', fx: FIRE,
    desc: 'Fights only with kicks. Sky Walk lets him jump on air.', stats: { speed: 4, power: 3, weight: 3, jump: 5 },
    ...phys({ walk: 6.3, air: 5.6, jump: 16.5, weight: 94 }), pw: 1, rc: 1.1, sp: .9, poses: KICKS,
    specials: ['Diable Jambe: Collier', 'Poitrine Shoot', 'Sky Walk', 'Anti-Manner Kick'],
    draw: look({ skin: SKIN, eye: null, top: '#1a1a22', style: 'suit', top2: '#4a7ad8', sleeve: '#1a1a22', legs: '#1a1a22', boots: '#0d0d10',
      head(g, h) {
        dome(g, h, '#f5d76e'); poly(g, P2(h, [[-5, -4], [4, -5], [6.5, 1.5], [3.5, .5], [2, -2]]), '#f5d76e');
        box(g, h.x + 4.5, h.y - 2.5, 1.5, .8, '#15151a'); box(g, h.x + 4.8, h.y + 2.6, 3, .9, '#ffffff'); box(g, h.x + 7.6, h.y + 2.6, .9, .9, '#ff6a1f');
      } }),
    specials_: {
      n: mStrike({ s: 12, a: 5, e: 18, hb: [[55, -78, 32]], dmg: 12, b: 6, g: .5, ang: 50, p: ['kickW', 'kickHigh'], fx: FIRE, sfx: 'fire' }),
      s: mDash({ spd: 14, hb: [[45, -40, 30]], p: ['kickW', 'kick'], dmg: 10, b: 6, g: .42, ang: 35, fx: FIRE, sfx: 'fire' }),
      u: { dur: 22, airUses: 3, dmg: 4, b: 5, g: .1, ang: 80, p: ['crouch', 'djump'], hbAt: (f, t) => t >= 4 && t < 10 ? [[0, 5, 30]] : null,
        tick(f, t) { if (t === 4) { f.vy = -15; f.ground = null; SFX.play('djump'); fxRing(f.x, f.y, '#ffffff', 26); } },
        pose: (f, t) => ({ ...POSES.djump, rot: t * 16 }) },
      d: mStrike({ s: 8, a: 5, e: 20, hb: [[25, -125, 34], [20, -65, 26]], dmg: 13, b: 7, g: .45, ang: 88, p: ['crouch', 'uair'], fx: FIRE }),
    },
  },
  { // ---------- NAMI ----------
    id: 'nami', name: 'NAMI', title: 'Weather Witch', series: 'ONE PIECE', color: '#ff8c2a', fx: '#fff04a',
    desc: 'Controls the weather with her Clima-Tact.', stats: { speed: 3, power: 2, weight: 2, jump: 3 },
    ...phys({ walk: 5.6, weight: 84, grav: .7 }), pw: .95, rc: 1.1, sp: 1,
    specials: ['Thunderbolt Tempo', 'Cyclone Tempo', 'Cloud Ride', 'Mirage Tempo'],
    draw: look({ skin: SKIN, top: '#f4f4f4', style: 'stripes', top2: '#3a6ad8', sleeve: SKIN, legs: '#2a4a8a', boots: '#c06030', weapon: 'staff',
      back(g, h) { poly(g, P2(h, [[-5, -3], [1, -5], [-2, 2], [-4, 13], [-10, 12], [-8, 2]]), '#ff8c2a'); },
      head(g, h) { dome(g, h, '#ff8c2a'); poly(g, P2(h, [[1, -6], [6, -3], [5, -1], [1, -3]]), '#ff8c2a'); } }),
    specials_: {
      n: mShot({ s: 14, e: 18, sfx: 'zap', fn(f) {
        const foe = fighters[1 - f.i];
        spawn({ owner: f.i, kind: 'cloud', x: foe.x, y: foe.y - 320, r: 10, life: 45, inert: true, refl: false, draw: drawCloud,
          tick(p) { const t = fighters[1 - p.owner]; if (p.t < 20) p.x += (t.x - p.x) * .15; if (p.t === 28) { SFX.play('zap'); spawn({ owner: p.owner, kind: 'bolt', x: p.x, y: p.y + 20, vy: 34, r: 24, life: 14, dmg: 11, b: 6, g: .4, ang: 80, away: 1, refl: false, draw: drawLightning }); } } });
      } }),
      s: mShot({ s: 10, e: 18, sfx: 'throw', vx: 8, r: 32, life: 45, dmg: 4, b: 9, g: .25, ang: 25, draw: drawGust }),
      u: mRise({ vy: -19, spin: 0, dmg: 3, fin: 5, pose: 'jump', col: '#ffffff' }),
      d: { dur: 40, p: ['counter', 'counter'], tick(f, t) { if (t === 5) { SFX.play('shadow'); fxBurst(f.x, f.y - 55, '#ffffff', 12, 5); } if (t >= 5 && t <= 32) { f.intang = true; f.vx = -f.face * 3; } } },
    },
  },
  { // ---------- USOPP ----------
    id: 'usopp', name: 'USOPP', title: 'Sniper King', series: 'ONE PIECE', color: '#c68a5a', fx: '#ffd23f',
    desc: 'Long-range sniper with explosive plant traps.', stats: { speed: 3, power: 2, weight: 2, jump: 3 },
    ...phys({ walk: 5.5, weight: 86 }), pw: .9, rc: 1, sp: 1,
    specials: ['Lead Star', 'Firebird Star', 'Pop Green: Trampolia', 'Pop Green: Devil'],
    draw: look({ skin: DARK, top: '#8a6a3a', style: 'overalls', top2: '#f0e8d0', sleeve: '#f0e8d0', fore: DARK, legs: '#6a5030', boots: '#3a2a1a', weapon: 'sling',
      head(g, h) {
        for (const [x, y, r] of [[-3, -3, 3.2], [-6, 0, 2.6], [0, -5, 3], [-5, 4, 2.6], [2, -5.5, 2]]) oval(g, h.x + x, h.y + y, r, r, '#15151a');
        limb(g, { x: h.x + 4, y: h.y + 1 }, { x: h.x + 11, y: h.y + 1.5 }, 1.8, DARK);
        box(g, h.x - 1, h.y - 5.5, 5, 2, '#e8a030'); box(g, h.x + 2, h.y - 5.2, 2, 1.4, '#6ad8ff');
      } }),
    specials_: {
      n: mShot({ s: 8, e: 12, sfx: 'throw', vx: 17, r: 9, life: 45, dmg: 4, b: 3, g: .12, ang: 30, draw: drawPellet }),
      s: mShot({ s: 16, e: 18, sfx: 'fire', vx: 9, r: 22, life: 70, dmg: 10, b: 5, g: .4, ang: 35, draw: drawFirebird }),
      u: mRise({ vy: -22, spin: 0, dmg: 0, fin: 0, pose: 'jump', col: '#4fbf3a', sfx: 'jump' }),
      d: mTrap({ draw: plantDraw, dmg: 11 }),
    },
  },
  { // ---------- TANJIRO ----------
    id: 'tanjiro', name: 'TANJIRO', title: 'Water Breathing', series: 'DEMON SLAYER', color: '#2e8b57', fx: WATER,
    desc: 'Water Breathing forms, and the Sun when it counts.', stats: { speed: 3, power: 3, weight: 3, jump: 3 },
    ...phys({ weight: 98 }), pw: 1.05, rc: 1.2, sp: 1,
    specials: ['Water Wheel', 'Striking Tide', 'Waterfall Basin', 'Dead Calm'],
    draw: look({ skin: SKIN, eye: '#8a2030', top: '#1a1a2a', style: 'uniform', cape: { col: '#15151a', col2: '#2e8b57', pat: 'checker', len: 16 },
      sleeve: '#2e8b57', legs: '#1a1a2a', shin: '#e8e8e8', boots: '#3a3a3a', weapon: 'katana', blade: '#2a2a3a', edge: '#bfe6ff',
      head(g, h) { dome(g, h, '#7a2a2a'); spikes(g, h, '#7a2a2a', .7); box(g, h.x + 1.5, h.y - 3, 2, 1.5, '#b03a3a'); box(g, h.x - 1.5, h.y + 3, 1.5, 3, '#f0f0f0'); box(g, h.x - 1.5, h.y + 4, 1.5, 1, '#d02030'); } }),
    specials_: {
      n: { s: 6, a: 16, e: 14, hb: [[45, -60, 44]], dmg: 10, b: 5, g: .42, ang: 60,
        tick(f, t) { if (t === 7) { f.vy = f.ground ? -6 : -3; f.ground = null; SFX.play('swing'); } if (t > 6 && t <= 22) { f.vx = f.face * 6; fxBurst(f.x + f.face * 30, f.y - 55, WATER, 2, 4); } },
        pose: (f, t) => t <= 6 ? POSES.fsmashW : { ...POSES.fsmash, rot: t <= 22 ? (t - 6) * 22.5 : 0 } },
      s: mDash({ spd: 11, a: 24, multi: 6, dmg: 3, b: 4, g: .08, ang: 30, fx: WATER }),
      u: mRise({ vy: -18, col: WATER }),
      d: mCounter(WATER),
    },
  },
  { // ---------- ZENITSU ----------
    id: 'zenitsu', name: 'ZENITSU', title: 'Thunder Breathing', series: 'DEMON SLAYER', color: '#ffc53a', fx: '#fff04a',
    desc: 'Asleep, he strikes faster than lightning.', stats: { speed: 5, power: 3, weight: 2, jump: 3 },
    ...phys({ walk: 7, air: 5.8, weight: 82, grav: .85, fall: 14.5 }), pw: .95, rc: 1.15, sp: .85,
    specials: ['Thunderclap and Flash', 'Sixfold', 'Heat Lightning', 'Sleeping Stance'],
    draw: look({ skin: SKIN, eye: null, top: '#1a1a2a', style: 'uniform', cape: { col: '#ffc53a', col2: '#ffffff', pat: 'tri', len: 16 },
      sleeve: '#ffc53a', legs: '#1a1a2a', shin: '#e8e8e8', boots: '#3a3a3a', weapon: 'katana', blade: '#ffe07a',
      head(g, h) { dome(g, h, '#ffc53a'); spikes(g, h, '#ffc53a', .9); poly(g, P2(h, [[-7, -6], [-10, -5], [-6, -4]]), '#ff8a1a'); limb(g, { x: h.x + 2, y: h.y }, { x: h.x + 4, y: h.y + .5 }, .8, '#222'); } }),
    specials_: {
      n: mBlink({ s: 14, dist: 250, dmg: 11, b: 6, g: .44, ang: 40, col: '#fff04a' }),
      s: mBlink({ s: 6, dist: 110, reps: 3, gap: 8, dmg: 4, b: 4, g: .15, ang: 40, col: '#fff04a' }),
      u: mWarp({ dist: 230, col: '#fff04a' }),
      d: mCounter('#fff04a'),
    },
  },
  { // ---------- NEZUKO ----------
    id: 'nezuko', name: 'NEZUKO', title: 'Demon Sister', series: 'DEMON SLAYER', color: '#ff6fa8', fx: '#ff4f9a',
    desc: 'Powerful kicks and exploding demon blood.', stats: { speed: 4, power: 3, weight: 2, jump: 4 },
    ...phys({ walk: 6, jump: 16.5, weight: 86 }), pw: 1, rc: 1.05, sp: .95, poses: KICKS,
    specials: ['Exploding Blood', 'Demon Kick', 'Rising Kick', 'Demon Form'],
    draw: look({ skin: '#f8dcc8', eye: '#ff6fa8', top: '#f59ab8', style: 'kimono', top2: '#ffffff', sash: '#6a3a2a', sashW: 3, sleeve: '#f59ab8', legs: '#f8dcc8', boots: '#222',
      skirt: { col: '#f59ab8', len: 9, trim: '#c0507a' },
      back(g, h) { poly(g, P2(h, [[-5, -3], [1, -5], [-1, 4], [-3, 15], [-11, 14], [-8, 2]]), '#15151a'); poly(g, P2(h, [[-3, 12], [-3, 15], [-11, 14], [-10, 11]]), '#ff8a3a'); },
      head(g, h) { dome(g, h, '#15151a'); limb(g, { x: h.x + 1, y: h.y + 2.6 }, { x: h.x + 6, y: h.y + 2.6 }, 1.7, '#7a9a3a'); poly(g, P2(h, [[-4, -4], [-8, -7], [-8, -2]]), '#ff6fa8'); } }),
    specials_: {
      n: mShot({ s: 10, e: 16, sfx: 'fire', vx: 7, r: 20, life: 30, dmg: 8, b: 5, g: .35, ang: 45, draw: drawBlood }),
      s: mDash({ spd: 13, hb: [[40, -40, 30]], p: ['kickW', 'kick'], dmg: 11, b: 6, g: .45, ang: 35, fx: '#ff4f9a' }),
      u: mRise({ vy: -19, spin: 0, dmg: 5, fin: 7, pose: 'uair', col: '#ff4f9a' }),
      d: mBuff({ t: 420, spd: 1.1, pow: 1.25, armor: 1, grow: 1.15, col: '#ff4f9a' }),
    },
  },
  { // ---------- RENGOKU ----------
    id: 'rengoku', name: 'RENGOKU', title: 'Flame Hashira', series: 'DEMON SLAYER', color: '#ff7a1a', fx: FIRE,
    desc: 'Set your heart ablaze. Powerful flame forms.', stats: { speed: 3, power: 4, weight: 4, jump: 3 },
    ...phys({ walk: 5.6, weight: 110 }), pw: 1.15, rc: 1.2, sp: 1.05,
    specials: ['Unknowing Fire', 'Rising Scorching Sun', 'Blazing Universe', 'Flame Undulation'],
    draw: look({ skin: SKIN, eye: '#ffcf3a', top: '#1a1a2a', style: 'uniform', cape: { col: '#f4f0e8', col2: '#e84a2a', pat: 'flame', len: 17 },
      sleeve: '#f4f0e8', legs: '#1a1a2a', shin: '#e8e8e8', boots: '#3a3a3a', weapon: 'katana', blade: '#ff7a3a', edge: '#ffe07a', guard: '#e84a2a',
      head(g, h) { dome(g, h, '#ffcf3a'); spikes(g, h, '#ffcf3a', 1.15); poly(g, P2(h, [[-6, -6], [-11, -7], [-7, -9], [-9, -12], [-3, -8]]), '#e84a2a'); box(g, h.x + 2, h.y - 2.2, 3, 1, '#e84a2a'); } }),
    specials_: {
      n: mDash({ s: 10, spd: 16, a: 12, dmg: 12, b: 6, g: .45, ang: 38, fx: FIRE, sfx: 'fire' }),
      s: mStrike({ s: 8, a: 5, e: 18, hb: [[55, -80, 36], [40, -122, 28]], dmg: 13, b: 6, g: .45, ang: 75, p: ['dtiltW', 'utilt'], fx: FIRE, sfx: 'fire' }),
      u: mRise({ vy: -19, spin: 30, col: FIRE, sfx: 'fire' }),
      d: mReflect({ r: 56, col: FIRE }),
    },
  },
  { // ---------- YUJI ----------
    id: 'yuji', name: 'YUJI', title: 'Vessel of Sukuna', series: 'JUJUTSU KAISEN', color: '#f59ab0', fx: '#6ab0ff',
    desc: 'Monstrous strength. Black Flash can crit for huge damage.', stats: { speed: 4, power: 4, weight: 3, jump: 4 },
    ...phys({ walk: 6.4, jump: 16.8, weight: 102 }), pw: 1.1, rc: 1, sp: .9,
    specials: ['Divergent Fist', 'Black Flash', 'Manji Kick', 'Counter'],
    draw: look({ skin: SKIN, top: '#1a1a2a', style: 'uniform', sleeve: '#1a1a2a', hand: SKIN, legs: '#1a1a2a', boots: '#c03030',
      back(g, h) { oval(g, h.x - 4, h.y + 5, 3.5, 3, '#d02030'); },
      head(g, h) { dome(g, h, '#f59ab0'); spikes(g, h, '#f59ab0', .6); box(g, h.x - 4.5, h.y - 1, 2, 3, '#4a2a3a'); } }),
    specials_: {
      n: mStrike({ s: 8, a: 12, e: 16, multi: 10, hb: [[52, -62, 28]], dmg: 6, b: 5, g: .3, ang: 40, p: ['jabW', 'jab'], fx: '#6ab0ff' }),
      s: { ...mDash({ spd: 12, a: 12, dmg: 10, b: 6, g: .45, ang: 38 }),
        start(f) { f.crit = Math.random() < .3; },
        dmgFn: f => f.crit ? 25 : 10,
        onHit(f, foe) { if (!f.crit) return; SFX.play('counter'); flash = 5; shakeCam(16); for (let i = 0; i < 3; i++) fxBurst(foe.x, foe.y - 55, i % 2 ? '#e8263a' : '#111111', 16, 10); popText(foe.x, foe.y - 140, 'BLACK FLASH!', '#e8263a'); } },
      u: mRise({ vy: -18, spin: 0, dmg: 8, fin: 8, pose: 'uair', col: '#6ab0ff' }),
      d: mCounter('#6ab0ff'),
    },
  },
  { // ---------- GOJO ----------
    id: 'gojo', name: 'GOJO', title: 'The Strongest', series: 'JUJUTSU KAISEN', color: '#8ac8ff', fx: '#6ab0ff',
    desc: 'Limitless: Blue pulls, Red repels, Infinity stops all.', stats: { speed: 4, power: 4, weight: 3, jump: 4 },
    ...phys({ walk: 6.2, jump: 16.8, weight: 96, hh: 116 }), body: { ...HUMAN, thigh: 8, shin: 8, torso: 13 }, pw: 1.1, rc: 1.1, sp: .9,
    specials: ['Lapse: Blue', 'Reversal: Red', 'Teleport', 'Infinity'],
    draw: look({ skin: '#f8e0cc', eye: null, top: '#101018', style: 'uniform', legs: '#101018', boots: '#0a0a0a',
      head(g, h) { poly(g, P2(h, [[-5, -2], [-9, -9], [-4, -6], [-4, -12], [0, -7], [3, -12], [4, -6], [7, -8], [5, -3]]), '#f4f6ff'); dome(g, h, '#f4f6ff'); limb(g, { x: h.x - 3, y: h.y - .5 }, { x: h.x + 5.2, y: h.y - .8 }, 2.4, '#111'); } }),
    specials_: {
      n: mShot({ s: 14, e: 16, sfx: 'shadow', vx: 5, r: 24, life: 90, dmg: 6, b: 4, g: .2, ang: 60, draw: orbDraw('#1a3aff', '#6ab0ff'),
        tick(p) { const t = fighters[1 - p.owner]; if (canBeHit(t) && Math.hypot(t.x - p.x, t.y - 55 - p.y) < 260) t.x += Math.sign(p.x - t.x) * 3.5; } }),
      s: mShot({ s: 18, e: 18, sfx: 'boom', vx: 11, r: 22, life: 50, dmg: 12, b: 9, g: .55, ang: 30, draw: orbDraw('#c0142a', '#ff5a5a') }),
      u: mWarp({ dist: 240, col: '#8ac8ff' }),
      d: { s: 2, a: 30, e: 10, p: ['counter', 'counter'], tick(f, t) { const on = t > 2 && t <= 32; f.reflect = on; f.nullify = on; if (on && t % 4 === 0) fxRing(f.x, f.y - 55, '#8ac8ff', 50); } },
    },
  },
  { // ---------- MEGUMI ----------
    id: 'megumi', name: 'MEGUMI', title: 'Ten Shadows', series: 'JUJUTSU KAISEN', color: '#4a3a8a', fx: '#8a7aff',
    desc: 'Summons shikigami from his shadow.', stats: { speed: 3, power: 3, weight: 3, jump: 3 },
    ...phys({ weight: 96 }), pw: 1, rc: 1, sp: 1,
    specials: ['Divine Dogs', 'Nue', 'Nue Flight', 'Max Elephant'],
    draw: look({ skin: SKIN, top: '#101018', style: 'uniform', legs: '#101018', boots: '#0a0a0a',
      head(g, h) { dome(g, h, '#15151a'); spikes(g, h, '#15151a', 1.15); poly(g, P2(h, [[-2, -7], [2, -11], [5, -6]]), '#15151a'); } }),
    specials_: {
      n: mShot({ s: 12, e: 16, sfx: 'shadow', y: -20, vx: 9, r: 28, life: 60, dmg: 8, b: 5, g: .35, ang: 50, grav: .6, onGround: 'slide', draw: drawDog }),
      s: mShot({ s: 12, e: 16, sfx: 'zap', vx: 10, vy: -3, r: 24, life: 60, dmg: 7, b: 5, g: .3, ang: 60, draw: drawOwl }),
      u: mRise({ vy: -19, spin: 0, dmg: 3, fin: 5, pose: 'ledge', col: '#aef6ff' }),
      d: mShot({ s: 16, e: 20, sfx: 'rock', fn(f) { spawn({ owner: f.i, kind: 'elephant', x: f.x + f.face * 170, y: f.y - 420, vy: 12, grav: .3, r: 50, life: 70, dmg: 14, b: 6, g: .45, ang: -60, refl: false, onGround: 'break', draw: drawElephant }); } }),
    },
  },
  { // ---------- SUKUNA ----------
    id: 'sukuna', name: 'SUKUNA', title: 'King of Curses', series: 'JUJUTSU KAISEN', color: '#e8263a', fx: '#ff3b3b',
    desc: 'Dismantle, Cleave, and the flame arrow Fuga.', stats: { speed: 4, power: 5, weight: 3, jump: 3 },
    ...phys({ walk: 6, weight: 104 }), pw: 1.2, rc: 1.1, sp: .95,
    specials: ['Dismantle', 'Cleave', 'Rising Dismantle', 'Fuga'],
    draw: look({ skin: '#f8dcc8', eye: '#d02030', top: '#f4f0e8', style: 'kimono', top2: '#15151a', sash: '#15151a', sashW: 3, sleeve: '#f4f0e8', legs: '#f4f0e8', boots: '#222',
      head(g, h) {
        poly(g, P2(h, [[-5, -2], [-2, -6], [3, -6], [5, -4], [-1, -4], [-7, -3]]), '#f08aa8'); dome(g, h, '#f08aa8', .95);
        box(g, h.x + 2.8, h.y + 1.8, 1.3, 1, '#d02030'); limb(g, { x: h.x + 1.5, y: h.y + 1 }, { x: h.x + 5, y: h.y + 1 }, .6, '#111'); limb(g, { x: h.x + 1, y: h.y + 3.5 }, { x: h.x + 4, y: h.y + 4.5 }, .6, '#111');
      } }),
    specials_: {
      n: mShot({ s: 6, e: 14, sfx: 'swing', vx: 20, r: 18, life: 30, dmg: 6, b: 4, g: .2, ang: 35, draw: slashDraw('#ff3b3b') }),
      s: { ...mStrike({ s: 10, a: 4, e: 18, hb: [[58, -60, 36]], b: 6, g: .5, ang: 40, fx: '#ff3b3b' }), dmgFn: (f, foe) => Math.round(8 + foe.dmg * .1) },
      u: mRise({ vy: -18, col: '#ff3b3b' }),
      d: { s: 28, a: 0, e: 20, p: ['castW', 'cast'], tick(f, t) {
        if (t < 28 && t % 2) fxBurst(f.x + f.face * 30, f.y - 60, t % 4 ? FIRE : '#ffd23f', 2, 3, 12);
        if (t === 28) { SFX.play('fire'); proj(f, { kind: 'arrow', vx: 14, r: 26, life: 60, dmg: 16, b: 7, g: .5, ang: 35, draw: drawArrow }); }
      } },
    },
  },
  { // ---------- MOCHI (original) ----------
    id: 'mochi', name: 'MOCHI', title: 'Sumo Neko', color: '#ff9a3a', fx: '#ffffff',
    desc: 'A heavyweight sumo cat. Salt, slaps and stomps.', stats: { speed: 1, power: 5, weight: 5, jump: 1 },
    ...phys({ walk: 4.2, air: 4.2, jump: 14.5, djump: 12.5, grav: .85, fall: 14.5, weight: 150, hw: 70, hh: 104 }), pw: 1.3, rc: 1.1, sp: 1.08,
    body: { thigh: 5, shin: 5, torso: 13, upper: 6, fore: 6, head: 6, cy: 16 },
    poses: { jab: ['jabW', 'palm'], ftilt: ['jabW', 'palm'] },
    specials: ['Salt Throw', 'Tsuppari', 'Yokozuna Leap', 'Shiko Stomp'],
    C: { sleeve: '#ff9a3a', glove: '#fff0e0', legs: '#ff9a3a', boots: '#fff0e0', armW: 5, legW: 6, bootW: 4, bootH: 2.5, handR: 3 },
    draw(g, J, f) {
      drawRig(g, J, this.C, {
        behind(g, J) { const h = J.hip; limb(g, h, { x: h.x - 9, y: h.y - 8 + Math.sin(T * .15) * 2 }, 2.5, '#ff9a3a'); },
        torso(g, J) {
          const m = { x: (J.hip.x + J.neck.x) / 2, y: (J.hip.y + J.neck.y) / 2 + 1 };
          oval(g, m.x, m.y, 11, 10.5, '#ff9a3a'); oval(g, m.x + 3, m.y + 1, 7, 8, '#fff0e0');
          for (let i = -1; i < 2; i++) limb(g, { x: m.x - 8, y: m.y - 4 + i * 4 }, { x: m.x - 4, y: m.y - 4 + i * 4 }, 1.2, '#d86a1a');
          limb(g, { x: J.hip.x - 10, y: J.hip.y - 1 }, { x: J.hip.x + 10, y: J.hip.y - 1 }, 4, '#2a2a4a'); box(g, J.hip.x + 3, J.hip.y - 1, 2, 7, '#2a2a4a');
        },
        head(g, J) {
          const h = J.head;
          poly(g, P2(h, [[-5, -3], [-4, -10], [0, -4]]), '#ff9a3a'); poly(g, P2(h, [[1, -4], [4, -10], [5.5, -3]]), '#ff9a3a');
          oval(g, h.x + .5, h.y, 6.5, 5.5, '#ff9a3a'); oval(g, h.x + 3, h.y + 2, 3.5, 2.5, '#fff0e0');
          box(g, h.x + 2.5, h.y - 1.5, 1.5, 1.5, '#222'); box(g, h.x + 6, h.y + 1, 1.2, 1, '#ff7a9a');
          limb(g, { x: h.x + 5, y: h.y + 2.5 }, { x: h.x + 10, y: h.y + 2 }, .5, '#fff'); limb(g, { x: h.x + 5, y: h.y + 3.5 }, { x: h.x + 10, y: h.y + 4.5 }, .5, '#fff');
          oval(g, h.x - 1, h.y - 7, 2.5, 2, '#15151a');
        },
      }, f);
    },
    specials_: {
      n: mShot({ s: 10, e: 18, sfx: 'throw', fn(f) { for (let i = -2; i <= 2; i++) proj(f, { kind: 'salt', vx: 9 + Math.random() * 2, vy: i * 1.3 - 1, r: 12, life: 20, dmg: 2, b: 3, g: .05, ang: 30, draw: drawSalt }); } }),
      s: { s: 6, a: 28, e: 14, multi: 4, hb: [[55, -55, 36]], dmg: 2, b: 3, g: 0, ang: 30,
        tick(f, t) { if (t > 6 && t <= 34) { f.vx = f.face * 3.5; if (t % 4 === 1) SFX.play('swing', .3); } },
        hbAt: (f, t) => t > 6 && t <= 34 ? (t > 30 ? [[60, -55, 40, { dmg: 6, b: 7, g: .45, ang: 35 }]] : [[55, -55, 36]]) : null,
        pose: (f, t) => (t >> 1) % 2 ? POSES.palm : POSES.palm2 },
      u: mRise({ vy: -18, spin: 0, dmg: 10, fin: 10, pose: 'usmash', col: '#ffffff' }),
      d: { s: 16, a: 0, e: 22, p: ['usmashW', 'stomp'], tick(f, t) { if (t === 16) quake(f); } },
    },
  },
  { // ---------- GLITCH (original) ----------
    id: 'glitch', name: 'GLITCH', title: 'Corrupted Data', color: '#3bf0ff', fx: '#ff3bd4',
    desc: 'A digital ghost. Ctrl+Z rewinds time and damage.', stats: { speed: 4, power: 2, weight: 1, jump: 4 },
    ...phys({ walk: 6, air: 6, jump: 15.5, grav: .6, fall: 11, jumps: 2, weight: 76, hh: 100 }), pw: .9, rc: 1, sp: .9,
    specials: ['Bit Blaster', 'Lag Spike', 'Respawn Point', 'Ctrl+Z'],
    draw(g, J, f) {
      const jit = (T >> 2) % 9 === 0 ? 1.5 : 0, hip = J.hip, n = J.neck, h = J.head;
      const body = (dx, c) => {
        poly(g, [[hip.x - 6 + dx, hip.y], [hip.x + 6 + dx, hip.y], [hip.x + 3 + dx, hip.y + 11 + Math.sin(T * .2) * 2], [hip.x + dx, hip.y + 7], [hip.x - 4 + dx, hip.y + 12 + Math.cos(T * .2) * 2]], c);
        limb(g, { x: hip.x + dx, y: hip.y }, { x: n.x + dx, y: n.y }, 11, c); oval(g, h.x + dx, h.y, 6.5, 6.5, c);
        limb(g, J.A1.sh, J.A1.h, 2.5, c); limb(g, J.A2.sh, J.A2.h, 2.5, c);
      };
      body(-1.5 - jit, '#ff3bd4'); body(1.5 + jit, '#3bf0ff'); body(0, '#e8feff');
      for (let i = 0; i < 4; i++) box(g, hip.x - 5 + ((i * 5 + T) % 11), hip.y - 10 + i * 4, 2, 1, '#3bf0ff');
      box(g, h.x + 1.5, h.y - 1.5, 2, 3, '#15151a'); box(g, h.x + 4.5, h.y - 1.5, 2, 3, '#15151a'); if ((T >> 3) % 5 === 0) box(g, h.x + 1, h.y + 3, 6, 1, '#ff3bd4');
    },
    specials_: {
      n: mShot({ s: 8, e: 14, sfx: 'laser', fn(f) { for (const vy of [-1.5, 0, 1.5]) proj(f, { kind: 'bits', vx: 11, vy, r: 10, life: 40, dmg: 3, b: 3, g: .1, ang: 30, draw: drawBits }); } }),
      s: mShot({ s: 10, e: 16, sfx: 'zap', vx: 13, r: 14, life: 40, dmg: 4, b: 2, g: .05, ang: 30, freeze: 1, draw: drawBits }),
      u: mWarp({ dist: 220, col: '#ff3bd4' }),
      d: { s: 6, a: 0, e: 14, p: ['counter', 'counter'], tick(f, t) {
        if (t !== 6 || !f.hist?.length) return;
        const [x, y] = f.hist[0]; fxBurst(f.x, f.y - 50, '#ff3bd4', 14, 6); SFX.play('laser', .6);
        teleport(f, x, y); f.vx = f.vy = 0; f.dmg = Math.max(0, f.dmg - 6); f.inv = 12; fxBurst(f.x, f.y - 50, '#3bf0ff', 14, 6);
      } },
    },
  },
);
for (const ch of CHARS) if (!ch.moves || !ch.moves.nspec) buildChar(ch);
