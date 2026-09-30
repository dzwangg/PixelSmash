// stage: volcano — VOLCANO FORGE: a dwarven forge inside a volcano, lava sea below, two rising/sinking basalt slabs.
function volc_crack(g, x, y, len, r, lw) { // jagged branching crack path
  g.lineWidth = lw; g.beginPath(); g.moveTo(x, y);
  let a = Math.PI / 2 + (r() - .5) * 1.4;
  for (let i = 0; i < len; i++) { a += (r() - .5) * .9; x += Math.cos(a) * 9; y += Math.abs(Math.sin(a)) * 9; g.lineTo(x, y); if (r() < .18 && lw > 1.2) { g.stroke(); volc_crack(g, x, y, len - i >> 1, r, lw * .6); g.lineWidth = lw; g.beginPath(); g.moveTo(x, y); } }
  g.stroke();
}
function volc_chain(g, x, y1, y2, col, hi) { // vertical chain of alternating links
  for (let y = y1, i = 0; y < y2; y += 13, i++) {
    if (i % 2) { g.fillStyle = col; g.fillRect(x - 1.6, y, 3.2, 16); }
    else { g.lineWidth = 3; g.strokeStyle = col; g.beginPath(); g.ellipse(x, y + 8, 5, 9, 0, 0, Math.PI * 2); g.stroke(); g.strokeStyle = hi; g.lineWidth = 1; g.beginPath(); g.ellipse(x, y + 8, 5, 9, 0, Math.PI * .9, Math.PI * 1.4); g.stroke(); }
  }
}
function volc_lava(g, x, y, w, h) { // lava sea gradient block
  vgrad(g, x, y, w, h, ['#ffd25a', '#ff7a1a', '#d2340c', '#7a1206', '#3a0604']);
}

