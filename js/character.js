// The 3D Rajiea (three outfits) and Little Rajiea, built from simple shapes.
// No photos are used anywhere — everything here is drawn in code.
import * as THREE from '../vendor/three.module.min.js';

const PI = Math.PI;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const damp = (a, b, k, dt) => lerp(a, b, 1 - Math.exp(-k * dt));
const smooth = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
const windowed = (p, edge) => smooth(0, edge, p) * (1 - smooth(1 - edge, 1, p));
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const COL = {
  skin: 0xfbe3d4,
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

// A soft fabric edge that follows exactly where the face meets the hijab.
function faceFrame(F, center, radius, tube, mat, sy = 1) {
  const pts = [];
  for (let k = 0; k < 72; k++) {
    const th = (k / 72) * PI * 2;
    const at = (t) => {
      const u = Math.cos(th) * F.a * t, v = Math.sin(th) * F.b * t;
      const ze = F.c.z + F.d * Math.sqrt(Math.max(0, 1 - t * t));
      const dy = F.c.y + v - center.y;
      const zs = Math.sqrt(Math.max(0, radius * radius - u * u - (dy / sy) ** 2));
      return { u, v, ze, diff: ze - zs };
    };
    let lo = 0, hi = 1;
    for (let it = 0; it < 30; it++) { const m = (lo + hi) / 2; if (at(m).diff > 0) lo = m; else hi = m; }
    const p = at(lo);
    const pt = new THREE.Vector3(p.u * jaw(p.v, F.b), F.c.y + p.v, p.ze);
    const n = pt.clone().sub(center).normalize();
    pts.push(pt.addScaledVector(n, tube * 0.35));
  }
  const curve = new THREE.CatmullRomCurve3(pts, true);
  const m = new THREE.Mesh(new THREE.TubeGeometry(curve, 144, tube, 12, true), mat);
  m.castShadow = true;
  return m;
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

function badgeTexture(text) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 192;
  const g = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c);
  const draw = () => {
    g.clearRect(0, 0, 512, 192);
    g.fillStyle = '#ff3d8b';
    g.beginPath();
    g.roundRect(8, 8, 496, 176, 60);
    g.fill();
    g.fillStyle = '#ffffff';
    g.font = '600 80px Fraunces, Georgia, serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(text, 256, 100);
    tex.needsUpdate = true;
  };
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  draw();
  document.fonts?.ready.then(draw);
  return tex;
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
  // a little purple toy with a pink face, like the one in the baby photo
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
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);
  const canvas = renderer.domElement;
  canvas.setAttribute('role', 'img');

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);

  scene.add(new THREE.HemisphereLight(0xfff5f8, 0xead6ca, 1.5));
  const key = new THREE.DirectionalLight(0xffffff, 2.3);
  key.position.set(3, 6.5, 5);
  key.target.position.set(0, lookY * 0.75, 0);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -3, right: 3, top: shadowTop, bottom: -1.5, near: 1, far: 20 });
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.02;
  scene.add(key, key.target);
  const rim = new THREE.DirectionalLight(0xff7ab0, 1.6);
  rim.position.set(-4, 3, -4);
  scene.add(rim);
  const fill = new THREE.DirectionalLight(0xffe6d1, 0.7);
  fill.position.set(-3, 2, 4);
  scene.add(fill);

  const base = new THREE.Group();
  add(base, new THREE.CylinderGeometry(1.25, 1.32, 0.28, 72), std(COL.beige, { roughness: 0.8 }), [0, -0.14, 0]);
  add(base, new THREE.TorusGeometry(1.25, 0.04, 12, 120), std(COL.pink, { roughness: 0.4 }), [0, 0, 0], [PI / 2, 0, 0]);
  add(base, new THREE.CylinderGeometry(1.5, 1.56, 0.16, 72), std(COL.brown, { roughness: 0.75 }), [0, -0.36, 0]);
  base.traverse((o) => (o.castShadow = false));
  base.scale.set(podium, 1, podium);
  scene.add(base);

  const stage = { renderer, scene, camera, canvas, W: 1, H: 1, time: 0, update: null, afterRender: null };

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
  const vis = { inView: true, tab: !document.hidden };
  function frame() {
    if (!running) return;
    const dt = Math.min(clock.getDelta(), 1 / 20);
    stage.time += dt;
    stage.update?.(dt);
    stage.stepView(dt);
    renderer.render(scene, camera);
    stage.afterRender?.();
    requestAnimationFrame(frame);
  }
  const sync = () => {
    const want = vis.inView && vis.tab;
    if (want && !running) { running = true; clock.getDelta(); requestAnimationFrame(frame); }
    else if (!want) running = false;
  };
  new IntersectionObserver(([e]) => { vis.inView = e.isIntersecting; sync(); }).observe(container);
  document.addEventListener('visibilitychange', () => { vis.tab = !document.hidden; sync(); });
  stage.start = sync;
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

// a gentle jaw: the face narrows a little toward the chin
const jaw = (v, b) => 1 - 0.16 * Math.pow(Math.max(0, -v / b), 1.6);

