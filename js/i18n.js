// English / Franco. The choice is remembered; switching reloads the page in the other language.
// (Inside the code the Franco side is called "ar".)
const KEY = 'rajiea-lang';
let saved = 'en';
try { saved = localStorage.getItem(KEY) === 'ar' ? 'ar' : 'en'; } catch {}
export const lang = saved;
export const isAr = lang === 'ar';

// t('English', 'Franco') picks the right one
export const t = (en, ar) => (isAr && ar != null ? ar : en);

// turn { en, ar } pairs anywhere inside an object into plain text for the current language
export function localize(x) {
  if (Array.isArray(x)) return x.map(localize);
  if (x && typeof x === 'object') {
    const keys = Object.keys(x);
    if (keys.length === 2 && 'en' in x && 'ar' in x) return x[lang];
    const out = {};
    for (const k of keys) out[k] = localize(x[k]);
    return out;
  }
  return x;
}

// static page text: elements carry their Franco in data-ar (and data-ar-html for markup)
export function applyStatic(root = document) {
  document.documentElement.lang = isAr ? 'ar-Latn' : 'en';
  document.documentElement.dir = 'ltr';
  root.querySelectorAll('[data-lang-label]').forEach((el) => { el.textContent = isAr ? 'English' : '3arabi'; });
  if (!isAr) return;
  root.querySelectorAll('[data-ar]').forEach((el) => { el.textContent = el.dataset.ar; });
  root.querySelectorAll('[data-ar-html]').forEach((el) => { el.innerHTML = el.dataset.arHtml; });
  root.querySelectorAll('[data-ar-label]').forEach((el) => el.setAttribute('aria-label', el.dataset.arLabel));
  root.querySelectorAll('[data-ar-ph]').forEach((el) => el.setAttribute('placeholder', el.dataset.arPh));
  const title = document.querySelector('meta[name="ar-title"]');
  if (title) document.title = title.content;
}

export function switchLang() {
  const next = isAr ? 'en' : 'ar';
  try {
    localStorage.setItem(KEY, next);
    sessionStorage.setItem('rajiea-scroll', String(scrollY));
  } catch {}
  document.documentElement.classList.add('lang-out');
  setTimeout(() => location.reload(), 380);
}

export function restoreScroll() {
  try {
    const y = sessionStorage.getItem('rajiea-scroll');
    if (y == null) return;
    sessionStorage.removeItem('rajiea-scroll');
    requestAnimationFrame(() => scrollTo({ top: +y, behavior: 'instant' }));
  } catch {}
}
