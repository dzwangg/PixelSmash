// stage: cyber — CYBER GRID: synthwave digital world; neon slab + one horizontal and one vertical moving panel.
function cyb_at(cam, k, oy) { const zk = 1 + (cam.z - 1) * k; return [W / 2 - cam.x * k * zk, H / 2 + (oy - (cam.y + 150) * k) * zk, zk]; }
const CYB_K = .05, CYB_OY = -95, CYB_HZ = 120; // horizon sits CYB_HZ below the mountain layer's centre

// wireframe mountain range: dark fill + neon triangulated mesh
function cyb_mountains(g, x0, x1, base, hMax, seed, line) {
  const r = rng(seed), pts = [];
  for (let x = x0; x <= x1; x += 50 + r() * 40) { const u = (x - x0) / (x1 - x0), env = Math.sin(u * Math.PI); pts.push([x, base - env * hMax * (.4 + r() * .6)]); }
  pts[0][1] = pts[pts.length - 1][1] = base;
  g.fillStyle = '#10041f'; g.beginPath(); g.moveTo(x0, base); for (const [x, y] of pts) g.lineTo(x, y); g.lineTo(x1, base); g.closePath(); g.fill();
  g.strokeStyle = line; g.lineWidth = 1.2; g.globalAlpha = .45; g.beginPath();
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1], m = [(ax + bx) / 2, base - (base - Math.min(ay, by)) * .45];
    g.moveTo(ax, ay); g.lineTo(m[0], m[1]); g.lineTo(bx, by); g.moveTo(m[0], m[1]); g.lineTo(m[0] + (r() - .5) * 30, base);
    g.moveTo(ax, ay); g.lineTo(ax + (r() - .5) * 20, base);
  }
  g.stroke(); g.globalAlpha = 1;
  g.shadowColor = line; g.shadowBlur = 10; g.lineWidth = 2; g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke(); g.shadowBlur = 0;
}