function humanFace(head, F, r) {
  const sclera = std(0xfffcf8, { roughness: 0.3 });
  const irisMat = std(0x5e331b, { roughness: 0.25 });
  const pupilMat = std(0x140a05, { roughness: 0.2 });
  const shine = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const lash = std(0x22140c, { roughness: 0.5 });
  const crease = std(0xe6b39b, { roughness: 0.7 });
  const lowLash = new THREE.MeshBasicMaterial({ color: 0x8a5a48, transparent: true, opacity: 0.55, depthWrite: false });
  const browMat = std(0x3b2416, { roughness: 0.7 });
  const blush = new THREE.MeshBasicMaterial({ color: COL.pinkSoft, transparent: true, opacity: 0.32, depthWrite: false });
  const freckle = new THREE.MeshBasicMaterial({ color: COL.freckle, transparent: true, opacity: 0.55, depthWrite: false });
  const onFace = (obj, u, v, lift) => placeOnFace(F, obj, u * jaw(v, F.b), v, lift);
  const eyes = [], happyEyes = [];
  for (const side of [-1, 1]) {
    const socket = onFace(new THREE.Group(), 0.1 * side, 0.028, -r * 0.2);
    head.add(socket);
    const lid = new THREE.Group();
    socket.add(lid);
    add(lid, new THREE.SphereGeometry(r, 24, 16), sclera, [0, 0, 0], [0, 0, 0], [1.4, 0.78, 0.4], false);
    const look = new THREE.Group();
    lid.add(look);
    add(look, new THREE.SphereGeometry(r * 0.58, 20, 14), irisMat, [0, -r * 0.02, r * 0.28], [0, 0, 0], [1, 1, 0.3], false);
    add(look, new THREE.SphereGeometry(r * 0.27, 16, 10), pupilMat, [0, -r * 0.02, r * 0.41], [0, 0, 0], [1, 1, 0.3], false);
    add(look, new THREE.SphereGeometry(r * 0.12, 10, 8), shine, [r * 0.18, r * 0.18, r * 0.5], [0, 0, 0], [1, 1, 0.4], false);
    add(look, new THREE.SphereGeometry(r * 0.06, 8, 6), shine, [-r * 0.16, -r * 0.18, r * 0.5], [0, 0, 0], [1, 1, 0.4], false);
    add(lid, new THREE.TorusGeometry(r * 1.36, r * 0.15, 6, 24, PI * 0.86), lash, [0, -r * 0.1, r * 0.08], [0, 0, PI * 0.07], [1, 0.62, 1], false);
    add(lid, new THREE.CapsuleGeometry(r * 0.09, r * 0.42, 4, 8), lash, [r * 1.34 * side, r * 0.24, r * 0.08], [0, 0, -1.05 * side], [1, 1, 1], false);
    add(lid, new THREE.TorusGeometry(r * 1.3, r * 0.05, 4, 20, PI * 0.6), lowLash, [0, r * 0.12, r * 0.12], [0, 0, PI * 1.2], [1, 0.55, 1], false);
    eyes.push({ look, lid });
    const crs = add(socket, new THREE.TorusGeometry(r * 1.45, r * 0.07, 4, 24, PI * 0.7), crease, [0, r * 0.12, r * 0.05], [0, 0, PI * 0.15], [1, 0.62, 1], false);
    const happy = add(socket, new THREE.TorusGeometry(r * 1.1, r * 0.15, 8, 24, PI), lash, [0, -r * 0.3, r * 0.3], [0, 0, 0], [1, 0.6, 1], false);
    happy.visible = false;
    happyEyes.push({ happy, crs });
    const brow = onFace(new THREE.Group(), 0.104 * side, 0.1, 0.002);
    add(brow, new THREE.TorusGeometry(r * 1.65, r * 0.2, 6, 20, PI * 0.6), browMat, [0, -r * 0.62, 0], [0, 0, PI * 0.2 - 0.12 * side], [1, 0.4, 0.5], false);
    head.add(brow);
    head.add(onFace(new THREE.Mesh(new THREE.CircleGeometry(r * 1.35, 24), blush), 0.15 * side, -0.07, 0.004));
    for (const [u, v] of [[0.04, -0.03], [0.058, -0.045], [0.075, -0.026], [0.09, -0.05], [0.052, -0.062], [0.11, -0.035]]) {
      head.add(onFace(new THREE.Mesh(new THREE.CircleGeometry(r * 0.1, 8), freckle), u * side, v, 0.003));
    }
  }
  // nose: soft bridge, rounded tip, small nostrils
  const bridge = onFace(new THREE.Group(), 0, -0.012, -r * 0.08);
  add(bridge, new THREE.CapsuleGeometry(r * 0.22, r * 1.0, 4, 8), std(COL.skin, { roughness: 0.55 }), [0, 0, 0], [0, 0, 0], [1, 1, 0.7], false);
  head.add(bridge);
  const tip = onFace(new THREE.Group(), 0, -0.058, -r * 0.2);
  add(tip, new THREE.SphereGeometry(r * 0.55, 16, 12), std(COL.skin, { roughness: 0.55 }), [0, 0, 0], [0, 0, 0], [1.05, 0.85, 0.8], false);
  for (const s of [-1, 1]) add(tip, new THREE.SphereGeometry(r * 0.13, 8, 6), std(0xc98a7a), [s * r * 0.3, -r * 0.33, r * 0.2], [0, 0, 0], [1.2, 0.6, 0.5], false);
  head.add(tip);
  // lips: a cupid's bow, a fuller lower lip and a soft smile line
  const mouth = onFace(new THREE.Group(), 0, -0.142, 0.001);
  head.add(mouth);
  const upperLip = std(0xd47a87, { roughness: 0.4 });
  const lowerLip = std(0xe0939d, { roughness: 0.35 });
  const smile = new THREE.Group();
  for (const s of [-1, 1]) add(smile, new THREE.SphereGeometry(r * 0.72, 16, 10), upperLip, [s * r * 0.42, r * 0.12, -r * 0.08], [0, 0, -0.18 * s], [1.15, 0.42, 0.35], false);
  add(smile, new THREE.SphereGeometry(r * 0.9, 16, 10), lowerLip, [0, -r * 0.5, -r * 0.06], [0, 0, 0], [1.5, 0.55, 0.4], false);
  add(smile, new THREE.TorusGeometry(r * 1.55, r * 0.06, 6, 24, PI * 0.9), std(0xa84b5c), [0, r * 1.1, r * 0.08], [0, 0, PI * 1.05], [1, 0.75, 1], false);
  mouth.add(smile);
  const grin = new THREE.Group();
  add(grin, new THREE.CircleGeometry(r * 1.55, 28, PI, PI), std(0x7a2236, { roughness: 0.6 }), [0, r * 0.25, 0.001], [0, 0, 0], [1, 0.85, 1], false);
  add(grin, new THREE.BoxGeometry(r * 2.4, r * 0.42, 0.002), std(0xffffff, { roughness: 0.3 }), [0, r * 0.06, 0.002], [0, 0, 0], [1, 1, 1], false);
  for (const s of [-1, 1]) add(grin, new THREE.SphereGeometry(r * 0.72, 16, 10), upperLip, [s * r * 0.5, r * 0.4, -r * 0.08], [0, 0, -0.1 * s], [1.2, 0.35, 0.35], false);
  add(grin, new THREE.SphereGeometry(r * 0.9, 16, 10), lowerLip, [0, -r * 1.25, -r * 0.08], [0, 0, 0], [1.55, 0.45, 0.35], false);
  grin.visible = false;
  mouth.add(grin);
  let expression = 'smile';
  return {
    eyes,
    blush,
    setExpression(name) {
      if (expression === name) return;
      expression = name;
      smile.visible = name === 'smile';
      grin.visible = name !== 'smile';
      eyes.forEach((e) => (e.lid.visible = name !== 'happy'));
      happyEyes.forEach((h) => { h.happy.visible = name === 'happy'; h.crs.visible = name !== 'happy'; });
    },
  };
}

