// Kit overrides: heroes (see KIT_API guide). Every top-level name is prefixed hr_.
// Mechanics: Ronaldo's ball stays on the pitch and can be re-kicked/headed; LeBron's alley-oop is a 2-press
// throw+dunk; Iron Man locks on (missiles/repulsors home); Spidey swings on a real pendulum and webs dodgers;
// Batman counters into a takedown and batclaws to the foe; Cap's shield ricochets off terrain and returns;
// Thor recalls Mjolnir, calls lightning onto it, and warps to a Bifrost rune.

// ---------- shared helpers ----------
const hr_dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
function hr_daze(foe, n) { if (foe.act === 'hurt') { setAct(foe, 'dizzy'); foe.stun = n; foe.vx *= .3; } } // only if the hit really landed
function hr_steer(p, tx, ty, spd, k) { const a = Math.atan2(ty - p.y, tx - p.x); p.vx += (Math.cos(a) * spd - p.vx) * k; p.vy += (Math.sin(a) * spd - p.vy) * k; }
const hr_noDraw = () => {};
// a "watcher" projectile: invisible, harmless, runs a tick each frame (used for counters)
function hr_watch(f, kind, life, tick, draw = hr_noDraw) { killOwned(f, kind); spawn({ owner: f.i, kind, x: f.x, y: f.y - 60, r: 1, life, inert: true, refl: false, stopped: true, dmg: 0, draw, tick }); }
function hr_line(x1, y1, x2, y2, c, w) { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
function hr_bolt(x1, y1, x2, y2, c, w, seed) { // jagged lightning
  ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x1, y1);
  for (let i = 1; i < 8; i++) { const k = i / 8; ctx.lineTo(x1 + (x2 - x1) * k + Math.sin(seed * 7 + i * 13) * 16, y1 + (y2 - y1) * k); }
  ctx.lineTo(x2, y2); ctx.stroke();
}
// a dodge-counter: while f.dodgeNext is armed, the engine auto-dodges the next hit (sets it to 0); we react to that.
function hr_dodgeCounter(f, kind, win, onDodge, draw) {
  f.dodgeNext = win + 6;
  hr_watch(f, kind, win, p => { const o = fighters[p.owner]; if (o.dodgeNext === 0 && !['dead', 'out', 'respawn'].includes(o.act)) { p.life = 0; o.dodgeNext = 0; onDodge(o, foeOf(o)); } }, draw);
}

// ================= RONALDO =================
// The ball (kind hr_ball) stays on the pitch after a shot: any of his kicks/headers that touch it send it again.
function hr_ballTick(p) {
  if (p.vy === 0 && p.hr_pv > 4) p.vy = -p.hr_pv * .5; // bounce off the floor
  if (p.hr_kn > 0) { p.hr_kn--; p.vy += Math.sin(p.t * .9) * 1.1; if (p.hr_kn === 12) { p.vy += 9; fxRing(p.x, p.y, '#ffd23f', 24); } } // knuckle wobble, then the dip
  if (groundAt(p.x, p.y) !== null && Math.abs(p.vy) < 1.5) p.vx *= .92;
  p.hr_pv = p.vy;
  p.inert = p.t < (p.hr_arm || 0) || Math.hypot(p.vx, p.vy) < 7; // a rolling ball doesn't hurt
  if (!p.inert && p.t % 2) fxBurst(p.x, p.y, '#ffffff', 1, 1, 8);
}
function hr_ballDraw(ctx, p) { drawSoccer(ctx, { ...p, y: p.y - 6 }); if (p.hr_kn > 0) pxDisc(ctx, p.x - p.vx * 2, p.y - p.vy * 2 - 6, 8, 'rgba(255,210,63,.5)'); }
function hr_newBall(f, x, y) {
  killOwned(f, 'hr_ball');
  spawn({ owner: f.i, kind: 'hr_ball', x, y, r: 16, life: 480, grav: .45, onGround: 'slide', refl: false, draw: hr_ballDraw, tick: hr_ballTick,
    onHit(p) { p.vx *= -.3; p.vy = -8; p.hr_kn = 0; p.hr_arm = p.t + 20; } });
  return projectiles[projectiles.length - 1];
}
// kick/head the ball if it is within r of the point (x,y) (relative to Ronaldo, x forward)
function hr_touch(f, x, y, r, vx, vy, hit) {
  const b = owned(f, 'hr_ball'); if (!b) return null;
  const cx = f.x + x * f.face, cy = f.y + y;
  if (hr_dist(b.x, b.y, cx, cy) > r + b.r) return null;
  Object.assign(b, { vx: vx * f.face, vy, hr_arm: 0, hr_kn: 0, life: Math.max(b.life, 300), dmg: 8, b: 5, g: .35, ang: 40 }, hit);
  SFX.play('throw'); fxRing(b.x, b.y, '#ffd23f', 30); return b;
}
const hr_touchIn = (x, y, r, vx, vy, hit, from, to) => (f, t) => { if (t >= from && t <= to && !f.hr_touched) f.hr_touched = !!hr_touch(f, x, y, r, vx, vy, hit); };
const hr_resetTouch = f => { f.hr_touched = false; };

