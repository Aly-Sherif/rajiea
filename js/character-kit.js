// Shared helpers for the 3D characters: smooth surfaces, skinning, painted
// textures, skin and cloth materials, and a soft studio light. All made in code.
import * as THREE from '../vendor/three.module.min.js';

export const PI = Math.PI, TAU = PI * 2;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const damp = (a, b, k, dt) => lerp(a, b, 1 - Math.exp(-k * dt));
export const smooth = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
export const gauss = (x, y, cx, cy, sx, sy) => Math.exp(-(((x - cx) / sx) ** 2) - ((y - cy) / sy) ** 2);
// smooth max / min (polynomial), k = blend width
export const smax = (a, b, k) => { const h = clamp(0.5 + (0.5 * (a - b)) / k, 0, 1); return lerp(b, a, h) + k * h * (1 - h); };
export const smin = (a, b, k) => -smax(-a, -b, k);

export function rng(a = 1) {
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// monotone cubic through [x, y] knots (no overshoot), clamped at the ends
export function spline(pts) {
  pts = [...pts].sort((a, b) => a[0] - b[0]);
  const n = pts.length, xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const d = [], m = new Array(n);
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
  m[0] = d[0]; m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) { m[i] = m[i + 1] = 0; continue; }
    const a = m[i] / d[i], b = m[i + 1] / d[i], h = a * a + b * b;
    if (h > 9) { const t = 3 / Math.sqrt(h); m[i] = t * a * d[i]; m[i + 1] = t * b * d[i]; }
  }
  return (x) => {
    if (x <= xs[0]) return ys[0];
    if (x >= xs[n - 1]) return ys[n - 1];
    let lo = 0, hi = n - 1;
    while (hi - lo > 1) { const md = (lo + hi) >> 1; if (xs[md] > x) hi = md; else lo = md; }
    const h = xs[hi] - xs[lo], t = (x - xs[lo]) / h, t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * ys[lo] + (t3 - 2 * t2 + t) * h * m[lo] + (-2 * t3 + 3 * t2) * ys[hi] + (t3 - t2) * h * m[hi];
  };
}

// samples 0..n spread by a density function (more samples where dens is high)
export function spread(n, a, b, dens = () => 1, steps = 600) {
  const acc = [0];
  for (let i = 1; i <= steps; i++) acc.push(acc[i - 1] + dens(lerp(a, b, (i - 0.5) / steps)));
  const out = [];
  let k = 0;
  for (let i = 0; i <= n; i++) {
    const target = (acc[steps] * i) / n;
    while (k < steps - 1 && acc[k + 1] < target) k++;
    const f = (target - acc[k]) / Math.max(1e-9, acc[k + 1] - acc[k]);
    out.push(lerp(a, b, (k + clamp(f, 0, 1)) / steps));
  }
  return out;
}

// ── grid surfaces ──
// fn(i, j, p) sets p for column i (0..nu) and row j (0..nv) and may return [u, v]
export function surface(nu, nv, fn, { keep, wrap = false, flip = false } = {}) {
  const cols = nu + 1, rows = nv + 1, n = cols * rows;
  const pos = new Float32Array(n * 3), uv = new Float32Array(n * 2), p = new THREE.Vector3();
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const k = j * cols + i;
      const t = fn(i, j, p);
      p.toArray(pos, k * 3);
      uv[k * 2] = t ? t[0] : i / nu;
      uv[k * 2 + 1] = t ? t[1] : j / nv;
    }
  }
  const idx = [];
  for (let j = 0; j < nv; j++) {
    for (let i = 0; i < nu; i++) {
      if (keep && !keep(i, j)) continue;
      const a = j * cols + i, b = a + 1, c = a + cols, d = c + 1;
      if (flip) idx.push(a, d, b, a, c, d); else idx.push(a, b, d, a, d, c);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  geo.userData.grid = { cols, rows };
  if (wrap) weldSeam(geo, cols, rows);
  return geo;
}
// average the normals of the first and last column so a wrapped grid has no seam
export function weldSeam(geo, cols, rows) {
  const nm = geo.attributes.normal, v = new THREE.Vector3(), w = new THREE.Vector3();
  for (let j = 0; j < rows; j++) {
    const a = j * cols, b = a + cols - 1;
    v.fromBufferAttribute(nm, a).add(w.fromBufferAttribute(nm, b)).normalize();
    nm.setXYZ(a, v.x, v.y, v.z); nm.setXYZ(b, v.x, v.y, v.z);
  }
}
// all vertices of a row share one normal (closes a pole without a pinch)
export function weldRow(geo, j, dir) {
  const { cols } = geo.userData.grid, nm = geo.attributes.normal, v = new THREE.Vector3();
  if (dir) v.copy(dir);
  else for (let i = 0; i < cols; i++) v.add(new THREE.Vector3().fromBufferAttribute(nm, j * cols + i));
  v.normalize();
  for (let i = 0; i < cols; i++) nm.setXYZ(j * cols + i, v.x, v.y, v.z);
}

// skin weights: fn(i, p) → [[bone, w], ...]
export function skinWeights(geo, fn) {
  const pos = geo.attributes.position, n = pos.count;
  const si = new Uint16Array(n * 4), sw = new Float32Array(n * 4), p = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    p.fromBufferAttribute(pos, i);
    const list = fn(i, p).filter((e) => e[1] > 1e-4).sort((a, b) => b[1] - a[1]).slice(0, 4);
    const tot = list.reduce((s, e) => s + e[1], 0) || 1;
    list.forEach(([b, w], k) => { si[i * 4 + k] = b; sw[i * 4 + k] = w / tot; });
    if (!list.length) sw[i * 4] = 1;
  }
  geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4));
  geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
  return geo;
}

