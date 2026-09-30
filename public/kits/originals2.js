// Kit overrides: originals2 (see KIT_API guide) — kaiju, djbass, mimi, astro, granny, kage, cluck, gloop.
// Every top-level name is prefixed o2_. Passive mechanics (meters) run in an invisible per-fighter
// "brain" projectile (kind 'o2_brain') that is spawned from the fighter's draw and from every move start.

// ================= shared helpers =================
const O2_IDS = ['kaiju', 'djbass', 'mimi', 'astro', 'granny', 'kage', 'cluck', 'gloop'];
const O2_PASSIVE = {}, O2_HUD = {};
const O2_BUSY = ['dead', 'out', 'respawn', 'ledge', 'held', 'hold', 'locked', 'final', 'climb', 'shield']; // shield blocks grabs/stuns (grab beats shield)
const o2_foe = f => fighters[1 - f.i];
const o2_meter = (f, v) => { f.store = Math.max(0, Math.min(90, v)); };
const o2_hit = (f, foe, P, dir) => { if (canBeHit(foe)) applyHit(f, foe, P, dir ?? (Math.sign(foe.x - f.x) || f.face), foe.x, foe.y - 55); };
const o2_mid = f => ({ x: f.x, y: f.y - 55 * SC(f) });
const o2_free = foe => canBeHit(foe) && !O2_BUSY.includes(foe.act);
const o2_absorbable = (f, p) => p.owner !== f.i && p.life > 0 && !p.inert && p.refl !== false; // real shots only, never controllers
function o2_brain(f) {
  if (typeof fighters === 'undefined' || fighters[f.i] !== f || owned(f, 'o2_brain')) return;
  spawn({ owner: f.i, kind: 'o2_brain', x: 0, y: -300, r: 1, life: 1e9, inert: true, stopped: true, refl: false,
    tick(p) { p.life = 1e9; const g = fighters[p.owner]; if (g && !['dead', 'out'].includes(g.act)) O2_PASSIVE[g.ch.id]?.(g, p); },
    draw(c, p) { const g = fighters[p.owner]; if (g && !['dead', 'out'].includes(g.act)) O2_HUD[g.ch.id]?.(g, p); } });
}
function o2_bar(f, v, col, label) { // small world-space meter above the P tag
  const x = f.x, y = f.y - f.ch.hh * SC(f) - 56;
  pxRect(ctx, x - 33, y, 66, 9, '#15151a'); pxRect(ctx, x - 30, y + 3, 60 * v / 90, 3, col);
  text(label, x, y - 9, 8, col);
}
// hitboxes of fighter g overlapping a circle (used to bat eggs / pop the shadow clone)
function o2_hbTouch(g, x, y, r) {
  const hbs = activeHitboxes(g); if (!hbs) return false; const G = SC(g);
  return hbs.some(([hx, hy, hr]) => Math.hypot(g.x + hx * g.face * G - x, g.y + hy * G - y) < hr * G + r);
}

// ================= KAIJU KID — rage meter =================
O2_PASSIVE.kaiju = (f, p) => {
  const foe = o2_foe(f), d = f.dmg - (p.ld ?? f.dmg), fd = foe.dmg - (p.lf ?? foe.dmg);
  p.ld = f.dmg; p.lf = foe.dmg;
  if (f.o2_rage) { if (!f.buff) { f.o2_rage = 0; f.store = 0; } else f.store = f.buff.t / 240 * 90; return; }
  const r = f.store + (d > 0 ? d * .9 : 0) + (fd > 0 && foe.lastHitBy === f.i ? fd * .6 : 0); // fills ~25% slower
  if (r >= 90) {
    f.o2_rage = 1; f.buff = { t: 240, grow: 1.4, pow: 1.2, spd: .92, armor: 14, col: '#ff6a1f' }; // armor 14: strong hits still flinch him
    popText(f.x, f.y - 170, 'KAIJU MODE!', '#ff6a1f'); SFX.play('boom'); shakeCam(16); fxRing(f.x, f.y - 60, '#ff6a1f', 120); fxBurst(f.x, f.y - 60, '#ffd23f', 30, 10);
  }
  o2_meter(f, r);
};
O2_HUD.kaiju = f => {
  if (f.store > 0) o2_bar(f, f.store, f.o2_rage ? '#ff6a1f' : '#ffd23f', f.o2_rage ? 'KAIJU!' : 'RAGE');
  if (f.o2_rage && T % 3 === 0) particles.push({ x: f.x - f.face * 20 + (Math.random() - .5) * 20, y: f.y - 90 * SC(f), vx: 0, vy: -2, life: 16, max: 16, c: Math.random() < .5 ? '#ff6a1f' : '#ffd23f', sz: PX * 2 });
};
function o2_spines(f, k) { // glowing back spines, k = 0..1 charge
  const G = SC(f), col = k >= 1 ? '#ffffff' : k > .66 ? '#9ff3ff' : k > .33 ? '#3bb0ff' : '#ffd23f';
  for (let i = 0; i < 4; i++) {
    const x = f.x - f.face * (16 + i * 3) * G, y = f.y - (92 - i * 14) * G, s = (6 + k * 6) * G;
    ctx.globalAlpha = .5 + .5 * Math.sin(T * .6 + i); pxDisc(ctx, x, y, s, col); ctx.globalAlpha = 1;
  }
}
function o2_drawAtom(c, p) {
  const d = Math.sign(p.vx) || 1, fl = (p.t % 4 < 2) ? 4 : 0;
  pxRect(c, Math.min(p.x, p.x - d * 150), p.y - 18 - fl, 150, 36 + fl * 2, '#3bb0ff');
  pxRect(c, Math.min(p.x, p.x - d * 150), p.y - 8, 150, 16, '#e8feff');
  pxDisc(c, p.x, p.y, 26 + fl, '#9ff3ff'); pxDisc(c, p.x, p.y, 14, '#ffffff');
}
function o2_drawDino(c, p) {
  if (p.kind === 'o2_egg') { pxDisc(c, p.x, p.y - 12, 14, '#f4f0e0'); pxRect(c, p.x - 6, p.y - 18, 5, 5, '#4fbf3a'); pxRect(c, p.x + 3, p.y - 9, 4, 4, '#4fbf3a'); if (p.t > 35 && p.t % 6 < 3) pxRect(c, p.x - 2, p.y - 26, 3, 9, '#15151a'); return; }
  const d = Math.sign(p.vx) || p.d || 1, b = (p.t >> 2) % 2 * 3, jaw = p.latch && p.t % 8 < 4 ? 6 : 0;
  pxRect(c, p.x - 18, p.y - 24 + b, 30, 21, '#4fbf3a'); pxRect(c, p.x + d * 9 - (d < 0 ? 18 : 0), p.y - 33 + b - jaw, 18, 12, '#4fbf3a');
  pxRect(c, p.x + d * 9 - (d < 0 ? 18 : 0), p.y - 18 + b, 18, 5, '#3a9a2a'); pxRect(c, p.x + d * 20, p.y - 30 + b - jaw, 4, 4, '#111');
  pxRect(c, p.x - d * 24 - 6, p.y - 15, 12, 6, '#4fbf3a'); pxRect(c, p.x - 9, p.y - 30 + b, 4, 6, '#ffd23f'); pxRect(c, p.x - 1, p.y - 30 + b, 4, 6, '#ffd23f');
}
KITS.kaiju = {
  desc: 'Rage fills as he hits and gets hit — at max he becomes a giant armored KAIJU. Hold B to charge atomic breath.',
  specials: ['Atomic Breath (hold)', 'Tail Whip (B again)', 'Rocket Roar (↓ stomp)', 'Dino Egg'],
  specials_: {
    n: { dur: 46, grav: .5, multi: 5, dmg: 2, b: 2, g: 0, ang: 25, p: ['castW', 'cast'],
      start(f) { f.o2_br = f.o2_rage ? 60 : 0; f.o2_bm = 0; },
      tick(f, t, inp) {
        if (t === 6 && inp.b && f.o2_br < 60) { f.o2_br++; if (f.o2_br % 12 === 0) SFX.play('charge'); if (T % 3 === 0) fxBurst(f.x - f.face * 20, f.y - 80, '#9ff3ff', 1, 2, 12); return 'hold'; }
        if (t !== 7 && !(f.o2_bm === 1 && t > 7 && t < 30)) return;
        if (t === 7) {
          f.o2_bm = f.o2_br >= 40 ? 2 : 1;
          if (f.o2_bm === 2) {
            SFX.play('laser'); SFX.play('boom', .5); shakeCam(8); popText(f.x, f.y - 150, 'ATOMIC BREATH!', '#9ff3ff');
            proj(f, { kind: 'o2_atom', y: -62 * SC(f), vx: 17, r: 26 * SC(f), life: 34, dmg: 6 + Math.round(f.o2_br / 6), b: 5, g: .42, ang: 30, draw: o2_drawAtom });
          } else SFX.play('fire');
        }
        if (f.o2_bm === 1) for (let k = 0; k < 2; k++) particles.push({ x: f.x + f.face * 30, y: f.y - 58 * SC(f), vx: f.face * (8 + Math.random() * 6), vy: (Math.random() - .5) * 4, life: 14, max: 14, c: Math.random() < .5 ? '#ff6a1f' : '#ffd23f', sz: PX * 3 });
      },
      hbAt: (f, t) => f.o2_bm === 1 && t > 8 && t < 30 ? [[65, -58, 28], [100, -58, 24]] : null,
      drawFx(f, t) { if (t <= 8) o2_spines(f, f.o2_br / 60); } },
    // first whip pops the foe up the same height at any %, press B again for the heavy slam
    s: { dur: 36, multi: 8, dmg: 5, b: 6, g: .08, ang: 82, away: 1,
      start(f) { f.o2_tw = 0; },
      pose: (f, t) => ({ ...POSES.spin, rot: t > 5 && t < 16 ? (t - 5) * 36 : f.o2_tw && t >= f.o2_tw - 2 && t < f.o2_tw + 8 ? -(t - f.o2_tw) * 30 : 0 }),
      hbAt(f, t) {
        if (t >= 6 && t <= 10) return [[-55, -25, 34], [55, -25, 34]];
        if (f.o2_tw && t >= f.o2_tw && t < f.o2_tw + 5) return [[50, -75, 46, { dmg: 10, b: 6, g: .45, ang: 45 }]];
        return null;
      },
      tick(f, t, inp, E) { if (!f.o2_tw && t > 9 && t < 24 && E('b')) { f.o2_tw = t + 3; SFX.play('swing'); popText(f.x, f.y - 140, 'TAIL SLAM!', '#4fbf3a'); } } },
    u: { dur: 44, helpless: 1, grav: .6, multi: 5, dmg: 3, b: 5, g: 0, ang: 88,
      start(f) { f.o2_st = 0; },
      pose: (f, t) => f.o2_st ? POSES.dair : t < 5 ? POSES.usmashW : POSES.usmash,
      hbAt(f, t) {
        if (f.o2_st) return [[0, -10, 42, { dmg: 11, b: 5, g: .4, ang: -70 }]];
        return t >= 5 && t < 26 ? (t >= 22 ? [[0, -80, 50, { dmg: 7, b: 7, g: .4, ang: 75 }]] : [[0, -75, 44]]) : null;
      },
      tick(f, t, inp) {
        if (t === 5) { f.vy = -19; f.ground = null; SFX.play('boom'); fxRing(f.x, f.y - 80, '#ffd23f', 70); popText(f.x, f.y - 150, 'RAWR!', '#ffd23f'); }
        if (t > 5 && !f.o2_st) f.vx = inp.x * 4;
        if (t >= 16 && !f.o2_st && inp.y > .6) { f.o2_st = 1; f.hitDone = false; SFX.play('swing'); }
        if (f.o2_st) { f.vy = 17; f.vx = 0; fxBurst(f.x, f.y - 20, '#ffd23f', 1, 3, 10); return 'hold'; }
        if (t >= 5 && t < 26) fxBurst(f.x, f.y - 40, '#ffd23f', 2, 4);
      },
      onLand(f) { if (f.o2_st) { f.o2_st = 0; quake(f); } return false; } },
    d: { s: 12, a: 0, e: 14, p: ['stomp', 'crouch'], tick(f, t) {
      if (t !== 12) return; SFX.play('grab');
      const mine = projectiles.filter(p => p.owner === f.i && (p.kind === 'o2_egg' || p.kind === 'o2_dino'));
      if (mine.length >= 2) mine[0].life = 0;
      spawn({ owner: f.i, kind: 'o2_egg', x: f.x - f.face * 20, y: f.y - 20, vy: -2, grav: .5, r: 14, life: 420, inert: true, refl: false, onGround: 'stop', dmg: 2, b: 2, g: 0, ang: 60, draw: o2_drawDino,
        tick(p) {
          const foe = fighters[1 - p.owner];
          if (p.kind === 'o2_egg' && p.t === (fighters[p.owner].o2_rage ? 15 : 50)) {
            Object.assign(p, { kind: 'o2_dino', inert: false, stopped: false, onGround: 'slide', grav: .5, r: 24, life: 240, vx: (Math.sign(foe.x - p.x) || 1) * 6 });
            fxBurst(p.x, p.y - 12, '#f4f0e0', 10, 4); SFX.play('grab'); popText(p.x, p.y - 50, 'HATCH!', '#4fbf3a');
          }
          if (p.cd && --p.cd === 0) p.inert = false;
          if (p.latch) { if (!o2_free(foe) && foe.act !== 'hurt') { p.life = 0; return; } p.stopped = true; p.x = foe.x - p.d * 18; p.y = foe.y - 30; }
          else if (p.kind === 'o2_dino' && p.vy === 0) p.vx = (Math.sign(foe.x - p.x) || 1) * 6;
        },
        onHit(p, foe) { // latch on: two nibbles, then a chomp that pops them up
          p.bites = (p.bites || 0) + 1; p.latch = 1; p.d = Math.sign(p.vx) || 1; p.cd = 12;
          if (p.bites === 2) Object.assign(p, { dmg: 4, b: 6, g: .1, ang: 85 });
          if (p.bites >= 3) { p.life = 0; fxBurst(p.x, p.y, '#4fbf3a', 8, 5); }
          SFX.play('hit', .3);
        } });
    } },
  },
  normals: { // Tail Trip: fixed pop-up, the combo starter
    dtilt: { s: 5, a: 4, e: 10, hb: [[55, -10, 26], [85, -10, 20]], dmg: 5, b: 6, g: .08, ang: 84, p: ['dtiltW', 'dtilt'] },
  },
};

