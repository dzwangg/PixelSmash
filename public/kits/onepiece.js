// Kit overrides: onepiece (see KIT_API guide). Every top-level name is prefixed op_.

// ================= shared helpers =================
const op_foe = f => fighters[1 - f.i];
const op_touch = (f, x, y, r) => { const foe = op_foe(f); return canBeHit(foe) && foe.act !== 'shield' && circleRect(x, y, r, hurtbox(foe)) ? foe : null; };
const op_mine = (f, kind) => projectiles.filter(p => p.owner === f.i && p.kind === kind && p.life > 0);
// invisible per-fighter timer: a hitless projectile whose tick runs logic (status decay, delayed hits, cleanup)
function op_timer(f, kind, life, o = {}) { killOwned(f, kind); spawn({ owner: f.i, kind, x: f.x, y: f.y, r: 1, life, inert: true, refl: false, stopped: true, draw() {}, ...o }); }
function op_line(x1, y1, x2, y2, w, c) { ctx.lineCap = 'round'; ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }

// ================= LUFFY =================
const op_gear = f => f.buff?.op_gear || 0;
// rubber arm from the shoulder to world point (x, y)
function op_arm(f, x, y, r = 10, fist = SKIN) {
  const G = SC(f), sx = f.x + f.face * 10 * G, sy = f.y - 68 * G;
  op_line(sx, sy, x, y, 9 * G, '#c99a70'); op_line(sx, sy, x, y, 5 * G, SKIN);
  pxDisc(ctx, x, y, r * G, fist === SKIN ? '#e8b890' : fist); pxDisc(ctx, x - f.face * 3, y - 3, r * .6 * G, fist);
}
// Gum-Gum Pistol (tap) / Bazooka (hold). Gear 2 -> Jet (instant), Gear 3 -> Giant (huge, armored windup)
const op_pistol = {
  dur: 999, grav: .5,
  start(f) { f.op_r0 = 0; f.op_bz = 0; },
  tick(f, t, inp) {
    const g = op_gear(f), s = g === 2 ? 3 : g === 3 ? 16 : 8;
    if (!f.op_r0) {
      if (g === 3) f.armor = true;
      if (t > s + 6 && t % 5 === 0) fxBurst(f.x - f.face * 20, f.y - 60, '#fff6a0', 2, 2, 10);
      if (t < s || (inp.b && t < s + 45)) return;
      const bz = t > s + 6, k = Math.min(1, (t - s - 6) / 38);
      f.op_r0 = t; f.op_bz = bz;
      f.op_P = bz ? { L: g === 3 ? 170 : 150, r: g === 3 ? 44 : 26, dmg: Math.round(10 + k * 6 + (g === 3 ? 4 : 0)), b: 6, g: .5, ang: 38 }
        : g === 2 ? { L: 240, r: 22, dmg: 7, b: 5, g: .28, ang: 35 }
        : g === 3 ? { L: 200, r: 46, dmg: 16, b: 6, g: .5, ang: 35 }
        : { L: 230, r: 22, dmg: 8, b: 5, g: .3, ang: 30 };
      SFX.play(bz || g === 3 ? 'boom' : 'throw');
      const nm = (g === 2 ? 'JET ' : g === 3 ? 'GIANT ' : '') + (bz ? 'BAZOOKA!' : 'PISTOL!');
      if (bz || g) popText(f.x, f.y - 150, nm, g === 2 ? '#ff8a8a' : '#ffd0a0');
      return;
    }
    if (t >= f.op_r0 + 14 + (f.op_bz ? 14 : 6)) return 'end';
  },
  hbAt(f, t) {
    if (!f.op_r0) return null;
    const k = t - f.op_r0, P = f.op_P; if (k < 1 || k > 8) return null;
    const L = P.L * Math.min(1, k / (op_gear(f) === 2 ? 1 : 4));
    return f.op_bz ? [[L, -76, P.r, P], [L, -50, P.r, P]] : [[L, -66, P.r, P]];
  },
  drawFx(f, t) {
    if (!f.op_r0) return;
    const k = t - f.op_r0, P = f.op_P, G = SC(f);
    const L = (k <= 4 ? P.L * Math.min(1, k / (op_gear(f) === 2 ? 1 : 4)) : k <= 8 ? P.L : P.L * Math.max(0, 1 - (k - 8) / 6)) * G;
    const col = op_gear(f) === 3 ? '#e8b890' : SKIN;
    if (f.op_bz) { op_arm(f, f.x + f.face * L, f.y - 76 * G, P.r * .8, col); op_arm(f, f.x + f.face * L, f.y - 50 * G, P.r * .8, col); }
    else op_arm(f, f.x + f.face * L, f.y - 66 * G, P.r * .8, col);
  },
  pose: (f, t) => !f.op_r0 ? (t > 10 ? POSES.fsmashW : POSES.jabW) : f.op_bz ? POSES.bazooka : POSES.pistolS,
};
// Gum-Gum Rocket: fling both hands forward; they latch onto the foe (slingshot into him) or a ledge (recovery)
const op_rocket = {
  dur: 999, grav: .3, dmg: 10, b: 7, g: .2, ang: 78,
  start(f) { f.op_hook = null; f.op_done = 0; f.op_L = 0; },
  tick(f, t) {
    const h = f.op_hook;
    if (h) {
      const tx = h.foe ? h.foe.x : h.x, ty = h.foe ? h.foe.y - 55 : h.y - 20, dx = tx - f.x, dy = ty - (f.y - 55), d = Math.hypot(dx, dy) || 1;
      if (f.op_done || t > h.t + 22 || (!h.foe && d < 40) || (h.foe && !canBeHit(h.foe) && d < 60)) {
        if (!h.foe) { f.vx = h.dir * 5; f.vy = -13; f.ground = null; }
        return 'end';
      }
      f.vx = dx / d * 24; f.vy = dy / d * 24; f.ground = null; if (h.foe) f.face = Math.sign(dx) || f.face;
      if (t % 2) fxBurst(f.x - f.vx, f.y - 55, '#ffd0a0', 1, 1, 10);
      return;
    }
    if (t <= 6) return;
    const out = t <= 18, step = op_gear(f) === 2 ? 34 : 26;
    f.op_L = out ? Math.min(300, (t - 6) * step) : Math.max(0, 300 - (t - 18) * 30);
    if (!out) return t > 30 ? 'end' : undefined;
    const hx = f.x + f.face * f.op_L, hy = f.y - 60;
    const foe = op_touch(f, hx, hy, 24);
    if (foe) { f.op_hook = { foe, t }; SFX.play('grab'); popText(f.x, f.y - 150, 'GUM-GUM ROCKET!', '#ffd0a0'); return; }
    if (!f.ground) for (const L of ledges()) if (L.dir === f.face && Math.abs(hx - L.x) < 40 && Math.abs(hy - L.y) < 80) { f.op_hook = { x: L.x, y: L.y, dir: L.dir, t }; SFX.play('grab'); return; }
  },
  hbAt: (f) => f.op_hook?.foe && !f.op_done ? [[25, -55, 38]] : null,
  onHit(f) { f.op_done = 1; f.vx = -f.face * 4; f.vy = -9; f.ground = null; shakeCam(6); },
  drawFx(f) {
    const h = f.op_hook; let x, y;
    if (h) { x = h.foe ? h.foe.x : h.x; y = h.foe ? h.foe.y - 55 : h.y - 10; }
    else if (f.op_L > 0) { x = f.x + f.face * f.op_L; y = f.y - 60; } else return;
    op_arm(f, x, y - 8, 9); op_arm(f, x, y + 8, 9);
  },
  pose: (f, t) => f.op_hook ? { ...POSES.dash, a1: [95, 0], a2: [90, 0] } : t <= 6 ? POSES.fsmashW : POSES.bazooka,
};
// Gear Fourth: Boundman -- bounce up, jump = rebound (x2), B = Kong Gun
const op_boundman = {
  dur: 110, helpless: 1, grav: .45, dmg: 6, b: 6, g: .15, ang: 85,
  start(f) { f.op_bnc = 2; f.op_kong = 0; },
  tick(f, t, inp, E) {
    if (t === 6) { f.vy = -17; f.ground = null; SFX.play('djump'); fxRing(f.x, f.y, '#c0142a', 40); popText(f.x, f.y - 150, 'GEAR FOURTH!', '#ff5a5a'); }
    if (t > 6 && !f.op_kong) f.vx = inp.x * 6;
    if (t % 3 === 0) fxBurst(f.x + (Math.random() - .5) * 60, f.y - 60, '#ffffff', 1, 1, 14);
    if (t > 10 && !f.op_kong && E('j') && f.op_bnc > 0) { f.op_bnc--; f.vy = -14; SFX.play('djump'); fxRing(f.x, f.y, '#c0142a', 40); }
    if (t > 12 && !f.op_kong && E('b')) { f.op_kong = t; f.hitDone = false; f.vx *= .3; f.vy = Math.min(f.vy, -2); SFX.play('boom'); popText(f.x, f.y - 150, 'KONG GUN!', '#ff5a5a'); }
    if (f.op_kong && t >= f.op_kong + 18) return 'end';
  },
  hbAt(f, t) {
    if (f.op_kong) { const k = t - f.op_kong; return k > 5 && k <= 9 ? [[95, -60, 46, { dmg: 16, b: 6, g: .55, ang: 40 }]] : null; }
    return t >= 6 && t < 14 ? [[0, -45, 46]] : null;
  },
  drawFx(f, t) {
    const G = SC(f);
    pxDisc(ctx, f.x - f.face * 18 * G, f.y - 70 * G, 12 * G, '#1a1a1a'); // haki-coated shoulders
    if (f.op_kong) { const k = t - f.op_kong, L = k <= 5 ? 20 : k <= 12 ? 95 : 40; pxDisc(ctx, f.x + f.face * L * G, f.y - 60 * G, 34 * G, '#1a1a1a'); pxDisc(ctx, f.x + f.face * (L + 8) * G, f.y - 66 * G, 14 * G, '#c0142a'); }
  },
  pose: (f, t) => f.op_kong ? (t - f.op_kong <= 5 ? POSES.fsmashW : POSES.pistolS) : { tl: 12, y: Math.sin(t * .4) * 2, a1: [100, 70], a2: [80, 70], l1: [50, 70], l2: [-30, 60] },
};
// Gear shift: off -> Second (speed, steam, Jet moves) -> Third (giant fists, slow) -> off. Leaving Third shrinks him.
const op_gearShift = {
  s: 14, a: 0, e: 12, p: ['stomp', 'victory'],
  tick(f, t) {
    if (t < 14) { if (t % 3 === 0) fxBurst(f.x, f.y - 55, '#ffffff', 2, 3, 12); return; }
    if (t !== 14) return;
    const g = op_gear(f);
    if (g === 0) { f.buff = { t: 600, spd: 1.3, pow: 1, col: '#ff8a8a', op_gear: 2 }; popText(f.x, f.y - 150, 'GEAR SECOND!', '#ff8a8a'); SFX.play('fire'); }
    else if (g === 2) { f.buff = { t: 420, spd: .85, pow: 1.15, col: '#f0d0a8', op_gear: 3 }; popText(f.x, f.y - 150, 'GEAR THIRD!', '#ffd0a0'); SFX.play('counter'); }
    else { f.buff = null; }
    fxRing(f.x, f.y - 55, '#ffffff', 60); fxBurst(f.x, f.y - 55, '#ffffff', 14, 6);
    if (!owned(f, 'op_gear')) op_timer(f, 'op_gear', 10, { tick(p) {
      const o = fighters[p.owner], g = op_gear(o);
      if (!g) { if (p.g === 3 && o.act !== 'dead') { o.shrink = 150; popText(o.x, o.y - 120, 'DEFLATED...', '#ffd0a0'); } p.life = 0; return; }
      p.g = g; p.life = 10;
      if (g === 2 && T % 3 === 0) particles.push({ x: o.x + (Math.random() - .5) * 40, y: o.y - 20 - Math.random() * 80, vx: 0, vy: -2.5, life: 22, max: 22, c: '#ffffff', sz: PX * 2 });
    } });
  },
};
KITS.luffy = {
  desc: 'Rubber limbs with real reach. Shift Gears: 2nd = Jet speed, 3rd = giant fists.',
  specials: ['Gum-Gum Pistol', 'Gum-Gum Rocket', 'Gear 4: Boundman', 'Gear Shift 2nd/3rd'],
  specials_: { n: op_pistol, s: op_rocket, u: op_boundman, d: op_gearShift },
  normals: {
    grab: { s: 6, a: 4, e: 24, hb: [[95, -58, 24]], drawFx: (f, t) => { if (t > 3 && t <= 12) op_arm(f, f.x + f.face * 95 * Math.min(1, (t - 3) / 3) * SC(f), f.y - 58 * SC(f), 8); } },
    dair: { s: 9, a: 4, e: 16, hb: [[0, 25, 26], [0, 65, 28]], dmg: 12, b: 4, g: .35, ang: -80, // Gum-Gum Stamp: legs stretch down
      drawFx: (f, t) => { if (t > 8 && t <= 16) { const G = SC(f), L = (t <= 13 ? 75 : 40) * G; op_line(f.x, f.y - 30 * G, f.x, f.y + L, 9 * G, '#3a6ad8'); pxRect(ctx, f.x - 12 * G, f.y + L, 24 * G, 9 * G, '#8a5a2a'); } } },
  },
};

