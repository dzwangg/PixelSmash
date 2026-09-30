// stage: frozen — FROZEN PEAKS: icy summit under an aurora; slippery wide ice stage + two drifting ice floes.
function froz_pines(g, w, base, n, seed, col, minH, maxH) { // row of pine silhouettes
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    const x = r() * w, h = minH + r() * (maxH - minH), bw = h * .34;
    g.fillStyle = col; g.fillRect(x - 2, base - h * .15, 4, h * .15 + 40);
    for (let k = 0; k < 4; k++) { const ty = base - h + k * h * .2, tw = bw * (.4 + k * .22); g.beginPath(); g.moveTo(x, ty); g.lineTo(x + tw, ty + h * .32); g.lineTo(x - tw, ty + h * .32); g.fill(); }
    g.fillStyle = 'rgba(230,245,255,.55)'; g.beginPath(); g.moveTo(x, base - h); g.lineTo(x + bw * .25, base - h + h * .1); g.lineTo(x - bw * .25, base - h + h * .1); g.fill();
  }
}
function froz_peaks(g, w, base, seed, n, hMin, hMax, rock, snow) { // jagged snow-capped peaks
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    const x = (i + r() * .6) * w / n, h = hMin + r() * (hMax - hMin), bw = h * (1 + r() * .6);
    const pts = [[x - bw, base], [x - bw * .3, base - h * .6], [x - bw * .12, base - h * .82], [x, base - h], [x + bw * .2, base - h * .78], [x + bw * .45, base - h * .55], [x + bw, base]];
    const gr = g.createLinearGradient(0, base - h, 0, base); gr.addColorStop(0, rock[0]); gr.addColorStop(1, rock[1]);
    g.fillStyle = gr; g.beginPath(); pts.forEach(([px, py], k) => k ? g.lineTo(px, py) : g.moveTo(px, py)); g.fill();
    g.fillStyle = snow; g.beginPath(); g.moveTo(x - bw * .3, base - h * .6); g.lineTo(x - bw * .12, base - h * .82); g.lineTo(x, base - h); g.lineTo(x + bw * .2, base - h * .78); g.lineTo(x + bw * .28, base - h * .62);
    for (let k = 0; k < 5; k++) g.lineTo(x + bw * (.2 - k * .12), base - h * (.66 - (k % 2) * .08)); g.fill();
    g.fillStyle = 'rgba(0,10,40,.25)'; g.beginPath(); g.moveTo(x, base - h); g.lineTo(x + bw, base); g.lineTo(x + bw * .2, base); g.fill(); // shaded face
  }
}

