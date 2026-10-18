// Barça penalty shootout: swipe up from the ball. Direction aims, speed lifts it, a curved swipe bends it.
import { capture } from '../touch.js';
const SPOT = { x: 180, y: 352 };
const GOAL = { l: 70, r: 290, top: 120, line: 230 };
const lerp = (a, b, k) => a + (b - a) * k;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const easeOut = (k) => 1 - Math.pow(1 - k, 3);

const REACH = {
  'L-low': [72, 170, 184, 234], 'L-high': [80, 170, 128, 198], C: [136, 224, 124, 234], 'R-low': [190, 288, 184, 234], 'R-high': [190, 280, 128, 198],
};
const DIVE = {
  'L-low': { x: -64, y: 10, r: -82 }, 'L-high': { x: -58, y: -22, r: -60 }, C: { x: 0, y: -24, r: 0 }, 'R-low': { x: 64, y: 10, r: 82 }, 'R-high': { x: 58, y: -22, r: 60 },
};

export function initPenalty(root, { CONFIG, t, esc, sfx, confetti, confettiFrom, egg, buzz, onVisible, rajiea: _r }) {
  const L = CONFIG.barca || {};
  const pick = (arr, fb) => (arr && arr.length ? arr[Math.floor(Math.random() * arr.length)] : fb);
  let best = +(localStorage.getItem('rajiea-pk-best') || 0);
  const crowd = Array.from({ length: 150 }, (_, i) => {
    const row = Math.floor(i / 30), x = (i % 30) * 12.4 + (row % 2) * 6 + 2;
    const c = ['#004d98', '#a50044', '#edbb00', '#ffffff', '#004d98', '#a50044'][(i * 7 + row) % 6];
    return `<circle cx="${x}" cy="${22 + row * 15}" r="${4.6 - row * 0.2}" fill="${c}" opacity="${0.55 + (row / 10)}"/>`;
  }).join('');
  root.innerHTML = `
    <div class="pk-card">
      <div class="pk-board">
        <div class="pk-team"><span class="pk-crest" aria-hidden="true"><i></i><i></i></span><b>BARÇA</b></div>
        <ol class="pk-dots" aria-label="${t('Kicks', 'El darabat')}">${'<li></li>'.repeat(5)}</ol>
        <div class="pk-best">${t('Best', 'A7san')} <b>${best}/5</b></div>
      </div>
      <div class="pk-pitch">
        <svg class="pk-svg" viewBox="0 0 360 400" role="img" aria-label="${t('A goal, a keeper and a ball on the penalty spot', 'Goal w 7aris w kora 3ala no2tet el gaza2')}">
          <defs>
            <linearGradient id="pkSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b1840"/><stop offset="1" stop-color="#3b1036"/></linearGradient>
            <linearGradient id="pkGrass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2f8a3e"/><stop offset="1" stop-color="#1f6a2e"/></linearGradient>
            <radialGradient id="pkLight" cx="0.5" cy="0" r="0.8"><stop offset="0" stop-color="rgba(255,250,220,.35)"/><stop offset="1" stop-color="rgba(255,250,220,0)"/></radialGradient>
          </defs>
          <rect width="360" height="236" fill="url(#pkSky)"/>
          <g class="pk-crowd">${crowd}</g>
          <rect x="0" y="94" width="360" height="22" fill="#a50044"/>
          <g fill="#004d98">${Array.from({ length: 9 }, (_, i) => `<rect x="${i * 40 + 10}" y="94" width="20" height="22"/>`).join('')}</g>
          <text x="180" y="110" text-anchor="middle" font-family="Manrope, sans-serif" font-weight="800" font-size="12" letter-spacing="3" fill="#edbb00">VISCA BARÇA · MÉS QUE UN CLUB</text>
          <rect width="360" height="236" fill="url(#pkLight)"/>
          <rect y="230" width="360" height="170" fill="url(#pkGrass)"/>
          <g fill="rgba(255,255,255,.05)">${Array.from({ length: 5 }, (_, i) => `<path d="M${-40 + i * 96} 400L${36 + i * 72} 230h36L${8 + i * 96} 400z"/>`).join('')}</g>
          <g fill="none" stroke="rgba(255,255,255,.75)" stroke-width="2"><path d="M14 400L40 268h280l26 132"/><path d="M96 230l-8 30h184l-8-30"/></g>
          <ellipse cx="180" cy="352" rx="5" ry="2.4" fill="#fff"/>
          <g class="pk-net" stroke="rgba(255,255,255,.4)" stroke-width="1">
            <path d="M84 132h192v92H84z" fill="rgba(255,255,255,.06)"/>
            ${Array.from({ length: 12 }, (_, i) => `<path d="M${84 + i * 17.45} 132v92M${70 + i * 20} 120L${84 + i * 17.45} 132"/>`).join('')}
            ${Array.from({ length: 6 }, (_, i) => `<path d="M84 ${132 + i * 18.4}h192M70 ${120 + i * 22}L84 ${132 + i * 18.4}M290 ${120 + i * 22}L276 ${132 + i * 18.4}"/>`).join('')}
          </g>
          <g stroke="#fff" stroke-width="6" stroke-linecap="round" fill="none"><path d="M70 231V120h220v111"/></g>
          <g id="pkKeeper" transform="translate(180 230)"><g class="pk-kp">
            <ellipse cx="0" cy="1" rx="20" ry="4" fill="rgba(0,0,0,.28)"/>
            <rect x="-11" y="-26" width="8" height="26" rx="4" fill="#20202a"/><rect x="3" y="-26" width="8" height="26" rx="4" fill="#20202a"/>
            <rect x="-13" y="-36" width="26" height="13" rx="5" fill="#20202a"/>
            <path d="M-14-56L-34-70M14-56L34-70" stroke="#c8e84a" stroke-width="8" stroke-linecap="round"/>
            <rect x="-15" y="-62" width="30" height="30" rx="9" fill="#c8e84a"/>
            <text x="0" y="-41" text-anchor="middle" font-family="Manrope, sans-serif" font-weight="800" font-size="12" fill="#20202a">1</text>
            <circle cx="-36" cy="-72" r="6.5" fill="#fff"/><circle cx="36" cy="-72" r="6.5" fill="#fff"/>
            <circle cx="0" cy="-72" r="10" fill="#c98f6b"/><path d="M-10-74q2-12 12-11 9 1 8 11-4-5-10-5t-10 5z" fill="#2a1712"/>
          </g></g>
          <ellipse id="pkShadow" cx="180" cy="364" rx="14" ry="4" fill="rgba(0,0,0,.3)"/>
          <g id="pkBall" transform="translate(180 352)"><g class="pk-spin">
            <circle r="14" fill="#fff" stroke="#2a1712" stroke-width="1.6"/>
            <path d="M0-5l5 3.6-2 6h-6l-2-6z" fill="#2a1712"/>
            <path d="M0-5V-13M5-1.4l7.6-2.6M3 4.6l4.6 6.6M-3 4.6l-4.6 6.6M-5-1.4l-7.6-2.6" stroke="#2a1712" stroke-width="1.5"/>
          </g></g>
          <path id="pkAim" d="" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-dasharray="2 9" opacity="0"/>
        </svg>
        <div class="pk-flash" aria-hidden="true"></div>
        <div class="pk-end" hidden></div>
        <span class="pk-swipe" aria-hidden="true"><i></i></span>
      </div>
      <p class="pk-msg" aria-live="polite">${t('Swipe up from the ball to shoot', 'Es7aby le foo2 men el kora 3ashan tshooty')}</p>
      <div class="pk-quick" role="group" aria-label="${t('Or shoot with a button', 'Aw shooty b zorar')}">
        <button type="button" data-aim="-1">↖ ${t('Left', 'Shmal')}</button>
        <button type="button" data-aim="0">↑ ${t('Middle', 'El nos')}</button>
        <button type="button" data-aim="1">↗ ${t('Right', 'Yemeen')}</button>
      </div>
    </div>`;
  const svg = root.querySelector('.pk-svg');
  const keeper = root.querySelector('#pkKeeper');
  const ball = root.querySelector('#pkBall');
  const shadow = root.querySelector('#pkShadow');
  const aim = root.querySelector('#pkAim');
  const flash = root.querySelector('.pk-flash');
  const endEl = root.querySelector('.pk-end');
  const msg = root.querySelector('.pk-msg');
  const dots = [...root.querySelectorAll('.pk-dots li')];
  const pitch = root.querySelector('.pk-pitch');
  let kick = 0, goals = 0, busy = false;
  onVisible(root, (v) => root.classList.toggle('live', v));

  const toL = (e) => { const r = svg.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * 360, y: (e.clientY - r.top) / r.height * 400, t: performance.now() }; };
  const place = (x, y, s, rot = 0) => ball.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${s.toFixed(3)}) rotate(${rot.toFixed(0)})`);
  const reset = () => {
    place(SPOT.x, SPOT.y, 1);
    shadow.setAttribute('cx', SPOT.x); shadow.setAttribute('cy', SPOT.y + 12); shadow.setAttribute('rx', 14);
    keeper.setAttribute('transform', 'translate(180 230)');
    keeper.classList.remove('dive');
    root.classList.remove('goal', 'saved');
    busy = false;
  };

  // ── swipe ──
  let pts = [];
  const predict = (p) => {
    const a = pts[0];
    const dx = p.x - a.x, dy = p.y - a.y;
    if (dy > -12) return null;
    const tx = SPOT.x + (dx / -dy) * (SPOT.y - GOAL.line) * 1.05;
    return { tx };
  };
  pitch.addEventListener('pointerdown', (e) => {
    if (busy || kick >= 5) return;
    const p = toL(e);
    if (p.y < 250) return;
    e.preventDefault();
    capture(pitch, e.pointerId);
    pts = [p];
    root.classList.add('aiming');
  });
  pitch.addEventListener('pointermove', (e) => {
    if (!pts.length) return;
    const p = toL(e);
    pts.push(p);
    if (pts.length > 40) pts.splice(1, 1);
    const pr = predict(p);
    if (!pr) { aim.setAttribute('opacity', '0'); return; }
    const mx = (SPOT.x + pr.tx) / 2 + curveOf(pts) * 150;
    aim.setAttribute('d', `M${SPOT.x} ${SPOT.y - 16}Q${mx} ${(SPOT.y + GOAL.line) / 2 - 30} ${pr.tx} ${GOAL.line - 40}`);
    aim.setAttribute('opacity', '0.85');
  });
  const release = (e) => {
    if (!pts.length) return;
    const p = toL(e);
    pts.push(p);
    const a = pts[0];
    const all = pts;
    pts = [];
    root.classList.remove('aiming');
    aim.setAttribute('opacity', '0');
    const dx = p.x - a.x, dy = p.y - a.y;
    if (dy > -25) { msg.textContent = t('Swipe up — towards the goal ⚽', 'Es7aby le foo2 — na7yet el goal ⚽'); return; }
    // speed from the last part of the swipe
    const tail = all.filter((q) => p.t - q.t < 140);
    const q0 = tail[0] || a;
    const speed = Math.hypot(p.x - q0.x, p.y - q0.y) / Math.max(16, p.t - q0.t);
    shoot({ tx: SPOT.x + (dx / -dy) * (SPOT.y - GOAL.line) * 1.05, speed, curve: curveOf(all) });
  };
  pitch.addEventListener('pointerup', release);
  pitch.addEventListener('pointercancel', () => { pts = []; root.classList.remove('aiming'); aim.setAttribute('opacity', '0'); });
  function curveOf(list) {
    if (list.length < 4) return 0;
    const a = list[0], b = list[list.length - 1];
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    let dev = 0;
    for (const q of list) { const d = ((b.x - a.x) * (a.y - q.y) - (a.x - q.x) * (b.y - a.y)) / len; if (Math.abs(d) > Math.abs(dev)) dev = d; }
    return clamp(-dev / len, -0.45, 0.45);
  }
  root.querySelectorAll('[data-aim]').forEach((b) => b.addEventListener('click', () => {
    if (busy || kick >= 5) return;
    const k = +b.dataset.aim;
    shoot({ tx: 180 + k * (70 + Math.random() * 30), speed: 0.75 + Math.random() * 0.35, curve: 0 });
  }));

  // ── the kick ──
  function shoot({ tx, speed, curve }) {
    busy = true;
    sfx.boop();
    buzz(18);
    const weak = speed < 0.32;
    const lift = weak ? 0.04 : clamp((speed - 0.32) / 1.05, 0, 1.35);
    const ty = GOAL.line - 6 - lift * 112;
    const bend = curve * 150;
    const fx = tx + bend * 0.35;
    const dur = clamp(980 - speed * 380, 480, 1000) + (weak ? 300 : 0);
    // the keeper decides
    const reads = Math.random() < (weak ? 0.75 : 0.22 + kick * 0.09);
    let dive;
    if (reads) {
      const side = Math.abs(fx - 180) < 34 ? 'C' : fx < 180 ? 'L' : 'R';
      dive = side === 'C' ? 'C' : `${side}-${ty < 180 ? 'high' : 'low'}`;
    } else dive = ['L-low', 'L-high', 'C', 'R-low', 'R-high'][Math.floor(Math.random() * 5)];
    const D = DIVE[dive];
    const t0 = performance.now();
    const step = (now) => {
      const k = Math.min(1, (now - t0) / dur);
      const e = easeOut(k);
      // quadratic path, bending out and back in
      const x = lerp(lerp(SPOT.x, (SPOT.x + fx) / 2 + bend, e), lerp((SPOT.x + fx) / 2 + bend, fx, e), e);
      const y = lerp(SPOT.y, ty, e) - Math.sin(Math.PI * e) * (12 + lift * 18);
      place(x, y, lerp(1, 0.56, e), e * 720 * (curve >= 0 ? 1 : -1));
      shadow.setAttribute('cx', x.toFixed(1));
      shadow.setAttribute('cy', lerp(SPOT.y + 12, GOAL.line + 2, e).toFixed(1));
      shadow.setAttribute('rx', lerp(14, 8, e).toFixed(1));
      // keeper dives a beat after the kick
      const kk = clamp((now - t0 - 110) / 380, 0, 1);
      const ke = easeOut(kk);
      keeper.setAttribute('transform', `translate(${(180 + D.x * ke).toFixed(1)} ${(230 + D.y * Math.sin(Math.PI * Math.min(1, kk * 1.2)) * (dive === 'C' ? 1 : 0.6) + (dive === 'C' ? 0 : D.y * 0.4 * ke)).toFixed(1)}) rotate(${(D.r * ke).toFixed(1)})`);
      if (k < 1) requestAnimationFrame(step);
      else land(fx, ty, dive, weak);
    };
    requestAnimationFrame(step);
  }

  function land(x, y, dive, weak) {
    let res;
    const corner = (x < 94 || x > 266) && y < 148;
    const [x1, x2, y1, y2] = REACH[dive];
    if (y < GOAL.top - 5) res = 'over';
    else if (x < GOAL.l - 7 || x > GOAL.r + 7) res = 'wide';
    else if (Math.abs(x - GOAL.l) < 7 || Math.abs(x - GOAL.r) < 7 || Math.abs(y - GOAL.top) < 5) res = 'post';
    else if (!corner && x > x1 && x < x2 && y > y1 && y < y2) res = 'saved';
    else res = 'goal';
    const scored = res === 'goal';
    dots[kick].className = scored ? 'goal' : 'miss';
    kick++;
    if (scored) goals++;
    const text = {
      goal: pick(L.goal, 'GOAL!'), saved: pick(L.saved, t('Saved!', 'Et-sadet!')), wide: pick(L.wide, t('Wide!', 'Barra!')),
      over: pick(L.over, t('Over the bar!', 'Foo2 el 3arda!')), post: t('Off the post! 😱', 'F el 3amood! 😱'),
    }[res];
    msg.textContent = weak && res === 'saved' ? pick(L.weak, text) : text;
    flash.textContent = { goal: 'GOOOAL!', saved: t('SAVED!', 'ET-SADET!'), wide: t('WIDE!', 'BARRA!'), over: t('OVER!', 'FOO2!'), post: t('POST!', 'EL 3AMOOD!') }[res];
    flash.className = `pk-flash show ${res}`;
    if (scored) {
      root.classList.add('goal');
      sfx.tada();
      buzz([30, 60, 30, 60, 60]);
      confetti({ x: innerWidth / 2, y: svg.getBoundingClientRect().top + 60, count: 90, colors: ['#004d98', '#a50044', '#edbb00', '#004d98', '#a50044'] });
    } else {
      root.classList.add('saved');
      if (res === 'saved') { sfx.buzz(); buzz([40, 30, 40]); } else { sfx.whoosh(); buzz(20); }
      // the ball drops away
      const bx = x, by = y;
      const t0 = performance.now();
      const fall = (now) => {
        const k = Math.min(1, (now - t0) / 600);
        const ox = res === 'saved' ? (bx < 180 ? -1 : 1) * 60 * k : (res === 'post' ? (bx < 180 ? 40 : -40) * k : 0);
        const oy = res === 'over' ? -40 * k : 120 * k * k - 40 * k;
        place(bx + ox, by + oy, lerp(0.56, res === 'over' ? 0.4 : 0.6, k), 900 * k);
        if (k < 1) requestAnimationFrame(fall);
      };
      requestAnimationFrame(fall);
    }
    setTimeout(() => {
      flash.className = 'pk-flash';
      if (kick >= 5) end();
      else { reset(); msg.textContent = t(`Kick ${kick + 1} of 5 — swipe up`, `Darba ${kick + 1} men 5 — es7aby le foo2`); }
    }, 1500);
  }

  function end() {
    const isBest = goals > best;
    if (isBest) { best = goals; try { localStorage.setItem('rajiea-pk-best', String(best)); } catch {} root.querySelector('.pk-best b').textContent = `${best}/5`; }
    const line = (L.end || [])[goals] || '';
    msg.textContent = t('Full time!', 'Khalas el match!');
    endEl.innerHTML = `
      <div class="pk-end-in">
        <span class="pk-trophy" aria-hidden="true">${goals === 5 ? '🏆' : goals >= 3 ? '⚽' : '🧤'}</span>
        <b>${goals} / 5</b>
        <p>${esc(line)}</p>
        ${isBest && goals ? `<small>${t('New best!', 'Raqam gdeed!')}</small>` : ''}
        <button type="button" class="btn btn-pink">${t('Again', 'Tany')} ⚽</button>
      </div>`;
    endEl.hidden = false;
    if (goals === 5) {
      egg('penalty');
      const r = svg.getBoundingClientRect();
      for (let k = 0; k < 3; k++) setTimeout(() => confetti({ x: r.left + r.width * (0.2 + k * 0.3), y: r.top + 40, count: 80, colors: ['#004d98', '#a50044', '#edbb00'] }), k * 260);
      confettiFrom(endEl, { count: 30, emoji: ['⚽', '🏆', '💙', '❤️'] });
    }
    endEl.querySelector('button').addEventListener('click', () => {
      sfx.click();
      kick = 0; goals = 0;
      dots.forEach((d) => (d.className = ''));
      endEl.hidden = true;
      reset();
      msg.textContent = t('Swipe up from the ball to shoot', 'Es7aby le foo2 men el kora 3ashan tshooty');
    });
  }
  reset();
}
