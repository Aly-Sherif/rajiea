// A grown man for scenes with two figures: the same sculpted face, eyes and skin as the main
// figure in a man's proportions, short hair, ears, an optional short beard and glasses, a t-shirt,
// trousers and trainers on the same kind of skeleton. A generic face, drawn in code.
import * as THREE from '../vendor/three.module.min.js';
import { PI, TAU, clamp, lerp, damp, smooth, spline, spread, surface, skinWeights, canvas, tex, rng, skinMaterial, clothMaterial, setCloth, weave, contactShadow, nextTask } from './character-kit.js';
import { ADULT, buildHead, sculptor } from './character-head.js';
import { L as BASE, torsoShape, trunkLoft, tube, trunkWeights, buildSkeleton, shoeGeometry, trouserLeg, handPoser, legPlanter } from './character-body.js';
import { headShape, skullGeometry, hairGeometry, hairMaterial } from './character-child.js';

// ── a man's face in the same centimetre frame: squarer jaw, heavier brow, larger nose, flatter brows ──
export const MAN = {
  ...ADULT,
  width: [[-11.4, 1.0], [-10.9, 2.7], [-10.2, 4.0], [-9.3, 5.0], [-8.3, 5.7], [-7.1, 6.15], [-5.8, 6.5], [-3.6, 6.9], [-1.5, 7.2], [0.5, 7.3], [3, 7.35], [5.5, 7.2], [8, 6.65], [10, 5.6], [11.2, 4.0], [12.0, 2.0], [12.35, 0.6]],
  depth: [[-11.4, 1.4], [-10.9, 4.8], [-10.2, 7.2], [-9.5, 8.4], [-8.7, 8.75], [-7.8, 8.7], [-7.2, 8.7], [-6.2, 8.9], [-4.6, 8.85], [-3.5, 8.5], [-1.5, 8.25], [0.8, 8.5], [1.9, 8.85], [3.5, 8.9], [6, 8.55], [8, 7.85], [10, 6.1], [11.2, 4.2], [12.0, 2.1], [12.35, 0.8]],
  back: [[-11.4, 1.5], [-10, 3.4], [-8, 5.0], [-6, 6.4], [-4, 7.5], [-2, 8.4], [0, 9.1], [2, 9.6], [4, 9.8], [6, 9.7], [8, 9.0], [10, 7.4], [11.2, 5.0], [12.0, 2.4], [12.35, 0.8]],
  flat: [[-9.8, 2.5], [-7, 2.4], [-5, 2.2], [-2.5, 2.2], [0, 2.3], [4, 2.5], [8, 2.3]],
  eye: { x: 3.12, y: 0, z: 6.15, r: 1.22, lash: 0.62 },
  mouth: { y: -6.15, w: 2.2, hu: 0.6, hl: 0.78, bow: 0.1, dip: 0.07, au: 0.38, al: 0.42, open: [0.36, 0.24], seam: 0.1 },
  nose: {
    H: [[1.5, 0], [0.8, 0.14], [0, 0.46], [-1.0, 1.0], [-2.0, 1.6], [-2.6, 1.98], [-3.05, 2.16], [-3.4, 2.0], [-3.75, 1.3], [-4.0, 0.5], [-4.25, 0]],
    W: [[1.5, 1.35], [0, 1.24], [-1.5, 1.14], [-2.5, 1.1], [-3.1, 1.08], [-3.7, 0.78], [-4.25, 0.55]],
    P: [[1, 2], [-1.5, 2], [-2.5, 2.1], [-3.2, 2.3]],
    Q: [[1, 2.2], [-1.5, 2.1], [-2.5, 1.7], [-3.2, 1.45]],
    ala: { H: [[-2.5, 0], [-2.95, 0.46], [-3.35, 0.68], [-3.75, 0.55], [-4.05, 0.16], [-4.25, 0]], x: 0.92, w: 0.56 },
    nostril: [0.5, -3.76, 0.28, 0.13],
    sub: -4.15,
    tip: -3.05,
  },
  brow: { y: 1.8, x0: 1.15 },
  browShape: { line: [[0, -0.18], [0.9, 0.06], [2.0, 0.22], [2.95, 0.26], [3.8, 0.08], [4.35, -0.18]], thick: [0.52, 0.54, 0.5, 0.42, 0.26, 0.08] },
  browAlpha: 1.25,
  ridge: 0.34,
  cheek: [4.4, -2.0, 0.3],
  chin: [-9.1, 0.5],
  grid: { y0: -11.4, y1: 8.8, nx: 96, ny: 124, s: 0.985 },
  paint: { x: 7.6, y0: -12.4, y1: 9.4 },
  skin: '#e8c2a3',
  lip: '#b9837a',
  tex: 768,
  blush: 0.2,
  fold: 0.75,
  trough: 0.45,
};

