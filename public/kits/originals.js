// Kit overrides: originals (see KIT_API guide)
// Blaze = heat gauge · Volt = static + lightning rod · Grom = rock pillars · Pip = ice floor/blocks + shatter
// Nyx = hex stacks + cat familiar · Rusty = swappable arm modules + overheat. Meters use f.store (HUD bar).

// ================= shared helpers =================
const or_NORMALS = Object.keys(kit(1, 1, 1));
const or_dead = f => ['dead', 'out', 'respawn'].includes(f.act);
const or_rnd = k => (Math.random() - .5) * k;
function or_spawn(o) { spawn(o); return projectiles[projectiles.length - 1]; }
// add start/onHit/tick handlers to every normal (chained with any override already there)
function or_hook(normals, h) {
  for (const k of or_NORMALS) {
    const m = normals[k] ||= {};
    for (const [ev, fn] of Object.entries(h)) { const old = m[ev]; m[ev] = old ? (...a) => { fn(...a); return old(...a); } : fn; }
  }
  return normals;
}
// per-fighter ticker that follows its owner: gives a kit an every-frame hook + an overhead draw.
// ponytail: lives in projectiles[], so the 40-projectile cap can evict it; it respawns on the owner's next move.
function or_core(f, tick, draw) {
  if (owned(f, 'or_core')) return;
  spawn({ owner: f.i, kind: 'or_core', inert: true, stopped: true, refl: false, r: 1, life: 1e9, x: f.x, y: f.y - 150,
    tick(p) { const o = fighters[p.owner]; p.x = o.x; p.y = o.y - 150; tick(o, p); },
    draw(ctx, p) { const o = fighters[p.owner]; if (!or_dead(o)) draw(ctx, o); } });
}
// also start the core from the fighter's draw (every rendered frame), so it exists before the first move
function or_drawHook(id, core) {
  const d = CHARS.find(c => c.id === id).draw;
  return function (g, J, f) { if (state === 'fight' && fighters[f.i] === f) core(f); return d.call(this, g, J, f); };
}
// status carrier glued to the owner's foe (burn, hex marks)
function or_follow(f, kind, life, o) {
  const had = owned(f, kind);
  if (had) { had.life = Math.max(had.life, life); return had; }
  const foe = foeOf(f);
  return or_spawn({ owner: f.i, kind, inert: true, stopped: true, refl: false, r: 1, life, x: foe.x, y: foe.y - 60, draw() {}, ...o,
    tick(q) { const v = foeOf(fighters[q.owner]); if (or_dead(v)) { q.life = 0; return; } q.x = v.x; q.y = v.y - 60; o.tick?.(q, v); } });
}

// ================= BLAZE: heat gauge =================
function or_heat(f, n) {
  const was = f.store; f.store = Math.max(0, Math.min(90, f.store + n));
  if (was < 90 && f.store >= 90) { popText(f.x, f.y - 150, 'MAX HEAT!', '#ff6a1f'); fxRing(f.x, f.y - 55, '#ff6a1f', 50); SFX.play('fire'); }
}
function or_spend(f, n) {
  if (f.store < n) return false;
  f.store -= n; fxBurst(f.x, f.y - 60, '#ff6a1f', 14, 6); fxRing(f.x, f.y - 55, '#ffd23f', 36); return true;
}
function or_burn(f, secs) {
  const v = foeOf(f);
  if (!owned(f, 'or_burn')) popText(v.x, v.y - v.ch.hh - 50, 'BURN!', '#ff6a1f');
  or_follow(f, 'or_burn', secs * 60, { tick(q, v) {
    if (q.t % 20 === 0) { v.dmg = Math.min(999, v.dmg + 1); fighters[q.owner].stats.dealt++; v.hudShake = 5; }
    if (q.t % 3 === 0) fxBurst(v.x + or_rnd(v.ch.hw), v.y - Math.random() * v.ch.hh * .8, Math.random() < .5 ? '#ff6a1f' : '#ffd23f', 1, 1.5, 16);
  } });
}
// burning ground: pops foes up (combo starter) and sets them alight; re-arms every 40 frames
function or_firePatch(f, x, gy, life) {
  or_spawn({ owner: f.i, kind: 'or_fire', x, y: gy - 14, stopped: true, refl: false, r: 30, life, dmg: 3, b: 6.5, g: .05, ang: 85,
    onHit(p) { p.inert = true; p.cd = 40; or_burn(fighters[p.owner], 2); },
    tick(p) { if (p.cd && --p.cd === 0) p.inert = false; },
    draw(ctx, p) {
      const k = Math.min(1, p.life / 30);
      pxRect(ctx, p.x - 33, p.y + 9, 66, 5, '#8a1a10');
      for (let i = -3; i <= 3; i++) {
        const h = (10 + (Math.sin(T * .4 + i * 1.7) + 1) * 9) * k * (p.inert ? .5 : 1);
        pxRect(ctx, p.x + i * 9 - 4, p.y + 12 - h, 9, h, i % 2 ? '#ff6a1f' : '#ffb13b');
        pxRect(ctx, p.x + i * 9 - 1, p.y + 12 - h, 3, 3, '#fff3b0');
      }
    } });
}
function or_drawInferno(ctx, p) {
  const fl = Math.sin(p.t * .8) * 3;
  pxDisc(ctx, p.x - p.vx * 2, p.y - p.vy * 2, 12, '#8a1a10');
  pxDisc(ctx, p.x, p.y, p.r + 4 + fl, '#c0341d'); pxDisc(ctx, p.x, p.y, p.r, '#ff6a1f');
  pxDisc(ctx, p.x + 2, p.y - 2, p.r * .6, '#ffb13b'); pxDisc(ctx, p.x + 3, p.y - 3, p.r * .3, '#fff3b0');
}
const or_blazeRise = { s: 2, a: 0, e: 0, dur: 22, special: 1, dmg: 6, b: 7, g: .1, ang: 84, pose: () => POSES.upcut,
  hbAt: (f, t) => t >= 3 && t <= 9 ? [[35, -80, 34], [20, -130, 28]] : null,
  tick(f, t) {
    if (t === 3) { f.vy = -10; f.ground = null; f.vx = f.face * 2; SFX.play('fire'); }
    if (t <= 10) fxBurst(f.x + f.face * 30, f.y - 90, t % 2 ? '#ff6a1f' : '#ffd23f', 2, 3);
  } };