// ================= ZORO =================
function op_drawPhoenix(ctx, p) {
  const d = Math.sign(p.vx) || 1, w = Math.sin(p.t * .5) * 14;
  ctx.fillStyle = '#8affb8'; ctx.beginPath(); ctx.moveTo(p.x + d * 40, p.y); ctx.lineTo(p.x - d * 20, p.y - 44 - w); ctx.lineTo(p.x - d * 8, p.y); ctx.lineTo(p.x - d * 20, p.y + 44 + w); ctx.fill();
  slashDraw('#3aa05a', '#ffffff')(ctx, p); pxDisc(ctx, p.x + d * 22, p.y - 4, 8, '#ffffff');
}
function op_pound(f, n) {
  const L = [{ r: 16, vx: 13, dmg: 4, b: 4, g: .06, ang: 35, life: 30, nm: '36 POUND CANNON' }, { r: 22, vx: 14, dmg: 5, b: 4, g: .08, ang: 35, life: 30, nm: '72 POUND CANNON' },
    { r: 38, vx: 11, dmg: 11, b: 6, g: .48, ang: 40, life: 46, nm: '108 POUND PHOENIX!' }][n - 1];
  SFX.play(n === 3 ? 'boom' : 'swing'); popText(f.x, f.y - 130 - n * 20, L.nm, '#bfffd8'); fxBurst(f.x + f.face * 40, f.y - 60, '#bfffd8', 4 * n, 4);
  proj(f, { kind: 'op_pound', ...L, y: -62, draw: n === 3 ? op_drawPhoenix : slashDraw('#8affb8') });
}
// Pound Ho chain: press B again for 72, then 108 Pound Phoenix
const op_poundHo = {
  dur: 999, grav: .6,
  start(f) { f.op_n = 0; f.op_last = 0; f.op_end = 30; },
  tick(f, t, inp, E) {
    if (t === 10) { f.op_n = 1; f.op_last = t; op_pound(f, 1); }
    else if (f.op_n && f.op_n < 3 && t > f.op_last + 6 && E('b')) { f.op_n++; f.op_last = t; f.op_end = t + (f.op_n === 3 ? 26 : 20); op_pound(f, f.op_n); }
    if (t >= f.op_end) return 'end';
  },
  pose: (f, t) => t - f.op_last < 6 && f.op_n ? { ...POSES.fsmash, rot: f.op_n === 2 ? -10 : 0 } : POSES.fsmashW,
};
// Oni Giri: dash straight through; the cut lands a beat later when the swords are sheathed
const op_oniGiri = {
  dur: 30, grav: 0,
  start(f) { f.op_cut = 0; },
  tick(f, t) {
    if (t === 9) SFX.play('swing');
    if (t > 8 && t <= 20) {
      f.vx = f.face * 17; f.vy = 0;
      const foe = !f.op_cut && op_touch(f, f.x + f.face * 20, f.y - 55, 40);
      if (foe) {
        f.op_cut = 1; setAct(foe, 'hurt'); foe.stun = 24; foe.launch = 0; foe.vx = f.face * 1; foe.vy = 0; foe.hitFlash = 4; SFX.play('hit', .4);
        op_timer(f, 'op_cut', 34, { foe, dir: f.face, tick(p) {
          const z = fighters[p.owner], v = p.foe; p.x = v.x; p.y = v.y - 55;
          if (p.t === 20 && canBeHit(v)) { popText(v.x, v.y - 150, 'ONI GIRI!', '#bfffd8'); SFX.play('counter'); applyHit(z, v, { dmg: 12, b: 6, g: .3, ang: 78 }, p.dir, v.x, v.y - 55); }
        }, draw(ctx, p) { if (p.t < 20) return; const k = (34 - p.t) * 3; for (const [a, c] of [[-1, '#bfffd8'], [1, '#ffffff'], [0, '#3aa05a']]) op_line(p.x - k * 2, p.y + a * k, p.x + k * 2, p.y - a * k, 6, c); } });
      }
    } else if (t > 20) f.vx *= .7;
  },
  drawFx(f, t) { if (t > 8 && t <= 22) for (const [dy, c] of [[-72, '#ffffff'], [-55, '#bfffd8'], [-38, '#ffffff']]) op_line(f.x - f.face * 150, f.y + dy, f.x + f.face * 20, f.y + dy, 4, c); },
  pose: (f, t) => t <= 8 ? { ...POSES.crouch, a1: [60, 120], a2: [40, 120] } : { ...POSES.dash, a1: [100, 0], a2: [80, 0] },
};
// Tatsumaki: rising tornado that drags the foe in and carries him up
const op_tatsumaki = {
  dur: 44, helpless: 1, grav: .5, multi: 5, dmg: 2, b: 3, g: 0, ang: 90,
  tick(f, t, inp) {
    if (t === 5) { f.vy = -15; f.ground = null; SFX.play('swing'); popText(f.x, f.y - 150, 'TATSUMAKI!', '#bfffd8'); }
    if (t > 5) f.vx = inp.x * 3.5;
    if (t >= 5 && t < 32) {
      const foe = op_foe(f);
      if (canBeHit(foe) && Math.abs(foe.x - f.x) < 150 && foe.y - f.y < 120 && f.y - foe.y < 220) { foe.x += (f.x - foe.x) * .15; if (foe.act === 'hurt') foe.vy = Math.min(foe.vy, f.vy); }
    }
  },
  hbAt: (f, t) => t >= 5 && t < 32 ? (t >= 28 ? [[0, -70, 58, { dmg: 6, b: 7, g: .42, ang: 80 }]] : [[0, -70, 52]]) : null,
  drawFx(f, t) {
    if (t < 5 || t >= 34) return;
    for (let i = 0; i < 5; i++) { ctx.strokeStyle = i % 2 ? '#bfffd8' : '#ffffffcc'; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(f.x, f.y - 20 - i * 26, 30 + i * 9, 9, 0, t * .5 + i, t * .5 + i + 4); ctx.stroke(); }
  },
  pose: (f, t) => t < 5 ? POSES.usmashW : { ...POSES.spin, rot: t < 32 ? (t * 40) % 360 : 0 },
};
// Lost Again: Zoro vanishes and reappears the OPPOSITE way you hold (neutral = backwards), slashing on arrival
const op_lost = {
  dur: 36, helpless: 1, grav: (f, t) => t < 14 ? .1 : 1, dmg: 9, b: 6, g: .35, ang: 45, away: 1,
  tick(f, t, inp) {
    if (t < 14) { f.vx *= .8; f.vy *= .8; if (t > 6) f.intang = true; if (t === 4) popText(f.x, f.y - 150, 'THIS WAY!', '#bfffd8'); return; }
    if (t !== 14) return;
    const d = stickDir(inp, f.face, 0);
    fxBurst(f.x, f.y - 55, '#bfffd8', 14, 6);
    teleport(f, f.x - d.x * 230, f.y - d.y * 230); f.vx = -d.x * 3; f.vy = 0;
    const foe = op_foe(f); f.face = Math.sign(foe.x - f.x) || f.face;
    fxBurst(f.x, f.y - 55, '#bfffd8', 14, 6); SFX.play('shadow'); popText(f.x, f.y - 150, '...WHERE AM I?', '#ffffff');
  },
  hbAt: (f, t) => t >= 15 && t < 19 ? [[0, -55, 54]] : null,
  pose: (f, t) => t < 14 ? POSES.crouch : t < 20 ? { ...POSES.spin, rot: t * 45 } : POSES.fall,
};
KITS.zoro = {
  desc: 'Santoryu. Chain Pound Cannons, delayed Oni Giri cuts, and a hopeless sense of direction.',
  specials: ['Pound Ho 36/72/108', 'Oni Giri', 'Tatsumaki', 'Lost Again'],
  specials_: { n: op_poundHo, s: op_oniGiri, u: op_tatsumaki, d: op_lost },
};