// layout: broader shoulders, narrower hips; the whole figure is scaled up a little when placed
const LM = { ...BASE, shoulder: [0.35, 2.62, -0.015], hip: [0.152, 1.69, 0.005], ankle: [0.125, 0.135, -0.012] };
const TM = {
  W: spline([[0.9, 0.3], [1.3, 0.295], [1.55, 0.3], [1.75, 0.3], [1.95, 0.298], [2.12, 0.302], [2.28, 0.312], [2.42, 0.322], [2.52, 0.33], [2.6, 0.328], [2.66, 0.305], [2.71, 0.24], [2.75, 0.16], [2.78, 0.122], [2.95, 0.115]]),
  F: spline([[0.9, 0.16], [1.3, 0.158], [1.75, 0.16], [2.06, 0.165], [2.24, 0.178], [2.38, 0.186], [2.5, 0.175], [2.6, 0.145], [2.69, 0.112], [2.77, 0.098], [2.95, 0.094]]),
  B: spline([[0.9, 0.17], [1.3, 0.172], [1.62, 0.182], [1.85, 0.168], [2.06, 0.162], [2.3, 0.178], [2.46, 0.182], [2.58, 0.15], [2.68, 0.114], [2.77, 0.1], [2.95, 0.096]]),
  Z: spline([[0.9, 0], [2.06, 0.01], [2.4, 0.004], [2.7, -0.022], [2.95, -0.03]]),
  N: spline([[0.9, 2.3], [2.06, 2.4], [2.4, 2.6], [2.6, 2.8], [2.72, 2.4], [2.8, 2.0]]),
};
const TORSO = torsoShape(TM, 0);

// ── short hair: a sideburn in front of each ear, the hem lifted over the ears, a tidy nape ──
const SHORT = {
  O: [0, 2.0, -0.6],
  zone: (th) => smooth(0.5, 0.9, Math.abs(th)),
  hemY(th) {
    const a = Math.abs(th);
    let y = lerp(7.2 + 0.3 * (a / 0.7) ** 2 + 0.07 * Math.sin(th * 41), lerp(-1.3, 2.9, smooth(1.42, 1.56, a)), smooth(0.85, 1.2, a));
    return lerp(y, -4.6 + 0.3 * Math.cos(th * 3), smooth(1.95, 2.15, a));
  },
  thick(th, y) { const a = Math.abs(th), fr = 1 - smooth(0.6, 1.0, a); return lerp(1, smooth(7.0, 9.4, y), fr) * (0.22 + 0.34 * smooth(3, 10, y) + 0.2 * fr * smooth(8, 10.5, y)) + 0.05 * Math.sin(th * 11 + y * 1.7) * smooth(4, 8, y); },
  dens: (th) => { const a = Math.abs(th); return 1 + 1.6 * Math.exp(-(((a - 1.05) / 0.18) ** 2)) + 2.2 * Math.exp(-(((a - 1.49) / 0.08) ** 2)) + 1.6 * Math.exp(-(((a - 2.05) / 0.1) ** 2)); },
};