KITS.ronaldo = {
  desc: 'Striker. His ball stays on the pitch: kick it, head it, bicycle it. SIUUU!',
  specials: ['Knuckleball (hold)', 'Stepover Chop', 'Leaping Header', 'SIUUU!'],
  specials_: {
    // hold B to power up; a dipping, wobbling free kick. Re-kicks the ball if it's at his feet.
    n: { dur: 28, p: ['kickW', 'kick'], start(f) { f.hr_ch = 0; },
      tick(f, t, inp) {
        if (t === 6 && inp.b && f.hr_ch < 40) { f.hr_ch++; if (f.hr_ch % 8 === 0) fxBurst(f.x + f.face * 30, f.y - 10, '#ffd23f', 3, 3, 12); return 'hold'; }
        if (t !== 9) return;
        const c = f.hr_ch / 40, hit = { dmg: 7 + Math.round(c * 7), b: 5, g: .3 + c * .15, ang: 38, hr_kn: 34 };
        if (!hr_touch(f, 40, -15, 70, 12 + c * 5, -5, hit)) { const b = hr_newBall(f, f.x + f.face * 40, f.y - 20); Object.assign(b, { vx: (12 + c * 5) * f.face, vy: -5 }, hit); }
        SFX.play('throw', 1 + c); if (c > .9) popText(f.x, f.y - 140, 'GOLAZO!', '#ffd23f');
      },
      pose: (f, t) => t < 7 ? POSES.kickW : POSES.kick },
    // step-overs through the foe (intangible); if he ends up behind them, the chop breaks their ankles (dizzy)
    s: { dur: 34, dmg: 4, b: 3, g: .05, ang: 60,
      start(f) { const foe = foeOf(f); f.hr_side = Math.sign(foe.x - f.x) || f.face; f.hr_chop = 0; },
      tick(f, t) {
        if (t >= 3 && t <= 18) { f.vx = f.face * 11; f.intang = t < 17; if (t % 4 === 0) fxBurst(f.x, f.y - 8, '#ffffff', 2, 2, 10); }
        if (t === 19) { const foe = foeOf(f); if (Math.sign(foe.x - f.x) !== f.hr_side && Math.abs(foe.x - f.x) < 110 && Math.abs(foe.y - f.y) < 80) { f.face = -f.face; f.hr_chop = 1; } }
      },
      hbAt: (f, t) => f.hr_chop && t >= 20 && t <= 23 ? [[40, -30, 34]] : null,
      onHit(f, foe) { hr_daze(foe, 34); popText(foe.x, foe.y - 150, 'ANKLES BROKEN!', '#ffd23f'); },
      pose: (f, t) => t < 19 ? { ...runPose(t * .9, 1), a1: [60 + Math.sin(t) * 40, 40] } : POSES.kick },
    // big leap with hang-time; header launches forward, hold DOWN for a spiking header. Heads the ball too.
    u: { dur: 44, helpless: 1, dmg: 9, b: 6, g: .38, ang: 50,
      grav: (f, t) => t >= 14 && t <= 24 ? .12 : 1,
      start(f) { f.hr_spike = false; hr_resetTouch(f); },
      tick(f, t, inp) {
        if (t === 4) { f.vy = -21; f.ground = null; SFX.play('jump'); }
        if (t > 4) f.vx = inp.x * 4.5;
        if (t === 14) f.vy = Math.max(f.vy, -3);
        if (t === 11) f.hr_spike = inp.y > .5;
        if (t >= 12 && t <= 24 && !f.hr_touched) f.hr_touched = !!hr_touch(f, 18, -110, 44, f.hr_spike ? 9 : 15, f.hr_spike ? 13 : -3, { dmg: 10, ang: f.hr_spike ? -60 : 35 });
      },
      hbAt: (f, t) => t >= 12 && t <= 22 ? [[18, -112, 30, f.hr_spike ? { ang: -70, b: 4, g: .32, dmg: 11 } : {}]] : null,
      pose: (f, t) => t < 4 ? POSES.crouch : t < 12 ? POSES.jump : { ...POSES.uair, tl: -30, rot: f.hr_spike ? 25 : -10 } },
    // jump-spin celebration: the landing shockwave pops foes up; grants a buff (once every 10s)
    d: { dur: 40, dmg: 5, b: 6, g: .08, ang: 85, away: 1,
      tick(f, t) {
        if (t === 3) { f.vy = -9; f.ground = null; SFX.play('jump'); }
        if (t === 22) {
          popText(f.x, f.y - 150, 'SIUUU!', '#ffd23f'); SFX.play('counter'); fxRing(f.x, f.y - 10, '#ffd23f', 70); fxBurst(f.x, f.y, '#ffd23f', 12, 6); shakeCam(5);
          if (!(f.hr_siu > T)) { f.hr_siu = T + 600; f.buff = { t: 300, spd: 1.15, pow: 1.15, armor: 0, grow: 1, col: '#ffd23f' }; }
        }
      },
      grav: (f, t) => t < 22 ? .8 : 2,
      hbAt: (f, t) => t >= 22 && t <= 25 ? [[45, -15, 34], [-45, -15, 34]] : null,
      pose: (f, t) => t < 22 ? { ...POSES.djump, rot: t * 17 } : { ...POSES.victory, a1: [120, 0], a2: [-120, 0], l1: [30, 10], l2: [-30, 10] } },
  },
  normals: {
    // bicycle kick: flips over, hits above & behind, volleys the ball forward-down
    uair: { s: 6, a: 6, e: 12, hb: [[0, -120, 32], [-30, -95, 26]], dmg: 10, b: 5, g: .35, ang: 80, air: 1, ll: 8,
      start: hr_resetTouch, tick: hr_touchIn(0, -115, 50, 16, 6, { dmg: 11, ang: 30 }, 5, 12),
      pose: (f, t) => ({ ...POSES.uair, rot: -Math.min(t, 14) * 22 }) },
    // slide tackle: slides forward and pops the foe up at any % (combo starter); nudges the ball forward
    dtilt: { s: 5, a: 10, e: 14, hb: [[45, -12, 26]], dmg: 6, b: 6, g: .08, ang: 82,
      start: hr_resetTouch,
      tick(f, t) { if (t > 5 && t <= 15) { f.vx = f.face * 9; if (t % 3 === 0) fxBurst(f.x, f.y - 3, '#c8b890', 2, 2, 10); } hr_touchIn(40, -12, 40, 9, -5, { dmg: 6, ang: 60 }, 5, 15)(f, t); },
      p: ['dtiltW', 'slide'] },
    // power shot: kicks the ball hard if it's there
    fsmash: { s: 14, a: 4, e: 22, hb: [[62, -40, 30], [35, -40, 22]], dmg: 16, b: 4, g: .55, ang: 36, charge: 1,
      start: hr_resetTouch, tick: hr_touchIn(55, -25, 60, 22, -3, { dmg: 13, b: 6, g: .45, ang: 35 }, 14, 18), p: ['kickW', 'kickHigh'] },
  },
};

// ================= LEBRON =================
// not helpless: the dive is short and he can still recover after it
const HR_DUNK = { special: 1, s: 1, dur: 70, air: 1, ll: 12, grav: 0, dmg: 13, b: 5, g: .33, ang: -70,
  start(f) { f.hr_ph = 0; },
  tick(f, t) {
    const b = owned(f, 'hr_oop');
    if (f.hr_ph === 0) {
      if (!b || t > 24) { f.hr_ph = 1; f.hr_t = t; }
      else {
        const tx = b.x - f.face * 10, ty = b.y + 100, d = hr_dist(f.x, f.y, tx, ty);
        f.face = Math.sign(b.x - f.x) || f.face; f.ground = null;
        f.vx = (tx - f.x) / Math.max(1, d / 22); f.vy = (ty - f.y) / Math.max(1, d / 22);
        if (d < 30) { b.life = 0; f.hr_ph = 1; f.hr_t = t; popText(f.x, f.y - 160, 'ALLEY-OOP!', '#f2c14e'); SFX.play('grab'); }
      }
      return;
    }
    if (t - f.hr_t < 4) { f.vx *= .5; f.vy = -2; return; }
    if (t - f.hr_t > 22) return 'end';
    f.vy = 19; f.vx = f.face * 3; f.ground = null;
  },
  hbAt: (f, t) => f.hr_ph === 1 && t - f.hr_t >= 4 ? [[22, -30, 40]] : null,
  onLand(f) { if (f.hr_ph === 1) { SFX.play('rock'); shakeCam(12); fxBurst(f.x, f.y, '#e8782a', 16, 8); } return false; },
  pose: (f, t) => f.hr_ph === 0 ? POSES.jump : t - f.hr_t < 4 ? POSES.usmash : POSES.dair,
  drawFx(f) { if (f.hr_ph === 1) drawBasket(ctx, { x: f.x + f.face * 22, y: f.y - (f.vy > 0 ? 40 : 140), r: 14 }); } };

