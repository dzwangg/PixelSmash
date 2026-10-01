// Merge KITS onto the roster and rebuild move tables.
for (const ch of CHARS) {
  const k = KITS[ch.id]; if (!k) continue;
  if (k.specials_) ch.specials_ = k.specials_;
  if (k.specials) ch.specials = k.specials;
  if (k.desc) ch.desc = k.desc;
  if (k.stats) Object.assign(ch, k.stats);
  buildChar(ch);
  for (const [name, m] of Object.entries(k.normals || {})) ch.moves[name] = { ...ch.moves[name], ...m };
}

// Signature throws: each fighter's one named throw (called out on screen). [dir, name, dmg, b, g, ang, extra]
const SIG_THROWS = {
  blaze: ['f', 'FLAME SUPLEX', 11, 6, .55, 40], volt: ['d', 'STATIC SLAM', 7, 6, .1, 85], grom: ['b', 'LANDSLIDE', 13, 6, .6, 140],
  pip: ['u', 'SKY TOSS', 7, 7, .5, 90], nyx: ['d', 'HEX PIN', 6, 4, .1, 80, { slow: 90 }], rusty: ['f', 'PISTON PUSH', 10, 7, .5, 35],
  luffy: ['b', 'GUM-GUM SLINGSHOT', 11, 7, .6, 135], zoro: ['u', 'TATSUMAKI', 10, 6, .55, 88], sanji: ['u', 'ANTI-MANNER KICK', 9, 6, .6, 90],
  nami: ['d', 'THUNDER TEMPO', 8, 5, .15, 80], usopp: ['f', 'SPECIAL ATLAS', 9, 8, .35, 25], tanjiro: ['f', 'WATER WHEEL', 10, 6, .5, 45],
  zenitsu: ['f', 'THUNDERCLAP TOSS', 8, 8, .45, 20], nezuko: ['u', 'BLOOD BURST', 10, 6, .55, 88], rengoku: ['b', 'FLAME TIGER', 12, 6, .6, 140],
  yuji: ['d', 'DIVERGENT SLAM', 9, 5, .12, 80], gojo: ['u', 'BLUE LIFT', 8, 7, .55, 90], megumi: ['b', 'DIVINE DOG TOSS', 10, 6, .55, 140],
  sukuna: ['f', 'CLEAVE', 12, 6, .55, 40], mochi: ['f', 'YORIKIRI', 12, 7, .55, 35], glitch: ['b', 'BUFFER OVERFLOW', 9, 7, .55, 150],
  ronaldo: ['u', 'BICYCLE KICK', 9, 6, .6, 88], lebron: ['d', 'CHASE-DOWN SLAM', 8, 5, .15, 85], ironman: ['f', 'REPULSOR BLAST', 10, 7, .5, 35],
  spiderman: ['b', 'WEB SLINGSHOT', 10, 7, .55, 140], batman: ['d', 'TAKEDOWN', 9, 5, .12, 80], cap: ['f', 'SHIELD BASH', 10, 7, .5, 40],
  thor: ['u', 'THUNDER LIFT', 10, 6, .6, 90], kaiju: ['b', 'TAIL WHIP', 12, 7, .6, 140], djbass: ['u', 'DROP THE BASS', 8, 7, .55, 90],
  mimi: ['d', 'TRICK SAW', 8, 5, .12, 80], astro: ['u', 'LIFTOFF', 8, 8, .55, 90], granny: ['f', 'PURSE WALLOP', 12, 7, .55, 40],
  toji: ['f', 'SORCERER KILLER TOSS', 11, 7, .5, 38], higuruma: ['d', 'GAVEL DROP', 9, 5, .15, 80], hakari: ['u', 'JACKPOT LAUNCH', 9, 7, .55, 90], yuta: ['b', 'RIKA TOSS', 11, 6, .55, 140], kage: ['b', 'SHADOW DROP', 10, 6, .55, 140], cluck: ['d', 'PECK STORM', 9, 5, .15, 80], gloop: ['f', 'SPIT OUT', 10, 8, .45, 30], inky: ['f', 'PAPER PLANE', 10, 8, .45, 30],
};
for (const ch of CHARS) {
  const s = SIG_THROWS[ch.id]; if (!s) continue;
  const [k, name, dmg, b, g, ang, extra] = s;
  ch.throws[k] = { ...ch.throws[k], name, dmg, b, g, ang, ...extra };
}
