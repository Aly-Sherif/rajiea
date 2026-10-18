// The grown-up body: a skeleton with skinned clothes, sleeves, hands with five fingers,
// trousers and shoes. Built from smooth lofted surfaces, so there are no ball joints.
import * as THREE from '../vendor/three.module.min.js';
import { PI, TAU, clamp, lerp, smooth, spline, spread, surface, weldRow, skinWeights, merge, skinMaterial, clothMaterial, poreMap, weave, canvas, tex } from './character-kit.js';

// layout in scene units (one unit is about half a metre); x is her left, z faces the viewer
export const L = {
  head: new THREE.Vector3(0, 3.03, 0.005), k: 0.02,
  hips: [0, 1.7, 0], spine: [0, 1.98, 0], chest: [0, 2.3, 0], neck: [0, 2.745, -0.03], headPivot: [0, 2.965, -0.02],
  shoulder: [0.335, 2.615, -0.012], upper: 0.58, fore: 0.46,
  hip: [0.165, 1.69, 0.005], ankle: [0.118, 0.135, -0.012],
};

// ── torso shape: superellipse rings stacked up the body ──
const T = {
  W: spline([[0.9, 0.36], [1.3, 0.335], [1.52, 0.35], [1.72, 0.362], [1.9, 0.33], [2.06, 0.272], [2.24, 0.278], [2.38, 0.292], [2.48, 0.3], [2.56, 0.322], [2.615, 0.336], [2.665, 0.31], [2.705, 0.24], [2.74, 0.15], [2.77, 0.104], [2.95, 0.098]]),
  F: spline([[0.9, 0.17], [1.3, 0.165], [1.72, 0.168], [2.06, 0.152], [2.24, 0.163], [2.36, 0.185], [2.47, 0.168], [2.58, 0.13], [2.68, 0.1], [2.77, 0.083], [2.95, 0.08]]),
  B: spline([[0.9, 0.18], [1.3, 0.18], [1.62, 0.208], [1.85, 0.178], [2.06, 0.142], [2.3, 0.152], [2.45, 0.163], [2.58, 0.13], [2.68, 0.1], [2.77, 0.086], [2.95, 0.082]]),
  Z: spline([[0.9, 0], [2.06, 0.012], [2.4, 0.004], [2.7, -0.022], [2.95, -0.03]]),
  N: spline([[0.9, 2.2], [2.06, 2.35], [2.4, 2.55], [2.6, 2.8], [2.72, 2.4], [2.8, 2.0]]),
};
export const torsoZ = (y) => T.Z(y);
const superR = (s, c, a, b, n) => 1 / Math.pow(Math.pow(Math.abs(s) / a, n) + Math.pow(Math.abs(c) / b, n), 1 / n);
export function torsoR(th, y, ease = 0) {
  const s = Math.sin(th), c = Math.cos(th);
  let r = superR(s, c, T.W(y) + ease, (c >= 0 ? T.F(y) : T.B(y)) + ease, T.N(y));
  if (c > 0) r += 0.03 * c * Math.exp(-(((Math.abs(r * s) - 0.088) / 0.075) ** 2) - ((y - 2.36) / 0.075) ** 2);
  return r;
}

// a loft round the trunk: rows go up from y0 to y1
function trunkLoft({ y0, y1, rows = 70, cols = 72, radius, dens }) {
  const ys = spread(rows, y0, y1, dens || ((y) => 1 + 1.4 * Math.exp(-(((y - 2.62) / 0.1) ** 2))));
  return surface(cols, rows, (i, j, p) => {
    const th = (i / cols) * TAU - PI, y = ys[j];
    const r = radius(th, y);
    p.set(r * Math.sin(th), y, T.Z(y) + r * Math.cos(th));
    return [i / cols, y / 3];
  }, { wrap: true });
}
// a tube hanging straight down from the origin (rows go down); radius(y, a) → [rx, rz, ox, oz]
function tube({ top, bottom, rows = 48, cols = 28, radius, dens, cap = false }) {
  const ys = spread(rows, top, bottom, dens || (() => 1));
  const geo = surface(cols, rows, (i, j, p) => {
    const a = (i / cols) * TAU - PI, y = ys[j];
    const [rx, rz, ox = 0, oz = 0] = radius(y, a);
    p.set(ox + rx * Math.sin(a), y, oz + rz * Math.cos(a));
    return [i / cols, -y * 2];
  }, { wrap: true, flip: true });
  if (cap) weldRow(geo, 0, new THREE.Vector3(0, 1, 0));
  return geo;
}

