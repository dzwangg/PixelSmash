// Kit overrides: jjk (see KIT_API guide). Every top-level name is prefixed jj_.
// Yuji, Gojo, Megumi, Sukuna (Jujutsu Kaisen) + originals Mochi (sumo cat) and Glitch (digital ghost).

// ================= shared helpers =================
const jj_foe = f => fighters[1 - f.i];
const jj_alive = f => !['dead', 'out', 'respawn'].includes(f.act);
const jj_grabbable = f => jj_alive(f) && !['held', 'hold', 'ledge', 'final', 'climb'].includes(f.act);
// keep a foe pinned in hitstun for this frame (stun expires by itself if our driver vanishes)
function jj_pin(foe, x, y) { if (foe.act !== 'hurt') setAct(foe, 'hurt'); foe.stun = 3; foe.launch = 0; foe.x = x; foe.y = y; foe.vx = foe.vy = 0; }
// an invisible, hitless projectile used as a per-frame driver / overlay (tick closure + draw)
function jj_ticker(f, kind, life, tick, draw) {
  killOwned(f, kind);
  spawn({ owner: f.i, kind, x: 0, y: stage.main.y - 300, r: 1, life, inert: true, refl: false, stopped: true, tick, draw: draw || (() => {}) });
}
const jj_hand = f => ({ x: f.x + f.face * 50, y: f.y - 62 });
function jj_line(ctx, x1, y1, x2, y2, w, c) { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
// wrap a foreign move so a crash inside it can never take the game down (Glitch copy-paste)
const jj_safe = (fn, dflt) => fn && ((...a) => { try { return fn(...a); } catch (e) { return dflt; } });

// ================= YUJI =================
const JJ_BF = { dmg: 18, b: 7, g: .55, ang: 40 };
function jj_drawDiv(ctx, p) { // delayed second impact: blue ring closing in, then the burst
  const k = Math.max(0, 1 - p.t / 14);
  ctx.globalAlpha = .8; ctx.strokeStyle = '#6ab0ff'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(p.x, p.y, 20 + k * 60, 0, 7); ctx.stroke(); ctx.globalAlpha = 1;
  if (p.t >= 14) { pxDisc(ctx, p.x, p.y, 46 - (p.t - 14) * 6, '#6ab0ff'); pxDisc(ctx, p.x, p.y, 26 - (p.t - 14) * 4, '#e8f6ff'); }
}
KITS.yuji = {
  desc: 'Divergent Fist hits twice. Time B on impact for BLACK FLASH and enter the zone.',
  specials: ['Divergent Fist', 'Black Flash (tap B!)', 'Manji Kick', 'Boogie Woogie'],
  specials_: {
    // punch, then the cursed energy lands a beat later wherever the foe is
    n: { s: 7, a: 3, e: 16, hb: [[50, -62, 26]], dmg: 4, b: 4, g: .05, ang: 30, p: ['jabW', 'jab'],
      onHit(f, foe) {
        spawn({ owner: f.i, kind: 'jj_div', x: foe.x, y: foe.y - 55, vx: f.face * .01, r: 50, life: 22, inert: true, refl: false, stopped: true,
          dmg: 7, b: 6.5, g: .12, ang: 80, draw: jj_drawDiv,
          tick(p) { const t = jj_foe(fighters[p.owner]); p.x = t.x; p.y = t.y - 55; if (p.t === 14) { p.inert = false; SFX.play('boom', .6); fxBurst(p.x, p.y, '#6ab0ff', 14, 7); popText(p.x, p.y - 70, 'DIVERGENT!', '#6ab0ff'); } },
          onHit(p) { p.life = Math.min(p.life, 6); } });
      } },
    // lunge punch. Press B again right as the fist lands (3-frame window, 6 in the zone) = Black Flash
    s: { s: 12, a: 4, e: 18, dmg: 8, b: 6, g: .4, ang: 38, p: ['jabW', 'jab'],
      start(f) { f.jj_bf = 0; f.jj_bfTry = 0; },
      tick(f, t, inp, E) {
        if (t > 4 && t <= 13) f.vx = f.face * 9;
        const lo = f.buff?.jjZone ? 8 : 11;
        if (E('b') && !f.jj_bfTry && t > 1) {
          f.jj_bfTry = 1;
          if (t >= lo && t <= 13) { f.jj_bf = 1; SFX.play('zap', .5); }
          else if (t < lo) popText(f.x, f.y - 140, 'TOO EARLY', '#8a8aa8');
        }
      },
      hbAt: (f, t) => t > 12 && t <= 16 ? [[55, -62, 30, f.jj_bf ? JJ_BF : null]] : null,
      onHit(f, foe) {
        if (!f.jj_bf) return;
        f.jj_bfN = f.buff?.jjZone ? (f.jj_bfN || 1) + 1 : 1;
        f.buff = { t: 420, spd: 1.12, pow: 1.1, armor: 0, grow: 1, col: '#e8263a', jjZone: 1 };
        SFX.play('counter'); flash = 6; shakeCam(18); freeze = 16;
        for (let i = 0; i < 4; i++) fxBurst(foe.x, foe.y - 55, i % 2 ? '#e8263a' : '#111111', 14, 11);
        fxRing(foe.x, foe.y - 55, '#111111', 70);
        popText(foe.x, foe.y - 140, f.jj_bfN > 1 ? `BLACK FLASH x${f.jj_bfN}!` : 'BLACK FLASH!', '#e8263a');
      },
      drawFx(f, t) {
        const h = jj_hand(f), lo = f.buff?.jjZone ? 8 : 11;
        if (t < lo) { if (t % 2) fxBurst(h.x - f.face * 20, h.y, '#6ab0ff', 1, 2, 8); }
        else if (t <= 13 && !f.jj_bfTry) { pxDisc(ctx, h.x, h.y, 14 + (t % 2) * 6, '#ffffff'); pxRect(ctx, h.x - 24, h.y - 2, 48, 4, '#ffffff'); pxRect(ctx, h.x - 2, h.y - 24, 4, 48, '#ffffff'); }
        if (f.jj_bf && t > 12 && t <= 20) for (let i = 0; i < 5; i++) {
          const a = i * 1.26 + t, L = 50 + (i % 2) * 25;
          jj_line(ctx, h.x, h.y, h.x + Math.cos(a) * L, h.y + Math.sin(a) * L, 7, '#111111');
          jj_line(ctx, h.x, h.y, h.x + Math.cos(a) * L * .7, h.y + Math.sin(a) * L * .7, 3, '#e8263a');
        }
      } },
    // flipping kick; landing it vaults Yuji off the foe (double jump back, no helpless)
    u: { dur: 36, helpless: 1, grav: .75, dmg: 7, b: 6, g: .3, ang: 78,
      start(f) { f.jj_vault = 0; },
      hbAt: (f, t) => t >= 5 && t < 17 && !f.jj_vault ? [[30, -40, 34], [12, -100, 30]] : null,
      tick(f, t, inp) {
        if (t === 4) { f.vy = -17; f.ground = null; SFX.play('swing'); }
        if (t > 4) f.vx = inp.x * 4.5;
        if (f.jj_vault && t >= f.jj_vault + 5) { setAct(f, 'air'); f.jumps = f.ch.jumps; }
      },
      onHit(f) { f.jj_vault = f.mt; f.vy = -9; fxRing(f.x, f.y - 40, '#6ab0ff', 30); popText(f.x, f.y - 140, 'VAULT', '#6ab0ff'); },
      pose: (f, t) => t < 4 ? POSES.crouch : { ...POSES.kick, rot: -Math.min(360, (t - 4) * 30) } },
    // Todo's clap: swap places with the foe, who is briefly disoriented
    d: { s: 10, a: 0, e: 14, p: ['castW', 'counter'],
      tick(f, t) {
        if (t !== 10) return;
        const foe = jj_foe(f), h = jj_hand(f);
        SFX.play('counter', .7); fxRing(h.x, h.y, '#ffffff', 26); fxBurst(h.x, h.y, '#fff6a0', 8, 5);
        if ((f.jj_clapCD || 0) > T || !jj_grabbable(foe) || Math.hypot(foe.x - f.x, foe.y - f.y) > 460) return;
        f.jj_clapCD = T + 80;
        const [x, y] = [f.x, f.y];
        fxBurst(f.x, f.y - 55, '#f59ab0', 12, 5); fxBurst(foe.x, foe.y - 55, '#f59ab0', 12, 5);
        teleport(f, foe.x, foe.y); teleport(foe, x, y);
        f.face = Math.sign(foe.x - f.x) || f.face;
        if (foe.act !== 'hurt') { setAct(foe, 'dizzy'); foe.stun = 16; }
        foe.vx = -foe.vx;
        popText(f.x, f.y - 140, 'BOOGIE WOOGIE', '#f59ab0');
      } },
  },
  normals: {
    dtilt: { s: 5, a: 3, e: 12, hb: [[55, -12, 24]], dmg: 6, b: 6, g: .08, ang: 82, p: ['dtiltW', 'dtilt'] }, // sweep launcher
  },
};

// ================= GOJO =================
const jj_six = f => !!f.buff?.jjSix;
function jj_drawBlue(ctx, p) {
  const r = 24 + Math.sin(p.t * .5) * 3;
  ctx.strokeStyle = '#6ab0ff'; ctx.lineWidth = 3; ctx.globalAlpha = .5;
  for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(p.x, p.y, r + 90 - ((p.t * 4 + k * 30) % 90), 0, 7); ctx.stroke(); }
  ctx.globalAlpha = 1;
  pxDisc(ctx, p.x, p.y, r + 6, '#0a1450'); pxDisc(ctx, p.x, p.y, r, '#2a4aff'); pxDisc(ctx, p.x, p.y, r * .45, '#bfe6ff');
}
function jj_drawRed(ctx, p) { pxDisc(ctx, p.x, p.y, p.r + 6 + Math.sin(p.t) * 3, '#6a0010'); pxDisc(ctx, p.x, p.y, p.r, '#e8263a'); pxDisc(ctx, p.x, p.y, p.r * .45, '#ffd0d0'); }
function jj_drawPurple(ctx, p) {
  const d = Math.sign(p.vx) || 1;
  for (let i = 1; i < 5; i++) pxDisc(ctx, p.x - d * i * 22, p.y, p.r * (1 - i * .18), i % 2 ? '#5a1a9a' : '#3a0a6a');
  pxDisc(ctx, p.x, p.y, p.r + 8, '#2a0050'); pxDisc(ctx, p.x, p.y, p.r, '#9a4aff'); pxDisc(ctx, p.x, p.y, p.r * .6, '#e0c0ff'); pxDisc(ctx, p.x, p.y, p.r * .3, '#ffffff');
}
// slow every enemy projectile that approaches (stop it dead inside `stopR`)
function jj_infinity(f, R, stopR) {
  for (const q of projectiles) {
    if (q.owner === f.i || q.stopped) continue;
    const d = Math.hypot(q.x - f.x, q.y - (f.y - 55));
    if (d > R) continue;
    q.vx *= .82; q.vy *= .82; q.grav = 0;
    if (d < stopR) { q.vx = q.vy = 0; if (T % 6 === 0) fxRing(q.x, q.y, '#8ac8ff', 14); }
  }
}
KITS.gojo = {
  desc: 'Limitless. Blue pulls them in, Red blows them away — Red into Blue = HOLLOW PURPLE.',
  specials: ['Lapse: Blue', 'Red / Hollow Purple', 'Blue: Self-Pull', 'Infinity (hold: Eyes)'],
  specials_: {
    // plant a point of attraction that drags the foe (and their projectiles) into it
    n: { dur: 28, p: ['castW', 'cast'],
      tick(f, t) {
        if (t !== (jj_six(f) ? 8 : 14)) return;
        if (owned(f, 'jj_blue')) return; // one Blue at a time: no chaining it into a permanent pin
        SFX.play('shadow');
        spawn({ owner: f.i, kind: 'jj_blue', x: f.x + f.face * 170, y: f.y - 70, r: 30, life: 60, inert: true, refl: false, stopped: true, draw: jj_drawBlue,
          tick(p) {
            const o = fighters[p.owner], foe = jj_foe(o);
            if (p.t % 2) { const a = Math.random() * 6.28; particles.push({ x: p.x + Math.cos(a) * 130, y: p.y + Math.sin(a) * 130, vx: -Math.cos(a) * 7, vy: -Math.sin(a) * 7, life: 18, max: 18, c: '#6ab0ff', sz: PX * 2 }); }
            for (const q of projectiles) if (q.owner !== p.owner && Math.hypot(q.x - p.x, q.y - p.y) < 200) { q.x += (p.x - q.x) * .1; q.y += (p.y - q.y) * .1; if (Math.hypot(q.x - p.x, q.y - p.y) < 30) q.life = 0; }
            if (!canBeHit(foe) || !jj_grabbable(foe)) return;
            const dx = p.x - foe.x, dy = p.y + 45 - foe.y, d = Math.hypot(dx, dy);
            if (d > 240) return;
            const k = d < 50 ? .3 : .1;
            if (d < 90) jj_pin(foe, foe.x + dx * k, foe.y + dy * k);
            else { foe.x += dx * k; foe.y += dy * k; foe.vx *= .6; foe.vy *= .6; }
            if (dy < -3) foe.ground = null;
            if (p.t % 12 === 0 && d < 70) applyHit(o, foe, { dmg: 2, b: 2, g: 0, ang: 90 }, 1, p.x, p.y);
          } });
      } },
    // Red repels. If a Blue is on the field, they collide into Hollow Purple
    s: { dur: 40, p: ['castW', 'palm'],
      start(f) { f.jj_purple = !!owned(f, 'jj_blue'); },
      tick(f, t) {
        const h = jj_hand(f), fire = f.jj_purple ? (jj_six(f) ? 16 : 24) : (jj_six(f) ? 7 : 12);
        if (t < fire) { if (t % 2) fxBurst(h.x, h.y, f.jj_purple ? (t % 4 ? '#e8263a' : '#2a4aff') : '#e8263a', 2, 3, 10); return; }
        if (t !== fire) return;
        if (f.jj_purple) {
          killOwned(f, 'jj_blue'); SFX.play('boom'); flash = 6; shakeCam(14);
          popText(f.x, f.y - 150, 'HOLLOW PURPLE', '#c080ff');
          proj(f, { kind: 'jj_purple', vx: 8, r: 58, life: 110, refl: false, dmg: 18, b: 7, g: .5, ang: 35, draw: jj_drawPurple,
            tick(p) { for (const q of projectiles) if (q !== p && q.owner !== p.owner && !q.inert && Math.hypot(q.x - p.x, q.y - p.y) < p.r + 20) q.life = 0; if (p.t % 2) fxBurst(p.x, p.y, '#c080ff', 2, 5, 14); },
            onHit(p) { fxBurst(p.x, p.y, '#ffffff', 20, 10); } });
        } else {
          SFX.play('boom', .7); f.vx = -f.face * 5;
          for (const q of projectiles) if (q.owner !== f.i && Math.abs(q.x - h.x) < 130 && Math.abs(q.y - h.y) < 90) { q.vx = f.face * Math.max(10, Math.abs(q.vx) * 1.4); q.owner = f.i; }
          proj(f, { kind: 'jj_red', x: f.x + f.face * 55, vx: 12, r: 26, life: 20, refl: false, dmg: 10, b: 8, g: .42, ang: 28, draw: jj_drawRed });
        }
      } },
    // Blue on himself: yanked toward a point in the stick direction, dragging anyone nearby along
    u: { dur: 36, helpless: 1, dmg: 3, b: 4, g: 0, ang: 60, multi: 6, away: 1, p: ['castW', 'jump'],
      grav: (f, t) => t < 22 ? 0 : 1,
      tick(f, t, inp) {
        if (t < 6) { f.vx *= .7; f.vy *= .5; return; }
        if (t === 6) { const d = stickDir(inp); f.jj_tgt = { x: f.x + d.x * 250, y: f.y + d.y * 250, dx: d.x, dy: d.y }; if (d.x) f.face = Math.sign(d.x); SFX.play('shadow'); }
        const g = f.jj_tgt;
        if (t <= 21) {
          teleport(f, f.x + (g.x - f.x) * .22, f.y + (g.y - f.y) * .22); f.vx = f.vy = 0;
          const foe = jj_foe(f);
          if (canBeHit(foe) && jj_grabbable(foe) && Math.hypot(foe.x - f.x, foe.y - f.y) < 130) { foe.x += (f.x - foe.x) * .3; foe.y += (f.y - foe.y) * .3; foe.ground = null; }
          if (t % 2) fxBurst(f.x, f.y - 55, '#6ab0ff', 2, 4, 12);
        }
        if (t === 22) { f.vx = g.dx * 6; f.vy = g.dy * 6; }
      },
      hbAt: (f, t) => t >= 6 && t <= 21 ? [[0, -55, 50]] : null,
      drawFx(f, t) { const g = f.jj_tgt; if (t >= 6 && t <= 21 && g) jj_drawBlue(ctx, { x: g.x, y: g.y - 55, t, r: 18 }); } },
    // Infinity: nothing reaches him; tap = short stance, hold B through it = blindfold off (Six Eyes)
    d: { dur: 48, p: ['counter', 'counter'],
      start(f) { f.jj_held = 1; },
      tick(f, t, inp) {
        const on = t > 2 && t <= 42;
        f.nullify = on;
        if (!inp.b) f.jj_held = 0;
        if (on) {
          jj_infinity(f, 190, 80);
          const foe = jj_foe(f);
          if (Math.hypot(foe.x - f.x, foe.y - f.y) < 100) foe.slowT = Math.max(foe.slowT || 0, 20);
          if (t % 5 === 0) fxRing(f.x, f.y - 55, '#8ac8ff', 55);
        }
        if (t === 40 && f.jj_held && !jj_six(f)) {
          f.buff = { t: 600, spd: 1.12, pow: 1.1, armor: 0, grow: 1, col: '#6ab0ff', jjSix: 1 };
          SFX.play('counter'); flash = 5; fxRing(f.x, f.y - 100, '#ffffff', 80); popText(f.x, f.y - 150, 'SIX EYES', '#8ac8ff');
          jj_ticker(f, 'jj_eyes', 600, p => { const o = fighters[p.owner]; if (!jj_six(o)) p.life = 0; else jj_infinity(o, 130, 0); }, (ctx, p) => {
            const o = fighters[p.owner]; if (!jj_alive(o) || o.act === 'final') return;
            const hx = o.x + o.face * 10, hy = o.y - o.ch.hh * .86;
            pxRect(ctx, hx - 9, hy - 3, 21, 6, '#f8e0cc'); pxRect(ctx, hx + (o.face > 0 ? 3 : -9), hy - 3, 6, 6, '#6ae0ff');
            if (T % 10 < 5) pxRect(ctx, hx + (o.face > 0 ? 3 : -9), hy - 3, 3, 3, '#ffffff');
          });
        }
      } },
  },
};

