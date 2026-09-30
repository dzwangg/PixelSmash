// Fighters: art (drawn on the shared rig), stats, normal kit, and 4 unique specials each.
// Hitboxes are [x, y, r, overrides?] in world units relative to the feet, x pointing forward.

// ---------- world-space pixel helpers for projectiles/effects ----------
// projectile / effect shape helpers (smooth; names kept from the pixel-art era)
const snap = v => v;
function pxDisc(ctx, cx, cy, r, c) { if (r <= 0) return; ctx.fillStyle = c; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill(); }
function pxRect(ctx, x, y, w, h, c) { ctx.fillStyle = c; ctx.beginPath(); ctx.roundRect(x, y, w, h, Math.min(Math.abs(w), Math.abs(h)) * .25); ctx.fill(); }

// ---------- normal attacks, scaled per character ----------
function kit(pw, rc, sp) {
  const R = hb => hb.map(([x, y, r, o]) => [x * rc, y * rc, r * rc, o]);
  const F = n => Math.max(1, Math.round(n * sp));
  const mk = (s, a, e, hb, dmg, b, g, ang, p, extra = {}) => ({ s: F(s), a, e: F(e * .85), hb: R(hb), dmg: Math.round(dmg * pw), b, g, ang, p, ...extra });
  return {
    jab:    mk(3, 3, 8,   [[42, -62, 22]], 3, 3, .12, 40, ['jabW', 'jab'], { chain: 'jab2' }),
    jab2:   mk(2, 3, 8,   [[46, -58, 22]], 3, 3, .1, 50, ['jabW', 'ftilt'], { chain: 'jab3' }),
    jab3:   mk(4, 4, 16,  [[52, -55, 30]], 5, 6, .3, 40, ['kickW', 'kick']),
    dashAtk: mk(6, 8, 16, [[40, -40, 32]], 9, 6, .3, 70, ['dash', 'dash'], { slide: 1 }),
    ftilt:  mk(6, 4, 14,  [[58, -55, 24], [30, -58, 18]], 8, 5, .35, 32, ['ftiltW', 'ftilt']),
    utilt:  mk(5, 6, 12,  [[12, -118, 28], [30, -90, 20]], 7, 8.5, .22, 88, ['utiltW', 'utilt']), // launcher: pops the foe up for juggles
    dtilt:  mk(5, 3, 10,  [[58, -10, 22]], 6, 5, .22, 75, ['dtiltW', 'dtilt']),
    fsmash: mk(14, 4, 24, [[64, -58, 30], [35, -58, 20]], 16, 4, .55, 38, ['fsmashW', 'fsmash'], { charge: 1 }),
    usmash: mk(10, 6, 22, [[0, -128, 32], [18, -98, 24]], 15, 6, .8, 88, ['usmashW', 'usmash'], { charge: 1 }),
    dsmash: mk(9, 4, 24,  [[58, -12, 26], [-58, -12, 26]], 14, 4, .48, 28, ['dsmashW', 'dsmash'], { charge: 1, away: 1 }),
    nair:   mk(4, 10, 10, [[0, -55, 48]], 8, 4, .3, 42, ['jump', 'nair'], { air: 1, ll: 6, away: 1 }),
    fair:   mk(8, 4, 14,  [[58, -62, 30]], 12, 4, .45, 40, ['fairW', 'fair'], { air: 1, ll: 10 }),
    bair:   mk(6, 4, 12,  [[-58, -50, 28]], 12, 5, .45, 140, ['bairW', 'bair'], { air: 1, ll: 8 }),
    uair:   mk(5, 5, 10,  [[5, -114, 34], [20, -82, 22]], 9, 4, .35, 85, ['uairW', 'uair'], { air: 1, ll: 6 }),
    dair:   mk(10, 4, 16, [[0, 8, 30]], 13, 4, .35, -80, ['dairW', 'dair'], { air: 1, ll: 14 }),
    grab:   mk(6, 3, 20,  [[48, -58, 26]], 0, 0, 0, 0, ['grabW', 'grab'], { grab: 1 }),
    ledgeAtk: mk(8, 4, 10, [[50, -25, 30]], 8, 6, .2, 30, ['kickW', 'kick']),
  };
}
const throws = pw => ({
  f: { dmg: Math.round(8 * pw), b: 6, g: .45, ang: 40, p: 'throwF' },
  b: { dmg: Math.round(10 * pw), b: 6, g: .5, ang: 140, p: 'throwB' },
  u: { dmg: Math.round(8 * pw), b: 6, g: .45, ang: 88, p: 'throwU' },
  d: { dmg: Math.round(6 * pw), b: 5, g: .2, ang: 75, p: 'throwD' },
});
const spinPose = (base, speed) => (f, t) => ({ ...POSES[base], rot: (t * speed) % 360 });
const stickDir = (inp, dx = 0, dy = -1) => { const m = Math.hypot(inp.x, inp.y); return m < .3 ? { x: dx, y: dy } : { x: inp.x / m, y: inp.y / m }; };
const killOwned = (f, kind) => projectiles.forEach(p => { if (p.owner === f.i && p.kind === kind) p.life = 0; });

