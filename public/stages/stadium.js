// stage: stadium — GRAND STADIUM: a packed night stadium under floodlights. Competitive flat stage (no platforms).
// layer placement (same maths as layer()): returns screen centre + zoom of a parallax layer
function stad_at(cam, k, oy) { const zk = 1 + (cam.z - 1) * k; return [W / 2 - cam.x * k * zk, H / 2 + (oy - (cam.y + 150) * k) * zk, zk]; }
const stad_hash = n => { const s = Math.sin(n * 12.9898) * 43758.5453; return s - Math.floor(s); };
const STAD_CYC = 1080, STAD_GOAL = 840; // every 18 s: "GOAL!" on the jumbotron + confetti for 4 s

// the stands: two tiers of crowd following the bowl's curve; cheer = arms up for a share of the crowd
function stad_stands(cheer) {
  return artLayer(2800, 800, (g, w) => {
    const cx = w / 2, bow = x => -95 * ((x - cx) / 1000) ** 2; // bowl curve: edges rise
    // back wall / roof shadow
    vgrad(g, 0, 60, w, 740, ['#070b1a', '#0a1024', '#0c1430']);
    const crowd = (y0, rows, seed, dim) => {
      const r = rng(seed), team = ['#d8283c', '#e8e8f0', '#2a5ad8', '#f0c020', '#d8283c', '#2a5ad8'];
      for (let row = 0; row < rows; row++) {
        const y = y0 + row * 9, lit = .55 + .45 * (row / rows);
        g.fillStyle = `rgba(20,26,50,${1 - lit * .3})`; g.fillRect(0, y + 4, w, 5); // seat row
        for (let x = 3 + (row % 2) * 3; x < w; x += 6 + r() * 1.5) {
          const yy = y + bow(x), c = r() < .78 ? team[((x / 260 | 0) + (r() < .2 ? 1 : 0)) % team.length] : ['#8a3ac8', '#30b060', '#ff8a30'][r() * 3 | 0];
          const up = r() < .3, bob = cheer && up ? -1.6 : 0;
          if (r() < .06) continue; // empty seat
          g.globalAlpha = dim * lit;
          g.fillStyle = c; g.fillRect(x - 2.2, yy + bob, 4.4, 5.5);
          disc(g, x, yy - 1.8 + bob, 1.9, ['#f0c8a0', '#c89060', '#8a5a38', '#5a3a26'][r() * 4 | 0]);
          if (cheer && up) { g.fillStyle = c; g.fillRect(x - 3.4, yy - 7 + bob, 1.3, 5); g.fillRect(x + 2.1, yy - 7 + bob, 1.3, 5); }
        }
      }
      g.globalAlpha = 1;
    };
    // roof rim with underside lights
    g.fillStyle = '#04060e'; g.beginPath(); g.moveTo(0, 0); g.lineTo(w, 0);
    for (let x = w; x >= 0; x -= 20) g.lineTo(x, 118 + bow(x) * 1.2); g.closePath(); g.fill();
    for (let x = 10; x < w; x += 34) disc(g, x, 116 + bow(x) * 1.2, 1.6, 'rgba(255,240,210,.8)');
    crowd(140, 22, 7, .42);
    // suite level: glass boxes + LED ribbon
    for (let x = 0; x < w; x += 8) { const y = 342 + bow(x); g.fillStyle = '#0a0e1c'; g.fillRect(x, y, 8, 40); }
    const r = rng(3);
    for (let x = 6; x < w; x += 46) { const y = 350 + bow(x); g.fillStyle = r() < .7 ? 'rgba(255,200,130,.35)' : 'rgba(140,180,255,.25)'; g.fillRect(x, y, 38, 14); }
    for (let x = 0; x < w; x += 4) { const y = 372 + bow(x); g.fillStyle = (x / 120 | 0) % 2 ? '#ff3a4a' : '#3ac8ff'; g.fillRect(x, y, 4, 4); }
    crowd(386, 24, 11, .5);
    // pitch-side ad boards
    for (let x = 0; x < w; x += 150) { const y = 604 + bow(x) * .5; roundRect(g, x + 2, y, 146, 22, 2, ['#0c3a8a', '#c01a2a', '#0a0a14', '#e0a010'][(x / 150 | 0) % 4]); g.fillStyle = 'rgba(255,255,255,.55)'; g.fillRect(x + 20, y + 9, 60 + (x * 7 % 50), 4); }
    // pitch beyond, lit by floodlights
    vgrad(g, 0, 628, w, 172, ['#1f5a2a', '#17461f', '#0c2a14']);
    for (let i = 0; i < 7; i++) { g.fillStyle = i % 2 ? 'rgba(255,255,255,.035)' : 'rgba(0,0,0,.06)'; g.fillRect(0, 628 + i * i * 4, w, (i + 1) * 5); }
    // light towers + bloom + beams
    for (const tx of [840, 1960]) {
      g.fillStyle = '#0a0d18'; g.fillRect(tx - 5, 60, 10, 400);
      g.strokeStyle = '#141a2c'; g.lineWidth = 1.5; for (let y = 70; y < 420; y += 26) { g.beginPath(); g.moveTo(tx - 5, y); g.lineTo(tx + 5, y + 26); g.moveTo(tx + 5, y); g.lineTo(tx - 5, y + 26); g.stroke(); }
      roundRect(g, tx - 58, 18, 116, 50, 3, '#11162a', '#2a3350', 2);
      g.globalCompositeOperation = 'lighter';
      const bg = g.createLinearGradient(0, 60, 0, 700); bg.addColorStop(0, 'rgba(210,225,255,.13)'); bg.addColorStop(1, 'rgba(210,225,255,0)');
      g.fillStyle = bg; g.beginPath(); g.moveTo(tx - 50, 60); g.lineTo(tx + 50, 60); g.lineTo(tx + (tx < cx ? 520 : 120), 760); g.lineTo(tx - (tx < cx ? 120 : 520), 760); g.closePath(); g.fill();
      glow(g, tx, 42, 260, 'rgba(170,200,255,.55)'); glow(g, tx, 42, 110, 'rgba(235,242,255,.9)');
      for (let i = 0; i < 6; i++) for (let j = 0; j < 2; j++) disc(g, tx - 45 + i * 18, 32 + j * 20, 6.5, '#ffffff');
      g.globalCompositeOperation = 'source-over';
    }
    // atmospheric haze over the stands so they sit back behind the fighters
    const hz = g.createLinearGradient(0, 120, 0, 640); hz.addColorStop(0, 'rgba(30,46,90,.35)'); hz.addColorStop(.6, 'rgba(12,18,44,.4)'); hz.addColorStop(1, 'rgba(6,10,26,.5)'); g.fillStyle = hz; g.fillRect(0, 120, w, 520);
  });
}

