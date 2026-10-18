// Smile studio: scrub the plaque off with your finger, floss the gaps, then polish every tooth until it twinkles.
import { capture } from '../touch.js';
const LW = 400, LH = 300;
const topY = (x) => 100 - 14 * Math.sin(Math.PI * (x - 40) / 320);
const botY = (x) => 100 + 140 * Math.sin(Math.PI * (x - 40) / 320);
const slope = (f, x) => Math.atan2(f(x + 1) - f(x - 1), 2);
const UPPER = [[94, 36, 46], [132, 40, 54], [176, 48, 64], [224, 48, 64], [268, 40, 54], [306, 36, 46]];
const LOWER = [[120, 29, 34], [151, 30, 38], [183, 31, 40], [217, 31, 40], [249, 30, 38], [280, 29, 34]];

function teeth() {
  const list = [];
  UPPER.forEach(([cx, w, h]) => { const y = topY(cx) + 6; list.push({ x: cx - w / 2, y, w, h, up: true, cx, cy: y + h / 2, a: slope(topY, cx) * 0.6 }); });
  LOWER.forEach(([cx, w, h]) => { const yb = botY(cx) - 12; const a = slope(botY, cx) * 0.45; list.push({ x: cx - w / 2, y: yb - h, w, h, up: false, cx: cx + Math.sin(a) * h / 2, cy: yb - Math.cos(a) * h / 2, a }); });
  return list;
}
// a rounded tooth, turned to follow the smile; fresh=false adds it to the current path
function toothPath(g, T, pad = 0, fresh = true) {
  const w = T.w + pad * 2, h = T.h + pad * 2;
  const r1 = T.up ? 6 : 12, r2 = T.up ? 14 : 6;
  if (fresh) g.beginPath();
  g.save();
  g.translate(T.cx, T.cy);
  g.rotate(T.a);
  const X = -w / 2, Y = -h / 2;
  g.moveTo(X + r1, Y);
  g.lineTo(X + w - r1, Y); g.quadraticCurveTo(X + w, Y, X + w, Y + r1);
  g.lineTo(X + w, Y + h - r2); g.quadraticCurveTo(X + w, Y + h, X + w - r2, Y + h);
  g.lineTo(X + r2, Y + h); g.quadraticCurveTo(X, Y + h, X, Y + h - r2);
  g.lineTo(X, Y + r1); g.quadraticCurveTo(X, Y, X + r1, Y);
  g.closePath();
  g.restore();
}

