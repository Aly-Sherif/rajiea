// The small child: a sculpted face with moving lids (the same recipe as the grown-up, in a child's
// proportions), a short bob with a fringe, a sleeveless navy top, a white skirt with a navy band,
// soft bare arms, legs and feet. Rigid parts on a few pivots, so it stays light.
import * as THREE from '../vendor/three.module.min.js';
import { PI, TAU, clamp, lerp, smooth, spline, spread, surface, weldRow, canvas, tex, rng, normalMap, heightOf, skinMaterial, clothMaterial, weave, merge } from './character-kit.js';
import { ADULT, buildHead } from './character-head.js';

// a child's face in the same centimetre frame: a bigger skull, a shorter lower face, a small
// button nose, full cheeks, a little mouth and soft brows
export const CHILD = {
  ...ADULT,
  width: [[-8.2, 0.6], [-7.7, 2.3], [-7.1, 3.5], [-6.4, 4.6], [-5.5, 5.45], [-4.4, 6.1], [-3, 6.6], [-1.5, 6.95], [0.5, 7.15], [3, 7.25], [5.5, 7.05], [8, 6.45], [10, 5.35], [11.6, 3.8], [12.6, 2.2], [13.2, 0.6]],
  depth: [[-8.2, 1.2], [-7.7, 4.4], [-7.1, 6.3], [-6.5, 7.4], [-5.8, 8.0], [-4.9, 8.2], [-4.0, 8.3], [-2.6, 8.45], [-1.2, 8.2], [0.8, 8.45], [2, 8.7], [3.5, 8.85], [6, 8.6], [8, 8.0], [10, 6.8], [11.6, 4.8], [12.6, 2.6], [13.2, 1]],
  back: [[-8.2, 1], [-7, 3.2], [-5, 5.0], [-3, 6.6], [-1, 7.9], [1, 8.9], [3, 9.6], [5, 9.8], [7, 9.4], [9, 8.4], [11, 6.4], [12.4, 3.6], [13.2, 1]],
  flat: [[-8, 2.0], [-5, 2.0], [-2.5, 2.1], [0, 2.25], [4, 2.4], [8, 2.3]],
  eye: { x: 2.82, y: 0, z: 6.25, r: 1.4 },
  mouth: { y: -4.5, w: 1.45, hu: 0.6, hl: 0.72, bow: 0.14, dip: 0.07, au: 0.36, al: 0.4, open: [0.36, 0.3], seam: 0.1 },
  nose: {
    H: [[1.0, 0], [0.3, 0.05], [-0.5, 0.2], [-1.2, 0.48], [-1.8, 0.82], [-2.2, 1.05], [-2.5, 1.1], [-2.75, 0.85], [-2.95, 0.4], [-3.15, 0]],
    W: [[1.0, 0.82], [0, 0.82], [-1.2, 0.78], [-1.9, 0.8], [-2.4, 0.84], [-2.8, 0.62], [-3.15, 0.5]],
    P: [[1, 2.4], [-1.2, 2.4], [-2.0, 2.3], [-2.6, 2.2]],
    ala: { H: [[-1.7, 0], [-2.05, 0.3], [-2.4, 0.45], [-2.7, 0.38], [-2.95, 0.1], [-3.15, 0]], x: 0.74, w: 0.44 },
    nostril: [0.38, -2.72, 0.2, 0.1],
    sub: -3.05,
    tip: -2.45,
  },
  brow: { y: 2.15, x0: 1.25 },
  browAlpha: 0.38,
  fold: 0.25,
  cheek: [3.9, -2.6, 0.5],
  chin: [-6.75, 0.14],
  grid: { y0: -8.2, y1: 8.8, nx: 100, ny: 124, s: 0.985 },
  paint: { x: 7.4, y0: -9.2, y1: 9.6 },
  lip: '#d4928e',
};
const HS = 0.026; // scene units per head centimetre
const HAIR = 0x553220;

