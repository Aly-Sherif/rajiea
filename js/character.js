// The 3D Rajiea (three outfits) and Little Rajiea. Generic, realistic-styled characters
// sculpted and painted entirely in code; no photos are used anywhere.
import * as THREE from '../vendor/three.module.min.js';
import { studioEnvironment, contactShadow, clothMaterial, setCloth, skinMaterial, weave, canvas as makeCanvas, tex, skinWeights, surface } from './character-kit.js';
import { buildHead, ADULT, opening, hijabGeometry, hijabRim } from './character-head.js';
import { L, torsoR, torsoZ, buildSkeleton, dress, HAND_POSES } from './character-body.js';
import { buildChild } from './character-child.js';

const PI = Math.PI;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const damp = (a, b, k, dt) => lerp(a, b, 1 - Math.exp(-k * dt));
const smooth = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
const windowed = (p, edge) => smooth(0, edge, p) * (1 - smooth(1 - edge, 1, p));
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const COL = {
  skin: 0xf7dccb,
  skinShade: 0xf0c3ab,
  freckle: 0xc98f6c,
  coat: 0xfffcf8,
  coatShade: 0xf2e7dc,
  pink: 0xff3d8b,
  pinkSoft: 0xff8fb8,
  lip: 0xd9637c,
  eye: 0x3a2013,
  brow: 0x3b2416,
  hair: 0x5a3520,
  jeans: 0x7393c4,
  shoe: 0x6b4226,
  beige: 0xf3e1cc,
  brown: 0xb07f5c,
  gold: 0xe4b35e,
};

const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0, ...extra });
const goldMat = () => std(COL.gold, { metalness: 1, roughness: 0.25 });

function add(parent, geo, mat, p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1], cast = true) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(...p);
  m.rotation.set(...r);
  m.scale.set(...s);
  m.castShadow = cast;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

function lathe(points, segments = 64, samples = 48) {
  const curve = new THREE.SplineCurve(points.map(([x, y]) => new THREE.Vector2(x, y)));
  return new THREE.LatheGeometry(curve.getPoints(samples), segments);
}

// A face is an ellipsoid poking out of the head (hijab or hair).
// placeOnFace puts a feature on its surface, facing outwards.
const Z = new THREE.Vector3(0, 0, 1);
function placeOnFace(F, obj, u, v, lift = 0) {
  const k = 1 - (u / F.a) ** 2 - (v / F.b) ** 2;
  const zz = F.d * Math.sqrt(Math.max(k, 0));
  const n = new THREE.Vector3(u / F.a ** 2, v / F.b ** 2, zz / F.d ** 2).normalize();
  obj.position.set(F.c.x + u, F.c.y + v, F.c.z + zz).addScaledVector(n, lift);
  obj.quaternion.setFromUnitVectors(Z, n);
  return obj;
}

// Eyes, brows, cheeks, freckles, nose and a mouth that can smile or grin.
function buildFace(head, F, { eyeX = 0.245, size = 1, freckles = false, lash = true } = {}) {
  const eyeMat = std(COL.eye, { roughness: 0.15 });
  const shine = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const lashMat = std(0x1d120c, { roughness: 0.5 });
  const blush = new THREE.MeshBasicMaterial({ color: COL.pinkSoft, transparent: true, opacity: 0.55, depthWrite: false });
  const eyes = [], happyEyes = [];
  const s = size;
  for (const side of [-1, 1]) {
    const socket = placeOnFace(F, new THREE.Group(), eyeX * side, 0.02 * s, -0.03 * s);
    head.add(socket);
    const look = new THREE.Group();
    socket.add(look);
    const lid = new THREE.Group();
    look.add(lid);
    add(lid, new THREE.SphereGeometry(0.1 * s, 32, 20), eyeMat, [0, 0, 0], [0, 0, 0], [0.86, 1.16, 0.5], false);
    add(lid, new THREE.SphereGeometry(0.032 * s, 12, 8), shine, [0.028 * -side * s, 0.048 * s, 0.042 * s], [0, 0, 0], [1, 1, 0.5], false);
    add(lid, new THREE.SphereGeometry(0.016 * s, 10, 8), shine, [0.03 * side * s, -0.045 * s, 0.044 * s], [0, 0, 0], [1, 1, 0.5], false);
    if (lash) {
      add(lid, new THREE.TorusGeometry(0.094 * s, 0.015 * s, 6, 24, PI * 0.82), lashMat, [0, 0.012 * s, 0.02 * s], [0, 0, PI * 0.09], [1, 1.2, 1], false);
      add(lid, new THREE.CapsuleGeometry(0.012 * s, 0.045 * s, 4, 8), lashMat, [0.088 * side * s, 0.08 * s, 0.02 * s], [0, 0, -0.9 * side], [1, 1, 1], false);
    }
    eyes.push({ look, lid });
    const happy = add(socket, new THREE.TorusGeometry(0.075 * s, 0.02 * s, 8, 24, PI), lashMat, [0, -0.01 * s, 0.035 * s], [0, 0, 0], [1, 1.1, 1], false);
    happy.visible = false;
    happyEyes.push(happy);
    const brow = placeOnFace(F, new THREE.Group(), (eyeX + 0.005) * side, 0.215 * s, 0.004);
    add(brow, new THREE.CapsuleGeometry(0.019 * s, 0.12 * s, 4, 10), std(COL.brow), [0, 0, 0], [0, 0, PI / 2 - 0.16 * side], [1, 1, 0.5], false);
    head.add(brow);
    head.add(placeOnFace(F, new THREE.Mesh(new THREE.CircleGeometry(0.085 * s, 28), blush), (eyeX + 0.175 * s) * side, -0.13 * s, 0.008));
    if (freckles) {
      const fm = new THREE.MeshBasicMaterial({ color: COL.freckle, transparent: true, opacity: 0.7, depthWrite: false });
      for (const [u, v] of [[0.13, -0.07], [0.19, -0.1], [0.16, -0.135], [0.24, -0.08]]) {
        head.add(placeOnFace(F, new THREE.Mesh(new THREE.CircleGeometry(0.0085, 10), fm), u * side, v, 0.006));
      }
    }
  }
  head.add(placeOnFace(F, new THREE.Mesh(new THREE.SphereGeometry(0.034 * s, 16, 12), std(COL.skinShade)), 0, -0.1 * s, -0.012));

  const mouth = placeOnFace(F, new THREE.Group(), 0, -0.255 * s, 0.006);
  head.add(mouth);
  const smile = add(mouth, new THREE.TorusGeometry(0.075 * s, 0.017 * s, 8, 28, PI), std(COL.lip, { roughness: 0.4 }), [0, 0.02 * s, 0], [0, 0, PI], [1, 1, 0.6], false);
  const grin = new THREE.Group();
  grin.scale.setScalar(s);
  add(grin, new THREE.CircleGeometry(0.095, 32, PI, PI), std(0x6e1a33, { roughness: 0.6 }), [0, 0.03, 0.002], [0, 0, 0], [1, 1, 1], false);
  add(grin, new THREE.BoxGeometry(0.15, 0.03, 0.004), std(0xffffff, { roughness: 0.3 }), [0, 0.014, 0.005], [0, 0, 0], [1, 1, 1], false);
  add(grin, new THREE.CircleGeometry(0.04, 20, 0, PI), std(0xff7a9c, { roughness: 0.6 }), [0, -0.042, 0.004], [0, 0, 0], [1, 0.8, 1], false);
  grin.visible = false;
  mouth.add(grin);

  let expression = 'smile';
  return {
    setExpression(name) {
      if (expression === name) return;
      expression = name;
      smile.visible = name === 'smile';
      grin.visible = name !== 'smile';
      const happy = name === 'happy';
      eyes.forEach((e) => (e.look.visible = !happy));
      happyEyes.forEach((h) => (h.visible = happy));
    },
    eyes,
  };
}

