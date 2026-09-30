// Kit overrides: demonslayer (see KIT_API guide). Every top-level name is prefixed ds_.
// Tanjiro: Water/Sun stance toggle. Zenitsu: iaido charge + sleep meter. Nezuko: blood marks + size shift + box.
// Rengoku: spirit grows with his own damage %, launcher -> dive follow-up.

// ================= shared helpers =================
const DS_SUN = '#ff7a1a', DS_BOLT = '#fff04a', DS_PINK = '#ff4f9a';
const ds_foe = f => fighters[1 - f.i];

// Persistent inert "follower" projectile = per-frame hook for passives (meters, timers) + world-space HUD.
// ponytail: re-spawned lazily from every move start; the 40-projectile cap can evict it, the next move brings it back.
function ds_ensure(f) {
  if (projectiles.some(p => p.kind === 'ds_aura' && p.ds_f === f)) return;
  spawn({ owner: f.i, kind: 'ds_aura', ds_f: f, x: f.x, y: f.y - 1, r: 1, life: 1e9, inert: true, refl: false, stopped: true,
    tick(p) {
      const g = p.ds_f; if (fighters[g.i] !== g) { p.life = 0; return; }
      p.x = g.x; p.y = g.y - 1; p.life = 1e9;
      DS_PASSIVE[g.ch.id]?.(g);
    },
    draw(ctx, p) { const g = p.ds_f; if (!['dead', 'out', 'respawn'].includes(g.act)) DS_HUD[g.ch.id]?.(g); } });
}
// every normal gets ds_ensure as its start hook so the passive is alive from the first action
const DS_NORMALS = ['jab', 'jab2', 'jab3', 'dashAtk', 'ftilt', 'utilt', 'dtilt', 'fsmash', 'usmash', 'dsmash', 'nair', 'fair', 'bair', 'uair', 'dair', 'grab', 'ledgeAtk'];
const ds_normals = (over = {}) => Object.fromEntries(DS_NORMALS.map(n => [n, { start: ds_ensure, ...over[n] }]));

// hitboxes along a world-space line (for dash-cuts / teleports)
function ds_line(f, x0, y0, x1, y1, r, ov) {
  const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / (r * 1.1))), o = [];
  for (let i = 0; i <= n; i++) o.push([(x0 + (x1 - x0) * i / n - f.x) * f.face, y0 + (y1 - y0) * i / n - f.y, r, ov]);
  return o;
}
function ds_bolt(x0, y0, x1, y1, col, w, a = 1) {
  const n = 8, dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
  const pts = [[x0, y0]];
  for (let i = 1; i < n; i++) { const o = (Math.random() - .5) * 26; pts.push([x0 + dx * i / n + nx * o, y0 + dy * i / n + ny * o]); }
  pts.push([x1, y1]);
  ctx.globalAlpha = a; ctx.lineJoin = 'round';
  for (const [c, lw] of [[col, w], ['#ffffff', w / 3]]) { ctx.strokeStyle = c; ctx.lineWidth = lw; ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke(); }
  ctx.globalAlpha = 1;
}
function ds_bar(f, k, col, y = 0) {
  const x = f.x - 27, yy = f.y - f.ch.hh * SC(f) - 52 - y;
  pxRect(ctx, x - 3, yy - 3, 60, 12, '#000000aa'); pxRect(ctx, x, yy, 54 * Math.max(0, Math.min(1, k)), 6, col);
}
// burn: damage-over-time follower stuck to the foe (1% every 20 frames)
function ds_burn(att, foe, n = 4, col = FIRE) {
  const old = projectiles.find(p => p.kind === 'ds_burn' && p.ds_foe === foe);
  if (old) { old.ds_n = Math.max(old.ds_n, n); return; }
  spawn({ owner: att.i, kind: 'ds_burn', ds_foe: foe, ds_n: n, ds_col: col, x: foe.x, y: foe.y - 1, r: 1, life: 1e9, inert: true, refl: false, stopped: true,
    tick(p) {
      const g = p.ds_foe; if (fighters[g.i] !== g || ['dead', 'out', 'respawn'].includes(g.act)) { p.life = 0; return; }
      p.x = g.x; p.y = g.y - 1; p.life = 1e9;
      if (p.t % 20 === 0) { g.dmg = Math.min(999, g.dmg + 1); fighters[p.owner].stats.dealt++; g.hudShake = 4; if (--p.ds_n <= 0) p.life = 0; }
    },
    draw(ctx, p) { const g = p.ds_foe; for (let i = 0; i < 3; i++) pxDisc(ctx, g.x + Math.sin(T * .3 + i * 2) * 18, g.y - 30 - i * 25 - (T * 2 + i * 13) % 20, 8 - i * 2, i % 2 ? '#ffd23f' : p.ds_col); } });
}
function ds_drawFlame(ctx, p) {
  const h = 22 + Math.sin(p.t * .5 + p.x) * 6, k = Math.min(1, p.life / 20);
  ctx.globalAlpha = k;
  pxRect(ctx, p.x - 15, p.y + 6 - h * .6, 30, h * .6 + 6, '#ff4a1a'); pxRect(ctx, p.x - 9, p.y + 6 - h, 18, h, FIRE); pxRect(ctx, p.x - 4, p.y + 6 - h * .7, 8, h * .6, '#ffd23f');
  ctx.globalAlpha = 1;
}
// burning ground patch that re-arms every 40 frames
function ds_fireTile(f, x, y, life = 100) {
  spawn({ owner: f.i, kind: 'ds_fire', x, y: y - 12, r: 22, life, stopped: true, refl: false, dmg: 3, b: 4, g: .04, ang: 80, draw: ds_drawFlame,
    onHit(p, foe) { ds_burn(fighters[p.owner], foe, 3); p.ds_re = p.t + 40; }, tick(p) { if (p.inert && p.t >= p.ds_re) p.inert = false; } });
}
function ds_fireWaves(f, dmg = 6) {
  SFX.play('rock'); shakeCam(8); fxBurst(f.x, f.y - 5, FIRE, 18, 7);
  for (const d of [-1, 1]) spawn({ owner: f.i, kind: 'ds_wave', x: f.x + d * 40, y: f.y - 15, vx: d * 9, r: 26, life: 24, dmg, b: 5, g: .25, ang: 70, refl: false, draw: ds_drawFlame,
    tick(p) { if (groundAt(p.x, p.y + 15) === null) p.life = 0; }, onHit(p, foe) { ds_burn(fighters[p.owner], foe, 3); p.life = 0; } });
}

