// Smash Ball + Final Smashes. Break the floating ball, then press B.
// Every fighter's Final Smash is its own mechanic (FINALS below). Long-running pieces live in `fxList`
// as small objects with update()/draw()/under(), so the user can keep fighting while summons act.
const RAINBOW = ['#ff3b3b', '#ffb13b', '#fff04a', '#6dff8a', '#3bb0ff', '#b06cff'];
const CUT = 75; // cut-in length (frames)
const BALL_HP = 20;
const ballDelay = () => 3000 + Math.random() * 1800; // 50-80s between Smash Balls
let ball = null, ballTimer = 0, fsCut = null, fxList = [];
const cutSpr = {};

function resetBall() { ball = null; ballTimer = ballDelay(); fsCut = null; fxList = []; }

// ================= Smash Ball =================
function updateBall() {
  for (const f of fighters) if (f.hasFS && T % 3 === 0) particles.push({ x: f.x + (Math.random() - .5) * 70, y: f.y - Math.random() * f.ch.hh, vx: 0, vy: -1.5, life: 20, max: 20, c: RAINBOW[T % 6], sz: PX * 2 });
  if (fighters.some(f => f.hasFS || f.act === 'final')) return;
  const M = stage.main;
  if (!ball) {
    if (--ballTimer <= 0) { ball = { x: (Math.random() - .5) * (M.x2 - M.x1) * .7, y: -460, vx: (Math.random() - .5) * 3, vy: 1, hp: BALL_HP, t: 0, flash: 0, shake: 0, hitBy: [0, 0] }; SFX.play('counter'); }
    return;
  }
  const b = ball;
  b.t++; if (b.flash > 0) b.flash--; if (b.shake > 0) b.shake--;
  b.vx += (Math.random() - .5) * .3; b.vy += (Math.random() - .5) * .3;
  const sp = Math.hypot(b.vx, b.vy); if (sp > 3.2) { b.vx *= 3.2 / sp; b.vy *= 3.2 / sp; }
  b.x += b.vx; b.y += b.vy;
  if (b.x < M.x1 - 40) b.vx = Math.abs(b.vx); if (b.x > M.x2 + 40) b.vx = -Math.abs(b.vx);
  if (b.y < -520) b.vy = Math.abs(b.vy); if (b.y > -70) b.vy = -Math.abs(b.vy);
  if (b.t > 1500) { fxBurst(b.x, b.y, '#ffffff', 20, 6); ball = null; ballTimer = ballDelay(); return; }
  for (const f of fighters) {
    const hbs = activeHitboxes(f);
    if (!hbs || f.move.grab || b.hitBy[f.i] === f.moveId) continue;
    const G = SC(f);
    for (const [x, y, r] of hbs) if (Math.hypot(f.x + x * f.face * G - b.x, f.y + y * G - b.y) < r * G + 28) { b.hitBy[f.i] = f.moveId; hitBall(f, f.move.dmg || 5); break; }
    if (!ball) return;
  }
  for (const p of projectiles) {
    if (p.inert || !p.dmg || Math.hypot(p.x - b.x, p.y - b.y) > p.r + 28) continue;
    hitBall(fighters[p.owner], p.dmg); if (!p.boom) p.life = 0;
    if (!ball) return;
  }
}
function hitBall(f, dmg) {
  const b = ball;
  b.hp -= Math.max(5, dmg); b.flash = 8; b.shake = 10; b.vx += Math.sign(b.x - f.x) * 3; b.vy -= 1.5;
  SFX.play('shield'); SFX.play('hit', .5); fxBurst(b.x, b.y, '#ffffff', 10, 7, 16); fxBurst(b.x, b.y, RAINBOW[Math.random() * 6 | 0], 6, 6, 20);
  if (b.hp > 0) { popText(b.x, b.y - 50, `${Math.ceil(b.hp / BALL_HP * 100)}%`, '#ffffff'); return; }
  ball = null; f.hasFS = true;
  SFX.play('counter'); SFX.play('go'); flash = 5; shakeCam(10);
  for (const c of RAINBOW) fxBurst(b.x, b.y, c, 8, 10, 30);
  popText(b.x, b.y - 40, 'FINAL SMASH READY!', f.ch.color);
  toPad(f.i, { type: 'buzz', ms: 300 }); toPad(f.i, { type: 'info', name: f.ch.name + ' ★ PRESS B!', color: f.ch.color });
}

// ================= framework =================
function startFinal(f) {
  f.hasFS = false; setAct(f, 'final'); f.ft = 0; f.fsd = f.ch.fs; f.vx = f.vy = 0; f.fsHit = false; f.fsMiss = false; f.home = null; f.noCEmsg = 0;
  fsCut = { f, t: 0 }; SFX.play('counter'); SFX.play('game');
}
function endFinal(f, keepFoe) {
  const foe = fighters[1 - f.i];
  if (!keepFoe && foe.act === 'locked' && !foe.iced && !foe.sleep && !foe.bubbleT) setAct(foe, foe.ground ? 'stand' : 'air');
  if (f.home) { f.x = f.home.x; f.y = f.home.y; f.ground = f.home.ground; f.home = null; }
  f.fsd = f.beam = f.dom = f.aim = f.blob = f.qte = f.bolt = null; f.hidden = false; f.inv = Math.max(f.inv, 40);
  setAct(f, f.ground ? 'stand' : 'air');
  toPad(f.i, { type: 'info', name: f.ch.name, color: f.ch.color });
}
function finalStep(f) {
  const d = f.fsd, t = ++f.ft, foe = fighters[1 - f.i];
  f.inv = Math.max(f.inv, 2);
  if (d.free) { d.start(f, foe); return endFinal(f, true); }
  if (d.run) { if (d.run(f, t, foe)) endFinal(f); return; }
  if (GENERIC[d.type](f, t, foe)) endFinal(f);
}
function addFx(f, e) { fxList.push(Object.assign({ t: 0, owner: f, foe: fighters[1 - f.i] }, e)); }
function updateFx() { fxList = fxList.filter(e => { e.t++; return e.update(e, e.owner, e.foe) !== false && (!e.life || e.t < e.life); }); }
const lock = foe => setAct(foe, 'locked');
const home = f => { f.home = { x: f.x, y: f.y, ground: f.ground }; };
const dirTo = (a, b) => Math.sign(b.x - a.x) || a.face || 1;
const near = (a, b, dx, dy) => Math.abs(a.x - b.x) < dx && Math.abs(a.y - b.y) < dy;
const human = f => !cpu[f.i];
// a domain's sure-hit: lands on anyone inside, except a fighter with zero cursed energy (Toji) — the domain can't perceive him
function sureHit(f, foe) {
  if (!canBeHit(foe)) return false;
  if (!foe.ch.noCE) return true;
  if (!f.noCEmsg) { f.noCEmsg = 1; popText(foe.x, foe.y - 170, 'NO CURSED ENERGY: SURE-HIT FAILS', '#d8d4e8'); }
  return false;
}
const stick = f => f.inp || blank();
// damage on a locked target (no launch)
function fsTick(f, foe, dmg, col) {
  foe.dmg += dmg; f.stats.dealt += dmg; foe.hitFlash = 3; foe.hudShake = 6;
  SFX.play('hit', .25); fxBurst(foe.x, foe.y - 55, col || f.ch.fs.col, 4, 6, 12);
}
// small hit on a free target: damage + nudge, no hitlag
function chip(f, foe, dmg, kx = 0, ky = 0) {
  if (!canBeHit(foe)) return;
  fsTick(f, foe, dmg); if (kx || ky) { foe.vx += kx; foe.vy += ky; if (ky < 0) foe.ground = null; }
}
function fsFinish(f, foe, dmg, ang, dir, b = 13, g = .62) {
  if (['locked', 'shield'].includes(foe.act)) setAct(foe, foe.ground ? 'stand' : 'air');
  foe.counter = foe.nullify = foe.subst = foe.blockFront = false; foe.dodgeNext = 0; foe.inv = 0;
  applyHit(f, foe, { dmg, b, g, ang }, dir, foe.x, foe.y - 55);
  shakeCam(26); flash = 6; toPad(foe.i, { type: 'buzz', ms: 400 });
}
// a quick dash toward the foe that "catches" them; true once connected
function catchDash(f, foe, t, max = 35, spd = 18) {
  if (t === 1) { f.face = dirTo(f, foe); home(f); }
  if (f.fsHit) return true;
  f.x += f.face * spd; if (f.ground) f.x = clamp(f.x, f.ground.x1, f.ground.x2);
  fxBurst(f.x - f.face * 30, f.y - 55, f.ch.fs.col, 2, 3, 12);
  if (canBeHit(foe) && near(f, foe, 90, 120)) { f.fsHit = true; f.t0 = t; lock(foe); SFX.play('counter'); return true; }
  if (t >= max) f.fsMiss = true;
  return false;
}
const homing = (e, tx, ty, turn, sp) => { const ta = Math.atan2(ty - e.y, tx - e.x); let d = ta - e.a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; e.a += clamp(d, -turn, turn); e.x += Math.cos(e.a) * sp; e.y += Math.sin(e.a) * sp; };
function viewRect() { const w = W / 2 / cam.z + 60, h = H / 2 / cam.z + 60; return { x: cam.x - w, y: cam.y - h, w: w * 2, h: h * 2 }; }

// ================= generic types (still used by a few fighters) =================
const GENERIC = {
  beam(f, t, foe) {
    if (t === 1) { f.face = dirTo(f, foe); f.beam = { x0: f.x + f.face * 30, y: f.y - 60, len: 0 }; SFX.play('boom'); }
    const B = f.beam; B.len = Math.min(2600, t * 40); if (t < 100) shakeCam(5);
    const x1 = Math.min(B.x0, B.x0 + f.face * B.len), x2 = Math.max(B.x0, B.x0 + f.face * B.len), hb = hurtbox(foe);
    if (!f.fsHit && canBeHit(foe) && hb.x2 > x1 && hb.x1 < x2 && hb.y2 > B.y - 80 && hb.y1 < B.y + 80) { f.fsHit = true; lock(foe); }
    if (f.fsHit && foe.act === 'locked') { foe.x += f.face * 4; foe.y += (B.y + 50 - foe.y) * .1; if (t % 6 === 0) fsTick(f, foe, 3); if (t % 12 === 0) SFX.play('fire'); }
    if (t === 100 && foe.act === 'locked') fsFinish(f, foe, 12, 30, f.face);
    return t >= 112;
  },
  domain(f, t, foe) {
    if (t === 1) { SFX.play('shadow'); SFX.play('boom'); f.dom = { r: 0 }; }
    f.dom.r = Math.min(3000, t * 60);
    if (t === 40 && sureHit(f, foe)) { f.fsHit = true; lock(foe); }
    if (t > 40 && t < 170 && t % 8 === 0 && foe.act === 'locked') fsTick(f, foe, 2.5);
    if (t === 175 && foe.act === 'locked') fsFinish(f, foe, 12, 50, dirTo(f, foe));
    return t >= 190;
  },
  burst(f, t, foe) {
    const d = f.fsd;
    if (t === 1) SFX.play('charge', 1);
    if (t < 40) for (let i = 0; i < 3; i++) { const a = Math.random() * 6.28, r = 220 - t * 4; particles.push({ x: f.x + Math.cos(a) * r, y: f.y - 55 + Math.sin(a) * r, vx: -Math.cos(a) * 5, vy: -Math.sin(a) * 5, life: 18, max: 18, c: i ? d.col : d.col2, sz: PX * 2 }); }
    if (t === 40) {
      SFX.play('boom'); SFX.play('fire'); shakeCam(30); flash = 8;
      fxRing(f.x, f.y - 55, d.col, 200); fxRing(f.x, f.y - 55, d.col2, 130);
      for (let i = 0; i < 6; i++) fxBurst(f.x, f.y - 55, i % 2 ? d.col : d.col2, 20, 18, 40);
      if (canBeHit(foe) && Math.hypot(foe.x - f.x, foe.y - f.y) < 300) fsFinish(f, foe, 30, 50, dirTo(f, foe));
    }
    return t >= 75;
  },
  meteor(f, t, foe) {
    const M = stage.main, d = f.fsd;
    if (t === 1) { SFX.play('jump'); f.ground = null; }
    if (t <= 30) { f.y -= 32; return false; }
    if (t === 31) { f.hidden = true; f.tx = foe.x; }
    if (t <= 90) { f.tx += (foe.x - f.tx) * .1; return false; }
    if (t === 91) { f.x = clamp(f.tx, M.x1 + 30, M.x2 - 30); f.y = M.y - 1300; f.hidden = false; SFX.play('fire'); }
    if (!f.ground) {
      f.y += 45;
      if (f.y >= M.y) {
        f.y = M.y; f.ground = M; f.impact = t;
        SFX.play('boom'); SFX.play('rock'); shakeCam(34); flash = 6;
        fxRing(f.x, f.y - 20, d.col, 220); for (let i = 0; i < 4; i++) fxBurst(f.x, f.y - 10, i % 2 ? d.col : '#b8a080', 20, 16, 36);
        if (canBeHit(foe) && Math.hypot(foe.x - f.x, foe.y - f.y) < 280) fsFinish(f, foe, 30, 70, dirTo(f, foe));
      }
      return false;
    }
    return t >= f.impact + 25;
  },
  rain(f, t, foe) {
    const d = f.fsd;
    if (t % 4 === 0 && t < 160) {
      const x = Math.random() < .7 ? foe.x + (Math.random() - .5) * 160 : cam.x + (Math.random() - .5) * 900;
      spawn({ owner: f.i, kind: 'rain', x, y: cam.y - 360 / cam.z - 80, vy: 22, r: 26, life: 70, dmg: 4, b: 4, g: .08, ang: 80, away: 1, refl: false, onGround: 'vanish', draw: RAIN_DRAW[d.style] });
      if (t % 16 === 0) SFX.play('grab');
    }
    if (t === 160) spawn({ owner: f.i, kind: 'rain', x: foe.x, y: foe.y - 380, vy: 40, r: 70, life: 22, dmg: 14, b: 11, g: .55, ang: 70, away: 1, refl: false, onGround: 'vanish', big: 1, draw: RAIN_DRAW[d.style] });
    return t >= 175;
  },
};
const RAIN_DRAW = {
  chicken(ctx, p) {
    const s = p.big ? 3 : 1, flap = (p.t >> 2) % 2 ? -6 : 6;
    pxDisc(ctx, p.x, p.y, 14 * s, '#f4f0e0'); pxDisc(ctx, p.x + 12 * s, p.y - 10 * s, 8 * s, '#f4f0e0');
    pxRect(ctx, p.x + 18 * s, p.y - 12 * s, 8 * s, 4 * s, '#f2a030'); pxRect(ctx, p.x + 9 * s, p.y - 21 * s, 6 * s, 6 * s, '#d8263a');
    pxRect(ctx, p.x - 18 * s, p.y + flap * s, 14 * s, 6 * s, '#e8e0c8');
  },
};

