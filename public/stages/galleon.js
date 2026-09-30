// stage: galleon — PIRATE GALLEON: sunny deck of a pirate ship at sea. Deck + raised quarterdeck/forecastle + yardarm.
function gal_planks(g, x, y, w, h, top, bot, seam, r) { // horizontal wood planking with staggered seams
  vgrad(g, x, y, w, h, [top, bot]);
  g.fillStyle = seam;
  for (let yy = y; yy < y + h; yy += 12) { g.fillRect(x, yy, w, 1.4); for (let xx = x + (yy / 12 % 2) * 60 + r() * 40; xx < x + w; xx += 110 + r() * 40) g.fillRect(xx, yy, 1.4, 12); }
}
function gal_gull(ctx, x, y, s, flap) { // tiny gull: two curved wings
  ctx.beginPath(); ctx.moveTo(x - s, y - flap * s * .5); ctx.quadraticCurveTo(x - s * .5, y - s * .5, x, y); ctx.quadraticCurveTo(x + s * .5, y - s * .5, x + s, y - flap * s * .5); ctx.stroke();
}

STAGES.push({
  id: 'galleon', name: 'PIRATE GALLEON',
  main: { x1: -500, x2: 500, y: 0, depth: 90 },
  plats: [{ x1: -490, x2: -280, y: -145 }, { x1: 280, x2: 490, y: -145 }, { x1: -115, x2: 115, y: -300 }],
  blast: { l: -1150, r: 1150, t: -900, b: 620 }, spawn: [-220, 220],
  build() {
    const sky = artLayer(1400, 800, (g, w, h) => {
      vgrad(g, 0, 0, w, h, ['#1f78d8', '#3a98ea', '#6ab8f4', '#a8dcfa', '#dcf2ff']);
      g.globalCompositeOperation = 'lighter'; glow(g, 1120, 110, 360, 'rgba(255,250,220,.55)'); g.globalCompositeOperation = 'source-over';
      disc(g, 1120, 110, 54, '#fffbe8');
      const r = rng(41); g.fillStyle = 'rgba(255,255,255,.35)'; // high wispy cirrus
      for (let i = 0; i < 9; i++) { g.beginPath(); g.ellipse(r() * w, 60 + r() * 180, 90 + r() * 120, 5 + r() * 5, 0, 0, Math.PI * 2); g.fill(); }
    });
    // big fluffy cumulus bank sitting on the horizon (drifts slowly)
    const clouds = artLayer(2800, 800, (g) => {
      const r = rng(42);
      for (let i = 0; i < 14; i++) cloud(g, i * 200 + r() * 80, 380 + r() * 60, 34 + r() * 26, '#ffffff', '#eef6ff', '#b8cce8', i + 40);
      for (let i = 0; i < 6; i++) cloud(g, r() * 2800, 140 + r() * 140, 22 + r() * 18, '#ffffff', '#f2f8ff', '#c4d6ee', i + 60);
    });
    // open ocean with a distant island
    const sea = artLayer(2600, 800, (g, w) => {
      const hz = 440;
      // island
      g.fillStyle = '#6ab0a0'; g.beginPath(); g.ellipse(1850, hz, 260, 70, 0, Math.PI, 0); g.fill();
      g.fillStyle = '#4a9a78'; g.beginPath(); g.ellipse(1800, hz, 160, 46, 0, Math.PI, 0); g.fill();
      g.fillStyle = '#f0e0b0'; g.fillRect(1590, hz - 4, 520, 4);
      for (const [px, ph] of [[1760, 70], [1830, 86], [1920, 64]]) { g.strokeStyle = '#3a6a50'; g.lineWidth = 4; g.beginPath(); g.moveTo(px, hz - 30); g.quadraticCurveTo(px + 8, hz - 30 - ph * .6, px + 4, hz - 30 - ph); g.stroke(); g.fillStyle = '#2e8a5a'; for (let a = 0; a < 5; a++) { g.beginPath(); g.ellipse(px + 4 + Math.cos(a * 1.3) * 16, hz - 30 - ph + 4, 20, 5, a * 1.3, 0, Math.PI * 2); g.fill(); } }
      vgrad(g, 0, hz, w, 800 - hz, ['#2a8ad0', '#1a6ab8', '#10509a', '#0a3a78']);
      g.fillStyle = 'rgba(255,255,255,.7)'; g.fillRect(0, hz, w, 1.5);
      const r = rng(43);
      for (let i = 0; i < 260; i++) { const y = hz + 6 + (r() ** 1.6) * 340, s = (y - hz) / 340; g.fillStyle = r() < .5 ? 'rgba(255,255,255,.5)' : 'rgba(140,210,255,.5)'; g.fillRect(r() * w, y, 8 + s * 40, 1 + s * 2); }
      g.globalCompositeOperation = 'lighter'; glow(g, 2020, hz + 40, 260, 'rgba(255,250,210,.35)'); g.globalCompositeOperation = 'source-over';
    });
    // the ship: hull below the deck (world space). Deck top at y=0 → local y=40
    const hull = artWorld(-640, -80, 1300, 424, (g, w) => {
      const r = rng(44); g.translate(0, 44); // deck edges x=-500..500 → local 140..1140, deck top at local y=36
      // back railing (behind the fighters)
      g.fillStyle = '#6a3a1c'; g.fillRect(150, -8, 980, 7); g.fillStyle = '#b8743a'; g.fillRect(150, -8, 980, 2.5);
      for (let x = 160; x < 1130; x += 22) { vgrad(g, x, -1, 6, 38, ['#a0602c', '#6a3a1c']); }
      // hull shape: bow rises on the right, stern castle on the left
      const hg = g.createLinearGradient(0, 40, 0, 380); hg.addColorStop(0, '#8a4e26'); hg.addColorStop(.5, '#6a3818'); hg.addColorStop(1, '#3a1c0c');
      g.fillStyle = hg; g.beginPath();
      g.moveTo(120, 30); g.lineTo(1150, 30); g.quadraticCurveTo(1230, 30, 1270, 0);
      g.quadraticCurveTo(1230, 200, 1040, 330); g.lineTo(300, 340); g.quadraticCurveTo(170, 300, 120, 30); g.closePath(); g.fill();
      g.save(); g.clip();
      g.strokeStyle = 'rgba(40,16,4,.45)'; g.lineWidth = 1.5; for (let y = 60; y < 380; y += 14) { g.beginPath(); g.moveTo(0, y); g.quadraticCurveTo(700, y + 12, 1300, y - 30); g.stroke(); }
      g.fillStyle = 'rgba(0,0,0,.18)'; for (let i = 0; i < 40; i++) g.fillRect(r() * w, 60 + r() * 260, 30 + r() * 60, 1.5);
      // painted band with gunports
      g.fillStyle = '#c8322a'; g.beginPath(); g.moveTo(0, 90); g.quadraticCurveTo(700, 104, 1300, 70); g.lineTo(1300, 122); g.quadraticCurveTo(700, 150, 0, 136); g.fill();
      g.fillStyle = '#f0c050'; g.beginPath(); g.moveTo(0, 86); g.quadraticCurveTo(700, 100, 1300, 66); g.lineTo(1300, 71); g.quadraticCurveTo(700, 105, 0, 91); g.fill();
      g.beginPath(); g.moveTo(0, 136); g.quadraticCurveTo(700, 150, 1300, 122); g.lineTo(1300, 127); g.quadraticCurveTo(700, 155, 0, 141); g.fill();
      for (let i = 0; i < 6; i++) { const x = 330 + i * 130, y = 112 + Math.sin(i / 5 * Math.PI) * 6; roundRect(g, x - 16, y - 13, 32, 26, 3, '#2a0e06', '#f0c050', 3); g.fillStyle = '#1a1a22'; g.fillRect(x - 24, y - 5, 18, 10); disc(g, x - 24, y, 5.5, '#2a2a34'); }
      g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(0, 150, w, 3);
      g.restore();
      // deck: light sun-bleached planks
      gal_planks(g, 130, 36, 1020, 14, '#e8c690', '#b88a50', 'rgba(90,50,20,.45)', r);
      g.fillStyle = '#fff0cc'; g.fillRect(130, 36, 1020, 2);
      g.fillStyle = '#f0c050'; g.fillRect(126, 50, 1028, 4);
      // bowsprit + figurehead (right) and stern lantern (left)
      g.strokeStyle = '#6a3818'; g.lineWidth = 9; g.lineCap = 'round'; g.beginPath(); g.moveTo(1180, 26); g.lineTo(1296, -40); g.stroke();
      g.fillStyle = '#f0c050'; disc(g, 1262, 12, 22, '#e8a838'); disc(g, 1262, 12, 15, '#f8d070');
      g.fillStyle = '#6a3a14'; disc(g, 1268, 8, 3.5, '#3a1c0c');
      g.fillStyle = '#3a2a1a'; g.fillRect(118, -18, 5, 48); disc(g, 120, -24, 11, 'rgba(255,220,120,.35)'); roundRect(g, 112, -32, 16, 18, 4, '#f8d878', '#3a2a1a', 2);
    });
    // mast, topsail with skull emblem, crow's nest, rigging
    const rig = artWorld(-420, -700, 840, 700, (g, w) => {
      const cx = w / 2;
      g.strokeStyle = 'rgba(70,40,20,.55)'; g.lineWidth = 1.6; // shrouds
      for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(cx, 180); g.lineTo(40 + i * 12, 700); g.moveTo(cx, 180); g.lineTo(w - 40 - i * 12, 700); g.stroke(); }
      vgrad(g, cx - 11, 60, 22, 640, ['#a06230', '#7a4420']); g.fillStyle = 'rgba(255,220,160,.3)'; g.fillRect(cx - 7, 60, 3, 640);
      for (const y of [260, 480]) { g.fillStyle = '#3a2a1a'; g.fillRect(cx - 13, y, 26, 6); }
      // upper yard + billowing topsail
      vgrad(g, cx - 220, 170, 440, 12, ['#9a5c2c', '#5a3014']);
      const sg = g.createLinearGradient(cx - 200, 0, cx + 200, 0); sg.addColorStop(0, '#e8e0cc'); sg.addColorStop(.5, '#fffaf0'); sg.addColorStop(1, '#d8cfb8');
      g.fillStyle = sg; g.beginPath(); g.moveTo(cx - 205, 180); g.lineTo(cx + 205, 180); g.quadraticCurveTo(cx + 240, 290, cx + 215, 360); g.quadraticCurveTo(cx, 385, cx - 215, 360); g.quadraticCurveTo(cx - 240, 290, cx - 205, 180); g.fill();
      g.strokeStyle = 'rgba(150,130,100,.4)'; g.lineWidth = 1.5; for (let i = -3; i <= 3; i++) { g.beginPath(); g.moveTo(cx + i * 58, 182); g.quadraticCurveTo(cx + i * 70, 280, cx + i * 60, 370); g.stroke(); }
      // skull emblem
      const sy = 270; disc(g, cx, sy, 38, '#1a1a22'); disc(g, cx, sy - 4, 22, '#fffaf0'); g.fillStyle = '#fffaf0'; g.fillRect(cx - 12, sy + 10, 24, 12);
      disc(g, cx - 8, sy - 4, 5.5, '#1a1a22'); disc(g, cx + 8, sy - 4, 5.5, '#1a1a22'); g.fillStyle = '#1a1a22'; g.fillRect(cx - 7, sy + 14, 2, 8); g.fillRect(cx + 5, sy + 14, 2, 8); g.fillRect(cx - 1, sy + 14, 2, 8);
      g.strokeStyle = '#fffaf0'; g.lineWidth = 6; g.lineCap = 'round'; g.beginPath(); g.moveTo(cx - 30, sy - 26); g.lineTo(cx - 44, sy - 38); g.moveTo(cx + 30, sy - 26); g.lineTo(cx + 44, sy - 38); g.moveTo(cx - 30, sy + 28); g.lineTo(cx - 44, sy + 40); g.moveTo(cx + 30, sy + 28); g.lineTo(cx + 44, sy + 40); g.stroke();
      // crow's nest
      g.fillStyle = '#7a4420'; g.beginPath(); g.moveTo(cx - 44, 70); g.lineTo(cx + 44, 70); g.lineTo(cx + 34, 118); g.lineTo(cx - 34, 118); g.fill();
      g.fillStyle = '#b8743a'; g.fillRect(cx - 46, 66, 92, 6); g.fillStyle = 'rgba(40,16,4,.4)'; for (let x = cx - 36; x < cx + 36; x += 12) g.fillRect(x, 74, 2, 42);
    });
    // raised deck (quarterdeck / forecastle) platform art: planks, railing, posts, barrels underneath
    const castle = artWorld(0, 0, 230, 184, (g) => {
      g.translate(0, 34);
      const r = rng(45);
      for (const x of [22, 200]) vgrad(g, x, 20, 12, 130, ['#8a4e26', '#5a3014']);
      for (const [x, s] of [[60, 1], [150, .85]]) { const bw = 34 * s, bh = 44 * s; roundRect(g, x - bw / 2, 150 - bh, bw, bh, 8 * s, '#9a5a2a'); g.fillStyle = '#4a4a52'; g.fillRect(x - bw / 2, 150 - bh * .8, bw, 3); g.fillRect(x - bw / 2, 150 - bh * .25, bw, 3); }
      g.fillStyle = '#6a3a1c'; g.fillRect(8, -2, 214, 4); for (let x = 12; x < 220; x += 16) g.fillRect(x, -26, 4, 26);
      g.fillStyle = '#b8743a'; g.fillRect(8, -30, 214, 5);
      gal_planks(g, 5, 0, 220, 12, '#e8c690', '#b88a50', 'rgba(90,50,20,.45)', r);
      g.fillStyle = '#fff0cc'; g.fillRect(5, 0, 220, 2);
      vgrad(g, 3, 12, 224, 12, ['#8a4e26', '#4a2610']); g.fillStyle = '#f0c050'; g.fillRect(3, 12, 224, 3);
    });
    const yard = artWorld(0, 0, 260, 60, (g) => { // lower yardarm with a furled sail
      vgrad(g, 0, 2, 260, 12, ['#b06a34', '#6a3818']); g.fillStyle = '#e8b878'; g.fillRect(0, 2, 260, 2);
      disc(g, 4, 8, 7, '#6a3818'); disc(g, 256, 8, 7, '#6a3818');
      for (let i = 0; i < 9; i++) { const x = 16 + i * 26; g.fillStyle = i % 2 ? '#e8e0cc' : '#fffaf0'; g.beginPath(); g.ellipse(x + 13, 22, 16, 10, 0, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = '#8a6a4a'; for (let i = 0; i < 5; i++) g.fillRect(24 + i * 52, 12, 4, 22);
    });
    return { sky, clouds, sea, hull, rig, castle, yard };
  },
  drawBg(ctx, A, cam) {
    layer(ctx, A.sky, cam, 0);
    const d = (T * .12) % 2800;
    layer(ctx, A.clouds, cam, .05, 0, d); layer(ctx, A.clouds, cam, .05, 0, d - 2800);
    layer(ctx, A.sea, cam, .1, 60);
    ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    for (let i = 0; i < 5; i++) { const x = (i * 311 + T * (.6 + i * .12)) % (W + 200) - 100, y = 140 + i * 38 + Math.sin(T * .02 + i) * 14; gal_gull(ctx, x, y, 9 + i % 3 * 3, Math.sin(T * .2 + i * 2)); }
  },
  drawStage(ctx, A) {
    const bob = Math.sin(T * .035) * 3, tilt = Math.sin(T * .035 - .8) * .004; // gentle bob (draw only; collision static)
    // sea around the hull
    const sy = 190;
    const gr = ctx.createLinearGradient(0, sy - 40, 0, sy + 500); gr.addColorStop(0, '#2a8ad0'); gr.addColorStop(1, '#083060');
    ctx.fillStyle = gr; ctx.fillRect(-2600, sy - 40, 5200, 1200);
    ctx.save(); ctx.translate(0, bob); ctx.rotate(tilt);
    drawWorldArt(ctx, A.rig);
    drawWorldArt(ctx, A.hull);
    const [q, f, y] = this.plats;
    ctx.drawImage(A.castle, q.x1 - 10, q.y - 34, 230, 184); ctx.drawImage(A.castle, f.x1 - 10, f.y - 34, 230, 184);
    ctx.drawImage(A.yard, y.x1 - 15, y.y - 2, 260, 60);
    // pennant on the masthead
    const fx = 0, fy = -648; ctx.fillStyle = '#e8342a'; ctx.beginPath(); ctx.moveTo(fx, fy);
    for (let i = 0; i <= 6; i++) ctx.lineTo(fx + i * 14, fy + 6 + Math.sin(T * .15 - i * .8) * 4 + i * .8);
    for (let i = 6; i >= 0; i--) ctx.lineTo(fx + i * 14, fy + 22 - i * 1.6 + Math.sin(T * .15 - i * .8) * 4); ctx.fill();
    ctx.restore();
    // foreground waves lapping at the hull
    for (let k = 0; k < 3; k++) {
      const wy = sy + 20 + k * 40;
      ctx.fillStyle = ['rgba(60,160,230,.85)', 'rgba(30,120,200,.9)', 'rgba(16,80,160,.95)'][k];
      ctx.beginPath(); ctx.moveTo(-2600, wy + 600);
      for (let x = -2600; x <= 2600; x += 60) ctx.lineTo(x, wy + Math.sin(x * .01 + T * (.04 + k * .015) + k * 2) * 10);
      ctx.lineTo(2600, wy + 600); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.75)';
      for (let i = 0; i < 12; i++) { const x = ((i * 433 + T * (k + 1) * .5) % 3200) - 1600; ctx.fillRect(x, wy + Math.sin(x * .01 + T * (.04 + k * .015) + k * 2) * 10 - 1, 26 + k * 10, 3); }
    }
  },
});