STAGES.push({
  id: 'cyber', name: 'CYBER GRID',
  main: { x1: -500, x2: 500, y: 0, depth: 60 },
  plats: [{ x1: -100, x2: 100, y: -170, move: { amp: 38, per: 300, axis: 'y' } }, { x1: -110, x2: 110, y: -300, move: { amp: 270, per: 540 } }],
  blast: { l: -1150, r: 1150, t: -900, b: 620 }, spawn: [-250, 250],
  build() {
    const sky = artLayer(1400, 800, (g, w, h) => {
      vgrad(g, 0, 0, w, h, ['#030010', '#0c0226', '#260845', '#5c0f62', '#a8206e', '#ff5a7a']);
      starfield(g, w, h * .45, 140, 61, ['#ffffff', '#9af0ff', '#ff9ae8']);
    });
    const hills = artLayer(2600, 800, (g, w) => {
      const cx = w / 2, hz = 400 + CYB_HZ;
      // striped retro sun, half set behind the horizon
      glow(g, cx, hz - 90, 420, 'rgba(255,60,160,.45)');
      g.save(); g.beginPath(); g.rect(0, 0, w, hz); g.clip();
      const R = 200, sg = g.createLinearGradient(0, hz - 90 - R, 0, hz - 90 + R); sg.addColorStop(0, '#fff27a'); sg.addColorStop(.45, '#ff9a3a'); sg.addColorStop(1, '#ff1a8a');
      disc(g, cx, hz - 90, R, sg);
      g.globalCompositeOperation = 'destination-out';
      for (let i = 0; i < 9; i++) { const y = hz - 150 + i * i * 3.2 + i * 10; g.fillRect(cx - R, y, R * 2, 2 + i * 1.6); }
      g.restore();
      cyb_mountains(g, 60, 1060, hz, 250, 3, '#3af0ff');
      cyb_mountains(g, 1540, 2540, hz, 230, 7, '#3af0ff');
      cyb_mountains(g, 820, 1180, hz, 120, 11, '#ff3ad8');
      cyb_mountains(g, 1420, 1800, hz, 140, 12, '#ff3ad8');
      // horizon glow line
      g.globalCompositeOperation = 'lighter'; vgrad(g, 0, hz - 24, w, 30, ['rgba(255,60,200,0)', 'rgba(255,80,210,.45)']);
      g.fillStyle = '#ffb0f0'; g.fillRect(0, hz - 1, w, 2); g.globalCompositeOperation = 'source-over';
    });
    const body = artWorld(-530, -12, 1060, 110, (g, w) => {
      // tapered glassy slab
      const gr = g.createLinearGradient(0, 12, 0, 80); gr.addColorStop(0, '#2a1458'); gr.addColorStop(1, '#0a0420');
      g.fillStyle = gr; g.beginPath(); g.moveTo(30, 12); g.lineTo(w - 30, 12); g.lineTo(w - 90, 74); g.lineTo(90, 74); g.closePath(); g.fill();
      // circuit traces
      const r = rng(5); g.strokeStyle = 'rgba(58,240,255,.35)'; g.lineWidth = 1.4;
      for (let i = 0; i < 26; i++) { let x = 80 + r() * (w - 160), y = 24 + r() * 10; g.beginPath(); g.moveTo(x, y); x += (r() - .5) * 60; g.lineTo(x, y); y += 12 + r() * 20; g.lineTo(x + (r() - .5) * 20, y); g.stroke(); disc(g, x, y, 2, 'rgba(120,250,255,.7)'); }
      // neon edges
      g.shadowBlur = 16; g.shadowColor = '#3af0ff'; g.fillStyle = '#b8fcff'; g.fillRect(30, 12, w - 60, 3.5);
      g.shadowColor = '#ff3ad8'; g.strokeStyle = '#ff5ae0'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(30, 14); g.lineTo(90, 74); g.lineTo(w - 90, 74); g.lineTo(w - 30, 14); g.stroke(); g.shadowBlur = 0;
      for (const x of [220, w / 2, w - 220]) { roundRect(g, x - 34, 72, 68, 14, 5, '#1a0a36', '#ff5ae0', 2); }
    });
    return { sky, hills, body };
  },
  drawBg(ctx, A, cam) {
    layer(ctx, A.sky, cam, 0);
    layer(ctx, A.hills, cam, CYB_K, CYB_OY);
    const [vx, cy, zk] = cyb_at(cam, CYB_K, CYB_OY), hy = cy + CYB_HZ * zk;
    // perspective grid floor scrolling toward the viewer
    const fg = ctx.createLinearGradient(0, hy, 0, H); fg.addColorStop(0, '#2a0648'); fg.addColorStop(1, '#0a0118');
    ctx.fillStyle = fg; ctx.fillRect(0, hy, W, H - hy + 2);
    ctx.save(); ctx.beginPath(); ctx.rect(0, hy, W, H - hy + 2); ctx.clip();
    const t = (T * .02) % 1; ctx.beginPath();
    for (let n = 1; n < 26; n++) { const z = n - t; if (z < .25) continue; const y = hy + 150 / z; ctx.moveTo(0, y); ctx.lineTo(W, y); }
    for (let j = -22; j <= 22; j++) { ctx.moveTo(vx + j * 14, hy); ctx.lineTo(vx + j * 260, hy + 700); }
    ctx.strokeStyle = 'rgba(255,58,216,.25)'; ctx.lineWidth = 5; ctx.stroke();
    ctx.strokeStyle = '#ff5ae0'; ctx.lineWidth = 1.5; ctx.stroke();
    const hg = ctx.createLinearGradient(0, hy, 0, hy + 60); hg.addColorStop(0, 'rgba(255,90,200,.3)'); hg.addColorStop(1, 'rgba(255,90,200,0)');
    ctx.fillStyle = hg; ctx.fillRect(0, hy, W, 60);
    ctx.restore();
    // rising data streams
    for (let i = 0; i < 34; i++) {
      const x = (i * 157 + 40) % W, sp = 1 + (i % 4) * .5, y = H - ((T * sp + i * 91) % (H + 120));
      ctx.fillStyle = i % 3 ? '#3af0ff' : '#ff5ae0';
      for (let k = 0; k < 4; k++) { ctx.globalAlpha = .5 - k * .12; ctx.fillRect(x, y + k * 12, 2.5, 8); }
    }
    ctx.globalAlpha = 1;
  },
  drawStage(ctx, A) {
    // hover thrusters under the slab
    const f = .8 + Math.sin(T * .3) * .15;
    for (const x of [-310, 0, 310]) {
      const gr = ctx.createLinearGradient(0, 74, 0, 74 + 70 * f); gr.addColorStop(0, 'rgba(255,120,230,.8)'); gr.addColorStop(1, 'rgba(255,60,200,0)');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(x - 26, 74); ctx.lineTo(x + 26, 74); ctx.lineTo(x, 74 + 70 * f); ctx.closePath(); ctx.fill();
    }
    drawWorldArt(ctx, A.body);
    // light pulse racing along the top edge
    const px = -500 + ((T * 8) % 1000);
    const pg = ctx.createLinearGradient(px - 90, 0, px, 0); pg.addColorStop(0, 'rgba(255,255,255,0)'); pg.addColorStop(1, 'rgba(255,255,255,.95)');
    ctx.fillStyle = pg; ctx.fillRect(px - 90, -1, 90, 4);
    // neon panels
    this.plats.forEach((p, i) => {
      const w = p.x2 - p.x1, c = i ? '#3af0ff' : '#ff5ae0', mx = (p.x1 + p.x2) / 2;
      const ug = ctx.createLinearGradient(0, p.y + 16, 0, p.y + 50); ug.addColorStop(0, i ? 'rgba(58,240,255,.3)' : 'rgba(255,90,224,.3)'); ug.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = ug; ctx.fillRect(p.x1 + 14, p.y + 16, w - 28, 34);
      ctx.shadowColor = c; ctx.shadowBlur = 14; roundRect(ctx, p.x1, p.y, w, 16, 4, 'rgba(22,8,50,.92)', c, 2.5); ctx.shadowBlur = 0;
      ctx.fillStyle = c; ctx.globalAlpha = .35; for (let x = p.x1 + 20; x < p.x2 - 10; x += 20) ctx.fillRect(x, p.y + 4, 1.5, 9); ctx.globalAlpha = 1;
      ctx.fillStyle = '#ffffff'; ctx.fillRect(p.x1 + 6, p.y + 1, w - 12, 2);
      // direction chevrons
      ctx.fillStyle = c; ctx.globalAlpha = .6 + Math.sin(T * .1) * .3; ctx.beginPath();
      if (i) { for (const d of [-1, 1]) { ctx.moveTo(mx + d * 14, p.y + 4); ctx.lineTo(mx + d * 22, p.y + 8); ctx.lineTo(mx + d * 14, p.y + 12); } }
      else { ctx.moveTo(mx - 8, p.y + 7); ctx.lineTo(mx, p.y + 3); ctx.lineTo(mx + 8, p.y + 7); ctx.moveTo(mx - 8, p.y + 9); ctx.lineTo(mx, p.y + 13); ctx.lineTo(mx + 8, p.y + 9); }
      ctx.fill(); ctx.globalAlpha = 1;
    });
  },
});
