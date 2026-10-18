// Realistic faces for the 3D characters: a sculpted face surface whose smile can open,
// eyes with moving lids and lashes, teeth, and painted skin. Generic faces, drawn in code.
// Units here are centimetres around the centre of the head; the caller scales the group.
import * as THREE from '../vendor/three.module.min.js';
import { PI, TAU, clamp, lerp, damp, smooth, gauss, smax, smin, spline, spread, surface, weldRow, skinWeights, canvas, tex, rng, poreMap, skinMaterial, merge } from './character-kit.js';

// ── face recipes ──
export const ADULT = {
  // half width, front depth and front flatness of the head at each height (cm)
  width: [[-11.28, 0.6], [-10.4, 2.1], [-9.7, 3.05], [-8.82, 4.0], [-7.85, 4.78], [-6.7, 5.42], [-5.5, 5.95], [-3.5, 6.45], [-1.5, 6.85], [0.5, 7.0], [3, 7.05], [5.5, 6.85], [8, 6.2], [10, 5.0], [11.4, 2.8], [12, 1]],
  depth: [[-11.28, 1.2], [-10.4, 4.4], [-9.7, 6.9], [-9.08, 8.2], [-8.55, 8.6], [-7.76, 8.55], [-7.23, 8.6], [-6.18, 8.85], [-4.6, 8.8], [-3.5, 8.45], [-1.5, 8.2], [0.8, 8.45], [1.9, 8.75], [3.5, 8.8], [6, 8.4], [8, 7.6], [10, 5.6], [11.4, 3], [12, 1.5]],
  flat: [[-9.52, 2.0], [-6.88, 2.0], [-5, 1.98], [-2.5, 2.12], [0, 2.3], [4, 2.5], [8, 2.3]],
  eye: { x: 3.03, y: 0, z: 6.3, r: 1.25 },
  mouth: { y: -5.97, w: 2.1, hu: 0.8, hl: 0.9, bow: 0.15, dip: 0.09, au: 0.46, al: 0.44, open: [0.4, 0.26], seam: 0.12 },
  nose: {
    H: [[1.5, 0], [0.8, 0.12], [0, 0.4], [-1.0, 0.9], [-2.0, 1.48], [-2.55, 1.84], [-2.95, 2.0], [-3.3, 1.86], [-3.65, 1.2], [-3.9, 0.46], [-4.15, 0]],
    W: [[1.5, 0.86], [0, 0.84], [-1.5, 0.8], [-2.45, 0.84], [-3.0, 0.86], [-3.6, 0.6], [-4.15, 0.48]],
    P: [[1, 2.4], [-1.5, 2.4], [-2.45, 2.3], [-3.1, 2.2]],
    ala: { H: [[-2.4, 0], [-2.85, 0.42], [-3.25, 0.62], [-3.65, 0.5], [-3.95, 0.14], [-4.15, 0]], x: 0.82, w: 0.5 },
    nostril: [0.44, -3.66, 0.26, 0.12],
    sub: -4.05,
  },
  brow: { y: 1.95, x0: 1.2 },
  cheek: [4.3, -1.8, 0.42],
  chin: [-8.6, 0.32],
  grid: { y0: -11.3, y1: 8.6, nx: 136, ny: 176, s: 0.985 },
  paint: { x: 7.2, y0: -12.4, y1: 9.0 },
  skin: '#f6d9c8',
  lip: '#c98584',
  brows: 'dark',
};

// ── the eye opening, as angles round the eyeball; shared by the face and the moving lids ──
const LID = { azIn: -1.42, azOut: 1.3, rl: 0.24 };
const DEG = PI / 180;
const lidBell = (a, c = 0) => { const t = a < c ? (a - c) / (1 + c) : (a - c) / (1 - c); return Math.pow(Math.max(0, 1 - Math.abs(t) ** 2.4), 0.85); };
const ST0 = { blink: 0, squint: 0, gaze: 0 };
function lidMargins(a, st = ST0) {
  const c = lerp(-2 * DEG, 5 * DEG, (a + 1) / 2);
  const upOpen = c + (20 * DEG - c) * lidBell(a, -0.1) + Math.min(0, st.gaze) * 0.35;
  const loOpen = c + (-14 * DEG - c) * lidBell(a, 0.18) + Math.max(0, st.gaze) * 0.15;
  const meet = c + (-9 * DEG - c) * lidBell(a, 0.05);
  const lo = lerp(lerp(loOpen, meet + 3 * DEG, st.squint), meet, st.blink * 0.25);
  const up = Math.max(lerp(upOpen, meet, st.blink), lo + 0.6 * DEG * (1 - st.blink));
  return [up, lo];
}