// ── the head round the face: where the skin is, front (face) or back (skull) ──
function headShape(sc, S) {
  const A = sc.A, Cb = spline(S.back), G = S.grid, v = new THREE.Vector3(), top = S.width[S.width.length - 1][0];
  // the face height on a coarse table, so the hair can be fitted quickly
  const zx = 7.6, st = 0.2, nx = Math.round((2 * zx) / st) + 1, ny = Math.round((G.y1 - G.y0) / st) + 1, Z = new Float32Array(nx * ny);
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const x = -zx + i * st, y = G.y0 + j * st;
      Z[j * nx + i] = Math.abs(x) < A(y) ? Math.max(sc.base(x, y), sc.point(x, y, 0, v).z) : 0;
    }
  }
  const zFront = (x, y) => {
    if (y < G.y0 || y > G.y1) return sc.base(x, y);
    const fx = clamp((x + zx) / st, 0, nx - 1.001), fy = clamp((y - G.y0) / st, 0, ny - 1.001), i = fx | 0, j = fy | 0, u = fx - i, w = fy - j, k = j * nx + i;
    return lerp(lerp(Z[k], Z[k + 1], u), lerp(Z[k + nx], Z[k + nx + 1], u), w);
  };
  const inside = (x, y, z) => {
    if (y > top || y < G.y0) return false;
    const a = A(y);
    if (Math.abs(x) >= a) return false;
    if (z >= 0) return z <= zFront(x, y) + 0.05;
    return (x / a) ** 2 + (z / Cb(y)) ** 2 <= 1;
  };
  // horizontal distance from the axis to the skin, at height y in direction th (0 = front)
  const radial = (th, y) => {
    const s = Math.sin(th), c = Math.cos(th), a = A(y);
    if (c <= 0) return 1 / Math.hypot(s / a, c / Cb(y));
    let lo = 0, hi = a;
    for (let k = 0; k < 18; k++) { const m = (lo + hi) / 2; if (sc.base(m * s, y) > m * c) lo = m; else hi = m; }
    return lo;
  };
  return { inside, radial, Cb, top };
}

// skin round the back and sides of the skull (mostly under the hair), a little inside the face
function skullGeometry(H, S) {
  const ys = spread(56, -7.2, H.top - 0.1);
  const geo = surface(64, 56, (i, j, p) => {
    const th = (i / 64) * TAU - PI, y = ys[j];
    const r = H.radial(th, y) - (Math.cos(th) > 0 ? 0.25 : 0);
    p.set(r * Math.sin(th), y, r * Math.cos(th));
  }, { wrap: true });
  weldRow(geo, 56, new THREE.Vector3(0, 1, 0));
  return geo;
}

