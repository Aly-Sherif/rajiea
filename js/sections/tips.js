// Smile School: myth or fact. A grid of flip cards on wide screens; on phones a swipe deck
// (swipe right = fact, left = myth — the two buttons still work too).
import { drag, buzz } from '../touch.js';

const esc = (x) => String(x).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function initTips(grid, { tips, t, sfx, confetti, confettiFrom, egg, reveal, scoreEl, totalEl }) {
  const deckMQ = matchMedia('(max-width: 699px)');
  const isDeck = () => deckMQ.matches && !grid.classList.contains('review');
  totalEl.textContent = tips.length;
  grid.innerHTML = tips.map((tp, i) => `
  <div class="mf-card" data-reveal style="--d:${i % 4}" data-i="${i}">
    <div class="mf-inner">
      <div class="mf-face mf-front">
        <span class="mf-num">#${i + 1}</span>
        <span class="mf-stamp is-fact" aria-hidden="true">${t('Fact', '7a2ee2a')}</span>
        <span class="mf-stamp is-myth" aria-hidden="true">${t('Myth', 'Khorafa')}</span>
        <p class="mf-claim">${esc(tp.claim)}</p>
        <div class="mf-btns">
          <button type="button" data-guess="myth">${t('Myth', 'Khorafa')}</button>
          <button type="button" data-guess="fact">${t('Fact', '7a2ee2a')}</button>
        </div>
      </div>
      <div class="mf-face mf-back ${tp.fact ? 'is-fact' : 'is-myth'}">
        <span class="mf-verdict">${tp.fact ? t('Fact ✓', '7a2ee2a ✓') : t('Myth ✗', 'Khorafa ✗')}</span>
        <p class="mf-result"></p>
        <p class="mf-why">${esc(tp.why)}</p>
        <div class="mf-back-btns">
          <button type="button" class="mf-flip">${t('Flip back', 'E2leby tany')}</button>
          <button type="button" class="mf-next">${t('Next card →', 'El card elly ba3daha →')}</button>
        </div>
      </div>
    </div>
  </div>`).join('') + `
  <div class="mf-end" hidden>
    <div class="mf-end-in">
      <span class="mf-end-icon" aria-hidden="true">🎓</span>
      <b class="mf-end-score"></b>
      <p class="mf-end-line"></p>
      <button type="button" class="btn btn-pink mf-review">${t('Review the cards', 'Raaje3y el cards')}</button>
    </div>
  </div>
  <p class="mf-deck-hint" aria-hidden="true"><span>← ${t('Myth', 'Khorafa')}</span><i>${t('swipe the card', 'es7aby el card')}</i><span>${t('Fact', '7a2ee2a')} →</span></p>
  <p class="mf-count" aria-live="polite"></p>`;
  const cards = [...grid.querySelectorAll('.mf-card')];
  const endEl = grid.querySelector('.mf-end');
  const countEl = grid.querySelector('.mf-count');
  cards.forEach((el) => reveal.observe(el));

  let score = 0, answered = 0;
  const top = () => cards.find((c) => !c.classList.contains('done'));
  // stack order for the deck: the first card that isn't done is on top
  const stack = () => {
    let k = 0;
    for (const c of cards) {
      if (c.classList.contains('done')) { c.style.removeProperty('--k'); continue; }
      c.style.setProperty('--k', k);
      c.classList.toggle('top', k === 0);
      k++;
    }
    const left = cards.filter((c) => !c.classList.contains('done')).length;
    countEl.textContent = left ? t(`Card ${cards.length - left + 1} of ${cards.length}`, `Card ${cards.length - left + 1} men ${cards.length}`) : '';
    endEl.hidden = left > 0;
    if (!left) {
      grid.querySelector('.mf-end-score').textContent = t(`${score} / ${cards.length}`, `${score} / ${cards.length}`);
      grid.querySelector('.mf-end-line').textContent = score === cards.length
        ? t('Top of the class — every single one.', 'El awela 3al daf3a — kollohom sa7.')
        : t('Every card is still there to review.', 'Kol el cards mawgooda law 7abbeity teraaje3y.');
    }
  };

  const guess = (card, g, btn) => {
    const tp = tips[+card.dataset.i];
    if (card.classList.contains('answered')) { card.classList.add('flipped'); return; }
    const right = (g === 'fact') === tp.fact;
    card.classList.add('answered', 'flipped', right ? 'got' : 'missed');
    card.dataset.badge = right ? t('Got it ✓', 'Sa7 ✓') : t('Missed', 'Fatek');
    card.querySelector('.mf-result').textContent = right ? t('You got it! 🎉', 'Sa7 3aleeky! 🎉') : t('Not quite — here’s the truth:', 'Msh bel zabt — di el 7a2ee2a:');
    card.querySelectorAll('[data-guess]').forEach((x) => (x.disabled = true));
    (btn || card.querySelector(`[data-guess="${g}"]`)).classList.add('picked');
    if (right) { score++; sfx.ding(); buzz(12); confettiFrom(card, { count: 24, spread: 0.6 }); } else { sfx.buzz(); buzz([20, 40, 20]); }
    answered++;
    scoreEl.textContent = score;
    if (answered === tips.length && score === tips.length) setTimeout(() => { sfx.tada(); confetti({ count: 160 }); egg('scholar'); }, 500);
  };
  const next = (card, dir = 1) => {
    if (!isDeck()) { card.classList.remove('flipped'); return; }
    card.style.setProperty('--fly', dir);
    card.classList.add('fly');
    sfx.whoosh?.();
    setTimeout(() => { card.classList.remove('fly'); card.classList.add('done'); card.style.transform = ''; stack(); }, 380);
  };

  cards.forEach((card) => {
    card.querySelectorAll('[data-guess]').forEach((b) => b.addEventListener('click', () => guess(card, b.dataset.guess, b)));
    card.querySelector('.mf-flip').addEventListener('click', () => card.classList.toggle('flipped'));
    card.querySelector('.mf-next').addEventListener('click', () => next(card, 1));
    card.querySelector('.mf-front').addEventListener('click', (e) => {
      if (card.classList.contains('answered') && !e.target.closest('button')) card.classList.add('flipped');
    });
    // swipe (phones)
    let hinted = false;
    drag(card, {
      axis: 'x',
      start: () => isDeck() && card.classList.contains('top'),
      move: ({ dx }) => {
        card.classList.add('dragging');
        card.style.transform = `translateX(${dx}px) rotate(${dx * 0.05}deg)`;
        card.style.setProperty('--lean', Math.max(-1, Math.min(1, dx / 90)).toFixed(2));
        const over = Math.abs(dx) > 80;
        if (over && !hinted) { hinted = true; buzz(6); } else if (!over) hinted = false;
      },
      end: ({ dx, vx, cancelled }) => {
        card.classList.remove('dragging');
        card.style.removeProperty('--lean');
        const go = !cancelled && (Math.abs(dx) > 80 || (Math.abs(vx) > 0.6 && Math.abs(dx) > 30));
        if (!go) { card.style.transform = ''; return; }
        if (!card.classList.contains('answered')) {
          card.style.transform = '';
          guess(card, dx > 0 ? 'fact' : 'myth');
        } else next(card, dx > 0 ? 1 : -1);
      },
    });
  });
  grid.querySelector('.mf-review').addEventListener('click', () => {
    grid.classList.add('review');
    cards.forEach((c) => c.classList.remove('flipped'));
    sfx.click();
    grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  stack();
  grid.classList.add('mf-ready');
}