// ── the face surface ──
export function sculptor(S) {
  // the outline splines, blurred along the height so the shading has no bands at their knots
  const soft = (fn, sig, y0 = -14, y1 = 14, step = 0.05) => {
    const n = Math.round((y1 - y0) / step) + 1, raw = new Float32Array(n), out = new Float32Array(n), K = Math.ceil((3 * sig) / step);
    for (let i = 0; i < n; i++) raw[i] = fn(y0 + i * step);
    for (let i = 0; i < n; i++) {
      let sum = 0, wt = 0;
      for (let k = -K; k <= K; k++) { const g = Math.exp(-0.5 * ((k * step) / sig) ** 2); sum += raw[clamp(i + k, 0, n - 1)] * g; wt += g; }
      out[i] = sum / wt;
    }
    return (y) => { const t = clamp((y - y0) / step, 0, n - 1.001), i = Math.floor(t), u = t - i; return out[i] * (1 - u) + out[i + 1] * u; };
  };
  const A = soft(spline(S.width), 0.45), C = soft(spline(S.depth), 0.4), Fl = soft(spline(S.flat), 0.7);
  const E = S.eye, M = S.mouth, N = S.nose;
  const nH = spline(N.H), nW = spline(N.W), nP = spline(N.P), aH = spline(N.ala.H);
  const upH = (X) => {
    const a = Math.abs(X);
    if (a >= 1) return 0;
    return M.hu * Math.pow(1 - Math.pow(a, 2.4), 0.55) + M.bow * Math.exp(-(((a - 0.21) / 0.1) ** 2)) - M.dip * Math.exp(-((X / 0.09) ** 2));
  };
  const loH = (X) => { const a = Math.abs(X); return a >= 1 ? 0 : M.hl * Math.pow(1 - Math.pow(a, 2.2), 0.6); };
  const hump = (t) => (t <= 0 ? 0 : t < 0.45 ? Math.pow(Math.sin((PI / 2) * (t / 0.45)), 0.55) : Math.exp(-(((t - 0.45) / 0.62) ** 2)));
  const openShape = (X) => (Math.abs(X) >= 1 ? 0 : Math.pow(1 - X * X, 0.75));
  const info = { band: 0, lip: 0, nostril: 0, eye: 0 };

  function base(x, y) {
    const u = Math.min(Math.abs(x) / A(y), 1);
    return C(y) * Math.sqrt(Math.max(0, 1 - Math.pow(u, Fl(y))));
  }
  // height of the nose above the cheeks
  function nose(x, y, g) {
    const ax = Math.abs(x);
    info.nostril = 0;
    if (y > 1.6 || y < N.sub - 0.2 || ax > 2.4) return 0;
    const w = nW(y), t = ax / w;
    let h = t < 1 ? nH(y) * Math.pow(1 - Math.pow(t, nP(y)), 1.5) : 0;
    const ah = aH(y);
    if (ah > 0) {
      const xa = N.ala.x * (1 + 0.07 * g), d = ax - xa;
      const wing = ah * Math.exp(-((d / (d > 0 ? N.ala.w * 1.0 : N.ala.w * 1.2)) ** 2));
      h = smax(h, wing, 0.16 * smooth(0, 0.35, Math.max(h, wing)));
      h -= 0.07 * (ah / 0.7) * Math.exp(-(((ax - xa - N.ala.w * 1.1) / 0.26) ** 2));
    }
    const [nx, ny, nrx, nry] = N.nostril;
    const nos = gauss(ax, y, nx, ny, nrx, nry);
    info.nostril = nos;
    h += 0.1 * gauss(ax, y, 0, N.tip ?? -2.95, 0.42, 0.38);
    return h - 0.5 * nos;
  }
  // round the eye the face becomes the open lids: skin over the eyeball with a soft roll and a
  // crease above, tucked behind the eyeball inside the opening
  function eyeSocket(x, y, z) {
    info.eye = 0;
    const dx = Math.abs(x) - E.x, dy = y - E.y, Rl = E.r + LID.rl;
    if (Math.abs(dx) > 3.4 || Math.abs(dy) > 2.8) return z;
    const lat = Math.asin(clamp(dy / Rl, -1, 1));
    const az = Math.asin(clamp(dx / (Rl * Math.max(Math.cos(lat), 0.05)), -1, 1));
    const a = ((az - LID.azIn) / (LID.azOut - LID.azIn)) * 2 - 1;
    const [up, lo] = lidMargins(clamp(a, -1, 1));
    const above = lat - up, below = lo - lat, kk = 0.06 + 0.4 * smooth(0.9, 1.25, Math.abs(a)), upper = smooth(-kk, kk, above - below);
    let d = Math.max(above, below);
    if (Math.abs(a) > 1) {
      // past a corner: how far from the corner itself
      const ae = a > 0 ? LID.azOut : LID.azIn, ce = a > 0 ? 5 * DEG : -2 * DEG;
      d = Math.max(d, (1.5 * Math.hypot(dx - Rl * Math.cos(ce) * Math.sin(ae), dy - Rl * Math.sin(ce))) / Rl);
    }
    const s2 = dx * dx + dy * dy;
    const deepMax = lerp(0.5, 1.05, smooth(-0.9, 0.5, dx)), fold = 1 - smooth(0.95, 1.2, Math.abs(a));
    let zl = E.z + Math.sqrt(Math.max(0, Rl * Rl - s2));
    zl += fold * lerp(0.022 * Math.exp(-(((d - 0.08) / 0.06) ** 2)), 0.018 * Math.exp(-(((d - 0.07) / 0.05) ** 2)) - 0.055 * Math.exp(-(((d - 0.3) / 0.08) ** 2)) - 0.1 * Math.exp(-(((d - 0.5) / 0.18) ** 2)), upper);
    zl = Math.max(zl, z - deepMax);
    const zi = Math.max(E.z + Math.sqrt(Math.max(0, (E.r - 0.15) ** 2 - s2)), Math.min(z - deepMax - 0.4, E.z + 0.25 * smooth(E.r - 0.2, E.r + 0.15, Math.sqrt(s2))));
    const ze = lerp(Math.max(zi, zl - 0.3 - 1.2 * (1 - smooth(E.r - 0.1, E.r + 0.12, Math.sqrt(s2)))), zl, smooth(0, 0.028, d));
    info.eye = smooth(0.03, -0.02, d);
    return lerp(ze, z, lerp(smooth(0.12, 0.5, d), smooth(0.2, 0.62, d), upper));
  }

  // where a point of skin (x0, eta) sits for a smile amount g (0..1);
  // 'info' tells the caller if it is inside the mouth, on the lips or in a nostril
  function point(x0, eta, g, out) {
    const s0 = eta - M.y, X = x0 / M.w, ax = Math.abs(X), sx = Math.sign(x0) || 1;
    // lip line bends up at the corners, more in a smile
    const seamY = (M.seam * Math.min(X * X, 1.4) + g * 0.44 * smooth(0.15, 1.0, ax)) * Math.exp(-((s0 / 2.2) ** 2));
    let x = x0, y = eta + seamY;
    // a smile widens the mouth and lifts the cheeks
    const corner = smooth(0.1, 1.0, ax) * Math.exp(-((Math.max(0, ax - 1) * M.w / 1.6) ** 2)) * Math.exp(-((s0 / 1.8) ** 2));
    x += g * sx * 0.36 * corner;
    const bx0 = Math.abs(x0);
    y += g * (gauss(bx0, eta, 3.4, M.y + 3.0, 2.0, 2.4) * 0.3 + gauss(bx0, eta, E.x, E.y - 1.2, 1.6, 0.8) * 0.12);
    // the lips part: upper lip up, lower lip down, a band between becomes the mouth
    const op = openShape(X), d = 0.035;
    let band = 0;
    if (s0 >= d) y += g * M.open[0] * op * (1 - smooth(0.9, 2.6, s0));
    else if (s0 <= -d) y -= g * M.open[1] * op * (1 - 0.7 * smooth(1.0, 4.0, -s0));
    else { const t = (s0 + d) / (2 * d); y += g * op * lerp(-M.open[1], M.open[0], t); band = Math.sin(t * PI); }
    // skin over the skull
    let z = base(x, y);
    const bx = Math.abs(x);
    // brow ridge, cheekbones, cheeks, chin, forehead
    z += 0.22 * gauss(bx, y, E.x + 0.1, S.brow.y - 0.2, 2.3, 0.85) + 0.12 * gauss(x, y, 0, S.brow.y - 0.3, 1.3, 0.8);
    z += S.cheek[2] * gauss(bx, y, S.cheek[0], S.cheek[1], 1.75, 1.1);
    z += (0.3 + 0.3 * g) * gauss(bx, y, E.x - 0.15, E.y - 2.3 + 0.25 * g, 1.3, 1.1);
    z += 0.22 * gauss(bx, y, 3.6, M.y + 1.6, 1.5, 1.8) * (1 + g);
    z += 0.13 * gauss(bx, y, 4.9, -0.9, 1.3, 0.6);
    z -= 0.08 * gauss(bx, y, E.x - 0.9, E.y - 1.0, 0.9, 0.35);
    z += S.chin[1] * gauss(x, y, 0, S.chin[0], 1.75, 1.15) * (1 - 0.2 * g);
    z -= 0.22 * gauss(x, y, 0, M.y - 1.65, 1.8, 0.4) * (1 - 0.4 * g);
    z += 0.12 * gauss(bx, y, 2.4, S.brow.y + 3.0, 1.6, 1.4);
    // soft fold from the nose wing to the mouth corner, fuller cheek beside it
    {
      const y0 = N.sub + 0.3, y1 = M.y - 0.3, f = (y0 - y) / (y0 - y1), fk = S.fold ?? 1;
      const t = clamp(f, 0, 1), win = smooth(-0.15, 0.08, f) * (1 - smooth(0.92, 1.12, f));
      const xn = lerp(N.ala.x + N.ala.w * 1.15, M.w + 0.45, Math.pow(t, 0.85));
      const dd = bx - xn;
      z -= fk * win * (0.05 + 0.07 * g) * Math.exp(-((dd / 0.3) ** 2));
      z += fk * win * (0.08 + 0.1 * g) * smooth(-0.1, 0.7, dd) * Math.exp(-((Math.max(0, dd - 0.6) / 1.6) ** 2));
    }
    // nose
    z += nose(x, y, g);
    // philtrum (moves with the upper lip)
    {
      const hu = upH(X), top = N.sub - M.y;
      const w = smooth(hu - 0.05, hu + 0.25, s0) * (1 - smooth(top - 0.4, top + 0.05, s0));
      const xr = lerp(0.46, 0.3, clamp((s0 - hu) / Math.max(0.1, top - hu), 0, 1));
      z += w * (0.12 * Math.exp(-(((bx0 - xr) / 0.15) ** 2)) - 0.07 * Math.exp(-((x0 / 0.2) ** 2)));
    }
    // lips (move with the mouth)
    let lip = 0;
    if (ax < 1.25 && s0 > -2.2 && s0 < 2.2) {
      const hu = Math.max(upH(X), 0.04), hl = Math.max(loH(X), 0.04);
      const fall = Math.pow(Math.max(0, 1 - X * X), 0.7);
      const au = M.au * fall * (1 - 0.3 * g), al = M.al * Math.pow(Math.max(0, 1 - X * X), 0.85) * (1 - 0.22 * g);
      if (s0 > 0) { const t = s0 / hu; z += au * hump(t) + 0.06 * fall * Math.exp(-(((t - 1) / 0.09) ** 2)); lip = t < 1 ? 1 : 0; }
      else { const t = -s0 / hl; z += al * hump(t * 1.05); lip = t < 1 ? 1 : 0; }
      z -= 0.28 * Math.exp(-((s0 / 0.12) ** 2)) * Math.sqrt(Math.max(0, 1 - X * X * 0.9));
      z -= 0.2 * gauss(ax, s0, 1.0, 0.02, 0.12, 0.2);
      z -= 0.15 * g * Math.exp(-((s0 / 1.2) ** 2)) * fall;
      // the open mouth: the band goes back behind the teeth
      if (band > 0) z = lerp(z, M.inner, g * Math.pow(band, 0.6) * Math.min(1, op * 3));
    }
    info.band = band * (ax < 1 ? 1 : 0);
    info.lip = lip;
    // eye sockets
    z = eyeSocket(x, y, z);
    return out.set(x, y, z);
  }
  M.teethZ = base(0, M.y) - 0.45;
  M.inner = M.teethZ - 1.5;
  return { point, info, base, upH, loH, A, E, M, N, S };
}

