// Quiz (with a scratch-card prize), Germ Zapper and the brush-along timer.
import { sfx, confetti, confettiFrom } from './fx.js';

const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const lerp = (a, b, t) => a + (b - a) * t;
const TOOTH = 'M32 15C26 9 14 7 10 15S9 32 12 40s3 16 8 16 5-10 8-14 6-3 8 0 3 14 8 14 6-9 8-16 6-17 2-25-16-6-22 0z';

const mascot = () => `
  <svg class="mascot" viewBox="0 0 64 64" aria-hidden="true">
    <path d="${TOOTH}" fill="#fff" stroke="#5b3a26" stroke-width="3" stroke-linejoin="round"/>
    <circle cx="19" cy="32" r="3" fill="#ff9cc4"/><circle cx="45" cy="32" r="3" fill="#ff9cc4"/>
    <g class="f f-idle"><circle cx="24" cy="26" r="2.8" fill="#3f2617"/><circle cx="40" cy="26" r="2.8" fill="#3f2617"/><path d="M27 32q5 5 10 0" fill="none" stroke="#3f2617" stroke-width="2.6" stroke-linecap="round"/></g>
    <g class="f f-yay"><path d="M21 27q3-4 6 0M37 27q3-4 6 0" fill="none" stroke="#3f2617" stroke-width="2.6" stroke-linecap="round"/><path d="M26 31h12q-1 7-6 7t-6-7z" fill="#6e1a33"/></g>
    <g class="f f-oops"><circle cx="24" cy="26" r="3.4" fill="#3f2617"/><circle cx="40" cy="26" r="3.4" fill="#3f2617"/><circle cx="32" cy="35" r="2.6" fill="#6e1a33"/></g>
  </svg>`;

// ════════════════ Quiz ════════════════
export function initQuiz(root, cfg) {
  const Q = cfg.quiz;
  const n = Q.length;
  const pass = Math.min(cfg.passMark, n);
  let i = 0, score = 0;

  const setMood = (m) => { const el = root.querySelector('.mascot'); if (el) el.dataset.mood = m; };

  function start() {
    root.innerHTML = `
      <div class="q-screen q-start">
        ${mascot()}
        <h3>How well do you know ${esc(cfg.name)}?</h3>
        <p>${n} questions. Get ${pass} right to win a prize 🎁</p>
        <button type="button" class="btn btn-pink" data-go>Start the quiz</button>
      </div>`;
    root.querySelector('[data-go]').onclick = () => { sfx.click(); i = 0; score = 0; ask(); };
  }

  function ask() {
    const q = Q[i];
    root.innerHTML = `
      <div class="q-screen q-play">
        <div class="q-top"><span>Question ${i + 1} of ${n}</span><span class="q-stars">⭐ ${score}</span></div>
        <div class="q-bar"><i style="width:${(i / n) * 100}%"></i></div>
        <div class="q-body">${mascot()}<h3 class="q-text">${esc(q.q)}</h3></div>
        <div class="q-options">
          ${q.options.map((o, k) => `<button type="button" class="q-opt" data-k="${k}"><span class="q-letter">${'ABCD'[k]}</span><span>${esc(o)}</span></button>`).join('')}
        </div>
        <p class="q-why" aria-live="polite"></p>
        <button type="button" class="btn btn-pink q-next" hidden>${i + 1 < n ? 'Next question →' : 'See my score →'}</button>
      </div>`;
    setMood('idle');
    const opts = [...root.querySelectorAll('.q-opt')];
    opts.forEach((b) => (b.onclick = () => answer(+b.dataset.k, opts)));
    root.querySelector('.q-next').onclick = () => { sfx.click(); i++; i < n ? ask() : result(); };
  }

  function answer(k, opts) {
    const q = Q[i];
    const right = k === q.answer;
    opts.forEach((b) => (b.disabled = true));
    opts[q.answer].classList.add('right');
    if (!right) opts[k].classList.add('wrong');
    if (right) { score++; sfx.ding(); confettiFrom(opts[k], { count: 18, spread: 0.5 }); } else sfx.buzz();
    setMood(right ? 'yay' : 'oops');
    root.querySelector('.q-stars').textContent = `⭐ ${score}`;
    root.querySelector('.q-bar i').style.width = `${((i + 1) / n) * 100}%`;
    const why = root.querySelector('.q-why');
    why.innerHTML = `<b>${right ? 'Correct!' : 'Not quite.'}</b> ${esc(q.why || '')}`;
    why.classList.add('show');
    const next = root.querySelector('.q-next');
    next.hidden = false;
    next.focus({ preventScroll: true });
  }

  function result() {
    const won = score >= pass;
    if (!won) {
      root.innerHTML = `
        <div class="q-screen q-result">
          ${mascot()}
          <h3>You scored ${score} / ${n}</h3>
          <p>So close! You need ${pass} to win. Brush up on ${esc(cfg.name)} and try again 💪</p>
          <button type="button" class="btn btn-pink" data-again>Try again</button>
        </div>`;
      setMood('oops');
      root.querySelector('[data-again]').onclick = () => { sfx.click(); i = 0; score = 0; ask(); };
      return;
    }
    const prize = cfg.prizes[Math.floor(Math.random() * cfg.prizes.length)];
    root.innerHTML = `
      <div class="q-screen q-result win">
        <h3>You scored ${score} / ${n} 🎉</h3>
        <p>You really know ${esc(cfg.name)}! Scratch the card to reveal your prize.</p>
        <div class="scratch">
          <div class="prize">
            <div class="prize-icon">${prize.icon}</div>
            <div class="prize-title">${esc(prize.title)}</div>
            <div class="prize-note">${esc(prize.note)}</div>
            <div class="prize-claim">${esc(cfg.claimLine)}</div>
          </div>
          <canvas class="scratch-cover" aria-label="Scratch card — rub to reveal"></canvas>
        </div>
        <button type="button" class="btn btn-cream" data-again>Play again</button>
      </div>`;
    sfx.tada();
    confettiFrom(root.querySelector('h3'), { count: 90 });
    root.querySelector('[data-again]').onclick = () => { sfx.click(); start(); };
    scratchCard(root.querySelector('.scratch'));
  }

  start();
}

