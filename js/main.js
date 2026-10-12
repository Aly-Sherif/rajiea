import { CONFIG } from './config.js';
import { sfx, confetti, confettiFrom, startMusic } from './fx.js';
import { initQuiz, initZapper, initBrush } from './games.js';
import { egg } from './eggs.js';
import { openPad } from './vault.js';
import { t, isAr, switchLang } from './i18n.js';
import { initNotes } from './notes.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const fine = matchMedia('(pointer: fine)').matches;
const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
const esc = (x) => String(x).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ── Title letters & rotating tagline ──
const titleEn = $('#titleEn');
titleEn.innerHTML = [...CONFIG.name].map((ch, i) => `<span class="ch" style="--i:${i}">${ch}</span>`).join('');
$$('.ch', titleEn).forEach((el) => el.addEventListener('pointerenter', () => {
  el.classList.remove('jig');
  void el.offsetWidth;
  el.classList.add('jig');
}));
const rotator = $('#rotator');
rotator.textContent = CONFIG.taglines[0];
let tagIndex = 0;
setInterval(() => {
  if (document.hidden) return;
  tagIndex = (tagIndex + 1) % CONFIG.taglines.length;
  rotator.classList.add('out');
  setTimeout(() => {
    rotator.textContent = CONFIG.taglines[tagIndex];
    rotator.classList.remove('out');
  }, 320);
}, 2800);

// ── Sound & language ──
const soundBtn = $('#soundBtn');
const paintSound = () => {
  soundBtn.classList.toggle('off', sfx.muted);
  soundBtn.setAttribute('aria-label', sfx.muted ? t('Turn sound on', 'Sha88al el soot') : t('Turn sound off', 'E2fel el soot'));
};
soundBtn.addEventListener('click', () => {
  sfx.toggle();
  paintSound();
});
paintSound();
$('#langBtn').addEventListener('click', () => { sfx.click(); switchLang(); });

