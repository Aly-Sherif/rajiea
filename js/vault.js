// A small code pad. Content behind it is encrypted; nothing readable lives in these files.
import { sfx, confetti, confettiFrom, startMusic } from './fx.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const b64 = (t) => Uint8Array.from(atob(t.trim()), (ch) => ch.charCodeAt(0));

async function unseal(box, code) {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(code), 'PBKDF2', false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: b64(box.s), iterations: 250000, hash: 'SHA-256' },
    base, { name: 'AES-GCM', length: 256 }, false, ['decrypt'],
  );
  return new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64(box.i) }, key, b64(box.c)));
}

const floatUp = (chars, n = 14) => {
  for (let k = 0; k < n; k++) {
    const f = document.createElement('span');
    f.className = 'kiss-float';
    f.textContent = chars[k % chars.length];
    f.style.left = `${6 + Math.random() * 88}vw`;
    f.style.setProperty('--dx', `${(Math.random() - 0.5) * 80}px`);
    f.style.animationDelay = `${Math.random() * 1.6}s`;
    f.style.fontSize = `${18 + Math.random() * 22}px`;
    document.body.appendChild(f);
    f.addEventListener('animationend', () => f.remove());
  }
};

// ── 1: a heart that grows with each tap, then the words write themselves ──
function love(card, text) {
  card.classList.add('opened', 'love');
  card.innerHTML = `
    <button type="button" class="vault-x" aria-label="Close">×</button>
    <button type="button" class="love-heart" aria-label="Tap the heart">❤️</button>
    <p class="love-hint" lang="ar" dir="rtl">اضغطي على القلب</p>
    <div class="love-meter" aria-hidden="true"><i></i></div>
    <p class="vault-msg" lang="ar" dir="rtl" hidden></p>`;
  const heartBtn = $('.love-heart', card);
  const meter = $('.love-meter i', card);
  const msg = $('.vault-msg', card);
  msg.textContent = text;
  let taps = 0;
  heartBtn.addEventListener('click', () => {
    taps++;
    sfx.pop();
    heartBtn.style.setProperty('--grow', 1 + taps * 0.14);
    heartBtn.classList.remove('beat');
    void heartBtn.offsetWidth;
    heartBtn.classList.add('beat');
    meter.style.width = `${Math.min(100, taps * 20)}%`;
    confettiFrom(heartBtn, { count: 8 + taps * 3, spread: 0.35, emoji: ['❤️', '💗'] });
    if (taps < 5) return;
    sfx.tada();
    confettiFrom(heartBtn, { count: 70, spread: 0.9, emoji: ['❤️', '💖', '💗', '✨'] });
    heartBtn.remove();
    $('.love-hint', card).remove();
    $('.love-meter', card).remove();
    msg.hidden = false;
    msg.classList.add('write');
    msg.addEventListener('click', () => { sfx.pop(); confettiFrom(msg, { count: 16, spread: 0.5, emoji: ['❤️', '💗'] }); });
    floatUp(['❤️', '💗', '💖'], 12);
  });
}

// ── 2: kisses float up, then she can send them back by tapping ──
function kiss(card, text, overlay) {
  card.classList.add('opened', 'kiss');
  card.innerHTML = `
    <button type="button" class="vault-x" aria-label="Close">×</button>
    <span class="kiss-lips">💋</span>
    <p class="vault-msg write" lang="ar" dir="rtl"></p>
    <p class="kiss-hint" lang="ar" dir="rtl">دورك… اضغطي في أي حتة وابعتي واحدة 💋</p>
    <p class="kiss-count" aria-live="polite"></p>`;
  $('.vault-msg', card).textContent = text;
  sfx.kiss();
  floatUp(['💋', '💋', '❤️'], 16);
  let sent = 0;
  const count = $('.kiss-count', card);
  overlay.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.vault-x')) return;
    sent++;
    sfx.kiss();
    const m = document.createElement('span');
    m.className = 'kiss-mark';
    m.textContent = '💋';
    m.style.left = `${e.clientX}px`;
    m.style.top = `${e.clientY}px`;
    m.style.setProperty('--r', `${(Math.random() - 0.5) * 50}deg`);
    overlay.appendChild(m);
    setTimeout(() => m.remove(), 2600);
    count.textContent = sent >= 10 ? `💋 × ${sent} — كفاية كده 😳` : `💋 × ${sent}`;
  });
}