export function initSmile(root, { CONFIG, t, esc, sfx, confettiFrom, egg, buzz, onVisible }) {
  const lines = CONFIG.smile?.done || [t('Sparkling ✨', 'Bteles3 ✨')];
  const PH = [
    { id: 'scrub', icon: '🪥', name: t('Scrub', 'Ekshoty'), hint: t('Rub the plaque away — get the little germs too.', 'Emsa7y el plaque — w el garaseem el so8ayara kaman.') },
    { id: 'floss', icon: '🧵', name: t('Floss', 'El khet'), hint: t('Swipe down through each glowing gap.', 'Es7aby le ta7t f kol fara8 menawwar.') },
    { id: 'shine', icon: '✨', name: t('Shine', 'Lamma3y'), hint: t('Polish every tooth until it twinkles.', 'Lamma3y kol sena le7ad ma tles3.') },
  ];
  let best = +(localStorage.getItem('rajiea-smile-best') || 0);
  root.innerHTML = `
    <div class="ss-card">
      <div class="ss-hud">
        <ol class="ss-phases">${PH.map((p, i) => `<li data-p="${i}"><span>${p.icon}</span>${p.name}</li>`).join('')}</ol>
        <div class="ss-meta"><span>⏱ <b class="ss-time">0.0</b>s</span><span>${t('Best', 'A7san')} <b class="ss-best">${best ? best.toFixed(1) + 's' : '—'}</b></span></div>
      </div>
      <div class="ss-bar"><i></i></div>
      <p class="ss-hint" aria-live="polite"></p>
      <div class="ss-stage">
        <canvas class="ss-cv" aria-label="${t('A smile to clean with your finger', 'Ebtesama tnaddafeeha b soba3ek')}" role="img"></canvas>
        <span class="ss-tool" aria-hidden="true"></span>
        <div class="ss-done" hidden></div>
      </div>
      <div class="ss-btns"><button type="button" class="btn btn-glass ss-assist">${t('Help me a bit', 'Sa3edny shwaya')} 🤝</button></div>
    </div>`;
  const cv = root.querySelector('.ss-cv');
  const g = cv.getContext('2d');
  const tool = root.querySelector('.ss-tool');
  const hint = root.querySelector('.ss-hint');
  const bar = root.querySelector('.ss-bar i');
  const timeEl = root.querySelector('.ss-time');
  const bestEl = root.querySelector('.ss-best');
  const doneEl = root.querySelector('.ss-done');
  const phases = [...root.querySelectorAll('.ss-phases li')];
  const plaque = document.createElement('canvas');
  plaque.width = LW * 2; plaque.height = LH * 2;
  const pg = plaque.getContext('2d', { willReadFrequently: true });
  const T = teeth();
  let scale = 1, dpr = 1, P0 = 1, phase = 0, progress = 0, t0 = 0, running = false, finished = false;
  let germs = [], bits = [], foam = [], sparks = [], gaps = [], shine = T.map(() => 0);
  let visible = false, raf = 0, last = 0;

  function size() {
    const w = Math.min(root.querySelector('.ss-stage').clientWidth || 340, 560);
    dpr = Math.min(2, devicePixelRatio || 1);
    scale = w / LW;
    cv.width = Math.round(w * dpr); cv.height = Math.round(w * LH / LW * dpr);
    cv.style.height = `${w * LH / LW}px`;
  }

  function reset() {
    phase = 0; progress = 0; finished = false; running = false; t0 = 0;
    shine = T.map(() => 0); sparks = []; foam = [];
    // plaque: yellowy film over every tooth, drawn at 2x
    pg.setTransform(2, 0, 0, 2, 0, 0);
    pg.clearRect(0, 0, LW, LH);
    pg.save();
    pg.beginPath();
    T.forEach((tt) => toothPath(pg, tt, -1.5, false));
    pg.clip();
    pg.fillStyle = 'rgba(214,178,92,.55)';
    T.forEach((tt) => pg.fillRect(tt.cx - tt.w, tt.cy - tt.h, tt.w * 2, tt.h * 2));
    for (let k = 0; k < 320; k++) {
      const tt = T[k % T.length];
      const x = tt.cx + (Math.random() - 0.5) * tt.w * 1.1, y = tt.cy + (Math.random() - 0.5) * tt.h * 1.1;
      pg.fillStyle = Math.random() < 0.3 ? 'rgba(160,120,50,.55)' : 'rgba(222,190,98,.7)';
      pg.beginPath(); pg.arc(x, y, 3 + Math.random() * 7, 0, Math.PI * 2); pg.fill();
    }
    pg.restore();
    P0 = count();
    germs = Array.from({ length: 5 }, (_, k) => { const tt = T[[1, 3, 4, 7, 10][k]]; return { x: tt.cx + (Math.random() - 0.5) * tt.w * 0.4, y: tt.cy + (Math.random() - 0.5) * tt.h * 0.3, hue: [300, 100, 190, 30, 260][k], alive: true, ph: Math.random() * 6 }; });
    gaps = UPPER.slice(0, -1).map(([cx, w], i) => {
      const nx = UPPER[i + 1][0], nw = UPPER[i + 1][1];
      const x = (cx + w / 2 + nx - nw / 2) / 2;
      const y1 = topY(x) + 10, y2 = y1 + Math.min(UPPER[i][2], UPPER[i + 1][2]) - 6;
      return { x, y1, y2, done: false, prog: 0, anim: 0 };
    });
    bits = gaps.map((gp, i) => ({ x: gp.x, y: gp.y1 + (gp.y2 - gp.y1) * 0.45, c: ['#6aa84f', '#8a5a3b', '#c0392b', '#6aa84f', '#e0a43c'][i], out: 0 }));
    doneEl.hidden = true;
    timeEl.textContent = '0.0';
    setPhase(0);
  }
  function count() {
    const d = pg.getImageData(0, 0, plaque.width, plaque.height).data;
    let n = 0;
    for (let k = 3; k < d.length; k += 4 * 13) if (d[k] > 40) n++;
    return n || 1;
  }
  function setPhase(p) {
    phase = p;
    progress = 0;
    phases.forEach((li, i) => { li.classList.toggle('on', i === p); li.classList.toggle('done', i < p); });
    hint.textContent = PH[p]?.hint || '';
    tool.textContent = PH[p]?.icon || '';
    bar.style.width = '0%';
    root.dataset.phase = PH[p]?.id || 'done';
  }

  // ── drawing ──
  function drawMouth() {
    g.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);
    g.clearRect(0, 0, LW, LH);
    // lips
    const lip = g.createLinearGradient(0, 60, 0, 270);
    lip.addColorStop(0, '#ff7fae'); lip.addColorStop(1, '#e8457f');
    g.fillStyle = lip;
    g.beginPath();
    g.moveTo(14, 100);
    g.bezierCurveTo(70, 38, 150, 42, 200, 60);
    g.bezierCurveTo(250, 42, 330, 38, 386, 100);
    g.bezierCurveTo(340, 330, 60, 330, 14, 100);
    g.fill();
    g.fillStyle = 'rgba(255,255,255,.35)';
    g.beginPath(); g.ellipse(150, 268, 40, 7, -0.08, 0, Math.PI * 2); g.fill();
    // mouth
    g.fillStyle = '#5b1a33';
    g.beginPath();
    g.moveTo(40, 112);
    for (let x = 40; x <= 360; x += 8) g.lineTo(x, topY(x));
    for (let x = 360; x >= 40; x -= 8) g.lineTo(x, botY(x));
    g.closePath();
    g.fill();
    g.save();
    g.clip();
    // gum + tongue
    g.fillStyle = '#ff9fc0';
    g.beginPath();
    for (let x = 36; x <= 364; x += 8) g.lineTo(x, topY(x) - 4);
    for (let x = 364; x >= 36; x -= 8) g.lineTo(x, topY(x) + 18);
    g.fill();
    g.fillStyle = '#ff7a98';
    g.beginPath(); g.ellipse(200, 228, 96, 36, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#ff9fc0';
    g.beginPath();
    for (let x = 36; x <= 364; x += 8) g.lineTo(x, botY(x) + 4);
    for (let x = 364; x >= 36; x -= 8) g.lineTo(x, botY(x) - 18);
    g.fill();
    // teeth
    T.forEach((tt, i) => {
      const s = shine[i];
      const grd = g.createLinearGradient(tt.x, tt.y, tt.x + tt.w, tt.y + tt.h);
      grd.addColorStop(0, '#ffffff'); grd.addColorStop(1, s > 0.99 ? '#f4fbff' : '#efe6dc');
      g.fillStyle = grd;
      toothPath(g, tt);
      g.fill();
      g.fillStyle = `rgba(255,255,255,${0.35 + s * 0.5})`;
      g.beginPath(); g.ellipse(tt.x + tt.w * 0.3, tt.y + tt.h * (tt.up ? 0.38 : 0.55), tt.w * 0.12, tt.h * 0.22, -0.2, 0, Math.PI * 2); g.fill();
      if (s > 0 && s < 1) { g.fillStyle = `rgba(200,235,255,${s * 0.25})`; toothPath(g, tt); g.fill(); }
    });
    g.restore();
  }
  function drawGerm(G, now) {
    const wob = Math.sin(now / 160 + G.ph) * 0.18;
    g.save();
    g.translate(G.x, G.y);
    g.rotate(wob);
    g.fillStyle = `hsl(${G.hue} 60% 62%)`;
    g.strokeStyle = `hsl(${G.hue} 50% 36%)`;
    g.lineWidth = 1.6;
    for (let k = 0; k < 7; k++) { const a = (k / 7) * Math.PI * 2; g.beginPath(); g.arc(Math.cos(a) * 8.5, Math.sin(a) * 8.5, 2.6, 0, Math.PI * 2); g.fill(); g.stroke(); }
    g.beginPath(); g.arc(0, 0, 8, 0, Math.PI * 2); g.fill(); g.stroke();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(-3, -1.5, 2.4, 0, 7); g.arc(3, -1.5, 2.4, 0, 7); g.fill();
    g.fillStyle = '#2a1810'; g.beginPath(); g.arc(-2.6, -1, 1.2, 0, 7); g.arc(3.4, -1, 1.2, 0, 7); g.fill();
    g.strokeStyle = '#2a1810'; g.lineWidth = 1.3; g.beginPath(); g.arc(0, 2.6, 2.6, 0.2, Math.PI - 0.2); g.stroke();
    g.restore();
  }
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
    last = now;
    drawMouth();
    // plaque over the teeth
    if (phase === 0) { g.save(); g.setTransform(dpr * scale / 2, 0, 0, dpr * scale / 2, 0, 0); g.drawImage(plaque, 0, 0); g.restore(); }
    g.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);
    // food bits + gap guides
    if (phase <= 1) {
      bits.forEach((b, i) => {
        if (b.out >= 1) return;
        const gp = gaps[i];
        let x = b.x, y = b.y, a = 1;
        if (gp.done) { b.out = Math.min(1, b.out + dt * 2.2); x += b.out * 30 * (i % 2 ? 1 : -1); y -= b.out * 60 - b.out * b.out * 80; a = 1 - b.out; }
        g.globalAlpha = a;
        g.fillStyle = b.c;
        g.beginPath(); g.ellipse(x, y, 4.5, 7, 0.3, 0, Math.PI * 2); g.fill();
        g.globalAlpha = 1;
      });
    }
    if (phase === 1) {
      gaps.forEach((gp) => {
        if (gp.done) {
          if (gp.anim < 1) {
            gp.anim = Math.min(1, gp.anim + dt * 2);
            g.strokeStyle = `rgba(255,255,255,${1 - gp.anim})`;
            g.lineWidth = 2.2;
            g.beginPath(); g.moveTo(gp.x - 26, gp.y1 - 30 + gp.anim * 40); g.lineTo(gp.x, gp.y1 + (gp.y2 - gp.y1) * gp.anim); g.lineTo(gp.x + 26, gp.y1 - 30 + gp.anim * 40); g.stroke();
          }
          return;
        }
        const pulse = 0.45 + 0.35 * Math.sin(now / 260);
        g.strokeStyle = `rgba(255,46,136,${pulse})`;
        g.lineWidth = 3;
        g.setLineDash([5, 5]);
        g.beginPath(); g.moveTo(gp.x, gp.y1 - 14); g.lineTo(gp.x, gp.y2 + 6); g.stroke();
        g.setLineDash([]);
        if (gp.prog > 0) { g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.moveTo(gp.x, gp.y1); g.lineTo(gp.x, gp.y1 + (gp.y2 - gp.y1) * gp.prog); g.stroke(); }
      });
    }
    // germs
    germs.forEach((G) => { if (G.alive) drawGerm(G, now); });
    // foam + sparkles
    foam = foam.filter((f) => (f.age += dt) < f.life);
    foam.forEach((f) => {
      const k = f.age / f.life;
      g.fillStyle = `rgba(255,255,255,${0.85 * (1 - k)})`;
      g.beginPath(); g.arc(f.x + f.vx * f.age, f.y + f.vy * f.age, f.r * (0.6 + k * 0.8), 0, Math.PI * 2); g.fill();
    });
    sparks = sparks.filter((s) => (s.age += dt) < s.life);
    sparks.forEach((s) => star(s.x, s.y, s.r * Math.sin(Math.PI * s.age / s.life), '#fff'));
    if (phase >= 2) T.forEach((tt, i) => { if (shine[i] >= 1) star(tt.cx + tt.w * 0.22, tt.y + (tt.up ? 12 : tt.h - 12), 4 + 2.5 * Math.sin(now / 300 + i), '#fffbe0'); });
    if (running && !finished) timeEl.textContent = ((performance.now() - t0) / 1000).toFixed(1);
    raf = visible ? requestAnimationFrame(frame) : 0;
  }
  function star(x, y, r, c) {
    if (r <= 0) return;
    g.fillStyle = c;
    g.beginPath();
    for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2 - Math.PI / 2; const rr = k % 2 ? r * 0.36 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    g.closePath(); g.fill();
  }
  const start = () => { if (!raf && visible) { last = performance.now(); raf = requestAnimationFrame(frame); } };

  // ── fingers ──
  const toL = (e) => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * LW, y: (e.clientY - r.top) / r.height * LH }; };
  let down = false, prev = null, strokes = 0, flossPath = [];
  const moveTool = (e, show) => {
    const r = root.querySelector('.ss-stage').getBoundingClientRect();
    tool.style.transform = `translate(${e.clientX - r.left}px, ${e.clientY - r.top - (e.pointerType === 'mouse' ? 0 : 34)}px)`;
    tool.classList.toggle('on', show);
  };
  cv.addEventListener('pointerdown', (e) => {
    if (finished) return;
    e.preventDefault();
    capture(cv, e.pointerId);
    down = true; prev = toL(e); flossPath = [prev];
    if (!running) { running = true; t0 = performance.now(); }
    moveTool(e, true);
    act(prev, prev);
  });
  cv.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'mouse' && !down) { moveTool(e, !finished); return; }
    if (!down) return;
    const p = toL(e);
    moveTool(e, true);
    act(prev, p);
    prev = p;
  });
  const up = (e) => {
    if (!down) return;
    down = false;
    if (e.pointerType !== 'mouse') tool.classList.remove('on');
    if (phase === 0) checkScrub(true);
    if (phase === 1) { gaps.forEach((gp) => { if (!gp.done) gp.prog = 0; }); tapFloss(flossPath); }
  };
  cv.addEventListener('pointerup', up);
  cv.addEventListener('pointercancel', up);
  cv.addEventListener('pointerleave', () => { if (!down) tool.classList.remove('on'); });

  function act(a, b) {
    if (phase === 0) scrub(a, b);
    else if (phase === 1) { flossPath.push(b); floss(a, b); }
    else if (phase === 2) polish(a, b);
  }
  function scrub(a, b) {
    pg.save();
    pg.setTransform(2, 0, 0, 2, 0, 0);
    pg.globalCompositeOperation = 'destination-out';
    pg.lineCap = 'round';
    pg.lineWidth = 30;
    pg.beginPath(); pg.moveTo(a.x, a.y); pg.lineTo(b.x + 0.01, b.y); pg.stroke();
    pg.restore();
    const dist = Math.hypot(b.x - a.x, b.y - a.y);
    if (Math.random() < 0.5 + dist / 30) foam.push({ x: b.x + (Math.random() - 0.5) * 16, y: b.y + (Math.random() - 0.5) * 12, vx: (Math.random() - 0.5) * 30, vy: -10 - Math.random() * 20, r: 3 + Math.random() * 5, age: 0, life: 0.7 + Math.random() * 0.5 });
    if (foam.length > 70) foam.splice(0, foam.length - 70);
    germs.forEach((G) => {
      if (!G.alive || Math.hypot(G.x - b.x, G.y - b.y) > 20) return;
      G.alive = false;
      sfx.zap(); buzz(14);
      for (let k = 0; k < 8; k++) sparks.push({ x: G.x + (Math.random() - 0.5) * 26, y: G.y + (Math.random() - 0.5) * 26, r: 3 + Math.random() * 4, age: 0, life: 0.5 });
    });
    if (++strokes % 6 === 0) { buzz(3); checkScrub(false); }
  }
  function checkScrub(force) {
    const left = count() / P0;
    progress = Math.min(1, (1 - left) / 0.92);
    const alive = germs.filter((G) => G.alive).length;
    bar.style.width = `${Math.round(progress * 100)}%`;
    if (progress >= 1 && !alive) {
      pg.clearRect(0, 0, plaque.width, plaque.height);
      sfx.ding(); buzz([10, 40, 10]);
      for (let k = 0; k < 16; k++) { const tt = T[k % 12]; sparks.push({ x: tt.cx, y: tt.cy, r: 5 + Math.random() * 4, age: -Math.random() * 0.3, life: 0.7 }); }
      setTimeout(() => setPhase(1), 450);
    } else if (progress >= 1 && alive && force) hint.textContent = t(`Almost — ${alive} germ${alive > 1 ? 's' : ''} still hiding!`, `Khalas t2reban — lessa feeh ${alive} garasseem mestakhabbeya!`);
  }
  function floss(a, b) {
    gaps.forEach((gp) => {
      if (gp.done) return;
      const xs = [a.x, b.x];
      if (Math.min(...xs) > gp.x + 13 || Math.max(...xs) < gp.x - 13) return;
      const y0 = Math.max(gp.y1 - 20, Math.min(a.y, b.y)), y1 = Math.min(gp.y2 + 20, Math.max(a.y, b.y));
      if (b.y > a.y && y1 > y0) {
        gp.prog = Math.min(1, gp.prog + (y1 - y0) / (gp.y2 - gp.y1));
        if (gp.prog >= 0.75) flossDone(gp);
      }
    });
  }
  function tapFloss(path) {
    // a short tap right on a gap also works
    if (path.length > 3) return;
    const p = path[0];
    const gp = gaps.find((x) => !x.done && Math.abs(x.x - p.x) < 14 && p.y > x.y1 - 20 && p.y < x.y2 + 20);
    if (gp) flossDone(gp);
  }
  function flossDone(gp) {
    if (gp.done) return;
    gp.done = true; gp.prog = 1; gp.anim = 0;
    sfx.pop(); buzz(16);
    const left = gaps.filter((x) => !x.done).length;
    progress = 1 - left / gaps.length;
    bar.style.width = `${Math.round(progress * 100)}%`;
    if (!left) { sfx.ding(); setTimeout(() => setPhase(2), 700); }
  }
  function polish(a, b) {
    const d = Math.hypot(b.x - a.x, b.y - a.y);
    T.forEach((tt, i) => {
      if (shine[i] >= 1) return;
      if (b.x < tt.x - 6 || b.x > tt.x + tt.w + 6 || b.y < tt.y - 6 || b.y > tt.y + tt.h + 6) return;
      shine[i] = Math.min(1, shine[i] + d / 170 + 0.012);
      if (Math.random() < 0.3) sparks.push({ x: b.x + (Math.random() - 0.5) * 14, y: b.y + (Math.random() - 0.5) * 14, r: 2 + Math.random() * 3, age: 0, life: 0.45 });
      if (shine[i] >= 1) {
        const n = shine.filter((s) => s >= 1).length;
        sfx.ding(); buzz(8);
        for (let k = 0; k < 6; k++) sparks.push({ x: tt.cx + (Math.random() - 0.5) * tt.w, y: tt.cy + (Math.random() - 0.5) * tt.h, r: 3 + Math.random() * 4, age: 0, life: 0.6 });
        progress = n / T.length;
        bar.style.width = `${Math.round(progress * 100)}%`;
        if (n === T.length) finish();
      }
    });
  }
  function finish() {
    finished = true;
    running = false;
    const secs = (performance.now() - t0) / 1000;
    timeEl.textContent = secs.toFixed(1);
    const isBest = !best || secs < best;
    if (isBest) { best = secs; try { localStorage.setItem('rajiea-smile-best', String(secs)); } catch {} bestEl.textContent = `${secs.toFixed(1)}s`; }
    setPhase(3);
    phases.forEach((li) => li.classList.add('done'));
    tool.classList.remove('on');
    sfx.tada(); buzz([20, 60, 20, 60, 40]);
    for (let k = 0; k < 40; k++) { const tt = T[k % 12]; sparks.push({ x: tt.cx + (Math.random() - 0.5) * 40, y: tt.cy + (Math.random() - 0.5) * 40, r: 4 + Math.random() * 6, age: -Math.random() * 0.6, life: 0.9 }); }
    confettiFrom(cv, { count: 70, spread: 0.7, emoji: ['✨', '🦷', '💗'] });
    egg('sparkle');
    doneEl.innerHTML = `
      <div class="ss-stamp"><span>${t('Dr. Rajiea approved', 'Mowaf2et Dr. Rajiea')}</span><b>✓</b></div>
      <p>${esc(lines[Math.floor(Math.random() * lines.length)])}</p>
      <small>${t(`${secs.toFixed(1)} seconds`, `${secs.toFixed(1)} sanya`)}${isBest ? ` · ${t('new best!', 'raqam gdeed!')}` : ''}</small>
      <button type="button" class="btn btn-pink">${t('Another smile', 'Ebtesama tanya')} 😁</button>`;
    doneEl.hidden = false;
    doneEl.querySelector('button').addEventListener('click', () => { sfx.click(); reset(); start(); });
  }
  root.querySelector('.ss-assist').addEventListener('click', () => {
    if (finished) return;
    sfx.whoosh(); buzz(8);
    if (!running) { running = true; t0 = performance.now(); }
    if (phase === 0) {
      // clear one tooth and one germ
      const tt = T.find((x) => { const d = pg.getImageData(Math.round(x.cx * 2), Math.round(x.cy * 2), 1, 1).data; return d[3] > 40; }) || T[0];
      pg.save(); pg.setTransform(2, 0, 0, 2, 0, 0); pg.globalCompositeOperation = 'destination-out'; pg.fillRect(tt.x - 4, tt.y - 4, tt.w + 8, tt.h + 8); pg.restore();
      const G = germs.find((x) => x.alive); if (G) G.alive = false;
      checkScrub(true);
    } else if (phase === 1) { const gp = gaps.find((x) => !x.done); if (gp) flossDone(gp); }
    else if (phase === 2) { const i = shine.findIndex((s) => s < 1); if (i >= 0) { const tt = T[i]; polish({ x: tt.cx - 170, y: tt.cy }, { x: tt.cx, y: tt.cy }); } }
  });

  size();
  reset();
  addEventListener('resize', () => { size(); });
  onVisible(root, (v) => { visible = v; if (v) { if (!cv.width || cv.width < 10) size(); start(); } });
}