// ── Scroll progress, custom cursor, magnetic buttons ──
const bar = $('#progress');
let barQueued = false;
const paintBar = () => {
  barQueued = false;
  const max = document.documentElement.scrollHeight - innerHeight;
  bar.style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`;
};
addEventListener('scroll', () => { if (!barQueued) { barQueued = true; requestAnimationFrame(paintBar); } }, { passive: true });

if (fine && !calm) {
  const dot = $('#cursorDot'), ring = $('#cursorRing');
  document.body.classList.add('has-cursor');
  let mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my, live = false;
  addEventListener('pointermove', (e) => {
    mx = e.clientX; my = e.clientY;
    dot.style.transform = `translate(${mx}px, ${my}px)`;
    if (!live) { live = true; requestAnimationFrame(follow); }
    const hot = e.target.closest?.('a, button, [role="tab"], .fav, .q-opt, canvas, .cell, input, textarea, label');
    ring.classList.toggle('hot', !!hot);
  }, { passive: true });
  addEventListener('pointerdown', () => ring.classList.add('press'));
  addEventListener('pointerup', () => ring.classList.remove('press'));
  document.addEventListener('pointerleave', () => document.body.classList.add('cursor-away'));
  document.addEventListener('pointerenter', () => document.body.classList.remove('cursor-away'));
  function follow() {
    rx += (mx - rx) * 0.2;
    ry += (my - ry) * 0.2;
    ring.style.transform = `translate(${rx}px, ${ry}px)`;
    if (Math.abs(mx - rx) + Math.abs(my - ry) > 0.3) requestAnimationFrame(follow);
    else live = false;
  }
  $$('.magnet').forEach((b) => {
    b.addEventListener('pointermove', (e) => {
      const r = b.getBoundingClientRect();
      b.style.transform = `translate(${((e.clientX - r.left) / r.width - 0.5) * 12}px, ${((e.clientY - r.top) / r.height - 0.5) * 10}px)`;
    });
    b.addEventListener('pointerleave', () => { b.style.transform = ''; });
  });
}

// ── Orbit chips around the stage (her favourites) ──
$('#orbit').innerHTML = CONFIG.favourites.slice(0, 6).map((f, i) => `<span class="orb o${i}" style="--i:${i}"><i>${f.icon}</i>${esc(f.title)}</span>`).join('');

// ── 3D Rajiea + Little Rajiea ──
const hideLoader = () => {
  const l = $('#loader');
  if (!l || l.classList.contains('done')) return;
  l.classList.add('done');
  setTimeout(() => l.remove(), 800);
  document.body.classList.add('ready');
};
setTimeout(hideLoader, 6000);

let rajiea = null;
const LINES = {
  wave: t('Hi there 👋', 'Ahlan 👋'), jump: t('Whee!', 'Yeeeeh!'), spin: t('Ta-da ✨', 'Tada ✨'), dance: t('Dance break 🎶', 'Break ra2s 🎶'), wink: '😉',
  floss: t('The floss dance — dentist approved 🪥', 'Ra2set el khet — b mowaf2et el doctora 🪥'), candy: t('Is that… sugar? 😱', 'Dah… sokkar? 😱'), sneeze: t('Achoo! Excuse me 🤧', 'Hatshoo! Asfa 🤧'),
  selfie: t('Say cheese 📸', 'Ool cheese 📸'), matcha: t('Matcha o’clock 🍵', 'Wa2t el matcha 🍵'),
};
const OUTFIT_LINES = { clinic: t('Back to the clinic 🦷', 'Rag3a el 3eyada 🦷'), city: t('City day! 📱', 'Yom khroog! 📱'), cozy: t('Cozy mode ☁️', 'Cozy mode ☁️') };

try {
  const { createRajiea, createLittleRajiea, OUTFITS } = await import('./character.js');
  rajiea = createRajiea($('#stage'), { bubble: $('#bubble'), lines: CONFIG.bubbleLines, badge: `Dr. ${CONFIG.name}` });
  rajiea.onPop = () => sfx.pop();
  let pokes = [];
  rajiea.onPoke = () => {
    sfx.boop();
    const now = performance.now();
    pokes = [...pokes.filter((x) => now - x < 4000), now];
    if (pokes.length >= 7) {
      pokes = [];
      setTimeout(() => { rajiea.play('dizzy'); rajiea.say(t('Okay, okay — I’m ticklish 😂', 'Khalas khalas — ana btza8za8 😂'), 2800); egg('tickle'); }, 300);
    }
  };
  rajiea.onHold = () => { rajiea.play('blush'); rajiea.say(t('Hehe, stop it 🙈', 'Hihi, battal ba2a 🙈'), 2400); sfx.giggle(); egg('hold'); };
  rajiea.onSpin = () => { rajiea.play('dizzy'); rajiea.say(t('Woah… the room is spinning 😵‍💫', 'Eh dah… el donya btleff 😵‍💫'), 2600); sfx.whoosh(); egg('spinner'); };

  // selfies come out as polaroids
  let selfies = 0;
  const stageEl = $('#stage');
  rajiea.onSnap = () => {
    sfx.shutter();
    stageEl.classList.remove('flash');
    void stageEl.offsetWidth;
    stageEl.classList.add('flash');
    const src = rajiea.snap();
    const img = new Image();
    img.onload = () => {
      const cv = document.createElement('canvas');
      const S = 520;
      cv.width = S; cv.height = S;
      const g = cv.getContext('2d');
      const grd = g.createLinearGradient(0, 0, S, S);
      grd.addColorStop(0, '#ffe1ee'); grd.addColorStop(1, '#f7e6d6');
      g.fillStyle = grd;
      g.fillRect(0, 0, S, S);
      const k = Math.max(S / img.width, S / img.height) * 1.45;
      const w = img.width * k, h = img.height * k;
      g.drawImage(img, (S - w) / 2, -h * 0.02, w, h);
      const url = cv.toDataURL('image/jpeg', 0.9);
      const day = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      const p = document.createElement('a');
      p.className = 'polaroid';
      p.href = url;
      p.download = 'rajiea-selfie.jpg';
      p.style.setProperty('--r', `${(Math.random() - 0.5) * 18}deg`);
      p.style.setProperty('--x', `${(Math.random() - 0.5) * 30}px`);
      p.innerHTML = `<img src="${url}" alt="${t('A selfie with Rajiea', 'Selfie ma3a Rajiea')}"><span>${t('Rajiea', 'Rajiea')} · ${day}</span>`;
      p.title = t('Tap to save', 'Dos 3ashan te7fazha');
      stageEl.appendChild(p);
      const all = $$('.polaroid', stageEl);
      if (all.length > 3) all[0].remove();
      setTimeout(() => p.classList.add('gone'), 7000);
      setTimeout(() => p.remove(), 7800);
    };
    img.src = src;
    if (++selfies >= 3) egg('selfie');
  };

  const tried = new Set();
  $$('[data-move]').forEach((b) => b.addEventListener('click', () => {
    const m = b.dataset.move;
    rajiea.play(m);
    rajiea.say(LINES[m]);
    sfx.boop();
    tried.add(m);
    if (tried.size >= $$('[data-move]').length) egg('moves');
  }));

  const swatches = $$('[data-hijab]');
  const markSwatch = (hex) => swatches.forEach((s) => s.setAttribute('aria-checked', String(s.dataset.hijab.toLowerCase() === hex.toLowerCase())));
  const colours = new Set();
  let pinkTaps = 0, pinkTimer = 0;
  swatches.forEach((s) => s.addEventListener('click', () => {
    rajiea.setHijab(s.dataset.hijab);
    markSwatch(s.dataset.hijab);
    sfx.click();
    colours.add(s.dataset.hijab);
    if (colours.size >= swatches.length) egg('stylist');
    if (s.dataset.hijab === '#ff6fa8') {
      pinkTaps++;
      clearTimeout(pinkTimer);
      pinkTimer = setTimeout(() => (pinkTaps = 0), 1800);
      if (pinkTaps >= 3) {
        pinkTaps = 0;
        rajiea.setHijab('#ff1f8f');
        document.body.classList.add('hotpink');
        rajiea.play('dance');
        rajiea.say(t('HOT PINK. Always. 💗', 'Hot pink. Dayman 💗'), 3000);
        confetti({ x: innerWidth / 2, y: innerHeight / 3, count: 90, emoji: ['💗', '💖', '🩷'] });
        sfx.tada();
        egg('hotpink');
        setTimeout(() => document.body.classList.remove('hotpink'), 9000);
      }
    }
  }));

  const outfitsTried = new Set();
  $$('[data-outfit]').forEach((b) => b.addEventListener('click', () => {
    const name = b.dataset.outfit;
    rajiea.setOutfit(name);
    markSwatch(OUTFITS[name].hijab);
    $$('[data-outfit]').forEach((o) => o.setAttribute('aria-pressed', String(o === b)));
    rajiea.play('jump');
    rajiea.say(OUTFIT_LINES[name]);
    sfx.pop();
    outfitsTried.add(name);
    if (outfitsTried.size >= 3) egg('wardrobe');
  }));

  const zoomBtn = $('#zoomBtn');
  const paintZoom = (on) => {
    zoomBtn.textContent = on ? t('↩ Full body', '↩ El soora kamla') : t('🔍 Close-up', '🔍 2arrab');
    zoomBtn.setAttribute('aria-pressed', String(on));
  };
  paintZoom(false);
  zoomBtn.addEventListener('click', () => { paintZoom(rajiea.toggleClose()); sfx.click(); });

  // Little Rajiea is only built when she's about to scroll into view
  const babyStage = $('#babyStage');
  const lazy = new IntersectionObserver(([e]) => {
    if (!e.isIntersecting) return;
    lazy.disconnect();
    const baby = createLittleRajiea(babyStage, { bubble: $('#babyBubble'), lines: CONFIG.babyLines });
    let babyTaps = [];
    baby.onGiggle = () => {
      sfx.giggle();
      const now = performance.now();
      babyTaps = [...babyTaps.filter((x) => now - x < 5000), now];
      if (babyTaps.length >= 5) { babyTaps = []; egg('baby'); confettiFrom(babyStage, { count: 40, emoji: ['🧸', '💛', '✨'] }); }
    };
    $('#babyGiggle').addEventListener('click', () => baby.giggle());
  }, { rootMargin: '900px 0px' });
  lazy.observe(babyStage);

  requestAnimationFrame(() => requestAnimationFrame(() => {
    hideLoader();
    setTimeout(() => { rajiea.play('wave'); rajiea.say(CONFIG.bubbleLines[0], 3200); }, 700);
  }));
} catch (err) {
  console.warn('3D unavailable', err);
  document.body.classList.add('no3d');
  hideLoader();
}

// ── The pink banner pauses while you touch it, so things on it are easy to tap ──
{
  const track = $('.marquee .track');
  let resume = 0;
  $('.marquee').addEventListener('pointerdown', () => {
    track.style.animationPlayState = 'paused';
    clearTimeout(resume);
    resume = setTimeout(() => { track.style.animationPlayState = ''; }, 3500);
  });
}

// ── Scroll reveal, split headings & counters ──
$$('[data-split]').forEach((el) => {
  const words = el.textContent.trim().split(/\s+/);
  el.innerHTML = words.map((w, i) => `<span class="w" style="--i:${i}"><span>${esc(w)}</span></span>`).join(' ');
});
const reveal = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (!e.isIntersecting) continue;
    e.target.classList.add('in');
    reveal.unobserve(e.target);
    $$('[data-count]', e.target).forEach(countUp);
  }
}, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
$$('[data-reveal], [data-split], .foot-name').forEach((el) => reveal.observe(el));

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

// ── Tilt + holographic shine (ID card and tiles) ──
const tilt = (card, max = 10) => {
  if (!fine || calm) return;
  card.addEventListener('pointermove', (e) => {
    const r = card.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    card.style.setProperty('--rx', `${(-y * max).toFixed(2)}deg`);
    card.style.setProperty('--ry', `${(x * max * 1.2).toFixed(2)}deg`);
    card.style.setProperty('--mx', `${((x + 0.5) * 100).toFixed(1)}%`);
    card.style.setProperty('--my', `${((y + 0.5) * 100).toFixed(1)}%`);
  });
  card.addEventListener('pointerleave', () => {
    card.style.setProperty('--rx', '0deg');
    card.style.setProperty('--ry', '0deg');
  });
};
tilt($('#idCard'), 14);
$$('.fact').forEach((c) => tilt(c, 8));
// on phones the ID card shimmers as you scroll
if (!fine && !calm) {
  const card = $('#idCard');
  addEventListener('scroll', () => {
    const r = card.getBoundingClientRect();
    const p = Math.max(0, Math.min(1, 1 - r.top / innerHeight));
    card.style.setProperty('--mx', `${(p * 100).toFixed(1)}%`);
    card.style.setProperty('--my', `${(30 + p * 40).toFixed(1)}%`);
  }, { passive: true });
}

// ── Her favourite things ──
const FAV_FX = {
  tamer: { emoji: ['🎤', '🎶', '⭐'], say: t('Nagm El Geel 🎤', 'Nagm el Geel 🎤'), move: 'dance' },
  barca: { emoji: ['⚽', '💙', '❤️'], colors: ['#004d98', '#a50044', '#edbb00'], say: t('Visca Barça! 💙❤️', 'Visca Barça! 💙❤️'), move: 'jump' },
  matcha: { emoji: ['🍵', '🌿'], say: t('Matcha o’clock 🍵', 'Wa2t el matcha 🍵'), move: 'matcha' },
  capp: { emoji: ['☕', '🤎'], say: t('Extra foam, please ☕', 'Ra8wa zyada law sama7t ☕'), move: 'matcha' },
  tira: { emoji: ['🍰', '☕'], say: t('Okay… one bite 🙈', 'Khalas… 7etta so8ayara bas 🙈'), move: 'candy' },
  roz: { emoji: ['🍮', '✨'], say: t('The golden top is mine 🍮', 'El wesh el dahaby bta3y 🍮'), move: 'candy' },
  tawouk: { emoji: ['🥙', '✨'], say: t('Shish tawouk? Always a yes 🥙', 'Shish tawouk? Dayman aywa 🥙'), move: 'jump' },
  pink: { emoji: ['💗', '💖', '🩷'], say: t('Hot pink is a personality 💗', 'El hot pink shakhseya 💗'), move: 'spin' },
  snap: { emoji: ['📸', '✨'], say: t('Say cheese 📸', 'Ool cheese 📸'), move: 'selfie' },
};
$('#favs').innerHTML = CONFIG.favourites.map((f, i) => `
  <button type="button" class="fav fav-${f.id}" data-fav="${f.id}" data-reveal style="--d:${i % 3}">
    <span class="fav-icon" aria-hidden="true">${f.icon}</span>
    <span class="fav-art" aria-hidden="true"></span>
    <b>${esc(f.title)}</b>
    <small>${esc(f.text)}</small>
  </button>`).join('');
$$('[data-reveal]', $('#favs')).forEach((el) => reveal.observe(el));
$$('.fav').forEach((b) => b.addEventListener('click', () => {
  const fx = FAV_FX[b.dataset.fav] || {};
  b.classList.remove('boom');
  void b.offsetWidth;
  b.classList.add('boom');
  sfx.pop();
  confettiFrom(b, { count: 26, spread: 0.6, emoji: fx.emoji, colors: fx.colors });
  if (rajiea && fx.move) { rajiea.play(fx.move); rajiea.say(fx.say, 2600); }
}));

// ── Smile School: myth or fact ──
const mfGrid = $('#mfGrid');
const tips = CONFIG.tips;
$('#mfTotal').textContent = tips.length;
mfGrid.innerHTML = tips.map((tp, i) => `
  <div class="mf-card" data-reveal style="--d:${i % 4}" data-i="${i}">
    <div class="mf-inner">
      <div class="mf-face mf-front">
        <span class="mf-num">#${i + 1}</span>
        <p class="mf-claim">${esc(tp.claim)}</p>
        <div class="mf-btns">
          <button type="button" data-guess="myth">${t('Myth', 'Khorafa')}</button>
          <button type="button" data-guess="fact">${t('Fact', '7a2ee2a')}</button>
        </div>
      </div>
      <div class="mf-face mf-back ${tp.fact ? 'is-fact' : 'is-myth'}">
        <span class="mf-verdict">${tp.fact ? t('Fact ✓', '7a2ee2a ✓') : t('Myth ✗', 'Khorafa ✗')}</span>
        <p class="mf-result"></p>
        <p class="mf-why">${esc(tp.why)}</p>
        <button type="button" class="mf-flip">${t('Flip back', 'E2leb tany')}</button>
      </div>
    </div>
  </div>`).join('');
$$('[data-reveal]', mfGrid).forEach((el) => reveal.observe(el));
let mfScore = 0, mfDone = 0;
$$('.mf-card', mfGrid).forEach((card) => {
  const tp = tips[+card.dataset.i];
  $$('[data-guess]', card).forEach((b) => b.addEventListener('click', () => {
    if (card.classList.contains('answered')) { card.classList.add('flipped'); return; }
    const right = (b.dataset.guess === 'fact') === tp.fact;
    card.classList.add('answered', 'flipped', right ? 'got' : 'missed');
    card.dataset.badge = right ? t('Got it ✓', 'Sa7 ✓') : t('Missed', 'Fatetak');
    $('.mf-result', card).textContent = right ? t('You got it! 🎉', 'Sa7 3aleek! 🎉') : t('Not quite — here’s the truth:', 'Msh bel zabt — di el 7a2ee2a:');
    $$('[data-guess]', card).forEach((x) => (x.disabled = true));
    b.classList.add('picked');
    if (right) { mfScore++; sfx.ding(); confettiFrom(card, { count: 24, spread: 0.6 }); } else sfx.buzz();
    mfDone++;
    $('#mfScore').textContent = mfScore;
    if (mfDone === tips.length && mfScore === tips.length) {
      setTimeout(() => { sfx.tada(); confetti({ count: 160 }); egg('scholar'); }, 500);
    }
  }));
  $('.mf-flip', card).addEventListener('click', () => card.classList.toggle('flipped'));
  $('.mf-front', card).addEventListener('click', (e) => {
    if (card.classList.contains('answered') && !e.target.closest('button')) card.classList.add('flipped');
  });
});

// ── Games: tabs, quiz, zapper ──
initQuiz($('#quiz'), CONFIG, { onPerfect: () => egg('perfect') });
const zapper = initZapper($('#zap'), {
  onScore: (s, stats) => {
    if (s >= 25) egg('golden');
    if (stats?.candies >= 5) { egg('candy'); rajiea?.say(t('I saw that 👀🍬', 'Ana shoft dah 👀🍬'), 3000); }
  },
});
const tabs = $$('[role="tab"]');
const ink = $('.tab-ink');
const moveInk = (tab) => {
  if (!tab) return;
  ink.style.width = `${tab.offsetWidth}px`;
  ink.style.transform = `translateX(${tab.offsetLeft}px)`;
};
tabs.forEach((tab) => tab.addEventListener('click', () => {
  tabs.forEach((x) => {
    const on = x === tab;
    x.setAttribute('aria-selected', String(on));
    $(`#${x.getAttribute('aria-controls')}`).hidden = !on;
  });
  if (tab.id !== 'tab-zap') zapper.stop();
  moveInk(tab);
  sfx.click();
}));
const activeTab = () => tabs.find((x) => x.getAttribute('aria-selected') === 'true');
requestAnimationFrame(() => moveInk(tabs[0]));
addEventListener('resize', () => moveInk(activeTab()));
document.fonts?.ready.then(() => moveInk(activeTab()));

