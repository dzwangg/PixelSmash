// Engine: input, fighter state machine, combat, CPU, camera, menus, rendering.
const cv = document.getElementById('c');
let ctx = cv.getContext('2d', { alpha: false, desynchronized: true }); // low-latency canvas: frames go to the screen without extra buffering
const W = 1280, H = 720; // logical resolution; the backing canvas matches the real display size
let K = 1; // real pixels per logical pixel
function fitCanvas() {
  const r = cv.getBoundingClientRect(), dpr = QUALITY === 'high' ? Math.min(2, window.devicePixelRatio || 1) : .75; // fast mode renders fewer pixels
  const w = Math.round(r.width * dpr) || W;
  if (cv.width !== w) { cv.width = w; cv.height = Math.round(w * 9 / 16); }
  K = cv.width / W;
}
const setT = (sx, sy, tx, ty) => ctx.setTransform(sx * K, 0, 0, sy * K, tx * K, ty * K);
const SLOT_COLORS = ['#ff4b4b', '#3b9bff'];
const STOCKS = 3;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const Q = new URLSearchParams(location.search);

let T = 0, state = 'title', errMsg = '';
let fighters = [], projectiles = [], particles = [], beams = [];
let stage = STAGES[0], stageArt = null;
const arts = {};
const cam = { x: 0, y: -200, z: 1 };
let freeze = 0, shake = 0, flash = 0, countdown = 0, goT = 0, endT = 0, winner = -1;
const cpu = [false, false];
const sel = [{ cur: 0, locked: false }, { cur: 1, locked: false }];
let stageCur = 0, readyT = 0, paused = false, resT = 0;
const cpuLv = [2, 2]; // CPU difficulty 1-3
addEventListener('error', e => { errMsg = String(e.message); });

// ================= INPUT =================
const blank = () => ({ x: 0, y: 0, a: 0, b: 0, j: 0, s: 0, p: 0 });
const padIn = [blank(), blank()];
const latch = [{}, {}]; // buttons pressed since the last tick, so a quick tap between two ticks is never lost
let padsConnected = [false, false], padUrl = '', sock = null;
(function connect() {
  sock = new WebSocket(`ws://${location.host}/?role=screen`);
  sock.onmessage = e => {
    const m = JSON.parse(e.data);
    if (m.type === 'input') { padIn[m.slot] = m.input; for (const k of 'abjsp') if (m.input[k]) latch[m.slot][k] = 1; }
    if (m.type === 'pads') {
      padsConnected = m.connected; padUrl = m.padUrl;
      m.connected.forEach((c, i) => { if (!c) padIn[i] = blank(); else if (cpu[i]) { cpu[i] = false; sel[i].locked = false; } });
    }
  };
  sock.onclose = () => setTimeout(connect, 1000);
})();
const toPad = (slot, msg) => { if (sock && sock.readyState === 1) sock.send(JSON.stringify({ slot, ...msg })); };

const keys = new Set();
addEventListener('keydown', e => { keys.add(e.code); if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault(); });
addEventListener('keyup', e => keys.delete(e.code));
addEventListener('keydown', e => { if (e.code === 'KeyQ') { try { localStorage.setItem('quality', QUALITY === 'high' ? 'fast' : 'high'); } catch {} location.reload(); } });
const KEYMAP = [
  { l: 'KeyA', r: 'KeyD', u: 'KeyW', d: 'KeyS', a: 'KeyF', b: 'KeyG', j: 'Space', s: 'KeyH' },
  { l: 'ArrowLeft', r: 'ArrowRight', u: 'ArrowUp', d: 'ArrowDown', a: 'KeyK', b: 'KeyL', j: 'KeyI', s: 'KeyO' },
];
function readInput(i) {
  if (cpu[i]) return state === 'fight' && fighters[i] ? cpuInput(fighters[i]) : blank();
  const p = padIn[i], L = latch[i], k = KEYMAP[i], h = c => keys.has(c) ? 1 : 0;
  const kx = h(k.r) - h(k.l), ky = h(k.d) - h(k.u);
  return { x: kx || p.x || 0, y: ky || p.y || 0, a: p.a || L.a || h(k.a) || (i === 0 ? h('Enter') : 0), b: p.b || L.b || h(k.b), j: p.j || L.j || h(k.j), s: p.s || L.s || h(k.s),
    p: p.p || L.p || h('Escape') || (i === 0 ? h('KeyP') : 0) };
}
const menuPrev = [blank(), blank()];
function menuInputs() {
  return [0, 1].map(i => {
    const cur = cpu[i] ? blank() : readInput(i), prev = menuPrev[i]; menuPrev[i] = cur;
    const d = v => Math.abs(v) > .6 ? Math.sign(v) : 0;
    return { a: cur.a && !prev.a, b: cur.b && !prev.b, j: cur.j && !prev.j, p: cur.p && !prev.p, s: cur.s && !prev.s,
      nx: d(cur.x) !== d(prev.x) ? d(cur.x) : 0, ny: d(cur.y) !== d(prev.y) ? d(cur.y) : 0 };
  });
}

// ================= EFFECTS =================
function fxBurst(x, y, c, n, spd, life = 24) {
  for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, s = spd * (.3 + Math.random() * .7); particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life, max: life, c, sz: PX * (1 + (Math.random() * 2 | 0)) }); }
}
function fxRing(x, y, c, r) { particles.push({ x, y, ring: r, life: 14, max: 14, c }); }
function shakeCam(n) { shake = Math.max(shake, n); }
function popText(x, y, s, c) { particles.push({ x, y, vx: 0, vy: -1.2, life: 60, max: 60, text: s, c }); }

// ================= STAGE HELPERS =================
const surfaces = () => [stage.main, ...stage.plats, ...projectiles.filter(p => p.plat && p.life > 0)]; // p.plat: a drawn platform (Inky)
function groundAt(x, y) { for (const s of surfaces()) if (x >= s.x1 && x <= s.x2 && Math.abs(s.y - y) < 30) return s.y; return null; }
const inMain = (x, y) => { const M = stage.main; return x > M.x1 && x < M.x2 && y > M.y + 2 && y < M.y + M.depth; };
function teleport(f, nx, ny) {
  const M = stage.main;
  if (nx > M.x1 && nx < M.x2 && ((f.y <= M.y && ny > M.y) || inMain(nx, ny) || inMain(nx, ny - 50))) ny = M.y;
  f.x = nx; f.y = ny; f.ground = null;
}
const ledges = () => [{ x: stage.main.x1, y: stage.main.y, dir: 1 }, { x: stage.main.x2, y: stage.main.y, dir: -1 }];

// ================= FIGHTERS =================
function newFighter(i, ch) {
  return { i, ch, x: stage.spawn[i], y: 0, vx: 0, vy: 0, face: i ? -1 : 1, ground: stage.main, jumps: ch.jumps, dmg: 0, stocks: STOCKS,
    act: 'stand', t: 0, move: null, mt: 0, hitT: -99, hitDone: false, charge: 0, stun: 0, inv: 0, shield: 60, sstun: 0,
    holding: null, heldBy: null, holdT: 0, usedSide: false, airdodged: false, floatT: ch.float || 0, ff: false, dropT: 0, ledgeCD: 0,
    landT: 0, store: 0, fuel: ch.fuel, prev: blank(), hudShake: 0, hitFlash: 0, runPh: 0, djT: 99, launch: 0, rotT: 0, lastHitBy: -1,
    stats: { kos: 0, falls: 0, dealt: 0 } };
}
function setAct(f, a) { f.act = a; f.t = 0; if (a !== 'move') f.move = null; }
function startMove(f, m) { setAct(f, 'move'); f.move = m; f.moveId = (f.moveId || 0) + 1; f.stealth = 0; f.hitCancel = false; f.mt = 0; f.hitT = -99; f.hitDone = false; f.charge = 0; m.start?.(f); }
function endMove(f) { const m = f.move; f.charge = 0; if (m.special && f.buf) f.buf.b = 0; /* a leftover follow-up B press should not start a new special */ setAct(f, m.helpless && !f.ground ? 'helpless' : f.ground ? 'stand' : 'air'); }

function doubleJump(f, inp) {
  f.jumps--; f.glide = false; f.vy = -f.ch.djump; f.vx = inp.x * f.ch.air; f.ff = false; f.djT = 0; f.jumpHeld = true;
  setAct(f, 'air'); SFX.play('djump'); fxRing(f.x, f.y, '#ffffff', 30);
}
function jump(f) { f.glide = false; f.vy = -f.ch.jump; f.ground = null; f.jumpHeld = true; setAct(f, 'air'); SFX.play('jump'); fxBurst(f.x, f.y, '#e8e0d0', 6, 3, 14); }
function pickGround(f, inp) {
  const m = f.ch.moves, ax = Math.abs(inp.x), ay = Math.abs(inp.y);
  if (f.running && ax > .6 && ay < .5) { f.face = Math.sign(inp.x); return m.dashAtk; }
  if (ay > ax && ay > .4) return inp.y < 0 ? (ay > .8 ? m.usmash : m.utilt) : (ay > .8 ? m.dsmash : m.dtilt);
  if (ax > .35) { f.face = Math.sign(inp.x); return ax > .8 ? m.fsmash : m.ftilt; }
  return m.jab;
}
function pickAir(f, inp) {
  const m = f.ch.moves;
  if (Math.hypot(inp.x, inp.y) < .4) return m.nair;
  if (Math.abs(inp.y) > Math.abs(inp.x)) return inp.y < 0 ? m.uair : m.dair;
  return inp.x * f.face > 0 ? m.fair : m.bair;
}
function groundAttack(f, inp) { startMove(f, pickGround(f, inp)); }
function airAttack(f, inp) { startMove(f, pickAir(f, inp)); }
function special(f, inp) {
  // Confiscation (Higuruma's verdict): no specials and no Final Smash until it wears off
  if (f.confT > 0) { if (T % 20 === 0) popText(f.x, f.y - f.ch.hh - 50, 'CONFISCATED', '#f2c14e'); return; }
  if (f.hasFS) return startFinal(f);
  const m = f.ch.moves, ax = Math.abs(inp.x);
  const use = mv => {
    if (mv.alt && mv.alt(f)) return; // second press of a gadget special (detonate, recall, warp)
    if (mv.airUses && !f.ground) { f.uses ??= new Map(); const n = f.uses.get(mv) || 0; if (n >= mv.airUses) return; f.uses.set(mv, n + 1); }
    startMove(f, mv);
  };
  if (inp.y < -.5 && -inp.y >= ax * .7) return use(m.uspec);
  if (inp.y > .5 && inp.y >= ax * .7) return use(m.dspec);
  if (ax > .5) {
    if (m.sspec.alt && m.sspec.alt(f)) return;
    if (!f.ground && f.usedSide) return;
    f.face = Math.sign(inp.x); if (!f.ground) f.usedSide = true;
    return use(m.sspec);
  }
  use(m.nspec);
}