// ── hands ──
const FINGERS = [
  { mcp: [0.004, -0.186, 0.05], len: [0.086, 0.05, 0.039], r: [0.0172, 0.0132], spread: 0.07 },
  { mcp: [0.005, -0.193, 0.017], len: [0.094, 0.057, 0.041], r: [0.0178, 0.0138], spread: 0.0 },
  { mcp: [0.004, -0.187, -0.016], len: [0.088, 0.054, 0.04], r: [0.0168, 0.013], spread: -0.06 },
  { mcp: [0.002, -0.173, -0.046], len: [0.068, 0.04, 0.035], r: [0.0145, 0.0112], spread: -0.14 },
];
const THUMB = { cmc: [-0.012, -0.032, 0.036], dir: [-0.24, -0.88, 0.4], len: [0.07, 0.056, 0.047], r: [0.021, 0.0165] };
// finger curl (knuckle, middle, tip) for each finger, thumb curl, and spread
export const HAND_POSES = {
  relax: { f: [[0.25, 0.4, 0.22], [0.32, 0.48, 0.25], [0.38, 0.55, 0.28], [0.45, 0.6, 0.3]], t: [0.15, 0.25, 0.2], s: 0.6 },
  grip: { f: [[1.05, 1.35, 0.7], [1.15, 1.45, 0.75], [1.2, 1.45, 0.75], [1.25, 1.4, 0.7]], t: [0.45, 0.55, 0.4], s: 0.2 },
  open: { f: [[0.05, 0.1, 0.05], [0.04, 0.08, 0.05], [0.06, 0.1, 0.06], [0.1, 0.12, 0.08]], t: [-0.1, 0.05, 0.05], s: 1.3 },
  hold: { f: [[0.7, 0.95, 0.5], [0.85, 1.05, 0.55], [0.95, 1.1, 0.55], [1.05, 1.1, 0.5]], t: [0.35, 0.4, 0.3], s: 0.4 },
};