function scratchCard(wrap) {
  const cv = wrap.querySelector('canvas');
  const g = cv.getContext('2d', { willReadFrequently: true });
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = wrap.clientWidth, h = wrap.clientHeight;
  cv.width = w * dpr;
  cv.height = h * dpr;
  g.scale(dpr, dpr);
  const grad = g.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, '#ff3d8b');
  grad.addColorStop(0.5, '#ff7fb2');
  grad.addColorStop(1, '#e8237a');
  g.fillStyle = grad;
  g.fillRect(0, 0, w, h);
  g.fillStyle = 'rgba(255,255,255,.18)';
  for (let y = 12; y < h; y += 26) for (let x = (y / 26) % 2 ? 12 : 25; x < w; x += 26) { g.beginPath(); g.arc(x, y, 2.2, 0, Math.PI * 2); g.fill(); }
  g.fillStyle = '#fff';
  g.textAlign = 'center';
  g.font = '700 22px Fredoka, sans-serif';
  g.fillText('Scratch here ✨', w / 2, h / 2 + 4);
  g.font = '600 13px Nunito, sans-serif';
  g.fillText('use your finger or mouse', w / 2, h / 2 + 26);
  g.globalCompositeOperation = 'destination-out';

  let down = false, last = null, strokes = 0, done = false;
  const pos = (e) => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  const scratch = (p) => {
    g.lineWidth = 44;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo((last || p).x, (last || p).y);
    g.lineTo(p.x, p.y);
    g.stroke();
    last = p;
    if (++strokes % 12 === 0) check();
  };
  const check = () => {
    const data = g.getImageData(0, 0, cv.width, cv.height).data;
    let clear = 0, total = 0;
    for (let k = 3; k < data.length; k += 4 * 24) { total++; if (data[k] < 40) clear++; }
    if (!done && clear / total > 0.45) {
      done = true;
      cv.classList.add('gone');
      sfx.tada();
      confettiFrom(wrap, { count: 140 });
    }
  };
  cv.addEventListener('pointerdown', (e) => { down = true; last = null; cv.setPointerCapture?.(e.pointerId); scratch(pos(e)); });
  cv.addEventListener('pointermove', (e) => { if (down) scratch(pos(e)); });
  const up = () => { down = false; last = null; check(); };
  cv.addEventListener('pointerup', up);
  cv.addEventListener('pointercancel', up);
}