// ================= MEGUMI =================
function jj_drawToadTongue(ctx, p) {
  const d = p.face, mx = p.ax + d * 18, my = p.ay - 28;
  pxDisc(ctx, p.ax, p.ay - 18, 22, '#3a6a3a'); pxDisc(ctx, p.ax + d * 6, p.ay - 14, 14, '#5a9a4a');
  pxDisc(ctx, p.ax - d * 6, p.ay - 40, 7, '#3a6a3a'); pxDisc(ctx, p.ax + d * 10, p.ay - 40, 7, '#3a6a3a'); pxRect(ctx, p.ax + d * 10, p.ay - 42, 3, 3, '#ffe07a');
  jj_line(ctx, mx, my, p.x, p.y, 8, '#d0507a'); pxDisc(ctx, p.x, p.y, 10, '#ff6a9a');
}
function jj_drawRabbits(ctx, p) {
  for (let i = 0; i < 9; i++) {
    const x = p.x - 90 + ((i * 47 + p.t * (i % 2 ? 3 : -2)) % 180 + 180) % 180, hop = Math.abs(Math.sin(p.t * .3 + i)) * 18, y = p.y - hop;
    pxRect(ctx, x - 9, y - 12, 18, 12, '#f4f4ff'); pxRect(ctx, x - 6, y - 24, 4, 12, '#f4f4ff'); pxRect(ctx, x + 1, y - 24, 4, 12, '#f4f4ff'); pxRect(ctx, x + 3, y - 9, 3, 3, '#d02030');
  }
}
function jj_drawWave(ctx, p) { const d = Math.sign(p.vx) || 1; for (let i = 0; i < 4; i++) pxRect(ctx, p.x - d * i * 16 - 8, p.y - 30 + i * 8 + Math.sin(p.t * .5 + i) * 4, 18, 36 - i * 8, i % 2 ? '#6ab0ff' : '#bfe6ff'); }
KITS.megumi = {
  desc: 'Ten Shadows: a hunting dog, a grappling toad, Nue flight, and his own shadow.',
  specials: ['Divine Dog (B: pounce)', 'Toad', 'Nue', 'Shadow Sink / Elephant'],
  specials_: {
    // a Divine Dog that hunts the foe along the ground; press B again to make it pounce
    n: { s: 12, a: 0, e: 14, p: ['castW', 'cast'],
      alt(f) {
        const d = owned(f, 'jj_dog'); if (!d || d.jjPounce) return false;
        const foe = jj_foe(f);
        Object.assign(d, { jjPounce: 1, vy: -11, vx: (Math.sign(foe.x - d.x) || 1) * 11, inert: false, cd: 0, dmg: 8, b: 6, g: .4, ang: 55 });
        SFX.play('shadow'); fxBurst(d.x, d.y - 20, '#8a7aff', 8, 4); return true;
      },
      tick(f, t) {
        if (t !== 12) return;
        killOwned(f, 'jj_dog'); SFX.play('shadow'); fxBurst(f.x + f.face * 40, f.y - 10, '#1a1428', 10, 4);
        spawn({ owner: f.i, kind: 'jj_dog', x: f.x + f.face * 40, y: f.y - 20, vx: f.face * 3, vy: 0, r: 26, life: 200, grav: .6, onGround: 'slide', refl: false,
          dmg: 5, b: 5.5, g: .1, ang: 80, draw: drawDog,
          tick(p) {
            const foe = jj_foe(fighters[p.owner]);
            if (p.cd > 0 && --p.cd === 0) p.inert = false;
            if (p.jjPounce) { if (p.vy === 0 && p.t > 5) Object.assign(p, { jjPounce: 0, dmg: 5, b: 5.5, g: .1, ang: 80 }); return; }
            const d = Math.sign(foe.x - p.x) || 1;
            p.vx = clamp(p.vx + d * .6, -8, 8); if (Math.abs(p.vx) < .5) p.vx = d * .5;
          },
          onHit(p) { p.bites = (p.bites || 0) + 1; p.cd = 40; SFX.play('shadow', .6); if (p.bites >= 3 || p.jjPounce) p.life = 0; } });
      } },
    // the Toad's tongue: catches the foe and reels them in, dazed, right in front of Megumi
    s: { dur: 36, p: ['castW', 'cast'],
      tick(f, t) {
        if (t !== 8) return;
        killOwned(f, 'jj_tongue'); SFX.play('grab');
        spawn({ owner: f.i, kind: 'jj_tongue', x: f.x + f.face * 50, y: f.y - 50, vx: f.face * 19, r: 20, life: 26, refl: false, dmg: 3, b: 0, g: 0, ang: 0,
          face: f.face, ax: f.x + f.face * 35, ay: f.y, draw: jj_drawToadTongue,
          tick(p) {
            const o = fighters[p.owner], foe = jj_foe(o);
            p.ax = o.x + p.face * 35; p.ay = o.y;
            if (!p.caught) { if (p.t === 11) p.vx = -p.vx; if (p.t > 11 && Math.abs(p.x - p.ax) < 24) p.life = 0; return; }
            p.vx = p.vy = 0;
            if (!jj_grabbable(foe)) { p.life = 0; return; }
            const tx = o.x + p.face * 62;
            p.x += (tx - p.x) * .3; p.y = o.y - 50; jj_pin(foe, p.x, o.y);
            if (Math.abs(p.x - tx) < 8) { setAct(foe, 'dizzy'); foe.stun = 26; foe.ground = o.ground; p.life = 0; popText(foe.x, foe.y - 140, 'GOT YOU', '#5a9a4a'); }
          },
          onHit(p, foe) { if (foe.act === 'hurt') { p.caught = 1; p.life = 40; SFX.play('grab'); } else p.life = 0; } });
      } },
    // hang from Nue and fly (steer with the stick). B = Nue's electric discharge
    u: { dur: 72, helpless: 1, grav: 0, p: ['ledge', 'ledge'], dmg: 9, b: 6, g: .35, ang: 70, away: 1,
      start(f) { f.jj_zap = 0; },
      tick(f, t, inp, E) {
        if (t < 5) { f.vy *= .5; return; }
        if (t === 5) SFX.play('djump');
        f.vx += (inp.x * 7 - f.vx) * .2;
        f.vy += ((inp.y < -.3 ? -8 : inp.y > .3 ? 4 : -4) - f.vy) * .2;
        if (f.vy < 0) f.ground = null;
        if (E('b') && !f.jj_zap && t > 8) { f.jj_zap = t; SFX.play('zap'); flash = 3; }
        if (f.jj_zap && t > f.jj_zap + 12) return 'end';
        if (t > 62) return 'end';
      },
      hbAt: (f, t) => f.jj_zap && t >= f.jj_zap && t < f.jj_zap + 6 ? [[0, -80, 80]] : null,
      onHit(f, foe) { setAct(foe, 'dizzy'); foe.stun = 20; },
      drawFx(f, t) {
        drawOwl(ctx, { x: f.x, y: f.y - 140, t });
        if (f.jj_zap && t < f.jj_zap + 8) for (let i = 0; i < 6; i++) { const a = i * 1.05 + t; jj_line(ctx, f.x, f.y - 90, f.x + Math.cos(a) * 85, f.y - 80 + Math.sin(a) * 85, 5, i % 2 ? '#aef6ff' : '#fff04a'); }
      } },
    // ground: sink into his shadow (Rabbit Escape swarm left behind), B to burst out with a launcher.
    // air: Max Elephant drops and floods the stage
    d: { dur: 90, dmg: 8, b: 6.5, g: .15, ang: 85,
      start(f) { f.jj_dm = f.ground ? 'sink' : 'ele'; f.jj_emerge = 0; },
      tick(f, t, inp, E) {
        if (f.jj_dm === 'ele') {
          if (t === 14) {
            SFX.play('rock');
            spawn({ owner: f.i, kind: 'jj_ele', x: f.x + f.face * 120, y: f.y - 380, vy: 10, grav: .35, r: 50, life: 90, dmg: 12, b: 6, g: .4, ang: -70, refl: false, draw: drawElephant,
              tick(p) {
                if (groundAt(p.x, p.y + 50) === null || p.vy < 0) return;
                p.life = 0; SFX.play('boom'); shakeCam(10); fxBurst(p.x, p.y + 40, '#6ab0ff', 24, 8);
                const gy = groundAt(p.x, p.y + 50);
                for (const d of [-1, 1]) spawn({ owner: p.owner, kind: 'jj_wave', x: p.x + d * 30, y: gy - 20, vx: d * 9, r: 32, life: 40, dmg: 5, b: 7, g: .25, ang: 25, refl: false, draw: jj_drawWave,
                  tick(q) { if (groundAt(q.x, q.y + 20) === null) q.life = 0; } });
              } });
          }
          return t >= 30 ? 'end' : undefined;
        }
        if (t === 6) { SFX.play('shadow'); spawn({ owner: f.i, kind: 'jj_rabbit', x: f.x, y: f.y - 4, vx: .01, r: 70, life: 110, stopped: true, refl: false, dmg: 1, b: 2, g: 0, ang: 70, draw: jj_drawRabbits, tick(p) { if (p.cd > 0 && --p.cd === 0) p.inert = false; }, onHit(p) { p.cd = 14; } }); }
        if (!f.jj_emerge) {
          if (t > 6) { f.stealth = 2; f.vx = inp.x * 8; if (inp.x) f.face = Math.sign(inp.x); }
          if (t > 14 && (E('b') || t >= 70)) { f.jj_emerge = t; f.vx = 0; SFX.play('swing'); fxBurst(f.x, f.y - 10, '#1a1428', 16, 7); }
        } else if (t >= f.jj_emerge + 18) return 'end';
      },
      hbAt: (f, t) => f.jj_emerge && t >= f.jj_emerge && t < f.jj_emerge + 6 ? [[15, -60, 46]] : null,
      pose: (f, t) => f.jj_dm === 'ele' ? (t < 14 ? POSES.castW : POSES.cast) : f.jj_emerge ? POSES.usmash : POSES.crouch,
      drawFx(f, t) {
        if (f.jj_dm !== 'sink' || f.jj_emerge) return;
        ctx.fillStyle = '#0a0612'; ctx.beginPath(); ctx.ellipse(f.x, f.y + 2, 40 + Math.sin(t * .3) * 4, 9, 0, 0, 7); ctx.fill();
        pxRect(ctx, f.x - 3, f.y - 6, 6, 6, '#8a7aff');
      } },
  },
};

