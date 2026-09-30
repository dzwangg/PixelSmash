// stage: jungle — JUNGLE RUINS: an overgrown temple top at golden hour; three staggered stone ledges.
function jung_at(cam, k, oy) { const zk = 1 + (cam.z - 1) * k; return [W / 2 - cam.x * k * zk, H / 2 + (oy - (cam.y + 150) * k) * zk, zk]; }
const JUNG_FALL = { k: .14, oy: 30, x: -560, y: -170, w: 56, h: 520 }; // waterfall position inside the mid layer (centre-relative)

// hanging vine with small leaves
function jung_vine(g, x, y, len, seed, col = '#2f5a24', leaf = '#4f8a32') {
  const r = rng(seed), sway = (r() - .5) * 40;
  g.strokeStyle = col; g.lineWidth = 2.2; g.beginPath(); g.moveTo(x, y); g.bezierCurveTo(x + sway, y + len * .35, x - sway, y + len * .7, x + sway * .4, y + len); g.stroke();
  g.fillStyle = leaf;
  for (let t = .1; t < 1; t += .09) {
    const u = 1 - t, px = u * u * u * x + 3 * u * u * t * (x + sway) + 3 * u * t * t * (x - sway) + t * t * t * (x + sway * .4), py = y + len * t;
    g.beginPath(); g.ellipse(px + (t * 20 % 2 ? 5 : -5), py, 5, 2.4, t * 20 % 2 ? .5 : -.5, 0, Math.PI * 2); g.fill();
  }
}
// carved stone face (Olmec / Bayon style)
function jung_face(g, x, y, s, stone, dark, moss) {
  roundRect(g, x - s, y - s * 1.1, s * 2, s * 2.1, s * .35, stone);
  g.fillStyle = dark; g.fillRect(x - s * 1.05, y - s * 1.1, s * 2.1, s * .28); g.fillRect(x - s * 1.05, y - s * .72, s * 2.1, s * .08); // headdress bands
  g.globalAlpha = .55; g.fillRect(x - s * .85, y - s * .3, s * .6, s * .1); g.fillRect(x + s * .25, y - s * .3, s * .6, s * .1); g.globalAlpha = 1; // brows
  g.lineWidth = s * .07; g.strokeStyle = dark;
  for (const d of [-1, 1]) { g.beginPath(); g.arc(x + d * s * .52, y - s * .1, s * .22, .15 * Math.PI, .85 * Math.PI); g.stroke(); } // closed eyes
  g.fillStyle = dark; g.globalAlpha = .6; g.beginPath(); g.moveTo(x, y - s * .15); g.lineTo(x - s * .25, y + s * .38); g.lineTo(x + s * .25, y + s * .38); g.closePath(); g.fill(); g.globalAlpha = 1; // nose
  g.fillStyle = dark; g.beginPath(); g.ellipse(x, y + s * .66, s * .38, s * .1, 0, 0, Math.PI * 2); g.fill(); // lips
  for (const d of [-1, 1]) roundRect(g, x + d * s * 1.08 - s * .14, y - s * .2, s * .28, s * .7, s * .1, stone, dark, s * .05); // ear plugs
  const r = rng(s | 0); g.fillStyle = moss;
  for (let i = 0; i < 9; i++) { g.globalAlpha = .45 + r() * .35; g.beginPath(); g.ellipse(x + (r() - .5) * s * 2, y - s * 1.1 + r() * s * .6, s * (.12 + r() * .25), s * (.06 + r() * .1), 0, 0, Math.PI * 2); g.fill(); }
  g.globalAlpha = 1;
}
// stone ledge art for a (static) platform
function jung_ledge(p, seed) {
  const w = p.x2 - p.x1;
  return artWorld(p.x1 - 12, p.y - 8, w + 24, 120, (g) => {
    const r = rng(seed), x0 = 12, x1 = 12 + w;
    g.fillStyle = '#5a4e3c'; g.beginPath(); g.moveTo(x0, 12);
    for (let x = x0; x <= x1; x += 12) g.lineTo(x, 36 + r() * 16 + Math.sin((x - x0) / w * Math.PI) * 18);
    g.lineTo(x1, 12); g.closePath(); g.fill();
    vgrad(g, x0, 8, w, 22, ['#b0a080', '#7a6a50']);
    g.strokeStyle = 'rgba(40,30,20,.5)'; g.lineWidth = 1.5; for (let x = x0 + 30 + r() * 20; x < x1 - 10; x += 40 + r() * 30) { g.beginPath(); g.moveTo(x, 8); g.lineTo(x, 30); g.stroke(); }
    g.fillStyle = 'rgba(255,230,170,.35)'; g.fillRect(x0, 8, w, 2);
    g.fillStyle = '#4f8a32'; g.beginPath(); g.moveTo(x0 - 4, 10);
    for (let x = x0 - 4; x <= x1 + 4; x += 6) g.lineTo(x, 9 + Math.sin(x * .8) * 1.6);
    g.lineTo(x1 + 4, 4); g.lineTo(x0 - 4, 4); g.closePath(); g.fill();
    for (let i = 0; i < w / 25; i++) roundRect(g, x0 + r() * w, 6, 4 + r() * 5, 8 + r() * 14, 3, '#4f8a32');
    g.fillStyle = '#9ad04a'; g.fillRect(x0, 5, w, 2.5);
    for (let i = 0; i < 2; i++) jung_vine(g, x0 + 20 + r() * (w - 40), 26, 40 + r() * 50, seed * 7 + i);
    for (let i = 0; i < 5; i++) disc(g, x0 + r() * w, 6, 2, ['#ff8a50', '#ffe07a', '#ffffff'][i % 3]);
  });
}