// ================= DJ BASS — rhythm, hype, speakers, the drop =================
const o2_onBeat = () => { const k = T % 30; return k < 7 || k > 25; };
function o2_dj(f) { // called when any DJ special starts: judge the timing
  f.o2_ob = o2_onBeat();
  if (f.o2_ob) { o2_meter(f, f.store + 22); popText(f.x, f.y - 150, 'ON BEAT!', '#3bf0ff'); fxRing(f.x, f.y - 55, '#3bf0ff', 50); }
  else popText(f.x, f.y - 150, 'off beat', '#6a6f7a');
}
O2_HUD.djbass = f => { // metronome equalizer over his head, flashing on the beat
  const x = f.x, y = f.y - f.ch.hh - 64, k = T % 30, hot = o2_onBeat();
  for (let i = 0; i < 5; i++) { const h = 6 + Math.abs(Math.sin((T + i * 7) * .2)) * (hot ? 18 : 8); pxRect(ctx, x - 24 + i * 10, y - h, 7, h, hot ? (i % 2 ? '#3bf0ff' : '#ff3bd4') : '#5a4a7a'); }
  if (k < 6) { ctx.strokeStyle = '#b06cff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(f.x, f.y - 55, 50 + k * 8, 0, 7); ctx.stroke(); }
  if (f.store > 0) o2_bar(f, f.store, '#ff3bd4', 'HYPE');
};
O2_PASSIVE.djbass = () => {};
function o2_drawSpeaker(c, p) {
  const k = T % 30, pump = k < 5 ? 6 : 0;
  pxRect(c, p.x - 27 - pump / 2, p.y - 60 - pump, 54 + pump, 60 + pump, '#2a2a3a'); pxRect(c, p.x - 27, p.y - 60, 54, 6, '#b06cff');
  pxDisc(c, p.x, p.y - 22, 15 + pump / 2, '#3bf0ff'); pxDisc(c, p.x, p.y - 22, 7, '#15151a'); pxDisc(c, p.x, p.y - 47, 6, '#ff3bd4');
}
function o2_drawDrop(c, p) {
  const o = fighters[p.owner], k = Math.max(0, 1 - p.t / 60);
  ctx.strokeStyle = (p.t >> 2) % 2 ? '#ff3bd4' : '#3bf0ff'; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.arc(o.x, o.y - 55, 40 + k * 180, 0, 7); ctx.stroke();
}
KITS.djbass = {
  desc: 'Everything is better on the beat (watch the equalizer). On-beat specials build HYPE for a bigger DROP. Speakers pulse on every beat.',
  specials: ['Sound Wave', 'Rewind Scratch', 'Speaker Launch', 'Drop the Beat'],
  specials_: {
    n: { s: 8, a: 0, e: 14, p: ['castW', 'cast'], start: o2_dj, tick(f, t) {
      if (t !== 8) return; const ob = f.o2_ob; SFX.play('laser', ob ? .8 : .4);
      proj(f, { kind: 'o2_wave', vx: ob ? 11 : 8, r: 16, life: ob ? 55 : 40, dmg: ob ? 7 : 4, b: ob ? 6 : 4, g: ob ? .3 : .15, ang: 35, draw: drawRings, big: ob, tick(p) { p.r = (p.big ? 22 : 14) + p.t * (p.big ? 1 : .6); } });
    } },
    // rewinds the foe to where they were half a second ago; on beat it also dizzies them
    s: { s: 6, a: 0, e: 16, p: ['counter', 'cast'], start: o2_dj, tick(f, t) {
      if (t !== 7) return; SFX.play('laser', .4); fxRing(f.x, f.y - 55, '#3bf0ff', 150); popText(f.x, f.y - 130, 'WIKI-WIKI!', '#3bf0ff');
      const foe = o2_foe(f), ob = f.o2_ob;
      if (o2_free(foe) && Math.hypot(foe.x - f.x, foe.y - f.y) < 300 && foe.hist && foe.hist.length > 30) {
        const [hx, hy] = foe.hist[foe.hist.length - 30];
        for (let i = foe.hist.length - 30; i < foe.hist.length; i += 3) fxBurst(foe.hist[i][0], foe.hist[i][1] - 50, '#b06cff', 1, 1, 20);
        teleport(foe, hx, hy); foe.vx = foe.vy = 0;
        o2_hit(f, foe, { dmg: ob ? 6 : 3, b: ob ? 4 : 3, g: .05, ang: 80 });
        if (ob) { setAct(foe, 'dizzy'); foe.stun = 36; popText(foe.x, foe.y - 140, 'REWOUND!', '#ff3bd4'); }
      }
      for (const p of projectiles) if (o2_absorbable(f, p) && Math.hypot(p.x - f.x, p.y - f.y) < 260) { p.vx = -p.vx; p.vy = -p.vy; p.owner = f.i; fxRing(p.x, p.y, '#3bf0ff', 20); }
    } },
    u: { dur: 26, airUses: 1, p: ['crouch', 'jump'], dmg: 6, b: 7, g: .15, ang: 88, start: o2_dj,
      hbAt: (f, t) => t >= 4 && t < 9 ? [[0, -20, 44]] : null,
      tick(f, t) {
        if (t !== 4) return; SFX.play('boom'); f.vy = f.o2_ob ? -23 : -20; f.ground = null;
        const mine = projectiles.filter(p => p.owner === f.i && p.kind === 'o2_spk');
        if (mine.length >= 2) mine[0].life = 0;
        spawn({ owner: f.i, kind: 'o2_spk', x: f.x, y: f.y, vy: 2, grav: .6, r: 30, life: 540, inert: true, refl: false, onGround: 'stop', draw: o2_drawSpeaker,
          tick(p) {
            if (!p.stopped) { if (p.t > 90) p.life = 0; return; }
            const o = fighters[p.owner], foe = fighters[1 - p.owner];
            if (T % 30 === 0) { // pulse on every beat: pops the foe up (combo) and bounces DJ like a trampoline
              fxRing(p.x, p.y - 25, '#3bf0ff', 70);
              if (canBeHit(foe) && Math.hypot(foe.x - p.x, foe.y - 40 - p.y) < 105) o2_hit(o, foe, { dmg: 4, b: 6, g: .06, ang: 84 }, Math.sign(foe.x - p.x) || 1);
            }
            if (o.act === 'air' && o.vy > 0 && Math.abs(o.x - p.x) < 36 && o.y > p.y - 70 && o.y < p.y - 40) { o.vy = -16; o.ground = null; SFX.play('djump'); fxRing(p.x, p.y - 60, '#ff3bd4', 40); }
          } });
      } },
    d: { s: 8, a: 0, e: 10, p: ['stomp', 'victory'], start: o2_dj, tick(f, t) {
      if (t !== 8 || owned(f, 'o2_drop')) return;
      SFX.play('charge'); popText(f.x, f.y - 150, 'BUILD UP...', '#b06cff');
      spawn({ owner: f.i, kind: 'o2_drop', x: 0, y: -300, r: 1, life: 90, inert: true, stopped: true, refl: false, beats: 0, draw: o2_drawDrop,
        tick(p) {
          if (T % 30 || p.t < 3) return;
          const o = fighters[p.owner], foe = fighters[1 - p.owner];
          if (++p.beats < 2) { popText(o.x, o.y - 150, '1...', '#ff3bd4'); SFX.play('beep'); return; }
          const hype = o.store, dmg = 8 + Math.round(hype / 10), R = 150 + hype;
          o.store = 0; p.life = 0; flash = 6; shakeCam(10 + hype / 8); SFX.play('boom'); popText(o.x, o.y - 170, hype >= 80 ? 'MEGA DROP!!' : 'DROP!', '#ff3bd4');
          const spots = [o, ...projectiles.filter(q => q.owner === p.owner && q.kind === 'o2_spk' && q.stopped)];
          for (const s of spots) { fxRing(s.x, s.y - 40, '#ff3bd4', R); fxRing(s.x, s.y - 40, '#3bf0ff', R * .6); fxBurst(s.x, s.y - 40, '#b06cff', 20, 10); }
          if (canBeHit(foe) && spots.some(s => Math.hypot(foe.x - s.x, foe.y - s.y) < R)) o2_hit(o, foe, { dmg, b: 5, g: .45, ang: 70 });
        } });
    } },
  },
  normals: { // Beat Tap: on-beat jabs hit harder and build hype
    jab: { dmgFn: () => o2_onBeat() ? 5 : 3, onHit(f) { if (o2_onBeat()) { o2_meter(f, f.store + 8); popText(f.x, f.y - 140, 'ON BEAT!', '#3bf0ff'); } } },
  },
};

// ================= MIMI — magic tricks, applause meter =================
const O2_SUITS = ['HEARTS', 'DIAMONDS', 'CLUBS', 'SPADES'];
function o2_drawCard(c, p) {
  const w = Math.max(3, 18 * Math.abs(Math.cos(p.t * .3)));
  pxRect(c, p.x - w / 2, p.y - 12, w, 24, '#7a2ab0'); pxRect(c, p.x - w / 2 + 2, p.y - 10, Math.max(2, w - 4), 20, '#ffd23f'); pxRect(c, p.x - 2, p.y - 3, 4, 6, '#7a2ab0');
}
function o2_suit(o, foe, p) {
  const s = O2_SUITS[Math.random() * 4 | 0]; o2_meter(o, o.store + 15);
  const col = s === 'HEARTS' || s === 'DIAMONDS' ? '#ff3b5a' : '#e8ecf4';
  popText(foe.x, foe.y - 150, s + '!', col); fxBurst(foe.x, foe.y - 60, col, 12, 6);
  if (s === 'HEARTS') { o.dmg = Math.max(0, o.dmg - 6); popText(o.x, o.y - 130, '-6%', '#ff5a9a'); fxBurst(o.x, o.y - 60, '#ff5a9a', 10, 4); }
  if (s === 'DIAMONDS') { SFX.play('zap'); o2_hit(o, foe, { dmg: 9, b: 6, g: .38, ang: 40 }, Math.sign(p.vx) || o.face); }
  if (s === 'CLUBS' && o2_free(foe)) { setAct(foe, 'dizzy'); foe.stun = 45; }
  if (s === 'SPADES' && o2_free(foe) && o2_free(o)) { // Switcheroo
    const ax = o.x, ay = o.y; fxBurst(ax, ay - 50, '#b06cff', 14, 6); fxBurst(foe.x, foe.y - 50, '#b06cff', 14, 6);
    teleport(o, foe.x, foe.y); teleport(foe, ax, ay); o.face = Math.sign(foe.x - o.x) || o.face; SFX.play('shadow'); popText(o.x, o.y - 170, 'SWITCHEROO!', '#ffd23f');
  }
}
function o2_drawSawBox(c, p) {
  const x = p.x, y = p.y, saw = Math.sin(p.t * .5) * 14;
  if (p.t < 38) {
    pxRect(c, x - 36, y - 72, 72, 58, '#7a2ab0'); pxRect(c, x - 36, y - 72, 72, 6, '#ffd23f'); pxRect(c, x - 36, y - 20, 72, 6, '#ffd23f');
    for (let i = 0; i < 4; i++) pxRect(c, x - 30 + i * 18, y - 60, 6, 6, '#ffd23f');
    pxRect(c, x - 3 + saw, y - 100, 6, 90, '#c8ccd8'); pxRect(c, x - 12 + saw, y - 106, 24, 10, '#8a5a2e');
    if (p.t % 8 < 4) fxBurst(x + saw, y - 42, '#ffffff', 1, 4, 8);
  } else { pxRect(c, x - 56, y - 72 + (p.t - 38) * 4, 36, 58, '#7a2ab0'); pxRect(c, x + 20, y - 72 + (p.t - 38) * 4, 36, 58, '#7a2ab0'); }
}
function o2_drawRabbit(c, p) {
  const d = Math.sign(p.vx) || 1, b = p.vy < 0 ? -3 : 0;
  pxDisc(c, p.x, p.y - 14 + b, 13, '#ffffff'); pxDisc(c, p.x + d * 12, p.y - 24 + b, 9, '#ffffff');
  pxRect(c, p.x + d * 8, p.y - 48 + b, 5, 18, '#ffffff'); pxRect(c, p.x + d * 15, p.y - 46 + b, 5, 16, '#ffffff'); pxRect(c, p.x + d * 9, p.y - 44 + b, 2, 10, '#ff9ac0');
  pxRect(c, p.x + d * 16, p.y - 26 + b, 3, 3, '#d8263a');
}
function o2_drawDove(c, p) { const w = Math.sin(p.t * .8) * 10; pxDisc(c, p.x, p.y, 9, '#ffffff'); pxRect(c, p.x - 18, p.y - 4 - w, 14, 5, '#e8ecf4'); pxRect(c, p.x + 4, p.y - 4 - w, 14, 5, '#e8ecf4'); pxRect(c, p.x + (Math.sign(p.vx) || 1) * 9, p.y - 2, 4, 3, '#f2a030'); }
KITS.mimi = {
  desc: 'Every card is a surprise suit. Tricks earn APPLAUSE; a full hat pulls out a rabbit. Saw your foe in half!',
  specials: ['Pick a Card', 'Sawing Box', 'Dove Lift (B: dove)', 'Top Hat'],
  specials_: {
    n: { s: 8, a: 0, e: 16, p: ['castW', 'cast'], tick(f, t) {
      if (t !== 8) return; SFX.play('throw');
      proj(f, { kind: 'o2_card', vx: 12, r: 12, life: 45, dmg: 3, b: 3, g: .05, ang: 40, draw: o2_drawCard, onHit(p, foe) { p.life = 0; o2_suit(fighters[p.owner], foe, p); } });
    } },
    // command grab: lunge, lock the foe in a box, saw, then the halves pop them straight up
    s: { s: 8, a: 0, e: 20, dur: 50, p: ['grabW', 'grab'],
      tick(f, t) {
        if (t >= 6 && t <= 12) f.vx = f.face * 6;
        if (t < 9 || t > 14 || f.o2_sawing === f.moveId) return;
        const foe = o2_foe(f), G = SC(f);
        if (!o2_free(foe) || !circleRect(f.x + f.face * 50 * G, f.y - 55 * G, 34 * G, hurtbox(foe))) return;
        f.o2_sawing = f.moveId; SFX.play('grab'); popText(foe.x, foe.y - 150, 'SAWING IN HALF!', '#ffd23f');
        setAct(foe, 'dizzy'); foe.stun = 60; foe.vx = foe.vy = 0;
        spawn({ owner: f.i, kind: 'o2_saw', x: foe.x, y: f.y, r: 1, life: 48, inert: true, stopped: true, refl: false, draw: o2_drawSawBox,
          tick(p) {
            const o = fighters[p.owner], g = fighters[1 - p.owner];
            if (p.t < 38) { g.x = p.x; g.y = p.y; g.vx = g.vy = 0; if (p.t % 9 === 0) { g.dmg += 1; o.stats.dealt += 1; g.hitFlash = 3; SFX.play('hit', .2); } }
            if (p.t === 38) { setAct(g, g.ground ? 'stand' : 'air'); o2_hit(o, g, { dmg: 6, b: 7, g: .15, ang: 85 }, o.face); o2_meter(o, o.store + 30); popText(p.x, p.y - 150, 'TA-DA!', '#ffd23f'); }
          } });
      } },
    u: { dur: 46, helpless: 1, grav: .2, p: ['victory', 'victory'], multi: 6, dmg: 2, b: 4, g: .05, ang: 80,
      start(f) { f.o2_dv = 0; },
      hbAt: (f, t) => t > 5 && t < 34 && f.o2_dv < 3 ? [[0, -125, 30]] : null,
      tick(f, t, inp, E) {
        if (t <= 4 || t >= 36) return;
        f.vy = -(4.5 + (3 - f.o2_dv) * 1.2); f.vx = inp.x * 4.5; f.ground = null;
        if (t % 3 === 0) fxBurst(f.x + (Math.random() - .5) * 50, f.y - 120, '#ffffff', 1, 2, 16);
        if (t > 6 && E('b') && f.o2_dv < 3) { // release a dove at the foe (lift gets weaker)
          f.o2_dv++; const foe = o2_foe(f), dx = foe.x - f.x, dy = foe.y - 55 - (f.y - 120), m = Math.hypot(dx, dy) || 1;
          spawn({ owner: f.i, kind: 'o2_dove', x: f.x, y: f.y - 120, vx: dx / m * 10, vy: dy / m * 10, r: 14, life: 50, dmg: 4, b: 5, g: .1, ang: 70, draw: o2_drawDove }); SFX.play('throw');
        }
      },
      drawFx(f, t) { for (let i = 0; i < 3 - f.o2_dv; i++) o2_drawDove(ctx, { x: f.x - 30 + i * 30, y: f.y - 128 - (i % 2) * 10, t: t + i * 3, vx: f.face }); } },
    d: { dur: 34, p: ['counter', 'cast'], tick(f, t) {
      const hx = f.x + f.face * 40, hy = f.y - 70;
      if (t === 4 && f.store >= 30) { // pull a rabbit out of the hat
        f.o2_rab = f.moveId; o2_meter(f, f.store - 30); SFX.play('counter'); popText(hx, hy - 60, 'A RABBIT!', '#ffd23f'); fxBurst(hx, hy, '#ffffff', 16, 6);
        spawn({ owner: f.i, kind: 'o2_rabbit', x: hx, y: hy, vx: f.face * 5, vy: -8, grav: .6, r: 18, life: 200, onGround: 'slide', dmg: 6, b: 6, g: .2, ang: 70, draw: o2_drawRabbit,
          tick(p) { if (p.vy === 0 && p.t > 3) { const foe = fighters[1 - p.owner]; p.vy = -9; p.vx = (Math.sign(foe.x - p.x) || 1) * 6; } } });
      }
      if (f.o2_rab === f.moveId || t < 3 || t > 24) return;
      for (const p of projectiles) if (o2_absorbable(f, p) && Math.hypot(p.x - hx, p.y - hy) < 75) {
        p.life = 0; o2_meter(f, f.store + 30); SFX.play('grab'); popText(hx, hy - 60, 'VANISHED!', '#b06cff'); fxBurst(hx, hy, '#b06cff', 12, 5);
      }
    },
    drawFx(f, t) { // the top hat, held out in front
      if (f.o2_rab === f.moveId && t > 10) return;
      const x = f.x + f.face * 40, y = f.y - 70;
      pxRect(ctx, x - 24, y - 3, 48, 8, '#15151a'); pxRect(ctx, x - 15, y - 33, 30, 32, '#15151a'); pxRect(ctx, x - 15, y - 12, 30, 5, '#d8263a');
      if (t > 3 && t <= 24 && f.o2_rab !== f.moveId) { ctx.strokeStyle = '#b06cff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y - 10, 70 - (t % 10) * 4, 0, 7); ctx.stroke(); }
    } },
  },
  normals: { // Wand Flourish: fixed pop-up for juggles
    utilt: { s: 4, a: 5, e: 10, hb: [[20, -115, 30], [35, -85, 22]], dmg: 5, b: 6, g: .1, ang: 88, p: ['utiltW', 'utilt'],
      onHit(f, foe) { fxBurst(foe.x, foe.y - 90, '#ffd23f', 8, 5); } },
  },
};

// ================= ASTRO — jetpack fuel, orbiting moon rocks, gravity =================
O2_PASSIVE.astro = (f, p) => {
  if (!p.init || f.act === 'respawn') { p.init = 1; f.store = 90; }
  if (f.ground && f.store < 90) o2_meter(f, f.store + 1.5);
};
O2_HUD.astro = f => { if (f.store < 90) o2_bar(f, f.store, f.store < 20 ? '#ff3b3b' : '#f2a030', 'FUEL'); };
function o2_drawWell(c, p) {
  const k = p.boomed ? 1 : Math.min(1, p.t / 20);
  ctx.strokeStyle = '#b06cff'; ctx.lineWidth = 3;
  for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(p.x, p.y, (40 + i * 30) * k, p.t * .2 + i * 2, p.t * .2 + i * 2 + 3); ctx.stroke(); }
  pxDisc(c, p.x, p.y, 22 * k + Math.sin(p.t * .5) * 2, '#15151a'); pxDisc(c, p.x, p.y, 10 * k, '#6a2ab0');
  if (p.t % 3 === 0) { const a = Math.random() * 6.28; particles.push({ x: p.x + Math.cos(a) * 120, y: p.y + Math.sin(a) * 120, vx: -Math.cos(a) * 7, vy: -Math.sin(a) * 7, life: 14, max: 14, c: '#b06cff', sz: PX * 2 }); }
}
function o2_drawTether(c, p) {
  const o = fighters[p.owner]; ctx.strokeStyle = p.link ? '#f2a030' : '#ffd23f'; ctx.lineWidth = 3; ctx.setLineDash([9, 6]);
  ctx.beginPath(); ctx.moveTo(o.x + o.face * 20, o.y - 60); ctx.lineTo(p.x, p.y); ctx.stroke(); ctx.setLineDash([]);
  pxDisc(c, p.x, p.y, 10, '#f2a030'); pxDisc(c, p.x, p.y, 5, '#ffffff');
}
KITS.astro = {
  desc: 'Hold ↑B to fly on limited FUEL (refills on the ground). Moon rocks orbit you; a tether makes foes float for juggles.',
  specials: ['Moon Rocks (3: fling)', 'Gravity Well', 'Jetpack (hold B)', 'Zero-G Tether (B:yank)'],
  specials_: {
    n: { s: 8, a: 0, e: 12, p: ['castW', 'cast'], tick(f, t) {
      if (t !== 8) return;
      const rocks = projectiles.filter(p => p.owner === f.i && p.kind === 'o2_orb' && !p.fling && p.life > 0);
      if (rocks.length >= 3) { // fling them all forward
        SFX.play('throw'); popText(f.x, f.y - 140, 'FLING!', '#f2a030');
        rocks.forEach((p, i) => Object.assign(p, { fling: 1, vx: f.face * 14, vy: (i - 1) * 1.5, life: 60, dmg: 6, b: 5, g: .3, ang: 40 }));
        return;
      }
      SFX.play('rock', .4);
      spawn({ owner: f.i, kind: 'o2_orb', x: f.x, y: f.y - 55, r: 14, life: 900, refl: false, k: rocks.length, dmg: 4, b: 6, g: .08, ang: 80, draw: drawMoonRock,
        tick(p) {
          if (p.fling) return; const o = fighters[p.owner];
          if (['dead', 'out'].includes(o.act)) { p.life = 0; return; }
          const a = T * .07 + p.k * 2.094, c = o2_mid(o); p.x = c.x + Math.cos(a) * 75; p.y = c.y + Math.sin(a) * 55; p.vx = p.vy = 0;
        },
        onHit(p) { p.life = 0; fxBurst(p.x, p.y, '#9aa0aa', 8, 4); } });
    } },
    s: { s: 10, a: 0, e: 16, p: ['castW', 'cast'], tick(f, t) {
      if (t !== 10) return; killOwned(f, 'o2_well'); SFX.play('shadow');
      proj(f, { kind: 'o2_well', vx: 6, r: 30, life: 150, inert: true, refl: false, draw: o2_drawWell,
        tick(p) {
          p.vx *= .94; p.vy *= .9;
          const o = fighters[p.owner], foe = fighters[1 - p.owner];
          if (p.t === 125) { // collapse: pops whoever got sucked in
            Object.assign(p, { inert: false, stopped: true, r: 80, dmg: 8, b: 7, g: .15, ang: 88, away: 0, life: 5, boomed: 1 });
            SFX.play('boom', .6); fxRing(p.x, p.y, '#b06cff', 90); fxBurst(p.x, p.y, '#e8ecf4', 16, 7); return;
          }
          if (p.t > 125 || !o2_free(foe) && foe.act !== 'hurt') return;
          const dx = p.x - foe.x, dy = p.y - (foe.y - 55), d = Math.hypot(dx, dy);
          if (d > 240 || d < 8) return;
          const k = .35 + (1 - d / 240) * .9; foe.vx = foe.vx * .96 + dx / d * k; if (!foe.ground) foe.vy = foe.vy * .96 + dy / d * k;
        } });
    } },
    // tap = short burst, hold = fly until the fuel runs out; the exhaust burns foes below
    u: { dur: 400, helpless: 1, grav: .4, p: ['jump', 'jump'], multi: 6, dmg: 2, b: 4, g: 0, ang: -60,
      hbAt: (f, t) => t > 2 && f.o2_jet ? [[0, 20, 26]] : null,
      tick(f, t, inp) {
        f.o2_jet = 0;
        if (t > 18 && (!inp.b || f.store <= 0)) return 'end';
        if (t < 3) return;
        if (f.store <= 0 && t > 3) return 'end';
        o2_meter(f, f.store - 1.1); f.o2_jet = 1; f.ground = null; f.jet = true;
        const d = stickDir(inp, 0, -1);
        f.vx += (d.x * 7 - f.vx) * .15; f.vy = Math.max(-9, f.vy + Math.min(-.5, d.y * 1.3) - .15);
        if (t % 2) particles.push({ x: f.x - f.face * 12, y: f.y + 6, vx: (Math.random() - .5) * 2, vy: 5, life: 12, max: 12, c: t % 4 < 2 ? '#ff6a1f' : '#ffd23f', sz: PX * 3 });
        if (t % 8 === 3) SFX.play('fire', .3);
      } },
    d: { s: 8, a: 0, e: 14, p: ['castW', 'cast'],
      alt(f) { // yank the tethered foe toward you
        const p = owned(f, 'o2_teth'); if (!p || !p.link) return false;
        const foe = o2_foe(f); p.life = 0;
        if (!o2_free(foe) && foe.act !== 'hurt') return true;
        const dx = f.x - foe.x, dy = f.y - foe.y, m = Math.hypot(dx, dy) || 1;
        setAct(foe, 'hurt'); foe.stun = 22; foe.launch = 0; foe.vx = dx / m * Math.min(14, m / 8); foe.vy = dy / m * Math.min(14, m / 8) - 3; foe.ground = null;
        SFX.play('grab'); popText(foe.x, foe.y - 140, 'YANK!', '#f2a030'); return true;
      },
      tick(f, t) {
        if (t !== 8) return; killOwned(f, 'o2_teth'); SFX.play('zap', .5);
        proj(f, { kind: 'o2_teth', vx: 15, r: 14, life: 26, refl: false, dmg: 3, b: 2, g: 0, ang: 60, draw: o2_drawTether,
          tick(p) { const foe = fighters[1 - p.owner]; if (p.link) { if (!foe.lowGrav) { p.life = 0; return; } p.x = foe.x; p.y = foe.y - 55; } },
          onHit(p, foe) { p.link = 1; p.life = 180; p.stopped = true; foe.lowGrav = 180; popText(foe.x, foe.y - 150, 'ZERO-G!', '#f2a030'); } });
      } },
  },
  normals: { // Moon Boot Flip: low-growth juggle
    uair: { s: 4, a: 6, e: 10, hb: [[0, -115, 34], [15, -90, 22]], dmg: 6, b: 6, g: .12, ang: 88, air: 1, ll: 6, p: ['uairW', 'uair'] },
  },
};

// ================= GRANNY GIGI — slow, brutal, cranky =================
function o2_purseDraw(f, t, spin) {
  const a = spin, G = SC(f), hx = f.x + f.face * 26 * G, hy = f.y - 62 * G, x = hx + Math.cos(a) * 36 * G, y = hy + Math.sin(a) * 36 * G;
  ctx.strokeStyle = '#6a4a2a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(x, y); ctx.stroke();
  pxRect(ctx, x - 13, y - 9, 26, 20, '#d8263a'); pxRect(ctx, x - 13, y - 9, 26, 5, '#8a1a2a'); pxRect(ctx, x - 3, y - 6, 6, 5, '#ffd23f');
}
const O2_RANT = ['BACK IN MY DAY...', 'WE WALKED 10 MILES', 'UPHILL! BOTH WAYS!', 'IN THE SNOW!', 'AND WE LIKED IT!'];
// BINGO card: every hit she lands marks a square; a full card (8 hits) makes her next →B an instant, armored WHAMMY.
O2_PASSIVE.granny = (f, p) => {
  const foe = o2_foe(f), fd = foe.dmg - (p.lf ?? foe.dmg); p.lf = foe.dmg;
  if (fd > 0 && foe.lastHitBy === f.i && f.store < 90) { o2_meter(f, f.store + 11.25); if (f.store >= 90) { popText(f.x, f.y - 160, 'BINGO!', '#ffd23f'); SFX.play('confirm'); fxRing(f.x, f.y - 60, '#ffd23f', 80); } }
};
O2_HUD.granny = f => { if (f.store > 0) o2_bar(f, f.store, f.store >= 90 ? '#d8263a' : '#ffd23f', f.store >= 90 ? 'BINGO! →B' : 'BINGO'); };

KITS.granny = {
  desc: 'Hold →B to wind up her purse (armored at max). Land 8 hits for BINGO: the next purse is an instant WHAMMY. Her rant puts foes to sleep.',
  specials: ['Hard Candy', 'Purse Wind-Up (hold)', 'Umbrella Float', 'Back In My Day...'],
  specials_: {
    n: { s: 8, a: 0, e: 14, p: ['castW', 'cast'], tick(f, t) {
      if (t !== 8) return; SFX.play('throw');
      proj(f, { kind: 'o2_candy', vx: 8, vy: -8, grav: .5, r: 12, life: 90, dmg: 5, b: 6, g: .1, ang: 75, onGround: 'stop', draw: drawCandy,
        tick(p) {
          if (!p.stopped) return;
          if (p.kind === 'o2_candy') { killOwned(fighters[p.owner], 'o2_treat'); Object.assign(p, { kind: 'o2_treat', inert: true, life: 600, landT: p.t }); }
          const o = fighters[p.owner], ready = p.t - p.landT > 90;
          if (ready && p.t % 20 === 0) fxBurst(p.x, p.y - 10, '#ffffff', 1, 2, 12);
          if (ready && o.ground && Math.abs(o.x - p.x) < 40 && Math.abs(o.y - p.y) < 30) {
            p.life = 0; o.dmg = Math.max(0, o.dmg - 6); SFX.play('counter', .5); popText(o.x, o.y - 140, 'MMM! -6%', '#ff5a9a'); fxBurst(o.x, o.y - 60, '#ff5a9a', 12, 4);
          }
        } });
    } },
    s: { dur: 40, grav: .6, b: 6, g: .5, ang: 40, p: ['fsmashW', 'fsmash'],
      start(f) { f.o2_pc = 0; if (f.store >= 90) { f.o2_pc = 90; o2_meter(f, 0); } }, // BINGO cashes in
      pose: (f, t) => t <= 9 ? POSES.fsmashW : POSES.fsmash,
      tick(f, t, inp) {
        if (f.o2_pc >= 90 && t < 10) f.armor = true;
        if (t === 6 && inp.b && f.o2_pc < 90) { f.o2_pc++; if (f.o2_pc >= 60) f.armor = true; if (f.o2_pc % 15 === 0) SFX.play('swing', .3); return 'hold'; }
        if (t === 10 && f.o2_pc >= 90) { popText(f.x, f.y - 150, 'WHAMMY!', '#d8263a'); shakeCam(6); }
      },
      hbAt: (f, t) => t >= 10 && t < 14 ? [[62, -50, 40]] : null,
      dmgFn: f => Math.round(13 + f.o2_pc / 90 * 9),
      drawFx(f, t) { o2_purseDraw(f, t, t <= 9 ? T * (.15 + f.o2_pc / 250) : -.2 + (t - 10) * .15); } },
    u: { dur: 22, airUses: 1, multi: 5, dmg: 3, b: 5, g: .05, ang: 85, p: ['crouch', 'victory'],
      hbAt: (f, t) => t >= 4 && t < 16 ? [[0, -125, 38]] : null,
      tick(f, t) { if (t === 4) { f.vy = -14; f.ground = null; SFX.play('djump'); } if (t === 21) f.glide = true; },
      drawFx(f, t) { const y = f.y - 130, s = Math.sin(t * .8) * 6; ctx.fillStyle = '#d8263a'; ctx.beginPath(); ctx.moveTo(f.x - 45, y + 14); ctx.lineTo(f.x, y - 12 + s); ctx.lineTo(f.x + 45, y + 14); ctx.fill(); pxRect(ctx, f.x - 2, y, 4, 40, '#6a4a2a'); } },
    // a 45-frame rant; any grounded foe close enough dozes off (engine: hits on sleepers do double)
    d: { dur: 48, p: ['counter', 'victory'], tick(f, t) {
      if (t % 12 === 1) SFX.play('beep', .3);
      if (t !== 32) return;
      const foe = o2_foe(f); fxRing(f.x, f.y - 60, '#b8a0d8', 240);
      if (o2_free(foe) && foe.ground && Math.hypot(foe.x - f.x, foe.y - f.y) < 250) {
        setAct(foe, 'locked'); foe.sleep = Math.min(100, 50 + foe.dmg * .25 | 0); foe.vx = 0; popText(foe.x, foe.y - 150, 'ZZZ... BORING...', '#b8a0d8');
      } else popText(f.x, f.y - 150, 'HMPH!', '#f59ab8');
    },
    drawFx(f, t) {
      const s = O2_RANT[Math.min(O2_RANT.length - 1, t / 13 | 0)], x = f.x + f.face * 40, y = f.y - 175;
      pxRect(ctx, x - 100, y - 16, 200, 30, '#ffffff'); pxRect(ctx, f.x + f.face * 10, y + 12, 9, 12, '#ffffff');
      text(s, x, y, 9, '#15151a', 'center', null);
    } },
  },
  normals: {
    // Knitting Needles: rapid pokes that keep the foe in place
    jab: { s: 3, a: 14, e: 10, multi: 4, hb: [[45, -60, 24]], dmg: 2, b: 2, g: 0, ang: 50, p: ['jabW', 'jab'],
      pose: (f, t) => (t >> 1) % 2 ? POSES.jab : POSES.jabW },
    // Cane Hook: long reach, yoinks the foe right in front of her
    ftilt: { s: 7, a: 4, e: 14, hb: [[88, -35, 26], [62, -45, 20]], dmg: 5, b: 3, g: .02, ang: 90, p: ['ftiltW', 'ftilt'],
      onHit(f, foe) { if (foe.act === 'hurt') { foe.x = f.x + f.face * 48; foe.vx = 0; popText(foe.x, foe.y - 140, 'YOINK!', '#f59ab8'); } } },
  },
};

// ================= KAGE — ninja tools =================
function o2_drawMarker(c, p) { const d = Math.sign(p.vx) || p.d || 1; pxDisc(c, p.x, p.y, 16 + (p.t % 10 < 5 ? 3 : 0), 'rgba(59,240,255,.3)'); pxRect(c, p.x - d * 12 - 9, p.y - 2, 18, 4, '#9aa0aa'); pxRect(c, p.x + d * 6 - 3, p.y - 3, 6, 6, '#3bf0ff'); }
function o2_drawShur(c, p) {
  ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.stuck || p.stopped ? .4 : p.t * .6); ctx.fillStyle = '#c8ccd8';
  for (let i = 0; i < 4; i++) { ctx.rotate(Math.PI / 2); ctx.beginPath(); ctx.moveTo(0, -4); ctx.lineTo(14, 0); ctx.lineTo(0, 4); ctx.fill(); }
  ctx.restore(); pxDisc(c, p.x, p.y, 4, p.t % 10 < 5 ? '#ff3bd4' : '#3bf0ff');
}
function o2_shurBoom(p) {
  if (p.life <= 0) return; const o = fighters[p.owner], foe = fighters[1 - p.owner];
  p.life = 0; fxBurst(p.x, p.y, '#ff3bd4', 14, 7); fxRing(p.x, p.y, '#3bf0ff', 40); SFX.play('boom', .5);
  if (canBeHit(foe) && circleRect(p.x, p.y, 55, hurtbox(foe))) o2_hit(o, foe, { dmg: 5, b: 6, g: .12, ang: 85 });
}
function o2_drawClone(c, p) {
  const o = fighters[p.owner]; p.spr ??= { ch: o.ch };
  blit(renderSprite(p.spr, full(idlePose(T, 3)), [30, 10, 60, .45], true), p.x, p.y, PX, p.face, .6);
  if (p.t % 12 < 6) fxBurst(p.x, p.y - 60, '#3bf0ff', 1, 1, 10);
}
const o2_kageSlash = { s: 1, a: 3, e: 12, hb: [[35, -55, 38]], dmg: 7, b: 6, g: .12, ang: 82, p: ['ftilt', 'ftilt'], special: 1 };
KITS.kage = {
  desc: 'Mark foes with a kunai and warp behind them, stick shuriken and detonate, hook with a chain-sickle, leave a decoy clone.',
  specials: ['Sticky Shuriken (B:boom)', 'Marker Kunai (→B: warp)', 'Chain Sickle', 'Shadow Clone'],
  specials_: {
    n: { s: 6, a: 0, e: 10, p: ['castW', 'cast'],
      alt(f) {
        const ss = projectiles.filter(p => p.owner === f.i && p.kind === 'o2_shur' && (p.stuck || p.stopped) && p.life > 0);
        if (!ss.length) return false; popText(f.x, f.y - 140, 'KATSU!', '#ff3bd4'); ss.forEach(o2_shurBoom); return true;
      },
      tick(f, t) {
        if (t !== 6) return; SFX.play('throw');
        const mine = projectiles.filter(p => p.owner === f.i && p.kind === 'o2_shur');
        if (mine.length >= 3) mine[0].life = 0;
        proj(f, { kind: 'o2_shur', vx: 15, vy: 1, r: 10, life: 40, dmg: 2, b: 1, g: 0, ang: 40, onGround: 'stop', draw: o2_drawShur,
          tick(p) {
            const foe = fighters[1 - p.owner];
            if (p.stopped && !p.stuck && !p.parked) { p.parked = 1; p.life = 150; p.inert = true; }
            if (p.stuck) { if (['dead', 'out', 'respawn'].includes(foe.act)) { p.life = 0; return; } p.x = foe.x + p.ox; p.y = foe.y + p.oy; }
            if (p.life === 1 && (p.stuck || p.parked)) o2_shurBoom(p);
          },
          onHit(p, foe) { p.stuck = 1; p.ox = (p.x - foe.x) * .5; p.oy = Math.max(-90, p.y - foe.y); p.life = 150; p.stopped = true; } });
      } },
    s: { s: 7, a: 0, e: 12, p: ['castW', 'cast'],
      alt(f) {
        const m = owned(f, 'o2_mark'); if (!m) return false;
        const foe = o2_foe(f); m.life = 0; fxBurst(f.x, f.y - 50, '#3bf0ff', 12, 5); SFX.play('zap');
        if (m.stuck && canBeHit(foe)) { const s = Math.sign(foe.x - f.x) || f.face; teleport(f, foe.x + s * 55, foe.y); f.face = -s; popText(f.x, f.y - 140, 'BEHIND YOU!', '#3bf0ff'); }
        else teleport(f, m.x, m.y + 40);
        f.vx = f.vy = 0; fxBurst(f.x, f.y - 50, '#3bf0ff', 12, 5); startMove(f, o2_kageSlash); return true;
      },
      tick(f, t) {
        if (t !== 7) return; killOwned(f, 'o2_mark'); SFX.play('throw');
        proj(f, { kind: 'o2_mark', vx: 17, r: 10, life: 240, refl: false, dmg: 3, b: 2, g: 0, ang: 40, onGround: 'stop', draw: o2_drawMarker,
          tick(p) {
            const foe = fighters[1 - p.owner];
            if (p.stuck) { if (['dead', 'out', 'respawn'].includes(foe.act)) { p.stuck = 0; p.stopped = true; } else { p.x = foe.x; p.y = foe.y - 60; } return; }
            if (p.t === 20) { p.d = Math.sign(p.vx); p.stopped = true; p.inert = true; }
          },
          onHit(p) { p.stuck = 1; p.d = Math.sign(p.vx); p.stopped = true; popText(p.x, p.y - 80, 'MARKED', '#3bf0ff'); } });
      } },
    // throw the sickle in the stick direction: hook the foe (yank them in) or the stage (zip to it)
    u: { dur: 40, helpless: 1, airUses: 1, grav: .3, p: ['castW', 'upcut'],
      start(f) { f.o2_hk = null; },
      tick(f, t, inp) {
        if (t === 3) { const d = stickDir(inp, f.face * .45, -.9), m = Math.hypot(d.x, d.y); f.o2_hk = { x: f.x, y: f.y - 70, dx: d.x / m, dy: d.y / m, st: 0 }; SFX.play('throw'); }
        const h = f.o2_hk; if (!h) return;
        const foe = o2_foe(f), M = stage.main;
        if (h.st === 0) {
          if (t >= 18) { f.vy = -13; f.ground = null; f.o2_hk = null; return; }
          h.x += h.dx * 24; h.y += h.dy * 24;
          if (o2_free(foe) && circleRect(h.x, h.y, 24, hurtbox(foe))) {
            h.st = 2; o2_hit(f, foe, { dmg: 4, b: 3, g: 0, ang: 60 }, Math.sign(f.x - foe.x) || -f.face);
            const px = f.x + f.face * 50 - foe.x, py = f.y - foe.y, pm = Math.hypot(px, py) || 1, sp = Math.min(14, pm * .12); foe.vx = px / pm * sp; foe.vy = py / pm * sp - 3; foe.ground = null; foe.stun = 24; SFX.play('grab'); popText(foe.x, foe.y - 140, 'GET OVER HERE', '#3bf0ff');
            setAct(f, f.ground ? 'stand' : 'air'); f.o2_hk = null; return; // free to follow up
          }
          const L = [M.x1, M.x2].find(x => Math.hypot(h.x - x, h.y - M.y) < 90 || (inMain(h.x, h.y) && Math.abs(h.x - x) < 90));
          if (L !== undefined) { h.x = L; h.y = M.y; } // snap to the ledge corner
          if (L !== undefined || inMain(h.x, h.y) || groundAt(h.x, h.y) !== null) { h.st = 1; SFX.play('rock', .4); fxBurst(h.x, h.y, '#c8ccd8', 8, 4); }
        }
        if (h.st === 1) {
          const dx = h.x - f.x, dy = h.y - 20 - f.y, d = Math.hypot(dx, dy);
          if (d < 40) { f.vy = -9; f.vx = (Math.sign(h.x - f.x) || f.face) * 3; f.ground = null; f.o2_hk = null; setAct(f, 'air'); return; }
          f.vx = dx / d * 22; f.vy = dy / d * 22; f.ground = null;
        }
      },
      drawFx(f) {
        const h = f.o2_hk; if (!h) return;
        ctx.strokeStyle = '#9aa0aa'; ctx.lineWidth = 3; ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.moveTo(f.x, f.y - 70); ctx.lineTo(h.x, h.y); ctx.stroke(); ctx.setLineDash([]);
        ctx.strokeStyle = '#3bf0ff'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(h.x, h.y, 14, -2.5, .6); ctx.stroke();
      } },
    // leave a decoy and vanish; whoever strikes the decoy gets smoke-bombed dizzy
    d: { dur: 20, p: ['counter', 'crouch'], tick(f, t) {
      if (t !== 4) return; killOwned(f, 'o2_clone'); SFX.play('shadow'); fxBurst(f.x, f.y - 50, '#6a6f7a', 20, 5);
      spawn({ owner: f.i, kind: 'o2_clone', x: f.x, y: f.y, face: f.face, r: 1, life: 300, inert: true, stopped: true, refl: false, draw: o2_drawClone,
        tick(p) {
          const foe = fighters[1 - p.owner], cy = p.y - 55;
          const shot = projectiles.find(q => q.owner !== p.owner && !q.inert && q.life > 0 && q.refl !== false && Math.abs(q.x - p.x) < 30 && Math.abs(q.y - cy) < 55);
          if (!o2_hbTouch(foe, p.x, cy, 28) && !shot) return;
          if (shot) shot.life = 0;
          p.life = 0; fxBurst(p.x, cy, '#8a8aa8', 30, 7); SFX.play('shadow'); popText(p.x, p.y - 140, 'DECOY!', '#3bf0ff');
          if (o2_free(foe) && Math.hypot(foe.x - p.x, foe.y - p.y) < 180) { setAct(foe, 'dizzy'); foe.stun = 45; }
        } });
      f.stealth = 26; f.vx = -f.face * 6;
    } },
  },
  normals: { // Neon Divekick: dives diagonally, bounces off on hit
    dair: { s: 6, a: 14, e: 12, hb: [[20, 0, 26]], dmg: 7, b: 6, g: .3, ang: 60, air: 1, ll: 10,
      pose: (f, t) => t <= 6 ? POSES.dairW : { ...POSES.kick, rot: 45 },
      tick(f, t) { if (t > 6 && t <= 20 && !f.hitDone) { f.vx = f.face * 11; f.vy = 11; if (t % 2) fxBurst(f.x - f.face * 20, f.y - 40, '#3bf0ff', 1, 2, 10); } },
      onHit(f) { f.vy = -9; f.vx = -f.face * 2; } },
  },
};

