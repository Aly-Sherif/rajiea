// Phone feel: haptic taps, tilt & shake, bottom sheets, long-press, double-tap hearts, lazy start.
import { sfx, confetti } from './fx.js';
import { t } from './i18n.js';

export const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
export const coarse = matchMedia('(pointer: coarse)').matches;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
// keep following a finger that leaves the element (quietly skipped when the browser won't)
export const capture = (el, id) => { try { el.setPointerCapture(id); } catch {} };

// ── Haptics (Android only; iPhones have no web vibration, so this quietly does nothing there) ──
export function buzz(pattern = 8) {
  if (!navigator.vibrate) return;
  if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return;
  try { navigator.vibrate(pattern); } catch {}
}

// ── Start things only when they're about to be seen; pause them when they leave ──
export function whenNear(el, fn, margin = '700px 0px') {
  if (!el) return;
  if (!('IntersectionObserver' in window)) { fn(); return; }
  const io = new IntersectionObserver((es) => {
    if (!es.some((e) => e.isIntersecting)) return;
    io.disconnect();
    fn();
  }, { rootMargin: margin });
  io.observe(el);
}
export function onVisible(el, cb, margin = '0px') {
  if (!el || !('IntersectionObserver' in window)) { cb(true); return () => {}; }
  let on = false;
  const set = (v) => { if (v !== on) { on = v; cb(v); } };
  const io = new IntersectionObserver((es) => set(es[es.length - 1].isIntersecting && !document.hidden), { rootMargin: margin });
  io.observe(el);
  const vis = () => { if (document.hidden) set(false); else { const r = el.getBoundingClientRect(); set(r.bottom > 0 && r.top < innerHeight); } };
  document.addEventListener('visibilitychange', vis);
  return () => { io.disconnect(); document.removeEventListener('visibilitychange', vis); };
}
// how much of an element is on screen, 0..1 (of the screen or of the element, whichever is smaller)
export function shown(el) {
  const r = el.getBoundingClientRect();
  const h = Math.max(0, Math.min(r.bottom, innerHeight) - Math.max(r.top, 0));
  return h / Math.max(1, Math.min(r.height, innerHeight));
}

// ── Motion: tilt and shake ──
// Android sends motion straight away. iPhones need one "allow" tap (motion.ask() inside a tap).
const subs = { tilt: new Set(), jolt: new Set(), shake: [] };
let listening = false, live = false, granted = false;
let last = null, jolts = [], lastShake = 0;
const askable = () => typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function';
function onMotion(e) {
  const a = e.accelerationIncludingGravity;
  if (!a || a.x == null) return;
  if (!live) { live = true; document.documentElement.classList.add('has-motion'); }
  if (last) {
    const d = Math.abs(a.x - last.x) + Math.abs(a.y - last.y) + Math.abs(a.z - last.z);
    subs.jolt.forEach((fn) => fn(d));
    const now = performance.now();
    if (d > 24) {
      jolts = jolts.filter((x) => now - x < 900);
      jolts.push(now);
      if (jolts.length >= 3 && now - lastShake > 1200) { lastShake = now; jolts = []; emitShake(); }
    }
  }
  last = { x: a.x, y: a.y, z: a.z };
}
function onTilt(e) {
  if (e.beta == null || e.gamma == null) return;
  const x = clamp(e.gamma / 28, -1, 1);
  const y = clamp((e.beta - 50) / 28, -1, 1);
  subs.tilt.forEach((fn) => fn(x, y));
}
function listen() {
  if (listening || !('DeviceMotionEvent' in window)) return;
  if (askable() && !granted) return;
  listening = true;
  addEventListener('devicemotion', onMotion, { passive: true });
  addEventListener('deviceorientation', onTilt, { passive: true });
}
function emitShake() {
  // the claimed area that's most on screen gets the shake; otherwise the site-wide one
  let best = null, score = 0.3;
  for (const s of subs.shake) {
    if (!s.el) continue;
    const v = shown(s.el);
    if (v > score) { score = v; best = s; }
  }
  (best || subs.shake.find((s) => !s.el))?.fn();
}
export const motion = {
  get live() { return live; },
  get needsAsk() { return askable() && !granted; },
  get possible() { return coarse && ('DeviceMotionEvent' in window); },
  // must be called from a tap on iPhone
  async ask() {
    if (!askable()) { listen(); return true; }
    try {
      const reqs = [DeviceMotionEvent.requestPermission()];
      if (typeof DeviceOrientationEvent?.requestPermission === 'function') reqs.push(DeviceOrientationEvent.requestPermission());
      const res = await Promise.all(reqs);
      granted = res.every((r) => r === 'granted');
    } catch { granted = false; }
    if (granted) { listen(); document.documentElement.classList.add('motion-ok'); }
    return granted;
  },
  onTilt(fn) { subs.tilt.add(fn); listen(); return () => subs.tilt.delete(fn); },
  onJolt(fn) { subs.jolt.add(fn); listen(); return () => subs.jolt.delete(fn); },
  // el: the shake only counts while el is on screen (null = anywhere, lowest priority)
  onShake(fn, el = null) { const s = { fn, el }; subs.shake.push(s); listen(); return () => { subs.shake = subs.shake.filter((x) => x !== s); }; },
};
if (coarse) listen();