// ── the beard's outline (face centimetres): cheek line from the sideburn to the mouth corner, a
// moustache under the nose; the lips are left clear ──
const CHEEK = [[7.6, -0.9], [6.9, -2.2], [5.9, -3.5], [4.7, -4.45], [3.5, -4.95], [2.7, -5.05]];
const STACHE = [[2.45, -5.05], [1.7, -4.68], [0.8, -4.46], [0, -4.42]];
function beardPath(g, X, Y) {
  const side = [...CHEEK, ...STACHE];
  g.moveTo(X(9), Y(-0.5));
  side.forEach(([x, y]) => g.lineTo(X(x), Y(y)));
  side.slice().reverse().forEach(([x, y]) => g.lineTo(X(-x), Y(y)));
  g.lineTo(X(-9), Y(-0.5)); g.lineTo(X(-9), Y(-13)); g.lineTo(X(9), Y(-13));
  g.closePath();
}
function lipsPath(g, X, Y, sc, M, grow = 0) {
  for (let k = 0; k <= 30; k++) {
    const Xn = lerp(-1.08, 1.08, k / 30), x = Xn * M.w, s = M.seam * Math.min(Xn * Xn, 1.4);
    if (k) g.lineTo(X(x), Y(M.y + s + sc.upH(Xn) + 0.1 + grow)); else g.moveTo(X(x), Y(M.y + s + sc.upH(Xn) + 0.1 + grow));
  }
  for (let k = 30; k >= 0; k--) {
    const Xn = lerp(-1.08, 1.08, k / 30), x = Xn * M.w, s = M.seam * Math.min(Xn * Xn, 1.4);
    g.lineTo(X(x), Y(M.y + s - sc.loH(Xn) - 0.14 - grow));
  }
  g.closePath();
}
// the hair and stubble tone on the face's own skin: under the beard, at the hairline and sideburns
function paintHairTone(S, sc, hair) {
  return (g, X, Y, L) => {
    const W = g.canvas.width, r = rng(5);
    g.save();
    g.filter = `blur(${L(0.35)}px)`;
    g.fillStyle = 'rgba(70,48,38,0.22)';
    g.beginPath(); beardPath(g, X, Y); lipsPath(g, X, Y, sc, S.mouth, 0.05); g.fill('evenodd');
    g.restore();
    g.save();
    g.beginPath(); beardPath(g, X, Y); lipsPath(g, X, Y, sc, S.mouth, 0.05); g.clip('evenodd');
    for (let k = 0; k < 2200; k++) {
      g.fillStyle = `rgba(40,28,22,${0.08 + r() * 0.14})`;
      g.fillRect(r() * W, Y(-0.5) + r() * (W - Y(-0.5)), 1.4, 1.4);
    }
    g.restore();
    const top = g.createLinearGradient(0, Y(6.4), 0, Y(7.5));
    top.addColorStop(0, hair + '00'); top.addColorStop(1, hair + 'e0');
    g.fillStyle = top; g.fillRect(0, 0, W, Y(6.4));
    g.save();
    g.filter = `blur(${L(0.3)}px)`;
    g.fillStyle = hair + 'c0';
    for (const s of [-1, 1]) {
      g.beginPath();
      g.moveTo(X(6.3 * s), Y(7.5)); g.lineTo(X(6.4 * s), Y(2.6)); g.lineTo(X(6.75 * s), Y(-1.2)); g.lineTo(X(9 * s), Y(-1.2)); g.lineTo(X(9 * s), Y(7.5));
      g.closePath(); g.fill();
    }
    g.restore();
  };
}
// the beard itself: a shell lifted off the face, cut out by strands at its edges
function beardTextures(S, sc, hair) {
  const P = S.paint, N = 512;
  const X = (x) => ((x + P.x) / (2 * P.x)) * N, Y = (y) => (1 - (y - P.y0) / (P.y1 - P.y0)) * N, L = (v) => (v / (2 * P.x)) * N;
  const a = canvas(N), ga = a.getContext('2d', { willReadFrequently: true }), r = rng(9);
  // a soft outline: it sets the shell's thickness and how dense the hairs are
  ga.fillStyle = '#000'; ga.fillRect(0, 0, N, N);
  ga.save();
  ga.filter = `blur(${L(0.45)}px)`;
  ga.fillStyle = '#fff';
  ga.beginPath(); beardPath(ga, X, Y); lipsPath(ga, X, Y, sc, S.mouth, 0.16); ga.fill('evenodd');
  ga.restore();
  const soft = ga.getImageData(0, 0, N, N).data;
  const at = (i, j) => soft[(clamp(j, 0, N - 1) * N + clamp(i, 0, N - 1)) * 4] / 255;
  const mask = (x, y) => {
    const u = X(x), v = Y(y), i = Math.floor(u), j = Math.floor(v), fu = u - i, fv = v - j;
    return lerp(lerp(at(i, j), at(i + 1, j), fu), lerp(at(i, j + 1), at(i + 1, j + 1), fu), fv);
  };
  // short hairs, thinning out towards the edge so it breaks into strands; a solid core inside
  ga.fillRect(0, 0, N, N);
  ga.strokeStyle = '#fff';
  ga.lineCap = 'round';
  const top = Y(-0.4);
  for (let k = 0; k < 16000; k++) {
    const x = r() * N, y = top + r() * (N - top), m = at(x | 0, y | 0);
    if (m < 0.04 || r() > m * 1.6) continue;
    const len = L(0.16 + r() * 0.3), ang = PI / 2 + (r() - 0.5) * 0.9 + (x < N / 2 ? 0.2 : -0.2);
    ga.lineWidth = 0.9 + r() * 0.8;
    ga.beginPath(); ga.moveTo(x, y); ga.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len); ga.stroke();
  }
  const img = ga.getImageData(0, 0, N, N), d = img.data;
  for (let i = 0; i < d.length; i += 4) { const core = smooth(0.72, 0.94, soft[i] / 255) * 255; if (core > d[i]) d[i] = d[i + 1] = d[i + 2] = core; }
  ga.putImageData(img, 0, 0);
  // colour: dark hair with finer light and dark strands
  const c = canvas(N), gc = c.getContext('2d');
  gc.fillStyle = hair; gc.fillRect(0, 0, N, N);
  gc.fillStyle = 'rgba(92,70,56,0.35)'; gc.fillRect(0, 0, N, N);
  for (let k = 0; k < 3000; k++) {
    const x = r() * N, y = r() * N, len = 2 + r() * 4, ang = PI / 2 + (r() - 0.5) * 0.9, lit = r() < 0.5;
    gc.strokeStyle = lit ? `rgba(140,112,92,${0.16 + r() * 0.2})` : `rgba(0,0,0,${0.12 + r() * 0.16})`;
    gc.lineWidth = 0.8 + r() * 0.8;
    gc.beginPath(); gc.moveTo(x, y); gc.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len); gc.stroke();
  }
  return { alpha: tex(a, { srgb: false }), color: tex(c), mask };
}
function beardGeometry(S, sc, mask) {
  const P = S.paint, nu = 104, nv = 64, ys = spread(nv, S.grid.y0, 0.6), xs = spread(nu, -S.grid.s, S.grid.s);
  const p = new THREE.Vector3(), q = new THREE.Vector3(), w = new THREE.Vector3(), n = new THREE.Vector3();
  const at = (g) => (i, j, out) => {
    const y = ys[j], x = xs[i] * sc.A(y);
    sc.point(x, y, g, p); sc.point(x + 0.04, y, g, q); sc.point(x, y + 0.04, g, w);
    n.crossVectors(q.sub(p), w.sub(p)).normalize();
    const lip = smooth(S.mouth.y - 0.2, S.mouth.y + 0.5, y) * (1 - smooth(2.2, 3.2, Math.abs(x)));
    out.copy(p).addScaledVector(n, 0.04 + 0.17 * mask(x, y) * (1 - 0.45 * lip));
    return [(x + P.x) / (2 * P.x), (y - P.y0) / (P.y1 - P.y0)];
  };
  const m = (i, j) => mask(xs[i] * sc.A(ys[j]), ys[j]);
  const geo = surface(nu, nv, at(0), { keep: (i, j) => Math.max(m(i, j), m(i + 1, j), m(i, j + 1), m(i + 1, j + 1)) > 0.03 });
  const g1 = surface(nu, nv, at(1));
  g1.setIndex(geo.index);
  g1.computeVertexNormals();
  geo.morphAttributes.position = [g1.attributes.position];
  geo.morphAttributes.normal = [g1.attributes.normal];
  return geo;
}

