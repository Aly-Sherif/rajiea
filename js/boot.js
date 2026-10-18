// The way in: one code screen, and the code decides which site opens.
// Every site's words and parts are stored encrypted in assets/*.txt and only open with the right code.
// A tab that has been let in stays in until it's closed; a device that has been let in can
// "continue" to Rajiea's site without typing.
import { CONFIG } from './config.js';
import { localize, applyStatic, t, isAr, restoreScroll, switchLang } from './i18n.js';
import { b64, toB64, openBox, openPad, openCard } from './vault.js';

const PUB = 'rajiea-pass';
const SESSION = 'rajiea-session';
const root = document.documentElement;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
applyStatic();

const getJSON = (url) => fetch(url).then((r) => { if (!r.ok) throw new Error(url); return r.json(); });
const files = { public: getJSON('assets/c.txt'), private: getJSON('assets/p.txt') };
Object.values(files).forEach((p) => p.catch(() => {}));
const importRaw = (raw) => crypto.subtle.importKey('raw', b64(raw), 'AES-GCM', false, ['decrypt']);
const session = {
  get() { try { return JSON.parse(sessionStorage.getItem(SESSION)); } catch { return null; } },
  set(kind, raw) { try { sessionStorage.setItem(SESSION, JSON.stringify({ m: kind, k: raw })); } catch {} },
  clear() { try { sessionStorage.removeItem(SESSION); } catch {} },
};
const remember = (raw) => { try { localStorage.setItem(PUB, raw); } catch {} };

// Log out: back to the code screen, and this device forgets it was let in, so a code is needed again.
function logout() {
  session.clear();
  try { localStorage.removeItem(PUB); } catch {}
  location.reload();
}
// One small button on every screen (above pop-ups too). The first tap asks, the second logs out.
function logoutButton() {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'rj-out';
  b.title = t('Log out', 'Khorog');
  b.setAttribute('aria-label', t('Log out', 'Khorog'));
  b.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4M15 8l4 4-4 4M19 12H9"/></svg><span>${t('Tap again to log out', 'Dos tany 3ashan tokhrog')}</span>`;
  let timer = 0;
  b.addEventListener('click', (e) => {
    e.stopPropagation();
    if (b.classList.contains('armed')) return logout();
    b.classList.add('armed');
    clearTimeout(timer);
    timer = setTimeout(() => b.classList.remove('armed'), 3500);
  });
  document.body.appendChild(b);
}

async function withRaw(kind, raw) {
  return JSON.parse(await openBox(await files[kind], await importRaw(raw)));
}
async function tryCode(kind, code) {
  const box = await files[kind];
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(code), 'PBKDF2', false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: b64(box.s), iterations: box.n || 250000, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, true, ['decrypt']);
  const data = JSON.parse(await openBox(box, key));
  return { kind, data, raw: toB64(await crypto.subtle.exportKey('raw', key)) };
}
const withCode = (code) => Promise.any([tryCode('public', code), tryCode('private', code)]);

function hideLoader() {
  const l = $('#loader');
  if (!l || l.classList.contains('done')) return;
  l.classList.add('done');
  setTimeout(() => l.remove(), 800);
}

async function start(kind, data) {
  const style = (css) => { if (!css) return; const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st); };
  logoutButton();
  if (kind === 'private') {
    root.classList.add('private');
    style(data.scss);
    style(data.css);
    const fx = await import('./fx.js');
    const api = {
      $, $$, t, isAr, openPad, openCard, D: data.D, privateMode: true,
      sfx: fx.sfx, confetti: fx.confetti, confettiFrom: fx.confettiFrom, startMusic: fx.startMusic,
      openFile: async (url, raw) => openBox(await getJSON(url), await importRaw(raw)),
      lock: logout,
      toPublic() { session.set('public', data.pub); remember(data.pub); location.reload(); },
      switchLang,
      ready: hideLoader,
    };
    try { new Function('api', data.smod)(api); } catch (e) { console.warn(e); }
    try { new Function('api', data.mod)(api); } catch (e) { console.warn(e); hideLoader(); }
    setTimeout(hideLoader, 4000);
    return;
  }
  Object.assign(CONFIG, localize(data.cfg));
  CONFIG.notes = data.notes;
  style(data.css);
  const main = await import('./main.js');
  try { new Function('api', data.mod)(main.api); } catch (e) { console.warn(e); }
  restoreScroll();
}