STAGES.push({
  id: 'jungle', name: 'JUNGLE RUINS',
  main: { x1: -470, x2: 470, y: 0, depth: 400 },
  plats: [{ x1: -360, x2: -150, y: -150 }, { x1: 140, x2: 350, y: -180 }, { x1: -115, x2: 100, y: -310 }],
  blast: { l: -1150, r: 1150, t: -900, b: 620 }, spawn: [-240, 240],
  build() {
    const sky = artLayer(1400, 800, (g, w, h) => {
      vgrad(g, 0, 0, w, h, ['#1e3a48', '#3e6660', '#a89058', '#f0b860', '#ffd890', '#ffe8b0']);
      glow(g, 900, 470, 520, 'rgba(255,210,120,.8)'); glow(g, 900, 470, 160, 'rgba(255,245,210,.9)'); disc(g, 900, 470, 48, '#fff6dc');
    });
    const far = artLayer(2600, 800, (g, w) => {
      ridge(g, w, 600, 170, 31, '#a8a070', '#c8a868', .7);
      // distant stepped pyramid in the haze
      g.fillStyle = 'rgba(130,120,80,.8)'; for (let i = 0; i < 6; i++) { const pw = 280 - i * 40; g.fillRect(1480 - pw / 2, 500 - i * 24, pw, 26); }
      g.fillRect(1455, 350, 50, 30);
      ridge(g, w, 680, 120, 32, '#6a7a4a', '#4a5a38', 1.2);
      vgrad(g, 0, 520, w, 280, ['rgba(255,220,150,0)', 'rgba(255,215,150,.45)', 'rgba(240,200,140,.2)']);
    });
    const mid = artLayer(2800, 800, (g, w) => {
      const cx = w / 2, fx = cx + JUNG_FALL.x, fy = 400 + JUNG_FALL.y;
      // jungle canopy clumps
      const r = rng(8);
      for (let i = 0; i < 30; i++) { const x = r() * w, y = 430 + r() * 200; g.fillStyle = '#2c3a22'; g.fillRect(x - 5, y, 10, 400); cloud(g, x, y, 34 + r() * 26, '#8a9a48', '#4f6a30', '#2c4420', 40 + i); }
      // cliff with waterfall (left)
      g.fillStyle = '#3a4032'; g.beginPath(); g.moveTo(fx - 200, 800); g.lineTo(fx - 180, fy + 40); g.lineTo(fx - 120, fy - 10); g.lineTo(fx - 20, fy); g.lineTo(fx + JUNG_FALL.w + 30, fy + 6); g.lineTo(fx + 170, fy + 60); g.lineTo(fx + 220, 800); g.closePath(); g.fill();
      g.fillStyle = 'rgba(255,200,120,.25)'; g.beginPath(); g.moveTo(fx - 180, fy + 40); g.lineTo(fx - 120, fy - 10); g.lineTo(fx - 20, fy); g.lineTo(fx - 20, fy + 12); g.lineTo(fx - 130, fy + 4); g.closePath(); g.fill();
      cloud(g, fx - 80, fy - 6, 26, '#7a9a40', '#4a6a2c', '#2a4020', 71); cloud(g, fx + 120, fy + 10, 22, '#7a9a40', '#4a6a2c', '#2a4020', 72);
      vgrad(g, fx, fy, JUNG_FALL.w, JUNG_FALL.h, ['#d8f0f0', '#9ac8d0', '#c8e8e8']);
      glow(g, fx + JUNG_FALL.w / 2, fy + JUNG_FALL.h - 30, 140, 'rgba(240,250,250,.7)');
      // ruins on the right: broken columns + great carved face
      const rx = cx + 400;
      for (const [x, hh] of [[rx - 150, 210], [rx - 90, 150], [rx + 200, 240], [rx + 260, 90]]) { vgrad(g, x, 620 - hh, 34, hh + 200, ['#8a7e62', '#4e4636']); g.fillStyle = '#9a8e70'; g.fillRect(x - 6, 620 - hh, 46, 12); }
      jung_face(g, rx + 56, 470, 78, '#8a7e62', '#3e3628', '#5a8a30');
      for (let i = 0; i < 6; i++) jung_vine(g, rx - 40 + i * 40, 380, 80 + r() * 90, 90 + i);
      g.fillStyle = 'rgba(255,210,140,.1)'; g.fillRect(0, 0, w, 800); // golden haze
    });
    const near = artLayer(2800, 800, (g, w) => {
      const r = rng(19);
      for (const x of [720, 2080]) { vgrad(g, x - 40, 0, 80, 800, ['#1a2414', '#2a3420']); g.fillStyle = 'rgba(255,200,110,.25)'; g.fillRect(x + (x < 1400 ? 26 : -40), 0, 14, 800); }
      for (let i = 0; i < 26; i++) { const x = r() * w; cloud(g, x, 740 + r() * 40, 30 + r() * 20, '#3a5a24', '#243a18', '#142410', 200 + i); }
    });
    const rays = artLayer(1400, 800, (g) => {
      g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 7; i++) {
        const x = 700 + i * 110, gr = g.createLinearGradient(x, 0, x - 520, 800);
        gr.addColorStop(0, 'rgba(255,225,150,.32)'); gr.addColorStop(1, 'rgba(255,225,150,0)');
        g.fillStyle = gr; g.beginPath(); g.moveTo(x, -10); g.lineTo(x + 30 + i * 6, -10); g.lineTo(x - 420 + i * 10, 810); g.lineTo(x - 520, 810); g.closePath(); g.fill();
      }
    });
    const canopy = artLayer(1500, 800, (g, w) => {
      const r = rng(55);
      for (let i = 0; i < 70; i++) { const x = r() * w, y = r() * 70 - 20; g.fillStyle = ['#0e1a0c', '#16260f', '#1e3214'][i % 3]; g.beginPath(); g.ellipse(x, y, 40 + r() * 40, 18 + r() * 16, (r() - .5) * .8, 0, Math.PI * 2); g.fill(); }
      for (let i = 0; i < 14; i++) { const x = i < 7 ? r() * 330 : w - r() * 330; jung_vine(g, x, 20, 90 + r() * 220, 300 + i, '#10200c', '#1e3a14'); }
      for (let i = 0; i < 10; i++) jung_vine(g, 330 + r() * (w - 660), 30, 30 + r() * 60, 400 + i, '#10200c', '#1e3a14');
    });
    const body = artWorld(-500, -14, 1000, 460, (g, w, h) => {
      const r = rng(77);
      // temple wall going down into the jungle mist
      vgrad(g, 30, 40, w - 60, h - 40, ['#8a7a5e', '#6a5c46', '#2e2a20']);
      g.strokeStyle = 'rgba(40,30,20,.45)'; g.lineWidth = 1.5;
      for (let y = 40, row = 0; y < h; y += 30, row++) { g.beginPath(); g.moveTo(30, y); g.lineTo(w - 30, y); g.stroke(); for (let x = 30 + (row % 2) * 40; x < w - 30; x += 80) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 30); g.stroke(); } }
      // pillars with glyphs
      for (const x of [70, w - 130]) {
        vgrad(g, x, 40, 60, h, ['#a09070', '#4a4030']);
        for (let y = 70; y < 300; y += 44) { roundRect(g, x + 12, y, 36, 30, 3, null, 'rgba(40,30,20,.6)', 2); g.fillStyle = 'rgba(40,30,20,.5)'; g.fillRect(x + 22, y + 10, 16, 4 + (y % 3) * 3); }
      }
      // doorway darkness + carved face
      vgrad(g, w / 2 - 60, 180, 120, 280, ['#1a140e', '#0a0806']);
      jung_face(g, w / 2, 112, 56, '#a0906c', '#3e3426', '#5a9a34');
      // top slab
      vgrad(g, 16, 14, w - 32, 30, ['#c4b48e', '#8a7a5a']);
      g.fillStyle = 'rgba(255,230,170,.4)'; g.fillRect(16, 14, w - 32, 2);
      g.strokeStyle = 'rgba(40,30,20,.5)'; for (let x = 60; x < w - 30; x += 90 + r() * 30) { g.beginPath(); g.moveTo(x, 14); g.lineTo(x, 44); g.stroke(); }
      // moss cap with drips
      g.fillStyle = '#4f8a32'; g.beginPath(); g.moveTo(10, 16);
      for (let x = 10; x <= w - 10; x += 6) g.lineTo(x, 14 + Math.sin(x * .7) * 1.5);
      g.lineTo(w - 10, 8); g.lineTo(10, 8); g.closePath(); g.fill();
      for (let i = 0; i < 60; i++) roundRect(g, 14 + r() * (w - 34), 10, 4 + r() * 7, 10 + r() * 26, 3.5, '#4f8a32');
      g.fillStyle = '#a8d85a'; g.fillRect(16, 9, w - 32, 3);
      for (let i = 0; i < 22; i++) { g.globalAlpha = .5 + r() * .4; g.fillStyle = ['#4f8a32', '#3a6a24', '#6aa040'][i % 3]; g.beginPath(); g.ellipse(30 + r() * (w - 60), 50 + r() * 380, 8 + r() * 26, 4 + r() * 8, 0, 0, Math.PI * 2); g.fill(); }
      g.globalAlpha = 1;
      for (let i = 0; i < 18; i++) jung_vine(g, 30 + r() * (w - 60), 24, 60 + r() * 200, 500 + i);
      for (let i = 0; i < 26; i++) disc(g, 20 + r() * (w - 40), 9, 2.2, ['#ff8a50', '#ffe07a', '#ffffff', '#ff5a8a'][i % 4]);
      vgrad(g, 0, h - 160, w, 160, ['rgba(40,50,30,0)', 'rgba(30,40,24,.85)']); // mist fade at the bottom
    });
    return { sky, far, mid, near, rays, canopy, body, ledges: this.plats.map((p, i) => jung_ledge(p, i + 3)) };
  },
  drawBg(ctx, A, cam) {
    layer(ctx, A.sky, cam, 0);
    layer(ctx, A.far, cam, .05, 20);
    const F = JUNG_FALL; layer(ctx, A.mid, cam, F.k, F.oy);
    // falling water streaks
    const [mx, my, mz] = jung_at(cam, F.k, F.oy);
    ctx.save(); ctx.translate(mx, my); ctx.scale(mz, mz); ctx.beginPath(); ctx.rect(F.x, F.y, F.w, F.h - 40); ctx.clip();
    for (let i = 0; i < 16; i++) { ctx.fillStyle = i % 3 ? 'rgba(255,255,255,.55)' : 'rgba(120,180,200,.5)'; ctx.fillRect(F.x + (i * 23) % F.w, F.y + ((T * 6 + i * 67) % (F.h + 60)) - 60, 4, 50); }
    ctx.restore();
    layer(ctx, A.near, cam, .28, 60);
    ctx.globalAlpha = .75 + Math.sin(T * .013) * .25; layer(ctx, A.rays, cam, 0); ctx.globalAlpha = 1;
    layer(ctx, A.canopy, cam, .03, 0);
    // fireflies
    for (let i = 0; i < 24; i++) {
      const x = (i * 211 + Math.sin(T * .011 + i) * 60) % W, y = 150 + (i * 97) % 420 + Math.sin(T * .017 + i * 2) * 30, a = (Math.sin(T * .06 + i * 1.3) + 1) / 2;
      ctx.globalAlpha = a * .25; disc(ctx, x, y, 7, '#ffe98a'); ctx.globalAlpha = a; disc(ctx, x, y, 1.8, '#fffbd0');
    }
    ctx.globalAlpha = 1;
  },
  drawStage(ctx, A) {
    drawWorldArt(ctx, A.body);
    for (const c of A.ledges) drawWorldArt(ctx, c);
  },
});