// ================= SIR CLUCKSALOT — the joust =================
function o2_drawFeather(c, p) { pxRect(c, p.x - 4, p.y - 9, 8, 18, '#f4f0e0'); pxRect(c, p.x - 1, p.y - 9, 2, 18, '#c8ccd8'); }
KITS.cluck = {
  desc: 'Hold →B to gallop: the longer the run, the harder the joust. Hold back to chicken out. Bat his own egg bombs with attacks!',
  specials: ['Egg Bomb (bat it!)', 'Joust (hold, ← flee)', 'Flap Flap (x4)', 'Rooster Crow'],
  specials_: {
    n: { s: 10, a: 0, e: 14, p: ['castW', 'cast'], tick(f, t) {
      if (t !== 10) return; SFX.play('throw');
      proj(f, { kind: 'o2_egg2', vx: 6, vy: -8, grav: .45, r: 12, life: 110, dmg: 8, b: 6, g: .35, ang: 60, onGround: 'stop', draw: drawEggBomb,
        tick(p) {
          if (p.boom) return; const o = fighters[p.owner];
          if (!p.bat && o2_hbTouch(o, p.x, p.y, p.r)) { // FORE!
            Object.assign(p, { bat: 1, stopped: false, onGround: 'vanish', vx: o.face * 17, vy: -2, grav: .08, life: 50, dmg: 10, b: 6, g: .4, ang: 40 });
            SFX.play('hit', .6); popText(p.x, p.y - 50, 'FORE!', '#ffd23f'); fxBurst(p.x, p.y, '#ffffff', 8, 5); return;
          }
          if (p.life === 1 || (p.stopped && p.t > 80)) boomSmall(p);
        },
        onHit(p) { boomSmall(p); } });
    } },
    // hold B to keep galloping (speed builds 5 → 18); damage/launch scale with speed; hold back to flee
    s: { dur: 200, p: ['fsmashW', 'dash'], grav: .5,
      start(f) { f.o2_sp = 5; f.o2_jd = 0; },
      pose: (f, t) => f.o2_jd ? POSES.fsmash : t < 6 ? POSES.fsmashW : { ...POSES.dash, y: (t >> 2) % 2 * 2 },
      tick(f, t, inp) {
        if (t < 6) return;
        if (f.o2_jd) { f.vx *= .85; return t >= f.o2_jd + 14 ? 'end' : undefined; }
        if (t > 8 && inp.x * f.face < -.5) { // Chicken Out!
          f.face = -f.face; f.vx = f.face * 11; f.vy = -9; f.ground = null; f.inv = 14;
          popText(f.x, f.y - 140, 'BAWK!', '#ffd23f'); fxBurst(f.x, f.y - 50, '#f4f0e0', 12, 5); SFX.play('djump'); return 'end';
        }
        if (!(inp.b || t < 16) || t > 80) { f.o2_jd = t; return; }
        f.o2_sp = Math.min(18, f.o2_sp + .25); f.vx = f.face * f.o2_sp;
        if (t % 3 === 0) fxBurst(f.x - f.face * 20, f.y - 4, f.o2_sp > 14 ? '#ff6a1f' : '#e8e0d0', 2, 2, 14);
        if (t % 10 === 0) SFX.play('swing', .3);
        const foe = o2_foe(f), G = SC(f);
        if (!canBeHit(foe) || !circleRect(f.x + f.face * 72 * G, f.y - 48 * G, 28 * G, hurtbox(foe))) return;
        const k = (f.o2_sp - 5) / 13;
        o2_hit(f, foe, { dmg: Math.round(5 + k * 10), b: 5 + k * 2, g: .1 + k * .45, ang: Math.round(75 - k * 45) }, f.face);
        if (k > .75) { popText(foe.x, foe.y - 150, 'JOUST!', '#ffd23f'); shakeCam(10); }
        f.o2_jd = t;
      },
      drawFx(f, t) {
        if (t < 6 || f.o2_jd) return; const k = (f.o2_sp - 5) / 13;
        for (let i = 0; i < 3 + k * 4; i++) pxRect(ctx, f.x - f.face * (40 + i * 16) - 12, f.y - 20 - i * 14, 24 + k * 30, 3, k > .75 ? '#ff6a1f' : '#ffffffaa');
        pxDisc(ctx, f.x + f.face * 72 * SC(f), f.y - 48 * SC(f), 6 + k * 8, k > .75 ? '#ffd23f' : '#c8ccd8');
      } },
    u: { dur: 18, airUses: 4, dmg: 3, b: 5, g: .05, ang: 82, p: ['crouch', 'djump'],
      start(f) { f.o2_fl = f.ground ? 0 : (f.uses?.get(f.move) || 1) - 1; },
      hbAt: (f, t) => t >= 3 && t < 8 ? [[0, -40, 34]] : null,
      tick(f, t) {
        if (t !== 3) return;
        f.vy = -[12, 10.5, 9, 7.5][f.o2_fl]; f.ground = null; SFX.play('djump'); fxBurst(f.x, f.y - 40, '#f4f0e0', 6, 4);
        if (f.o2_fl === 3) { popText(f.x, f.y - 140, 'FEATHER STORM!', '#f4f0e0'); for (const vx of [-5, -2, 2, 5]) spawn({ owner: f.i, kind: 'o2_feather', x: f.x, y: f.y - 30, vx, vy: 7, r: 12, life: 40, dmg: 3, b: 4, g: .05, ang: 70, draw: o2_drawFeather }); }
      } },
    d: { s: 14, a: 0, e: 20, p: ['usmashW', 'victory'], tick(f, t) {
      if (t !== 14) return; const foe = o2_foe(f);
      if ((f.o2_crowT || 0) > T) { popText(f.x, f.y - 150, '*hoarse cluck*', '#9aa0aa'); SFX.play('beep', .3); return; }
      f.o2_crowT = T + 360; SFX.play('game'); fxRing(f.x, f.y - 70, '#ffd23f', 160); shakeCam(6); popText(f.x, f.y - 160, 'COCK-A-DOODLE-DOO!', '#ffd23f');
      f.buff = { t: 180, spd: 1.25, pow: 1.1, col: '#ffd23f' };
      if (o2_free(foe) && Math.hypot(foe.x - f.x, foe.y - f.y) < 150) {
        if (foe.ground) { setAct(foe, 'dizzy'); foe.stun = Math.min(50, 30 + foe.dmg * .1 | 0); }
        else o2_hit(f, foe, { dmg: 3, b: 7, g: 0, ang: 45 });
      }
    } },
  },
  normals: { // Lance Poke: long disjointed air poke
    fair: { s: 7, a: 3, e: 14, hb: [[95, -50, 20], [68, -50, 18]], dmg: 9, b: 5, g: .38, ang: 35, air: 1, ll: 8, p: ['fairW', 'fsmash'] },
  },
};