// Input buffer: a press stays usable for 8 frames (recorded even during hit-freeze), so follow-ups
// pressed a little early still come out on the first possible frame.
function bufferInput(f, inp, frozen) {
  f.buf ??= { a: 0, b: 0, j: 0, s: 0 };
  const pv = f.bprev || blank();
  for (const k in f.buf) { if (inp[k] && !pv[k]) f.buf[k] = 8; else if (f.buf[k] > 0 && !frozen) f.buf[k]--; }
  f.bprev = inp;
}
function breakFree(f) {
  Object.assign(f, { stuckT: 0, stun: 0, bubbleT: 0, slowT: 0, gravFlip: 0, invert: 0, airdodged: false });
  setAct(f, f.ground ? 'stand' : 'air'); f.vx *= .3; if (!f.ground) f.vy = Math.min(f.vy, -4);
  f.inv = Math.max(f.inv, 60); f.jumps = Math.max(f.jumps, 1);
  popText(f.x, f.y - f.ch.hh - 40, 'BREAK FREE!', '#ffffff'); fxRing(f.x, f.y - 55, '#ffffff', 70); SFX.play('counter');
}
function step(f, inp) {
  if (f.invert > 0) { f.invert--; inp = { ...inp, x: -inp.x }; }
  f.inp = inp;
  const prev = f.prev; f.prev = inp;
  f.buf ??= { a: 0, b: 0, j: 0, s: 0 };
  const E = k => f.buf[k] > 0 ? (f.buf[k] = 0, true) : false; // buffered press (consumed when used)
  const ch = f.ch;
  f.t++;
  // a combo ends when the victim is no longer stunned
  if (f.combo && !['hurt', 'locked', 'frozen', 'dizzy'].includes(f.act)) {
    if (f.combo > 1) { const a = fighters[f.comboBy]; popText(f.x, f.y - f.ch.hh - 60, `${f.combo} HIT COMBO! ${Math.round(f.comboDmg)}%`, SLOT_COLORS[f.comboBy]); a.stats.best = Math.max(a.stats.best || 0, f.combo); }
    f.combo = 0;
  }
  f.reflect = f.counter = f.armor = f.intang = f.bats = f.jet = f.floating = f.crouch = f.nullify = f.subst = f.blockFront = false;
  if (f.inv > 0) f.inv--;
  if (f.ledgeCD > 0) f.ledgeCD--;
  if (f.dropT > 0) f.dropT--;
  if (f.hitFlash > 0) f.hitFlash--;
  if (f.hudShake > 0) f.hudShake--;
  if (f.act !== 'shield' && f.shield < 60) f.shield = Math.min(60, f.shield + .1);
  f.djT++;
  (f.hist ??= []).push([f.x, f.y]); if (f.hist.length > 60) f.hist.shift();
  if (f.buff && --f.buff.t <= 0) f.buff = null;
  if (f.fsBuff && --f.fsBuff.t <= 0) f.fsBuff = null; // Final Smash boosts live in their own slot so specials can't overwrite them
  for (const k of ['slowT', 'gravFlip', 'shrink', 'beat', 'dodgeNext', 'stealth', 'lowGrav', 'confT', 'execT']) if (f[k] > 0) f[k]--;
  if (f.clones && --f.clones.t <= 0) f.clones = null;
  if (f.sleep > 0 && --f.sleep === 0 && f.act === 'locked') setAct(f, f.ground ? 'stand' : 'air');
  if (f.bubbleT > 0) { f.y -= 1.5; f.ground = null; if (--f.bubbleT === 0 && f.act === 'locked') setAct(f, 'air'); }
  if (f.stealth > 0) f.intang = true;
  // Break free: nobody stays stuck (stunned/pinned/frozen/dazed) for more than ~2.5s in a row. Mashing helps.
  const foeF = fighters[1 - f.i];
  if (f.act !== 'dizzy') f.sbreak = false;
  const stuck = ['hurt', 'locked', 'frozen', 'dizzy'].includes(f.act) && !f.sbreak && !f.iced && !f.sleep && foeF?.act !== 'final';
  f.stuckNow = stuck;
  if (stuck) { f.stuckT = (f.stuckT || 0) + 1; if (['a', 'b', 'j', 's'].some(k => inp[k] && !prev[k])) f.stuckT += 7; }
  else f.stuckT = Math.max(0, (f.stuckT || 0) - 3);
  if (f.stuckT > 150) breakFree(f);

  switch (f.act) {
    case 'dead': if (--f.t2 <= 0) { if (f.stocks > 0) respawn(f); else f.act = 'out'; } return;
    case 'out': return;
    case 'final': finalStep(f); return;
    case 'locked': return;
    case 'respawn':
      f.vx = f.vy = 0;
      if (f.t > 150 || Math.abs(inp.x) > .3 || inp.y > .5 || E('j') || E('a') || E('b')) { setAct(f, 'air'); f.inv = 100; }
      return;
    case 'stand': {
      if (!f.ground) { setAct(f, 'air'); f.coyote = 6; break; }
      f.running = Math.abs(f.vx) > ch.walk * .95;
      if (inp.s && f.shield > 5) { if (E('a')) { startMove(f, ch.moves.grab); break; } setAct(f, 'shield'); break; }
      if (E('a')) { groundAttack(f, inp); break; }
      if (E('b')) { special(f, inp); break; }
      if (E('j')) { jump(f); break; }
      if (inp.y > .75 && prev.y <= .75 && f.ground.soft) { f.ground = null; f.dropT = 14; setAct(f, 'air'); break; }
      f.crouch = inp.y > .5;
      if (!f.crouch && Math.abs(inp.x) > .2) {
        const run = Math.abs(inp.x) > .75, target = inp.x * ch.walk * (run ? 1.3 : .65) * spdMul(f);
        if (run && Math.abs(prev.x) <= .5 && !f.running) { f.vx = Math.sign(inp.x) * ch.walk * 1.55 * spdMul(f); f.dashT = 8; fxBurst(f.x - Math.sign(inp.x) * 20, f.y - 4, '#e8e0d0', 4, 2.5, 14); } // dash burst
        else if (f.running && Math.sign(inp.x) !== Math.sign(f.vx)) { f.vx *= -.3; fxBurst(f.x, f.y - 4, '#e8e0d0', 3, 2, 12); } // pivot
        f.vx += (target - f.vx) * (f.dashT > 0 ? .06 : .35); f.face = Math.sign(inp.x);
        if (run && T % 9 === 0) fxBurst(f.x - f.face * 20, f.y - 4, '#e8e0d0', 1, 1.5, 16);
      } else f.vx *= stage.fric ?? .72; // icy stages keep you sliding
      if (f.dashT > 0) f.dashT--;
      f.runPh += Math.abs(f.vx) * .06;
      break;
    }
    case 'air': {
      if (f.coyote > 0) { f.coyote--; if (E('j')) { f.coyote = 0; jump(f); break; } } // late jump after walking off
      if (E('a')) { airAttack(f, inp); break; }
      if (E('b')) { special(f, inp); break; }
      if (E('s') && !f.airdodged) { airdodge(f, inp); break; }
      if (f.jumps > 0 && E('j')) doubleJump(f, inp);
      if (f.jumpHeld && !inp.j) { if (f.t < 4 && f.vy < 0 && f.djT > 20) f.vy *= .55; f.jumpHeld = false; } // only a very quick tap short-hops
      if (ch.float && inp.j && f.vy >= 0 && f.floatT > 0) { f.vy = 0; f.floatT--; f.floating = true; if (T % 6 === 0) fxBurst(f.x, f.y, '#b06cff', 1, 1, 14); }
      airDrift(f, inp, prev);
      break;
    }
    case 'move': runMove(f, inp, E, prev); break;
    case 'land': f.vx *= .8; if (f.t >= f.landT) setAct(f, 'stand'); break;
    case 'shield': {
      f.vx *= .8;
      if (f.sstun > 0) { f.sstun--; break; }
      if (!inp.s) { setAct(f, 'land'); f.landT = 6; break; } // dropping shield is punishable
      f.shield -= .16;
      if (f.shield <= 0) { shieldBreak(f); break; }
      if (E('a')) { startMove(f, ch.moves.grab); break; }
      if (E('j')) { jump(f); break; }
      if (inp.y > .7 && prev.y <= .7) { dodge(f, 0); break; }
      if (Math.abs(inp.x) > .7 && Math.abs(prev.x) <= .7) { dodge(f, Math.sign(inp.x)); break; }
      break;
    }
    case 'dodge':
      f.vx = f.t <= 18 && f.dodgeDir ? f.dodgeDir * 9 * (1 - f.t / 22) : f.vx * .7;
      if (f.t >= 24) { if (f.dodgeDir) f.face = -f.dodgeDir; setAct(f, 'stand'); }
      break;
    case 'airdodge':
      if (f.adDir && f.t < 20) { f.vx *= .88; f.vy *= .88; }
      if (f.t >= 30) setAct(f, 'air');
      break;
    case 'hurt':
      if (f.ground) f.vx *= .85; else { f.vx *= .98; f.vy *= .985; }
      f.rotT += f.launch > 13 ? 18 : 0;
      if (f.launch > 10 && T % 2 === 0 && Math.hypot(f.vx, f.vy) > 7) particles.push({ x: f.x, y: f.y - 50, vx: 0, vy: -.5, life: 30, max: 30, c: '#d8d8e8', sz: PX * 3 });
      if (--f.stun <= 0) setAct(f, f.ground ? 'stand' : 'air');
      break;
    case 'frozen': if (f.ground) f.vx *= .9; if (--f.stun <= 0) { setAct(f, f.ground ? 'stand' : 'air'); fxBurst(f.x, f.y - 50, '#e8feff', 12, 5); SFX.play('ice'); } break;
    case 'dizzy': f.vx *= .8; if (--f.stun <= 0) setAct(f, f.ground ? 'stand' : 'air'); break;
    case 'helpless': f.vx = clamp(f.vx + inp.x * .3, -ch.air * .7, ch.air * .7); break;
    case 'ledge': return ledgeControl(f, inp, E, prev);
    case 'climb': {
      const L = f.ledge, k = Math.min(1, f.t / 14);
      f.x = L.x - L.dir * 22 + L.dir * 52 * k; f.y = L.y + ch.hh * .75 * (1 - k) ; f.inv = Math.max(f.inv, 2);
      if (f.t >= 14) { f.ground = stage.main; f.y = L.y; f.vx = f.vy = 0; setAct(f, 'stand'); if (f.climbAtk) { f.climbAtk = false; startMove(f, ch.moves.ledgeAtk); } }
      return;
    }
    case 'hold': holdControl(f, inp, E); break;
    case 'held': {
      const h = f.heldBy;
      if (!h || h.act !== 'hold') { f.heldBy = null; setAct(f, f.ground ? 'stand' : 'air'); break; }
      if (E('a') || E('b') || E('j') || Math.abs(inp.x - prev.x) > .5) h.holdT -= 5;
      return;
    }
  }
  physics(f, inp);
}

const spdMul = f => (f.buff?.spd || 1) * (f.fsBuff?.spd || 1) * (f.slowT > 0 ? .45 : 1) * (f.shrink > 0 ? .85 : 1);
const SC = f => (f.buff?.grow || 1) * (f.fsBuff?.grow || 1) * (f.shrink > 0 ? .55 : 1); // fighter size multiplier
function airDrift(f, inp, prev) {
  const ch = f.ch, target = inp.x * ch.air * spdMul(f);
  if (Math.abs(inp.x) > .2) f.vx += clamp(target - f.vx, -.65, .65); else f.vx *= .97;
  if (inp.y > .7 && prev.y <= .7 && f.vy > -3) f.ff = true;
}
function airdodge(f, inp) {
  setAct(f, 'airdodge'); f.airdodged = true; f.inv = 22;
  const m = Math.hypot(inp.x, inp.y);
  f.adDir = m > .3 ? { x: inp.x / m, y: inp.y / m } : null;
  if (f.adDir) { f.vx = f.adDir.x * 11; f.vy = f.adDir.y * 11; }
}
function dodge(f, dir) { setAct(f, 'dodge'); f.dodgeDir = dir; f.inv = dir ? 14 : 18; }
function shieldBreak(f) { setAct(f, 'dizzy'); f.sbreak = true; f.stun = 220; f.vy = -13; f.ground = null; f.shield = 30; SFX.play('break'); fxBurst(f.x, f.y - 55, f.ch.color, 30, 9); shakeCam(10); }