KITS.blaze = {
  desc: 'Hits build HEAT. Specials burn 30 heat for fire-powered versions.',
  specials: ['Flame Orb', 'Blazing Lunge', 'Phoenix Rise', 'Kindle'],
  specials_: {
    n: { s: 12, a: 0, e: 18, p: ['castW', 'cast'], start(f) { f.or_hot = or_spend(f, 30); },
      tick(f, t) {
        if (t !== 12) return;
        SFX.play('fire');
        const base = { owner: f.i, kind: 'or_fireball', x: f.x + f.face * 40, y: f.y - 60, vx: f.face * 9, vy: -2, grav: .25, life: 80, b: 4, ang: 38 };
        if (!f.or_hot) return spawn({ ...base, r: 14, dmg: 7, g: .25, onGround: 'bounce', draw: drawFireball });
        spawn({ ...base, vx: f.face * 8, r: 20, dmg: 10, g: .3, draw: or_drawInferno,
          onHit(p) { p.life = 0; or_burn(fighters[p.owner], 4); },
          tick(p) { // Inferno Orb: lands as a burning patch
            if (p.vy <= 0) return; const gy = groundAt(p.x, p.y + 10);
            if (gy !== null) { or_firePatch(fighters[p.owner], p.x, gy, 200); p.life = 0; SFX.play('fire'); fxBurst(p.x, gy - 10, '#ff6a1f', 14, 6); }
          } });
      } },
    s: { s: 8, a: 14, e: 18, p: ['fsmashW', 'dash'], hb: [[50, -58, 28]], dmg: 9, b: 5, g: .4, ang: 38,
      start(f) { f.or_hot = or_spend(f, 30); },
      onHit(f) { if (f.or_hot) or_burn(f, 4); },
      tick(f, t, inp, E) {
        if (t > 8 && t <= 22) {
          f.vx = f.face * 13; f.vy = 0; if (t % 2) fxBurst(f.x - f.face * 20, f.y - 55, '#ff6a1f', 2, 3);
          if (f.or_hot && f.ground && t % 5 === 0) or_firePatch(f, f.x, f.y, 150); // flame trail
        }
        if (t === 9) SFX.play('fire');
        if (f.hitDone && t > 10 && E('b')) startMove(f, or_blazeRise); // follow-up: Rising Flame launcher
      } },
    u: { dur: 42, helpless: 1, multi: 5, dmg: 2, b: 5, g: 0, ang: 88, grav: .6,
      start(f) { f.or_hot = or_spend(f, 30); },
      hbAt: (f, t) => t >= 6 && t < 30 ? (t >= 26 ? [[0, -70, f.or_hot ? 64 : 50, { dmg: f.or_hot ? 8 : 5, b: 7, g: .45, ang: 70 }]] : [[0, -70, 44]]) : null,
      onHit(f) { if (f.or_hot && f.mt >= 26) or_burn(f, 3); },
      tick(f, t, inp) {
        if (t === 6) { f.vy = f.or_hot ? -21 : -17; f.ground = null; SFX.play('fire'); }
        if (t > 6) f.vx = inp.x * 4;
        if (t >= 6 && t < 30) fxBurst(f.x, f.y - 40, t % 2 ? '#ff6a1f' : '#ffd23f', f.or_hot ? 4 : 2, 4);
      },
      pose: (f, t) => t < 6 ? POSES.usmashW : { ...POSES.upcut, rot: t < 30 ? (t * 36) % 360 : 0 } },
    // counter window; a successful counter = +45 heat. Keep holding B afterwards to stoke heat, release = flame burst.
    d: { dur: 44, dmg: 4, b: 6, g: .1, ang: 60, away: 1,
      start(f) { f.or_kt = 0; f.or_stoked = 0; },
      hbAt: (f, t) => t >= 23 && t <= 26 && f.or_stoked ? [[0, -55, 62]] : null,
      tick(f, t, inp) {
        if (f.or_kt && t > f.or_kt + 1) { or_heat(f, 45); popText(f.x, f.y - 150, 'KINDLED!', '#ffd23f'); f.or_kt = 0; return; } // engine skipped ahead = counter landed
        f.or_kt = t;
        f.counter = t >= 4 && t <= 18;
        if (f.counter && t % 3 === 0) fxBurst(f.x, f.y - 55, '#ffd23f', 1, 2, 10);
        if (t === 22 && inp.b && f.store < 90) {
          or_heat(f, 1.5); f.or_stoked = 1; if (T % 12 === 0) SFX.play('fire');
          fxBurst(f.x + or_rnd(50), f.y - Math.random() * 100, Math.random() < .5 ? '#ff6a1f' : '#ffd23f', 1, 2, 18);
          return 'hold';
        }
        if (t === 23 && f.or_stoked) { fxBurst(f.x, f.y - 55, '#ff6a1f', 20, 8); SFX.play('fire'); }
      },
      pose: (f, t) => t < 21 ? POSES.counter : t === 22 ? POSES.stomp : POSES.usmash },
  },
  normals: or_hook({
    // Flame Sweep: fixed-height pop-up at any percent -> uair / Phoenix Rise
    dtilt: { s: 5, a: 4, e: 12, hb: [[64, -12, 26]], dmg: 6, b: 7, g: .08, ang: 82 },
    // Searing Slash: with 45+ heat the fsmash spends it to set the foe ablaze
    fsmash: { onHit(f) { if (f.store >= 45) { f.store -= 45; or_burn(f, 5); popText(f.x, f.y - 150, 'SEAR!', '#ff6a1f'); } } },
  }, {
    onHit(f) { or_heat(f, (f.move?.dmg || 4) * 1.5); },
    tick(f, t) { if (f.store >= 45 && t % 3 === 0) fxBurst(f.x + f.face * 45, f.y - 60, '#ff6a1f', 1, 2, 12); }, // blade trails embers when hot
  }),
};

// ================= VOLT: static + lightning rod =================
const or_voltCore = f => or_core(f,
  o => { if (o.act === 'stand' && o.ground && Math.abs(o.vx) > 6) { o.store = Math.min(90, o.store + .5); if (T % 5 === 0) fxBurst(o.x - o.face * 15, o.y - 20, '#fff04a', 1, 2, 10); } },
  (ctx, o) => { for (let i = 0; i < (o.store / 30 | 0); i++) { const a = T * .25 + i * 2.1; pxRect(ctx, o.x + Math.cos(a) * 34, o.y - 55 + Math.sin(a) * 42, 6, 6, T % 4 < 2 ? '#fff04a' : '#ffffff'); } });
function or_drawRod(ctx, p) {
  if (p.boom) { pxDisc(ctx, p.x, p.y - 30, p.r * (1.2 - p.life / 8), '#fff04a'); pxDisc(ctx, p.x, p.y - 30, p.r * .5, '#ffffff'); return; }
  pxRect(ctx, p.x - 9, p.y + 2, 18, 6, '#3a3f48'); pxRect(ctx, p.x - 3, p.y - 72, 6, 76, '#8e96a3'); pxRect(ctx, p.x - 9, p.y - 60, 18, 3, '#ffd23f');
  pxDisc(ctx, p.x, p.y - 78, 7, (T >> 2) % 2 ? '#fff04a' : '#ffffff');
  if (p.zap) { const v = foeOf(fighters[p.owner]); ctx.strokeStyle = '#fff04a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(p.x, p.y - 78);
    for (let k = 1; k <= 5; k++) ctx.lineTo(p.x + (v.x - p.x) * k / 5 + (k < 5 ? or_rnd(30) : 0), p.y - 78 + (v.y - 55 - p.y + 78) * k / 5); ctx.stroke(); }
}
function or_drawClap(ctx, p) {
  if (p.t < 20) { ctx.strokeStyle = (p.t >> 1) % 2 ? '#fff04a' : '#ffffff'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(p.x, p.y, 50 - p.t * 1.5, 0, 7); ctx.stroke(); pxRect(ctx, p.x - 3, p.y - 60, 6, 120, '#fff04a55'); return; }
  for (let k = 0; k < 18; k++) pxRect(ctx, p.x + ((k + p.t) % 2 ? -10 : 4), p.y + 40 - k * 50, 14, 52, k % 3 ? '#fff04a' : '#ffffff');
  pxDisc(ctx, p.x, p.y + 30, 40, '#fff04a88');
}
const or_flashBack = { s: 4, a: 1, e: 16, dur: 21, special: 1, p: ['dash', 'dash'], dmg: 5, b: 7.5, g: .1, ang: 85,
  tick(f, t) {
    if (t !== 5) return;
    f.tx0 = f.x; f.face = -f.face; f.x += f.face * 190; f.vx = f.face * 2; f.vy = Math.min(f.vy, 0); SFX.play('zap');
    for (let d = 0; d < 190; d += 12) fxBurst(f.tx0 + f.face * d, f.y - 55 + or_rnd(30), '#aef6ff', 1, 1, 14);
  },
  hbAt(f, t) { if (t !== 5) return null; const o = []; for (let d = 0; d <= 190; d += 38) o.push([(f.tx0 + f.face * d - f.x) * f.face, -55, 34]); return o; } };

