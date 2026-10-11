// Easter eggs for Rajiea and friends. A small counter appears after the first find.
import { sfx } from './fx.js';
import { t } from './i18n.js';
import { CONFIG } from './config.js';

const E = (id, en, ar, hintEn, hintAr) => ({ id, name: t(en, ar), hint: t(hintEn, hintAr) });
export const EGGS = [
  E('name', 'Say my name', 'قول اسمي', 'Type her name — anywhere you can type.', 'اكتب اسمها — في أي حتة ينفع تكتب فيها.'),
  E('tickle', 'Ticklish', 'بتتزغزغ', 'She’s a little ticklish…', 'هي بتتزغزغ بسرعة…'),
  E('hold', 'Shy smile', 'ابتسامة مكسوفة', 'Hold on to her for a moment.', 'امسكها شوية ومتسيبهاش.'),
  E('title', 'Name in lights', 'اسمها منوّر', 'Her name likes attention.', 'اسمها بيحب الاهتمام.'),
  E('dj', 'Party mode', 'وضع الحفلة', 'The sound button has a hidden party mode.', 'زرار الصوت فيه حفلة مستخبية.'),
  E('baby', 'Little one', 'الصغنونة', 'Little Rajiea loves attention too.', 'راجية الصغيرة بتحب الاهتمام برضه.'),
  E('konami', 'Retro gamer', 'جيمر قديم', 'Gamers from the 80s know a secret code.', 'جيمرز التمانينات عارفين كود سري.'),
  E('golden', 'Golden tooth', 'السنة الدهب', 'Score 25 or more in Germ Zapper.', 'جيب 25 أو أكتر في صايد الجراثيم.'),
  E('perfect', 'Know-it-all', 'عارف كل حاجة', 'Get a perfect quiz score.', 'جيب الدرجة النهائية في الكويز.'),
  E('night', 'Night owl', 'سهران', 'Visit after midnight.', 'ادخل بعد نص الليل.'),
  E('early', 'Early bird', 'صاحي بدري', 'Visit between 5 and 7 in the morning.', 'ادخل من 5 لـ7 الصبح.'),
  E('console', 'Behind the curtain', 'ورا الكواليس', 'Developers know where to look.', 'المبرمجين عارفين يدوّروا فين.'),
  E('friend', 'Plus one', 'ضيف عزيز', 'Open the site with ?hi=YourName at the end of the link.', 'افتح الموقع وزوّد ‎?hi=اسمك‎ في آخر اللينك.'),
  E('selfie', 'Selfie queen', 'ملكة السيلفي', 'Take three selfies with her.', 'خد معاها 3 سيلفي.'),
  E('moves', 'Choreographer', 'مصمّم رقصات', 'Try every single move.', 'جرّب كل الحركات.'),
  E('stylist', 'Stylist', 'ستايلست', 'Try every hijab colour.', 'جرّب كل ألوان الطرح.'),
  E('wardrobe', 'Wardrobe', 'الدولاب', 'Try all three outfits.', 'جرّب اللبسات التلاتة.'),
  E('hotpink', 'Hot pink everything', 'كله هوت بينك', 'Her favourite colour, three times.', 'لونها المفضّل… تلات مرات.'),
  E('spinner', 'Round and round', 'لف لف', 'Spin her around. Fast.', 'لفّها بسرعة.'),
  E('barca', 'Visca Barça', 'فيسكا برسا', 'Type the name of her club.', 'اكتب اسم ناديها.'),
  E('tamer', 'Nagm El Geel', 'نجم الجيل', 'Type the name of her favourite singer.', 'اكتب اسم مطربها المفضّل.'),
  E('cafe', 'Café order', 'طلب الكافيه', 'Type her favourite drink.', 'اكتب مشروبها المفضّل.'),
  E('sweet', 'Dessert first', 'الحلو الأول', 'Type her favourite dessert.', 'اكتب الحلو اللي بتحبه.'),
  E('tawouk', 'Still waiting', 'لسه مستنيين', 'Type her favourite meal.', 'اكتب أكلتها المفضّلة.'),
  E('candy', 'Sweet tooth', 'بتحب الحلو', 'In Germ Zapper, tap the candy. A lot.', 'في صايد الجراثيم، دوس على الحلويات… كتير.'),
  E('scholar', 'Top of the class', 'الأول على الدفعة', 'Get every Smile School card right.', 'جاوب كل كروت مدرسة الابتسامة صح.'),
  E('clean', 'Squeaky clean', 'نضافة', 'Finish a full two-minute brush.', 'كمّل غسيل دقيقتين كاملين.'),
  E('streak', 'Good habit', 'عادة حلوة', 'Brush three days in a row.', 'اغسل سنانك 3 أيام ورا بعض.'),
  E('reader', 'Re-reader', 'بيقرا تاني وتالت', 'Some letters are worth opening again… and again.', 'فيه جوابات تستاهل تتفتح تاني… وتالت.'),
  E('pen', 'Pen pal', 'صاحب الجوابات', 'Leave her a note.', 'سيبلها رسالة.'),
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
  chip.setAttribute('aria-label', t('Easter eggs found', 'المفاجآت اللي لقيتها'));
  chip.addEventListener('click', () => { panel.hidden = !panel.hidden; if (!panel.hidden) renderPanel(); sfx.click(); });
  panel = document.createElement('div');
  panel.className = 'egg-panel';
  panel.hidden = true;
  toastEl = document.createElement('div');
  toastEl.className = 'egg-toast';
  toastEl.setAttribute('role', 'status');
  document.body.append(chip, panel, toastEl);
  document.addEventListener('click', (e) => { if (!panel.hidden && !panel.contains(e.target) && e.target !== chip && !chip.contains(e.target)) panel.hidden = true; });
}
function renderChip() {
  ensureUI();
  chip.innerHTML = `<span>🥚</span> <b>${found.size}</b>/${EGGS.length}`;
  chip.classList.add('show');
}
function renderPanel() {
  panel.innerHTML = `
    <h4>${t('Easter eggs', 'المفاجآت')} <span>${t(`${found.size} of ${EGGS.length}`, `${found.size} من ${EGGS.length}`)}</span></h4>
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
  toastEl.innerHTML = `<span>🥚</span><div><b>${t('Easter egg found', 'لقيت مفاجأة')}</b>${meta.name} · ${found.size}/${EGGS.length}</div>`;
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