function runMove(f, inp, E, prev) {
  const m = f.move;
  if (f.ground) f.vx *= m.slide ? .95 : .82; else airDrift(f, inp, prev);
  if (m.armorStart && f.mt <= m.s) f.armor = m.armorStart;
  if (m.charge && f.mt === m.s - 1 && inp.a && f.charge < 60) { f.charge++; if (f.charge % 12 === 0) fxBurst(f.x, f.y - 60, '#fff6a0', 3, 3, 12); return; }
  f.mt++;
  const r = m.tick?.(f, f.mt, inp, E);
  if (r === 'hold') f.mt--;
  if (m.armorDash && f.mt > m.s && f.mt <= m.s + m.a) f.armor = true;
  if (m.hb && f.mt === m.s + 1) SFX.play('swing', m.dmg / 10);
  if (f.act === 'move' && f.move === m && f.mt > m.s + 1 && comboCancel(f, m, inp, E)) return;
  if (r === 'end' || f.mt >= (m.dur || m.s + m.a + m.e)) endMove(f);
}
// Combo rules: jabs chain into each other; a normal attack that HITS can be cancelled into
// a different attack, a special, or a jump (double jump in the air).
function comboCancel(f, m, inp, E) {
  if (m.chain && Math.abs(inp.x) < .35 && Math.abs(inp.y) < .4 && E('a')) { startMove(f, f.ch.moves[m.chain]); return true; }
  if (!f.hitCancel || m.special || m.charge || m.grab) return false;
  if (E('j')) { if (f.ground) jump(f); else if (f.jumps > 0) doubleJump(f, inp); else return false; return true; }
  if (E('b')) { special(f, inp); return true; }
  if (f.buf.a > 0) {
    const next = f.ground ? pickGround(f, inp) : pickAir(f, inp);
    if (next !== m) { f.buf.a = 0; startMove(f, next); return true; }
  }
  return false;
}

function ledgeControl(f, inp, E, prev) {
  const L = f.ledge;
  f.x = L.x - L.dir * 22; f.y = L.y + f.ch.hh * .75; f.vx = f.vy = 0; f.face = L.dir;
  if (f.t < 10) return;
  const toward = inp.x * L.dir;
  if (E('j') || (inp.y < -.6 && prev.y >= -.6)) {
    setAct(f, 'air'); f.x = L.x - L.dir * 10; f.y = L.y - 4; f.vy = -f.ch.jump; f.vx = L.dir * 2.5; f.ledgeCD = 30; f.jumpHeld = true; SFX.play('jump');
  } else if (E('a')) { setAct(f, 'climb'); f.climbAtk = true; }
  else if (toward > .6) setAct(f, 'climb');
  else if (toward < -.6 || inp.y > .6 || f.t > 300) { setAct(f, 'air'); f.ledgeCD = 40; f.x -= L.dir * 6; }
}

function holdControl(f, inp, E) {
  const foe = f.holding;
  if (!foe || foe.act !== 'held') { f.holding = null; setAct(f, 'stand'); return; }
  foe.x = f.x + f.face * 42; foe.y = f.y; foe.ground = f.ground;
  if (--f.holdT <= 0) {
    setAct(f, 'stand'); f.vx = -f.face * 5; f.holding = null;
    foe.heldBy = null; setAct(foe, foe.ground ? 'stand' : 'air'); foe.vx = f.face * 5; foe.inv = 10;
    return;
  }
  if (E('a') && f.t - f.pumT >= 12) { f.pumT = f.t; foe.dmg += 2; f.stats.dealt += 2; foe.hudShake = 8; foe.hitFlash = 4; freeze = 3; SFX.play('hit', .3); fxBurst(foe.x, foe.y - 55, '#fff6a0', 4, 4, 10); }
  if (f.t < 6) return;
  const fx = inp.x * f.face;
  const k = fx > .6 ? 'f' : fx < -.6 ? 'b' : inp.y < -.6 ? 'u' : inp.y > .6 ? 'd' : null;
  if (!k) return;
  const th = f.ch.throws[k];
  if (th.name) popText(f.x, f.y - f.ch.hh - 70, th.name, f.ch.color);
  f.holding = null; foe.heldBy = null;
  if (k === 'b') foe.x = f.x - f.face * 30;
  startMove(f, { s: 1, a: 0, e: 16, p: [th.p, th.p] });
  SFX.play('throw');
  applyHit(f, foe, th, f.face, foe.x, foe.y - 50);
}
function doGrab(f, foe) {
  if (foe.act === 'held' || foe.act === 'hold' || foe.act === 'ledge') return;
  if (foe.holding) { foe.holding.heldBy = null; setAct(foe.holding, 'air'); foe.holding = null; }
  setAct(f, 'hold'); setAct(foe, 'held'); f.holding = foe; foe.heldBy = f;
  f.holdT = 70 + foe.dmg * .3; f.pumT = -99; foe.face = -f.face; foe.vx = foe.vy = 0; SFX.play('grab');
}

function respawn(f) {
  Object.assign(f, { x: stage.spawn[f.i] * .4, y: -380, vx: 0, vy: 0, dmg: 0, ground: null, jumps: f.ch.jumps, usedSide: false, airdodged: false,
    shield: 60, store: 0, fuel: f.ch.fuel, holding: null, heldBy: null, launch: 0 });
  setAct(f, 'respawn');
}

// ================= PHYSICS =================
function physics(f, inp) {
  const ch = f.ch, m = f.act === 'move' ? f.move : null;
  if (f.gravFlip > 0 && f.ground) { f.ground = null; f.vy = -3; }
  if (f.ground && f.vy < 0) f.ground = null;
  if (!f.ground) {
    let g = ch.grav * (f.lowGrav > 0 ? .35 : 1);
    if (f.gravFlip > 0) g = -ch.grav * .5;
    if (m) g *= typeof m.grav === 'function' ? m.grav(f, f.mt) : (m.grav ?? 1);
    if (f.act === 'hurt') g *= .5;
    if (f.act === 'airdodge' && f.adDir && f.t < 20) g = 0;
    if (!f.floating) f.vy += g;
    const ff = f.ff && (f.act === 'air' || (m && m.air));
    if (f.act !== 'hurt') f.vy = Math.min(f.vy, ff ? ch.fall * 1.5 : ch.fall);
    if (f.gravFlip > 0) f.vy = Math.max(f.vy, -9);
    if (f.glide && f.act === 'air' && !(inp.y > .7)) f.vy = Math.min(f.vy, 2.2);
  }
  const px = f.x, py = f.y;
  f.x += f.vx; f.y += f.vy;

  if (f.ground) {
    const s = f.ground;
    f.x += s.dx || 0; f.y = s.y;
    if (f.x < s.x1 || f.x > s.x2 || s.life <= 0) { // s.life: a drawn platform that has run out
      if (!(s.life <= 0) && ['move', 'shield', 'dodge', 'land', 'dizzy', 'hold'].includes(f.act)) f.x = clamp(f.x, s.x1, s.x2);
      else { f.ground = null; if (f.act === 'stand') { setAct(f, 'air'); f.coyote = 6; } }
    }
  } else if (f.vy >= 0) {
    for (const s of surfaces()) {
      if (s.soft && (f.dropT > 0 || (inp.y > .75 && f.act !== 'hurt'))) continue;
      if (py <= s.y && f.y >= s.y && f.x >= s.x1 - 2 && f.x <= s.x2 + 2) {
        if (f.act === 'hurt' && f.vy > 9) { f.y = s.y; f.vy = -f.vy * .45; fxBurst(f.x, f.y, '#e8e0d0', 8, 4); SFX.play('land'); break; }
        land(f, s); break;
      }
    }
  }
  // main stage is solid: walls + underside
  const M = stage.main, hh = ch.hh * .8;
  if (f.ground !== M && f.y > M.y + 1 && f.y - hh < M.y + M.depth && f.x > M.x1 - 18 && f.x < M.x2 + 18) {
    if (py - hh >= M.y + M.depth - 2) { f.y = M.y + M.depth + hh; f.vy = Math.max(f.vy, 1); }
    else if (py <= M.y + 1 && f.x > M.x1 && f.x < M.x2) land(f, M);
    else { f.x = f.x < (M.x1 + M.x2) / 2 ? M.x1 - 18 : M.x2 + 18; if (f.act === 'hurt') f.vx *= -.5; else f.vx = 0; }
  }
  // ledge grab
  if (!f.ground && (f.act === 'air' || f.act === 'helpless' || (m && m.helpless && f.mt > 10)) && f.vy > 0 && f.ledgeCD === 0 && inp.y < .6) {
    const foe = fighters[1 - f.i];
    for (const L of ledges()) {
      if (foe.act === 'ledge' && foe.ledge.x === L.x) continue;
      if (Math.abs(f.x - (L.x - L.dir * 22)) < 42 && f.y > L.y + 20 && f.y < L.y + ch.hh + 50) {
        setAct(f, 'ledge'); f.ledge = L; f.inv = 30; f.uses?.clear(); f.fuel = ch.fuel; f.jumps = ch.jumps; f.usedSide = false; f.airdodged = false; f.ff = false; f.floatT = ch.float || 0;
        SFX.play('grab'); break;
      }
    }
  }
}
function land(f, s) {
  f.uses?.clear(); f.glide = false; f.fuel = f.ch.fuel;
  f.ground = s; f.y = s.y; f.vy = 0; f.jumps = f.ch.jumps; f.usedSide = false; f.airdodged = false; f.ff = false; f.floatT = f.ch.float || 0;
  switch (f.act) {
    case 'air': setAct(f, 'stand'); SFX.play('land'); fxBurst(f.x, f.y, '#e8e0d0', 4, 2, 12); break;
    case 'helpless': setAct(f, 'land'); f.landT = 10; break;
    case 'airdodge': setAct(f, 'land'); f.landT = f.adDir ? 12 : 7; break;
    case 'hurt': setAct(f, 'land'); f.landT = 8; break;
    case 'move': {
      const m = f.move;
      if (m.onLand?.(f)) break;
      if (m.air) { setAct(f, 'land'); f.landT = Math.round((m.ll || 6) * .6); }
      else if (m.helpless) { setAct(f, 'land'); f.landT = 10; }
      break;
    }
  }
}

// ================= COMBAT =================
function hurtbox(f) { const k = SC(f), h = f.ch.hh * k * (f.crouch ? .7 : 1), w = f.ch.hw * k; return { x1: f.x - w / 2, x2: f.x + w / 2, y1: f.y - h, y2: f.y }; }
function circleRect(cx, cy, r, b) { const x = clamp(cx, b.x1, b.x2), y = clamp(cy, b.y1, b.y2); return (cx - x) ** 2 + (cy - y) ** 2 < r * r; }
const canBeHit = f => f.inv <= 0 && !f.intang && !['dead', 'out', 'respawn', 'climb'].includes(f.act);
function activeHitboxes(f) {
  if (f.act !== 'move') return null;
  const m = f.move, t = f.mt;
  return m.hbAt ? m.hbAt(f, t) : (m.hb && t > m.s && t <= m.s + m.a ? m.hb : null);
}
function knockback(P, def) { return (P.b + P.g * def.dmg * (.6 + P.dmg / 20) / 6) * 200 / (def.ch.weight + 100); }