function gate() {
  const g = $('#gate');
  root.classList.remove('known');
  g.hidden = false;
  const hi = new URLSearchParams(location.search).get('hi');
  const nameHi = hi ? hi.replace(/[^\p{L}\p{N} '-]/gu, '').slice(0, 24).trim() : '';
  if (nameHi) $('#gateHi').textContent = t(`Hi ${nameHi} 👋`, `Ahlan ya ${nameHi} 👋`);
  $('[data-lang]', g)?.addEventListener('click', switchLang);
  const msg = $('#gateMsg');
  // ask for the code: WhatsApp opens with the message ready — they just pick Rajiea's chat
  const ask = $('#gateAsk');
  const askText = t(
    `Hi Rajiea 💗${nameHi ? ` It’s ${nameHi}.` : ''} Could I have the code for rajiea.com? 🙈`,
    `Hi Rajiea 💗${nameHi ? ` Ana ${nameHi}.` : ''} Momken el code bta3 rajiea.com? 🙈`,
  );
  ask.href = `https://wa.me/?text=${encodeURIComponent(askText)}`;
  ask.addEventListener('click', () => { msg.textContent = t('Pick Rajiea’s chat and hit send 💌', 'Ekhtar chat Rajiea w dos send 💌'); });
  const clock = () => {
    const d = new Date();
    $('#gateTime').textContent = d.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit' });
    $('#gateDate').textContent = d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  };
  clock();
  const clockId = setInterval(clock, 15000);
  const dots = $$('.gate-dots i', g);
  const pad = $('.gate-pad', g);
  let code = '', busy = false;
  const paint = () => dots.forEach((d, k) => d.classList.toggle('on', k < code.length));
  const enter = (kind, data, raw) => {
    clearInterval(clockId);
    removeEventListener('keydown', onKey);
    session.set(kind, raw);
    remember(kind === 'public' ? raw : data.pub);
    pad.classList.remove('working');
    pad.classList.add('yes');
    setTimeout(() => {
      g.classList.add('open');
      root.classList.add('known');
    }, 260);
    // build the site once the door has opened, so the opening stays smooth
    setTimeout(() => { g.remove(); start(kind, data); }, 1450);
  };
  // a device that has been here before can go straight to Rajiea's site
  let saved = null;
  try { saved = localStorage.getItem(PUB); } catch {}
  const go = $('#gateGo');
  if (saved && go) {
    go.hidden = false;
    go.addEventListener('click', async () => {
      if (busy) return;
      busy = true;
      try { enter('public', await withRaw('public', saved), saved); } catch { go.hidden = true; busy = false; try { localStorage.removeItem(PUB); } catch {} }
    });
  }
  const press = async (d) => {
    if (busy || code.length >= 4) return;
    code += d;
    paint();
    if (navigator.userActivation?.isActive) navigator.vibrate?.(8);
    if (code.length < 4) return;
    busy = true;
    pad.classList.add('working');
    try {
      if (!window.crypto?.subtle) throw new Error('insecure');
      const { kind, data, raw } = await withCode(code);
      enter(kind, data, raw);
    } catch {
      pad.classList.remove('working', 'shake');
      void pad.offsetWidth;
      pad.classList.add('shake');
      if (navigator.userActivation?.isActive) navigator.vibrate?.([30, 40, 30]);
      msg.textContent = t('Not quite — try again', 'La2 msh dah — garrab tany');
      setTimeout(() => { code = ''; paint(); busy = false; }, 500);
    }
  };
  $$('[data-k]', g).forEach((b) => b.addEventListener('click', () => press(b.dataset.k)));
  $('[data-kdel]', g).addEventListener('click', () => { if (!busy) { code = code.slice(0, -1); paint(); } });
  const onKey = (e) => {
    if (/^\d$/.test(e.key)) {
      const b = $(`[data-k="${e.key}"]`, g);
      b?.classList.add('hit');
      setTimeout(() => b?.classList.remove('hit'), 140);
      press(e.key);
    } else if (e.key === 'Backspace' && !busy) { code = code.slice(0, -1); paint(); }
  };
  addEventListener('keydown', onKey);
}

(async () => {
  const s = session.get();
  if (s?.m && s?.k) {
    let data = null;
    try { data = await withRaw(s.m, s.k); } catch { session.clear(); }
    if (data) { await start(s.m, data); return; }
  }
  gate();
})();