// ════════════════ Germ Zapper ════════════════
const germSVG = (hue) => `
  <svg class="germ" viewBox="0 0 64 64" aria-hidden="true" style="--g:${hue}">
    ${[0, 1, 2, 3, 4, 5, 6, 7].map((k) => { const a = (k / 8) * Math.PI * 2; return `<circle class="gb" cx="${32 + Math.cos(a) * 24}" cy="${32 + Math.sin(a) * 24}" r="5"/>`; }).join('')}
    <circle class="gb" cx="32" cy="32" r="22"/>
    <circle cx="25" cy="29" r="5.5" fill="#fff"/><circle cx="39" cy="29" r="5.5" fill="#fff"/>
    <circle cx="26" cy="30" r="2.6" fill="#2a1810"/><circle cx="38" cy="30" r="2.6" fill="#2a1810"/>
    <path d="M19 21l9 4M45 21l-9 4" stroke="#2a1810" stroke-width="2.6" stroke-linecap="round"/>
    <path d="M24 40q8 6 16 0" fill="none" stroke="#2a1810" stroke-width="2.6" stroke-linecap="round"/>
    <path d="M27 41.5l2 3 2-2.4zM33 42l2 2.4 2-3z" fill="#fff"/>
  </svg>`;
const candySVG = `
  <svg class="candy" viewBox="0 0 64 64" aria-hidden="true">
    <path d="M16 32L3 22l2 20z" fill="#ff9cc4" stroke="#e8237a" stroke-width="2" stroke-linejoin="round"/>
    <path d="M48 32l13-10-2 20z" fill="#ff9cc4" stroke="#e8237a" stroke-width="2" stroke-linejoin="round"/>
    <circle cx="32" cy="32" r="16" fill="#ff3d8b" stroke="#e8237a" stroke-width="2"/>
    <path d="M32 21a11 11 0 1 1-10.4 7.4M32 26a6 6 0 1 1-5.6 3.9" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/>
  </svg>`;
const cellTooth = `
  <svg class="ctooth" viewBox="0 0 64 64" aria-hidden="true">
    <path class="ct-body" d="${TOOTH}" stroke="#5b3a26" stroke-width="2.6" stroke-linejoin="round"/>
    <circle cx="19" cy="32" r="3" fill="#ff9cc4"/><circle cx="45" cy="32" r="3" fill="#ff9cc4"/>
    <g class="ct-ok"><circle cx="24" cy="26" r="2.6" fill="#3f2617"/><circle cx="40" cy="26" r="2.6" fill="#3f2617"/><path d="M27 32q5 5 10 0" fill="none" stroke="#3f2617" stroke-width="2.4" stroke-linecap="round"/></g>
    <g class="ct-sad"><circle cx="24" cy="27" r="2.6" fill="#3f2617"/><circle cx="40" cy="27" r="2.6" fill="#3f2617"/><path d="M27 36q5-5 10 0" fill="none" stroke="#3f2617" stroke-width="2.4" stroke-linecap="round"/><circle class="ct-spot" cx="45" cy="19" r="4.5"/></g>
  </svg>`;