// a short bob with a fringe: a shell over the skull, thicker on top, rolled under at the ends
function hairGeometry(H, { NC = 176, NR = 60, NRoll = 6 } = {}) {
  const O = [0, 2.6, -0.8];
  const zone = (th) => smooth(0.68, 0.94, Math.abs(th)); // 0 fringe, 1 sides and back
  const hemY = (th) => {
    const a = Math.abs(th);
    const fringe = 3.05 + 0.45 * (a / 0.8) ** 2 + 0.05 * Math.sin(th * 30 + 1);
    return lerp(fringe, lerp(-4.3, -4.8, smooth(1.6, 2.8, a)), zone(th));
  };
  const thick = (th, y) => { const z = zone(th); return lerp(0.4, 0.5, z) + z * 0.45 * Math.exp(-(((y - 4.5) / 3.6) ** 2)) + 0.7 * smooth(5, 12, y); };
  const dir = (th, ph) => [Math.sin(ph) * Math.sin(th), Math.cos(ph), Math.sin(ph) * Math.cos(th)];
  const reach = (d) => {
    const at = (t) => H.inside(O[0] + d[0] * t, O[1] + d[1] * t, O[2] + d[2] * t);
    let t1 = 3;
    while (t1 < 24 && at(t1)) t1 += 0.5;
    let t0 = t1 - 0.5;
    for (let k = 0; k < 10; k++) { const tm = (t0 + t1) / 2; if (at(tm)) t0 = tm; else t1 = tm; }
    return (t0 + t1) / 2;
  };
  const shell = (th, ph, taper = 1) => {
    const d = dir(th, ph), t = reach(d), y = O[1] + d[1] * t, k = t + thick(th, y) * taper;
    return [new THREE.Vector3(O[0] + d[0] * k, O[1] + d[1] * k, O[2] + d[2] * k), new THREE.Vector3(...d), thick(th, y) * taper];
  };
  const cols = spread(NC, -PI, PI, (th) => 1 + 2.4 * Math.exp(-(((Math.abs(th) - 0.82) / 0.13) ** 2)));
  const rows = NR + NRoll, pts = [];
  for (let i = 0; i <= NC; i++) {
    const th = cols[i], target = hemY(th), fr = 1 - zone(th);
    let lo = 0.2, hi = 2.95;
    for (let k = 0; k < 16; k++) { const m = (lo + hi) / 2; if (shell(th, m)[0].y > target) lo = m; else hi = m; }
    const phHem = (lo + hi) / 2, col = [];
    for (let j = 0; j <= NR; j++) {
      const u = j / NR, ph = phHem * Math.pow(u, 0.94);
      col.push(shell(th, ph, 1 - fr * 0.55 * smooth(0.82, 1, u))[0]);
    }
    // round the end of the hair back in towards the skin
    const [, d, tk] = shell(th, phHem, 1 - fr * 0.55);
    const hem = col[NR], down = hem.clone().sub(col[NR - 1]).normalize(), c = hem.clone().addScaledVector(d, -tk / 2);
    for (let k = 1; k <= NRoll; k++) {
      const b = (k / NRoll) * PI;
      col.push(c.clone().addScaledVector(d, (tk / 2) * Math.cos(b)).addScaledVector(down, (tk / 2) * 0.8 * Math.sin(b)));
    }
    pts.push(col);
  }
  const geo = surface(NC, rows, (i, j, p) => { p.copy(pts[i][j]); return [i / NC, Math.min(j, NR) / NR + (j > NR ? (j - NR) * 0.01 : 0)]; }, { wrap: true, flip: true });
  weldRow(geo, 0, new THREE.Vector3(0, 1, 0));
  return geo;
}
function hairMaterial() {
  const S = 256, cc = canvas(S), hc = canvas(S), g = cc.getContext('2d'), h = hc.getContext('2d'), r = rng(31);
  g.fillStyle = '#553220'; g.fillRect(0, 0, S, S);
  h.fillStyle = 'rgb(128,128,128)'; h.fillRect(0, 0, S, S);
  for (let k = 0; k < 420; k++) {
    const x0 = r() * S, w = 1 + r() * 1.6, dark = r() < 0.5, a = 0.12 + r() * 0.2, wave = (r() - 0.5) * 7, ph = r() * TAU;
    const cg = dark ? `rgba(34,19,11,${a})` : `rgba(${130 + r() * 40},${84 + r() * 26},${52 + r() * 18},${a * 0.8})`;
    for (const [ctx, st] of [[g, cg], [h, dark ? 'rgba(40,40,40,0.55)' : 'rgba(225,225,225,0.55)']]) {
      ctx.strokeStyle = st;
      ctx.lineWidth = w;
      for (const ox of [-S, 0, S]) {
        ctx.beginPath();
        for (let y = 0; y <= S; y += 16) { const x = x0 + ox + Math.sin((y / S) * TAU + ph) * wave; if (y) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
        ctx.stroke();
      }
    }
  }
  const m = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, map: tex(cc, { repeat: [6, 1] }), normalMap: normalMap(heightOf(hc), S, 1.6, [6, 1]), roughness: 0.5, specularIntensity: 0.5,
    sheen: 0.5, sheenRoughness: 0.4, sheenColor: new THREE.Color(0x8a5a3a),
  });
  m.normalScale.set(0.45, 0.45);
  return m;
}
// a brown tone on the skin under the fringe and the sides of the bob
function hairline(g, X, Y) {
  const W = g.canvas.width;
  const top = g.createLinearGradient(0, Y(3.3), 0, Y(4.8));
  top.addColorStop(0, 'rgba(85,50,32,0)'); top.addColorStop(1, 'rgba(85,50,32,0.9)');
  g.fillStyle = top; g.fillRect(0, 0, W, Y(3.3));
}