// ── Long-press ──
// fires once after `ms`; a small finger slide (scrolling) cancels it, and the click that follows is swallowed
export function longPress(el, fn, ms = 480) {
  let timer = 0, x = 0, y = 0, fired = false;
  const cancel = () => { clearTimeout(timer); timer = 0; el.classList.remove('pressing'); };
  el.addEventListener('pointerdown', (e) => {
    if (e.button > 0) return;
    fired = false;
    x = e.clientX; y = e.clientY;
    cancel();
    el.classList.add('pressing');
    timer = setTimeout(() => { timer = 0; fired = true; el.classList.remove('pressing'); buzz(14); fn(e); }, ms);
  });
  el.addEventListener('pointermove', (e) => { if (timer && Math.hypot(e.clientX - x, e.clientY - y) > 10) cancel(); });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach((ev) => el.addEventListener(ev, cancel));
  el.addEventListener('click', (e) => { if (fired) { fired = false; e.stopImmediatePropagation(); e.preventDefault(); } }, true);
  el.addEventListener('contextmenu', (e) => { if (coarse || fired) e.preventDefault(); });
}

// ── Double-tap anywhere quiet for a heart burst ──
const QUIET_NOT = 'a, button, input, textarea, select, label, canvas, video, svg, [role="button"], [role="tab"], [data-no-hearts], .stage, .tn-stage, .envelope, .marquee, .vault, .sheet-wrap, .inbox, .egg-panel, .nav, .dock, .day-stage, .foot, #footTooth, .mk-dot, .seal, .tn-tag, #letter';
export function doubleTapHearts(onHeart) {
  let lastT = 0, lx = 0, ly = 0;
  document.addEventListener('click', (e) => {
    if (e.target.closest?.(QUIET_NOT) || document.querySelector('.vault, .sheet-wrap.on')) { lastT = 0; return; }
    if (getSelection?.().type === 'Range' && !coarse) { lastT = 0; return; }
    const now = performance.now();
    if (now - lastT < 340 && Math.hypot(e.clientX - lx, e.clientY - ly) < 40) {
      lastT = 0;
      getSelection?.().removeAllRanges?.();
      heartBurst(e.clientX, e.clientY);
      onHeart?.();
    } else { lastT = now; lx = e.clientX; ly = e.clientY; }
  });
}
export function heartBurst(x, y) {
  buzz([10, 30, 14]);
  sfx.pop();
  const h = document.createElement('span');
  h.className = 'tl-heart';
  h.style.left = `${x}px`;
  h.style.top = `${y}px`;
  h.innerHTML = '<svg viewBox="0 0 32 30" aria-hidden="true"><path d="M16 29S2 20.5 2 10.4C2 5.4 5.8 2 10 2c2.8 0 4.8 1.4 6 3.4C17.2 3.4 19.2 2 22 2c4.2 0 8 3.4 8 8.4C30 20.5 16 29 16 29z"/></svg>';
  document.body.appendChild(h);
  h.addEventListener('animationend', () => h.remove());
  setTimeout(() => h.remove(), 1400);
  confetti({ x, y, count: 14, spread: 0.32, emoji: ['💗', '💖', '🩷'] });
}

// ── Toast card at the top (compliments, small news) ──
let toastEl = null, toastTimer = 0;
export function toast(html, ms = 3800) {
  if (!toastEl) {
    toastEl = document.createElement('div');
    toastEl.className = 'tl-toast';
    toastEl.setAttribute('role', 'status');
    toastEl.addEventListener('click', () => toastEl.classList.remove('show'));
    document.body.appendChild(toastEl);
  }
  toastEl.innerHTML = html;
  toastEl.classList.remove('show');
  void toastEl.offsetWidth;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), ms);
}

