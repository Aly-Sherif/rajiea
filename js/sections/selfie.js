// Selfie studio: front camera (or a photo from the phone, or a pink backdrop), frames and stickers,
// then one picture made right here on the phone. Nothing is uploaded anywhere.
import { capture } from '../touch.js';

const EMOJI = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
const STICKERS = [
  { k: 'tag', ch: '🦷', label: 'Dr. Rajiea' }, { k: 'emoji', ch: '💗' }, { k: 'pet', ch: '🐢' }, { k: 'emoji', ch: '✨' }, { k: 'emoji', ch: '🍵' },
  { k: 'emoji', ch: '☕' }, { k: 'emoji', ch: '🍰' }, { k: 'emoji', ch: '⚽' }, { k: 'emoji', ch: '🎤' }, { k: 'emoji', ch: '📸' }, { k: 'emoji', ch: '🌸' }, { k: 'emoji', ch: '👑' }, { k: 'emoji', ch: '🦷' },
];

function roundRect(g, x, y, w, h, r, fresh = true) {
  if (fresh) g.beginPath();
  g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r);
  g.closePath();
}
function heart(g, x, y, s) {
  g.beginPath();
  g.moveTo(x, y + s * 0.3);
  g.bezierCurveTo(x, y, x - s * 0.5, y, x - s * 0.5, y + s * 0.3);
  g.bezierCurveTo(x - s * 0.5, y + s * 0.6, x, y + s * 0.8, x, y + s);
  g.bezierCurveTo(x, y + s * 0.8, x + s * 0.5, y + s * 0.6, x + s * 0.5, y + s * 0.3);
  g.bezierCurveTo(x + s * 0.5, y, x, y, x, y + s * 0.3);
  g.fill();
}
// the frame, drawn the same way for the live view and for the saved picture
function drawFrame(g, W, H, id, caption) {
  const u = W / 100;
  g.save();
  const cut = (side, top, bottom, r, fill) => {
    g.beginPath();
    g.rect(0, 0, W, H);
    roundRect(g, side, top, W - side * 2, H - top - bottom, r, false);
    g.fillStyle = fill;
    g.fill('evenodd');
  };
  if (id === 'clinic') {
    const grd = g.createLinearGradient(0, 0, W, H);
    grd.addColorStop(0, '#ff5aa2'); grd.addColorStop(1, '#e0136f');
    cut(4 * u, 4 * u, 16 * u, 5 * u, grd);
    g.fillStyle = '#fff';
    g.font = `600 ${7.2 * u}px Fraunces, Georgia, serif`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(caption, W / 2, H - 8 * u);
    g.font = `${7 * u}px ${EMOJI}`;
    g.fillText('🦷', 10 * u, H - 8 * u);
    g.fillText('🦷', W - 10 * u, H - 8 * u);
    g.fillStyle = 'rgba(255,255,255,.9)';
    g.font = `800 ${2.6 * u}px Manrope, sans-serif`;
    g.fillText('SMILE CLUB · rajiea.com', W / 2, H - 2.6 * u);
  } else if (id === 'pink') {
    cut(5 * u, 5 * u, 22 * u, 1.2 * u, '#fffdfb');
    g.fillStyle = '#ff2e88';
    g.font = `italic 600 ${7.4 * u}px Fraunces, Georgia, serif`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(caption, W / 2, H - 11 * u);
    g.fillStyle = '#ff8cc0';
    [[8, 3], [26, 2.4], [74, 2.6], [92, 3.2]].forEach(([x, s]) => heart(g, x * u, H - 18.5 * u, s * u));
    g.fillStyle = '#c9a58a';
    g.font = `700 ${2.6 * u}px Manrope, sans-serif`;
    g.fillText(new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }), W / 2, H - 4.4 * u);
  } else if (id === 'barca') {
    g.save();
    g.beginPath(); g.rect(0, 0, W, H); roundRect(g, 4.5 * u, 4.5 * u, W - 9 * u, H - 22 * u, 3 * u, false); g.clip('evenodd');
    for (let x = 0, k = 0; x < W; x += 6 * u, k++) { g.fillStyle = k % 2 ? '#a50044' : '#004d98'; g.fillRect(x, 0, 6 * u, H); }
    g.restore();
    g.strokeStyle = '#edbb00'; g.lineWidth = 0.8 * u;
    roundRect(g, 4.5 * u, 4.5 * u, W - 9 * u, H - 22 * u, 3 * u); g.stroke();
    g.fillStyle = '#0b1840';
    roundRect(g, 10 * u, H - 15.5 * u, W - 20 * u, 12 * u, 6 * u); g.fill();
    g.fillStyle = '#edbb00';
    g.font = `800 ${6 * u}px Manrope, sans-serif`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(caption, W / 2, H - 9.5 * u);
  } else if (id === 'matcha') {
    cut(4 * u, 4 * u, 17 * u, 5 * u, '#f6efe2');
    g.fillStyle = '#5e9a2c';
    roundRect(g, 4 * u, H - 15 * u, W - 8 * u, 11 * u, 5.5 * u); g.fill();
    g.fillStyle = '#fffaf0';
    g.font = `600 ${6.4 * u}px Fraunces, Georgia, serif`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(caption, W / 2, H - 9.5 * u);
    g.fillStyle = '#7fb24a';
    const leaf = (x, y, s, r) => { g.save(); g.translate(x, y); g.rotate(r); g.beginPath(); g.ellipse(0, 0, s, s * 0.45, 0, 0, Math.PI * 2); g.fill(); g.restore(); };
    leaf(6 * u, 6 * u, 5 * u, 0.7); leaf(11 * u, 3.5 * u, 3.4 * u, -0.3); leaf(W - 6 * u, 6 * u, 5 * u, -0.7); leaf(W - 11 * u, 3.5 * u, 3.4 * u, 0.3);
  }
  g.restore();
}
function drawSticker(g, s, W) {
  const size = s.s * W;
  g.save();
  g.translate(s.x * W, s.y * (W * 4 / 3));
  g.rotate(s.r);
  g.textAlign = 'center'; g.textBaseline = 'middle';
  if (s.k === 'tag') {
    g.font = `800 ${size * 0.34}px Manrope, sans-serif`;
    const text = `${s.ch} ${s.label}`;
    const w = g.measureText(text).width + size * 0.5;
    g.fillStyle = '#ff2e88';
    roundRect(g, -w / 2, -size * 0.3, w, size * 0.6, size * 0.3); g.fill();
    g.fillStyle = '#fff';
    g.fillText(text, 0, size * 0.02);
  } else {
    g.font = `${size}px ${EMOJI}`;
    g.fillText(s.ch, 0, size * 0.05);
    if (s.k === 'pet' && s.label) {
      g.font = `800 ${size * 0.2}px Manrope, sans-serif`;
      const w = g.measureText(s.label).width + size * 0.24;
      g.fillStyle = '#fff';
      roundRect(g, -w / 2, size * 0.48, w, size * 0.3, size * 0.15); g.fill();
      g.fillStyle = '#3d7a3a';
      g.fillText(s.label, 0, size * 0.64);
    }
  }
  g.restore();
}