function applyHit(att, def, P, dir, hx, hy) {
  // P.pierce (Toji's Inverted Spear of Heaven) cuts straight through techniques: counters, Infinity, dodges, armor
  if (def.counter && def.act === 'move' && !P.pierce) {
    SFX.play('counter'); flash = 6; fxRing(def.x, def.y - 55, '#ffd23f', 60);
    def.inv = 20; def.face = Math.sign(att.x - def.x) || def.face; def.mt = def.move.dur - 14; def.counter = false;
    return applyHit(def, att, { dmg: Math.max(8, Math.round(P.dmg * 1.3)), b: 7, g: .5, ang: 40 }, def.face, att.x, att.y - 55);
  }
  if (def.nullify && !P.pierce) { fxRing(hx, hy, '#8ac8ff', 30); att.vx = -dir * 6; SFX.play('shield'); return; } // Infinity
  if (def.dodgeNext > 0 && !P.pierce) { // Spider-Sense: the next hit is dodged automatically
    def.dodgeNext = 0; def.inv = 30; def.vx = -dir * 4; def.vy = -11; def.ground = null; if (def.act !== 'final') setAct(def, 'air');
    popText(def.x, def.y - 140, 'SPIDER-SENSE!', '#ffffff'); SFX.play('counter'); return;
  }
  if (def.subst && def.act === 'move' && !P.pierce) { // Substitution: leave a log, reappear behind and strike
    def.subst = false; fxBurst(def.x, def.y - 50, '#8a5a2e', 14, 5); popText(def.x, def.y - 120, 'SUBSTITUTION!', '#3bf0ff');
    def.x = att.x - att.face * 60; def.face = Math.sign(att.x - def.x) || def.face; def.inv = 20; SFX.play('shadow');
    return applyHit(def, att, { dmg: 7, b: 6, g: .35, ang: 40 }, def.face, att.x, att.y - 55);
  }
  if (def.blockFront && !P.pierce && Math.sign(hx - def.x) === def.face) { fxRing(hx, hy, '#ffffff', 30); SFX.play('shield'); att.vx = -dir * 5; return; }
  if (def.iced) { def.dmg += P.dmg; def.iced.store += P.dmg; att.stats.dealt += P.dmg; def.hitFlash = 4; def.hudShake = 8; freeze = 3; SFX.play('ice'); fxBurst(hx, hy, '#e8feff', 6, 5); return; }
  let mul = (att.buff?.pow || 1) * (att.fsBuff?.pow || 1) * (att.shrink > 0 ? .5 : 1), kbMul = def.shrink > 0 ? 1.4 : 1;
  if (att.beat > 0 && T % 30 < 8) { mul *= 1.6; popText(hx, hy - 40, 'ON BEAT!', '#b06cff'); }
  if (def.sleep > 0) { mul *= 2; kbMul *= 1.4; def.sleep = 0; popText(def.x, def.y - 140, 'RUDE AWAKENING!', '#f59ab8'); }
  // stale moves: each repeat of the same move among your last 9 hits weakens it (damage and stun)
  const key = P.src || (P.kind ? 'p:' + P.kind : null); let stale = 1;
  if (key) { att.staleQ ??= []; const n = att.staleQ.filter(k => k === key).length; stale = Math.max(.55, 1 - n * .09); att.staleQ.push(key); if (att.staleQ.length > 9) att.staleQ.shift(); }
  mul *= stale;
  if (mul !== 1) P = { ...P, dmg: Math.round(P.dmg * mul * 10) / 10 };
  // Executioner's Sword (Higuruma's death penalty): his next melee hit is lethal
  if (att.execT > 0 && !P.kind) { P = { ...P, dmg: P.dmg + 40, b: 24, g: .9 }; att.execT = 0; popText(def.x, def.y - 170, 'EXECUTED', '#f2f2f2'); flash = 8; }
  if (def.act === 'shield') {
    def.shield -= P.dmg * 1.3; def.vx = dir * Math.min(9, 2 + P.dmg * .3); def.sstun = Math.round(P.dmg * .6) + 2;
    freeze = Math.min(8, 2 + (P.dmg >> 2)); SFX.play('shield'); fxBurst(hx, hy, '#bfe6ff', 5, 4, 12);
    if (def.shield <= 0) shieldBreak(def);
    return;
  }
  const stunned = ['hurt', 'locked', 'frozen', 'dizzy'].includes(def.act) && def.comboBy === att.i;
  def.combo = stunned ? (def.combo || 0) + 1 : 1; def.comboBy = att.i;
  if (def.combo >= 3) P = { ...P, dmg: Math.max(1, Math.round(P.dmg * Math.max(.5, 1 - (def.combo - 2) * .08))) }; // combo damage scaling
  def.comboDmg = (def.combo > 1 ? def.comboDmg || 0 : 0) + P.dmg;
  def.dmg = Math.min(999, def.dmg + P.dmg); att.stats.dealt += P.dmg;
  if (def.holding) { const h = def.holding; h.heldBy = null; setAct(h, h.ground ? 'stand' : 'air'); def.holding = null; }
  if (def.heldBy) { def.heldBy.holding = null; setAct(def.heldBy, 'stand'); def.heldBy = null; }
  const kb = knockback(P, def) * kbMul;
  def.bubbleT = 0; def.glide = false;
  if (P.slow) def.slowT = P.slow;
  def.hudShake = 14; def.hitFlash = 6; def.lastHitBy = att.i;
  freeze = Math.min(14, 2 + Math.round(P.dmg / 4) + (kb > 18 ? 3 : 0));
  SFX.play('hit', clamp(kb / 18, .2, 1.6));
  fxBurst(hx, hy, '#fff6a0', 6 + kb | 0, 4 + kb * .4, 18); fxBurst(hx, hy, att.ch.fx, 4 + kb * .5 | 0, 3 + kb * .3, 22); fxRing(hx, hy, '#ffffff', 16 + kb * 2);
  if (kb > 15) shakeCam(kb * .7);
  toPad(def.i, { type: 'buzz', ms: Math.min(200, 30 + kb * 6 | 0) });
  const armV = v => v === true || v === 1 ? 24 : v || 0;
  if (!P.pierce && kb < Math.max(armV(def.armor), armV(def.buff?.armor), armV(def.fsBuff?.armor))) return;
  if (P.bubble) { setAct(def, 'locked'); def.bubbleT = P.bubble; def.vx = def.vy = 0; return; }
  if (P.freeze && def.act !== 'frozen') { setAct(def, 'frozen'); def.stun = 30 + def.dmg * .25 | 0; def.vx = dir * 2; SFX.play('ice'); return; }
  const a = P.ang * D2R;
  def.vx = Math.cos(a) * kb * dir; def.vy = -Math.sin(a) * kb;
  const di = def.inp; // directional influence: holding the stick bends the launch up to ~15°
  if (di && Math.hypot(di.x, di.y) > .5 && kb > 4) {
    const m = Math.hypot(di.x, di.y), cross = (def.vx * di.y - def.vy * di.x) / (kb * m), ang = Math.atan2(def.vy, def.vx) + cross * .26;
    def.vx = Math.cos(ang) * kb; def.vy = Math.sin(ang) * kb;
  }
  if (def.ground && def.vy > 0) def.vy = -def.vy * .5;
  if (def.vy < 0) def.ground = null;
  setAct(def, 'hurt'); def.stun = Math.max(8, Math.round(kb * 2.6 * Math.max(.45, 1 - (def.combo - 1) * .08) * (.5 + stale * .5))); def.launch = kb; def.rotT = 0;
}

function combat() {
  for (const f of fighters) {
    const hbs = activeHitboxes(f); if (!hbs) continue;
    const foe = fighters[1 - f.i], m = f.move;
    if (!canBeHit(foe)) continue;
    if (f.hitDone && !(m.multi && f.mt - f.hitT >= m.multi)) continue;
    const box = hurtbox(foe), G = SC(f), offs = f.clones ? [0, ...f.clones.offs] : [0];
    for (const [x, y, r, o] of offs.flatMap(off => hbs.map(h => [h[0] + off * f.face / G, h[1], h[2], h[3]]))) {
      const cx = f.x + x * f.face * G, cy = f.y + y * G;
      if (!circleRect(cx, cy, r * G, box)) continue;
      f.hitDone = true; f.hitT = f.mt;
      if (m.grab) { doGrab(f, foe); break; }
      const P = { ...m, ...o, src: m };
      if (m.dmgFn) P.dmg = m.dmgFn(f, foe);
      if (!m.special && foe.act !== 'shield') f.hitCancel = true;
      if (f.charge) P.dmg = Math.round(P.dmg * (1 + f.charge / 150));
      applyHit(f, foe, P, P.away ? (Math.sign(foe.x - f.x) || f.face) : f.face, cx, cy);
      m.onHit?.(f, foe);
      break;
    }
  }
}

function spawn(o) { projectiles.push(Object.assign({ vx: 0, vy: 0, r: 14, life: 60, grav: 0, dmg: 5, b: 3, g: .2, ang: 30, t: 0, refl: true }, o)); }
function updateProjectiles() {
  for (const p of projectiles) {
    p.t++; p.life--;
    p.tick?.(p);
    const py = p.y;
    if (!p.stopped) { p.vy += p.grav; p.x += p.vx; p.y += p.vy; }
    if (p.onGround && !p.stopped && p.vy >= 0) for (const s of surfaces()) {
      if (py <= s.y && p.y >= s.y && p.x >= s.x1 && p.x <= s.x2) {
        if (p.onGround === 'bounce') { p.y = s.y; p.vy = -Math.max(5, p.vy * .6); if (++p.bounces > 2) p.life = 0; }
        else if (p.onGround === 'stop') { p.y = s.y - 8; p.stopped = true; }
        else if (p.onGround === 'slide') { p.y = s.y - 1; p.vy = 0; }
        else if (p.onGround === 'vanish') p.life = 0;
        else { p.life = 0; fxBurst(p.x, p.y, '#b8a080', 14, 6); SFX.play('rock'); }
        break;
      }
    }
    const B = stage.blast;
    if (inMain(p.x, p.y) || p.x < B.l || p.x > B.r || p.y > B.b || p.y < B.t) p.life = 0;
    const foe = fighters[1 - p.owner];
    if (p.inert || p.life <= 0 || !canBeHit(foe) || !circleRect(p.x, p.y, p.r, hurtbox(foe))) continue;
    if ((foe.reflect || foe.counter) && p.refl) {
      p.owner = foe.i; p.vx = -p.vx * 1.2 || foe.face * 8; p.vy = -p.vy; p.dmg = Math.round(p.dmg * 1.25); p.life = Math.max(p.life, 40);
      SFX.play('counter'); fxRing(p.x, p.y, '#ffffff', 30); continue;
    }
    applyHit(fighters[p.owner], foe, p, p.away ? (Math.sign(foe.x - p.x) || 1) : (Math.sign(p.vx) || 1), p.x, p.y);
    p.inert = true;
    if (p.onHit) p.onHit(p, foe); else if (!p.boom) p.life = 0;
  }
  projectiles = projectiles.filter(p => p.life > 0);
  if (projectiles.length > 80) projectiles.splice(0, projectiles.length - 80);
}

function ko(f) {
  f.stocks--; f.stats.falls++; f.hasFS = false; f.buff = f.fsBuff = null;
  Object.assign(f, { confT: 0, slowT: 0, invert: 0, gravFlip: 0, sleep: 0, shrink: 0, beat: 0, dodgeNext: 0, stealth: 0, lowGrav: 0, bubbleT: 0, glide: false, iced: null, clones: null });
  if (f.lastHitBy >= 0 && f.lastHitBy !== f.i) fighters[f.lastHitBy].stats.kos++;
  if (f.heldBy) { f.heldBy.holding = null; f.heldBy = null; }
  if (f.holding) { f.holding.heldBy = null; setAct(f.holding, 'air'); f.holding = null; }
  beams.push({ x: f.x, y: f.y - 50, c: f.ch.color, life: 50 });
  fxBurst(clamp(f.x, stage.blast.l + 100, stage.blast.r - 100), clamp(f.y, stage.blast.t + 100, stage.blast.b - 50), f.ch.color, 50, 20, 40);
  setAct(f, 'dead'); f.t2 = 100; f.lastHitBy = -1;
  SFX.play('ko'); shakeCam(26); flash = 4;
  toPad(f.i, { type: 'buzz', ms: 400 });
  if (f.stocks <= 0 && !endT) { endT = 1; winner = 1 - f.i; SFX.play('game'); }
}