// ── the face mesh: a grid over the front of the head, with a smile morph ──
function faceRows(S) {
  const G = S.grid, M = S.mouth;
  const dens = (y) => 1 + 1.6 * Math.exp(-(((y - M.y) / 1.3) ** 2)) + 2.6 * Math.exp(-(((y - S.eye.y) / 0.95) ** 2)) + 0.5 * Math.exp(-(((y - S.eye.y) / 2.2) ** 2)) + 0.7 * Math.exp(-(((y - S.nose.sub - 0.9) / 1.1) ** 2));
  const rows = spread(G.ny, G.y0, G.y1, dens).filter((y) => Math.abs(y - M.y) > 0.07);
  rows.push(...[-0.055, -0.035, -0.0175, 0, 0.0175, 0.035, 0.055].map((d) => M.y + d));
  return rows.sort((a, b) => a - b);
}
// columns are fractions of the head's half width, so the grid follows the outline
function faceCols(S) {
  const G = S.grid;
  return spread(G.nx, -G.s, G.s, (s) => 1 + 1.1 * Math.exp(-((s / 0.36) ** 2)) + 2.4 * Math.exp(-(((Math.abs(s) - 0.47) / 0.19) ** 2)) + 0.9 * smooth(0.8, 0.985, Math.abs(s)));
}

export function faceGeometry(S, sc, keepFn) {
  const rows = faceRows(S), cols = faceCols(S), P = S.paint;
  const nu = cols.length - 1, nv = rows.length - 1;
  const meta = [];
  const xAt = (i, j) => cols[i] * sc.A(rows[j]);
  const ok = (i, j) => keepFn(xAt(i, j), rows[j]);
  const geo = surface(nu, nv, (i, j, out) => {
    const x = xAt(i, j);
    sc.point(x, rows[j], 0, out);
    meta.push(sc.info.band, sc.info.lip, sc.info.nostril, sc.info.eye);
    return [(x + P.x) / (2 * P.x), (rows[j] - P.y0) / (P.y1 - P.y0)];
  }, { keep: keepFn ? (i, j) => ok(i, j) && ok(i + 1, j + 1) && ok(i + 1, j) && ok(i, j + 1) : null });
  // smile target
  const g = surface(nu, nv, (i, j, out) => { sc.point(xAt(i, j), rows[j], 1, out); }, {});
  g.setIndex(geo.index);
  g.computeVertexNormals();
  geo.morphAttributes.position = [g.attributes.position];
  geo.morphAttributes.normal = [g.attributes.normal];
  // ambient occlusion from the height field, plus the dark inside of the mouth and nostrils
  const n = (nu + 1) * (nv + 1), pos = geo.attributes.position, col = new Float32Array(n * 3);
  const zAt = (i, j) => pos.getZ(clamp(j, 0, nv) * (nu + 1) + clamp(i, 0, nu));
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]];
  for (let j = 0; j <= nv; j++) {
    for (let i = 0; i <= nu; i++) {
      const k = j * (nu + 1) + i, z0 = pos.getZ(k), x0 = pos.getX(k), y0 = pos.getY(k);
      let occ = 0;
      for (const [di, dj] of dirs) {
        let best = 0;
        for (const st of [2, 4, 7, 11]) {
          const ii = clamp(i + di * st, 0, nu), jj = clamp(j + dj * st, 0, nv), kk = jj * (nu + 1) + ii;
          const dist = Math.hypot(pos.getX(kk) - x0, pos.getY(kk) - y0) + 1e-4;
          best = Math.max(best, (zAt(ii, jj) - z0) / dist);
        }
        occ += Math.atan(Math.max(0, best)) / (PI / 2);
      }
      let ao = 1 - 0.45 * (occ / dirs.length);
      const [band, , nos, eye] = [meta[k * 4], meta[k * 4 + 1], meta[k * 4 + 2], meta[k * 4 + 3]];
      let r = ao, gg = ao, b = ao;
      if (band > 0) { const m = smooth(0, 0.6, band); r = lerp(r, 0.42, m); gg = lerp(gg, 0.13, m); b = lerp(b, 0.14, m); }
      if (eye > 0) { r = lerp(r, 0.6, eye); gg = lerp(gg, 0.33, eye); b = lerp(b, 0.33, eye); }
      if (nos > 0.15) { const m = smooth(0.15, 0.8, nos); r = lerp(r, 0.35, m); gg = lerp(gg, 0.18, m); b = lerp(b, 0.16, m); }
      col[k * 3] = r; col[k * 3 + 1] = gg; col[k * 3 + 2] = b;
    }
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.userData.cols = cols;
  geo.userData.rows = rows;
  return geo;
}