export function initSelfie(root, { CONFIG, t, sfx, buzz, onVisible, toast }) {
  const C = CONFIG.selfie || {};
  const FRAMES = [
    { id: 'clinic', icon: '🦷', name: t('Clinic', '3eyada'), cap: C.clinic || 'Dr. Rajiea' },
    { id: 'pink', icon: '💗', name: t('Hot pink', 'Hot pink'), cap: C.pink || 'Hot pink, always 💗' },
    { id: 'barca', icon: '⚽', name: 'Barça', cap: C.barca || 'Visca Barça 💙❤️' },
    { id: 'matcha', icon: '🍵', name: 'Matcha', cap: C.matcha || 'Matcha o’clock 🍵' },
  ];
  let frame = FRAMES[0].id;
  let stickers = [], stream = null, mode = null, visible = false, busy = false, resultUrl = null;
  root.innerHTML = `
    <div class="sf-card">
      <div class="sf-stage">
        <video class="sf-video" playsinline muted autoplay></video>
        <canvas class="sf-photo"></canvas>
        <canvas class="sf-frame" aria-hidden="true"></canvas>
        <div class="sf-stickers"></div>
        <div class="sf-trash" aria-hidden="true">🗑️</div>
        <div class="sf-count" aria-live="assertive"></div>
        <div class="sf-flash"></div>
        <img class="sf-result" alt="${t('Your studio photo', 'Sooret el studio')}" hidden>
        <div class="sf-start">
          <span class="sf-start-icon" aria-hidden="true">📸</span>
          <p class="sf-start-msg">${t('Pick a frame, add stickers, smile.', 'Ekhtary frame, zawwedy stickers, w ebtesemy.')}</p>
          <button type="button" class="btn btn-pink" data-cam>${t('Open the camera', 'Efta7y el camera')}</button>
          <div class="sf-alt">
            <button type="button" class="btn btn-glass" data-file>🖼️ ${t('Use a photo', 'Sooret men 3andek')}</button>
            <button type="button" class="btn btn-glass" data-backdrop>🎀 ${t('Pink backdrop', 'Khalfeya pink')}</button>
          </div>
        </div>
      </div>
      <div class="sf-frames" role="radiogroup" aria-label="${t('Frame', 'El frame')}">
        ${FRAMES.map((f) => `<button type="button" role="radio" aria-checked="${f.id === frame}" data-frame="${f.id}"><span>${f.icon}</span>${f.name}</button>`).join('')}
      </div>
      <div class="sf-tray" aria-label="${t('Stickers', 'Stickers')}">
        ${STICKERS.map((s, i) => `<button type="button" data-st="${i}" aria-label="${t('Add sticker', 'Zawwedy sticker')} ${s.label || s.ch}">${s.k === 'tag' ? `<b>Dr.</b>` : s.ch}</button>`).join('')}
      </div>
      <div class="sf-actions">
        <button type="button" class="sf-snap" data-snap aria-label="${t('Take the photo', 'Soory')}"><i></i></button>
      </div>
      <div class="sf-after" hidden>
        <button type="button" class="btn btn-pink" data-save>${t('Save', 'E7fazy')} 💾</button>
        <button type="button" class="btn btn-glass" data-share hidden>${t('Share', 'Sharey')} 💌</button>
        <button type="button" class="btn btn-ghost" data-retake>${t('Retake', 'Tany')}</button>
      </div>
      <p class="sf-note">🔒 ${t('The camera stays on your phone. Nothing is uploaded or saved anywhere unless you save it.', 'El camera bteb2a 3ala mobilek. Mafeesh 7aga btet-rafa3 aw tet7efez 8eir lama enty te7fazy.')}</p>
      <p class="sf-tip">${t('Tip: drag stickers, pinch to resize, drop on the bin to remove.', 'Tip: es7aby el stickers, kabbary b soba3een, w ermeeha fel zebala 3ashan temsa7eeha.')}</p>
      <input type="file" accept="image/*" hidden>
    </div>`;
  const $ = (s) => root.querySelector(s);
  const stage = $('.sf-stage'), video = $('.sf-video'), photo = $('.sf-photo'), frameCv = $('.sf-frame'), layer = $('.sf-stickers');
  const startEl = $('.sf-start'), countEl = $('.sf-count'), flashEl = $('.sf-flash'), resultEl = $('.sf-result'), trash = $('.sf-trash');
  const after = $('.sf-after'), actions = $('.sf-actions'), fileIn = $('input[type=file]');

  // ── frame overlay ──
  const paintFrame = () => {
    const r = stage.getBoundingClientRect();
    if (!r.width) return;
    const dpr = Math.min(2, devicePixelRatio || 1);
    frameCv.width = Math.round(r.width * dpr); frameCv.height = Math.round(r.height * dpr);
    const g = frameCv.getContext('2d');
    g.clearRect(0, 0, frameCv.width, frameCv.height);
    drawFrame(g, frameCv.width, frameCv.height, frame, FRAMES.find((f) => f.id === frame).cap);
  };
  const setFrame = (id) => {
    if (!FRAMES.some((f) => f.id === id)) return;
    frame = id;
    root.querySelectorAll('[data-frame]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.frame === id)));
    paintFrame();
  };
  root.querySelectorAll('[data-frame]').forEach((b) => b.addEventListener('click', () => { setFrame(b.dataset.frame); sfx.click(); buzz(6); stage.classList.remove('bump'); void stage.offsetWidth; stage.classList.add('bump'); }));
  addEventListener('resize', () => { paintFrame(); paintStickers(); });

  // ── sources ──
  const stopCam = () => { stream?.getTracks().forEach((tr) => tr.stop()); stream = null; video.srcObject = null; };
  async function openCam() {
    if (!navigator.mediaDevices?.getUserMedia || !isSecureContext) return fail(t('The camera isn’t available here.', 'El camera msh mota7a hena.'));
    startEl.classList.add('busy');
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false });
      video.srcObject = stream;
      await video.play().catch(() => {});
      mode = 'camera';
      stage.dataset.mode = 'camera';
      startEl.hidden = true;
      sfx.pop(); buzz(10);
    } catch (e) {
      fail(e?.name === 'NotAllowedError' ? t('The camera is switched off for this site.', 'El camera ma2foola lel site dah.') : t('No camera found.', 'Mafeesh camera.'));
    } finally { startEl.classList.remove('busy'); }
  }
  function fail(why) {
    $('.sf-start-msg').textContent = `${why} ${t('Use a photo or the pink backdrop instead 👇', 'Estakhdemy soora aw el khalfeya el pink 👇')}`;
    startEl.classList.add('failed');
    $('[data-cam]').hidden = true;
  }
  const fit = (src, sw, sh) => {
    const W = photo.width = 1080, H = photo.height = 1440;
    const g = photo.getContext('2d');
    const k = Math.max(W / sw, H / sh);
    g.drawImage(src, (W - sw * k) / 2, (H - sh * k) / 2, sw * k, sh * k);
  };
  function backdrop() {
    const W = photo.width = 1080, H = photo.height = 1440;
    const g = photo.getContext('2d');
    const grd = g.createLinearGradient(0, 0, W, H);
    grd.addColorStop(0, '#ffe1ee'); grd.addColorStop(0.5, '#ffc2dc'); grd.addColorStop(1, '#ff8cc0');
    g.fillStyle = grd; g.fillRect(0, 0, W, H);
    g.globalAlpha = 0.16;
    g.font = `80px ${EMOJI}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    for (let y = 60, row = 0; y < H; y += 150, row++) for (let x = row % 2 ? 140 : 60; x < W; x += 170) g.fillText(['🦷', '💗', '✨'][(row + Math.round(x / 170)) % 3], x, y);
    g.globalAlpha = 1;
    mode = 'photo'; stage.dataset.mode = 'photo'; startEl.hidden = true;
    sfx.pop();
  }
  $('[data-cam]').addEventListener('click', openCam);
  $('[data-backdrop]').addEventListener('click', backdrop);
  $('[data-file]').addEventListener('click', () => fileIn.click());
  fileIn.addEventListener('change', () => {
    const f = fileIn.files?.[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    const img = new Image();
    img.onload = () => { stopCam(); fit(img, img.naturalWidth, img.naturalHeight); URL.revokeObjectURL(url); mode = 'photo'; stage.dataset.mode = 'photo'; startEl.hidden = true; sfx.pop(); };
    img.src = url;
    fileIn.value = '';
  });
  onVisible(root, (v) => {
    visible = v;
    if (!v && mode === 'camera' && stream) { stopCam(); stage.dataset.mode = 'paused'; }
    if (v) { paintFrame(); paintStickers(); }
  });
  stage.addEventListener('click', (e) => { if (stage.dataset.mode === 'paused' && !e.target.closest('.sf-sticker')) openCam(); });

  // ── stickers ──
  const stageW = () => stage.getBoundingClientRect().width || 300;
  function paintStickers() {
    const W = stageW();
    layer.innerHTML = '';
    stickers.forEach((s, i) => {
      const el = document.createElement('span');
      el.className = `sf-sticker k-${s.k}${s === active ? ' active' : ''}`;
      el.dataset.i = i;
      el.style.left = `${s.x * 100}%`;
      el.style.top = `${s.y * 100}%`;
      el.style.fontSize = `${s.s * W}px`;
      el.style.transform = `translate(-50%, -50%) rotate(${s.r}rad)`;
      el.innerHTML = s.k === 'tag' ? `<b>${s.ch} ${s.label}</b>` : `${s.ch}${s.k === 'pet' && s.label ? `<small>${s.label}</small>` : ''}`;
      layer.appendChild(el);
    });
  }
  let active = null;
  root.querySelectorAll('[data-st]').forEach((b) => b.addEventListener('click', () => {
    if (stickers.length >= 14) { toast(`<span>✋</span><b>${t('That’s a lot of stickers 😄', 'Keteer stickers keda 😄')}</b>`, 1800); return; }
    const base = STICKERS[+b.dataset.st];
    const s = { ...base, label: base.k === 'pet' ? (C.pet || '') : base.label, x: 0.3 + Math.random() * 0.4, y: 0.3 + Math.random() * 0.3, s: base.k === 'tag' ? 0.16 : 0.15, r: (Math.random() - 0.5) * 0.5 };
    stickers.push(s);
    active = s;
    paintStickers();
    sfx.pop(); buzz(8);
    layer.lastElementChild?.classList.add('new');
  }));
  // one finger drags, two fingers pinch and turn; drop on the bin to remove
  const pointers = new Map();
  let g0 = null;
  layer.addEventListener('pointerdown', (e) => {
    const el = e.target.closest('.sf-sticker');
    if (!el && pointers.size === 0) return;
    e.preventDefault();
    capture(layer, e.pointerId);
    if (el) { active = stickers[+el.dataset.i]; layer.querySelectorAll('.sf-sticker').forEach((x) => x.classList.toggle('active', x === el)); }
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    g0 = snapshot();
    stage.classList.add('dragging');
  });
  const snapshot = () => {
    const p = [...pointers.values()];
    if (!active || !p.length) return null;
    const r = stage.getBoundingClientRect();
    const base = { s: active.s, r: active.r, x: active.x, y: active.y, rect: r };
    if (p.length === 1) return { ...base, px: p[0].x, py: p[0].y };
    const [a, b] = p;
    return { ...base, px: (a.x + b.x) / 2, py: (a.y + b.y) / 2, d: Math.hypot(b.x - a.x, b.y - a.y), ang: Math.atan2(b.y - a.y, b.x - a.x) };
  };
  layer.addEventListener('pointermove', (e) => {
    if (!pointers.has(e.pointerId) || !active || !g0) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const p = [...pointers.values()];
    const R = g0.rect;
    if (p.length === 1 && g0.d == null) {
      active.x = Math.max(0, Math.min(1, g0.x + (p[0].x - g0.px) / R.width));
      active.y = Math.max(0, Math.min(1, g0.y + (p[0].y - g0.py) / R.height));
      const tr = trash.getBoundingClientRect();
      stage.classList.toggle('over-trash', p[0].x > tr.left - 10 && p[0].x < tr.right + 10 && p[0].y > tr.top - 10 && p[0].y < tr.bottom + 10);
    } else if (p.length >= 2 && g0.d) {
      const [a, b] = p;
      const d = Math.hypot(b.x - a.x, b.y - a.y), ang = Math.atan2(b.y - a.y, b.x - a.x);
      active.s = Math.max(0.06, Math.min(0.6, g0.s * d / g0.d));
      active.r = g0.r + (ang - g0.ang);
      active.x = Math.max(0, Math.min(1, g0.x + ((a.x + b.x) / 2 - g0.px) / R.width));
      active.y = Math.max(0, Math.min(1, g0.y + ((a.y + b.y) / 2 - g0.py) / R.height));
    }
    const el = layer.querySelector(`.sf-sticker[data-i="${stickers.indexOf(active)}"]`);
    if (el) {
      el.style.left = `${active.x * 100}%`; el.style.top = `${active.y * 100}%`;
      el.style.fontSize = `${active.s * R.width}px`;
      el.style.transform = `translate(-50%, -50%) rotate(${active.r}rad)`;
    }
  });
  const lift = (e) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.delete(e.pointerId);
    if (stage.classList.contains('over-trash') && active && pointers.size === 0) {
      stickers = stickers.filter((s) => s !== active);
      active = null;
      sfx.zap(); buzz([10, 30, 10]);
      paintStickers();
    }
    stage.classList.remove('over-trash');
    g0 = snapshot();
    if (!pointers.size) stage.classList.remove('dragging');
  };
  layer.addEventListener('pointerup', lift);
  layer.addEventListener('pointercancel', lift);
  // a double-tap removes a sticker too
  let lastTap = 0, lastEl = null;
  layer.addEventListener('click', (e) => {
    const el = e.target.closest('.sf-sticker');
    const now = performance.now();
    if (el && el === lastEl && now - lastTap < 320) { stickers.splice(+el.dataset.i, 1); active = null; paintStickers(); sfx.zap(); buzz(10); lastEl = null; return; }
    lastTap = now; lastEl = el;
  });

  // ── the picture ──
  $('[data-snap]').addEventListener('click', async () => {
    if (busy) return;
    if (!mode || stage.dataset.mode === 'paused') { if (!mode) startEl.classList.remove('nudge'), void startEl.offsetWidth, startEl.classList.add('nudge'); else openCam(); return; }
    busy = true;
    if (mode === 'camera') {
      for (const n of [3, 2, 1]) {
        countEl.textContent = n;
        countEl.classList.remove('show'); void countEl.offsetWidth; countEl.classList.add('show');
        sfx.key(); buzz(8);
        await new Promise((r) => setTimeout(r, 700));
      }
      countEl.textContent = '';
    }
    flashEl.classList.remove('go'); void flashEl.offsetWidth; flashEl.classList.add('go');
    sfx.shutter(); buzz([10, 40, 30]);
    const W = 1080, H = 1440;
    const out = document.createElement('canvas');
    out.width = W; out.height = H;
    const g = out.getContext('2d');
    if (mode === 'camera' && video.videoWidth) {
      const vw = video.videoWidth, vh = video.videoHeight, k = Math.max(W / vw, H / vh);
      g.save(); g.translate(W, 0); g.scale(-1, 1);
      g.drawImage(video, (W - vw * k) / 2, (H - vh * k) / 2, vw * k, vh * k);
      g.restore();
    } else g.drawImage(photo, 0, 0, W, H);
    drawFrame(g, W, H, frame, FRAMES.find((f) => f.id === frame).cap);
    stickers.forEach((s) => drawSticker(g, s, W));
    const blob = await new Promise((r) => out.toBlob(r, 'image/jpeg', 0.92));
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    resultUrl = URL.createObjectURL(blob);
    resultEl.src = resultUrl;
    resultEl.hidden = false;
    resultEl._blob = blob;
    stopCam();
    if (mode === 'camera') stage.dataset.mode = 'result-cam';
    after.hidden = false;
    actions.hidden = true;
    const file = new File([blob], 'rajiea-studio.jpg', { type: 'image/jpeg' });
    $('[data-share]').hidden = !navigator.canShare?.({ files: [file] });
    busy = false;
  });
  $('[data-save]').addEventListener('click', () => {
    if (!resultEl._blob) return;
    const a = document.createElement('a');
    const d = new Date();
    a.href = resultUrl;
    a.download = `rajiea-studio-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}-${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}.jpg`;
    document.body.appendChild(a); a.click(); a.remove();
    sfx.ding(); buzz(10);
    toast(`<span>💾</span><b>${t('Saved to your phone', 'Et7afazet 3ala mobilek')}</b>`, 2200);
  });
  $('[data-share]').addEventListener('click', async () => {
    try { await navigator.share({ files: [new File([resultEl._blob], 'rajiea-studio.jpg', { type: 'image/jpeg' })] }); } catch {}
  });
  $('[data-retake]').addEventListener('click', () => {
    resultEl.hidden = true;
    after.hidden = true;
    actions.hidden = false;
    sfx.click();
    if (stage.dataset.mode === 'result-cam') openCam();
  });

  // a frame picked elsewhere on the site (e.g. "hot pink")
  const pre = document.documentElement.dataset.sfFrame;
  if (pre) { delete document.documentElement.dataset.sfFrame; setFrame(pre); }
  new MutationObserver(() => { const f = document.documentElement.dataset.sfFrame; if (f) { delete document.documentElement.dataset.sfFrame; setFrame(f); } }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-sf-frame'] });
  requestAnimationFrame(paintFrame);
}
