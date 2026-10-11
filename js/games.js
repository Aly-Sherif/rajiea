// Quiz (with a scratch-card prize), Germ Zapper and the brush-along timer.
import { sfx, confetti, confettiFrom } from './fx.js';
import { t, isAr } from './i18n.js';

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

const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};

// Pick a fresh random set: avoid last game's questions, include some tough ones.
function pickQuestions(bank, len, minHard = 3) {
  let last = [];
  try { last = JSON.parse(localStorage.getItem('rajiea-quiz-last') || '[]'); } catch {}
  const ids = bank.map((_, i) => i);
  const fresh = shuffle(ids.filter((i) => !last.includes(i)));
  const pool = fresh.length >= len ? fresh : [...fresh, ...shuffle(ids.filter((i) => last.includes(i)))];
  const pick = pool.slice(0, len);
  const spareHard = pool.slice(len).filter((i) => bank[i].hard);
  let hardCount = pick.filter((i) => bank[i].hard).length;
  for (let k = pick.length - 1; k >= 0 && hardCount < minHard && spareHard.length; k--) {
    if (!bank[pick[k]].hard) { pick[k] = spareHard.shift(); hardCount++; }
  }
  localStorage.setItem('rajiea-quiz-last', JSON.stringify(pick));
  return shuffle(pick).map((i) => {
    const q = bank[i];
    const correct = typeof q.answer === 'number' ? q.options[q.answer] : q.answer;
    const options = shuffle(q.options);
    return { ...q, options, answer: options.indexOf(correct) };
  });
}