// ================= SANJI =================
const op_hot = (f, d) => Math.min(Math.max(d, 18), Math.round(d * (1 + Math.min(100, f.op_heat || 0) / 200))); // ponytail: heat bonus capped at the 18-dmg guideline
function op_burn(f, foe) {
  if ((f.op_heat || 0) < 15) return;
  f.op_heat = Math.max(0, f.op_heat - 25); SFX.play('fire', .6); fxBurst(foe.x, foe.y - 55, FIRE, 14, 7); fxBurst(foe.x, foe.y - 55, '#ffd23f', 8, 5);
}
function op_heatUp(f, n) {
  const was = f.op_heat || 0; f.op_heat = Math.min(100, was + n);
  if (was < 100 && f.op_heat >= 100) popText(f.x, f.y - 150, 'DIABLE JAMBE!', FIRE);
  if (!owned(f, 'op_heat')) op_timer(f, 'op_heat', 10, {
    tick(p) { const o = fighters[p.owner]; if (o.act === 'dead') o.op_heat = 0; o.op_heat = Math.max(0, (o.op_heat || 0) - .04); if (o.op_heat <= 0) p.life = 0; else p.life = 10; p.x = o.x; p.y = o.y; },
    draw(ctx, p) {
      const o = fighters[p.owner], h = o.op_heat || 0; if (['dead', 'out'].includes(o.act)) return;
      if (T % Math.max(1, 6 - (h / 20 | 0)) === 0) particles.push({ x: o.x + (Math.random() - .5) * 36, y: o.y - Math.random() * 40, vx: 0, vy: -1.5, life: 16, max: 16, c: Math.random() < .5 ? FIRE : '#ffd23f', sz: PX * 2 });
      const y = o.y - o.ch.hh - 50; pxRect(ctx, o.x - 30, y, 60, 6, '#2a1010'); pxRect(ctx, o.x - 30, y, 60 * h / 100, 6, h >= 100 ? '#ffd23f' : FIRE);
    } });
}
const op_hotN = { dmgFn: f => op_hot(f, f.move.dmg), onHit: op_burn };
// Diable Jambe: hold B to spin on one leg and build heat (all his special kicks + fsmash/fair/bair burn hotter)
const op_diable = {
  dur: 999, grav: .3, multi: 8, dmg: 1, b: 3, g: 0, ang: 60,
  start(f) { f.op_end = 0; },
  tick(f, t, inp) {
    if (!f.op_end && (t > 100 || (t > 14 && !inp.b))) f.op_end = t + 10;
    if (f.op_end) return t >= f.op_end ? 'end' : undefined;
    op_heatUp(f, 1.4); f.vx *= .9;
    if (t % 8 === 0) SFX.play('fire', .3);
  },
  hbAt: (f, t) => !f.op_end && t > 4 ? [[0, -30, 44]] : null,
  pose: (f, t) => f.op_end ? POSES.idle : { ...POSES.kick, l1: [(t >> 2) % 2 ? 88 : -88, 0], a1: [120, 20], a2: [-120, 20] },
};
// Party Table Kick Course: handstand spinning kicks that carry forward; last kick launches up
const op_party = {
  s: 8, a: 26, e: 14, multi: 5, dmg: 2, b: 3, g: 0, ang: 50, grav: .4,
  dmgFn: (f) => op_hot(f, f.mt > 30 ? 6 : 2), onHit: (f, foe) => { if (f.mt > 30) op_burn(f, foe); },
  hbAt: (f, t) => t > 8 && t <= 34 ? (t > 30 ? [[0, -40, 62, { b: 7, g: .32, ang: 85 }]] : [[0, -38, 58]]) : null,
  tick(f, t) { if (t > 8 && t <= 34) { f.vx = f.face * 5; if (t % 4 === 1) SFX.play('swing', .3); if (f.op_heat > 15) fxBurst(f.x + (Math.random() - .5) * 110, f.y - 10 - Math.random() * 40, FIRE, 1, 2, 10); } },
  pose: (f, t) => t <= 8 ? POSES.crouch : { tl: 0, y: 4, a1: [178, 0], a2: [182, 0], l1: [(t * 37) % 180 - 90, 0], l2: [(t * 37 + 90) % 180 - 90, 0], rot: 180 },
};
// Sky Walk: kick off the air in any upward direction (3 per airtime); stomps the foe below
const op_skywalk = {
  dur: 18, airUses: 3, dmg: 4, b: 5, g: .1, ang: 80,
  dmgFn: f => op_hot(f, 4), onHit: op_burn,
  hbAt: (f, t) => t >= 3 && t < 9 ? [[0, 5, 30]] : null,
  tick(f, t, inp) {
    if (t !== 3) return;
    const d = stickDir(inp), dx = d.x, dy = Math.min(d.y, -.35), m = Math.hypot(dx, dy);
    f.vx = dx / m * 13; f.vy = dy / m * 15; f.ground = null; if (dx) f.face = Math.sign(dx);
    SFX.play('djump'); fxRing(f.x, f.y, '#ffffff', 26); fxBurst(f.x, f.y, '#ffffff', 5, 3, 12);
  },
  pose: (f, t) => ({ ...POSES.djump, rot: t * 20 }),
};
// Concasse: somersault up, then a heel-drop meteor (bounces grounded foes up)
const op_concasse = {
  dur: 70, dmg: 12, b: 5, g: .35, ang: -80,
  dmgFn: f => op_hot(f, 12), onHit: op_burn,
  start(f) { f.op_l = 0; },
  tick(f, t) {
    if (t === 6) { f.vy = f.ground ? -12 : -6; f.ground = null; f.vx = f.face * 4; SFX.play('jump'); }
    if (t === 20) { f.vy = 17; f.vx = f.face * 2; SFX.play('swing'); }
    if (t > 20 && f.ground && !f.op_l) { f.op_l = t; shakeCam(6); fxBurst(f.x + f.face * 20, f.y, f.op_heat > 15 ? FIRE : '#e8e0d0', 12, 6); SFX.play('rock'); }
    if (f.op_l && t >= f.op_l + 10) return 'end';
  },
  hbAt: (f, t) => t > 20 && !f.op_l ? [[18, -5, 36]] : null,
  pose: (f, t) => t <= 6 ? POSES.crouch : t <= 20 ? { ...POSES.djump, rot: (t - 6) * 26 } : f.op_l ? POSES.crouch : { ...POSES.kickHigh, rot: 70 },
};
KITS.sanji = {
  desc: 'Kicks only. Spin Diable Jambe to build heat; heated kicks hit harder and burn.',
  specials: ['Diable Jambe', 'Party Table Kick', 'Sky Walk', 'Concasse'],
  specials_: { n: op_diable, s: op_party, u: op_skywalk, d: op_concasse },
  normals: { fsmash: op_hotN, fair: op_hotN, bair: op_hotN },
};

