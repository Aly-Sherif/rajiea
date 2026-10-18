// "A day with Dr. Rajiea": a scroll story. The stage stays put while the sky, the sun and the
// scenes change as you scroll; tap the drawing in each scene.

const SKY = {
  matcha: { a: '#ffc4b4', b: '#fff0df', city: '#e6b39f', night: 0 },
  clinic: { a: '#bcdcff', b: '#fff5ea', city: '#d6b3a1', night: 0 },
  tawouk: { a: '#98ccff', b: '#ffeed6', city: '#cba189', night: 0 },
  cafe: { a: '#ff9a78', b: '#ffd6aa', city: '#b47a64', night: 0.15 },
  match: { a: '#0c1a46', b: '#5b153f', city: '#26122c', night: 1 },
  night: { a: '#0a0a1e', b: '#2a1535', city: '#1b0f22', night: 1 },
};
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, u) => { const A = hex(a), B = hex(b); return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * u)).join(',')})`; };
const ease = (u) => u * u * (3 - 2 * u);

const PROPS = {
  matcha: `
    <ellipse cx="150" cy="236" rx="112" ry="13" fill="rgba(74,44,32,.14)"/>
    <g class="dp-steam" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".8">
      <path d="M118 112c-10-14 10-22 0-38"/><path d="M150 104c-10-14 10-22 0-40"/><path d="M182 112c-10-14 10-22 0-38"/>
    </g>
    <path d="M58 150Q60 230 150 230T242 150z" fill="#f5e6d6"/>
    <path d="M62 172Q90 222 150 224T238 172" fill="none" stroke="#ff8cc0" stroke-width="7" stroke-linecap="round" opacity=".7"/>
    <rect x="118" y="226" width="64" height="10" rx="5" fill="#e3cdb8"/>
    <ellipse cx="150" cy="150" rx="92" ry="19" fill="#5f8e2f"/>
    <ellipse class="dp-foam" cx="150" cy="150" rx="84" ry="14" fill="#a9d36d"/>
    <g fill="#d6eeb4"><circle cx="120" cy="148" r="4"/><circle cx="138" cy="153" r="3"/><circle cx="168" cy="146" r="4.5"/><circle cx="186" cy="152" r="3"/><circle cx="152" cy="144" r="2.5"/></g>
    <g fill="#4a2c20"><circle cx="128" cy="190" r="4"/><circle cx="172" cy="190" r="4"/></g>
    <circle cx="116" cy="200" r="6" fill="#ff9cc4" opacity=".7"/><circle cx="184" cy="200" r="6" fill="#ff9cc4" opacity=".7"/>
    <path d="M141 199q9 8 18 0" fill="none" stroke="#4a2c20" stroke-width="3.4" stroke-linecap="round"/>
    <g class="dp-whisk">
      <rect x="192" y="26" width="17" height="72" rx="8" fill="#d8b46e"/>
      <rect x="192" y="62" width="17" height="6" fill="#b88f47"/>
      <g stroke="#ecd49a" stroke-width="3" stroke-linecap="round"><path d="M194 98l-12 44M198 98l-5 46M201 98v47M204 98l5 46M207 98l12 44"/></g>
    </g>
    <path d="M30 206c20-6 36-2 52 8" fill="none" stroke="#7fb24a" stroke-width="6" stroke-linecap="round"/>
    <path d="M30 206c4-14 18-20 28-14-2 12-14 18-28 14z" fill="#7fb24a"/>`,
  clinic: `
    <path class="dp-beam" d="M70 44L22 236h236L150 44z" fill="#fff6c9" opacity=".45"/>
    <g><rect x="64" y="20" width="92" height="30" rx="15" fill="#fff" stroke="#e7d4c4" stroke-width="3"/><rect x="76" y="44" width="68" height="9" rx="4.5" fill="#fff3a8"/></g>
    <ellipse cx="150" cy="238" rx="96" ry="12" fill="rgba(74,44,32,.14)"/>
    <g class="dp-tooth">
      <path d="M150 92c-14-14-42-18-52 0s-2 40 6 58 8 40 20 40 12-24 18-32 12-8 16 0 8 32 20 32 14-22 20-40 14-40 4-58-38-14-52 0z" fill="#fff" stroke="#4a2c20" stroke-width="5" stroke-linejoin="round"/>
      <g fill="#2a1712"><circle cx="132" cy="124" r="5.5"/><circle cx="168" cy="124" r="5.5"/></g>
      <circle cx="120" cy="138" r="7" fill="#ff9cc4"/><circle cx="180" cy="138" r="7" fill="#ff9cc4"/>
      <path d="M138 140q12 12 24 0" fill="none" stroke="#2a1712" stroke-width="4.5" stroke-linecap="round"/>
    </g>
    <g class="dp-spark" fill="#ffd166"><path d="M218 96l5 12 12 5-12 5-5 12-5-12-12-5 12-5z"/><path d="M84 168l3 8 8 3-8 3-3 8-3-8-8-3 8-3z"/></g>
    <g transform="rotate(-24 230 182)"><rect x="196" y="176" width="84" height="12" rx="6" fill="#c9ced6"/><circle cx="200" cy="182" r="14" fill="#e8eef5" stroke="#aab3bf" stroke-width="4"/></g>
    <g transform="rotate(-6 84 214)"><rect x="34" y="198" width="104" height="32" rx="16" fill="#ff2e88"/><text x="86" y="220" text-anchor="middle" font-family="Manrope, sans-serif" font-weight="800" font-size="15" fill="#fff">Dr. Rajiea</text></g>`,
  tawouk: `
    <g class="dp-steam" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".85">
      <path d="M108 90c-10-14 10-22 0-38"/><path d="M150 82c-10-14 10-22 0-40"/><path d="M192 90c-10-14 10-22 0-38"/>
    </g>
    <ellipse cx="150" cy="226" rx="128" ry="16" fill="rgba(74,44,32,.14)"/>
    <ellipse cx="150" cy="176" rx="132" ry="52" fill="#fff" stroke="#efe2d4" stroke-width="4"/>
    <ellipse cx="150" cy="176" rx="104" ry="36" fill="#fbf4ec"/>
    <path d="M58 172c10-30 50-36 70-18-12 22-48 30-70 18z" fill="#f4dcb2"/>
    <g class="dp-skewer"><path d="M44 158L262 130" stroke="#a7adb5" stroke-width="4" stroke-linecap="round"/>
      ${[70, 104, 138, 172, 206].map((x, i) => `<g transform="translate(${x} ${154 - i * 4.4}) rotate(${i % 2 ? 8 : -6})"><rect x="-15" y="-14" width="30" height="27" rx="9" fill="#e9a03d"/><path d="M-10-6h20M-11 3h22" stroke="#9a5a1c" stroke-width="3" stroke-linecap="round" opacity=".7"/></g>`).join('')}
    </g>
    <g class="dp-skewer2"><path d="M60 196L250 172" stroke="#a7adb5" stroke-width="4" stroke-linecap="round"/>
      ${[92, 126, 160, 194].map((x, i) => `<g transform="translate(${x} ${192 - i * 4.3}) rotate(${i % 2 ? -7 : 6})"><rect x="-15" y="-13" width="30" height="26" rx="9" fill="#f0b350"/><path d="M-10-5h20M-11 4h22" stroke="#9a5a1c" stroke-width="3" stroke-linecap="round" opacity=".7"/></g>`).join('')}
    </g>
    <g><ellipse cx="236" cy="198" rx="26" ry="11" fill="#e9dccb"/><ellipse cx="236" cy="194" rx="22" ry="8" fill="#fffef8"/></g>
    <path d="M222 132c8-12 26-12 30 4-12 6-24 4-30-4z" fill="#ffe36b" stroke="#e8c53a" stroke-width="2.5"/>`,
  cafe: `
    <ellipse cx="150" cy="232" rx="128" ry="14" fill="rgba(74,44,32,.14)"/>
    <ellipse cx="112" cy="214" rx="78" ry="17" fill="#fff" stroke="#efe2d4" stroke-width="3"/>
    <path d="M60 140h104l-10 66q-2 12-14 12H84q-12 0-14-12z" fill="#fff" stroke="#efe2d4" stroke-width="3"/>
    <path d="M162 152q30 0 26 22t-30 20" fill="none" stroke="#fff" stroke-width="10" stroke-linecap="round"/>
    <path d="M162 152q30 0 26 22t-30 20" fill="none" stroke="#efe2d4" stroke-width="3" stroke-linecap="round" opacity=".9"/>
    <ellipse cx="112" cy="140" rx="54" ry="13" fill="#c08a5c"/>
    <path class="dp-foam" d="M62 140c0-22 22-34 50-34s50 12 50 34c0 6-22 10-50 10s-50-4-50-10z" fill="#fffaf2"/>
    <path class="dp-heart" d="M112 136s-15-8-15-17c0-5 4-8 8-8 3 0 5 2 7 4 2-2 4-4 7-4 4 0 8 3 8 8 0 9-15 17-15 17z" fill="#d9a77c"/>
    <g fill="#8a5a44" opacity=".35"><circle cx="86" cy="122" r="1.8"/><circle cx="140" cy="118" r="1.8"/><circle cx="96" cy="112" r="1.5"/><circle cx="130" cy="128" r="1.5"/></g>
    <g transform="translate(176 150)">
      <ellipse cx="44" cy="70" rx="56" ry="11" fill="#fff" stroke="#efe2d4" stroke-width="3"/>
      <path d="M8 18l70-16v54L8 66z" fill="#c98f5a"/><path d="M8 32l70-14v8L8 40zM8 50l70-14v8L8 58z" fill="#f7ecd9"/>
      <path d="M8 18l70-16 6 6-70 16z" fill="#6b3f2a"/><path d="M8 18v48h6V24z" fill="#5e3523"/>
    </g>
    <g class="dp-phone" transform="rotate(12 250 80)"><rect x="226" y="30" width="50" height="94" rx="12" fill="#e2263b"/><rect x="232" y="38" width="38" height="78" rx="7" fill="#ffd9e7"/><circle cx="240" cy="44" r="4" fill="#2a1712"/><path d="M251 84s-9-5-9-10c0-3 2-5 5-5 2 0 3 1 4 2 1-1 2-2 4-2 3 0 5 2 5 5 0 5-9 10-9 10z" fill="#ff2e88"/></g>
    <rect class="dp-flash" x="0" y="0" width="300" height="260" fill="#fff" opacity="0"/>`,
  match: `
    <g stroke="#fff" stroke-width="6" stroke-linecap="round" fill="none" opacity=".92"><path d="M54 150V70h192v80"/></g>
    <g stroke="rgba(255,255,255,.28)" stroke-width="1.6">${Array.from({ length: 9 }, (_, i) => `<path d="M${74 + i * 20} 70v80"/>`).join('')}${Array.from({ length: 4 }, (_, i) => `<path d="M54 ${86 + i * 16}h192"/>`).join('')}</g>
    <ellipse cx="150" cy="196" rx="146" ry="40" fill="#2f7d3a"/>
    <path d="M10 196q140-40 280 0" fill="none" stroke="rgba(255,255,255,.5)" stroke-width="3"/>
    <g class="dp-ball"><circle cx="150" cy="182" r="30" fill="#fff" stroke="#2a1712" stroke-width="3"/>
      <path d="M150 168l12 9-5 14h-14l-5-14z" fill="#2a1712"/><path d="M150 152v16M162 177l15-4M157 191l9 13M143 191l-9 13M138 177l-15-4" stroke="#2a1712" stroke-width="3"/></g>
    <g class="dp-scarf">
      <path d="M14 232q70-34 136-14t136-14v26q-70 16-136-2T14 256z" fill="#a50044"/>
      <path d="M48 222q20-6 30-6v28q-14 0-30 4zM118 214q16 2 32 8v26q-16-6-32-6zM188 216q18-4 32-4v26q-16 0-32 4zM252 210q14-2 34-6v26q-16 4-34 6z" fill="#004d98"/>
      <g stroke="#edbb00" stroke-width="3" stroke-linecap="round"><path d="M14 256v10M22 254v10M30 251v10M286 230v10M278 232v10M270 233v10"/></g>
    </g>
    <text class="dp-goal" x="150" y="44" text-anchor="middle" font-family="Fraunces, Georgia, serif" font-weight="700" font-size="40" fill="#edbb00" opacity="0">GOOOAL!</text>`,
  night: `
    <g class="dp-z" fill="#fff" font-family="Fraunces, Georgia, serif" font-weight="700"><text x="196" y="74" font-size="26">z</text><text x="216" y="50" font-size="20">z</text><text x="232" y="30" font-size="15">z</text></g>
    <ellipse cx="150" cy="238" rx="138" ry="12" fill="rgba(0,0,0,.25)"/>
    <rect x="26" y="150" width="248" height="86" rx="40" fill="#ffd3e5"/>
    <path d="M26 196q124 30 248 0v10q0 30-40 30H66q-40 0-40-30z" fill="#ffbcd6"/>
    <g class="dp-turtle">
      <ellipse cx="150" cy="168" rx="62" ry="38" fill="#4f9a4a"/>
      <path d="M100 164q50-58 100 0" fill="#6cb85f"/>
      <g fill="none" stroke="#3d7a3a" stroke-width="3"><path d="M128 140l22-8 22 8 4 22-26 10-26-10z"/><path d="M128 140l-18 20M172 140l18 20M150 132v-10"/></g>
      <ellipse cx="98" cy="176" rx="26" ry="21" fill="#8fd17f"/>
      <path d="M86 174q5 4 10 0M102 174q5 4 10 0" fill="none" stroke="#2a3d22" stroke-width="2.6" stroke-linecap="round"/>
      <circle cx="84" cy="184" r="5" fill="#ff9cc4" opacity=".8"/><circle cx="114" cy="184" r="5" fill="#ff9cc4" opacity=".8"/>
      <ellipse cx="200" cy="198" rx="14" ry="8" fill="#8fd17f"/><ellipse cx="126" cy="202" rx="14" ry="8" fill="#8fd17f"/>
    </g>
    <path d="M150 236c40-34 120-30 136-10v14H130z" fill="#fff" opacity=".9"/>
    <g transform="translate(18 120)"><rect x="0" y="40" width="34" height="42" rx="8" fill="#fff" opacity=".9"/><rect x="12" y="0" width="9" height="52" rx="4.5" fill="#ff2e88"/><rect x="10" y="-2" width="13" height="16" rx="4" fill="#fff"/></g>`,
};

export function initDay(stage, track, { CONFIG, t, sfx, confettiFrom, egg, buzz, onVisible, calm, esc }) {
  const scenes = (CONFIG.day || []).filter((s) => PROPS[s.id]);
  if (!scenes.length) { track.closest('section')?.remove(); return; }
  const n = scenes.length;
  track.style.setProperty('--n', n);
  stage.innerHTML = `
    <div class="day-sky" aria-hidden="true">
      <div class="day-stars">${Array.from({ length: 34 }, () => `<i style="left:${(Math.random() * 100).toFixed(1)}%;top:${(Math.random() * 62).toFixed(1)}%;--s:${(1 + Math.random() * 2).toFixed(1)}px;--d:${(Math.random() * 3).toFixed(2)}s"></i>`).join('')}</div>
      <div class="day-sun"></div>
      <div class="day-moon"></div>
      <div class="day-cloud c1"></div><div class="day-cloud c2"></div><div class="day-cloud c3"></div>
      <div class="day-lights"><i></i><i></i></div>
      <svg class="day-city" viewBox="0 0 400 130" preserveAspectRatio="xMidYMax slice">
        <path class="city-far" d="M0 130V92h18V78h10v14h16V70l8-10 8 10v22h14V84h20v8h12V60h4V40l3-8 3 8v20h4v32h18V76h22v16h14V66q10-14 20 0v26h16V82h12V58l6-6 6 6v34h20V74h18v18h14V64h8V48l4-6 4 6v16h8v28h20V80h16v50z"/>
        <path class="city-near" d="M0 130v-22h24V96h18v12h22V88l14-12 14 12v20h16V92h10V58h4V30q2-6 4 0v28h4v34h16v16h22V82q16-22 32 0v26h18V96h12V66h3V50l3-6 3 6v16h3v42h20V90h26v18h22V98h18v32z"/>
        <g class="city-win">${Array.from({ length: 26 }, () => `<rect x="${(4 + Math.random() * 390).toFixed(0)}" y="${(96 + Math.random() * 26).toFixed(0)}" width="3" height="4" rx="1"/>`).join('')}</g>
        <path class="city-tower" d="M196 130V50h-6l4-10h-3q9-14 18 0h-3l4 10h-6v80z"/>
      </svg>
    </div>
    ${scenes.map((s, i) => `
      <article class="day-cap" data-i="${i}" aria-hidden="${i ? 'true' : 'false'}">
        <span class="day-time"><i aria-hidden="true">${['🌅', '🩺', '🥙', '☕', '⚽', '🌙'][i] || '✨'}</i>${esc(s.time)}</span>
        <h3>${esc(s.title)}</h3>
        <p>${esc(s.text)}</p>
      </article>`).join('')}
    <div class="day-props">
      ${scenes.map((s, i) => `<button type="button" class="day-prop dp-${s.id}" data-i="${i}" tabindex="${i ? -1 : 0}" aria-label="${esc(s.title)} — ${t('tap for a surprise', 'dosy l mofag2a')}"><svg viewBox="0 0 300 260" aria-hidden="true">${PROPS[s.id]}</svg></button>`).join('')}
      <span class="day-bubble" aria-live="polite"></span>
      <span class="day-tapme" aria-hidden="true"></span>
    </div>
    <nav class="day-dots" aria-label="${t('Moments of her day', 'Lahazat yomha')}">
      ${scenes.map((s, i) => `<button type="button" data-i="${i}" aria-label="${esc(s.time)} · ${esc(s.title)}"><i></i></button>`).join('')}
    </nav>
    <p class="day-scroll" aria-hidden="true">${t('scroll', 'enzely')} <i>↓</i></p>`;

  const caps = [...stage.querySelectorAll('.day-cap')];
  const props = [...stage.querySelectorAll('.day-prop')];
  const dots = [...stage.querySelectorAll('.day-dots button')];
  const bubble = stage.querySelector('.day-bubble');
  let cur = -1, raf = 0, visible = false, tapped = false, sawEnd = false;

  const show = (i) => {
    if (i === cur) return;
    const prev = cur;
    cur = i;
    caps.forEach((c, k) => { c.classList.toggle('on', k === i); c.classList.toggle('past', k < i); c.setAttribute('aria-hidden', String(k !== i)); });
    props.forEach((p, k) => { p.classList.toggle('on', k === i); p.classList.toggle('past', k < i); p.tabIndex = k === i ? 0 : -1; });
    dots.forEach((d, k) => { d.classList.toggle('on', k === i); d.setAttribute('aria-current', k === i ? 'step' : 'false'); });
    stage.dataset.scene = scenes[i].id;
    bubble.classList.remove('show');
    if (prev >= 0) buzz(6);
    if (i === n - 1 && !sawEnd) { sawEnd = true; egg('day'); }
  };

  const paint = () => {
    raf = 0;
    const r = track.getBoundingClientRect();
    const span = Math.max(1, track.offsetHeight - innerHeight);
    const f = Math.min(1, Math.max(0, -r.top / span));
    const s = Math.min(n - 1, Math.max(0, f * n - 0.5));
    const i0 = Math.floor(s), i1 = Math.min(n - 1, i0 + 1);
    const u = ease(Math.min(1, Math.max(0, (s - i0 - 0.25) / 0.5)));
    const A = SKY[scenes[i0].id], B = SKY[scenes[i1].id];
    const night = A.night + (B.night - A.night) * u;
    stage.style.setProperty('--sky-a', mix(A.a, B.a, u));
    stage.style.setProperty('--sky-b', mix(A.b, B.b, u));
    stage.style.setProperty('--city', mix(A.city, B.city, u));
    stage.style.setProperty('--night', night.toFixed(3));
    // the sun climbs over the first scenes and sets by the café; the moon takes over
    const ss = s / Math.max(1, n - 1) * 5;
    const sunT = Math.min(1, ss / 3.4);
    stage.style.setProperty('--sun-x', `${8 + sunT * 82}%`);
    stage.style.setProperty('--sun-y', `${72 - Math.sin(Math.PI * sunT) * 52 + (ss > 3.4 ? (ss - 3.4) * 60 : 0)}%`);
    const moonT = Math.min(1, Math.max(0, (ss - 3.3) / 1.7));
    stage.style.setProperty('--moon-x', `${88 - moonT * 16}%`);
    stage.style.setProperty('--moon-y', `${78 - moonT * 58}%`);
    stage.style.setProperty('--lights', String(Math.max(0, 1 - Math.abs(ss - 4) * 1.6)));
    stage.classList.toggle('dark', night > 0.5);
    stage.classList.toggle('start', f < 0.02);
    show(Math.min(n - 1, Math.floor(f * n * 0.9999)));
  };
  const queue = () => { if (!raf && visible) raf = requestAnimationFrame(paint); };
  addEventListener('scroll', queue, { passive: true });
  addEventListener('resize', queue);
  onVisible(track, (v) => { visible = v; stage.classList.toggle('live', v); if (v) queue(); });
  paint();

  // jump to a moment
  dots.forEach((d, k) => d.addEventListener('click', () => {
    const top = track.getBoundingClientRect().top + scrollY;
    const span = track.offsetHeight - innerHeight;
    scrollTo({ top: top + span * ((k + 0.5) / n), behavior: calm ? 'auto' : 'smooth' });
    sfx.click();
  }));

  // tap the drawing
  const SOUND = { matcha: () => sfx.whoosh(), clinic: () => sfx.ding(), tawouk: () => sfx.zap(), cafe: () => sfx.shutter(), match: () => sfx.tada(), night: () => sfx.giggle() };
  let bubbleTimer = 0;
  props.forEach((p, k) => p.addEventListener('click', () => {
    if (k !== cur) return;
    const sc = scenes[k];
    p.classList.remove('tap');
    void p.getBoundingClientRect();
    p.classList.add('tap');
    setTimeout(() => p.classList.remove('tap'), 1100);
    (SOUND[sc.id] || sfx.pop)();
    buzz(sc.id === 'match' ? [20, 50, 20, 50, 40] : 12);
    bubble.textContent = sc.tap || '';
    bubble.classList.remove('show');
    void bubble.offsetWidth;
    bubble.classList.add('show');
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(() => bubble.classList.remove('show'), 2200);
    const emoji = { matcha: ['🍵', '🌿'], clinic: ['✨', '🦷'], tawouk: ['🥙', '🔥'], cafe: ['☕', '🍰', '📸'], match: ['⚽', '💙', '❤️'], night: ['⭐', '🌙', '💤'] }[sc.id];
    confettiFrom(p, { count: sc.id === 'match' ? 70 : 22, spread: 0.55, emoji: sc.id === 'match' ? null : emoji, colors: sc.id === 'match' ? ['#004d98', '#a50044', '#edbb00'] : null });
    if (!tapped) { tapped = true; stage.classList.add('tapped'); }
  }));
}