// Blinking on a random rhythm
function makeBlinker() {
  let t = 0, next = 2.5;
  return (dt) => {
    t += dt;
    if (t <= next) return 1;
    const bp = (t - next) / 0.15;
    if (bp >= 1) { t = 0; next = 2 + Math.random() * 3.5; return 1; }
    return 1 - Math.sin(bp * PI) * 0.92;
  };
}

// ── Little floating friends ──────────────────────────────────
function makeTooth() {
  const g = new THREE.Group();
  const white = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.25, clearcoat: 0.8, clearcoatRoughness: 0.2 });
  add(g, new THREE.SphereGeometry(0.22, 32, 20), white, [0, 0.04, 0], [0, 0, 0], [1.12, 0.86, 0.9]);
  add(g, new THREE.SphereGeometry(0.13, 24, 16), white, [-0.1, 0.17, 0]);
  add(g, new THREE.SphereGeometry(0.13, 24, 16), white, [0.1, 0.17, 0]);
  add(g, new THREE.CapsuleGeometry(0.075, 0.14, 6, 12), white, [-0.1, -0.15, 0], [0, 0, -0.22]);
  add(g, new THREE.CapsuleGeometry(0.075, 0.14, 6, 12), white, [0.1, -0.15, 0], [0, 0, 0.22]);
  const dark = std(0x2a1810, { roughness: 0.2 });
  add(g, new THREE.SphereGeometry(0.024, 12, 8), dark, [-0.075, 0.07, 0.19], [0, 0, 0], [1, 1.2, 0.6], false);
  add(g, new THREE.SphereGeometry(0.024, 12, 8), dark, [0.075, 0.07, 0.19], [0, 0, 0], [1, 1.2, 0.6], false);
  add(g, new THREE.TorusGeometry(0.04, 0.009, 6, 16, PI), std(COL.lip), [0, 0.025, 0.198], [0, 0, PI], [1, 1, 1], false);
  const blush = new THREE.MeshBasicMaterial({ color: COL.pinkSoft, transparent: true, opacity: 0.7, depthWrite: false });
  add(g, new THREE.CircleGeometry(0.028, 16), blush, [-0.13, 0.03, 0.185], [0, -0.45, 0], [1, 1, 1], false);
  add(g, new THREE.CircleGeometry(0.028, 16), blush, [0.13, 0.03, 0.185], [0, 0.45, 0], [1, 1, 1], false);
  return g;
}

function makeHeart(color = COL.pink) {
  const s = new THREE.Shape();
  s.moveTo(25, 25);
  s.bezierCurveTo(25, 25, 20, 0, 0, 0);
  s.bezierCurveTo(-30, 0, -30, 35, -30, 35);
  s.bezierCurveTo(-30, 55, -10, 77, 25, 95);
  s.bezierCurveTo(60, 77, 80, 55, 80, 35);
  s.bezierCurveTo(80, 35, 80, 0, 50, 0);
  s.bezierCurveTo(35, 0, 25, 25, 25, 25);
  const geo = new THREE.ExtrudeGeometry(s, { depth: 12, bevelEnabled: true, bevelSegments: 6, bevelSize: 9, bevelThickness: 9, curveSegments: 28 });
  geo.center();
  const g = new THREE.Group();
  add(g, geo, new THREE.MeshPhysicalMaterial({ color, roughness: 0.3, clearcoat: 0.6 }), [0, 0, 0], [0, 0, PI], [0.0042, 0.0042, 0.0042]);
  return g;
}

function makeSparkle(color = COL.gold) {
  const s = new THREE.Shape();
  for (let i = 0; i < 8; i++) {
    const r = i % 2 === 0 ? 1 : 0.32;
    const a = (i / 8) * PI * 2 + PI / 2;
    if (i === 0) s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.45, bevelEnabled: true, bevelSegments: 3, bevelSize: 0.08, bevelThickness: 0.12 });
  geo.center();
  const g = new THREE.Group();
  add(g, geo, std(color, { roughness: 0.35, metalness: 0.25, emissive: color, emissiveIntensity: 0.15 }), [0, 0, 0], [0, 0, 0], [0.16, 0.16, 0.16]);
  return g;
}

function makeToy() {
  // a little purple toy with a pink face
  const g = new THREE.Group();
  add(g, new THREE.CylinderGeometry(0.03, 0.03, 0.22, 12), std(0x8e5bd6, { roughness: 0.4 }), [0, 0.05, 0]);
  add(g, new THREE.SphereGeometry(0.1, 24, 16), std(0x8e5bd6, { roughness: 0.35 }), [0, 0.2, 0]);
  add(g, new THREE.CylinderGeometry(0.07, 0.07, 0.03, 24), std(0xff9cc4, { roughness: 0.4 }), [0, 0.2, 0.085], [PI / 2, 0, 0]);
  add(g, new THREE.SphereGeometry(0.035, 12, 8), std(0xffd23f, { roughness: 0.4 }), [0.11, 0.2, 0]);
  return g;
}

function floaterSet(scene, spec) {
  const group = new THREE.Group();
  scene.add(group);
  const items = spec.map(([kind, x, y, z, scale = 1], i) => {
    const obj = kind === 'tooth' ? makeTooth() : kind === 'heart' ? makeHeart(i % 2 ? COL.pink : 0xff9cc4) : makeSparkle(i % 2 ? COL.gold : 0xf6d7b0);
    obj.userData = { kind, base: new THREE.Vector3(x, y, z), phase: i * 1.7, speed: 0.8 + (i % 4) * 0.18, boost: 0, scale };
    obj.traverse((o) => { if (o.isMesh) o.castShadow = false; });
    group.add(obj);
    return obj;
  });
  return {
    items,
    update(time, dt, lookX) {
      const amp = reduceMotion() ? 0.03 : 0.13;
      for (const f of items) {
        const u = f.userData;
        u.boost = Math.max(0, u.boost - dt * 1.4);
        const pop = Math.sin(u.boost * PI);
        f.position.set(u.base.x + lookX * 0.12, u.base.y + Math.sin(time * u.speed + u.phase) * amp + pop * 0.35, u.base.z);
        f.rotation.y = (u.kind === 'spark' ? time * 0.9 : Math.sin(time * 0.6 + u.phase) * 0.6) + u.boost * PI * 2;
        f.rotation.z = u.kind === 'spark' ? Math.sin(time + u.phase) * 0.3 : Math.sin(time * 0.8 + u.phase) * 0.12;
        f.scale.setScalar(u.scale * (1 + pop * 0.25));
      }
    },
    hit(raycaster) {
      const h = raycaster.intersectObjects(items, true)[0];
      if (!h) return null;
      let o = h.object;
      while (o.parent && !items.includes(o)) o = o.parent;
      o.userData.boost = 1;
      return o.userData.kind;
    },
  };
}