function hr_lbShock(f, r, P) { const foe = foeOf(f); if (canBeHit(foe) && foe.ground && Math.abs(foe.x - f.x) < r && Math.abs(foe.y - f.y) < 40) applyHit(f, foe, P, Math.sign(foe.x - f.x) || f.face, foe.x, foe.y - 20); }

// Fast Break: his dash attack pops the foe up; press A while it connects to leap after them and dunk (meteor).
const HR_FASTBREAK = { s: 1, dur: 34, air: 1, ll: 10, grav: .8, dmg: 9, b: 5, g: .35, ang: -70,
  start(f) { f.vy = -13; f.vx = f.face * 5; f.ground = null; SFX.play('jump'); },
  hbAt: (f, t) => t >= 9 && t <= 18 ? [[30, -40, 38]] : null,
  onHit(f, foe) { popText(foe.x, foe.y - 150, 'FAST BREAK!', '#f2c14e'); shakeCam(8); },
  pose: (f, t) => t < 9 ? POSES.usmash : POSES.dair,
  drawFx(f, t) { drawBasket(ctx, { x: f.x + f.face * (t < 9 ? -10 : 30), y: f.y - (t < 9 ? 150 : 40), r: 14 }); } };

KITS.lebron = {
  desc: 'The King. Alley-oop to himself, euro-step through traffic, chase-down block. Dash attack + A = fast-break dunk.',
  specials: ['Alley-Oop (B: dunk)', 'Euro Step', 'Tomahawk (B: slam)', 'Chase-Down Block'],
  specials_: {
    // lob the ball up; it pops foes up. Press B again: fly to the ball, catch it and dunk (meteor)
    n: { dur: 26, p: ['jabW', 'throwU'],
      tick(f, t) { if (t === 8) { SFX.play('throw'); killOwned(f, 'hr_oop'); proj(f, { kind: 'hr_oop', y: -100, vx: 4.5, vy: -14, grav: .5, r: 18, life: 100, dmg: 4, b: 6, g: .06, ang: 88, bounces: 1, onGround: 'bounce', refl: false, draw: drawBasket, onHit(p) { p.vx *= .2; p.vy = -5; } }); } },
      alt(f) { const b = owned(f, 'hr_oop'); if (!b || b.t < 6) return false; startMove(f, HR_DUNK); return true; } },
    // two intangible steps; the 2nd follows the stick (cross back behind them); finishes with a pop-up layup
    s: { dur: 40, dmg: 7, b: 6, g: .1, ang: 80,
      tick(f, t, inp) {
        if (t >= 3 && t <= 10) { f.vx = f.face * 8.5; f.intang = t <= 9; }
        if (t === 13) { const d = Math.sign(inp.x) || f.face; f.face = d; SFX.play('swing', .5); }
        if (t >= 13 && t <= 20) { f.vx = f.face * 8.5; f.intang = t <= 19; }
        if ((t >= 3 && t <= 20) && t % 3 === 0) fxBurst(f.x, f.y - 5, '#5a2d8a', 2, 2, 10);
        if (t === 22 && f.ground) { f.vy = -7; f.ground = null; }
      },
      hbAt: (f, t) => t >= 23 && t <= 27 ? [[35, -100, 36]] : null,
      pose: (f, t) => t < 22 ? { ...POSES.dash, tl: 20, rot: 0, l1: t % 10 < 5 ? [70, 40] : [-20, 30] } : POSES.victory },
    // huge leap; press B again to tomahawk-slam: meteor, and the landing rocks the floor (pop-up)
    u: { dur: 110, helpless: 1, dmg: 6, b: 6, g: .2, ang: 80,
      start(f) { f.hr_slam = 0; },
      tick(f, t, inp, E) {
        if (t === 5) { f.vy = -21; f.ground = null; SFX.play('jump'); }
        if (t > 5) f.vx = inp.x * 4;
        if (!f.hr_slam && t > 10 && E('b')) { f.hr_slam = t; SFX.play('swing', 1.2); }
        if (f.hr_slam && t - f.hr_slam > 5) { f.vy = 20; f.ground = null; }
        else if (f.hr_slam) f.vy = -1;
      },
      hbAt: (f, t) => !f.hr_slam ? (t > 5 && t < 14 ? [[15, -115, 34]] : null) : t - f.hr_slam > 5 ? [[25, -25, 40, { dmg: 13, b: 5, g: .33, ang: -70 }]] : null,
      onLand(f) {
        if (!f.hr_slam) return false;
        SFX.play('rock'); shakeCam(14); fxBurst(f.x, f.y, '#e8782a', 18, 8); fxRing(f.x, f.y - 5, '#f2c14e', 90);
        hr_lbShock(f, 150, { dmg: 5, b: 7, g: .1, ang: 85 }); return false;
      },
      pose: (f, t) => t < 5 ? POSES.crouch : !f.hr_slam ? POSES.usmash : t - f.hr_slam <= 5 ? { ...POSES.usmash, tl: -30 } : POSES.dair,
      drawFx(f, t) { if (t > 5) drawBasket(ctx, { x: f.x + f.face * (f.hr_slam && t - f.hr_slam > 5 ? 30 : -10), y: f.y - (f.hr_slam && t - f.hr_slam > 5 ? 40 : 150), r: 14 }); } },
    // chases down the foe (either side) and leaps; swats projectiles back; rejecting a foe mid-attack dazes them
    d: { dur: 36, dmg: 6, b: 6, g: .3, ang: 80,
      dmgFn(f, foe) { f.hr_rej = foe.act === 'move'; return f.hr_rej ? 10 : 6; },
      onHit(f, foe) { if (f.hr_rej) { hr_daze(foe, 36); popText(foe.x, foe.y - 150, 'REJECTED!', '#f2c14e'); flash = 4; } },
      tick(f, t) {
        if (t === 3) {
          const foe = foeOf(f), dx = foe.x - f.x; f.face = Math.sign(dx) || f.face;
          f.vx = f.face * clamp(Math.abs(dx) / 13, 4, 17); f.vy = -9; f.ground = null; SFX.play('jump');
        }
        if (t >= 5 && t <= 22) {
          const hx = f.x + f.face * 30, hy = f.y - 110;
          for (const p of projectiles) if (p.owner !== f.i && p.refl && !p.inert && p.life > 0 && hr_dist(p.x, p.y, hx, hy) < 80) {
            p.owner = f.i; p.vx = f.face * 14; p.vy = 5; p.dmg = Math.round(p.dmg * 1.3); p.life = Math.max(p.life, 40);
            popText(p.x, p.y - 30, 'BLOCKED!', '#f2c14e'); SFX.play('counter'); fxRing(p.x, p.y, '#ffffff', 30);
          }
        }
      },
      hbAt: (f, t) => t >= 7 && t <= 20 ? [[32, -105, 36], [20, -60, 30]] : null,
      pose: (f, t) => t < 3 ? POSES.crouch : { ...POSES.utilt, a1: [160, 0], tl: 10 } },
  },
  normals: {
    dashAtk: { ang: 85, b: 7, g: .15,
      onHit(f) { f.hr_fb = f.moveId; },
      tick(f, t, inp, E) { if (f.hr_fb === f.moveId && E('a')) startMove(f, HR_FASTBREAK); } },
    // poster slam: armoured wind-up, overhead one-hand slam
    fsmash: { s: 16, a: 4, e: 24, hb: [[62, -60, 32], [40, -110, 24]], dmg: 17, b: 4, g: .55, ang: 42, charge: 1,
      tick(f, t) { f.armor = t > 6 && t <= 16; if (t === 17) { fxBurst(f.x + f.face * 60, f.y - 50, '#e8782a', 10, 6); shakeCam(4); } },
      p: ['usmashW', 'fsmash'] },
  },
};