// ================= SUKUNA =================
const jj_cooked = foe => T - (foe.jj_dis ?? -1e9) < 360 && T - (foe.jj_clv ?? -1e9) < 360;
function jj_drawDismantle(ctx, p) { const d = Math.sign(p.vx) || 1, s = p.tilt; jj_line(ctx, p.x - d * 30, p.y - s * 22, p.x + d * 12, p.y + s * 10, 6, '#ff3b3b'); jj_line(ctx, p.x - d * 26, p.y - s * 19, p.x + d * 10, p.y + s * 8, 2, '#ffffff'); }
function jj_drawWeb(ctx, p) {
  const k = 1 - p.t / 20; ctx.globalAlpha = Math.max(0, k);
  for (let i = 0; i < 8; i++) { const a = i * .785; jj_line(ctx, p.x, p.y, p.x + Math.cos(a) * 90, p.y + Math.sin(a) * 40, 4, '#ff3b3b'); }
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; for (const r of [30, 60, 88]) { ctx.beginPath(); ctx.ellipse(p.x, p.y, r, r * .44, 0, 0, 7); ctx.stroke(); }
  ctx.globalAlpha = 1;
}
function jj_drawFuga(ctx, p) {
  const d = Math.sign(p.vx) || 1, k = p.open ? 1.8 : 1;
  pxRect(ctx, p.x - d * 70 * k, p.y - 3 * k, 80 * k, 6 * k, '#ffd23f');
  ctx.fillStyle = '#ff6a1f'; ctx.beginPath(); ctx.moveTo(p.x + d * 30 * k, p.y); ctx.lineTo(p.x, p.y - 18 * k); ctx.lineTo(p.x, p.y + 18 * k); ctx.fill();
  for (let i = 0; i < 4; i++) pxDisc(ctx, p.x - d * (20 + i * 22) * k, p.y + (Math.random() - .5) * 16 * k, (11 - i * 2) * k, i % 2 ? '#ff6a1f' : '#ffb13b');
  if (p.open) { ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(p.x, p.y, 44 + Math.sin(p.t) * 4, 0, 7); ctx.stroke(); }
}
KITS.sukuna = {
  desc: 'Shrine: Dismantle and Cleave "prepare" the foe — then Fuga opens for real.',
  specials: ['Dismantle (tap x3)', 'Cleave', 'Web', 'Fuga ("Open")'],
  specials_: {
    // invisible slashes: tap B again for up to 3; each hit marks the foe (Dismantle)
    n: { dur: 22, p: ['castW', 'cast'],
      start(f) { f.jj_dn = 0; },
      tick(f, t, inp, E) {
        if (t === 5) {
          f.jj_dn++; SFX.play('swing', .6); const last = f.jj_dn === 3, tilt = [1, -1, .3][f.jj_dn - 1];
          proj(f, { kind: 'jj_dis', y: -60 - tilt * 14, vx: 22, r: 18, life: 22, tilt, dmg: last ? 6 : 4, b: last ? 5 : 3, g: last ? .3 : .06, ang: last ? 40 : 55, draw: jj_drawDismantle,
            onHit(p, foe) { foe.jj_dis = T; p.life = 0; fxBurst(p.x, p.y, '#ff3b3b', 6, 5); } });
        }
        if (E('b') && t > 6 && f.jj_dn < 3) f.mt = 3;
      } },
    // touch-range: Cleave calibrates to the target's toughness (weight + damage) — marks the foe
    s: { s: 9, a: 3, e: 20, dmg: 8, p: ['jabW', 'palm'],
      hbAt(f, t) {
        if (t <= 9 || t > 12) return null;
        const foe = jj_foe(f), k = (foe.ch.weight + 100) / 200;
        return [[50, -60, 32, { b: 6 * k, g: .32 * k, ang: 45 }]];
      },
      dmgFn: (f, foe) => Math.min(18, Math.round(5 + (foe.ch.weight - 70) / 12 + foe.dmg * .07)),
      onHit(f, foe) {
        foe.jj_clv = T; SFX.play('swing');
        for (let i = 0; i < 4; i++) fxBurst(foe.x + (i - 1.5) * 14, foe.y - 30 - i * 18, i % 2 ? '#ffffff' : '#ff3b3b', 5, 6, 14);
        popText(foe.x, foe.y - 140, jj_cooked(foe) ? 'PREPARED' : 'CLEAVE', '#ff3b3b');
      } },
    // palm slams a spider-web of slashes beneath him and he rides the burst upward
    u: { dur: 40, helpless: 1, dmg: 5, b: 6, g: .2, ang: 85, p: ['crouch', 'uair'],
      tick(f, t, inp) {
        if (t === 6) {
          f.vy = -19; f.ground = null; SFX.play('swing'); shakeCam(6);
          spawn({ owner: f.i, kind: 'jj_web', x: f.x, y: f.y - 6, vx: f.face * .01, r: 80, life: 16, stopped: true, refl: false, dmg: 8, b: 6.5, g: .25, ang: 82, draw: jj_drawWeb });
        }
        if (t > 6) f.vx = inp.x * 4;
      },
      hbAt: (f, t) => t > 7 && t <= 18 ? [[10, -110, 34]] : null },
    // hold B to shape the flame arrow. Only a foe hit by BOTH Dismantle and Cleave lets it "Open"
    d: { dur: 34, p: ['castW', 'cast'],
      start(f) { f.jj_fc = 0; },
      tick(f, t, inp) {
        const h = jj_hand(f);
        if (t === 6 && inp.b && f.jj_fc < 50) { f.jj_fc++; if (f.jj_fc % 3 === 0) fxBurst(h.x, h.y, f.jj_fc % 2 ? FIRE : '#ffd23f', 3, 3, 12); return 'hold'; }
        if (t < 12) { if (t % 2) fxBurst(h.x, h.y, FIRE, 2, 3, 10); return; }
        if (t !== 12) return;
        const foe = jj_foe(f), open = jj_cooked(foe);
        SFX.play(open ? 'boom' : 'fire');
        if (open) { foe.jj_dis = foe.jj_clv = -1e9; flash = 5; shakeCam(12); popText(f.x, f.y - 150, 'OPEN', '#ffd23f'); }
        proj(f, open
          ? { kind: 'jj_fuga', open: 1, vx: 15, r: 40, life: 70, refl: false, dmg: 18, b: 8, g: .55, ang: 35, draw: jj_drawFuga,
            onHit(p, foe) { p.life = 0; const o = fighters[p.owner]; fxBurst(p.x, p.y, FIRE, 30, 12); fxRing(p.x, p.y, '#ffd23f', 90); o.dmg = Math.max(0, o.dmg - 8); popText(o.x, o.y - 140, 'RCT -8%', '#8aff8a'); } }
          : { kind: 'jj_fuga', vx: 9 + f.jj_fc / 10, r: 22, life: 26 + (f.jj_fc >> 1), dmg: Math.round(7 + f.jj_fc / 8), b: 5, g: .35 + f.jj_fc / 250, ang: 35, draw: jj_drawFuga });
      } },
  },
};

