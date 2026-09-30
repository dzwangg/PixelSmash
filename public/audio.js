// Tiny WebAudio synth: every sound effect is generated, no audio files.
const SFX = {
  ac: null, noiseBuf: null,
  unlock() {
    if (this.ac) return this.ac.resume();
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    this.ac = new AC(); this.master = this.ac.createGain(); this.master.gain.value = 0.35; this.master.connect(this.ac.destination);
    const len = this.ac.sampleRate; this.noiseBuf = this.ac.createBuffer(1, len, len);
    const d = this.noiseBuf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  },
  tone(type, f0, f1, dur, vol = .3, delay = 0) {
    const ac = this.ac; if (!ac) return; const t = ac.currentTime + delay;
    const o = ac.createOscillator(), g = ac.createGain(); o.type = type;
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(this.master); o.start(t); o.stop(t + dur);
  },
  noise(dur, vol, ftype, freq, freq1 = freq, delay = 0) {
    const ac = this.ac; if (!ac) return; const t = ac.currentTime + delay;
    const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = this.noiseBuf; f.type = ftype; f.frequency.setValueAtTime(freq, t); f.frequency.exponentialRampToValueAtTime(freq1, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f).connect(g).connect(this.master); s.start(t, Math.random() * .5); s.stop(t + dur);
  },
  play(name, k = 1) {
    if (!this.ac) return;
    switch (name) {
      case 'hit': this.noise(.12 + k * .1, .4 + k * .3, 'lowpass', 3000, 300); this.tone('square', 180 + 60 / k, 50, .1 + k * .1, .25); break;
      case 'swing': this.noise(.12, .12, 'bandpass', 1200 + k * 800, 3000); break;
      case 'jump': this.tone('square', 240, 520, .12, .08); break;
      case 'djump': this.tone('square', 360, 760, .14, .08); break;
      case 'land': this.noise(.06, .12, 'lowpass', 500); break;
      case 'shield': this.tone('triangle', 900, 700, .12, .2); break;
      case 'break': this.tone('sawtooth', 600, 60, .6, .25); this.noise(.4, .3, 'highpass', 2000); break;
      case 'ko': this.noise(1.2, .7, 'lowpass', 1200, 60); this.tone('sine', 120, 30, 1, .6); this.tone('square', 900, 200, .4, .08, .05); break;
      case 'fire': this.noise(.3, .25, 'bandpass', 600, 2400); this.tone('sawtooth', 200, 90, .25, .08); break;
      case 'zap': for (let i = 0; i < 3; i++) this.tone('sawtooth', 1400 - i * 300, 300, .06, .1, i * .04); break;
      case 'ice': this.tone('sine', 2000, 3200, .15, .12); this.tone('triangle', 1500, 2600, .2, .08, .05); break;
      case 'rock': this.noise(.35, .5, 'lowpass', 700, 80); this.tone('sine', 90, 40, .3, .4); break;
      case 'shadow': this.tone('sine', 300, 120, .35, .2); this.tone('sine', 310, 125, .35, .2); break;
      case 'laser': this.tone('square', 1800 * k, 200, .25, .1); break;
      case 'boom': this.noise(.6, .6, 'lowpass', 2000, 60); this.tone('sine', 100, 30, .5, .5); break;
      case 'grab': this.tone('square', 300, 200, .06, .12); break;
      case 'throw': this.noise(.2, .2, 'bandpass', 800, 200); break;
      case 'charge': this.tone('sine', 200 + k * 600, 210 + k * 600, .05, .05); break;
      case 'counter': this.tone('square', 1200, 2400, .08, .15); this.tone('square', 1800, 3600, .12, .12, .07); break;
      case 'select': this.tone('square', 660, 660, .05, .1); break;
      case 'confirm': this.tone('square', 520, 520, .07, .12); this.tone('square', 780, 780, .12, .12, .07); break;
      case 'back': this.tone('square', 400, 250, .1, .1); break;
      case 'beep': this.tone('square', 440, 440, .15, .15); break;
      case 'go': this.tone('square', 880, 880, .4, .15); this.tone('square', 1320, 1320, .4, .08); break;
      case 'game': this.tone('sawtooth', 220, 110, 1.2, .2); this.noise(1, .4, 'lowpass', 800, 100); break;
    }
  },
};
addEventListener('keydown', () => SFX.unlock());
addEventListener('pointerdown', () => SFX.unlock());