const DS_PASSIVE = {}, DS_HUD = {};

// ================= TANJIRO =================
// Stance = f.buff.ds_sun (Hinokami Kagura is a timed buff: it strains his body and runs out -> back to Water).
const ds_isSun = f => !!f.buff?.ds_sun;
const ds_stance = (water, sun) => ({ start(f) { ds_ensure(f); startMove(f, ds_isSun(f) ? sun : water); } });

// Water B — Constant Flux: a water dragon; press B again to grow it (up to 5 segments), stick up/down steers.
const ds_flux = { dur: 400, grav: 0, special: 1, multi: 7, dmg: 3, b: 4, g: .04, ang: 55, airUses: 1,
  start(f) { f.ds_seg = 1; f.ds_end = 22; SFX.play('swing'); },
  tick(f, t, inp, E) {
    if (t < f.ds_end) {
      if (E('b') && f.ds_seg < 5) { f.ds_seg++; f.ds_end += 16; SFX.play('swing'); fxRing(f.x, f.y - 55, WATER, 40); }
      f.vx = f.face * 8.5; f.vy = inp.y * 3.5 + Math.sin(t * .35) * 3;
      if (t % 2) fxBurst(f.x - f.face * 20, f.y - 55, t % 4 ? WATER : '#ffffff', 2, 3, 16);
    } else { f.vx *= .8; f.vy *= .8; }
    if (t === f.ds_end) { f.hitDone = false; SFX.play('hit', .6); }
    if (t >= f.ds_end + 16) return 'end';
  },
  hbAt(f, t) { if (t < 4) return null; if (t < f.ds_end) return [[20, -55, 40]]; if (t < f.ds_end + 4) return [[45, -60, 52, { dmg: 7, b: 6, g: .38, ang: 45 }]]; return null; },
  onHit(f, foe) { if (f.mt < f.ds_end) { foe.vx = f.vx; foe.vy = f.vy - 1; } }, // the dragon carries the foe along
  pose: (f, t) => t < f.ds_end ? { ...POSES.dash, rot: Math.sin(t * .35) * 18 } : POSES.fsmash,
  drawFx(f, t) {
    const H = f.hist, n = Math.min(t, f.ds_end, H.length, 45), fade = t < f.ds_end ? 1 : Math.max(0, 1 - (t - f.ds_end) / 14);
    ctx.globalAlpha = fade;
    for (let i = 0; i < n; i++) { const [x, y] = H[H.length - 1 - i], r = 26 - i * .4; pxDisc(ctx, x, y - 55 + Math.sin((T - i) * .5) * 6, r, i % 3 ? WATER : '#1a6fd0'); if (i % 4 === 0) pxDisc(ctx, x, y - 70, 6, '#ffffff'); }
    if (t < f.ds_end) { pxDisc(ctx, f.x + f.face * 34, f.y - 58, 22, '#1a6fd0'); pxRect(ctx, f.x + f.face * 42 - 3, f.y - 68, 6, 6, '#ffffff'); pxRect(ctx, f.x + f.face * 50, f.y - 52, f.face * 16, 4, '#bfe6ff'); }
    ctx.globalAlpha = 1;
  } };
// Sun B — Clear Blue Sky: two spinning rings of sun-fire suck the foe in, the last ring bursts and burns.
const ds_blueSky = { s: 12, a: 20, e: 18, special: 1, multi: 6, dmg: 4, b: 3, g: .04, ang: 90, grav: .4, away: 1,
  tick(f, t) { if (t === 13) SFX.play('fire'); if (t === 29) { f.hitDone = false; fxRing(f.x, f.y - 55, DS_SUN, 90); } },
  hbAt: (f, t) => t <= 12 || t > 32 ? null : t > 28 ? [[0, -55, 84, { dmg: 9, b: 6, g: .46, ang: 55 }]] : [[0, -55, 72]],
  onHit(f, foe) { if (f.mt > 28) ds_burn(f, foe, 5); else { foe.vx = (f.x - foe.x) * .08; foe.vy = Math.min(foe.vy, -2); } },
  pose: (f, t) => t <= 12 ? POSES.castW : { ...POSES.spin, rot: t <= 32 ? (t * 30) % 360 : 0 },
  drawFx(f, t) {
    if (t <= 10 || t > 34) return;
    for (const [k, c] of [[1, DS_SUN], [-1, '#ffd23f']]) { ctx.strokeStyle = c; ctx.lineWidth = 9; ctx.beginPath(); ctx.ellipse(f.x, f.y - 55, 78, 24, k * .5 + t * .12 * k, 0, 7); ctx.stroke(); }
  } };
// →B — Opening Thread (both stances): sniff out the thread; press →B again while it lasts = a homing cut that follows it.
const ds_threadCut = { dur: 34, special: 1, dmg: 8, b: 6, g: .1, ang: 78, grav: (f, t) => t < 20 ? 0 : 1,
  start(f) { f.ds_tsun = ds_isSun(f); SFX.play('zap'); },
  tick(f, t) {
    const foe = ds_foe(f);
    if (t > 4 && t <= 18 && !f.hitDone) {
      f.intang = t < 16;
      const dx = foe.x - f.x, dy = foe.y - f.y, d = Math.hypot(dx, dy) || 1, s = Math.min(24, d);
      f.vx = dx / d * s; f.vy = dy / d * s; f.face = Math.sign(dx) || f.face;
    } else { f.vx *= .75; f.vy *= .75; }
  },
  hbAt: (f, t) => t > 4 && t <= 20 ? [[25, -55, 38, f.ds_tsun ? { dmg: 12, b: 5, g: .42, ang: 40 } : undefined]] : null,
  onHit(f, foe) { if (f.ds_tsun) ds_burn(f, foe, 5); f.vx = -f.face * 3; f.vy = -4; popText(foe.x, foe.y - 130, 'OPENING!', '#ff5a5a'); },
  pose: (f, t) => t <= 4 ? POSES.fsmashW : t <= 20 ? POSES.dash : POSES.fsmash,
  drawFx(f, t) {
    const H = f.hist, c = f.ds_tsun ? DS_SUN : WATER;
    if (t > 22) return;
    ctx.strokeStyle = '#ff4040'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(f.x, f.y - 55); ctx.lineTo(ds_foe(f).x, ds_foe(f).y - 55); ctx.stroke();
    for (let i = 0; i < Math.min(12, H.length); i++) { const [x, y] = H[H.length - 1 - i]; pxDisc(ctx, x, y - 55, 16 - i, c); }
  } };