// ── Shared stage: renderer, lights, podium, framing, drag-to-turn, loop ──
function createStage(container, { dist = 10.4, camY = 2.05, lookY = 1.62, podium = 1, shadowTop = 4.5 } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, matchMedia('(pointer: coarse)').matches ? 1.5 : 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);
  const canvas = renderer.domElement;
  canvas.setAttribute('role', 'img');

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);

  // soft pink studio: image-based fill and reflections, a warm key with one shadow, a pink rim
  scene.environment = studioEnvironment(renderer);
  scene.environmentIntensity = 0.62;
  const key = new THREE.DirectionalLight(0xfff1e6, 2.45);
  key.position.set(4.4, 5.8, 3.8);
  key.target.position.set(0, lookY * 0.75, 0);
  key.castShadow = true;
  const big = !matchMedia('(pointer: coarse)').matches;
  key.shadow.mapSize.set(big ? 2048 : 1024, big ? 2048 : 1024);
  Object.assign(key.shadow.camera, { left: -2.6, right: 2.6, top: shadowTop, bottom: -1.2, near: 1, far: 20 });
  key.shadow.bias = -0.0003;
  key.shadow.normalBias = 0.012;
  scene.add(key, key.target);
  const rim = new THREE.DirectionalLight(0xff86b5, 1.5);
  rim.position.set(-4, 3.5, -4.5);
  scene.add(rim);
  const rim2 = new THREE.DirectionalLight(0xffe0ea, 0.7);
  rim2.position.set(4.5, 3, -3.5);
  scene.add(rim2);

  const base = new THREE.Group();
  add(base, new THREE.CylinderGeometry(1.25, 1.32, 0.28, 72), std(COL.beige, { roughness: 0.8 }), [0, -0.14, 0]);
  add(base, new THREE.TorusGeometry(1.25, 0.04, 12, 120), std(COL.pink, { roughness: 0.4 }), [0, 0, 0], [PI / 2, 0, 0]);
  add(base, new THREE.CylinderGeometry(1.5, 1.56, 0.16, 72), std(COL.brown, { roughness: 0.75 }), [0, -0.36, 0]);
  base.traverse((o) => (o.castShadow = false));
  base.scale.set(podium, 1, podium);
  scene.add(base);

  const stage = { renderer, scene, camera, canvas, W: 1, H: 1, time: 0, update: null, afterRender: null, spinAcc: 0 };
  stage.snap = () => { renderer.render(scene, camera); return canvas.toDataURL('image/jpeg', 0.9); };

  const view = { dist, camY, lookY };
  const goal = { ...view };
  stage.setView = (v) => Object.assign(goal, v);
  function aim() {
    const aspect = stage.W / stage.H;
    const d = aspect < 1 ? view.dist / Math.pow(aspect, 0.55) : view.dist;
    camera.position.set(0, view.camY, d);
    camera.lookAt(0, view.lookY, 0);
  }
  stage.stepView = (dt) => {
    for (const k in goal) view[k] = damp(view[k], goal[k], 4, dt);
    aim();
  };
  function resize() {
    stage.W = container.clientWidth || 1;
    stage.H = container.clientHeight || 1;
    renderer.setSize(stage.W, stage.H);
    camera.aspect = stage.W / stage.H;
    camera.updateProjectionMatrix();
    aim();
  }
  new ResizeObserver(resize).observe(container);
  resize();

  // pointer position relative to this stage, for looking around
  stage.pointer = { x: 0, y: 0 };
  window.addEventListener('pointermove', (e) => {
    const rect = container.getBoundingClientRect();
    stage.pointer.x = clamp((e.clientX - (rect.left + rect.width / 2)) / (window.innerWidth / 2), -1, 1);
    stage.pointer.y = clamp(-(e.clientY - (rect.top + rect.height * 0.35)) / (window.innerHeight / 2), -1, 1);
  }, { passive: true });

  // drag to turn, with a gentle drift back to the front
  const turn = { yaw: 0, vel: 0, dragging: false, last: -10 };
  stage.turn = turn;
  let lastX = 0, moved = 0;
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let holdTimer = 0, held = false;
  const castAt = (e) => {
    const rect = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    return raycaster;
  };
  canvas.addEventListener('pointerdown', (e) => {
    turn.dragging = true;
    lastX = e.clientX;
    moved = 0;
    turn.vel = 0;
    held = false;
    canvas.setPointerCapture?.(e.pointerId);
    const ev = { clientX: e.clientX, clientY: e.clientY };
    clearTimeout(holdTimer);
    holdTimer = setTimeout(() => { if (moved < 6 && turn.dragging) { held = true; stage.onHold?.(castAt(ev)); } }, 750);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!turn.dragging) return;
    const dx = e.clientX - lastX;
    lastX = e.clientX;
    moved += Math.abs(dx);
    turn.yaw += dx * 0.012;
    turn.vel = dx * 0.012;
    stage.spinAcc += Math.abs(dx * 0.012);
    if (stage.spinAcc > PI * 4) { stage.spinAcc = 0; stage.onSpin?.(); }
    turn.last = stage.time;
    if (moved > 6) canvas.style.cursor = 'grabbing';
  });
  const endDrag = (e) => {
    if (!turn.dragging) return;
    turn.dragging = false;
    canvas.style.cursor = '';
    clearTimeout(holdTimer);
    if (held || moved > 6 || e.type === 'pointercancel') return;
    stage.onTap?.(castAt(e));
  };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);

  stage.stepTurn = (dt) => {
    if (turn.dragging) return turn.yaw;
    turn.yaw += turn.vel;
    turn.vel *= Math.exp(-4 * dt);
    if (stage.time - turn.last > 2.2 && Math.abs(turn.vel) < 0.002) {
      turn.yaw = damp(turn.yaw, Math.round(turn.yaw / (PI * 2)) * PI * 2, 2.2, dt);
    }
    return turn.yaw;
  };

  // bubble that sits above a point in 3D
  stage.bubbleAt = (bubble, obj, local) => {
    if (!bubble || !bubble.classList.contains('show')) return;
    const v = obj.localToWorld(local.clone()).project(camera);
    const x = (v.x * 0.5 + 0.5) * stage.W;
    const y = (-v.y * 0.5 + 0.5) * stage.H;
    bubble.style.transform = `translate(${x}px, ${Math.max(y, 56)}px) translate(-50%, -100%)`;
  };

  // loop — pauses when off-screen or when the tab is hidden
  const clock = new THREE.Clock();
  let running = false;
  const vis = { inView: true, tab: !document.hidden, free: true };
  function frame() {
    if (!running) return;
    const dt = Math.min(clock.getDelta(), 1 / 20);
    stage.time += dt;
    stage.spinAcc *= Math.exp(-0.8 * dt);
    stage.update?.(dt);
    stage.stepView(dt);
    renderer.render(scene, camera);
    stage.afterRender?.();
    requestAnimationFrame(frame);
  }
  let ready = false;
  const sync = () => {
    const want = ready && vis.inView && vis.tab && vis.free;
    if (want && !running) { running = true; clock.getDelta(); requestAnimationFrame(frame); }
    else if (!want) running = false;
  };
  new IntersectionObserver(([e]) => { vis.inView = e.isIntersecting; sync(); }).observe(container);
  document.addEventListener('visibilitychange', () => { vis.tab = !document.hidden; sync(); });
  // rest while a full-screen layer (code pad, story, deck…) is on top
  new MutationObserver(() => {
    const free = !document.querySelector('body > .vault, body > .secret, body > .inbox');
    if (free !== vis.free) { vis.free = free; sync(); }
  }).observe(document.body, { childList: true });
  // first start: compile every shader in the background (so the page never freezes), then fade in
  let starting = false;
  stage.start = () => {
    if (ready || starting) return sync();
    starting = true;
    canvas.style.opacity = '0';
    Promise.resolve(renderer.compileAsync?.(scene, camera)).catch(() => {}).then(() => {
      ready = true;
      sync();
      canvas.style.transition = 'opacity 0.6s ease';
      requestAnimationFrame(() => requestAnimationFrame(() => (canvas.style.opacity = '')));
    });
  };
  return stage;
}

function speech(bubble) {
  let timer = null;
  return (text, ms = 2600) => {
    if (!bubble || !text) return;
    bubble.textContent = text;
    bubble.classList.remove('show');
    void bubble.offsetWidth;
    bubble.classList.add('show');
    clearTimeout(timer);
    timer = setTimeout(() => bubble.classList.remove('show'), ms);
  };
}