// ================= MOCHI =================
function jj_drawDohyo(ctx, p) {
  ctx.globalAlpha = p.life < 60 && p.t % 6 < 3 ? .4 : .9;
  ctx.strokeStyle = '#c8b070'; ctx.lineWidth = 7; ctx.beginPath(); ctx.ellipse(p.x, p.y, 110, 14, 0, 0, 7); ctx.stroke();
  ctx.strokeStyle = '#f4f0e0'; ctx.lineWidth = 2; ctx.stroke(); ctx.globalAlpha = 1;
  if (p.on && p.nap > 20) text('z'.repeat(1 + ((p.t >> 4) % 3)), fighters[p.owner].x + 30, fighters[p.owner].y - 120 - (p.t % 30), 14, '#ffffff');
}
KITS.mochi = {
  desc: 'Sumo cat. Belt throws, tachiai carries to the edge, and a salted ring to defend.',
  specials: ['Uwatenage', 'Tachiai → Yorikiri', 'Shiko Leap (B: stomp)', 'Salt Ring (nap!)'],
  specials_: {
    // command grab on the belt: flips the foe over his shoulder, beats shields
    n: { s: 7, a: 4, e: 22, hb: [[50, -50, 32]], dmg: 0, b: 0, g: 0, ang: 0, p: ['grabW', 'grab'],
      onHit(f, foe) {
        if (f.act !== 'move' || foe.nullify || !jj_grabbable(foe)) return;
        foe.x = f.x - f.face * 55; foe.y = f.y; f.face = -f.face;
        applyHit(f, foe, { dmg: 10, b: 8, g: .12, ang: 82 }, f.face, foe.x, foe.y - 30);
        SFX.play('throw'); shakeCam(7); fxBurst(foe.x, f.y - 5, '#b8a080', 14, 6);
        popText(foe.x, foe.y - 140, 'UWATENAGE!', '#ffffff');
      } },
    // armored charge; on contact he locks up and drives the foe forward, shoving at the edge
    s: { dur: 80, p: ['fsmashW', 'palm'], pose: (f, t) => t < 8 ? POSES.crouch : (t >> 2) % 2 ? POSES.palm : POSES.palm2,
      start(f) { f.jj_carry = 0; },
      tick(f, t) {
        const foe = jj_foe(f);
        if (!f.jj_carry) {
          if (t < 8) return;
          if (t > 30) { f.vx *= .8; return t > 44 ? 'end' : undefined; }
          f.vx = f.face * 11; f.armor = true; if (t % 3 === 0) fxBurst(f.x - f.face * 30, f.y - 5, '#e8e0d0', 2, 2, 12);
          if (canBeHit(foe) && jj_grabbable(foe) && Math.abs(foe.x - (f.x + f.face * 55)) < 45 && Math.abs(foe.y - f.y) < 70) {
            f.jj_carry = t; SFX.play('grab'); shakeCam(6); popText(f.x, f.y - 140, 'TACHIAI!', '#ff9a3a');
          }
          return;
        }
        if (!jj_grabbable(foe)) return 'end';
        const dt = t - f.jj_carry;
        f.armor = true; f.vx = f.face * 7;
        jj_pin(foe, f.x + f.face * 55, f.y);
        const s = f.ground, edge = s && (f.face > 0 ? f.x > s.x2 - 75 : f.x < s.x1 + 75);
        if (edge || dt >= 36 || !f.ground && dt >= 16) {
          applyHit(f, foe, edge ? { dmg: 12, b: 8, g: .5, ang: 30 } : { dmg: 9, b: 7, g: .35, ang: 38 }, f.face, foe.x, foe.y - 55);
          popText(foe.x, foe.y - 140, edge ? 'YORIKIRI!' : 'OSHIDASHI!', '#ff9a3a');
          f.vx = 0; f.jj_carry = 0; f.mt = 44 - 14; // short endlag
        }
      } },
    // big leap; press B on the way to turn it into a meteor shiko stomp with shockwaves
    u: { dur: 120, helpless: 1, dmg: 6, b: 5, g: .2, ang: 80,
      start(f) { f.jj_slam = 0; },
      tick(f, t, inp, E) {
        if (t === 6) { f.vy = -18; f.ground = null; SFX.play('jump'); fxBurst(f.x, f.y, '#e8e0d0', 10, 4); }
        if (t > 6 && !f.jj_slam) f.vx = inp.x * 3.5;
        if (E('b') && t > 12 && !f.jj_slam) { f.jj_slam = t; f.vy = 17; f.vx = 0; SFX.play('swing'); }
        if (!f.jj_slam && t > 38) return 'end';
      },
      hbAt: (f, t) => f.jj_slam ? [[0, 5, 38, { dmg: 11, b: 5, g: .32, ang: -75 }]] : t > 6 && t < 16 ? [[0, -115, 30]] : null,
      onLand(f) { if (f.jj_slam) { quake(f); popText(f.x, f.y - 140, 'SHIKO!', '#ffffff'); } },
      pose: (f, t) => f.jj_slam ? POSES.stomp : t < 6 ? POSES.crouch : POSES.usmash },
    // throw purifying salt (strips foe buffs) and mark a dohyō ring: in it Mochi hits harder,
    // can't be budged mid-attack, and crouching there = cat nap (heals)
    d: { s: 12, a: 0, e: 16, p: ['usmashW', 'victory'],
      tick(f, t) {
        if (t !== 12) return;
        SFX.play('throw');
        for (let i = -2; i <= 2; i++) proj(f, { kind: 'jj_salt', y: -90, vx: i * 2.5, vy: -6 - Math.random() * 2, grav: .35, r: 14, life: 40, onGround: 'vanish', dmg: 2, b: 3, g: .05, ang: 60, draw: drawSalt,
          onHit(p, foe) { p.life = 0; if (foe.buff) { foe.buff = null; popText(foe.x, foe.y - 140, 'PURIFIED', '#ffffff'); fxBurst(foe.x, foe.y - 55, '#ffffff', 16, 6); } } });
        if (!f.ground) return;
        killOwned(f, 'jj_dohyo');
        spawn({ owner: f.i, kind: 'jj_dohyo', x: f.x, y: f.y - 2, r: 1, life: 420, inert: true, refl: false, stopped: true, draw: jj_drawDohyo,
          tick(p) {
            const o = fighters[p.owner];
            if (!jj_alive(o)) { p.life = 0; return; }
            p.on = o.ground && Math.abs(o.x - p.x) < 110 && Math.abs(o.y - p.y) < 20;
            if (!p.on) { p.nap = 0; return; }
            o.buff = { t: 2, spd: 1, pow: 1.1, armor: o.act === 'move' ? 1 : 0, grow: 1, col: '#ffffff', jjRing: 1 };
            if (o.crouch && o.act === 'stand') { if (++p.nap % 30 === 0 && o.dmg > 0) { o.dmg = Math.max(0, o.dmg - 1); fxBurst(o.x, o.y - 80, '#8aff8a', 3, 2, 16); } }
            else p.nap = 0;
          } });
      } },
  },
};

