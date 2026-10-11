// Easter eggs for Rajiea and friends. A small counter appears in the top bar after the first find.
import { sfx } from './fx.js';
import { t } from './i18n.js';
import { CONFIG } from './config.js';

const E = (id, en, ar, hintEn, hintAr) => ({ id, name: t(en, ar), hint: t(hintEn, hintAr) });
export const EGGS = [
  E('name', 'Say my name', 'Ool esmy', 'Type her name — anywhere you can type.', 'Ekteb esmaha — f ay 7etta ynfa3 tekteb feeha.'),
  E('tickle', 'Ticklish', 'Btetza8za8', 'She’s a little ticklish…', 'Heya btetza8za8 besor3a…'),
  E('hold', 'Shy smile', 'Ebtesama maksoofa', 'Hold on to her for a moment.', 'Emsekha shwaya w matsebhash.'),
  E('title', 'Name in lights', 'Esmaha menawwar', 'Her name likes attention.', 'Esmaha bey7eb el ehtemam.'),
  E('dj', 'Party mode', 'Party mode', 'The sound button has a hidden party mode.', 'Zorar el soot feeh party mestakhabeya.'),
  E('baby', 'Little one', 'El so8annana', 'Little Rajiea loves attention too.', 'Rajiea el so8ayara bt7eb el ehtemam bardo.'),
  E('konami', 'Retro gamer', 'Gamer 2adeem', 'Gamers from the 80s know a secret code.', 'Gamers el tamaneenat 3arfeen code serry.'),
  E('golden', 'Golden tooth', 'El sena el dahab', 'Score 25 or more in Germ Zapper.', 'Geeb 25 aw aktar f Germ Zapper.'),
  E('perfect', 'Know-it-all', '3aref kol 7aga', 'Get a perfect quiz score.', 'Geeb el daraga el nehaeya fel quiz.'),
  E('night', 'Night owl', 'Sahran', 'Visit after midnight.', 'Odkhol ba3d nos el leil.'),
  E('early', 'Early bird', 'Sa7y badry', 'Visit between 5 and 7 in the morning.', 'Odkhol men 5 l 7 el sob7.'),
  E('console', 'Behind the curtain', 'Wara el kawalees', 'Developers know where to look.', 'El developers 3arfeen ydawwaro fein.'),
  E('friend', 'Plus one', 'Deif 3aziz', 'Open the site with ?hi=YourName at the end of the link.', 'Efta7 el site w zawwed ?hi=Esmak f akher el link.'),
  E('selfie', 'Selfie queen', 'Malket el selfie', 'Take three selfies with her.', 'Khod ma3aha 3 selfies.'),
  E('moves', 'Choreographer', 'Mosammem ra2s', 'Try every single move.', 'Garrab kol el 7arakat.'),
  E('stylist', 'Stylist', 'Stylist', 'Try every hijab colour.', 'Garrab kol alwan el tar7a.'),
  E('wardrobe', 'Wardrobe', 'El dolab', 'Try all three outfits.', 'Garrab el lebsat el talata.'),
  E('hotpink', 'Hot pink everything', 'Kollo hot pink', 'Her favourite colour, three times.', 'Lonha el mofaddal… talat marrat.'),
  E('spinner', 'Round and round', 'Leff leff', 'Spin her around. Fast.', 'Leffaha besor3a.'),
  E('barca', 'Visca Barça', 'Visca Barça', 'Type the name of her club.', 'Ekteb esm nadeeha.'),
  E('tamer', 'Nagm El Geel', 'Nagm el Geel', 'Type the name of her favourite singer.', 'Ekteb esm motrebha el mofaddal.'),
  E('cafe', 'Café order', 'Talab el café', 'Type her favourite drink.', 'Ekteb mashrobha el mofaddal.'),
  E('sweet', 'Dessert first', 'El 7elw el awel', 'Type her favourite dessert.', 'Ekteb el 7elw elly bt7ebbo.'),
  E('tawouk', 'Tawouk o’clock', 'Wa2t el tawouk', 'Type her favourite meal.', 'Ekteb akletha el mofaddala.'),
  E('candy', 'Sweet tooth', 'Bt7eb el 7elw', 'In Germ Zapper, tap the candy. A lot.', 'F Germ Zapper, dos 3al 7alawyat… keteer.'),
  E('scholar', 'Top of the class', 'El awel 3al daf3a', 'Get every Smile School card right.', 'Gaweb kol cards Smile School sa7.'),
  E('clean', 'Squeaky clean', 'Nadafa', 'Finish a full two-minute brush.', 'Kammel 8aseel de2i2teen kamleen.'),
  E('streak', 'Good habit', '3ada 7elwa', 'Brush three days in a row.', 'E8sel snanak 3 ayam wara ba3d.'),
  E('reader', 'Re-reader', 'Bey2ra tany w talet', 'Some letters are worth opening again… and again.', 'Feeh gawabat testahel tetfete7 tany… w talet.'),
  E('pen', 'Pen pal', 'Sa7eb el gawabat', 'Leave her a note.', 'Sebelha resala.'),
].filter((e) => e.id !== 'pen' || CONFIG.notes);