STAGES.push({
  id: 'volcano', name: 'VOLCANO FORGE',
  main: { x1: -450, x2: 450, y: 0, depth: 90 },
  plats: [
    { x1: -350, x2: -150, y: -175, move: { amp: 48, per: 360, axis: 'y' } },
    { x1: 150, x2: 350, y: -175, move: { amp: 48, per: 360, axis: 'y', phase: Math.PI } },
  ],
  blast: { l: -1150, r: 1150, t: -900, b: 620 }, spawn: [-240, 240],
  build() {
    // cavern air: black vault fading into a hot orange haze at the lava line
    const sky = artLayer(1400, 800, (g, w, h) => {
      vgrad(g, 0, 0, w, h, ['#070304', '#150607', '#2c0b08', '#5a160a', '#a8380e', '#e8741c']);
      g.globalCompositeOperation = 'lighter';
      glow(g, 700, 820, 700, 'rgba(255,120,30,.55)');
      glow(g, 250, 700, 300, 'rgba(255,80,20,.35)'); glow(g, 1150, 690, 320, 'rgba(255,80,20,.35)');
      g.globalCompositeOperation = 'source-over';
      const r = rng(71); g.fillStyle = '#060203'; // stalactite ceiling
      g.beginPath(); g.moveTo(0, 0);
      for (let x = 0; x <= w; x += 14) g.lineTo(x, 30 + r() * 30 + (r() < .12 ? 60 + r() * 110 : 0));
      g.lineTo(w, 0); g.closePath(); g.fill();
    });
    // far cavern: walls, lavafalls, the colossal forge furnace, anvil and hanging chains
    const far = artLayer(2600, 800, (g, w) => {
      const r = rng(72);
      ridge(g, w, 640, 260, 13, '#3a120c', '#1a0706', 1.4);
      for (const lx of [420, 980, 1640, 2240]) { // lavafalls pouring from the walls
        const gr = g.createLinearGradient(0, 150, 0, 720); gr.addColorStop(0, 'rgba(255,200,90,.0)'); gr.addColorStop(.15, 'rgba(255,170,60,.9)'); gr.addColorStop(1, 'rgba(255,90,20,.9)');
        g.globalCompositeOperation = 'lighter'; glow(g, lx, 480, 140, 'rgba(255,110,30,.35)'); g.globalCompositeOperation = 'source-over';
        g.fillStyle = gr; g.beginPath(); g.moveTo(lx - 10, 150); g.bezierCurveTo(lx - 22, 400, lx - 4, 560, lx - 26, 720); g.lineTo(lx + 26, 720); g.bezierCurveTo(lx + 8, 560, lx + 18, 400, lx + 10, 150); g.fill();
        g.fillStyle = 'rgba(255,240,180,.6)'; g.fillRect(lx - 2, 170, 3, 540);
      }
      // the great forge: a carved furnace mouth in the centre
      const cx = w / 2;
      g.fillStyle = '#1c0908'; g.beginPath(); g.moveTo(cx - 330, 800); g.lineTo(cx - 280, 250); g.lineTo(cx - 200, 150); g.lineTo(cx + 200, 150); g.lineTo(cx + 280, 250); g.lineTo(cx + 330, 800); g.fill();
      g.strokeStyle = '#4a1c10'; g.lineWidth = 4; for (let y = 190; y < 780; y += 46) { g.beginPath(); g.moveTo(cx - 300, y); g.lineTo(cx + 300, y); g.stroke(); }
      g.globalCompositeOperation = 'lighter'; glow(g, cx, 470, 260, 'rgba(255,110,30,.35)'); g.globalCompositeOperation = 'source-over';
      const mg = g.createLinearGradient(0, 330, 0, 620); mg.addColorStop(0, '#c8702a'); mg.addColorStop(.5, '#8a3010'); mg.addColorStop(1, '#3a0e06');
      g.fillStyle = mg; g.beginPath(); g.moveTo(cx - 150, 620); g.lineTo(cx - 150, 430); g.arc(cx, 430, 150, Math.PI, 0); g.lineTo(cx + 150, 620); g.fill();
      g.fillStyle = '#2a0e0a'; for (let i = -3; i <= 3; i++) g.fillRect(cx + i * 40 - 5, 290, 10, 330); // grate bars
      g.fillStyle = '#6a3a1a'; g.fillRect(cx - 190, 272, 380, 16); g.fillStyle = '#c08040'; g.fillRect(cx - 190, 272, 380, 3);
      // dwarven rune band over the mouth
      g.fillStyle = 'rgba(255,170,80,.6)'; for (let i = 0; i < 14; i++) { const x = cx - 170 + i * 26; g.fillRect(x, 220, 3, 26); g.fillRect(x, 220 + r() * 18, 12, 3); if (r() < .5) g.fillRect(x + 9, 226, 3, 16); }
      // giant anvil silhouettes on the sides
      const anvil = (ax, ay, s) => {
        g.fillStyle = '#12060a'; g.beginPath();
        g.moveTo(ax - 120 * s, ay); g.lineTo(ax + 80 * s, ay); g.quadraticCurveTo(ax + 150 * s, ay + 4 * s, ax + 175 * s, ay - 14 * s);
        g.lineTo(ax + 120 * s, ay + 40 * s); g.lineTo(ax + 60 * s, ay + 50 * s); g.lineTo(ax + 50 * s, ay + 110 * s); g.lineTo(ax + 100 * s, ay + 150 * s);
        g.lineTo(ax - 140 * s, ay + 150 * s); g.lineTo(ax - 90 * s, ay + 110 * s); g.lineTo(ax - 100 * s, ay + 50 * s); g.lineTo(ax - 120 * s, ay + 40 * s); g.closePath(); g.fill();
        g.fillStyle = 'rgba(255,150,60,.55)'; g.fillRect(ax - 120 * s, ay, 200 * s, 3 * s);
      };
      anvil(560, 470, 1.3); anvil(2040, 490, 1.1);
      for (let i = 0; i < 9; i++) { const x = 150 + i * 290 + r() * 60; volc_chain(g, x, 0, 120 + r() * 260, '#2a100c', 'rgba(255,140,60,.5)'); }
    });
    // nearer basalt columns and swinging chains (mid parallax)
    const mid = artLayer(2800, 800, (g, w) => {
      const r = rng(73);
      for (let x = -20; x < w;) {
        const cw = 26 + r() * 40, ch = 60 + r() * 220 * (Math.abs(x - w / 2) > 520 ? 1.4 : .35);
        const gr = g.createLinearGradient(x, 0, x + cw, 0); gr.addColorStop(0, '#2a0f0c'); gr.addColorStop(.5, '#170708'); gr.addColorStop(1, '#0c0405');
        g.fillStyle = gr; g.beginPath(); g.moveTo(x, 800); g.lineTo(x, 800 - ch); g.lineTo(x + cw * .5, 800 - ch - 10); g.lineTo(x + cw, 800 - ch + 4); g.lineTo(x + cw, 800); g.fill();
        g.fillStyle = 'rgba(255,120,40,.35)'; g.fillRect(x, 800 - ch, 2, ch);
        x += cw + r() * 6;
      }
      for (const x of [260, 700, 2100, 2540]) volc_chain(g, x, 0, 260 + r() * 140, '#1a0908', 'rgba(255,150,70,.6)');
    });
    // main stage: a carved basalt/obsidian block on a pillar sinking into the lava
    const body = artWorld(-480, -12, 960, 560, (g, w) => {
      const gr = g.createLinearGradient(0, 0, 0, 560); gr.addColorStop(0, '#3a2a2e'); gr.addColorStop(.3, '#1e1418'); gr.addColorStop(1, '#0a0608');
      g.fillStyle = gr; g.beginPath();
      g.moveTo(24, 12); g.lineTo(w - 24, 12); g.lineTo(w - 10, 40); g.lineTo(w - 50, 110); g.lineTo(w - 150, 170); g.lineTo(w - 190, 560); g.lineTo(190, 560); g.lineTo(150, 170); g.lineTo(50, 110); g.lineTo(10, 40); g.closePath(); g.fill();
      // obsidian facets
      const r = rng(74);
      g.fillStyle = 'rgba(120,90,130,.06)'; for (let i = 0; i < 16; i++) { const x = 60 + r() * 840, y = 50 + r() * 100; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 30 + r() * 40, y + 10); g.lineTo(x + 10, y + 40 + r() * 30); g.fill(); }
      g.strokeStyle = 'rgba(0,0,0,.45)'; g.lineWidth = 2; for (let x = 70; x < w - 60; x += 80) { g.beginPath(); g.moveTo(x, 40); g.lineTo(x + 6, 110); g.stroke(); }
      // bronze dwarven trim + rune band
      vgrad(g, 18, 26, w - 36, 16, ['#b87838', '#6a3a18']);
      g.fillStyle = '#f0b060'; g.fillRect(18, 26, w - 36, 2);
      for (let x = 40; x < w - 40; x += 60) { g.fillStyle = '#3a1c0c'; g.beginPath(); g.moveTo(x, 34); g.lineTo(x + 7, 29); g.lineTo(x + 14, 34); g.lineTo(x + 7, 39); g.fill(); }
      // walkable top: dark stone flagstones
      vgrad(g, 14, 10, w - 28, 16, ['#5a4a52', '#34282e']);
      g.fillStyle = '#7a6a70'; g.fillRect(14, 10, w - 28, 2);
      g.fillStyle = 'rgba(0,0,0,.4)'; for (let x = 60; x < w - 20; x += 70 + r() * 30) g.fillRect(x, 12, 2, 14);
      // dwarven emblem on the pillar
      g.fillStyle = '#2a1a1c'; g.beginPath(); g.moveTo(w / 2, 200); g.lineTo(w / 2 + 70, 250); g.lineTo(w / 2 + 50, 340); g.lineTo(w / 2 - 50, 340); g.lineTo(w / 2 - 70, 250); g.closePath(); g.fill();
      g.strokeStyle = '#8a5a2a'; g.lineWidth = 3; g.stroke();
    });
    // glowing magma cracks, drawn over the body with a pulsing alpha
    const cracks = artWorld(-480, -12, 960, 560, (g, w) => {
      const r = rng(75);
      g.lineCap = 'round'; g.lineJoin = 'round';
      g.shadowColor = '#ff5a10'; g.shadowBlur = 10; g.strokeStyle = '#ff8a2a';
      for (let i = 0; i < 9; i++) volc_crack(g, 80 + i * 100 + r() * 40, 44, 12 + r() * 8 | 0, r, 2.4);
      for (let i = 0; i < 6; i++) volc_crack(g, 220 + r() * 520, 170 + r() * 200, 14, r, 2);
      g.shadowBlur = 0;
      // glowing rune in the emblem
      g.shadowColor = '#ff7a20'; g.shadowBlur = 14; g.strokeStyle = '#ffc070'; g.lineWidth = 4;
      g.beginPath(); g.moveTo(w / 2, 225); g.lineTo(w / 2, 320); g.moveTo(w / 2 - 28, 250); g.lineTo(w / 2 + 28, 250); g.lineTo(w / 2 - 20, 300); g.lineTo(w / 2 + 20, 300); g.stroke();
      glow(g, w / 2, 560, 180, 'rgba(255,110,30,.6)'); // lava light licking the pillar base
    });
    // basalt slab platform art (shared by both moving platforms)
    const slab = artWorld(0, 0, 220, 60, (g) => {
      const gr = g.createLinearGradient(0, 0, 0, 60); gr.addColorStop(0, '#3a2c30'); gr.addColorStop(1, '#0e080a');
      g.fillStyle = gr; g.beginPath(); g.moveTo(4, 4); g.lineTo(216, 4); g.lineTo(206, 26); g.lineTo(150, 44); g.lineTo(110, 58); g.lineTo(70, 44); g.lineTo(14, 26); g.closePath(); g.fill();
      vgrad(g, 6, 2, 208, 10, ['#6a5a60', '#3a2e32']); g.fillStyle = '#8a7a80'; g.fillRect(6, 2, 208, 2);
      vgrad(g, 8, 12, 204, 6, ['#b87838', '#5a3018']);
      const r = rng(76); g.lineCap = 'round'; g.shadowColor = '#ff5a10'; g.shadowBlur = 8; g.strokeStyle = '#ff9a3a';
      for (let i = 0; i < 3; i++) volc_crack(g, 50 + i * 60, 18, 4, r, 1.8);
      g.shadowBlur = 0;
    });
    const chain = artWorld(0, 0, 16, 906, (g) => volc_chain(g, 8, 0, 900, '#2a100c', 'rgba(255,150,70,.7)'));
    return { sky, far, mid, body, cracks, slab, chain };
  },
  drawBg(ctx, A, cam) {
    layer(ctx, A.sky, cam, 0);
    layer(ctx, A.far, cam, .07, 30);
    layer(ctx, A.mid, cam, .2, 170);
  },
  drawStage(ctx, A) {
    // lava sea (world space) with a heaving bright surface and popping bubbles
    const sy = 150;
    const gr = ctx.createLinearGradient(0, sy, 0, sy + 600); gr.addColorStop(0, '#ffb040'); gr.addColorStop(.08, '#ff6a18'); gr.addColorStop(.35, '#b0280a'); gr.addColorStop(1, '#2a0403');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(-2600, sy + 900);
    for (let x = -2600; x <= 2600; x += 80) ctx.lineTo(x, sy + Math.sin(x * .012 + T * .03) * 6 + Math.sin(x * .031 - T * .05) * 3);
    ctx.lineTo(2600, sy + 900); ctx.fill();
    ctx.fillStyle = 'rgba(255,230,140,.5)';
    for (let i = 0; i < 18; i++) { const x = ((i * 347 + T * (.3 + i % 3 * .2)) % 3000) - 1500; ctx.fillRect(x, sy + 14 + (i * 53) % 90, 60 + (i * 37) % 90, 3); }
    for (let i = 0; i < 10; i++) { // bubbles swell then pop
      const ph = (T * .012 + i * .37) % 1, x = ((i * 613) % 2400) - 1200, r = ph * 14;
      ctx.globalAlpha = 1 - ph; ctx.strokeStyle = '#ffe08a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, sy + 6, r, Math.PI, 0); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    drawWorldArt(ctx, A.body);
    ctx.globalAlpha = .65 + Math.sin(T * .05) * .3; drawWorldArt(ctx, A.cracks); ctx.globalAlpha = 1;
    for (const p of this.plats) {
      const cx = (p.x1 + p.x2) / 2, w = p.x2 - p.x1;
      for (const ox of [-w * .38, w * .38]) ctx.drawImage(A.chain, cx + ox - 8, p.y - 900, 16, 906); // suspension chains
      ctx.drawImage(A.slab, p.x1 - 10, p.y - 2, w + 20, 60);
      ctx.globalAlpha = .45 + Math.sin(T * .08 + cx) * .25; ctx.fillStyle = '#ffb050'; ctx.fillRect(cx - 14, p.y + 22, 28, 4); ctx.globalAlpha = 1;
    }
  },
  drawFront(ctx) {
    for (let i = 0; i < 36; i++) { // embers rising and swaying
      const y = H + 20 - ((T * (1.1 + i % 4 * .35) + i * 97) % (H + 60)), x = (i * 173) % W + Math.sin(T * .03 + i) * 22;
      ctx.globalAlpha = Math.min(1, y / H + .2) * .85; ctx.fillStyle = i % 3 ? '#ffae3a' : '#ffe39a';
      ctx.fillRect(x, y, i % 5 ? 2.5 : 4, i % 5 ? 2.5 : 4);
    }
    ctx.globalAlpha = 1;
  },
});
