// The hope jar: write a hope, fold it into a star, drop it in. Tap (or shake) the jar to pull one out.
// Everything stays in this browser's storage — nothing is sent anywhere.
const KEY = 'rajiea-hopes';
const COLORS = ['#ffb3d1', '#ffd98a', '#d9c2ff', '#b9ecd2', '#ffc7a8', '#ff8cc0'];

export function readHopes() {
  try { const a = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(a) ? a : []; } catch { return []; }
}
function writeHopes(list) { try { localStorage.setItem(KEY, JSON.stringify(list.slice(-200))); } catch {} }
export function addHope(text, src = 'me') {
  const list = readHopes();
  const h = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), text: String(text).slice(0, 140), at: Date.now(), src, c: COLORS[list.length % COLORS.length] };
  list.push(h);
  writeHopes(list);
  document.dispatchEvent(new CustomEvent('rj:hope', { detail: h }));
  return h;
}

export function initHope(root, { CONFIG, t, esc, sfx, confettiFrom, egg, buzz, motion, onVisible, calm }) {
  // the first few stars come with the jar
  try {
    if (!localStorage.getItem('rajiea-hopes-seeded')) {
      (CONFIG.hope?.starters || []).forEach((s) => addHope(s, 'site'));
      localStorage.setItem('rajiea-hopes-seeded', '1');
    }
  } catch {}
  root.innerHTML = `
    <div class="hj-scene">
      <div class="hj-sky" aria-hidden="true">${Array.from({ length: 26 }, () => `<i style="left:${(Math.random() * 100).toFixed(1)}%;top:${(Math.random() * 100).toFixed(1)}%;--d:${(Math.random() * 3).toFixed(2)}s"></i>`).join('')}</div>
      <button type="button" class="hj-jar" aria-label="${t('The hope jar — tap to pull out a hope', 'Bartaman el amal — dosy 3ashan tetala3y amal')}">
        <svg viewBox="0 0 240 300" aria-hidden="true">
          <defs>
            <linearGradient id="hjGlass" x1="0" x2="1"><stop offset="0" stop-color="rgba(255,255,255,.34)"/><stop offset=".45" stop-color="rgba(255,255,255,.08)"/><stop offset="1" stop-color="rgba(255,255,255,.26)"/></linearGradient>
            <radialGradient id="hjGlow" cx=".5" cy=".7" r=".6"><stop offset="0" stop-color="rgba(255,200,230,.45)"/><stop offset="1" stop-color="rgba(255,200,230,0)"/></radialGradient>
          </defs>
          <ellipse cx="120" cy="286" rx="92" ry="10" fill="rgba(0,0,0,.35)"/>
          <path d="M58 64h124v14q22 10 22 40v126q0 36-36 36H72q-36 0-36-36V118q0-30 22-40z" fill="url(#hjGlow)"/>
          <path d="M58 64h124v14q22 10 22 40v126q0 36-36 36H72q-36 0-36-36V118q0-30 22-40z" fill="url(#hjGlass)" stroke="rgba(255,255,255,.75)" stroke-width="3"/>
          <rect x="50" y="34" width="140" height="34" rx="10" fill="#c98f5a"/>
          <rect x="50" y="34" width="140" height="10" rx="5" fill="#e0aa72"/>
          <path d="M54 72q66 14 132 0" fill="none" stroke="#ff2e88" stroke-width="7" stroke-linecap="round"/>
          <path d="M150 74q14 10 6 26M150 74q22 2 26 16" fill="none" stroke="#ff2e88" stroke-width="5" stroke-linecap="round"/>
          <path d="M52 120q-4 70 4 130" fill="none" stroke="rgba(255,255,255,.65)" stroke-width="6" stroke-linecap="round"/>
          <path d="M184 110q6 20 6 40" fill="none" stroke="rgba(255,255,255,.4)" stroke-width="5" stroke-linecap="round"/>
        </svg>
        <span class="hj-stars"></span>
      </button>
      <p class="hj-count" aria-live="polite"></p>
    </div>
    <form class="hj-form" autocomplete="off">
      <label class="hj-label" for="hjIn">${t('Write a little hope', 'Ekteby amal so8ayar')}</label>
      <div class="hj-field">
        <input id="hjIn" name="hope" maxlength="120" dir="auto" enterkeyhint="done" placeholder="${t('Something you’re hoping for…', '7aga mestaneyaha…')}">
        <button type="submit" class="btn btn-pink">${t('Fold & drop', 'Etneeh w ermeeh')} ✨</button>
      </div>
      <p class="hj-note">🔒 ${t('Your hopes stay on this phone only — nobody else can see them.', 'Amalek bteb2a 3ala el mobile dah bas — ma7addesh tany yeshoofha.')}</p>
    </form>
    <div class="hj-open" hidden></div>`;
  const jar = root.querySelector('.hj-jar');
  const starsEl = root.querySelector('.hj-stars');
  const countEl = root.querySelector('.hj-count');
  const form = root.querySelector('.hj-form');
  const input = form.elements.hope;
  const openEl = root.querySelector('.hj-open');
  const scene = root.querySelector('.hj-scene');
  document.body.appendChild(openEl); // the section has paint containment, so the pop-up lives at the page level
  let visible = false;
  onVisible(root, (v) => { visible = v; root.classList.toggle('live', v); });

  // pile the stars from the bottom of the jar upwards (positions in % of the jar box)
  const slot = (i) => {
    const perRow = 6;
    const row = Math.floor(i / perRow), col = [2, 3, 1, 4, 0, 5][i % perRow]; // fill from the middle out
    const jitter = ((i * 37) % 10) / 10 - 0.5;
    const x = 23 + col * 10.8 + (row % 2) * 5.4 + jitter * 3;
    const y = 86 - row * 6.2 - (((i * 53) % 7) / 7) * 1.6;
    return { x: Math.min(78, x), y: Math.max(30, y), r: ((i * 47) % 70) - 35 };
  };
  function paint(newId) {
    const list = readHopes();
    starsEl.innerHTML = list.slice(-66).map((h, i) => {
      const p = slot(i);
      return `<i class="hj-star${h.id === newId ? ' new' : ''}" data-id="${h.id}" style="left:${p.x}%;top:${p.y}%;--r:${p.r}deg;--c:${h.c || COLORS[i % COLORS.length]}"></i>`;
    }).join('');
    const n = list.length;
    countEl.textContent = n ? t(`${n} hope${n === 1 ? '' : 's'} inside`, `${n} amal gowa`) : t('The jar is waiting for its first hope', 'El bartaman mestanny awel amal');
  }
  paint();
  document.addEventListener('rj:hope', () => paint());

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) { input.focus(); form.classList.remove('nope'); void form.offsetWidth; form.classList.add('nope'); return; }
    input.value = '';
    input.blur();
    fold(text);
  });
  function fold(text) {
    // a paper strip folds into a star and drops into the jar
    const sr = scene.getBoundingClientRect(), fr = input.getBoundingClientRect(), jr = jar.getBoundingClientRect();
    const paper = document.createElement('span');
    paper.className = 'hj-paper';
    paper.textContent = text;
    paper.style.left = `${fr.left - sr.left + fr.width / 2}px`;
    paper.style.top = `${fr.top - sr.top + fr.height / 2}px`;
    scene.appendChild(paper);
    sfx.whoosh(); buzz(10);
    const h = addHope(text, 'me');
    const n = readHopes().length;
    const p = slot(Math.min(n, 66) - 1);
    const tx = jr.left - sr.left + (p.x / 100) * jr.width, ty = jr.top - sr.top + (p.y / 100) * jr.height;
    const mx = jr.left - sr.left + jr.width / 2, my = jr.top - sr.top + jr.height * 0.12;
    const x0 = fr.left - sr.left + fr.width / 2, y0 = fr.top - sr.top + fr.height / 2;
    const done = () => { paper.remove(); paint(h.id); sfx.ding(); buzz([10, 30, 16]); jar.classList.remove('wiggle'); void jar.offsetWidth; jar.classList.add('wiggle'); confettiFrom(jar, { count: 16, spread: 0.35, emoji: ['✨', '⭐', '💗'] }); egg('hope'); };
    if (calm || !paper.animate) { done(); return; }
    paper.animate([
      { transform: 'translate(-50%,-50%) scale(1)', borderRadius: '6px', offset: 0 },
      { transform: 'translate(-50%,-50%) scale(.3,1) rotate(0deg)', borderRadius: '6px', offset: 0.25 },
      { transform: 'translate(-50%,-50%) scale(.08) rotate(180deg)', borderRadius: '50%', offset: 0.4 },
    ], { duration: 520, easing: 'ease-in', fill: 'forwards' }).finished.then(() => {
      paper.textContent = '';
      paper.className = 'hj-star flying';
      paper.style.setProperty('--c', h.c);
      return paper.animate([
        { transform: `translate(${0}px, ${0}px) scale(1.6) rotate(0deg)` },
        { transform: `translate(${(mx - x0) * 0.6}px, ${my - y0 - 70}px) scale(1.5) rotate(200deg)`, offset: 0.45 },
        { transform: `translate(${mx - x0}px, ${my - y0}px) scale(1.2) rotate(320deg)`, offset: 0.7 },
        { transform: `translate(${tx - x0}px, ${ty - y0}px) scale(1) rotate(400deg)` },
      ], { duration: 1000, easing: 'cubic-bezier(.4,0,.3,1)', fill: 'forwards' }).finished;
    }).then(done, done);
  }

  // pull one out
  let lastPick = '';
  function pull() {
    const list = readHopes();
    if (!list.length || !openEl.hidden) return;
    let h = list[Math.floor(Math.random() * list.length)];
    if (h.id === lastPick && list.length > 1) h = list[(list.indexOf(h) + 1) % list.length];
    lastPick = h.id;
    jar.classList.remove('wiggle'); void jar.offsetWidth; jar.classList.add('wiggle');
    sfx.chirp(); buzz([12, 40, 12]);
    const star = starsEl.querySelector(`[data-id="${h.id}"]`);
    star?.classList.add('rise');
    const from = { me: t('You', 'Enty'), site: t('Came with the jar 💗', 'Gat ma3a el bartaman 💗'), cookie: t('From a fortune cookie 🥠', 'Men fortune cookie 🥠') }[h.src] || '';
    setTimeout(() => {
      openEl.innerHTML = `
        <div class="hj-card" role="dialog" aria-label="${t('A hope from the jar', 'Amal men el bartaman')}" style="--c:${h.c}">
          <span class="hj-card-star" aria-hidden="true"></span>
          <p>${esc(h.text)}</p>
          <small>${esc(from)}${h.src === 'me' ? ` · ${new Date(h.at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}</small>
          <div class="hj-card-btns">
            <button type="button" class="btn btn-pink" data-back>${t('Put it back', 'Rag3eeh')} 🫙</button>
            <button type="button" class="btn btn-ghost" data-free>${t('Let it go', 'Seebeeh yetla3')} 🕊️</button>
          </div>
        </div>`;
      openEl.hidden = false;
      openEl.querySelector('[data-back]').focus({ preventScroll: true });
      openEl.querySelector('[data-back]').addEventListener('click', () => { close(); star?.classList.remove('rise'); sfx.pop(); });
      openEl.querySelector('[data-free]').addEventListener('click', () => {
        writeHopes(readHopes().filter((x) => x.id !== h.id));
        close();
        if (star) { star.classList.remove('rise'); star.classList.add('free'); setTimeout(() => paint(), 1300); } else paint();
        sfx.whoosh(); buzz(10);
      });
    }, calm ? 0 : 520);
  }
  const close = () => { openEl.hidden = true; openEl.innerHTML = ''; };
  openEl.addEventListener('click', (e) => { if (e.target === openEl) { close(); paint(); } });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && !openEl.hidden) { close(); paint(); } });
  jar.addEventListener('click', pull);
  motion.onShake(() => { if (visible) pull(); }, root);
}