// ================= NAMI =================
function op_cloud(f, x, y) {
  const cs = op_mine(f, 'op_cloud'); if (cs.length >= 2) cs[0].life = 0;
  spawn({ owner: f.i, kind: 'op_cloud', x, y, r: 30, life: 720, inert: true, refl: false, stopped: true,
    tick(p) { p.y += Math.sin(p.t * .05) * .3; if (p.t % 40 === 0) fxBurst(p.x + (Math.random() - .5) * 50, p.y + 10, '#fff04a', 1, 2, 8); },
    draw(ctx, p) { drawCloud(ctx, { ...p, t: p.life < 90 && p.t % 8 < 4 ? 0 : 25 }); } });
  fxBurst(x, y, '#8a8aa8', 10, 4);
}
function op_drawBolt(ctx, p) {
  let x = p.x, y = p.cy;
  for (let i = 0; y < p.y; i++) { const nx = p.x + (Math.random() - .5) * 36, ny = Math.min(p.y, y + 34); op_line(x, y, nx, ny, 9, i % 2 ? '#fff04a' : '#ffffff'); x = nx; y = ny; }
  pxDisc(ctx, p.x, p.y, 18, '#fff6a0');
}
// Thunderbolt Tempo: no cloud -> make a thundercloud overhead; clouds present -> every cloud strikes lightning
const op_tempo = {
  s: 12, a: 0, e: 18, p: ['castW', 'victory'],
  tick(f, t) {
    if (t !== 12) return;
    const cs = op_mine(f, 'op_cloud');
    if (!cs.length) { op_cloud(f, f.x + f.face * 40, f.y - 260); SFX.play('shadow'); popText(f.x, f.y - 150, 'DARK CLOUD TEMPO', '#c8c8e8'); return; }
    SFX.play('zap'); flash = 3; popText(f.x, f.y - 150, 'THUNDERBOLT TEMPO!', '#fff04a');
    for (const c of cs) { c.life = 0; spawn({ owner: f.i, kind: 'op_bolt', x: c.x, y: c.y + 20, cy: c.y, vy: 30, r: 26, life: 16, dmg: 12, b: 7, g: .38, ang: 88, refl: false, draw: op_drawBolt }); }
  },
};
// Heat Ball / Cool Ball alternate. Heat hovers, Cool flies; when they touch they fuse into a thundercloud.
function op_ball(f) {
  const heat = f.op_ball = !f.op_ball;
  const other = heat ? 'op_cool' : 'op_heat';
  proj(f, { kind: heat ? 'op_heat' : 'op_cool', vx: heat ? 4.5 : 10, vy: heat ? -.4 : 0, r: 16, life: heat ? 120 : 60, refl: false,
    dmg: 3, b: heat ? 5 : 3, g: .08, ang: heat ? 75 : 30, slow: heat ? 0 : 100,
    tick(p) {
      if (p.kind === 'op_heat') { p.vx *= .96; p.vy *= .95; }
      const q = projectiles.find(q => q.owner === p.owner && q.kind === other && q.life > 0 && Math.hypot(q.x - p.x, q.y - p.y) < 50);
      if (q) { p.life = q.life = 0; op_cloud(fighters[p.owner], (p.x + q.x) / 2, (p.y + q.y) / 2 - 20); popText(p.x, p.y - 60, 'WEATHER TEMPO!', '#fff04a'); SFX.play('zap', .6); }
    },
    draw(ctx, p) { const hot = p.kind === 'op_heat', c = hot ? '#ff8a3a' : '#6ad8ff'; pxDisc(ctx, p.x, p.y, p.r + Math.sin(p.t * .3) * 2, c + '88'); pxDisc(ctx, p.x, p.y, p.r * .6, hot ? '#ffd23f' : '#e8feff'); pxRect(ctx, p.x - 4, p.y - 8, 4, 4, '#ffffff'); } });
  SFX.play(heat ? 'fire' : 'ice', .5); popText(f.x, f.y - 150, heat ? 'HEAT BALL' : 'COOL BALL', heat ? '#ff8a3a' : '#6ad8ff');
}
// Milky Road: ride a cloud in any direction (steerable); leaves a thundercloud where you started
const op_milky = {
  dur: 44, helpless: 1, grav: (f, t) => t < 30 ? 0 : 1, dmg: 4, b: 5, g: .15, ang: 80,
  tick(f, t, inp) {
    if (t === 4) { op_cloud(f, f.x, f.y - 10); SFX.play('shadow'); }
    if (t >= 4 && t < 30) { const d = stickDir(inp); f.vx += (d.x * 11 - f.vx) * .25; f.vy += (d.y * 11 - f.vy) * .25; if (f.vy < 0) f.ground = null; }
  },
  hbAt: (f, t) => t >= 4 && t < 30 ? [[0, 0, 34]] : null,
  drawFx(f, t) { if (t < 30) drawCloud(ctx, { x: f.x, y: f.y + 6, t: 0 }); },
  pose: (f, t) => t < 30 ? POSES.stomp : POSES.helpless,
};
// Mirage Tempo: turn invisible (and untouchable) and leave a mirage; touching it leaves the foe dizzy
const op_mirage = {
  dur: 18, p: ['counter', 'counter'],
  tick(f, t) {
    if (t !== 4) return;
    killOwned(f, 'op_mirage'); SFX.play('shadow'); fxBurst(f.x, f.y - 55, '#ffffff', 14, 5); popText(f.x, f.y - 150, 'MIRAGE TEMPO', '#ffffff');
    const c = renderSprite({ ch: f.ch, i: f.i, act: 'stand', vx: 0, face: f.face }, full(POSES.idle), null, true);
    spawn({ owner: f.i, kind: 'op_mirage', x: f.x, y: f.y, face: f.face, c, r: 30, life: 180, inert: true, refl: false, stopped: true,
      tick(p) { const foe = fighters[1 - p.owner];
        if (p.t > 10 && canBeHit(foe) && Math.abs(foe.x - p.x) < 50 && Math.abs(foe.y - p.y) < 60) {
          p.life = 0; setAct(foe, 'dizzy'); foe.stun = 45; foe.vx = 0; fxBurst(p.x, p.y - 55, '#ffffff', 20, 7); fxRing(p.x, p.y - 55, '#fff04a', 50); SFX.play('zap'); popText(p.x, p.y - 150, 'FATA MORGANA!', '#fff04a');
        } },
      draw(ctx, p) { blit(p.c, p.x + Math.sin(p.t * .3) * 3, p.y, PX, p.face, .55 + Math.sin(p.t * .2) * .2); } });
    f.stealth = 75;
  },
};
KITS.nami = {
  desc: 'Set up the weather, then strike. Clouds from Dark Cloud, fused Heat+Cool balls, or Milky Road.',
  specials: ['Thunderbolt Tempo', 'Heat & Cool Ball', 'Milky Road', 'Mirage Tempo'],
  specials_: { n: op_tempo, s: mShot({ s: 10, e: 14, fn: op_ball }), u: op_milky, d: op_mirage },
};

