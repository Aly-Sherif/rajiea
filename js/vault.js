// A small code pad. Whatever sits behind it is encrypted; nothing readable lives in this file.
import { sfx } from './fx.js';
import { t } from './i18n.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const b64 = (s) => Uint8Array.from(atob(s.trim()), (ch) => ch.charCodeAt(0));
export const toB64 = (buf) => {
  const bytes = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
};

// keys are slow to make on purpose, so each one is made once per visit
const keys = new Map();
export function deriveKey(code, salt, iterations = 250000, extractable = false) {
  const id = `${salt}|${code}|${iterations}|${extractable}`;
  if (!keys.has(id)) {
    const p = (async () => {
      const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(code), 'PBKDF2', false, ['deriveKey']);
      return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: b64(salt), iterations, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, extractable, ['decrypt']);
    })();
    keys.set(id, p);
  }
  return keys.get(id);
}
export async function openBox(box, key) {
  return new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64(box.i) }, key, b64(box.c)));
}
export async function unseal(box, code) {
  return openBox(box, await deriveKey(code, box.s, box.n || 250000));
}

const fetchBox = (url) => fetch(url).then((r) => { if (!r.ok) throw new Error('missing'); return r.text(); }).then((x) => JSON.parse(x));

// source: a sealed box, or the address of one (fetched straight away, while the code is typed).
// render({ text, card, close, overlay }) shows what's inside.
export function openPad(source, render) {
  if ($('.vault')) return null;
  const boxReady = typeof source === 'string' ? fetchBox(source) : Promise.resolve(source);
  boxReady.catch(() => {});
  const v = document.createElement('div');
  v.className = 'vault';
  v.setAttribute('role', 'dialog');
  v.setAttribute('aria-modal', 'true');
  v.setAttribute('aria-label', t('Code', 'الكود'));
  v.innerHTML = `
    <div class="vault-card">
      <button type="button" class="vault-x" aria-label="${t('Close', 'إغلاق')}">×</button>
      <div class="vault-dots" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
      <div class="vault-keys" dir="ltr">
        ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => `<button type="button" data-d="${d}">${d}</button>`).join('')}
        <span></span><button type="button" data-d="0">0</button><button type="button" data-del aria-label="${t('Delete', 'مسح')}">⌫</button>
      </div>
    </div>`;
  document.body.appendChild(v);
  requestAnimationFrame(() => v.classList.add('on'));
  const card = $('.vault-card', v);
  const dots = $$('.vault-dots i', v);
  let code = '', busy = false;
  const paint = () => dots.forEach((d, k) => d.classList.toggle('on', k < code.length));
  const onKey = (e) => {
    e.stopPropagation();
    if (/^\d$/.test(e.key)) press(e.key);
    else if (e.key === 'Backspace' && !busy) { code = code.slice(0, -1); paint(); }
    else if (e.key === 'Escape') close();
  };
  const close = () => {
    v.classList.remove('on');
    removeEventListener('keydown', onKey, true);
    setTimeout(() => v.remove(), 300);
  };
  async function press(d) {
    if (busy || code.length >= 4) return;
    code += d;
    sfx.key();
    paint();
    if (code.length < 4) return;
    busy = true;
    card.classList.add('working');
    try {
      if (!window.crypto?.subtle) throw new Error('insecure');
      const text = await unseal(await boxReady, code);
      removeEventListener('keydown', onKey, true);
      card.classList.remove('working');
      card.innerHTML = `<button type="button" class="vault-x" aria-label="${t('Close', 'إغلاق')}">×</button>`;
      $('.vault-x', card).onclick = close;
      render({ text, card, close, overlay: v });
    } catch {
      card.classList.remove('working', 'shake');
      void card.offsetWidth;
      card.classList.add('shake');
      sfx.buzz();
      setTimeout(() => { code = ''; paint(); busy = false; }, 450);
    }
  }
  $$('[data-d]', v).forEach((b) => b.addEventListener('click', () => press(b.dataset.d)));
  $('[data-del]', v).addEventListener('click', () => { if (!busy) { code = code.slice(0, -1); paint(); } });
  $('.vault-x', v).addEventListener('click', close);
  v.addEventListener('click', (e) => { if (e.target === v && !v.classList.contains('stay')) close(); });
  addEventListener('keydown', onKey, true);
  return { close };
}