// ================= CPU =================
function cpuInput(f) {
  const inp = blank(), foe = fighters[1 - f.i], M = stage.main;
  if (['dead', 'out'].includes(f.act)) return inp;
  const lv = cpuLv[f.i];
  if (['hurt', 'locked', 'frozen', 'dizzy'].includes(f.act)) { inp.a = lv === 1 ? 0 : T % (lv === 3 ? 2 : 6) < 1 + (lv === 2) * 2 ? 1 : 0; inp.x = Math.sign(f.x) * -.8 * (lv > 1); return inp; } // mash out + DI toward the stage
  const toStage = f.x < 0 ? 1 : -1;
  if (f.act === 'respawn') { inp.x = f.t > 40 ? toStage : 0; return inp; }
  if (f.act === 'ledge') { if (f.t > 15) { if (T % 3) inp.x = toStage; else inp.j = 1; } return inp; }
  if (f.act === 'held') { inp.a = T % 4 < 2 ? 1 : 0; inp.x = T % 8 < 4 ? 1 : -1; return inp; } // mash out
  if (f.act === 'hold') { if (f.t > 12) { inp.x = foe.dmg > 60 ? -toStage : (T % 2 ? 1 : -1); if (foe.dmg < 40) { inp.x = 0; inp.y = -1; } } return inp; }
  // recovery: drift back, double jump, then up-special toward the stage
  if (!f.ground && (f.x < M.x1 - 5 || f.x > M.x2 + 5 || f.y > M.y + 5)) {
    inp.x = toStage;
    if (f.act === 'air' && f.vy > 0 && f.jumps > 0) inp.j = T % 2;
    else if (f.act === 'air' && f.jumps === 0 && f.vy > 0) { inp.b = T % 2; inp.y = -1; inp.x = toStage * .6; }
    return inp;
  }
  if (f.hasFS && (f.act === 'stand' || f.act === 'air') && canBeHit(foe)) {
    if (!f.ch.fs.cpu || f.ch.fs.cpu(f, foe)) { inp.b = T % 2; return inp; }
  }
  if (f.act === 'move' && f.move.special && f.mt > 8 && T % 6 === 0 && Math.random() < .25) { // try "press B again" follow-ups
    inp.b = 1; inp.x = Math.sign(foe.x - f.x) * .6; inp.y = foe.y < f.y - 80 ? -.7 : 0; return inp;
  }
  if (f.act === 'move' && f.hitCancel && f.mt > f.move.s + 2 && T % 3 === 0 && Math.random() < .5) { // combo follow-up
    const dy = foe.y - f.y, d = Math.sign(foe.x - f.x) || f.face;
    if (dy < -90 && Math.random() < .5) inp.j = 1; else { inp.a = 1; inp.x = d * (Math.random() < .5 ? .5 : 0); inp.y = dy < -40 ? -.6 : 0; }
    return inp;
  }
  const ai = f.ai || (f.ai = { t: 0, age: 0, pressAt: 0, plan: blank() });
  if (--ai.t <= 0) cpuDecide(f, foe, ai, M);
  const p = ai.plan;
  ai.age++;
  inp.x = p.x; inp.y = p.y; inp.s = p.s;
  if (ai.age === ai.pressAt) { inp.a = p.a; inp.b = p.b; inp.j = p.j; if (p.a || p.b) { inp.x = p.ax ?? p.x; inp.y = p.ay ?? p.y; } }
  if (f.ground && !inp.a && !inp.b && ((f.x < M.x1 + 60 && inp.x < 0) || (f.x > M.x2 - 60 && inp.x > 0))) inp.x = 0; // don't walk off
  return inp;
}
// pick the next short plan: stick direction held for a few frames, buttons pressed once at `pressAt`
function cpuDecide(f, foe, ai, M) {
  const dx = foe.x - f.x, dy = foe.y - f.y, adx = Math.abs(dx), d = Math.sign(dx) || 1, R = Math.random();
  const p = blank();
  const lv = cpuLv[f.i];
  ai.t = [14, 6, 3][lv - 1] + (Math.random() * [14, 10, 6][lv - 1] | 0); ai.age = 0; ai.pressAt = 3; ai.plan = p; // reaction time by level
  const foeGone = ['dead', 'out', 'respawn'].includes(foe.act);
  const foeOff = !foeGone && !foe.ground && (foe.x < M.x1 - 20 || foe.x > M.x2 + 20);
  if (foeGone) { p.x = -Math.sign(f.x) * .4; return; }
  if (f.ch.cpuPlan?.(f, foe, p)) return; // fighter-specific habits (e.g. Deadeye reloading)
  if (ball && R < .6 && Math.abs(ball.x) < M.x2) { // go break the Smash Ball
    const bx = ball.x - f.x, by = ball.y - (f.y - 60), bd = Math.sign(bx) || 1;
    ai.pressAt = 1;
    if (Math.hypot(bx, by) < 130) { p.a = 1; if (Math.abs(by) > Math.abs(bx)) { p.ax = 0; p.ay = Math.sign(by); } else { p.ax = bd; p.ay = 0; } }
    else { p.x = bd; if (by < -90 && (f.ground || f.jumps > 0)) p.j = 1; }
    return;
  }
  if (f.ground && foe.act === 'move' && adx < 170 && Math.abs(dy) < 110 && R < [.1, .35, .6][lv - 1]) { p.s = 1; ai.t = 16; return; } // shield
  if (foeOff && f.ground) { // edge-guard: walk to the ledge on their side and shoot / wait
    const ex = foe.x < 0 ? M.x1 + 70 : M.x2 - 70;
    if (Math.abs(f.x - ex) > 40) p.x = Math.sign(ex - f.x);
    else { p.x = d * .3; if (R < .5) { p.b = 1; p.ax = 0; p.ay = 0; } }
    return;
  }
  if (!f.ground && adx < 140 && Math.abs(dy) < 130) { // aerial
    p.a = 1; ai.pressAt = 1;
    if (Math.abs(dy) > adx) { p.ax = 0; p.ay = Math.sign(dy); } else { p.ax = d; p.ay = 0; }
    return;
  }
  if (f.ground && adx < 115 && Math.abs(dy) < 70) { // in range
    p.x = d * .3; // turn to face first
    if (foe.act === 'shield' || foe.act === 'dizzy' && R < .5) { p.s = 1; p.a = 1; return; }       // grab
    if (foe.dmg > 85 && R < .6) { p.a = 1; [p.ax, p.ay] = R < .35 ? [d, 0] : R < .5 ? [0, 1] : [0, -1]; return; } // smash
    const opts = [[d * .3, 0, 'a'], [d * .5, 0, 'a'], [0, -.6, 'a'], [0, .6, 'a'], [d, 0, 'b'], [0, 1, 'b'], [0, 0, 'g'], [d * .5, 0, 'a']];
    const [ax, ay, k] = opts[Math.random() * opts.length | 0];
    if (k === 'g') { p.s = 1; p.a = 1; } else { p[k] = 1; p.ax = ax; p.ay = ay; }
    return;
  }
  if (f.ground && adx < 170 && dy < -70 && dy > -300) { p.j = 1; p.x = d * .6; ai.pressAt = 1; ai.t = 12; return; } // jump at them
  if (adx > 380 && R < .3) { p.x = d * .3; p.b = 1; p.ax = 0; p.ay = 0; return; } // zone with projectile
  p.x = d; ai.pressAt = 1; // approach
  if (f.ground && dy < -130 && R < .6) p.j = 1;
}

// ================= FLOW =================
function getArt(s) { return arts[s.id] || (arts[s.id] = s.build()); }
function startMatch() {
  stage = STAGES[stageCur];
  for (const p of stage.plats) { p.soft = true; p.cx0 ??= (p.x1 + p.x2) / 2; p.cy0 ??= p.y; p.w0 ??= p.x2 - p.x1; p.dx = 0; }
  fighters = [0, 1].map(i => newFighter(i, CHARS[sel[i].cur]));
  projectiles = []; particles = []; beams = [];
  state = 'fight'; paused = false; countdown = 200; goT = 0; endT = 0; winner = -1; resetBall();
  Object.assign(cam, { x: 0, y: -200, z: .9 });
  fighters.forEach((f, i) => toPad(i, { type: 'info', name: f.ch.name, color: f.ch.color }));
}
function updateFight() {
  const inputs = fighters.map(f => countdown > 20 ? blank() : readInput(f.i));
  fighters.forEach((f, i) => bufferInput(f, f.invert > 0 ? { ...inputs[i], x: -inputs[i].x } : inputs[i], freeze > 0 || !!fsCut));
  if (freeze > 0) { freeze--; for (const f of fighters) if (f.stuckNow) f.stuckT++; return; } // multi-hits can't stretch the break-free limit
  if (fsCut) { if (++fsCut.t >= CUT) fsCut = null; return; }
  if (endT && endT++ % 3) { updateCam(); return; } // slow-mo after the final KO
  if (endT > 360) { state = 'results'; resT = 0; return; }
  for (const p of stage.plats) if (p.move) {
    const k = Math.sin(T * Math.PI * 2 / p.move.per + (p.move.phase || 0)) * p.move.amp;
    if (p.move.axis === 'y') { p.dx = 0; p.y = p.cy0 + k; } // riders follow because grounded fighters snap to s.y
    else { p.dx = p.cx0 + k - (p.x1 + p.x2) / 2; p.x1 += p.dx; p.x2 += p.dx; }
  }
  if (countdown > 0) { countdown--; if (countdown % 60 === 20 && countdown > 20) SFX.play('beep'); if (countdown === 20) { SFX.play('go'); goT = 60; } }
  if (goT > 0) goT--;
  fighters.forEach((f, i) => step(f, inputs[i]));
  const [a, b] = fighters; // push apart
  if (a.ground && b.ground && a.ground === b.ground && Math.abs(a.x - b.x) < 34 && !['held', 'hold'].includes(a.act) && !['held', 'hold'].includes(b.act)) {
    const d = Math.sign(a.x - b.x) || 1; a.x += d * 1.5; b.x -= d * 1.5;
  }
  combat();
  updateProjectiles();
  updateBall();
  updateFx();
  for (const f of fighters) {
    const B = stage.blast;
    if (!['dead', 'out', 'final'].includes(f.act) && (f.x < B.l || f.x > B.r || f.y > B.b || f.y < B.t)) ko(f);
  }
  updateCam();
}
function updateCam() {
  const B = stage.blast;
  let x1 = -320, x2 = 320, y1 = -380, y2 = 170; // bottom margin keeps the stage floor above the HUD
  for (const f of fighters) {
    if (['dead', 'out'].includes(f.act)) continue;
    x1 = Math.min(x1, f.x - 220); x2 = Math.max(x2, f.x + 220); y1 = Math.min(y1, f.y - f.ch.hh - 160); y2 = Math.max(y2, f.y + 110);
  }
  x1 = Math.max(x1, B.l + 60); x2 = Math.min(x2, B.r - 60); y1 = Math.max(y1, B.t + 60); y2 = Math.min(y2, B.b - 40);
  const z = clamp(Math.min(W / (x2 - x1), H / (y2 - y1)), .5, 1.25);
  cam.x += ((x1 + x2) / 2 - cam.x) * .08; cam.y += ((y1 + y2) / 2 - cam.y) * .08; cam.z += (z - cam.z) * .06;
}