const ds_thread = { dur: 24, special: 1, p: ['crouch', 'idle'],
  start: ds_ensure,
  alt(f) { if (!(f.ds_thread > 0) || !canBeHit(ds_foe(f))) return false; f.ds_thread = 0; startMove(f, ds_threadCut); return true; },
  tick(f, t) { if (t === 10) { f.ds_thread = 240; SFX.play('counter'); popText(f.x, f.y - 140, 'OPENING THREAD', '#ff5a5a'); } if (t < 10 && t % 3 === 0) fxBurst(f.x + f.face * 14, f.y - 92, '#ffd0d0', 1, 1, 12); } };
// ↑B — Water Wheel (water: high vertical flip) / Fire Wheel (sun: lower, bigger, burns)
const ds_wheel = sun => ({ dur: 42, helpless: 1, special: 1, multi: 5, dmg: sun ? 4 : 2, b: 4, g: 0, ang: 80, grav: .7,
  tick(f, t, inp) {
    if (t === 5) { f.vy = sun ? -14 : -17.5; f.vx = f.face * (sun ? 4 : 6); f.ground = null; SFX.play(sun ? 'fire' : 'swing'); }
    if (t > 5) f.vx += (inp.x * 5 - f.vx) * .1;
    if (t === 30) f.hitDone = false;
    if (t > 5 && t < 30) fxBurst(f.x, f.y - 55, sun ? DS_SUN : WATER, 2, 4);
  },
  hbAt: (f, t) => t >= 6 && t < 30 ? [[15, -60, sun ? 54 : 44]] : t >= 30 && t < 34 ? [[30, -70, sun ? 60 : 48, { dmg: sun ? 9 : 6, b: 6, g: sun ? .45 : .35, ang: sun ? 60 : 75 }]] : null,
  onHit(f, foe) { if (sun && f.mt >= 30) ds_burn(f, foe, 4); },
  pose: (f, t) => t < 5 ? POSES.usmashW : { ...POSES.nair, rot: t < 30 ? (t * 30) % 360 : 0 },
  drawFx(f, t) {
    if (t < 5 || t > 32) return;
    const a = t * .52; ctx.lineWidth = sun ? 14 : 10; ctx.strokeStyle = sun ? DS_SUN : WATER; ctx.beginPath(); ctx.arc(f.x, f.y - 55, sun ? 56 : 48, a, a + 4.2); ctx.stroke();
    ctx.lineWidth = 4; ctx.strokeStyle = sun ? '#ffd23f' : '#ffffff'; ctx.beginPath(); ctx.arc(f.x, f.y - 55, sun ? 56 : 48, a + 2, a + 4.2); ctx.stroke();
  } });
// ↓B — Breath Change. Water -> Sun: a launching flame burst ignites Hinokami Kagura. Sun -> Water: Dead Calm counter zone.
const ds_ignite = { dur: 30, special: 1, p: ['stomp', 'victory'], dmg: 6, b: 6.5, g: .06, ang: 86, away: 1,
  tick(f, t) {
    if (t < 12 && t % 3 === 0) fxBurst(f.x, f.y - 55, DS_SUN, 3, 3);
    if (t === 12) { f.buff = { t: 720, spd: .92, pow: 1.2, col: DS_SUN, ds_sun: 1 }; SFX.play('fire'); flash = 3; fxRing(f.x, f.y - 55, DS_SUN, 70); fxBurst(f.x, f.y - 55, '#ffd23f', 20, 7); popText(f.x, f.y - 140, 'HINOKAMI KAGURA', DS_SUN); }
  },
  hbAt: (f, t) => t > 12 && t <= 16 ? [[0, -55, 72]] : null };
const ds_calm = { dur: 40, special: 1, p: ['counter', 'counter'],
  start(f) { f.buff = null; popText(f.x, f.y - 140, 'DEAD CALM', WATER); },
  tick(f, t) {
    f.counter = t >= 3 && t <= 26;
    if (f.counter) for (const p of projectiles) if (p.owner !== f.i && !p.inert && Math.hypot(p.x - f.x, p.y - f.y + 55) < 110) { p.life = 0; fxBurst(p.x, p.y, WATER, 8, 3); }
  },
  drawFx(f, t) {
    if (t > 26) return;
    ctx.globalAlpha = .5; ctx.strokeStyle = '#bfe6ff'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(f.x, f.y - 55, 110, 0, 7); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(f.x, f.y - 2, 60 + (t % 13) * 5, 8, 0, 0, 7); ctx.stroke(); ctx.globalAlpha = 1;
  } };