// ── painted skin ──
function smoothPath(g, pts, closed = false) {
  const n = pts.length;
  g.moveTo(pts[0][0], pts[0][1]);
  for (let i = 0; i < (closed ? n : n - 1); i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    const a = closed || i > 0 ? p0 : p1, d = closed || i < n - 2 ? p3 : p2;
    g.bezierCurveTo(p1[0] + (p2[0] - a[0]) / 6, p1[1] + (p2[1] - a[1]) / 6, p2[0] - (d[0] - p1[0]) / 6, p2[1] - (d[1] - p1[1]) / 6, p2[0], p2[1]);
  }
}
export function paintSkin(S, sc, { size = 1024, hairline = null } = {}) {
  const P = S.paint, W = size, H = size;
  const cv = canvas(W, H), g = cv.getContext('2d');
  const X = (x) => ((x + P.x) / (2 * P.x)) * W, Y = (y) => (1 - (y - P.y0) / (P.y1 - P.y0)) * H;
  const L = (r) => (r / (2 * P.x)) * W;
  const spot = (x, y, r, rgb, a, sx = 1, sy = 1, rot = 0, op = 'source-over') => {
    g.save();
    g.globalCompositeOperation = op;
    g.translate(X(x), Y(y));
    g.rotate(rot);
    g.scale(sx, sy);
    const grd = g.createRadialGradient(0, 0, 0, 0, 0, L(r));
    grd.addColorStop(0, `rgba(${rgb},${a})`);
    grd.addColorStop(1, `rgba(${rgb},0)`);
    g.fillStyle = grd;
    g.beginPath();
    g.arc(0, 0, L(r), 0, TAU);
    g.fill();
    g.restore();
  };
  const both = (fn) => { fn(1); fn(-1); };
  const E = S.eye, M = S.mouth, r = rng(21);
  g.fillStyle = S.skin;
  g.fillRect(0, 0, W, H);
  // gentle mottling
  for (let k = 0; k < 260; k++) {
    const x = (r() * 2 - 1) * P.x, y = lerp(P.y0, P.y1, r());
    spot(x, y, 0.4 + r() * 1.4, r() < 0.5 ? '232,170,150' : '255,236,224', 0.05 + r() * 0.05);
  }
  // warmth: cheeks, nose, chin; cooler forehead; a little shadow round the eyes
  both((s) => spot(3.9 * s, -2.3, 3.2, '236,156,140', 0.07, 1.1, 0.95));
  both((s) => spot(4.7 * s, -1.3, 2.0, '226,156,136', 0.05));
  spot(0, -3.0, 0.6, '232,146,134', 0.08, 1.1, 0.9);
  both((s) => spot(0.78 * s, -1.6, 0.5, '190,130,118', 0.09, 0.7, 2.6));
  both((s) => spot(0.95 * s, -3.4, 0.45, '190,120,110', 0.1, 1, 1));
  spot(0, S.chin[0], 1.5, '226,150,135', 0.12, 1.2, 0.8);
  spot(0, 4.5, 3.5, '255,240,226', 0.18, 1.4, 0.8);
  both((s) => spot((E.x + 0.1) * s, E.y + 0.2, 1.7, '150,96,96', 0.07, 1.25, 0.8));
  both((s) => spot((E.x - 0.9) * s, E.y - 0.75, 0.9, '140,90,100', 0.025, 1.3, 0.6));
  both((s) => spot((E.x + 0.2) * s, E.y + 1.0, 1.35, '150,98,94', 0.22, 1.4, 0.6));
  both((s) => spot((E.x - 1.55) * s, E.y + 0.1, 0.75, '140,92,88', 0.14, 0.7, 1.3));
  // the upper-lid crease: a soft line following the top of the eye
  g.save();
  g.filter = `blur(${(W / 1024) * 2.2}px)`;
  g.lineWidth = (W / 1024) * 3.2;
  g.strokeStyle = 'rgba(120,72,70,0.3)';
  both((s) => {
    g.beginPath();
    for (let k = 0; k <= 24; k++) {
      const u = lerp(-1, 1, k / 24), x = E.x + 0.1 + u * E.r * 1.02, y = E.y + E.r * 0.9 * Math.pow(Math.max(0, 1 - u * u), 0.6) + 0.1 * u;
      if (k) g.lineTo(X(x * s), Y(y)); else g.moveTo(X(x * s), Y(y));
    }
    g.stroke();
  });
  g.restore();
  both((s) => spot((E.x - 1.5) * s, E.y + 0.4, 0.7, '150,100,96', 0.1, 0.8, 1.2));
  // soft highlights: cupid's bow and brow bone
  spot(0, M.y + 0.95, 0.35, '255,244,236', 0.2, 1.6, 0.6);
  both((s) => spot(3.4 * s, S.brow.y - 0.6, 1.0, '255,242,232', 0.1, 1.6, 0.5));
  // under-chin and edges of the face a touch deeper
  spot(0, -11.5, 2.5, '170,110,96', 0.18, 2.2, 0.8);

  // lips: natural rosy colour with soft fine lines, fuller centre
  const hu = sc.upH, hl = sc.loH;
  const lipTop = [], lipBot = [];
  for (let k = 0; k <= 40; k++) {
    const Xn = lerp(-1, 1, k / 40);
    lipTop.push([X(Xn * M.w), Y(M.y + hu(Xn) + M.seam * Math.min(Xn * Xn, 1.4))]);
    lipBot.push([X(Xn * M.w), Y(M.y - hl(Xn) + M.seam * Math.min(Xn * Xn, 1.4))]);
  }
  const lh = parseInt(S.lip.slice(1), 16), lr = lh >> 16, lg = (lh >> 8) & 255, lb = lh & 255;
  g.save();
  g.filter = `blur(${(W / 1024) * 2.6}px)`;
  g.fillStyle = `rgb(${lr},${lg},${lb})`;
  g.beginPath();
  g.moveTo(...lipTop[0]);
  lipTop.forEach((pt) => g.lineTo(...pt));
  lipBot.slice().reverse().forEach((pt) => g.lineTo(...pt));
  g.closePath();
  g.fill();
  g.restore();
  // lower lip a touch lighter and fuller in the centre, darker towards the corners
  spot(0, M.y - 0.45, 0.7, `${Math.min(255, lr + 30)},${lg + 26},${lb + 26}`, 0.5, 1.8, 0.55);
  spot(0, M.y + 0.4, 0.5, `${Math.min(255, lr + 18)},${lg + 14},${lb + 16}`, 0.35, 1.8, 0.5);
  both((s) => spot(M.w * 0.92 * s, M.y + 0.08, 0.35, '120,60,62', 0.45));
  g.save();
  g.beginPath();
  g.moveTo(...lipTop[0]);
  lipTop.forEach((pt) => g.lineTo(...pt));
  lipBot.slice().reverse().forEach((pt) => g.lineTo(...pt));
  g.closePath();
  g.clip();
  g.lineWidth = W / 1024;
  for (let k = 0; k < 120; k++) {
    const xx = (r() * 2 - 1) * M.w * 0.9, up = r() < 0.5;
    const Xn = xx / M.w, y0 = M.y + (up ? 0.05 : -0.05), y1 = up ? M.y + hu(Xn) * (0.6 + 0.4 * r()) : M.y - hl(Xn) * (0.6 + 0.4 * r());
    g.strokeStyle = `rgba(110,40,50,${0.05 + r() * 0.08})`;
    g.beginPath();
    g.moveTo(X(xx), Y(y0));
    g.quadraticCurveTo(X(xx * 1.03), Y((y0 + y1) / 2), X(xx * 1.06), Y(y1));
    g.stroke();
  }
  g.restore();
  // the line where the lips meet
  g.save();
  g.filter = `blur(${(W / 1024) * 0.9}px)`;
  g.strokeStyle = 'rgba(110,44,52,0.5)';
  g.lineWidth = (W / 1024) * 2.4;
  g.beginPath();
  for (let k = 0; k <= 40; k++) {
    const Xn = lerp(-1.02, 1.02, k / 40);
    const pt = [X(Xn * M.w), Y(M.y + M.seam * Math.min(Xn * Xn, 1.4))];
    if (k) g.lineTo(...pt); else g.moveTo(...pt);
  }
  g.stroke();
  g.restore();
  // nostrils
  both((s) => spot(S.nose.nostril[0] * s, S.nose.nostril[1], 0.3, '96,46,40', 0.65, 1.2, 0.55));

  // brows: soft fill and hair strokes, pointing up at the start and sideways after
  if (S.brows) {
    const by = S.brow.y, bx0 = S.brow.x0, ba = S.browAlpha ?? 1;
    const line = [[bx0, by - 0.3], [bx0 + 0.8, by + 0.02], [bx0 + 1.9, by + 0.36], [bx0 + 2.85, by + 0.52], [bx0 + 3.7, by + 0.25], [bx0 + 4.2, by - 0.18]];
    const thick = [0.38, 0.38, 0.34, 0.27, 0.15, 0.04];
    const seg = (t) => { const f = t * (line.length - 1), i = Math.min(line.length - 2, Math.floor(f)), u = f - i; return [lerp(line[i][0], line[i + 1][0], u), lerp(line[i][1], line[i + 1][1], u), lerp(thick[i], thick[i + 1], u), Math.atan2(line[i + 1][1] - line[i][1], line[i + 1][0] - line[i][0])]; };
    both((s) => {
      const up = [], dn = [];
      for (let k = 0; k <= 30; k++) { const [x, y, th, ang] = seg(k / 30); up.push([X(s * (x - Math.sin(ang) * th / 2)), Y(y + Math.cos(ang) * th / 2)]); dn.push([X(s * (x + Math.sin(ang) * th / 2)), Y(y - Math.cos(ang) * th / 2)]); }
      g.save();
      g.filter = `blur(${(W / 1024) * 3}px)`;
      g.fillStyle = `rgba(80,52,38,${0.2 * ba})`;
      g.beginPath();
      smoothPath(g, [...up, ...dn.reverse()], true);
      g.fill();
      g.filter = `blur(${(W / 1024) * 0.35}px)`;
      g.lineCap = 'round';
      for (let k = 0; k < 380; k++) {
        const t = Math.pow(r(), 0.85) * 0.98, [x, y, th, ang] = seg(t);
        const off = (r() - 0.5) * th * 0.95;
        const a = t < 0.2 ? lerp(1.35, 0.6, t / 0.2) : ang + 0.18 + (r() - 0.5) * 0.25;
        const len = (0.32 + r() * 0.28) * (t < 0.2 ? 0.8 : 1);
        const x1 = x - Math.sin(ang) * off, y1 = y + Math.cos(ang) * off;
        const c = 18 + r() * 26;
        g.strokeStyle = `rgba(${c + 22},${c * 0.7 + 8},${c * 0.5 + 4},${(0.18 + r() * 0.34) * ba})`;
        g.lineWidth = (W / 1024) * (0.9 + r() * 0.9);
        g.beginPath();
        g.moveTo(X(s * x1), Y(y1));
        g.quadraticCurveTo(X(s * (x1 + Math.cos(a) * len * 0.6)), Y(y1 + Math.sin(a) * len * 0.6 + 0.04), X(s * (x1 + Math.cos(a) * len)), Y(y1 + Math.sin(a) * len - 0.02));
        g.stroke();
      }
      g.restore();
    });
  }
  // hair just under the scarf edge, or the child's hairline
  if (hairline) hairline(g, X, Y, L);
  return cv;
}
export function paintRough(S, sc) {
  const P = S.paint, W = 256, cv = canvas(W), g = cv.getContext('2d');
  const X = (x) => ((x + P.x) / (2 * P.x)) * W, Y = (y) => (1 - (y - P.y0) / (P.y1 - P.y0)) * W, L = (r) => (r / (2 * P.x)) * W;
  g.fillStyle = 'rgb(255,255,255)';
  g.fillRect(0, 0, W, W);
  const spot = (x, y, r, v, sx = 1, sy = 1) => {
    g.save(); g.translate(X(x), Y(y)); g.scale(sx, sy);
    const grd = g.createRadialGradient(0, 0, 0, 0, 0, L(r));
    grd.addColorStop(0, `rgba(${v},${v},${v},1)`); grd.addColorStop(1, `rgba(${v},${v},${v},0)`);
    g.fillStyle = grd; g.beginPath(); g.arc(0, 0, L(r), 0, TAU); g.fill(); g.restore();
  };
  spot(0, 4.5, 3.6, 200, 1.4, 0.8);
  spot(0, -1.8, 1.4, 238, 0.7, 1.8);
  spot(0, -3.1, 0.9, 222);
  spot(0, S.chin[0], 1.3, 215);
  spot(0, S.mouth.y, 1.0, 120, S.mouth.w * 0.95, 0.75);
  spot(0, S.mouth.y, 0.9, 110, S.mouth.w * 0.8, 0.6);
  return tex(cv, { srgb: false });
}

