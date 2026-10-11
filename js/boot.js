// The way in: a code screen first, then the site. The site's words, quiz and private
// parts are stored encrypted in assets/c.txt and only open with the right code.
// Once opened on a device, it stays open there.
import { CONFIG } from './config.js';
import { localize, applyStatic, t, restoreScroll } from './i18n.js';
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
  if (nameHi) $('#gateHi').textContent = t(`Hi ${nameHi} 👋`, `أهلًا يا ${nameHi} 👋`);
  const clock = () => {
    const d = new Date();
    $('#gateTime').textContent = d.toLocaleTimeString(t('en-GB', 'ar-EG'), { hour: 'numeric', minute: '2-digit' });
    $('#gateDate').textContent = d.toLocaleDateString(t('en-GB', 'ar-EG'), { weekday: 'long', day: 'numeric', month: 'long' });
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
      g.classList.add('open');
      root.classList.add('known');
      setTimeout(() => { g.remove(); }, 1300);
      start(data);
    } catch {
      pad.classList.remove('working', 'shake');
      void pad.offsetWidth;
      pad.classList.add('shake');
      if (navigator.userActivation?.isActive) navigator.vibrate?.([30, 40, 30]);
      msg.textContent = t('Not quite — try again', 'مش ده — جرّب تاني');
      setTimeout(() => { code = ''; paint(); busy = false; }, 500);
    }
  };
  $$('[data-k]', g).forEach((b) => b.addEventListener('click', () => press(b.dataset.k)));
  $('[data-kdel]', g).addEventListener('click', () => { if (!busy) { code = code.slice(0, -1); paint(); } });
  const onKey = (e) => {
    if (/^\d$/.test(e.key)) press(e.key);
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