// ================= IRON MAN =================
// J.A.R.V.I.S. lock-on: a reticle projectile (hr_lock) follows the foe; while it exists repulsors and missiles home.
const hr_locked = f => owned(f, 'hr_lock');
function hr_reticle(ctx, p) {
  const s = 34 + Math.sin(p.t * .3) * 5, c = (p.t >> 2) % 2 ? '#ff3b3b' : '#ffd23f';
  for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { pxRect(ctx, p.x + dx * s - (dx > 0 ? 12 : 0), p.y + dy * s - (dy > 0 ? 3 : 0), 12, 3, c); pxRect(ctx, p.x + dx * s - (dx > 0 ? 3 : 0), p.y + dy * s - (dy > 0 ? 12 : 0), 3, 12, c); }
  pxRect(ctx, p.x - 2, p.y - 2, 4, 4, c);
}
function hr_homeTick(spd, k) { return p => { const o = fighters[p.owner]; if (p.t > 6 && hr_locked(o)) { const foe = foeOf(o); hr_steer(p, foe.x, foe.y - 55, spd, k); } if (p.t % 2) fxBurst(p.x, p.y, '#c8ccd8', 1, 1, 10); }; }

KITS.ironman = {
  desc: 'Lock on with J.A.R.V.I.S. and his repulsors & missiles home in. Flies on a fuel tank. Unibeam smash.',
  stats: { fuel: 70 },
  specials: ['Repulsor', 'Micro-Missiles', 'Flight (B: cut jets)', 'J.A.R.V.I.S. Lock-On'],
  specials_: {
    n: { dur: 20, p: ['castW', 'cast'], tick(f, t) { if (t === 6) { SFX.play('laser'); proj(f, { kind: 'hr_rep', vx: 20, r: 12, life: 40, dmg: 5, b: 4, g: .15, ang: 30, draw: beamDraw('#bff6ff'), tick: hr_homeTick(20, .18) }); } } },
    // five small flinching missiles; straight when unlocked, homing when locked
    s: { dur: 34, grav: .4, p: ['counter', 'cast'],
      tick(f, t) {
        if (t < 10 || t > 22 || (t - 10) % 3) return;
        const k = (t - 10) / 3; SFX.play('laser', .4);
        spawn({ owner: f.i, kind: 'hr_msl', x: f.x - f.face * 10, y: f.y - 95, vx: f.face * (7 + k), vy: -5 + k * 1.2, r: 10, life: 70, dmg: 2, b: 3, g: .05, ang: 60, draw: drawMissile, tick: hr_homeTick(13, .15) });
      } },
    // real flight on a fuel tank (HUD gauge): steer with the stick, B again to cut the jets. Not helpless;
    // the tank refills on landing or grabbing a ledge.
    u: { dur: 200, grav: 0, air: 1, ll: 6, multi: 8, dmg: 2, b: 3, g: 0, ang: -80, p: ['jump', 'fall'],
      hbAt: (f, t) => t > 5 && f.jet ? [[0, 12, 24]] : null,
      tick(f, t, inp, E) {
        if (t <= 5) return;
        if (f.fuel <= 0 || (t > 10 && E('b'))) { if (f.fuel <= 0) popText(f.x, f.y - 140, 'NO FUEL', '#ff4b4b'); return 'end'; }
        f.fuel--; const d = stickDir(inp); f.vx += (d.x * 11 - f.vx) * .2; f.vy += (d.y * 11 - f.vy) * .2; f.ground = null; f.jet = true; fxBurst(f.x, f.y, t % 2 ? '#ffb13b' : '#bff6ff', 1, 2, 12);
      } },
    // scan ahead: locks the foe for 6 s (HUD bar shows the lock timer)
    d: { dur: 26, p: ['counter', 'cast'],
      tick(f, t) {
        if (t !== 8) return;
        const foe = foeOf(f), dx = (foe.x - f.x) * f.face;
        if (dx > -40 && dx < 650 && Math.abs(foe.y - f.y) < 300 && !['dead', 'out'].includes(foe.act)) {
          SFX.play('beep'); popText(foe.x, foe.y - 160, 'TARGET LOCKED', '#ff3b3b');
          hr_watch(f, 'hr_lock', 360, p => { const o = fighters[p.owner], fo = foeOf(o); p.x = fo.x; p.y = fo.y - 55; o.store = p.life / 4; if (['dead', 'out'].includes(fo.act)) p.life = 0; if (p.life <= 1) o.store = 0; }, hr_reticle);
        } else { SFX.play('beep', .5); popText(f.x, f.y - 150, 'NO TARGET', '#bff6ff'); }
      },
      drawFx(f, t) { if (t > 8) return; ctx.globalAlpha = .25; ctx.fillStyle = '#ff3b3b'; ctx.beginPath(); ctx.moveTo(f.x, f.y - 90); ctx.lineTo(f.x + f.face * 650, f.y - 90 - 300); ctx.lineTo(f.x + f.face * 650, f.y - 90 + 300); ctx.fill(); ctx.globalAlpha = 1; } },
  },
  normals: {
    // Unibeam forward smash: multi-hit chest beam ending in a launcher
    fsmash: { s: 18, a: 14, e: 22, multi: 4, dmg: 2, b: 3, g: .05, ang: 20, charge: 1, p: ['counter', 'cast'],
      hbAt: (f, t) => t > 18 && t <= 32 ? [60, 130, 200, 270].map(x => [x, -70, 30, t >= 30 ? { dmg: 10, b: 7, g: .65, ang: 35 } : null]) : null,
      tick(f, t) { if (t === 19) SFX.play('laser', .8); },
      drawFx(f, t) {
        if (t <= 18 || t > 32) { if (t <= 18) pxDisc(ctx, f.x + f.face * 14, f.y - 72, 6 + t * .6, '#bff6ff'); return; }
        const h = 30 + Math.sin(T) * 6, x0 = f.x + f.face * 15, x1 = Math.min(x0, x0 + f.face * 300);
        ctx.fillStyle = '#6ab0ff'; ctx.fillRect(x1, f.y - 70 - h / 2, 300, h); ctx.fillStyle = '#ffffff'; ctx.fillRect(x1, f.y - 70 - h / 5, 300, h / 2.5);
      } },
  },
};