// ── Brush along ──
initBrush($('#mouth'), {
  ring: $('#bRing'), time: $('#bTime'), zone: $('#bZone'), tip: $('#bTip'), start: $('#bStart'), reset: $('#bReset'),
  demo: $('#bDemo'), coach: $('#bCoach'), week: $('#bWeek'), streak: $('#bStreak'), chips: $$('#bChips span'),
}, { onComplete: (streak) => { egg('clean'); if (streak >= 3) egg('streak'); } });

// ── Envelope ──
const env = $('#envelope');
const note = CONFIG.note;
$('#letter').innerHTML = `
  <span class="l-greet">${esc(note.greeting)}</span>
  ${note.body.map((p) => `<span class="l-p">${esc(p)}</span>`).join('')}
  <span class="l-sign">${esc(note.signoff)}</span>`;
let opened = 0;
env.addEventListener('click', () => {
  const open = !env.classList.contains('open');
  env.classList.toggle('open', open);
  env.setAttribute('aria-expanded', String(open));
  env.setAttribute('aria-label', open ? t('Close the letter', 'E2fel el gawab') : t('Open the letter', 'Efta7 el gawab'));
  if (open) {
    sfx.ding();
    if (!opened) setTimeout(() => confettiFrom(env, { count: 70, spread: 0.8 }), 450);
    if (++opened >= 5) egg('reader');
  } else sfx.click();
});