const COLS = 11; // 4 rows fit above the player panels (44 fighters max)
function updateSelect() {
  const M = menuInputs();
  for (const i of [0, 1]) {
    if (cpu[i]) continue;
    const s = sel[i], m = M[i], o = 1 - i;
    const t = s.locked && cpu[o] && !sel[o].locked ? sel[o] : s; // locked human steers the CPU's cursor
    if (m.b) {
      if (s.locked && cpu[o] && sel[o].locked) sel[o].locked = false;
      else if (s.locked) s.locked = false;
      else if (!sel[o].locked || cpu[o]) state = 'title';
      SFX.play('back'); continue;
    }
    if (m.j && !padsConnected[o]) { cpu[o] = !cpu[o]; sel[o].locked = false; SFX.play('select'); continue; }
    if (m.s && cpu[o]) { cpuLv[o] = cpuLv[o] % 3 + 1; SFX.play('select'); continue; }
    if (t.locked) continue;
    const rows = Math.ceil(CHARS.length / COLS), r = t.cur / COLS | 0, c = t.cur % COLS;
    if (m.nx) { const len = Math.min(COLS, CHARS.length - r * COLS); t.cur = r * COLS + (c + m.nx + len) % len; SFX.play('select'); } // wrap within the (possibly partial) row
    if (m.ny) { t.cur = Math.min(CHARS.length - 1, ((r + m.ny + rows) % rows) * COLS + c); SFX.play('select'); }
    if (m.a) {
      t.locked = true; SFX.play('confirm');
      if (t === s) {
        toPad(i, { type: 'info', name: CHARS[s.cur].name, color: CHARS[s.cur].color });
        if (!padsConnected[o] && !cpu[o] && !sel[o].locked) { cpu[o] = true; sel[o].cur = Math.random() * CHARS.length | 0; } // solo: a CPU joins
      }
    }
  }
  if (sel.every(s => s.locked)) { if (++readyT > 15 && M.some((m, i) => m.a && !cpu[i])) { state = 'stage'; SFX.play('confirm'); } } else readyT = 0;
}
function updateStageSel() {
  for (const m of menuInputs()) {
    if (m.nx) { stageCur = (stageCur + m.nx + STAGES.length) % STAGES.length; SFX.play('select'); }
    if (m.ny) { stageCur = (stageCur + m.ny * 5 + STAGES.length * 5) % STAGES.length; SFX.play('select'); }
    if (m.a) { SFX.play('confirm'); startMatch(); return; }
    if (m.b) { state = 'select'; sel.forEach((s, i) => { if (!cpu[i]) s.locked = false; }); SFX.play('back'); return; }
  }
}
function tick() {
  T++;
  if (shake > 0) { shake *= .88; if (shake < .5) shake = 0; }
  if (flash > 0) flash--;
  for (const p of particles) { p.x += p.vx || 0; p.y += p.vy || 0; if (!p.ring && !p.text) { p.vx *= .9; p.vy = p.vy * .9 + .15; } p.life--; }
  particles = particles.filter(p => p.life > 0);
  beams.forEach(b => b.life--); beams = beams.filter(b => b.life > 0);
  switch (state) {
    case 'title': if (menuInputs().some(m => m.a)) { state = 'select'; SFX.play('confirm'); } break;
    case 'select': updateSelect(); break;
    case 'stage': updateStageSel(); break;
    case 'fight': {
      const M = menuInputs();
      if (!endT && countdown <= 20 && M.some(m => m.p)) { paused = !paused; SFX.play(paused ? 'back' : 'confirm'); }
      if (!paused) { updateFight(); break; }
      if (M.some(m => m.b)) { paused = false; toSelect(); }
      break;
    }
    case 'results': { // ignore the first second so mashing through "GAME!" can't skip it
      const M = menuInputs();
      if (++resT < 60) break;
      if (M.some(m => m.a)) { SFX.play('confirm'); startMatch(); }
      else if (M.some(m => m.b)) toSelect();
      break;
    }
  }
  latch.forEach(L => { for (const k in L) delete L[k]; });
}
function toSelect() { state = 'select'; sel.forEach((s, i) => { if (!cpu[i]) s.locked = false; }); SFX.play('back'); }

// ================= RENDERING =================
function text(s, x, y, size, col, align = 'center', stroke = '#000') {
  ctx.font = `${size}px ${FONT}`; ctx.textAlign = align; ctx.textBaseline = 'middle';
  if (stroke) { ctx.lineWidth = Math.max(3, size / 4); ctx.strokeStyle = stroke; ctx.lineJoin = 'round'; ctx.strokeText(s, x, y); }
  ctx.fillStyle = col; ctx.fillText(s, x, y);
}
function rrect(x, y, w, h, r, fill, stroke, lw = 3) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.lineWidth = lw; ctx.strokeStyle = stroke; ctx.stroke(); } }
const full = p => mixPose(p, p, 0);

function movePose(m, t, air, f) {
  if (m.pose) return m.pose(f, t);
  const base = air ? POSES.fall : POSES.idle, w = POSES[m.p[0]], s = POSES[m.p[1]];
  if (m.dur) return t < m.dur * .25 ? w : s;
  if (t <= m.s) return mixPose(base, w, Math.min(1, t / Math.max(1, m.s * .6)));
  if (t <= m.s + m.a + 2) return s;
  return mixPose(s, base, Math.min(1, (t - m.s - m.a - 2) / Math.max(1, m.e - 2)));
}
function idlePose(t, k = 0) { return { y: Math.sin(t * .08 + k) * .6, a1: [25 + Math.sin(t * .08 + k) * 4, 35], a2: [-20 - Math.sin(t * .08 + k) * 3, 30] }; }
function fighterPose(f) {
  switch (f.act) {
    case 'stand': {
      if (f.crouch) return POSES.crouch;
      const sp = Math.abs(f.vx);
      return sp > .8 ? runPose(f.runPh, Math.min(1, sp / 6)) : idlePose(T, f.i);
    }
    case 'air': if (f.djT < 16) return { ...POSES.djump, rot: f.djT * 22.5 }; return f.floating ? POSES.helpless : f.vy < 0 ? POSES.jump : POSES.fall;
    case 'move': return movePose(f.move, f.mt, !f.ground, f);
    case 'land': case 'climb': return POSES.crouch;
    case 'shield': return POSES.shield;
    case 'dodge': return f.dodgeDir ? { ...POSES.crouch, rot: -f.dodgeDir * f.face * f.t * 15 } : POSES.crouch;
    case 'airdodge': return POSES.fall;
    case 'hurt': return f.launch > 13 ? { ...POSES.hurt, rot: f.rotT } : POSES.hurt;
    case 'frozen': return POSES.hurt;
    case 'dizzy': return { ...POSES.dizzy, tl: Math.sin(T * .15) * 12 };
    case 'helpless': return POSES.helpless;
    case 'ledge': return POSES.ledge;
    case 'hold': return POSES.hold;
    case 'held': return POSES.held;
    case 'locked': return f.sleep ? { ...POSES.helpless, rot: -80 } : { ...POSES.hurt, rot: Math.sin(T * .5) * 10 };
    case 'final': return POSES[f.fsd?.pose] || { beam: POSES.cast, rush: POSES.dash, domain: POSES.counter, rain: POSES.victory, burst: POSES.usmash, snipe: POSES.cast, meteor: POSES.dair }[f.fsd?.type] || POSES.victory;
    default: return idlePose(T, f.i);
  }
}
function fighterTint(f) {
  if (f.hitFlash > 0) return [255, 255, 255, .85];
  if (f.act === 'frozen') return [160, 230, 255, .55];
  if (f.charge > 0 && T % 8 < 4) return [255, 240, 120, .45];
  if (f.armor && T % 6 < 3) return [255, 190, 110, .4];
  if (f.act === 'helpless') return [30, 20, 50, .35];
  if (fighters[0]?.ch === fighters[1]?.ch && f.i === 1) return [60, 110, 255, .25];
  return null;
}
function drawBats(f) {
  for (let i = 0; i < 7; i++) {
    const a = T * .3 + i * .9, x = f.x + Math.cos(a) * 26, y = f.y - 55 + Math.sin(a * 1.3) * 22, w = (T + i) % 8 < 4 ? 12 : 6;
    pxRect(ctx, x - w, y - 3, w * 2, 3, '#2a1740'); pxRect(ctx, x - 3, y - 3, 6, 6, '#4a2a6b'); pxRect(ctx, x, y - 3, 3, 3, '#58e08a');
  }
}
function blit(c, x, y, s, face = 1, alpha = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(face * s, s); ctx.globalAlpha = alpha; ctx.drawImage(c, -SPR / 2, -FOOT, SPR, SPR); ctx.restore();
}
function drawFighter(f) {
  if (['dead', 'out'].includes(f.act) || f.hidden) return;
  if (f.act === 'respawn') { pxRect(ctx, f.x - 45, f.y, 90, 9, SLOT_COLORS[f.i]); pxRect(ctx, f.x - 36, f.y + 9, 72, 6, shade(SLOT_COLORS[f.i], -40)); }
  if (f.bats) return drawBats(f);
  if (f.intang && f.ch.id === 'volt') return;
  const pose = full(fighterPose(f));
  const grounded = !!f.ground && !pose.rot && ['stand', 'land', 'shield', 'dizzy', 'hold', 'dodge', 'move'].includes(f.act);
  const c = renderSprite(f, pose, fighterTint(f), grounded);
  if (f.hasFS) { ctx.globalAlpha = .35 + Math.sin(T * .3) * .15; pxDisc(ctx, f.x, f.y - f.ch.hh / 2, f.ch.hh * .7, RAINBOW[(T >> 2) % 6]); ctx.globalAlpha = 1; }
  // no aura while vanished (it would give the fighter away)
  for (const bf of [f.buff, f.fsBuff]) if (bf && !(f.stealth > 0)) { ctx.globalAlpha = .2 + Math.sin(T * .25) * .1; pxDisc(ctx, f.x, f.y - f.ch.hh / 2, f.ch.hh * .65, bf.col); ctx.globalAlpha = 1; if (T % 4 === 0) particles.push({ x: f.x + (Math.random() - .5) * 50, y: f.y - Math.random() * f.ch.hh, vx: 0, vy: -2, life: 20, max: 20, c: bf.col, sz: PX * 2 }); }
  const blink = (f.inv > 0 && f.act !== 'ledge' && !['dodge', 'airdodge'].includes(f.act) && T % 6 < 3) || ['dodge', 'airdodge'].includes(f.act) && f.inv > 0;
  const S = PX * SC(f);
  if (f.clones) for (const o of f.clones.offs) blit(c, f.x + o, f.y, S, f.face, .4);
  blit(c, f.x, f.y, S, f.face, f.stealth > 0 ? .12 : f.intang ? .35 : blink ? .5 : 1);
  if (f.sleep > 0) text('Z'.repeat(1 + ((T >> 4) % 3)), f.x + 30, f.y - f.ch.hh - 10 - (T % 32), 14, '#ffffff');
  if (f.slowT > 0) { ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 2; for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(f.x - 30, f.y - 20 - k * 25); ctx.lineTo(f.x + 30, f.y - 30 - k * 22); ctx.stroke(); } }
  if (f.dodgeNext > 0 && T % 20 < 10) for (const s of [-1, 1]) pxRect(ctx, f.x + s * 22, f.y - f.ch.hh - 12, 6, 14, '#ffffff');
  if (f.beat > 0 && T % 30 < 8) { ctx.strokeStyle = '#b06cff'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(f.x, f.y - 55, 60 + (T % 30) * 4, 0, 7); ctx.stroke(); }
  if (f.bubbleT > 0) { ctx.strokeStyle = '#aef6ff'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(f.x, f.y - 55, 70, 0, 7); ctx.stroke(); }
  if (f.gravFlip > 0) { ctx.strokeStyle = '#b06cff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(f.x, f.y - 55, 60, 0, 7); ctx.stroke(); }
  if (f.act === 'frozen') { ctx.fillStyle = 'rgba(180,240,255,.45)'; ctx.fillRect(snap(f.x - f.ch.hw / 2 - 9), snap(f.y - f.ch.hh - 9), snap(f.ch.hw + 18), snap(f.ch.hh + 9)); pxRect(ctx, f.x - f.ch.hw / 2 - 3, f.y - f.ch.hh - 6, 9, 30, 'rgba(255,255,255,.7)'); }
  if (f.act === 'shield') {
    const r = 62 * (.3 + .7 * f.shield / 60) * (f.ch.hh / 110);
    ctx.fillStyle = shade(f.ch.color, 20) + '66'; ctx.beginPath(); ctx.arc(f.x, f.y - f.ch.hh / 2, r, 0, 7); ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = '#ffffffaa'; ctx.stroke();
  }
  if (f.act === 'dizzy') for (let i = 0; i < 3; i++) { const a = T * .12 + i * 2.1; pxRect(ctx, f.x + Math.cos(a) * 30 - 4, f.y - f.ch.hh - 12 + Math.sin(a) * 8, 9, 9, '#ffe07a'); }
  if (f.stuckT > 70 && T % 20 < 12) text('MASH!', f.x, f.y + 22, 12, '#ffffff');
  if (f.confT > 0) text('CONFISCATED', f.x, f.y + 22, 10, '#f2c14e');
  if (f.execT > 0) { pxRect(ctx, f.x + f.face * 30 - 4, f.y - 160, 8, 96, T % 10 < 5 ? '#ffffff' : '#c8ccd8'); pxRect(ctx, f.x + f.face * 30 - 13, f.y - 66, 26, 6, '#f2c14e'); }
  if (f.combo > 1) text(`${f.combo} HITS`, f.x, f.y - f.ch.hh * SC(f) - 62, 14 + Math.min(10, f.combo * 2), SLOT_COLORS[f.comboBy]);
  // player tag
  const ty = f.y - f.ch.hh - 30;
  text(`P${f.i + 1}`, f.x, ty, 12, SLOT_COLORS[f.i]);
  ctx.fillStyle = SLOT_COLORS[f.i]; ctx.beginPath(); ctx.moveTo(f.x - 6, ty + 10); ctx.lineTo(f.x + 6, ty + 10); ctx.lineTo(f.x, ty + 17); ctx.fill();
}
function drawSlashes(f) {
  if (f.act === 'move' && f.move.drawFx) return f.move.drawFx(f, f.mt);
  const hbs = activeHitboxes(f); if (!hbs || f.move.grab) return;
  const G = SC(f), bx = f.x, by = f.y - f.ch.hh * .5 * G;
  for (let [x, y, r] of hbs) {
    x *= G; y *= G; r *= G;
    const cx = f.x + x * f.face, cy = f.y + y, d = Math.hypot(cx - bx, cy - by), a = Math.atan2(cy - by, cx - bx);
    ctx.lineCap = 'round';
    if (d < 25) { ctx.lineWidth = r * .25; ctx.strokeStyle = f.ch.fx + '99'; ctx.beginPath(); ctx.arc(cx, cy, r * .85, 0, 7); ctx.stroke(); continue; }
    ctx.lineWidth = r * .8; ctx.strokeStyle = f.ch.fx + '88'; ctx.beginPath(); ctx.arc(bx, by, d, a - .6, a + .6); ctx.stroke();
    ctx.lineWidth = r * .25; ctx.strokeStyle = '#ffffffcc'; ctx.beginPath(); ctx.arc(bx, by, d, a - .45, a + .45); ctx.stroke();
  }
}
function drawParticles() {
  for (const p of particles) {
    const k = p.life / p.max;
    if (p.text) { ctx.globalAlpha = Math.min(1, k * 2); text(p.text, p.x, p.y, 18, p.c); ctx.globalAlpha = 1; continue; }
    if (p.ring) { ctx.lineWidth = 4 * k + 1; ctx.strokeStyle = p.c; ctx.globalAlpha = k; ctx.beginPath(); ctx.arc(p.x, p.y, p.ring * (1.6 - k), 0, 7); ctx.stroke(); ctx.globalAlpha = 1; continue; }
    ctx.globalAlpha = Math.min(1, k * 1.5); pxRect(ctx, p.x, p.y, p.sz, p.sz, p.c);
  }
  ctx.globalAlpha = 1;
}
const toScreen = (x, y) => ({ x: (x - cam.x) * cam.z + W / 2, y: (y - cam.y) * cam.z + H / 2 });