function fingerTube(len, r, segs = 22, cols = 12) {
  const total = len[0] + len[1] + len[2], j1 = len[0], j2 = len[0] + len[1];
  const prof = (t) => {
    const rr = lerp(r[0], r[1], Math.pow(clamp(t / total, 0, 1), 0.9));
    return rr * (1 + 0.06 * Math.exp(-(((t - j1) / 0.008) ** 2)) + 0.05 * Math.exp(-(((t - j2) / 0.007) ** 2)));
  };
  const tip = r[1], capN = 5;
  const ts = spread(segs, -0.018, total - tip * 0.15, (t) => 1 + 1.5 * Math.exp(-(((t - j1) / 0.01) ** 2)) + 1.5 * Math.exp(-(((t - j2) / 0.01) ** 2)));
  const geo = surface(cols, segs + capN, (i, j, p) => {
    const a = (i / cols) * TAU;
    let t, rr;
    if (j <= segs) { t = ts[j]; rr = prof(t); }
    else { const ang = ((j - segs) / capN) * (PI / 2); t = ts[segs] + Math.sin(ang) * tip * 0.95; rr = prof(ts[segs]) * Math.cos(ang); }
    const ca = Math.cos(a), sa = Math.sin(a);
    // flatter on the back, fuller pads underneath
    const pad = ca < 0 ? 1 + 0.12 * smooth(0.35, 1, t / total) * -ca : 1 - 0.06 * ca;
    p.set(ca * rr * 0.92 * pad, -t, sa * rr * 1.04);
  }, { wrap: true, flip: true });
  weldRow(geo, segs + capN, new THREE.Vector3(0, -1, 0));
  return geo;
}
function nailPatch(len, r) {
  const total = len[0] + len[1] + len[2], L0 = len[2] * 0.62, t0 = total - L0 - r[1] * 0.25;
  return surface(6, 6, (i, j, p) => {
    const a = lerp(-1.05, 1.05, i / 6), t = t0 + (j / 6) * L0;
    const rr = r[1] * (1.03 + 0.05 * Math.sin((j / 6) * PI));
    p.set(Math.cos(a) * rr * 0.95 + 0.0015, -t, Math.sin(a) * rr * 1.06);
  }, { flip: true });
}
// palm, fingers and thumb for one hand; side 1 is her left (+x). Geometry in body space.
function buildHand(side, B, addBone, wristPos) {
  const M = new THREE.Matrix4().makeScale(side, 1, 1);
  const mirrorQ = (q) => new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeRotationFromQuaternion(q).premultiply(M).multiply(M));
  const parts = [], nails = [], chains = [];
  const palm = tube({
    top: 0.07, bottom: -0.205, rows: 30, cols: 28, dens: (y) => 1 + 1.2 * smooth(-0.12, -0.2, y),
    radius: (y, a) => {
      const w = spline([[-0.205, 0.02], [-0.198, 0.058], [-0.185, 0.072], [-0.12, 0.071], [-0.05, 0.064], [-0.01, 0.054], [0.03, 0.05], [0.07, 0.053]])(y);
      const h = spline([[-0.205, 0.008], [-0.198, 0.017], [-0.18, 0.021], [-0.1, 0.025], [-0.03, 0.028], [0.01, 0.03], [0.07, 0.034]])(y);
      const ca = Math.cos(a), sa = Math.sin(a);
      // sa > 0: back of the hand (+x); ca > 0: thumb side (+z)
      const thenar = sa < 0 && ca > 0 ? 0.013 * -sa * ca * Math.exp(-(((y + 0.06) / 0.045) ** 2)) : 0;
      const hypo = sa < 0 && ca < 0 ? 0.006 * sa * ca * Math.exp(-(((y + 0.09) / 0.05) ** 2)) : 0;
      return [h + thenar + hypo, w];
    },
  });
  {
    const p = palm.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i), r = Math.hypot(x, z) || 1;
      const k = Math.pow(Math.pow(Math.abs(x) / r, 2.6) + Math.pow(Math.abs(z) / r, 2.6), -1 / 2.6);
      p.setX(i, x * lerp(1, k, 0.5)); p.setZ(i, z * lerp(1, k, 0.5));
    }
  }
  parts.push({ geo: palm, w: (p) => { const wf = smooth(-0.015, 0.03, p.y); return [[B['fore' + side], wf], [B['hand' + side], 1 - wf]]; } });
  const chain = (name, parent, pos, q0, len, r, kind) => {
    const qb = side > 0 ? q0 : mirrorQ(q0);
    const b0 = addBone(name + 0, parent, [pos[0] * side, pos[1], pos[2]], qb);
    const b1 = addBone(name + 1, name + 0, [0, -len[0], 0]);
    const b2 = addBone(name + 2, name + 1, [0, -len[1], 0]);
    chains.push({ bones: [b0, b1, b2], rest: qb.clone(), kind });
    const geo = fingerTube(len, r), nail = nailPatch(len, r);
    const m = new THREE.Matrix4().compose(new THREE.Vector3(...pos), q0, new THREE.Vector3(1, 1, 1));
    geo.applyMatrix4(m);
    nail.applyMatrix4(m);
    const inv = q0.clone().invert(), j1 = len[0], j2 = len[0] + len[1], v = new THREE.Vector3();
    const w = (p) => {
      const t = -v.set(p.x - pos[0], p.y - pos[1], p.z - pos[2]).applyQuaternion(inv).y;
      const w0 = smooth(-0.012, 0.006, t), w1 = smooth(j1 - 0.007, j1 + 0.007, t), w2 = smooth(j2 - 0.006, j2 + 0.006, t);
      return [[B['hand' + side], 1 - w0], [B[name + 0], w0 - w1], [B[name + 1], w1 - w2], [B[name + 2], w2]];
    };
    parts.push({ geo, w });
    nails.push({ geo: nail, w });
  };
  FINGERS.forEach((f, i) => chain(`f${side}_${i}_`, 'hand' + side, f.mcp, new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -f.spread), f.len, f.r, i));
  {
    const Y = new THREE.Vector3(...THUMB.dir).normalize().negate(), X0 = new THREE.Vector3(0.55, 0, 0.85);
    const X = X0.sub(Y.clone().multiplyScalar(X0.dot(Y))).normalize(), Z = new THREE.Vector3().crossVectors(X, Y);
    chain(`t${side}_`, 'hand' + side, THUMB.cmc, new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, Z)), THUMB.len, THUMB.r, 'thumb');
  }
  const toBody = new THREE.Matrix4().makeTranslation(...wristPos).multiply(M);
  const build = (list) => {
    const g = merge(list.map(({ geo, w }) => {
      geo.deleteAttribute('uv');
      geo.deleteAttribute('normal');
      skinWeights(geo, (i, p) => w(p));
      geo.applyMatrix4(toBody);
      if (side < 0) { const idx = geo.index.array; for (let k = 0; k < idx.length; k += 3) { const t = idx[k + 1]; idx[k + 1] = idx[k + 2]; idx[k + 2] = t; } }
      return geo;
    }));
    g.computeVertexNormals();
    return g;
  };
  return { skinGeo: build(parts), nailGeo: build(nails), chains };
}

