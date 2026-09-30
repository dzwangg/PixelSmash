// Stages: collision geometry (world units, main stage top at y=0) + smooth high-resolution art.
// Art is painted once (lazily) into offscreen canvases with the normal canvas API at ART× density,
// then drawn with parallax each frame. More stages are added by files in stages/*.js (STAGES.push).

const ART = 2;        // background canvas pixels per logical pixel
const WART = 2.5;     // world-space art (stage bodies) canvas pixels per world unit
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// ---------- canvas builders ----------
// a background layer: logical size w×h, painted with fn(g, w, h) in logical units
function artLayer(w, h, fn) { const c = mkCanvas(Math.round(w * ART), Math.round(h * ART)), g = c.getContext('2d'); g.scale(ART, ART); fn(g, w, h); c.lw = w; c.lh = h; return c; }
// a world-space piece anchored at world (x, y) of size w×h; fn paints in local world units (0,0 = top-left)
function artWorld(x, y, w, h, fn) { const c = mkCanvas(Math.round(w * WART), Math.round(h * WART)), g = c.getContext('2d'); g.scale(WART, WART); fn(g, w, h); Object.assign(c, { wx: x, wy: y, ww: w, wh: h }); return c; }
const drawWorldArt = (ctx, c) => ctx.drawImage(c, c.wx, c.wy, c.ww, c.wh);
// draw a background layer with parallax k (0 = pinned to the screen, 1 = moves with the world)
function layer(ctx, c, cam, k, oy = 0, ox = 0) {
  const zk = 1 + (cam.z - 1) * k;
  const cx = W / 2 - cam.x * k * zk + ox * zk, cy = H / 2 + (oy - (cam.y + 150) * k) * zk;
  ctx.drawImage(c, cx - c.lw * zk / 2, cy - c.lh * zk / 2, c.lw * zk, c.lh * zk);
}