// ================= drawing helpers =================
function drawBall() {
  if (!ball) return;
  const b = ball, r = 28, dmg = 1 - b.hp / BALL_HP;
  const sx = b.shake ? (Math.random() - .5) * b.shake : 0, sy = b.shake ? (Math.random() - .5) * b.shake : 0;
  ctx.save(); ctx.translate(sx, sy);
  ctx.globalAlpha = .3 + Math.sin(T * .2) * .15; pxDisc(ctx, b.x, b.y, r + 16, '#ffffff'); ctx.globalAlpha = 1;
  ctx.save(); ctx.beginPath(); ctx.arc(b.x, b.y, r, 0, 7); ctx.clip();
  ctx.translate(b.x, b.y); ctx.rotate(T * .05);
  for (let i = -4; i < 4; i++) { ctx.fillStyle = RAINBOW[(i + 8 + (T >> 3)) % 6]; ctx.fillRect(-r * 1.5, i * 9, r * 3, 9); }
  ctx.restore();
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(b.x, b.y, r * .62, 0, 7); ctx.stroke();
  ctx.fillStyle = '#ffffff'; ctx.fillRect(b.x - 12, b.y - 2, 24, 4); ctx.fillRect(b.x + 3, b.y - 17, 4, 34);
  ctx.lineWidth = 3; ctx.strokeStyle = '#15151a'; ctx.beginPath(); ctx.arc(b.x, b.y, r, 0, 7); ctx.stroke();
  if (dmg > 0) {
    ctx.strokeStyle = '#15151a'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    for (let i = 0; i < Math.ceil(dmg * 6); i++) {
      const a = i * 2.4 + .7, l1 = r * .35, l2 = r * (.7 + (i % 2) * .3);
      ctx.beginPath(); ctx.moveTo(b.x + Math.cos(a) * 4, b.y + Math.sin(a) * 4); ctx.lineTo(b.x + Math.cos(a + .25) * l1, b.y + Math.sin(a + .25) * l1); ctx.lineTo(b.x + Math.cos(a - .1) * l2, b.y + Math.sin(a - .1) * l2); ctx.stroke();
    }
  }
  if (b.flash) { ctx.fillStyle = `rgba(255,255,255,${b.flash / 9})`; ctx.beginPath(); ctx.arc(b.x, b.y, r + 4, 0, 7); ctx.fill(); }
  const k = b.hp / BALL_HP;
  ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.beginPath(); ctx.arc(b.x, b.y, r + 12, 0, 7); ctx.stroke();
  ctx.strokeStyle = k > .6 ? '#6dff8a' : k > .3 ? '#ffd23f' : '#ff3b3b';
  ctx.beginPath(); ctx.arc(b.x, b.y, r + 12, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k); ctx.stroke();
  ctx.restore();
}
function bolt(x0, y0, x1, y1, col, w = 8, n = 8) {
  ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x0, y0);
  for (let i = 1; i < n; i++) { const k = i / n; ctx.lineTo(x0 + (x1 - x0) * k + (Math.random() - .5) * 40, y0 + (y1 - y0) * k + (Math.random() - .5) * 40); }
  ctx.lineTo(x1, y1); ctx.stroke();
}
const DOMAIN_BG = {
  void(v, f) {
    ctx.fillStyle = '#07021a'; ctx.fillRect(v.x, v.y, v.w, v.h);
    for (let i = 0; i < 160; i++) { ctx.fillStyle = i % 3 ? '#ffffff' : '#3bf0ff'; ctx.globalAlpha = .4 + .6 * Math.abs(Math.sin(T * .05 + i)); ctx.fillRect(v.x + ((i * 173) % v.w), v.y + ((i * 211) % v.h), 4, 4); }
    ctx.globalAlpha = 1;
    for (let k = 0; k < 6; k++) { ctx.strokeStyle = k % 2 ? '#b06cff' : '#3bf0ff'; ctx.lineWidth = 6; ctx.beginPath(); ctx.ellipse(f.x, f.y - 55, 120 + k * 90, 40 + k * 30, T * .01 * (k % 2 ? 1 : -1) + k, 0, 7); ctx.stroke(); }
  },
  shrine(v, f) {
    ctx.fillStyle = '#2a0508'; ctx.fillRect(v.x, v.y, v.w, v.h);
    pxDisc(ctx, f.x + 300, f.y - 420, 90, '#c0142a');
    const sx = f.x - 60, sy = f.y;
    ctx.fillStyle = '#0a0102';
    for (let k = 0; k < 3; k++) { const w = 420 - k * 110, y = sy - 160 - k * 120; ctx.beginPath(); ctx.moveTo(sx - w / 2 - 40, y); ctx.lineTo(sx + w / 2 + 40, y); ctx.lineTo(sx + w / 2, y - 40); ctx.lineTo(sx - w / 2, y - 40); ctx.fill(); ctx.fillRect(sx - w / 2 + 30, y, w - 60, 120); }
    ctx.lineCap = 'round';
    for (let i = 0; i < 10; i++) { const x = f.x + (Math.random() - .5) * 1000, y = f.y - 55 + (Math.random() - .5) * 1000, a = Math.random() * 3.14, l = 80 + Math.random() * 200; ctx.strokeStyle = i % 3 ? '#ffffff' : '#ff3b3b'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); ctx.stroke(); }
  },
  station(v, f) { // Yuji's domain: an empty train platform at dusk
    ctx.fillStyle = '#3a1418'; ctx.fillRect(v.x, v.y, v.w, v.h);
    ctx.fillStyle = '#c0442a'; ctx.fillRect(v.x, f.y - 520, v.w, 160); ctx.fillStyle = '#e8783a'; ctx.fillRect(v.x, f.y - 400, v.w, 60);
    pxDisc(ctx, f.x - 260, f.y - 380, 70, '#ffd08a');
    ctx.fillStyle = '#15151a'; ctx.fillRect(v.x, f.y - 340, v.w, 30); // canopy
    for (let x = Math.floor(v.x / 260) * 260; x < v.x + v.w; x += 260) ctx.fillRect(x, f.y - 340, 18, 340); // pillars
    ctx.fillStyle = '#2a2a38'; ctx.fillRect(v.x, f.y - 250, v.w, 110); ctx.fillStyle = '#ffd08a'; // a stopped train
    for (let x = Math.floor(v.x / 90) * 90; x < v.x + v.w; x += 90) ctx.fillRect(x + 20, f.y - 230, 50, 36);
    ctx.fillStyle = '#f2c14e'; ctx.fillRect(v.x, f.y - 12, v.w, 8); // platform edge line
  },
  shadow(v, f) { // Megumi's domain: a sea of liquid shadow with shikigami eyes in it
    ctx.fillStyle = '#07040f'; ctx.fillRect(v.x, v.y, v.w, v.h);
    for (let i = 0; i < 14; i++) { const x = v.x + ((i * 257) % v.w), y = f.y - 40 + Math.sin(T * .04 + i) * 20 - (i % 4) * 120; ctx.fillStyle = '#1a1030'; ctx.beginPath(); ctx.ellipse(x, y, 140, 22, 0, 0, 7); ctx.fill(); }
    for (let i = 0; i < 18; i++) { const x = v.x + ((i * 311) % v.w), y = v.y + ((i * 173) % v.h); if ((T + i * 13) % 90 < 70) { pxRect(ctx, x, y, 8, 4, '#ffffff'); pxRect(ctx, x + 20, y, 8, 4, '#ffffff'); } }
  },
  court(v, f) { // Deadly Sentencing: a stark courtroom
    ctx.fillStyle = '#1a1208'; ctx.fillRect(v.x, v.y, v.w, v.h);
    for (let x = Math.floor(v.x / 120) * 120; x < v.x + v.w; x += 120) { ctx.fillStyle = '#2a1c0c'; ctx.fillRect(x, v.y, 60, v.h); }
    ctx.fillStyle = '#5a3a18'; ctx.fillRect(f.x - 500, f.y - 200, 1000, 200); ctx.fillStyle = '#7a5226'; ctx.fillRect(f.x - 520, f.y - 220, 1040, 24); // the bench
    ctx.fillStyle = '#f2c14e'; for (let x = f.x - 460; x < f.x + 460; x += 80) ctx.fillRect(x, f.y - 190, 6, 190);
  },
  pachinko(v, f) { // Idle Death Gamble: neon pachinko parlour, balls raining down
    ctx.fillStyle = '#12002a'; ctx.fillRect(v.x, v.y, v.w, v.h);
    for (let i = 0; i < 60; i++) { const x = v.x + ((i * 137) % v.w), y = v.y + ((i * 97 + T * (3 + i % 4)) % v.h); pxDisc(ctx, x, y, 6, '#c8ccd8'); }
    for (let i = 0; i < 24; i++) { ctx.fillStyle = RAINBOW[(i + (T >> 3)) % 6]; ctx.globalAlpha = .6; ctx.fillRect(v.x + ((i * 223) % v.w), v.y + ((i * 131) % v.h), 30, 30); }
    ctx.globalAlpha = 1;
  },
  swords(v, f) { // Authentic Mutual Love: a pale sky over a field of countless planted katanas
    ctx.fillStyle = '#c8ccd8'; ctx.fillRect(v.x, v.y, v.w, v.h); ctx.fillStyle = '#8a8fa0'; ctx.fillRect(v.x, f.y - 60, v.w, v.h);
    for (let i = 0; i < 70; i++) { const x = v.x + ((i * 149) % v.w), y = f.y - 40 + ((i * 37) % 200), a = ((i * 13) % 20 - 10) * .03;
      ctx.save(); ctx.translate(x, y); ctx.rotate(a); pxRect(ctx, -3, -90, 6, 90, '#e8ecf4'); pxRect(ctx, -10, -96, 20, 5, '#2a2a3a'); pxRect(ctx, -3, -120, 6, 24, '#3a3a4a'); ctx.restore(); }
  },
  bsod(v) {
    ctx.fillStyle = '#1a3aff'; ctx.fillRect(v.x, v.y, v.w, v.h);
    ctx.fillStyle = '#ffffff'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.font = `120px ${FONT}`; ctx.fillText(':(', v.x + 120, v.y + 120);
    ctx.font = `22px ${FONT}`; ctx.fillText('Your opponent ran into a problem', v.x + 120, v.y + 300); ctx.fillText('and their controls were corrupted.', v.x + 120, v.y + 340);
    ctx.font = `14px ${FONT}`; ctx.fillText('STOP CODE: SMASH_OVERFLOW', v.x + 120, v.y + 420);
  },
};