function picker(lines) {
  let last = -1;
  return () => {
    if (!lines.length) return '';
    let i;
    do i = Math.floor(Math.random() * lines.length); while (lines.length > 1 && i === last);
    last = i;
    return lines[i];
  };
}

// ════════════════════════════════════════════════════════════
//  Rajiea — clinic, city and cozy outfits (human proportions)
// ════════════════════════════════════════════════════════════
export const OUTFITS = {
  clinic: { hijab: '#26222a', top: COL.coat, cuff: COL.pink, coat: true, legs: 'jeans', shoes: COL.shoe, prop: 'brush', pose: 'clinic' },
  city: { hijab: '#6f6a52', top: 0x242127, cuff: 0x242127, coat: false, legs: 'wide', shoes: 0xf4f1ec, prop: 'phone', pose: 'selfie', scarf: true, bag: true },
  cozy: { hijab: '#8e8b92', top: 0xdedde2, cuff: 0xcac9cf, coat: false, legs: 'jeans', shoes: 0xf4f1ec, prop: 'cup', pose: 'hold', rib: true },
};
// shoulder x/z and elbow bend for each arm
const REST = { sx: 0.04, sz: 0.1, ex: -0.15 };
const POSES = {
  clinic: { r: REST, l: { sx: -0.25, sz: 0.12, ex: -1.25 } },
  selfie: { r: { sx: -1.1, sz: 0.45, ex: -1.4 }, l: REST },
  hold: { r: REST, l: { sx: -0.3, sz: 0.1, ex: -1.4 } },
};

// ── props she holds ──
const glossy = (color, extra = {}) => new THREE.MeshPhysicalMaterial({ color, roughness: 0.32, clearcoat: 0.7, clearcoatRoughness: 0.18, ...extra });
function makeBrush() {
  const g = new THREE.Group();
  add(g, lathe([[0, -0.15], [0.016, -0.15], [0.02, -0.12], [0.019, 0.0], [0.015, 0.12], [0.009, 0.2], [0.008, 0.235], [0, 0.236]], 24, 30), glossy(COL.pink), [0, 0, 0]);
  add(g, lathe([[0, -0.1], [0.0205, -0.1], [0.021, -0.02], [0.0195, 0.04], [0, 0.04]], 24, 12), glossy(0xffffff, { roughness: 0.5, clearcoat: 0 }), [0, -0.04, 0], [0, 0, 0], [1.02, 1, 1.05]);
  const head = new THREE.Group();
  head.position.set(0, 0.255, 0.004);
  add(head, new THREE.CapsuleGeometry(0.011, 0.045, 4, 12), glossy(COL.pink), [0, 0, 0], [0, 0, 0], [1.3, 1, 0.75]);
  add(head, new THREE.BoxGeometry(0.024, 0.05, 0.022, 2, 4, 2), new THREE.MeshStandardMaterial({ color: 0xf6fbff, roughness: 0.85 }), [0, 0.002, 0.018]);
  add(head, new THREE.BoxGeometry(0.0245, 0.03, 0.012), new THREE.MeshStandardMaterial({ color: 0x8fd0f5, roughness: 0.85 }), [0, 0.006, 0.026]);
  g.add(head);
  return g;
}
function makeCup() {
  const g = new THREE.Group();
  const ceramic = glossy(0xfbf9f6, { roughness: 0.22, clearcoat: 0.9 });
  add(g, new THREE.LatheGeometry([[0, 0], [0.045, 0], [0.05, 0.006], [0.056, 0.06], [0.064, 0.15], [0.066, 0.163], [0.064, 0.167], [0.06, 0.166], [0.058, 0.15], [0.05, 0.02], [0, 0.018]].map(([x, y]) => new THREE.Vector2(x, y)), 40), ceramic, [0, -0.06, 0]);
  add(g, new THREE.CylinderGeometry(0.0595, 0.0595, 0.035, 32, 1, true), glossy(COL.pink, { roughness: 0.4 }), [0, 0.02, 0], [0, 0, 0], [1.075, 1, 1.075]);
  const brew = add(g, new THREE.CircleGeometry(0.058, 32), new THREE.MeshPhysicalMaterial({ color: 0xb07f5c, roughness: 0.3, clearcoat: 0.5 }), [0, 0.085, 0], [-PI / 2, 0, 0]);
  add(g, new THREE.TorusGeometry(0.03, 0.008, 10, 24, PI * 1.2), ceramic, [0.066, 0.03, 0], [0, 0, -PI * 0.6]);
  g.userData.brew = brew;
  return g;
}
function makePhone() {
  const g = new THREE.Group();
  const shape = new THREE.Shape();
  const w = 0.072, h = 0.146, r = 0.016;
  shape.moveTo(-w + r, -h); shape.lineTo(w - r, -h); shape.quadraticCurveTo(w, -h, w, -h + r); shape.lineTo(w, h - r); shape.quadraticCurveTo(w, h, w - r, h);
  shape.lineTo(-w + r, h); shape.quadraticCurveTo(-w, h, -w, h - r); shape.lineTo(-w, -h + r); shape.quadraticCurveTo(-w, -h, -w + r, -h);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.012, bevelEnabled: true, bevelSize: 0.004, bevelThickness: 0.004, bevelSegments: 3, curveSegments: 6 });
  geo.translate(0, 0, -0.006);
  add(g, geo, glossy(0xe8213f, { roughness: 0.25 }), [0, 0.07, 0.012]);
  add(g, new THREE.BoxGeometry(0.05, 0.05, 0.006), glossy(0x24242a, { roughness: 0.2 }), [-0.03, 0.17, 0.03]);
  for (const [x, y] of [[-0.042, 0.182], [-0.018, 0.182], [-0.042, 0.158]]) add(g, new THREE.CylinderGeometry(0.009, 0.009, 0.006, 16), glossy(0x0d0d10, { roughness: 0.05 }), [x, y, 0.034], [PI / 2, 0, 0]);
  return g;
}