// ================= GLOOP — mass, swallow, bounce =================
O2_PASSIVE.gloop = (f, p) => {
  const d = f.dmg - (p.ld ?? f.dmg); p.ld = f.dmg;
  if (d > 0 && f.store > 0) { o2_meter(f, f.store - d * 1.5); fxBurst(f.x, f.y - 40, '#6ad84a', 6, 5); } // hits splatter mass off
  if (f.store > 0) o2_meter(f, f.store - .03);
  const m = f.store / 90;
  if (m > 0) f.buff = { t: 2, grow: 1 + m * .4, pow: 1 + m * .25, spd: 1 - m * .2, col: '#6ad84a' };
  const foe = o2_foe(f); // safety: never leave a swallowed foe invisible
  if (foe.o2_in && !owned(f, 'o2_belly')) { foe.o2_in = 0; foe.hidden = false; }
};
O2_HUD.gloop = f => { if (f.store > 0) o2_bar(f, f.store, '#6ad84a', 'MASS'); };
function o2_drawBelly(c, p) {
  const o = fighters[p.owner], g = fighters[1 - p.owner], G = SC(o);
  pxDisc(c, o.x, o.y - 40 * G, 20 * G, g.ch.color); pxDisc(c, o.x + 5, o.y - 44 * G, 6 * G, '#ffffff');
  if (p.t % 8 < 4) fxBurst(o.x + (Math.random() - .5) * 40, o.y - 60 * G, '#c8ffb0', 1, 2, 12);
}
KITS.gloop = {
  desc: 'Swallow foes and spit them out. Gulp projectiles to gain MASS: bigger, stronger, slower. Spend mass on slime minions.',
  specials: ['Slime Glob / Minion', 'Swallow & Spit', 'Boing Bounce', 'Gulp Guard'],
  specials_: {
    n: { s: 10, a: 0, e: 14, p: ['castW', 'cast'], tick(f, t) {
      if (t !== 10) return; SFX.play('throw');
      if (f.store >= 30) { // split off a mini-Gloop that hops at the foe
        o2_meter(f, f.store - 30); popText(f.x, f.y - 140, 'MITOSIS!', '#6ad84a');
        proj(f, { kind: 'o2_mini', vx: 5, vy: -6, grav: .5, r: 20, life: 300, dmg: 3, b: 4, g: .05, ang: 75, slow: 90, onGround: 'slide', refl: false, draw: drawSlime,
          tick(p) { if (p.cd && --p.cd === 0) p.inert = false; if (p.vy === 0 && p.t % 20 === 0) { const foe = fighters[1 - p.owner]; p.vy = -8; p.vx = (Math.sign(foe.x - p.x) || 1) * 4; } },
          onHit(p) { p.cd = 45; } });
        return;
      }
      proj(f, { kind: 'o2_glob', vx: 9, vy: -4, grav: .3, r: 16, life: 70, dmg: 4, b: 3, g: .05, ang: 40, slow: 110, onGround: 'stop', draw: drawSlime,
        tick(p) { // lands as a sticky puddle
          if (!p.stopped) return;
          if (p.kind === 'o2_glob') Object.assign(p, { kind: 'o2_goo', inert: true, life: 300, draw: drawPuddle });
          const foe = fighters[1 - p.owner];
          if (foe.ground && Math.abs(foe.x - p.x) < 46 && Math.abs(foe.y - p.y) < 20) foe.slowT = Math.max(foe.slowT || 0, 20);
        } });
    } },
    s: { s: 8, a: 0, e: 22, dur: 36, p: ['grabW', 'grab'],
      pose: (f, t) => t < 8 ? { ...POSES.crouch, rot: 0 } : POSES.grab,
      tick(f, t) {
        if (t >= 4 && t < 12) f.vx = f.face * 9;
        if (t < 8 || t > 14 || owned(f, 'o2_belly')) return;
        const foe = o2_foe(f), G = SC(f);
        if (!o2_free(foe) || !circleRect(f.x + f.face * 45 * G, f.y - 50 * G, 36 * G, hurtbox(foe))) return;
        SFX.play('grab'); popText(f.x, f.y - 150, 'GULP!', '#6ad84a'); o2_meter(f, f.store + 20);
        setAct(foe, 'dizzy'); foe.stun = 60; foe.hidden = true; foe.o2_in = 1;
        spawn({ owner: f.i, kind: 'o2_belly', x: 0, y: -300, r: 1, life: 46, inert: true, stopped: true, refl: false, draw: o2_drawBelly,
          tick(p) {
            const o = fighters[p.owner], g = fighters[1 - p.owner];
            const bail = ['dead', 'out', 'hurt', 'held', 'locked'].includes(o.act);
            if (!bail && p.life > 1) { g.x = o.x; g.y = o.y; g.vx = g.vy = 0; g.inv = Math.max(g.inv, 2); if (p.t % 12 === 0) { g.dmg += 1; o.stats.dealt += 1; } return; }
            p.life = 0; g.hidden = false; g.o2_in = 0; g.inv = 0; g.x = o.x + o.face * 50; setAct(g, g.ground ? 'stand' : 'air');
            if (bail) return;
            const up = o.inp && o.inp.y < -.5; SFX.play('throw'); fxBurst(g.x, g.y - 50, '#6ad84a', 16, 7); popText(g.x, g.y - 140, 'PTOO!', '#6ad84a');
            o2_hit(o, g, up ? { dmg: 6, b: 7, g: .1, ang: 88 } : { dmg: 6 + Math.round(o.store / 15), b: 6, g: .35, ang: 35 }, o.face);
          } });
      } },
    // bouncy ball: re-bounces off the ground twice, splatting anyone underneath
    u: { dur: 150, helpless: 1, airUses: 1, multi: 8, dmg: 5, b: 6, g: .15, ang: 85, p: ['crouch', 'jump'],
      start(f) { f.o2_bn = 0; },
      pose: (f, t) => ({ ...POSES.crouch, rot: t > 3 ? t * 20 : 0 }),
      hbAt: (f, t) => t < 3 ? null : f.vy > 2 ? [[0, -10, 44, { dmg: 7, b: 5, g: .3, ang: -60 }]] : t < 14 ? [[0, -40, 42]] : null,
      tick(f, t) { if (t === 3) { f.vy = -17; f.ground = null; SFX.play('djump'); fxBurst(f.x, f.y, '#6ad84a', 8, 4); } },
      onLand(f) {
        if (f.mt < 5 || f.o2_bn >= 2) return false;
        f.vy = -[13, 9][f.o2_bn++]; f.ground = null; f.hitDone = false; SFX.play('land'); fxBurst(f.x, f.y, '#6ad84a', 12, 6); popText(f.x, f.y - 120, 'BOING!', '#c8ffb0');
        return true;
      } },
    d: { dur: 30, dmg: 4, b: 6, g: .1, ang: 80, slow: 60, p: ['crouch', 'crouch'],
      pose: (f, t) => ({ ...POSES.crouch, y: t > 3 && t < 24 ? 8 : 0 }),
      hbAt: (f, t) => t >= 3 && t < 7 ? [[0, -30, 52]] : null,
      tick(f, t) {
        if (t < 3 || t > 22) return;
        const c = o2_mid(f);
        for (const p of projectiles) if (o2_absorbable(f, p) && Math.hypot(p.x - c.x, p.y - c.y) < 85 * SC(f)) {
          p.life = 0; o2_meter(f, f.store + 12 + p.dmg * 2); f.dmg = Math.max(0, f.dmg - 2); SFX.play('grab'); popText(f.x, f.y - 140, 'GULP! +MASS', '#6ad84a'); fxBurst(c.x, c.y, '#6ad84a', 10, 4);
        }
      },
      drawFx(f, t) { if (t < 3 || t > 22) return; const c = o2_mid(f); ctx.strokeStyle = '#c8ffb0'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(c.x, c.y, 85 * SC(f) - (t % 8) * 3, 0, 7); ctx.stroke(); } },
  },
  normals: { // Slime Splat: sticky nair
    nair: { s: 5, a: 8, e: 12, hb: [[0, -45, 52]], dmg: 7, b: 5, g: .3, ang: 50, slow: 60, away: 1, air: 1, ll: 8, p: ['jump', 'nair'] },
  },
};

// ================= wiring =================
// every move start (and every sprite draw in the browser) makes sure the fighter's passive brain is running
for (const id of O2_IDS) {
  const k = KITS[id];
  for (const m of [...Object.values(k.specials_), ...Object.values(k.normals || {})]) { const s0 = m.start; m.start = f => { o2_brain(f); s0?.(f); }; }
  const ch = CHARS.find(c => c.id === id), d0 = ch.draw;
  ch.draw = (g, J, o) => { if (typeof state !== 'undefined' && state === 'fight') o2_brain(o); d0(g, J, o); };
}