// ── eyes ──
function eyeTexture(iris = ['#2e1b10', '#5a3720', '#7a4c28', '#a0703c']) {
  const S = 512, cv = canvas(S), g = cv.getContext('2d'), c = S / 2, r = rng(4);
  const R = (deg) => (deg / 100) * c;
  // sclera: soft white, warmer and greyer towards the corners, a few faint vessels
  const sg = g.createRadialGradient(c, c, R(25), c, c, R(100));
  sg.addColorStop(0, '#e6ddd6'); sg.addColorStop(0.45, '#dccec7'); sg.addColorStop(1, '#bc9a92');
  g.fillStyle = sg; g.fillRect(0, 0, S, S);
  for (let k = 0; k < 16; k++) {
    const a = r() * TAU;
    let rr = R(95), x = c + Math.cos(a) * rr, y = c + Math.sin(a) * rr;
    g.strokeStyle = `rgba(190,70,70,${0.12 + r() * 0.15})`;
    g.lineWidth = 0.6 + r() * 0.8;
    g.beginPath(); g.moveTo(x, y);
    let aa = a;
    while (rr > R(42 + r() * 12)) { rr -= 6; aa += (r() - 0.5) * 0.35; x = c + Math.cos(aa) * rr; y = c + Math.sin(aa) * rr; g.lineTo(x, y); }
    g.stroke();
  }
  // limbal shadow
  const lg = g.createRadialGradient(c, c, R(26), c, c, R(36));
  lg.addColorStop(0, 'rgba(60,40,36,0.75)'); lg.addColorStop(1, 'rgba(60,40,36,0)');
  g.fillStyle = lg; g.beginPath(); g.arc(c, c, R(36), 0, TAU); g.fill();
  // iris
  const ig = g.createRadialGradient(c, c, R(8), c, c, R(29));
  ig.addColorStop(0, iris[0]); ig.addColorStop(0.18, iris[1]); ig.addColorStop(0.32, iris[3]); ig.addColorStop(0.45, iris[2]); ig.addColorStop(0.8, iris[1]); ig.addColorStop(0.93, iris[0]); ig.addColorStop(1, '#1c120c');
  g.fillStyle = ig; g.beginPath(); g.arc(c, c, R(29), 0, TAU); g.fill();
  for (let k = 0; k < 420; k++) {
    const a = r() * TAU, r0 = R(9 + r() * 6), r1 = R(18 + r() * 11);
    g.strokeStyle = r() < 0.45 ? `rgba(200,150,90,${0.12 + r() * 0.2})` : `rgba(20,10,6,${0.1 + r() * 0.25})`;
    g.lineWidth = 0.5 + r() * 1.1;
    g.beginPath(); g.moveTo(c + Math.cos(a) * r0, c + Math.sin(a) * r0);
    const a2 = a + (r() - 0.5) * 0.12;
    g.lineTo(c + Math.cos(a2) * r1, c + Math.sin(a2) * r1); g.stroke();
  }
  for (let k = 0; k < 26; k++) {
    const a = r() * TAU, rr = R(13 + r() * 9);
    g.fillStyle = `rgba(20,10,6,${0.2 + r() * 0.25})`;
    g.beginPath(); g.ellipse(c + Math.cos(a) * rr, c + Math.sin(a) * rr, 2 + r() * 3, 1 + r() * 1.5, a, 0, TAU); g.fill();
  }
  // light caught inside the iris, opposite the key light
  const cg = g.createRadialGradient(c - R(12), c + R(10), 0, c - R(12), c + R(10), R(16));
  cg.addColorStop(0, 'rgba(230,170,100,0.45)'); cg.addColorStop(1, 'rgba(230,170,100,0)');
  g.fillStyle = cg; g.beginPath(); g.arc(c, c, R(27), 0, TAU); g.fill();
  // pupil
  const pg = g.createRadialGradient(c, c, R(8), c, c, R(10.5));
  pg.addColorStop(0, '#040302'); pg.addColorStop(1, 'rgba(4,3,2,0)');
  g.fillStyle = pg; g.beginPath(); g.arc(c, c, R(10.5), 0, TAU); g.fill();
  return tex(cv);
}

function eyeballGeometry(R) {
  const geo = surface(48, 40, (i, j, out) => {
    const psi = (i / 48) * TAU, gam = (j / 40) * PI;
    const gd = (gam * 180) / PI;
    const bulge = gd < 34 ? 0.11 * (1 - (gd / 34) ** 2) ** 2 : 0;
    const rr = R + bulge * (R / 1.2);
    out.set(Math.sin(gam) * Math.cos(psi) * rr, Math.sin(gam) * Math.sin(psi) * rr, Math.cos(gam) * rr);
    const k = Math.min(gd / 100, 1) * 0.5;
    return [0.5 + Math.cos(psi) * k, 0.5 + Math.sin(psi) * k];
  }, { wrap: true, flip: true });
  weldRow(geo, 0, new THREE.Vector3(0, 0, 1));
  return geo;
}