export function createRajiea(container, { bubble, lines = [], badge = 'Dr. Rajiea', view } = {}) {
  const FULL = { dist: 9.4, camY: 2.1, lookY: 1.78 };
  const CLOSE = { dist: 2.4, camY: 2.95, lookY: 2.92 };
  const stage = createStage(container, { ...FULL, podium: 0.78, shadowTop: 4, ...view });
  const { scene } = stage;
  stage.canvas.setAttribute('aria-label', '3D Rajiea. Drag to turn her, tap her for a surprise.');

  const char = new THREE.Group();
  const body = new THREE.Group();
  char.add(body);
  scene.add(char);

  const skin = std(COL.skin, { roughness: 0.6 });
  const topMat = std(COL.coat, { roughness: 0.72 });
  const cuffMat = std(COL.pink, { roughness: 0.5 });
  const pink = std(COL.pink, { roughness: 0.45 });
  const shoeMat = std(COL.shoe, { roughness: 0.5 });
  const hijabMat = new THREE.MeshPhysicalMaterial({
    color: 0x26222a, roughness: 0.82, sheen: 1, sheenRoughness: 0.45, sheenColor: new THREE.Color(0x6a6070), side: THREE.DoubleSide,
  });
  const torso = (pts, sx = 1.25, sz = 0.8) => add(body, lathe(pts), topMat, [0, 0, 0], [0, 0, 0], [sx, 1, sz]);

  // Legs: slim jeans, or wide black trousers for the city look
  const jeans = new THREE.Group(), wide = new THREE.Group();
  body.add(jeans, wide);
  const denim = std(COL.jeans, { roughness: 0.85 });
  const black = std(0x1d1b20, { roughness: 0.8, side: THREE.DoubleSide });
  add(jeans, new THREE.SphereGeometry(0.2, 24, 16), denim, [0, 1.58, 0], [0, 0, 0], [1.1, 0.62, 0.75]);
  add(wide, new THREE.SphereGeometry(0.21, 24, 16), black, [0, 1.58, 0], [0, 0, 0], [1.1, 0.65, 0.78]);
  for (const x of [-0.1, 0.1]) {
    add(jeans, new THREE.CylinderGeometry(0.1, 0.068, 1.5, 16), denim, [x, 0.84, 0]);
    add(wide, new THREE.CylinderGeometry(0.115, 0.16, 1.52, 18, 1, true), black, [x * 1.1, 0.82, 0]);
    add(body, new THREE.SphereGeometry(0.075, 18, 12), shoeMat, [x, 0.05, 0.05], [0, 0, 0], [1, 0.7, 1.9]);
  }

  // Tops: white coat (clinic) or a shorter top (city / cozy)
  const coat = torso([[0, 0.92], [0.24, 0.92], [0.25, 1.0], [0.22, 1.4], [0.18, 1.8], [0.2, 2.1], [0.23, 2.38], [0.2, 2.55], [0.1, 2.65], [0, 2.67]]);
  const coatBits = new THREE.Group();
  body.add(coatBits);
  add(coatBits, new THREE.TorusGeometry(0.25, 0.012, 8, 64), pink, [0, 0.96, 0], [PI / 2, 0, 0], [1.25, 0.8, 1]);
  for (const x of [-0.15, 0.15]) {
    const pocket = new THREE.Group();
    pocket.position.set(x, 1.22, 0.172);
    pocket.rotation.y = x * 2.2;
    add(pocket, new THREE.BoxGeometry(0.12, 0.1, 0.012), std(COL.coatShade, { roughness: 0.8 }));
    add(pocket, new THREE.BoxGeometry(0.12, 0.016, 0.016), pink, [0, 0.05, 0.002]);
    coatBits.add(pocket);
  }
  for (const y of [1.3, 1.55, 1.8]) add(coatBits, new THREE.SphereGeometry(0.016, 10, 8), pink, [0, y, y < 1.5 ? 0.18 : 0.148]);
  const badgeMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.056), new THREE.MeshStandardMaterial({ map: badgeTexture(badge), transparent: true, roughness: 0.5 }));
  badgeMesh.position.set(0.11, 2.12, 0.172);
  badgeMesh.rotation.y = 0.3;
  coatBits.add(badgeMesh);
  const top = torso([[0, 1.48], [0.2, 1.48], [0.205, 1.56], [0.18, 1.8], [0.2, 2.1], [0.23, 2.38], [0.2, 2.55], [0.1, 2.65], [0, 2.67]]);
  const rib = add(body, new THREE.TorusGeometry(0.205, 0.02, 8, 64), cuffMat, [0, 1.5, 0], [PI / 2, 0, 0], [1.3, 0.9, 1]);

  // Hijab wrap: hugs the neck and stops at the collar
  add(body, lathe([[0.1, 2.9], [0.14, 2.74], [0.155, 2.62], [0.17, 2.56], [0.19, 2.53], [0.17, 2.5]]), hijabMat, [0, 0, 0], [0, 0, 0], [1.05, 1, 1]);

  // City: scarf ends with a fringe, and a brown crossbody bag
  const scarf = new THREE.Group();
  body.add(scarf);
  for (const [x, len, tilt] of [[-0.09, 0.62, 0.05], [0.07, 0.5, -0.04]]) {
    const tail = new THREE.Group();
    tail.position.set(x, 2.55, 0.17);
    tail.rotation.set(-0.08, 0, tilt);
    add(tail, new THREE.BoxGeometry(0.11, len, 0.02), hijabMat, [0, -len / 2, 0]);
    for (let i = 0; i < 6; i++) add(tail, new THREE.CylinderGeometry(0.004, 0.003, 0.05, 4), hijabMat, [-0.045 + i * 0.018, -len - 0.022, 0], [0, 0, (i - 2.5) * 0.05], [1, 1, 1], false);
    scarf.add(tail);
  }
  const bag = new THREE.Group();
  body.add(bag);
  const leather = std(0x7a4a2c, { roughness: 0.55 });
  const bagBody = new THREE.Group();
  bagBody.position.set(0.28, 1.58, 0.08);
  bagBody.rotation.y = 0.5;
  add(bagBody, new THREE.BoxGeometry(0.15, 0.12, 0.05), leather);
  add(bagBody, new THREE.BoxGeometry(0.152, 0.055, 0.054), std(0x5f3820, { roughness: 0.5 }), [0, 0.035, 0.002]);
  bag.add(bagBody);
  add(bag, new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.28, 1.64, 0.08), new THREE.Vector3(0.15, 1.9, 0.17), new THREE.Vector3(-0.06, 2.2, 0.185), new THREE.Vector3(-0.2, 2.42, 0.13), new THREE.Vector3(-0.24, 2.52, 0),
  ]), 32, 0.009, 6), leather);

  // Arms with elbows
  function makeArm(side) {
    const shoulder = new THREE.Group();
    shoulder.position.set(0.27 * side, 2.47, 0);
    add(shoulder, new THREE.SphereGeometry(0.075, 16, 12), topMat, [0, 0, 0]);
    add(shoulder, new THREE.CapsuleGeometry(0.062, 0.4, 6, 12), topMat, [0, -0.24, 0]);
    const elbow = new THREE.Group();
    elbow.position.set(0, -0.48, 0);
    shoulder.add(elbow);
    add(elbow, new THREE.CapsuleGeometry(0.055, 0.34, 6, 12), topMat, [0, -0.2, 0]);
    add(elbow, new THREE.TorusGeometry(0.052, 0.016, 8, 20), cuffMat, [0, -0.39, 0], [PI / 2, 0, 0]);
    add(elbow, new THREE.SphereGeometry(0.052, 16, 12), skin, [0, -0.47, 0], [0, 0, 0], [0.85, 1.25, 0.6]);
    const hand = new THREE.Group();
    hand.position.set(0, -0.47, 0.01);
    elbow.add(hand);
    body.add(shoulder);
    return { shoulder, elbow, hand };
  }
  const armR = makeArm(-1); // her right, on the viewer's left
  const armL = makeArm(1);
  add(armL.elbow, new THREE.TorusGeometry(0.05, 0.008, 8, 20), goldMat(), [0, -0.415, 0], [PI / 2, 0, 0]);

  // Props
  const brush = new THREE.Group();
  add(brush, new THREE.CylinderGeometry(0.024, 0.028, 0.5, 12), pink, [0, 0.08, 0]);
  add(brush, new THREE.BoxGeometry(0.06, 0.12, 0.03), std(0xffffff, { roughness: 0.3 }), [0, 0.38, 0]);
  add(brush, new THREE.BoxGeometry(0.05, 0.1, 0.05), std(0x9fd8ff, { roughness: 0.9 }), [0, 0.385, 0.035]);
  add(brush, new THREE.SphereGeometry(0.03, 12, 8), std(0xffffff, { roughness: 0.4 }), [0, 0.4, 0.075], [0, 0, 0], [0.9, 1.5, 0.8]);
  armL.hand.add(brush);
  const cup = new THREE.Group();
  add(cup, new THREE.CylinderGeometry(0.05, 0.04, 0.14, 20), std(0xffffff, { roughness: 0.45 }), [0, 0.05, 0.03]);
  add(cup, new THREE.CylinderGeometry(0.049, 0.044, 0.05, 20), std(0xb07f5c, { roughness: 0.8 }), [0, 0.045, 0.03]);
  add(cup, new THREE.CylinderGeometry(0.054, 0.054, 0.02, 20), pink, [0, 0.13, 0.03]);
  armL.hand.add(cup);
  const phone = new THREE.Group();
  add(phone, new THREE.BoxGeometry(0.09, 0.18, 0.014), std(0xe8213f, { roughness: 0.35 }), [0, 0.06, 0.02]);
  add(phone, new THREE.BoxGeometry(0.035, 0.035, 0.008), std(0x2b2b33, { roughness: 0.3 }), [-0.018, 0.12, 0.03]);
  armR.hand.add(phone);

  // Head: hijab, face with a fabric edge, human-style features
  const head = new THREE.Group();
  head.position.set(0, 2.66, 0);
  body.add(head);
  const HC = new THREE.Vector3(0, 0.36, 0);
  add(head, new THREE.SphereGeometry(0.34, 48, 32), hijabMat, HC.toArray(), [0, 0, 0], [1, 1.1, 1]);
  const FACE = { c: new THREE.Vector3(0, 0.315, 0.16), a: 0.255, b: 0.33, d: 0.25 };
  const faceGeo = new THREE.SphereGeometry(1, 56, 40);
  {
    const pos = faceGeo.attributes.position;
    for (let k = 0; k < pos.count; k++) {
      const y = pos.getY(k);
      if (y < 0) { pos.setX(k, pos.getX(k) * jaw(y * FACE.b, FACE.b)); pos.setZ(k, pos.getZ(k) * (1 - 0.05 * y * y)); }
    }
    faceGeo.computeVertexNormals();
  }
  add(head, faceGeo, skin, FACE.c.toArray(), [0, 0, 0], [FACE.a, FACE.b, FACE.d]);
  head.add(faceFrame(FACE, HC, 0.34, 0.02, hijabMat, 1.1));
  add(head, new THREE.SphereGeometry(0.016, 12, 10), new THREE.MeshPhysicalMaterial({ color: 0xfff6ee, roughness: 0.15, clearcoat: 1 }), [-0.24, 0.24, 0.24]);
  const face = humanFace(head, FACE, 0.04);

  // invisible hit area so taps on her slim figure are easy
  const hit = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 3.5, 12), new THREE.MeshBasicMaterial());
  hit.position.y = 1.75;
  hit.visible = false;
  char.add(hit);

  const floats = floaterSet(scene, [
    ['tooth', -1.5, 2.9, -0.3, 0.85], ['tooth', 1.55, 1.5, 0.2, 0.85], ['tooth', 1.15, 3.55, -1.0, 0.85],
    ['heart', -1.25, 1.2, 0.5, 0.85], ['heart', 1.45, 2.85, -0.3, 0.85], ['heart', -1.9, 3.7, -1.4, 0.85], ['heart', 0.65, 4.0, -1.1, 0.85],
    ['spark', -0.75, 3.85, 0.3, 0.85], ['spark', 1.95, 0.6, -0.8, 0.85], ['spark', -2.0, 2.0, -1.2, 0.85], ['spark', 0.95, 0.35, 0.9, 0.85], ['spark', -0.85, 0.3, 1.1, 0.85],
  ]);

  const DUR = { wave: 2.2, jump: 1.0, spin: 1.3, dance: 3.2, wink: 1.1, floss: 3.2, candy: 2.4, sneeze: 1.7, dizzy: 2.6, blush: 2.4 };
  let outfit = 'clinic';
  const cur = { r: { ...REST }, l: { ...POSES.clinic.l } };
  let action = null, idleTimer = 0, lookX = 0, lookY = 0;
  const blink = makeBlinker();
  const say = speech(bubble);
  const randomLine = picker(lines);
  const qa = new THREE.Quaternion(), qb = new THREE.Quaternion();
  const upright = (prop) => { prop.parent.getWorldQuaternion(qa); body.getWorldQuaternion(qb); prop.quaternion.copy(qa.invert().multiply(qb)); };

  function play(type) { action = { type, t: 0, dur: DUR[type] }; idleTimer = 0; }
  function setHijab(hex) {
    hijabMat.color.set(hex);
    hijabMat.sheenColor.set(hex).lerp(new THREE.Color(0xffffff), 0.35);
  }
  function setOutfit(name) {
    outfit = OUTFITS[name] ? name : 'clinic';
    const o = OUTFITS[outfit];
    setHijab(o.hijab);
    topMat.color.set(o.top);
    cuffMat.color.set(o.cuff);
    coat.visible = coatBits.visible = o.coat;
    top.visible = !o.coat;
    rib.visible = !!o.rib;
    top.scale.set(o.rib ? 1.36 : 1.25, 1, o.rib ? 0.9 : 0.8);
    jeans.visible = o.legs === 'jeans';
    wide.visible = o.legs === 'wide';
    shoeMat.color.set(o.shoes);
    brush.visible = o.prop === 'brush';
    cup.visible = o.prop === 'cup';
    phone.visible = o.prop === 'phone';
    scarf.visible = !!o.scarf;
    bag.visible = !!o.bag;
    idleTimer = 0;
    return o;
  }
  setOutfit('clinic');

  stage.update = (dt) => {
    const time = stage.time;
    idleTimer += dt;
    const pose = POSES[OUTFITS[outfit].pose];
    for (const k of ['r', 'l']) for (const j of ['sx', 'sz', 'ex']) cur[k][j] = damp(cur[k][j], pose[k][j], 6, dt);
    const r = { ...cur.r, ez: 0 }, l = { ...cur.l, ez: 0 };
    r.sz += Math.sin(time * 1.6) * 0.02;
    l.sz += Math.sin(time * 1.6 + 1) * 0.02;
    let hop = 0, squash = 1, extraYaw = 0, sway = Math.sin(time * 0.8) * 0.012, tilt = 0, expr = 'smile', wink = false;
    let hipX = 0, lean = 0, nod = 0, squint = 1, blushing = 0;
    const blend = (arm, to, w) => { for (const j in to) arm[j] = lerp(arm[j], to[j], w); };

    if (action) {
      action.t += dt;
      const p = clamp(action.t / action.dur, 0, 1), a = action.t;
      switch (action.type) {
        case 'wave': {
          const w = windowed(p, 0.18);
          blend(r, { sx: -0.1, sz: 2.45, ex: -0.35, ez: Math.sin(a * 12) * 0.45 }, w);
          tilt = 0.1 * w; expr = 'grin'; break;
        }
        case 'jump': {
          if (p < 0.2) squash = 1 - 0.07 * Math.sin((p / 0.2) * PI * 0.5);
          else if (p < 0.78) {
            const q = (p - 0.2) / 0.58, s = Math.sin(q * PI);
            hop = s * 0.6; squash = 1 + 0.04 * s;
            blend(r, { sx: 0, sz: 2.6, ex: -0.2 }, s); blend(l, { sx: 0, sz: 2.6, ex: -0.2 }, s);
          } else squash = 1 - 0.06 * Math.sin(((p - 0.78) / 0.22) * PI);
          expr = 'happy'; break;
        }
        case 'spin': {
          extraYaw = easeInOut(p) * PI * 2; hop = Math.sin(p * PI) * 0.2;
          const w = windowed(p, 0.2);
          blend(r, { sz: 1.3, ex: -0.1 }, w); blend(l, { sz: 1.3, ex: -0.1 }, w);
          expr = 'happy'; break;
        }
        case 'dance': {
          const b = a * 8.5, w = windowed(p, 0.1);
          sway = Math.sin(b) * 0.07 * w; hop = Math.abs(Math.sin(b)) * 0.08 * w;
          blend(r, { sx: 0, sz: 2.3 + Math.sin(b) * 0.4, ex: -0.6 }, w); blend(l, { sx: 0, sz: 2.3 - Math.sin(b) * 0.4, ex: -0.6 }, w);
          tilt = Math.sin(b) * 0.12 * w; expr = Math.sin(a * 2.2) > 0 ? 'happy' : 'grin'; break;
        }
        case 'wink': { wink = p > 0.1 && p < 0.75; tilt = 0.12 * windowed(p, 0.25); expr = 'grin'; break; }
        case 'floss': {
          const b = a * 7, w = windowed(p, 0.1), sw = Math.sin(b);
          blend(r, { sx: 0.45 * Math.cos(b), sz: 0.1 - 0.55 * sw, ex: -0.05 }, w);
          blend(l, { sx: -0.45 * Math.cos(b), sz: 0.1 + 0.55 * sw, ex: -0.05 }, w);
          hipX = -0.07 * sw * w; tilt = 0.05 * sw * w; expr = 'grin'; break;
        }
        case 'candy': {
          const w = windowed(p, 0.15);
          blend(r, { sx: -0.55, sz: -0.05, ex: -2.35 }, w); blend(l, { sx: -0.55, sz: -0.05, ex: -2.35 }, w);
          lean = -0.09 * w; tilt = Math.sin(a * 30) * 0.03 * w; expr = 'grin'; break;
        }
        case 'sneeze': {
          if (p < 0.55) { const q = p / 0.55; nod = -0.28 * q; squint = 1 - 0.75 * q; }
          else { const q = (p - 0.55) / 0.45; nod = 0.22 * Math.sin(Math.min(1, q * 3) * PI * 0.5) * (1 - q); hop = 0.05 * Math.sin(q * PI); squint = 0.3 + 0.7 * q; }
          blend(r, { sx: -0.4, sz: -0.05, ex: -2.1 }, windowed(p, 0.2) * 0.8);
          expr = p > 0.55 ? 'grin' : 'smile'; break;
        }
        case 'dizzy': {
          const w = windowed(p, 0.15);
          tilt = Math.sin(a * 6) * 0.16 * w; nod = Math.cos(a * 6) * 0.1 * w; sway = Math.sin(a * 3) * 0.05 * w;
          blend(r, { sz: 0.6, ex: -0.3 }, w); blend(l, { sz: 0.6, ex: -0.3 }, w); expr = 'happy'; break;
        }
        case 'blush': {
          const w = windowed(p, 0.2);
          blend(r, { sx: -0.35, sz: -0.12, ex: -1.0 }, w); blend(l, { sx: -0.35, sz: -0.12, ex: -1.0 }, w);
          tilt = 0.15 * w; blushing = w; expr = 'happy'; break;
        }
      }
      if (action.t >= action.dur) action = null;
    }
    face.setExpression(expr);
    if (!reduceMotion() && !action && idleTimer > 11) play(Math.random() < 0.5 ? 'wave' : 'wink');

    // the right arm mirrors its sideways angle
    armR.shoulder.rotation.set(r.sx, 0, -r.sz);
    armR.elbow.rotation.set(r.ex, 0, -r.ez);
    armL.shoulder.rotation.set(l.sx, 0, l.sz);
    armL.elbow.rotation.set(l.ex, 0, l.ez);
    body.position.set(hipX, hop, 0);
    body.scale.set(1 / Math.sqrt(squash), squash, 1 / Math.sqrt(squash));
    body.rotation.set(lean, 0, sway);
    face.blush.opacity = 0.32 + blushing * 0.5;
    scarf.children.forEach((t, i) => (t.rotation.x = -0.08 - Math.sin(time * 1.8 + i) * 0.03 - hop * 0.3));
    char.rotation.y = stage.stepTurn(dt) + extraYaw;
    lookX = damp(lookX, stage.pointer.x, 5, dt);
    lookY = damp(lookY, stage.pointer.y, 5, dt);
    head.rotation.set(-lookY * 0.14 + nod, lookX * 0.45, tilt + sway * 0.5 - lookX * 0.04);
    char.updateMatrixWorld(true);
    upright(brush); upright(cup); upright(phone);
    const open = blink(dt);
    face.eyes.forEach((e, i) => {
      e.lid.scale.y = (wink && i === 1 ? 0.08 : open) * squint;
      e.look.position.set(lookX * 0.008, lookY * 0.004, 0);
    });
    floats.update(time, dt, lookX);
  };
  const headTop = new THREE.Vector3(0, 0.85, 0);
  stage.afterRender = () => stage.bubbleAt(bubble, head, headTop);

  let close = false;
  const api = {
    play, say, randomLine, setHijab, setOutfit,
    toggleClose() { close = !close; stage.setView(close ? CLOSE : FULL); return close; },
    onPoke: null, onPop: null, onHold: null,
  };
  stage.onHold = (raycaster) => {
    if (raycaster.intersectObject(char, true).length) api.onHold?.();
  };
  stage.onTap = (raycaster) => {
    const kind = floats.hit(raycaster);
    if (kind) { api.onPop?.(kind); return; }
    if (raycaster.intersectObject(char, true).length) {
      play(['jump', 'spin', 'dance', 'wave', 'wink', 'floss'][Math.floor(Math.random() * 6)]);
      say(randomLine());
      api.onPoke?.();
    }
  };
  stage.start();
  return api;
}