// ── shoes, built round the ankle: x across, y up, z forward ──
function shoeGeometry(kind) {
  const soleY = -L.ankle[1], loafer = kind === 'loafer';
  const zs = spread(36, -0.105, 0.39, (z) => 1 + 1.5 * smooth(0.25, 0.39, z) + smooth(-0.06, -0.105, z));
  const W = spline(loafer ? [[-0.105, 0.03], [-0.09, 0.055], [-0.02, 0.062], [0.12, 0.07], [0.24, 0.084], [0.32, 0.078], [0.37, 0.058], [0.39, 0.02]] : [[-0.105, 0.032], [-0.09, 0.058], [-0.02, 0.066], [0.12, 0.074], [0.24, 0.09], [0.32, 0.086], [0.37, 0.066], [0.39, 0.024]]);
  const H = spline(loafer ? [[-0.105, 0.03], [-0.09, 0.1], [-0.02, 0.105], [0.06, 0.1], [0.16, 0.078], [0.26, 0.058], [0.34, 0.044], [0.39, 0.02]] : [[-0.105, 0.04], [-0.09, 0.13], [-0.03, 0.14], [0.05, 0.135], [0.16, 0.1], [0.26, 0.075], [0.34, 0.058], [0.39, 0.025]]);
  const th = loafer ? 0.018 : 0.03;
  const upper = surface(30, 36, (i, j, p) => {
    const a = (i / 30) * PI, z = zs[j], w = W(z), h = H(z), sx = -Math.cos(a), sy = Math.sin(a);
    p.set(sx * w * (1 - 0.08 * sy * sy), soleY + th * 0.8 + Math.pow(sy, 0.75) * h, z);
    return [i / 30, j / 36];
  }, { flip: true });
  const sole = surface(30, 36, (i, j, p) => {
    const a = (i / 30) * TAU, z = zs[j], w = W(z) + 0.005, ca = Math.cos(a), sa = Math.sin(a);
    p.set(ca * w, soleY + th * 0.5 + sa * th * 0.55, z);
    return [i / 30, j / 36];
  }, { wrap: true, flip: true });
  return { upper, sole };
}

// ── the skeleton ──
export function buildSkeleton(body) {
  const bones = [], B = {};
  const addBone = (name, parent, pos, quat) => {
    const b = new THREE.Bone();
    b.name = name;
    b.position.set(...pos);
    if (quat) b.quaternion.copy(quat);
    (parent ? bones[B[parent]] : body).add(b);
    B[name] = bones.length;
    bones.push(b);
    return b;
  };
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  addBone('hips', null, L.hips);
  addBone('spine', 'hips', sub(L.spine, L.hips));
  addBone('chest', 'spine', sub(L.chest, L.spine));
  addBone('breath', 'chest', [0, 0.08, 0.05]);
  addBone('neck', 'chest', sub(L.neck, L.chest));
  addBone('head', 'neck', sub(L.headPivot, L.neck));
  const arms = {}, legs = {}, hands = {};
  for (const side of [-1, 1]) {
    const sh = [L.shoulder[0] * side, L.shoulder[1], L.shoulder[2]];
    const shoulder = addBone('upper' + side, 'chest', sub(sh, L.chest));
    const elbow = addBone('fore' + side, 'upper' + side, [0, -L.upper, 0]);
    const hand = addBone('hand' + side, 'fore' + side, [0, -L.fore, 0]);
    arms[side] = { shoulder, elbow, hand, pos: sh };
    const hp = [L.hip[0] * side, L.hip[1], L.hip[2]], an = [L.ankle[0] * side, L.ankle[1], L.ankle[2]];
    const kn = [lerp(hp[0], an[0], 0.5), lerp(hp[1], an[1], 0.5), lerp(hp[2], an[2], 0.5)];
    const thigh = addBone('thigh' + side, 'hips', sub(hp, L.hips));
    const shin = addBone('shin' + side, 'thigh' + side, sub(kn, hp));
    const foot = addBone('foot' + side, 'shin' + side, sub(an, kn));
    legs[side] = { thigh, shin, foot, hp, kn, an };
    hands[side] = buildHand(side, B, addBone, [sh[0], sh[1] - L.upper - L.fore, sh[2]]);
  }
  body.updateMatrixWorld(true);
  const skeleton = new THREE.Skeleton(bones);
  const bindM = body.matrixWorld.clone();
  const skinned = (geo, mat, { shadow = true, parent = body } = {}) => {
    const m = new THREE.SkinnedMesh(geo, mat);
    m.frustumCulled = false;
    m.castShadow = shadow;
    m.receiveShadow = true;
    parent.add(m);
    m.bind(skeleton, bindM);
    return m;
  };
  return { bones, B, skeleton, skinned, arms, legs, hands };
}

