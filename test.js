// Headless check: runs the real game scripts with DOM stubs, CPU vs CPU on every matchup/stage.
const fs = require('fs'), vm = require('vm');
const noop = new Proxy(function () {}, { get: (t, k) => k === Symbol.toPrimitive ? () => 0 : noop, set: () => true, apply: () => noop });
const listeners = {};
const ctx = {
  document: { getElementById: () => ({ getContext: () => noop }), createElement: () => ({ getContext: () => noop }) },
  WebSocket: function () { return {}; }, Image: function () { return {}; }, addEventListener: (t, f) => (listeners[t] = f), requestAnimationFrame: () => {},
  performance: { now: () => 0 }, location: { host: 'x', search: '' }, ONLY: process.env.ONLY || '', URLSearchParams, console, Math, JSON, setTimeout, listeners,
};
ctx.window = ctx;
const src = ['gfx', 'audio', 'stages', 'stages/volcano', 'stages/galleon', 'stages/sakura', 'stages/frozen', 'stages/stadium', 'stages/jungle', 'stages/cyber', 'chars', 'roster2', 'roster3', 'kits/_base', 'kits/originals', 'kits/onepiece', 'kits/demonslayer', 'kits/jjk', 'kits/heroes', 'kits/originals2', 'kits/_apply', 'final', 'game'].map(f => fs.readFileSync(`${__dirname}/public/${f}.js`, 'utf8')).join('\n;\n');
function tests() {
  const assert = (c, m) => { if (!c) throw new Error(m); };
  let games = 0, kos = 0, fsUsed = 0;
  const N = CHARS.length;
  const IDX = CHARS.map((c, i) => i).filter(i => !ONLY || ONLY.split(',').includes(CHARS[i].id));
  assert(IDX.length, 'ONLY matched no fighters');
  for (const a of IDX) for (const off of [1, 7, 13]) {
    const b = (a + off) % N, st = (a + off) % STAGES.length;
    cpu[0] = cpu[1] = true; sel[0].cur = a; sel[1].cur = b; stageCur = st; startMatch(); ballTimer = 300;
    for (let i = 0; i < 2400 && state === 'fight'; i++) {
      tick();
      if (fighters.some(f => f.act === 'final') && fighters.every(f => f.ft !== 2)) {}
      for (const f of fighters) { if (f.act === 'final' && f.ft === 1) fsUsed++; assert(Number.isFinite(f.x) && Number.isFinite(f.y) && Number.isFinite(f.dmg), `NaN ${f.ch.id} act=${f.act}`); }
    }
    games++; kos += fighters.reduce((n, f) => n + f.stats.falls, 0);
    assert(fighters.reduce((n, f) => n + f.stats.dealt, 0) > 0, `no damage in ${CHARS[a].id} vs ${CHARS[b].id}`);
  }
  console.log(`${games} CPU matches (${N} fighters), ${kos} KOs, ${fsUsed} Final Smashes used by CPUs`);

  // every Final Smash lands on an idle dummy standing in front
  const fsRes = [];
  for (const a of IDX) {
    cpu[0] = true; cpu[1] = false; sel[0].cur = a; sel[1].cur = 0; stageCur = 2; startMatch(); countdown = 0; ballTimer = 1e9;
    const [f, foe] = fighters; f.x = -60; foe.x = 60; f.face = 1; f.hasFS = true;
    special(f, blank());
    for (let i = 0; i < 480; i++) tick();
    assert(f.act !== 'final', `${f.ch.id} final smash never ended`);
    const ok = foe.dmg >= 10 || foe.stocks < 3 || foe.shrink > 0 || foe.sleep > 0 || foe.invert > 0 || f.buff || f.fsBuff || f.clones || foe.confT > 0 || f.execT > 0;
    fsRes.push(`${f.ch.id}:${ok ? 'hit' : 'MISS ' + (foe.dmg | 0)}`);
    assert(ok, `${f.ch.id} final smash (${f.ch.fs.type}) did not land: ${foe.dmg}%`);
  }
  console.log('final smashes:', fsRes.join(' '));

  // every special of every fighter, in the air and on the ground, pressed twice (gadget re-press)
  const dirs = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: -1 }, { x: 0, y: 1 }];
  for (const a of IDX) for (const d of dirs) for (const air of [0, 1]) {
    cpu[0] = cpu[1] = false; sel[0].cur = a; sel[1].cur = 1; stageCur = 0; startMatch(); countdown = 0; ballTimer = 1e9;
    const [f, foe] = fighters; f.x = -100; foe.x = 100; f.face = 1;
    if (air) { f.y = -200; f.ground = null; setAct(f, 'air'); }
    special(f, { ...blank(), ...d });
    for (let i = 0; i < 40; i++) tick();
    if (f.act === 'stand' || f.act === 'air') special(f, { ...blank(), ...d });
    for (let i = 0; i < 120; i++) tick();
    for (const g of fighters) assert(Number.isFinite(g.x) && Number.isFinite(g.y), `special ${CHARS[a].id} ${JSON.stringify(d)} air=${air} -> NaN`);
  }
  console.log('all specials OK');

  // combos: a jab string and a tilt -> jump-cancel -> aerial juggle both register as true combos
  const combo = (charIdx, seq, place) => {
    cpu[0] = cpu[1] = false; sel[0].cur = charIdx; sel[1].cur = 1; stageCur = 2; startMatch(); countdown = 0; ballTimer = 1e9;
    const [p1, p2] = fighters; p1.x = 0; p2.x = place; p1.face = 1; p2.face = -1;
    let best = 0;
    for (const [inp, n] of seq) for (let k = 0; k < n; k++) { padIn[0] = { ...blank(), ...inp }; tick(); best = Math.max(best, p2.combo || 0); }
    padIn[0] = blank(); for (let k = 0; k < 60; k++) tick();
    return best;
  };
  const tap = (inp, gap) => [[inp, 1], [{}, gap]];
  const jabs = combo(0, [...tap({ a: 1 }, 6), ...tap({ a: 1 }, 6), ...tap({ a: 1 }, 30)], 60);
  assert(jabs >= 3, 'jab string should be a 3-hit combo, got ' + jabs);
  const juggle = combo(0, [...tap({ a: 1, y: -.6 }, 9), [{ j: 1 }, 3], ...tap({ a: 1 }, 30)], 45);
  assert(juggle >= 2, 'utilt -> jump -> nair should combo, got ' + juggle);
  console.log(`combos OK: jab string ${jabs} hits, utilt juggle ${juggle} hits`);

  // no infinite traps: Gojo spamming Blue (and a CPU spamming everything) can't hold someone forever
  const trapTest = (atkId, press) => {
    cpu[0] = cpu[1] = false; sel[0].cur = CHARS.findIndex(c => c.id === atkId); sel[1].cur = 0; stageCur = 2; startMatch(); countdown = 0; ballTimer = 1e9;
    const [g, v] = fighters; g.x = 0; v.x = 170; g.face = 1;
    let run = 0, worst = 0;
    for (let i = 0; i < 600; i++) {
      padIn[0] = { ...blank(), ...(i % press < 2 ? { b: 1 } : {}) };
      tick();
      const stuck = ['hurt', 'locked', 'frozen', 'dizzy'].includes(v.act);
      run = stuck ? run + 1 : 0; worst = Math.max(worst, run);
    }
    padIn[0] = blank();
    return worst;
  };
  const gojoTrap = Math.max(trapTest('gojo', 30), trapTest('gojo', 16), trapTest('gojo', 45));
  assert(gojoTrap <= 175, 'Gojo Blue still traps for ' + gojoTrap + ' frames');
  let worstAny = 0;
  for (const a of IDX) {
    cpu[0] = true; cpu[1] = false; sel[0].cur = a; sel[1].cur = 0; stageCur = 0; startMatch(); countdown = 0; ballTimer = 1e9;
    const v = fighters[1]; let run = 0;
    for (let i = 0; i < 900; i++) { tick(); const st = ['hurt', 'locked', 'frozen', 'dizzy'].includes(v.act) && !v.sbreak && !v.sleep && !v.iced && fighters[0].act !== 'final'; run = st ? run + 1 : 0; worstAny = Math.max(worstAny, run); }
  }
  assert(worstAny <= 175, 'someone stayed trapped for ' + worstAny + ' frames');
  console.log(`no infinites: Gojo Blue spam traps at most ${gojoTrap} frames; longest trap by any fighter ${worstAny} frames`);

  // smash ball: breaking it grants the final smash
  cpu[0] = cpu[1] = false; sel[0].cur = 0; sel[1].cur = 1; startMatch(); countdown = 0; ballTimer = 1; freeze = 0; // hitlag left over from the previous test would skip the ball update
  tick(); assert(ball, 'ball spawned');
  const hero = fighters[0];
  for (let i = 0; i < 40 && ball; i++) { ball.x = hero.x + 50; ball.y = hero.y - 60; ball.vx = ball.vy = 0; startMove(hero, hero.ch.moves.jab); for (let k = 0; k < 14; k++) tick(); }
  assert(hero.hasFS && !ball, 'breaking the ball grants a final smash');
  console.log('smash ball OK');

  // KO calibration: charged-less forward smash at centre stage vs Blaze
  const koAt = (atk, pct) => {
    cpu[0] = cpu[1] = false; sel[0].cur = atk; sel[1].cur = 0; stageCur = 2; startMatch(); countdown = 0;
    const [a, b] = fighters; a.x = 0; b.x = 70; b.dmg = pct; a.face = 1;
    startMove(a, a.ch.moves.fsmash);
    for (let i = 0; i < 400; i++) { tick(); if (b.stocks < 3) return true; }
    return false;
  };
  for (const atk of [0, 1, 2]) {
    const pct = [40, 60, 80, 100, 120, 140, 160, 200].find(p => koAt(atk, p));
    console.log(CHARS[atk].name.padEnd(6), 'fsmash KOs Blaze from centre at ~' + pct + '%');
  }
  // solo flow: human (keyboard P1) locks in -> CPU joins -> human picks CPU's fighter -> stage -> fight
  cpu[0] = cpu[1] = false; sel.forEach(s => s.locked = false); state = 'select'; padsConnected = [true, false];
  const press = (code, n = 2) => { keys.add(code); for (let i = 0; i < n; i++) tick(); keys.delete(code); for (let i = 0; i < 3; i++) tick(); };
  sel[0].cur = 0; press('KeyF');
  assert(sel[0].locked && cpu[1] && !sel[1].locked, 'CPU should auto-join unlocked');
  sel[1].cur = CHARS.length - 1; press('KeyD'); assert(sel[1].cur === (CHARS.length - 1) - (CHARS.length - 1) % 11, 'right on the last fighter should wrap to its row start');
  const before = sel[1].cur; press('KeyD'); assert(sel[1].cur !== before || before === 2, 'P1 steers CPU cursor');
  sel[1].cur = 2; press('KeyF'); assert(sel[1].locked, 'CPU locked by P1');
  for (let i = 0; i < 20; i++) tick(); press('KeyF'); assert(state === 'stage', 'to stage select, got ' + state);
  press('KeyF'); assert(state === 'fight' && fighters[1].ch.id === 'grom', 'fight vs CPU Grom');
  for (let i = 0; i < 1800; i++) tick();
  assert(fighters[0].stats.falls + fighters[0].dmg > 0, 'CPU attacks the idle human');
  console.log('solo flow OK: idle human took', fighters[0].dmg | 0, '% and', fighters[0].stats.falls, 'falls in 30s');
  padsConnected = [false, false];

  // new rules: tap latch, pummel rate, pause, rematch, Iron Man fuel, LeBron fast break, Nyx pounce cooldown
  const fresh = (a, b) => { cpu[0] = cpu[1] = false; sel[0].cur = a; sel[1].cur = b; stageCur = 0; startMatch(); countdown = 0; freeze = 0; ballTimer = 1e9; return fighters; };
  const id = k => CHARS.findIndex(c => c.id === k);
  latch[0].a = 1; assert(readInput(0).a === 1, 'latched tap not seen'); tick(); assert(!latch[0].a, 'latch not cleared after tick');
  { const [f, foe] = fresh(0, 1); foe.x = f.x + 40; doGrab(f, foe); for (let i = 0; i < 60; i++) { f.buf = { a: 8, b: 0, j: 0, s: 0 }; step(f, blank()); }
    assert(foe.dmg <= 10, `pummel did ${foe.dmg}% in 1s`); }
  { const [f] = fresh(0, 1); f.x = 0; latch[0].p = 1; tick(); assert(paused, 'START did not pause'); keys.add('KeyD'); for (let i = 0; i < 30; i++) tick(); keys.delete('KeyD');
    assert(f.x === 0, 'moved while paused'); tick(); latch[0].p = 1; tick(); assert(!paused, 'START did not resume'); }
  { fresh(0, 1); state = 'results'; resT = 0; latch[0].a = 1; tick(); assert(state === 'results', 'results skipped instantly');
    for (let i = 0; i < 60; i++) tick(); latch[0].a = 1; tick(); assert(state === 'fight', 'A on results did not rematch'); }
  { const [f] = fresh(id('ironman'), 1); f.y = -300; f.ground = null; setAct(f, 'air'); special(f, { ...blank(), y: -1 });
    for (let i = 0; i < 90; i++) step(f, { ...blank(), y: -1 });
    assert(f.fuel === 0 && f.act !== 'helpless' && f.act !== 'move', `flight: fuel=${f.fuel} act=${f.act}`); }
  { const [f, foe] = fresh(id('lebron'), 1); f.x = 0; foe.x = 60; f.face = 1; startMove(f, f.ch.moves.dashAtk);
    for (let i = 0; i < 20 && !f.hr_fb; i++) tick(); assert(f.hr_fb, 'dash attack missed'); f.buf.a = 8; for (let i = 0; i < 12 && f.move?.dur !== 34; i++) tick();
    assert(f.move?.onHit && f.move.dur === 34, 'fast break did not start'); }
  { const [f] = fresh(id('nyx'), 1); special(f, { ...blank(), x: 1 }); for (let i = 0; i < 40; i++) tick();
    const c = owned(f, 'or_cat'); assert(c, 'no cat'); special(f, { ...blank(), x: 1 }); const cd = c.cd; special(f, { ...blank(), x: 1 }); assert(c.cd === cd, 'cat pounce has no cooldown'); }
  { const [f] = fresh(id('granny'), 1); f.store = 90; special(f, { ...blank(), x: 1 }); assert(f.o2_pc === 90 && f.store === 0, 'BINGO did not cash in a WHAMMY'); }
  { const [f] = fresh(id('lebron'), 1); f.y = -300; f.ground = null; startMove(f, HR_DUNK); for (let i = 0; i < 80 && f.act === 'move'; i++) step(f, blank());
    assert(f.act !== 'helpless' && Number.isFinite(HR_DUNK.dmg), `dunk left LeBron ${f.act}`); }
  for (const dom of ['gojo', 'sukuna', 'yuji', 'megumi', 'higuruma', 'yuta']) { // domains can't sure-hit Toji (zero cursed energy)
    const [f, foe] = fresh(id(dom), id('toji')); f.x = -60; foe.x = 60; f.hasFS = true; special(f, blank());
    for (let i = 0; i < 300; i++) { tick(); foe.stuckT = 0; } assert(foe.dmg === 0 && foe.stocks === 3, `${dom}'s domain hit Toji: ${foe.dmg}%`); }
  { const [f, foe] = fresh(id('toji'), id('gojo')); f.x = -40; foe.x = 40; f.face = 1; foe.face = -1; // Inverted Spear pierces Infinity
    startMove(foe, foe.ch.moves.dspec); special(f, { ...blank(), x: 1 }); for (let i = 0; i < 20; i++) tick(); assert(foe.dmg > 0, 'Inverted Spear did not pierce Infinity'); }
  { const [f, foe] = fresh(id('higuruma'), 1); f.x = -60; foe.x = 60; foe.stats.kos = 1; f.hasFS = true; special(f, blank()); // murder -> Executioner's Sword
    for (let i = 0; i < 200; i++) tick(); assert(f.execT > 0 && !(foe.confT > 0), 'no death penalty for a KO');
    foe.dmg = 0; applyHit(f, foe, { dmg: 1, b: 1, g: 0, ang: 40 }, 1, foe.x, foe.y); assert(foe.dmg > 40 && f.execT === 0, 'sword hit was not lethal'); }
  { const [f, foe] = fresh(id('higuruma'), 1); f.x = -60; foe.x = 60; f.hasFS = true; special(f, blank()); // nothing done -> Confiscation
    for (let i = 0; i < 200; i++) tick(); assert(foe.confT > 0, 'no confiscation'); setAct(foe, 'stand'); special(foe, { ...blank(), x: 1 }); assert(foe.act !== 'move', 'confiscated foe still used a special'); }
  { const [f, foe] = fresh(id('yuta'), id('blaze')); f.x = -40; foe.x = 60; f.face = 1; special(f, { ...blank(), x: 1 }); // Copy uses THEIR side special
    for (let i = 0; i < 6; i++) tick(); assert(f.move?.jjPaste, 'Yuta did not copy the side special'); }
  { const [f] = fresh(id('inky'), 1); f.x = 0; f.y = -300; f.ground = null; setAct(f, 'air'); special(f, { ...blank(), y: -1 }); // Sketch Step: stand on the drawn platform until it fades
    for (let i = 0; i < 60; i++) step(f, blank()); const pl = owned(f, 'ink_plat'); assert(pl && f.ground === pl, 'Inky did not land on her platform');
    for (let i = 0; i < 260; i++) tick(); assert(f.ground !== pl, 'still standing on an expired platform');
    f.uses?.clear(); f.y = -300; f.ground = null; setAct(f, 'air'); special(f, { ...blank(), y: -1 }); for (let i = 0; i < 40; i++) step(f, blank());
    assert(!owned(f, 'ink_plat'), 'platform drawn again during cooldown'); }
  { const [f] = fresh(id('deadeye'), 1); f.x = -300; const seen = new Set(), shots = () => (projectiles.forEach(p => p.kind === 'o2_bullet' && seen.add(p)), seen.size); // six chambers, then reload
    const fire = () => { special(f, blank()); for (let i = 0; i < 16; i++) { tick(); shots(); } };
    for (let k = 0; k < 6; k++) fire(); assert(f.dd_ammo === 0, `deadeye has ${f.dd_ammo} left after 6 shots`);
    const n = shots(); fire(); assert(shots() === 6 && n === 6, `${shots()} bullets fired from a six-shooter`);
    special(f, { ...blank(), y: 1 }); for (let i = 0; i < 40; i++) tick(); assert(f.dd_ammo === 6, 'reload did not refill the cylinder'); }
  { const [f, foe] = fresh(id('deadeye'), 1); cpu[0] = true; f.x = -300; foe.x = 300; f.dd_ammo = 0; // CPU Deadeye reloads an empty gun
    let i = 0; for (; i < 120 && f.dd_ammo === 0; i++) tick(); cpu[0] = false;
    assert(f.dd_ammo === 6, 'CPU Deadeye did not reload its empty gun within 2s'); }
  { const [f, foe] = fresh(id('blossom'), 1); f.x = -200; foe.x = 300; f.face = 1; // Blossom: plants grow, water rushes them, attacks cut them down, max 3
    const plants = () => projectiles.filter(p => p.kind === 'o2_plant' && p.life > 0);
    special(f, blank()); for (let i = 0; i < 60; i++) tick(); const pl = plants()[0];
    assert(pl && pl.stopped && o2_stage(pl) === 1, 'seed did not plant as a sprout');
    special(f, { ...blank(), y: 1 }); for (let i = 0; i < 30; i++) tick(); assert(o2_stage(pl) === 2, 'watering did not grow the sprout');
    let pollen = 0; for (let i = 0; i < 300; i++) { tick(); pollen += projectiles.filter(p => p.kind === 'o2_pollen' && p.t === 1).length; } assert(o2_stage(pl) === 3, 'plant never became a sunflower');
    assert(pollen > 0 && foe.dmg > 0, `sunflower shot ${pollen} pollen, foe at ${foe.dmg}%`);
    for (let k = 0; k < 3; k++) { setAct(f, 'stand'); special(f, blank()); for (let i = 0; i < 60; i++) tick(); }
    assert(plants().length === 3 && !plants().includes(pl), `expected 3 plants with the oldest withered, got ${plants().length}`);
    const q = plants()[2]; foe.x = q.x - 40; foe.face = 1; setAct(foe, 'stand'); startMove(foe, foe.ch.moves.ftilt); for (let i = 0; i < 20; i++) tick();
    assert(q.life <= 0, 'attacking a plant did not cut it down'); }
  console.log('new rules OK: latch, pummel, pause, rematch, flight fuel, fast break, pounce cooldown, bingo, dunk, domains vs Toji, inverted spear, verdicts, yuta copy, inky platform, deadeye ammo + CPU reload, blossom garden');
  console.log('OK');
}
vm.runInNewContext(src + '\n;(' + tests.toString() + ')();', ctx);
