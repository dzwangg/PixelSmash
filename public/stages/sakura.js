// stage: sakura — SAKURA TEMPLE: moonlit temple courtyard, cherry trees, falling petals. Stone courtyard + wooden balconies + temple roof.
function sak_tree(g, x, y, s, trunk, blos, r) { // cherry tree: curving trunk/branches + blossom clusters
  g.strokeStyle = trunk; g.lineCap = 'round';
  const br = (bx, by, a, len, lw, d) => {
    const ex = bx + Math.cos(a) * len, ey = by + Math.sin(a) * len;
    g.lineWidth = lw; g.beginPath(); g.moveTo(bx, by); g.quadraticCurveTo(bx + Math.cos(a + .4) * len * .5, by + Math.sin(a + .4) * len * .5, ex, ey); g.stroke();
    if (d > 0) { br(ex, ey, a - .45 - r() * .3, len * .72, lw * .65, d - 1); br(ex, ey, a + .35 + r() * .3, len * .7, lw * .65, d - 1); }
    else for (let i = 0; i < 5; i++) { g.fillStyle = blos[i % blos.length]; g.beginPath(); g.arc(ex + (r() - .5) * 40 * s, ey + (r() - .5) * 26 * s, (10 + r() * 14) * s, 0, Math.PI * 2); g.fill(); }
  };
  br(x, y, -Math.PI / 2 + (r() - .5) * .3, 70 * s, 12 * s, 3);
}
function sak_pagoda(g, x, base, s, col) { // 5-tier pagoda silhouette
  g.fillStyle = col;
  for (let i = 0; i < 5; i++) {
    const w = (120 - i * 16) * s, y = base - i * 46 * s;
    g.fillRect(x - w * .32, y - 40 * s, w * .64, 40 * s);
    g.beginPath(); g.moveTo(x - w * .72, y - 34 * s); g.quadraticCurveTo(x - w * .4, y - 40 * s, x - w * .3, y - 54 * s); g.lineTo(x + w * .3, y - 54 * s); g.quadraticCurveTo(x + w * .4, y - 40 * s, x + w * .72, y - 34 * s); g.lineTo(x + w * .5, y - 40 * s); g.lineTo(x - w * .5, y - 40 * s); g.fill();
  }
  g.fillRect(x - 2 * s, base - 5 * 46 * s - 70 * s, 4 * s, 70 * s);
}
function sak_torii(g, x, base, s, col) {
  g.fillStyle = col;
  g.fillRect(x - 70 * s, base - 170 * s, 14 * s, 170 * s); g.fillRect(x + 56 * s, base - 170 * s, 14 * s, 170 * s);
  g.fillRect(x - 86 * s, base - 140 * s, 172 * s, 10 * s);
  g.beginPath(); g.moveTo(x - 110 * s, base - 176 * s); g.quadraticCurveTo(x, base - 164 * s, x + 110 * s, base - 176 * s); g.lineTo(x + 104 * s, base - 160 * s); g.quadraticCurveTo(x, base - 152 * s, x - 104 * s, base - 160 * s); g.fill();
}
function sak_lantern(g, x, base, s, lit) { // stone toro lantern
  g.fillStyle = '#4a4a5c'; g.fillRect(x - 12 * s, base - 10 * s, 24 * s, 10 * s); g.fillRect(x - 5 * s, base - 46 * s, 10 * s, 36 * s);
  g.fillStyle = '#5a5a6e'; g.fillRect(x - 14 * s, base - 52 * s, 28 * s, 6 * s);
  g.fillStyle = lit ? '#ffc870' : '#3a3a4a'; g.fillRect(x - 10 * s, base - 72 * s, 20 * s, 20 * s);
  g.fillStyle = '#4a4a5c'; g.fillRect(x - 7 * s, base - 68 * s, 3 * s, 14 * s); g.fillRect(x + 4 * s, base - 68 * s, 3 * s, 14 * s);
  g.fillStyle = '#5a5a6e'; g.beginPath(); g.moveTo(x - 22 * s, base - 72 * s); g.quadraticCurveTo(x, base - 90 * s, x + 22 * s, base - 72 * s); g.fill();
  disc(g, x, base - 90 * s, 4 * s, '#5a5a6e');
}