// ── Bottom sheet: drag the handle (or the top of the sheet) down to close ──
let openSheet = null;
export function sheet({ title = '', body = '', className = '', label = '', onClose } = {}) {
  openSheet?.close(true);
  const prevFocus = document.activeElement;
  const wrap = document.createElement('div');
  wrap.className = `sheet-wrap ${className}`;
  wrap.setAttribute('role', 'dialog');
  wrap.setAttribute('aria-modal', 'true');
  wrap.setAttribute('aria-label', label || title.replace(/<[^>]+>/g, ''));
  wrap.innerHTML = `
    <div class="sheet-back"></div>
    <section class="sheet">
      <div class="sheet-top">
        <div class="sheet-grab" aria-hidden="true"><i></i></div>
        <header class="sheet-head"><h3>${title}</h3><button type="button" class="sheet-x" aria-label="${t('Close', 'E2fel')}">×</button></header>
      </div>
      <div class="sheet-body">${body}</div>
    </section>`;
  document.body.appendChild(wrap);
  const panel = wrap.querySelector('.sheet');
  const scroller = wrap.querySelector('.sheet-body');
  document.documentElement.classList.add('sheet-open');
  requestAnimationFrame(() => requestAnimationFrame(() => wrap.classList.add('on')));
  buzz(6);

  let closed = false;
  const close = (instant = false) => {
    if (closed) return;
    closed = true;
    if (openSheet === api) openSheet = null;
    removeEventListener('keydown', onKey);
    wrap.classList.remove('on');
    panel.style.transform = '';
    document.documentElement.classList.remove('sheet-open');
    setTimeout(() => wrap.remove(), instant ? 0 : 380);
    if (prevFocus?.focus && document.contains(prevFocus)) prevFocus.focus({ preventScroll: true });
    onClose?.();
  };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  addEventListener('keydown', onKey);
  wrap.querySelector('.sheet-back').addEventListener('click', () => close());
  wrap.querySelector('.sheet-x').addEventListener('click', () => close());

  // drag to close
  let startY = 0, dy = 0, t0 = 0, dragging = false, pid = null;
  const begin = (e, fromBody) => {
    if (fromBody && scroller.scrollTop > 0) return;
    dragging = true; pid = e.pointerId; startY = e.clientY; dy = 0; t0 = performance.now();
    panel.classList.add('dragging');
  };
  wrap.querySelector('.sheet-top').addEventListener('pointerdown', (e) => { if (!e.target.closest('button')) { begin(e, false); capture(panel, e.pointerId); } });
  scroller.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') begin(e, true); });
  panel.addEventListener('pointermove', (e) => {
    if (!dragging || e.pointerId !== pid) return;
    dy = e.clientY - startY;
    if (dy < 0) { dy = 0; return; }
    if (scroller.scrollTop > 0) { dragging = false; panel.classList.remove('dragging'); panel.style.transform = ''; return; }
    panel.style.transform = `translateY(${dy}px)`;
    wrap.style.setProperty('--fade', String(1 - Math.min(1, dy / 400)));
  });
  const end = () => {
    if (!dragging) return;
    dragging = false;
    panel.classList.remove('dragging');
    const v = dy / Math.max(1, performance.now() - t0);
    wrap.style.removeProperty('--fade');
    if (dy > 120 || (v > 0.55 && dy > 30)) close();
    else panel.style.transform = '';
  };
  panel.addEventListener('pointerup', end);
  panel.addEventListener('pointercancel', end);
  // if the body scrolls instead, stop dragging
  scroller.addEventListener('touchmove', () => { if (scroller.scrollTop > 0 && dragging) { dragging = false; panel.classList.remove('dragging'); panel.style.transform = ''; } }, { passive: true });

  const api = { el: wrap, panel, body: scroller, close: () => close() };
  openSheet = api;
  setTimeout(() => wrap.querySelector('.sheet-x')?.focus({ preventScroll: true }), 60);
  return api;
}

// ── Pointer swipe on an element: calls back with the move while dragging and the result at the end ──
// axis 'x' keeps vertical scrolling for the page (use touch-action: pan-y on the element)
export function drag(el, { start, move, end, axis = null } = {}) {
  let on = false, sx = 0, sy = 0, pts = [], id = null, locked = null;
  el.addEventListener('pointerdown', (e) => {
    if (e.button > 0 || on) return;
    if (start && start(e) === false) return;
    on = true; id = e.pointerId; sx = e.clientX; sy = e.clientY; locked = null;
    pts = [{ x: sx, y: sy, t: performance.now() }];
  });
  el.addEventListener('pointermove', (e) => {
    if (!on || e.pointerId !== id) return;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    if (axis && !locked && Math.hypot(dx, dy) > 8) {
      locked = (axis === 'x' ? Math.abs(dx) > Math.abs(dy) : Math.abs(dy) > Math.abs(dx)) ? 'yes' : 'no';
      if (locked === 'yes') capture(el, id);
    }
    if (axis && locked !== 'yes') return;
    pts.push({ x: e.clientX, y: e.clientY, t: performance.now() });
    if (pts.length > 12) pts.shift();
    move?.({ dx, dy, x: e.clientX, y: e.clientY, e });
  });
  const fin = (e, cancelled) => {
    if (!on || e.pointerId !== id) return;
    on = false;
    if (axis && locked !== 'yes') { end?.({ dx: 0, dy: 0, vx: 0, vy: 0, cancelled: true, pts }); return; }
    const a = pts[0], b = pts[pts.length - 1];
    const dt = Math.max(1, b.t - a.t);
    end?.({ dx: e.clientX - sx, dy: e.clientY - sy, vx: (b.x - a.x) / dt, vy: (b.y - a.y) / dt, cancelled, pts, x: e.clientX, y: e.clientY });
  };
  el.addEventListener('pointerup', (e) => fin(e, false));
  el.addEventListener('pointercancel', (e) => fin(e, true));
}
