// Serves the game screen (/) and phone controller (/pad.html), relays pad input to screens.
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { WebSocketServer } = require('ws');
const QRCode = require('qrcode');

const PORT = process.env.PORT || 3000;
// looked up on every use, so switching Wi-Fi (or to a phone hotspot) doesn't leave a stale QR code
const padUrl = () => `http://${Object.values(os.networkInterfaces()).flat()
  .find(i => i.family === 'IPv4' && !i.internal)?.address || 'localhost'}:${PORT}/pad.html`;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript' };

const server = http.createServer((req, res) => {
  if (req.url === '/qr.svg') { // QR code of the phone controller link
    return QRCode.toString(padUrl(), { type: 'svg', margin: 2 }, (err, svg) => {
      res.writeHead(err ? 500 : 200, { 'Content-Type': 'image/svg+xml' }); res.end(svg || '');
    });
  }
  const pub = path.join(__dirname, 'public');
  const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html';
  const file = path.join(pub, rel), name = file;
  if (!file.startsWith(pub + path.sep)) { res.writeHead(403); return res.end(); } // stay inside public/
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(name)] || 'text/plain' });
    res.end(data);
  });
});

const wss = new WebSocketServer({ server });
const screens = new Set();
const pads = [null, null]; // ponytail: 2 slots, bump the array for 4-player

const toScreens = msg => { const s = JSON.stringify(msg); screens.forEach(ws => ws.send(s)); };
const padStatus = () => toScreens({ type: 'pads', connected: pads.map(Boolean), padUrl: padUrl() });

wss.on('connection', (ws, req) => {
  req.socket.setNoDelay(true); // send every input packet immediately
  ws.alive = true; ws.on('pong', () => { ws.alive = true; });
  if (req.url.includes('role=screen')) {
    screens.add(ws);
    padStatus();
    // screen -> pad messages (character color, rumble)
    ws.on('message', data => {
      try { const m = JSON.parse(data); pads[m.slot]?.send(JSON.stringify(m)); } catch {}
    });
    ws.on('close', () => screens.delete(ws));
    return;
  }
  // Each phone sends a remembered id: if it reconnects (sleep, reload, Wi-Fi switch) it takes back
  // its own slot instead of holding a second one.
  const id = new URL(req.url, 'http://x').searchParams.get('id') || null;
  let slot = id ? pads.findIndex(p => p && p.padId === id) : -1;
  if (slot >= 0) { const old = pads[slot]; pads[slot] = null; old.send(JSON.stringify({ type: 'replaced' })); old.terminate(); }
  else slot = pads.indexOf(null);
  if (slot === -1) { ws.send(JSON.stringify({ type: 'full' })); return ws.close(); }
  ws.padId = id; pads[slot] = ws;
  ws.send(JSON.stringify({ type: 'slot', slot }));
  padStatus();
  ws.on('message', data => {
    try { toScreens({ type: 'input', slot, input: JSON.parse(data) }); } catch {}
  });
  ws.on('close', () => { if (pads[slot] === ws) { pads[slot] = null; padStatus(); } }); // a replaced socket must not free the new one
});

// Heartbeat: connections that stop answering pings (phone asleep, network dropped) are dropped within ~10s,
// so a vanished phone can never keep a player slot.
setInterval(() => {
  for (const ws of wss.clients) { if (!ws.alive) { ws.terminate(); continue; } ws.alive = false; ws.ping(); }
}, 5000);

server.listen(PORT, () => {
  console.log(`Game screen:  http://localhost:${PORT}`);
  console.log(`Phones open:  ${padUrl()}  (same Wi-Fi)`);
});