// ================= the 36 Final Smashes =================
// cpu: when the CPU should fire it (default: whenever). pose: fighter pose while it runs.
const FINALS = {
  // ---- controllable transformation: steer a phoenix, burn on contact, explode at the end
  blaze: { name: 'INFERNO PHOENIX', col: '#ff6a1f', col2: '#ffd23f', cpu: (f, foe) => Math.abs(foe.x - f.x) < 700,
    run(f, t, foe) {
      if (t === 1) { f.hidden = true; f.ground = null; SFX.play('fire'); home(f); }
      const i = stick(f), B = stage.blast, s = human(f) ? { x: i.x, y: i.y } : { x: Math.sign(foe.x - f.x), y: Math.sign(foe.y - 40 - f.y) };
      f.vx += (s.x * 11 - f.vx) * .15; f.vy += (s.y * 11 - f.vy) * .15;
      f.x = clamp(f.x + f.vx, B.l + 200, B.r - 200); f.y = clamp(f.y + f.vy, B.t + 200, B.b - 150);
      if (Math.abs(f.vx) > .5) f.face = Math.sign(f.vx);
      fxBurst(f.x - f.face * 40, f.y - 50, t % 2 ? '#ff6a1f' : '#ffd23f', 3, 4, 20);
      if (t < 200 && canBeHit(foe) && Math.hypot(foe.x - f.x, foe.y - f.y) < 110 && t - (f.lastT || -99) > 18) { f.lastT = t; chip(f, foe, 5, dirTo(f, foe) * 7, -6); SFX.play('fire'); }
      if (t === 200) { SFX.play('boom'); flash = 8; shakeCam(24); fxRing(f.x, f.y - 50, '#ff6a1f', 220); fxBurst(f.x, f.y - 50, '#ffd23f', 40, 16, 36); if (canBeHit(foe) && Math.hypot(foe.x - f.x, foe.y - f.y) < 260) fsFinish(f, foe, 18, 50, dirTo(f, foe)); f.hidden = false; }
      return t >= 215;
    },
    draw(f, t) {
      if (t >= 200) return;
      const x = f.x, y = f.y - 50, d = f.face, w = Math.sin(t * .4) * 40;
      ctx.fillStyle = '#ff6a1f'; ctx.beginPath(); ctx.moveTo(x - d * 20, y); ctx.lineTo(x - d * 90, y - 80 - w); ctx.lineTo(x + d * 10, y - 10); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x - d * 20, y); ctx.lineTo(x - d * 90, y + 70 + w); ctx.lineTo(x + d * 10, y + 10); ctx.fill();
      pxDisc(ctx, x, y, 34, '#ff9a2a'); pxDisc(ctx, x + d * 40, y - 12, 20, '#ffd23f'); pxRect(ctx, x + d * 58, y - 16, 16, 8, '#ff3b3b'); pxRect(ctx, x + d * 42, y - 22, 6, 6, '#15151a');
      for (let k = 0; k < 3; k++) pxRect(ctx, x - d * (60 + k * 22), y - 6 + k * 6, 24, 8, k % 2 ? '#ffd23f' : '#ff6a1f');
    } },
  // ---- speed form: you keep playing at double speed with a shocking aura
  volt: { name: 'OVERCHARGE', col: '#fff04a', col2: '#aef6ff', free: 1,
    start(f) {
      f.fsBuff = { t: 420, spd: 1.8, pow: 1.3, col: '#fff04a' }; popText(f.x, f.y - 150, 'OVERCHARGE!', '#fff04a');
      addFx(f, { life: 420, update(e, f, foe) { if (!f.fsBuff) return false; if (e.t % 8 === 0 && canBeHit(foe) && Math.hypot(foe.x - f.x, foe.y - f.y) < 95) chip(f, foe, 2, dirTo(f, foe) * 4, -2); },
        draw(e, f) { if (['dead', 'out'].includes(f.act)) return; for (let k = 0; k < 3; k++) { const a = Math.random() * 6.28; bolt(f.x, f.y - 55, f.x + Math.cos(a) * 80, f.y - 55 + Math.sin(a) * 80, k % 2 ? '#fff04a' : '#aef6ff', 3, 4); } } });
    } },
  // ---- a giant boulder crashes down and rolls across the whole stage: jump it!
  grom: { name: 'AVALANCHE', col: '#9aa0aa', col2: '#6dffb0', pose: 'throwU',
    run(f, t, foe) {
      if (t === 1) {
        const d = dirTo(f, foe), M = stage.main; SFX.play('rock');
        addFx(f, { x: d > 0 ? M.x1 + 60 : M.x2 - 60, y: -1000, vx: 0, vy: 0, d, r: 95, rot: 0, hit: 0, life: 300,
          update(e, f, foe) {
            const M = stage.main;
            e.vy += 1.2; e.y += e.vy;
            if (e.landed) { e.x += e.d * 12; e.rot += e.d * 12 / e.r; }
            if (e.vy > 0 && e.y >= M.y - e.r && e.x > M.x1 && e.x < M.x2) { e.y = M.y - e.r; if (e.vy > 6) { shakeCam(16); SFX.play('rock'); } e.vy = e.landed ? -Math.abs(e.vy) * .45 : -9; e.landed = 1; }
            if (!e.hit && canBeHit(foe) && circleRect(e.x, e.y, e.r, hurtbox(foe))) { e.hit = 1; fsFinish(f, foe, 26, 45, e.d); }
            if (e.y > 900) return false;
          },
          draw(e) { ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(e.rot); pxDisc(ctx, 0, 0, e.r, '#6b6f78'); pxDisc(ctx, -20, -20, e.r - 30, '#8a8f99'); pxRect(ctx, -40, 10, 60, 8, '#4d5058'); pxRect(ctx, 20, -50, 8, 40, '#4d5058'); pxRect(ctx, -10, -80, 30, 12, '#5f9e3a'); ctx.restore(); } });
      }
      return t >= 40;
    } },
  // ---- time stop: the foe freezes solid; every hit you land is stored and released when they thaw
  pip: { name: 'ABSOLUTE ZERO', col: '#9ff3ff', col2: '#ffffff', free: 1,
    start(f, foe) {
      SFX.play('ice'); flash = 6;
      if (!canBeHit(foe)) return;
      lock(foe); foe.iced = { store: 0, t: 200 }; popText(foe.x, foe.y - 160, 'FROZEN SOLID', '#9ff3ff');
      addFx(f, {
        update(e, f, foe) {
          if (!foe.iced) return false;
          if (--foe.iced.t > 0) return;
          const s = foe.iced.store; foe.iced = null; SFX.play('break'); fxBurst(foe.x, foe.y - 55, '#e8feff', 30, 12, 30);
          fsFinish(f, foe, 5, 50, dirTo(f, foe), 6 + s * .35, .5);
          return false;
        },
        draw(e, f, foe) {
          if (!foe.iced) return;
          const hb = hurtbox(foe), k = foe.iced.store / 40;
          ctx.fillStyle = 'rgba(180,240,255,.55)'; ctx.fillRect(hb.x1 - 18, hb.y1 - 18, hb.x2 - hb.x1 + 36, hb.y2 - hb.y1 + 18);
          ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; ctx.strokeRect(hb.x1 - 18, hb.y1 - 18, hb.x2 - hb.x1 + 36, hb.y2 - hb.y1 + 18);
          ctx.strokeStyle = '#3a8aa8'; for (let i = 0; i < Math.min(8, k * 8); i++) { ctx.beginPath(); ctx.moveTo(foe.x, foe.y - 55); ctx.lineTo(foe.x + Math.cos(i * 2.3) * 60, foe.y - 55 + Math.sin(i * 2.3) * 70); ctx.stroke(); }
          text(`${Math.ceil(foe.iced.t / 60)}`, foe.x, hb.y1 - 40, 20, '#9ff3ff'); if (foe.iced.store) text(`+${foe.iced.store | 0}`, foe.x, hb.y1 - 70, 12, '#ffffff');
        } });
    } },
  // ---- reversed gravity: the foe falls UP toward the top blast zone
  nyx: { name: 'MIDNIGHT MOON', col: '#b06cff', col2: '#58e08a', free: 1,
    start(f, foe) {
      SFX.play('shadow'); if (!canBeHit(foe)) return;
      foe.gravFlip = 240; popText(foe.x, foe.y - 160, 'GRAVITY REVERSED', '#b06cff');
      addFx(f, { update(e, f, foe) { if (!foe.gravFlip) return false; if (e.t % 30 === 0) chip(f, foe, 2); },
        under() { const v = viewRect(); pxDisc(ctx, cam.x, v.y + 120, 150, '#e8e0ff'); pxDisc(ctx, cam.x + 50, v.y + 100, 135, '#2a1740'); ctx.globalAlpha = .25; ctx.fillStyle = '#b06cff'; ctx.fillRect(v.x, v.y, v.w, v.h); ctx.globalAlpha = 1; },
        draw(e, f, foe) { if (e.t % 3 === 0) particles.push({ x: foe.x + (Math.random() - .5) * 60, y: foe.y, vx: 0, vy: -6, life: 20, max: 20, c: '#b06cff', sz: PX * 2 }); } });
    } },
  // ---- aimable laser: steer the beam with the stick
  rusty: { name: 'OMEGA CANNON', col: '#6dff8a', col2: '#e8ffe8',
    run(f, t, foe) {
      const oy = f.y - 62, toFoe = Math.atan2(foe.y - 55 - oy, foe.x - f.x), i = stick(f);
      if (t === 1) { f.aimA = toFoe; SFX.play('boom'); }
      const target = !human(f) ? toFoe : Math.hypot(i.x, i.y) > .3 ? Math.atan2(i.y, i.x) : f.aimA;
      let d = target - f.aimA; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
      f.aimA += clamp(d, -.035, .035); f.face = Math.cos(f.aimA) >= 0 ? 1 : -1;
      const ca = Math.cos(f.aimA), sa = Math.sin(f.aimA), cx = foe.x - f.x, cy = foe.y - 55 - oy;
      const along = cx * ca + cy * sa, perp = Math.abs(-cx * sa + cy * ca);
      if (t > 10 && t < 170 && along > 0 && perp < 75 && canBeHit(foe) && t % 6 === 0) { chip(f, foe, 2.5, ca * 3, sa * 3); f.beamHit = t; }
      if (t % 10 === 0 && t < 170) { SFX.play('laser', .3); shakeCam(5); }
      if (t === 170 && f.beamHit > 150) fsFinish(f, foe, 12, Math.atan2(-sa, Math.abs(ca)) * 180 / Math.PI, Math.sign(ca) || 1);
      return t >= 180;
    },
    draw(f, t) {
      if (t > 172 || f.aimA === undefined) return;
      const ox = f.x + Math.cos(f.aimA) * 40, oy = f.y - 62 + Math.sin(f.aimA) * 40, h = 110 + Math.sin(T) * 10;
      ctx.save(); ctx.translate(ox, oy); ctx.rotate(f.aimA);
      ctx.fillStyle = '#2f8a44'; ctx.fillRect(0, -h / 2, 3000, h); ctx.fillStyle = '#6dff8a'; ctx.fillRect(0, -h * .32, 3000, h * .64); ctx.fillStyle = '#ffffff'; ctx.fillRect(0, -h * .12, 3000, h * .24);
      ctx.restore(); pxDisc(ctx, ox, oy, 50, '#e8ffe8');
    } },
  // ---- giant form: huge, white, double damage, super armor
  luffy: { name: 'GEAR 5: SUN GOD NIKA', col: '#ffffff', col2: '#ffe0e0', free: 1,
    start(f) {
      f.fsBuff = { t: 480, spd: 1.15, pow: 2, armor: 1, grow: 1.4, col: '#ffffff', white: 1 }; // white hair + outfit come from Luffy's Gear 5 look
      SFX.play('go'); popText(f.x, f.y - 200, 'GEAR 5!', '#ffffff'); fxRing(f.x, f.y - 55, '#ffffff', 200); fxBurst(f.x, f.y - 60, '#ffffff', 30, 10, 30);
      addFx(f, { life: 480, update(e, f) { // cloud puffs + the Drums of Liberation
        if (!f.fsBuff?.white || ['dead', 'out'].includes(f.act)) return false;
        if (e.t % 5 === 0) particles.push({ x: f.x + (Math.random() - .5) * 80, y: f.y - Math.random() * f.ch.hh * 1.4, vx: (Math.random() - .5) * 1.5, vy: -1.2, life: 26, max: 26, c: '#ffffff', sz: 10 + Math.random() * 10 });
        if (e.t % 45 === 0 || e.t % 45 === 12) { SFX.play('hit', .12); if (e.t % 45 === 0) popText(f.x + (Math.random() - .5) * 90, f.y - f.ch.hh * 1.5 - 10, 'DOON DOON', '#ffffff'); }
      } });
    } },
  // ---- iaido: a warning line crosses the whole screen, then everything on it is cut. Jump or drop!
  zoro: { name: 'IAIDO: DEATH LION SONG', col: '#3aa05a', col2: '#e8eef8', pose: 'crouch',
    run(f, t, foe) {
      if (t === 1) { f.lineY = f.y - 60; SFX.play('charge', .2); }
      if (t === 80) {
        SFX.play('swing', 2); SFX.play('boom'); flash = 8; shakeCam(28);
        const hb = hurtbox(foe); if (canBeHit(foe) && hb.y1 < f.lineY + 45 && hb.y2 > f.lineY - 45) fsFinish(f, foe, 30, 35, dirTo(f, foe));
      }
      return t >= 105;
    },
    draw(f, t) {
      const v = viewRect();
      if (t < 80) { ctx.globalAlpha = .4 + .4 * ((t >> 2) % 2); ctx.fillStyle = '#ff3b3b'; ctx.fillRect(v.x, f.lineY - 2, v.w, 4); ctx.globalAlpha = .12; ctx.fillRect(v.x, f.lineY - 45, v.w, 90); ctx.globalAlpha = 1; text('...', f.x, f.y - 150, 16, '#ffffff'); }
      else { const k = 1 - (t - 80) / 25; ctx.globalAlpha = k; ctx.fillStyle = '#e8eef8'; ctx.fillRect(v.x, f.lineY - 40 * k, v.w, 80 * k); ctx.fillStyle = '#3aa05a'; ctx.fillRect(v.x, f.lineY - 6, v.w, 12); ctx.globalAlpha = 1; }
    } },
  // ---- vertical juggle: kick them up the screen with Sky Walk, then spike them down
  sanji: { name: 'IFRIT JAMBE: SKY WALK', col: '#3bb0ff', col2: '#ff6a1f', cpu: (f, foe) => near(f, foe, 350, 90), pose: 'kickHigh',
    run(f, t, foe) {
      if (!catchDash(f, foe, t)) return f.fsMiss;
      const k = t - f.t0;
      if (k < 70) { foe.y -= 11; f.x = foe.x - f.face * 45; f.y = foe.y + 80; if (k % 8 === 0) { fsTick(f, foe, 3, '#3bb0ff'); SFX.play('fire'); fxBurst(foe.x, foe.y, '#3bb0ff', 10, 8, 18); } }
      if (k === 70) { f.x = foe.x; f.y = foe.y - 130; SFX.play('boom'); fsFinish(f, foe, 10, -75, f.face, 12, .5); }
      return k >= 85;
    } },
  // ---- summon: Zeus the thundercloud hunts the foe and strikes while you keep fighting
  nami: { name: 'ZEUS: THUNDERCLOUD', col: '#fff04a', col2: '#4a4a68', free: 1,
    start(f) {
      SFX.play('zap');
      addFx(f, { x: f.x, y: f.y - 300, life: 400, strike: 0,
        update(e, f, foe) {
          e.x += (foe.x - e.x) * .05; e.y += (foe.y - 260 - e.y) * .05;
          const k = e.t % 60; if (k === 40) SFX.play('charge', .6);
          if (k === 0) { e.strike = 8; SFX.play('zap'); if (canBeHit(foe) && Math.abs(foe.x - e.x) < 60 && foe.y > e.y) { const last = e.t >= 360; applyHit(f, foe, { dmg: last ? 12 : 7, b: last ? 10 : 5, g: last ? .5 : .2, ang: 80 }, 1, foe.x, foe.y - 55); } }
          if (e.strike) e.strike--;
        },
        draw(e) {
          const charging = e.t % 60 > 40;
          for (const [dx, dy, r] of [[-50, 0, 36], [0, -18, 46], [50, 0, 36]]) pxDisc(ctx, e.x + dx, e.y + dy, r, charging && T % 4 < 2 ? '#8a8aa8' : '#4a4a68');
          pxRect(ctx, e.x - 24, e.y - 12, 9, 9, '#fff04a'); pxRect(ctx, e.x + 15, e.y - 12, 9, 9, '#fff04a'); pxRect(ctx, e.x - 15, e.y + 12, 30, 6, '#15151a');
          if (e.strike) bolt(e.x, e.y + 30, e.x, e.y + 700, '#fff04a', 12, 10);
        } });
    } },
  // ---- you aim: move the crosshair with the stick, press A to fire (3 shots)
  usopp: { name: 'SNIPER KING: 3 SHOTS', col: '#ff3b3b', col2: '#ffd23f', pose: 'cast',
    run(f, t, foe) {
      const i = stick(f);
      if (t === 1) { f.aim = { x: foe.x, y: foe.y - 55, shots: 3, prevA: 1 }; f.face = dirTo(f, foe); }
      const a = f.aim, v = viewRect();
      if (human(f)) { a.x += i.x * 16; a.y += i.y * 16; } else { a.x += (foe.x - a.x) * .1; a.y += (foe.y - 55 - a.y) * .1; }
      a.x = clamp(a.x, v.x + 60, v.x + v.w - 60); a.y = clamp(a.y, v.y + 60, v.y + v.h - 60);
      const fire = t > 15 && (human(f) ? i.a && !a.prevA : t % 40 === 39); a.prevA = i.a;
      if (fire) {
        a.shots--; SFX.play('boom'); flash = 3; shakeCam(12); fxBurst(a.x, a.y, '#ff3b3b', 16, 10);
        if (canBeHit(foe) && circleRect(a.x, a.y, 45, hurtbox(foe))) { if (!a.shots) fsFinish(f, foe, 18, 40, dirTo(f, foe)); else applyHit(f, foe, { dmg: 10, b: 6, g: .3, ang: 40 }, dirTo(f, foe), a.x, a.y); }
      }
      return a.shots <= 0 || t > 320;
    },
    draw(f, t) {
      const a = f.aim; if (!a) return;
      ctx.strokeStyle = (T >> 2) % 2 ? '#ff3b3b' : '#ffffff'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.arc(a.x, a.y, 55, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.arc(a.x, a.y, 20, 0, 7); ctx.stroke();
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { ctx.beginPath(); ctx.moveTo(a.x + dx * 25, a.y + dy * 25); ctx.lineTo(a.x + dx * 80, a.y + dy * 80); ctx.stroke(); }
      text('● '.repeat(a.shots), a.x, a.y - 90, 14, '#ffd23f'); if (human(f) && t < 90) text('AIM + PRESS A', a.x, a.y + 90, 10, '#ffffff');
    } },
  // ---- homing serpent: a sun dragon chases the foe across the stage
  tanjiro: { name: 'SUN HALO DRAGON', col: '#ff7a1a', col2: '#3bb0ff', pose: 'cast',
    run(f, t) {
      if (t === 1) { SFX.play('fire'); addFx(f, { x: f.x + f.face * 40, y: f.y - 60, a: f.face > 0 ? 0 : Math.PI, trail: [], hits: 0, cd: 0, life: 300,
        update(e, f, foe) {
          homing(e, foe.x, foe.y - 55, .06, 11); e.trail.unshift([e.x, e.y]); if (e.trail.length > 36) e.trail.pop();
          if (e.cd > 0) e.cd--;
          if (!e.cd && canBeHit(foe) && Math.hypot(foe.x - e.x, foe.y - 55 - e.y) < 60) {
            e.hits++; e.cd = 30; const d = Math.sign(Math.cos(e.a)) || 1;
            if (e.hits >= 3) { fsFinish(f, foe, 12, 50, d); return false; }
            applyHit(f, foe, { dmg: 8, b: 5, g: .2, ang: 60 }, d, e.x, e.y);
          }
        },
        draw(e) {
          e.trail.forEach(([x, y], k) => { if (k % 2) return; pxDisc(ctx, x, y, 30 - k * .6, k % 4 ? '#ff7a1a' : '#ffd23f'); });
          pxDisc(ctx, e.x, e.y, 36, '#ff7a1a'); const c = Math.cos(e.a), s = Math.sin(e.a);
          pxRect(ctx, e.x + c * 20 - s * 12, e.y + s * 20 + c * 12, 8, 8, '#ffffff'); pxRect(ctx, e.x + c * 20 + s * 12, e.y + s * 20 - c * 12, 8, 8, '#ffffff');
          pxRect(ctx, e.x - s * 30, e.y + c * 30 - 20, 6, 24, '#3bb0ff'); pxRect(ctx, e.x + s * 30, e.y - c * 30 - 20, 6, 24, '#3bb0ff');
        } }); }
      return t >= 40;
    } },
  // ---- telegraphed strike: 3... 2... 1... then a lightning cut. Dodge exactly on the strike!
  zenitsu: { name: 'FLAME THUNDER GOD', col: '#ffe07a', col2: '#ff7a1a', pose: 'crouch',
    run(f, t, foe) {
      if (t === 1) home(f);
      if (t === 20 || t === 40 || t === 60) { SFX.play('beep'); popText(foe.x, foe.y - 170, String(4 - t / 20), '#fff04a'); }
      if (t === 80) {
        const x0 = f.x, y0 = f.y - 55, s = dirTo(f, foe);
        f.x = foe.x + s * 70; f.y = foe.y; f.face = -s; f.bolt = { x0, y0, x1: f.x, y1: f.y - 55 };
        SFX.play('zap'); SFX.play('boom'); flash = 8; shakeCam(22);
        if (canBeHit(foe)) fsFinish(f, foe, 32, 40, s); else popText(foe.x, foe.y - 120, 'DODGED!', '#ffffff');
      }
      return t >= 105;
    },
    draw(f, t, foe) {
      if (t < 80) { for (let k = 0; k < 2; k++) { const a = Math.random() * 6.28; bolt(f.x, f.y - 40, f.x + Math.cos(a) * 50, f.y - 40 + Math.sin(a) * 50, '#fff04a', 3, 3); } ctx.strokeStyle = '#fff04a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(foe.x, foe.y - 55, 80 - t * .4, 0, 7); ctx.stroke(); }
      else if (f.bolt) { ctx.globalAlpha = Math.max(0, 1 - (t - 80) / 25); bolt(f.bolt.x0, f.bolt.y0, f.bolt.x1, f.bolt.y1, '#ff7a1a', 30, 10); bolt(f.bolt.x0, f.bolt.y0, f.bolt.x1, f.bolt.y1, '#ffe07a', 14, 10); ctx.globalAlpha = 1; }
    } },
  nezuko: { type: 'burst', name: 'EXPLODING BLOOD: PINK INFERNO', col: '#ff4f9a', col2: '#ffb0d8', cpu: (f, foe) => near(f, foe, 240, 200), pose: 'usmash' },
  rengoku: { type: 'beam', name: 'NINTH FORM: RENGOKU', col: '#ff7a1a', col2: '#ffd23f', cpu: (f, foe) => Math.abs(foe.y - f.y) < 70, pose: 'cast' },
  // ---- timing minigame: press A as the ring hits the target for up to 4 Black Flashes
  yuji: { name: 'DOMAIN EXPANSION: ???', style: 'station', col: '#e8263a', col2: '#15151a', pose: 'counter',
    run(f, t, foe) {
      if (t === 1) { SFX.play('shadow'); SFX.play('boom'); f.dom = { r: 0 }; }
      f.dom.r = Math.min(3000, t * 60);
      if (t < 40) return false;
      if (t === 40) { // sure-hit: Yuji is suddenly right in front of them
        if (!sureHit(f, foe)) return false;
        f.fsHit = true; lock(foe); f.face = dirTo(f, foe); f.x = foe.x - f.face * 70; f.y = foe.y; f.ground = foe.ground; SFX.play('counter');
      }
      if (!f.fsHit) return t >= 70;
      if (!f.qte) f.qte = { n: 0, k: 0, ok: 0, prevA: 1 };
      const q = f.qte, i = stick(f); q.k++;
      q.cpuAt ??= Math.random() < .6 ? 24 : 15;
      const press = human(f) ? (i.a && !q.prevA) : q.k === q.cpuAt; q.prevA = i.a;
      if (press || q.k >= 34) {
        const good = press && q.k >= 21 && q.k <= 28; q.n++;
        if (good) { q.ok++; fsTick(f, foe, 9, '#e8263a'); popText(foe.x, foe.y - 150, 'BLACK FLASH!', '#e8263a'); flash = 4; shakeCam(14); SFX.play('counter'); fxBurst(foe.x, foe.y - 55, '#15151a', 16, 10); }
        else { fsTick(f, foe, 2); popText(foe.x, foe.y - 150, 'miss', '#888888'); }
        q.k = 0; q.cpuAt = undefined;
      }
      if (q.n >= 4) { fsFinish(f, foe, 5, 40, f.face, 8 + q.ok * 2.4, .55); return true; }
      return false;
    },
    draw(f, t, foe) {
      const q = f.qte; if (!q) return;
      const r = 120 - q.k * 3;
      ctx.lineWidth = 6; ctx.strokeStyle = '#ffffff'; ctx.beginPath(); ctx.arc(foe.x, foe.y - 55, 47, 0, 7); ctx.stroke();
      ctx.strokeStyle = r > 38 && r < 58 ? '#e8263a' : '#ff9a9a'; ctx.beginPath(); ctx.arc(foe.x, foe.y - 55, Math.max(4, r), 0, 7); ctx.stroke();
      text(`${q.n + 1}/4`, foe.x, foe.y - 200, 12, '#ffffff'); if (human(f)) text('PRESS A ON THE RING', foe.x, foe.y + 40, 10, '#ffffff');
    } },
  gojo: { type: 'domain', style: 'void', name: 'DOMAIN EXPANSION: UNLIMITED VOID', col: '#b06cff', col2: '#3bf0ff', pose: 'counter' },
  // ---- Chimera Shadow Garden: the floor turns to shadow, the foe sinks while Divine Dogs lunge out of it, then Max Elephant drops
  megumi: { name: 'DOMAIN EXPANSION: CHIMERA SHADOW GARDEN', style: 'shadow', col: '#8a7aff', col2: '#15151a', pose: 'counter',
    run(f, t, foe) {
      if (t === 1) { SFX.play('shadow'); SFX.play('boom'); f.dom = { r: 0 }; }
      f.dom.r = Math.min(3000, t * 60);
      if (t === 40 && sureHit(f, foe)) { f.fsHit = true; lock(foe); SFX.play('shadow'); }
      const held = f.fsHit && foe.act === 'locked';
      if (held && t > 40 && t < 150 && t % 18 === 0) { fsTick(f, foe, 4, '#8a7aff'); SFX.play('shadow'); popText(foe.x, foe.y - 150, 'DIVINE DOGS!', '#8a7aff'); }
      if (held && t === 175) { SFX.play('rock'); fsFinish(f, foe, 14, 75, dirTo(f, foe)); popText(foe.x, foe.y - 170, 'MAX ELEPHANT!', '#8a7aff'); }
      return t >= 190;
    },
    draw(f, t, foe) {
      if (!f.fsHit || t <= 40 || t > 176) return;
      pxRect(ctx, foe.x - 50, foe.y - 6, 100, 10, '#0a0612'); // the shadow pool they're sinking into
      const k = (t - 40) % 18; if (t < 150 && k < 12) for (const s of [-1, 1]) drawDog(ctx, { x: foe.x + s * (70 - k * 5), y: foe.y - k * 5, vx: -s, t });
      if (t >= 150) drawElephant(ctx, { x: foe.x, y: foe.y - 420 + (t - 150) * 16, t });
    } },
  // ---- area hazard: the shrine slashes everything inside its circle. Escape it!
  sukuna: { name: 'DOMAIN EXPANSION: MALEVOLENT SHRINE', col: '#e8263a', col2: '#15151a', pose: 'counter',
    run(f, t, foe) {
      const R = 520, inside = Math.hypot(foe.x - f.x, foe.y - f.y) < R && sureHit(f, foe);
      f.dom = { r: Math.min(R, t * 30) };
      if (t === 1) { SFX.play('shadow'); SFX.play('boom'); }
      if (t > 20 && t < 240 && t % 6 === 0 && inside) { chip(f, foe, 1.8, (Math.random() - .5) * 4, -1); if (t % 12 === 0) SFX.play('swing', 1); }
      if (t === 240 && inside) fsFinish(f, foe, 10, 50, dirTo(f, foe));
      return t >= 250;
    } },
  // ---- no cursed energy = no domain. Instead: vanish, reappear behind them, strip every technique, and cut them apart
  toji: { name: 'HEAVENLY RESTRICTION: SORCERER KILLER', col: '#b8b0c8', col2: '#d8263a', pose: 'dash', cpu: (f, foe) => near(f, foe, 700, 250),
    run(f, t, foe) {
      if (t === 1) { SFX.play('shadow'); f.hidden = true; fxBurst(f.x, f.y - 55, '#6a6f7a', 20, 6); }
      if (t < 30) return false;
      if (t === 30) {
        f.hidden = false;
        if (!canBeHit(foe)) return true;
        f.face = -(foe.face || 1); f.x = foe.x - f.face * 60; f.y = foe.y; f.ground = foe.ground; f.fsHit = true; lock(foe);
        foe.buff = foe.fsBuff = foe.clones = null; foe.stealth = foe.dodgeNext = 0; popText(foe.x, foe.y - 170, 'TECHNIQUES NULLIFIED', '#d8d4e8'); SFX.play('counter'); flash = 4;
      }
      if (foe.act === 'locked' && t > 34 && t < 110 && t % 7 === 0) { fsTick(f, foe, 4, '#d8263a'); SFX.play('swing', 1.2); f.x = foe.x + (t % 14 ? 1 : -1) * 60; f.face = dirTo(f, foe); }
      if (t === 118 && foe.act === 'locked') { popText(foe.x, foe.y - 180, 'SPLIT SOUL KATANA', '#d8d4e8'); fsFinish(f, foe, 16, 40, f.face); }
      return t >= 132;
    },
    draw(f, t, foe) {
      if (t < 30) { const v = viewRect(); ctx.globalAlpha = .45 * Math.min(1, t / 10); ctx.fillStyle = '#000'; ctx.fillRect(v.x, v.y, v.w, v.h); ctx.globalAlpha = 1; return; }
      if (!f.fsHit || t > 118 || t % 7 > 3) return;
      const a = t * 1.7; ctx.lineCap = 'round';
      for (const [c, w] of [['#d8263a', 10], ['#ffffff', 3]]) { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(foe.x - Math.cos(a) * 110, foe.y - 55 - Math.sin(a) * 110); ctx.lineTo(foe.x + Math.cos(a) * 110, foe.y - 55 + Math.sin(a) * 110); ctx.stroke(); }
    } },
  // ---- a trial: Judgeman charges the foe with what they actually did this match. Guilty ->
  // Confiscation (no specials for 10s) or, for the worst crimes, the Executioner's Sword (his next hit kills)
  higuruma: { name: 'DOMAIN EXPANSION: DEADLY SENTENCING', style: 'court', col: '#f2c14e', col2: '#15151a', pose: 'counter',
    run(f, t, foe) {
      if (t === 1) { SFX.play('shadow'); SFX.play('boom'); f.dom = { r: 0 }; }
      f.dom.r = Math.min(3000, t * 60);
      if (t === 40) {
        if (!sureHit(f, foe)) return false;
        f.fsHit = true; lock(foe); SFX.play('beep');
        const st = foe.stats, q = foe.staleQ || [], reps = Math.max(0, ...q.map(k => q.filter(x => x === k).length));
        f.crime = st.kos > 0 ? { text: `${st.kos} COUNT${st.kos > 1 ? 'S' : ''} OF MURDER`, death: true }
          : st.dealt >= 120 ? { text: `ASSAULT: ${Math.round(st.dealt)}% DAMAGE`, death: st.dealt >= 200 }
          : reps >= 4 ? { text: `SPAMMING ONE MOVE ${reps} TIMES`, death: false }
          : { text: 'LOITERING IN A DOMAIN', death: false };
      }
      if (!f.fsHit) return t >= 70;
      if (t === 60 || t === 95) SFX.play('beep');
      if (t === 115) {
        SFX.play('game'); flash = 5; shakeCam(10);
        if (f.crime.death) { f.execT = 420; popText(f.x, f.y - 190, "EXECUTIONER'S SWORD", '#ffffff'); }
        else { foe.confT = 600; popText(foe.x, foe.y - 190, 'CONFISCATION', '#f2c14e'); }
      }
      return t >= 155;
    },
    draw(f, t, foe) {
      if (!f.fsHit || t < 40) return;
      const x = foe.x, y = foe.y - 330; // Judgeman looms over the defendant
      pxRect(ctx, x - 40, y, 80, 110, '#15151a'); pxDisc(ctx, x, y - 20, 34, '#15151a'); pxRect(ctx, x - 26, y - 30, 52, 10, '#f2c14e');
      pxRect(ctx, x - 80, y + 30, 160, 5, '#f2c14e'); for (const s of [-1, 1]) pxDisc(ctx, x + s * 75, y + 55 + Math.sin(T * .1) * s * 6, 16, '#f2c14e');
      text('THE CHARGE:', x, y - 90, 12, '#ffffff');
      if (t >= 60) text(f.crime.text, x, y - 66, 14, '#f2c14e');
      if (t >= 95) text('VERDICT: GUILTY', x, y - 42, 16, '#ff5a5a');
      if (t >= 115) text(f.crime.death ? 'DEATH PENALTY' : 'CONFISCATION', x, y + 140, 18, '#ffffff');
    } },
  // ---- a pachinko machine: up to 3 spins, 35% each. JACKPOT = 12s of power, armor and nonstop regeneration
  hakari: { name: 'DOMAIN EXPANSION: IDLE DEATH GAMBLE', style: 'pachinko', col: '#6dff8a', col2: '#ff3bd4', pose: 'victory',
    run(f, t, foe) {
      if (t === 1) { SFX.play('shadow'); SFX.play('boom'); f.dom = { r: 0 }; f.reel = { n: [7, 7, 7], spin: 0, k: 0, done: 0 }; }
      f.dom.r = Math.min(3000, t * 60);
      if (t === 40 && sureHit(f, foe)) { f.fsHit = true; lock(foe); }
      const R = f.reel;
      if (R.done) return t >= R.done + 30;
      if (t === 45 || (R.spin && t === R.spin + 40)) {
        if (++R.k > 3) { // out of spins: a pity streak
          f.fsBuff = { t: 240, pow: 1.1, spd: 1.1, col: '#888888' }; popText(f.x, f.y - 190, 'NO JACKPOT...', '#888888'); R.done = t; return false;
        }
        R.spin = t; R.win = Math.random() < .35; SFX.play('charge', .5);
        const a = 1 + Math.random() * 9 | 0, b = Math.random() < .5 ? a : 1 + Math.random() * 9 | 0; // "reach": first two match
        R.n = R.win ? [7, 7, 7] : [a, b, b === a ? (a % 9) + 1 : 1 + Math.random() * 9 | 0];
      }
      if (R.spin && t === R.spin + 30) {
        if (R.win) {
          f.fsBuff = { t: 720, pow: 1.25, spd: 1.15, armor: 14, col: '#6dff8a', jackpot: 1 }; R.done = t;
          popText(f.x, f.y - 190, 'JACKPOT!!', '#6dff8a'); SFX.play('game'); SFX.play('counter'); flash = 8; shakeCam(16);
          for (const c of RAINBOW) fxBurst(f.x, f.y - 60, c, 10, 10, 30);
          addFx(f, { life: 720, update(e, f) { if (!f.fsBuff?.jackpot) return false; f.dmg = Math.max(0, f.dmg - .12); if (e.t % 8 === 0) fxBurst(f.x, f.y - 60, '#6dff8a', 1, 2, 14); } });
        } else if (R.n[0] === R.n[1]) popText(f.x, f.y - 190, 'REACH... MISS', '#ffd23f');
      }
      return false;
    },
    draw(f, t) {
      const R = f.reel; if (!R || !R.spin) return;
      for (let k = 0; k < 3; k++) {
        const x = f.x - 70 + k * 70, y = f.y - 260, rolling = t < R.spin + 10 + k * 10 && !R.done;
        rrect(x - 28, y - 36, 56, 72, 8, '#15151a', '#ffd23f', 4);
        text(String(rolling ? 1 + (T * 7 + k * 3) % 9 : R.n[k]), x, y, 30, R.win && !rolling ? '#6dff8a' : '#ffffff');
      }
    } },
  // ---- a plain of countless katanas, each holding a copied technique: Cursed Speech pins them, Rika pummels, then Pure Love
  yuta: { name: 'DOMAIN EXPANSION: AUTHENTIC MUTUAL LOVE', style: 'swords', col: '#8ac8ff', col2: '#ff5aa8', pose: 'counter',
    run(f, t, foe) {
      if (t === 1) { SFX.play('shadow'); SFX.play('boom'); f.dom = { r: 0 }; }
      f.dom.r = Math.min(3000, t * 60);
      if (t === 40 && sureHit(f, foe)) { f.fsHit = true; lock(foe); f.face = dirTo(f, foe); popText(foe.x, foe.y - 170, "COPIED: CURSED SPEECH — DON'T MOVE", '#8ac8ff'); SFX.play('zap'); }
      const held = f.fsHit && foe.act === 'locked';
      if (held && t > 60 && t < 120 && t % 8 === 0) { fsTick(f, foe, 3, '#ff5aa8'); SFX.play('hit', .5); }
      if (held && t === 130) { SFX.play('laser'); popText(f.x, f.y - 190, 'PURE LOVE', '#ff5aa8'); fsFinish(f, foe, 16, 35, f.face); }
      return t >= 155;
    },
    draw(f, t, foe) {
      if (!f.fsHit) return;
      if (t > 60 && t < 124) jj_drawRika(foe.x - f.face * 70, foe.y, f.face, 1);
      if (t >= 124 && t < 150) { const k = 1 - (t - 124) / 26, x0 = f.x + f.face * 30, w = 900; ctx.globalAlpha = k; ctx.fillStyle = '#ff5aa8'; ctx.fillRect(Math.min(x0, x0 + f.face * w), f.y - 110, w, 100); ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.min(x0, x0 + f.face * w), f.y - 80, w, 40); ctx.globalAlpha = 1; }
    } },
  mochi: { type: 'meteor', name: 'GRAND YOKOZUNA CRUSH', col: '#ff9a3a', col2: '#ffffff', pose: 'dair' },
  // ---- position swap + inverted controls
  glitch: { name: 'BLUE SCREEN OF DEATH', col: '#1a3aff', col2: '#ffffff', free: 1,
    start(f, foe) {
      addFx(f, { life: 40, under(e) { ctx.globalAlpha = 1 - e.t / 40; DOMAIN_BG.bsod(viewRect()); ctx.globalAlpha = 1; }, update() {} });
      SFX.play('laser', .5); flash = 6;
      if (!canBeHit(foe)) return;
      [f.x, foe.x] = [foe.x, f.x]; [f.y, foe.y] = [foe.y, f.y]; [f.ground, foe.ground] = [foe.ground, f.ground];
      foe.invert = 360; chip(f, foe, 10); popText(foe.x, foe.y - 160, 'CONTROLS CORRUPTED', '#ff3bd4');
      addFx(f, { update(e, f, foe) { if (!foe.invert) return false; }, draw(e, f, foe) { for (let k = 0; k < 4; k++) pxRect(ctx, foe.x + (Math.random() - .5) * 80, foe.y - Math.random() * 110, 12, 6, k % 2 ? '#3bf0ff' : '#ff3bd4'); } });
    } },
  // ---- pinball: a golden ball ricochets around the screen, speeding up every bounce
  ronaldo: { name: 'SIUUU! GOLDEN STRIKE', col: '#ffd23f', col2: '#d8263a', pose: 'kick',
    run(f, t, foe) {
      if (t === 10) {
        SFX.play('boom'); const a = Math.atan2(foe.y - 55 - (f.y - 40), foe.x - f.x);
        addFx(f, { x: f.x + f.face * 40, y: f.y - 40, vx: Math.cos(a) * 17, vy: Math.sin(a) * 17, r: 40, rot: 0, hits: 0, cd: 0, life: 330,
          update(e, f, foe) {
            e.x += e.vx; e.y += e.vy; e.rot += e.vx * .02;
            const v = viewRect(), M = stage.main; let b = 0;
            if (e.x < v.x + 100 + e.r) { e.vx = Math.abs(e.vx); b = 1; } if (e.x > v.x + v.w - 100 - e.r) { e.vx = -Math.abs(e.vx); b = 1; }
            if (e.y < v.y + 100 + e.r) { e.vy = Math.abs(e.vy); b = 1; }
            if ((e.y > M.y - e.r && e.x > M.x1 && e.x < M.x2) || e.y > v.y + v.h - 100) { e.vy = -Math.abs(e.vy); b = 1; }
            if (b) { const sp = Math.hypot(e.vx, e.vy), s = Math.min(30, sp * 1.06) / sp; e.vx *= s; e.vy *= s; SFX.play('land'); }
            if (e.cd > 0) e.cd--;
            if (!e.cd && canBeHit(foe) && Math.hypot(foe.x - e.x, foe.y - 55 - e.y) < e.r + 35) {
              e.hits++; e.cd = 25;
              if (e.hits >= 4) { fsFinish(f, foe, 12, 45, Math.sign(e.vx) || 1); popText(f.x, f.y - 160, 'SIUUU!', '#ffd23f'); return false; }
              applyHit(f, foe, { dmg: 8, b: 6, g: .25, ang: 45 }, Math.sign(e.vx) || 1, e.x, e.y);
            }
            if (e.t === 329) popText(f.x, f.y - 160, 'SIUUU!', '#ffd23f');
          },
          draw(e) { for (let k = 1; k < 5; k++) { ctx.globalAlpha = .3 / k; pxDisc(ctx, e.x - e.vx * k * 1.5, e.y - e.vy * k * 1.5, e.r, '#ffd23f'); } ctx.globalAlpha = 1; pxDisc(ctx, e.x, e.y, e.r, '#ffd23f'); for (let i = 0; i < 4; i++) pxRect(ctx, e.x + Math.cos(e.rot + i * 1.57) * 20 - 7, e.y + Math.sin(e.rot + i * 1.57) * 20 - 7, 14, 14, '#8a6a10'); pxRect(ctx, e.x - 10, e.y - 28, 12, 8, '#ffffff'); } });
      }
      return t >= 30;
    } },
  // ---- long-range command grab: leap onto the foe, carry them to a hoop and slam dunk
  lebron: { name: "THE KING'S DUNK", col: '#f2c14e', col2: '#5a2d8a', cpu: (f, foe) => Math.hypot(foe.x - f.x, foe.y - f.y) < 900, pose: 'dair',
    run(f, t, foe) {
      const hoop = { x: 0, y: -560 };
      if (t === 1) { home(f); f.hoop = 1; }
      if (t <= 15) return false;
      if (!f.fsHit) {
        if (t > 45) return true;
        const dx = foe.x - f.x, dy = foe.y - f.y, d = Math.hypot(dx, dy) || 1;
        f.x += dx / d * Math.min(32, d); f.y += dy / d * Math.min(32, d); f.face = Math.sign(dx) || f.face;
        if (d < 90 && canBeHit(foe)) { f.fsHit = true; lock(foe); f.t0 = t; SFX.play('grab'); }
        return false;
      }
      const k = t - f.t0;
      if (k <= 30) { f.x += (hoop.x - 70 - f.x) * .15; f.y += (hoop.y + 60 - f.y) * .15; foe.x = f.x + 40; foe.y = f.y - 110; }
      if (k === 31) { SFX.play('boom'); flash = 8; shakeCam(30); popText(hoop.x, hoop.y - 60, 'SLAM DUNK!', '#f2c14e'); foe.x = hoop.x; foe.y = hoop.y + 120; }
      if (k > 31 && foe.y < stage.main.y) foe.y = Math.min(stage.main.y, foe.y + 45);
      if (k === 48) { foe.ground = stage.main; fsFinish(f, foe, 30, 85, 1); fxBurst(foe.x, foe.y, '#e8782a', 20, 10); }
      return k >= 60;
    },
    draw() {
      const x = 0, y = -560; pxRect(ctx, x + 50, y - 110, 12, 130, '#9aa0aa'); pxRect(ctx, x - 60, y - 120, 130, 90, '#ffffff'); pxRect(ctx, x - 30, y - 95, 70, 50, '#d8263a'); pxRect(ctx, x - 24, y - 89, 58, 38, '#ffffff');
      ctx.strokeStyle = '#ff6a1f'; ctx.lineWidth = 6; ctx.beginPath(); ctx.ellipse(x, y, 50, 10, 0, 0, 7); ctx.stroke();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(x + i * 20, y); ctx.lineTo(x + i * 12, y + 60); ctx.stroke(); }
    } },
  // ---- squad strafing runs: Iron Legion suits fly across and fire at the foe
  ironman: { name: 'IRON LEGION', col: '#c0142a', col2: '#f2c14e', pose: 'victory',
    run(f, t, foe) {
      if (t % 28 === 10 && t < 200) {
        const s = Math.random() < .5 ? -1 : 1, last = t > 170;
        addFx(f, { x: cam.x - s * (W / 2 / cam.z + 120), y: foe.y - 140 - Math.random() * 140, vx: s * 20, fired: 0, last, life: 150,
          update(e, f, foe) {
            e.x += e.vx;
            if (!e.fired && Math.abs(e.x - foe.x) < 260 && Math.sign(foe.x - e.x) === Math.sign(e.vx)) {
              e.fired = 1; const a = Math.atan2(foe.y - 55 - e.y, foe.x - e.x); SFX.play('laser', e.last ? .3 : .7);
              spawn({ owner: f.i, kind: 'repulsor', x: e.x, y: e.y, vx: Math.cos(a) * 26, vy: Math.sin(a) * 26, r: e.last ? 40 : 18, life: 40, dmg: e.last ? 14 : 7, b: e.last ? 11 : 5, g: e.last ? .55 : .25, ang: 45, refl: false, draw: beamDraw(e.last ? '#ffffff' : '#bff6ff') });
            }
          },
          draw(e) { const d = Math.sign(e.vx); pxRect(ctx, e.x - 30, e.y - 12, 60, 24, '#c0142a'); pxRect(ctx, e.x + d * 18, e.y - 15, 18, 18, '#f2c14e'); pxRect(ctx, e.x + d * 26, e.y - 10, 6, 4, '#bff6ff'); pxRect(ctx, e.x - d * 50, e.y - 6, 22, 12, '#ffb13b'); } });
      }
      return t >= 210;
    } },
  // ---- tether flail: web the foe from anywhere and slam them side to side
  spiderman: { name: 'MAXIMUM WEB SLAM', col: '#d8263a', col2: '#ffffff', pose: 'hold',
    run(f, t, foe) {
      if (t === 1) { if (canBeHit(foe) && Math.hypot(foe.x - f.x, foe.y - f.y) < 1100) { f.fsHit = true; lock(foe); SFX.play('throw'); } else return true; }
      const k = t - 10; if (k < 0) return false;
      const slam = k / 26 | 0, ph = (k % 26) / 26;
      if (slam >= 3) { if (k === 78) fsFinish(f, foe, 10, 40, f.face); return k >= 90; }
      const side = slam % 2 ? -1 : 1, a = Math.PI * ph;
      foe.x = f.x + side * 210 * Math.cos(a); foe.y = f.y - 210 * Math.sin(a);
      f.face = Math.sign(foe.x - f.x) || f.face;
      if (k % 26 === 25) { fsTick(f, foe, 7); shakeCam(16); SFX.play('rock'); fxBurst(foe.x, foe.y, '#b8a080', 12, 7); }
      return false;
    },
    draw(f, t, foe) { if (!f.fsHit || foe.act !== 'locked') return; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(f.x + f.face * 20, f.y - 70); ctx.lineTo(foe.x, foe.y - 55); ctx.stroke(); } },
  // ---- ground vehicle: the Batmobile tears across the stage; missiles for anyone jumping
  batman: { name: 'THE BATMOBILE', col: '#15151a', col2: '#3b9bff', pose: 'victory',
    run(f, t, foe) {
      if (t === 15) {
        const d = dirTo(f, foe), M = stage.main; SFX.play('fire');
        addFx(f, { x: (d > 0 ? M.x1 : M.x2) - d * 700, y: M.y, d, hit: 0, shot: 0, life: 220,
          update(e, f, foe) {
            e.x += e.d * 28; if (e.t % 3 === 0) fxBurst(e.x - e.d * 150, e.y - 30, '#ff9a2a', 2, 3, 12);
            if (!e.hit && canBeHit(foe) && foe.x > e.x - 150 && foe.x < e.x + 150 && foe.y > e.y - 110 && foe.y <= e.y + 5) { e.hit = 1; fsFinish(f, foe, 26, 30, e.d); }
            if (!e.shot && Math.abs(e.x - foe.x) < 300 && foe.y < e.y - 120) {
              e.shot = 1; SFX.play('laser', .7);
              for (const k of [-1, 1]) spawn({ owner: f.i, kind: 'missile', x: e.x, y: e.y - 80, vx: k * 3, vy: -14, r: 16, life: 70, dmg: 10, b: 8, g: .4, ang: 70, refl: false, draw: drawMissile,
                tick(p) { const a = Math.atan2(foe.y - 55 - p.y, foe.x - p.x); p.vx += (Math.cos(a) * 16 - p.vx) * .15; p.vy += (Math.sin(a) * 16 - p.vy) * .15; } });
            }
          },
          draw(e) {
            const d = e.d, x = e.x, y = e.y;
            pxRect(ctx, x - 150, y - 60, 300, 45, '#15151a'); pxRect(ctx, x - 60, y - 95, 130, 40, '#15151a'); pxRect(ctx, x - 40, y - 88, 60, 20, '#3b9bff');
            pxRect(ctx, x + d * 130, y - 50, 24, 12, '#bff6ff'); pxRect(ctx, x - d * 160, y - 55, 20, 30, '#ff6a1f');
            for (const wx of [-100, 100]) { pxDisc(ctx, x + wx, y - 15, 22, '#2a2a3a'); pxDisc(ctx, x + wx, y - 15, 8, '#6a6f7a'); }
            ctx.fillStyle = '#15151a'; ctx.beginPath(); ctx.moveTo(x - d * 150, y - 60); ctx.lineTo(x - d * 190, y - 120); ctx.lineTo(x - d * 110, y - 60); ctx.fill();
          } });
      }
      return t >= 60;
    } },
  // ---- comeback: heal 40%, super armor and more power
  cap: { name: 'I CAN DO THIS ALL DAY', col: '#2a4ad8', col2: '#ffffff', free: 1,
    start(f, foe) {
      const heal = Math.min(f.dmg, 40); f.dmg -= heal; f.fsBuff = { t: 480, spd: 1.1, pow: 1.3, armor: 1, col: '#3b6bff' };
      popText(f.x, f.y - 160, `I CAN DO THIS ALL DAY  -${heal | 0}%`, '#6dff8a'); SFX.play('go'); fxRing(f.x, f.y - 55, '#ffffff', 180);
      if (canBeHit(foe) && Math.hypot(foe.x - f.x, foe.y - f.y) < 200) applyHit(f, foe, { dmg: 8, b: 9, g: .2, ang: 45 }, dirTo(f, foe), foe.x, foe.y - 55);
    } },
  // ---- the floor is lightning: stay airborne or get shocked, then a final bolt
  thor: { name: 'GOD OF THUNDER', col: '#aef6ff', col2: '#fff04a', pose: 'victory',
    run(f, t, foe) {
      if (t === 1) { home(f); f.ground = null; SFX.play('zap'); }
      f.x += (0 - f.x) * .05; f.y += (-430 - f.y) * .06;
      if (t > 30 && t < 230) { if (t % 8 === 0 && foe.ground && canBeHit(foe)) chip(f, foe, 3, 0, -6); if (t % 20 === 0) SFX.play('zap'); }
      if (t === 230) { SFX.play('boom'); flash = 8; shakeCam(24); f.strikeX = foe.x; if (canBeHit(foe)) fsFinish(f, foe, 14, 75, dirTo(f, foe)); }
      return t >= 245;
    },
    draw(f, t, foe) {
      if (t > 30 && t < 230) for (const s of surfaces()) { ctx.strokeStyle = t % 4 < 2 ? '#fff04a' : '#aef6ff'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(s.x1, s.y - 4); for (let x = s.x1; x < s.x2; x += 30) ctx.lineTo(x, s.y - 4 - Math.random() * 22); ctx.lineTo(s.x2, s.y - 4); ctx.stroke(); }
      if (t >= 230 && t < 245) bolt(f.x, f.y - 60, f.strikeX, foe.y, '#ffffff', 16, 10);
      if (t < 230) for (let k = 0; k < 2; k++) { const a = Math.random() * 6.28; bolt(f.x, f.y - 60, f.x + Math.cos(a) * 90, f.y - 60 + Math.sin(a) * 90, '#aef6ff', 3, 3); }
    } },
  // ---- background giant: a kaiju stomps three times where the foe stands (watch the shadow)
  kaiju: { name: 'KAIJU RAMPAGE', col: '#4fbf3a', col2: '#ffd23f', pose: 'victory',
    run(f, t, foe) {
      if (t === 1) { SFX.play('game'); addFx(f, { stomp: 0, k: 0, x: foe.x, life: 400,
        update(e, f, foe) {
          e.k++; if (e.k < 30) e.x += (foe.x - e.x) * .15;
          if (e.k === 50) {
            SFX.play('boom'); SFX.play('rock'); shakeCam(26); fxBurst(e.x, stage.main.y, '#b8a080', 20, 10);
            if (canBeHit(foe) && Math.abs(foe.x - e.x) < 150 && foe.y > stage.main.y - 380) { const d = Math.sign(foe.x - e.x) || 1; if (e.stomp === 2) fsFinish(f, foe, 22, 80, d); else applyHit(f, foe, { dmg: 14, b: 7, g: .3, ang: 80 }, d, foe.x, foe.y - 40); }
          }
          if (e.k >= 75) { e.stomp++; e.k = 0; if (e.stomp >= 3) return false; }
        },
        under() { const v = viewRect(); ctx.fillStyle = 'rgba(40,90,40,.3)'; ctx.fillRect(cam.x - 260, v.y + 180, 520, v.h); ctx.fillRect(cam.x - 170, v.y + 20, 340, 180); pxRect(ctx, cam.x - 110, v.y + 80, 36, 24, '#ffd23f'); pxRect(ctx, cam.x + 74, v.y + 80, 36, 24, '#ffd23f'); },
        draw(e) {
          const M = stage.main, k = e.k;
          if (k < 50) { ctx.fillStyle = `rgba(0,0,0,${.2 + k / 100})`; ctx.beginPath(); ctx.ellipse(e.x, M.y, 150, 26, 0, 0, 7); ctx.fill(); }
          if (k > 30 && k < 70) { const v = viewRect(), fy = k < 50 ? v.y + (M.y - v.y) * (k - 30) / 20 : M.y; pxRect(ctx, e.x - 140, fy - 260, 280, 260, '#3a8a2a'); for (const cx of [-110, -10, 90]) pxRect(ctx, e.x + cx, fy - 20, 30, 24, '#f4f0e0'); }
        } }); }
      return t >= 40;
    } },
  // ---- wind push: speaker towers blast the foe toward the far blast zone
  djbass: { name: 'SPEAKER TOWERS: BASS DROP', col: '#b06cff', col2: '#3bf0ff', pose: 'victory',
    run(f, t, foe) {
      if (t === 1) { SFX.play('go'); addFx(f, { d: dirTo(f, foe), life: 260,
        update(e, f, foe) {
          if (e.t > 30 && e.t < 240 && canBeHit(foe)) { foe.x += e.d * (foe.ground ? 5 : 8); if (e.t % 15 === 0) { chip(f, foe, 1.5); } }
          if (e.t === 240 && canBeHit(foe)) fsFinish(f, foe, 10, 30, e.d);
        },
        draw(e) {
          const v = viewRect(), sx = e.d > 0 ? v.x + 110 : v.x + v.w - 110, pulse = (T % 15) < 4 ? 14 : 0;
          for (const y of [stage.main.y - 180, stage.main.y - 420]) { pxRect(ctx, sx - 70 - pulse / 2, y - 110 - pulse / 2, 140 + pulse, 220 + pulse, '#2a2a3a'); pxDisc(ctx, sx, y, 50 + pulse / 2, '#3bf0ff'); pxDisc(ctx, sx, y, 20, '#15151a'); }
          ctx.lineWidth = 8; for (let k = 0; k < 6; k++) { const x = sx + e.d * (((e.t * 14) + k * 200) % 1400); ctx.strokeStyle = k % 2 ? '#b06cff' : '#3bf0ff'; ctx.beginPath(); ctx.arc(x - e.d * 200, stage.main.y - 300, 260, -.6, .6, e.d < 0); ctx.stroke(); }
        } }); }
      return t >= 30;
    } },
  // ---- curse: the foe shrinks — tiny, weak, and easy to launch
  mimi: { name: 'GRAND ILLUSION: SHRINK', col: '#7a2ab0', col2: '#ffd23f', pose: 'cast',
    run(f, t) {
      if (t === 10) { SFX.play('ice'); addFx(f, { x: f.x + f.face * 40, y: f.y - 70, life: 90,
        update(e, f, foe) { const dx = foe.x - e.x, dy = foe.y - 55 - e.y, d = Math.hypot(dx, dy) || 1; e.x += dx / d * Math.min(d, 24); e.y += dy / d * Math.min(d, 24);
          if (d < 30) { if (canBeHit(foe)) { foe.shrink = 540; SFX.play('counter'); popText(foe.x, foe.y - 120, 'SHRUNK!', '#ffd23f'); fxBurst(foe.x, foe.y - 40, '#ffd23f', 20, 7); } return false; } },
        draw(e) { for (let k = 0; k < 5; k++) pxRect(ctx, e.x + Math.cos(T * .4 + k) * 20 - 5, e.y + Math.sin(T * .4 + k) * 20 - 5, 10, 10, RAINBOW[k]); } }); }
      return t >= 40;
    } },
  // ---- suction: a black hole drags the foe in, shreds them, then explodes
  astro: { name: 'BLACK HOLE', col: '#b06cff', col2: '#ff9a2a', pose: 'cast',
    run(f, t, foe) {
      if (t === 10) { SFX.play('shadow'); addFx(f, { x: (f.x + foe.x) / 2, y: -260, held: 0, life: 262,
        update(e, f, foe) {
          const dx = e.x - foe.x, dy = e.y - (foe.y - 55), d = Math.hypot(dx, dy) || 1;
          if (e.t < 230 && canBeHit(foe)) {
            if (d < 60 || e.held) { e.held = 1; if (foe.act !== 'locked') lock(foe); foe.x = e.x + Math.cos(e.t * .3) * 20; foe.y = e.y + 55 + Math.sin(e.t * .3) * 20; if (e.t % 6 === 0) fsTick(f, foe, 2.5); }
            else { const pull = Math.min(10, 1800 / d); foe.x += dx / d * pull; foe.y += dy / d * pull * .8; if (dy < 0) foe.ground = null; }
          }
          if (e.t === 230) { SFX.play('boom'); flash = 8; shakeCam(24); fxRing(e.x, e.y, '#b06cff', 200); if (e.held || (canBeHit(foe) && d < 250)) fsFinish(f, foe, 12, 60, Math.sign(foe.x - e.x) || 1); }
        },
        draw(e) {
          const r = Math.min(70, e.t * 3);
          ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(e.t * .08);
          for (let k = 0; k < 3; k++) { ctx.strokeStyle = ['#ff9a2a', '#ffd23f', '#b06cff'][k]; ctx.lineWidth = 8; ctx.beginPath(); ctx.ellipse(0, 0, r * (2.2 - k * .3), r * (.6 - k * .1), k, 0, 7); ctx.stroke(); }
          ctx.restore(); pxDisc(ctx, e.x, e.y, r, '#000000'); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(e.x, e.y, r + 3, 0, 7); ctx.stroke();
        } }); }
      return t >= 30;
    } },
  // ---- sleep: the foe dozes off; your next hit does double damage and launches harder
  granny: { name: 'NAP TIME', col: '#f59ab8', col2: '#ffffff', pose: 'cast',
    run(f, t) {
      if (t === 10) { SFX.play('ice'); addFx(f, { x: f.x + f.face * 40, y: f.y - 70, life: 120,
        update(e, f, foe) { const dx = foe.x - e.x, dy = foe.y - 55 - e.y, d = Math.hypot(dx, dy) || 1; e.x += dx / d * Math.min(d, 14); e.y += dy / d * Math.min(d, 14) + Math.sin(e.t * .3) * 3;
          if (d < 30) { if (canBeHit(foe)) { lock(foe); foe.sleep = 240; popText(foe.x, foe.y - 120, 'Zzz...', '#ffffff'); } return false; } },
        draw(e) { text('♪', e.x, e.y, 22, '#f59ab8'); text('♫', e.x - 26, e.y + 14, 16, '#ffffff'); } }); }
      return t >= 30;
    } },
  // ---- mirror clones: three shadow copies copy your every attack
  kage: { name: 'SHADOW CLONE ARMY', col: '#3bf0ff', col2: '#15151a', free: 1,
    start(f) { f.clones = { t: 480, offs: [-150, 150, -300] }; SFX.play('shadow'); popText(f.x, f.y - 160, 'SHADOW CLONES!', '#3bf0ff'); for (const o of f.clones.offs) fxBurst(f.x + o, f.y - 50, '#3bf0ff', 12, 5); } },
  cluck: { type: 'rain', style: 'chicken', name: 'CHICKEN APOCALYPSE', col: '#f4f0e0', col2: '#d8263a', pose: 'victory' },
  // ---- engulf: grow into a giant slime, swallow the foe, spit them out (press A)
  gloop: { name: 'KING SLIME ENGULF', col: '#6ad84a', col2: '#f2c14e', cpu: (f, foe) => near(f, foe, 450, 200),
    run(f, t, foe) {
      const i = stick(f);
      if (t === 1) { f.blob = { r: 30 }; f.hidden = true; SFX.play('shadow'); }
      f.blob.r = Math.min(150, f.blob.r + 6);
      const mv = human(f) ? i.x : Math.sign(foe.x - f.x); f.x += mv * 7; if (f.ground) f.x = clamp(f.x, f.ground.x1, f.ground.x2); if (Math.abs(mv) > .2) f.face = Math.sign(mv);
      if (!f.fsHit && canBeHit(foe) && Math.hypot(foe.x - f.x, foe.y - 55 - (f.y - f.blob.r)) < f.blob.r + 20) { f.fsHit = true; lock(foe); f.t0 = t; SFX.play('shadow'); popText(f.x, f.y - 320, 'GULP!', '#6ad84a'); }
      if (f.fsHit) {
        foe.x = f.x + Math.sin(t * .2) * 20; foe.y = f.y - f.blob.r + 60; if (t % 8 === 0) fsTick(f, foe, 2);
        if ((human(f) ? i.a && t - f.t0 > 15 : t - f.t0 > 90) || t - f.t0 > 150) { f.hidden = false; fsFinish(f, foe, 10, 40, f.face); return true; }
      }
      return t > 300;
    },
    draw(f, t) {
      const b = f.blob; if (!b) return; const w = Math.sin(t * .2) * 8;
      ctx.globalAlpha = .8; ctx.fillStyle = '#4fbf3a'; ctx.beginPath(); ctx.ellipse(f.x, f.y - b.r, b.r + w, b.r - w, 0, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
      pxRect(ctx, f.x + f.face * b.r * .3 - 15, f.y - b.r * 1.3, 18, 24, '#15151a'); pxRect(ctx, f.x + f.face * b.r * .6 - 9, f.y - b.r * 1.3, 18, 24, '#15151a');
      const cy = f.y - b.r * 2 - 10; ctx.fillStyle = '#f2c14e'; ctx.beginPath(); ctx.moveTo(f.x - 40, cy + 30); ctx.lineTo(f.x - 40, cy - 10); ctx.lineTo(f.x - 20, cy + 10); ctx.lineTo(f.x, cy - 20); ctx.lineTo(f.x + 20, cy + 10); ctx.lineTo(f.x + 40, cy - 10); ctx.lineTo(f.x + 40, cy + 30); ctx.fill();
      if (human(f) && f.fsHit) text('PRESS A TO SPIT', f.x, f.y + 30, 10, '#ffffff');
    } },
  // ---- sketch a frame around the foe, scribble them in, then crumple the page
  inky: { name: 'FINAL DRAFT', col: '#3a5aff', col2: '#f4f0e0', pose: 'cast', cpu: (f, foe) => near(f, foe, 500, 260),
    run(f, t, foe) {
      if (t === 12) { SFX.play('grab'); popText(f.x, f.y - 160, 'SKETCHING...', '#f4f0e0'); if (canBeHit(foe) && near(f, foe, 500, 260)) { f.fsHit = true; lock(foe); } }
      if (!f.fsHit) return t > 40;
      if (t % 6 === 0 && t < 100) fsTick(f, foe, 2, '#15151a');
      if (t === 110) { SFX.play('boom'); popText(foe.x, foe.y - 160, 'CRUMPLE!', '#f4f0e0'); fsFinish(f, foe, 12, 45, dirTo(f, foe)); return true; }
    },
    draw(f, t, foe) {
      if (!f.fsHit) return;
      const k = Math.min(1, (t - 12) / 20), x = foe.x - 70, y = foe.y - 150;
      ctx.strokeStyle = '#f4f0e0'; ctx.lineWidth = 8; ctx.strokeRect(x, y, 140 * k, 160 * k);
      ctx.strokeStyle = '#15151a'; ctx.lineWidth = 4;
      if (t > 30) for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(x + Math.random() * 140, y + Math.random() * 160); ctx.lineTo(x + Math.random() * 140, y + Math.random() * 160); ctx.stroke(); }
    } },
};
for (const ch of CHARS) ch.fs = FINALS[ch.id];