// ================= SPIDER-MAN =================
function hr_webTrapDraw(ctx, p) {
  if (!p.hr_trap) return drawWeb(ctx, p);
  ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 2;
  for (let i = -3; i <= 3; i++) hr_line(p.x, p.y + 4, p.x + i * 12, p.y - 10 + Math.abs(i) * 3, '#ffffff', 2);
  ctx.beginPath(); ctx.ellipse(p.x, p.y + 2, 36, 7, 0, 0, 7); ctx.stroke();
}
const HR_SWING_G = 1.1;

KITS.spiderman = {
  desc: 'Web-slinger. Webs stick to floors, yank foes in, and Spider-Sense webs up attackers.',
  specials: ['Web Ball', 'Web Yank', 'Web Swing (B: let go)', 'Spider-Sense'],
  specials_: {
    // web ball slows on hit; if it lands on the floor it becomes a sticky web trap (sticks the foe in place)
    n: { dur: 22, p: ['castW', 'cast'],
      tick(f, t) {
        if (t !== 7) return; SFX.play('throw');
        proj(f, { kind: 'hr_web', vx: 13, vy: -2, grav: .25, r: 14, life: 60, dmg: 3, b: 2, g: 0, ang: 30, slow: 120, onGround: 'stop', draw: hr_webTrapDraw,
          tick(p) { if (p.stopped && !p.hr_trap) { Object.assign(p, { hr_trap: 1, life: 360, r: 30, dmg: 2, b: 0, g: 0, ang: 90, slow: 150 }); SFX.play('grab', .5); } },
          onHit(p, foe) { p.life = 0; if (p.hr_trap) { hr_daze(foe, 50); foe.vx = 0; popText(foe.x, foe.y - 150, 'STUCK!', '#ffffff'); } } });
      } },
    // web line: yanks the foe right in front of Spidey (stunned) — or zips him forward on a miss
    s: { dur: 28, p: ['castW', 'cast'],
      tick(f, t) {
        if (t !== 6) return; SFX.play('throw');
        proj(f, { kind: 'hr_yank', vx: 24, r: 16, life: 18, dmg: 3, b: 0, g: 0, ang: 0, refl: false, draw: drawZip,
          tick(p) {
            const o = fighters[p.owner];
            if (p.hr_foe) { const fo = p.hr_foe, tx = o.x + o.face * 60; fo.x += (tx - fo.x) * .35; fo.y += (o.y - fo.y) * .35; fo.vx = fo.vy = 0; p.x = fo.x; p.y = fo.y - 55; if (Math.abs(fo.x - tx) < 8 || p.t > p.hr_t0 + 10) p.life = 0; return; }
            if (p.life <= 1) { o.vx = Math.sign(p.vx) * 15; o.vy = -5; o.ground = null; }
          },
          onHit(p, foe) { if (foe.act !== 'hurt') { p.life = 0; return; } p.hr_foe = foe; p.hr_t0 = p.t; p.life = 14; foe.stun = 30; foe.ground = null; SFX.play('grab'); } });
      } },
    // real pendulum swing from an anchor above-ahead; reels in while swinging; B again lets go early
    u: { dur: 50, helpless: 1, dmg: 6, b: 6, g: .3, ang: 55,
      grav: (f, t) => f.hr_sw && !f.hr_sw.rel ? 0 : 1,
      start(f) { f.hr_sw = null; },
      tick(f, t, inp, E) {
        if (t === 4) {
          const ax = f.x + f.face * 150, ay = f.y - 60 - 260, bx = f.x, by = f.y - 60;
          f.hr_sw = { ax, ay, L: hr_dist(ax, ay, bx, by), th: Math.atan2(bx - ax, by - ay), w: f.face * .03, rel: 0 }; SFX.play('throw');
        }
        const S = f.hr_sw; if (!S || S.rel) return;
        if (t > 6 && (E('b') || t >= 40)) { S.rel = 1; f.vy -= 3; return; }
        S.w += -(HR_SWING_G / S.L) * Math.sin(S.th); S.th += S.w; if (t < 26) S.L = Math.max(120, S.L - 5);
        const nx = S.ax + S.L * Math.sin(S.th), ny = S.ay + S.L * Math.cos(S.th) + 60;
        f.vx = nx - f.x; f.vy = ny - f.y; f.ground = null; f.face = Math.sign(S.w) || f.face;
      },
      hbAt: (f, t) => f.hr_sw && !f.hr_sw.rel ? [[0, -55, 30]] : null,
      pose: (f, t) => f.hr_sw && !f.hr_sw.rel ? { ...POSES.ledge, tl: -20, l1: [60, 60] } : POSES.jump,
      drawFx(f) { const S = f.hr_sw; if (!S || S.rel) return; hr_line(f.x, f.y - 100, S.ax, S.ay, '#ffffff', 3); drawWeb(ctx, { x: S.ax, y: S.ay, r: 12 }); } },
    // brief danger window: dodges the next hit, flips over the attacker and webs them up (stuck & slowed)
    d: { dur: 26, p: ['counter', 'counter'],
      tick(f, t) {
        if (t !== 3) return; SFX.play('counter', .6);
        hr_dodgeCounter(f, 'hr_sense', 22, (o, foe) => {
          if (Math.abs(foe.x - o.x) > 260 || Math.abs(foe.y - o.y) > 200) return;
          const side = Math.sign(foe.x - o.x) || o.face; teleport(o, foe.x + side * 70, Math.min(o.y, foe.y) - 20); o.face = -side; o.vy = -7;
          foe.slowT = 150; applyHit(o, foe, { dmg: 4, b: 0, g: 0, ang: 90 }, side, foe.x, foe.y - 55); hr_daze(foe, 40);
          popText(foe.x, foe.y - 160, 'WEBBED!', '#ffffff'); fxBurst(foe.x, foe.y - 55, '#ffffff', 16, 5);
        }, (ctx, p) => { const o = fighters[p.owner]; for (const s of [-1, 1]) for (let k = 0; k < 3; k++) hr_line(o.x + s * (22 + k * 8), o.y - 118 - k * 6, o.x + s * (30 + k * 8), o.y - 100 - k * 6, (p.t >> 1) % 2 ? '#ffffff' : '#ff3b3b', 3); });
      } },
  },
  normals: {
    // tether web-grab: long range
    grab: { s: 8, a: 5, e: 24, hb: [[70, -60, 22], [125, -60, 22]], grab: 1, p: ['castW', 'grab'],
      drawFx(f, t) { if (t > 8 && t <= 13) { const r = 70 + (t - 8) * 12; hr_line(f.x + f.face * 20, f.y - 65, f.x + f.face * r, f.y - 60, '#ffffff', 3); drawWeb(ctx, { x: f.x + f.face * r, y: f.y - 60, r: 10 }); } } },
  },
};

// ================= BATMAN =================
const HR_TAKEDOWN = { special: 1, s: 1, dur: 26, dmg: 8, b: 7, g: .1, ang: 78, grav: .5,
  hbAt: (f, t) => t >= 4 && t <= 8 ? [[42, -60, 38]] : null,
  onHit(f, foe) { popText(foe.x, foe.y - 160, 'COUNTER!', '#ffd23f'); flash = 5; },
  pose: (f, t) => t < 4 ? POSES.jabW : POSES.palm };