// ================= GLITCH =================
function jj_drawLag(ctx, p) {
  const foe = jj_foe(fighters[p.owner]);
  if (!jj_alive(foe)) return;
  const x = foe.x, y = foe.y - foe.ch.hh / 2, w = foe.ch.hw + 30, h = foe.ch.hh + 20;
  ctx.globalAlpha = .5; pxRect(ctx, x - w / 2 - 6, y - h / 2, w, h, '#ff3bd4'); pxRect(ctx, x - w / 2 + 6, y - h / 2, w, h, '#3bf0ff'); ctx.globalAlpha = 1;
  for (let i = 0; i < 5; i++) pxRect(ctx, x - w / 2 + ((i * 37 + p.t * 5) % w), y - h / 2 + i * h / 5, 18, 6, i % 2 ? '#ffffff' : '#15151a');
  for (let i = 0; i < 8; i++) { const a = i * .785 + p.t * .25; pxRect(ctx, x + Math.cos(a) * 20, y - h / 2 - 30 + Math.sin(a) * 20, 6, 6, i === 0 ? '#ffffff' : '#8a8aa8'); }
  text(p.L.hits ? `LAG x${p.L.hits}` : 'LAG', x, y - h / 2 - 62, 14, '#3bf0ff');
}
// freeze the foe for ~50 frames; every hit taken meanwhile is buffered and released at once
function jj_lag(o, foe) {
  if (owned(o, 'jj_lagT') || !jj_grabbable(foe)) return;
  const L = { x: foe.x, y: foe.y, vx: 0, vy: 0, stun: 0, hits: 0, last: foe.dmg };
  jj_ticker(o, 'jj_lagT', 52, p => {
    if (!jj_grabbable(foe)) { p.life = 0; return; }
    if (foe.dmg > L.last && foe.act === 'hurt' && (foe.vx || foe.vy)) { L.vx += foe.vx; L.vy += foe.vy; L.stun += foe.stun; L.hits++; }
    L.last = foe.dmg;
    if (p.life > 1) { jj_pin(foe, L.x, L.y); return; }
    const m = Math.hypot(L.vx, L.vy), k = m > 32 ? 32 / m : 1;
    foe.vx = L.vx * k; foe.vy = L.vy * k; foe.stun = Math.min(90, L.stun + 8); foe.launch = m * k;
    if (foe.vy < 0) foe.ground = null;
    if (L.hits) { popText(foe.x, foe.y - 140, 'DESYNC!', '#ff3bd4'); SFX.play('laser'); fxBurst(foe.x, foe.y - 55, '#3bf0ff', 20, 9); }
  }, jj_drawLag);
  owned(o, 'jj_lagT').L = L;
  SFX.play('laser', .6);
}
function jj_drawSave(ctx, p) {
  const o = fighters[p.owner], s = o.jj_save; if (!s) return;
  ctx.globalAlpha = .35; pxDisc(ctx, s.x, s.y - 55, 34, '#3bf0ff'); ctx.globalAlpha = 1;
  pxRect(ctx, s.x - 15, s.y - 130, 30, 30, '#2a2a4a'); pxRect(ctx, s.x - 9, s.y - 130, 18, 10, '#c8ccd8'); pxRect(ctx, s.x - 9, s.y - 112, 18, 12, '#ff3bd4');
  pxRect(ctx, s.x - 24, s.y - 94, 48 * p.life / 360, 4, '#3bf0ff');
  ctx.strokeStyle = 'rgba(59,240,255,.35)'; ctx.lineWidth = 3; ctx.beginPath();
  (o.jj_path || []).forEach(([x, y], i) => i ? ctx.lineTo(x, y - 55) : ctx.moveTo(x, y - 55)); ctx.stroke();
}
const JJ_REWIND = { s: 1, a: 0, e: 1, dur: 22, special: 1, multi: 4, dmg: 3, b: 4, g: .05, ang: 60, away: 1,
  grav: (f, t) => t < 17 ? 0 : 1,
  start(f) { f.jj_rw = (f.jj_path || []).slice().reverse(); SFX.play('laser'); },
  tick(f, t) {
    const P = f.jj_rw;
    if (t <= 16) {
      f.intang = true; f.vx = f.vy = 0;
      if (P.length) { const [x, y] = P[Math.min(P.length - 1, Math.floor(t / 16 * P.length))]; f.x = x; f.y = y; f.ground = null; }
      if (t % 2) fxBurst(f.x, f.y - 55, t % 4 ? '#3bf0ff' : '#ff3bd4', 2, 3, 14);
    }
    if (t === 16) {
      const s = f.jj_save;
      if (s) { if (f.dmg > s.dmg) f.dmg = Math.round(s.dmg + (f.dmg - s.dmg) * .5); popText(f.x, f.y - 140, 'CTRL+Z', '#3bf0ff'); }
      f.jumps = f.ch.jumps; f.usedSide = false; f.airdodged = false;
      killOwned(f, 'jj_save'); f.jj_save = null; f.jj_path = null;
    }
  },
  hbAt: (f, t) => t < 16 ? [[0, -55, 42]] : null,
  pose: (f, t) => ({ ...POSES.fall, rot: -t * 24 }),
  drawFx(f, t) { if (t < 16) text('<<', f.x, f.y - 150, 20, '#3bf0ff'); },
};
KITS.glitch = {
  desc: 'Digital ghost. Copy the foe’s move, lag them, noclip, and roll back time.',
  specials: ['Ctrl+C / Ctrl+V', 'Lag Spike', 'Noclip', 'Save / Ctrl+Z'],
  specials_: {
    // foe mid-attack: copy it. Otherwise paste the stored move (2 uses). Empty clipboard: bit shot
    n: { dur: 16, p: ['castW', 'cast'],
      tick(f, t) {
        if (t !== 6) return;
        const foe = jj_foe(f), m = foe.move;
        if (foe.act === 'move' && m && !m.jjPaste && Math.abs(foe.x - f.x) < 600) {
          f.jj_clip = m; f.jj_clipN = 2; SFX.play('laser', .5); popText(f.x, f.y - 140, 'CTRL+C', '#3bf0ff');
          for (let k = 0; k <= 10; k++) fxBurst(foe.x + (f.x - foe.x) * k / 10, foe.y - 55 + (f.y - foe.y) * k / 10, k % 2 ? '#3bf0ff' : '#ff3bd4', 1, 1, 16);
          return;
        }
        if (f.jj_clip) {
          const c = f.jj_clip;
          if (--f.jj_clipN <= 0) f.jj_clip = null;
          popText(f.x, f.y - 140, 'CTRL+V', '#ff3bd4');
          startMove(f, { ...c, jjPaste: 1, alt: undefined,
            start: jj_safe(c.start), tick: c.tick && jj_safe(c.tick, 'end'), hbAt: c.hbAt && jj_safe(c.hbAt, null), onHit: jj_safe(c.onHit),
            dmgFn: c.dmgFn && jj_safe(c.dmgFn, c.dmg), onLand: jj_safe(c.onLand), drawFx: c.drawFx && jj_safe(c.drawFx),
            pose: c.pose && ((g, t2) => jj_safe(c.pose, null)(g, t2) || POSES.cast) });
          return;
        }
        SFX.play('laser');
        for (const vy of [-1.5, 0, 1.5]) proj(f, { kind: 'bits', vx: 11, vy, r: 10, life: 36, dmg: 3, b: 3, g: .1, ang: 30, draw: drawBits });
      } },
    s: { s: 10, a: 0, e: 16, p: ['castW', 'cast'],
      tick(f, t) {
        if (t !== 10) return;
        SFX.play('zap');
        proj(f, { kind: 'jj_lag', vx: 12, r: 18, life: 38, dmg: 3, b: 2, g: 0, ang: 30, draw: drawBits, onHit(p, foe) { p.life = 0; jj_lag(fighters[p.owner], foe); } });
      } },
    // steer a ghost cursor through anything (walls, the stage) — B or timeout snaps Glitch to it
    u: { dur: 48, helpless: 1, dmg: 7, b: 6, g: .3, ang: 70, away: 1,
      grav: (f, t) => f.jj_arrive ? 1 : 0,
      start(f) { f.jj_cur = null; f.jj_arrive = 0; },
      tick(f, t, inp, E) {
        if (f.jj_arrive) return;
        f.vx = f.vy = 0; f.intang = true;
        if (t === 4) { f.jj_cur = { x: f.x, y: f.y }; SFX.play('laser', .5); }
        if (t <= 4) return;
        const d = stickDir(inp), c = f.jj_cur;
        c.x += d.x * 12; c.y += d.y * 12;
        if (t >= 28 || (E('b') && t > 8)) {
          fxBurst(f.x, f.y - 55, '#ff3bd4', 12, 6); teleport(f, c.x, c.y); fxBurst(f.x, f.y - 55, '#3bf0ff', 14, 7);
          SFX.play('zap'); shakeCam(5); f.jj_arrive = t; f.jj_cur = null; if (d.x) f.face = Math.sign(d.x);
        }
      },
      hbAt: (f, t) => f.jj_arrive && t >= f.jj_arrive && t < f.jj_arrive + 4 ? [[0, -55, 48]] : null,
      pose: (f, t) => f.jj_arrive ? POSES.jump : { ...POSES.helpless, rot: (T % 4 < 2 ? 6 : -6) },
      drawFx(f) {
        const c = f.jj_cur; if (!c) return;
        for (const [y, col] of [[f.y - 55, '#ff3bd4'], [c.y - 55, '#3bf0ff']]) { ctx.globalAlpha = .35; pxRect(ctx, Math.min(f.x, c.x) - 200, y - 6 + (T % 3) * 3, Math.abs(c.x - f.x) + 400, 9, col); }
        ctx.globalAlpha = .6; pxDisc(ctx, c.x - 4, c.y - 55, 22, '#ff3bd4'); pxDisc(ctx, c.x + 4, c.y - 55, 22, '#3bf0ff'); pxDisc(ctx, c.x, c.y - 55, 18, '#e8feff'); ctx.globalAlpha = 1;
        pxRect(ctx, c.x - 8, c.y - 60, 5, 7, '#15151a'); pxRect(ctx, c.x + 3, c.y - 60, 5, 7, '#15151a');
      } },
    // first press: save state (6s). Press again: rewind along the recorded path (hitting what's on it),
    // undo half the damage taken since the save and restore jumps
    d: { dur: 18, p: ['counter', 'counter'],
      alt(f) { if (f.jj_save && owned(f, 'jj_save')) { startMove(f, JJ_REWIND); return true; } return false; },
      tick(f, t) {
        if (t !== 6) return;
        f.jj_save = { x: f.x, y: f.y, dmg: f.dmg }; f.jj_path = [[f.x, f.y]];
        SFX.play('beep'); popText(f.x, f.y - 140, 'SAVED', '#3bf0ff'); fxRing(f.x, f.y - 55, '#3bf0ff', 40);
        jj_ticker(f, 'jj_save', 360, p => {
          const o = fighters[p.owner];
          if (!jj_alive(o) || !o.jj_path) { p.life = 0; o.jj_save = null; return; }
          if (p.t % 2 === 0) o.jj_path.push([o.x, o.y]);
          if (p.life <= 1) { o.jj_save = null; o.jj_path = null; }
        }, jj_drawSave);
      } },
  },
};