// ── Cairo's weather: a little chip under the welcome, and rain on the page when it rains in Cairo ──
import('./weather.js').then(async ({ cairoWeather, weatherFx, ICON }) => {
  const w = await cairoWeather();
  const LINES = {
    rain: t('Rain in Cairo — cozy matcha weather', 'Masr betmatar — gaw matcha w bataneya'),
    storm: t('Thunder in Cairo — stay in, stay cozy', 'Ra3d f masr — khallooko gowwa w dafyaneen'),
    clouds: t('Cloudy Cairo — cappuccino weather', 'Masr me8ayyema — gaw cappuccino'),
    hot: t('Boiling Cairo — iced matcha, then rinse 😉', 'Masr nar — iced matcha, w ba3deen madmada 😉'),
    clear: t('Sunny Cairo — smile, it suits you', 'Masr mshamsa — ebtesem, lay2a 3aleek'),
    night: t('Clear night over Cairo', 'Leila safya fo2 masr'),
    fog: t('Foggy Cairo — drive safe', 'Shabbora f masr — soo2 bel ra7a'),
    dust: t('Khamaseen in Cairo — windows up', 'Khamaseen f masr — e2fel el shebabeek'),
    cool: t('Cool breeze in Cairo — hoodie weather', 'Nesma sa2a f masr — gaw hoodie'),
  };
  const chip = $('#wxChip');
  if (chip) {
    chip.textContent = `${ICON[w.kind]} ${w.temp}° · ${LINES[w.kind]}`;
    chip.hidden = false;
  }
  weatherFx(w.kind);
}).catch(() => {});