// ---------- painting helpers (all take a 2d context in logical units) ----------
function vgrad(g, x, y, w, h, stops) { const gr = g.createLinearGradient(0, y, 0, y + h); stops.forEach((c, i) => gr.addColorStop(i / (stops.length - 1), c)); g.fillStyle = gr; g.fillRect(x, y, w, h); }
function glow(g, x, y, r, col, a = 1) { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.globalAlpha = a; g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); g.globalAlpha = 1; }
function disc(g, x, y, r, col) { g.fillStyle = col; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
function starfield(g, w, h, n, seed, cols = ['#ffffff', '#c8d4ff', '#ffe8c8']) {
  const r = rng(seed);
  for (let i = 0; i < n; i++) { const x = r() * w, y = r() * h, s = r() < .08 ? 2.2 : r() * 1.3 + .4; g.globalAlpha = .4 + r() * .6; disc(g, x, y, s, cols[i % cols.length]); if (s > 2) { g.fillRect(x - 6, y - .5, 12, 1); g.fillRect(x - .5, y - 6, 1, 12); } }
  g.globalAlpha = 1;
}
// soft cloud: overlapping ellipses with a lit top and shaded bottom
function cloud(g, x, y, s, lit = '#ffffff', mid = '#f0d8e8', shade = '#c8a8c8', seed = 1) {
  const r = rng(seed), blobs = [];
  for (let i = 0; i < 7; i++) blobs.push([x + (r() - .5) * s * 3.2, y + (r() - .6) * s * .7, s * (.45 + r() * .55)]);
  for (const [col, dy, k] of [[shade, s * .18, 1], [mid, 0, .96], [lit, -s * .12, .8]]) { g.fillStyle = col; for (const [bx, by, br] of blobs) { g.beginPath(); g.ellipse(bx, by + dy, br * k, br * k * .8, 0, 0, Math.PI * 2); g.fill(); } }
}
// mountain / hill ridge silhouette with a vertical gradient fill
function ridge(g, w, base, amp, seed, top, bottom, rough = 1) {
  const r = rng(seed), f = [r() * .01 + .004, r() * .02 + .01, r() * .05 + .03], p = [r() * 9, r() * 9, r() * 9];
  g.beginPath(); g.moveTo(0, base + 400);
  for (let x = 0; x <= w; x += 6) g.lineTo(x, base - amp * (.55 + .3 * Math.sin(x * f[0] + p[0]) + .12 * Math.sin(x * f[1] + p[1]) * rough + .05 * Math.sin(x * f[2] + p[2]) * rough));
  g.lineTo(w, base + 400); g.closePath();
  const gr = g.createLinearGradient(0, base - amp, 0, base + 200); gr.addColorStop(0, top); gr.addColorStop(1, bottom); g.fillStyle = gr; g.fill();
}
// city skyline with lit windows
function skyline(g, w, base, minH, maxH, seed, body, lit, dens, neon) {
  const r = rng(seed);
  for (let x = -10; x < w;) {
    const bw = 40 + r() * 70, bh = minH + r() * (maxH - minH);
    g.fillStyle = body; g.fillRect(x, base - bh, bw, bh + 200);
    if (r() < .35) g.fillRect(x + bw * .45, base - bh - 26, 3, 26);
    for (let wy = base - bh + 10; wy < base - 6; wy += 12) for (let wx = x + 6; wx < x + bw - 8; wx += 10) if (r() < dens) { g.fillStyle = lit[r() * lit.length | 0]; g.fillRect(wx, wy, 5, 6); }
    if (neon && r() < .4) { const c = neon[r() * neon.length | 0], ny = base - bh + 20 + r() * 40; g.shadowColor = c; g.shadowBlur = 14; g.fillStyle = c; g.fillRect(x + 8, ny, bw - 16, 5); g.shadowBlur = 0; }
    x += bw + r() * 8;
  }
}
function roundRect(g, x, y, w, h, r, fill, stroke, lw = 2) { g.beginPath(); g.roundRect(x, y, w, h, r); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.lineWidth = lw; g.strokeStyle = stroke; g.stroke(); } }
// a generic floating platform (drawn live in world space each frame — cheap)
function drawPlat(ctx, p, top = '#e8e0f0', mid = '#b8b0c8', dark = '#7a7290', accent = '#7ff0ff') {
  const w = p.x2 - p.x1;
  const gr = ctx.createLinearGradient(0, p.y, 0, p.y + 22); gr.addColorStop(0, mid); gr.addColorStop(1, dark);
  ctx.fillStyle = gr; ctx.beginPath(); ctx.roundRect(p.x1, p.y, w, 22, 6); ctx.fill();
  ctx.fillStyle = top; ctx.fillRect(p.x1 + 4, p.y, w - 8, 5);
  if (accent) { ctx.fillStyle = accent; ctx.globalAlpha = .6 + Math.sin(T * .06) * .3; ctx.fillRect(p.x1 + w / 2 - 12, p.y + 9, 24, 4); ctx.globalAlpha = 1; }
}