// ---------- projectile art ----------
function drawFireball(ctx, p) {
  const fl = Math.sin(p.t * .8) * 3;
  pxDisc(ctx, p.x - p.vx * 1.5, p.y - p.vy * 1.5, 9, '#c0341d');
  pxDisc(ctx, p.x, p.y, 14 + fl, '#ff6a1f'); pxDisc(ctx, p.x + 2, p.y - 2, 9, '#ffb13b'); pxDisc(ctx, p.x + 3, p.y - 3, 4, '#fff3b0');
}
function drawBolt(ctx, p) {
  const d = Math.sign(p.vx);
  for (let i = 0; i < 6; i++) pxRect(ctx, p.x - d * i * 9, p.y + ((i + (p.t >> 1)) % 2 ? -6 : 6) * (i % 3 ? 1 : 0), 10, 6, i < 2 ? '#ffffff' : '#fff04a');
  pxDisc(ctx, p.x, p.y, 8, '#aef6ff');
}
function drawBoulder(ctx, p) {
  pxDisc(ctx, p.x, p.y, p.r, '#6b6f78'); pxDisc(ctx, p.x - 6, p.y - 6, p.r - 10, '#8a8f99');
  pxRect(ctx, p.x - 3, p.y - 12, 6, 6, '#a8adb6'); pxRect(ctx, p.x + 6, p.y + 3, 9, 3, '#4d5058'); pxRect(ctx, p.x - 12, p.y + 6, 6, 3, '#5f9e3a');
}
function drawShock(ctx, p) {
  const h = 30 + Math.sin(p.t) * 6;
  for (let i = 0; i < 4; i++) pxRect(ctx, p.x - 18 + i * 9, p.y + 15 - h * (1 - Math.abs(i - 1.5) / 3), 9, h * (1 - Math.abs(i - 1.5) / 3), i % 2 ? '#8a6a4a' : '#b08a5a');
}
function drawShard(ctx, p) {
  const d = Math.sign(p.vx);
  ctx.fillStyle = '#e8feff'; ctx.beginPath(); ctx.moveTo(snap(p.x + d * 18), snap(p.y)); ctx.lineTo(snap(p.x - d * 12), snap(p.y - 9)); ctx.lineTo(snap(p.x - d * 6), snap(p.y)); ctx.lineTo(snap(p.x - d * 12), snap(p.y + 9)); ctx.fill();
  pxRect(ctx, p.x - d * 3, p.y - 3, 9, 3, '#7fd8ff');
}
function drawOrb(ctx, p) {
  pxDisc(ctx, p.x, p.y, 17 + Math.sin(p.t * .3) * 2, '#2a0f45'); pxDisc(ctx, p.x, p.y, 12, '#8a3cff'); pxDisc(ctx, p.x, p.y, 5, '#58e08a');
  for (let i = 0; i < 3; i++) { const a = p.t * .15 + i * 2.1; pxRect(ctx, p.x + Math.cos(a) * 22, p.y + Math.sin(a) * 22, 4, 4, '#b06cff'); }
}
function drawTrap(ctx, p) {
  const open = p.t >= p.arm, bite = p.bite || 0;
  pxRect(ctx, p.x - 30, p.y + 6, 60, 6, '#2a1740');
  if (open) for (let i = -2; i <= 2; i++) pxRect(ctx, p.x + i * 12 - 3, p.y - 6 + (bite ? -12 : 0), 6, 12, i % 2 ? '#b06cff' : '#58e08a');
  if (open && (p.t >> 4) % 2) pxRect(ctx, p.x - 3, p.y - 3, 6, 6, '#58e08a');
}
function drawShot(ctx, p) {
  pxDisc(ctx, p.x, p.y, p.r + 4, '#1d6b3a'); pxDisc(ctx, p.x, p.y, p.r, '#6dff8a'); pxDisc(ctx, p.x + 2, p.y - 2, p.r * .5, '#e8ffe8');
  pxRect(ctx, p.x - Math.sign(p.vx) * (p.r + 12), p.y - 3, 12, 6, '#6dff8a');
}
function drawFist(ctx, p) {
  const d = Math.sign(p.vx);
  pxRect(ctx, p.x - d * 34, p.y - 6, 22, 12, '#ff9a2a'); pxRect(ctx, p.x - d * 44, p.y - 3, 12, 6, '#ffe07a');
  pxRect(ctx, p.x - 15, p.y - 12, 30, 24, '#8e96a3'); pxRect(ctx, p.x + d * 9 - 3, p.y - 12, 6, 24, '#6e7582');
  for (let i = 0; i < 3; i++) pxRect(ctx, p.x + d * 12, p.y - 9 + i * 7, 3, 4, '#4d535c');
}
function drawMine(ctx, p) {
  if (p.boom) { pxDisc(ctx, p.x, p.y, p.r * (1 - p.life / 6), '#ffb13b'); pxDisc(ctx, p.x, p.y, p.r * .5, '#fff3b0'); return; }
  pxDisc(ctx, p.x, p.y, 12, '#3a3f48'); pxRect(ctx, p.x - 15, p.y + 3, 30, 6, '#565c66');
  pxRect(ctx, p.x - 3, p.y - 15, 6, 6, p.t >= p.arm && (p.t >> 3) % 2 ? '#ff3b3b' : '#6b1a1a');
}

function explodeMine(p) {
  Object.assign(p, { boom: 1, inert: false, r: 80, life: 6, dmg: 13, b: 7, g: .45, ang: 70, away: 1 });
  SFX.play('boom'); fxBurst(p.x, p.y, '#ffb13b', 40, 14); shakeCam(14);
}