STAGES.push({
  id: 'stadium', name: 'GRAND STADIUM',
  main: { x1: -560, x2: 560, y: 0, depth: 90 },
  plats: [],
  blast: { l: -1200, r: 1200, t: -900, b: 620 }, spawn: [-260, 260],
  build() {
    const sky = artLayer(1400, 800, (g, w, h) => {
      vgrad(g, 0, 0, w, h, ['#010207', '#040a1e', '#0a1634', '#15244c']);
      starfield(g, w, h * .3, 50, 41, ['#8a98c8', '#ffffff']);
      glow(g, 250, 120, 380, 'rgba(90,120,200,.25)'); glow(g, 1150, 120, 380, 'rgba(90,120,200,.25)');
    });
    const standsA = stad_stands(false), standsB = stad_stands(true);
    const jumbo = artLayer(440, 250, (g) => {
      g.strokeStyle = '#1a2036'; g.lineWidth = 3; g.beginPath(); g.moveTo(90, 0); g.lineTo(120, 30); g.moveTo(350, 0); g.lineTo(320, 30); g.stroke();
      roundRect(g, 14, 26, 412, 210, 10, '#10141f', '#2c3450', 4);
      g.fillStyle = '#05080f'; g.fillRect(30, 40, 380, 164);
      for (let x = 34; x < 410; x += 14) disc(g, x, 220, 2.2, x % 28 ? '#ff3a4a' : '#3ac8ff');
      g.fillStyle = '#2c3450'; g.fillRect(170, 236, 100, 12);
    });
    const body = artWorld(-590, -14, 1180, 300, (g, w) => {
      // concrete bowl underside, stepping inward like an upside-down grandstand
      for (let k = 0; k < 6; k++) {
        const y = 58 + k * 36, ins = 34 + k * 78, gr = g.createLinearGradient(0, y, 0, y + 36);
        gr.addColorStop(0, '#3a4258'); gr.addColorStop(1, '#1c2032');
        g.fillStyle = gr; g.fillRect(ins, y, w - ins * 2, 36);
        g.fillStyle = k % 2 ? '#1f4aa8' : '#b01e30'; for (let x = ins + 8; x < w - ins - 8; x += 9) g.fillRect(x, y + 6, 6, 5); // seats
        g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(ins, y, w - ins * 2, 2);
      }
      glow(g, w / 2, 262, 90, 'rgba(255,240,200,.8)'); disc(g, w / 2, 262, 14, '#fffbe8');
      // LED ad-board band (text scrolls live)
      roundRect(g, 26, 28, w - 52, 32, 3, '#06080e', '#2a3148', 3);
      // pitch: mowed stripes
      const gr = g.createLinearGradient(0, 8, 0, 30); gr.addColorStop(0, '#5ed24a'); gr.addColorStop(1, '#2a7a26');
      g.fillStyle = gr; g.fillRect(24, 10, w - 48, 20);
      for (let x = 24; x < w - 24; x += 70) { g.fillStyle = (x / 70 | 0) % 2 ? 'rgba(255,255,255,.1)' : 'rgba(0,40,0,.12)'; g.fillRect(x, 10, 70, 20); }
      g.fillStyle = '#b8f59a'; g.fillRect(24, 10, w - 48, 3);
      g.fillStyle = '#f4fff0'; g.fillRect(28, 13, 5, 16); g.fillRect(w - 33, 13, 5, 16); g.fillRect(w / 2 - 2.5, 13, 5, 16); // touchlines + halfway line
      g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(24, 28, w - 48, 2);
    });
    return { sky, standsA, standsB, jumbo, body };
  },
  drawBg(ctx, A, cam) {
    layer(ctx, A.sky, cam, 0);
    const k = .12, oy = -10, cheer = (T >> 4) % 2 && T % STAD_CYC > STAD_GOAL - 60;
    layer(ctx, cheer || (T >> 5) % 4 === 0 ? A.standsB : A.standsA, cam, k, oy);
    // camera flashes in the crowd
    const [sx, sy, sz] = stad_at(cam, k, oy);
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 14; i++) {
      const h = stad_hash((T >> 2) * 7 + i * 131); if (h > .3) continue;
      const lx = (stad_hash(i * 17 + (T >> 2)) - .5) * 1500, ly = -230 + stad_hash(i * 29 + (T >> 3)) * 420;
      ctx.globalAlpha = .25; ctx.beginPath(); ctx.arc(sx + lx * sz, sy + ly * sz, 6, 0, 7); ctx.fill();
      ctx.globalAlpha = .95; ctx.beginPath(); ctx.arc(sx + lx * sz, sy + ly * sz, 1.8, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;
    // jumbotron
    const jk = .1, joy = -245, [jx, jy, jz] = stad_at(cam, jk, joy);
    layer(ctx, A.jumbo, cam, jk, joy);
    ctx.save(); ctx.translate(jx, jy); ctx.scale(jz, jz);
    ctx.beginPath(); ctx.rect(-190, -85, 380, 164); ctx.clip();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const t = T % STAD_CYC;
    if (t > STAD_GOAL) {
      const on = (T >> 3) % 2;
      ctx.fillStyle = on ? '#c01a2a' : '#0c3a8a'; ctx.fillRect(-190, -85, 380, 164);
      ctx.font = `56px ${FONT}`; ctx.shadowColor = '#ffe03b'; ctx.shadowBlur = 20; ctx.fillStyle = on ? '#fff6c0' : '#ffe03b';
      ctx.fillText('GOAL!', 0, -2 + Math.sin(T * .3) * 4);
    } else {
      ctx.font = `44px ${FONT}`; ctx.shadowBlur = 16;
      ctx.shadowColor = '#ff3a4a'; ctx.fillStyle = '#ff6a78'; ctx.fillText('P1', -110, -14);
      ctx.shadowColor = '#3ac8ff'; ctx.fillStyle = '#7ad8ff'; ctx.fillText('P2', 110, -14);
      ctx.shadowBlur = 0; ctx.font = `24px ${FONT}`; ctx.fillStyle = '#ffe03b'; ctx.fillText('VS', 0, -14);
      ctx.font = `13px ${FONT}`; ctx.fillStyle = '#9aa8d0'; ctx.fillText('GRAND STADIUM', 0, 50);
    }
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(0,0,0,.25)'; for (let y = -85; y < 79; y += 4) ctx.fillRect(-190, y, 380, 1.5); // scanlines
    ctx.restore();
  },
  drawStage(ctx, A) {
    drawWorldArt(ctx, A.body);
    // scrolling LED ad board
    ctx.save(); ctx.beginPath(); ctx.rect(-558, 17, 1116, 26); ctx.clip();
    ctx.font = `16px ${FONT}`; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    const msg = 'SUPER PIXEL SMASH  *  GRAND STADIUM  *  ', mw = 760, off = (T * 1.5) % mw;
    for (let i = -1; i < 3; i++) { ctx.fillStyle = i % 2 ? '#ffe03b' : '#7ad8ff'; ctx.fillText(msg, -560 - off + i * mw, 31); }
    ctx.restore();
  },
  drawFront(ctx) {
    const t = T % STAD_CYC - STAD_GOAL; if (t < 0) return;
    const cols = ['#ff3a4a', '#ffe03b', '#3ac8ff', '#ffffff', '#5ed24a', '#ff8ae0'];
    for (let i = 0; i < 90; i++) {
      const y = t * (1.6 + (i % 5) * .35) - (i * 37 % 260) - 20; if (y < -10 || y > H) continue;
      const x = (i * 97 % W) + Math.sin(T * .04 + i) * 30, f = Math.sin(T * .15 + i);
      ctx.globalAlpha = Math.min(1, (240 - t) / 40); ctx.fillStyle = cols[i % 6]; ctx.fillRect(x, y, 7 * Math.abs(f) + 1, 5);
    }
    ctx.globalAlpha = 1;
  },
});