function drawWorld() {
  const art = stageArt;
  setT(1, 1, 0, 0);
  stage.drawBg(ctx, art, cam);
  const sx = shake ? (Math.random() - .5) * shake : 0, sy = shake ? (Math.random() - .5) * shake : 0;
  setT(cam.z, cam.z, W / 2 - cam.x * cam.z + sx, H / 2 - cam.y * cam.z + sy);
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'low';
  stage.drawStage(ctx, art);
  drawFinalUnder();
  for (const p of projectiles) if (p.kind === 'trap' || p.kind === 'mine') p.draw(ctx, p);
  fighters.forEach(drawFighter);
  fighters.forEach(drawSlashes);
  for (const p of projectiles) if (p.kind !== 'trap' && p.kind !== 'mine') p.draw(ctx, p);
  drawBall();
  drawFinalOver();
  drawParticles();
  setT(1, 1, 0, 0);
  stage.drawFront?.(ctx);
  // KO beams
  for (const b of beams) {
    const s = toScreen(b.x, b.y), x = clamp(s.x, 0, W), y = clamp(s.y, 0, H), a = Math.atan2(H / 2 - y, W / 2 - x), k = b.life / 50, L = 900 * (1 - k * .5);
    ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.globalAlpha = k;
    ctx.fillStyle = b.c; ctx.beginPath(); ctx.moveTo(0, -70 * k); ctx.lineTo(L, 0); ctx.lineTo(0, 70 * k); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(0, -30 * k); ctx.lineTo(L * .8, 0); ctx.lineTo(0, 30 * k); ctx.fill();
    ctx.restore();
  }
  // offscreen bubbles
  for (const f of fighters) {
    if (['dead', 'out'].includes(f.act)) continue;
    const s = toScreen(f.x, f.y - f.ch.hh / 2);
    if (s.x > -10 && s.x < W + 10 && s.y > -10 && s.y < H + 10) continue;
    const bx = clamp(s.x, 60, W - 60), by = clamp(s.y, 60, H - 150);
    ctx.save(); ctx.beginPath(); ctx.arc(bx, by, 46, 0, 7); ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fill(); ctx.lineWidth = 5; ctx.strokeStyle = SLOT_COLORS[f.i]; ctx.stroke(); ctx.clip();
    if (f.spr) blit(f.spr, bx, by + 30, 1.5, f.face);
    ctx.restore();
  }
}
function heat(d) { const k = Math.min(1, d / 160); return `rgb(255,${255 - k * 200 | 0},${255 - k * 255 | 0})`; }
const hudSpr = [{}, {}];
const qrImg = new Image(); qrImg.src = '/qr.svg';
function drawQR(x, y, size, label = true) {
  if (!qrImg.complete || !qrImg.naturalWidth) return;
  rrect(x - 8, y - 8, size + 16, size + (label ? 40 : 16), 10, '#ffffff', '#000', 4);
  ctx.imageSmoothingEnabled = false; ctx.drawImage(qrImg, x, y, size, size);
  if (label) text('SCAN TO PLAY', x + size / 2, y + size + 16, 10, '#000', 'center', null);
}
function drawHud() {
  fighters.forEach((f, i) => {
    const cx = i ? W * .66 : W * .34, y = H - 58;
    rrect(cx - 130, y - 44, 260, 92, 14, 'rgba(10,8,24,.75)', SLOT_COLORS[i], 4);
    ctx.save(); ctx.beginPath(); ctx.roundRect(cx - 126, y - 40, 84, 84, 10); ctx.clip();
    ctx.fillStyle = shade(f.ch.color, -55); ctx.fillRect(cx - 126, y - 40, 84, 84);
    if (hudSpr[i].ch !== f.ch || !hudSpr[i].spr || T % 6 === i) { hudSpr[i].ch = f.ch; renderSprite(hudSpr[i], full(f.act === 'out' ? POSES.hurt : idlePose(T, i))); } // portraits refresh every 6th frame
    blit(hudSpr[i].spr, cx - 84, y + 72, 2.6);
    ctx.restore();
    text(f.ch.name, cx + 40, y - 26, 12, f.ch.color);
    if (f.hasFS) { for (let k = 0; k < 6; k++) { ctx.fillStyle = RAINBOW[(k + (T >> 3)) % 6]; ctx.fillRect(cx + 100, y - 40 + k * 4, 22, 4); } text('B!', cx + 111, y - 8, 10, '#fff'); }
    const sh = f.hudShake ? (Math.random() - .5) * f.hudShake : 0;
    text(`${Math.floor(f.dmg)}%`, cx + 42 + sh, y + 4 + sh, 30, f.act === 'out' ? '#555' : heat(f.dmg));
    for (let s = 0; s < f.stocks; s++) { const sx = cx + 8 + s * 24; ctx.fillStyle = '#000'; ctx.fillRect(sx - 1, y + 27, 18, 14); ctx.fillStyle = f.ch.color; ctx.fillRect(sx + 1, y + 29, 14, 10); ctx.fillStyle = '#fff'; ctx.fillRect(sx + 9, y + 31, 3, 3); }
    if (f.ch.fuel && f.fuel < f.ch.fuel) { ctx.fillStyle = '#123'; ctx.fillRect(cx - 38, y + 44, 76, 6); ctx.fillStyle = f.fuel > f.ch.fuel * .25 ? '#ffb13b' : '#ff4b4b'; ctx.fillRect(cx - 38, y + 44, 76 * f.fuel / f.ch.fuel, 6); }
    if (f.store > 0) { ctx.fillStyle = '#123'; ctx.fillRect(cx + 90, y + 28, 30, 10); ctx.fillStyle = '#6dff8a'; ctx.fillRect(cx + 90, y + 28, 30 * f.store / 90, 10); }
  });
}
function drawFight() {
  drawWorld();
  drawHud();
  if (countdown > 20) { const n = Math.ceil((countdown - 20) / 60), k = ((countdown - 20) % 60) / 60; text(String(n), W / 2, H / 2 - 40, 80 + k * 60, '#ffe07a'); }
  if (goT > 0) text('GO!', W / 2, H / 2 - 40, 100 + (60 - goT), '#ff5a3b');
  if (endT) text('GAME!', W / 2, H / 2 - 40, Math.min(110, endT * 3), '#ffffff', 'center', '#c0142a');
  drawCutin();
  if (paused) { ctx.fillStyle = 'rgba(8,4,24,.7)'; ctx.fillRect(0, 0, W, H); text('PAUSED', W / 2, H / 2 - 50, 56, '#ffd23f'); text('START / P / ESC: RESUME   ·   B: QUIT', W / 2, H / 2 + 30, 16, '#fff'); }
  if (flash > 0) { ctx.fillStyle = `rgba(255,255,255,${flash / 8})`; ctx.fillRect(0, 0, W, H); }
}