// ── body: rings stacked up the trunk (scene units; the child stands about 2.3 tall) ──
const TW = spline([[1.16, 0.215], [1.3, 0.21], [1.42, 0.208], [1.52, 0.215], [1.6, 0.232], [1.645, 0.236], [1.68, 0.205], [1.71, 0.16], [1.75, 0.12]]);
const TF = spline([[1.16, 0.2], [1.3, 0.19], [1.42, 0.175], [1.52, 0.165], [1.6, 0.15], [1.66, 0.13], [1.7, 0.115], [1.75, 0.1]]);
const TB = spline([[1.16, 0.165], [1.3, 0.155], [1.45, 0.16], [1.55, 0.16], [1.62, 0.145], [1.68, 0.125], [1.75, 0.105]]);
const ringR = (th, y, ease = 0) => {
  const s = Math.sin(th), c = Math.cos(th);
  return 1 / Math.pow(Math.pow(Math.abs(s) / (TW(y) + ease), 2.4) + Math.pow(Math.abs(c) / ((c >= 0 ? TF(y) : TB(y)) + ease), 2.4), 1 / 2.4);
};
const NECK = { r: 0.1, z: -0.026 };
const neckR = (th) => { const s = Math.sin(th), c = Math.cos(th); return NECK.z * c + Math.sqrt(NECK.r ** 2 - (NECK.z * s) ** 2); };
const yTop = (th) => 1.75 - 0.05 * Math.max(0, Math.cos(th)) ** 2;
function bodiceGeometry() {
  return surface(72, 40, (i, j, p) => {
    const th = (i / 72) * TAU - PI, t = j / 40, yt = yTop(th);
    let y, r;
    if (t < 0.86) { y = lerp(1.16, yt, t / 0.86); r = ringR(th, y, 0.006); }
    else { const u = (t - 0.86) / 0.14; y = yt + 0.01 * Math.sin(u * PI * 0.5); r = lerp(ringR(th, yt, 0.006), neckR(th) + 0.004, smooth(0, 1, u)); }
    p.set(r * Math.sin(th), y, r * Math.cos(th));
    return [(i / 72) * 6, y * 6];
  }, { wrap: true });
}
function collarCurve() {
  const pts = [];
  for (let i = 0; i < 48; i++) { const th = (i / 48) * TAU - PI, r = neckR(th) + 0.01; pts.push(new THREE.Vector3(r * Math.sin(th), yTop(th) + 0.012, r * Math.cos(th))); }
  return new THREE.CatmullRomCurve3(pts, true);
}
const SK = { top: 1.27, hem: 0.6 };
const skirtR = (th, y) => {
  const t = clamp((SK.top - y) / (SK.top - SK.hem), 0, 1);
  return lerp(ringR(th, 1.2, 0.014), 0.43 + 0.02 * Math.cos(th), Math.pow(t, 1.25)) + 0.022 * Math.pow(t, 1.6) * Math.sin(9 * th + 0.8 * Math.sin(2 * th));
};
function skirtGeometry(y0, y1, lift = 0, lip = false) {
  const rows = lip ? 34 : 4;
  return surface(96, rows, (i, j, p) => {
    const th = (i / 96) * TAU - PI;
    let y = lerp(y0, y1, Math.min(1, j / (rows - (lip ? 2 : 0)))), r = skirtR(th, y) + lift;
    if (lip && j > rows - 2) { y += 0.012 * (j - rows + 2); r -= 0.01 * (j - rows + 2); }
    p.set(r * Math.sin(th), y, 0.01 + r * Math.cos(th));
    return [(i / 96) * 8, y * 6];
  }, { wrap: true, flip: true });
}