DS_PASSIVE.tanjiro = f => {
  if (f.ds_thread > 0) f.ds_thread--;
  const s = ds_isSun(f); if (f.ds_wasSun && !s && f.act !== 'dead') popText(f.x, f.y - 140, 'breath spent...', WATER); f.ds_wasSun = s;
};
DS_HUD.tanjiro = f => {
  if (ds_isSun(f)) { ds_bar(f, f.buff.t / 720, DS_SUN); if (T % 3 === 0) fxBurst(f.x + f.face * 30, f.y - 70, T % 2 ? DS_SUN : '#ffd23f', 1, 2, 12); }
  if (f.ds_thread > 0) {
    const foe = ds_foe(f), x0 = f.x + f.face * 14, y0 = f.y - 92, x1 = foe.x, y1 = foe.y - 60;
    ctx.globalAlpha = .5 + Math.sin(T * .3) * .3; ctx.strokeStyle = '#ff4040'; ctx.lineWidth = 3; ctx.beginPath();
    for (let i = 0; i <= 16; i++) { const k = i / 16; ctx.lineTo(x0 + (x1 - x0) * k, y0 + (y1 - y0) * k + Math.sin(k * 9 + T * .2) * 10 * (1 - k)); }
    ctx.stroke(); ctx.globalAlpha = 1;
  }
};
KITS.tanjiro = {
  desc: 'Switch Water (flowing combos) and Sun (burning power). Smell the opening thread.',
  specials: ['Const.Flux/Blue Sky', 'Opening Thread', 'Water/Fire Wheel', 'Hinokami/Dead Calm'],
  specials_: {
    n: { ...ds_stance(ds_flux, ds_blueSky), airUses: 1 },
    s: ds_thread,
    u: ds_stance(ds_wheel(false), ds_wheel(true)),
    d: ds_stance(ds_ignite, ds_calm),
  },
  // Water Surface Slash: low sweep that pops the foe to the same height at any % (combo starter)
  normals: ds_normals({ dtilt: { start: ds_ensure, hb: [[55, -12, 26]], dmg: 6, b: 6.5, g: .06, ang: 84 } }),
};

// ================= ZENITSU =================
// Sleep meter f.ds_zz fills from damage taken (+time). Full -> he faints and fights asleep (buff.ds_sleep).
const ds_asleep = f => !!f.buff?.ds_sleep;
function ds_fallAsleep(f) {
  f.ds_zz = 0; f.buff = { t: 600, spd: 1.15, pow: 1.25, col: DS_BOLT, ds_sleep: 1 };
  popText(f.x, f.y - 150, 'Zzz... *faints*', DS_BOLT); fxRing(f.x, f.y - 55, DS_BOLT, 70); SFX.play('zap');
}
DS_PASSIVE.zenitsu = f => {
  if (f.ds_seen === undefined || f.dmg < f.ds_seen) { f.ds_seen = f.dmg; f.ds_zz = 0; }
  const s = ds_asleep(f);
  if (!s) { f.ds_zz = (f.ds_zz || 0) + (f.dmg - f.ds_seen) * 1.6 + 1 / 40; if (f.ds_zz >= 100 && f.act !== 'dead') ds_fallAsleep(f); }
  else f.ds_zz = 0;
  if (f.ds_wasAsleep && !s && f.act !== 'dead') popText(f.x, f.y - 140, '...huh? what happened?', '#ffffff');
  f.ds_seen = f.dmg; f.ds_wasAsleep = s;
};
DS_HUD.zenitsu = f => {
  if (ds_asleep(f)) { ds_bar(f, f.buff.t / 600, DS_BOLT); text('Z'.repeat(1 + ((T >> 4) % 3)), f.x + 28, f.y - f.ch.hh - 70 - (T % 32) * .5, 14, '#ffffff'); }
  else ds_bar(f, (f.ds_zz || 0) / 100, '#8a8aff');
};
// B — Thunderclap and Flash: hold B (sheathed) to charge, release = instant cut; distance/power scale with charge.
const ds_clap = { dur: 90, special: 1, grav: f => f.ds_cut ? 0 : .3,
  start(f) { ds_ensure(f); f.ds_c = 0; f.ds_cut = 0; },
  tick(f, t, inp) {
    if (!f.ds_cut) {
      if (inp.b && f.ds_c < 60) {
        f.ds_c = Math.min(60, f.ds_c + (ds_asleep(f) ? 2 : 1)); f.vy = Math.min(f.vy, 2);
        if (f.ds_c % 10 === 0) { fxBurst(f.x - f.face * 10, f.y - 45, DS_BOLT, 3, 3, 10); SFX.play('charge', f.ds_c / 60); }
        return 'hold';
      }
      f.ds_cut = t; f.ds_x0 = f.x; f.ds_y0 = f.y;
      teleport(f, f.x + f.face * (110 + f.ds_c * 4.5), f.y); f.vx = f.face * 4; f.vy = 0;
      SFX.play('zap'); flash = 3; shakeCam(4 + f.ds_c / 10);
    }
    if (t >= f.ds_cut + 22) return 'end';
  },
  hbAt: (f, t) => f.ds_cut && t < f.ds_cut + 3 ? ds_line(f, f.ds_x0, f.ds_y0 - 55, f.x, f.y - 55, 34, { dmg: Math.round(7 + f.ds_c * .15), b: 5, g: .3 + f.ds_c * .004, ang: 40 }) : null,
  pose: f => !f.ds_cut ? { ...POSES.crouch, a1: [150, 60] } : POSES.fsmash,
  drawFx(f, t) {
    if (!f.ds_cut) { if (f.ds_c > 5) { ctx.globalAlpha = .5; pxDisc(ctx, f.x - f.face * 10, f.y - 45, 8 + f.ds_c / 4, DS_BOLT); ctx.globalAlpha = 1; } return; }
    const k = 1 - (t - f.ds_cut) / 12; if (k > 0) ds_bolt(f.ds_x0, f.ds_y0 - 55, f.x, f.y - 55, DS_BOLT, 10 + f.ds_c / 6, k);
  } };