KITS.volt = {
  desc: 'Running builds STATIC. Plant a lightning rod: bolts chain off it, Arc Warp homes to it.',
  specials: ['Thunder Bolt', 'Flash Step', 'Arc Warp', 'Lightning Rod'],
  specials_: {
    // 45+ static: Thunderclap strikes where the foe stands after a short telegraph. Otherwise a fast bolt that chains off the rod.
    n: { s: 6, a: 0, e: 12, p: ['castW', 'cast'], start(f) { or_voltCore(f); f.or_big = f.store >= 45; },
      tick(f, t) {
        if (t !== 6) return;
        SFX.play('zap');
        if (f.or_big) {
          f.store -= 45; const v = foeOf(f);
          return spawn({ owner: f.i, kind: 'or_clap', x: v.x, y: v.y - 40, stopped: true, inert: true, refl: false, r: 1, life: 28, draw: or_drawClap,
            tick(p) {
              if (p.t !== 20) return; SFX.play('zap'); shakeCam(8); flash = 3;
              const o = fighters[p.owner], w = foeOf(o);
              if (canBeHit(w) && Math.abs(w.x - p.x) < 48) applyHit(o, w, { dmg: 12, b: 5, g: .5, ang: 88 }, 1, w.x, w.y - 55);
            } });
        }
        spawn({ owner: f.i, kind: 'or_bolt', x: f.x + f.face * 40, y: f.y - 60, vx: f.face * 16, r: 12, life: 40, dmg: 4, b: 3, g: .12, ang: 25, draw: drawBolt,
          tick(p) {
            const rod = owned(fighters[p.owner], 'or_rod');
            if (p.chained || !rod || rod.boom || Math.hypot(p.x - rod.x, p.y - rod.y + 75) > 60) return;
            const v = foeOf(fighters[p.owner]), a = Math.atan2(v.y - 55 - rod.y + 78, v.x - rod.x);
            Object.assign(p, { x: rod.x, y: rod.y - 78, vx: Math.cos(a) * 20, vy: Math.sin(a) * 20, chained: 1, dmg: 7, b: 5, ang: 60, life: 40 });
            rod.zap = 6; SFX.play('zap'); fxRing(rod.x, rod.y - 78, '#fff04a', 30); popText(rod.x, rod.y - 110, 'CHAIN!', '#fff04a');
          } });
      } },
    // teleport-slash through the foe. 30 static = paralyze on hit. Press B again after a hit: Flash Back launcher.
    s: { s: 8, a: 1, e: 20, p: ['dash', 'dash'], dmg: 7, b: 5, g: .3, ang: 40,
      start(f) { or_voltCore(f); f.or_par = f.store >= 30; },
      onHit(f, foe) { if (f.or_par && foe.act === 'hurt') { f.store -= 30; f.or_par = false; setAct(foe, 'dizzy'); foe.stun = 40; popText(foe.x, foe.y - foe.ch.hh - 50, 'PARALYZED!', '#fff04a'); } },
      tick(f, t, inp, E) {
        if (t === 9) {
          f.tx0 = f.x; f.x += f.face * 190; f.vx = f.face * 3; f.vy = Math.min(f.vy, 0); SFX.play('zap');
          for (let d = 0; d < 190; d += 12) fxBurst(f.tx0 + f.face * d, f.y - 55 + or_rnd(30), '#fff04a', 1, 1, 14);
        }
        if (t > 9 && f.hitDone && E('b')) startMove(f, or_flashBack);
      },
      hbAt(f, t) { if (t !== 9) return null; const o = []; for (let d = 0; d <= 190; d += 38) o.push([(f.tx0 + f.face * d - f.x) * f.face, -55, 34]); return o; } },
    u: { dur: 30, helpless: 1, grav: 0, dmg: 6, b: 6, g: .3, ang: 70, away: 1,
      start(f) { or_voltCore(f); f.or_rw = 0; },
      tick(f, t, inp) {
        if (t < 12) { f.vx *= .8; f.vy *= .8; if (t > 8) f.intang = true; }
        if (t === 12) {
          const rod = owned(f, 'or_rod'); fxBurst(f.x, f.y - 50, '#fff04a', 14, 6);
          if (rod && !rod.boom && rod.stopped) { teleport(f, rod.x, rod.y + 8); rod.life = 0; f.or_rw = 1; f.vx = f.vy = 0; popText(f.x, f.y - 150, 'ROD WARP', '#fff04a'); }
          else { const d = stickDir(inp); teleport(f, f.x + d.x * 210, f.y + d.y * 210); f.vx = d.x * 4; f.vy = d.y * 4; }
          fxBurst(f.x, f.y - 50, '#fff04a', 14, 6); SFX.play('zap');
        }
        if (t > 12) f.vy += .5;
      },
      hbAt: (f, t) => t >= 12 && t < 15 ? [[0, -55, f.or_rw ? 64 : 40]] : null,
      pose: (f, t) => t < 12 ? POSES.crouch : POSES.jump },
    // plant a rod (zaps nearby foes, relays bolts, Arc Warp anchor). Press again: Overload (explodes, spends all static).
    d: { s: 10, a: 0, e: 14, p: ['stomp', 'throwD'], start: f => or_voltCore(f),
      alt(f) {
        const r = owned(f, 'or_rod'); if (!r || r.boom || r.t < 20) return false;
        const k = f.store; f.store = 0;
        Object.assign(r, { boom: 1, inert: false, stopped: true, r: 90, life: 8, dmg: Math.round(8 + k / 10), b: 6, g: .4, ang: 75, away: 1 });
        SFX.play('zap'); SFX.play('boom'); fxBurst(r.x, r.y - 30, '#fff04a', 30, 12); shakeCam(10); return true;
      },
      tick(f, t) {
        if (t !== 10) return;
        killOwned(f, 'or_rod'); SFX.play('zap');
        spawn({ owner: f.i, kind: 'or_rod', x: f.x + f.face * 50, y: f.y - 10, vy: f.ground ? 0 : 4, grav: .5, onGround: 'stop', inert: true, refl: false, r: 40, life: 720, draw: or_drawRod,
          tick(p) {
            if (p.zap) p.zap--;
            if (p.boom || !p.stopped || p.t % 50) return;
            const o = fighters[p.owner], v = foeOf(o);
            if (canBeHit(v) && Math.hypot(v.x - p.x, v.y - 50 - (p.y - 40)) < 120) { p.zap = 8; SFX.play('zap'); applyHit(o, v, { dmg: 3, b: 5.5, g: .05, ang: 82 }, Math.sign(v.x - p.x) || 1, v.x, v.y - 50); }
          } });
      } },
  },
  normals: or_hook({
    // Spark Flick: fast, fixed-knockback juggle
    utilt: { s: 3, a: 4, e: 8, hb: [[10, -115, 26], [25, -85, 20]], dmg: 4, b: 6.5, g: .06, ang: 90 },
  }, { start: f => or_voltCore(f), onHit(f) { f.store = Math.min(90, f.store + 6); } }),
  stats: { draw: or_drawHook('volt', f => or_voltCore(f)) },
};

