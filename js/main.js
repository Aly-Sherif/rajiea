import { CONFIG } from './config.js';
import { sfx, confetti, confettiFrom, sparkleTrail } from './fx.js';
import { initQuiz, initZapper, initBrush } from './games.js';
import { egg } from './eggs.js';
import { openPad } from './vault.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const fine = matchMedia('(pointer: fine)').matches;
const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;

// ── Title letters & rotating tagline ──
const titleEn = $('#titleEn');
titleEn.innerHTML = [...CONFIG.name].map((ch, i) => `<span class="ch" style="--i:${i}">${ch}</span>`).join('');
$$('.ch', titleEn).forEach((el) => el.addEventListener('pointerenter', () => {
  el.classList.remove('jig');
  void el.offsetWidth;
  el.classList.add('jig');
}));

const rotator = $('#rotator');
let tagIndex = 0;
setInterval(() => {
  tagIndex = (tagIndex + 1) % CONFIG.taglines.length;
  rotator.classList.add('out');
  setTimeout(() => {
    rotator.textContent = CONFIG.taglines[tagIndex];
    rotator.classList.remove('out');
  }, 320);
}, 2600);

// ── Sound toggle ──
const soundBtn = $('#soundBtn');
const paintSound = () => {
  soundBtn.textContent = sfx.muted ? '🔇' : '🔊';
  soundBtn.setAttribute('aria-label', sfx.muted ? 'Turn sound on' : 'Turn sound off');
};
soundBtn.addEventListener('click', () => { sfx.toggle(); paintSound(); });
paintSound();

// ── 3D Rajiea + Little Rajiea ──
const hideLoader = () => {
  const l = $('#loader');
  if (!l || l.classList.contains('done')) return;
  l.classList.add('done');
  setTimeout(() => l.remove(), 700);
  document.body.classList.add('ready');
};
setTimeout(hideLoader, 5000);

let rajiea = null;
try {
  const { createRajiea, createLittleRajiea, OUTFITS } = await import('./character.js');
  rajiea = createRajiea($('#stage'), { bubble: $('#bubble'), lines: CONFIG.bubbleLines, badge: `Dr. ${CONFIG.name}` });
  rajiea.onPop = () => sfx.pop();
  let pokes = [];
  rajiea.onPoke = () => {
    sfx.boop();
    const now = performance.now();
    pokes = [...pokes.filter((t) => now - t < 4000), now];
    if (pokes.length >= 7) {
      pokes = [];
      setTimeout(() => { rajiea.play('dizzy'); rajiea.say('Okay, okay — I’m ticklish 😂', 2800); egg('tickle'); }, 300);
    }
  };
  rajiea.onHold = () => { rajiea.play('blush'); rajiea.say('Hehe, stop it 🙈', 2400); sfx.giggle(); egg('hold'); };

  const MOVE_LINES = { wave: 'Hi there 👋', jump: 'Whee!', spin: 'Ta-da ✨', dance: 'Dance break 🎶', wink: '😉', floss: 'The floss dance — dentist approved 🪥', candy: 'Is that… sugar? 😱', sneeze: 'Achoo! Excuse me 🤧' };
  $$('[data-move]').forEach((b) => b.addEventListener('click', () => {
    rajiea.play(b.dataset.move);
    rajiea.say(MOVE_LINES[b.dataset.move]);
    sfx.boop();
  }));

  const swatches = $$('[data-hijab]');
  const markSwatch = (hex) => swatches.forEach((s) => s.setAttribute('aria-checked', String(s.dataset.hijab.toLowerCase() === hex.toLowerCase())));
  swatches.forEach((s) => s.addEventListener('click', () => {
    rajiea.setHijab(s.dataset.hijab);
    markSwatch(s.dataset.hijab);
    sfx.click();
  }));

  const OUTFIT_LINES = { clinic: 'Back to the clinic 🦷', city: 'City day! 📱', cozy: 'Cozy mode ☁️' };
  $$('[data-outfit]').forEach((b) => b.addEventListener('click', () => {
    const name = b.dataset.outfit;
    rajiea.setOutfit(name);
    markSwatch(OUTFITS[name].hijab);
    $$('[data-outfit]').forEach((o) => o.setAttribute('aria-pressed', String(o === b)));
    rajiea.play('jump');
    rajiea.say(OUTFIT_LINES[name]);
    sfx.pop();
  }));

  const zoomBtn = $('#zoomBtn');
  zoomBtn.addEventListener('click', () => {
    const on = rajiea.toggleClose();
    zoomBtn.textContent = on ? '↩ Full body' : '🔍 Close-up';
    zoomBtn.setAttribute('aria-pressed', String(on));
    sfx.click();
  });

  const baby = createLittleRajiea($('#babyStage'), { bubble: $('#babyBubble'), lines: CONFIG.babyLines });
  let babyTaps = [];
  baby.onGiggle = () => {
    sfx.giggle();
    const now = performance.now();
    babyTaps = [...babyTaps.filter((t) => now - t < 5000), now];
    if (babyTaps.length >= 5) { babyTaps = []; egg('baby'); confettiFrom($('#babyStage'), { count: 40, emoji: ['🧸', '💛', '✨'] }); }
  };
  $('#babyGiggle').addEventListener('click', () => baby.giggle());

  requestAnimationFrame(() => requestAnimationFrame(() => {
    hideLoader();
    setTimeout(() => { rajiea.play('wave'); rajiea.say(CONFIG.bubbleLines[0], 3200); }, 650);
  }));
} catch (err) {
  console.warn('3D unavailable', err);
  document.body.classList.add('no3d');
  hideLoader();
}

