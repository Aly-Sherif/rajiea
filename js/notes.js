// Notes for Rajiea. Each note is locked on the sender's device with Rajiea's public key
// before it leaves, so the database only ever holds scrambled text. Only her code opens them.
import { CONFIG } from './config.js';
import { t, isAr } from './i18n.js';
import { sfx, confettiFrom } from './fx.js';
import { openPad, b64, toB64 } from './vault.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (x) => String(x).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ECDH = { name: 'ECDH', namedCurve: 'P-256' };
const STICKERS = ['💖', '🌸', '✨', '🦷', '☕', '🍵', '⚽', '🎤', '📸', '🍰'];
const LIMIT = 'rajiea-notes-sent';

async function seal(obj, pub) {
  const her = await crypto.subtle.importKey('jwk', pub, ECDH, false, []);
  const eph = await crypto.subtle.generateKey(ECDH, true, ['deriveKey']);
  const key = await crypto.subtle.deriveKey({ name: 'ECDH', public: her }, eph.privateKey, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify(obj)));
  return { epk: toB64(await crypto.subtle.exportKey('raw', eph.publicKey)), iv: toB64(iv), ct: toB64(ct) };
}
async function unsealNote(row, priv) {
  const pub = await crypto.subtle.importKey('raw', b64(row.epk), ECDH, false, []);
  const key = await crypto.subtle.deriveKey({ name: 'ECDH', public: pub }, priv, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64(row.iv) }, key, b64(row.ct));
  return JSON.parse(new TextDecoder().decode(pt));
}

// the store only has two doors, both needing the notes room key: put a note in, read them back
const rpc = (cfg, fn, args) => fetch(`${cfg.url}/rest/v1/rpc/${fn}`, {
  method: 'POST',
  headers: { apikey: cfg.key, Authorization: `Bearer ${cfg.key}`, 'Content-Type': 'application/json' },
  body: JSON.stringify(args),
});

export function initNotes(root, hooks = {}) {
  const cfg = CONFIG.notes;
  if (!root) return;
  if (!cfg || !window.crypto?.subtle) { root.hidden = true; return; }
  // stay out of sight until the store answers, so a send can never fail in front of a friend
  root.hidden = true;
  rpc(cfg, 'rajiea_get', { room: cfg.room, after: 9e15 }).then((r) => {
    if (r.ok) root.hidden = false;
    else $$('a[href="#notes"]').forEach((x) => x.remove());
  }).catch(() => $$('a[href="#notes"]').forEach((x) => x.remove()));
  const form = $('#noteForm', root);
  const msg = form.elements.msg;
  const from = form.elements.from;
  const count = $('.nf-count', form);
  const status = $('.nf-status', root);
  const paper = $('.nf-paper', form);
  $('.nf-stickers', form).innerHTML = STICKERS.map((s, i) => `<label><input type="radio" name="sticker" value="${s}"${i === 0 ? ' checked' : ''}><span>${s}</span></label>`).join('');
  const say = (text, kind = '') => { status.textContent = text; status.dataset.kind = kind; };
  msg.addEventListener('input', () => {
    count.textContent = `${msg.value.length}/600`;
    hooks.onWord?.(msg.value);
  });
  from.addEventListener('input', () => hooks.onWord?.(from.value));

  let sending = false;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (sending) return;
    const text = msg.value.trim();
    if (!text) { say(t('Write something first ✍️', 'Ekteb 7aga el awel ✍️'), 'warn'); msg.focus(); return; }
    let sent = [];
    try { sent = JSON.parse(localStorage.getItem(LIMIT) || '[]').filter((x) => Date.now() - x < 3600e3); } catch {}
    if (sent.length >= 5) { say(t('That’s a lot of love for one hour — try again later 💕', 'Dah 7ob keteer f sa3a wa7da — garrab ba3deen 💕'), 'warn'); return; }
    sending = true;
    say(t('Sealing and sending…', 'Ben2felha w neb3atha…'));
    try {
      const body = await seal({ n: from.value.trim().slice(0, 40), m: text.slice(0, 600), s: form.elements.sticker.value, l: isAr ? 'ar' : 'en' }, cfg.pub);
      const r = await rpc(cfg, 'rajiea_put', { room: cfg.room, body: JSON.stringify(body) });
      if (!r.ok) throw new Error(String(r.status));
      sent.push(Date.now());
      try { localStorage.setItem(LIMIT, JSON.stringify(sent)); } catch {}
      sfx.whoosh();
      paper.classList.remove('fly');
      void paper.offsetWidth;
      paper.classList.add('fly');
      setTimeout(() => {
        form.reset();
        count.textContent = '0/600';
        paper.classList.remove('fly');
        paper.classList.add('back');
        setTimeout(() => paper.classList.remove('back'), 600);
      }, 1100);
      confettiFrom(paper, { count: 40, spread: 0.7, emoji: ['💌', '✨', '💖'] });
      say(t('Sent! Only she can read it 💌', 'Etba3atet! Heya bas elly te2dar te2raha 💌'), 'ok');
      hooks.onSent?.();
    } catch {
      say(t('Couldn’t send — try again in a bit.', 'Ma2dernash neb3atha — garrab kaman shwaya.'), 'warn');
      sfx.buzz();
    } finally {
      sending = false;
    }
  });

  // Rajiea's inbox
  $('#noteInbox', root).addEventListener('click', () => {
    openPad(cfg.box, async ({ text, close }) => {
      close();
      const priv = await crypto.subtle.importKey('jwk', JSON.parse(text), ECDH, false, ['deriveKey']);
      showInbox(cfg, priv);
    });
  });
}