// an ear: a thin shell with a hollow on the outer face and a narrower lobe
function earGeometry() {
  const geo = new THREE.SphereGeometry(1, 24, 18);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i) * 0.55, y = p.getY(i), z = p.getZ(i);
    const r2 = y * y + z * z;
    if (x > 0) x -= 0.4 * Math.max(0, 1 - r2 / 0.72);
    p.setXYZ(i, x, y * 3.0, z * 1.6 * (0.72 + 0.28 * smooth(-0.7, 0.1, y)));
  }
  geo.computeVertexNormals();
  return geo;
}

// thin dark frames: two rounded lenses, a bridge and arms back to the ears
function glassesGroup(S) {
  const g = new THREE.Group(), E = S.eye;
  const frame = new THREE.MeshStandardMaterial({ color: 0x1b1616, roughness: 0.32 });
  const lensMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.05, transparent: true, opacity: 0.1, depthWrite: false });
  const ring = (cx) => {
    const pts = [];
    for (let k = 0; k < 36; k++) {
      const a = (k / 36) * TAU, c = Math.cos(a), s = Math.sin(a), x = cx + 2.2 * Math.sign(c) * Math.abs(c) ** 0.62, y = -0.3 + 1.55 * Math.sign(s) * Math.abs(s) ** 0.75;
      pts.push(new THREE.Vector3(x, y, 9.15 - 0.09 * (x - cx * 0.6) ** 2 / 4));
    }
    return new THREE.CatmullRomCurve3(pts, true);
  };
  for (const s of [-1, 1]) {
    const cx = s * (E.x + 0.12), curve = ring(cx);
    g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 72, 0.13, 6, true), frame));
    const shape = new THREE.Shape(curve.getPoints(48).map((v) => new THREE.Vector2(v.x, v.y)));
    const lens = new THREE.Mesh(new THREE.ShapeGeometry(shape, 8), lensMat);
    lens.position.z = 9.05;
    lens.renderOrder = 4;
    g.add(lens);
    const arm = new THREE.CatmullRomCurve3([[cx + s * 2.15, 0.55, 8.6], [s * 7.3, 0.7, 6.6], [s * 7.75, 0.6, 2.5], [s * 7.7, 0.2, -1.0], [s * 7.3, -0.9, -2.2]].map((v) => new THREE.Vector3(...v)));
    g.add(new THREE.Mesh(new THREE.TubeGeometry(arm, 24, 0.12, 6, false), frame));
  }
  const bridge = new THREE.QuadraticBezierCurve3(new THREE.Vector3(-(E.x - 2.05), 0.35, 9.05), new THREE.Vector3(0, 0.75, 9.45), new THREE.Vector3(E.x - 2.05, 0.35, 9.05));
  g.add(new THREE.Mesh(new THREE.TubeGeometry(bridge, 12, 0.12, 6, false), frame));
  g.traverse((o) => { if (o.isMesh) o.castShadow = false; });
  return g;
}