// ================= TOJI =================
// Heavenly Restriction: zero cursed energy. Domain sure-hits skip him (sureHit in final.js), and his
// Inverted Spear of Heaven (P.pierce) cuts through counters, Infinity, dodges and armor, then nullifies buffs.
function jj_strip(foe) {
  const had = foe.buff || foe.clones || foe.bubbleT > 0 || foe.stealth > 0 || foe.dodgeNext > 0;
  foe.buff = null; foe.clones = null; foe.bubbleT = 0; foe.stealth = 0; foe.dodgeNext = 0;
  if (had) popText(foe.x, foe.y - 160, 'TECHNIQUE NULLIFIED', '#d8d4e8');
}
KITS.toji = {
  desc: 'Zero cursed energy: domains can\'t sure-hit him. The Inverted Spear pierces any technique. Vanish, then ambush.',
  specials: ['Playful Cloud', 'Inverted Spear of Heaven', 'Heavenly Leap', 'Vanish (ambush)'],
  specials_: {
    // three-section staff: a whirl of hits ending in a heavy crack
    n: { s: 11, a: 12, e: 20, multi: 4, dmg: 2, b: 3, g: .05, ang: 45, p: ['fsmashW', 'fsmash'],
      hbAt: (f, t) => t > 9 && t <= 21 ? (t > 17 ? [[80, -60, 34, { dmg: 6, b: 6, g: .45, ang: 40 }]] : [[80, -60, 30], [45, -60, 22]]) : null,
      tick(f, t) { if (t === 10) SFX.play('swing'); if (t === 18) { SFX.play('swing', 1.3); shakeCam(4); } },
      drawFx(f, t) {
        if (t <= 9 || t > 21) return; const x = f.x + f.face * 45, y = f.y - 60;
        for (let k = 0; k < 3; k++) { const a = t * .9 + k * 2.1, x1 = x + Math.cos(a) * 40, y1 = y + Math.sin(a) * 40; ctx.strokeStyle = '#d8263a'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x1, y1); ctx.stroke(); pxDisc(ctx, x1, y1, 5, '#f2c14e'); }
      } },
    // lunge with the Inverted Spear: ignores counters/Infinity/armor and strips the foe's active techniques
    s: { s: 7, a: 10, e: 18, pierce: 1, dmg: 12, b: 6, g: .55, ang: 38, p: ['fsmashW', 'dash'],
      hbAt: (f, t) => t > 7 && t <= 17 ? [[60, -60, 30]] : null,
      tick(f, t) { if (t === 8) SFX.play('swing', 1.4); if (t > 7 && t <= 17) { f.vx = f.face * 16; f.vy = Math.min(f.vy, 0); if (t % 2) fxBurst(f.x - f.face * 20, f.y - 60, '#b8b0c8', 2, 3); } },
      onHit(f, foe) { jj_strip(foe); },
      drawFx(f, t) { if (t > 7 && t <= 17) jj_line(ctx, f.x + f.face * 20, f.y - 62, f.x + f.face * 95, f.y - 60, 5, '#d8d4e8'); } },
    u: mRise({ vy: -21, col: '#b8b0c8', dmg: 3, fin: 7 }),
    // no cursed energy to sense: turns (almost) invisible and untouchable until he attacks; the ambush hits harder
    d: { s: 6, a: 0, e: 10, p: ['crouch', 'crouch'],
      tick(f, t) {
        if (t !== 6) return;
        if ((f.tj_cd || 0) > T) { popText(f.x, f.y - 140, '...', '#888888'); return; }
        f.tj_cd = T + 300; f.stealth = 70; f.buff = { t: 120, pow: 1.35, spd: 1.2, col: '#6a6f7a' };
        SFX.play('shadow'); fxBurst(f.x, f.y - 55, '#6a6f7a', 14, 5); popText(f.x, f.y - 150, 'VANISHED', '#b8b0c8');
      } },
  },
};