// →B — Sixfold (Eightfold asleep): chain of short lightning dashes; press B again in the window, aim each with the stick.
const ds_sixfold = { dur: 300, special: 1, grav: f => f.ds_nx ? 0 : .25, dmg: 3, b: 5.5, g: .03, ang: 80,
  start(f) { ds_ensure(f); f.ds_n = 0; f.ds_nx = 5; f.ds_last = 0; f.ds_max = ds_asleep(f) ? 8 : 6; f.ds_segs = []; },
  tick(f, t, inp, E) {
    if (t === f.ds_nx) {
      const d = stickDir(inp, f.face, 0), dy = Math.max(d.y, -.55), x0 = f.x, y0 = f.y;
      teleport(f, f.x + d.x * 125, f.y + dy * 125); if (Math.abs(d.x) > .2) f.face = Math.sign(d.x);
      f.vx = f.vy = 0; f.ds_n++; f.hitDone = false; f.ds_last = t; f.ds_nx = 0; f.ds_segs.push([x0, y0, f.x, f.y, t]);
      SFX.play('zap', .6);
    }
    if (f.ds_last && !f.ds_nx && t > f.ds_last && t <= f.ds_last + 14 && E('b') && f.ds_n < f.ds_max) f.ds_nx = t + 2;
    if (f.ds_last && !f.ds_nx && t >= f.ds_last + 24) return 'end';
  },
  hbAt(f, t) {
    if (!f.ds_last || t > f.ds_last + 2) return null;
    const s = f.ds_segs[f.ds_segs.length - 1];
    return ds_line(f, s[0], s[1] - 55, s[2], s[3] - 55, 32, f.ds_n >= f.ds_max ? { dmg: 7, b: 6, g: .42, ang: 40 } : undefined);
  },
  pose: (f, t) => t - f.ds_last < 8 ? POSES.dash : POSES.fsmash,
  drawFx(f, t) { for (const s of f.ds_segs) { const k = 1 - (t - s[4]) / 10; if (k > 0) ds_bolt(s[0], s[1] - 55, s[2], s[3] - 55, DS_BOLT, 8, k); } } };
// ↑B — Heat Lightning: three zigzag blinks upward like a lightning bolt.
const ds_heat = { dur: 44, helpless: 1, special: 1, grav: (f, t) => t < 28 ? 0 : 1, dmg: 4, b: 5, g: .05, ang: 85,
  start(f) { ds_ensure(f); f.ds_segs = []; f.ds_last = 0; f.ds_zig = 0; },
  tick(f, t, inp) {
    if (t === 6 || t === 13 || t === 20) {
      const lean = (f.ds_zig % 2 ? -.6 : .6) * f.face + inp.x * .35, m = Math.hypot(lean, 1), x0 = f.x, y0 = f.y;
      teleport(f, f.x + lean / m * 105, f.y - 105 / m); f.vx = f.vy = 0; f.ds_zig++; f.hitDone = false; f.ds_last = t;
      f.ds_segs.push([x0, y0, f.x, f.y, t]); SFX.play('zap', .5);
    }
  },
  hbAt(f, t) {
    if (!f.ds_last || t > f.ds_last + 2) return null;
    const s = f.ds_segs[f.ds_segs.length - 1];
    return ds_line(f, s[0], s[1] - 55, s[2], s[3] - 55, 30, f.ds_zig === 3 ? { dmg: 6, b: 6, g: .35, ang: 70 } : undefined);
  },
  pose: () => POSES.upcut,
  drawFx(f, t) { for (const s of f.ds_segs) { const k = 1 - (t - s[4]) / 12; if (k > 0) ds_bolt(s[0], s[1] - 55, s[2], s[3] - 55, DS_BOLT, 8, k); } } };
// ↓B awake — Panic!: cries and flees (intangible hop back) — fear fills the sleep meter.
const ds_panic = { dur: 34, special: 1, p: ['hurt', 'fall'],
  tick(f, t) {
    if (t === 1) { f.vx = -f.face * 9; f.vy = -9; f.ground = null; popText(f.x, f.y - 140, 'WAAAAH!!', DS_BOLT); f.ds_zz = Math.min(100, (f.ds_zz || 0) + 22); }
    f.intang = t <= 14; f.vx *= .95;
  } };
// ↓B asleep — Seventh Form: Flaming Thunder God. A huge dragon-dash; spends the sleep (he wakes up).
const ds_thunderGod = { dur: 58, special: 1, grav: 0, dmg: 17, b: 6, g: .52, ang: 38,
  tick(f, t) {
    if (t < 22) { f.vx *= .6; f.vy *= .6; if (t % 3 === 0) fxBurst(f.x - f.face * 10, f.y - 45, t % 2 ? FIRE : DS_BOLT, 3, 4, 12); }
    if (t === 22) {
      f.ds_x0 = f.x; f.ds_y0 = f.y; teleport(f, f.x + f.face * 420, f.y); f.vx = f.face * 3;
      f.buff = null; f.ds_wasAsleep = false; SFX.play('zap'); SFX.play('fire'); flash = 6; shakeCam(12);
      popText(f.x, f.y - 150, 'FLAMING THUNDER GOD', '#ff9a2a');
    }
  },
  hbAt: (f, t) => t >= 22 && t < 25 ? ds_line(f, f.ds_x0, f.ds_y0 - 55, f.x, f.y - 55, 44) : null,
  onHit(f, foe) { ds_burn(f, foe, 4); },
  pose: (f, t) => t < 22 ? { ...POSES.crouch, a1: [150, 60] } : POSES.fsmash,
  drawFx(f, t) {
    if (t < 22) return;
    const k = 1 - (t - 22) / 22; if (k <= 0) return;
    ds_bolt(f.ds_x0, f.ds_y0 - 55, f.x, f.y - 55, FIRE, 26, k); ds_bolt(f.ds_x0, f.ds_y0 - 55, f.x, f.y - 55, DS_BOLT, 12, k);
    ctx.globalAlpha = k; pxDisc(ctx, f.x + f.face * 30, f.y - 60, 30, FIRE); pxDisc(ctx, f.x + f.face * 38, f.y - 66, 8, '#ffffff'); ctx.globalAlpha = 1;
  } };
KITS.zenitsu = {
  desc: 'Hold B to charge the iaido cut. Take hits, fall asleep... and get scary.',
  specials: ['Thunderclap & Flash', 'Sixfold / Eightfold', 'Heat Lightning', 'Panic / Thunder God'],
  specials_: {
    n: ds_clap,
    s: ds_sixfold,
    u: ds_heat,
    d: { start(f) { ds_ensure(f); startMove(f, ds_asleep(f) ? ds_thunderGod : ds_panic); } },
  },
  // Sheath Tap: quick low scabbard poke that pops the foe straight up — lead-in to Sixfold up-dashes
  normals: ds_normals({ dtilt: { start: ds_ensure, s: 4, a: 3, e: 10, hb: [[50, -14, 24]], dmg: 5, b: 6, g: .06, ang: 88 } }),
};

