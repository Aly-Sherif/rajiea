// The way in: a code screen first, then the site. The site's words, quiz and private
// parts are stored encrypted in assets/c.txt and only open with the right code.
// Once opened on a device, it stays open there.
import { CONFIG } from './config.js';
import { localize, applyStatic, t, restoreScroll, switchLang } from './i18n.js';
import { b64, toB64, openBox } from './vault.js';

const STORE = 'rajiea-pass';
const root = document.documentElement;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
applyStatic();

const bundle = fetch('assets/c.txt', { cache: 'no-cache' }).then((r) => r.json());
bundle.catch(() => {});

async function withRaw(raw) {
  const box = await bundle;
  const key = await crypto.subtle.importKey('raw', b64(raw), 'AES-GCM', false, ['decrypt']);
  return JSON.parse(await openBox(box, key));
}
async function withCode(code) {
  const box = await bundle;
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(code), 'PBKDF2', false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: b64(box.s), iterations: box.n || 250000, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, true, ['decrypt']);
  const data = JSON.parse(await openBox(box, key));
  try { localStorage.setItem(STORE, toB64(await crypto.subtle.exportKey('raw', key))); } catch {}
  return data;
}

async function start(data) {
  Object.assign(CONFIG, localize(data.cfg));
  CONFIG.notes = data.notes;
  if (data.css) {
    const st = document.createElement('style');
    st.textContent = data.css;
    document.head.appendChild(st);
  }
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
  // ask for the code: WhatsApp opens with the message ready — they just pick Rajiea's chat
  const ask = $('#gateAsk');
  const askText = t(
    `Hi Rajiea 💗${nameHi ? ` It’s ${nameHi}.` : ''} Could I have the code for rajiea.com? 🙈`,
    `Hi Rajiea 💗${nameHi ? ` Ana ${nameHi}.` : ''} Momken el code bta3 rajiea.com? 🙈`,
  );
  ask.href = `https://wa.me/?text=${encodeURIComponent(askText)}`;
  ask.addEventListener('click', () => { $('#gateMsg').textContent = t('Pick Rajiea’s chat and hit send 💌', 'Ekhtar chat Rajiea w dos send 💌'); });
  const clock = () => {
    const d = new Date();
    $('#gateTime').textContent = d.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit' });
    $('#gateDate').textContent = d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  };
  clock();
  const clockId = setInterval(clock, 15000);
  const dots = $$('.gate-dots i', g);
  const pad = $('.gate-pad', g);
  const msg = $('#gateMsg');
  let code = '', busy = false;
  const paint = () => dots.forEach((d, k) => d.classList.toggle('on', k < code.length));
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
      const data = await withCode(code);
      clearInterval(clockId);
      removeEventListener('keydown', onKey);
      pad.classList.remove('working');
      pad.classList.add('yes');
      setTimeout(() => {
        g.classList.add('open');
        root.classList.add('known');
      }, 260);
      // build the site once the door has opened, so the opening stays smooth
      setTimeout(() => { g.remove(); start(data); }, 1450);
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
    }
    else if (e.key === 'Backspace' && !busy) { code = code.slice(0, -1); paint(); }
  };
  addEventListener('keydown', onKey);
}

(async () => {
  let raw = null;
  try { raw = localStorage.getItem(STORE); } catch {}
  if (raw) {
    let data = null;
    try { data = await withRaw(raw); } catch { try { localStorage.removeItem(STORE); } catch {} }
    if (data) { await start(data); return; }
  }
  gate();
})();