// ── Scroll reveal & counters ──
const reveal = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (!e.isIntersecting) continue;
    e.target.classList.add('in');
    reveal.unobserve(e.target);
    $$('[data-count]', e.target).forEach(countUp);
  }
}, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
$$('[data-reveal]').forEach((el) => reveal.observe(el));

function countUp(el) {
  const target = +el.dataset.count;
  const suffix = el.dataset.suffix || '';
  const t0 = performance.now();
  const step = (now) => {
    const p = Math.min(1, (now - t0) / 1400);
    el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3))) + suffix;
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// ── Gentle 3D tilt on the fact cards ──
if (fine && !calm) {
  $$('.fact').forEach((card) => {
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      card.style.setProperty('--rx', `${(-y * 10).toFixed(2)}deg`);
      card.style.setProperty('--ry', `${(x * 12).toFixed(2)}deg`);
      card.style.setProperty('--mx', `${((x + 0.5) * 100).toFixed(1)}%`);
      card.style.setProperty('--my', `${((y + 0.5) * 100).toFixed(1)}%`);
    });
    card.addEventListener('pointerleave', () => {
      card.style.setProperty('--rx', '0deg');
      card.style.setProperty('--ry', '0deg');
    });
  });
}

// ── Smile School: myth or fact ──
const mfGrid = $('#mfGrid');
const tips = CONFIG.tips;
$('#mfTotal').textContent = tips.length;
mfGrid.innerHTML = tips.map((t, i) => `
  <div class="mf-card" data-reveal style="--d:${i % 4}" data-i="${i}">
    <div class="mf-inner">
      <div class="mf-face mf-front">
        <span class="mf-num">#${i + 1}</span>
        <p class="mf-claim">${t.claim}</p>
        <div class="mf-btns">
          <button type="button" data-guess="myth">Myth</button>
          <button type="button" data-guess="fact">Fact</button>
        </div>
      </div>
      <div class="mf-face mf-back ${t.fact ? 'is-fact' : 'is-myth'}">
        <span class="mf-verdict">${t.fact ? 'Fact ✓' : 'Myth ✗'}</span>
        <p class="mf-result"></p>
        <p class="mf-why">${t.why}</p>
        <button type="button" class="mf-flip">Flip back</button>
      </div>
    </div>
  </div>`).join('');