// ================= NEZUKO =================
// Blood marks live on the foe (foe.ds_blood 0..3). B detonates them; they also self-ignite (weaker) after 5 s.
const ds_big = f => f.buff?.ds_nz === 2;
function ds_mark(f, foe, k = 1) {
  foe.ds_blood = Math.min(3, (foe.ds_blood || 0) + k * (ds_big(f) ? 2 : 1)); foe.ds_bloodT = 300;
  fxBurst(foe.x, foe.y - 55, DS_PINK, 6, 3);
}
function ds_explode(f, foe, k = 1) {
  const n = foe.ds_blood || 0; foe.ds_blood = 0;
  if (!n || !canBeHit(foe)) return;
  applyHit(f, foe, { dmg: Math.round((3 + 4 * n) * k), b: 4 + n, g: (.08 + .13 * n) * k, ang: 70 }, Math.sign(foe.x - f.x) || f.face, foe.x, foe.y - 55);
  ds_burn(f, foe, n * 2, DS_PINK);
  fxBurst(foe.x, foe.y - 55, DS_PINK, 14 + n * 6, 6 + n * 2); fxRing(foe.x, foe.y - 55, '#ffb0d8', 40 + n * 15); SFX.play('boom', .5 + n * .2);
}
DS_PASSIVE.nezuko = f => {
  const foe = ds_foe(f);
  if (foe.ds_blood > 0) { if (['dead', 'respawn'].includes(foe.act)) foe.ds_blood = 0; else if (--foe.ds_bloodT <= 0) ds_explode(f, foe, .5); }
  if (!f.buff) f.ds_size = 0;
  if (ds_big(f) && T % 60 === 0 && f.dmg > 0) { f.dmg = Math.max(0, f.dmg - 1); fxBurst(f.x, f.y - 55, '#ff9ac8', 3, 2, 14); } // demon regeneration
  if (f.ground) f.ds_pc = 0;
  if (!(f.act === 'move' && f.move.ds_box && f.mt < 15)) f.hidden = false;
};
DS_HUD.nezuko = f => {
  const foe = ds_foe(f), n = foe.ds_blood || 0;
  if (n && !['dead', 'out', 'respawn'].includes(foe.act)) for (let i = 0; i < n; i++) {
    const a = T * .08 + i * 2.1, x = foe.x + Math.cos(a) * 30, y = foe.y - 60 + Math.sin(a) * 16;
    pxDisc(ctx, x, y, foe.ds_bloodT < 60 && T % 6 < 3 ? 12 : 9, DS_PINK); pxDisc(ctx, x - 2, y - 2, 3, '#ffd0e8');
  }
  if (f.buff?.ds_nz) ds_bar(f, f.buff.t / (ds_big(f) ? 600 : 900), f.buff.col);
};
function ds_drawMist(ctx, p) { for (let i = 0; i < 5; i++) pxDisc(ctx, p.x + Math.sin(p.t * .4 + i * 1.3) * p.r * .6, p.y + Math.cos(p.t * .3 + i) * p.r * .4, p.r * (.35 + (i % 3) * .1), i % 2 ? DS_PINK : '#c0305a'); }
// B — Exploding Blood: blood mist marks the foe; press B while they carry blood = ignite every mark.
const ds_detonate = { dur: 26, special: 1, p: ['castW', 'palm'],
  tick(f, t) { if (t === 8) { popText(f.x, f.y - 140, 'EXPLODING BLOOD!', DS_PINK); ds_explode(f, ds_foe(f)); } } };
const ds_bloodMist = { s: 8, a: 0, e: 16, special: 1, p: ['castW', 'cast'],
  start: ds_ensure,
  alt(f) { if (!(ds_foe(f).ds_blood > 0)) return false; startMove(f, ds_detonate); return true; },
  tick(f, t) {
    if (t === 8) { SFX.play('fire', .5); proj(f, { kind: 'ds_mist', vx: 6, r: 26, life: 22, dmg: 3, b: 4, g: .05, ang: 70, draw: ds_drawMist,
      onHit(p, foe) { ds_mark(fighters[p.owner], foe); p.life = 0; } }); }
  } };
// →B — Pounce Kick: leaping kick; on hit she kicks OFF the foe (bounce up, can pounce again, max 3 per airtime) and marks them.
const ds_pounce = { dur: 36, special: 1, dmg: 6, b: 6.5, g: .1, ang: 55, grav: .8,
  start(f) { ds_ensure(f); f.ds_kick = false; },
  tick(f, t) {
    if (f.ds_kick) { f.ds_kick = false; return 'end'; }
    if (t === 6) { f.vx = f.face * 11; f.vy = f.ground ? -7 : -3; f.ground = null; SFX.play('swing'); }
    if (t > 6 && t < 22 && t % 2) fxBurst(f.x - f.face * 20, f.y - 40, DS_PINK, 1, 2, 12);
  },
  hbAt: (f, t) => t > 6 && t <= 22 ? [[38, -45, 30]] : null,
  onHit(f, foe) {
    ds_mark(f, foe); f.vy = -11; f.vx = -f.face * 3; f.ground = null; f.ds_kick = true;
    if ((f.ds_pc = (f.ds_pc || 0) + 1) < 3) f.usedSide = false;
    fxRing(f.x + f.face * 30, f.y - 45, '#ffffff', 24);
  },
  pose: (f, t) => t <= 6 ? POSES.kickW : POSES.kickHigh };