export function initZapper(root) {
  const board = root.querySelector('#zBoard');
  const overlay = root.querySelector('#zOverlay');
  const $score = root.querySelector('#zScore');
  const $time = root.querySelector('#zTime');
  const $bar = root.querySelector('#zBar');
  const $best = root.querySelector('#zBest');
  const LEN = 30;
  let best = +localStorage.getItem('rajiea-zap-best') || 0;
  $best.textContent = best;

  board.innerHTML = Array.from({ length: 9 }, (_, k) => `
    <button type="button" class="cell" data-i="${k}" aria-label="Tooth ${k + 1}">
      ${cellTooth}
      <span class="thing">${germSVG(k % 3 === 0 ? 280 : 100)}${candySVG}</span>
      <span class="burst" aria-hidden="true"></span>
    </button>`).join('');
  const cells = [...board.querySelectorAll('.cell')];
  const state = cells.map(() => ({ kind: null, timer: 0 }));

  let running = false, score = 0, zapped = 0, cavities = 0, candies = 0, t0 = 0, spawnTimer = 0, raf = 0;

  function intro() {
    overlay.innerHTML = `
      <div class="zo-card">
        <h3>Germ Zapper</h3>
        <p>Sugar bugs are attacking! Tap the <b>germs</b> before they make cavities.<br>But <b>don’t tap the candy</b> 🍬 — that’s −2.</p>
        <button type="button" class="btn btn-pink" data-play>Start · ${LEN} seconds</button>
      </div>`;
    overlay.hidden = false;
    overlay.querySelector('[data-play]').onclick = play;
  }

  function play() {
    sfx.click();
    overlay.hidden = true;
    running = true;
    score = zapped = cavities = candies = 0;
    $score.textContent = 0;
    cells.forEach((c, k) => { clear(k); c.classList.remove('sad'); });
    t0 = performance.now();
    spawn();
    tick();
  }

  const progress = () => Math.min(1, (performance.now() - t0) / (LEN * 1000));

  function clear(k) {
    clearTimeout(state[k].timer);
    state[k].kind = null;
    cells[k].dataset.kind = '';
  }

  function spawn() {
    if (!running) return;
    const p = progress();
    const free = state.map((s, k) => (s.kind ? -1 : k)).filter((k) => k >= 0 && !cells[k].classList.contains('sad'));
    const howMany = p > 0.55 && Math.random() < 0.45 ? 2 : 1;
    for (let m = 0; m < howMany && free.length; m++) {
      const k = free.splice(Math.floor(Math.random() * free.length), 1)[0];
      const kind = Math.random() < 0.2 ? 'candy' : 'germ';
      state[k].kind = kind;
      cells[k].dataset.kind = kind;
      state[k].timer = setTimeout(() => {
        if (state[k].kind === 'germ') {
          cavities++;
          cells[k].classList.add('sad');
          setTimeout(() => cells[k].classList.remove('sad'), 900);
        }
        clear(k);
      }, lerp(1350, 760, p));
    }
    spawnTimer = setTimeout(spawn, lerp(820, 430, p));
  }

  function tick() {
    if (!running) return;
    const p = progress();
    $time.textContent = Math.ceil(LEN * (1 - p));
    $bar.style.transform = `scaleX(${1 - p})`;
    if (p >= 1) return end();
    raf = requestAnimationFrame(tick);
  }

  cells.forEach((c, k) => {
    c.addEventListener('pointerdown', (e) => {
      if (!running) return;
      e.preventDefault();
      const kind = state[k].kind;
      if (!kind) return;
      clear(k);
      if (kind === 'germ') {
        score++;
        zapped++;
        sfx.zap();
        c.classList.remove('zap');
        void c.offsetWidth;
        c.classList.add('zap');
      } else {
        score = Math.max(0, score - 2);
        candies++;
        sfx.buzz();
        c.classList.remove('oops');
        void c.offsetWidth;
        c.classList.add('oops');
      }
      $score.textContent = score;
    });
  });

  function end() {
    running = false;
    clearTimeout(spawnTimer);
    cancelAnimationFrame(raf);
    cells.forEach((_, k) => clear(k));
    const newBest = score > best;
    if (newBest) { best = score; localStorage.setItem('rajiea-zap-best', best); $best.textContent = best; }
    const rank = score >= 22 ? ['🏆', 'Certified Smile Guardian', 'Dr. Rajiea would hire you on the spot.']
      : score >= 14 ? ['🦷', 'Great brushing!', 'The sugar bugs are scared of you now.']
      : score >= 7 ? ['🪥', 'Not bad!', 'A little more flossing and you’ll be unstoppable.']
      : ['🦠', 'The germs won this round', 'Quick — give it another go!'];
    overlay.innerHTML = `
      <div class="zo-card">
        <div class="zo-icon">${rank[0]}</div>
        <h3>${rank[1]}</h3>
        <p class="zo-score">${score} points${newBest ? ' · <b>new best!</b>' : ''}</p>
        <p>${rank[2]}</p>
        <ul class="zo-stats"><li><b>${zapped}</b> germs zapped</li><li><b>${cavities}</b> cavities</li><li><b>${candies}</b> candies tapped</li></ul>
        <button type="button" class="btn btn-pink" data-play>Play again</button>
      </div>`;
    overlay.hidden = false;
    overlay.querySelector('[data-play]').onclick = play;
    if (score >= 14 || newBest) { sfx.tada(); confettiFrom(overlay, { count: 100 }); } else sfx.boop();
  }

  intro();
  return {
    stop() {
      if (!running) return;
      running = false;
      clearTimeout(spawnTimer);
      cancelAnimationFrame(raf);
      cells.forEach((_, k) => clear(k));
      intro();
    },
  };
}