// The moving lids: a rolled margin carrying the lashes, and a short sheet behind it. When the eye
// is open the sheet hides under the face's own lids; when it closes it slides over the eyeball.
function makeLids(E, side, skinMatV, occMat, lashMat, faceUV) {
  const R = E.r, Rl = R + LID.rl, NA = 40, rimN = 5, upN = 7;
  const rows = rimN + upN + 1;
  const sph = (r, lat, az, out) => out.set(r * Math.cos(lat) * Math.sin(az), r * Math.sin(lat), r * Math.cos(lat) * Math.cos(az));
  const az = (a) => lerp(LID.azIn, LID.azOut, (a + 1) / 2);
  const geos = {};
  const mk = (name, nRows, mat, opts = {}) => {
    const n = (NA + 1) * nRows;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    if (opts.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2));
    if (opts.color) g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * opts.color), opts.color));
    const idx = [];
    for (let j = 0; j < nRows - 1; j++) for (let i = 0; i < NA; i++) {
      const a = j * (NA + 1) + i, b = a + 1, c = a + NA + 1, d = c + 1;
      if (opts.flip) idx.push(a, d, b, a, c, d); else idx.push(a, b, d, a, d, c);
    }
    g.setIndex(idx);
    geos[name] = g;
    const m = new THREE.Mesh(g, mat);
    m.frustumCulled = false;
    m.castShadow = false;
    m.receiveShadow = !!opts.shadow;
    if (opts.order) m.renderOrder = opts.order;
    return m;
  };
  const group = new THREE.Group();
  group.add(mk('upper', rows, skinMatV, { uv: true, color: 3, shadow: true, flip: side < 0 }));
  group.add(mk('lower', rows, skinMatV, { uv: true, color: 3, shadow: true, flip: side > 0 }));
  group.add(mk('occU', 4, occMat, { color: 4, order: 2, flip: side < 0 }));
  group.add(mk('occL', 3, occMat, { color: 4, order: 2, flip: side > 0 }));
  group.add(mk('lash', 4, lashMat, { uv: true, order: 3 }));
  const v = new THREE.Vector3(), cpt = new THREE.Vector3(), nrm = new THREE.Vector3(), tdir = new THREE.Vector3(), w = new THREE.Vector3();
  const tmp = new THREE.Vector3();
  const corneaR = (dirLocal, q) => {
    const w = tmp.copy(dirLocal).applyQuaternion(q);
    const gd = Math.acos(clamp(w.z, -1, 1)) / DEG;
    return R + (gd < 34 ? 0.11 * (1 - (gd / 34) ** 2) ** 2 : 0);
  };
  const qInv = new THREE.Quaternion();
  function build(st, gazeQ) {
    qInv.copy(gazeQ).invert();
    for (const which of ['upper', 'lower']) {
      const up = which === 'upper', g = geos[which], P = g.attributes.position, C = g.attributes.color, U = g.attributes.uv;
      const sgn = up ? 1 : -1;
      for (let i = 0; i <= NA; i++) {
        const a = lerp(-1, 1, i / NA), A = az(a);
        const [mu, ml] = lidMargins(a, st), [fu, fl] = lidMargins(a);
        const lat0 = up ? mu : ml;
        const cornerFade = 1 - Math.abs(a) ** 6;
        const rIn = R + (up ? 0.1 : 0.15), rOut = R + LID.rl + 0.022 * (0.5 + 0.5 * cornerFade), rc = (rIn + rOut) / 2, rho = (rOut - rIn) / 2;
        const latC = lat0 + sgn * 0.068;
        // the sheet reaches a little past where the face's own lid begins
        let far = (up ? fu : fl) + sgn * 0.16;
        if ((far - latC) * sgn < 0.04) far = latC + sgn * 0.04;
        for (let j = 0; j < rows; j++) {
          const k = j * (NA + 1) + i;
          let cr = 1, cg = 1, cb = 1;
          if (j <= rimN) {
            // rolled rim: inside edge → tip → outside edge
            const b = (j / rimN) * PI;
            sph(rc, latC, A, cpt);
            nrm.copy(cpt).normalize();
            tdir.set(-Math.sin(latC) * Math.sin(A), Math.cos(latC), -Math.sin(latC) * Math.cos(A)).multiplyScalar(-sgn);
            v.copy(cpt).addScaledVector(nrm, -Math.cos(b) * rho).addScaledVector(tdir, Math.sin(b) * 0.068 * rc);
            if (j <= 1) { cr = 0.84; cg = 0.5; cb = 0.5; }
            else if (j <= 3) { const d = up ? 0.42 : 0.62; cr = d; cg = d * 0.78; cb = d * 0.76; }
            else if (up) { cr = 0.8; cg = 0.68; cb = 0.65; }
          } else {
            const t = (j - rimN) / upN;
            sph(Rl - 0.012 - 0.03 * t * t, lerp(latC, far, t), A, v);
            const sh = 1 - (up ? 0.12 : 0.06) * Math.exp(-((t / 0.3) ** 2));
            cr = sh; cg = sh * 0.97; cb = sh * 0.96;
          }
          v.x *= side;
          P.setXYZ(k, v.x, v.y, v.z);
          const fuv = faceUV(v);
          U.setXY(k, fuv[0], fuv[1]);
          C.setXYZ(k, cr, cg, cb);
        }
      }
      P.needsUpdate = true;
      U.needsUpdate = true;
      C.needsUpdate = true;
      g.computeVertexNormals();
    }
    // soft shadow the lids cast on the eyeball, and lashes
    for (const which of ['occU', 'occL']) {
      const up = which === 'occU', g = geos[which], P = g.attributes.position, C = g.attributes.color;
      const nr = up ? 4 : 3, sgn = up ? 1 : -1;
      for (let i = 0; i <= NA; i++) {
        const a = lerp(-1, 1, i / NA), A = az(a);
        const [mu, ml] = lidMargins(a, st);
        const lat0 = (up ? mu : ml) + sgn * 1.5 * DEG;
        for (let j = 0; j < nr; j++) {
          const k = j * (NA + 1) + i;
          const lat = lat0 - sgn * [0, 3.5, 9, 16][j] * DEG;
          sph(1, lat, A, w);
          w.x *= side;
          const rr = corneaR(w, qInv) + 0.012;
          P.setXYZ(k, w.x * rr, w.y * rr, w.z * rr);
          const edge = 0.55 + 0.45 * Math.abs(a) ** 2;
          C.setXYZ(k, 1, 1, 1);
          C.setW(k, (up ? [0.75, 0.42, 0.16, 0] : [0.5, 0.2, 0])[j] * edge);
        }
      }
      P.needsUpdate = true;
      C.needsUpdate = true;
    }
    for (const which of ['lash']) {
      const up = which === 'lash', g = geos[which], P = g.attributes.position, U = g.attributes.uv;
      const nr = up ? 4 : 3, sgn = up ? 1 : -1;
      for (let i = 0; i <= NA; i++) {
        const a = lerp(-1, 1, i / NA), A = az(a);
        const [mu, ml] = lidMargins(a, st);
        const lat0 = up ? mu : ml;
        sph(Rl - 0.02, lat0 + sgn * 0.015, A, cpt);
        nrm.copy(cpt).normalize();
        // outward and away from the lid, then curling
        const len = up ? (0.15 + 0.28 * smooth(-0.85, 0.55, a) * (1 - 0.3 * smooth(0.75, 1, a))) * (1 - 0.25 * st.blink) : 0.05 + 0.07 * smooth(-0.5, 0.8, a);
        const curlUp = up ? lerp(1.45, 0.4, st.blink) : -0.5;
        for (let j = 0; j < nr; j++) {
          const k = j * (NA + 1) + i, t = j / (nr - 1);
          v.copy(cpt).addScaledVector(nrm, len * t * (up ? 0.85 : 0.7));
          v.y += up ? len * (curlUp * t * t - 0.12 * t) : -len * (0.3 * t + 0.25 * t * t);
          v.x += Math.sin(A) * len * 0.3 * t * t;
          v.x *= side;
          P.setXYZ(k, v.x, v.y, v.z);
          U.setXY(k, i / NA, t);
        }
      }
      P.needsUpdate = true;
      U.needsUpdate = true;
    }
  }
  return { group, build };
}

// lashes painted as tapered hairs gathered in soft clumps
function lashTexture(count = 220, len = [0.6, 1], alpha = 1) {
  const W = 1024, H = 128, cv = canvas(W, H), g = cv.getContext('2d'), r = rng(9 + count);
  g.lineCap = 'round';
  const clumps = Math.round(count / 4);
  for (let c = 0; c < clumps; c++) {
    const cx = ((c + 0.5) / clumps) * W + (r() - 0.5) * 8, l = H * lerp(len[0], len[1], r());
    const lean = (r() - 0.5) * 14 + (cx / W - 0.5) * 26, tipX = cx + lean;
    const n = 3 + Math.floor(r() * 3);
    for (let k = 0; k < n; k++) {
      const x0 = cx + (k - (n - 1) / 2) * (2.2 + r() * 2), ll = l * (0.8 + r() * 0.2);
      const x1 = lerp(x0, tipX, 0.85) + (r() - 0.5) * 3;
      for (let sgm = 0; sgm < 6; sgm++) {
        const t0 = sgm / 6, t1 = (sgm + 1) / 6;
        const px = (t) => lerp(x0, x1, t) + Math.sin(t * PI) * lean * 0.12, py = (t) => H - ll * t;
        g.strokeStyle = `rgba(18,11,8,${alpha * (1 - t0 * 0.55)})`;
        g.lineWidth = lerp(2.6, 0.5, t0);
        g.beginPath();
        g.moveTo(px(t0), py(t0));
        g.lineTo(px(t1), py(t1));
        g.stroke();
      }
    }
  }
  return tex(cv);
}