function showInbox(cfg, priv) {
  const o = document.createElement('div');
  o.className = 'inbox';
  o.setAttribute('role', 'dialog');
  o.setAttribute('aria-modal', 'true');
  o.innerHTML = `
    <div class="inbox-panel">
      <header><h3>${t('Your notes 💌', 'Rasayelek 💌')}</h3><button type="button" class="inbox-x" aria-label="${t('Close', 'E2fel')}">×</button></header>
      <div class="inbox-list"><p class="inbox-empty">${t('Opening…', 'Benefta7ha…')}</p></div>
    </div>`;
  document.body.appendChild(o);
  document.documentElement.classList.add('story-open');
  requestAnimationFrame(() => o.classList.add('on'));
  const close = () => {
    o.classList.remove('on');
    document.documentElement.classList.remove('story-open');
    setTimeout(() => o.remove(), 350);
  };
  $('.inbox-x', o).onclick = close;
  o.addEventListener('click', (e) => { if (e.target === o) close(); });
  const list = $('.inbox-list', o);
  (async () => {
    try {
      const r = await rpc(cfg, 'rajiea_get', { room: cfg.room, after: 0 });
      if (!r.ok) throw new Error(String(r.status));
      const rows = (await r.json()).reverse();
      const notes = (await Promise.all(rows.map(async (row) => { try { return { ...(await unsealNote(JSON.parse(row.body), priv)), at: row.created_at }; } catch { return null; } }))).filter(Boolean);
      if (!notes.length) { list.innerHTML = `<p class="inbox-empty">${t('No notes yet. Share the link with your friends 💌', 'Lessa mafeesh rasayel. Eb3aty el link l so7abek 💌')}</p>`; return; }
      const fmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
      list.innerHTML = notes.map((n, i) => `
        <article class="inbox-note" style="--i:${i};--r:${((i * 37) % 9) - 4}deg">
          <span class="in-sticker">${esc(n.s || '💌')}</span>
          <p dir="auto">${esc(n.m)}</p>
          <footer><b dir="auto">${esc(n.n || t('Someone sweet', '7add lateef'))}</b><time>${fmt.format(new Date(n.at))}</time></footer>
        </article>`).join('');
      sfx.tada();
    } catch {
      list.innerHTML = `<p class="inbox-empty">${t('Couldn’t load the notes right now. Try again in a bit.', 'Ma2dernash ngeeb el rasayel dlwa2ty. Garraby kaman shwaya.')}</p>`;
    }
  })();
}