const STAGES = [
  { // ---------------- SKY SANCTUARY ----------------
    id: 'sky', name: 'SKY SANCTUARY',
    main: { x1: -480, x2: 480, y: 0, depth: 90 },
    plats: [{ x1: -330, x2: -120, y: -165 }, { x1: 120, x2: 330, y: -165 }, { x1: -105, x2: 105, y: -310 }],
    blast: { l: -1150, r: 1150, t: -900, b: 620 }, spawn: [-240, 240],
    build() {
      const sky = artLayer(1400, 800, (g, w, h) => {
        vgrad(g, 0, 0, w, h, ['#1d2a6e', '#3a4fa8', '#7a78c8', '#e090a8', '#ffc59a', '#ffe6b8']);
        starfield(g, w, h * .4, 80, 3);
        glow(g, 980, 560, 420, 'rgba(255,220,170,.9)'); disc(g, 980, 560, 70, '#fff4d8');
      });
      const far = artLayer(2600, 800, (g, w) => {
        ridge(g, w, 700, 230, 11, '#9a86c8', '#6a5898');
        ridge(g, w, 760, 150, 12, '#7a68aa', '#4a3c78');
        const isl = (x, y, s) => {
          g.fillStyle = '#6a5a98'; g.beginPath(); g.moveTo(x - s, y); g.quadraticCurveTo(x, y + s * 1.6, x + s, y); g.closePath(); g.fill();
          g.fillStyle = '#8fcf7a'; g.beginPath(); g.ellipse(x, y, s, s * .18, 0, 0, Math.PI * 2); g.fill();
          g.fillStyle = 'rgba(200,235,255,.7)'; g.fillRect(x + s * .3, y + s * .5, s * .08, 260);
        };
        isl(400, 380, 70); isl(1500, 330, 90); isl(2200, 420, 55);
      });
      const clouds = artLayer(2800, 800, (g) => { const r = rng(5); for (let i = 0; i < 10; i++) cloud(g, r() * 2800, 200 + r() * 420, 30 + r() * 30, '#fff6fa', '#f4d4e2', '#c8a0c0', i + 3); });
      const body = artWorld(-500, -10, 1000, 380, (g) => {
        const gr = g.createLinearGradient(0, 20, 0, 370); gr.addColorStop(0, '#7a6488'); gr.addColorStop(1, '#3a2c50');
        g.fillStyle = gr; g.beginPath(); g.moveTo(20, 30);
        for (let x = 20; x <= 980; x += 20) { const u = (x - 500) / 480; g.lineTo(x, 30 + (1 - Math.abs(u) ** 1.6) * 320 + Math.sin(x * .09) * 10); }
        g.closePath(); g.fill();
        const r = rng(9);
        g.strokeStyle = 'rgba(40,30,60,.5)'; g.lineWidth = 2; for (let i = 0; i < 30; i++) { const x = 60 + r() * 880, y = 60 + r() * 150; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - .5) * 40, y + 20 + r() * 30); g.stroke(); }
        for (let i = 0; i < 8; i++) { const x = 120 + r() * 760, y = 80 + r() * 120; glow(g, x, y, 22, 'rgba(127,240,255,.8)'); g.fillStyle = '#bff8ff'; g.beginPath(); g.moveTo(x, y - 10); g.lineTo(x + 5, y); g.lineTo(x, y + 10); g.lineTo(x - 5, y); g.fill(); }
        vgrad(g, 20, 14, 960, 32, ['#9a6a44', '#6a4428']);
        g.fillStyle = '#6dc84e'; g.beginPath(); g.moveTo(14, 20); for (let x = 14; x <= 986; x += 8) g.lineTo(x, 8 + Math.sin(x * .7) * 2.5); g.lineTo(986, 22); g.closePath(); g.fill();
        g.fillStyle = '#b4f07a'; g.fillRect(20, 9, 960, 3);
        g.strokeStyle = '#4f9a3a'; g.lineWidth = 2.5; for (let i = 0; i < 26; i++) { const x = 40 + r() * 920; g.beginPath(); g.moveTo(x, 40); g.bezierCurveTo(x + 6, 90, x - 6, 120, x + 3, 120 + r() * 90); g.stroke(); }
        for (let i = 0; i < 40; i++) { const x = 30 + r() * 940; disc(g, x, 8 + Math.sin(x * .7) * 2, 2.2, ['#ffe07a', '#ff9ab0', '#ffffff'][i % 3]); }
      });
      return { sky, far, clouds, body };
    },
    drawBg(ctx, A, cam) {
      layer(ctx, A.sky, cam, 0);
      layer(ctx, A.far, cam, .08, 40);
      const d = (T * .15) % 2800;
      layer(ctx, A.clouds, cam, .2, 20, d); layer(ctx, A.clouds, cam, .2, 20, d - 2800);
    },
    drawStage(ctx, A) {
      drawWorldArt(ctx, A.body);
      for (let i = 0; i < 14; i++) { ctx.fillStyle = i % 2 ? 'rgba(191,230,255,.85)' : 'rgba(232,246,255,.9)'; ctx.fillRect(-8 + (i % 3) * 5, 300 + ((T * 5 + i * 40) % 520), 5, 36); }
      for (const p of this.plats) drawPlat(ctx, p);
    },
  },
  { // ---------------- NEON ROOFTOP ----------------
    id: 'neon', name: 'NEON ROOFTOP',
    main: { x1: -470, x2: 470, y: 0, depth: 600 },
    plats: [{ x1: -390, x2: -190, y: -170 }, { x1: -90, x2: 90, y: -300, move: { amp: 300, per: 480 } }],
    blast: { l: -1150, r: 1150, t: -900, b: 620 }, spawn: [-240, 240],
    build() {
      const sky = artLayer(1400, 800, (g, w, h) => {
        vgrad(g, 0, 0, w, h, ['#07041a', '#140a36', '#2a1150', '#5a1d6b', '#8a2a7a']);
        starfield(g, w, h * .55, 160, 21, ['#ffffff', '#b0a0ff', '#ffb0e0']);
        glow(g, 300, 170, 160, 'rgba(240,232,255,.35)'); disc(g, 300, 170, 50, '#f0e8ff'); disc(g, 322, 158, 44, '#1a0c40');
      });
      const far = artLayer(2600, 800, (g, w) => skyline(g, w, 800, 150, 420, 3, '#1b1238', ['#5a4a8a', '#8a6a4a', '#4a6a8a'], .1, null));
      const near = artLayer(2800, 800, (g, w) => skyline(g, w, 800, 220, 520, 9, '#0e0820', ['#ffe07a', '#7af0ff', '#ff9ae0', '#ffb05a'], .2, ['#ff3bd4', '#3bf0ff', '#ffe03b', '#ff5a3b']));
      const body = artWorld(-490, -40, 980, 640, (g) => {
        vgrad(g, 20, 40, 940, 600, ['#2a2046', '#140e28']);
        for (let x = 20; x < 960; x += 120) { g.fillStyle = '#1c1430'; g.fillRect(x, 40, 6, 600); }
        const r = rng(4);
        for (let y = 70; y < 640; y += 36) for (let x = 44; x < 940; x += 30) { const lit = r() < .35; g.fillStyle = lit ? ['#ffe07a', '#7af0ff', '#ffb05a'][r() * 3 | 0] : '#16102c'; if (lit) { g.shadowColor = g.fillStyle; g.shadowBlur = 8; } g.fillRect(x, y, 14, 18); g.shadowBlur = 0; }
        vgrad(g, 10, 36, 960, 16, ['#b8bcd8', '#6b6f8a']); g.fillStyle = '#3a3d55'; g.fillRect(10, 52, 960, 3);
        const ac = x => { roundRect(g, x, 0, 70, 38, 4, '#8a8ea8'); g.fillStyle = '#b8bcd8'; g.fillRect(x + 4, 3, 62, 3); for (let i = 0; i < 4; i++) { g.fillStyle = '#5a5e78'; g.fillRect(x + 8 + i * 15, 12, 9, 20); } };
        ac(90); ac(800);
        g.fillStyle = '#6b6f8a'; g.fillRect(210, 0, 3, 36); g.fillRect(198, 8, 28, 3); disc(g, 211, 2, 5, '#ff3b3b');
      });
      return { sky, far, near, body };
    },
    drawBg(ctx, A, cam) {
      layer(ctx, A.sky, cam, 0);
      layer(ctx, A.far, cam, .1, 110);
      layer(ctx, A.near, cam, .25, 190);
    },
    drawStage(ctx, A) {
      drawWorldArt(ctx, A.body);
      const on = (T >> 4) % 8 !== 0;
      ctx.font = `bold 40px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      if (on) { ctx.shadowColor = '#ff3bd4'; ctx.shadowBlur = 24; }
      ctx.fillStyle = on ? '#ffd0f4' : '#5a1a4a'; ctx.fillText('SMASH', 0, 70); ctx.shadowBlur = 0;
      const [b, d] = this.plats;
      roundRect(ctx, b.x1 - 6, b.y, b.x2 - b.x1 + 12, 70, 6, '#1c1430', '#9a9ec0', 4);
      ctx.fillStyle = '#4a4d65'; ctx.fillRect(b.x1 + 30, b.y + 70, 8, 60); ctx.fillRect(b.x2 - 38, b.y + 70, 8, 60);
      ctx.font = `20px ${FONT}`; ctx.shadowColor = '#3bf0ff'; ctx.shadowBlur = 16; ctx.fillStyle = (T >> 5) % 2 ? '#3bf0ff' : '#ffe03b'; ctx.fillText('FIGHT!', (b.x1 + b.x2) / 2, b.y + 38); ctx.shadowBlur = 0;
      drawPlat(ctx, d, '#c8ccea', '#6b6f8a', '#3a3d55', '#7af0ff');
      if (T % 4 < 2) { ctx.fillStyle = 'rgba(122,240,255,.45)'; ctx.fillRect(d.x1 + 30, d.y + 22, 30, 16); ctx.fillRect(d.x2 - 60, d.y + 22, 30, 16); }
    },
    drawFront(ctx) {
      ctx.fillStyle = 'rgba(170,190,255,.3)';
      for (let i = 0; i < 110; i++) { const x = (i * 137 + T * 3) % (W + 100) - 50, y = (i * 71 + T * 18) % (H + 40) - 20; ctx.fillRect(x, y, 1.5, 14); }
    },
  },
  { // ---------------- COSMIC VOID ----------------
    id: 'void', name: 'COSMIC VOID',
    main: { x1: -560, x2: 560, y: 0, depth: 70 },
    plats: [],
    blast: { l: -1200, r: 1200, t: -900, b: 620 }, spawn: [-260, 260],
    build() {
      const sky = artLayer(1400, 800, (g, w, h) => {
        vgrad(g, 0, 0, w, h, ['#03020a', '#0a0620', '#120a30', '#07041a']);
        g.globalCompositeOperation = 'lighter'; const r = rng(99);
        for (let i = 0; i < 18; i++) glow(g, r() * w, r() * h, 120 + r() * 220, ['rgba(120,40,160,.35)', 'rgba(40,70,170,.35)', 'rgba(170,40,110,.3)'][i % 3]);
        g.globalCompositeOperation = 'source-over';
        starfield(g, w, h, 420, 7);
      });
      const planet = artLayer(900, 700, (g) => {
        const cx = 450, cy = 350, R = 170;
        const ring = (back) => { g.save(); g.translate(cx, cy); g.rotate(-.28); g.beginPath(); g.ellipse(0, 0, 330, 62, 0, back ? Math.PI : 0, back ? Math.PI * 2 : Math.PI); g.lineWidth = 18; g.strokeStyle = 'rgba(214,196,168,.85)'; g.stroke(); g.lineWidth = 6; g.strokeStyle = 'rgba(140,122,106,.9)'; g.stroke(); g.restore(); };
        ring(true);
        const gr = g.createRadialGradient(cx - 60, cy - 70, 20, cx, cy, R); gr.addColorStop(0, '#f8d8a0'); gr.addColorStop(.6, '#d08858'); gr.addColorStop(1, '#5a2e28');
        g.save(); g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.fillStyle = gr; g.fill(); g.clip();
        for (let i = -6; i < 7; i++) { g.fillStyle = i % 2 ? 'rgba(120,60,40,.18)' : 'rgba(255,230,190,.12)'; g.fillRect(cx - R, cy + i * 26 + Math.sin(i) * 6, R * 2, 14); }
        g.restore(); ring(false);
      });
      const body = artWorld(-590, -8, 1180, 300, (g, w) => {
        const tier = (y, h, inset) => { const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, '#3a4078'); gr.addColorStop(1, '#1a1d40'); g.fillStyle = gr; g.fillRect(inset, y, w - inset * 2, h); g.fillStyle = 'rgba(111,247,255,.8)'; g.fillRect(inset, y, w - inset * 2, 2); };
        for (let k = 0; k < 6; k++) tier(8 + k * 45, 45, 30 + k * 85);
        g.shadowColor = '#6ff7ff'; g.shadowBlur = 18; g.fillStyle = '#aefcff'; g.fillRect(30, 6, w - 60, 4); g.shadowBlur = 0;
        g.strokeStyle = 'rgba(111,247,255,.35)'; g.lineWidth = 2; for (let x = 60; x < w - 60; x += 70) { g.beginPath(); g.moveTo(x, 20); g.lineTo(x + 30, 50); g.stroke(); }
        glow(g, w / 2, 260, 60, 'rgba(111,247,255,.9)'); disc(g, w / 2, 260, 12, '#ffffff');
      });
      return { sky, planet, body };
    },
    drawBg(ctx, A, cam) {
      layer(ctx, A.sky, cam, 0);
      layer(ctx, A.planet, cam, .06, -60, 280);
      for (let i = 0; i < 30; i++) { ctx.globalAlpha = (Math.sin(T * .05 + i * 1.7) + 1) / 2; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc((i * 211) % W, (i * 97) % H, 1.8, 0, 7); ctx.fill(); }
      ctx.globalAlpha = 1;
    },
    drawStage(ctx, A) {
      drawWorldArt(ctx, A.body);
      ctx.globalAlpha = .4 + Math.sin(T * .08) * .2; ctx.fillStyle = '#6ff7ff'; ctx.fillRect(-560, -3, 1120, 3); ctx.globalAlpha = 1;
    },
  },
];