// ── Notes for Rajiea ──
if (!CONFIG.notes) $$('a[href="#notes"]').forEach((a) => a.remove());
initNotes($('#notes'), { onWord: (text) => wordEggs(text, true), onSent: () => egg('pen') });

// ── Nav ──
const nav = $('#nav');
addEventListener('scroll', () => nav.classList.toggle('scrolled', scrollY > 20), { passive: true });
const links = $$('.nav-links a, .dock a');
const spy = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (!e.isIntersecting) continue;
    links.forEach((a) => a.classList.toggle('on', a.getAttribute('href') === `#${e.target.id}`));
  }
}, { rootMargin: '-45% 0px -50% 0px' });
['top', 'meet', 'favs-sec', 'tips', 'games', 'brush', 'notes'].forEach((id) => { const el = document.getElementById(id); if (el) spy.observe(el); });

// ── Easter eggs ──
const WORDS = [
  { id: 'name', re: /rajiea|راجيه|راجية/, run: () => { rajiea?.play('dance'); rajiea?.say(t('That’s me 💖', 'Di ana 💖'), 2600); confetti({ x: innerWidth / 2, y: innerHeight / 3, count: 60, emoji: ['💖', '✨'] }); } },
  { id: 'barca', re: /barca|barça|barsa|barshlona|visca|برشلون|برسا/, run: () => { rajiea?.play('jump'); rajiea?.say(t('Visca Barça! 💙❤️', 'Visca Barça! 💙❤️'), 3000); confetti({ count: 140, colors: ['#004d98', '#a50044', '#edbb00', '#004d98', '#a50044'] }); confetti({ count: 20, emoji: ['⚽'] }); sfx.tada(); } },
  { id: 'tamer', re: /tamer|تامر/, run: () => { rajiea?.play('dance'); rajiea?.say(t('Nagm El Geel 🎤', 'Nagm el Geel 🎤'), 3000); confetti({ count: 50, emoji: ['🎤', '🎶', '⭐', '🎵'] }); sfx.party(); } },
  { id: 'cafe', re: /matcha|macha|cappuccino|cappucino|kabtshino|ماتشا|كابتشينو|كابوتشينو/, run: () => { rajiea?.play('matcha'); rajiea?.say(t('Matcha or cappuccino? Both ☕🍵', 'Matcha walla cappuccino? El etneen ☕🍵'), 3000); confetti({ x: innerWidth / 2, y: -20, count: 50, emoji: ['🍵', '☕'] }); } },
  { id: 'sweet', re: /tiramisu|roz|rice pudding|تيراميسو|رز بلبن|رز باللبن/, run: () => { rajiea?.play('candy'); rajiea?.say(t('Okay… one bite 🙈', 'Khalas… 7etta so8ayara bas 🙈'), 3000); confetti({ x: innerWidth / 2, y: -20, count: 50, emoji: ['🍰', '🍮'] }); } },
  { id: 'tawouk', re: /tawouk|tawook|ta2ook|tawo2|dahan|طاووق|الدهان|الدهّان/, run: () => { rajiea?.play('jump'); rajiea?.say(t('Shish tawouk? Always a yes 🥙', 'Shish tawouk? Dayman aywa 🥙'), 3200); confetti({ x: innerWidth / 2, y: -20, count: 36, emoji: ['🥙', '✨'] }); } },
];
const fired = new Set();
function wordEggs(text, fromBox = false) {
  const s = text.toLowerCase();
  for (const w of WORDS) {
    if (!w.re.test(s) || fired.has(w.id)) continue;
    fired.add(w.id);
    egg(w.id);
    if (!fromBox) document.getElementById('top').scrollIntoView({ behavior: 'smooth' });
    w.run();
    return true;
  }
  return false;
}
// talk to her
const REPLIES = [
  { re: /^(hi|hey|hello|hiya|ahlan|ezay|izay|salam|اهلا|أهلا|هاي|هالو|السلام|سلام|ازيك|إزيك)/, move: 'wave', say: t('Hi! 👋 Happy you’re here.', 'Ahlan! 👋 Nawwart.') },
  { re: /how are you|how r u|3amla eh|3amel eh|akhbarek|akhbarak|عاملة ايه|عامله ايه|اخبارك|أخبارك|ازيك/, move: 'jump', say: t('Smiling, as always 😁', 'Bad7ak, zay kol yom 😁') },
  { re: /love|cute|pretty|beautiful|ba7eb|ba7ib|7elwa|amar|2amar|حب|حلوة|جميلة|عسل|قمر/, move: 'blush', say: t('Aww, stop it 🙈💗', 'Ya khabar… battal ba2a 🙈💗') },
  { re: /selfie|photo|picture|pic|sowar|soura|صور|سيلفي/, move: 'selfie', say: t('Say cheese 📸', 'Ool cheese 📸') },
  { re: /dance|party|er2os|ro2s|ارقص|رقص|حفلة/, move: 'dance', say: t('Dance break 🎶', 'Break ra2s 🎶') },
  { re: /candy|sugar|chocolate|sweet|sokkar|7alawyat|shokolata|حلويات|شوكولات|سكر|بونبون/, move: 'candy', say: t('Is that… sugar? 😱', 'Dah… sokkar? 😱') },
  { re: /tooth|teeth|dentist|brush|floss|snan|sena|ders|forsha|khet|سنان|سنة|ضرس|دكتور|فرشة|خيط/, move: 'floss', say: t('Floss tonight. I’ll know. 😌', 'Estakhdem el khet el naharda. Ha3raf. 😌') },
  { re: /bye|good ?night|tesba7y|tesba7|سلام|باي|تصبح|تصبحي/, move: 'wave', say: t('Bye! Brush before bed 🌙', 'Bye! E8sel snanak 2abl ma tenam 🌙') },
];
$('#chat').addEventListener('submit', (e) => {
  e.preventDefault();
  const input = e.target.elements.say;
  const text = input.value.trim();
  input.value = '';
  if (!text || !rajiea) return;
  sfx.boop();
  if (wordEggs(text, true)) return;
  const hitReply = REPLIES.find((r) => r.re.test(text.toLowerCase()));
  if (hitReply) { rajiea.play(hitReply.move); rajiea.say(hitReply.say, 3000); return; }
  rajiea.play('wink');
  rajiea.say(CONFIG.bubbleLines[Math.floor(Math.random() * CONFIG.bubbleLines.length)], 3000);
});
$('#chat').elements.say.addEventListener('input', (e) => wordEggs(e.target.value, true));

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
    typed = (typed + k).slice(-16);
    if (wordEggs(typed)) typed = '';
  }
});