// ---------- the roster ----------
const CHARS = [
  { // ============ BLAZE ============
    id: 'blaze', name: 'BLAZE', title: 'Ember Knight', color: '#e8453c', fx: '#ff8a2a',
    desc: 'A balanced swordsman with a burning blade.',
    stats: { speed: 3, power: 3, weight: 3, jump: 3 },
    walk: 5.5, air: 5, jump: 16, djump: 14, grav: .75, fall: 13, jumps: 1, weight: 100, hw: 50, hh: 110,
    body: { thigh: 7, shin: 7, torso: 12, upper: 6, fore: 6, head: 6, cy: 20 },
    specials: ['Flame Orb', 'Blazing Lunge', 'Phoenix Rise', 'Ember Counter'],
    C: { sleeve: '#a82a22', fore: '#c9ccd8', glove: '#dfe2ec', legs: '#3a2838', boots: '#8a8a9e', top: '#c8322a', armW: 4, legW: 4, bootW: 3, bootH: 2, handR: 2 },
    draw(g, J, f) {
      drawRig(g, J, this.C, {
        behind(g, J, f) {
          const flow = Math.min(8, Math.abs(f.vx || 0)), w = Math.sin((f.t || 0) * .2 + T * .1) * 2;
          poly(g, [[J.neck.x - 3, J.neck.y + 1], [J.neck.x + 1, J.neck.y], [J.hip.x - 2 - flow, J.hip.y + 11 + w], [J.hip.x - 10 - flow * 1.5, J.hip.y + 8 - w]], '#7a1420');
        },
        torso(g, J) {
          limb(g, J.hip, J.neck, 10, '#c8322a');
          const m = { x: (J.hip.x + J.neck.x) / 2, y: (J.hip.y + J.neck.y) / 2 };
          limb(g, add(J.hip, { x: -3, y: -1 }), add(J.hip, { x: 4, y: -1 }), 2.5, '#f2c14e');
          oval(g, m.x + 2, m.y - 1, 2, 2.5, '#ffb13b'); limb(g, add(J.neck, { x: -3, y: 2 }), add(J.neck, { x: 3, y: 2 }), 3, '#e0e3ee');
        },
        head(g, J) {
          const h = J.head, fl = (T >> 2) % 2;
          poly(g, [[h.x - 2, h.y - 5], [h.x - 11 - fl, h.y - 11], [h.x - 6, h.y - 7], [h.x - 13, h.y - 4 + fl], [h.x - 4, h.y - 2]], '#ff6a1f');
          poly(g, [[h.x - 2, h.y - 4], [h.x - 8, h.y - 8], [h.x - 4, h.y - 3]], '#ffd23f');
          oval(g, h.x + 1, h.y, 6, 6.5, '#c8322a'); oval(g, h.x - 1, h.y - 1, 4, 4.5, '#d9453a');
          poly(g, [[h.x + 1, h.y - 1], [h.x + 7.5, h.y - 1], [h.x + 7.5, h.y + 1.5], [h.x + 1, h.y + 1.5]], '#1a0f14');
          box(g, h.x + 4, h.y - 1, 2, 1.5, '#ffd23f');
          limb(g, { x: h.x - 4, y: h.y - 6 }, { x: h.x + 3, y: h.y - 6.5 }, 1.5, '#f2c14e');
        },
        weapon(g, J, f) {
          const A = J.A1, d = dirv(A.ang + J.p.wep, 1), n = { x: d.y, y: -d.x };
          const tip = add(A.h, { x: d.x * 18, y: d.y * 18 });
          limb(g, add(A.h, { x: -d.x * 3, y: -d.y * 3 }), A.h, 2, '#6b3a1e');
          limb(g, add(A.h, { x: n.x * 3, y: n.y * 3 }), add(A.h, { x: -n.x * 3, y: -n.y * 3 }), 2, '#f2c14e');
          limb(g, add(A.h, { x: d.x * 2, y: d.y * 2 }), tip, 3, f.act === 'move' ? '#ffb347' : '#e8eef8');
          limb(g, add(A.h, { x: d.x * 3, y: d.y * 3 }), add(tip, { x: -d.x * 2, y: -d.y * 2 }), 1, '#ffffff');
        },
      }, f);
    },
    specials_: {
      n: { s: 12, a: 0, e: 18, p: ['castW', 'cast'], tick(f, t) {
        if (t === 12) { SFX.play('fire'); spawn({ owner: f.i, kind: 'fire', x: f.x + f.face * 40, y: f.y - 60, vx: f.face * 9, vy: -2, grav: .25, r: 14, life: 80, dmg: 7, b: 4, g: .25, ang: 35, onGround: 'bounce', draw: drawFireball }); }
      } },
      s: { s: 8, a: 16, e: 16, p: ['fsmashW', 'dash'], hb: [[50, -58, 28]], dmg: 10, b: 5, g: .45, ang: 35, tick(f, t) {
        if (t > 8 && t <= 24) { f.vx = f.face * 13; f.vy = 0; if (t % 2) fxBurst(f.x - f.face * 20, f.y - 55, '#ff6a1f', 2, 3); }
        if (t === 9) SFX.play('fire');
      } },
      u: { dur: 42, helpless: 1, multi: 5, dmg: 2, b: 5, g: 0, ang: 88, grav: .6,
        hbAt: (f, t) => t >= 6 && t < 30 ? (t >= 26 ? [[0, -70, 50, { dmg: 5, b: 7, g: .42, ang: 70 }]] : [[0, -70, 44]]) : null,
        tick(f, t, inp) {
          if (t === 6) { f.vy = -18; f.ground = null; SFX.play('fire'); }
          if (t > 6) f.vx = inp.x * 4;
          if (t >= 6 && t < 30) fxBurst(f.x, f.y - 40, t % 2 ? '#ff6a1f' : '#ffd23f', 2, 4);
        },
        pose: (f, t) => t < 6 ? POSES.usmashW : { ...POSES.upcut, rot: t < 30 ? (t * 36) % 360 : 0 } },
      d: { dur: 40, p: ['counter', 'counter'], tick(f, t) { f.counter = t >= 5 && t <= 26; } },
    },
  },
  { // ============ VOLT ============
    id: 'volt', name: 'VOLT', title: 'Thunder Fox', color: '#ffd23f', fx: '#fff04a',
    desc: 'Lightning-fast ninja fox. Light, but hard to catch.',
    stats: { speed: 5, power: 2, weight: 1, jump: 4 },
    walk: 7.5, air: 6, jump: 17, djump: 15, grav: .9, fall: 15.5, jumps: 1, weight: 78, hw: 46, hh: 100,
    body: { thigh: 7, shin: 7, torso: 11, upper: 6, fore: 6, head: 6, cy: 19 },
    specials: ['Thunder Bolt', 'Flash Step', 'Arc Warp', 'Static Field'],
    C: { sleeve: '#1f2440', fore: '#1f2440', glove: '#ffd23f', legs: '#1f2440', boots: '#111320', top: '#1f2440', armW: 3.5, legW: 3.5, bootW: 3, bootH: 1.6, handR: 2 },
    draw(g, J, f) {
      drawRig(g, J, this.C, {
        behind(g, J, f) {
          const h = J.hip, w = Math.sin(T * .15) * 2;
          poly(g, [[h.x, h.y - 2], [h.x - 9, h.y - 8 + w], [h.x - 6, h.y - 10 + w], [h.x - 16, h.y - 17 + w], [h.x - 10, h.y - 8 + w], [h.x - 13, h.y - 6 + w], [h.x - 2, h.y + 1]], '#ffd23f');
          poly(g, [[h.x - 16, h.y - 17 + w], [h.x - 12, h.y - 12 + w], [h.x - 11, h.y - 15 + w]], '#ffffff');
          const n = J.neck, s = Math.sin(T * .3) * 2, v = Math.min(6, Math.abs(f.vx || 0));
          poly(g, [[n.x, n.y], [n.x - 8 - v, n.y + 2 + s], [n.x - 15 - v * 1.5, n.y + s * 1.5], [n.x - 9 - v, n.y + 4 + s], [n.x, n.y + 3]], '#29c4e8');
        },
        torso(g, J) {
          limb(g, J.hip, J.neck, 8, '#1f2440');
          limb(g, add(J.hip, { x: -3, y: -1 }), add(J.hip, { x: 4, y: -1 }), 2, '#ffd23f');
          limb(g, J.neck, add(J.neck, { x: 3, y: 5 }), 2, '#ffd23f');
        },
        head(g, J) {
          const h = J.head;
          poly(g, [[h.x - 5, h.y - 3], [h.x - 5, h.y - 13], [h.x - 1, h.y - 5]], '#c9a42f');
          oval(g, h.x + 1, h.y, 6, 5.5, '#ffd23f');
          poly(g, [[h.x + 3, h.y - 1], [h.x + 11, h.y + 2], [h.x + 3, h.y + 4.5]], '#ffd23f');
          oval(g, h.x + 4, h.y + 3, 3.5, 1.8, '#fff6d8'); box(g, h.x + 10, h.y + 1, 1.5, 1.5, '#111');
          poly(g, [[h.x - 2, h.y - 4], [h.x + 1, h.y - 13], [h.x + 4, h.y - 4]], '#ffd23f');
          poly(g, [[h.x, h.y - 5], [h.x + 1, h.y - 10], [h.x + 2.5, h.y - 5]], '#1f2440');
          limb(g, { x: h.x - 5, y: h.y - 3 }, { x: h.x + 6, y: h.y - 3.5 }, 2, '#1f2440');
          box(g, h.x + 3, h.y - 1.5, 2.5, 2, '#1ad0ff'); box(g, h.x + 4.5, h.y - 1, 1, 1.5, '#111');
        },
      }, f);
    },
    specials_: {
      n: { s: 6, a: 0, e: 12, p: ['castW', 'cast'], tick(f, t) {
        if (t === 6) { SFX.play('zap'); spawn({ owner: f.i, kind: 'bolt', x: f.x + f.face * 40, y: f.y - 60, vx: f.face * 16, r: 12, life: 40, dmg: 4, b: 3, g: .12, ang: 25, draw: drawBolt }); }
      } },
      s: { s: 8, a: 1, e: 18, p: ['dash', 'dash'], dmg: 7, b: 5, g: .3, ang: 40,
        tick(f, t) {
          if (t === 9) {
            f.tx0 = f.x; f.x += f.face * 190; f.vx = f.face * 3; f.vy = Math.min(f.vy, 0); SFX.play('zap');
            for (let d = 0; d < 190; d += 12) fxBurst(f.tx0 + f.face * d, f.y - 55 + (Math.random() - .5) * 30, '#fff04a', 1, 1, 14);
          }
        },
        hbAt(f, t) { if (t !== 9) return null; const o = []; for (let d = 0; d <= 190; d += 38) o.push([(f.tx0 + f.face * d - f.x) * f.face, -55, 34]); return o; } },
      u: { dur: 30, helpless: 1, grav: 0, p: ['crouch', 'jump'], dmg: 5, b: 5, g: .25, ang: 70, away: 1,
        tick(f, t, inp) {
          if (t < 12) { f.vx *= .8; f.vy *= .8; if (t > 8) f.intang = true; }
          if (t === 12) {
            const d = stickDir(inp); fxBurst(f.x, f.y - 50, '#fff04a', 14, 6);
            teleport(f, f.x + d.x * 210, f.y + d.y * 210); f.vx = d.x * 4; f.vy = d.y * 4;
            fxBurst(f.x, f.y - 50, '#fff04a', 14, 6); SFX.play('zap');
          }
          if (t > 12) f.vy += .5;
        },
        hbAt: (f, t) => t >= 12 && t < 15 ? [[0, -55, 40]] : null,
        pose: (f, t) => t < 12 ? POSES.crouch : POSES.jump },
      d: { s: 3, a: 22, e: 12, multi: 5, hb: [[0, -55, 58]], dmg: 2, b: 4, g: .05, ang: 60, away: 1, grav: .4, p: ['spin', 'spin'],
        tick(f, t) { f.reflect = t > 3 && t <= 25; if (t % 3 === 0 && t <= 25) { fxBurst(f.x, f.y - 55, '#aef6ff', 3, 7, 10); if (t % 9 === 0) SFX.play('zap'); } } },
    },
  },
  { // ============ GROM ============
    id: 'grom', name: 'GROM', title: 'Mountain Golem', color: '#9aa0aa', fx: '#d9a066',
    desc: 'Slow living boulder. Hits like an avalanche.',
    stats: { speed: 1, power: 5, weight: 5, jump: 1 },
    walk: 4, air: 4, jump: 14.5, djump: 12.5, grav: .8, fall: 14, jumps: 1, weight: 140, hw: 66, hh: 112,
    body: { thigh: 5, shin: 6, torso: 13, upper: 8, fore: 8, head: 5, cy: 18 },
    specials: ['Boulder Toss', 'Avalanche Charge', 'Mountain Leap', 'Quake Stomp'],
    C: { sleeve: '#7d828c', fore: '#8a8f99', glove: '#9aa0aa', legs: '#6d717a', boots: '#5a5e66', top: '#8a8f99', armW: 7, legW: 7, bootW: 4.5, bootH: 3, handR: 5 },
    draw(g, J, f) {
      drawRig(g, J, this.C, {
        torso(g, J) {
          const m = { x: (J.hip.x + J.neck.x) / 2, y: (J.hip.y + J.neck.y) / 2 };
          oval(g, m.x, m.y, 11, 10.5, '#8a8f99'); oval(g, m.x - 2, m.y - 2, 8, 7, '#9aa0aa');
          oval(g, J.neck.x - 3, J.neck.y + 1, 7, 3.5, '#5f9e3a'); box(g, J.neck.x - 6, J.neck.y + 3, 2, 3, '#4a7f2c');
          limb(g, { x: m.x - 6, y: m.y + 3 }, { x: m.x - 2, y: m.y + 6 }, 1, '#5a5e66'); limb(g, { x: m.x + 4, y: m.y - 5 }, { x: m.x + 7, y: m.y - 1 }, 1, '#5a5e66');
          poly(g, [[m.x + 3, m.y - 1], [m.x + 5, m.y + 2], [m.x + 3, m.y + 5], [m.x + 1, m.y + 2]], (T >> 3) % 4 ? '#6dffb0' : '#b8ffd8');
          poly(g, [[J.neck.x - 7, J.neck.y + 2], [J.neck.x - 5, J.neck.y - 6], [J.neck.x - 3, J.neck.y + 1]], '#6dffb0');
        },
        head(g, J) {
          const h = J.head;
          poly(g, [[h.x - 4, h.y - 4], [h.x + 5, h.y - 5], [h.x + 6, h.y + 3], [h.x - 4, h.y + 4]], '#9aa0aa');
          box(g, h.x - 4, h.y - 5, 9, 2, '#5f9e3a');
          limb(g, { x: h.x, y: h.y - 2 }, { x: h.x + 6, y: h.y - 1 }, 1.2, '#4d5058');
          box(g, h.x + 2, h.y - 1, 1.5, 1.5, '#6dffb0'); box(g, h.x + 4.5, h.y - 1, 1.5, 1.5, '#6dffb0');
        },
        weapon(g, J) { const h = J.A1.h; box(g, h.x - 2, h.y - 3, 1, 2, '#6d717a'); box(g, h.x + 1, h.y - 3, 1, 2, '#6d717a'); },
      }, f);
    },
    specials_: {
      n: { s: 18, a: 0, e: 22, p: ['usmashW', 'throwF'], tick(f, t) {
        if (t === 18) { SFX.play('rock'); spawn({ owner: f.i, kind: 'rock', x: f.x + f.face * 30, y: f.y - 115, vx: f.face * 7.5, vy: -7, grav: .4, r: 26, life: 100, dmg: 13, b: 6, g: .5, ang: 40, onGround: 'break', draw: drawBoulder }); }
      } },
      s: { s: 10, a: 24, e: 18, p: ['fsmashW', 'dash'], hb: [[40, -60, 36]], dmg: 12, b: 6, g: .5, ang: 35, tick(f, t) {
        if (t > 10 && t <= 34) { f.vx = f.face * 9; f.armor = true; if (!f.ground) f.vy = Math.min(f.vy, 2); if (f.ground && t % 3 === 0) fxBurst(f.x - f.face * 30, f.y - 5, '#b8a080', 2, 3); }
        if (t === 11) SFX.play('rock');
      } },
      u: { dur: 34, helpless: 1, p: ['crouch', 'usmash'], dmg: 10, b: 6, g: .4, ang: 85,
        hbAt: (f, t) => t >= 8 && t <= 22 ? [[0, -140, 38]] : null,
        tick(f, t, inp) { if (t === 7) { f.vy = -19.5; f.vx = inp.x * 4; f.ground = null; SFX.play('rock'); } if (t > 7) f.vx += inp.x * .3; } },
      d: { s: 14, a: 0, e: 22, p: ['usmashW', 'stomp'],
        start(f) { f.plunge = !f.ground; },
        hbAt: f => f.plunge ? [[0, 0, 36, { dmg: 12, b: 5, g: .35, ang: -75 }]] : null,
        tick(f, t) {
          if (f.plunge) { f.vy = 17; f.vx *= .9; return f.t > 70 ? 'end' : 'hold'; }
          if (t === 14) quake(f);
        },
        onLand(f) { if (!f.plunge) return false; f.plunge = false; quake(f); f.mt = 14; return true; } },
    },
  },
  { // ============ PIP ============
    id: 'pip', name: 'PIP', title: 'Frost Mage', color: '#6fd3ff', fx: '#9ff3ff',
    desc: 'Tiny penguin wizard. Floaty, with 3 midair jumps.',
    stats: { speed: 2, power: 2, weight: 2, jump: 5 },
    walk: 5, air: 4.8, jump: 13.5, djump: 11.5, grav: .55, fall: 10, jumps: 3, weight: 82, hw: 50, hh: 78,
    body: { thigh: 3, shin: 3, torso: 10, upper: 4, fore: 4, head: 6, cy: 12 },
    specials: ['Ice Shard', 'Belly Slide', 'Blizzard Spin', 'Frost Mirror'],
    C: { sleeve: '#1c2238', fore: '#1c2238', glove: '#1c2238', legs: '#f39c32', boots: '#f39c32', armW: 3.5, legW: 2.5, bootW: 3.5, bootH: 1.5, handR: 1.8 },
    draw(g, J, f) {
      drawRig(g, J, this.C, {
        torso(g, J) {
          const m = { x: (J.hip.x + J.neck.x) / 2, y: (J.hip.y + J.neck.y) / 2 + 1 };
          oval(g, m.x, m.y, 8.5, 9.5, '#1c2238'); oval(g, m.x + 2.5, m.y + 1, 5.5, 7.5, '#f4f7ff');
          limb(g, add(J.neck, { x: -4, y: 1 }), add(J.neck, { x: 5, y: 1 }), 2.5, '#6fd3ff');
          poly(g, [[J.neck.x - 3, J.neck.y + 1], [J.neck.x - 8, J.neck.y + 6 + Math.sin(T * .2)], [J.neck.x - 5, J.neck.y + 7], [J.neck.x - 1, J.neck.y + 2]], '#6fd3ff');
        },
        head(g, J) {
          const h = J.head, droop = Math.sin(T * .1) * 1.5;
          oval(g, h.x, h.y, 6.5, 6, '#1c2238'); oval(g, h.x + 2.5, h.y + 1, 3.5, 3.5, '#f4f7ff');
          box(g, h.x + 3, h.y - .5, 1.5, 2, '#111'); box(g, h.x + 3, h.y - .5, .8, .8, '#fff');
          poly(g, [[h.x + 5, h.y + 1], [h.x + 10, h.y + 2.5], [h.x + 5, h.y + 4]], '#f39c32'); box(g, h.x + 1, h.y + 3, 1.5, 1, '#ff9ab0');
          poly(g, [[h.x - 8, h.y - 3], [h.x + 7, h.y - 4], [h.x + 2, h.y - 11], [h.x - 5, h.y - 17 + droop], [h.x - 11, h.y - 14 + droop], [h.x - 4, h.y - 11]], '#3355cc');
          limb(g, { x: h.x - 8, y: h.y - 3 }, { x: h.x + 7, y: h.y - 4 }, 2, '#26409e');
          box(g, h.x - 1, h.y - 9, 2, 2, '#ffd23f'); box(g, h.x - 11, h.y - 15 + droop, 2, 2, '#ffd23f');
        },
        weapon(g, J, f) {
          const A = J.A1, d = dirv(A.ang + 70, 1);
          const top = add(A.h, { x: d.x * 12, y: d.y * 12 });
          limb(g, add(A.h, { x: -d.x * 5, y: -d.y * 5 }), top, 1.5, '#8a5a2e');
          poly(g, [[top.x, top.y - 4], [top.x + 2.5, top.y], [top.x, top.y + 3], [top.x - 2.5, top.y]], f.act === 'move' ? '#ffffff' : '#9ff3ff');
        },
      }, f);
    },
    specials_: {
      n: { s: 8, a: 0, e: 16, p: ['castW', 'cast'], tick(f, t) {
        if (t === 8) { SFX.play('ice'); spawn({ owner: f.i, kind: 'ice', x: f.x + f.face * 40, y: f.y - 45, vx: f.face * 11, r: 12, life: 55, dmg: 4, b: 2, g: .08, ang: 30, freeze: 1, draw: drawShard }); }
      } },
      s: { s: 5, a: 30, e: 12, p: ['dash', 'slide'], hb: [[25, -18, 30]], dmg: 8, b: 6, g: .35, ang: 55, tick(f, t) {
        if (t > 5 && t <= 35) { f.vx = f.face * (f.ground ? 11 : 7); if (!f.ground) f.vy = Math.min(f.vy, 3); if (f.ground && t % 2) fxBurst(f.x - f.face * 20, f.y - 5, '#e8feff', 1, 3); }
      } },
      u: { dur: 40, helpless: 1, multi: 5, dmg: 2, b: 4, g: 0, ang: 90,
        hbAt: (f, t) => t > 4 && t < 34 ? (t >= 30 ? [[0, -45, 46, { dmg: 4, b: 7, g: .35, ang: 80 }]] : [[0, -45, 42]]) : null,
        tick(f, t, inp) { if (t > 4 && t < 34) { f.vy = -8.5; f.vx = inp.x * 4.5; f.ground = null; fxBurst(f.x, f.y - 40, '#e8feff', 2, 6); if (t % 8 === 5) SFX.play('ice'); } },
        pose: spinPose('spin', 40) },
      d: { s: 3, a: 24, e: 10, grav: .3, hb: [[0, -40, 48]], dmg: 3, b: 6, g: .1, ang: 50, away: 1, p: ['counter', 'spin'],
        tick(f, t) { f.reflect = t > 3 && t <= 27; if (t === 4) SFX.play('ice'); } },
    },
  },
  { // ============ NYX ============
    id: 'nyx', name: 'NYX', title: 'Hex Witch', color: '#b06cff', fx: '#b06cff',
    desc: 'Scythe-wielding witch. Hold JUMP in the air to float.',
    stats: { speed: 3, power: 3, weight: 2, jump: 3 },
    walk: 5.5, air: 5.5, jump: 15, djump: 13.5, grav: .65, fall: 12, jumps: 1, float: 90, weight: 90, hw: 46, hh: 110,
    body: { thigh: 7, shin: 7, torso: 12, upper: 6, fore: 6, head: 5.5, cy: 20 },
    specials: ['Hex Orb', 'Reaper Spin', 'Bat Swarm', 'Shadow Snare'],
    C: { sleeve: '#3d2257', fore: '#3d2257', glove: '#d9ccf0', legs: '#20152e', boots: '#20152e', top: '#4a2a6b', armW: 3.5, legW: 3.5, bootW: 3, bootH: 1.6, handR: 1.8 },
    draw(g, J, f) {
      drawRig(g, J, this.C, {
        behind(g, J, f) {
          const h = J.head, v = Math.min(5, Math.abs(f.vx || 0)), w = Math.sin(T * .12) * 1.5;
          poly(g, [[h.x - 4, h.y - 3], [h.x + 2, h.y - 4], [h.x - 3, h.y + 6], [h.x - 9 - v, h.y + 14 + w], [h.x - 12 - v, h.y + 8 + w]], '#cfd6f2');
        },
        torso(g, J) {
          const h = J.hip, s = Math.sin(T * .1) * 1.5;
          poly(g, [[h.x - 4, h.y - 2], [h.x + 4, h.y - 2], [h.x + 9 + s, h.y + 10], [h.x - 10 + s, h.y + 10]], '#2e1a44');
          limb(g, { x: h.x - 10 + s, y: h.y + 10 }, { x: h.x + 9 + s, y: h.y + 10 }, 1.5, '#58e08a');
          limb(g, J.hip, J.neck, 8, '#4a2a6b'); limb(g, add(J.neck, { x: -2, y: 3 }), add(J.hip, { x: 2, y: -2 }), 1, '#58e08a');
        },
        head(g, J) {
          const h = J.head;
          oval(g, h.x + .5, h.y + .5, 4.5, 5, '#d9ccf0');
          poly(g, [[h.x - 5, h.y - 3], [h.x + 5, h.y - 4], [h.x + 5, h.y - 1], [h.x + 1, h.y - 2], [h.x - 4, h.y + 3]], '#cfd6f2');
          box(g, h.x + 2.5, h.y, 1.5, 1.5, '#58e08a'); box(g, h.x + 3, h.y + 3, 1.5, .8, '#8a3c6a');
          oval(g, h.x, h.y - 4, 10, 2, '#2a1740');
          poly(g, [[h.x - 5, h.y - 4], [h.x + 5, h.y - 5], [h.x + 1, h.y - 12], [h.x - 5, h.y - 17], [h.x - 9, h.y - 15], [h.x - 3, h.y - 12]], '#2a1740');
          limb(g, { x: h.x - 5, y: h.y - 6 }, { x: h.x + 4.5, y: h.y - 6.5 }, 1.5, '#58e08a');
        },
        weapon(g, J, f) {
          const A = J.A1, d = dirv(A.ang + 60 + J.p.wep, 1), n = { x: d.y, y: -d.x };
          const tip = add(A.h, { x: d.x * 15, y: d.y * 15 });
          limb(g, add(A.h, { x: -d.x * 8, y: -d.y * 8 }), tip, 1.5, '#4a3328');
          poly(g, [[tip.x, tip.y], [tip.x + n.x * 12 - d.x * 5, tip.y + n.y * 12 - d.y * 5], [tip.x + n.x * 8 - d.x * 1, tip.y + n.y * 8 - d.y * 1], [tip.x + d.x * 2, tip.y + d.y * 2]], f.act === 'move' ? '#d8ffe8' : '#9fe8c0');
        },
      }, f);
    },
    specials_: {
      n: { s: 14, a: 0, e: 14, p: ['castW', 'cast'], tick(f, t) {
        if (t === 14) {
          killOwned(f, 'orb'); SFX.play('shadow');
          spawn({ owner: f.i, kind: 'orb', x: f.x + f.face * 40, y: f.y - 60, vx: f.face * 4, r: 16, life: 150, dmg: 8, b: 5, g: .3, ang: 45, draw: drawOrb,
            tick(p) { const t = fighters[1 - p.owner]; const dx = t.x - p.x, dy = t.y - 55 - p.y, m = Math.hypot(dx, dy) || 1; p.vx = p.vx * .96 + dx / m * .25; p.vy = p.vy * .96 + dy / m * .25; } });
        }
      } },
      s: { s: 6, a: 30, e: 14, multi: 6, dmg: 2, b: 3, g: 0, ang: 30,
        hbAt: (f, t) => t > 6 && t <= 36 ? (t > 30 ? [[0, -55, 56, { dmg: 6, b: 6, g: .42, ang: 40 }]] : [[0, -55, 52]]) : null,
        tick(f, t) { if (t > 6 && t <= 36) { f.vx = f.face * 5.5; if (!f.ground) f.vy = Math.min(f.vy, 1.5); if (t % 10 === 7) SFX.play('swing', 1); } },
        pose: (f, t) => t <= 6 ? POSES.fsmashW : { ...POSES.spin, rot: t <= 36 ? (t * 30) % 360 : 0 } },
      u: { dur: 44, helpless: 1, grav: 0, p: ['counter', 'jump'], dmg: 7, b: 6, g: .35, ang: 70, away: 1,
        hbAt: (f, t) => t >= 34 && t < 38 ? [[0, -55, 46]] : null,
        tick(f, t, inp) {
          if (t < 8) { f.vx *= .8; f.vy *= .8; }
          if (t === 8) { f.batDir = stickDir(inp); SFX.play('shadow'); fxBurst(f.x, f.y - 55, '#2a1740', 16, 6); }
          if (t >= 8 && t < 34) { f.vx = f.batDir.x * 11; f.vy = f.batDir.y * 11; f.bats = true; f.intang = true; f.ground = null; }
          if (t === 34) { f.vx *= .3; f.vy = -2; fxBurst(f.x, f.y - 55, '#b06cff', 16, 6); }
          if (t > 34) f.vy += .5;
        } },
      d: { s: 12, a: 0, e: 14, p: ['stomp', 'stomp'], tick(f, t) {
        if (t === 12) {
          killOwned(f, 'trap'); SFX.play('shadow');
          spawn({ owner: f.i, kind: 'trap', x: f.x + f.face * 30, y: f.y - 10, vy: f.ground ? 0 : 4, grav: .5, r: 34, life: 600, onGround: 'stop', refl: false, inert: true, arm: 30,
            dmg: 10, b: 6, g: .45, ang: 85, away: 1, draw: drawTrap,
            tick(p) { if (p.t === p.arm) p.inert = false; }, onHit(p) { p.bite = 1; p.life = 10; SFX.play('shadow'); } });
        }
      } },
    },
  },
  { // ============ RUSTY ============
    id: 'rusty', name: 'RUSTY', title: 'Scrap Mech', color: '#ff9a2a', fx: '#6dff8a',
    desc: 'Arm-cannon robot with a jetpack and mines.',
    stats: { speed: 2, power: 4, weight: 4, jump: 2 },
    walk: 4.8, air: 4.8, jump: 14.5, djump: 13, grav: .8, fall: 14, jumps: 1, weight: 115, hw: 54, hh: 114,
    body: { thigh: 6, shin: 7, torso: 12, upper: 6, fore: 7, head: 7, cy: 20 },
    specials: ['Plasma Charge', 'Rocket Fist', 'Jetpack', 'Proximity Mine'],
    C: { sleeve: '#6e7582', fore: '#6e7582', glove: '#8e96a3', legs: '#6e7582', boots: '#c96a22', top: '#d9772b', armW: 3.5, legW: 4, bootW: 4, bootH: 2.2, handR: 2.2 },
    draw(g, J, f) {
      const up = J.up, n = { x: -up.y, y: up.x };
      const rect = (c, w, h, col) => poly(g, [[c.x - n.x * w - up.x * h, c.y - n.y * w - up.y * h], [c.x + n.x * w - up.x * h, c.y + n.y * w - up.y * h], [c.x + n.x * w + up.x * h, c.y + n.y * w + up.y * h], [c.x - n.x * w + up.x * h, c.y - n.y * w + up.y * h]], col);
      drawRig(g, J, this.C, {
        behind(g, J, f) {
          const c = add({ x: (J.hip.x + J.neck.x) / 2, y: (J.hip.y + J.neck.y) / 2 }, { x: n.x * 6, y: n.y * 6 });
          rect(c, 3.5, 6, '#565c66'); rect(add(c, { x: -up.x * 7, y: -up.y * 7 }), 2.5, 1.5, '#3a3f48');
          if (f.jet || (f.vy < -8 && f.act === 'air')) {
            const b = add(c, { x: -up.x * 9, y: -up.y * 9 }), fl = 4 + (T % 3) * 2;
            poly(g, [[b.x - 2.5, b.y], [b.x + 2.5, b.y], [b.x - up.x * fl, b.y - up.y * fl]], '#ff9a2a');
            poly(g, [[b.x - 1.2, b.y], [b.x + 1.2, b.y], [b.x - up.x * fl * .5, b.y - up.y * fl * .5]], '#ffe07a');
          }
        },
        torso(g, J) {
          const c = { x: (J.hip.x + J.neck.x) / 2, y: (J.hip.y + J.neck.y) / 2 };
          rect(c, 6.5, 6.5, '#d9772b'); rect(add(c, { x: -n.x * 2, y: -n.y * 2 }), 3, 4, '#e8914a');
          box(g, c.x + 2, c.y - 2, 2, 2, (T >> 4) % 2 ? '#6dff8a' : '#2f8a44');
          box(g, c.x - 5, c.y - 5, 1, 1, '#7a3a12'); box(g, c.x - 5, c.y + 4, 1, 1, '#7a3a12');
        },
        head(g, J, f) {
          const h = add(J.head, { x: 0, y: 1 });
          limb(g, { x: h.x - 2, y: h.y - 6 }, { x: h.x - 4, y: h.y - 12 }, 1, '#8e96a3'); box(g, h.x - 5, h.y - 14, 2.5, 2.5, (T >> 4) % 2 ? '#ff3b3b' : '#8a1a1a');
          rect(h, 6.5, 5.5, '#d9772b'); rect(add(h, { x: 1.5, y: 0 }), 4.5, 3.8, '#10261a');
          const e = '#6dff8a';
          if (f.act === 'hurt' || f.act === 'dizzy') { limb(g, { x: h.x + 1, y: h.y - 2 }, { x: h.x + 3, y: h.y }, .8, e); limb(g, { x: h.x + 3, y: h.y - 2 }, { x: h.x + 1, y: h.y }, .8, e); limb(g, { x: h.x + 4, y: h.y - 2 }, { x: h.x + 6, y: h.y }, .8, e); limb(g, { x: h.x + 6, y: h.y - 2 }, { x: h.x + 4, y: h.y }, .8, e); }
          else if (f.act === 'move') { poly(g, [[h.x + 1, h.y - 2], [h.x + 3.5, h.y - .5], [h.x + 1, h.y]], e); poly(g, [[h.x + 6.5, h.y - 2], [h.x + 4, h.y - .5], [h.x + 6.5, h.y]], e); }
          else { const bl = (T % 150) < 6; box(g, h.x + 1, h.y - (bl ? .5 : 2), 2, bl ? 1 : 2.5, e); box(g, h.x + 4.5, h.y - (bl ? .5 : 2), 2, bl ? 1 : 2.5, e); }
        },
        frontArm(g, J, f) {
          const A = J.A1, d = dirv(A.ang, 1);
          limb(g, A.sh, A.el, 3.5, '#6e7582');
          const end = add(A.h, { x: d.x * 3, y: d.y * 3 });
          limb(g, A.el, end, 6, '#8e96a3'); limb(g, add(A.el, { x: d.x * 3, y: d.y * 3 }), add(A.el, { x: d.x * 4, y: d.y * 4 }), 6.5, '#d9772b');
          const glow = (f.store || 0) / 90;
          oval(g, end.x, end.y, 2 + glow * 2, 2 + glow * 2, glow > .99 && (T >> 2) % 2 ? '#ffffff' : '#6dff8a');
        },
      }, f);
    },
    specials_: {
      n: { dur: 999, p: ['castW', 'cast'],
        start(f) { f.shot = (f.store >= 90 || !f.ground) ? 'fire' : 'charge'; f.shotT = 0; },
        tick(f, t, inp) {
          if (f.shot === 'charge') {
            if (inp.s) return 'end'; // shield keeps the stored charge
            if (inp.b) { if (f.store < 90) f.store++; if (T % 8 === 0) SFX.play('charge', f.store / 90); return; }
            f.shot = 'fire';
          }
          if (!f.shotT) f.shotT = t;
          if (t === f.shotT + 4) {
            const c = f.store; f.store = 0; SFX.play('laser', 1 - c / 180);
            spawn({ owner: f.i, kind: 'shot', x: f.x + f.face * 50, y: f.y - 62, vx: f.face * 12, r: 10 + c / 6, life: 80, dmg: Math.round(4 + c * .2), b: 3 + c / 20, g: .1 + c / 250, ang: 35, draw: drawShot });
            f.vx -= f.face * c / 30;
          }
          if (t >= f.shotT + 20) return 'end';
        },
        pose: f => f.shot === 'charge' ? POSES.castW : POSES.cast },
      s: { s: 10, a: 0, e: 20, p: ['fsmashW', 'jab'], tick(f, t) {
        if (t === 10) { SFX.play('laser', .5); spawn({ owner: f.i, kind: 'fist', x: f.x + f.face * 45, y: f.y - 62, vx: f.face * 13, r: 16, life: 32, dmg: 9, b: 5, g: .35, ang: 35, draw: drawFist, tick(p) { if (p.t % 2) fxBurst(p.x - p.vx * 3, p.y, '#9aa0aa', 1, 1, 16); } }); }
      } },
      u: { dur: 52, helpless: 1, grav: .3, multi: 6, dmg: 2, b: 3, g: 0, ang: -70, p: ['jump', 'fall'],
        hbAt: (f, t) => t > 4 && t <= 46 ? [[-8, 12, 26]] : null,
        tick(f, t, inp) { if (t > 4 && t <= 46) { f.vy = Math.max(f.vy - 1.4, -9.5); f.vx += (inp.x * 6 - f.vx) * .15; f.jet = true; f.ground = null; fxBurst(f.x - f.face * 18, f.y - 20, t % 2 ? '#ff9a2a' : '#ffe07a', 1, 2, 14); if (t % 10 === 5) SFX.play('fire'); } } },
      d: { s: 8, a: 0, e: 14, p: ['stomp', 'throwD'], tick(f, t) {
        if (t === 8) {
          killOwned(f, 'mine'); SFX.play('grab');
          spawn({ owner: f.i, kind: 'mine', x: f.x - f.face * 10, y: f.y - 20, vy: -2, grav: .5, r: 14, life: 420, onGround: 'stop', refl: false, inert: true, arm: 25, draw: drawMine,
            tick(p) { if (p.boom) return; const t = fighters[1 - p.owner]; if ((p.t >= p.arm && Math.hypot(t.x - p.x, t.y - 50 - p.y) < 70) || p.life <= 3) explodeMine(p); } });
        }
      } },
    },
  },
];