// ════════════════ Brush-along timer ════════════════
export function initBrush(svg, ui) {
  const ZONES = ['Top left', 'Top right', 'Bottom right', 'Bottom left'];
  const TIPS = [
    'Small, gentle circles — like you’re polishing pearls.',
    'Tilt the brush toward the gumline, about 45°.',
    'Don’t forget the inside surfaces and the very back teeth.',
    'Last zone! Then give your tongue a quick brush too.',
  ];
  const ZONE_SEC = 30;
  const NS = 'http://www.w3.org/2000/svg';

  // Draw the mouth and two arches of teeth
  svg.innerHTML = `
    <ellipse cx="200" cy="165" rx="188" ry="152" fill="#ff9cc4"/>
    <ellipse cx="200" cy="165" rx="168" ry="132" fill="#8e2442"/>
    <ellipse cx="200" cy="232" rx="88" ry="42" fill="#ff7a9c"/>
    <path d="M200 205v40" stroke="#e05b80" stroke-width="3" stroke-linecap="round"/>
    <g id="teeth"></g>
    <g id="sparkles"></g>
    <g id="brushG" opacity="0">
      <g id="brushInner">
        <rect x="-8" y="-150" width="16" height="130" rx="8" fill="#ff3d8b"/>
        <rect x="-13" y="-22" width="26" height="44" rx="7" fill="#fff" stroke="#5b3a26" stroke-width="2"/>
        <rect x="-10" y="-18" width="20" height="36" rx="3" fill="#bfe6ff"/>
        <g class="foam"><circle cx="-18" cy="-6" r="6" fill="#fff"/><circle cx="18" cy="4" r="5" fill="#fff"/><circle cx="-12" cy="14" r="4" fill="#fff"/><circle cx="14" cy="-14" r="3.5" fill="#fff"/></g>
      </g>
    </g>`;
  const teethG = svg.querySelector('#teeth');
  const sparkG = svg.querySelector('#sparkles');
  const zoneTeeth = [[], [], [], []];
  const zoneCenter = [];
  const arch = (cx, cy, rx, ry, a0, a1, count, upper) => {
    for (let k = 0; k < count; k++) {
      const a = ((a0 + ((a1 - a0) * k) / (count - 1)) * Math.PI) / 180;
      const x = cx + rx * Math.cos(a), y = cy + ry * Math.sin(a);
      const mid = Math.abs(k - (count - 1) / 2);
      const w = mid < 1.5 ? 26 : mid < 3.5 ? 23 : 25;
      const h = mid < 1.5 ? 36 : 32;
      const rect = document.createElementNS(NS, 'rect');
      rect.setAttribute('x', -w / 2);
      rect.setAttribute('y', -h / 2);
      rect.setAttribute('width', w);
      rect.setAttribute('height', h);
      rect.setAttribute('rx', 8);
      rect.setAttribute('class', 'tt');
      const deg = (a * 180) / Math.PI + 90;
      rect.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${deg.toFixed(1)})`);
      teethG.appendChild(rect);
      const zone = upper ? (x < 200 ? 0 : 1) : x >= 200 ? 2 : 3;
      zoneTeeth[zone].push(rect);
    }
  };
  arch(200, 178, 140, 122, 194, 346, 14, true);
  arch(200, 152, 128, 108, 16, 164, 14, false);
  zoneCenter[0] = { x: 105, y: 92, rot: -35 };
  zoneCenter[1] = { x: 295, y: 92, rot: 35 };
  zoneCenter[2] = { x: 290, y: 232, rot: 145 };
  zoneCenter[3] = { x: 110, y: 232, rot: -145 };

  const brushG = svg.querySelector('#brushG');
  const ring = ui.ring;
  const C = 2 * Math.PI * 52;
  ring.style.strokeDasharray = C;

  let state = 'idle', elapsed = 0, last = 0, raf = 0, zone = -1;

  const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

  function paint() {
    const total = ZONE_SEC * 4;
    const p = Math.min(1, elapsed / total);
    ring.style.strokeDashoffset = C * (1 - p);
    ui.time.textContent = fmt(Math.ceil(total - elapsed));
    const z = Math.min(3, Math.floor(elapsed / ZONE_SEC));
    zoneTeeth.forEach((list, k) => {
      const zp = k < z ? 1 : k === z && state !== 'idle' ? (elapsed - k * ZONE_SEC) / ZONE_SEC : 0;
      const clean = state === 'done' ? 1 : zp;
      list.forEach((r) => {
        r.style.fill = `color-mix(in srgb, #ffffff ${Math.round(clean * 100)}%, #f2dfae)`;
        r.classList.toggle('active', k === z && state === 'running');
      });
    });
    if (z !== zone && state === 'running') {
      if (zone >= 0) { sfx.ding(); sparkle(zone); }
      zone = z;
      ui.zone.textContent = `${ZONES[z]} · ${z + 1}/4`;
      ui.tip.textContent = TIPS[z];
    }
    const c = zoneCenter[Math.max(0, z)];
    const t = performance.now() / 1000;
    const scrub = state === 'running' ? Math.sin(t * 18) * 9 : 0;
    brushG.setAttribute('transform', `translate(${c.x} ${c.y}) rotate(${c.rot}) translate(${scrub} 0)`);
    brushG.setAttribute('opacity', state === 'running' || state === 'paused' ? 1 : 0);
  }

  function sparkle(z) {
    zoneTeeth[z].forEach((r, k) => {
      if (k % 2) return;
      const m = r.getAttribute('transform').match(/translate\(([-\d.]+) ([-\d.]+)\)/);
      const s = document.createElementNS(NS, 'text');
      s.textContent = '✦';
      s.setAttribute('x', m[1]);
      s.setAttribute('y', m[2]);
      s.setAttribute('class', 'tw');
      s.style.animationDelay = `${k * 40}ms`;
      sparkG.appendChild(s);
      setTimeout(() => s.remove(), 1600);
    });
  }

  function loop(now) {
    if (state !== 'running') return;
    elapsed += Math.min(0.1, (now - last) / 1000);
    last = now;
    if (elapsed >= ZONE_SEC * 4) {
      elapsed = ZONE_SEC * 4;
      finish();
      return;
    }
    paint();
    raf = requestAnimationFrame(loop);
  }

  function finish() {
    state = 'done';
    sparkle(3);
    paint();
    ui.time.textContent = '0:00';
    ui.zone.textContent = 'All done! ✨';
    ui.tip.textContent = 'Sparkly clean! Now spit — don’t rinse — so the fluoride keeps working 💧';
    ui.start.textContent = 'Brush again';
    sfx.tada();
    confettiFrom(svg, { count: 120 });
  }

  ui.start.addEventListener('click', () => {
    if (state === 'running') {
      state = 'paused';
      ui.start.textContent = 'Resume';
      ui.zone.textContent = 'Paused';
      cancelAnimationFrame(raf);
      paint();
      return;
    }
    if (state === 'done' || state === 'idle') { elapsed = 0; zone = -1; }
    state = 'running';
    ui.start.textContent = 'Pause';
    sfx.click();
    last = performance.now();
    raf = requestAnimationFrame(loop);
  });
  ui.reset.addEventListener('click', () => {
    cancelAnimationFrame(raf);
    state = 'idle';
    elapsed = 0;
    zone = -1;
    ui.start.textContent = 'Start brushing';
    ui.zone.textContent = 'Ready?';
    ui.tip.textContent = TIPS[0];
    sfx.click();
    paint();
  });
  paint();
}
