// The Matcha bar: pick a base, whisk it (shake the phone or swipe fast), pour the milk (hold), serve.
import { drag } from '../touch.js';

const W = 240, H = 280;
const VESSEL = {
  iced: { top: 44, bottom: 262, shape: 'M60 38h120l-12 222q-1 10-11 10H83q-10 0-11-10z', inner: 'M66 44h108l-11 212q-1 8-9 8H86q-8 0-9-8z', m0: 0.34 },
  hot: { top: 112, bottom: 252, shape: 'M54 104h132v118q0 40-40 40H94q-40 0-40-40z', inner: 'M60 110h120v112q0 34-34 34H94q-34 0-34-34z', m0: 0.4 },
  bowl: { top: 150, bottom: 252, shape: 'M28 146h184q0 112-92 112T28 146z', inner: 'M34 150h172q-2 100-86 100T34 150z', m0: 0.62 },
};
// colours: '#rrggbb' or 'rgb(r,g,b)' in, 'rgb(r,g,b)' out
const rgb = (c) => (c[0] === '#' ? [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)) : c.match(/\d+/g).map(Number));
const mix = (a, b, u) => { const A = rgb(a), B = rgb(b), k = Math.max(0, Math.min(1, u)); return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * k)).join(',')})`; };

export function initMatcha(root, { CONFIG, t, esc, sfx, confettiFrom, egg, buzz, motion, onVisible, toast, coarse }) {
  const M = CONFIG.matcha || {};
  const names = M.names || {};
  const state = { step: 0, base: 'iced', sugar: 0, whisk: 0, milk: 0, noMilk: false };
  const SUGAR = [t('None', 'Mafeesh'), t('A little', 'Shwaya'), t('Lots', 'Keteer')];
  const STEPS = [t('Base', 'El no3'), t('Whisk', 'Ekhfo2y'), t('Milk', 'Laban'), t('Serve', 'Ady')];
  root.innerHTML = `
    <div class="mb-card">
      <ol class="mb-steps">${STEPS.map((s, i) => `<li data-s="${i}"><i>${i + 1}</i><span>${s}</span></li>`).join('')}</ol>
      <div class="mb-main">
        <div class="mb-stage" aria-hidden="true">
          <div class="mb-glow"></div>
          <svg class="mb-svg" viewBox="0 0 ${W} ${H}"></svg>
          <span class="mb-pop"></span>
        </div>
        <div class="mb-panel" aria-live="polite"></div>
      </div>
    </div>`;
  const svg = root.querySelector('.mb-svg');
  const stage = root.querySelector('.mb-stage');
  const panel = root.querySelector('.mb-panel');
  const steps = [...root.querySelectorAll('.mb-steps li')];
  const pop = root.querySelector('.mb-pop');
  let visible = false;
  onVisible(root, (v) => { visible = v; root.classList.toggle('live', v); });

  // ── the drink ──
  function draw(extra = {}) {
    const V = VESSEL[state.base];
    const span = V.bottom - V.top;
    const w = state.whisk / 100;
    const green = mix('#7a8442', '#76b83c', w);
    const greenTop = mix('#8e9a52', '#a8d870', w);
    const milkAmt = state.noMilk ? 0 : state.milk / 100;
    let layers = '';
    let surface = V.bottom;
    const pouring = extra.pouring;
    if (state.base === 'iced') {
      const milkH = milkAmt * (1 - V.m0) * span;
      const greenH = (state.step >= 1 ? V.m0 : 0) * span;
      const milkTop = V.bottom - milkH;
      surface = milkTop - greenH;
      if (milkH > 0) layers += `<rect x="0" y="${milkTop}" width="${W}" height="${milkH + 4}" fill="#fbf4e6"/>`;
      if (greenH > 0) {
        layers += `<rect x="0" y="${surface}" width="${W}" height="${greenH}" fill="${green}"/>`;
        if (milkH > 0) layers += `<rect x="0" y="${milkTop - 10}" width="${W}" height="18" fill="url(#mbBlend)"/>`;
      }
      layers += [[84, 0.78], [128, 0.62], [104, 0.46], [142, 0.3]].map(([x, f], k) => {
        const y = V.top + span * f;
        return `<rect x="${x}" y="${y}" width="30" height="28" rx="7" fill="rgba(255,255,255,.5)" stroke="rgba(255,255,255,.95)" stroke-width="2" transform="rotate(${k % 2 ? 12 : -10} ${x + 15} ${y + 14})"/>`;
      }).join('');
    } else {
      const fill = (state.step >= 1 ? V.m0 : 0) + milkAmt * (1 - V.m0) * 0.95;
      const h = fill * span;
      surface = V.bottom - h;
      const col = mix(green, '#efe3c6', milkAmt * 0.75);
      if (h > 0) layers += `<rect x="0" y="${surface}" width="${W}" height="${h + 4}" fill="${col}"/>`;
    }
    // froth on top
    if (state.step >= 1 && surface < V.bottom) {
      const fh = 3 + w * 9 + (state.base !== 'iced' ? milkAmt * 6 : 0);
      const ftop = mix(greenTop, '#fff7e6', state.base === 'hot' ? milkAmt * 0.8 : 0);
      layers += `<rect x="0" y="${surface - 1}" width="${W}" height="${fh}" fill="${ftop}"/>`;
      const n = Math.round(4 + w * 18);
      let seed = 7;
      const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
      for (let k = 0; k < n; k++) layers += `<circle cx="${40 + rnd() * 160}" cy="${surface + 1 + rnd() * fh * 0.8}" r="${1 + rnd() * 2.6}" fill="rgba(255,255,255,${0.35 + rnd() * 0.4})"/>`;
      if (w < 0.35) for (let k = 0; k < 7; k++) layers += `<circle cx="${60 + rnd() * 120}" cy="${surface + 2 + rnd() * 6}" r="${2 + rnd() * 2.5}" fill="#5c6b2c" opacity="${0.8 - w * 2}"/>`;
      // latte art when the milk is just right (hot)
      if (state.base === 'hot' && state.milk >= 45 && state.milk <= 72 && state.step >= 2 && !pouring) {
        layers += `<path d="M120 ${surface + 9}s-13-6-13-12c0-4 3-6 6-6 3 0 5 2 7 4 2-2 4-4 7-4 3 0 6 2 6 6 0 6-13 12-13 12z" fill="#fffaf0" opacity=".95"/>`;
      }
    }
    // milk stream
    if (pouring) layers += `<rect x="${state.base === 'iced' ? 138 : 132}" y="0" width="7" height="${surface}" rx="3.5" fill="#fffaf0" class="mb-stream"/>`;
    const band = state.step === 2 && !state.noMilk && state.base !== 'bowl' ? (() => {
      const y1 = state.base === 'iced' ? V.bottom - 0.72 * (1 - V.m0) * span - V.m0 * span : V.bottom - (V.m0 + 0.72 * (1 - V.m0) * 0.95) * span;
      const y2 = state.base === 'iced' ? V.bottom - 0.45 * (1 - V.m0) * span - V.m0 * span : V.bottom - (V.m0 + 0.45 * (1 - V.m0) * 0.95) * span;
      return `<g class="mb-band"><rect x="${state.base === 'iced' ? 180 : 190}" y="${y1}" width="6" height="${y2 - y1}" rx="3" fill="#ff2e88"/><text x="${state.base === 'iced' ? 192 : 202}" y="${(y1 + y2) / 2 + 4}" font-size="11" font-weight="800" fill="#e0136f" font-family="Manrope, sans-serif">${t('just right', 'mazboot')}</text></g>`;
    })() : '';
    const straw = state.base === 'iced' ? `<g><rect x="132" y="-6" width="11" height="200" rx="5.5" fill="#ff2e88" transform="rotate(14 138 100)"/><rect x="132" y="-6" width="11" height="200" rx="5.5" fill="url(#mbStripe)" transform="rotate(14 138 100)" opacity=".5"/></g>` : '';
    const steam = state.base === 'hot' && state.step >= 1 ? `<g class="mb-steam" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".75"><path d="M98 92c-8-12 8-18 0-30"/><path d="M122 86c-8-12 8-18 0-32"/><path d="M146 92c-8-12 8-18 0-30"/></g>` : '';
    const handle = state.base === 'hot' ? `<path d="M184 138q36 0 32 32t-34 30" fill="none" stroke="#fff" stroke-width="13" stroke-linecap="round"/><path d="M184 138q36 0 32 32t-34 30" fill="none" stroke="#f1dccb" stroke-width="3" stroke-linecap="round"/>` : '';
    const saucer = state.base === 'hot' ? `<ellipse cx="120" cy="262" rx="96" ry="13" fill="#fff" stroke="#f1dccb" stroke-width="3"/>` : '';
    const vesselFill = state.base === 'iced' ? 'rgba(255,255,255,.28)' : state.base === 'hot' ? '#fff' : '#f6e8d8';
    const front = state.base === 'iced'
      ? `<path d="${VESSEL.iced.shape}" fill="none" stroke="rgba(255,255,255,.95)" stroke-width="5"/><path d="M74 56l-6 150" stroke="rgba(255,255,255,.7)" stroke-width="6" stroke-linecap="round"/>`
      : state.base === 'hot'
        ? `<path d="M62 120v96" stroke="rgba(255,255,255,.75)" stroke-width="6" stroke-linecap="round"/><path d="M80 236q40 18 80 0" fill="none" stroke="#ff8cc0" stroke-width="5" stroke-linecap="round" opacity=".8"/>`
        : `<path d="M40 176Q70 236 120 240T200 176" fill="none" stroke="#ff8cc0" stroke-width="6" stroke-linecap="round" opacity=".7"/><g fill="#4a2c20"><circle cx="102" cy="206" r="3.6"/><circle cx="138" cy="206" r="3.6"/></g><path d="M113 214q7 6 14 0" fill="none" stroke="#4a2c20" stroke-width="3" stroke-linecap="round"/>`;
    const jug = state.step === 2 && !state.noMilk ? `<g class="mb-jug${pouring ? ' tilt' : ''}"><path d="M150 0h56l-4 54q-1 8-9 8h-30q-8 0-9-8z" fill="#fff" stroke="#e8d6c6" stroke-width="3"/><path d="M150 4l-14 6 12 6" fill="#fff" stroke="#e8d6c6" stroke-width="3" stroke-linejoin="round"/><path d="M206 12q16 4 12 20t-14 14" fill="none" stroke="#e8d6c6" stroke-width="5"/><rect x="160" y="24" width="38" height="6" rx="3" fill="#ffd3e5"/></g>` : '';
    const whisker = state.step === 1 ? `<g class="mb-whisk" style="--wx:${extra.wx ?? 0}px"><rect x="112" y="${surface - 120}" width="15" height="62" rx="7" fill="#d8b46e"/><rect x="112" y="${surface - 90}" width="15" height="5" fill="#b88f47"/><g stroke="#ecd49a" stroke-width="2.6" stroke-linecap="round"><path d="M114 ${surface - 58}l-10 46M117 ${surface - 58}l-4 48M120 ${surface - 58}v49M123 ${surface - 58}l4 48M126 ${surface - 58}l10 46"/></g></g>` : '';
    svg.innerHTML = `
      <defs>
        <clipPath id="mbClip"><path d="${VESSEL[state.base].inner}"/></clipPath>
        <linearGradient id="mbBlend" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${green}"/><stop offset="1" stop-color="#fbf4e6"/></linearGradient>
        <pattern id="mbStripe" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="5" height="10" fill="#fff"/></pattern>
      </defs>
      <ellipse cx="120" cy="270" rx="92" ry="9" fill="rgba(74,44,32,.14)"/>
      ${saucer}${handle}${steam}
      <path d="${VESSEL[state.base].shape}" fill="${vesselFill}"/>
      ${straw}
      <g clip-path="url(#mbClip)">${layers}</g>
      ${front}${band}${jug}${whisker}`;
  }

  const paintSteps = () => steps.forEach((li, i) => { li.classList.toggle('on', i === state.step); li.classList.toggle('done', i < state.step); });
  const say = (txt) => { pop.textContent = txt; pop.classList.remove('show'); void pop.offsetWidth; pop.classList.add('show'); };

  // ── 1 · base ──
  function stepBase() {
    state.step = 0; state.whisk = 0; state.milk = 0; state.noMilk = false;
    paintSteps();
    panel.innerHTML = `
      <p class="mb-q">${t('How would you like it?', 'Te7ebbeeha ezay?')}</p>
      <div class="mb-bases" role="radiogroup" aria-label="${t('Base', 'El no3')}">
        ${[['iced', '🧊', t('Iced', 'Sa23a')], ['hot', '☕', t('Hot latte', 'Latte sokhna')], ['bowl', '🍵', t('Classic bowl', 'Bowl classic')]].map(([k, ic, l]) => `<button type="button" role="radio" aria-checked="${state.base === k}" data-base="${k}"><span>${ic}</span><b>${l}</b></button>`).join('')}
      </div>
      <p class="mb-q small">${t('Sweetness', 'El sokkar')}</p>
      <div class="mb-sugar" role="radiogroup" aria-label="${t('Sweetness', 'El sokkar')}">
        ${SUGAR.map((s, i) => `<button type="button" role="radio" aria-checked="${state.sugar === i}" data-sugar="${i}">${['🚫', '🍯', '🍬'][i]} ${s}</button>`).join('')}
      </div>
      <button type="button" class="btn btn-pink mb-next" data-next>${t('Whisk it →', 'Yalla nekhfo2 →')}</button>`;
    panel.querySelectorAll('[data-base]').forEach((b) => b.addEventListener('click', () => {
      state.base = b.dataset.base;
      panel.querySelectorAll('[data-base]').forEach((x) => x.setAttribute('aria-checked', String(x === b)));
      sfx.pop(); buzz(8);
      stage.classList.remove('swap'); void stage.offsetWidth; stage.classList.add('swap');
      draw();
    }));
    panel.querySelectorAll('[data-sugar]').forEach((b) => b.addEventListener('click', () => {
      state.sugar = +b.dataset.sugar;
      panel.querySelectorAll('[data-sugar]').forEach((x) => x.setAttribute('aria-checked', String(x === b)));
      sfx.click(); buzz(6);
      if (state.sugar === 2) say(t('Sugar?! 👀', 'Sokkar?! 👀'));
    }));
    panel.querySelector('[data-next]').addEventListener('click', () => { sfx.click(); stepWhisk(); });
    draw();
  }

  // ── 2 · whisk ──
  let stopJolt = null;
  function stepWhisk() {
    state.step = 1;
    paintSteps();
    const ask = motion.needsAsk && coarse;
    let wx = 0;
    panel.innerHTML = `
      <p class="mb-q">${motion.live ? t('Shake your phone to whisk — or swipe fast across the drink.', 'Hezzy el mobile 3ashan tekhfo2y — aw es7aby besor3a 3al mashroob.') : t('Swipe fast, side to side, across the drink.', 'Es7aby besor3a yemeen w shmal 3al mashroob.')}</p>
      <div class="mb-meter"><i></i><span>0%</span></div>
      <div class="mb-row">
        ${ask ? `<button type="button" class="ask-motion" data-ask>📳 ${t('Whisk by shaking', 'Ekhfo2y bel hazz')}</button>` : ''}
        <button type="button" class="btn btn-glass" data-tapwhisk>${t('Whisk!', 'Ekhfo2y!')} 🥢</button>
        <button type="button" class="btn btn-pink" data-next disabled>${t('Pour the milk →', 'Sobby el laban →')}</button>
      </div>`;
    const meter = panel.querySelector('.mb-meter i');
    const label = panel.querySelector('.mb-meter span');
    const next = panel.querySelector('[data-next]');
    let done = false, ticks = 0;
    const add = (v) => {
      if (state.step !== 1) return;
      state.whisk = Math.min(100, state.whisk + v);
      meter.style.width = `${state.whisk}%`;
      label.textContent = `${Math.round(state.whisk)}%`;
      if (++ticks % 3 === 0) draw({ wx: wx });
      if (state.whisk > 30) next.disabled = false;
      if (state.whisk >= 100 && !done) {
        done = true;
        draw();
        sfx.ding(); buzz([10, 40, 20]);
        say(t('Perfectly frothy! 💚', 'Ra8weya mazboota! 💚'));
        confettiFrom(stage, { count: 18, spread: 0.4, emoji: ['🍵', '💚', '✨'] });
        next.classList.add('mb-nudge');
      }
    };
    panel.querySelector('[data-tapwhisk]').addEventListener('click', () => { add(5); buzz(5); sfx.key(); stage.classList.remove('jig'); void stage.offsetWidth; stage.classList.add('jig'); });
    panel.querySelector('[data-ask]')?.addEventListener('click', async (e) => {
      const b = e.currentTarget;
      const ok = await motion.ask();
      b.remove();
      if (ok) panel.querySelector('.mb-q').textContent = t('Shake your phone to whisk — or swipe fast across the drink.', 'Hezzy el mobile 3ashan tekhfo2y — aw es7aby besor3a 3al mashroob.');
    });
    next.addEventListener('click', () => { stopJolt?.(); stopJolt = null; sfx.click(); state.base === 'bowl' ? stepMilk(true) : stepMilk(false); });
    // shake to whisk
    stopJolt?.();
    stopJolt = motion.onJolt((d) => {
      if (!visible || state.step !== 1 || d < 6) return;
      add(Math.min(4, d * 0.09));
      if (d > 14) buzz(4);
    });
    // swipe to whisk
    whiskSwipe = (dx, speed) => {
      wx = Math.max(-40, Math.min(40, dx));
      add(2 + Math.min(3, speed * 2.4));
      buzz(4);
      if (ticks % 4 === 0) sfx.key();
    };
    draw();
  }
  let whiskSwipe = null;
  {
    let lastX = 0, dir = 0, run = 0, lastT = 0;
    drag(stage, {
      axis: 'x',
      start: (e) => { if (state.step !== 1) return false; lastX = e.clientX; dir = 0; run = 0; lastT = performance.now(); },
      move: ({ x, dx }) => {
        const d = x - lastX;
        lastX = x;
        if (!d) return;
        const s = Math.sign(d);
        run += Math.abs(d);
        const svgW = stage.querySelector('.mb-whisk');
        if (svgW) svgW.style.setProperty('--wx', `${Math.max(-40, Math.min(40, dx * 0.5))}px`);
        if (s !== dir) {
          if (dir !== 0 && run > 16) {
            const now = performance.now();
            const speed = run / Math.max(16, now - lastT);
            lastT = now;
            whiskSwipe?.(dx * 0.5, speed);
          }
          dir = s; run = 0;
        }
      },
      end: () => { const svgW = stage.querySelector('.mb-whisk'); if (svgW) svgW.style.setProperty('--wx', '0px'); },
    });
  }

  // ── 3 · milk ──
  function stepMilk(bowl) {
    state.step = 2;
    state.milk = 0;
    state.noMilk = bowl;
    paintSteps();
    panel.innerHTML = `
      <p class="mb-q">${bowl ? t('A classic bowl has no milk. Keep it pure — or add a splash?', 'El bowl el classic men 8eir laban. Tsebeeha keda — walla shwayet laban?') : t('Press and hold to pour. Let go in the pink zone.', 'Dosy w emseky 3ashan tsobby. Seeby fel mante2a el pink.')}</p>
      ${bowl ? `<div class="mb-row"><button type="button" class="btn btn-pink" data-pure>${t('Keep it pure 🍵', 'Khalleeha keda 🍵')}</button><button type="button" class="btn btn-glass" data-splash>${t('Add a splash 🥛', 'Shwayet laban 🥛')}</button></div>` : ''}
      <div class="mb-pourwrap" ${bowl ? 'hidden' : ''}>
        <div class="mb-meter milk"><i></i><b class="mb-zone"></b><span>0%</span></div>
        <div class="mb-row">
          <button type="button" class="mb-hold" data-hold><span>🥛</span> ${t('Hold to pour', 'Emseky 3ashan tsobby')}</button>
          <button type="button" class="btn btn-pink" data-next disabled>${t('Serve →', 'Ady →')}</button>
        </div>
      </div>`;
    const pourwrap = panel.querySelector('.mb-pourwrap');
    panel.querySelector('[data-pure]')?.addEventListener('click', () => { sfx.click(); state.noMilk = true; stepServe(); });
    panel.querySelector('[data-splash]')?.addEventListener('click', () => { sfx.click(); state.noMilk = false; pourwrap.hidden = false; panel.querySelector('.mb-row').remove(); draw(); });
    const hold = panel.querySelector('[data-hold]');
    const next = panel.querySelector('[data-next]');
    const meter = panel.querySelector('.mb-meter.milk i');
    const label = panel.querySelector('.mb-meter.milk span');
    let raf = 0, last = 0, pouring = false, tick = 0;
    const loop = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      state.milk = Math.min(100, state.milk + dt * 34);
      meter.style.width = `${state.milk}%`;
      label.textContent = `${Math.round(state.milk)}%`;
      draw({ pouring: true });
      if (++tick % 8 === 0) buzz(3);
      if (state.milk >= 100) { stop(); say(t('Whoa — overflow! 😅', 'Eh dah — fa2 3al 7aga! 😅')); sfx.buzz(); buzz([30, 30, 30]); stage.classList.add('spill'); setTimeout(() => stage.classList.remove('spill'), 900); return; }
      raf = requestAnimationFrame(loop);
    };
    const start = (e) => {
      e.preventDefault();
      if (pouring) return;
      pouring = true;
      hold.classList.add('on');
      sfx.boop();
      last = performance.now();
      raf = requestAnimationFrame(loop);
    };
    const stop = () => {
      if (!pouring) return;
      pouring = false;
      hold.classList.remove('on');
      cancelAnimationFrame(raf);
      draw();
      next.disabled = state.milk < 5;
      if (state.milk >= 45 && state.milk <= 72) { say(t('Just right ✨', 'Mazboot ✨')); sfx.ding(); buzz(10); next.classList.add('mb-nudge'); }
    };
    hold.addEventListener('pointerdown', start);
    ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => hold.addEventListener(ev, stop));
    hold.addEventListener('keydown', (e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) start(e); });
    hold.addEventListener('keyup', (e) => { if (e.key === ' ' || e.key === 'Enter') stop(); });
    hold.addEventListener('contextmenu', (e) => e.preventDefault());
    next.addEventListener('click', () => { sfx.click(); stepServe(); });
    draw();
  }

  // ── 4 · serve ──
  function stepServe() {
    state.step = 3;
    paintSteps();
    draw();
    const whiskPts = (state.whisk / 100) * 2;
    const milkPts = state.noMilk ? 2 : Math.max(0, 2 - Math.max(0, 45 - state.milk, state.milk - 72) / 14);
    const sugarPts = state.sugar < 2 ? 1 : 0;
    const score = Math.max(0, Math.min(5, Math.round(whiskPts + milkPts + sugarPts)));
    const name = names[state.base] || '';
    const verdict = (M.verdicts || [])[score] || '';
    const leaves = Array.from({ length: 5 }, (_, i) => `<i class="${i < score ? 'on' : ''}" style="--i:${i}">🍃</i>`).join('');
    panel.innerHTML = `
      <div class="mb-result">
        <span class="sec-badge">${t('Served', 'Et2addem')} · ${new Date().toLocaleDateString(t('en-GB', 'en-GB'), { day: 'numeric', month: 'short' })}</span>
        <h3>${esc(name)}</h3>
        <div class="mb-leaves" aria-label="${t(`${score} out of 5`, `${score} men 5`)}">${leaves}</div>
        <ul class="mb-stats">
          <li><span>${t('Whisk', 'El khaf2')}</span><b>${Math.round(state.whisk)}%</b></li>
          <li><span>${t('Milk', 'El laban')}</span><b>${state.noMilk ? t('none', 'mafeesh') : `${Math.round(state.milk)}%`}</b></li>
          <li><span>${t('Sweet', 'Sokkar')}</span><b>${SUGAR[state.sugar]}</b></li>
        </ul>
        <p class="mb-verdict">${esc(verdict)}</p>
        ${state.sugar === 2 && M.sugar ? `<p class="mb-sugar-note">🦷 ${esc(M.sugar)}</p>` : ''}
        <div class="mb-row">
          <button type="button" class="btn btn-pink" data-save>${t('Save the card', 'E7fazy el card')} 💾</button>
          <button type="button" class="btn btn-glass" data-again>${t('Make another', 'E3mely wa7da tanya')}</button>
        </div>
      </div>`;
    stage.classList.remove('served'); void stage.offsetWidth; stage.classList.add('served');
    sfx.tada();
    buzz([12, 50, 12, 50, 24]);
    confettiFrom(stage, { count: score >= 4 ? 60 : 24, spread: 0.6, emoji: ['🍵', '💚', '🍃', '✨'] });
    if (score === 5) egg('barista');
    panel.querySelector('[data-again]').addEventListener('click', () => { sfx.click(); stage.classList.remove('served'); stepBase(); });
    panel.querySelector('[data-save]').addEventListener('click', () => saveCard({ name, score, verdict }));
  }

  // ── a picture of the card, made here on the phone ──
  async function saveCard({ name, score, verdict }) {
    sfx.shutter();
    buzz(12);
    const S = { w: 1080, h: 1350 };
    const cv = document.createElement('canvas');
    cv.width = S.w; cv.height = S.h;
    const g = cv.getContext('2d');
    const bg = g.createLinearGradient(0, 0, S.w, S.h);
    bg.addColorStop(0, '#f3fae9'); bg.addColorStop(0.55, '#fff4f8'); bg.addColorStop(1, '#ffe1ee');
    g.fillStyle = bg; g.fillRect(0, 0, S.w, S.h);
    g.fillStyle = 'rgba(127,178,74,.16)';
    g.beginPath(); g.arc(S.w * 0.85, 160, 260, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(255,46,136,.1)';
    g.beginPath(); g.arc(120, S.h - 120, 300, 0, Math.PI * 2); g.fill();
    const src = new XMLSerializer().serializeToString(svg).replace('<svg', `<svg xmlns="http://www.w3.org/2000/svg" width="${W * 3}" height="${H * 3}"`);
    const img = new Image();
    await new Promise((res) => { img.onload = res; img.onerror = res; img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(src)}`; });
    try { g.drawImage(img, (S.w - W * 2.6) / 2, 150, W * 2.6, H * 2.6); } catch {}
    g.textAlign = 'center';
    g.fillStyle = '#e0136f';
    g.font = '800 34px Manrope, sans-serif';
    g.fillText(t('THE MATCHA BAR', 'EL MATCHA BAR'), S.w / 2, 110);
    g.fillStyle = '#2a1712';
    g.font = '600 72px Fraunces, Georgia, serif';
    g.fillText(name, S.w / 2, 960);
    g.font = '64px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
    for (let i = 0; i < 5; i++) { g.globalAlpha = i < score ? 1 : 0.22; g.fillText('🍃', S.w / 2 + (i - 2) * 92, 1060); }
    g.globalAlpha = 1;
    g.fillStyle = '#8a5a44';
    g.font = '600 38px Manrope, sans-serif';
    wrap(g, verdict, S.w / 2, 1140, 900, 50);
    g.fillStyle = '#c9a58a';
    g.font = '700 28px Manrope, sans-serif';
    g.fillText(`rajiea.com · ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`, S.w / 2, S.h - 50);
    cv.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], 'matcha-card.png', { type: 'image/png' });
      try {
        if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file] }); return; }
      } catch (e) { if (e?.name === 'AbortError') return; }
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'matcha-card.png';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      toast(`<span>💾</span><b>${t('Card saved', 'El card et7afazet')}</b>`, 2200);
    }, 'image/png');
  }

  stepBase();
}

function wrap(g, text, x, y, max, lh) {
  const words = String(text).split(/\s+/);
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (g.measureText(test).width > max && line) { g.fillText(line, x, y); line = w; y += lh; } else line = test;
  }
  if (line) g.fillText(line, x, y);
}
