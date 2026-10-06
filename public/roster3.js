// Roster expansion 3: sports legends, Marvel/DC heroes, and eight originals.
// Uses the templates/look builder from roster2.js. Engine status effects used here:
// slow (webbed/slimed), dodgeNext, stealth, glide, lowGrav, beat, blockFront, subst, bubble.

// ================= projectile art =================
function drawSoccer(ctx, p) { pxDisc(ctx, p.x, p.y, p.r, '#ffffff'); const a = p.t * .3; for (let i = 0; i < 3; i++) pxRect(ctx, p.x + Math.cos(a + i * 2.1) * p.r * .5 - 4, p.y + Math.sin(a + i * 2.1) * p.r * .5 - 4, 8, 8, '#15151a'); }
function drawBasket(ctx, p) { pxDisc(ctx, p.x, p.y, p.r, '#e8782a'); ctx.strokeStyle = '#3a1a0a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(p.x - p.r, p.y); ctx.lineTo(p.x + p.r, p.y); ctx.moveTo(p.x, p.y - p.r); ctx.lineTo(p.x, p.y + p.r); ctx.stroke(); }
const beamDraw = c => (ctx, p) => { const d = Math.sign(p.vx) || 1; pxRect(ctx, p.x - d * 40, p.y - 6, 50, 12, c); pxRect(ctx, p.x - d * 36, p.y - 3, 44, 6, '#ffffff'); pxDisc(ctx, p.x, p.y, 12, c); };
function drawMissile(ctx, p) { const a = Math.atan2(p.vy, p.vx); ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(a); pxRect(ctx, -15, -4, 24, 8, '#c8ccd8'); pxRect(ctx, 6, -4, 6, 8, '#c0142a'); pxRect(ctx, -24, -3, 9, 6, '#ffb13b'); ctx.restore(); }
function drawWeb(ctx, p) { ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; for (let i = 0; i < 4; i++) { const a = i * .785; ctx.beginPath(); ctx.moveTo(p.x - Math.cos(a) * p.r, p.y - Math.sin(a) * p.r); ctx.lineTo(p.x + Math.cos(a) * p.r, p.y + Math.sin(a) * p.r); ctx.stroke(); } ctx.beginPath(); ctx.arc(p.x, p.y, p.r * .6, 0, 7); ctx.stroke(); }
function drawZip(ctx, p) { const o = fighters[p.owner]; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(o.x + o.face * 20, o.y - 70); ctx.lineTo(p.x, p.y); ctx.stroke(); drawWeb(ctx, p); }
function drawBatarang(ctx, p) { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.t * .5); ctx.fillStyle = '#15151a'; ctx.beginPath(); ctx.moveTo(-22, 0); ctx.lineTo(-8, -8); ctx.lineTo(0, -3); ctx.lineTo(8, -8); ctx.lineTo(22, 0); ctx.lineTo(0, 8); ctx.fill(); ctx.restore(); }
function drawGel(ctx, p) { if (p.boom) return drawMine(ctx, p); pxDisc(ctx, p.x, p.y, 12, '#2a6aff'); if ((p.t >> 3) % 2) pxRect(ctx, p.x - 3, p.y - 3, 6, 6, '#bff6ff'); }
function drawShieldP(ctx, p) { for (const [r, c] of [[22, '#c0142a'], [16, '#f4f4f4'], [10, '#c0142a'], [6, '#2a4ad8']]) pxDisc(ctx, p.x, p.y, r, c); pxRect(ctx, p.x - 3, p.y - 3, 6, 6, '#ffffff'); }
function drawHammer(ctx, p) { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.t * .4); pxRect(ctx, -3, 0, 6, 30, '#6a4a2a'); pxRect(ctx, -18, -15, 36, 18, '#9aa0aa'); ctx.restore(); if (p.recall && p.t % 2) fxBurst(p.x, p.y, '#aef6ff', 1, 3, 8); }
function drawEgg(ctx, p) {
  if (p.kind === 'dino') { const d = Math.sign(p.vx) || 1, b = (p.t >> 2) % 2 * 3; pxRect(ctx, p.x - 18, p.y - 24 + b, 30, 21, '#4fbf3a'); pxRect(ctx, p.x + d * 9, p.y - 33 + b, 18, 15, '#4fbf3a'); pxRect(ctx, p.x + d * 18, p.y - 27 + b, 4, 4, '#111'); pxRect(ctx, p.x - d * 24, p.y - 15, 12, 6, '#4fbf3a'); return; }
  pxDisc(ctx, p.x, p.y - 12, 14, '#f4f0e0'); pxRect(ctx, p.x - 6, p.y - 18, 5, 5, '#4fbf3a'); pxRect(ctx, p.x + 3, p.y - 9, 4, 4, '#4fbf3a'); if (p.t > 45 && p.t % 6 < 3) pxRect(ctx, p.x - 2, p.y - 26, 3, 9, '#15151a');
}
function drawRings(ctx, p) { ctx.strokeStyle = '#b06cff'; ctx.lineWidth = 5; for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(p.x - Math.sign(p.vx) * k * 14, p.y, p.r * (1 - k * .2), -1, 1, p.vx < 0); ctx.stroke(); } }
function drawCard(ctx, p) { pxRect(ctx, p.x - 9, p.y - 12, 18, 24, '#ffffff'); pxRect(ctx, p.x - 3, p.y - 3, 6, 6, '#d8263a'); }
function drawMoonRock(ctx, p) { pxDisc(ctx, p.x, p.y, p.r, '#9aa0aa'); pxRect(ctx, p.x - 6, p.y - 6, 6, 6, '#6d717a'); pxRect(ctx, p.x + 3, p.y + 3, 4, 4, '#6d717a'); }
function drawBubble(ctx, p) { ctx.strokeStyle = '#aef6ff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.stroke(); pxRect(ctx, p.x - p.r * .5, p.y - p.r * .5, 6, 6, '#ffffff'); }
function drawSat(ctx, p) {
  if (p.t < 60) { ctx.strokeStyle = (p.t >> 2) % 2 ? '#ff3b3b' : '#ffffff'; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(p.x, p.y + 20, 50, 12, 0, 0, 7); ctx.stroke(); return; }
  ctx.fillStyle = 'rgba(255,90,90,.6)'; ctx.fillRect(p.x - 40, p.y - 1200, 80, 1220); ctx.fillStyle = '#ffffff'; ctx.fillRect(p.x - 12, p.y - 1200, 24, 1220);
}
function drawCandy(ctx, p) { pxDisc(ctx, p.x, p.y, 10, '#ff5a9a'); pxRect(ctx, p.x - 18, p.y - 4, 8, 8, '#ffd23f'); pxRect(ctx, p.x + 10, p.y - 4, 8, 8, '#ffd23f'); pxRect(ctx, p.x - 3, p.y - 3, 4, 4, '#ffffff'); }
function drawYarn(ctx, p) { pxDisc(ctx, p.x, p.y, p.r, '#c05ab0'); ctx.strokeStyle = '#8a2a7a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * .6, p.t * .3, p.t * .3 + 4); ctx.stroke(); }
function drawKunai(ctx, p) { const d = Math.sign(p.vx) || 1; pxRect(ctx, p.x - d * 12, p.y - 2, 18, 4, '#9aa0aa'); pxRect(ctx, p.x + d * 6, p.y - 3, 6, 6, '#3bf0ff'); if (p.kind === 'marker') pxDisc(ctx, p.x, p.y, 16, 'rgba(59,240,255,.3)'); }
function drawEggBomb(ctx, p) { if (p.boom) { pxDisc(ctx, p.x, p.y, p.r * (1 - p.life / 8), '#ffd23f'); return; } pxDisc(ctx, p.x, p.y, 11, '#f4f0e0'); pxRect(ctx, p.x - 2, p.y - 16, 3, 6, '#ff5a3b'); }
function drawSlime(ctx, p) { pxDisc(ctx, p.x, p.y, p.r, '#6ad84a'); pxRect(ctx, p.x - 5, p.y - 6, 5, 5, '#c8ffb0'); }
function drawInkBlot(ctx, p) { pxDisc(ctx, p.x, p.y, p.r, '#15151a'); pxDisc(ctx, p.x - Math.sign(p.vx) * 10, p.y + 4, 6, '#15151a'); pxRect(ctx, p.x - 4, p.y - 6, 5, 5, '#3a5aff'); }
function drawInkPlat(ctx, p) { // paper strip with a wobbly ink line; blinks before it fades
  if (p.life < 50 && p.t % 6 < 3) return;
  pxRect(ctx, p.x1, p.y - 4, p.x2 - p.x1, 12, '#f4f0e0');
  ctx.strokeStyle = '#15151a'; ctx.lineWidth = 3; ctx.beginPath();
  for (let x = p.x1; x <= p.x2; x += 14) { const y = p.y + Math.sin(x * .3 + p.x) * 2; x === p.x1 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke();
  for (let x = p.x1 + 8; x < p.x2; x += 18) pxRect(ctx, x, p.y + 4, 8, 2, '#3a5aff');
}
function drawPuddle(ctx, p) { ctx.fillStyle = '#4fbf3a'; ctx.globalAlpha = p.inert ? .5 : .85; ctx.beginPath(); ctx.ellipse(p.x, p.y + 6, 46, 10, 0, 0, 7); ctx.fill(); ctx.globalAlpha = 1; for (let i = 0; i < 3; i++) pxRect(ctx, p.x - 30 + i * 24, p.y - 3 - ((p.t + i * 7) % 20 < 3 ? 6 : 0), 6, 6, '#c8ffb0'); }
function drawBox(ctx, p) { const open = p.t >= p.arm; pxRect(ctx, p.x - 21, p.y - 30, 42, 36, open ? '#7a2ab0' : '#4a1a70'); pxRect(ctx, p.x - 21, p.y - 30, 42, 6, '#f2c14e'); text('?', p.x, p.y - 10, 14, '#ffd23f', 'center', null); if (p.bite) fxBurst(p.x, p.y - 30, RAINBOW[p.t % 6], 3, 6, 16); }

function boomSmall(p) { if (p.boom) return; Object.assign(p, { boom: 1, inert: false, r: 55, life: 8, dmg: 8, b: 6, g: .35, ang: 60, away: 1, stopped: true }); SFX.play('boom'); fxBurst(p.x, p.y, '#ffd23f', 18, 9); shakeCam(8); }
const owned = (f, kind) => projectiles.find(p => p.owner === f.i && p.kind === kind && p.life > 0);
const foeOf = f => fighters[1 - f.i];

// ================= extra weapons =================
Object.assign(WEAPONS, {
  shield(g, A) { const m = add(A.el, { x: (A.h.x - A.el.x) * .5, y: (A.h.y - A.el.y) * .5 }); for (const [r, c] of [[6.5, '#c0142a'], [5, '#f4f4f4'], [3.5, '#c0142a'], [2, '#2a4ad8']]) oval(g, m.x, m.y, r * .55, r, c); },
  hammer(g, A, p, L, f) {
    if (f && owned(f, 'hammer')) return;
    const d = dirv(A.ang + 70, 1), n = { x: d.y, y: -d.x }, top = add(A.h, { x: d.x * 7, y: d.y * 7 });
    limb(g, add(A.h, { x: -d.x * 2, y: -d.y * 2 }), top, 1.5, '#6a4a2a');
    limb(g, add(top, { x: n.x * 3.5, y: n.y * 3.5 }), add(top, { x: -n.x * 3.5, y: -n.y * 3.5 }), 4.5, '#9aa0aa');
  },
  wand(g, A) { const d = dirv(A.ang, 1), t = add(A.h, { x: d.x * 8, y: d.y * 8 }); limb(g, A.h, t, 1.3, '#15151a'); box(g, t.x - .8, t.y - .8, 1.6, 1.6, '#ffffff'); },
  cane(g, A) { const d = dirv(A.ang + 150, 1), t = add(A.h, { x: d.x * 10, y: d.y * 10 }); limb(g, add(A.h, { x: -d.x * 1, y: -d.y * 1 }), t, 1.4, '#6a4a2a'); limb(g, A.h, add(A.h, { x: 2, y: -1.5 }), 1.4, '#6a4a2a'); },
  lance(g, A) { const d = dirv(A.ang + (A.ang < 60 ? 45 : 0), 1), n = { x: d.y, y: -d.x }, t = add(A.h, { x: d.x * 20, y: d.y * 20 }); poly(g, [[A.h.x + n.x * 2.5, A.h.y + n.y * 2.5], [t.x, t.y], [A.h.x - n.x * 2.5, A.h.y - n.y * 2.5]], '#c8ccd8'); limb(g, add(A.h, { x: -d.x * 3, y: -d.y * 3 }), A.h, 1.5, '#8a5a2e'); },
  tanto(g, A, p) { drawKatana(g, A, p, { bladeLen: 10, blade: '#9aa0aa', edge: '#3bf0ff', guard: '#15151a' }); },
});
function jerseyNum(g, J, col, n) { const c = { x: (J.hip.x + J.neck.x) / 2 + 1, y: (J.hip.y + J.neck.y) / 2 - 1 }; if (n === 7) { box(g, c.x - 1.5, c.y - 2, 3, .9, col); limb(g, { x: c.x + 1.3, y: c.y - 1.5 }, { x: c.x - .5, y: c.y + 2.5 }, .9, col); } else { box(g, c.x - 1.5, c.y - 2, 1, 4.5, col); box(g, c.x - 1.5, c.y + 1.5, 3, 1, col); box(g, c.x + .5, c.y - .5, 1, 3, col); box(g, c.x - 1.5, c.y - .5, 3, 1, col); } }

// ================= roster =================
CHARS.push(
  { // ---------- RONALDO ----------
    id: 'ronaldo', name: 'RONALDO', title: 'CR7', series: 'SPORTS', color: '#d8263a', fx: '#ffd23f',
    desc: 'Explosive striker. Power shots, dribbles, bicycle kicks.', stats: { speed: 5, power: 4, weight: 3, jump: 5 },
    ...phys({ walk: 6.8, air: 5.8, jump: 17.5, djump: 15, weight: 98 }), pw: 1.05, rc: 1.05, sp: .9, poses: KICKS,
    specials: ['Power Shot', 'Stepover Dribble', 'Bicycle Kick', 'Knuckleball'],
    draw: look({ skin: TAN, top: '#d8263a', sleeve: '#d8263a', fore: TAN, legs: '#1f7a3a', shin: '#d8263a', boots: '#f2c14e',
      torso(g, J) { jerseyNum(g, J, '#ffffff', 7); },
      head(g, h) { dome(g, h, '#2a1a10', .95); poly(g, P2(h, [[-1, -5], [3, -9], [5, -5]]), '#2a1a10'); box(g, h.x + 3, h.y + 3.2, 2, .8, '#fff'); } }),
    specials_: {
      n: mShot({ s: 10, e: 16, p: ['kickW', 'kick'], sfx: 'throw', y: -30, vx: 14, vy: -3, grav: .45, r: 16, life: 90, dmg: 8, b: 5, g: .35, ang: 35, onGround: 'bounce', draw: drawSoccer }),
      s: { dur: 34, p: ['dash', 'kick'], dmg: 9, b: 6, g: .4, ang: 40,
        hbAt: (f, t) => t > 16 && t <= 22 ? [[50, -40, 32]] : null,
        tick(f, t) { if (t >= 4 && t <= 20) { f.vx = f.face * 10; if (t < 12) f.intang = true; if (t % 3 === 0) fxBurst(f.x + f.face * 30, f.y - 8, '#ffffff', 1, 1, 8); } },
        pose: (f, t) => t < 16 ? { ...runPose(t * .8, 1) } : POSES.kick },
      u: { dur: 36, helpless: 1, dmg: 10, b: 6, g: .45, ang: 30, grav: .6,
        hbAt: (f, t) => t >= 10 && t <= 18 ? [[25, -125, 36]] : null,
        tick(f, t, inp) { if (t === 5) { f.vy = -18; f.ground = null; SFX.play('jump'); } if (t > 5) f.vx = inp.x * 4; },
        pose: (f, t) => t < 5 ? POSES.crouch : { ...POSES.uair, rot: t < 22 ? -(t - 5) * 20 : 0 } },
      d: { s: 22, a: 0, e: 16, p: ['kickW', 'kick'], tick(f, t) {
        if (t < 22 && t % 3 === 0) fxBurst(f.x + f.face * 20, f.y - 10, '#ffd23f', 1, 2, 10);
        if (t === 22) { SFX.play('throw'); proj(f, { kind: 'knuckle', y: -30, vx: 11, vy: -6, r: 16, life: 80, dmg: 13, b: 6, g: .45, ang: 40, draw: drawSoccer, tick(p) { p.vy += Math.sin(p.t * .5) * .9 + .12; } }); }
      } },
    },
  },
  { // ---------- LEBRON ----------
    id: 'lebron', name: 'LEBRON', title: 'The King', series: 'SPORTS', color: '#f2c14e', fx: '#5a2d8a',
    desc: 'Huge, fast and strong. Tomahawk dunks and chase-down blocks.', stats: { speed: 4, power: 5, weight: 5, jump: 5 },
    ...phys({ walk: 6.2, air: 5.4, jump: 17.5, djump: 14.5, weight: 125, hh: 110 }), body: { ...HUMAN, thigh: 8.5, shin: 8.5, torso: 13 }, pw: 1.2, rc: 1.15, sp: 1,
    specials: ['Chest Pass', 'Euro Step', 'Tomahawk Dunk', 'Chase-Down Block'],
    draw: look({ skin: '#6b4428', top: '#f2c14e', sleeve: '#6b4428', legs: '#5a2d8a', shin: '#6b4428', boots: '#f4f4f4', sash: '#5a2d8a', sashW: 1.5,
      torso(g, J) { jerseyNum(g, J, '#5a2d8a', 6); },
      head(g, h) { dome(g, h, '#15151a', .9); limb(g, { x: h.x - 4.5, y: h.y - 3.2 }, { x: h.x + 4.5, y: h.y - 3.5 }, 1.6, '#ffffff'); oval(g, h.x + 2, h.y + 4, 3.5, 1.8, '#15151a'); } }),
    specials_: {
      n: mShot({ s: 8, e: 14, p: ['jabW', 'bazooka'], sfx: 'throw', vx: 16, r: 16, life: 40, dmg: 7, b: 5, g: .3, ang: 30, grav: .1, onGround: 'bounce', draw: drawBasket }),
      s: { dur: 36, dmg: 10, b: 7, g: .45, ang: 35,
        hbAt: (f, t) => t > 22 && t <= 26 ? [[45, -62, 34]] : null,
        tick(f, t) { if ((t >= 3 && t <= 10) || (t >= 14 && t <= 21)) { f.vx = f.face * 12; fxBurst(f.x, f.y - 5, '#ffffff', 1, 1, 8); } if (t <= 10 && t >= 3) f.intang = true; },
        pose: (f, t) => t < 22 ? { ...POSES.dash, tl: 20, x: t < 12 ? -2 : 2 } : POSES.fsmash },
      u: { dur: 999, helpless: 1, dmg: 12, b: 5, g: .35, ang: -70,
        hbAt: (f, t) => t > 20 && f.vy > 10 ? [[25, -20, 36]] : null,
        tick(f, t) { if (t === 5) { f.vy = -19.5; f.ground = null; SFX.play('jump'); } if (t > 20 && !f.ground && f.vy > -2) f.vy = 20; if (f.t > 120) return 'end'; },
        onLand(f) { if (f.mt > 20) { SFX.play('rock'); shakeCam(12); fxBurst(f.x, f.y, '#e8782a', 14, 7); } return false; },
        pose: (f, t) => t < 5 ? POSES.crouch : t < 20 ? POSES.usmash : POSES.dair },
      d: { s: 3, a: 20, e: 14, hb: [[20, -118, 46]], dmg: 9, b: 7, g: .45, ang: 85, p: ['crouch', 'utilt'],
        tick(f, t) { if (t === 3) { f.vy = -9; f.ground = null; SFX.play('jump'); } f.reflect = t > 3 && t <= 23; } },
    },
  },
  { // ---------- IRON MAN ----------
    id: 'ironman', name: 'IRON MAN', title: 'Genius in a Suit', series: 'MARVEL', color: '#c0142a', fx: '#bff6ff',
    desc: 'Repulsors, a chest Unibeam, missiles and full flight.', stats: { speed: 3, power: 4, weight: 4, jump: 3 },
    ...phys({ walk: 5.2, weight: 112 }), pw: 1.1, rc: 1, sp: 1,
    specials: ['Repulsor Blast', 'Unibeam', 'Boot Thrusters', 'Micro-Missiles'],
    draw: look({ skin: '#f2c14e', eye: null, top: '#c0142a', sleeve: '#c0142a', fore: '#f2c14e', hand: '#c0142a', legs: '#c0142a', shin: '#f2c14e', boots: '#c0142a',
      torso(g, J) { const c = { x: (J.hip.x + J.neck.x) / 2 + 1.5, y: (J.hip.y + J.neck.y) / 2 - 1.5 }; oval(g, c.x, c.y, 1.8, 1.8, '#bff6ff'); oval(g, c.x, c.y, .8, .8, '#ffffff'); },
      head(g, h) { dome(g, h, '#c0142a', 1.02); poly(g, P2(h, [[.5, -3.5], [5.2, -2.5], [5, 4], [1.5, 5]]), '#f2c14e'); box(g, h.x + 2, h.y - 1, 3, 1, '#bff6ff'); } }),
    specials_: {
      n: mShot({ s: 6, e: 12, p: ['castW', 'cast'], sfx: 'laser', vx: 22, r: 12, life: 30, dmg: 5, b: 4, g: .15, ang: 30, draw: beamDraw('#bff6ff') }),
      s: { s: 16, a: 30, e: 18, multi: 5, grav: .2, dmg: 2, b: 4, g: .05, ang: 20, p: ['counter', 'cast'],
        hb: [[60, -70, 30], [140, -70, 30], [220, -70, 30], [300, -70, 30]],
        tick(f, t) { if (t < 16 && t % 2) fxBurst(f.x + f.face * 10, f.y - 70, '#bff6ff', 1, 2, 10); if (t === 17) SFX.play('laser', .3); },
        drawFx(f, t) { if (t <= 16 || t > 46) return; const h = 34 + Math.sin(T) * 6, x0 = f.x + f.face * 15; ctx.fillStyle = '#6ab0ff'; ctx.fillRect(Math.min(x0, x0 + f.face * 340), f.y - 70 - h / 2, 340, h); ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.min(x0, x0 + f.face * 340), f.y - 70 - h / 5, 340, h / 2.5); } },
      u: { dur: 70, helpless: 1, grav: 0, multi: 8, dmg: 2, b: 3, g: 0, ang: -80, p: ['jump', 'fall'],
        hbAt: (f, t) => t > 5 && t <= 60 ? [[0, 10, 24]] : null,
        tick(f, t, inp) { if (t > 5 && t <= 60) { const d = stickDir(inp); f.vx += (d.x * 11 - f.vx) * .2; f.vy += (d.y * 11 - f.vy) * .2; f.ground = null; f.jet = true; fxBurst(f.x, f.y, t % 2 ? '#ffb13b' : '#bff6ff', 1, 2, 12); } else if (t > 60) f.vy += .6; } },
      d: { s: 10, a: 0, e: 18, p: ['counter', 'victory'], tick(f, t) {
        if (t !== 10) return; SFX.play('laser', .7);
        for (let k = -1; k <= 1; k++) spawn({ owner: f.i, kind: 'missile', x: f.x, y: f.y - 90, vx: k * 4, vy: -9, r: 12, life: 90, dmg: 5, b: 4, g: .2, ang: 60, draw: drawMissile,
          tick(p) { if (p.t < 12) return; const t = foeOf(fighters[p.owner]), a = Math.atan2(t.y - 55 - p.y, t.x - p.x); p.vx += (Math.cos(a) * 12 - p.vx) * .12; p.vy += (Math.sin(a) * 12 - p.vy) * .12; if (p.t % 2) fxBurst(p.x, p.y, '#c8ccd8', 1, 1, 10); } });
      } },
    },
  },
  { // ---------- SPIDER-MAN ----------
    id: 'spiderman', name: 'SPIDER-MAN', title: 'Friendly Neighborhood', series: 'MARVEL', color: '#d8263a', fx: '#ffffff',
    desc: 'Webs slow you down. Spider-Sense dodges the next hit.', stats: { speed: 5, power: 3, weight: 2, jump: 5 },
    ...phys({ walk: 6.8, air: 6, jump: 17.5, djump: 15.5, weight: 88 }), pw: .95, rc: 1, sp: .85,
    specials: ['Web Shot', 'Web Zip', 'Web Swing', 'Spider-Sense'],
    draw: look({ skin: '#d8263a', eye: null, top: '#d8263a', sleeve: '#2a4ad8', fore: '#d8263a', hand: '#d8263a', legs: '#2a4ad8', shin: '#d8263a', boots: '#d8263a',
      torso(g, J) { const c = { x: (J.hip.x + J.neck.x) / 2 + 1, y: (J.hip.y + J.neck.y) / 2 - 2 }; box(g, c.x - .7, c.y - 1.5, 1.4, 3, '#15151a'); limb(g, { x: c.x - 2, y: c.y - 2 }, { x: c.x + 2, y: c.y + 2 }, .5, '#15151a'); limb(g, { x: c.x + 2, y: c.y - 2 }, { x: c.x - 2, y: c.y + 2 }, .5, '#15151a'); },
      head(g, h) { oval(g, h.x + .5, h.y, 5.3, 5.5, '#d8263a'); poly(g, P2(h, [[1, -2.5], [5, -2], [4.5, 1], [1.5, .5]]), '#ffffff'); limb(g, { x: h.x + 1, y: h.y - 2.5 }, { x: h.x + 5, y: h.y - 2 }, .6, '#15151a'); limb(g, { x: h.x - 3, y: h.y - 4 }, { x: h.x - 2, y: h.y + 4 }, .4, '#8a1420'); } }),
    specials_: {
      n: mShot({ s: 8, e: 12, sfx: 'throw', vx: 15, r: 14, life: 40, dmg: 3, b: 1, g: 0, ang: 0, slow: 120, draw: drawWeb }),
      s: { s: 6, a: 0, e: 18, p: ['castW', 'cast'], tick(f, t) {
        if (t !== 6) return; SFX.play('throw');
        proj(f, { kind: 'zip', vx: 26, r: 16, life: 16, dmg: 4, b: 0, g: 0, ang: 0, refl: false, draw: drawZip,
          tick(p) { if (p.life <= 1 && !p.inert) { const o = fighters[p.owner]; o.vx = Math.sign(p.vx) * 16; o.vy = -4; o.ground = null; } },
          onHit(p, foe) { foe.vx = -Math.sign(p.vx) * 13; foe.vy = -4; foe.ground = null; setAct(foe, 'hurt'); foe.stun = 24; p.life = 0; } });
      } },
      u: { dur: 36, helpless: 1, grav: 0, dmg: 5, b: 5, g: .2, ang: 60, p: ['ledge', 'fall'],
        hbAt: (f, t) => t > 4 && t < 30 ? [[0, 0, 28]] : null,
        tick(f, t) {
          if (t === 4) { f.anchor = { x: f.x + f.face * 120, y: f.y - 300 }; SFX.play('throw'); }
          if (t > 4 && t <= 30) { const k = (t - 4) / 26; f.vx = f.face * (5 + Math.sin(k * Math.PI) * 9); f.vy = -13 + 9 * k; f.ground = null; }
          if (t > 30) f.vy += .6;
        },
        drawFx(f, t) { if (!f.anchor || t > 30) return; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(f.x, f.y - 100); ctx.lineTo(f.anchor.x, f.anchor.y); ctx.stroke(); } },
      d: { s: 4, a: 0, e: 10, p: ['counter', 'counter'], tick(f, t) { if (t === 4) { f.dodgeNext = 180; SFX.play('counter'); popText(f.x, f.y - 140, 'SPIDER-SENSE', '#ffffff'); } } },
    },
  },
  { // ---------- BATMAN ----------
    id: 'batman', name: 'BATMAN', title: 'The Dark Knight', series: 'DC', color: '#3a3d48', fx: '#ffd23f',
    desc: 'Gadgets: remote explosive gel, smoke stealth, cape glide.', stats: { speed: 3, power: 4, weight: 4, jump: 3 },
    ...phys({ walk: 5.4, weight: 110 }), pw: 1.1, rc: 1.05, sp: 1,
    specials: ['Batarang', 'Explosive Gel', 'Grapple & Glide', 'Smoke Bomb'],
    draw: look({ skin: SKIN, eye: null, top: '#3a3d48', sash: '#f2c14e', sashW: 2, sleeve: '#3a3d48', fore: '#15151a', hand: '#15151a', legs: '#3a3d48', shin: '#15151a', boots: '#15151a',
      cape: { col: '#15151a', len: 24 },
      torso(g, J) { const c = { x: (J.hip.x + J.neck.x) / 2 + 1, y: (J.hip.y + J.neck.y) / 2 - 2.5 }; poly(g, [[c.x - 3, c.y], [c.x - 1, c.y - 1.2], [c.x, c.y - .3], [c.x + 1, c.y - 1.2], [c.x + 3, c.y], [c.x, c.y + 1.2]], '#15151a'); },
      head(g, h) { dome(g, h, '#15151a', 1.05); oval(g, h.x + 1, h.y - 1.5, 4.2, 2.8, '#15151a'); poly(g, P2(h, [[-3, -3], [-2.5, -9], [-1, -3.5]]), '#15151a'); poly(g, P2(h, [[1, -3.5], [2, -9], [3, -3.5]]), '#15151a'); box(g, h.x + 2.5, h.y - 1.2, 2, .9, '#ffffff'); } }),
    specials_: {
      n: mShot({ s: 8, e: 14, sfx: 'throw', vx: 13, r: 14, life: 70, dmg: 5, b: 4, g: .15, ang: 40, kind: 'batarang', draw: drawBatarang,
        tick(p) { const o = fighters[p.owner]; if (p.t > 22 || p.back) { const a = Math.atan2(o.y - 60 - p.y, o.x - p.x); p.vx = Math.cos(a) * 14; p.vy = Math.sin(a) * 14; if (Math.hypot(o.x - p.x, o.y - 60 - p.y) < 40) p.life = 0; } },
        onHit(p) { p.back = 1; } }),
      s: { ...mShot({ s: 8, e: 14, sfx: 'grab', kind: 'gel', vx: 10, vy: -4, grav: .4, r: 14, life: 900, dmg: 1, b: 0, g: 0, ang: 0, refl: false, onGround: 'stop', draw: drawGel,
        tick(p) { if (p.stuck) { p.x = p.stuck.x; p.y = p.stuck.y - 50; } }, onHit(p, foe) { p.stuck = foe; } }),
        alt(f) { const g = owned(f, 'gel'); if (!g || g.boom) return false; explodeMine(g); return true; } },
      u: { dur: 30, airUses: 1, p: ['ledge', 'fall'], dmg: 5, b: 5, g: .2, ang: 80, hbAt: (f, t) => t > 5 && t < 14 ? [[0, -110, 30]] : null,
        tick(f, t) { if (t === 5) { f.vy = -20; f.ground = null; SFX.play('grab'); } if (t === 29) f.glide = true; } },
      d: { s: 6, a: 0, e: 10, p: ['stomp', 'crouch'], tick(f, t) { if (t === 6) { f.stealth = 70; SFX.play('shadow'); fxBurst(f.x, f.y - 50, '#8a8ea8', 30, 6, 30); } } },
    },
  },
  { // ---------- CAPTAIN AMERICA ----------
    id: 'cap', name: 'CAPTAIN AMERICA', title: 'First Avenger', series: 'MARVEL', color: '#2a4ad8', fx: '#f4f4f4',
    desc: 'Ricochet shield throws and a frontal shield block.', stats: { speed: 4, power: 4, weight: 4, jump: 3 },
    ...phys({ walk: 5.8, weight: 110 }), pw: 1.1, rc: 1.05, sp: .95,
    specials: ['Shield Throw', 'Shield Charge', 'Leap of Faith', 'Shield Block'],
    draw: look({ skin: SKIN, top: '#2a4ad8', sleeve: '#2a4ad8', hand: '#c0142a', legs: '#2a4ad8', boots: '#c0142a', weapon2: 'shield',
      torso(g, J) { const c = { x: (J.hip.x + J.neck.x) / 2 + 1, y: (J.hip.y + J.neck.y) / 2 - 2 }; poly(g, [[c.x, c.y - 2.2], [c.x + .7, c.y - .5], [c.x + 2.2, c.y - .5], [c.x + 1, c.y + .5], [c.x + 1.5, c.y + 2.2], [c.x, c.y + 1.2], [c.x - 1.5, c.y + 2.2], [c.x - 1, c.y + .5], [c.x - 2.2, c.y - .5], [c.x - .7, c.y - .5]], '#ffffff'); for (let k = 0; k < 3; k++) box(g, J.hip.x - 3.5, J.hip.y - 1 - k * 1.3, 7.5, .7, k % 2 ? '#ffffff' : '#c0142a'); },
      head(g, h) { oval(g, h.x - .3, h.y - 1.8, 5.3, 4.2, '#2a4ad8'); box(g, h.x - .5, h.y - 4.5, 1.5, 2, '#ffffff'); poly(g, P2(h, [[-2, -2], [-5, -4], [-4, -1]]), '#ffffff'); } }),
    specials_: {
      n: mShot({ s: 10, e: 14, sfx: 'throw', kind: 'shield', vx: 14, r: 20, life: 70, dmg: 7, b: 5, g: .25, ang: 40, draw: drawShieldP,
        tick(p) { if (p.t === 25 && !p.back) { p.vx = -p.vx; p.back = 1; } const o = fighters[p.owner]; if (p.back && Math.abs(o.x - p.x) < 40) p.life = 0; },
        onHit(p) { if (!p.back) { p.vx = -p.vx; p.back = 1; } } }),
      s: { ...mDash({ spd: 12, a: 18, dmg: 11, b: 6, g: .45, ang: 38 }), armorDash: 1 },
      u: mRise({ vy: -20, spin: 0, dmg: 9, fin: 9, pose: 'usmash', col: '#ffffff' }),
      d: { s: 2, a: 36, e: 10, p: ['shield', 'shield'], tick(f, t) { const on = t > 2 && t <= 38; f.blockFront = on; f.reflect = on; } },
    },
  },
  { // ---------- THOR ----------
    id: 'thor', name: 'THOR', title: 'God of Thunder', series: 'MARVEL', color: '#9aa0aa', fx: '#aef6ff',
    desc: 'Throw Mjolnir, then press B again to recall it through enemies.', stats: { speed: 3, power: 5, weight: 5, jump: 3 },
    ...phys({ walk: 5.2, weight: 128, hh: 116 }), body: { ...HUMAN, thigh: 7.5, shin: 7.5, torso: 13 }, pw: 1.25, rc: 1.1, sp: 1.05,
    specials: ['Mjolnir (B again: recall)', 'Hammer Flight', 'Bifrost', 'Thunderclap'],
    draw: look({ skin: SKIN, top: '#5a5f6a', sleeve: '#2a2a3a', fore: SKIN, legs: '#2a2a3a', boots: '#15151a', cape: { col: '#c0142a', len: 22 }, weapon: 'hammer', torsoW: 9,
      torso(g, J) { const c = { x: (J.hip.x + J.neck.x) / 2, y: (J.hip.y + J.neck.y) / 2 - 1 }; for (let k = -1; k < 2; k++) oval(g, c.x + 1 + k * .5, c.y + k * 3, 1.2, 1.2, '#c8ccd8'); },
      back(g, h) { poly(g, P2(h, [[-5, -3], [1, -5], [-2, 2], [-3, 10], [-9, 9], [-7, 1]]), '#e8c860'); },
      head(g, h) { dome(g, h, '#e8c860'); oval(g, h.x + 2.5, h.y + 3.5, 3.2, 2, '#c8a040'); } }),
    specials_: {
      n: { ...mShot({ s: 10, e: 14, sfx: 'throw', kind: 'hammer', vx: 13, r: 18, life: 600, dmg: 9, b: 6, g: .4, ang: 40, refl: false, draw: drawHammer,
        tick(p) {
          const o = fighters[p.owner];
          if (!p.recall) { p.vx *= .95; return; }
          const a = Math.atan2(o.y - 60 - p.y, o.x - p.x); p.vx = Math.cos(a) * 20; p.vy = Math.sin(a) * 20;
          if (Math.hypot(o.x - p.x, o.y - 60 - p.y) < 40) { p.life = 0; SFX.play('grab'); }
        },
        onHit() {} }),
        alt(f) { const h = owned(f, 'hammer'); if (!h) return false; if (!h.recall) { h.recall = 1; h.inert = false; SFX.play('zap'); } return true; } },
      s: { dur: 32, grav: 0, dmg: 10, b: 6, g: .4, ang: 40, p: ['dash', 'dash'],
        hbAt: (f, t) => t > 4 && t <= 22 ? [[20, -55, 40]] : null,
        tick(f, t, inp) { if (t === 4) { f.fdir = stickDir(inp, f.face, 0); SFX.play('zap'); } if (t > 4 && t <= 22) { f.vx = f.fdir.x * 14; f.vy = f.fdir.y * 14; if (f.fdir.y < 0) f.ground = null; fxBurst(f.x, f.y - 55, '#aef6ff', 2, 3, 10); } if (t > 22) f.vy += .5; },
        pose: (f, t) => ({ ...POSES.spin, rot: t > 4 && t <= 22 ? t * 40 : 0 }) },
      u: { dur: 40, helpless: 1, grav: 0, dmg: 8, b: 6, g: .35, ang: 85, p: ['victory', 'victory'],
        hbAt: (f, t) => t >= 8 && t <= 20 ? [[0, -60, 40]] : null,
        tick(f, t, inp) { if (t === 8) { f.vy = -24; f.ground = null; SFX.play('zap'); } if (t > 8) { f.vy += 1; f.vx = inp.x * 4; } if (t >= 8 && t < 26) fxBurst(f.x, f.y + 20, RAINBOW[t % 6], 2, 2, 20); },
        drawFx(f, t) { if (t < 8 || t > 26) return; ctx.globalAlpha = .35; for (let k = 0; k < 6; k++) { ctx.fillStyle = RAINBOW[k]; ctx.fillRect(f.x - 36 + k * 12, f.y - 900, 12, 1000); } ctx.globalAlpha = 1; } },
      d: { s: 16, a: 0, e: 20, p: ['usmashW', 'stomp'], tick(f, t) {
        if (t !== 16) return;
        SFX.play('zap'); SFX.play('boom'); shakeCam(12); fxRing(f.x, f.y - 30, '#aef6ff', 160); fxBurst(f.x, f.y - 20, '#fff04a', 20, 12);
        const foe = foeOf(f); if (canBeHit(foe) && Math.hypot(foe.x - f.x, foe.y - f.y) < 200) applyHit(f, foe, { dmg: 10, b: 7, g: .35, ang: 60 }, Math.sign(foe.x - f.x) || f.face, foe.x, foe.y - 50);
      } },
    },
  },
  { // ---------- KAIJU KID (original) ----------
    id: 'kaiju', name: 'KAIJU KID', title: 'Tiny Terror', color: '#4fbf3a', fx: '#ffd23f',
    desc: 'A kid in a dino suit. Breathes fire and hatches baby dinos.', stats: { speed: 2, power: 4, weight: 4, jump: 2 },
    ...phys({ walk: 4.8, jump: 15, weight: 118, hh: 96 }), body: { thigh: 5, shin: 5, torso: 11, upper: 5, fore: 5, head: 6, cy: 16 }, pw: 1.15, rc: 1, sp: 1.05,
    specials: ['Atomic Breath', 'Tail Whip', 'Rocket Roar', 'Dino Egg'],
    draw: look({ skin: SKIN, top: '#4fbf3a', sleeve: '#4fbf3a', hand: '#4fbf3a', legs: '#4fbf3a', boots: '#3a9a2a', torsoW: 11, legW: 5, armW: 4.5,
      behind(g, J) {}, back(g, h, f, J) {
        const hip = J.hip; poly(g, [[hip.x - 2, hip.y - 2], [hip.x - 16, hip.y + 6 + Math.sin(T * .15) * 2], [hip.x - 3, hip.y + 3]], '#4fbf3a');
        for (let k = 0; k < 4; k++) { const p = { x: J.neck.x + (hip.x - J.neck.x) * k / 4 - 4, y: J.neck.y + (hip.y - J.neck.y) * k / 4 }; poly(g, [[p.x, p.y - 2], [p.x - 4, p.y], [p.x, p.y + 2]], '#ffd23f'); }
      },
      torso(g, J) { const c = { x: (J.hip.x + J.neck.x) / 2 + 2, y: (J.hip.y + J.neck.y) / 2 }; oval(g, c.x, c.y, 3, 5, '#c8f09a'); },
      head(g, h) { oval(g, h.x - .5, h.y - 1.5, 6.5, 5.5, '#4fbf3a'); oval(g, h.x + 1.5, h.y + 1, 3.5, 3.5, SKIN); box(g, h.x + 2.5, h.y, 1.3, 1.6, '#222'); for (let k = 0; k < 4; k++) poly(g, P2(h, [[k * 1.6 - 1, -2.5], [k * 1.6 - .2, -1], [k * 1.6 + .6, -2.5]]), '#ffffff'); } }),
    specials_: {
      n: { s: 8, a: 30, e: 14, multi: 4, hb: [[70, -55, 34], [110, -55, 30]], dmg: 2, b: 3, g: 0, ang: 20, p: ['castW', 'cast'],
        tick(f, t) { if (t > 8 && t <= 38) { for (let k = 0; k < 2; k++) particles.push({ x: f.x + f.face * 30, y: f.y - 58, vx: f.face * (8 + Math.random() * 6), vy: (Math.random() - .5) * 4, life: 14, max: 14, c: Math.random() < .5 ? '#ff6a1f' : '#ffd23f', sz: PX * 3 }); if (t % 6 === 0) SFX.play('fire'); } } },
      s: { s: 6, a: 8, e: 14, hb: [[-60, -30, 34], [60, -30, 34]], dmg: 10, b: 6, g: .4, ang: 35, away: 1, p: ['spin', 'spin'], pose: (f, t) => ({ ...POSES.spin, rot: t > 6 && t < 16 ? (t - 6) * 36 : 0 }) },
      u: mRise({ vy: -19, spin: 0, dmg: 6, fin: 8, pose: 'jump', col: '#ffd23f', sfx: 'boom' }),
      d: { s: 12, a: 0, e: 14, p: ['stomp', 'crouch'], tick(f, t) {
        if (t !== 12) return; killOwned(f, 'egg'); killOwned(f, 'dino'); SFX.play('grab');
        spawn({ owner: f.i, kind: 'egg', x: f.x - f.face * 20, y: f.y - 20, vy: -2, grav: .5, r: 14, life: 420, inert: true, refl: false, onGround: 'stop', dmg: 6, b: 5, g: .3, ang: 50, draw: drawEgg,
          tick(p) { if (p.t === 60) { const t = foeOf(fighters[p.owner]); Object.assign(p, { kind: 'dino', inert: false, stopped: false, onGround: 'slide', grav: .5, vx: (Math.sign(t.x - p.x) || 1) * 6, r: 24 }); SFX.play('grab'); } } });
      } },
    },
  },
  { // ---------- DJ BASS (original) ----------
    id: 'djbass', name: 'DJ BASS', title: 'Drop the Beat', color: '#b06cff', fx: '#3bf0ff',
    desc: 'Sound waves and scratches. Attacks on the beat hit harder.', stats: { speed: 3, power: 3, weight: 3, jump: 3 },
    ...phys({ walk: 5.6, weight: 96 }), pw: 1, rc: 1, sp: 1,
    specials: ['Sound Wave', 'Record Scratch', 'Speaker Launch', 'Drop the Beat'],
    draw: look({ skin: '#c68a5a', eye: null, top: '#7a2ab0', sleeve: '#7a2ab0', legs: '#1a1a2a', boots: '#f4f4f4',
      torso(g, J) { limb(g, add(J.neck, { x: -1, y: 2 }), add(J.neck, { x: 3, y: 5 }), .8, '#f2c14e'); },
      head(g, h) { dome(g, h, '#15151a', 1.05); box(g, h.x + 1.5, h.y - 1, 4.5, 1.8, '#15151a'); limb(g, { x: h.x - 3.5, y: h.y - 1 }, { x: h.x + 1, y: h.y - 6.5 }, 1.3, '#15151a'); oval(g, h.x - 1.5, h.y + .5, 2.2, 3, '#15151a'); oval(g, h.x - 1.5, h.y + .5, 1.2, 1.8, (T >> 4) % 2 ? '#3bf0ff' : '#ff3bd4'); } }),
    specials_: {
      n: mShot({ s: 8, e: 14, sfx: 'laser', vx: 9, r: 18, life: 45, dmg: 5, b: 6, g: .2, ang: 30, draw: drawRings, tick(p) { p.r = 18 + p.t * 1.2; } }),
      s: { s: 6, a: 4, e: 14, hb: [[0, -55, 70]], dmg: 4, b: 5, g: .1, ang: 30, away: 1, p: ['counter', 'cast'], tick(f, t) {
        if (t !== 7) return; SFX.play('laser', .4); fxRing(f.x, f.y - 55, '#3bf0ff', 200); popText(f.x, f.y - 140, 'SCRATCH!', '#3bf0ff');
        const foe = foeOf(f); if (Math.hypot(foe.x - f.x, foe.y - f.y) < 260) { foe.vx = -foe.vx * 1.2 + Math.sign(foe.x - f.x) * 4; foe.vy = -Math.abs(foe.vy); }
        for (const p of projectiles) if (p.owner !== f.i && p.refl && Math.hypot(p.x - f.x, p.y - f.y) < 260) { p.vx = -p.vx; p.vy = -p.vy; p.owner = f.i; }
      } },
      u: { dur: 26, airUses: 1, p: ['crouch', 'jump'], tick(f, t) {
        if (t !== 4) return; SFX.play('boom'); f.vy = -21; f.ground = null;
        spawn({ owner: f.i, kind: 'speaker', x: f.x, y: f.y - 30, r: 40, life: 40, stopped: true, dmg: 6, b: 8, g: .15, ang: 88, refl: false, draw: (ctx, p) => { pxRect(ctx, p.x - 30, p.y - 30, 60, 60, '#2a2a3a'); pxDisc(ctx, p.x, p.y, 18 + (p.t % 6), '#3bf0ff'); pxDisc(ctx, p.x, p.y, 8, '#15151a'); } });
      } },
      d: { s: 10, a: 0, e: 8, p: ['stomp', 'victory'], tick(f, t) { if (t === 10) { f.beat = 360; SFX.play('go'); popText(f.x, f.y - 140, 'DROP THE BEAT', '#b06cff'); } } },
    },
  },
  { // ---------- MIMI (original) ----------
    id: 'mimi', name: 'MIMI', title: 'The Great Magician', color: '#7a2ab0', fx: '#ffd23f',
    desc: 'Vanishes behind you. Her Mystery Box does something random.', stats: { speed: 3, power: 2, weight: 2, jump: 3 },
    ...phys({ walk: 5.6, weight: 84, grav: .7 }), pw: .95, rc: 1, sp: .95,
    specials: ['Card Fan', 'Vanish', 'Dove Flight', 'Mystery Box'],
    draw: look({ skin: SKIN, top: '#15151a', style: 'suit', top2: '#ffffff', sleeve: '#15151a', hand: '#ffffff', legs: '#15151a', boots: '#15151a', cape: { col: '#7a2ab0', len: 16 }, weapon: 'wand',
      head(g, h) { dome(g, h, '#b06cff'); poly(g, P2(h, [[-5, -2], [-7, 4], [-3, 3]]), '#b06cff'); box(g, h.x - 5, h.y - 5, 10, 1.5, '#15151a'); box(g, h.x - 3.5, h.y - 12, 7, 7.5, '#15151a'); box(g, h.x - 3.5, h.y - 7, 7, 1.3, '#d8263a'); } }),
    specials_: {
      n: mShot({ s: 8, e: 14, sfx: 'throw', fn(f) { for (const vy of [-2, 0, 2]) proj(f, { kind: 'card', vx: 13, vy, r: 10, life: 35, dmg: 3, b: 3, g: .1, ang: 30, draw: drawCard }); } }),
      s: { dur: 30, dmg: 6, b: 5, g: .3, ang: 40, p: ['counter', 'jab'],
        hbAt: (f, t) => t >= 10 && t <= 13 ? [[40, -55, 30]] : null,
        tick(f, t) {
          if (t >= 4 && t < 9) f.intang = true;
          if (t !== 8) return; const foe = foeOf(f);
          fxBurst(f.x, f.y - 50, '#b06cff', 16, 5); SFX.play('shadow');
          if (Math.abs(foe.x - f.x) < 450) { const s = Math.sign(foe.x - f.x) || f.face; teleport(f, foe.x + s * 70, foe.ground ? foe.y : foe.y); f.face = -s; }
          fxBurst(f.x, f.y - 50, '#ffd23f', 16, 5);
        } },
      u: { dur: 40, helpless: 1, grav: .2, p: ['victory', 'victory'], dmg: 3, b: 4, g: .1, ang: 80, hbAt: (f, t) => t > 5 && t < 30 ? [[0, -120, 30]] : null,
        tick(f, t, inp) { if (t > 5 && t < 32) { f.vy = -7.5; f.vx = inp.x * 4; f.ground = null; if (t % 3 === 0) fxBurst(f.x + (Math.random() - .5) * 50, f.y - 120, '#ffffff', 1, 2, 16); } } },
      d: { s: 12, a: 0, e: 14, p: ['stomp', 'stomp'], tick(f, t) {
        if (t !== 12) return; killOwned(f, 'trap'); SFX.play('grab');
        const pick = ['boom', 'spring', 'flower', 'heal'][Math.random() * 4 | 0];
        const P = { boom: { dmg: 12, b: 7, g: .45, ang: 50 }, spring: { dmg: 2, b: 15, g: 0, ang: 90 }, flower: { dmg: 3, b: 2, g: 0, ang: 60, slow: 150 }, heal: { dmg: 1, b: 2, g: 0, ang: 60 } }[pick];
        spawn({ owner: f.i, kind: 'trap', x: f.x + f.face * 40, y: f.y - 10, vy: f.ground ? 0 : 4, grav: .5, r: 34, life: 600, onGround: 'stop', refl: false, inert: true, arm: 25, away: 1, draw: drawBox, ...P,
          tick(p) { if (p.t === p.arm) p.inert = false; },
          onHit(p) { p.bite = 1; p.life = 12; const o = fighters[p.owner]; popText(p.x, p.y - 60, { boom: 'KABOOM!', spring: 'BOING!', flower: 'FLOWERS!', heal: 'MIMI +10%' }[pick], '#ffd23f'); if (pick === 'boom') SFX.play('boom'); if (pick === 'heal') o.dmg = Math.max(0, o.dmg - 10); } });
      } },
    },
  },
  { // ---------- ASTRO (original) ----------
    id: 'astro', name: 'ASTRO', title: 'Space Cadet', color: '#e8ecf4', fx: '#f2a030',
    desc: 'Low-gravity fighter. Traps you in bubbles, calls orbital lasers.', stats: { speed: 3, power: 3, weight: 3, jump: 4 },
    ...phys({ walk: 5.2, air: 5.5, jump: 15, grav: .5, fall: 10, weight: 100 }), pw: 1, rc: 1, sp: 1,
    specials: ['Moon Rock', 'Gravity Bubble', 'Moonwalk', 'Satellite Ping'],
    draw: look({ skin: SKIN, eye: null, top: '#e8ecf4', sleeve: '#e8ecf4', hand: '#9aa0aa', legs: '#e8ecf4', boots: '#9aa0aa', torsoW: 9,
      back(g, h, f, J) { const c = { x: (J.hip.x + J.neck.x) / 2 - 5, y: (J.hip.y + J.neck.y) / 2 }; box(g, c.x - 2.5, c.y - 5, 5, 10, '#c8ccd8'); box(g, c.x - 1.5, c.y - 3, 3, 1.5, '#d8263a'); },
      torso(g, J) { const c = { x: (J.hip.x + J.neck.x) / 2 + 1.5, y: (J.hip.y + J.neck.y) / 2 - 1 }; box(g, c.x - 1.5, c.y - 1.5, 3, 3, '#6d717a'); box(g, c.x - 1, c.y - 1, 1, 1, '#ff3b3b'); box(g, c.x + .3, c.y - 1, 1, 1, '#6dff8a'); },
      head(g, h) { oval(g, h.x, h.y, 6.5, 6.5, '#f4f6ff'); oval(g, h.x + 2, h.y, 4, 4.2, '#f2a030'); box(g, h.x + 2.5, h.y - 2.5, 1.5, 1.5, '#ffffff'); } }),
    specials_: {
      n: mShot({ s: 10, e: 16, sfx: 'throw', vx: 8, vy: -7, grav: .18, r: 16, life: 120, dmg: 8, b: 5, g: .35, ang: 45, onGround: 'break', draw: drawMoonRock }),
      s: mShot({ s: 12, e: 16, sfx: 'ice', vx: 6, r: 26, life: 70, dmg: 3, b: 0, g: 0, ang: 90, bubble: 70, draw: drawBubble }),
      u: { s: 6, a: 0, e: 4, airUses: 1, p: ['crouch', 'jump'], tick(f, t) { if (t === 6) { f.lowGrav = 240; f.jumps = f.ch.jumps + 2; f.vy = -12; f.ground = null; SFX.play('djump'); popText(f.x, f.y - 140, 'ZERO-G', '#f2a030'); } } },
      d: { s: 10, a: 0, e: 12, p: ['counter', 'victory'], tick(f, t) {
        if (t !== 10) return; SFX.play('beep');
        spawn({ owner: f.i, kind: 'sat', x: f.x + f.face * 200, y: f.y - 20, r: 60, life: 75, inert: true, refl: false, stopped: true, dmg: 14, b: 7, g: .45, ang: 85, away: 1, draw: drawSat,
          tick(p) { if (p.t === 60) { p.inert = false; SFX.play('laser', .3); shakeCam(8); } } });
      } },
    },
  },
  { // ---------- GRANNY GIGI (original) ----------
    id: 'granny', name: 'GRANNY GIGI', title: 'Bingo Champion', color: '#f59ab8', fx: '#ffd23f',
    desc: 'Slow but her purse hits like a truck. Floats with an umbrella.', stats: { speed: 1, power: 4, weight: 3, jump: 1 },
    ...phys({ walk: 4.4, air: 4.2, jump: 14, grav: .7, weight: 104, hh: 96 }), body: { ...HUMAN, thigh: 6, shin: 6, torso: 11 }, pw: 1.15, rc: 1.1, sp: 1,
    specials: ['Hard Candy', 'Purse Swing', 'Umbrella', 'Yarn Ball'],
    draw: look({ skin: '#f2d0b8', top: '#f59ab8', sleeve: '#f59ab8', legs: '#f2d0b8', boots: '#6a4a2a', skirt: { col: '#b8a0d8', len: 9 }, weapon: 'cane',
      head(g, h, f) { dome(g, h, '#d8d8e0'); oval(g, h.x - 3, h.y - 6, 2.5, 2.2, '#d8d8e0'); oval(g, h.x + 3.2, h.y - .3, 1.4, 1.4, '#6a6f7a'); box(g, h.x + 3, h.y - .5, .8, .8, '#fff'); if (f.glide) { poly(g, P2(h, [[-10, -9], [0, -16], [10, -9]]), '#d8263a'); limb(g, { x: h.x, y: h.y - 16 }, { x: h.x + 1, y: h.y - 4 }, .8, '#6a4a2a'); } } }),
    specials_: {
      n: mShot({ s: 8, e: 14, sfx: 'throw', vx: 9, vy: -8, grav: .5, r: 12, life: 90, dmg: 5, b: 4, g: .2, ang: 45, onGround: 'bounce', draw: drawCandy }),
      s: mStrike({ s: 16, a: 4, e: 22, hb: [[60, -50, 38]], dmg: 16, b: 6, g: .6, ang: 40, fx: '#d8263a' }),
      u: { dur: 20, airUses: 1, p: ['crouch', 'victory'], tick(f, t) { if (t === 4) { f.vy = -14; f.ground = null; SFX.play('djump'); } if (t === 19) f.glide = true; } },
      d: mShot({ s: 10, e: 14, sfx: 'throw', y: -15, vx: 7, r: 14, life: 90, grav: .6, onGround: 'slide', dmg: 3, b: 2, g: 0, ang: 30, slow: 150, draw: drawYarn }),
    },
  },
  { // ---------- KAGE (original) ----------
    id: 'kage', name: 'KAGE', title: 'Neon Shinobi', color: '#3bf0ff', fx: '#3bf0ff',
    desc: 'Throw a marker kunai, press →B again to teleport to it.', stats: { speed: 5, power: 2, weight: 2, jump: 4 },
    ...phys({ walk: 7, air: 6, jump: 17, djump: 15, weight: 80, grav: .85, fall: 14.5 }), pw: .9, rc: 1, sp: .8,
    specials: ['Kunai', 'Marker (→B: warp)', 'Grapple Chain', 'Substitution'],
    draw: look({ skin: '#15151a', eye: null, top: '#15151a', sleeve: '#15151a', legs: '#15151a', shin: '#6a6f7a', boots: '#15151a', weapon: 'tanto',
      back(g, h) { const s = Math.sin(T * .3) * 2; poly(g, P2(h, [[-2, 3], [-10, 6 + s], [-17, 4 + s * 1.5], [-10, 8 + s], [-2, 5]]), '#d8263a'); },
      head(g, h) { dome(g, h, '#15151a', 1.05); limb(g, { x: h.x - 1, y: h.y - .5 }, { x: h.x + 5.2, y: h.y - .8 }, 1.6, '#3bf0ff'); } }),
    specials_: {
      n: mShot({ s: 6, e: 12, sfx: 'throw', fn(f) { for (const vy of [-1, 1]) proj(f, { kind: 'kunai', vx: 20, vy, r: 8, life: 30, dmg: 3, b: 3, g: .1, ang: 30, draw: drawKunai }); } }),
      s: { ...mShot({ s: 8, e: 12, sfx: 'throw', kind: 'marker', vx: 16, r: 10, life: 240, dmg: 4, b: 3, g: .1, ang: 30, draw: drawKunai, tick(p) { if (p.t > 12) p.vx *= .8; }, onHit(p) { p.vx = 0; } }),
        alt(f) { const m = owned(f, 'marker'); if (!m) return false; fxBurst(f.x, f.y - 50, '#3bf0ff', 12, 5); teleport(f, m.x, m.y + 40); f.vx = f.vy = 0; m.life = 0; SFX.play('zap'); fxBurst(f.x, f.y - 50, '#3bf0ff', 12, 5); return true; } },
      u: mRise({ vy: -19, spin: 0, dmg: 5, fin: 6, pose: 'ledge', col: '#3bf0ff' }),
      d: { dur: 36, p: ['counter', 'counter'], tick(f, t) { f.subst = t >= 4 && t <= 24; } },
    },
  },
  { // ---------- SIR CLUCKSALOT (original) ----------
    id: 'cluck', name: 'SIR CLUCKSALOT', title: 'Knight of the Coop', color: '#f4f0e0', fx: '#ffd23f',
    desc: 'Chicken knight. Four flaps, egg bombs, a crow that stuns.', stats: { speed: 3, power: 3, weight: 2, jump: 4 },
    ...phys({ walk: 5.6, air: 5, jump: 14.5, djump: 12, grav: .65, weight: 86, jumps: 2, hh: 96 }), body: { thigh: 5, shin: 5, torso: 11, upper: 5, fore: 5, head: 5.5, cy: 16 }, pw: 1, rc: 1.05, sp: 1,
    specials: ['Egg Bomb', 'Lance Charge', 'Flap Flap', 'Rooster Crow'],
    draw: look({ skin: '#f4f0e0', eye: null, top: '#c8ccd8', sleeve: '#f4f0e0', hand: '#f4f0e0', legs: '#f2c14e', boots: '#f2c14e', legW: 2, bootW: 3.5, bootH: 1.2, torsoW: 11, weapon: 'lance',
      back(g, h, f, J) { const hip = J.hip; poly(g, [[hip.x - 2, hip.y - 4], [hip.x - 11, hip.y - 12], [hip.x - 9, hip.y - 2], [hip.x - 3, hip.y + 1]], '#f4f0e0'); },
      head(g, h) { oval(g, h.x + .5, h.y, 5, 5.2, '#f4f0e0'); poly(g, P2(h, [[-2, -4], [-1, -8], [1, -5], [2, -8.5], [3, -4]]), '#d8263a'); poly(g, P2(h, [[4, 0], [8.5, 1.2], [4, 2.5]]), '#f2a030'); oval(g, h.x + 4, h.y + 4, 1, 1.8, '#d8263a'); box(g, h.x + 2.2, h.y - 1.2, 1.3, 1.3, '#15151a'); box(g, h.x - 4, h.y - 2, 5, 5, '#c8ccd8'); } }),
    specials_: {
      n: mShot({ s: 10, e: 14, sfx: 'throw', kind: 'eggbomb', vx: 7, vy: -8, grav: .45, r: 12, life: 90, dmg: 8, b: 6, g: .35, ang: 60, onGround: 'stop', draw: drawEggBomb,
        tick(p) { if ((p.stopped || p.life === 1) && !p.boom) boomSmall(p); }, onHit(p) { boomSmall(p); } }),
      s: mDash({ spd: 13, a: 18, hb: [[75, -45, 26]], dmg: 11, b: 6, g: .45, ang: 30, fx: '#ffd23f' }),
      u: { dur: 16, airUses: 4, dmg: 3, b: 4, g: .05, ang: 80, p: ['crouch', 'djump'], hbAt: (f, t) => t >= 3 && t < 8 ? [[0, -40, 34]] : null,
        tick(f, t) { if (t === 3) { f.vy = -11; f.ground = null; SFX.play('djump'); fxBurst(f.x, f.y - 40, '#ffffff', 5, 4); } } },
      d: { s: 14, a: 0, e: 20, p: ['usmashW', 'victory'], tick(f, t) {
        if (t !== 14) return; SFX.play('game'); fxRing(f.x, f.y - 70, '#ffd23f', 150); popText(f.x, f.y - 150, 'COCK-A-DOODLE-DOO!', '#ffd23f');
        const foe = foeOf(f); if (canBeHit(foe) && foe.ground && Math.hypot(foe.x - f.x, foe.y - f.y) < 190) { setAct(foe, 'dizzy'); foe.stun = 70; }
      } },
    },
  },
  { // ---------- GLOOP (original) ----------
    id: 'gloop', name: 'GLOOP', title: 'Slime King', color: '#6ad84a', fx: '#c8ffb0',
    desc: 'Sticky slime slows you. Leaves puddles. Bounces twice.', stats: { speed: 3, power: 2, weight: 4, jump: 3 },
    ...phys({ walk: 5, air: 5, jump: 15, weight: 118, hw: 60, hh: 88 }), pw: .95, rc: 1, sp: 1,
    specials: ['Slime Ball', 'Roll', 'Bounce', 'Split Puddle'],
    draw(g, J, f) {
      const hip = J.hip, h = J.head, wob = Math.sin(T * .2) * 1;
      oval(g, (hip.x + h.x) / 2, hip.y - 2, 11 + wob, 14 - wob, '#4fbf3a');
      oval(g, (hip.x + h.x) / 2 + 1, hip.y - 4, 8.5 + wob, 11 - wob, '#6ad84a');
      oval(g, h.x - 1, h.y + 4, 3, 3.5, '#c8ffb0');
      limb(g, J.A1.sh, J.A1.h, 3, '#6ad84a'); limb(g, J.A2.sh, J.A2.h, 3, '#4fbf3a');
      box(g, h.x + 1.5, h.y + 2, 2, 3, '#15151a'); box(g, h.x + 4.5, h.y + 2, 2, 3, '#15151a'); box(g, h.x + 1.8, h.y + 2.2, .8, .8, '#fff');
      poly(g, P2(h, [[-4, -2], [-4, -7], [-2, -4.5], [0, -8], [2, -4.5], [4, -7], [4, -2]]), '#f2c14e'); box(g, h.x - .6, h.y - 5.5, 1.2, 1.2, '#d8263a');
      if (T % 20 < 10) box(g, hip.x - 6, hip.y + 8, 2, 2, '#6ad84a');
    },
    body: { thigh: 5, shin: 5, torso: 9, upper: 5, fore: 4, head: 6, cy: 14 },
    specials_: {
      n: mShot({ s: 10, e: 14, sfx: 'throw', vx: 9, vy: -4, grav: .3, r: 16, life: 60, dmg: 4, b: 2, g: .05, ang: 30, slow: 120, draw: drawSlime }),
      s: { ...mDash({ spd: 11, a: 22, hb: [[20, -30, 34]], dmg: 9, b: 6, g: .4, ang: 40 }), pose: (f, t) => ({ ...POSES.spin, rot: t > 8 && t <= 30 ? t * 30 : 0 }) },
      u: { dur: 20, airUses: 2, dmg: 5, b: 6, g: .2, ang: 85, p: ['crouch', 'jump'], hbAt: (f, t) => t >= 3 && t < 10 ? [[0, -30, 40]] : null,
        tick(f, t) { if (t === 3) { f.vy = -17; f.ground = null; SFX.play('djump'); fxBurst(f.x, f.y, '#6ad84a', 8, 4); } } },
      d: { s: 10, a: 0, e: 12, p: ['stomp', 'crouch'], tick(f, t) {
        if (t !== 10) return; killOwned(f, 'puddle'); SFX.play('land');
        spawn({ owner: f.i, kind: 'puddle', x: f.x + f.face * 40, y: f.y - 6, vy: 2, grav: .5, onGround: 'stop', r: 40, life: 480, dmg: 2, b: 1, g: 0, ang: 80, slow: 90, refl: false, draw: drawPuddle,
          tick(p) { if (p.cd && --p.cd === 0) p.inert = false; }, onHit(p) { p.cd = 40; } });
      } },
    },
  },
  { // ---------- INKY (original) ----------
    id: 'inky', name: 'INKY', title: 'Living Doodle', color: '#3a5aff', fx: '#9fb4ff',
    desc: 'A sketch that escaped the page. Draws her own platforms; erases your shots.', stats: { speed: 4, power: 2, weight: 2, jump: 4 },
    ...phys({ walk: 6, air: 5.6, jump: 16.5, djump: 14.5, weight: 88, grav: .72 }), pw: .95, rc: 1.05, sp: .95,
    specials: ['Ink Blot', 'Brush Stroke', 'Sketch Step', 'Eraser'],
    draw: look({ skin: '#f4f0e0', eye: '#15151a', top: '#15151a', sleeve: '#f4f0e0', legs: '#15151a', shin: '#f4f0e0', boots: '#15151a',
      back(g, h) { limb(g, { x: h.x - 5, y: h.y + 20 }, { x: h.x - 13, y: h.y - 4 }, 1.6, '#c8a060'); limb(g, { x: h.x - 13, y: h.y - 4 }, { x: h.x - 15, y: h.y - 9 }, 1.2, '#3a5aff'); },
      head(g, h) { dome(g, h, '#15151a'); oval(g, h.x - 1, h.y - 5.5, 6.5, 2, '#d8263a'); box(g, h.x - 1.5, h.y - 8, 1.5, 1.5, '#d8263a'); } }),
    specials_: {
      n: mShot({ s: 9, e: 14, sfx: 'throw', kind: 'ink_blot', vx: 12, vy: -3, grav: .25, r: 13, life: 60, dmg: 6, b: 4, g: .25, ang: 40, onGround: 'vanish', draw: drawInkBlot }),
      s: mDash({ spd: 13, a: 14, dmg: 10, b: 6, g: .45, ang: 38, fx: '#3a5aff' }),
      // jump, and at the top of the rise draw a platform under her feet (one at a time, 7s cooldown so it can't stall forever)
      u: { dur: 30, airUses: 1, dmg: 6, b: 5, g: .2, ang: 85, p: ['crouch', 'jump'], hbAt: (f, t) => t >= 4 && t < 10 ? [[0, -40, 40]] : null,
        start(f) { f.inkDrew = false; },
        tick(f, t) {
          if (t === 4) { f.vy = -15; f.ground = null; SFX.play('djump'); }
          if (t < 8 || f.inkDrew || f.vy < -1 || (f.inkCD || 0) > T) return;
          f.inkDrew = true; f.inkCD = T + 420; killOwned(f, 'ink_plat'); SFX.play('grab');
          spawn({ owner: f.i, kind: 'ink_plat', plat: 1, soft: true, x: f.x, y: f.y + 2, x1: f.x - 70, x2: f.x + 70, r: 1, life: 240, inert: true, stopped: true, refl: false, draw: drawInkPlat });
        } },
      // rub out every enemy shot nearby
      d: { dur: 26, dmg: 5, b: 5, g: .15, ang: 60, away: 1, p: ['counter', 'spin'], hbAt: (f, t) => t >= 4 && t < 8 ? [[0, -50, 50]] : null,
        tick(f, t) {
          if (t < 4 || t > 18) return;
          for (const p of projectiles) if (p.owner !== f.i && p.life > 0 && !p.inert && Math.hypot(p.x - f.x, p.y - f.y + 55) < 100) {
            p.life = 0; fxBurst(p.x, p.y, '#f4f0e0', 8, 4); popText(p.x, p.y - 30, 'ERASED!', '#f4f0e0'); SFX.play('grab');
          }
          if (t % 3 === 0) fxBurst(f.x + (Math.random() - .5) * 80, f.y - 55 + (Math.random() - .5) * 80, '#f59ab8', 1, 2, 10);
        } },
    },
  },
  { // ---------- DEADEYE (original) ----------
    id: 'deadeye', name: 'DEADEYE', title: 'Six-Shot Sheriff', color: '#d8a050', fx: '#ffe0a0',
    desc: 'Six chambers, then reload.', stats: { speed: 3, power: 3, weight: 3, jump: 3 },
    ...phys({ walk: 5.8, jump: 16, weight: 96 }), pw: 1, rc: 1, sp: 1,
    specials: ['Quick Draw', 'Fan the Hammer', 'Spur Kick', 'Reload'],
    draw: look({ skin: SKIN, eye: '#2a2a2a', top: '#8a4a2a', style: 'vest', top2: '#e8dcc0', sleeve: '#e8dcc0', legs: '#3a4a6a', boots: '#5a3a1a',
      head(g, h) { dome(g, h, '#5a3a1a'); oval(g, h.x, h.y - 4.5, 10, 1.6, '#6a4a2a'); oval(g, h.x, h.y - 7.5, 5.5, 3.5, '#6a4a2a'); box(g, h.x - 5, h.y - 6, 10, 1.2, '#d8a050'); box(g, h.x - 1, h.y + 4.5, 5, 1, '#5a3a1a'); } }),
    specials_: {},
  },
  { // ---------- BLOSSOM (original) ----------
    id: 'blossom', name: 'BLOSSOM', title: 'Wild Gardener', color: '#ff7ab8', fx: '#b8f07a',
    desc: 'Plants seeds that grow while you fight.', stats: { speed: 3, power: 2, weight: 2, jump: 4 },
    ...phys({ walk: 5.6, air: 5.4, jump: 16.5, djump: 14.5, weight: 90, grav: .7 }), pw: .95, rc: 1.1, sp: 1,
    specials: ['Seed', 'Vine Whip', 'Petal Glide', 'Watering Can'],
    draw: look({ skin: SKIN, eye: '#2a2a2a', top: '#4fbf3a', style: 'overalls', top2: '#f4f0e0', sleeve: '#f4f0e0', legs: '#3a8a2a', boots: '#8a5a2a',
      head(g, h) { dome(g, h, '#e85a9a'); oval(g, h.x - 1, h.y + 3, 3, 4.5, '#e85a9a'); for (const [dx, c] of [[-3, '#ff7ab8'], [0, '#ffd23f'], [3, '#ff7ab8']]) oval(g, h.x + dx, h.y - 6, 1.8, 1.8, c); } }),
    specials_: {},
  },
  { // ---------- TOJI ZENIN ----------
    id: 'toji', name: 'TOJI', title: 'Sorcerer Killer', series: 'JUJUTSU KAISEN', color: '#6a6f7a', fx: '#b8b0c8',
    desc: 'Zero cursed energy, monstrous body. Domains cannot sure-hit him.', stats: { speed: 5, power: 4, weight: 3, jump: 5 },
    ...phys({ walk: 7.2, air: 6.2, jump: 17.5, djump: 15, weight: 100, grav: .82, fall: 14 }), pw: 1.05, rc: 1.05, sp: .92,
    noCE: 1, // Heavenly Restriction: no cursed energy at all
    specials: ['Playful Cloud', 'Inverted Spear', 'Heavenly Leap', 'Vanish'],
    draw: look({ skin: SKIN, eye: '#2a2a2a', top: '#15151a', sleeve: '#15151a', fore: SKIN, hand: SKIN, legs: '#d8d4c8', shin: '#d8d4c8', boots: '#2a2a2a',
      weapon: 'katana', bladeLen: 13, blade: '#8a8a9a', edge: '#d8d4e8', guard: '#6a4a8a', handle: '#2a2a3a',
      back(g, h) { for (let k = 0; k < 4; k++) oval(g, h.x - 5 - k * .8, h.y + 6 + k * 3.5, 3.2 - k * .3, 2.4, k % 2 ? '#7a6a8a' : '#8a7a9a'); box(g, h.x - 4, h.y + 5, 1, 1, '#15151a'); }, // Inventory Curse coiled on his back
      head(g, h) { dome(g, h, '#15151a'); spikes(g, h, '#15151a', .7); limb(g, { x: h.x + 3.4, y: h.y + 3 }, { x: h.x + 5, y: h.y + 1.6 }, .5, '#c07a6a'); } }),
    specials_: {
      n: mStrike({ s: 9, a: 10, e: 16, multi: 5, hb: [[70, -60, 30], [40, -60, 22]], dmg: 4, b: 5, g: .2, ang: 45, p: ['fsmashW', 'fsmash'], fx: '#d8263a' }),
      s: mDash({ s: 7, a: 10, e: 16, spd: 15, dmg: 11, b: 6, g: .5, ang: 38 }),
      u: mRise({ vy: -21, col: '#b8b0c8', dmg: 3, fin: 7 }),
      d: { s: 6, a: 0, e: 10, p: ['crouch', 'crouch'] },
    },
  },
  { // ---------- HIGURUMA ----------
    id: 'higuruma', name: 'HIGURUMA', title: 'Deadly Sentencing', series: 'JUJUTSU KAISEN', color: '#f2c14e', fx: '#f2c14e',
    desc: 'A lawyer turned sorcerer. His gavel grows; his domain puts you on trial.', stats: { speed: 3, power: 4, weight: 3, jump: 3 },
    ...phys({ walk: 5.6, weight: 100 }), pw: 1.1, rc: 1.1, sp: 1,
    specials: ['Gavel Smash', 'Gavel Throw', 'Rising Gavel', 'Objection!'],
    draw: look({ skin: SKIN, eye: '#2a2a2a', top: '#1a1a24', style: 'suit', top2: '#f4f4f4', legs: '#1a1a24', boots: '#15151a', weapon: 'gavel',
      head(g, h) { dome(g, h, '#15151a', .85); box(g, h.x + 1.5, h.y + 3.5, 3.5, 1, '#5a4a4a'); } }),
    specials_: {},
  },
  { // ---------- HAKARI ----------
    id: 'hakari', name: 'HAKARI', title: 'Idle Death Gamble', series: 'JUJUTSU KAISEN', color: '#6dff8a', fx: '#ffd23f',
    desc: 'A brawling gambler. Roll for luck; hit the domain jackpot and he\'s nearly immortal.', stats: { speed: 4, power: 4, weight: 3, jump: 4 },
    ...phys({ walk: 6.4, jump: 16.8, weight: 102 }), pw: 1.05, rc: 1, sp: .95,
    specials: ['Shutter Doors', 'Rough Energy Rush', 'Rising Knee', 'Roll the Dice'],
    draw: look({ skin: SKIN, eye: '#2a2a2a', top: '#101018', style: 'uniform', legs: '#101018', boots: '#0a0a0a',
      head(g, h) { dome(g, h, '#e8c860'); spikes(g, h, '#e8c860', .9); box(g, h.x - 3, h.y - 4, 5, 1.5, '#6a5020'); } }),
    specials_: {},
  },
  { // ---------- YUTA OKKOTSU ----------
    id: 'yuta', name: 'YUTA', title: 'Special Grade', series: 'JUJUTSU KAISEN', color: '#e8e8f0', fx: '#8ac8ff',
    desc: 'Katana, Cursed Speech, and Rika. Copies your technique.', stats: { speed: 4, power: 4, weight: 3, jump: 4 },
    ...phys({ walk: 6.2, jump: 16.8, weight: 98 }), pw: 1.05, rc: 1.15, sp: .95,
    specials: ['Cursed Speech', 'Copy', 'Rika Lift', 'Rika!'],
    draw: look({ skin: SKIN, eye: '#2a2a2a', top: '#e8e8f0', style: 'uniform', legs: '#e8e8f0', boots: '#2a2a2a', weapon: 'katana', blade: '#dfe6f0', guard: '#2a2a3a',
      head(g, h) { dome(g, h, '#15151a'); spikes(g, h, '#15151a', .8); box(g, h.x + 2.4, h.y + 1.6, 2, .7, '#8a7a8a'); } }),
    specials_: {},
  },
);
for (const ch of CHARS) if (!ch.moves || !ch.moves.nspec) buildChar(ch);