// ================= USOPP =================
// Kabuto: hold B to pull the slingshot (tilt stick to aim); full charge = Fire Bird Star
const op_kabuto = {
  dur: 999, grav: .6,
  start(f) { f.op_c = 0; f.op_rel = 0; f.op_aim = 0; },
  tick(f, t, inp) {
    if (!f.op_rel) {
      if (t > 6 && inp.b && f.op_c < 60) { f.op_c++; f.op_aim = clamp(-inp.y, -.7, 1) * 40; if (f.op_c === 60) { SFX.play('charge'); fxRing(f.x, f.y - 60, '#ff6a1f', 40); } return; }
      if (t <= 6) return;
      f.op_rel = t;
      const k = f.op_c / 60, full = f.op_c >= 60, sp = 13 + k * 7, a = f.op_aim * D2R;
      spawn({ owner: f.i, kind: 'op_shot', x: f.x + f.face * 40, y: f.y - 65, vx: Math.cos(a) * sp * f.face, vy: -Math.sin(a) * sp, r: full ? 22 : 9 + k * 6, life: 60,
        dmg: full ? 15 : Math.round(4 + k * 8), b: full ? 6 : 3 + k * 2, g: full ? .5 : .12 + k * .25, ang: 35, draw: full ? drawFirebird : drawPellet });
      SFX.play(full ? 'fire' : 'throw'); if (full) popText(f.x, f.y - 150, 'FIRE BIRD STAR!', '#ff6a1f');
      return;
    }
    if (t >= f.op_rel + 12) return 'end';
  },
  drawFx(f, t) {
    if (f.op_rel || t <= 6) return;
    const a = f.op_aim * D2R, x = f.x + f.face * 40, y = f.y - 65;
    for (let i = 1; i < 6; i++) pxRect(ctx, x + Math.cos(a) * i * 26 * f.face, y - Math.sin(a) * i * 26, 6, 6, f.op_c >= 60 ? '#ff6a1f' : '#ffffffaa');
  },
  pose: (f, t) => f.op_rel ? POSES.cast : { ...POSES.castW, a1: [90 + f.op_aim, 0], a2: [80 + f.op_aim, 100] },
};
// Trick Star pouch: cycles Tabasco (dizzy) -> Rotten Egg (reversed controls) -> Caltrops (floor spikes)
const op_trickNames = ['TABASCO STAR', 'ROTTEN EGG STAR', 'CALTROP STAR'];
function op_trick(f) {
  const k = f.op_trick = ((f.op_trick ?? -1) + 1) % 3;
  popText(f.x, f.y - 150, op_trickNames[k], ['#ff3b3b', '#c8d860', '#c0c0c8'][k]); SFX.play('throw');
  const stunned = foe => foe.act === 'hurt';
  if (k === 0) proj(f, { kind: 'op_tabasco', vx: 14, r: 11, life: 40, dmg: 3, b: 3, g: .05, ang: 40,
    draw: (ctx, p) => { pxDisc(ctx, p.x, p.y, 10, '#d02020'); pxRect(ctx, p.x - 2, p.y - 12, 4, 5, '#2a8a2a'); },
    onHit(p, foe) { p.life = 0; if (!stunned(foe)) return; setAct(foe, 'dizzy'); foe.stun = 40; foe.vx = 0; popText(foe.x, foe.y - 150, 'HOT!! T_T', '#ff3b3b'); } });
  if (k === 1) proj(f, { kind: 'op_egg', vx: 9, vy: -5, grav: .35, r: 13, life: 60, dmg: 2, b: 3, g: .05, ang: 45, onGround: 'break',
    draw: (ctx, p) => { pxDisc(ctx, p.x, p.y, 11, '#f0ecd8'); pxRect(ctx, p.x - 3, p.y - 3, 4, 4, '#a0b040'); },
    onHit(p, foe) { p.life = 0; fxBurst(p.x, p.y, '#a0b040', 12, 4); if (!stunned(foe)) return; foe.invert = 150; popText(foe.x, foe.y - 150, 'STINKY! (REVERSED)', '#c8d860'); } });
  if (k === 2) for (const vx of [4, 6.5, 9]) proj(f, { kind: 'op_caltrop', vx, vy: -6, grav: .4, r: 12, life: 360, dmg: 4, b: 5, g: .1, ang: 80, refl: false, onGround: 'stop', away: 1,
    draw: (ctx, p) => { pxRect(ctx, p.x - 9, p.y - 3, 18, 6, '#8a8a98'); pxRect(ctx, p.x - 3, p.y - 9, 6, 18, '#c0c0c8'); } });
}
// Pop Green: Trampolia -- a springy plant that bounces anyone who steps on it (foes get popped up)
function op_tramp(f) {
  killOwned(f, 'op_tramp');
  spawn({ owner: f.i, kind: 'op_tramp', x: f.x, y: f.y, r: 1, life: 420, inert: true, refl: false, grav: f.ground ? 0 : .6, stopped: !!f.ground, onGround: 'stop', cd: [0, 0, 0], sq: 0,
    tick(p) {
      if (p.sq > 0) p.sq--;
      for (const g of fighters) {
        if (['dead', 'out', 'respawn', 'ledge', 'held', 'hold', 'climb', 'final', 'locked'].includes(g.act) || p.cd[g.i] > p.t) continue;
        if (Math.abs(g.x - p.x) > 44 || g.y < p.y - 20 || g.y > p.y + 16 || g.vy < 0) continue;
        p.cd[g.i] = p.t + 24; p.sq = 8; SFX.play('djump'); fxBurst(p.x, p.y - 10, '#4fbf3a', 8, 5);
        if (g.i === p.owner) { g.vy = -21; g.ground = null; if (g.act !== 'move') setAct(g, 'air'); }
        else if (canBeHit(g)) { applyHit(fighters[p.owner], g, { dmg: 4, b: 9, g: .08, ang: 90 }, 1, g.x, g.y - 20); popText(g.x, g.y - 150, 'BOING!', '#4fbf3a'); }
      }
    },
    draw(ctx, p) {
      const s = p.sq > 0 ? 6 : 0;
      pxRect(ctx, p.x - 3, p.y - 14 + s, 6, 14 - s, '#2f7a2a'); pxRect(ctx, p.x - 40, p.y - 20 + s, 80, 9, '#4fbf3a');
      pxRect(ctx, p.x - 30, p.y - 26 + s, 60, 6, '#ff8ac0'); pxDisc(ctx, p.x, p.y - 30 + s, 10, '#ffd23f');
      if (p.life < 60 && p.t % 6 < 3) pxRect(ctx, p.x - 40, p.y - 20, 80, 3, '#ffffff');
    } });
}
const op_trampMove = {
  dur: 30, helpless: 1, p: ['crouch', 'jump'],
  tick(f, t) { if (t === 6) { op_tramp(f); const p = owned(f, 'op_tramp'); if (p) p.cd[f.i] = 24; f.vy = -21; f.ground = null; SFX.play('djump'); popText(f.x, f.y - 150, 'POP GREEN: TRAMPOLIA', '#4fbf3a'); } },
};
// Impact Dial: absorb hits (no knockback, half the damage refunded), then press ↓B again to release them
const op_dialHit = {
  s: 8, a: 4, e: 22, hb: [[52, -60, 34]], dmg: 10, b: 7, g: .5, ang: 40, p: ['jabW', 'palm'],
  dmgFn: f => f.op_dmg,
  start(f) { const d = owned(f, 'op_dial'); f.op_dmg = Math.min(20, Math.round(6 + (d?.store || 0) * 1.2)); if (d) d.life = 0; },
  tick(f, t) { if (t === 9) { SFX.play('boom'); popText(f.x, f.y - 150, 'IMPACT!', '#ffd23f'); f.dmg += 3; f.vx = -f.face * 6; fxBurst(f.x + f.face * 50, f.y - 60, '#ffd23f', 16, 8); shakeCam(8); } },
};
const op_dial = {
  dur: 34, p: ['counter', 'counter'],
  alt(f) { if (!owned(f, 'op_dial')) return false; startMove(f, op_dialHit); return true; },
  tick(f, t) {
    if (t !== 3) return;
    f.iced = { store: 0, t: 999, op: 1 }; SFX.play('counter', .5);
    op_timer(f, 'op_dialT', 24, { tick(p) {
      const o = fighters[p.owner]; p.x = o.x; p.y = o.y;
      if (!o.iced?.op) { p.life = 0; return; }
      if (p.life > 1 && o.act === 'move' && o.move === o.ch.moves.dspec) { if (p.t % 4 === 0) fxRing(o.x + o.face * 30, o.y - 60, '#ffd23f', 20); return; }
      const s = o.iced.store; o.iced = null; p.life = 0;
      if (s <= 0) return;
      o.dmg = Math.max(0, o.dmg - Math.round(s * .5));
      popText(o.x, o.y - 150, `DIAL STORED ${s}`, '#ffd23f');
      spawn({ owner: o.i, kind: 'op_dial', x: o.x, y: o.y, store: s, r: 1, life: 900, inert: true, refl: false, stopped: true,
        tick(q) { const u = fighters[q.owner]; if (u.act === 'dead') q.life = 0; q.x = u.x; q.y = u.y - u.ch.hh - 55; },
        draw(ctx, q) { pxDisc(ctx, q.x, q.y, 12, '#f0d8a0'); pxDisc(ctx, q.x, q.y, 6, '#c08a40'); text(String(q.store), q.x + 24, q.y, 10, '#ffd23f'); } });
    } });
  },
  drawFx(f, t) { if (f.iced?.op) { pxDisc(ctx, f.x + f.face * 30, f.y - 60, 16, '#f0d8a0'); pxDisc(ctx, f.x + f.face * 30, f.y - 60, 8, '#c08a40'); } },
};
KITS.usopp = {
  desc: 'Trickster sniper: charge Kabuto shots, swap trick ammo, plant trampolines, store hits in a Dial.',
  specials: ['Kabuto Charge Shot', 'Trick Star Pouch', 'Pop Green: Trampolia', 'Impact Dial'],
  specials_: { n: op_kabuto, s: mShot({ s: 10, e: 16, fn: op_trick }), u: op_trampMove, d: op_dial },
  normals: {
    // Usopp Hammer: a giant "5t" mallet overhead smash
    fsmash: { s: 16, a: 4, e: 26, hb: [[72, -46, 34], [45, -95, 22]], dmg: 17, b: 5, g: .55, ang: 40, charge: 1, p: ['usmashW', 'fsmash'],
      drawFx(f, t) {
        const th = (t <= 16 ? -60 : Math.min(110, -60 + (t - 16) * 45)) * D2R, G = SC(f);
        const px = f.x + f.face * 8 * G, py = f.y - 72 * G, hx = px + Math.sin(th) * 70 * G * f.face, hy = py - Math.cos(th) * 70 * G;
        op_line(px, py, hx, hy, 6 * G, '#8a5a2a');
        ctx.save(); ctx.translate(hx, hy); ctx.rotate(th * f.face); ctx.fillStyle = '#6a4a2a'; ctx.fillRect(-26 * G, -16 * G, 52 * G, 32 * G); ctx.fillStyle = '#c68a5a'; ctx.fillRect(-22 * G, -12 * G, 44 * G, 24 * G); ctx.restore();
        text('5t', hx, hy, 10, '#ffffff');
      } },
  },
};