// ================= HIGURUMA =================
// His gavel (it can grow to any size) and the courtroom domain (see FINALS.higuruma: crime -> verdict -> Confiscation / Executioner's Sword).
WEAPONS.gavel = (g, A) => {
  const d = dirv(A.ang, 1), n = { x: d.y, y: -d.x }, tip = add(A.h, { x: d.x * 9, y: d.y * 9 });
  limb(g, A.h, tip, 1.4, '#6a4a2a');
  limb(g, add(tip, { x: n.x * 3.5, y: n.y * 3.5 }), add(tip, { x: -n.x * 3.5, y: -n.y * 3.5 }), 4, '#8a5a2a');
  limb(g, add(tip, { x: n.x * 3.8, y: n.y * 3.8 }), add(tip, { x: n.x * 2.6, y: n.y * 2.6 }), 4.4, '#f2c14e');
};
function jj_bigGavel(x, y, a, s) { // the enlarged gavel, drawn in world space
  ctx.save(); ctx.translate(x, y); ctx.rotate(a);
  pxRect(ctx, -5 * s, -60 * s, 10 * s, 60 * s, '#6a4a2a'); pxRect(ctx, -26 * s, -88 * s, 52 * s, 30 * s, '#8a5a2a'); pxRect(ctx, -26 * s, -88 * s, 8 * s, 30 * s, '#f2c14e'); pxRect(ctx, 18 * s, -88 * s, 8 * s, 30 * s, '#f2c14e');
  ctx.restore();
}
KITS.higuruma = {
  desc: 'His gavel grows to crush. Objection! counters. His domain puts you on trial for what you actually did this match.',
  specials: ['Gavel Smash', 'Gavel Throw', 'Rising Gavel', 'Objection!'],
  specials_: {
    // the gavel swells mid-swing into a huge hammer
    n: { s: 13, a: 5, e: 20, hb: [[75, -45, 42]], dmg: 14, b: 6, g: .5, ang: 45, p: ['fsmashW', 'fsmash'],
      tick(f, t) { if (t === 14) { SFX.play('rock'); shakeCam(6); fxBurst(f.x + f.face * 80, f.y - 10, '#f2c14e', 10, 6); } },
      drawFx(f, t) { if (t > 6 && t <= 22) jj_bigGavel(f.x + f.face * 20, f.y - 60, f.face * (t <= 13 ? -1.2 : Math.min(1.6, -1.2 + (t - 13) * .7)), 1 + Math.min(1, t / 13) * .6); } },
    s: { s: 10, a: 0, e: 16, p: ['castW', 'cast'], tick(f, t) {
      if (t !== 10) return; SFX.play('throw');
      proj(f, { kind: 'hg_gavel', vx: 12, vy: -3, grav: .15, r: 20, life: 45, dmg: 8, b: 5, g: .3, ang: 40, draw: (c, p) => jj_bigGavel(p.x, p.y + 30, p.t * .5, .6) });
    } },
    u: mRise({ vy: -19, col: '#f2c14e', dmg: 3, fin: 7 }),
    d: { ...mCounter('#f2c14e'), start(f) { popText(f.x, f.y - 150, 'OBJECTION!', '#f2c14e'); } },
  },
};