// the city hijab's two long ends with a fringe, lying over the chest
function fringeTexture() {
  const c = makeCanvas(256, 64), g = c.getContext('2d');
  g.lineCap = 'round';
  for (let k = 0; k < 46; k++) {
    const x = (k + 0.5) * (256 / 46) + Math.sin(k * 7.1) * 1.2, len = 50 + Math.sin(k * 3.3) * 8;
    g.strokeStyle = '#fff';
    g.lineWidth = 2.6;
    g.beginPath(); g.moveTo(x, 0); g.quadraticCurveTo(x + Math.sin(k) * 2, len * 0.5, x + Math.sin(k * 1.7) * 3, len); g.stroke();
    g.beginPath(); g.arc(x, 5, 2.6, 0, PI * 2); g.fillStyle = '#fff'; g.fill();
  }
  return tex(c, { srgb: false });
}
function scarfEnds(rig, mat) {
  const group = new THREE.Group();
  rig.body.add(group);
  const fringeMat = mat.clone();
  fringeMat.alphaMap = fringeTexture();
  fringeMat.alphaTest = 0.5;
  fringeMat.normalMap = null;
  const front = (x, y, lift) => {
    let th = 0, r = 0.2;
    for (let i = 0; i < 3; i++) { r = torsoR(th, y, 0.03); th = Math.asin(clamp(x / r, -0.99, 0.99)); }
    return new THREE.Vector3(x, y, torsoZ(y) + r * Math.cos(th) + lift);
  };
  for (const [x0, x1, y1, w, seed] of [[-0.13, -0.16, 1.95, 0.16, 1], [0.1, 0.13, 2.12, 0.15, 2]]) {
    const y0 = 2.55, rows = 30, cols = 10;
    const pt = (u, v, out) => {
      const y = lerp(y0, y1, v), cx = lerp(x0, x1, v) + 0.012 * Math.sin(v * 5 + seed);
      const x = cx + (u - 0.5) * w * (0.9 + 0.15 * v);
      const p = front(x, y, 0.022 + 0.01 * v);
      p.z += 0.012 * Math.sin(u * PI * 3 + seed + v * 2) * (0.4 + v) + 0.01 * Math.sin(u * PI) * v;
      return out.copy(p);
    };
    const geo = surface(cols, rows, (i, j, p) => { pt(i / cols, j / rows, p); return [i / cols * 1.5, j / rows * 4]; }, { flip: true });
    skinWeights(geo, (i, p) => [[rig.B.chest, smooth(1.9, 2.3, p.y)], [rig.B.spine, 1 - smooth(1.9, 2.3, p.y)]]);
    rig.skinned(geo, mat, { parent: group });
    // fringe card under the end
    const fg = surface(cols, 2, (i, j, p) => { pt(i / cols, 1, p); p.y -= (j / 2) * 0.055; p.z += 0.004 * j; return [i / cols, 1 - j / 2]; }, { flip: true });
    skinWeights(fg, () => [[rig.B.spine, 1]]);
    const fm = rig.skinned(fg, fringeMat, { parent: group, shadow: false });
    fm.material.side = THREE.DoubleSide;
  }
  return { group, fringeMat };
}
// a small leather cross-body bag
function crossBag(rig) {
  const group = new THREE.Group();
  rig.body.add(group);
  const leather = new THREE.MeshPhysicalMaterial({ color: 0x7a4a2c, roughness: 0.5, clearcoat: 0.35, clearcoatRoughness: 0.4, normalMap: weave('leather', [3, 3]), normalScale: new THREE.Vector2(0.4, 0.4) });
  const on = (x, y, lift) => { const th = Math.asin(clamp(x / 0.36, -0.99, 0.99)); const r = Math.max(torsoR(th, y, 0.04), 0.3); return new THREE.Vector3(r * Math.sin(th), y, torsoZ(y) + r * Math.cos(th) + lift); };
  const pts = [];
  for (let k = 0; k <= 16; k++) { const t = k / 16; pts.push(on(lerp(0.3, -0.25, t), lerp(1.7, 2.6, t), 0.01)); }
  pts.push(new THREE.Vector3(-0.27, 2.68, 0.02), new THREE.Vector3(-0.28, 2.7, -0.08), new THREE.Vector3(-0.22, 2.55, -0.17));
  const strap = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.01, 6);
    skinWeights(strap, (i, p) => [[rig.B.chest, smooth(1.95, 2.3, p.y)], [rig.B.hips, 1 - smooth(1.95, 2.3, p.y)]]);
  rig.skinned(strap, leather, { parent: group });
  const bagG = new THREE.BoxGeometry(0.2, 0.15, 0.06, 6, 4, 2);
  const p = bagG.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setZ(i, z * (1 - 0.35 * Math.abs(x / 0.1) ** 3)); }
  bagG.computeVertexNormals();
  const c = on(0.33, 1.6, 0.05);
  bagG.rotateY(0.7);
  bagG.translate(c.x, c.y, c.z);
  skinWeights(bagG, () => [[rig.B.hips, 1]]);
  rig.skinned(bagG, leather, { parent: group });
  const flap = new THREE.BoxGeometry(0.205, 0.075, 0.066);
  flap.rotateY(0.7);
  flap.translate(c.x, c.y + 0.04, c.z + 0.002);
  skinWeights(flap, () => [[rig.B.hips, 1]]);
  rig.skinned(flap, new THREE.MeshPhysicalMaterial({ color: 0x5f3820, roughness: 0.45, clearcoat: 0.4 }), { parent: group });
  return group;
}