function teethGeometry(M, inner) {
  const parts = [], q = new THREE.Quaternion(), m4 = new THREE.Matrix4(), sc = new THREE.Vector3(), ps = new THREE.Vector3();
  const tooth = (x, w, h, t, top, z0, k, up) => {
    const g = new THREE.SphereGeometry(1, 14, 10);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      let px = p.getX(i), py = p.getY(i), pz = p.getZ(i);
      // squarer crown with a flat front and a thin biting edge
      px = Math.sign(px) * Math.pow(Math.abs(px), 0.5);
      const edge = up ? smooth(0.2, -1, py) : smooth(-0.2, 1, py);
      pz = Math.sign(pz) * Math.pow(Math.abs(pz), 0.85) * (pz > 0 ? 1 : 0.7) * (1 - 0.55 * edge);
      p.setXYZ(i, (px * w * 1.07) / 2, (py * h) / 2, (pz * t) / 2);
    }
    const z = z0 - k * x * x, ang = Math.atan(2 * k * x);
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), ang);
    m4.compose(ps.set(x, top + (up ? h / 2 : -h / 2), z - t / 2), q, sc.set(1, 1, 1));
    g.applyMatrix4(m4);
    g.deleteAttribute('uv');
    parts.push(g);
  };
  const upper = [[0.42, 0.84, 1.0], [1.2, 0.66, 0.86], [1.86, 0.72, 0.92], [2.42, 0.66, 0.78], [2.95, 0.66, 0.72]];
  for (const [x, w, h] of upper) for (const s of [-1, 1]) tooth(s * x * (M.w / 2.35), w * (M.w / 2.35), h, 0.62, M.y - 0.12, M.teethZ ?? 8.95, 0.2, true);
  const lower = [[0.3, 0.56, 0.75], [0.84, 0.56, 0.75], [1.4, 0.62, 0.8], [1.98, 0.64, 0.7], [2.5, 0.66, 0.66]];
  for (const [x, w, h] of lower) for (const s of [-1, 1]) tooth(s * x * (M.w / 2.35), w * (M.w / 2.35), h, 0.55, M.y - 0.34, (M.teethZ ?? 8.95) - 0.32, 0.22, false);
  const geo = merge(parts);
  geo.computeVertexNormals();
  return geo;
}

// ── the whole head: face, eyes, mouth and expressions ──
export function buildHead(parent, S, { hairline, keep, faceMaterialOpts = {} } = {}) {
  const sc = sculptor(S);
  const E = S.eye;
  const group = new THREE.Group();
  parent.add(group);
  const faceGeo = faceGeometry(S, sc, keep);
  const skinTex = tex(paintSkin(S, sc, { hairline }));
  const skinOpts = { map: skinTex, roughnessMap: paintRough(S, sc), normalMap: poreMap([5, 7]), ...faceMaterialOpts };
  const faceMat = skinMaterial({ ...skinOpts, vertexColors: true, roughness: 0.62 });
  faceMat.normalScale.set(0.22, 0.22);
  faceMat.emissive = new THREE.Color(0xff5577);
  faceMat.emissiveIntensity = 0;
  const face = new THREE.Mesh(faceGeo, faceMat);
  face.morphTargetInfluences = [0];
  face.receiveShadow = true;
  face.castShadow = true;
  group.add(face);

  // eyes
  const eyeTex = eyeTexture(S.iris);
  const eyeMat = new THREE.MeshPhysicalMaterial({ map: eyeTex, roughness: 0.42, clearcoat: 1, clearcoatRoughness: 0.03, specularIntensity: 0.25 });
  const occMat = new THREE.MeshBasicMaterial({ color: 0x2a140c, transparent: true, vertexColors: true, depthWrite: false, side: THREE.DoubleSide });
  const lashMat = new THREE.MeshStandardMaterial({ color: 0x1a110c, map: lashTexture(380, [0.5, 1], 0.9), alphaTest: 0.38, side: THREE.DoubleSide, roughness: 0.6 });
  const P = S.paint;
  const ballGeo = eyeballGeometry(E.r);
  const eyes = [];
  for (const side of [-1, 1]) {
    const socket = new THREE.Group();
    socket.position.set(E.x * side, E.y, E.z);
    group.add(socket);
    const look = new THREE.Group();
    socket.add(look);
    const ball = new THREE.Mesh(ballGeo, eyeMat);
    look.add(ball);
    const faceUV = (v) => { const wx = E.x * side + v.x, wy = E.y + v.y; return [(wx + P.x) / (2 * P.x), (wy - P.y0) / (P.y1 - P.y0)]; };
    const lids = makeLids(E, side, faceMat, occMat, lashMat, faceUV);
    socket.add(lids.group);
    // pink corner of the eye
    const car = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), new THREE.MeshPhysicalMaterial({ color: 0xdca39b, roughness: 0.4, clearcoat: 0.35 }));
    car.scale.set(0.11, 0.1, 0.08);
    car.position.set(-1.2 * side, -0.06, 0.2);
    socket.add(car);
    eyes.push({ side, socket, look, lids, st: { blink: -1, squint: -1, gaze: -1 } });
  }

  // teeth inside the mouth
  const teeth = new THREE.Mesh(teethGeometry(S.mouth, S.inner), new THREE.MeshPhysicalMaterial({ color: 0xf3ede2, roughness: 0.28, clearcoat: 0.6, clearcoatRoughness: 0.15, sheen: 0.2, sheenColor: new THREE.Color(0xffffff) }));
  group.add(teeth);

  const W = { grin: 0, squint: 0, shut: 0 }, goal = { grin: 0, squint: 0, shut: 0 };
  let expression = 'smile';
  const q = new THREE.Quaternion(), eul = new THREE.Euler();
  return {
    group, face, sc, eyes,
    setExpression(name) {
      expression = name;
      goal.grin = name === 'smile' ? 0 : 1;
      goal.squint = name === 'happy' ? 1 : name === 'grin' ? 0.35 : 0;
      goal.shut = name === 'happy' ? 0.62 : 0;
    },
    get expression() { return expression; },
    update(dt, { open = [1, 1], lookX = 0, lookY = 0, blush = 0 } = {}) {
      for (const k in W) W[k] = damp(W[k], goal[k], 11, dt);
      face.morphTargetInfluences[0] = W.grin;
      faceMat.emissiveIntensity = blush * 0.12;
      eyes.forEach((e, i) => {
        const yaw = clamp(lookX, -1, 1) * 0.36 - e.side * 0.035, pitch = -clamp(lookY, -1, 1) * 0.2;
        e.look.rotation.set(pitch, yaw, 0);
        const blink = clamp(1 - open[i] * (1 - W.shut), 0, 1);
        const st = { blink, squint: W.squint, gaze: -pitch };
        const o = e.st;
        if (Math.abs(o.blink - st.blink) + Math.abs(o.squint - st.squint) + Math.abs(o.gaze - st.gaze) + Math.abs((o.yaw ?? 9) - yaw) > 0.002) {
          e.look.updateMatrix();
          q.setFromEuler(eul.set(pitch, yaw, 0));
          e.lids.build(st, q);
          Object.assign(o, st, { yaw });
        }
      });
    },
  };
}

// ── the face opening of the hijab, as a closed curve round the face ──
export const OPENING = { cy: -1.8, r: [[-90, 8.3], [-73, 8.05], [-57.7, 7.62], [-39.4, 7.1], [-17.5, 6.45], [7, 6.6], [30.5, 7.7], [46.4, 8.4], [59.5, 9.0], [70.6, 9.05], [82, 9.15], [90, 9.45]] };
export function opening(O = OPENING, grow = 0) {
  const R = spline(O.r);
  const ang = (x, y) => (Math.atan2(y - O.cy, Math.abs(x)) * 180) / PI;
  return {
    inside: (x, y) => Math.hypot(x, y - O.cy) < R(ang(x, y)) + grow,
    edge: (x, y) => { const r = R(ang(x, y)) + grow, d = Math.hypot(x, y - O.cy) || 1; return [(x / d) * r, O.cy + ((y - O.cy) / d) * r]; },
    at: (deg, side = 1) => { const r = R(deg) + grow, a = (deg * PI) / 180; return [side * Math.cos(a) * r, O.cy + Math.sin(a) * r]; },
  };
}
const faceZof = (sc) => (x, y) => sc.base(x, y) + 0.32 * gauss(Math.abs(x), y, 4.4, -1.4, 1.75, 1.1);