// ================= HAKARI =================
KITS.hakari = {
  desc: 'Rough-energy brawler. Roll the Dice for a hot streak. His domain is a pachinko machine: hit the jackpot and he regenerates nonstop.',
  specials: ['Shutter Doors', 'Rough Energy Rush', 'Rising Knee', 'Roll the Dice'],
  specials_: {
    // two train-style shutter doors slam shut in front of him
    n: { s: 8, a: 0, e: 18, p: ['castW', 'cast'], tick(f, t) {
      if (t !== 8) return; SFX.play('grab');
      spawn({ owner: f.i, kind: 'hk_door', x: f.x + f.face * 130, y: f.y - 60, stopped: true, inert: true, refl: false, r: 44, life: 30, dmg: 11, b: 6, g: .42, ang: 50,
        tick(p) { if (p.t === 12) { p.inert = false; SFX.play('rock'); shakeCam(5); } },
        draw(c, p) { const k = Math.min(1, p.t / 12) * 44; pxRect(c, p.x - 90 + k, p.y - 60, 44, 120, '#c8ccd8'); pxRect(c, p.x + 46 - k, p.y - 60, 44, 120, '#c8ccd8'); pxRect(c, p.x - 80 + k, p.y - 40, 24, 30, '#8ac8ff'); pxRect(c, p.x + 56 - k, p.y - 40, 24, 30, '#8ac8ff'); } });
    } },
    s: mDash({ s: 7, a: 14, spd: 13, dmg: 10, b: 6, g: .45, ang: 38, fx: '#6dff8a' }),
    u: mRise({ vy: -19, col: '#6dff8a', dmg: 3, fin: 7, pose: 'uair' }),
    // a quick gamble (every 6s): HOT MODE (power + speed), a small heal, or nothing
    d: { s: 20, a: 0, e: 10, p: ['counter', 'victory'], tick(f, t) {
      if (t < 20 && t % 4 === 0) popText(f.x, f.y - 150, String(1 + Math.random() * 9 | 0), '#ffd23f');
      if (t !== 20) return;
      if ((f.hk_cd || 0) > T) { popText(f.x, f.y - 150, 'OUT OF BALLS', '#888888'); return; }
      f.hk_cd = T + 360; const r = Math.random();
      if (r < .34) { f.buff = { t: 300, pow: 1.2, spd: 1.15, col: '#6dff8a' }; popText(f.x, f.y - 170, 'HOT MODE!', '#6dff8a'); SFX.play('confirm'); fxRing(f.x, f.y - 55, '#6dff8a', 70); }
      else if (r < .67) { f.dmg = Math.max(0, f.dmg - 8); popText(f.x, f.y - 170, 'REACH! -8%', '#ffd23f'); SFX.play('counter', .6); }
      else popText(f.x, f.y - 170, 'MISS...', '#888888');
    } },
  },
};

// ================= YUTA =================
// Rika's Copy: he borrows the foe's own side special. Cursed Speech (copied from Inumaki) freezes them in place.
function jj_drawRika(x, y, face, k) { // Rika's huge pale arm and clawed hand reaching out of the dark
  ctx.globalAlpha = Math.min(1, k); pxDisc(ctx, x - face * 40, y - 70, 46, '#2a1a30');
  pxRect(ctx, Math.min(x - face * 30, x + face * 50), y - 40, 80, 26, '#e8e0e8');
  for (let j = 0; j < 4; j++) pxRect(ctx, x + face * (50 + (j % 2) * 8) - 5, y - 46 + j * 9, 30 * (face > 0 ? 1 : -1), 6, '#f4eef4');
  pxDisc(ctx, x - face * 52, y - 80, 8, '#ff5aa8'); ctx.globalAlpha = 1;
}
KITS.yuta = {
  desc: 'Cursed Speech stops foes cold. Copy borrows THEIR side special. Summon Rika for a crushing swipe.',
  specials: ['Cursed Speech: Don\'t Move', 'Copy (their →B)', 'Rika Lift', 'Rika!'],
  specials_: {
    // "DON'T MOVE": a foe in front (and close) is frozen for a moment. Strains his throat: once every 5s
    n: { s: 10, a: 0, e: 18, p: ['castW', 'cast'], tick(f, t) {
      if (t !== 10) return;
      if ((f.yt_cd || 0) > T) { popText(f.x, f.y - 140, '*cough*', '#888888'); return; }
      f.yt_cd = T + 300; const foe = jj_foe(f), dx = (foe.x - f.x) * f.face;
      popText(f.x, f.y - 150, "DON'T MOVE!", '#8ac8ff'); SFX.play('zap'); fxRing(f.x + f.face * 30, f.y - 70, '#8ac8ff', 50);
      if (canBeHit(foe) && dx > -30 && dx < 320 && Math.abs(foe.y - f.y) < 150 && !['shield', 'held', 'hold', 'ledge', 'final'].includes(foe.act)) { setAct(foe, 'dizzy'); foe.stun = 40; foe.vx = 0; }
    } },
    // Copy: perform the foe's own side special (a mirror Yuta just gets a Rika-charged slash)
    s: { dur: 8, p: ['castW', 'cast'], tick(f, t) {
      if (t !== 4) return;
      const foe = jj_foe(f), c = foe.ch.id === 'yuta' ? null : foe.ch.moves.sspec;
      popText(f.x, f.y - 150, c ? 'COPY: ' + foe.ch.specials[1].toUpperCase() : 'COPY: ???', '#8ac8ff'); fxBurst(f.x, f.y - 60, '#8ac8ff', 10, 4);
      if (!c) return startMove(f, { ...mDash({ spd: 14, dmg: 11, b: 6, g: .45, ang: 38 }), special: 1 });
      startMove(f, { ...c, jjPaste: 1, alt: undefined,
        start: jj_safe(c.start), tick: c.tick && jj_safe(c.tick, 'end'), hbAt: c.hbAt && jj_safe(c.hbAt, null), onHit: jj_safe(c.onHit),
        dmgFn: c.dmgFn && jj_safe(c.dmgFn, c.dmg), onLand: jj_safe(c.onLand), drawFx: c.drawFx && jj_safe(c.drawFx),
        pose: c.pose && ((g, t2) => jj_safe(c.pose, null)(g, t2) || POSES.cast) });
    } },
    u: mRise({ vy: -20, col: '#8ac8ff', dmg: 3, fin: 7 }),
    // Rika lunges out of his shadow and swipes: big, slow, strong
    d: { s: 16, a: 6, e: 20, hb: [[95, -70, 58]], dmg: 14, b: 7, g: .5, ang: 45, p: ['counter', 'cast'],
      tick(f, t) { if (t === 2) SFX.play('shadow'); if (t === 17) { SFX.play('boom', .6); shakeCam(8); } },
      drawFx(f, t) { if (t <= 26) jj_drawRika(f.x + f.face * (t < 16 ? 20 + t * 2 : 60), f.y, f.face, t / 8); } },
  },
};