STAGES.push({
  id: 'frozen', name: 'FROZEN PEAKS',
  main: { x1: -560, x2: 560, y: 0, depth: 90 },
  plats: [
    { x1: -330, x2: -150, y: -170, move: { amp: 110, per: 480 } },
    { x1: 150, x2: 330, y: -170, move: { amp: 110, per: 480, phase: Math.PI } },
  ],
  blast: { l: -1200, r: 1200, t: -900, b: 620 }, spawn: [-260, 260],
  fric: .95,
  build() {
    const sky = artLayer(1400, 800, (g, w, h) => {
      vgrad(g, 0, 0, w, h, ['#020816', '#061530', '#0c2848', '#1a4a6a', '#4a7c98']);
      starfield(g, w, h * .7, 220, 51, ['#ffffff', '#c8f0ff', '#d8ffe8']);
    });
    // aurora curtain texture: vertical streaks fading upward, green → teal → violet
    const aurora = artLayer(1600, 420, (g, w, h) => {
      g.globalCompositeOperation = 'lighter';
      const r = rng(52);
      for (let i = 0; i < 520; i++) {
        const x = i / 520 * w, y = 300 + Math.sin(x * .006) * 60 + Math.sin(x * .017 + 2) * 22, len = 80 + r() * 150 * (.6 + .4 * Math.sin(x * .01));
        const gr = g.createLinearGradient(0, y - len, 0, y + 20);
        const hue = x / w < .5 ? '80,255,170' : '90,230,255';
        gr.addColorStop(0, 'rgba(170,90,255,0)'); gr.addColorStop(.5, 'rgba(150,110,255,.07)'); gr.addColorStop(.88, `rgba(${hue},.26)`); gr.addColorStop(1, `rgba(${hue},0)`);
        g.fillStyle = gr; g.fillRect(x, y - len, 3 + r() * 4, len + 20);
      }
      g.globalCompositeOperation = 'source-over';
    });
    const far = artLayer(2600, 800, (g, w) => {
      froz_peaks(g, w, 720, 53, 7, 260, 420, ['#46648a', '#223a56'], '#b8d0e8');
      vgrad(g, 0, 560, w, 240, ['rgba(160,200,230,0)', 'rgba(140,180,220,.45)']); // valley mist
    });
    const mid = artLayer(2800, 800, (g, w) => {
      froz_peaks(g, w, 800, 54, 6, 200, 300, ['#2a4260', '#122036'], '#8eaccc');
      froz_pines(g, w, 800, 70, 55, '#0c1a2a', 50, 120);
    });
    // main stage: a snowy rock summit capped with a glassy ice sheet, icicles hanging off the lip
    const body = artWorld(-600, -30, 1200, 420, (g, w) => {
      const r = rng(56);
      // rock mass
      const rg = g.createLinearGradient(0, 40, 0, 420); rg.addColorStop(0, '#3a4a64'); rg.addColorStop(1, '#101828');
      g.fillStyle = rg; g.beginPath(); g.moveTo(40, 40);
      for (let x = 40; x <= w - 40; x += 30) { const u = (x - w / 2) / (w / 2 - 40); g.lineTo(x, 40 + (1 - Math.abs(u) ** 1.4) * 360 + (r() - .5) * 26); }
      g.closePath(); g.fill();
      g.strokeStyle = 'rgba(160,200,240,.14)'; g.lineWidth = 3; for (let i = 0; i < 22; i++) { const x = 120 + r() * 960, y = 70 + r() * 150; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 20 + r() * 30, y + 30 + r() * 30); g.stroke(); }
      g.fillStyle = 'rgba(230,245,255,.28)'; for (let i = 0; i < 12; i++) { g.beginPath(); g.ellipse(100 + r() * 1000, 80 + r() * 160, 16 + r() * 24, 4 + r() * 3, (r() - .5) * .6, 0, Math.PI * 2); g.fill(); } // snow ledges
      // icicles along the lip
      for (let x = 50; x < w - 50; x += 16 + r() * 16) { const l = 12 + r() * 40; const ig = g.createLinearGradient(0, 50, 0, 50 + l); ig.addColorStop(0, '#d8f4ff'); ig.addColorStop(1, 'rgba(140,210,255,.2)'); g.fillStyle = ig; g.beginPath(); g.moveTo(x - 4, 50); g.lineTo(x + 4, 50); g.lineTo(x + .5, 50 + l); g.fill(); }
      // ice sheet (walkable top at local y=30)
      const ig = g.createLinearGradient(0, 28, 0, 56); ig.addColorStop(0, '#f4fcff'); ig.addColorStop(.25, '#b8e6fa'); ig.addColorStop(1, '#5aa8d8');
      g.fillStyle = ig; g.beginPath(); g.roundRect(34, 28, w - 68, 26, 8); g.fill();
      g.fillStyle = '#ffffff'; g.fillRect(44, 29, w - 88, 2);
      g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 1.5; for (let i = 0; i < 18; i++) { const x = 60 + r() * 1080; g.beginPath(); g.moveTo(x, 34); g.lineTo(x + 14, 44); g.lineTo(x + 8, 52); g.stroke(); }
      g.fillStyle = 'rgba(255,255,255,.35)'; for (let i = 0; i < 12; i++) g.fillRect(60 + r() * 1060, 36, 30 + r() * 50, 2);
      // snow drifts piled at both ends
      for (const [x, d] of [[34, 1], [w - 34, -1]]) { g.fillStyle = '#eef8ff'; g.beginPath(); g.ellipse(x + d * 30, 34, 50, 14, 0, Math.PI, 0); g.fill(); g.fillStyle = '#c8e0f4'; g.beginPath(); g.ellipse(x + d * 30, 38, 50, 6, 0, 0, Math.PI); g.fill(); }
    });
    const floe = artWorld(0, 0, 200, 70, (g, w) => { // drifting ice floe: snow cap + translucent jagged underside
      const gr = g.createLinearGradient(0, 8, 0, 70); gr.addColorStop(0, 'rgba(170,225,250,.95)'); gr.addColorStop(1, 'rgba(60,130,200,.55)');
      g.fillStyle = gr; g.beginPath(); g.moveTo(6, 10); g.lineTo(w - 6, 10); g.lineTo(w - 14, 30); g.lineTo(w - 40, 44); g.lineTo(w - 70, 62); g.lineTo(w / 2, 52); g.lineTo(70, 66); g.lineTo(38, 42); g.lineTo(16, 30); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(40, 20); g.lineTo(60, 40); g.moveTo(130, 18); g.lineTo(118, 44); g.stroke();
      g.fillStyle = '#f4fbff'; g.beginPath(); g.moveTo(2, 12); g.quadraticCurveTo(20, 0, 60, 2); g.quadraticCurveTo(100, -1, 140, 2); g.quadraticCurveTo(185, 0, 198, 12); g.lineTo(198, 16); g.lineTo(2, 16); g.fill();
      g.fillStyle = '#c4def2'; g.fillRect(4, 14, w - 8, 3);
    });
    return { sky, aurora, far, mid, body, floe };
  },
  drawBg(ctx, A, cam) {
    layer(ctx, A.sky, cam, 0);
    // aurora: the curtain texture sliced into columns that ripple and breathe
    const a = A.aurora, n = 48, sw = a.width / n, lw = W * 1.25 / n;
    for (let i = 0; i < n; i++) {
      const dy = Math.sin(T * .015 + i * .22) * 16, sh = 1 + Math.sin(T * .02 + i * .3) * .1;
      ctx.globalAlpha = .75 + Math.sin(T * .01 + i * .15) * .25;
      ctx.drawImage(a, i * sw, 0, sw + 1, a.height, -W * .12 + i * lw, -60 + dy, lw + 1, 420 * sh);
    }
    ctx.globalAlpha = 1;
    layer(ctx, A.far, cam, .07, 60);
    layer(ctx, A.mid, cam, .18, 100);
  },
  drawStage(ctx, A) {
    drawWorldArt(ctx, A.body);
    ctx.globalAlpha = .35 + Math.sin(T * .03) * .2; ctx.fillStyle = '#ffffff'; // glint sweeping across the ice
    const gx = ((T * 4) % 1800) - 900; ctx.fillRect(gx, 1, 60, 3); ctx.globalAlpha = 1;
    for (const p of this.plats) ctx.drawImage(A.floe, p.x1 - 10, p.y - 12, p.x2 - p.x1 + 20, 70);
  },
  drawFront(ctx) {
    ctx.fillStyle = 'rgba(240,250,255,.8)';
    for (let i = 0; i < 60; i++) { // gentle snowfall
      const s = 1 + (i % 3), y = (i * 53 + T * (.5 + s * .3)) % (H + 20) - 10, x = (i * 131 + Math.sin(T * .015 + i) * 30 + T * .3) % (W + 40) - 20;
      ctx.beginPath(); ctx.arc(x, y, s, 0, Math.PI * 2); ctx.fill();
    }
  },
});