// ── clothes ──
function trunkWeights(B, y) {
  const wh = 1 - smooth(1.82, 2.04, y), wc = smooth(2.1, 2.34, y), ws = Math.max(0, 1 - wh - wc);
  const wn = smooth(2.74, 2.84, y), br = smooth(2.18, 2.36, y) * (1 - smooth(2.55, 2.7, y)) * 0.7, c = wc * (1 - wn);
  return [[B.hips, wh], [B.spine, ws], [B.chest, c * (1 - br)], [B.breath, c * br], [B.neck, wc * wn]];
}
const flareR = (th, y, Wf, Ff, Bf) => { const c = Math.cos(th); return superR(Math.sin(th), c, Wf(y), c >= 0 ? Ff(y) : Bf(y), 2.25); };

function sleeveGeo(side, kind) {
  const loose = kind === 'coat' ? 0.008 : kind === 'knit' ? 0.012 : 0;
  const prof = spline([[0.074, 0], [0.065, 0.036], [0.045, 0.058], [0.01, 0.07], [-0.1, 0.071], [-0.25, 0.066], [-0.45, 0.062], [-0.58, 0.058], [-0.7, 0.058], [-0.85, 0.054], [-0.97, 0.052], [-1.0, 0.052]]);
  return tube({
    top: 0.074, bottom: -1.0, rows: 52, cols: 28, cap: true,
    dens: (y) => 1 + 2.5 * smooth(0.02, 0.074, y) + 0.8 * Math.exp(-(((y + 0.58) / 0.08) ** 2)),
    radius: (y, a) => {
      const top = smooth(0.074, 0.0, y);
      let r = prof(y) + loose * top;
      const ca = Math.cos(a);
      r += (0.0028 * Math.sin(a * 5 + y * 26 + side) + 0.002 * Math.sin(a * 9 - y * 41)) * smooth(-0.1, -0.3, y) * (1 - smooth(-0.88, -0.95, y));
      // creases on the inside of the elbow
      r -= 0.004 * Math.max(0, ca) * Math.exp(-(((y + 0.6) / 0.07) ** 2)) * (0.5 + 0.5 * Math.sin((y + 0.6) * 140));
      // the shoulder sits a touch forward
      return [r * (1 + 0.04 * top), r * (1 - 0.02 * top), 0, 0.004 * top];
    },
  });
}
function legGeo(kind) {
  const len = 1.56;
  const prof = kind === 'wide'
    ? spline([[0.1, 0.122], [0, 0.148], [-0.2, 0.148], [-0.6, 0.152], [-1.0, 0.162], [-1.4, 0.172], [-1.6, 0.176]])
    : spline([[0.1, 0.12], [0, 0.142], [-0.12, 0.138], [-0.35, 0.122], [-0.6, 0.101], [-0.76, 0.089], [-0.86, 0.087], [-1.0, 0.091], [-1.2, 0.078], [-1.42, 0.064], [-1.5, 0.065], [-1.58, 0.069]]);
  const bottom = kind === 'wide' ? -1.625 : -1.58;
  return tube({
    top: 0.1, bottom, rows: 56, cols: 30,
    radius: (y, a) => {
      let r = prof(y);
      if (kind === 'wide') r += (0.011 * Math.sin(a * 6 + 0.5) + 0.006 * Math.sin(a * 11 + 2)) * smooth(-0.15, -1.4, y);
      else {
        r += 0.002 * Math.sin(a * 7 + y * 30) * smooth(-0.2, -0.5, y);
        r += 0.004 * Math.exp(-(((y + 1.47) / 0.05) ** 2)) * (0.6 + 0.4 * Math.sin(a * 5));
        r -= 0.003 * Math.exp(-(((y + 0.78) / 0.04) ** 2)) * Math.max(0, -Math.cos(a));
      }
      const calf = kind === 'wide' ? 0 : -0.01 * Math.exp(-(((y + 1.0) / 0.18) ** 2));
      return [r, r * 0.96, 0, calf];
    },
  });
}