// ── 3: the story — a ticket to tear, then scenes like stories ──
function story(data) {
  const o = document.createElement('div');
  o.className = 'story';
  o.setAttribute('role', 'dialog');
  o.setAttribute('aria-modal', 'true');
  o.innerHTML = `
    <style>${data.css}</style>
    <div class="ticket" role="button" tabindex="0">
      <div class="ticket-l"><span>${data.intro.top}</span><b>${data.intro.title}</b><em>${data.intro.sub}</em><i lang="ar" dir="rtl">${data.intro.ar}</i></div>
      <div class="ticket-r"><span>№ 001</span><b>❤</b></div>
      <p class="ticket-tear">${data.intro.tear}</p>
    </div>
    <div class="story-main" hidden>
      <div class="story-bars">${data.scenes.map(() => '<i><b></b></i>').join('')}</div>
      <div class="story-top"><button type="button" class="story-sound" aria-label="Music">♪</button><button type="button" class="story-x" aria-label="Close">×</button></div>
      <div class="story-stage"><div class="st"></div><div class="story-bubble"></div></div>
      <div class="story-text"><h3></h3><p class="story-en"></p><p class="story-ar" lang="ar" dir="rtl"></p><p class="story-hint"></p><div class="story-end" hidden><button type="button" class="btn btn-pink" data-replay-all>Watch again</button><button type="button" class="btn btn-cream" data-close>Close</button></div></div>
      <div class="story-nav"><button type="button" data-prev aria-label="Previous">‹</button><button type="button" data-pause aria-label="Pause">❚❚</button><button type="button" data-next aria-label="Next">›</button></div>
    </div>`;
  document.body.appendChild(o);
  document.documentElement.classList.add('story-open');
  requestAnimationFrame(() => o.classList.add('on'));

  const scenes = data.scenes;
  const main = $('.story-main', o);
  const st = $('.st', o);
  const bubble = $('.story-bubble', o);
  const bars = $$('.story-bars b', o);
  let i = 0, t0 = 0, dur = 8000, paused = false, pausedAt = 0, raf = 0, typing = 0, music = null, done = false;

  const close = () => {
    cancelAnimationFrame(raf);
    clearInterval(typing);
    music?.stop();
    o.classList.remove('on');
    document.documentElement.classList.remove('story-open');
    removeEventListener('keydown', onKey, true);
    setTimeout(() => o.remove(), 400);
  };

  function show(k) {
    i = Math.max(0, Math.min(scenes.length - 1, k));
    const s = scenes[i];
    st.classList.remove('in');
    void st.offsetWidth;
    st.innerHTML = `<svg viewBox="0 0 360 300" role="img" aria-label="${s.title}">${s.svg}</svg>`;
    st.classList.add('in');
    $('.story-text h3', o).textContent = s.title;
    $('.story-ar', o).textContent = s.ar;
    $('.story-hint', o).textContent = s.hint ? `✦ ${s.hint}` : '';
    const en = $('.story-en', o);
    clearInterval(typing);
    en.textContent = '';
    let c = 0;
    typing = setInterval(() => { en.textContent = s.en.slice(0, ++c); if (c >= s.en.length) clearInterval(typing); }, 24);
    bars.forEach((b, k) => (b.style.width = k < i ? '100%' : '0%'));
    const last = i === scenes.length - 1;
    $('.story-end', o).hidden = !last;
    dur = 6500 + s.en.length * 35;
    t0 = performance.now();
    pausedAt = 0;
    done = false;
    sfx.key();
  }
  function tick(now) {
    if (!paused) {
      const p = Math.min(1, (now - t0) / dur);
      bars[i].style.width = `${p * 100}%`;
      if (p >= 1 && !done) {
        done = true;
        if (i < scenes.length - 1) show(i + 1);
      }
    }
    raf = requestAnimationFrame(tick);
  }
  const setPaused = (v) => {
    if (v === paused) return;
    paused = v;
    $('[data-pause]', o).textContent = v ? '▶' : '❚❚';
    if (v) pausedAt = performance.now();
    else t0 += performance.now() - pausedAt;
  };
  let holdTimer = 0;
  const nudgePause = () => {
    setPaused(true);
    clearTimeout(holdTimer);
    holdTimer = setTimeout(() => setPaused(false), 4500);
  };

  // tappable things inside each scene
  st.addEventListener('click', (e) => {
    const sayEl = e.target.closest('[data-say]');
    const replayEl = e.target.closest('[data-replay]');
    const burstEl = e.target.closest('[data-burst]');
    if (!sayEl && !replayEl && !burstEl) return;
    nudgePause();
    if (replayEl) {
      const target = replayEl.dataset.target ? st.querySelector(replayEl.dataset.target) : replayEl;
      (target || replayEl).getAnimations?.({ subtree: true }).forEach((a) => { a.cancel(); a.play(); });
    }
    if (burstEl) { sfx.pop(); confetti({ x: e.clientX, y: e.clientY, count: 22, spread: 0.5, emoji: ['❤️', '💗', '✨'] }); }
    if (sayEl) {
      const r = st.getBoundingClientRect();
      bubble.textContent = sayEl.dataset.say;
      bubble.style.left = `${e.clientX - r.left}px`;
      bubble.style.top = `${e.clientY - r.top}px`;
      bubble.classList.remove('show');
      void bubble.offsetWidth;
      bubble.classList.add('show');
      sfx.boop();
    }
  });

  // swipe on the picture
  let sx = null;
  st.addEventListener('pointerdown', (e) => (sx = e.clientX));
  st.addEventListener('pointerup', (e) => {
    if (sx === null) return;
    const dx = e.clientX - sx;
    sx = null;
    if (Math.abs(dx) > 50) show(i + (dx < 0 ? 1 : -1));
  });

  $('[data-prev]', o).onclick = () => show(i - 1);
  $('[data-next]', o).onclick = () => show(i + 1);
  $('[data-pause]', o).onclick = () => setPaused(!paused);
  $('.story-x', o).onclick = close;
  $('[data-close]', o).onclick = close;
  $('[data-replay-all]', o).onclick = () => show(0);
  const soundBtn = $('.story-sound', o);
  soundBtn.onclick = () => {
    if (music) { music.stop(); music = null; soundBtn.classList.add('off'); }
    else { music = startMusic(); soundBtn.classList.remove('off'); }
  };
  const onKey = (e) => {
    e.stopPropagation();
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowRight') show(i + 1);
    else if (e.key === 'ArrowLeft') show(i - 1);
    else if (e.key === ' ') { e.preventDefault(); setPaused(!paused); }
  };
  addEventListener('keydown', onKey, true);

  const ticket = $('.ticket', o);
  const begin = () => {
    if (ticket.classList.contains('torn')) return;
    ticket.classList.add('torn');
    sfx.tada();
    music = startMusic();
    setTimeout(() => {
      ticket.remove();
      main.hidden = false;
      show(0);
      raf = requestAnimationFrame(tick);
    }, 900);
  };
  ticket.addEventListener('click', begin);
  ticket.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); begin(); } });
}

// ── The pad ──
export function openPad(box, style) {
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
    removeEventListener('keydown', onKey, true);
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
      const sealed = typeof box === 'string' ? JSON.parse(await (await fetch(box)).text()) : box;
      const text = await unseal(sealed, code);
      removeEventListener('keydown', onKey, true);
      if (style === 'story') { close(); story(JSON.parse(text)); return; }
      if (style === 'kiss') kiss(card, text, v);
      else love(card, text);
      $('.vault-x', card).onclick = close;
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
  v.addEventListener('click', (e) => { if (e.target === v && !card.classList.contains('kiss')) close(); });
  const onKey = (e) => {
    e.stopPropagation();
    if (/^\d$/.test(e.key)) press(e.key);
    else if (e.key === 'Backspace' && !busy) { code = code.slice(0, -1); paint(); }
    else if (e.key === 'Escape') close();
  };
  addEventListener('keydown', onKey, true);
}