// ════════════════ Quiz ════════════════
export function initQuiz(root, cfg, hooks = {}) {
  const len = Math.min(cfg.quizLength || 10, cfg.quizBank.length);
  const pass = Math.min(cfg.passMark, len);
  let Q = [], i = 0, score = 0;
  const n = len;

  const setMood = (m) => { const el = root.querySelector('.mascot'); if (el) el.dataset.mood = m; };
  const begin = () => { Q = pickQuestions(cfg.quizBank, len); i = 0; score = 0; ask(); };

  function start() {
    root.innerHTML = `
      <div class="q-screen q-start">
        ${mascot()}
        <h3>${t(`How well do you know ${esc(cfg.name)}?`, `قد إيه تعرف ${esc(cfg.nameAr)}؟`)}</h3>
        <p>${t(`${n} random questions — a new set every time, with a few tough ones. Get ${pass} right to win a prize.`, `${n} أسئلة عشوائية — مجموعة جديدة كل مرة، وفيها كام سؤال صعب. جاوب ${pass} صح وتكسب جايزة.`)}</p>
        <button type="button" class="btn btn-pink" data-go>${t('Start the quiz', 'يلا نبدأ')}</button>
      </div>`;
    root.querySelector('[data-go]').onclick = () => { sfx.click(); begin(); };
  }

  function ask() {
    const q = Q[i];
    root.innerHTML = `
      <div class="q-screen q-play">
        <div class="q-top"><span>${t(`Question ${i + 1} of ${n}`, `سؤال ${i + 1} من ${n}`)}${q.hard ? ` <em class="q-hard">${t('Tough one', 'سؤال صعب')}</em>` : ''}</span><span class="q-stars">${t(`${score} correct`, `${score} صح`)}</span></div>
        <div class="q-bar"><i style="width:${(i / n) * 100}%"></i></div>
        <div class="q-body">${mascot()}<h3 class="q-text">${esc(q.q)}</h3></div>
        <div class="q-options">
          ${q.options.map((o, k) => `<button type="button" class="q-opt" data-k="${k}"><span class="q-letter">${t('ABCD', 'أبجد')[k]}</span><span>${esc(o)}</span></button>`).join('')}
        </div>
        <p class="q-why" aria-live="polite"></p>
        <button type="button" class="btn btn-pink q-next" hidden>${i + 1 < n ? t('Next question →', 'السؤال اللي بعده ←') : t('See my score →', 'شوف نتيجتي ←')}</button>
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
    if (right) { score++; sfx.ding(); confettiFrom(opts[k], { count: 14, spread: 0.45 }); } else sfx.buzz();
    setMood(right ? 'yay' : 'oops');
    root.querySelector('.q-stars').textContent = t(`${score} correct`, `${score} صح`);
    root.querySelector('.q-bar i').style.width = `${((i + 1) / n) * 100}%`;
    const why = root.querySelector('.q-why');
    why.innerHTML = `<b>${right ? t('Correct.', 'صح.') : t('Not quite.', 'مش بالظبط.')}</b> ${esc(q.why || '')}`;
    why.classList.add('show');
    const next = root.querySelector('.q-next');
    next.hidden = false;
    next.focus({ preventScroll: true });
  }

  function result() {
    const won = score >= pass;
    if (score === n) hooks.onPerfect?.();
    if (!won) {
      root.innerHTML = `
        <div class="q-screen q-result">
          ${mascot()}
          <h3>${t(`You scored ${score} / ${n}`, `نتيجتك ${score} / ${n}`)}</h3>
          <p>${t(`Close! You need ${pass} to win. The next round brings a whole new set of questions.`, `قرّبت! محتاج ${pass} علشان تكسب. الجولة الجاية فيها أسئلة جديدة خالص.`)}</p>
          <button type="button" class="btn btn-pink" data-again>${t('Try a new set', 'جرّب أسئلة جديدة')}</button>
        </div>`;
      setMood('oops');
      root.querySelector('[data-again]').onclick = () => { sfx.click(); begin(); };
      return;
    }
    const prize = cfg.prizes[Math.floor(Math.random() * cfg.prizes.length)];
    root.innerHTML = `
      <div class="q-screen q-result win">
        <h3>${t(`You scored ${score} / ${n}`, `نتيجتك ${score} / ${n}`)}</h3>
        <p>${score === n ? t('A perfect score — impressive.', 'الدرجة النهائية — برافو.') : t(`You really know ${esc(cfg.name)}.`, `إنت فعلًا تعرف ${esc(cfg.nameAr)}.`)} ${t('Scratch the card to reveal your prize.', 'اكشط الكارت علشان تشوف جايزتك.')}</p>
        <div class="scratch">
          <div class="prize">
            <div class="prize-icon">${prize.icon}</div>
            <div class="prize-title">${esc(prize.title)}</div>
            <div class="prize-note">${esc(prize.note)}</div>
            <div class="prize-claim">${esc(cfg.claimLine)}</div>
          </div>
          <canvas class="scratch-cover" aria-label="${t('Scratch card — rub to reveal', 'كارت كشط — امسح علشان تشوف')}"></canvas>
        </div>
        <button type="button" class="btn btn-cream" data-again>${t('Play a new set', 'العب بأسئلة جديدة')}</button>
      </div>`;
    sfx.tada();
    confettiFrom(root.querySelector('h3'), { count: 80 });
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
  g.font = isAr ? '700 22px Tajawal, sans-serif' : '600 22px Fraunces, Georgia, serif';
  g.fillText(t('Scratch here ✨', 'اكشط هنا ✨'), w / 2, h / 2 + 4);
  g.font = isAr ? '500 14px Tajawal, sans-serif' : '600 13px Manrope, sans-serif';
  g.fillText(t('use your finger or mouse', 'بصباعك أو بالماوس'), w / 2, h / 2 + 26);
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

export function initZapper(root, hooks = {}) {
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
    <button type="button" class="cell" data-i="${k}" aria-label="${t(`Tooth ${k + 1}`, `سنة ${k + 1}`)}">
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
        <h3>${t('Germ Zapper', 'صايد الجراثيم')}</h3>
        <p>${t('Tap the <b>germs</b> before they cause cavities.<br>Leave the <b>candy</b> alone — tapping it costs 2 points.', 'دوس على <b>الجراثيم</b> قبل ما تعمل تسوّس.<br>وسيب <b>الحلويات</b> في حالها — لو دوست عليها تخسر نقطتين.')}</p>
        <button type="button" class="btn btn-pink" data-play>${t(`Start · ${LEN} seconds`, `ابدأ · ${LEN} ثانية`)}</button>
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
    hooks.onScore?.(score, { candies, zapped, cavities });
    const newBest = score > best;
    if (newBest) { best = score; localStorage.setItem('rajiea-zap-best', best); $best.textContent = best; }
    const rank = score >= 22 ? ['🏆', t('Certified Smile Guardian', 'حارس الابتسامة المعتمد'), t('Dr. Rajiea would hire you on the spot.', 'د. راجية هتعيّنك على طول.')]
      : score >= 14 ? ['🦷', t('Great brushing!', 'غسيل ممتاز!'), t('The sugar bugs are scared of you now.', 'جراثيم السكر خايفة منك دلوقتي.')]
      : score >= 7 ? ['🪥', t('Not bad!', 'مش وحش!'), t('A little more flossing and you’ll be unstoppable.', 'شوية خيط كمان ومحدش هيقدر يوقفك.')]
      : ['🦠', t('The germs won this round', 'الجراثيم كسبت الجولة دي'), t('One more try?', 'محاولة كمان؟')];
    overlay.innerHTML = `
      <div class="zo-card">
        <div class="zo-icon">${rank[0]}</div>
        <h3>${rank[1]}</h3>
        <p class="zo-score">${t(`${score} points`, `${score} نقطة`)}${newBest ? ` · <b>${t('new best!', 'رقم قياسي جديد!')}</b>` : ''}</p>
        <p>${rank[2]}</p>
        <ul class="zo-stats"><li><b>${zapped}</b> ${t('germs zapped', 'جرثومة اتصادت')}</li><li><b>${cavities}</b> ${t('cavities', 'تسوّس')}</li><li><b>${candies}</b> ${t('candies tapped', 'حلويات اتداست')}</li></ul>
        <button type="button" class="btn btn-pink" data-play>${t('Play again', 'العب تاني')}</button>
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

// ════════════════ Brush-along ════════════════
const DAY = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function initBrush(svg, ui, hooks = {}) {
  const ZONES = isAr ? ['فوق شمال', 'فوق يمين', 'تحت يمين', 'تحت شمال'] : ['Top left', 'Top right', 'Bottom right', 'Bottom left'];
  const STEPS = isAr ? ['الأسطح الخارجية', 'الأسطح الداخلية', 'أسطح المضغ'] : ['Outer surfaces', 'Inner surfaces', 'Chewing surfaces'];
  const STEP_TIPS = isAr ? [
    'ميّل الفرشة 45° ناحية اللثة واعمل دواير صغيرة وهادية.',
    'دلوقتي من جوّه — خلّي الفرشة واقفة للسنان القدّامية.',
    'حركات قصيرة لقدّام وورا على أسطح المضغ.',
  ] : [
    'Tilt the brush 45° toward the gumline and use small, gentle circles.',
    'Now the inside — hold the brush upright for the front teeth.',
    'Short back-and-forth strokes across the tops.',
  ];
  const NS = 'http://www.w3.org/2000/svg';

  svg.innerHTML = `
    <ellipse cx="200" cy="165" rx="188" ry="152" fill="#f7b3c9"/>
    <ellipse cx="200" cy="165" rx="168" ry="132" fill="#7e2440"/>
    <ellipse cx="200" cy="232" rx="88" ry="42" fill="#e4718f"/>
    <path d="M200 205v40" stroke="#c9587a" stroke-width="3" stroke-linecap="round"/>
    <g id="teeth"></g>
    <g id="germs"></g>
    <g id="sparkles"></g>
    <g id="brushG" opacity="0">
      <rect x="-8" y="-150" width="16" height="130" rx="8" fill="#ff3d8b"/>
      <rect x="-13" y="-22" width="26" height="44" rx="7" fill="#fff" stroke="#5b3a26" stroke-width="2"/>
      <rect x="-10" y="-18" width="20" height="36" rx="3" fill="#bfe6ff"/>
      <g class="foam"><circle cx="-18" cy="-6" r="6" fill="#fff"/><circle cx="18" cy="4" r="5" fill="#fff"/><circle cx="-12" cy="14" r="4" fill="#fff"/><circle cx="14" cy="-14" r="3.5" fill="#fff"/></g>
    </g>`;
  const teethG = svg.querySelector('#teeth');
  const germG = svg.querySelector('#germs');
  const sparkG = svg.querySelector('#sparkles');
  const brushG = svg.querySelector('#brushG');
  const zoneTeeth = [[], [], [], []];
  const toothPos = [];
  const arch = (cx, cy, rx, ry, a0, a1, count, upper) => {
    for (let k = 0; k < count; k++) {
      const a = ((a0 + ((a1 - a0) * k) / (count - 1)) * Math.PI) / 180;
      const x = cx + rx * Math.cos(a), y = cy + ry * Math.sin(a);
      const mid = Math.abs(k - (count - 1) / 2);
      const w = mid < 1.5 ? 26 : mid < 3.5 ? 23 : 25, h = mid < 1.5 ? 36 : 32;
      const rect = document.createElementNS(NS, 'rect');
      Object.entries({ x: -w / 2, y: -h / 2, width: w, height: h, rx: 8, class: 'tt' }).forEach(([k2, v]) => rect.setAttribute(k2, v));
      rect.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${((a * 180) / Math.PI + 90).toFixed(1)})`);
      teethG.appendChild(rect);
      const zone = upper ? (x < 200 ? 0 : 1) : x >= 200 ? 2 : 3;
      zoneTeeth[zone].push(rect);
      toothPos.push({ x, y, zone });
    }
  };
  arch(200, 178, 140, 122, 194, 346, 14, true);
  arch(200, 152, 128, 108, 16, 164, 14, false);
  const ZC = [{ x: 105, y: 92, rot: -35 }, { x: 295, y: 92, rot: 35 }, { x: 290, y: 232, rot: 145 }, { x: 110, y: 232, rot: -145 }];

  // little plaque germs sitting on some teeth
  let germs = [];
  function placeGerms() {
    germG.innerHTML = '';
    germs = [];
    const spots = toothPos.map((p, k) => ({ ...p, k })).sort(() => Math.random() - 0.5).slice(0, 18);
    for (const p of spots) {
      const g = document.createElementNS(NS, 'g');
      g.setAttribute('class', 'pg');
      g.setAttribute('transform', `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`);
      g.innerHTML = '<g class="pg-in"><circle r="8.5" class="pg-b"/><circle cx="-3" cy="-1.5" r="1.6" fill="#2a1810"/><circle cx="3" cy="-1.5" r="1.6" fill="#2a1810"/><path d="M-3 3q3 2 6 0" stroke="#2a1810" stroke-width="1.3" fill="none" stroke-linecap="round"/></g>';
      germG.appendChild(g);
      germs.push({ el: g, zone: p.zone, x: p.x, y: p.y, gone: false });
    }
    germs.forEach((g) => (g.order = Math.random()));
  }
  function pop(g, byHand) {
    if (g.gone) return;
    g.gone = true;
    g.el.classList.add('pop');
    sparkleAt(g.x, g.y);
    if (byHand) sfx.pop();
    setTimeout(() => g.el.remove(), 500);
  }
  function sparkleAt(x, y, delay = 0) {
    const s = document.createElementNS(NS, 'text');
    s.textContent = '✦';
    s.setAttribute('x', x);
    s.setAttribute('y', y);
    s.setAttribute('class', 'tw');
    s.style.animationDelay = `${delay}ms`;
    sparkG.appendChild(s);
    setTimeout(() => s.remove(), 1600 + delay);
  }

  // rub germs away with a finger or the mouse
  let rubbing = false;
  const rub = (e) => {
    const el = document.elementFromPoint(e.clientX, e.clientY)?.closest?.('.pg');
    const g = el && germs.find((x) => x.el === el);
    if (g) pop(g, true);
  };
  svg.addEventListener('pointerdown', (e) => { rubbing = true; rub(e); });
  svg.addEventListener('pointermove', (e) => { if (rubbing || e.pointerType === 'mouse') rub(e); });
  addEventListener('pointerup', () => (rubbing = false));

  // weekly sticker chart
  const load = () => { try { return JSON.parse(localStorage.getItem('rajiea-brush') || '{}'); } catch { return {}; } };
  function drawWeek() {
    const log = load();
    const today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    ui.week.innerHTML = (isAr ? ['ن', 'ث', 'ر', 'خ', 'ج', 'س', 'ح'] : ['M', 'T', 'W', 'T', 'F', 'S', 'S']).map((d, k) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + k);
      const e = log[DAY(date)] || {};
      const isToday = DAY(date) === DAY(today);
      return `<div class="wd${isToday ? ' today' : ''}"><span>${d}</span><i class="${e.am ? 'on' : ''}" title="${t('Morning', 'الصبح')}">☀️</i><i class="${e.pm ? 'on' : ''}" title="${t('Night', 'بالليل')}">🌙</i></div>`;
    }).join('');
    let streak = 0;
    const d = new Date(today);
    if (!log[DAY(d)]) d.setDate(d.getDate() - 1);
    while (log[DAY(d)]) { streak++; d.setDate(d.getDate() - 1); }
    ui.streak.textContent = streak ? t(`${streak}-day streak — keep it going.`, `${streak} أيام ورا بعض — كمّل.`) : t('Finish a full 2 minutes to earn your first sticker.', 'كمّل دقيقتين كاملين علشان تاخد أول ستيكر.');
    return streak;
  }
  function award() {
    const log = load();
    const key = DAY();
    const slot = new Date().getHours() < 15 ? 'am' : 'pm';
    log[key] = { ...(log[key] || {}), [slot]: true };
    localStorage.setItem('rajiea-brush', JSON.stringify(log));
    return { slot, streak: drawWeek() };
  }

  const ring = ui.ring;
  const C = 2 * Math.PI * 52;
  ring.style.strokeDasharray = C;
  let state = 'idle', demo = false, elapsed = 0, last = 0, raf = 0, zone = -1, step = -1, halfSaid = false;
  const zoneSec = () => (demo ? 5 : 30);
  const total = () => zoneSec() * 4;
  const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  const coach = (t) => { ui.coach.textContent = t; ui.coach.parentElement.classList.remove('nudge'); void ui.coach.offsetWidth; ui.coach.parentElement.classList.add('nudge'); };

  function paint() {
    const p = Math.min(1, elapsed / total());
    ring.style.strokeDashoffset = C * (1 - p);
    ui.time.textContent = fmt(Math.ceil(total() - elapsed));
    const z = Math.min(3, Math.floor(elapsed / zoneSec()));
    const zp = (elapsed - z * zoneSec()) / zoneSec();
    zoneTeeth.forEach((list, k) => {
      const clean = state === 'done' || k < z ? 1 : k === z && state !== 'idle' ? zp : 0;
      list.forEach((r) => {
        r.style.fill = `color-mix(in srgb, #ffffff ${Math.round(clean * 100)}%, #efdcae)`;
        r.classList.toggle('active', k === z && state === 'running');
      });
    });
    ui.chips.forEach((c, k) => { c.classList.toggle('on', k === z && state !== 'idle' && state !== 'done'); c.classList.toggle('done', state === 'done' || k < z); });
    if (state === 'running') {
      // germs in the active zone disappear as the zone progresses
      const mine = germs.filter((g) => g.zone === z && !g.gone).sort((a, b) => a.order - b.order);
      const shouldBeGone = germs.filter((g) => g.zone === z).length * Math.min(1, zp * 1.15);
      const goneNow = germs.filter((g) => g.zone === z && g.gone).length;
      if (goneNow < Math.floor(shouldBeGone) && mine[0]) pop(mine[0]);
      const s = Math.min(2, Math.floor(zp * 3));
      if (z !== zone) {
        if (zone >= 0) { sfx.ding(); zoneTeeth[zone].forEach((r, k) => { if (k % 2 === 0) { const m = r.getAttribute('transform').match(/translate\(([-\d.]+) ([-\d.]+)\)/); sparkleAt(m[1], m[2], k * 40); } }); coach(t(`Lovely. Now ${ZONES[z].toLowerCase()}.`, `حلو. دلوقتي ${ZONES[z]}.`)); }
        zone = z;
        step = -1;
      }
      if (s !== step) {
        step = s;
        ui.zone.textContent = `${ZONES[z]} · ${STEPS[s]}`;
        ui.tip.textContent = STEP_TIPS[s];
        if (s > 0) sfx.key();
      }
      if (!halfSaid && p >= 0.5) { halfSaid = true; coach(t('Halfway there ✨', 'نص الطريق ✨')); }
    }
    const c = ZC[Math.max(0, z)];
    const t = performance.now() / 1000;
    const scrub = state === 'running' ? Math.sin(t * 18) * 9 : 0;
    brushG.setAttribute('transform', `translate(${c.x} ${c.y}) rotate(${c.rot + (step === 2 ? 90 : 0)}) translate(${scrub} 0)`);
    brushG.setAttribute('opacity', state === 'running' || state === 'paused' ? 1 : 0);
  }

  function loop(now) {
    if (state !== 'running') return;
    elapsed += Math.min(0.1, (now - last) / 1000);
    last = now;
    if (elapsed >= total()) { elapsed = total(); finish(); return; }
    paint();
    raf = requestAnimationFrame(loop);
  }

  function finish() {
    state = 'done';
    germs.forEach((g) => pop(g));
    paint();
    ui.time.textContent = '0:00';
    ui.zone.textContent = t('All done', 'خلصنا');
    ui.tip.textContent = t('Spit, don’t rinse — the fluoride keeps working for a while.', 'اتف ومتتمضمضش — الفلورايد بيفضل شغّال شوية.');
    ui.start.textContent = t('Brush again', 'اغسل تاني');
    sfx.tada();
    confettiFrom(svg, { count: 90 });
    if (demo) coach(t('That was the quick demo. The real thing is 2 minutes.', 'ده كان الديمو السريع. الحقيقي دقيقتين.'));
    else { const { slot, streak } = award(); coach(slot === 'am' ? t('Morning sticker earned ☀️', 'خدت ستيكر الصبح ☀️') : t('Night sticker earned 🌙', 'خدت ستيكر بالليل 🌙')); hooks.onComplete?.(streak); }
  }

  function begin(isDemo) {
    cancelAnimationFrame(raf);
    demo = isDemo;
    elapsed = 0; zone = -1; step = -1; halfSaid = false;
    placeGerms();
    state = 'running';
    ui.start.textContent = t('Pause', 'إيقاف');
    coach(isDemo ? t('Quick demo — 5 seconds per zone.', 'ديمو سريع — 5 ثواني لكل منطقة.') : t('Let’s go. Start top left, outer surfaces.', 'يلا بينا. ابدأ فوق شمال، الأسطح الخارجية.'));
    sfx.click();
    last = performance.now();
    raf = requestAnimationFrame(loop);
  }

  ui.start.addEventListener('click', () => {
    if (state === 'running') {
      state = 'paused';
      ui.start.textContent = t('Resume', 'كمّل');
      ui.zone.textContent = t('Paused', 'متوقف');
      cancelAnimationFrame(raf);
      paint();
      return;
    }
    if (state === 'paused') {
      state = 'running';
      ui.start.textContent = t('Pause', 'إيقاف');
      last = performance.now();
      raf = requestAnimationFrame(loop);
      return;
    }
    begin(false);
  });
  ui.demo.addEventListener('click', () => begin(true));
  ui.reset.addEventListener('click', () => {
    cancelAnimationFrame(raf);
    state = 'idle'; elapsed = 0; zone = -1; step = -1;
    placeGerms();
    ui.start.textContent = t('Start brushing', 'ابدأ الغسيل');
    ui.zone.textContent = t('Ready when you are', 'جاهزين لما تكون جاهز');
    ui.tip.textContent = STEP_TIPS[0];
    coach(t('Two minutes, four zones. I’ll guide you.', 'دقيقتين، أربع مناطق. وأنا معاك خطوة بخطوة.'));
    sfx.click();
    paint();
  });
  placeGerms();
  drawWeek();
  paint();
}