// pocket, lapel and badge helpers sit on the coat surface
function onCoat(R, th, y, lift) {
  const r = R(th, y) + lift;
  return new THREE.Vector3(r * Math.sin(th), y, T.Z(y) + r * Math.cos(th));
}
function patch(R, th0, th1, y0, y1, lift, nu = 10, nv = 8) {
  return surface(nu, nv, (i, j, p) => {
    const th = lerp(th0, th1, i / nu), y = lerp(y0, y1, j / nv);
    const edge = Math.min(i / nu, 1 - i / nu, j / nv, 1 - j / nv);
    p.copy(onCoat(R, th, y, lift * smooth(0, 0.12, edge) + 0.002));
    return [i / nu, j / nv];
  });
}

function badgeTexture(text) {
  const c = canvas(512, 160), g = c.getContext('2d');
  const t = tex(c);
  const draw = () => {
    g.clearRect(0, 0, 512, 160);
    g.fillStyle = '#ff3d8b';
    g.beginPath(); g.roundRect(6, 6, 500, 148, 34); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.18)';
    g.fillRect(6, 6, 500, 50);
    g.fillStyle = '#ffffff';
    g.font = '600 74px Fraunces, Georgia, serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, 256, 86);
    t.needsUpdate = true;
  };
  draw();
  document.fonts?.ready.then(draw);
  return t;
}

