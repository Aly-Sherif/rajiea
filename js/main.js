import { CONFIG } from './config.js';
import { sfx, confetti, confettiFrom, sparkleTrail } from './fx.js';
import { initQuiz, initZapper, initBrush } from './games.js';

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
  rajiea.onPoke = () => sfx.boop();

  const MOVE_LINES = { wave: 'Hi there! 👋', jump: 'Wheee! 🎉', spin: 'Ta-da! 🌀', dance: 'The floss dance! 🎶', wink: '😉' };
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
  baby.onGiggle = () => sfx.giggle();
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
initQuiz($('#quiz'), CONFIG);
const zapper = initZapper($('#zap'));
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
});

// ── Envelope ──
const env = $('#envelope');
const note = CONFIG.note;
$('#letter').innerHTML = `
  <span class="l-greet">${note.greeting}</span>
  ${note.body.map((p) => `<span class="l-p">${p}</span>`).join('')}
  <span class="l-sign">${note.signoff}</span>`;
let opened = false;
env.addEventListener('click', () => {
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
const SEALED = { s: 'icmjGvQuVajfixIlAA+seA==', i: 'EH8zGfAlnDO3BimU', c: '31LQOUBAgERdUBS/G0pzLud5UCWsD1TjUWeLxdCGdg==' };
const b64 = (t) => Uint8Array.from(atob(t), (ch) => ch.charCodeAt(0));
async function unseal(code) {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(code), 'PBKDF2', false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: b64(SEALED.s), iterations: 250000, hash: 'SHA-256' },
    base, { name: 'AES-GCM', length: 256 }, false, ['decrypt'],
  );
  return new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64(SEALED.i) }, key, b64(SEALED.c)));
}

function openPad() {
  if ($('.vault')) return;
  const v = document.createElement('div');
  v.className = 'vault';
  v.setAttribute('role', 'dialog');
  v.setAttribute('aria-modal', 'true');
  v.setAttribute('aria-label', 'Code');
  v.innerHTML = `
    <div class="vault-card">
      <button type="button" class="vault-x" aria-label="Close">×</button>
      <div class="vault-dots" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
      <div class="vault-keys">
        ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => `<button type="button" data-d="${d}">${d}</button>`).join('')}
        <span></span><button type="button" data-d="0">0</button><button type="button" data-del aria-label="Delete">⌫</button>
      </div>
    </div>`;
  document.body.appendChild(v);
  requestAnimationFrame(() => v.classList.add('on'));
  const card = $('.vault-card', v);
  const dots = $$('.vault-dots i', v);
  let code = '', busy = false;
  const paint = () => dots.forEach((d, k) => d.classList.toggle('on', k < code.length));
  const close = () => {
    v.classList.remove('on');
    removeEventListener('keydown', onKey);
    setTimeout(() => v.remove(), 300);
  };
  const press = async (d) => {
    if (busy || code.length >= 4) return;
    code += d;
    sfx.key();
    paint();
    if (code.length < 4) return;
    busy = true;
    try {
      if (!window.crypto?.subtle) throw new Error('insecure');
      const text = await unseal(code);
      card.classList.add('opened');
      card.innerHTML = `<button type="button" class="vault-x" aria-label="Close">×</button><p class="vault-msg" lang="ar" dir="rtl"></p>`;
      $('.vault-msg', card).textContent = text;
      $('.vault-x', card).onclick = close;
      sfx.tada();
      confettiFrom(card, { count: 40, spread: 0.5 });
    } catch {
      card.classList.remove('shake');
      void card.offsetWidth;
      card.classList.add('shake');
      sfx.buzz();
      setTimeout(() => { code = ''; paint(); busy = false; }, 450);
    }
  };
  $$('[data-d]', v).forEach((b) => b.addEventListener('click', () => press(b.dataset.d)));
  $('[data-del]', v).addEventListener('click', () => { if (!busy) { code = code.slice(0, -1); paint(); } });
  $('.vault-x', v).addEventListener('click', close);
  v.addEventListener('click', (e) => { if (e.target === v) close(); });
  const onKey = (e) => {
    if (/^\d$/.test(e.key)) press(e.key);
    else if (e.key === 'Backspace' && !busy) { code = code.slice(0, -1); paint(); }
    else if (e.key === 'Escape') close();
  };
  addEventListener('keydown', onKey);
}

let taps = 0, tapTimer = 0;
$('#footTooth').addEventListener('click', () => {
  taps++;
  clearTimeout(tapTimer);
  tapTimer = setTimeout(() => (taps = 0), 900);
  if (taps >= 3) { taps = 0; openPad(); }
});