function hr_clawDraw(ctx, p) { const o = fighters[p.owner]; hr_line(o.x + o.face * 20, o.y - 70, p.x, p.y, '#15151a', 3); pxRect(ctx, p.x - 6, p.y - 6, 12, 12, '#3a3d48'); pxRect(ctx, p.x + Math.sign(p.vx) * 6 - 3, p.y - 9, 6, 18, '#9aa0aa'); }

KITS.batman = {
  desc: 'Gadgets & Arkham freeflow: stun batarangs, batclaw takedowns, counters, glide kicks.',
  specials: ['Batarang', 'Batclaw Takedown', 'Grapnel Glide', 'Freeflow Counter'],
  specials_: {
    // returning batarang that stuns (dizzy) — free follow-up
    n: { dur: 22, p: ['castW', 'cast'],
      tick(f, t) {
        if (t !== 8) return; SFX.play('throw'); killOwned(f, 'hr_bat'); // one batarang at a time
        proj(f, { kind: 'hr_bat', vx: 14, r: 14, life: 70, dmg: 4, b: 3, g: .05, ang: 40, draw: drawBatarang,
          tick(p) { const o = fighters[p.owner]; if (p.t > 22 || p.back) { hr_steer(p, o.x, o.y - 60, 14, 1); if (hr_dist(o.x, o.y - 60, p.x, p.y) < 40) p.life = 0; } },
          onHit(p, foe) { p.back = 1; hr_daze(foe, 12); } });
      } },
    // claw line: on hit Batman is reeled TO the foe and knees them (pop-up)
    s: { dur: 46, grav: .5, dmg: 8, b: 6, g: .25, ang: 72, p: ['castW', 'cast'],
      start(f) { f.hr_claw = null; },
      tick(f, t) {
        if (t === 7) { SFX.play('grab'); proj(f, { kind: 'hr_claw', vx: 24, r: 16, life: 17, dmg: 2, b: 0, g: 0, ang: 0, refl: false, draw: hr_clawDraw,
          onHit(p, foe) { p.life = 0; if (foe.act === 'hurt') { foe.stun = 22; fighters[p.owner].hr_claw = foe; } } }); }
        const fo = f.hr_claw;
        if (fo) { const tx = fo.x - Math.sign(fo.x - f.x) * 45, ty = fo.y, d = hr_dist(f.x, f.y, tx, ty); f.face = Math.sign(fo.x - f.x) || f.face; f.ground = null; f.vx = (tx - f.x) / Math.max(1, d / 20); f.vy = (ty - f.y) / Math.max(1, d / 20); fo.vx = fo.vy = 0; if (t % 2) fxBurst(f.x, f.y - 60, '#3a3d48', 1, 2, 10); }
        else if (t > 26) return 'end';
      },
      hbAt: (f, t) => f.hr_claw && hr_dist(f.x, f.y, f.hr_claw.x, f.hr_claw.y) < 90 ? [[35, -60, 36]] : null,
      onHit(f, foe) { f.hr_claw = null; popText(foe.x, foe.y - 150, 'TAKEDOWN!', '#ffd23f'); },
      pose: (f, t) => f.hr_claw ? POSES.kickHigh : t < 7 ? POSES.castW : POSES.cast,
      drawFx(f) { if (f.hr_claw) hr_line(f.x, f.y - 70, f.hr_claw.x, f.hr_claw.y - 60, '#15151a', 3); } },
    // grapnel boost up, then cape glide; press DOWN or B while gliding for a dive kick
    u: { dur: 110, helpless: 1, dmg: 8, b: 6, g: .15, ang: 70,
      grav: (f, t) => t > 20 && !f.hr_dive ? .12 : 1,
      start(f) { f.hr_dive = 0; },
      tick(f, t, inp, E) {
        if (t === 5) { f.vy = -20; f.ground = null; SFX.play('grab'); }
        if (t <= 20) return;
        if (!f.hr_dive) {
          if (inp.x) f.face = Math.sign(inp.x);
          f.vx += (f.face * 6.5 - f.vx) * .1; f.vy = Math.min(f.vy, 2.3);
          if (t > 24 && (inp.y > .6 || E('b'))) { f.hr_dive = t; SFX.play('swing'); }
        } else { f.vx = f.face * 9; f.vy = 14; }
      },
      hbAt: (f, t) => f.hr_dive ? [[25, -25, 34]] : t > 5 && t < 14 ? [[0, -110, 28, { dmg: 5, ang: 80 }]] : null,
      onLand(f) { if (f.hr_dive) { fxBurst(f.x, f.y, '#3a3d48', 12, 5); SFX.play('land'); } return false; },
      pose: (f, t) => t <= 20 ? POSES.victory : f.hr_dive ? { ...POSES.kick, rot: 40 } : { ...POSES.fall, a1: [100, 0], a2: [-100, 0], tl: 30 },
      drawFx(f, t) { if (t <= 20 || f.hr_dive) return; ctx.fillStyle = '#15151a'; ctx.beginPath(); ctx.moveTo(f.x - 70, f.y - 80); ctx.lineTo(f.x, f.y - 105); ctx.lineTo(f.x + 70, f.y - 80); ctx.lineTo(f.x + 40, f.y - 70); ctx.lineTo(f.x, f.y - 85); ctx.lineTo(f.x - 40, f.y - 70); ctx.fill(); } },
    // counter window: dodge the attack, snap to the attacker and strike (pops them up for a combo)
    d: { dur: 28, p: ['counter', 'counter'],
      tick(f, t) {
        if (t !== 3) return;
        hr_dodgeCounter(f, 'hr_ctr', 20, (o, foe) => {
          if (Math.abs(foe.x - o.x) > 260 || Math.abs(foe.y - o.y) > 200) { popText(o.x, o.y - 150, 'EVADED', '#ffd23f'); return; }
          const side = Math.sign(foe.x - o.x) || o.face; teleport(o, foe.x - side * 55, foe.y); o.face = side; o.vx = o.vy = 0;
          startMove(o, HR_TAKEDOWN);
        }, (ctx, p) => { const o = fighters[p.owner]; if ((p.t >> 2) % 2) for (const s of [-1, 1]) pxRect(ctx, o.x + s * 26 - 3, o.y - 130, 6, 14, '#ffd23f'); });
      } },
  },
  normals: {
    // cape stun: weak swipe that leaves the foe dizzy
    fair: { s: 5, a: 4, e: 14, hb: [[45, -60, 34]], dmg: 3, b: 2, g: 0, ang: 40, air: 1, ll: 6, p: ['fairW', 'fair'],
      onHit(f, foe) { hr_daze(foe, 14); } },
  },
};