// ── the hijab: snug over the head, folding in to the face, falling over neck, shoulders and chest ──
// Built as one profile per angle round the head (cm, around the head centre), then skinned.
export function hijabGeometry(sc, { torso, O, k, B, NC = 128, NR = 104, hemFn }) {
  const open = opening(), faceZ = faceZof(sc);
  const ell = (th, y) => {
    const t = (y - 0.4) / 10.55;
    const s = t > 0 ? Math.pow(Math.max(0, 1 - Math.pow(t, 2.3)), 1 / 2.3) : Math.sqrt(Math.max(0, 1 - t * t));
    if (s <= 0) return 0;
    const sn = Math.sin(th), cs = Math.cos(th), A = 7.45 * s, C = (cs > 0 ? 9.3 : 10.3) * s;
    const a = (sn / A) ** 2 + (cs / C) ** 2, b = (2 * 0.6 * cs) / (C * C), c = 0.36 / (C * C) - 1;
    return (-b + Math.sqrt(Math.max(0, b * b - 4 * a * c))) / (2 * a);
  };
  const faceRay = (th, y) => {
    const cs = Math.cos(th), sn = Math.sin(th);
    if (cs < 0.08 || y < -12.4 || y > 10) return 0;
    let lo = 0, hi = 9.5 / Math.max(cs, 0.08);
    for (let i = 0; i < 18; i++) { const m = (lo + hi) / 2; if (faceZ(m * sn, y) - m * cs > 0) lo = m; else hi = m; }
    return lo;
  };
  const neck = (th, y) => (y > -6 ? 0 : 5.4 + 0.3 * Math.cos(th) + 0.4 * Math.max(0, -Math.cos(th)));
  const torsoRay = (th, y) => {
    const yw = O.y + y * k;
    if (yw > 2.8) return 0;
    const sn = Math.sin(th), cs = Math.cos(th);
    let r = (torso.R(th, yw, 0.05) + (torso.Z(yw) - O.z) * cs) / k;
    // the rounded tops of the arms
    for (const s of [-1, 1]) {
      const dy = yw - torso.shoulder[1], rr = 0.1;
      if (Math.abs(dy) < rr) {
        const w = Math.sqrt(rr * rr - dy * dy), cx = s * torso.shoulder[0] - O.x, cz = torso.shoulder[2] - O.z;
        const along = cx * sn + cz * cs, perp = Math.abs(cx * cs - cz * sn);
        if (perp < w && along > 0) r = Math.max(r, (along + Math.sqrt(w * w - perp * perp)) / k);
      }
    }
    return r;
  };
  const hemS = spline([[0, -30], [0.6, -28.8], [1.2, -26], [1.6, -24.6], [2.2, -27], [PI, -31]]);
  const hem = hemFn || ((th) => hemS(Math.abs(th)) + 0.5 * Math.sin(th * 5 + 0.7));
  const hullS = spline([[0, -11.6], [0.9, -9], [1.6, -5.5], [2.4, -2.5], [PI, -1.5]]);
  const thick = (th, y) => {
    const cs = Math.cos(th);
    let t = 0.3 + 0.32 * smooth(0.3, -0.7, cs) * smooth(-6, 4, y) + 0.12 * smooth(4, 9, y);
    t += 0.9 * Math.exp(-(((y - 4.8) / 3.0) ** 2)) * Math.exp(-(((Math.abs(th) - PI) / 0.85) ** 2));
    return t;
  };
  const NS = 150, cols = NC + 1, rows = NR + 1;
  const pos = new Float32Array(cols * rows * 3), uvs = new Float32Array(cols * rows * 2), yv = new Float32Array(cols * rows);
  const hole = new Uint8Array(cols * rows), prof = new Float32Array(NS), ys = new Float32Array(NS);
  for (let i = 0; i <= NC; i++) {
    const th = (i / NC) * TAU - PI, yTop = 11.0, yBot = hem(th), yh = hullS(Math.abs(th));
    for (let s = 0; s < NS; s++) {
      const y = lerp(yTop, yBot, s / (NS - 1));
      ys[s] = y;
      prof[s] = smax(smax(ell(th, y), faceRay(th, y) * (1 - smooth(8.7, 10.6, y)), 0.7), Math.max(neck(th, y), torsoRay(th, y)), 0.5);
    }
    // below the head the cloth hangs taut: lift it most of the way onto the outer hull
    const hull = [];
    for (let s = 0; s < NS; s++) {
      if (ys[s] > yh) continue;
      const p = [ys[s], prof[s], s];
      while (hull.length >= 2) {
        const a = hull[hull.length - 2], b = hull[hull.length - 1];
        if ((b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]) <= 0) hull.pop(); else break;
      }
      hull.push(p);
    }
    for (let h = 0; h < hull.length - 1; h++) {
      const a = hull[h], b = hull[h + 1];
      for (let s = a[2]; s <= b[2]; s++) prof[s] = lerp(prof[s], lerp(a[1], b[1], (ys[s] - a[0]) / (b[0] - a[0] || 1)), 0.9);
    }
    // thickness, and soft folds that grow towards the hem
    for (let s = 0; s < NS; s++) {
      const y = ys[s], d = clamp((yh - y) / 16, 0, 1);
      prof[s] += thick(th, y) + (y < yh ? (0.18 + 0.75 * d) * (0.6 * Math.sin(th * 9 + d * 2 + 1.1) + 0.4 * Math.sin(th * 15 - 0.4 + d)) * smooth(0, 0.25, d) : 0);
    }
    // rows evenly spaced along the profile
    const acc = [0];
    for (let s = 1; s < NS; s++) acc.push(acc[s - 1] + Math.hypot(ys[s] - ys[s - 1], prof[s] - prof[s - 1]));
    let s = 0;
    for (let j = 0; j <= NR; j++) {
      const target = (acc[NS - 1] * j) / NR;
      while (s < NS - 2 && acc[s + 1] < target) s++;
      const f = clamp((target - acc[s]) / (acc[s + 1] - acc[s] || 1), 0, 1);
      const y = lerp(ys[s], ys[s + 1], f), r = lerp(prof[s], prof[s + 1], f), kk = j * cols + i;
      pos.set([r * Math.sin(th), y, r * Math.cos(th)], kk * 3);
      uvs.set([(i / NC) * 6, target / 9], kk * 2);
      yv[kk] = y;
      const fr = faceRay(th, y);
      if (fr > 0 && y > -12.2 && r - fr < 1.4 && open.inside(fr * Math.sin(th), y)) hole[kk] = 1;
    }
  }
  // quads touching the opening are left out; the edge is pulled exactly onto the face
  const idx = [], edge = new Uint8Array(cols * rows);
  for (let j = 0; j < NR; j++) {
    for (let i = 0; i < NC; i++) {
      const a = j * cols + i, b = a + 1, c = a + cols, d = c + 1;
      if (hole[a] || hole[b] || hole[c] || hole[d]) { for (const v of [a, b, c, d]) if (!hole[v]) edge[v] = 1; continue; }
      idx.push(a, b, d, a, d, c);
    }
  }
  for (let kk = 0; kk < cols * rows; kk++) {
    if (!edge[kk]) continue;
    const [ex, ey] = open.edge(pos[kk * 3], pos[kk * 3 + 1]);
    pos.set([ex, ey, faceZ(ex, ey) + 0.12], kk * 3);
  }
  for (let kk = 0; kk < cols * rows; kk++) {
    pos[kk * 3] = O.x + pos[kk * 3] * k;
    pos[kk * 3 + 1] = O.y + pos[kk * 3 + 1] * k;
    pos[kk * 3 + 2] = O.z + pos[kk * 3 + 2] * k;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  {
    const nm = geo.attributes.normal, v = new THREE.Vector3(), w = new THREE.Vector3();
    for (let j = 0; j < rows; j++) { const a = j * cols, b = a + NC; v.fromBufferAttribute(nm, a).add(w.fromBufferAttribute(nm, b)).normalize(); nm.setXYZ(a, v.x, v.y, v.z); nm.setXYZ(b, v.x, v.y, v.z); }
  }
  skinWeights(geo, (i) => {
    const y = yv[i], wh = smooth(-15, -10, y), wc = 1 - smooth(-20, -14.5, y);
    return [[B.head, wh], [B.chest, wc], [B.neck, Math.max(0, 1 - wh - wc)]];
  });
  return geo;
}
// a soft rolled edge where the scarf meets the face (head space, cm)
export function hijabRim(sc, radius = 0.2) {
  const open = opening(), faceZ = faceZof(sc), pts = [];
  for (let k = 0; k < 200; k++) {
    const t = (k / 200) * TAU, deg = (Math.asin(Math.sin(t)) * 180) / PI, side = Math.cos(t) >= 0 ? 1 : -1;
    const [x, y] = open.at(deg, side);
    pts.push(new THREE.Vector3(x, y, faceZ(x, y) + radius * 0.75));
  }
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 240, radius, 8, true);
}