// ================= GROM: rock pillars =================
const or_pillars = f => projectiles.filter(p => p.owner === f.i && p.kind === 'or_pillar' && p.life > 0);
function or_pillar(f, x) {
  const gy = groundAt(x, f.y); if (gy === null) { fxBurst(x, f.y, '#b8a080', 8, 4); return; }
  const ps = or_pillars(f); if (ps.length >= 2) ps[0].life = 0;
  SFX.play('rock'); shakeCam(6); fxBurst(x, gy, '#b8a080', 14, 6);
  spawn({ owner: f.i, kind: 'or_pillar', x, y: gy, stopped: true, inert: true, refl: false, r: 1, life: 600, H: 130,
    tick(p) {
      const o = fighters[p.owner], v = foeOf(o), h = Math.min(1, p.t / 8, p.life / 12) * p.H, top = p.y - h, hw = 24 + v.ch.hw / 2;
      if (Math.abs(v.x - p.x) < hw && v.y > top - 10 && v.y - v.ch.hh < p.y && !['held', 'hold', 'ledge', 'dead', 'out', 'final'].includes(v.act)) {
        if (p.t <= 8 && !p.hit && canBeHit(v)) { p.hit = 1; applyHit(o, v, { dmg: 8, b: 7.5, g: .12, ang: 90 }, 1, p.x, top); }
        else if (v.y > top + 15) { const s = Math.sign(v.x - p.x) || 1; v.x = p.x + s * hw; if (v.vx * s < 0) v.vx = v.act === 'hurt' ? -v.vx * .4 : 0; } // solid wall
      }
      for (const q of projectiles) if (q.owner !== p.owner && q.kind !== 'or_core' && !q.stopped && q.life > 0 && Math.abs(q.x - p.x) < 24 + q.r && q.y > top && q.y < p.y) { q.life = 0; fxBurst(q.x, q.y, '#b8a080', 8, 4); SFX.play('rock', .5); }
    },
    draw(ctx, p) {
      const h = Math.min(1, p.t / 8, p.life / 12) * p.H, top = p.y - h;
      pxRect(ctx, p.x - 24, top, 48, h, '#7d828c'); pxRect(ctx, p.x - 24, top, 9, h, '#9aa0aa'); pxRect(ctx, p.x + 15, top, 9, h, '#5a5e66');
      for (let y = top + 21; y < p.y; y += 27) pxRect(ctx, p.x - 24, y, 48, 3, '#4d5058');
      pxRect(ctx, p.x - 27, top - 3, 54, 9, '#5f9e3a'); pxRect(ctx, p.x - 3, top + 12, 6, 6, (T >> 3) % 4 ? '#6dffb0' : '#b8ffd8');
    } });
}
const or_pillarAhead = (f, near, far) => or_pillars(f).find(p => { const d = (p.x - f.x) * f.face; return d > near && d < far && Math.abs(p.y - f.y) < 40; });

KITS.grom = {
  desc: 'Raises rock PILLARS: walls that block shots, ammo he can punch, and shrapnel to charge through.',
  specials: ['Boulder Punch', 'Avalanche Charge', 'Mountain Leap', 'Raise Pillar'],
  specials_: {
    // punch a nearby pillar into a huge boulder; with no pillar, rip up a small rock
    n: { s: 16, a: 0, e: 20, p: ['fsmashW', 'fsmash'],
      tick(f, t) {
        if (t !== 16) return;
        const pl = or_pillarAhead(f, 0, 170);
        if (pl) {
          pl.life = 0; SFX.play('rock'); SFX.play('boom'); shakeCam(10); popText(pl.x, pl.y - 160, 'SMASH!', '#d9a066'); fxBurst(pl.x, pl.y - 60, '#9aa0aa', 20, 8);
          spawn({ owner: f.i, kind: 'or_boulder', x: pl.x, y: pl.y - 65, vx: f.face * 12, vy: -3, grav: .22, r: 32, life: 90, dmg: 15, b: 6, g: .5, ang: 40, onGround: 'break', draw: drawBoulder });
        } else {
          SFX.play('rock'); fxBurst(f.x + f.face * 30, f.y, '#b8a080', 8, 4);
          spawn({ owner: f.i, kind: 'or_boulder', x: f.x + f.face * 30, y: f.y - 100, vx: f.face * 7.5, vy: -6, grav: .4, r: 20, life: 90, dmg: 9, b: 5, g: .4, ang: 40, onGround: 'break', draw: drawBoulder });
        }
      } },
    // armored charge; ramming your own pillar blasts it into shrapnel
    s: { s: 10, a: 24, e: 18, p: ['fsmashW', 'dash'], hb: [[40, -60, 36]], dmg: 12, b: 6, g: .5, ang: 35,
      tick(f, t) {
        if (t > 10 && t <= 34) {
          f.vx = f.face * 9; f.armor = true; if (!f.ground) f.vy = Math.min(f.vy, 2); if (f.ground && t % 3 === 0) fxBurst(f.x - f.face * 30, f.y - 5, '#b8a080', 2, 3);
          const pl = or_pillarAhead(f, -10, 60);
          if (pl) {
            pl.life = 0; SFX.play('boom'); shakeCam(12); popText(pl.x, pl.y - 160, 'SHRAPNEL!', '#d9a066');
            for (let i = 0; i < 4; i++) spawn({ owner: f.i, kind: 'or_shard', x: pl.x, y: pl.y - 25 - i * 28, vx: f.face * (9 + i * 1.5), vy: -3 - i * 1.5, grav: .4, r: 15, life: 60, dmg: 5, b: 5, g: .3, ang: 45, onGround: 'break', draw: drawBoulder });
          }
        }
        if (t === 11) SFX.play('rock');
      } },
    u: { dur: 34, helpless: 1, p: ['crouch', 'usmash'], dmg: 10, b: 6, g: .4, ang: 85,
      hbAt: (f, t) => t >= 8 && t <= 22 ? [[0, -140, 40]] : null,
      tick(f, t, inp) { if (t <= 12) f.armor = true; if (t === 7) { f.vy = -19.5; f.vx = inp.x * 4; f.ground = null; SFX.play('rock'); } if (t > 7) f.vx += inp.x * .3; } },
    // ground: raise a pillar in front (launches anyone standing there). air: plunge stomp + shockwaves.
    d: { s: 12, a: 0, e: 20, p: ['usmashW', 'stomp'],
      start(f) { f.or_plunge = !f.ground; },
      hbAt: f => f.or_plunge ? [[0, 0, 36, { dmg: 12, b: 5, g: .35, ang: -75 }]] : null,
      tick(f, t) {
        if (f.or_plunge) { f.vy = 17; f.vx *= .9; return f.t > 70 ? 'end' : 'hold'; }
        if (t === 12) or_pillar(f, f.x + f.face * 85);
      },
      onLand(f) { if (!f.or_plunge) return false; f.or_plunge = false; quake(f); f.mt = 14; return true; } },
  },
  normals: {
    // Stone Spike: rock juts up at range, fixed pop-up launcher
    dtilt: { s: 7, a: 4, e: 14, hb: [[88, -18, 26], [88, -52, 20]], dmg: 8, b: 7.5, g: .1, ang: 88,
      drawFx(f, t) { if (t < 7 || t > 16) return; const h = Math.min(1, (t - 6) / 3) * 70 * (t > 13 ? (17 - t) / 4 : 1), x = f.x + f.face * 88;
        pxRect(ctx, x - 15, f.y - h, 30, h, '#8a8f99'); pxRect(ctx, x - 9, f.y - h - 12, 18, 12, '#9aa0aa'); pxRect(ctx, x - 3, f.y - h - 21, 6, 9, '#a8adb6'); } },
    grab: { hb: [[56, -58, 36]] }, // heavy grab: long reach
    // super armor through every smash wind-up (and while charging)
    fsmash: { armorStart: true }, usmash: { armorStart: true }, dsmash: { armorStart: true },
  },
};