// all three outfits; returns groups to show/hide and the materials to recolour
export function dress(rig, { badge = 'Dr. Rajiea', pink = 0xff3d8b } = {}) {
  const { B, skinned, arms, legs } = rig;
  const coatMat = clothMaterial({ color: 0xfbf8f3, roughness: 0.8, sheen: 0.45, sheenRoughness: 0.6, normalMap: weave('twill', [16, 22]), normalScale: 0.35 });
  const cityMat = clothMaterial({ color: 0x242127, roughness: 0.72, sheen: 1, sheenRoughness: 0.42, sheenTint: 0.45, normalMap: weave('jersey', [20, 28]), normalScale: 0.5 });
  const cozyMat = clothMaterial({ color: 0xdedde2, roughness: 0.92, sheen: 0.8, sheenRoughness: 0.7, normalMap: weave('knit', [12, 20]), normalScale: 0.9 });
  const ribMat = clothMaterial({ color: 0xcac9cf, roughness: 0.92, sheen: 0.8, sheenRoughness: 0.7, normalMap: weave('rib', [24, 4]), normalScale: 1 });
  const cuffMat = clothMaterial({ color: pink, roughness: 0.6, sheen: 0.6 });
  const denim = clothMaterial({ color: 0x6f8fc0, roughness: 0.92, sheen: 0.35, sheenRoughness: 0.8, normalMap: weave('denim', [10, 26]), normalScale: 0.8 });
  const blackMat = clothMaterial({ color: 0x1f1d22, roughness: 0.78, sheen: 1, sheenRoughness: 0.4, sheenTint: 0.4, normalMap: weave('jersey', [14, 30]), normalScale: 0.35, side: THREE.DoubleSide });
  const pinkMat = new THREE.MeshPhysicalMaterial({ color: pink, roughness: 0.35, clearcoat: 0.6 });
  const groups = { clinic: new THREE.Group(), city: new THREE.Group(), cozy: new THREE.Group(), jeans: new THREE.Group(), wide: new THREE.Group(), loafer: new THREE.Group(), sneaker: new THREE.Group() };
  for (const k in groups) rig.body.add(groups[k]);
  const tw = (geo) => skinWeights(geo, (i, p) => trunkWeights(B, p.y));

  // white coat: fitted at the chest, falling in soft folds to the knee
  const cW = spline([[0.97, 0.43], [1.3, 0.405], [1.6, 0.385], [1.8, 0.37], [2.0, 0.32], [2.1, 0.2]]);
  const cF = spline([[0.97, 0.235], [1.4, 0.21], [1.8, 0.19], [2.0, 0.16], [2.1, 0.1]]);
  const cB = spline([[0.97, 0.26], [1.4, 0.24], [1.8, 0.215], [2.0, 0.17], [2.1, 0.1]]);
  const coatR = (th, y) => {
    let r = Math.max(torsoR(th, y, 0.022), flareR(th, y, cW, cF, cB));
    const low = smooth(1.98, 1.2, y);
    r += low * (0.012 * Math.sin(th * 7 + 1.3) + 0.007 * Math.sin(th * 12 + 0.4) + 0.004 * Math.sin(th * 19)) * (0.4 + (1.9 - y) * 0.7);
    r += 0.004 * smooth(-0.01, 0.02, th - 0.03) * smooth(2.25, 2.15, y);
    return r;
  };
  const coat = skinned(tw(trunkLoft({ y0: 0.97, y1: 2.83, rows: 80, cols: 84, radius: coatR })), coatMat, { parent: groups.clinic });
  // lapels: two soft folds from the neck to the first button
  const lapel = (side) => surface(14, 5, (i, j, p) => {
    const u = i / 14, v = j / 5;
    const y = lerp(2.74, 2.19, u);
    const th0 = side * lerp(0.42, 0.015, Math.pow(u, 0.9));
    const width = lerp(0.2, 0.0, Math.pow(u, 1.4)) * (1 - 0.35 * Math.exp(-(((u - 0.28) / 0.05) ** 2)));
    const th = th0 + side * width * v;
    p.copy(onCoat(coatR, th, y, 0.006 + 0.004 * Math.sin(v * PI)));
    return [u, v];
  }, { flip: side < 0 });
  for (const s of [-1, 1]) skinned(tw(lapel(s)), coatMat, { parent: groups.clinic });
  // pockets with pink trims, buttons, and the name badge
  for (const s of [-1, 1]) {
    skinned(tw(patch(coatR, s * 0.42, s * 0.82, 1.42, 1.64, 0.007)), coatMat, { parent: groups.clinic });
    skinned(tw(patch(coatR, s * 0.42, s * 0.82, 1.62, 1.655, 0.012, 10, 2)), cuffMat, { parent: groups.clinic });
  }
  skinned(tw(patch(coatR, 0.22, 0.52, 2.08, 2.22, 0.006)), coatMat, { parent: groups.clinic });
  const btnGeo = new THREE.CylinderGeometry(0.014, 0.015, 0.008, 20);
  btnGeo.rotateX(PI / 2);
  for (const y of [2.15, 1.93, 1.71, 1.49]) {
    const p = onCoat(coatR, 0.03, y, 0.004);
    const g = btnGeo.clone().translate(p.x, p.y, p.z + 0.002);
    skinned(tw(g), pinkMat, { parent: groups.clinic, shadow: false });
  }
  {
    const g = patch(coatR, 0.1, 0.66, 2.232, 2.276, 0.006, 12, 3);
    const badgeMesh = skinned(tw(g), new THREE.MeshStandardMaterial({ map: badgeTexture(badge), transparent: true, roughness: 0.4 }), { parent: groups.clinic, shadow: false });
    badgeMesh.userData.badge = true;
  }
  // city: a long black tunic
  const tW = spline([[1.27, 0.4], [1.5, 0.38], [1.75, 0.368], [1.95, 0.3], [2.05, 0.2]]);
  const tF = spline([[1.27, 0.215], [1.6, 0.19], [1.95, 0.16], [2.05, 0.1]]);
  const tB = spline([[1.27, 0.235], [1.6, 0.22], [1.95, 0.17], [2.05, 0.1]]);
  const tunicR = (th, y) => Math.max(torsoR(th, y, 0.012), flareR(th, y, tW, tF, tB)) + smooth(1.9, 1.3, y) * (0.008 * Math.sin(th * 6 + 0.7) + 0.005 * Math.sin(th * 11 + 2));
  skinned(tw(trunkLoft({ y0: 1.27, y1: 2.83, rows: 70, cols: 80, radius: tunicR })), cityMat, { parent: groups.city });
  // cozy: a chunky jumper with a ribbed hem
  const jumperR = (th, y) => torsoR(th, y, 0.03) + 0.004 * Math.sin(th * 9 + y * 14) * smooth(2.2, 1.7, y);
  skinned(tw(trunkLoft({ y0: 1.56, y1: 2.83, rows: 64, cols: 80, radius: jumperR })), cozyMat, { parent: groups.cozy });
  skinned(tw(trunkLoft({ y0: 1.47, y1: 1.585, rows: 6, cols: 80, radius: (th, y) => torsoR(th, y, 0.024) - 0.004 })), ribMat, { parent: groups.cozy });

  // sleeves for each outfit, with cuffs
  const sleeveSet = (kind, mat, cuff, group) => {
    for (const side of [-1, 1]) {
      const a = arms[side], geo = sleeveGeo(side, kind);
      geo.translate(...a.pos);
      skinWeights(geo, (i, p) => {
        const y = p.y - a.pos[1], wf = smooth(-0.5, -0.66, y);
        const ws = smooth(-0.02, 0.06, y) * 0.0;
        return [[B['upper' + side], 1 - wf - ws], [B['fore' + side], wf], [B.chest, ws]];
      });
      skinned(geo, mat, { parent: group });
      if (cuff) {
        const c = new THREE.Mesh(new THREE.CylinderGeometry(0.0635, 0.0625, kind === 'knit' ? 0.07 : 0.05, 28, 1, true), cuff);
        c.position.set(0, -L.fore + (kind === 'knit' ? 0.075 : 0.065), 0);
        c.castShadow = true;
        a.elbow.add(c);
        group.userData.cuffs = [...(group.userData.cuffs || []), c];
      }
    }
  };
  sleeveSet('coat', coatMat, cuffMat, groups.clinic);
  sleeveSet('fit', cityMat, null, groups.city);
  sleeveSet('knit', cozyMat, ribMat, groups.cozy);

  // trousers: a seat that closes between the legs, and two legs
  const seat = (ease, mat, group) => {
    const g = trunkLoft({ y0: 1.47, y1: 2.12, rows: 26, cols: 64, dens: () => 1, radius: (th, y) => torsoR(th, y, ease) * lerp(0.45, 1, smooth(1.47, 1.62, y)) });
    skinWeights(g, (i, p) => trunkWeights(B, p.y));
    skinned(g, mat, { parent: group });
  };
  seat(0.004, denim, groups.jeans);
  seat(0.012, blackMat, groups.wide);
  for (const [kind, mat, group] of [['jeans', denim, groups.jeans], ['wide', blackMat, groups.wide]]) {
    for (const side of [-1, 1]) {
      const lg = legs[side], geo = legGeo(kind);
      const dir = new THREE.Vector3(lg.an[0] - lg.hp[0], lg.an[1] - lg.hp[1], lg.an[2] - lg.hp[2]);
      const len = dir.length();
      dir.normalize();
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir);
      geo.scale(1, len / 1.555, 1);
      const pos = geo.attributes.position, tmp = new THREE.Vector3(), t = [];
      for (let i = 0; i < pos.count; i++) t.push(-pos.getY(i) / len);
      geo.applyQuaternion(q);
      geo.translate(...lg.hp);
      skinWeights(geo, (i) => {
        const u = t[i], wk = smooth(0.44, 0.56, u), wh = 1 - smooth(-0.04, 0.1, u);
        return [[B.hips, wh], [B['thigh' + side], (1 - wh) * (1 - wk)], [B['shin' + side], (1 - wh) * wk]];
      });
      skinned(geo, mat, { parent: group });
    }
  }
  // shoes ride on the feet
  const loaferMat = new THREE.MeshPhysicalMaterial({ color: 0x6b4226, roughness: 0.42, clearcoat: 0.5, clearcoatRoughness: 0.35, normalMap: weave('leather', [6, 6]), normalScale: new THREE.Vector2(0.3, 0.3) });
  const loaferSole = new THREE.MeshStandardMaterial({ color: 0x2c1d14, roughness: 0.7 });
  const sneakMat = new THREE.MeshPhysicalMaterial({ color: 0xf4f1ec, roughness: 0.55, sheen: 0.4, normalMap: weave('leather', [5, 5]), normalScale: new THREE.Vector2(0.25, 0.25) });
  const sneakSole = new THREE.MeshStandardMaterial({ color: 0xe9e3da, roughness: 0.8 });
  const shoeMats = { loafer: loaferMat, sneaker: sneakMat };
  for (const kind of ['loafer', 'sneaker']) {
    const { upper, sole } = shoeGeometry(kind);
    for (const side of [-1, 1]) {
      const f = legs[side].foot, g = new THREE.Group();
      g.rotation.y = side * 0.1;
      const u = new THREE.Mesh(upper, shoeMats[kind]), s = new THREE.Mesh(sole, kind === 'loafer' ? loaferSole : sneakSole);
      u.castShadow = s.castShadow = true;
      u.receiveShadow = s.receiveShadow = true;
      g.add(u, s);
      f.add(g);
      groups[kind].userData.parts = [...(groups[kind].userData.parts || []), g];
    }
  }
  return { groups, mats: { coatMat, cityMat, cozyMat, ribMat, cuffMat, denim, blackMat, loaferMat, sneakMat } };
}
