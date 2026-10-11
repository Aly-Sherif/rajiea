// Little effects: synthesized sounds (no audio files), confetti, cursor sparkles.

// ── Sound ──
let ctx = null;
let muted = localStorage.getItem('rajiea-muted') === '1';
const audio = () => {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
};

function tone({ freq = 440, to = null, dur = 0.15, type = 'sine', vol = 0.18, delay = 0 }) {
  if (muted) return;
  const a = audio();
  if (!a) return;
  const t0 = a.currentTime + delay;
  const osc = a.createOscillator();
  const gain = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (to) osc.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(a.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

export const sfx = {
  get muted() { return muted; },
  toggle() {
    muted = !muted;
    localStorage.setItem('rajiea-muted', muted ? '1' : '0');
    if (!muted) sfx.click();
    return muted;
  },
  click: () => tone({ freq: 660, to: 880, dur: 0.07, type: 'triangle', vol: 0.12 }),
  pop: () => tone({ freq: 520, to: 1250, dur: 0.12, type: 'sine', vol: 0.2 }),
  zap: () => { tone({ freq: 900, to: 200, dur: 0.16, type: 'square', vol: 0.07 }); tone({ freq: 1400, to: 2400, dur: 0.08, vol: 0.1, delay: 0.03 }); },
  ding: () => { tone({ freq: 880, dur: 0.18, type: 'triangle' }); tone({ freq: 1320, dur: 0.3, type: 'triangle', delay: 0.09 }); },
  buzz: () => tone({ freq: 190, to: 120, dur: 0.22, type: 'sawtooth', vol: 0.06 }),
  tada: () => [523, 659, 784, 1047].forEach((f, i) => tone({ freq: f, dur: 0.32, type: 'triangle', vol: 0.15, delay: i * 0.09 })),
  boop: () => tone({ freq: 300, to: 520, dur: 0.1, type: 'sine', vol: 0.16 }),
  giggle: () => [880, 1046, 932, 1175, 1046].forEach((f, i) => tone({ freq: f, to: f * 1.15, dur: 0.07, type: 'sine', vol: 0.13, delay: i * 0.075 })),
  key: () => tone({ freq: 520, dur: 0.05, type: 'triangle', vol: 0.08 }),
  shutter: () => { tone({ freq: 2400, to: 900, dur: 0.04, type: 'square', vol: 0.06 }); tone({ freq: 1600, to: 500, dur: 0.06, type: 'square', vol: 0.05, delay: 0.07 }); },
  whoosh: () => tone({ freq: 300, to: 1400, dur: 0.35, type: 'sine', vol: 0.1 }),
  chirp: () => { tone({ freq: 1400, to: 500, dur: 0.12, type: 'sine', vol: 0.18 }); tone({ freq: 900, to: 1800, dur: 0.06, type: 'sine', vol: 0.12, delay: 0.1 }); },
  party: () => {
    const notes = [523, 659, 784, 659, 880, 784, 659, 523, 587, 740, 880, 740, 988, 880, 740, 587];
    notes.forEach((f, i) => { tone({ freq: f, dur: 0.16, type: 'triangle', vol: 0.12, delay: i * 0.2 }); if (i % 2 === 0) tone({ freq: 110, to: 60, dur: 0.12, type: 'sine', vol: 0.22, delay: i * 0.2 }); });
  },
};

// ── Confetti ──
const canvas = document.getElementById('fx');
const g = canvas?.getContext('2d');
let pieces = [];
let rafId = 0;
const COLORS = ['#ff3d8b', '#ff9cc4', '#f6e7d6', '#9a6b4d', '#ffffff', '#e4b35e', '#5b3a26'];

function sizeCanvas() {
  if (!canvas) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = innerWidth * dpr;
  canvas.height = innerHeight * dpr;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
}
addEventListener('resize', sizeCanvas);
sizeCanvas();

function heart(x, y, s) {
  g.beginPath();
  g.moveTo(x, y + s * 0.3);
  g.bezierCurveTo(x, y, x - s * 0.5, y, x - s * 0.5, y + s * 0.3);
  g.bezierCurveTo(x - s * 0.5, y + s * 0.6, x, y + s * 0.8, x, y + s);
  g.bezierCurveTo(x, y + s * 0.8, x + s * 0.5, y + s * 0.6, x + s * 0.5, y + s * 0.3);
  g.bezierCurveTo(x + s * 0.5, y, x, y, x, y + s * 0.3);
  g.fill();
}

function tick() {
  g.clearRect(0, 0, innerWidth, innerHeight);
  pieces = pieces.filter((p) => p.life > 0 && p.y < innerHeight + 40);
  for (const p of pieces) {
    p.vy += 0.16;
    p.vx *= 0.99;
    p.x += p.vx;
    p.y += p.vy;
    p.rot += p.vr;
    p.life -= 1;
    g.save();
    g.globalAlpha = Math.min(1, p.life / 40);
    g.fillStyle = p.color;
    g.translate(p.x, p.y);
    g.rotate(p.rot);
    if (p.shape === 'emoji') { g.font = `${p.size * 2}px serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(p.text, 0, 0); }
    else if (p.shape === 'heart') heart(0, -p.size / 2, p.size);
    else if (p.shape === 'dot') { g.beginPath(); g.arc(0, 0, p.size / 2.4, 0, Math.PI * 2); g.fill(); }
    else g.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
    g.restore();
  }
  rafId = pieces.length ? requestAnimationFrame(tick) : 0;
}

export function confetti({ x = innerWidth / 2, y = innerHeight / 2, count = 120, spread = 1, emoji = null, colors = null } = {}) {
  if (!g || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const v = (3 + Math.random() * 7) * spread;
    pieces.push({
      x, y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v - 6,
      rot: Math.random() * 6,
      vr: (Math.random() - 0.5) * 0.3,
      size: 7 + Math.random() * 8,
      color: (colors || COLORS)[(Math.random() * (colors || COLORS).length) | 0],
      shape: emoji ? 'emoji' : Math.random() < 0.22 ? 'heart' : Math.random() < 0.5 ? 'dot' : 'rect',
      text: emoji ? emoji[(Math.random() * emoji.length) | 0] : '',
      life: 140 + Math.random() * 60,
    });
  }
  if (!rafId) rafId = requestAnimationFrame(tick);
}

export function confettiFrom(el, opts) {
  const r = el.getBoundingClientRect();
  confetti({ x: r.left + r.width / 2, y: r.top + r.height / 2, ...opts });
}

// ── Sparkle trail for mouse users ──
export function sparkleTrail() {
  if (!matchMedia('(pointer: fine)').matches || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  let last = 0;
  let live = 0;
  addEventListener('pointermove', (e) => {
    const now = performance.now();
    if (now - last < 70 || live > 12) return;
    last = now;
    const s = document.createElement('span');
    s.className = 'sparkle';
    s.style.left = e.clientX + 'px';
    s.style.top = e.clientY + 'px';
    s.style.setProperty('--c', COLORS[(Math.random() * 3) | 0]);
    s.style.setProperty('--s', (6 + Math.random() * 8).toFixed(1) + 'px');
    s.style.setProperty('--dx', ((Math.random() - 0.5) * 30).toFixed(0) + 'px');
    document.body.appendChild(s);
    live++;
    s.addEventListener('animationend', () => { s.remove(); live--; });
  }, { passive: true });
}

// ── Soft music loop for the story (its own switch, separate from sound effects) ──
export function startMusic() {
  const a = audio();
  if (!a) return { stop() {} };
  const out = a.createGain();
  out.gain.value = 0.0001;
  out.gain.exponentialRampToValueAtTime(0.9, a.currentTime + 1.2);
  out.connect(a.destination);
  const chords = [[261.6, 329.6, 392, 493.9], [220, 261.6, 329.6, 392], [174.6, 220, 261.6, 329.6], [196, 246.9, 293.7, 392]];
  let step = 0;
  const note = (f, t, len, vol, type = 'triangle') => {
    const o = a.createOscillator(), g = a.createGain();
    o.type = type;
    o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + len + 0.05);
  };
  const tick = () => {
    const t = a.currentTime + 0.05;
    const chord = chords[Math.floor(step / 8) % chords.length];
    const order = [0, 1, 2, 3, 2, 1, 2, 3];
    note(chord[order[step % 8]] * 2, t, 0.9, 0.035);
    if (step % 8 === 0) note(chord[0] / 2, t, 2.4, 0.05, 'sine');
    step++;
  };
  tick();
  const id = setInterval(tick, 330);
  return {
    stop() {
      clearInterval(id);
      out.gain.cancelScheduledValues(a.currentTime);
      out.gain.setValueAtTime(Math.max(out.gain.value, 0.0001), a.currentTime);
      out.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + 0.6);
      setTimeout(() => out.disconnect(), 800);
    },
  };
}