$$('[data-reveal]', mfGrid).forEach((el) => reveal.observe(el));
let mfScore = 0, mfDone = 0;
$$('.mf-card', mfGrid).forEach((card) => {
  const t = tips[+card.dataset.i];
  $$('[data-guess]', card).forEach((b) => b.addEventListener('click', () => {
    if (card.classList.contains('answered')) { card.classList.add('flipped'); return; }
    const right = (b.dataset.guess === 'fact') === t.fact;
    card.classList.add('answered', 'flipped', right ? 'got' : 'missed');
    $('.mf-result', card).textContent = right ? 'You got it! 🎉' : 'Not quite — here’s the truth:';
    $$('[data-guess]', card).forEach((x) => (x.disabled = true));
    b.classList.add('picked');
    if (right) { mfScore++; sfx.ding(); confettiFrom(card, { count: 24, spread: 0.6 }); } else sfx.buzz();
    mfDone++;
    $('#mfScore').textContent = mfScore;
    if (mfDone === tips.length && mfScore === tips.length) {
      setTimeout(() => { sfx.tada(); confetti({ count: 160 }); }, 500);
    }
  }));
  $('.mf-flip', card).addEventListener('click', () => card.classList.toggle('flipped'));
  $('.mf-front', card).addEventListener('click', (e) => {
    if (card.classList.contains('answered') && !e.target.closest('button')) card.classList.add('flipped');
  });
});

// ── Games: tabs, quiz, zapper ──
initQuiz($('#quiz'), CONFIG, { onPerfect: () => egg('perfect') });
const zapper = initZapper($('#zap'), { onScore: (s) => { if (s >= 25) egg('golden'); } });
const tabs = $$('[role="tab"]');
const ink = $('.tab-ink');
const moveInk = (tab) => {
  ink.style.width = `${tab.offsetWidth}px`;
  ink.style.transform = `translateX(${tab.offsetLeft}px)`;
};
tabs.forEach((tab) => tab.addEventListener('click', () => {
  tabs.forEach((t) => {
    const on = t === tab;
    t.setAttribute('aria-selected', String(on));
    $(`#${t.getAttribute('aria-controls')}`).hidden = !on;
  });
  if (tab.id !== 'tab-zap') zapper.stop();
  moveInk(tab);
  sfx.click();
}));
requestAnimationFrame(() => moveInk(tabs[0]));
addEventListener('resize', () => moveInk(tabs.find((t) => t.getAttribute('aria-selected') === 'true')));
document.fonts?.ready.then(() => moveInk(tabs.find((t) => t.getAttribute('aria-selected') === 'true')));

// ── Brush along ──
initBrush($('#mouth'), {
  ring: $('#bRing'), time: $('#bTime'), zone: $('#bZone'), tip: $('#bTip'), start: $('#bStart'), reset: $('#bReset'),
  demo: $('#bDemo'), coach: $('#bCoach'), week: $('#bWeek'), streak: $('#bStreak'), chips: $$('#bChips span'),
});

// ── Envelope ──
const env = $('#envelope');
const note = CONFIG.note;
$('#letter').innerHTML = `
  <span class="l-greet">${note.greeting}</span>
  ${note.body.map((p) => `<span class="l-p">${p}</span>`).join('')}
  <span class="l-sign">${note.signoff}</span>`;
let opened = false;
let suppressEnvelope = false;
env.addEventListener('click', () => {
  if (suppressEnvelope) { suppressEnvelope = false; return; }
  const open = !env.classList.contains('open');
  env.classList.toggle('open', open);
  env.setAttribute('aria-expanded', String(open));
  env.setAttribute('aria-label', open ? 'Close the letter' : 'Open the letter');
  if (open) {
    sfx.ding();
    if (!opened) setTimeout(() => confettiFrom(env, { count: 70, spread: 0.8 }), 450);
    opened = true;
  } else sfx.click();
});

// ── Nav ──
const nav = $('#nav');
addEventListener('scroll', () => nav.classList.toggle('scrolled', scrollY > 20), { passive: true });
const links = $$('.nav-links a');
const spy = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (!e.isIntersecting) continue;
    links.forEach((a) => a.classList.toggle('on', a.getAttribute('href') === `#${e.target.id}`));
  }
}, { rootMargin: '-45% 0px -50% 0px' });
['meet', 'tips', 'games', 'brush'].forEach((id) => spy.observe(document.getElementById(id)));

sparkleTrail();

// ── (footer) ──
const BOX = {
  a: { s: 'icmjGvQuVajfixIlAA+seA==', i: 'EH8zGfAlnDO3BimU', c: '31LQOUBAgERdUBS/G0pzLud5UCWsD1TjUWeLxdCGdg==' },
  b: { s: '/7IoIz940bogJ2jVrLUEsQ==', i: 'xzG/dut0pxwFMmYW', c: '3j3FVvTEhO1eLhHrSKYlXDmmW8n1cV8lAnitqQdwzmxkzx84' },
  c: 'assets/blob.txt',
};

