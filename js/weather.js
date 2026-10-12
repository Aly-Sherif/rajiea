// Cairo's weather, live from Open-Meteo (free, no key). When it rains in Cairo, it rains on the page too.
// Add ?weather=rain (or storm, clouds, hot, clear, night, fog, dust, cool) to the address to preview a mood.
const LAT = 30.04, LNG = 31.24;
const CACHE = 'rj-wx';

export const ICON = { rain: '🌧️', storm: '⛈️', clouds: '☁️', hot: '🥵', clear: '☀️', night: '🌙', fog: '🌫️', dust: '🌪️', cool: '🍃' };

function classify(code, temp, isDay, dust) {
  if ([95, 96, 99].includes(code)) return 'storm';
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 'rain';
  if (code === 45 || code === 48) return 'fog';
  if (dust >= 250) return 'dust';
  if (temp >= 35) return 'hot';
  if (temp <= 17) return 'cool';
  if (code === 2 || code === 3) return 'clouds';
  return isDay ? 'clear' : 'night';
}

export async function cairoWeather() {
  const force = new URLSearchParams(location.search).get('weather');
  if (force && ICON[force]) return { kind: force, temp: force === 'hot' ? 38 : force === 'cool' ? 15 : 22, forced: true };
  try {
    const c = JSON.parse(sessionStorage.getItem(CACHE));
    if (c && Date.now() - c.at < 20 * 60e3) return c.w;
  } catch {}
  const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LNG}&current=temperature_2m,weather_code,is_day&timezone=Africa%2FCairo`);
  if (!r.ok) throw new Error('weather');
  const cur = (await r.json()).current;
  let dust = 0;
  try {
    const a = await fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${LAT}&longitude=${LNG}&current=dust`);
    dust = (await a.json()).current?.dust || 0;
  } catch {}
  const w = { kind: classify(cur.weather_code, cur.temperature_2m, cur.is_day, dust), temp: Math.round(cur.temperature_2m) };
  try { sessionStorage.setItem(CACHE, JSON.stringify({ at: Date.now(), w })); } catch {}
  return w;
}

// Rain, storm, fog or dust drifting over the page. Time-based, light, and it rests when the tab is hidden.
export function weatherFx(kind) {
  if (!['rain', 'storm', 'fog', 'dust'].includes(kind)) return () => {};
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {};
  const cv = document.createElement('canvas');
  cv.className = `wx-fx wx-${kind}`;
  cv.setAttribute('aria-hidden', 'true');
  document.body.appendChild(cv);
  const g = cv.getContext('2d');
  const small = matchMedia('(pointer: coarse)').matches;
  const dpr = Math.min(devicePixelRatio || 1, 1.5);
  let W = 0, H = 0;
  const size = () => { W = innerWidth; H = innerHeight; cv.width = W * dpr; cv.height = H * dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0); };
  size();
  addEventListener('resize', size);
  const wet = kind === 'rain' || kind === 'storm';
  const n = wet ? (small ? 70 : 140) * (kind === 'storm' ? 1.4 : 1) : kind === 'dust' ? (small ? 60 : 110) : 7;
  const parts = Array.from({ length: Math.round(n) }, () => ({ x: Math.random(), y: Math.random(), s: 0.6 + Math.random() * 0.8, o: Math.random() }));
  let last = performance.now(), raf = 0, flash = 0, nextFlash = 3 + Math.random() * 6;
  const draw = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    g.clearRect(0, 0, W, H);
    if (wet) {
      // light drops on dark pages, deeper blue ones on light pages
      const dark = document.documentElement.classList.contains('private');
      g.strokeStyle = dark ? (kind === 'storm' ? 'rgba(200,215,240,.55)' : 'rgba(170,200,235,.5)') : 'rgba(84,116,176,.5)';
      g.lineWidth = 1.2;
      g.beginPath();
      for (const p of parts) {
        p.y += dt * (kind === 'storm' ? 1.5 : 1.1) * p.s;
        p.x -= dt * 0.12 * p.s;
        if (p.y > 1.05) { p.y = -0.05; p.x = Math.random() * 1.1; }
        if (p.x < -0.05) p.x += 1.1;
        const x = p.x * W, y = p.y * H, len = 14 * p.s;
        g.moveTo(x, y);
        g.lineTo(x + len * 0.18, y - len);
      }
      g.stroke();
      if (kind === 'storm') {
        nextFlash -= dt;
        if (nextFlash < 0) { flash = 1; nextFlash = 5 + Math.random() * 8; }
        if (flash > 0) { g.fillStyle = `rgba(255,255,255,${flash * 0.22})`; g.fillRect(0, 0, W, H); flash = Math.max(0, flash - dt * 3); }
      }
    } else if (kind === 'dust') {
      for (const p of parts) {
        p.x += dt * 0.08 * p.s;
        p.y += Math.sin(now / 900 + p.o * 6) * dt * 0.01;
        if (p.x > 1.05) { p.x = -0.05; p.y = Math.random(); }
        g.fillStyle = `rgba(214,170,110,${0.25 + p.o * 0.3})`;
        g.beginPath();
        g.arc(p.x * W, p.y * H, 1 + p.s * 1.4, 0, Math.PI * 2);
        g.fill();
      }
    } else {
      for (const p of parts) {
        p.x += dt * 0.012 * p.s;
        if (p.x > 1.3) p.x = -0.3;
        const x = p.x * W, y = p.y * H, r = (small ? 160 : 260) * p.s;
        const grd = g.createRadialGradient(x, y, 0, x, y, r);
        grd.addColorStop(0, 'rgba(255,255,255,.16)');
        grd.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = grd;
        g.fillRect(x - r, y - r, r * 2, r * 2);
      }
    }
    raf = requestAnimationFrame(draw);
  };
  const run = () => { cancelAnimationFrame(raf); if (!document.hidden) { last = performance.now(); raf = requestAnimationFrame(draw); } };
  document.addEventListener('visibilitychange', run);
  run();
  return () => { cancelAnimationFrame(raf); document.removeEventListener('visibilitychange', run); removeEventListener('resize', size); cv.remove(); };
}