// ================= CAPTAIN AMERICA =================
// shield (hr_shield) bounces off floors/walls/platforms, hits up to twice, then flies back to Cap to be caught.
function hr_shieldTick(p) {
  const o = fighters[p.owner], nx = p.x + p.vx, ny = p.y + p.vy;
  if (!p.hr_ret) {
    let hit = false;
    if (inMain(nx, p.y)) { p.vx = -p.vx; hit = true; }
    if (inMain(p.x, ny)) { p.vy = -p.vy; hit = true; }
    else for (const s of surfaces()) if (p.vy > 0 && p.y <= s.y && ny >= s.y && p.x >= s.x1 && p.x <= s.x2) { p.vy = -p.vy; hit = true; break; }
    if (hit) { p.hr_b++; SFX.play('shield'); fxBurst(p.x, p.y, '#ffffff', 6, 4, 12); if (p.hr_hits < 2) p.inert = false; }
    if (p.t > 45 || p.hr_b > 2) p.hr_ret = 1;
  } else {
    hr_steer(p, o.x, o.y - 60, 17, .3);
    if (hr_dist(o.x, o.y - 60, p.x, p.y) < 45) { p.life = 0; SFX.play('grab'); fxRing(o.x, o.y - 60, '#ffffff', 30); }
    if (p.t > 200) p.life = 0;
  }
  if (p.hr_rearm && p.t >= p.hr_rearm && p.hr_hits < 2) { p.inert = false; p.hr_rearm = 0; }
}

KITS.cap = {
  desc: 'Ricocheting shield throws, a frontal-blocking shield plow, shield surfing.',
  specials: ['Ricochet Throw', 'Shield Plow', 'Shield Uppercut', 'Shield Surf'],
  specials_: {
    // aim with the stick (up/down diagonals); bounces off terrain, returns to Cap (can hit on the way back, pulling foes in)
    n: { dur: 26, p: ['castW', 'cast'],
      tick(f, t, inp) {
        if (t !== 10 || owned(f, 'hr_shield')) return;
        const vy = inp.y > .4 ? 10 : inp.y < -.4 ? -10 : 0, vx = vy ? 12 : 16; SFX.play('throw');
        proj(f, { kind: 'hr_shield', vx, vy, r: 20, life: 220, dmg: 7, b: 6, g: .12, ang: 70, refl: false, hr_b: 0, hr_hits: 0, draw: drawShieldP, tick: hr_shieldTick,
          onHit(p) { p.hr_hits++; p.hr_ret = 1; p.hr_rearm = p.t + 12; } });
      } },
    // charge forward behind the shield (blocks frontal hits); scoops and plows the foe, final bash
    s: { dur: 42, multi: 6, dmg: 2, b: 2, g: 0, ang: 10,
      tick(f, t) { if (t >= 8 && t <= 30) { f.vx = f.face * 10.5; f.blockFront = true; if (t % 3 === 0) fxBurst(f.x - f.face * 20, f.y - 5, '#e8e0d0', 2, 2, 10); } },
      hbAt: (f, t) => t >= 9 && t <= 28 ? [[45, -58, 32]] : t >= 29 && t <= 32 ? [[50, -58, 36, { dmg: 7, b: 6, g: .45, ang: 38 }]] : null,
      onHit(f, foe) { if (f.mt < 29 && foe.act === 'hurt') { foe.x = f.x + f.face * 55; foe.stun = 12; } },
      pose: (f, t) => t < 29 ? { ...POSES.shield, tl: 25 } : POSES.fsmash },
    // rising shield uppercut: fixed launcher, then a shield-flip at the top
    u: { dur: 42, helpless: 1, dmg: 8, b: 7, g: .12, ang: 88,
      tick(f, t, inp) { if (t === 5) { f.vy = -20; f.ground = null; SFX.play('swing'); } if (t > 5) f.vx = inp.x * 4; },
      hbAt: (f, t) => t >= 5 && t <= 15 ? [[25, -100, 36]] : t >= 20 && t <= 24 ? [[0, -60, 46, { dmg: 5, b: 5, g: .3, ang: 60 }]] : null,
      pose: (f, t) => t < 5 ? POSES.crouch : t < 18 ? POSES.upcut : { ...POSES.spin, rot: (t - 18) * 30 } },
    // ground: surf on the shield, tripping foes upward. air: shield-first dive that spikes and pogos Cap back up
    d: { dur: 40, dmg: 6, b: 6, g: .1, ang: 85,
      start(f) { f.hr_air = !f.ground; f.hr_pogo = 0; },
      tick(f, t) {
        if (f.hr_pogo) return 'end';
        if (f.hr_air) { if (t > 4) { f.vy = 16; f.vx = f.face * 3; } }
        else if (t >= 5 && t <= 28) { f.vx = f.face * (14 - t * .25); if (t % 2) fxBurst(f.x - f.face * 20, f.y, '#ffd23f', 1, 2, 10); }
      },
      hbAt: (f, t) => f.hr_air ? (t > 4 ? [[0, 5, 32, { dmg: 9, b: 4, g: .3, ang: -65 }]] : null) : t >= 5 && t <= 28 ? [[35, -15, 30]] : null,
      onHit(f, foe) { if (f.hr_air) { f.hr_pogo = 1; f.vy = -13; popText(f.x, f.y - 140, 'VIBRANIUM!', '#ffffff'); } },
      onLand(f) { if (f.hr_air) { SFX.play('shield'); fxBurst(f.x, f.y, '#ffffff', 10, 5); f.hr_air = false; f.mt = 32; return true; } return true; },
      pose: (f, t) => f.hr_air ? POSES.stomp : { ...POSES.crouch, tl: 35 },
      drawFx(f, t) { const x = f.x + f.face * 5, y = f.hr_air ? f.y + 5 : f.y - 4; for (const [w, c] of [[40, '#c0142a'], [28, '#f4f4f4'], [16, '#2a4ad8']]) pxRect(ctx, x - w / 2, y - 4, w, 8, c); } },
  },
  normals: {
    // shield spin nair: multi-hit that ends in a knock-away
    nair: { s: 4, a: 14, e: 12, multi: 5, hb: [[0, -55, 50]], dmg: 2, b: 3, g: 0, ang: 60, air: 1, ll: 6, away: 1,
      hbAt: (f, t) => t > 4 && t <= 18 ? [[0, -55, 50, t > 15 ? { dmg: 5, b: 5, g: .35, ang: 45 } : null]] : null,
      pose: (f, t) => ({ ...POSES.spin, rot: t * 30 }) },
  },
};