// her name likes attention
let titleTaps = 0, titleTimer = 0;
$('.title').addEventListener('click', () => {
  titleTaps++;
  clearTimeout(titleTimer);
  titleTimer = setTimeout(() => (titleTaps = 0), 1500);
  if (titleTaps >= 5) {
    titleTaps = 0;
    const el = $('.title');
    el.classList.remove('shine');
    void el.offsetWidth;
    el.classList.add('shine');
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
    rajiea?.say(t('Party mode 🪩', 'Party mode 🪩'), 3000);
    egg('dj');
    setTimeout(() => document.body.classList.remove('party'), 6500);
  }
});

// friends: rajiea.com/?hi=Sara
const hi = new URLSearchParams(location.search).get('hi');
if (hi && rajiea) {
  const nameHi = hi.replace(/[^\p{L}\p{N} '-]/gu, '').slice(0, 24).trim();
  if (nameHi) setTimeout(() => { rajiea.play('wave'); rajiea.say(t(`Hi ${nameHi}! Welcome 💖`, `Ahlan ya ${nameHi}! Nawwart 💖`), 4200); egg('friend'); }, 4200);
}

// night owls and early birds
const hour = new Date().getHours();
if (hour < 5 && rajiea) setTimeout(() => { rajiea.say(t('It’s late — did you brush before bed? 🌙', 'El wa2t et2akhar — 8asalt snanak 2abl el nom? 🌙'), 4200); egg('night'); }, 8000);
if (hour >= 5 && hour < 7 && rajiea) setTimeout(() => { rajiea.play('matcha'); rajiea.say(t('Up early! Matcha first? 🍵☀️', 'Sa7y badry! Matcha el awel? 🍵☀️'), 4200); egg('early'); }, 8000);

// developers
console.log('%c🦷 Hi, curious one.', 'font: 600 18px Georgia, serif; color: #ff2e88');
console.log('%cYou found the back room. Try typing  floss()  and press Enter.', 'color: #8a5a44; font-size: 13px');
window.floss = () => {
  rajiea?.play('floss');
  rajiea?.say(t('The floss dance 🪥', 'Ra2set el khet 🪥'), 3000);
  egg('console');
  return '🪥 dentist approved';
};

// ── for the parts of the site that stay locked ──
export const api = {
  $, $$, sfx, confetti, confettiFrom, startMusic, openPad, t, isAr, egg, CONFIG,
  get rajiea() { return rajiea; },
};