// ---------- menus ----------
const cardSpr = CHARS.map(ch => ({ ch }));
const bigSpr = [{}, {}];
const SHOW = ['jab', 'ftilt', 'usmash', 'fsmash', 'nair', 'dsmash', 'utilt', 'fair'];
function showcasePose(ch, t, seed) {
  const cyc = 110, k = Math.floor(t / cyc) + seed, lt = t % cyc, m = ch.moves[SHOW[k % SHOW.length]];
  return lt < 50 || lt - 50 > m.s + m.a + m.e ? idlePose(t, seed) : movePose(m, lt - 50, false, null);
}
function menuBg(c1, c2) {
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, c1); g.addColorStop(1, c2); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(255,255,255,.04)';
  for (let y = 0; y < H; y += 48) for (let x = ((y / 48) % 2) * 24 - (T % 48); x < W; x += 48) ctx.fillRect(x, y, 24, 24);
}
function drawTitle() {
  stage = STAGES[0]; stageArt = getArt(stage);
  Object.assign(cam, { x: Math.sin(T * .004) * 200, y: -180, z: 1 });
  stage.drawBg(ctx, stageArt, cam);
  setT(1, 1, W / 2 - cam.x, H / 2 - cam.y + 80); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'low';
  stage.drawStage(ctx, stageArt);
  for (let k = 0; k < 7; k++) {
    const i = ((T / 300 | 0) * 7 + k) % CHARS.length, x = -390 + k * 130;
    blit(renderSprite(cardSpr[i], full(showcasePose(CHARS[i], T + k * 37, k)), null, true), x, 0, PX, k < 3 ? 1 : -1);
  }
  setT(1, 1, 0, 0);
  ctx.fillStyle = 'rgba(8,4,24,.35)'; ctx.fillRect(0, 0, W, H);
  const bob = Math.sin(T * .05) * 6;
  text('SUPER', W / 2, 90 + bob, 36, '#ffffff', 'center', '#1a0f40');
  for (let i = 3; i >= 0; i--) text('PIXEL SMASH', W / 2 + i * 3, 160 + bob + i * 3, 64, i ? ['#000', '#7a1420', '#c8322a'][i - 1] : '#ffd23f', 'center', i ? null : '#1a0f40');
  if ((T >> 5) % 2) text('PRESS  A', W / 2, 300, 24, '#ffffff');
  text('1 PLAYER? A CPU JOINS AUTOMATICALLY', W / 2, 425, 10, '#ffd23f');
  text(`PHONE CONTROLLER: ${padUrl || 'waiting for server…'}`, W / 2, 360, 12, '#bfe6ff');
  [0, 1].forEach(i => text(`P${i + 1} ${padsConnected[i] ? '● PHONE' : '○ ---'}`, W / 2 + (i ? 150 : -150), 392, 14, padsConnected[i] ? SLOT_COLORS[i] : '#888'));
  drawQR(W - 200, 250, 160);
  text(SFX.ac ? '' : 'click / press a key to enable sound', W / 2, H - 20, 10, '#aaa', 'center', null);
  text(`GRAPHICS: ${QUALITY === 'high' ? 'HIGH' : 'FAST'}  (Q to switch)`, W - 20, 20, 9, '#aaa', 'right', null);
}
function drawSelect() {
  menuBg('#1a0f40', '#3a1450');
  text('CHOOSE YOUR FIGHTER', W / 2, 36, 26, '#ffd23f', 'center', '#000');
  CHARS.forEach((ch, i) => {
    const w = 108, h = 84, x = 18 + (i % COLS) * 115, y = 52 + (i / COLS | 0) * 89, hover = sel.map(s => s.cur === i);
    rrect(x, y, w, h, 10, shade(ch.color, -62), '#000', 3);
    ctx.save(); ctx.beginPath(); ctx.roundRect(x, y, w, h, 10); ctx.clip();
    ctx.fillStyle = shade(ch.color, -40); ctx.fillRect(x, y + 58, w, 26);
    const hot = hover.some(Boolean); // idle cards only re-render every 6th frame (36 sprites is a lot of pixels)
    const spr = hot || !cardSpr[i].spr || (T + i) % 6 === 0 ? renderSprite(cardSpr[i], full(hot ? showcasePose(ch, T, i) : idlePose(T, i)), null, true) : cardSpr[i].spr;
    blit(spr, x + w / 2, y + 70, 1.6);
    ctx.restore();
    text(ch.name, x + w / 2, y + 77, ch.name.length > 10 ? 6 : 8, '#fff');
    hover.forEach((on, p) => {
      if (!on) return;
      rrect(x - 3 + p * 3, y - 3 + p * 3, w + 6 - p * 6, h + 6 - p * 6, 12, null, SLOT_COLORS[p], sel[p].locked ? 7 : 4);
      rrect(x + (p ? w - 34 : 3), y + 3, 31, 15, 4, SLOT_COLORS[p]); text(cpu[p] ? 'CPU' : `P${p + 1}`, x + (p ? w - 18.5 : 18.5), y + 11, 7, '#fff', 'center', null);
    });
  });
  [0, 1].forEach(i => {
    const x = i ? 660 : 20, y = 420, s = sel[i], ch = CHARS[s.cur];
    rrect(x, y, 600, 280, 16, 'rgba(0,0,0,.45)', SLOT_COLORS[i], 5);
    ctx.save(); ctx.beginPath(); ctx.roundRect(x, y, 600, 280, 16); ctx.clip();
    ctx.fillStyle = shade(ch.color, -50); ctx.beginPath(); ctx.arc(x + 130, y + 170, 120, 0, 7); ctx.fill();
    bigSpr[i].ch = ch; blit(renderSprite(bigSpr[i], full(s.locked ? { ...POSES.victory, y: Math.sin(T * .1) } : showcasePose(ch, T, i * 3)), null, true), x + 130, y + 262, 5.5, i ? -1 : 1);
    ctx.restore();
    text(`P${i + 1}${cpu[i] ? ` · CPU LV${cpuLv[i]}` : ''}`, x + 20, y + 24, 14, SLOT_COLORS[i], 'left');
    text(ch.name, x + 270, y + 38, 28, ch.color, 'left');
    text(`${ch.series} · ${ch.title.toUpperCase()}`, x + 270, y + 68, 9, '#ddd', 'left');
    ['speed', 'power', 'weight', 'jump'].forEach((k, n) => {
      text(k.toUpperCase(), x + 270, y + 94 + n * 19, 9, '#aaa', 'left', null);
      for (let p = 0; p < 5; p++) { ctx.fillStyle = p < ch.stats[k] ? ch.color : '#333'; ctx.fillRect(x + 360 + p * 24, y + 88 + n * 19, 20, 11); }
    });
    ['B', '→B', '↑B', '↓B'].forEach((k, n) => { text(k, x + 270, y + 176 + n * 17, 9, '#ffd23f', 'left', null); text(ch.specials[n], x + 310, y + 176 + n * 17, 9, '#fff', 'left', null); });
    text('★ ' + ch.fs.name, x + 270, y + 246, 8, '#ff9ae0', 'left', null);
    if (s.locked) { rrect(x + 440, y + 12, 140, 34, 8, SLOT_COLORS[i]); text('READY!', x + 510, y + 30, 14, '#fff'); }
    else if (cpu[i]) text(`P${2 - i}: PICK THE CPU'S FIGHTER`, x + 20, y + 254, 10, '#ffd23f', 'left');
    if (!padsConnected[i] && !s.locked) drawQR(x + 505, y + 14, 80, false);
    if (!padsConnected[i]) text(cpu[i] ? `P${2 - i} JUMP = remove CPU · SHIELD = level` : `scan QR to join · P${2 - i} JUMP = CPU`, x + 270, y + 268, 8, '#888', 'left', null);
  });
  if (sel.every(s => s.locked) && (T >> 4) % 2) { rrect(W / 2 - 250, 396, 500, 40, 10, '#c0142a', '#fff', 3); text('PRESS A — CHOOSE STAGE', W / 2, 417, 16, '#fff'); }
}
const thumbs = {};
function stageThumb(st) { // render the stage once into a small canvas by pointing the renderer at it
  if (thumbs[st.id]) return thumbs[st.id];
  const c = mkCanvas(448, 252), save = [ctx, K], camSave = { ...cam };
  ctx = c.getContext('2d'); K = c.width / W;
  Object.assign(cam, { x: 0, y: -150, z: .78 });
  setT(1, 1, 0, 0); st.drawBg(ctx, getArt(st), cam);
  setT(cam.z, cam.z, W / 2 - cam.x * cam.z, H / 2 - cam.y * cam.z); st.drawStage(ctx, getArt(st));
  [ctx, K] = save; Object.assign(cam, camSave);
  return thumbs[st.id] = c;
}
function drawStageSel() {
  menuBg('#0f1a40', '#14304a');
  text('CHOOSE A STAGE', W / 2, 44, 26, '#ffd23f');
  const cols = 5, w = 224, h = 126;
  STAGES.forEach((s, i) => {
    const x = 640 - (cols * (w + 16) - 16) / 2 + (i % cols) * (w + 16), y = 84 + (i / cols | 0) * (h + 52), on = i === stageCur;
    ctx.save(); ctx.beginPath(); ctx.roundRect(x, y, w, h, 12); ctx.clip(); ctx.drawImage(stageThumb(s), x, y, w, h); ctx.restore();
    rrect(x, y, w, h, 12, null, on ? '#ffd23f' : '#000', on ? 7 : 3);
    text(s.name, x + w / 2, y + h + 18, s.name.length > 14 ? 9 : 11, on ? '#ffd23f' : '#fff');
  });
  text('stick to pick   ·   A to fight   ·   B back', W / 2, 468, 12, '#bbb', 'center', null);
  sel.forEach((s, i) => { const ch = CHARS[s.cur]; bigSpr[i].ch = ch; blit(renderSprite(bigSpr[i], full(idlePose(T, i))), i ? W - 180 : 180, 700, 3.2, i ? -1 : 1); text(ch.name, i ? W - 180 : 180, 540, 14, SLOT_COLORS[i]); });
}
function drawResults() {
  drawWorld();
  ctx.fillStyle = 'rgba(8,4,24,.8)'; ctx.fillRect(0, 0, W, H);
  const f = fighters[winner];
  ctx.fillStyle = shade(f.ch.color, -45); ctx.beginPath(); ctx.arc(330, 380, 230, 0, 7); ctx.fill();
  bigSpr[0].ch = f.ch; blit(renderSprite(bigSpr[0], full({ ...POSES.victory, y: Math.sin(T * .1) * 1.5 }), null, true), 330, 590, 8);
  text(`P${winner + 1} WINS!`, 330, 90, 44, SLOT_COLORS[winner]);
  text(f.ch.name, 330, 140, 22, f.ch.color);
  ['', 'KOs', 'FALLS', 'DAMAGE', 'COMBO'].forEach((h, n) => text(h, 760 + n * 115 - 115, 230, 12, '#aaa'));
  fighters.forEach((g, i) => {
    const y = 290 + i * 70;
    text(`P${i + 1} ${g.ch.name}`, 670, y, 14, SLOT_COLORS[i]);
    [g.stats.kos, g.stats.falls, `${Math.round(g.stats.dealt)}%`, g.stats.best || 0].forEach((v, n) => text(String(v), 760 + n * 115, y, 18, '#fff'));
  });
  if (resT >= 60 && (T >> 5) % 2) text('A: REMATCH   ·   B: CHARACTER SELECT', 930, 560, 14, '#fff');
}

function render() {
  fitCanvas();
  setT(1, 1, 0, 0); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'low';
  if (state === 'fight' && !stageArt) stageArt = getArt(stage);
  switch (state) {
    case 'title': drawTitle(); break;
    case 'select': drawSelect(); break;
    case 'stage': drawStageSel(); break;
    case 'fight': stageArt = getArt(stage); drawFight(); break;
    case 'results': stageArt = getArt(stage); drawResults(); break;
  }
  if (errMsg) { setT(1, 1, 0, 0); text('ERROR: ' + errMsg, W / 2, 20, 10, '#ff5a5a', 'center', '#000'); }
}

// ?demo=1 : CPU vs CPU attract mode (&p1=0&p2=3&stage=1 to pick)
if (Q.has('demo')) {
  cpu[0] = cpu[1] = true;
  sel[0].cur = +(Q.get('p1') ?? Math.random() * CHARS.length | 0); sel[1].cur = +(Q.get('p2') ?? Math.random() * CHARS.length | 0);
  stageCur = +(Q.get('stage') ?? 0); startMatch();
  if (Q.has('fs')) fighters[0].hasFS = true; // start P1 with a Final Smash ready
  for (let i = +(Q.get('ff') || 0); i > 0; i--) tick(); // fast-forward, handy for screenshots
}
if (Q.get('screen')) state = Q.get('screen');

let last = performance.now(), acc = 0;
function frame(now) {
  let dt = now - last; last = now;
  if (Math.abs(dt - 1000 / 60) < 2.5) dt = 1000 / 60;
  acc += Math.min(100, dt);
  let n = 0;
  while (acc >= 1000 / 60) { tick(); acc -= 1000 / 60; n++; }
  if (n) render(); // 120/144 Hz displays: don't redraw frames that didn't change
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