// ↑B — Box Hop: hides in Tanjiro's box (armored, rams upward) then bursts out with a rising kick.
const ds_box = { dur: 46, helpless: 1, special: 1, ds_box: 1, dmg: 9, b: 6, g: .32, ang: 85, grav: (f, t) => t < 15 ? 0 : .8,
  start: ds_ensure,
  tick(f, t, inp) {
    if (t < 15) { f.hidden = true; f.armor = true; f.vx *= .85; f.vy = -3.5; f.ground = null; }
    if (t === 15) { f.hidden = false; f.vy = -16; f.ground = null; SFX.play('break'); fxBurst(f.x, f.y - 40, '#8a5a2e', 16, 7); fxBurst(f.x, f.y - 40, '#c8a070', 8, 5); }
    if (t > 15) f.vx += (inp.x * 4 - f.vx) * .15;
  },
  hbAt: (f, t) => t < 15 ? [[0, -30, 32, { dmg: 4, b: 5, g: .04, ang: 85 }]] : t < 24 ? [[0, -85, 40]] : null,
  pose: (f, t) => t < 15 ? POSES.crouch : POSES.kickHigh,
  drawFx(f, t) {
    if (t >= 15) return;
    const x = f.x - 27, y = f.y - 66;
    pxRect(ctx, x, y, 54, 66, '#8a5a2e'); pxRect(ctx, x, y, 54, 9, '#6a4020'); pxRect(ctx, x + 6, y + 15, 42, 45, '#a0703a');
    pxRect(ctx, x, y + 30, 54, 6, '#3a2a1a'); pxRect(ctx, x + 24, y + 12, 6, 54, '#3a2a1a');
    if (T % 20 < 10) pxRect(ctx, x + 42, y + 18, 6, 6, '#ff6fa8'); // peek
  } };
// ↓B — Size Shift: cycles Normal -> Tiny (fast, small hurtbox, weaker) -> Awakened (big, strong, regenerates, double blood).
const ds_size = { dur: 26, special: 1, p: ['crouch', 'victory'],
  start: ds_ensure,
  tick(f, t) {
    if (t !== 10) return;
    f.ds_size = ((f.ds_size || 0) + 1) % 3;
    if (f.ds_size === 1) { f.buff = { t: 900, grow: .72, spd: 1.3, pow: .85, col: '#ffc0dc', ds_nz: 1 }; popText(f.x, f.y - 120, 'TINY!', '#ffc0dc'); }
    else if (f.ds_size === 2) { f.buff = { t: 600, grow: 1.25, spd: .92, pow: 1.3, col: '#ff2a6a', ds_nz: 2 }; popText(f.x, f.y - 160, 'AWAKENED!', '#ff2a6a'); shakeCam(5); }
    else { f.buff = null; popText(f.x, f.y - 130, 'normal', '#ffffff'); }
    SFX.play('counter'); fxBurst(f.x, f.y - 55, DS_PINK, 16, 6);
  } };
KITS.nezuko = {
  desc: 'Mark foes with blood and ignite it. Shrink, grow, hide in the box.',
  specials: ['Exploding Blood', 'Pounce Kick', 'Box Hop', 'Size Shift'],
  specials_: { n: ds_bloodMist, s: ds_pounce, u: ds_box, d: ds_size },
  normals: ds_normals({
    nair: { start: ds_ensure, onHit: (f, foe) => ds_mark(f, foe) },
    fair: { start: ds_ensure, onHit: (f, foe) => ds_mark(f, foe) },
    // Heel Stomp: meteor that bounces her back up and marks
    dair: { start: ds_ensure, s: 8, a: 5, e: 14, hb: [[0, 5, 30]], dmg: 9, b: 5, g: .3, ang: -75, onHit(f, foe) { ds_mark(f, foe); f.vy = -10; } },
  }),
};

// ================= RENGOKU =================
// Set Your Heart Ablaze (passive): specials hit harder the more damage he has taken (up to +50%); at 100%+ they get armor.
const ds_spirit = f => 1 + Math.min(.5, f.dmg / 300);
const ds_ablaze = f => f.dmg >= 100;
const ds_rg = base => f => Math.round(base * ds_spirit(f));
DS_PASSIVE.rengoku = f => {
  if (ds_ablaze(f) && !f.ds_abl && f.act !== 'dead') { popText(f.x, f.y - 150, 'SET YOUR HEART ABLAZE!', FIRE); fxRing(f.x, f.y - 55, FIRE, 80); }
  f.ds_abl = ds_ablaze(f);
};
DS_HUD.rengoku = f => {
  ds_bar(f, (ds_spirit(f) - 1) / .5, ds_ablaze(f) ? '#ffd23f' : FIRE);
  if (ds_ablaze(f) && T % 3 === 0) fxBurst(f.x + (Math.random() - .5) * 50, f.y - Math.random() * 100, T % 2 ? FIRE : '#ffd23f', 1, 2, 16);
};
// B — First Form: Unknowing Fire. Blinding dash that leaves the ground burning behind him.
const ds_unknowing = { s: 10, a: 13, e: 16, special: 1, p: ['fsmashW', 'dash'], hb: [[40, -55, 34]], dmg: 12, dmgFn: ds_rg(12), b: 6, g: .44, ang: 38,
  start: ds_ensure,
  tick(f, t) {
    if (t <= 10 && ds_ablaze(f)) f.armor = true;
    if (t === 11) SFX.play('fire');
    if (t > 10 && t <= 23) {
      f.vx = f.face * 17; f.vy = Math.min(f.vy, 0); fxBurst(f.x - f.face * 20, f.y - 55, FIRE, 2, 3);
      if (t % 3 === 0 && f.ground) ds_fireTile(f, f.x - f.face * 25, f.y);
    }
  } };
// →B — Fourth Form: Blooming Flame Undulation. Advancing flame whirl: reflects projectiles, pulls in, last petal launches + burns.
const ds_bloom = { dur: 44, special: 1, grav: .3, dmg: 2, b: 3, g: 0, ang: 0, multi: 5,
  dmgFn: f => Math.round((f.mt >= 31 ? 8 : 2) * ds_spirit(f)),
  start: ds_ensure,
  tick(f, t) {
    f.reflect = t >= 4 && t <= 30; if (ds_ablaze(f) && t <= 30) f.armor = true;
    if (t >= 4 && t <= 30) f.vx = f.face * 3.5;
    if (t === 4 || t === 31) SFX.play('fire');
    if (t === 31) f.hitDone = false;
  },
  hbAt: (f, t) => t >= 4 && t < 31 ? [[20, -55, 62]] : t >= 31 && t < 35 ? [[40, -55, 66, { b: 6, g: .42, ang: 40 }]] : null,
  onHit(f, foe) { if (f.mt < 31) { foe.vx = (f.x + f.face * 40 - foe.x) * .15 + f.vx; foe.vy = Math.min(foe.vy, -1.5); } else ds_burn(f, foe, 4); },
  pose: (f, t) => t < 4 ? POSES.castW : { ...POSES.spin, rot: t < 31 ? (t * 24) % 360 : 0 },
  drawFx(f, t) {
    if (t < 4 || t > 34) return;
    for (let i = 0; i < 6; i++) { const a = t * .35 + i * 1.047, r = t > 30 ? 70 + (t - 30) * 8 : 58; pxDisc(ctx, f.x + f.face * 20 + Math.cos(a) * r, f.y - 55 + Math.sin(a) * r * .8, 16, i % 2 ? FIRE : '#ffd23f'); }
  } };