// ════════════════════════════════════════════════════════════
//  Little Rajiea — from the baby photo
// ════════════════════════════════════════════════════════════
export function createLittleRajiea(container, { bubble, lines = [], view } = {}) {
  const stage = createStage(container, { dist: 8.2, camY: 1.55, lookY: 1.2, podium: 0.85, shadowTop: 3.2, ...view });
  const { scene } = stage;
  stage.canvas.setAttribute('aria-label', '3D Little Rajiea. Tap her to make her giggle.');

  const char = new THREE.Group();
  const body = new THREE.Group();
  char.add(body);
  scene.add(char);

  const skin = std(COL.skin, { roughness: 0.62 });
  const navy = std(0x34264a, { roughness: 0.7 });
  const white = std(0xfbf7f2, { roughness: 0.75 });
  const hairMat = std(COL.hair, { roughness: 0.75 });

  // Legs and bare feet
  for (const x of [-0.15, 0.15]) {
    add(body, new THREE.CapsuleGeometry(0.105, 0.16, 6, 12), skin, [x, 0.24, 0]);
    add(body, new THREE.SphereGeometry(0.11, 20, 12), skin, [x, 0.07, 0.05], [0, 0, 0], [1, 0.6, 1.35]);
  }
  // Dress: navy bodice with white trim, white skirt with a navy band
  add(body, lathe([[0, 0.34], [0.5, 0.34], [0.54, 0.4], [0.5, 0.56], [0.44, 0.7], [0.42, 0.72]]), white);
  add(body, new THREE.TorusGeometry(0.5, 0.035, 10, 72), navy, [0, 0.5, 0], [PI / 2, 0, 0]);
  add(body, lathe([[0.43, 0.68], [0.42, 0.82], [0.38, 1.0], [0.3, 1.12], [0.14, 1.18], [0, 1.19]]), navy);
  add(body, new THREE.TorusGeometry(0.16, 0.025, 8, 40), white, [0, 1.165, 0.02], [PI / 2 - 0.1, 0, 0]);

  // Arms (sleeveless) with a gold bangle and the toy
  function makeArm(side) {
    const pivot = new THREE.Group();
    pivot.position.set(0.34 * side, 1.02, 0);
    add(pivot, new THREE.TorusGeometry(0.1, 0.022, 8, 24), white, [0, -0.02, 0], [PI / 2, 0, 0.3 * side]);
    add(pivot, new THREE.CapsuleGeometry(0.085, 0.26, 6, 12), skin, [0, -0.2, 0]);
    add(pivot, new THREE.SphereGeometry(0.09, 20, 12), skin, [0, -0.4, 0]);
    const hand = new THREE.Group();
    hand.position.set(0, -0.4, 0);
    pivot.add(hand);
    body.add(pivot);
    return { pivot, hand };
  }
  const armR = makeArm(-1);
  const armL = makeArm(1);
  add(armL.pivot, new THREE.TorusGeometry(0.085, 0.018, 8, 24), goldMat(), [0, -0.32, 0], [PI / 2, 0, 0]);
  const toy = makeToy();
  toy.rotation.order = 'ZYX';
  armL.hand.add(toy);

  // Head with a short brown bob and bangs
  const head = new THREE.Group();
  head.position.set(0, 1.12, 0);
  body.add(head);
  const FACE = { c: new THREE.Vector3(0, 0.6, 0.36), a: 0.64, b: 0.68, d: 0.52 };
  add(head, new THREE.SphereGeometry(0.8, 48, 32), hairMat, [0, 0.7, -0.05], [0, 0, 0], [1.04, 0.98, 1]);
  add(head, new THREE.SphereGeometry(1, 48, 32), skin, FACE.c.toArray(), [0, 0, 0], [FACE.a, FACE.b, FACE.d]);
  for (const side of [-1, 1]) {
    add(head, new THREE.SphereGeometry(0.3, 24, 16), hairMat, [0.58 * side, 0.38, 0.0], [0, 0, 0], [0.7, 1.05, 1]);
    add(head, new THREE.SphereGeometry(0.09, 16, 10), skin, [0.66 * side, 0.52, 0.12], [0, 0, 0], [0.6, 1, 0.8]);
  }
  for (const [u, v, s] of [[-0.36, 0.5, 1], [-0.18, 0.56, 1.1], [0.0, 0.58, 1.05], [0.18, 0.56, 1.1], [0.36, 0.5, 1]]) {
    const bang = placeOnFace(FACE, new THREE.Group(), u, v, -0.02);
    add(bang, new THREE.SphereGeometry(0.13 * s, 20, 12), hairMat, [0, 0, 0], [0, 0, 0], [1.2, 0.85, 0.55]);
    head.add(bang);
  }
  const face = buildFace(head, FACE, { eyeX: 0.22, size: 0.95, lash: false });
  face.setExpression('grin');

  const floats = floaterSet(scene, [
    ['heart', -1.6, 2.2, -0.4, 0.8], ['heart', 1.7, 1.0, 0.1, 0.7], ['spark', 1.4, 2.6, -0.6], ['spark', -1.8, 0.7, 0.2], ['spark', -0.9, 2.9, -0.8],
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
    body.rotation.z = toddle * 0.06 + Math.sin(t * 18) * 0.03 * g;
    body.position.y = Math.abs(toddle) * 0.04 + Math.abs(Math.sin(t * 9)) * 0.25 * g;
    armR.pivot.rotation.set(-0.15 - g * 0.3, 0, -0.35 - Math.sin(t * 3.2) * 0.12 - g * 1.6);
    armL.pivot.rotation.set(-0.7, 0, 0.3 + Math.sin(t * 3.2 + 1) * 0.08);
    toy.rotation.set(0.7, 0, -0.3 - Math.sin(t * 3.2 + 1) * 0.08 + Math.sin(t * 6) * 0.1);
    face.setExpression(g > 0.1 ? 'happy' : 'grin');
    char.rotation.y = stage.stepTurn(dt);
    lookX = damp(lookX, stage.pointer.x, 5, dt);
    lookY = damp(lookY, stage.pointer.y, 5, dt);
    head.rotation.set(-lookY * 0.14, lookX * 0.4, toddle * 0.08 - lookX * 0.05);
    const open = blink(dt);
    face.eyes.forEach((e) => {
      e.lid.scale.y = open;
      e.look.position.set(lookX * 0.016, lookY * 0.01, 0);
    });
    floats.update(t, dt, lookX);
  };
  const headTop = new THREE.Vector3(0, 1.6, 0);
  stage.afterRender = () => stage.bubbleAt(bubble, head, headTop);

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
