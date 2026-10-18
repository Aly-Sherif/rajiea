// Fortune cookie: tap three times (or shake) to crack it, read the slip, keep it in the hope jar.
import { addHope } from './hope.js';

const SEEN = 'rajiea-fortunes';
const CRACKS = 'rajiea-cookies';

export function initCookie(root, { CONFIG, t, sfx, confettiFrom, egg, buzz, motion, onVisible, calm, coarse }) {
  const all = CONFIG.fortunes || [];
  const seen = new Set((() => { try { return JSON.parse(localStorage.getItem(SEEN) || '[]'); } catch { return []; } })());
  let cracks = +(localStorage.getItem(CRACKS) || 0);
  root.innerHTML = `
    <div class="fc-stage">
      <button type="button" class="fc-cookie" aria-label="${t('Fortune cookie — tap three times to crack it', 'Fortune cookie — dosy talat marrat 3ashan tetkesser')}">
        <svg viewBox="0 0 260 180" aria-hidden="true">
          <defs>
            <linearGradient id="fcBake" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f6c77d"/><stop offset=".55" stop-color="#e3a052"/><stop offset="1" stop-color="#b8742f"/></linearGradient>
            <linearGradient id="fcIn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c98a43"/><stop offset="1" stop-color="#9a5f26"/></linearGradient>
          </defs>
          <ellipse class="fc-shadow" cx="130" cy="166" rx="92" ry="9" fill="rgba(74,40,32,.18)"/>
          <g class="fc-half fc-l">
            <path d="M130 40C92 30 40 52 30 104c-3 16 12 30 30 26 26-6 46-22 70-24z" fill="url(#fcBake)"/>
            <path d="M130 106c-20 2-40 14-62 22 16-4 40-22 62-20z" fill="url(#fcIn)" opacity=".7"/>
            <path d="M60 70c10-12 26-20 42-22" fill="none" stroke="#fff3dc" stroke-width="5" stroke-linecap="round" opacity=".55"/>
          </g>
          <g class="fc-half fc-r">
            <path d="M130 40c38-10 90 12 100 64 3 16-12 30-30 26-26-6-46-22-70-24z" fill="url(#fcBake)"/>
            <path d="M130 106c20 2 40 14 62 22-16-4-40-22-62-20z" fill="url(#fcIn)" opacity=".7"/>
          </g>
          <path class="fc-crack" d="M130 42l-6 14 9 10-7 14 8 12-4 14" fill="none" stroke="#7a4518" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
          <g class="fc-crumbs" fill="#d8954a"><circle cx="112" cy="150" r="3"/><circle cx="146" cy="154" r="2.5"/><circle cx="128" cy="160" r="2"/><circle cx="160" cy="146" r="2"/><circle cx="98" cy="146" r="2"/></g>
        </svg>
        <span class="fc-taps" aria-hidden="true"><i></i><i></i><i></i></span>
      </button>
      <div class="fc-slip" hidden>
        <p class="fc-text" aria-live="polite"></p>
        <span class="fc-lucky"></span>
      </div>
    </div>
    <div class="fc-row">
      <span class="fc-count"></span>
      ${motion.needsAsk && coarse ? `<button type="button" class="ask-motion" data-ask>📳 ${t("Crack it by shaking", "Ekssareeha bel hazz")}</button>` : ""}
      <div class="fc-btns" hidden>
        <button type="button" class="btn btn-pink" data-again>${t('Another cookie', 'Cookie tanya')} 🥠</button>
        <button type="button" class="btn btn-ghost" data-keep>${t('Keep it in the hope jar', 'Ekhfazeeha fel bartaman')} ✨</button>
      </div>
    </div>`;
  const cookie = root.querySelector('.fc-cookie');
  const slip = root.querySelector('.fc-slip');
  const text = root.querySelector('.fc-text');
  const lucky = root.querySelector('.fc-lucky');
  const btns = root.querySelector('.fc-btns');
  const keep = root.querySelector('[data-keep]');
  const count = root.querySelector('.fc-count');
  let taps = 0, open = false, current = '', visible = false;
  onVisible(root, (v) => { visible = v; });

  const showCount = () => { count.textContent = all.length ? t(`Found ${seen.size} of ${all.length}`, `La2eety ${seen.size} men ${all.length}`) : ''; };
  showCount();

  const pickFortune = () => {
    if (!all.length) return '';
    let pool = all.map((_, i) => i).filter((i) => !seen.has(i));
    if (!pool.length) pool = all.map((_, i) => i);
    const i = pool[Math.floor(Math.random() * pool.length)];
    seen.add(i);
    try { localStorage.setItem(SEEN, JSON.stringify([...seen])); } catch {}
    return all[i];
  };

  function crack() {
    if (open) return;
    open = true;
    taps = 3;
    cookie.dataset.taps = 3;
    current = pickFortune();
    const nums = Array.from({ length: 4 }, () => 1 + Math.floor(Math.random() * 49));
    text.textContent = current;
    lucky.textContent = `${t('Lucky numbers', 'Ar2am el 7azz')}: ${nums.join(' · ')}`;
    cookie.classList.add('cracked');
    sfx.zap(); buzz([20, 40, 30]);
    setTimeout(() => {
      slip.hidden = false;
      btns.hidden = false;
      keep.disabled = false;
      keep.textContent = `${t('Keep it in the hope jar', 'Ekhfazeeha fel bartaman')} ✨`;
      sfx.ding();
      confettiFrom(cookie, { count: 18, spread: 0.4, emoji: ['✨', '🥠', '💗'] });
      showCount();
    }, calm ? 0 : 380);
    cracks += 1;
    try { localStorage.setItem(CRACKS, String(cracks)); } catch {}
    if (cracks >= 5) egg('fortune');
  }
  function reset() {
    open = false;
    taps = 0;
    cookie.dataset.taps = 0;
    cookie.classList.remove('cracked');
    slip.hidden = true;
    btns.hidden = true;
    cookie.classList.add('fresh');
    setTimeout(() => cookie.classList.remove('fresh'), 500);
    sfx.pop();
  }
  cookie.addEventListener('click', () => {
    if (open) return;
    taps += 1;
    cookie.dataset.taps = taps;
    cookie.classList.remove('knock'); void cookie.offsetWidth; cookie.classList.add('knock');
    if (taps >= 3) crack(); else { sfx.boop(); buzz(12); }
  });
  root.querySelector('[data-again]').addEventListener('click', reset);
  keep.addEventListener('click', () => {
    if (!current) return;
    addHope(current, 'cookie');
    keep.disabled = true;
    keep.textContent = `${t('In the jar', 'Fel bartaman')} 🫙`;
    sfx.chirp(); buzz(10);
  });
  root.querySelector("[data-ask]")?.addEventListener("click", async (e) => {
    const b = e.currentTarget;
    const ok = await motion.ask();
    b.hidden = true;
    if (!ok) count.textContent = t("Shaking is off on this phone — tapping works just as well.", "El hazz ma2fool 3ala el mobile dah — el dos byeshta3’al bardo.");
  });
  motion.onShake(() => { if (visible && !open) crack(); }, root);
}