export function createRajiea(container, { bubble, lines = [], badge = 'Dr. Rajiea', view, fixed = false, extend } = {}) {
  const FULL = { dist: 8.3, camY: 2.15, lookY: 1.86 };
  const CLOSE = { dist: 1.5, camY: 3.06, lookY: 3.0 };
  const stage = createStage(container, { ...FULL, podium: 0.78, shadowTop: 4, ...view });
  const { scene } = stage;
  stage.canvas.setAttribute('aria-label', '3D Rajiea. Drag to turn her, tap her for a surprise.');

  const char = new THREE.Group();
  const body = new THREE.Group();
  char.add(body);
  scene.add(char);
  char.add(contactShadow(1.0, 0.8, 0.5));

  // skeleton, clothes and hands
  const rig = buildSkeleton(body);
  rig.body = body;
  const wardrobe = dress(rig, { badge });
  const { groups, mats } = wardrobe;
  const skinMat = skinMaterial({ color: 0xf1cdb9, roughness: 0.5 });
  const nailMat = new THREE.MeshPhysicalMaterial({ color: 0xf4cbc6, roughness: 0.3, clearcoat: 0.9, clearcoatRoughness: 0.1 });
  for (const side of [-1, 1]) { rig.skinned(rig.hands[side].skinGeo, skinMat); rig.skinned(rig.hands[side].nailGeo, nailMat, { shadow: false }); }
  const bone = (n) => rig.bones[rig.B[n]];
  const neck = bone('neck'), head = bone('head'), hips = bone('hips'), spine = bone('spine'), chest = bone('chest'), breath = bone('breath');
  const armR = rig.arms[-1], armL = rig.arms[1];
  for (const a of [armR, armL]) a.elbow.rotation.order = 'XZY';

  // head: sculpted face, eyes and mouth (built in centimetres)
  const headRig = new THREE.Group();
  const HK = L.k * 1.05;
  headRig.scale.setScalar(HK);
  headRig.position.set(L.head.x - L.headPivot[0], L.head.y - L.headPivot[1], L.head.z - L.headPivot[2]);
  head.add(headRig);
  const fit = opening(undefined, 0.8);
  const face = buildHead(headRig, ADULT, { keep: (x, y) => fit.inside(x, y) });

  // hijab: draped cloth with a soft sheen and a rolled edge round the face
  const hijabMat = clothMaterial({ color: 0x26222a, roughness: 0.9, sheen: 0.85, sheenRoughness: 0.5, sheenTint: 0.42, specularIntensity: 0.18, normalMap: weave('jersey', [26, 26]), normalScale: 0.45, side: THREE.DoubleSide });
  rig.skinned(hijabGeometry(face.sc, { torso: { R: torsoR, Z: torsoZ, shoulder: L.shoulder }, O: L.head, k: HK, B: rig.B }), hijabMat);
  const rim = new THREE.Mesh(hijabRim(face.sc), hijabMat);
  rim.castShadow = true;
  headRig.add(rim);
  const ends = scarfEnds(rig, hijabMat);
  const bag = crossBag(rig);

  // props sit in the palm; they stay upright whatever the arm does
  const grip = (a, side, x, y, z) => { const g = new THREE.Group(); g.position.set(x * side, y, z); a.hand.add(g); return g; };
  const gripL = grip(armL, 1, -0.045, -0.125, 0.0), gripR = grip(armR, -1, -0.045, -0.125, 0.0);
  const brush = makeBrush();
  gripL.add(brush);
  const cup = makeCup();
  const cupHold = new THREE.Group();
  cupHold.position.set(-0.03, -0.02, 0);
  cupHold.add(cup);
  gripL.add(cupHold);
  const brew = cup.userData.brew;
  const phone = makePhone();
  gripR.add(phone);
  const gold = new THREE.MeshPhysicalMaterial({ color: 0xe6b866, metalness: 1, roughness: 0.22, clearcoat: 0.4 });
  const bangle = new THREE.Mesh(new THREE.TorusGeometry(0.052, 0.006, 10, 48), gold);
  bangle.rotation.x = PI / 2;
  bangle.position.set(0.003, -L.fore + 0.03, 0);
  bangle.scale.set(0.84, 1.08, 1);
  armL.elbow.add(bangle);

  // invisible hit area so taps on her are easy
  const hit = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 3.4, 12), new THREE.MeshBasicMaterial());
  hit.position.y = 1.7;
  hit.visible = false;
  char.add(hit);

  const floats = floaterSet(scene, [
    ['tooth', -1.5, 2.9, -0.3, 0.85], ['tooth', 1.55, 1.5, 0.2, 0.85], ['tooth', 1.15, 3.55, -1.0, 0.85],
    ['heart', -1.25, 1.2, 0.5, 0.85], ['heart', 1.45, 2.85, -0.3, 0.85], ['heart', -1.9, 3.7, -1.4, 0.85], ['heart', 0.65, 4.0, -1.1, 0.85],
    ['spark', -0.75, 3.85, 0.3, 0.85], ['spark', 1.95, 0.6, -0.8, 0.85], ['spark', -2.0, 2.0, -1.2, 0.85], ['spark', 0.95, 0.35, 0.9, 0.85], ['spark', -0.85, 0.3, 1.1, 0.85],
  ]);

  const DUR = { wave: 2.2, jump: 1.0, spin: 1.3, dance: 3.2, wink: 1.1, floss: 3.2, candy: 2.4, sneeze: 1.7, dizzy: 2.6, blush: 2.4, selfie: 2.6, matcha: 3.0 };
  let outfit = 'clinic';
  const cur = { r: { ...REST }, l: { ...POSES.clinic.l } }, vel = { r: { sx: 0, sz: 0, ex: 0 }, l: { sx: 0, sz: 0, ex: 0 } };
  let action = null, idleTimer = 0, lookX = 0, lookY = 0;
  const blink = makeBlinker();
  const say = speech(bubble);
  const randomLine = picker(lines);
  const qa = new THREE.Quaternion(), qb = new THREE.Quaternion();
  const upright = (prop) => { prop.parent.getWorldQuaternion(qa); body.getWorldQuaternion(qb); prop.quaternion.copy(qa.invert().multiply(qb)); };

  function play(type) { action = { type, t: 0, dur: DUR[type] }; idleTimer = 0; }
  function setHijab(hex) { setCloth(hijabMat, hex); setCloth(ends.fringeMat, hex); }
  function setOutfit(name) {
    outfit = OUTFITS[name] ? name : 'clinic';
    const o = OUTFITS[outfit];
    setHijab(o.hijab);
    const top = { clinic: mats.coatMat, city: mats.cityMat, cozy: mats.cozyMat }[outfit];
    setCloth(top, o.top);
    setCloth(outfit === 'cozy' ? mats.ribMat : mats.cuffMat, o.cuff);
    for (const k of ['clinic', 'city', 'cozy']) {
      groups[k].visible = k === outfit;
      (groups[k].userData.cuffs || []).forEach((c) => (c.visible = k === outfit));
    }
    groups.jeans.visible = o.legs === 'jeans';
    groups.wide.visible = o.legs === 'wide';
    const shoe = o.shoe || (o.shoes === COL.shoe ? 'loafer' : 'sneaker');
    for (const k of ['loafer', 'sneaker']) groups[k].userData.parts.forEach((g) => (g.visible = k === shoe));
    setCloth(shoe === 'loafer' ? mats.loaferMat : mats.sneakMat, o.shoes);
    ends.group.visible = !!o.scarf;
    bag.visible = !!o.bag;
    idleTimer = 0;
    return o;
  }
  setOutfit('clinic');

  // natural life: breathing, a slow shift of weight, glances and small head moves
  const life = { sacc: 0, sx: 0, sy: 0, gx: 0, gy: 0 };
  const hand = { [-1]: { relax: 1, grip: 0, open: 0, hold: 0 }, [1]: { relax: 1, grip: 0, open: 0, hold: 0 } };
  const qz = new THREE.Quaternion(), qx = new THREE.Quaternion(), ax = new THREE.Vector3(1, 0, 0), az = new THREE.Vector3(0, 0, 1);
  function poseHand(side, goal, dt) {
    const w = hand[side];
    let tot = 0;
    for (const k in w) { w[k] = damp(w[k], k === goal ? 1 : 0, 10, dt); tot += w[k]; }
    const mix = (fn) => { let v = 0; for (const k in w) v += (w[k] / tot) * fn(HAND_POSES[k]); return v; };
    for (const c of rig.hands[side].chains) {
      const curls = c.kind === 'thumb' ? [0, 1, 2].map((j) => mix((P) => P.t[j])) : [0, 1, 2].map((j) => mix((P) => P.f[c.kind][j]));
      const s = mix((P) => P.s);
      if (c.kind === 'thumb') c.bones[0].quaternion.copy(c.rest).multiply(qz.setFromAxisAngle(az, -side * curls[0]));
      else {
        const sp = [0.07, 0, -0.06, -0.14][c.kind];
        c.bones[0].quaternion.setFromAxisAngle(ax, -sp * s).multiply(qz.setFromAxisAngle(az, -side * curls[0]));
      }
      c.bones[1].rotation.set(0, 0, -side * curls[1]);
      c.bones[2].rotation.set(0, 0, -side * curls[2]);
    }
  }
  // two-bone legs keep the feet planted while the hips move
  const v1 = new THREE.Vector3(), v2 = new THREE.Vector3(), vD = new THREE.Vector3(), qh = new THREE.Quaternion(), qk = new THREE.Quaternion(), q3 = new THREE.Quaternion();
  function plantLegs() {
    for (const side of [-1, 1]) {
      const lg = rig.legs[side];
      const l1 = v1.set(lg.kn[0] - lg.hp[0], lg.kn[1] - lg.hp[1], lg.kn[2] - lg.hp[2]).length();
      const l2 = v2.set(lg.an[0] - lg.kn[0], lg.an[1] - lg.kn[1], lg.an[2] - lg.kn[2]).length();
      hips.updateMatrix();
      const H = vD.set(...lg.thigh.position.toArray()).applyMatrix4(hips.matrix);
      const D = H.set(lg.an[0] - H.x, lg.an[1] - H.y, lg.an[2] - H.z);
      const d = Math.min(D.length(), l1 + l2 - 1e-4);
      const bend = PI - Math.acos(clamp((l1 * l1 + l2 * l2 - d * d) / (2 * l1 * l2), -1, 1));
      lg.shin.rotation.set(bend, 0, 0);
      qk.setFromAxisAngle(ax, bend);
      const rest = v1.set(lg.kn[0] - lg.hp[0], lg.kn[1] - lg.hp[1], lg.kn[2] - lg.hp[2]).add(v2.applyQuaternion(qk)).normalize();
      D.normalize().applyQuaternion(qh.copy(hips.quaternion).invert());
      lg.thigh.quaternion.setFromUnitVectors(rest, D);
      lg.foot.quaternion.copy(q3.copy(hips.quaternion).multiply(lg.thigh.quaternion).multiply(qk).invert());
    }
  }

  stage.update = (dt) => {
    const time = stage.time;
    idleTimer += dt;
    const pose = POSES[OUTFITS[outfit].pose];
    for (const k of ['r', 'l']) for (const j of ['sx', 'sz', 'ex']) {
      // springy arms: a gentle start and a soft stop
      const w = 9, a = w * w * (pose[k][j] - cur[k][j]) - 2 * w * vel[k][j];
      vel[k][j] += a * dt;
      cur[k][j] += vel[k][j] * dt;
    }
    // arms sit a touch away from the coat
    const r = { ...cur.r, ez: 0 }, l = { ...cur.l, ez: 0 };
    r.sz += 0.07 + Math.sin(time * 1.3) * 0.015;
    l.sz += 0.07 + Math.sin(time * 1.3 + 1) * 0.015;
    let hop = 0, squash = 1, extraYaw = 0, sway = Math.sin(time * 0.8) * 0.006, tilt = 0, expr = 'smile', wink = false;
    let hipX = 0, lean = 0, nod = 0, squint = 1, blushing = 0, open = { r: 0, l: 0 };
    const blend = (arm, to, w) => { for (const j in to) arm[j] = lerp(arm[j], to[j], w); };

    if (action) {
      action.t += dt;
      const p = clamp(action.t / action.dur, 0, 1), a = action.t;
      switch (action.type) {
        case 'wave': {
          const w = windowed(p, 0.18);
          blend(r, { sx: -0.15, sz: 2.35, ex: -0.45, ez: Math.sin(a * 11) * 0.35 }, w);
          open.r = w; tilt = 0.08 * w; expr = 'grin'; break;
        }
        case 'jump': {
          if (p < 0.2) squash = 1 - 0.05 * Math.sin((p / 0.2) * PI * 0.5);
          else if (p < 0.78) {
            const q = (p - 0.2) / 0.58, s = Math.sin(q * PI);
            hop = s * 0.55; squash = 1 + 0.03 * s;
            blend(r, { sx: 0, sz: 2.5, ex: -0.25 }, s); blend(l, { sx: 0, sz: 2.5, ex: -0.25 }, s);
            open.r = open.l = s;
          } else squash = 1 - 0.045 * Math.sin(((p - 0.78) / 0.22) * PI);
          expr = 'happy'; break;
        }
        case 'spin': {
          extraYaw = easeInOut(p) * PI * 2; hop = Math.sin(p * PI) * 0.18;
          const w = windowed(p, 0.2);
          blend(r, { sz: 1.25, ex: -0.15 }, w); blend(l, { sz: 1.25, ex: -0.15 }, w);
          open.r = open.l = w; expr = 'happy'; break;
        }
        case 'dance': {
          const b = a * 8.5, w = windowed(p, 0.1);
          sway = Math.sin(b) * 0.06 * w; hop = Math.abs(Math.sin(b)) * 0.07 * w;
          blend(r, { sx: 0, sz: 2.25 + Math.sin(b) * 0.35, ex: -0.6 }, w); blend(l, { sx: 0, sz: 2.25 - Math.sin(b) * 0.35, ex: -0.6 }, w);
          open.r = open.l = w; tilt = Math.sin(b) * 0.1 * w; expr = Math.sin(a * 2.2) > 0 ? 'happy' : 'grin'; break;
        }
        case 'wink': { wink = p > 0.1 && p < 0.75; tilt = 0.1 * windowed(p, 0.25); expr = 'grin'; break; }
        case 'floss': {
          const b = a * 7, w = windowed(p, 0.1), sw = Math.sin(b);
          blend(r, { sx: 0.45 * Math.cos(b), sz: 0.12 - 0.45 * sw, ex: -0.08 }, w);
          blend(l, { sx: -0.45 * Math.cos(b), sz: 0.12 + 0.45 * sw, ex: -0.08 }, w);
          hipX = -0.06 * sw * w; tilt = 0.05 * sw * w; expr = 'grin'; break;
        }
        case 'candy': {
          const w = windowed(p, 0.15);
          blend(r, { sx: -0.5, sz: -0.1, ex: -2.2 }, w); blend(l, { sx: -0.5, sz: -0.1, ex: -2.2 }, w);
          lean = -0.07 * w; tilt = Math.sin(a * 30) * 0.025 * w; expr = 'grin'; break;
        }
        case 'sneeze': {
          if (p < 0.55) { const q = p / 0.55; nod = -0.24 * q; squint = 1 - 0.75 * q; }
          else { const q = (p - 0.55) / 0.45; nod = 0.2 * Math.sin(Math.min(1, q * 3) * PI * 0.5) * (1 - q); hop = 0.04 * Math.sin(q * PI); squint = 0.3 + 0.7 * q; }
          blend(r, { sx: -0.45, sz: -0.12, ex: -2.0 }, windowed(p, 0.2) * 0.8);
          expr = p > 0.55 ? 'grin' : 'smile'; break;
        }
        case 'dizzy': {
          const w = windowed(p, 0.15);
          tilt = Math.sin(a * 6) * 0.14 * w; nod = Math.cos(a * 6) * 0.08 * w; sway = Math.sin(a * 3) * 0.04 * w;
          blend(r, { sz: 0.6, ex: -0.3 }, w); blend(l, { sz: 0.6, ex: -0.3 }, w); open.r = open.l = w * 0.6; expr = 'happy'; break;
        }
        case 'selfie': {
          const w = windowed(p, 0.2);
          blend(r, { sx: -1.1, sz: 0.45, ex: -1.4 }, w);
          tilt = -0.12 * w; expr = p > 0.3 ? 'grin' : 'smile';
          if (!action.snapped && p > 0.52) { action.snapped = true; api.onSnap?.(); }
          break;
        }
        case 'matcha': {
          const w = windowed(p, 0.18);
          const sip = smooth(0.3, 0.48, p) * (1 - smooth(0.72, 0.86, p));
          blend(l, { sx: lerp(-0.3, -1.28, sip), sz: lerp(0.1, 0.2, sip), ex: lerp(-1.4, -2.55, sip), ez: lerp(0, -0.28, sip) }, w);
          nod = 0.08 * sip; squint = 1 - 0.85 * sip; expr = 'smile'; break;
        }
        case 'blush': {
          const w = windowed(p, 0.2);
          blend(r, { sx: -0.35, sz: -0.12, ex: -1.0 }, w); blend(l, { sx: -0.35, sz: -0.12, ex: -1.0 }, w);
          tilt = 0.15 * w; blushing = w; expr = 'happy'; break;
        }
      }
      if (action.t >= action.dur) action = null;
    }
    // a held pose set from outside, blended over everything else
    const P = api.pose;
    if (P) {
      const w = P.w ?? 1;
      if (P.r) blend(r, P.r, w);
      if (P.l) blend(l, P.l, w);
      if (P.expr && !action) expr = P.expr;
      tilt += (P.tilt || 0) * w; lean += (P.lean || 0) * w; extraYaw += (P.yaw || 0) * w;
      if (P.r && P.r.sz > 1.5) open.r = Math.max(open.r, w);
      if (P.l && P.l.sz > 1.5) open.l = Math.max(open.l, w);
    }
    if (face.expression !== expr) face.setExpression(expr);
    if (!reduceMotion() && !action && !api.calm && idleTimer > 11) play(Math.random() < 0.5 ? 'wave' : 'wink');

    // arms (her right arm mirrors its sideways angle); palms turn forward when the arm is up
    const twist = (s, sz) => s * 1.35 * smooth(1.3, 2.2, sz);
    armR.shoulder.rotation.set(r.sx, 0, -r.sz);
    armR.elbow.rotation.set(r.ex, twist(-1, r.sz), -r.ez);
    armL.shoulder.rotation.set(l.sx, 0, l.sz);
    armL.elbow.rotation.set(l.ex, twist(1, l.sz), l.ez);
    armR.hand.rotation.set(0.04, 0, 0.12);
    armL.hand.rotation.set(0.04, 0, -0.12);

    // whole body moves, then breathing and weight shift inside it
    const still = reduceMotion() ? 0 : 1;
    body.position.set(hipX, hop, 0);
    body.scale.set(1 / Math.sqrt(squash), squash, 1 / Math.sqrt(squash));
    body.rotation.set(lean, 0, sway);
    const br = Math.sin(time * 1.45) * still;
    breath.scale.set(1 + 0.012 * br, 1 + 0.006 * br, 1 + 0.022 * br);
    chest.position.y = L.chest[1] - L.spine[1] + 0.003 * br;
    const shift = Math.sin(time * 0.42) * still * (action ? 0.3 : 1);
    hips.position.set(0.018 * shift, L.hips[1] - 0.006 * Math.abs(shift), 0);
    hips.rotation.set(0, 0.02 * shift, 0.03 * shift);
    spine.rotation.set(0.01 * br, -0.015 * shift, -0.04 * shift);
    plantLegs();

    char.rotation.y = (fixed ? 0 : stage.stepTurn(dt)) + extraYaw;
    // eyes glance around now and then; the head follows a little slower
    life.sacc -= dt;
    if (life.sacc <= 0) { life.sacc = 0.6 + Math.random() * 2.2; life.sx = (Math.random() - 0.5) * 0.22; life.sy = (Math.random() - 0.5) * 0.12; }
    life.gx = damp(life.gx, life.sx * still, 30, dt);
    life.gy = damp(life.gy, life.sy * still, 30, dt);
    lookX = damp(lookX, P?.lookX ?? stage.pointer.x, 4, dt);
    lookY = damp(lookY, P?.lookY ?? stage.pointer.y, 4, dt);
    const hx = Math.sin(time * 0.53) * 0.02 * still, hy = Math.sin(time * 0.37 + 1) * 0.015 * still;
    const pitch = -lookY * 0.14 + nod + hy, yaw = lookX * 0.45 + hx, roll = tilt + sway * 0.5 - lookX * 0.04 + Math.sin(time * 0.29) * 0.01 * still;
    neck.rotation.set(pitch * 0.35, yaw * 0.35, roll * 0.35);
    head.rotation.set(pitch * 0.65, yaw * 0.65, roll * 0.65);

    const propNow = action?.type === 'selfie' ? 'phone' : action?.type === 'matcha' ? 'cup' : P && 'prop' in P ? P.prop : OUTFITS[outfit].prop;
    brush.visible = propNow === 'brush';
    cup.visible = propNow === 'cup';
    phone.visible = propNow === 'phone';
    brew.material.color.setHex(action?.type === 'matcha' ? 0x9cc46a : 0xb07f5c);
    poseHand(1, open.l > 0.5 ? 'open' : propNow === 'brush' ? 'grip' : propNow === 'cup' ? 'hold' : action?.type === 'candy' ? 'grip' : 'relax', dt);
    poseHand(-1, open.r > 0.5 ? 'open' : propNow === 'phone' ? 'hold' : action?.type === 'candy' || action?.type === 'sneeze' ? 'grip' : 'relax', dt);
    char.updateMatrixWorld(true);
    upright(brush); upright(cupHold); upright(phone);
    const o = blink(dt) * squint;
    face.update(dt, { open: [o, wink ? 0 : o], lookX: lookX + life.gx, lookY: lookY + life.gy, blush: blushing });
    floats.update(time, dt, lookX);
  };
  const headTop = new THREE.Vector3(0, 0.32, 0);
  stage.afterRender = () => stage.bubbleAt(bubble, head, headTop);

  let close = false;
  const api = {
    play, say, randomLine, setHijab, setOutfit,
    toggleClose() { close = !close; stage.setView(close ? CLOSE : FULL); return close; },
    onPoke: null, onPop: null, onHold: null, onSnap: null, onSpin: null,
    snap: () => stage.snap(),
  };
  stage.onSpin = () => api.onSpin?.();
  stage.onHold = (raycaster) => {
    if (raycaster.intersectObject(hit).length) api.onHold?.();
  };
  api.stage = stage;
  api.char = char;
  // let a caller add more to this stage
  if (extend) extend({ THREE, stage, scene, char, body, head, add, lathe, std, COL, buildFace, makeBlinker, placeOnFace, makeHeart, damp, lerp, clamp, reduceMotion, api });
  stage.onTap = (raycaster) => {
    const kind = floats.hit(raycaster);
    if (kind) { api.onPop?.(kind); return; }
    if (raycaster.intersectObject(hit).length) {
      play(['jump', 'spin', 'dance', 'wave', 'wink', 'floss'][Math.floor(Math.random() * 6)]);
      say(randomLine());
      api.onPoke?.();
    }
  };
  stage.start();
  return api;
}