// bare arm from the shoulder joint to the wrist, and a short sleeve over the top (arm space)
function armGeometry(L) {
  const w = -(L.upper + L.fore) - 0.005;
  const prof = spline([[-0.03, 0.074], [0, 0.08], [-0.12, 0.083], [-0.28, 0.078], [-0.45, 0.068], [-0.56, 0.06], [-0.64, 0.064], [-0.74, 0.064], [-0.86, 0.056], [-0.98, 0.05], [w, 0.049]]);
  // rounder up the arm, a flatter oval at the wrist so it meets the hand
  return tube({ top: -0.03, bottom: w, rows: 50, cols: 24, cap: true, radius: (y) => { const r = prof(y), f = smooth(-0.8, -1.0, y); return [r * lerp(0.96, 0.8, f), r * lerp(1.03, 1.12, f), 0, 0]; } });
}
function sleeveGeometry(side) {
  const prof = spline([[0.055, 0], [0.048, 0.04], [0.03, 0.068], [0.0, 0.084], [-0.15, 0.095], [-0.3, 0.094]]);
  return tube({
    top: 0.055, bottom: -0.32, rows: 30, cols: 28, cap: true,
    dens: (y) => 1 + 2 * smooth(0.01, 0.055, y) + 1.5 * smooth(-0.27, -0.32, y),
    radius: (y, a) => {
      let r = prof(y) + 0.0025 * Math.sin(a * 5 + side + y * 20) * smooth(0, -0.2, y);
      r -= 0.012 * smooth(-0.3, -0.32, y);
      return [r * 1.03, r, 0, 0.004 * smooth(0.055, 0, y)];
    },
  });
}
// the shirt: hangs straight from the chest, with a crew neck that dips a little at the front
const shirtR = (th, y) => TORSO.R(th, y, lerp(0.024, 0.012, smooth(2.66, 2.79, y))) + 0.006 * smooth(2.15, 1.6, y) + 0.004 * Math.sin(th * 7 + y * 9) * smooth(2.1, 1.7, y);
const neckTop = (th) => 2.77 - 0.06 * Math.max(0, Math.cos(th)) ** 2;
function shirtGeometry() {
  return surface(72, 60, (i, j, p) => {
    const th = (i / 72) * TAU - PI, y = lerp(1.5, neckTop(th), j / 60), r = shirtR(th, y);
    p.set(r * Math.sin(th), y, TM.Z(y) + r * Math.cos(th));
    return [(i / 72) * 4, y * 3];
  }, { wrap: true });
}
function collarGeometry() {
  const pts = [];
  for (let k = 0; k < 48; k++) { const th = (k / 48) * TAU - PI, y = neckTop(th), r = shirtR(th, y) + 0.002; pts.push(new THREE.Vector3(r * Math.sin(th), y + 0.004, TM.Z(y) + r * Math.cos(th))); }
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 96, 0.013, 8, true);
}