// merge simple indexed geometries that share the same attributes
export function merge(geos) {
  const names = Object.keys(geos[0].attributes);
  const out = new THREE.BufferGeometry();
  for (const nm of names) {
    const size = geos[0].attributes[nm].itemSize;
    const total = geos.reduce((s, g) => s + g.attributes[nm].count, 0);
    const Arr = geos[0].attributes[nm].array.constructor;
    const arr = new Arr(total * size);
    let o = 0;
    for (const g of geos) { arr.set(g.attributes[nm].array.subarray(0, g.attributes[nm].count * size), o); o += g.attributes[nm].count * size; }
    out.setAttribute(nm, new THREE.BufferAttribute(arr, size, geos[0].attributes[nm].normalized));
  }
  const idx = [];
  let base = 0;
  for (const g of geos) {
    if (g.index) for (let i = 0; i < g.index.count; i++) idx.push(g.index.getX(i) + base);
    else for (let i = 0; i < g.attributes.position.count; i++) idx.push(i + base);
    base += g.attributes.position.count;
  }
  out.setIndex(idx);
  return out;
}

// ── painted textures ──
export function canvas(w, h = w) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
export function tex(cv, { srgb = true, repeat = null, aniso = 4 } = {}) {
  const t = cv.isTexture ? cv : new THREE.CanvasTexture(cv);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.anisotropy = aniso;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); }
  return t;
}
// tileable fractal value noise in 0..1
export function fbm(size, { octaves = 4, base = 4, seed = 1, gain = 0.5, sx = 1 } = {}) {
  const out = new Float32Array(size * size), r = rng(seed);
  let amp = 1, total = 0;
  const sm = (t) => t * t * (3 - 2 * t);
  for (let o = 0; o < octaves; o++) {
    const ny = base << o, nx = Math.max(1, Math.round(ny * sx)), g = new Float32Array(nx * ny);
    for (let i = 0; i < g.length; i++) g[i] = r();
    for (let y = 0; y < size; y++) {
      const fy = (y / size) * ny, y0 = Math.floor(fy), ty = sm(fy - y0), y1 = (y0 + 1) % ny;
      for (let x = 0; x < size; x++) {
        const fx = (x / size) * nx, x0 = Math.floor(fx), tx = sm(fx - x0), x1 = (x0 + 1) % nx;
        const a = g[y0 * nx + x0], b = g[y0 * nx + x1], c = g[y1 * nx + x0], d = g[y1 * nx + x1];
        out[y * size + x] += amp * lerp(lerp(a, b, tx), lerp(c, d, tx), ty);
      }
    }
    total += amp;
    amp *= gain;
  }
  for (let i = 0; i < out.length; i++) out[i] /= total;
  return out;
}
// a height field (Float32, wraps) → tangent-space normal map
export function normalMap(h, size, strength = 2, repeat = [1, 1]) {
  const cv = canvas(size), g = cv.getContext('2d'), img = g.createImageData(size, size), d = img.data;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = h[y * size + ((x + 1) % size)] - h[y * size + ((x - 1 + size) % size)];
      const dy = h[((y + 1) % size) * size + x] - h[((y - 1 + size) % size) * size + x];
      let nx = -dx * strength, ny = dy * strength, nz = 1;
      const l = Math.hypot(nx, ny, nz);
      nx /= l; ny /= l; nz /= l;
      const k = (y * size + x) * 4;
      d[k] = (nx * 0.5 + 0.5) * 255; d[k + 1] = (ny * 0.5 + 0.5) * 255; d[k + 2] = (nz * 0.5 + 0.5) * 255; d[k + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  return tex(cv, { srgb: false, repeat });
}
// height from a canvas drawing (grey levels)
export function heightOf(cv) {
  const { width: w, height: h } = cv, d = cv.getContext('2d').getImageData(0, 0, w, h).data, out = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) out[i] = d[i * 4] / 255;
  return out;
}

