// Easter eggs for Rajiea and friends. A small counter appears after the first find.
import { sfx } from './fx.js';

export const EGGS = [
  { id: 'name', name: 'Say my name', hint: 'Type her name on a keyboard.' },
  { id: 'tickle', name: 'Ticklish', hint: 'She’s a little ticklish…' },
  { id: 'hold', name: 'Shy smile', hint: 'Hold on to her for a moment.' },
  { id: 'title', name: 'Name in lights', hint: 'Her name likes attention.' },
  { id: 'dj', name: 'Party mode', hint: 'The sound button has a hidden party mode.' },
  { id: 'baby', name: 'Little one', hint: 'Little Rajiea loves attention too.' },
  { id: 'konami', name: 'Retro gamer', hint: 'Gamers from the 80s know a secret code.' },
  { id: 'golden', name: 'Golden tooth', hint: 'Score 25 or more in Germ Zapper.' },
  { id: 'perfect', name: 'Know-it-all', hint: 'Get a perfect quiz score.' },
  { id: 'night', name: 'Night owl', hint: 'Visit after midnight.' },
  { id: 'console', name: 'Behind the curtain', hint: 'Developers know where to look.' },
  { id: 'friend', name: 'Plus one', hint: 'Open the site with ?hi=YourName at the end of the link.' },
];

const KEY = 'rajiea-eggs';
let found;
try { found = new Set(JSON.parse(localStorage.getItem(KEY) || '[]')); } catch { found = new Set(); }

let chip, panel, toastEl, toastTimer;
function ensureUI() {
  if (chip) return;
  chip = document.createElement('button');
  chip.type = 'button';
  chip.className = 'egg-chip';
  chip.setAttribute('aria-label', 'Easter eggs found');
  chip.addEventListener('click', () => { panel.hidden = !panel.hidden; if (!panel.hidden) renderPanel(); sfx.click(); });
  panel = document.createElement('div');
  panel.className = 'egg-panel';
  panel.hidden = true;
  toastEl = document.createElement('div');
  toastEl.className = 'egg-toast';
  toastEl.setAttribute('role', 'status');
  document.body.append(chip, panel, toastEl);
  document.addEventListener('click', (e) => { if (!panel.hidden && !panel.contains(e.target) && e.target !== chip) panel.hidden = true; });
}
function renderChip() {
  ensureUI();
  chip.innerHTML = `🥚 <b>${found.size}</b>/${EGGS.length}`;
  chip.classList.add('show');
}
function renderPanel() {
  panel.innerHTML = `
    <h4>Easter eggs <span>${found.size} of ${EGGS.length}</span></h4>
    <ul>${EGGS.map((e) => found.has(e.id)
      ? `<li class="got"><b>${e.name}</b></li>`
      : `<li><b>???</b><span>${e.hint}</span></li>`).join('')}</ul>`;
}

export function egg(id) {
  const meta = EGGS.find((e) => e.id === id);
  if (!meta || found.has(id)) return false;
  found.add(id);
  localStorage.setItem(KEY, JSON.stringify([...found]));
  renderChip();
  if (!panel.hidden) renderPanel();
  toastEl.innerHTML = `<span>🥚</span><div><b>Easter egg found</b>${meta.name} · ${found.size}/${EGGS.length}</div>`;
  toastEl.classList.remove('show');
  void toastEl.offsetWidth;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 3200);
  chip.classList.remove('bump');
  void chip.offsetWidth;
  chip.classList.add('bump');
  return true;
}

if (found.size) renderChip();