// a soft limb round a curve; rad(t) gives the radius from 0 (top) to 1 (end)
function limb(pts, rad, { segs = 36, cols = 20, flat = 0.95 } = {}) {
  const curve = new THREE.CatmullRomCurve3(pts.map((q) => new THREE.Vector3(...q)));
  const P = new THREE.Vector3(), T = new THREE.Vector3(), Sx = new THREE.Vector3(), Sz = new THREE.Vector3(), F = new THREE.Vector3(0, 0, 1);
  return surface(cols, segs, (i, j, p) => {
    const t = j / segs, a = (i / cols) * TAU, r = rad(t);
    curve.getPointAt(t, P);
    curve.getTangentAt(t, T);
    Sx.crossVectors(T, F).normalize();
    Sz.crossVectors(Sx, T).normalize();
    p.copy(P).addScaledVector(Sx, Math.cos(a) * r).addScaledVector(Sz, Math.sin(a) * r * flat);
  }, { wrap: true, flip: true });
}
const mirrorGeo = (geo) => {
  geo.applyMatrix4(new THREE.Matrix4().makeScale(-1, 1, 1));
  const idx = geo.index.array;
  for (let k = 0; k < idx.length; k += 3) { const t = idx[k + 1]; idx[k + 1] = idx[k + 2]; idx[k + 2] = t; }
  return geo;
};
const placed = (geo, pos, rot = [0, 0, 0], scl = [1, 1, 1]) => geo.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(...pos), new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)), new THREE.Vector3(...scl)));
// a small chubby hand hanging from the wrist, palm towards -x, fingers curled by 'curl'
function handGeometry(side, curl) {
  const parts = [placed(new THREE.SphereGeometry(1, 20, 14), [-0.002, -0.045, 0.004], [0, 0, 0], [0.024, 0.045, 0.034])];
  [[0.021, 0.0102, 0.026], [0.007, 0.0108, 0.03], [-0.007, 0.0104, 0.028], [-0.02, 0.0094, 0.022]].forEach(([z, r, len], k) => {
    const g = new THREE.CapsuleGeometry(r, len, 4, 10);
    g.translate(0, -len / 2 - r * 0.5, 0);
    parts.push(placed(g, [0, -0.076, z], [0, 0, -curl * (0.85 + k * 0.08)]));
  });
  const th = new THREE.CapsuleGeometry(0.0112, 0.02, 4, 10);
  th.translate(0, -0.016, 0);
  parts.push(placed(th, [-0.006, -0.03, 0.03], [0.55, 0, -0.35 - curl * 0.45]));
  const geo = merge(parts);
  return side < 0 ? mirrorGeo(geo) : geo;
}
function footGeometry(side) {
  const zs = spread(30, -0.075, 0.2, (z) => 1 + 2 * smooth(0.14, 0.2, z) + 1.5 * smooth(-0.05, -0.075, z));
  const W = spline([[-0.075, 0.004], [-0.068, 0.032], [-0.05, 0.043], [0, 0.047], [0.06, 0.053], [0.12, 0.061], [0.16, 0.06], [0.185, 0.046], [0.2, 0.006]]);
  const Hh = spline([[-0.075, 0.01], [-0.068, 0.05], [-0.05, 0.078], [-0.02, 0.112], [0.02, 0.118], [0.06, 0.09], [0.12, 0.054], [0.16, 0.044], [0.185, 0.034], [0.2, 0.012]]);
  const sp = (v, n) => Math.sign(v) * Math.pow(Math.abs(v), 2 / n);
  const foot = surface(24, 30, (i, j, p) => {
    const a = (i / 24) * TAU, z = zs[j], w = W(z), h = Hh(z);
    p.set(w * sp(Math.cos(a), 2.3) * (Math.cos(a) < 0 ? 1.04 : 1), h / 2 + (h / 2) * sp(Math.sin(a), 2.6), z);
  }, { wrap: true });
  const parts = [foot];
  [[-0.03, 0.021, 0.183, 0.019], [-0.008, 0.017, 0.19, 0.014], [0.01, 0.015, 0.186, 0.013], [0.026, 0.014, 0.178, 0.012], [0.04, 0.013, 0.166, 0.011]].forEach(([x, y, z, r]) => {
    parts.push(placed(new THREE.SphereGeometry(1, 12, 8), [x, y, z], [0, 0, 0], [r, r * 0.85, r * 1.15]));
  });
  parts.forEach((g) => g.deleteAttribute('uv'));
  const geo = merge(parts);
  geo.computeVertexNormals();
  return side > 0 ? geo : mirrorGeo(geo);
}