const multiTap = (el, n, gap, fn) => {
  let count = 0, timer = 0;
  el.addEventListener('click', (e) => {
    e.stopPropagation();
    count++;
    clearTimeout(timer);
    timer = setTimeout(() => (count = 0), gap);
    if (count >= n) { count = 0; fn(); }
  });
};
multiTap($('#footTooth'), 3, 900, () => openPad(BOX.a));
$$('.mk-dot').forEach((el) => multiTap(el, 3, 1200, () => openPad(BOX.c, 'story')));

// pressing and holding the wax seal for a few seconds
const seal = $('.seal');
let sealTimer = 0;
const sealCancel = () => clearTimeout(sealTimer);
seal.addEventListener('pointerdown', () => {
  sealCancel();
  sealTimer = setTimeout(() => { suppressEnvelope = true; openPad(BOX.b, 'kiss'); }, 2600);
});
['pointerup', 'pointerleave', 'pointercancel'].forEach((t) => seal.addEventListener(t, sealCancel));
seal.addEventListener('contextmenu', (e) => e.preventDefault());

// ── Easter eggs ──
let typed = '';
const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
let kIndex = 0;
addEventListener('keydown', (e) => {
  if (e.target.closest?.('input, textarea')) return;
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  kIndex = k === KONAMI[kIndex] ? kIndex + 1 : k === KONAMI[0] ? 1 : 0;
  if (kIndex === KONAMI.length) {
    kIndex = 0;
    egg('konami');
    sfx.tada();
    confetti({ x: innerWidth / 2, y: -20, count: 90, emoji: ['🦷', '✨', '🪥'] });
  }
  if (k.length === 1) {
    typed = (typed + k).slice(-6);
    if (typed === 'rajiea') {
      egg('name');
      rajiea?.play('dance');
      rajiea?.say('That’s me 💖', 2600);
      confetti({ x: innerWidth / 2, y: innerHeight / 3, count: 60, emoji: ['💖', '✨'] });
      document.getElementById('top').scrollIntoView({ behavior: 'smooth' });
    }
  }
});

// her name likes attention
let titleTaps = 0, titleTimer = 0;
$('#titleEn').addEventListener('click', () => {
  titleTaps++;
  clearTimeout(titleTimer);
  titleTimer = setTimeout(() => (titleTaps = 0), 1500);
  if (titleTaps >= 5) {
    titleTaps = 0;
    const t = $('.title');
    t.classList.remove('shine');
    void t.offsetWidth;
    t.classList.add('shine');
    egg('title');
    sfx.tada();
  }
});

// party mode: tap the sound button five times quickly
let djTaps = 0, djTimer = 0;
soundBtn.addEventListener('click', () => {
  djTaps++;
  clearTimeout(djTimer);
  djTimer = setTimeout(() => (djTaps = 0), 1600);
  if (djTaps >= 5) {
    djTaps = 0;
    if (sfx.muted) { sfx.toggle(); paintSound(); }
    document.body.classList.add('party');
    sfx.party();
    rajiea?.play('dance');
    rajiea?.say('Party mode 🪩', 3000);
    egg('dj');
    setTimeout(() => document.body.classList.remove('party'), 6500);
  }
});

// friends: rajiea.com/?hi=Sara
const hi = new URLSearchParams(location.search).get('hi');
if (hi && rajiea) {
  const nameHi = hi.replace(/[^\p{L}\p{N} '-]/gu, '').slice(0, 24).trim();
  if (nameHi) {
    setTimeout(() => { rajiea.play('wave'); rajiea.say(`Hi ${nameHi}! Welcome 💖`, 4200); egg('friend'); }, 4200);
  }
}

// night owls
const hour = new Date().getHours();
if (hour < 5 && rajiea) setTimeout(() => { rajiea.say('It’s late — did you brush before bed? 🌙', 4200); egg('night'); }, 8000);

// developers
console.log('%c🦷 Hi, curious one.', 'font: 600 18px Georgia, serif; color: #ff3d8b');
console.log('%cYou found the back room. Try typing  floss()  and press Enter.', 'color: #8a5a3b; font-size: 13px');
window.floss = () => {
  rajiea?.play('floss');
  rajiea?.say('The floss dance 🪥', 3000);
  egg('console');
  return '🪥 dentist approved';
};
