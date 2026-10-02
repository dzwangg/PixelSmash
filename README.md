# Super Pixel Smash

A 2-player pixel platform fighter in the browser. 41 fighters, 10 stages, Smash Balls and a Final Smash for everyone. Play on one keyboard, or scan the QR code on the select screen to use your phone as a controller.

## Run

```sh
npm install
npm start        # http://localhost:3000
```

Phones on the same Wi-Fi join by scanning the QR code; `/pad.html` is the phone controller.

## Controls

|            | Move | Attack | Special | Jump  | Shield | Pause |
|------------|------|--------|---------|-------|--------|-------|
| **P1**     | WASD | F      | G       | Space | H      | Esc/P |
| **P2**     | Arrows | K    | L       | I     | O      | Esc   |

Press `Q` to toggle high/fast graphics quality. Playing solo, a CPU joins automatically — pick its fighter for it.

## Test

```sh
npm test                 # headless CPU-vs-CPU on every fighter + rule checks
ONLY=inky,gojo npm test  # just these fighters
```

## Layout

- `server.js` — static server + WebSocket relay for phone pads
- `public/game.js` — engine: physics, combat, CPU, menus
- `public/chars.js`, `roster2.js`, `roster3.js` — fighter definitions
- `public/kits/` — per-fighter special move kits
- `public/final.js` — Smash Ball and Final Smashes
- `public/stages*.js` — stages