// builds him into the stage; returns { man, hit, pose, look(), play(type) }
export async function createMan({ stage, scene, makeBlinker, reduceMotion = () => false }, H) {
  const man = new THREE.Group(), body = new THREE.Group();
  man.add(body);
  man.scale.setScalar(1.07);
  man.position.x = 0.46;
  scene.add(man);
  man.add(contactShadow(1.0, 0.8, 0.5));
  await nextTask();
  const rig = buildSkeleton(body, LM, { handScale: 1.06 });
  rig.body = body;
  const { B, skinned } = rig, bone = (n) => rig.bones[B[n]];
  const tone = new THREE.Color(H.skin).lerp(new THREE.Color(0xf6dccb), 0.18);
  const skin = skinMaterial({ color: tone, roughness: 0.55 });
  const skinV = skinMaterial({ color: tone, roughness: 0.55, vertexColors: true });
  const shirt = clothMaterial({ color: H.shirt, roughness: 0.8, sheen: 0.8, sheenRoughness: 0.5, sheenTint: 0.35, normalMap: weave('jersey', [18, 26]), normalScale: 0.45 });
  const pants = clothMaterial({ color: H.pants, roughness: 0.88, sheen: 0.4, sheenRoughness: 0.8, normalMap: weave('twill', [10, 26]), normalScale: 0.6 });
  const shoeMat = new THREE.MeshPhysicalMaterial({ color: H.shoes, roughness: 0.55, sheen: 0.4, normalMap: weave('leather', [5, 5]), normalScale: new THREE.Vector2(0.25, 0.25) });
  const soleMat = new THREE.MeshStandardMaterial({ color: 0xece7df, roughness: 0.8 });
  const tw = (geo) => skinWeights(geo, (i, p) => trunkWeights(B, p.y));

  // t-shirt, short sleeves, bare arms and hands
  skinned(tw(shirtGeometry()), shirt);
  skinned(tw(collarGeometry()), shirt);
  for (const side of [-1, 1]) {
    const a = rig.arms[side];
    const arm = armGeometry(LM);
    arm.translate(...a.pos);
    skinWeights(arm, (i, p) => { const wf = smooth(-0.5, -0.66, p.y - a.pos[1]); return [[B['upper' + side], 1 - wf], [B['fore' + side], wf]]; });
    skinned(arm, skin);
    const sl = sleeveGeometry(side);
    sl.translate(...a.pos);
    skinWeights(sl, () => [[B['upper' + side], 1]]);
    skinned(sl, shirt);
    skinned(rig.hands[side].skinGeo, skin);
    skinned(rig.hands[side].nailGeo, new THREE.MeshStandardMaterial({ color: 0xe6bca9, roughness: 0.35 }), { shadow: false });
  }
  // a watch on the left wrist
  {
    const g = new THREE.Group(), band = new THREE.MeshStandardMaterial({ color: 0x1e1d22, roughness: 0.45 }), steel = new THREE.MeshStandardMaterial({ color: 0xc9ccd2, metalness: 1, roughness: 0.25 });
    const strap = new THREE.Mesh(new THREE.TorusGeometry(0.046, 0.008, 8, 36), band);
    strap.rotation.x = PI / 2;
    strap.scale.set(0.95, 1.12, 1);
    const dial = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.01, 24), steel);
    dial.rotation.z = PI / 2;
    dial.position.x = 0.046;
    g.add(strap, dial);
    g.position.set(0, -LM.fore + 0.05, 0);
    rig.arms[1].elbow.add(g);
    g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  }
  await nextTask();
  // trousers and trainers
  skinned(tw(trunkLoft({ y0: 1.45, y1: 1.98, rows: 24, cols: 64, dens: () => 1, Z: TM.Z, radius: (th, y) => TORSO.R(th, y, 0.012) * lerp(0.45, 1, smooth(1.45, 1.6, y)) })), pants);
  for (const side of [-1, 1]) skinned(trouserLeg(rig, side, 'straight'), pants);
  const { upper, sole } = shoeGeometry('sneaker', LM.ankle[1]);
  for (const side of [-1, 1]) {
    const g = new THREE.Group();
    g.rotation.y = side * 0.1;
    const u = new THREE.Mesh(upper, shoeMat), s = new THREE.Mesh(sole, soleMat);
    u.castShadow = s.castShadow = u.receiveShadow = s.receiveShadow = true;
    g.add(u, s);
    rig.legs[side].foot.add(g);
  }
  stage.precompile?.();
  await nextTask();

  // head: face, skull, ears, hair, beard and glasses (in centimetres), on a neck
  const neck = bone('neck'), head = bone('head'), hips = bone('hips'), spine = bone('spine'), chest = bone('chest'), breath = bone('breath');
  const neckGeo = tube({ top: 0.16, bottom: -0.16, rows: 10, cols: 32, radius: (y) => { const r = lerp(0.116, 0.104, (y + 0.16) / 0.32); return [r, r, 0, 0.012 * (y / 0.16)]; } });
  neckGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(neckGeo.attributes.position.count * 3).fill(1), 3));
  const neckMesh = new THREE.Mesh(neckGeo, skinV);
  neckMesh.position.set(0, 0.09, 0.004);
  neckMesh.castShadow = neckMesh.receiveShadow = true;
  neck.add(neckMesh);
  const headRig = new THREE.Group();
  headRig.scale.setScalar(LM.k * 1.05);
  headRig.position.set(LM.head.x - LM.headPivot[0], LM.head.y - LM.headPivot[1], LM.head.z - LM.headPivot[2]);
  head.add(headRig);
  const S = { ...MAN, skin: H.skin };
  const face = await buildHead(headRig, S, { hairline: paintHairTone(S, sculptor(S), H.hair) });
  await nextTask();
  const shape = headShape(face.sc, S);
  const mesh = (geo, mat, parent = headRig, cast = true) => { const m = new THREE.Mesh(geo, mat); m.castShadow = cast; m.receiveShadow = true; parent.add(m); return m; };
  const skull = mesh(skullGeometry(shape, { y0: -10.6, tint: () => [1, 1, 1] }), skinV);
  const ear = earGeometry();
  for (const s of [-1, 1]) {
    const e = mesh(ear, skin);
    e.position.set(s * (shape.radial(s * PI / 2, -0.9) + 0.2), -0.9, -1.5);
    e.rotation.set(-0.22, s > 0 ? -0.42 : PI + 0.42, 0);
  }
  await nextTask();
  mesh(hairGeometry(shape, { style: SHORT, NC: 132, NR: 36, NRoll: 4 }), hairMaterial({ base: H.hair, dark: [8, 6, 5], light: [52, 40, 32], sheen: 0x2a2018, repeat: [14, 1] }));
  const bt = beardTextures(S, face.sc, H.hair);
  const beard = mesh(beardGeometry(S, face.sc, bt.mask), new THREE.MeshStandardMaterial({ map: bt.color, alphaMap: bt.alpha, alphaTest: 0.5, roughness: 0.85 }), headRig, false);
  beard.morphTargetInfluences = [0];
  const glasses = glassesGroup(S);
  headRig.add(glasses);
  // the shadow of the beard under the jaw and on the neck
  const shadeUnder = (on) => {
    const k = on ? 1 : 0.25;
    const sp = skull.geometry.attributes.position, sc = skull.geometry.attributes.color, v = new THREE.Vector3();
    for (let i = 0; i < sp.count; i++) {
      v.fromBufferAttribute(sp, i);
      const jaw = Math.max(smooth(-7.8, -9.8, v.y) * smooth(-2, 2, v.z), smooth(-0.7, -1.8, v.y) * smooth(-3.2, -2.0, v.z) * smooth(4.2, 5.4, Math.abs(v.x)));
      const d = 1 - 0.74 * k * jaw;
      sc.setXYZ(i, d, d * 0.92, d * 0.88);
    }
    sc.needsUpdate = true;
    const np = neckGeo.attributes.position, nc = neckGeo.attributes.color;
    for (let i = 0; i < np.count; i++) { v.fromBufferAttribute(np, i); const d = 1 - 0.45 * k * smooth(0.02, 0.15, v.y) * smooth(0, 0.1, v.z); nc.setXYZ(i, d, d * 0.97, d * 0.96); }
    nc.needsUpdate = true;
  };
  function look() {
    beard.visible = !!H.beard;
    glasses.visible = !!H.glasses;
    setCloth(shirt, H.shirt);
    shadeUnder(!!H.beard);
  }
  look();

  // an easy target for taps
  const hit = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 3.4, 12), new THREE.MeshBasicMaterial());
  hit.position.y = 1.7;
  hit.visible = false;
  man.add(hit);

  // life: arms from the pose, hands, breathing, a slow shift of weight, glances, blinks
  const poseHand = handPoser(rig), plantLegs = legPlanter(rig, hips);
  const armR = rig.arms[-1], armL = rig.arms[1];
  for (const a of [armR, armL]) a.elbow.rotation.order = 'XZY';
  const REST = { sx: 0.04, sz: 0.1, ex: -0.15, ez: 0, et: 0 };
  const cur = { r: { ...REST }, l: { ...REST } };
  const blink = makeBlinker();
  const life = { sacc: 0, sx: 0, sy: 0, gx: 0, gy: 0 };
  const headPos = new THREE.Vector3();
  let lx = 0, ly = 0, tilt = 0, yaw = 0, lean = 0, act = null;
  const api = { pose: null, man, hit, look, play(type) { act = { type, t: 0, dur: type === 'jump' ? 1 : 2.2 }; } };
  const base = stage.update;
  stage.update = (dt) => {
    base(dt);
    const time = stage.time, still = reduceMotion() ? 0 : 1, g = api.pose || {};
    for (const k of ['r', 'l']) for (const j of ['sx', 'sz', 'ex', 'ez', 'et']) cur[k][j] = damp(cur[k][j], g[k]?.[j] ?? REST[j], 6, dt);
    const r = { ...cur.r }, l = { ...cur.l };
    r.sz += 0.07 + Math.sin(time * 1.3 + 0.5) * 0.015 * still;
    l.sz += 0.07 + Math.sin(time * 1.3 + 1.5) * 0.015 * still;
    let hop = 0, expr = g.expr || 'smile';
    if (act) {
      act.t += dt;
      const p = Math.min(1, act.t / act.dur), w = Math.sin(p * PI);
      if (act.type === 'wave') { l.sx = lerp(l.sx, -0.15, w); l.sz = lerp(l.sz, 2.35, Math.min(1, w * 2)); l.ex = lerp(l.ex, -0.45, w); l.ez = Math.sin(act.t * 11) * 0.35 * w; expr = 'grin'; }
      if (act.type === 'jump') { hop = Math.sin(p * PI) * 0.45; r.sz = lerp(r.sz, 2.5, w); l.sz = lerp(l.sz, 2.5, w); expr = 'happy'; }
      if (p >= 1) act = null;
    }
    const twist = (s, sz) => s * 1.35 * smooth(1.3, 2.2, sz);
    armR.shoulder.rotation.set(r.sx, 0, -r.sz);
    armR.elbow.rotation.set(r.ex, twist(-1, r.sz) + r.et, -r.ez);
    armL.shoulder.rotation.set(l.sx, 0, l.sz);
    armL.elbow.rotation.set(l.ex, twist(1, l.sz) + l.et, l.ez);
    armR.hand.rotation.set(0.04, 0, 0.12);
    armL.hand.rotation.set(0.04, 0, -0.12);
    poseHand(-1, g.hand?.r ?? (r.sz > 1.5 ? 'open' : 'relax'), dt);
    poseHand(1, g.hand?.l ?? (l.sz > 1.5 ? 'open' : 'relax'), dt);

    tilt = damp(tilt, g.tilt || 0, 5, dt);
    yaw = damp(yaw, g.yaw || 0, 5, dt);
    lean = damp(lean, g.lean || 0, 5, dt);
    man.position.x = damp(man.position.x, g.x ?? 0.46, 4, dt);
    man.rotation.y = yaw;
    body.position.set(0, hop, 0);
    body.rotation.set(lean, 0, Math.sin(time * 0.8 + 1) * 0.006 * still);
    const br = Math.sin(time * 1.3 + 0.7) * still;
    breath.scale.set(1 + 0.01 * br, 1 + 0.005 * br, 1 + 0.02 * br);
    chest.position.y = LM.chest[1] - LM.spine[1] + 0.003 * br;
    const shift = Math.sin(time * 0.37 + 2) * still * (act ? 0.3 : 1);
    hips.position.set(0.016 * shift, LM.hips[1] - 0.005 * Math.abs(shift), 0);
    hips.rotation.set(0, 0.02 * shift, 0.025 * shift);
    spine.rotation.set(0.01 * br, -0.015 * shift, -0.035 * shift);
    plantLegs();

    life.sacc -= dt;
    if (life.sacc <= 0) { life.sacc = 0.7 + Math.random() * 2.4; life.sx = (Math.random() - 0.5) * 0.2; life.sy = (Math.random() - 0.5) * 0.1; }
    life.gx = damp(life.gx, life.sx * still, 30, dt);
    life.gy = damp(life.gy, life.sy * still, 30, dt);
    lx = damp(lx, g.lookX ?? stage.pointer.x * 0.6, 4, dt);
    ly = damp(ly, g.lookY ?? stage.pointer.y * 0.6, 4, dt);
    const hx = Math.sin(time * 0.47 + 2) * 0.02 * still, hy = Math.sin(time * 0.33) * 0.015 * still;
    const pitch = -ly * 0.14 + hy, yw = lx * 0.45 + hx, roll = tilt - lx * 0.04;
    neck.rotation.set(pitch * 0.35, yw * 0.35, roll * 0.35);
    head.rotation.set(pitch * 0.65, yw * 0.65, roll * 0.65);
    if (face.expression !== expr) face.setExpression(expr);
    const o = blink(dt);
    const detail = clamp((3.4 - stage.camera.position.distanceTo(head.getWorldPosition(headPos))) / 2.2, 0, 1);
    face.update(dt, { open: [o, o], lookX: lx + life.gx, lookY: ly + life.gy, detail });
    beard.morphTargetInfluences[0] = face.face.morphTargetInfluences[0];
  };
  return api;
}