const KEY = 'rajiea-eggs';
let found;
try { found = new Set(JSON.parse(localStorage.getItem(KEY) || '[]')); } catch { found = new Set(); }

let chip, panel, toastEl, toastTimer;
function ensureUI() {
  if (chip) return;
  chip = document.createElement('button');
  chip.type = 'button';
  chip.className = 'egg-chip';
  chip.setAttribute('aria-label', t('Easter eggs found', 'El mofag2at elly le2etha'));
  chip.addEventListener('click', () => { panel.hidden = !panel.hidden; if (!panel.hidden) renderPanel(); sfx.click(); });
  panel = document.createElement('div');
  panel.className = 'egg-panel';
  panel.hidden = true;
  toastEl = document.createElement('div');
  toastEl.className = 'egg-toast';
  toastEl.setAttribute('role', 'status');
  const host = document.querySelector('.nav-tools');
  if (host) host.prepend(chip); else document.body.append(chip);
  document.body.append(panel, toastEl);
  document.addEventListener('click', (e) => { if (!panel.hidden && !panel.contains(e.target) && e.target !== chip && !chip.contains(e.target)) panel.hidden = true; });
}
function renderChip() {
  ensureUI();
  chip.innerHTML = `<span>🥚</span> <b>${found.size}</b>/${EGGS.length}`;
  chip.classList.add('show');
}
function renderPanel() {
  panel.innerHTML = `
    <h4>${t('Easter eggs', 'El mofag2at')} <span>${t(`${found.size} of ${EGGS.length}`, `${found.size} men ${EGGS.length}`)}</span></h4>
    <div class="egg-bar"><i style="width:${(found.size / EGGS.length) * 100}%"></i></div>
    <ul>${EGGS.map((e) => found.has(e.id)
      ? `<li class="got"><b>${e.name}</b></li>`
      : `<li><b>???</b><span>${e.hint}</span></li>`).join('')}</ul>`;
}

export const hasEgg = (id) => found.has(id);
export function egg(id) {
  const meta = EGGS.find((e) => e.id === id);
  if (!meta || found.has(id)) return false;
  found.add(id);
  try { localStorage.setItem(KEY, JSON.stringify([...found])); } catch {}
  renderChip();
  if (!panel.hidden) renderPanel();
  toastEl.innerHTML = `<span>🥚</span><div><b>${t('Easter egg found', 'Le2eet mofag2a')}</b>${meta.name} · ${found.size}/${EGGS.length}</div>`;
  toastEl.classList.remove('show');
  void toastEl.offsetWidth;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 3200);
  chip.classList.remove('bump');
  void chip.offsetWidth;
  chip.classList.add('bump');
  sfx.ding();
  return true;
}

if (found.size) renderChip();