// fabric weaves as normal maps (tileable)
const weaveCache = new Map();
export function weave(kind, repeat = [1, 1]) {
  const key = kind;
  if (!weaveCache.has(key)) {
    const S = 256, h = new Float32Array(S * S), n = fbm(S, { octaves: 3, base: 8, seed: kind.length * 7 });
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const u = (x / S) * TAU, v = (y / S) * TAU;
        let val = 0;
        if (kind === 'twill') val = 0.5 + 0.5 * Math.sin((x + y) / S * TAU * 32) * (0.7 + 0.3 * Math.sin(v * 64));
        else if (kind === 'denim') val = 0.5 + 0.45 * Math.sin((x * 2 + y) / S * TAU * 22) + 0.15 * Math.sin(u * 96);
        else if (kind === 'rib') val = 0.5 + 0.5 * Math.sin(u * 28) ** 3 + 0.12 * Math.sin(v * 80) * Math.cos(u * 28);
        else if (kind === 'knit') { const a = Math.sin(u * 24 + Math.sin(v * 48) * 0.6), b = Math.sin(v * 48); val = 0.5 + 0.35 * Math.abs(a) * (0.6 + 0.4 * b); }
        else if (kind === 'jersey') val = 0.5 + 0.25 * Math.sin(u * 72) * Math.sin(v * 72 + Math.sin(u * 36));
        else if (kind === 'leather') val = n[y * S + x] * 0.8 + 0.2 * fbmCell(x, y);
        else val = 0.5 + 0.25 * Math.sin(u * 64) * Math.sin(v * 64);
        h[y * S + x] = val * 0.8 + n[y * S + x] * 0.2;
      }
    }
    weaveCache.set(key, h);
  }
  const strength = { twill: 1.4, denim: 2.2, rib: 3, knit: 3.2, jersey: 1.6, leather: 3, chiffon: 1.2 }[kind] ?? 1.5;
  return normalMap(weaveCache.get(key), 256, strength, repeat);
}
function fbmCell(x, y) { return 0.5 + 0.5 * Math.sin(x * 0.9) * Math.sin(y * 0.7 + Math.sin(x * 0.3) * 2); }

// tiny skin pores and fine lines
let poreH = null;
export function poreMap(repeat = [6, 6]) {
  if (!poreH) {
    const S = 256, cv = canvas(S), g = cv.getContext('2d'), r = rng(11);
    g.fillStyle = 'rgb(160,160,160)';
    g.fillRect(0, 0, S, S);
    for (let k = 0; k < 900; k++) {
      const x = r() * S, y = r() * S, rad = 0.8 + r() * 1.6;
      for (const [ox, oy] of [[0, 0], [S, 0], [-S, 0], [0, S], [0, -S]]) {
        const grd = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, rad);
        grd.addColorStop(0, 'rgba(60,60,60,0.8)');
        grd.addColorStop(1, 'rgba(60,60,60,0)');
        g.fillStyle = grd;
        g.fillRect(x + ox - rad, y + oy - rad, rad * 2, rad * 2);
      }
    }
    poreH = heightOf(cv);
    const n = fbm(S, { octaves: 4, base: 6, seed: 5 });
    for (let i = 0; i < poreH.length; i++) poreH[i] = poreH[i] * 0.75 + n[i] * 0.35;
  }
  return normalMap(poreH, 256, 2.2, repeat);
}