// ================= PIP: ice floor, ice blocks, shatter =================
const or_shatter = base => (f, foe) => {
  if (foe.act !== 'frozen') return base;
  popText(foe.x, foe.y - foe.ch.hh - 50, 'SHATTER!', '#9ff3ff'); fxBurst(foe.x, foe.y - 55, '#e8feff', 24, 9); SFX.play('ice');
  return base + 7;
};
function or_onIce(f) { const p = owned(f, 'or_ice'); return !!(p && f.ground && Math.abs(f.x - p.x) < p.w && Math.abs(f.y - p.y) < 4); }
// frozen floor: the foe's footing turns slippery (sluggish starts, long slides, can skid off the edge)
function or_iceFloor(f, x, y) {
  killOwned(f, 'or_ice');
  spawn({ owner: f.i, kind: 'or_ice', x, y, stopped: true, inert: true, refl: false, r: 1, life: 480, w: 140,
    tick(p) {
      const v = foeOf(fighters[p.owner]);
      if (!v.ground || Math.abs(v.y - p.y) > 4 || Math.abs(v.x - p.x) > p.w || !['stand', 'move', 'land', 'shield', 'dodge', 'frozen', 'dizzy'].includes(v.act)) { v.or_iv = null; return; }
      v.or_iv = v.or_iv == null ? v.vx : v.or_iv + (v.vx - v.or_iv) * .1; v.vx = v.or_iv;
      if (Math.abs(v.vx) > 3 && T % 4 === 0) fxBurst(v.x, v.y - 3, '#e8feff', 1, 2, 10);
    },
    draw(ctx, p) {
      ctx.globalAlpha = Math.min(1, p.life / 40, p.t / 8);
      pxRect(ctx, p.x - p.w, p.y - 3, p.w * 2, 6, '#9ff3ff'); pxRect(ctx, p.x - p.w, p.y - 3, p.w * 2, 2, '#e8feff');
      for (let i = 0; i < 9; i++) if (((T >> 3) + i * 3) % 5 === 0) pxRect(ctx, p.x - p.w + 15 + i * 30, p.y - 9, 3, 3, '#ffffff');
      ctx.globalAlpha = 1;
    } });
}
function or_kickBlock(b, dir) {
  Object.assign(b, { stopped: false, inert: false, vx: dir * 12, vy: 0, onGround: 'slide', grav: .6, kicked: 1, life: 90 });
  SFX.play('ice'); fxBurst(b.x, b.y - 20, '#e8feff', 10, 5); popText(b.x, b.y - 70, 'KICK!', '#9ff3ff');
}
function or_drawBlock(ctx, p) {
  const y = p.y - 40;
  pxRect(ctx, p.x - 24, y, 48, 48, '#4aa8d8'); pxRect(ctx, p.x - 21, y + 3, 42, 42, '#9ff3ff'); pxRect(ctx, p.x - 15, y + 6, 24, 9, '#e8feff'); pxRect(ctx, p.x - 18, y + 6, 6, 30, '#e8feff');
  if (p.kicked && p.t % 2) fxBurst(p.x - Math.sign(p.vx) * 24, p.y, '#e8feff', 1, 2, 10);
}
const or_pipKick = { s: 5, a: 0, e: 14, special: 1, p: ['kickW', 'kick'],
  tick(f, t) { if (t === 5) { const b = owned(f, 'or_block'); if (b && !b.kicked) or_kickBlock(b, f.face); } } };
function or_drawSnow(ctx, p) {
  const y = p.roll ? p.y - p.r + 6 : p.y;
  pxDisc(ctx, p.x, y, p.r + 3, '#7fa6c8'); pxDisc(ctx, p.x, y, p.r, '#f4f7ff'); pxDisc(ctx, p.x - p.r * .3, y - p.r * .3, p.r * .35, '#ffffff');
  const a = p.x / Math.max(8, p.r); pxRect(ctx, p.x + Math.cos(a) * p.r * .6, y + Math.sin(a) * p.r * .6, 6, 6, '#bcd4e8');
  if (p.freeze) pxRect(ctx, p.x - 3, y - p.r - 9, 6, 6, (T >> 2) % 2 ? '#6fd3ff' : '#ffffff');
}

KITS.pip = {
  desc: 'Ice mage: frozen floors make foes skid, kick ice blocks, SHATTER frozen foes for bonus damage.',
  specials: ['Snowball', 'Belly Slide', 'Blizzard Spin', 'Ice Block'],
  specials_: {
    // rolls along the ground and grows; big enough = freezes on hit
    n: { s: 10, a: 0, e: 16, p: ['castW', 'throwF'],
      tick(f, t) {
        if (t !== 10) return;
        SFX.play('ice');
        spawn({ owner: f.i, kind: 'or_snow', x: f.x + f.face * 40, y: f.y - (f.ground ? 12 : 50), vx: f.face * (f.ground ? 7 : 6), vy: f.ground ? 0 : -3, grav: .5, onGround: 'slide',
          r: 12, life: 120, dmg: 3, b: 4, g: .15, ang: 40, draw: or_drawSnow,
          tick(p) {
            p.roll = groundAt(p.x, p.y) !== null && p.vy >= 0;
            if (p.roll && p.r < 30) { p.r += .3; p.dmg = 3 + Math.round((p.r - 12) / 2); p.freeze = p.r >= 26 ? 1 : 0; if (p.t % 3 === 0) fxBurst(p.x, p.y, '#e8feff', 1, 1.5, 10); }
          } });
      } },
    // low slide, pops foes up; faster & longer on ice; kicks your ice block if you slide into it
    s: { s: 5, a: 30, e: 12, p: ['dash', 'slide'], hb: [[25, -18, 30]], dmg: 7, b: 6.5, g: .1, ang: 80, dmgFn: or_shatter(7),
      start(f) { f.or_ext = 0; },
      tick(f, t) {
        if (t <= 5 || t > 35) return;
        const ice = or_onIce(f);
        f.vx = f.face * (f.ground ? (ice ? 15 : 11) : 7); if (!f.ground) f.vy = Math.min(f.vy, 3);
        if (f.ground && t % 2) fxBurst(f.x - f.face * 20, f.y - 5, ice ? '#9ff3ff' : '#e8feff', ice ? 2 : 1, 3);
        const b = owned(f, 'or_block');
        if (b && !b.kicked && Math.abs(b.x - f.x) < 50 && Math.abs(b.y - f.y) < 40) or_kickBlock(b, f.face);
        if (ice && t > 30 && ++f.or_ext < 30) return 'hold';
      } },
    // rising spin; the last hit chills (slows) the foe
    u: { dur: 40, helpless: 1, multi: 5, dmg: 2, b: 4, g: 0, ang: 90,
      hbAt: (f, t) => t > 4 && t < 34 ? (t >= 30 ? [[0, -45, 46, { dmg: 4, b: 7, g: .35, ang: 80, slow: 120 }]] : [[0, -45, 42]]) : null,
      tick(f, t, inp) { if (t > 4 && t < 34) { f.vy = -8.5; f.vx = inp.x * 4.5; f.ground = null; fxBurst(f.x, f.y - 40, '#e8feff', 2, 6); if (t % 8 === 5) SFX.play('ice'); } },
      pose: spinPose('spin', 40) },
    // place an ice block (frosts the floor around it). Press again near it: kick it (slides, freezes on hit).
    d: { s: 10, a: 0, e: 14, p: ['castW', 'stomp'],
      alt(f) {
        const b = owned(f, 'or_block'); if (!b || b.kicked || !b.stopped || Math.abs(b.x - f.x) > 150 || Math.abs(b.y - f.y) > 60) return false;
        f.face = Math.sign(b.x - f.x) || f.face; startMove(f, or_pipKick); return true;
      },
      tick(f, t) {
        if (t !== 10) return;
        killOwned(f, 'or_block'); SFX.play('ice');
        spawn({ owner: f.i, kind: 'or_block', x: f.x + f.face * 60, y: f.y - 30, vy: f.ground ? 0 : 3, grav: .6, onGround: 'stop', inert: true, refl: false, r: 26, life: 600,
          dmg: 8, b: 5, g: .3, ang: 45, freeze: 1, draw: or_drawBlock,
          onHit(p) { p.life = 0; fxBurst(p.x, p.y - 20, '#e8feff', 18, 7); SFX.play('ice'); },
          tick(p) { if (p.stopped && !p.frosted) { p.frosted = 1; or_iceFloor(fighters[p.owner], p.x, p.y + 8); fxBurst(p.x, p.y, '#e8feff', 16, 6); } } });
      } },
  },
  normals: {
    fsmash: { dmgFn: or_shatter(14) },
    fair: { dmgFn: or_shatter(11) },
    // Flurry uair: fixed knockback juggle for his 3 jumps
    uair: { s: 4, a: 5, e: 9, hb: [[5, -100, 30]], dmg: 6, b: 6.5, g: .12, ang: 88 },
  },
};