STAGES.push({
  id: 'sakura', name: 'SAKURA TEMPLE',
  main: { x1: -470, x2: 470, y: 0, depth: 90 },
  plats: [{ x1: -370, x2: -170, y: -150 }, { x1: 170, x2: 370, y: -150 }, { x1: -110, x2: 110, y: -295 }],
  blast: { l: -1150, r: 1150, t: -900, b: 620 }, spawn: [-240, 240],
  build() {
    const sky = artLayer(1400, 800, (g, w, h) => {
      vgrad(g, 0, 0, w, h, ['#05061a', '#0e1034', '#1e1a4c', '#3a2658', '#6a3a68']);
      starfield(g, w, h * .6, 140, 31, ['#ffffff', '#ffd8ec', '#d8dcff']);
      g.globalCompositeOperation = 'lighter';
      glow(g, 900, 210, 420, 'rgba(255,200,220,.25)'); glow(g, 900, 210, 230, 'rgba(255,240,230,.4)');
      g.globalCompositeOperation = 'source-over';
      const mg = g.createRadialGradient(860, 170, 20, 900, 210, 150); mg.addColorStop(0, '#fffaf0'); mg.addColorStop(.8, '#ffe8d8'); mg.addColorStop(1, '#f4c8c8');
      g.fillStyle = mg; g.beginPath(); g.arc(900, 210, 150, 0, Math.PI * 2); g.fill();
      const r = rng(32); g.fillStyle = 'rgba(210,170,180,.25)'; // maria
      for (let i = 0; i < 9; i++) { g.beginPath(); g.arc(840 + r() * 120, 150 + r() * 120, 12 + r() * 26, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = 'rgba(40,24,70,.55)'; // thin cloud streaks across the moon
      for (const [y, x, l] of [[250, 700, 360], [272, 860, 300], [150, 1000, 260]]) { g.beginPath(); g.ellipse(x, y, l / 2, 7, 0, 0, Math.PI * 2); g.fill(); }
    });
    // far: misty hills, pagoda and torii silhouettes, far cherry groves
    const far = artLayer(2600, 800, (g, w) => {
      ridge(g, w, 620, 200, 33, '#2a2250', '#141030', 1.2);
      sak_pagoda(g, 700, 560, 1.25, '#161232');
      sak_torii(g, 1920, 610, 1.1, '#1a1236');
      const r = rng(34);
      for (let i = 0; i < 16; i++) { const x = r() * w; if (Math.abs(x - 700) > 120) sak_tree(g, x, 640, .7 + r() * .3, '#1a1030', ['#6a3a6a', '#7a4478', '#5a3060'], r); }
      vgrad(g, 0, 560, w, 240, ['rgba(120,80,140,0)', 'rgba(90,60,120,.55)']);
    });
    // mid: lit cherry trees and stone lanterns along the temple wall
    const mid = artLayer(2800, 800, (g, w) => {
      vgrad(g, 0, 640, w, 160, ['#2a1e3a', '#120c1e']);
      g.fillStyle = '#3a2a46'; g.fillRect(0, 630, w, 12); g.fillStyle = '#5a3a3a'; g.fillRect(0, 618, w, 12); // wall coping
      const r = rng(35);
      for (let i = 0; i < 9; i++) { const x = 100 + i * 320 + r() * 80; if (Math.abs(x - w / 2) < 260) continue; sak_tree(g, x, 700, 1.3 + r() * .4, '#1e1024', ['#d8789c', '#f0a0c0', '#ffc8dc', '#b85a80'], r); }
      for (const x of [420, 900, 1900, 2380]) { g.globalCompositeOperation = 'lighter'; glow(g, x, 560, 70, 'rgba(255,180,90,.5)'); g.globalCompositeOperation = 'source-over'; sak_lantern(g, x, 630, 1.1, true); }
    });
    // main stage: stone courtyard on a sloped ishigaki stone foundation
    const body = artWorld(-500, -12, 1000, 420, (g, w) => {
      const r = rng(36);
      g.save(); g.beginPath(); g.moveTo(22, 20); g.lineTo(w - 22, 20); g.lineTo(w - 70, 420); g.lineTo(70, 420); g.closePath(); g.clip();
      vgrad(g, 0, 20, w, 400, ['#4a4660', '#2a2640', '#141222']);
      for (let row = 0, y = 34; y < 420; row++) { // irregular fitted stones
        const rh = 26 + r() * 14;
        for (let x = -20 + (row % 2) * 30; x < w;) { const sw = 50 + r() * 60; g.fillStyle = `rgba(${150 + r() * 40},${140 + r() * 40},${180 + r() * 30},${.10 + r() * .08})`; g.beginPath(); g.roundRect(x + 2, y + 2, sw - 4, rh - 4, 6); g.fill(); g.strokeStyle = 'rgba(8,6,20,.55)'; g.lineWidth = 2; g.stroke(); x += sw; }
        y += rh;
      }
      g.fillStyle = 'rgba(90,140,90,.25)'; for (let i = 0; i < 26; i++) { g.beginPath(); g.ellipse(40 + r() * 920, 40 + r() * 60, 10 + r() * 16, 3 + r() * 3, 0, 0, Math.PI * 2); g.fill(); }
      g.restore();
      // courtyard paving (walkable top)
      vgrad(g, 12, 10, w - 24, 18, ['#9a94b0', '#5e5a78']);
      g.fillStyle = '#c8c4dc'; g.fillRect(12, 10, w - 24, 2);
      g.fillStyle = 'rgba(20,16,40,.45)'; for (let x = 60; x < w - 20; x += 64) g.fillRect(x, 12, 2, 16);
      g.fillStyle = '#2a2640'; g.fillRect(12, 28, w - 24, 4);
      // fallen petals on the paving
      for (let i = 0; i < 60; i++) { g.fillStyle = ['#ffb8d0', '#f090b0', '#ffd8e4'][i % 3]; g.beginPath(); g.ellipse(20 + r() * 960, 12 + r() * 12, 3, 1.6, r() * 3, 0, Math.PI * 2); g.fill(); }
      // shimenawa rope with paper shide along the front edge
      g.strokeStyle = '#d8c89a'; g.lineWidth = 4; g.beginPath(); g.moveTo(40, 40); for (let i = 0; i < 6; i++) g.quadraticCurveTo(40 + i * 153 + 76, 64, 40 + (i + 1) * 153, 40); g.stroke();
      for (let i = 0; i <= 6; i++) { const x = 40 + i * 153; g.fillStyle = '#f4f0e8'; g.beginPath(); g.moveTo(x - 4, 42); g.lineTo(x + 4, 42); g.lineTo(x + 1, 52); g.lineTo(x + 6, 52); g.lineTo(x + 2, 66); g.lineTo(x - 4, 56); g.fill(); }
    });
    // stone lanterns standing at the courtyard ends (static art; flame glow is animated live)
    const lantern = artWorld(0, 0, 60, 100, (g) => sak_lantern(g, 30, 100, 1.1, true));
    // wooden balcony platform (vermilion rails, dark wood)
    const balcony = artWorld(0, 0, 230, 124, (g) => {
      g.translate(0, 34);
      g.fillStyle = '#2a1616'; g.fillRect(20, 20, 10, 70); g.fillRect(200, 20, 10, 70);
      g.strokeStyle = '#3a1e1a'; g.lineWidth = 4; g.beginPath(); g.moveTo(30, 30); g.lineTo(200, 80); g.moveTo(200, 30); g.lineTo(30, 80); g.stroke();
      g.fillStyle = '#b8302a'; for (let x = 8; x < 226; x += 24) g.fillRect(x, -26, 5, 26);
      vgrad(g, 4, -30, 222, 6, ['#e0483a', '#9a2420']); g.fillStyle = '#f4d070'; g.fillRect(4, -31, 8, 8); g.fillRect(218, -31, 8, 8);
      vgrad(g, 2, 0, 226, 10, ['#8a5a3a', '#5a3622']); g.fillStyle = '#b88a60'; g.fillRect(2, 0, 226, 2);
      vgrad(g, 0, 10, 230, 12, ['#b8302a', '#6a1a18']);
      g.fillStyle = '#1e0e0e'; for (let x = 8; x < 226; x += 18) g.fillRect(x, 22, 10, 7); // rafter ends
    });
    // central temple roof: flat ridge on top, flaring tiled eaves
    const roof = artWorld(0, 0, 330, 110, (g) => {
      const cx = 165;
      g.fillStyle = '#1e1a2e'; g.beginPath(); g.moveTo(cx - 110, 6); g.lineTo(cx + 110, 6);
      g.quadraticCurveTo(cx + 130, 50, cx + 165, 60); g.lineTo(cx + 150, 72); g.quadraticCurveTo(cx + 100, 64, cx + 80, 70); g.lineTo(cx - 80, 70); g.quadraticCurveTo(cx - 100, 64, cx - 150, 72); g.lineTo(cx - 165, 60); g.quadraticCurveTo(cx - 130, 50, cx - 110, 6); g.fill();
      g.strokeStyle = 'rgba(120,120,170,.45)'; g.lineWidth = 2;
      for (let i = -9; i <= 9; i++) { g.beginPath(); g.moveTo(cx + i * 12, 10); g.quadraticCurveTo(cx + i * 14, 40, cx + i * 17.5, 66); g.stroke(); }
      vgrad(g, cx - 120, 0, 240, 10, ['#6a6690', '#34304a']); g.fillStyle = '#a8a4cc'; g.fillRect(cx - 120, 0, 240, 2);
      g.fillStyle = '#d8b050'; disc(g, cx - 120, 4, 7, '#d8b050'); disc(g, cx + 120, 4, 7, '#d8b050');
      g.fillStyle = '#b8302a'; g.fillRect(cx - 80, 70, 160, 12); g.fillStyle = '#2a1616'; g.fillRect(cx - 72, 82, 8, 28); g.fillRect(cx + 64, 82, 8, 28);
      g.fillStyle = '#f4d070'; g.fillRect(cx - 18, 72, 36, 8);
    });
    return { sky, far, mid, body, lantern, balcony, roof };
  },
  drawBg(ctx, A, cam) {
    layer(ctx, A.sky, cam, 0, -40);
    layer(ctx, A.far, cam, .08, 40);
    layer(ctx, A.mid, cam, .22, 70);
  },
  drawStage(ctx, A) {
    drawWorldArt(ctx, A.body);
    for (const x of [-430, 430]) { // flickering lantern glow
      ctx.globalAlpha = .55 + Math.sin(T * .21 + x) * .08 + Math.sin(T * .53) * .05;
      const gr = ctx.createRadialGradient(x, -80, 0, x, -80, 70); gr.addColorStop(0, 'rgba(255,190,100,.9)'); gr.addColorStop(1, 'rgba(255,150,60,0)');
      ctx.fillStyle = gr; ctx.fillRect(x - 70, -150, 140, 140); ctx.globalAlpha = 1;
      ctx.drawImage(A.lantern, x - 30, -100, 60, 100);
    }
    const [a, b, c] = this.plats;
    ctx.drawImage(A.balcony, a.x1 - 15, a.y - 34, 230, 124); ctx.drawImage(A.balcony, b.x1 - 15, b.y - 34, 230, 124);
    ctx.drawImage(A.roof, c.x1 - 55, c.y - 2, 330, 110);
  },
  drawFront(ctx) {
    for (let i = 0; i < 34; i++) { // drifting petals
      const sp = .6 + (i % 5) * .18, y = (i * 67 + T * sp) % (H + 40) - 20, x = ((i * 211 - T * sp * .9) % (W + 80) + W + 80) % (W + 80) - 40 + Math.sin(T * .02 + i) * 30;
      ctx.fillStyle = i % 3 ? 'rgba(255,176,204,.85)' : 'rgba(255,220,232,.9)';
      ctx.beginPath(); ctx.ellipse(x, y, 4.5, 2.4, T * .04 + i, 0, Math.PI * 2); ctx.fill();
    }
  },
});