// ↑B follow-up — Third Form: Blazing Universe. Press B during Rising Scorching Sun: overhead dive-slash that spikes.
const ds_universe = { dur: 70, helpless: 1, special: 1, grav: 0, dmg: 10, dmgFn: ds_rg(10), b: 5, g: .33, ang: -70,
  start(f) { f.ds_land = 0; SFX.play('fire'); },
  tick(f, t) {
    if (f.ds_land) { f.vx = 0; return t >= f.ds_land + 12 ? 'end' : undefined; }
    if (t < 5) { f.vx *= .5; f.vy = -2; } else { f.vy = 15; f.vx = f.face * 6; fxBurst(f.x, f.y - 40, FIRE, 2, 4); }
    if (t > 5 && f.ground) { f.ds_land = t; ds_fireWaves(f, 6); }
  },
  hbAt: (f, t) => t >= 5 && !f.ds_land ? [[30, -30, 42]] : null,
  onHit(f, foe) { ds_burn(f, foe, 3); },
  pose: (f, t) => t < 5 ? POSES.usmashW : f.ds_land ? POSES.crouch : POSES.dair,
  drawFx(f, t) { if (t < 5 || f.ds_land) return; ctx.lineWidth = 16; ctx.strokeStyle = FIRE; ctx.beginPath(); f.face > 0 ? ctx.arc(f.x, f.y - 55, 60, -2.4, .6) : ctx.arc(f.x, f.y - 55, 60, Math.PI - .6, Math.PI + 2.4); ctx.stroke(); ctx.lineWidth = 5; ctx.strokeStyle = '#ffd23f'; ctx.stroke(); } };
// ↑B — Second Form: Rising Scorching Sun. Upward arc that launches to a fixed height (combo starter); press B = Blazing Universe.
const ds_rising = { dur: 42, helpless: 1, special: 1, grav: .7, dmg: 8, dmgFn: ds_rg(8), b: 7, g: .08, ang: 86,
  start: ds_ensure,
  tick(f, t, inp, E) {
    if (t === 5) { f.vy = -16; f.vx = f.face * 3; f.ground = null; SFX.play('fire'); }
    if (t > 5) f.vx += (inp.x * 4 - f.vx) * .1;
    if (t <= 16 && ds_ablaze(f)) f.armor = true;
    if (t >= 14 && E('b')) { startMove(f, ds_universe); return; }
  },
  hbAt(f, t) { if (t < 5 || t >= 16) return null; const a = (t - 5) / 11 * 2 - .3; return [[Math.cos(a) * 60, -55 - Math.sin(a) * 60, 34]]; },
  pose: (f, t) => t < 5 ? POSES.dtiltW : POSES.upcut,
  drawFx(f, t) {
    if (t < 5 || t > 20) return;
    const a = Math.min(1.7, (t - 5) / 11 * 2 - .3);
    for (let s = -.3; s <= a; s += .15) { pxDisc(ctx, f.x + f.face * Math.cos(s) * 60, f.y - 55 - Math.sin(s) * 60, 14, FIRE); pxDisc(ctx, f.x + f.face * Math.cos(s) * 60, f.y - 55 - Math.sin(s) * 60, 6, '#ffd23f'); }
  } };
// ↓B — Heart Ablaze: brace (armor). Damage absorbed while bracing is returned in a flame burst.
const ds_brace = { dur: 44, special: 1, p: ['stomp', 'usmash'],
  start(f) { ds_ensure(f); f.ds_d0 = f.dmg; f.ds_pow = 0; },
  tick(f, t) {
    f.armor = t >= 4 && t <= 28;
    if (f.armor && t % 3 === 0) fxBurst(f.x + (Math.random() - .5) * 60, f.y - Math.random() * 100, FIRE, 2, 2, 14);
    if (t === 29) {
      const taken = Math.max(0, f.dmg - f.ds_d0); f.ds_pow = Math.min(20, Math.round(4 + taken * 1.2));
      if (taken > 0) { popText(f.x, f.y - 150, 'SET YOUR HEART ABLAZE!', FIRE); flash = 4; shakeCam(8); }
      SFX.play('fire'); fxRing(f.x, f.y - 55, FIRE, 60 + f.ds_pow * 3); fxBurst(f.x, f.y - 55, '#ffd23f', 10 + f.ds_pow, 6);
    }
  },
  hbAt: (f, t) => t >= 29 && t < 33 ? [[0, -55, 60 + f.ds_pow * 2, { dmg: f.ds_pow, b: 5, g: f.ds_pow > 6 ? .5 : .1, ang: 45, away: 1 }]] : null };
KITS.rengoku = {
  desc: 'The more he is hurt, the harder his flames hit. Set your heart ablaze!',
  specials: ['Unknowing Fire', 'Blooming Flame', 'Rising Sun > Universe', 'Heart Ablaze'],
  specials_: { n: ds_unknowing, s: ds_bloom, u: ds_rising, d: ds_brace },
  normals: ds_normals({
    // Ninth Form: Rengoku — charged lunge-smash that scorches the ground
    fsmash: { start: ds_ensure, s: 18, a: 8, e: 28, hb: [[50, -58, 34], [20, -58, 24]], dmg: 17, b: 5, g: .55, ang: 38, charge: 1,
      tick(f, t) { if (t > 18 && t <= 26) { f.vx = f.face * 14; fxBurst(f.x - f.face * 20, f.y - 55, FIRE, 3, 4); if (t % 3 === 0 && f.ground) ds_fireTile(f, f.x - f.face * 20, f.y, 70); } if (t === 19) SFX.play('fire'); } },
  }),
};