// ================= rendering hooks =================
function drawFinalUnder() {
  for (const e of fxList) e.under?.(e, e.owner, e.foe);
  for (const f of fighters) {
    if (f.act !== 'final' || !f.dom) continue;
    ctx.save(); ctx.beginPath(); ctx.arc(f.x, f.y - 55, f.dom.r, 0, 7); ctx.clip();
    DOMAIN_BG[f.fsd.style || 'shrine'](viewRect(), f, f.ft);
    ctx.restore();
    if (f.dom.r < 2900) { ctx.lineWidth = 12; ctx.strokeStyle = f.fsd.col; ctx.beginPath(); ctx.arc(f.x, f.y - 55, f.dom.r, 0, 7); ctx.stroke(); }
  }
}
function drawFinalOver() {
  for (const e of fxList) e.draw?.(e, e.owner, e.foe);
  for (const f of fighters) {
    if (f.act !== 'final') continue;
    const d = f.fsd, t = f.ft;
    d.draw?.(f, t, fighters[1 - f.i]);
    if (f.beam) { // Rengoku's flame tiger
      const B = f.beam, x1 = B.x0 + f.face * B.len, h = 140 + Math.sin(T * .5) * 12, xl = Math.min(B.x0, x1), w = Math.abs(x1 - B.x0);
      ctx.globalAlpha = t > 100 ? Math.max(0, (112 - t) / 12) : 1;
      ctx.fillStyle = d.col; ctx.fillRect(xl, B.y - h / 2, w, h); ctx.fillStyle = d.col2; ctx.fillRect(xl, B.y - h * .3, w, h * .6); ctx.fillStyle = '#ffffff'; ctx.fillRect(xl, B.y - h * .12, w, h * .24);
      for (let x = 0; x < w; x += 40) { ctx.fillStyle = (x / 40) % 2 ? d.col : '#ffd23f'; ctx.beginPath(); ctx.moveTo(xl + x, B.y - h / 2); ctx.lineTo(xl + x + 20, B.y - h / 2 - 30 - Math.random() * 30); ctx.lineTo(xl + x + 40, B.y - h / 2); ctx.fill(); ctx.beginPath(); ctx.moveTo(xl + x, B.y + h / 2); ctx.lineTo(xl + x + 20, B.y + h / 2 + 30 + Math.random() * 30); ctx.lineTo(xl + x + 40, B.y + h / 2); ctx.fill(); }
      pxDisc(ctx, x1, B.y, 120, d.col); pxDisc(ctx, x1 + f.face * 30, B.y + 10, 70, '#ffd23f');
      for (const s of [-1, 1]) { ctx.fillStyle = d.col; ctx.beginPath(); ctx.moveTo(x1 - 40, B.y + s * 70); ctx.lineTo(x1 - 20 * f.face, B.y + s * 170); ctx.lineTo(x1 + 20, B.y + s * 70); ctx.fill(); }
      pxRect(ctx, x1 + f.face * 40 - 9, B.y - 40, 18, 18, '#ffffff'); pxRect(ctx, x1 + f.face * 40 - 9, B.y + 20, 18, 18, '#ffffff');
      ctx.globalAlpha = 1;
    }
    if (d.type === 'burst') {
      if (t < 40) { ctx.globalAlpha = .5; pxDisc(ctx, f.x, f.y - 55, 30 + t * 2, d.col); pxDisc(ctx, f.x, f.y - 55, 15 + t, d.col2); }
      else { const k = (t - 40) / 35; ctx.globalAlpha = Math.max(0, 1 - k); pxDisc(ctx, f.x, f.y - 55, 100 + k * 260, d.col); pxDisc(ctx, f.x, f.y - 55, 60 + k * 180, d.col2); }
      ctx.globalAlpha = 1;
    }
    if (d.type === 'meteor') {
      if (t > 30 && t <= 91) { const s = 60 + Math.sin(T * .4) * 10, x = clamp(f.tx, stage.main.x1 + 30, stage.main.x2 - 30); ctx.strokeStyle = '#ff3b3b'; ctx.lineWidth = 6; ctx.beginPath(); ctx.ellipse(x, stage.main.y, s * 2, s * .5, 0, 0, 7); ctx.stroke(); text('!', x, stage.main.y - 90, 40, '#ff3b3b'); }
      if (t > 91 && !f.ground) for (let i = 0; i < 6; i++) pxRect(ctx, f.x - 60 + i * 24, f.y - 300 - Math.random() * 200, 6, 160, d.col);
    }
  }
}
function drawCutin() {
  if (!fsCut) return;
  const f = fsCut.f, t = fsCut.t, k = Math.min(1, t / 12), out = t > CUT - 10 ? (CUT - t) / 10 : 1;
  ctx.fillStyle = `rgba(0,0,0,${.65 * out})`; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.globalAlpha = out; ctx.translate(W / 2, H / 2); ctx.rotate(-.12);
  ctx.fillStyle = '#000'; ctx.fillRect(-W, -125, W * 2 * k, 250);
  ctx.fillStyle = f.ch.color; ctx.fillRect(-W, -112, W * 2 * k, 224);
  ctx.fillStyle = 'rgba(255,255,255,.35)';
  for (let i = 0; i < 16; i++) ctx.fillRect(-W + ((i * 97 + t * 70) % (W * 2)), ((i * 53) % 220) - 110, 220, 4);
  ctx.restore();
  ctx.globalAlpha = out;
  cutSpr.ch = f.ch;
  blit(renderSprite(cutSpr, full({ ...POSES.victory }), null, true), -220 + Math.min(1, t / 15) * 540, H / 2 + 175, 7.5);
  const [a, b] = f.ch.fs.name.includes(': ') ? f.ch.fs.name.split(': ') : ['FINAL SMASH', f.ch.fs.name];
  const tx = W / 2 + 190 + (1 - Math.min(1, t / 15)) * 400;
  text(a, tx, H / 2 - 50, 18, '#ffffff');
  text(b, tx, H / 2 + 5, b.length > 16 ? 20 : 30, '#ffffff', 'center', '#000');
  text(f.ch.name, tx, H / 2 + 60, 14, '#000', 'center', null);
  ctx.globalAlpha = 1;
}