// ── materials ──
// Skin: soft light that wraps further in the reds, like light under the skin
const WRAP_FROM = 'reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );';
const WRAP_TO = `{ float nlw = dot( geometryNormal, directLight.direction );
	vec3 wrapNL = clamp( ( vec3( nlw ) + sssWrap ) / ( 1.0 + sssWrap ), 0.0, 1.0 );
	reflectedLight.directDiffuse += wrapNL * directLight.color * BRDF_Lambert( material.diffuseColor ); }`;
export function skinMaterial(opts = {}) {
  const { wrap = [0.46, 0.2, 0.12], ...rest } = opts;
  const m = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, roughness: 0.52, specularIntensity: 0.55, sheen: 0.3, sheenRoughness: 0.45, sheenColor: new THREE.Color(0xffc9b8), ...rest,
  });
  m.userData.sss = { wrap: new THREE.Vector3(...wrap) };
  m.onBeforeCompile = (s) => {
    s.uniforms.sssWrap = { value: m.userData.sss.wrap };
    s.fragmentShader = s.fragmentShader.replace('#include <lights_physical_pars_fragment>',
      'uniform vec3 sssWrap;\n' + THREE.ShaderChunk.lights_physical_pars_fragment.replace(WRAP_FROM, WRAP_TO));
  };
  m.customProgramCacheKey = () => 'skin-wrap';
  return m;
}
export function clothMaterial({ color = 0xffffff, roughness = 0.82, sheen = 0.9, sheenRoughness = 0.55, sheenTint = 0.3, normalMap: nm, normalScale = 0.5, ...rest } = {}) {
  const c = new THREE.Color(color);
  const m = new THREE.MeshPhysicalMaterial({
    color: c, roughness, sheen, sheenRoughness, sheenColor: c.clone().lerp(new THREE.Color(0xffffff), sheenTint), specularIntensity: 0.4, ...rest,
  });
  if (nm) { m.normalMap = nm; m.normalScale.set(normalScale, normalScale); }
  m.userData.sheenTint = sheenTint;
  return m;
}
export function setCloth(m, hex) {
  m.color.set(hex);
  m.sheenColor.set(hex).lerp(new THREE.Color(0xffffff), m.userData.sheenTint ?? 0.3);
}

// ── soft pink studio light for reflections and fill ──
export function studioEnvironment(renderer) {
  const env = new THREE.Scene();
  const dome = new THREE.SphereGeometry(1, 48, 24), col = [], c = new THREE.Color();
  const p = dome.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i);
    if (y > 0) c.setRGB(1.0, 0.93, 0.95).lerp(new THREE.Color(1.05, 1.02, 1.03), y);
    else c.setRGB(1.0, 0.86, 0.9).lerp(new THREE.Color(0.62, 0.48, 0.45), Math.min(1, -y * 1.6));
    col.push(c.r * 0.75, c.g * 0.75, c.b * 0.75);
  }
  dome.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  const domeMesh = new THREE.Mesh(dome, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide }));
  domeMesh.scale.setScalar(20);
  env.add(domeMesh);
  const panel = (w, h, pos, rgb, k) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(...rgb).multiplyScalar(k), side: THREE.DoubleSide }));
    m.position.set(...pos);
    m.lookAt(0, 1.5, 0);
    env.add(m);
  };
  panel(7, 6, [7, 9, 11], [1, 0.97, 0.94], 7.5); // key softbox
  panel(6, 8, [-12, 4, 6], [1, 0.9, 0.93], 1.4); // fill
  panel(3, 10, [-8, 5, -9], [1, 0.62, 0.8], 5); // pink rim
  panel(3, 10, [9, 5, -8], [1, 0.8, 0.85], 4); // rim
  panel(10, 10, [0, 14, 2], [1, 1, 1], 1.6); // top
  const pm = new THREE.PMREMGenerator(renderer);
  const rt = pm.fromScene(env, 0.025);
  pm.dispose();
  env.traverse((o) => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } });
  return rt.texture;
}

// a soft dark spot for under the feet
export function contactShadow(w = 1.1, d = 0.8, strength = 0.55) {
  const cv = canvas(128), g = cv.getContext('2d');
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, `rgba(70,30,40,${strength})`);
  grd.addColorStop(0.45, `rgba(70,30,40,${strength * 0.45})`);
  grd.addColorStop(1, 'rgba(70,30,40,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ map: tex(cv), transparent: true, depthWrite: false, toneMapped: false }));
  m.rotation.x = -PI / 2;
  m.position.y = 0.004;
  m.renderOrder = 1;
  return m;
}