// ================= NYX: hex stacks + cat familiar =================
function or_drawHex(ctx, p) {
  for (let i = 0; i < p.n; i++) {
    const a = T * .07 + i * 2.094, x = p.x + Math.cos(a) * 28, y = p.y + Math.sin(a) * 8;
    pxRect(ctx, x - 3, y - 9, 6, 18, '#58e08a'); pxRect(ctx, x - 9, y - 3, 18, 6, '#58e08a'); pxRect(ctx, x - 3, y - 3, 6, 6, '#b06cff');
  }
  if (p.n >= 3 && (T >> 3) % 2) { ctx.strokeStyle = '#b06cff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(p.x, p.y + 90, 60, 0, 7); ctx.stroke(); }
}
function or_hex(f) {
  const p = or_follow(f, 'or_hex', 420, { n: 0, draw: or_drawHex, tick(q, v) { q.y = v.y - v.ch.hh - 45; } });
  p.life = 420; p.n = Math.min(3, p.n + 1);
  popText(p.x, p.y - 30, p.n >= 3 ? 'HEX x3!' : 'HEX ' + p.n, '#58e08a'); SFX.play('shadow', .5);
}
function or_catLunge(p) {
  const v = foeOf(fighters[p.owner]), a = Math.atan2(v.y - 55 - p.y, v.x - p.x);
  Object.assign(p, { vx: Math.cos(a) * 14, vy: Math.sin(a) * 14, lunge: 1, inert: false, face: Math.sign(Math.cos(a)) || 1 }); SFX.play('shadow', .6);
}
function or_catTick(p) {
  const o = fighters[p.owner], v = foeOf(o);
  if (or_dead(o)) { p.life = 0; return; }
  if (p.lunge) {
    if (++p.lunge > 22 || inMain(p.x + p.vx, p.y + p.vy)) { p.lunge = 0; p.inert = true; return; }
    p.x += p.vx; p.y += p.vy; if (p.t % 2) fxBurst(p.x, p.y, '#b06cff', 1, 1, 12); return;
  }
  p.face = o.face;
  p.x += (o.x - o.face * 45 - p.x) * .15; p.y += (o.y - 95 + Math.sin(p.t * .1) * 6 - p.y) * .15;
  if (p.t % 90 === 60 && canBeHit(v) && Math.abs(v.x - p.x) < 280 && Math.abs(v.y - p.y) < 200) or_catLunge(p); // attacks on its own too
}
function or_drawCat(ctx, p) {
  const d = p.face || 1, x = p.x, y = p.y;
  ctx.globalAlpha = Math.min(1, p.life / 40) * .9;
  pxDisc(ctx, x, y, 20, '#b06cff33');
  for (let i = 0; i < 4; i++) pxRect(ctx, x - d * (12 + i * 5), y - 3 - i * 4 + Math.sin(T * .2 + i) * 3, 6, 6, '#1a0f24');
  pxDisc(ctx, x, y, 11, '#1a0f24'); pxDisc(ctx, x + d * 12, y - 9, 9, '#1a0f24');
  pxRect(ctx, x + d * 6 - 3, y - 24, 6, 9, '#1a0f24'); pxRect(ctx, x + d * 16 - 3, y - 24, 6, 9, '#1a0f24');
  pxRect(ctx, x + d * 15 - 2, y - 12, 4, 4, '#58e08a'); pxRect(ctx, x + d * 9 - 2, y - 12, 4, 4, '#58e08a');
  if (p.lunge) pxRect(ctx, x + d * 18, y - 3, 6, 3, '#d9ccf0');
  ctx.globalAlpha = 1;
}

KITS.nyx = {
  desc: 'Stack HEX marks (orb, fair, familiar) then Hex Burst to cash them in. A spirit cat fights beside her.',
  specials: ['Hex Orb', 'Familiar', 'Bat Swarm / Soul Swap', 'Hex Burst'],
  specials_: {
    n: { s: 14, a: 0, e: 14, p: ['castW', 'cast'], tick(f, t) {
      if (t !== 14) return;
      killOwned(f, 'or_orb'); SFX.play('shadow');
      spawn({ owner: f.i, kind: 'or_orb', x: f.x + f.face * 40, y: f.y - 60, vx: f.face * 4, r: 16, life: 150, dmg: 5, b: 5, g: .15, ang: 50, draw: drawOrb,
        onHit(p) { p.life = 0; or_hex(fighters[p.owner]); },
        tick(p) { const v = foeOf(fighters[p.owner]), dx = v.x - p.x, dy = v.y - 55 - p.y, m = Math.hypot(dx, dy) || 1; p.vx = p.vx * .96 + dx / m * .25; p.vy = p.vy * .96 + dy / m * .25; } });
    } },
    // summon the spirit cat (8s). Press again: command it to pounce now (Nyx stays free to act).
    s: { s: 10, a: 0, e: 14, p: ['castW', 'cast'],
      alt(f) { const c = owned(f, 'or_cat'); if (!c) return false; if (c.cd > T) return true; c.cd = T + 60; if (!c.lunge) or_catLunge(c); return true; }, // 1 pounce per second
      tick(f, t) {
        if (t !== 10) return;
        SFX.play('shadow'); fxBurst(f.x + f.face * 40, f.y - 90, '#b06cff', 16, 5);
        spawn({ owner: f.i, kind: 'or_cat', x: f.x + f.face * 40, y: f.y - 90, stopped: true, inert: true, refl: false, r: 24, life: 480,
          dmg: 4, b: 5.5, g: .08, ang: 75, tick: or_catTick, draw: or_drawCat,
          onHit(p) { p.lunge = 0; p.inert = true; or_hex(fighters[p.owner]); } });
      } },
    // bat-swarm travel; if the cat is out, instantly swap places with it instead
    u: { dur: 44, helpless: 1, grav: 0, p: ['counter', 'jump'], dmg: 7, b: 6, g: .35, ang: 70, away: 1,
      start(f) { const c = owned(f, 'or_cat'); f.or_swap = c ? { x: c.x, y: c.y + 60 } : null; if (c) c.life = 0; },
      hbAt: (f, t) => f.or_swap ? (t >= 6 && t < 10 ? [[0, -55, 50]] : null) : (t >= 34 && t < 38 ? [[0, -55, 46]] : null),
      tick(f, t, inp) {
        if (f.or_swap) {
          if (t < 5) { f.vx *= .7; f.vy *= .7; }
          if (t === 5) { fxBurst(f.x, f.y - 55, '#2a1740', 16, 6); teleport(f, f.or_swap.x, f.or_swap.y); f.vx = 0; f.vy = -4; fxBurst(f.x, f.y - 55, '#b06cff', 16, 6); SFX.play('shadow'); popText(f.x, f.y - 150, 'SOUL SWAP', '#b06cff'); }
          if (t > 5) f.vy += .5;
          return t >= 26 ? 'end' : undefined;
        }
        if (t < 8) { f.vx *= .8; f.vy *= .8; }
        if (t === 8) { f.or_bat = stickDir(inp); SFX.play('shadow'); fxBurst(f.x, f.y - 55, '#2a1740', 16, 6); }
        if (t >= 8 && t < 34) { f.vx = f.or_bat.x * 11; f.vy = f.or_bat.y * 11; f.bats = true; f.intang = true; f.ground = null; }
        if (t === 34) { f.vx *= .3; f.vy = -2; fxBurst(f.x, f.y - 55, '#b06cff', 16, 6); }
        if (t > 34) f.vy += .5;
      } },
    // cash in hexes wherever the foe is: 1 = pop-up, 2 = yank toward Nyx, 3 = CURSED (dizzy). No hexes: close pulse that applies one.
    d: { s: 10, a: 0, e: 18, p: ['castW', 'counter'],
      tick(f, t) {
        if (t !== 10) return;
        const h = owned(f, 'or_hex'), n = h?.n || 0, v = foeOf(f);
        SFX.play('shadow');
        if (!n) {
          fxRing(f.x + f.face * 40, f.y - 55, '#b06cff', 50); fxBurst(f.x + f.face * 40, f.y - 55, '#58e08a', 10, 5);
          if (canBeHit(v) && Math.hypot(v.x - f.x - f.face * 40, v.y - f.y) < 90) { applyHit(f, v, { dmg: 5, b: 5, g: .2, ang: 70 }, f.face, v.x, v.y - 55); or_hex(f); }
          return;
        }
        h.life = 0; fxRing(v.x, v.y - 55, '#58e08a', 40 + n * 20); fxBurst(v.x, v.y - 55, '#b06cff', 10 + n * 8, 4 + n * 2); SFX.play('boom', .5);
        if (!canBeHit(v)) return;
        if (n === 1) applyHit(f, v, { dmg: 6, b: 6, g: .1, ang: 88 }, 1, v.x, v.y - 55);
        else if (n === 2) applyHit(f, v, { dmg: 10, b: 7, g: .05, ang: 30 }, Math.sign(f.x - v.x) || 1, v.x, v.y - 55);
        else {
          applyHit(f, v, { dmg: 14, b: 4, g: .1, ang: 90 }, 1, v.x, v.y - 55);
          if (v.act === 'hurt') { setAct(v, 'dizzy'); v.stun = 55; popText(v.x, v.y - v.ch.hh - 50, 'CURSED!', '#b06cff'); }
        }
      } },
  },
  normals: {
    fair: { onHit(f) { or_hex(f); } },
    // Reap: long low scythe hook, pops up and slightly toward Nyx
    dtilt: { s: 6, a: 4, e: 12, hb: [[78, -14, 26], [45, -18, 20]], dmg: 6, b: 6.5, g: .06, ang: 100 },
  },
};

// ================= RUSTY: arm modules + overheat =================
const or_MODS = [{ n: 'CANNON', c: '#6dff8a' }, { n: 'DRILL', c: '#c8ccd8' }, { n: 'MAGNET', c: '#ff4b4b' }];
function or_rHeat(f, n) {
  f.store = Math.max(0, Math.min(90, f.store + n));
  if (f.store >= 90 && !f.or_melt) { f.or_melt = 1; popText(f.x, f.y - 150, 'OVERHEAT! B = MELTDOWN', '#ff5a3b'); SFX.play('charge', 1); }
}
const or_rustyCore = f => or_core(f,
  o => {
    if (o.act === 'respawn') o.or_melt = 0;
    if (o.or_melt) { if (T % 5 === 0) fxBurst(o.x + or_rnd(30), o.y - 100, '#d8d8e8', 1, 1.5, 20); }
    else if (o.store > 0) o.store = Math.max(0, o.store - .08); // passive cooling
  },
  (ctx, o) => {
    const x = o.x, y = o.y - o.ch.hh - 62, m = o.or_melt ? { c: '#ff5a3b' } : or_MODS[o.or_mod || 0];
    pxRect(ctx, x - 12, y - 12, 24, 24, '#1a1d24'); pxRect(ctx, x - 12, y + 9, 24, 3, m.c);
    if (o.or_melt) { if ((T >> 2) % 2) pxDisc(ctx, x, y - 2, 7, '#ff5a3b'); return; }
    if (!o.or_mod) { pxDisc(ctx, x, y - 2, 6, '#6dff8a'); pxRect(ctx, x - 1, y - 3, 3, 3, '#e8ffe8'); }
    else if (o.or_mod === 1) for (let i = 0; i < 4; i++) pxRect(ctx, x - 8 + i * 3, y - 8 + i * 2, 16 - i * 5, 12 - i * 4, i % 2 ? '#8e96a3' : '#c8ccd8');
    else { pxRect(ctx, x - 8, y - 8, 5, 14, '#ff4b4b'); pxRect(ctx, x + 3, y - 8, 5, 14, '#ff4b4b'); pxRect(ctx, x - 8, y + 3, 16, 4, '#ff4b4b'); pxRect(ctx, x - 8, y - 8, 5, 3, '#fff'); pxRect(ctx, x + 3, y - 8, 5, 3, '#fff'); }
  });
function or_drawTurret(ctx, p) {
  const d = p.face || 1, y = p.y + 8;
  pxRect(ctx, p.x - 18, y - 8, 36, 8, '#3a3f48'); pxRect(ctx, p.x - 12, y - 28, 24, 20, '#d9772b'); pxRect(ctx, p.x - 12, y - 28, 24, 4, '#e8914a');
  pxRect(ctx, d > 0 ? p.x + 6 : p.x - 28, y - 23, 22, 6, '#6e7582');
  pxRect(ctx, p.x - 3, y - 34, 6, 6, p.oc ? ((T >> 2) % 2 ? '#ff3b3b' : '#ffe07a') : (T >> 4) % 2 ? '#6dff8a' : '#2f8a44');
}
function or_turretTick(p) {
  if (!p.stopped) return;
  const v = foeOf(fighters[p.owner]); p.face = Math.sign(v.x - p.x) || 1;
  const fire = p.burst > 0 ? p.t % 6 === 0 && p.burst-- : p.t % 45 === 0;
  if (!fire || or_dead(v)) return;
  const sx = p.x + p.face * 30, sy = p.y - 15, a = Math.atan2(clamp(v.y - 55 - sy, -300, 300), v.x - sx);
  SFX.play('laser', .3);
  spawn({ owner: p.owner, kind: 'or_tshot', x: sx, y: sy, vx: Math.cos(a) * 11, vy: Math.sin(a) * 11, r: 8, life: 60, dmg: 3, b: 4, g: .05, ang: 30, draw: drawShot });
}
const or_drillFx = (f, t) => {
  if (f.or_n === 1 && t >= 8 && t <= 28) { const x = f.x + f.face * 55, y = f.y - 60, s = t % 4 < 2;
    for (let i = 0; i < 4; i++) pxRect(ctx, f.face > 0 ? x + i * 6 : x - i * 6 - 6, y - 12 + i * 3, 6, 24 - i * 6, (i + (s ? 1 : 0)) % 2 ? '#8e96a3' : '#e8eef8'); }
  if (f.or_n === 2 && t >= 6 && t <= 34) { ctx.strokeStyle = t % 4 < 2 ? '#ff4b4b' : '#ffffff'; ctx.lineWidth = 3;
    for (let k = 1; k <= 3; k++) { const r = ((t * 8 + k * 40) % 120) + 20; ctx.beginPath(); ctx.arc(f.x + f.face * (40 + 120 - r), f.y - 60, r * .5, f.face > 0 ? Math.PI * .6 : -Math.PI * .4, f.face > 0 ? Math.PI * 1.4 : Math.PI * .4); ctx.stroke(); } }
  if (f.or_n === 3 && t >= 18 && t <= 24) { pxDisc(ctx, f.x, f.y - 55, 115 * (t - 16) / 8, '#ff9a2a88'); pxDisc(ctx, f.x, f.y - 55, 60 * (t - 16) / 8, '#fff3b0'); }
};

KITS.rusty = {
  desc: 'Swap arm MODULES (cannon/drill/magnet) with down-B. Specials build heat; OVERHEAT unlocks Meltdown.',
  specials: ['Arm Module', 'Turret', 'Jetpack', 'Module Swap'],
  specials_: {
    n: { dur: 40, multi: 4, dmg: 2, b: 2.5, g: 0, ang: 30,
      start(f) { or_rustyCore(f); f.or_n = f.or_melt ? 3 : (f.or_mod || 0); if (f.or_n < 3) or_rHeat(f, [20, 18, 15][f.or_n]); },
      hbAt(f, t) {
        if (f.or_n === 1 && t >= 8 && t <= 28) return t < 26 ? [[58, -60, 30]] : [[62, -60, 34, { dmg: 5, b: 7, g: .1, ang: 80 }]]; // drill: grinds, then pops up
        if (f.or_n === 3 && t >= 18 && t <= 21) return [[0, -55, 115, { dmg: 16, b: 6, g: .5, ang: 60, away: 1 }]];
        return null;
      },
      tick(f, t) {
        const n = f.or_n;
        if (n === 0) { // cannon: plasma shot
          if (t === 8) { SFX.play('laser'); spawn({ owner: f.i, kind: 'or_shot', x: f.x + f.face * 50, y: f.y - 62, vx: f.face * 13, r: 10, life: 70, dmg: 6, b: 4, g: .25, ang: 30, draw: drawShot }); }
          return t >= 24 ? 'end' : undefined;
        }
        if (n === 1) { if (t >= 8 && t <= 28) { f.vx = f.face * 2.5; if (t % 4 === 0) { SFX.play('swing', .3); fxBurst(f.x + f.face * 60, f.y - 60, '#ffe07a', 2, 4, 10); } } return t >= 38 ? 'end' : undefined; }
        if (n === 2) { // magnet: reel the foe in
          const v = foeOf(f), dx = v.x - f.x;
          if (t >= 6 && t <= 34 && dx * f.face > 30 && Math.abs(dx) < 380 && Math.abs(v.y - f.y) < 140 && canBeHit(v) && !['held', 'hold', 'ledge', 'final'].includes(v.act)) {
            v.vx = -f.face * (v.act === 'hurt' ? 4 : 8); if (!v.ground) v.vy *= .85; if (t % 3 === 0) fxBurst(v.x, v.y - 55, '#ff4b4b', 1, 2, 10);
          }
          if (t === 6) SFX.play('charge', .5);
          return t >= 36 ? 'end' : undefined;
        }
        if (t < 18 && t % 2) fxBurst(f.x + or_rnd(60), f.y - Math.random() * 100, '#ff9a2a', 2, 3, 12); // meltdown
        if (t === 18) { SFX.play('boom'); shakeCam(18); flash = 5; fxBurst(f.x, f.y - 55, '#ff9a2a', 40, 14); f.store = 0; f.or_melt = 0; }
      },
      drawFx: or_drillFx,
      pose: (f, t) => f.or_n === 3 ? (t < 18 ? POSES.crouch : POSES.victory) : f.or_n === 1 ? (t < 8 ? POSES.jabW : POSES.jab) : t < 6 ? POSES.castW : POSES.cast },
    // deploy an auto-turret (7s). Press again: overclock it for a 3-shot burst.
    s: { s: 10, a: 0, e: 16, p: ['stomp', 'throwD'],
      alt(f) { const q = owned(f, 'or_turret'); if (!q || q.oc || !q.stopped) return false; q.oc = 1; q.burst = 3; popText(q.x, q.y - 60, 'OVERCLOCK', '#ffe07a'); return true; },
      start(f) { or_rustyCore(f); },
      tick(f, t) {
        if (t !== 10) return;
        killOwned(f, 'or_turret'); or_rHeat(f, 20); SFX.play('grab');
        spawn({ owner: f.i, kind: 'or_turret', x: f.x + f.face * 55, y: f.y - 10, vy: f.ground ? 0 : 3, grav: .5, onGround: 'stop', inert: true, refl: false, r: 20, life: 420, face: f.face, tick: or_turretTick, draw: or_drawTurret });
      } },
    u: { dur: 52, helpless: 1, grav: .3, multi: 6, dmg: 2, b: 3, g: 0, ang: -70, p: ['jump', 'fall'],
      start(f) { or_rustyCore(f); or_rHeat(f, 15); },
      hbAt: (f, t) => t > 4 && t <= 46 ? [[-8, 12, 26]] : null,
      tick(f, t, inp) { if (t > 4 && t <= 46) { f.vy = Math.max(f.vy - 1.4, -9.5); f.vx += (inp.x * 6 - f.vx) * .15; f.jet = true; f.ground = null; fxBurst(f.x - f.face * 18, f.y - 20, t % 2 ? '#ff9a2a' : '#ffe07a', 1, 2, 14); if (t % 10 === 5) SFX.play('fire'); } } },
    // cycle module + vent 25 heat as a steam burst that pushes foes off
    d: { s: 6, a: 4, e: 12, p: ['crouch', 'counter'], hb: [[0, -55, 62]], dmg: 3, b: 6, g: .05, ang: 60, away: 1,
      start(f) {
        or_rustyCore(f); f.or_mod = ((f.or_mod || 0) + 1) % 3; const m = or_MODS[f.or_mod];
        popText(f.x, f.y - 150, m.n, m.c); SFX.play('grab'); if (!f.or_melt) f.store = Math.max(0, f.store - 25);
      },
      tick(f, t) { if (t === 7) { fxBurst(f.x, f.y - 55, '#d8d8e8', 18, 7); SFX.play('shield', .5); } } },
  },
  normals: or_hook({}, { start: f => or_rustyCore(f) }),
  stats: { draw: or_drawHook('rusty', f => or_rustyCore(f)) },
};