// build final move tables
const POWER = { blaze: 1, volt: .85, grom: 1.3, pip: .9, nyx: 1, rusty: 1.05 };
const REACH = { blaze: 1.2, volt: .95, grom: 1.15, pip: .85, nyx: 1.3, rusty: 1 };
const SPEED = { blaze: 1, volt: .75, grom: 1.15, pip: .95, nyx: 1.05, rusty: 1.1 };
function buildChar(ch) {
  const pw = ch.pw ?? POWER[ch.id];
  ch.moves = kit(pw, ch.rc ?? REACH[ch.id], ch.sp ?? SPEED[ch.id]);
  ch.throws = throws(pw);
  for (const k in ch.specials_) ch.moves[k + 'spec'] = Object.assign({ s: 1, a: 0, e: 1, dmg: 0, b: 0, g: 0, ang: 40, special: 1 }, ch.specials_[k]);
  for (const [k, p] of Object.entries(ch.poses || {})) ch.moves[k] = { ...ch.moves[k], p }; // per-character normal animations
  ch.series ??= 'ORIGINAL';
}
CHARS.forEach(buildChar);

function quake(f) {
  SFX.play('rock'); shakeCam(12); fxBurst(f.x, f.y - 5, '#b8a080', 20, 8);
  for (const d of [-1, 1]) spawn({ owner: f.i, kind: 'wave', x: f.x + d * 40, y: f.y - 15, vx: d * 10, r: 28, life: 26, dmg: 9, b: 5, g: .35, ang: 75, refl: false, draw: drawShock,
    tick(p) { if (groundAt(p.x, p.y + 15) === null) p.life = 0; } });
}