// ================= THOR =================
function hr_boltDraw(ctx, p) {
  if (p.inert && !p.hr_live) { if ((p.t >> 1) % 2) { ctx.strokeStyle = '#aef6ff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(p.x, p.y + 50, p.r, 10, 0, 0, 7); ctx.stroke(); } return; }
  hr_bolt(p.x, p.y - 900, p.x, p.y + 50, '#aef6ff', 14, p.t); hr_bolt(p.x, p.y - 900, p.x, p.y + 50, '#ffffff', 5, p.t);
  pxDisc(ctx, p.x, p.y + 30, p.r * .6, 'rgba(255,240,74,.6)');
}
function hr_runeDraw(ctx, p) { ctx.globalAlpha = .7; for (let k = 0; k < 6; k++) pxRect(ctx, p.x - 36 + k * 12, p.y - 4, 12, 6, RAINBOW[(k + (p.t >> 3)) % 6]); ctx.globalAlpha = 1; if (p.t % 10 === 0) fxBurst(p.x, p.y - 10, RAINBOW[p.t % 6], 1, 2, 20); }
const HR_BIFROST = { special: 1, s: 1, dur: 30, helpless: 1, grav: 0, dmg: 8, b: 6, g: .3, ang: 85, p: ['victory', 'stomp'],
  tick(f, t) {
    f.vx = f.vy = 0; if (t <= 10) f.intang = true;
    if (t === 10) { const r = owned(f, 'hr_rune'); if (r) { fxBurst(f.x, f.y - 50, '#ffffff', 16, 6); teleport(f, r.x, r.y); r.life = 0; SFX.play('zap'); shakeCam(6); } }
  },
  hbAt: (f, t) => t >= 11 && t <= 16 ? [[0, -60, 55]] : null,
  drawFx(f, t) { if (t > 20) return; ctx.globalAlpha = .45; for (let k = 0; k < 6; k++) { ctx.fillStyle = RAINBOW[k]; ctx.fillRect(f.x - 36 + k * 12, f.y - 900, 12, 900); } ctx.globalAlpha = 1; } };

KITS.thor = {
  desc: 'Throw Mjolnir and recall it through foes, call lightning onto it, Bifrost-warp.',
  specials: ['Mjolnir (B: recall)', 'Lightning Call', 'Hammer Flight', 'Bifrost (B: warp)'],
  specials_: {
    // throw; hammer hovers and crackles. B again: it flies back, hitting foes TOWARD Thor
    n: { dur: 26, p: ['fsmashW', 'fsmash'],
      tick(f, t) {
        if (t !== 10 || owned(f, 'hammer')) return; SFX.play('throw');
        proj(f, { kind: 'hammer', vx: 15, r: 18, life: 600, dmg: 9, b: 6, g: .35, ang: 40, refl: false, draw: drawHammer,
          tick(p) {
            const o = fighters[p.owner];
            if (!p.recall) { p.vx *= .94; p.vy *= .9; if (p.t % 12 === 0) fxBurst(p.x, p.y, '#aef6ff', 3, 3, 10); return; }
            hr_steer(p, o.x, o.y - 60, 21, 1);
            if (hr_dist(o.x, o.y - 60, p.x, p.y) < 40) { p.life = 0; SFX.play('grab'); fxRing(o.x, o.y - 60, '#aef6ff', 30); }
          },
          onHit(p) {} });
      },
      alt(f) { const h = owned(f, 'hammer'); if (!h) return false; if (!h.recall) Object.assign(h, { recall: 1, inert: false, dmg: 7, b: 7, g: .12, ang: 45 }); SFX.play('zap'); return true; } },
    // lightning strikes ahead after a short warning — or ON Mjolnir if it's out (bigger, stronger, stuns)
    s: { dur: 32, p: ['victory', 'victory'],
      tick(f, t) {
        if (t !== 6) return; SFX.play('charge', .6);
        const h = owned(f, 'hammer'), x = h ? h.x : f.x + f.face * 220, gy = h ? h.y + 30 : groundAt(x, f.y) ?? f.y;
        spawn({ owner: f.i, kind: 'hr_bolt', x, y: gy - 50, r: h ? 60 : 42, life: 30, inert: true, stopped: true, refl: false, dmg: h ? 12 : 9, b: 6, g: .3, ang: 80, away: 1, hr_big: !!h, draw: hr_boltDraw,
          tick(p) { if (p.t === 14) { p.inert = false; p.hr_live = 1; SFX.play('zap'); SFX.play('boom', .5); shakeCam(8); flash = 3; } if (p.t > 22) p.inert = true; },
          onHit(p, foe) { if (p.hr_big) hr_daze(foe, 30); } });
      } },
    // hammer-towed flight toward the stick with a spinning hitbox; if Mjolnir is out, it yanks Thor to it instead
    u: { dur: 40, helpless: 1, grav: 0, multi: 6, dmg: 3, b: 4, g: .05, ang: 70,
      start(f) { f.hr_to = owned(f, 'hammer'); },
      tick(f, t, inp) {
        const h = f.hr_to;
        if (h) {
          if (h.life <= 0) { f.hr_to = null; return 'end'; }
          h.vx = h.vy = 0; const d = hr_dist(f.x, f.y - 60, h.x, h.y); f.ground = null;
          f.vx = (h.x - f.x) / Math.max(1, d / 22); f.vy = (h.y + 60 - f.y) / Math.max(1, d / 22);
          if (d < 40 || t > 34) { h.life = 0; SFX.play('grab'); fxRing(f.x, f.y - 60, '#aef6ff', 40); f.vy = -6; f.hr_to = null; return 'end'; }
          return;
        }
        if (t === 5) { f.hr_dir = stickDir(inp, 0, -1); SFX.play('zap'); }
        if (t > 5 && t <= 28) { f.vx = f.hr_dir.x * 13; f.vy = f.hr_dir.y * 13; if (f.hr_dir.y < 0) f.ground = null; fxBurst(f.x, f.y - 55, '#aef6ff', 2, 3, 10); }
        if (t > 28) f.vy += .6;
      },
      hbAt: (f, t) => t > 5 && t <= 28 ? [[0, -55, 42, t > 24 ? { dmg: 6, b: 6, g: .35, ang: 60 } : null]] : null,
      pose: (f, t) => ({ ...POSES.spin, rot: t * 40 }) },
    // first press: carve a Bifrost rune where you stand. Press again: rainbow-warp to it (launching foes at the landing)
    d: { dur: 20, p: ['stomp', 'crouch'],
      tick(f, t) { if (t === 8) { killOwned(f, 'hr_rune'); spawn({ owner: f.i, kind: 'hr_rune', x: f.x, y: f.y, r: 1, life: 900, inert: true, stopped: true, refl: false, dmg: 0, draw: hr_runeDraw }); SFX.play('zap', .5); popText(f.x, f.y - 140, 'RUNE', '#aef6ff'); } },
      alt(f) { if (!owned(f, 'hr_rune')) return false; startMove(f, HR_BIFROST); return true; } },
  },
  normals: {
    // Thunderclap down smash: hammer to the floor, lightning on both sides
    dsmash: { s: 12, a: 4, e: 26, hb: [[75, -20, 40], [-75, -20, 40], [0, -40, 36]], dmg: 15, b: 5, g: .5, ang: 60, charge: 1, away: 1, p: ['usmashW', 'stomp'],
      tick(f, t) { if (t === 13) { SFX.play('zap'); shakeCam(8); fxRing(f.x, f.y - 20, '#aef6ff', 110); } },
      drawFx(f, t) { if (t > 12 && t <= 18) for (const s of [-1, 1]) hr_bolt(f.x, f.y - 20, f.x + s * 120, f.y - 10, '#aef6ff', 5, t); } },
  },
};