// builds the child into 'body'; returns the moving parts
export function buildChild(body) {
  const skin = skinMaterial({ color: 0xf1cdb9, roughness: 0.55 });
  const navy = clothMaterial({ color: 0x2e2648, roughness: 0.78, sheen: 0.8, normalMap: weave('jersey', [1, 1]), normalScale: 0.45 });
  const white = clothMaterial({ color: 0xfbf6f0, roughness: 0.84, sheen: 0.7, normalMap: weave('twill', [1, 1]), normalScale: 0.35, side: THREE.DoubleSide });
  const gold = new THREE.MeshPhysicalMaterial({ color: 0xe4b35e, metalness: 1, roughness: 0.22, clearcoat: 0.4 });
  const mesh = (geo, mat, parent, cast = true) => { const m = new THREE.Mesh(geo, mat); m.castShadow = cast; m.receiveShadow = true; parent.add(m); return m; };

  // legs stand on the floor; the upper body sways on the hips
  const legs = new THREE.Group();
  body.add(legs);
  const upper = new THREE.Group();
  upper.position.y = 0.95;
  body.add(upper);
  const up = new THREE.Group();
  up.position.y = -0.95;
  upper.add(up);
  const legR = spline([[0, 0.104], [0.2, 0.103], [0.42, 0.093], [0.6, 0.078], [0.66, 0.076], [0.74, 0.08], [0.82, 0.072], [0.93, 0.054], [1, 0.05]]);
  for (const s of [-1, 1]) {
    mesh(limb([[s * 0.098, 1.0, 0], [s * 0.1, 0.7, 0.008], [s * 0.103, 0.43, 0.012], [s * 0.105, 0.25, 0.0], [s * 0.106, 0.09, -0.012]], legR, { segs: 40 }), skin, legs);
    const f = mesh(footGeometry(s), skin, legs);
    f.position.set(s * 0.106, 0, -0.012);
    f.rotation.y = s * 0.12;
  }

  // top, skirt and collar
  mesh(bodiceGeometry(), navy, up);
  mesh(new THREE.TubeGeometry(collarCurve(), 96, 0.012, 8, true), white, up);
  mesh(skirtGeometry(SK.top, SK.hem, 0, true), white, up);
  mesh(skirtGeometry(0.765, 0.7, 0.004), navy, up);

  // arms on shoulder pivots, with a soft shoulder, an elbow and chubby wrists
  const armR = spline([[0, 0.072], [0.12, 0.072], [0.3, 0.067], [0.5, 0.057], [0.56, 0.056], [0.66, 0.059], [0.8, 0.052], [0.9, 0.042], [0.94, 0.039], [1, 0.04]]);
  const arms = [-1, 1].map((s) => {
    const pivot = new THREE.Group();
    pivot.position.set(s * 0.236, 1.6, -0.01);
    up.add(pivot);
    mesh(new THREE.SphereGeometry(0.071, 24, 16), skin, pivot);
    mesh(limb([[0, 0, 0], [s * 0.004, -0.12, -0.004], [s * 0.006, -0.24, -0.008], [s * 0.004, -0.35, 0.012], [0, -0.45, 0.03]], armR), skin, pivot);
    const trim = mesh(new THREE.TorusGeometry(0.073, 0.011, 8, 40), white, up);
    trim.position.copy(pivot.position);
    trim.rotation.y = PI / 2;
    const hand = new THREE.Group();
    hand.position.set(0, -0.45, 0.03);
    hand.rotation.x = -0.08;
    pivot.add(hand);
    mesh(handGeometry(s, s > 0 ? 1.15 : 0.45), skin, hand).scale.setScalar(1.15);
    return { pivot, hand };
  });
  const bangle = mesh(new THREE.TorusGeometry(0.043, 0.0065, 10, 40), gold, arms[1].pivot);
  bangle.position.set(0, -0.405, 0.022);
  bangle.scale.setScalar(1.08);
  bangle.rotation.x = PI / 2 + 0.1;

  // neck and head
  const head = new THREE.Group();
  head.position.set(0, 1.8, NECK.z);
  up.add(head);
  const rig = new THREE.Group();
  rig.position.set(0, 0.184, -NECK.z);
  rig.scale.setScalar(HS);
  head.add(rig);
  const face = buildHead(rig, CHILD, { hairline });
  const H = headShape(face.sc, CHILD);
  mesh(skullGeometry(H, CHILD), skin, rig);
  const neck = mesh(new THREE.CylinderGeometry(NECK.r / HS, (NECK.r + 0.006) / HS, 7.5, 32, 1, true), skin, rig);
  neck.position.set(0, -8.4, NECK.z / HS);
  mesh(hairGeometry(H), hairMaterial(), rig);
  return { legs, upper, arms, head, face, top: new THREE.Vector3(0, 0.6, 0) };
}