// ════════════════════════════════════════════════════════════
//  Little Rajiea
// ════════════════════════════════════════════════════════════
export function createLittleRajiea(container, { bubble, lines = [], view } = {}) {
  const stage = createStage(container, { dist: 6.7, camY: 1.62, lookY: 1.22, podium: 0.85, shadowTop: 3.2, ...view });
  const { scene } = stage;
  stage.canvas.setAttribute('aria-label', '3D Little Rajiea. Tap her to make her giggle.');

  const char = new THREE.Group();
  const body = new THREE.Group();
  char.add(body);
  char.add(contactShadow(0.9, 0.7, 0.5));
  scene.add(char);
  const kid = buildChild(body);
  const [armR, armL] = kid.arms;
  const { head, face } = kid;
  const toy = makeToy();
  toy.scale.setScalar(0.7);
  toy.position.set(-0.014, -0.07, 0.012);
  toy.rotation.order = 'ZYX';
  armL.hand.add(toy);

  const floats = floaterSet(scene, [
    ['heart', -1.5, 2.2, -0.4, 0.75], ['heart', 1.5, 1.1, 0.1, 0.65], ['spark', 1.3, 2.5, -0.6], ['spark', -1.6, 0.8, 0.2], ['spark', -0.9, 2.8, -0.8],
  ]);

  let giggle = 0;
  let lookX = 0, lookY = 0;
  const blink = makeBlinker();
  const say = speech(bubble);
  const randomLine = picker(lines);

  stage.update = (dt) => {
    const t = stage.time;
    giggle = Math.max(0, giggle - dt);
    const g = giggle > 0 ? Math.sin((1 - giggle / 1.4) * PI) : 0;
    const toddle = reduceMotion() ? 0 : Math.sin(t * 3.2);
    kid.upper.rotation.z = toddle * 0.045 + Math.sin(t * 18) * 0.03 * g;
    body.position.y = Math.abs(Math.sin(t * 9)) * 0.2 * g;
    armR.pivot.rotation.set(-0.12 - g * 0.3, 0, -0.2 - Math.sin(t * 3.2) * 0.06 - g * 1.9);
    armL.pivot.rotation.set(-0.8, 0, 0.18 + Math.sin(t * 3.2 + 1) * 0.04);
    toy.rotation.set(0.75, 0, -0.2 - Math.sin(t * 3.2 + 1) * 0.06 + Math.sin(t * 6) * 0.1);
    face.setExpression(g > 0.1 ? 'happy' : 'smile');
    char.rotation.y = stage.stepTurn(dt);
    lookX = damp(lookX, stage.pointer.x, 5, dt);
    lookY = damp(lookY, stage.pointer.y, 5, dt);
    head.rotation.set(-lookY * 0.14, lookX * 0.4, toddle * 0.06 - lookX * 0.05);
    const o = blink(dt);
    face.update(dt, { open: [o, o], lookX, lookY });
    floats.update(t, dt, lookX);
  };
  stage.afterRender = () => stage.bubbleAt(bubble, head, kid.top);

  const api = {
    giggle() { giggle = 1.4; say(randomLine()); api.onGiggle?.(); },
    onGiggle: null,
  };
  stage.onTap = (raycaster) => {
    if (floats.hit(raycaster)) return;
    if (raycaster.intersectObject(char, true).length) api.giggle();
  };
  stage.start();
  return api;
}
