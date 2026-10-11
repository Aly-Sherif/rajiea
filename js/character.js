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
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, matchMedia('(pointer: coarse)').matches ? 1.5 : 1.75));
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
  const sync = () => {
    const want = vis.inView && vis.tab && vis.free;
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

// ── Head: one smooth sculpted face with painted details, eyes with real lids,
//    and a hijab shell that frames the face and wraps under the chin ──
const HEAD = { c: new THREE.Vector3(0, 0.27, 0), rx: 0.178, ry: 0.245, rz: 0.215 };
const OPEN = { vc: -0.1, a: 0.76, top: 0.73, bot: 0.86 };
const gauss = (u, v, cu, cv, su, sv) => Math.exp(-(((u - cu) / su) ** 2) - ((v - cv) / sv) ** 2);

// how far each facial feature stands out, at face coordinates (u, v)
function relief(u, v, grin = 0) {
  const s = (cu, cv, su, sv) => gauss(u, v, cu, cv, su, sv) + gauss(u, v, -cu, cv, su, sv);
  let d = 0;
  d -= 0.017 * s(0.36, 0.1, 0.17, 0.11);
  d += 0.006 * s(0.35, 0.27, 0.22, 0.07);
  d += 0.009 * s(0.55, -0.1 + grin * 0.03, 0.17, 0.14) * (1 + grin * 0.45);
  d -= 0.006 * s(0.6, -0.42, 0.14, 0.12) * (1 - grin * 0.5);
  const t = clamp((0.1 - v) / 0.32, 0, 1);
  const w = lerp(0.055, 0.08, t);
  const fall = v < -0.22 ? Math.exp(-(((v + 0.22) / 0.04) ** 2)) : 1;
  const top = v > 0.1 ? Math.exp(-(((v - 0.1) / 0.08) ** 2)) : 1;
  d += lerp(0.002, 0.023, t ** 1.4) * Math.exp(-((u / w) ** 2)) * fall * top;
  d += 0.01 * gauss(u, v, 0, -0.205, 0.065, 0.05);
  d += 0.009 * s(0.1, -0.24 + grin * 0.01, 0.048 + grin * 0.008, 0.042);
  const mw = 1 + grin * 0.16;
  d += 0.007 * gauss(u, v, 0, -0.4 + grin * 0.008, 0.15 * mw, 0.038);
  d += 0.009 * gauss(u, v, 0, -0.487 - grin * 0.012, 0.125 * mw, 0.043) * (1 - grin * 0.25);
  d -= (0.004 + grin * 0.012) * gauss(u, v, 0, -0.444 - grin * 0.012, 0.18 * mw, 0.02 + grin * 0.02);
  d -= 0.004 * gauss(u, v, 0, -0.57, 0.11, 0.035);
  d += 0.011 * gauss(u, v, 0, -0.75, 0.16, 0.1);
  d -= grin * 0.003 * s(0.26, -0.42, 0.04, 0.05);
  return d;
}

// the head surface in any direction (dx, dy, dz on a unit sphere)
function basePoint(dx, dy, dz, grin = 0, out = new THREE.Vector3()) {
  let x = dx * HEAD.rx, y = dy * HEAD.ry * (dy < 0 ? 0.88 : 1), z = dz * HEAD.rz;
  if (dy < 0) {
    const t = -dy, front = smooth(-0.3, 0.3, dz);
    x *= 1 - 0.22 * Math.pow(t, 1.6) * front;
    z *= 1 + 0.24 * smooth(0.3, 0.85, t) * smooth(0, 0.4, dz);
  }
  if (dz > 0) z += relief(dx, dy, grin) * smooth(0.05, 0.4, dz);
  return out.set(x, y, z).add(HEAD.c);
}
const surfNormal = (dx, dy, dz, out = new THREE.Vector3()) => out.set(dx / HEAD.rx, dy / HEAD.ry, dz / HEAD.rz).normalize();

function openR(th) {
  const c = Math.cos(th), s = Math.sin(th);
  const a = s < 0 ? OPEN.a * (1 - 0.32 * -s) : OPEN.a;
  const b = s > 0 ? OPEN.top : OPEN.bot;
  return 1 / Math.sqrt((c / a) ** 2 + (s / b) ** 2);
}
const openMask = (u, v) => Math.hypot(u, v - OPEN.vc) / openR(Math.atan2(v - OPEN.vc, u));
const toFront = (u, v) => Math.sqrt(Math.max(0, 1 - u * u - v * v));

// ── painted skin: soft shading, brows, lips, a hint of hair under the hijab ──
function smoothPath(g, pts, closed = false) {
  const n = pts.length;
  g.moveTo(pts[0][0], pts[0][1]);
  for (let i = 0; i < (closed ? n : n - 1); i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    const a = closed || i > 0 ? p0 : p1, d = closed || i < n - 2 ? p3 : p2;
    g.bezierCurveTo(p1[0] + (p2[0] - a[0]) / 6, p1[1] + (p2[1] - a[1]) / 6, p2[0] - (d[0] - p1[0]) / 6, p2[1] - (d[1] - p1[1]) / 6, p2[0], p2[1]);
  }
}
function paintFace(kind) {
  const S = 1024;
  const cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const g = cv.getContext('2d');
  const P = (u, v) => [(u * 0.5 + 0.5) * S, (0.5 - v * 0.5) * S];
  const L = (r) => r * 0.5 * S;
  const spot = (u, v, r, rgb, a, sx = 1, sy = 1, rot = 0) => {
    const [x, y] = P(u, v);
    g.save();
    g.translate(x, y);
    g.rotate(rot);
    g.scale(sx, sy);
    const grd = g.createRadialGradient(0, 0, 0, 0, 0, L(r));
    grd.addColorStop(0, `rgba(${rgb},${a})`);
    grd.addColorStop(1, `rgba(${rgb},0)`);
    g.fillStyle = grd;
    g.beginPath();
    g.arc(0, 0, L(r), 0, PI * 2);
    g.fill();
    g.restore();
  };
  const both = (fn) => { fn(1); fn(-1); };
  if (kind === 'blush') {
    g.fillStyle = '#000';
    g.fillRect(0, 0, S, S);
    both((s) => spot(0.5 * s, -0.17, 0.24, '255,255,255', 1, 1.15, 0.85));
    both((s) => spot(0.3 * s, -0.25, 0.1, '255,255,255', 0.5));
    return cv;
  }
  g.fillStyle = '#f8ddcd';
  g.fillRect(0, 0, S, S);
  // gentle depth toward the hijab edge
  {
    const [x, y] = P(0, -0.08);
    const grd = g.createRadialGradient(x, y, L(0.5), x, y, L(1.02));
    grd.addColorStop(0, 'rgba(176,112,96,0)');
    grd.addColorStop(1, 'rgba(176,112,96,0.38)');
    g.fillStyle = grd;
    g.fillRect(0, 0, S, S);
  }
  spot(0, 0.45, 0.3, '255,246,238', 0.4, 1.4, 0.8);
  both((s) => spot(0.5 * s, -0.22, 0.2, '238,128,128', 0.17, 1.2, 0.9));
  both((s) => spot(0.63 * s, -0.38, 0.18, '186,116,100', 0.13, 0.9, 0.7, 0.4 * s));
  both((s) => spot(0.36 * s, 0.15, 0.16, '178,108,100', 0.2, 1.35, 0.85));
  both((s) => spot(0.39 * s, 0.22, 0.11, '205,140,140', 0.14, 1.4, 0.6));
  both((s) => spot(0.35 * s, -0.03, 0.12, '255,242,234', 0.28, 1.4, 0.55));
  both((s) => spot(0.095 * s, -0.06, 0.09, '192,128,112', 0.1, 0.5, 1.5));
  spot(0, -0.05, 0.07, '255,248,242', 0.4, 0.32, 1.8);
  spot(0, -0.19, 0.035, '255,252,248', 0.45);
  both((s) => spot(0.05 * s, -0.258, 0.027, '112,58,56', 0.75, 1.25, 0.6, 0.45 * s));
  spot(0, -0.285, 0.055, '168,104,94', 0.2, 1.7, 0.55);
  spot(0, -0.73, 0.1, '255,242,234', 0.28);
  spot(0, -0.575, 0.08, '178,108,98', 0.22, 1.7, 0.5);

  // lips
  const grin = kind === 'grin';
  const cy = grin ? -0.428 : -0.439, cx = grin ? 0.25 : 0.225;
  const upperTop = [[-cx, cy], [-0.125, -0.41], [-0.054, -0.386], [0, -0.398], [0.054, -0.386], [0.125, -0.41], [cx, cy]];
  const lowerBot = [[cx, cy], [0.125, -0.503], [0, grin ? -0.543 : -0.531], [-0.125, -0.503], [-cx, cy]];
  const px = (arr) => arr.map(([u, v]) => P(u, v));
  g.save();
  g.filter = 'blur(1.4px)';
  if (!grin) {
    const seam = [[-cx, cy], [-0.105, -0.448], [0, -0.444], [0.105, -0.448], [cx, cy]];
    g.fillStyle = '#c56c76';
    g.beginPath();
    smoothPath(g, px([...upperTop, ...seam.slice().reverse().slice(1, -1)]), true);
    g.fill();
    g.fillStyle = '#d27d86';
    g.beginPath();
    smoothPath(g, px([...seam, ...lowerBot.slice(1, -1)]), true);
    g.fill();
    spot(0, -0.49, 0.06, '255,222,222', 0.4, 1.7, 0.6);
    spot(0, -0.405, 0.03, '255,222,222', 0.25, 1.8, 0.6);
    g.filter = 'blur(0.8px)';
    g.strokeStyle = '#7b3540';
    g.lineWidth = 3.2;
    g.lineCap = 'round';
    g.beginPath();
    smoothPath(g, px(seam));
    g.stroke();
    both((s) => spot((cx + 0.012) * s, cy + 0.004, 0.018, '150,80,80', 0.5));
  } else {
    const openTop = [[-cx, cy], [-0.115, -0.433], [0, -0.429], [0.115, -0.433], [cx, cy]];
    const openBot = [[cx, cy], [0.115, -0.48], [0, -0.5], [-0.115, -0.48], [-cx, cy]];
    g.fillStyle = '#c56c76';
    g.beginPath();
    smoothPath(g, px([...upperTop, ...openTop.slice().reverse().slice(1, -1)]), true);
    g.fill();
    g.fillStyle = '#d27d86';
    g.beginPath();
    smoothPath(g, px([...openBot, ...lowerBot.slice().reverse().slice(1, -1)]), true);
    g.fill();
    spot(0, -0.517, 0.05, '255,222,222', 0.35, 1.8, 0.5);
    g.filter = 'none';
    g.save();
    g.beginPath();
    smoothPath(g, px([...openTop, ...openBot.slice(1, -1)]), true);
    g.clip();
    g.fillStyle = '#5a2130';
    g.fillRect(0, 0, S, S);
    g.fillStyle = '#fbf6f1';
    g.beginPath();
    smoothPath(g, px([[-cx, cy], [-0.115, -0.431], [0, -0.427], [0.115, -0.431], [cx, cy], [0.135, -0.455], [0, -0.463], [-0.135, -0.455]]), true);
    g.fill();
    g.strokeStyle = 'rgba(170,150,150,0.55)';
    g.lineWidth = 1.2;
    for (const u of [-0.14, -0.085, -0.03, 0.03, 0.085, 0.14]) {
      const [x1, y1] = P(u, -0.429);
      const [, y2] = P(u, -0.458);
      g.beginPath();
      g.moveTo(x1, y1);
      g.lineTo(x1, y2);
      g.stroke();
    }
    spot(0, -0.49, 0.06, '210,90,110', 0.6, 1.6, 0.5);
    g.restore();
  }
  g.restore();

  // brows: thick and softly arched, drawn hair by hair
  const browLine = [[0.11, 0.245], [0.2, 0.285], [0.32, 0.318], [0.43, 0.322], [0.565, 0.284]];
  const thick = [0.05, 0.046, 0.04, 0.03, 0.012];
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  both((s) => {
    const up = [], dn = [];
    browLine.forEach(([u, v], i) => {
      const [u2, v2] = browLine[Math.min(i + 1, browLine.length - 1)], [u0, v0] = browLine[Math.max(i - 1, 0)];
      const tx = u2 - u0, ty = v2 - v0, len = Math.hypot(tx, ty);
      const nx = -ty / len, ny = tx / len;
      up.push([(u + nx * thick[i] / 2) * s, v + ny * thick[i] / 2]);
      dn.push([(u - nx * thick[i] / 2) * s, v - ny * thick[i] / 2]);
    });
    g.save();
    g.filter = 'blur(2px)';
    g.fillStyle = 'rgba(44,27,19,0.78)';
    g.beginPath();
    smoothPath(g, px([...up, ...dn.reverse()]), true);
    g.fill();
    g.filter = 'blur(0.4px)';
    g.lineCap = 'round';
    for (let k = 0; k < 170; k++) {
      const t = rnd() * 0.98, seg = t * (browLine.length - 1), i = Math.floor(seg), f = seg - i;
      const a = browLine[i], b = browLine[i + 1];
      const u = lerp(a[0], b[0], f), v = lerp(a[1], b[1], f);
      const th = lerp(thick[i], thick[i + 1], f);
      const off = (rnd() - 0.5) * th * 0.9;
      const ang = t < 0.25 ? 1.2 - t * 2 : Math.atan2(b[1] - a[1], b[0] - a[0]) + 0.25;
      const len = 0.018 + rnd() * 0.016;
      const [x1, y1] = P(u * s, v + off);
      const [x2, y2] = P((u + Math.cos(ang) * len) * s, v + off + Math.sin(ang) * len);
      g.strokeStyle = `rgba(${28 + rnd() * 20},${16 + rnd() * 10},${10 + rnd() * 6},${0.55 + rnd() * 0.35})`;
      g.lineWidth = 1.3 + rnd() * 1.1;
      g.beginPath();
      g.moveTo(x1, y1);
      g.lineTo(x2, y2);
      g.stroke();
    }
    g.restore();
  });

  // a little dark hair just under the hijab edge
  g.save();
  g.filter = 'blur(5px)';
  g.strokeStyle = 'rgba(42,26,18,0.9)';
  g.lineWidth = L(0.07);
  g.beginPath();
  for (let k = 0; k <= 40; k++) {
    const th = lerp(0.35, PI - 0.35, k / 40);
    const r = openR(th) * 1.0;
    const [x, y] = P(Math.cos(th) * r, OPEN.vc + Math.sin(th) * r);
    if (k) g.lineTo(x, y); else g.moveTo(x, y);
  }
  g.stroke();
  g.restore();
  return cv;
}

function irisTexture() {
  const W = 256, H = 256;
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const g = cv.getContext('2d');
  const row = (th) => (th / PI) * H;
  const grd = g.createLinearGradient(0, 0, 0, H);
  const stops = [[0, '#080404'], [0.19, '#0c0605'], [0.2, '#6f4426'], [0.33, '#55321c'], [0.5, '#3a2112'], [0.55, '#201209'], [0.6, '#f6f0ec'], [1.5, '#f4ebe6'], [PI, '#e9cfc8']];
  stops.forEach(([th, c]) => grd.addColorStop(Math.min(1, row(th) / H), c));
  g.fillStyle = grd;
  g.fillRect(0, 0, W, H);
  let seed = 3;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let k = 0; k < 220; k++) {
    const x = rnd() * W;
    g.fillStyle = rnd() < 0.5 ? `rgba(170,110,60,${0.15 + rnd() * 0.2})` : `rgba(20,10,5,${0.15 + rnd() * 0.25})`;
    g.fillRect(x, row(0.2), 1 + rnd() * 1.5, row(0.55) - row(0.2));
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function buildHead(head, hijabMat) {
  const tex = (cv) => { const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };
  const smileTex = tex(paintFace('smile'));
  const grinTex = tex(paintFace('grin'));
  const blushTex = tex(paintFace('blush'));

  // the face surface, as a dense grid over the front of the head
  const N = 176;
  const pos = new Float32Array((N + 1) * (N + 1) * 3);
  const grinPos = new Float32Array(pos.length);
  const uv = new Float32Array((N + 1) * (N + 1) * 2);
  const idx = [];
  const tmp = new THREE.Vector3();
  const lim = 0.985;
  for (let j = 0; j <= N; j++) {
    for (let i = 0; i <= N; i++) {
      let u = -1 + (2 * i) / N, v = -1 + (2 * j) / N;
      const r = Math.hypot(u, v);
      if (r > lim) { u *= lim / r; v *= lim / r; }
      const k = j * (N + 1) + i;
      basePoint(u, v, toFront(u, v), 0, tmp).toArray(pos, k * 3);
      basePoint(u, v, toFront(u, v), 1, tmp).toArray(grinPos, k * 3);
      uv[k * 2] = u * 0.5 + 0.5;
      uv[k * 2 + 1] = v * 0.5 + 0.5;
    }
  }
  const inside = (i, j) => Math.hypot(-1 + (2 * i) / N, -1 + (2 * j) / N) < lim;
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      if (!(inside(i, j) && inside(i + 1, j) && inside(i, j + 1) && inside(i + 1, j + 1))) continue;
      const a = j * (N + 1) + i, b = a + 1, c = a + N + 1, d = c + 1;
      idx.push(a, b, d, a, d, c);
    }
  }
  const faceGeo = new THREE.BufferGeometry();
  faceGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  faceGeo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  faceGeo.setIndex(idx);
  faceGeo.computeVertexNormals();
  const grinGeo = new THREE.BufferGeometry();
  grinGeo.setAttribute('position', new THREE.BufferAttribute(grinPos, 3));
  grinGeo.setIndex(idx);
  grinGeo.computeVertexNormals();
  faceGeo.morphAttributes.position = [grinGeo.attributes.position];
  faceGeo.morphAttributes.normal = [grinGeo.attributes.normal];
  const faceMat = new THREE.MeshPhysicalMaterial({
    map: smileTex, roughness: 0.6, sheen: 0.35, sheenRoughness: 0.55, sheenColor: new THREE.Color(0xffb7a6),
    emissive: new THREE.Color(0xff6f8f), emissiveMap: blushTex, emissiveIntensity: 0.05,
  });
  const face = new THREE.Mesh(faceGeo, faceMat);
  face.morphTargetInfluences = [0];
  face.receiveShadow = true;
  head.add(face);

  // the hijab: an offset of the head, snapped exactly to the face opening, with soft folds
  const shellGeo = new THREE.SphereGeometry(1, 128, 96);
  {
    const p = shellGeo.attributes.position;
    const d = new THREE.Vector3(), n = new THREE.Vector3(), out = new THREE.Vector3();
    for (let k = 0; k < p.count; k++) {
      d.fromBufferAttribute(p, k).normalize();
      let { x: dx, y: dy, z: dz } = d;
      let th = 0.028 + 0.01 * smooth(0.3, 1, dy) + 0.03 * smooth(0, -0.8, dz) * smooth(-0.6, 0.4, dy);
      let m = 9;
      if (dz > 0) {
        m = openMask(dx, dy);
        if (m < 1) {
          const u = dx / m, v = OPEN.vc + (dy - OPEN.vc) / m;
          dx = u; dy = v; dz = toFront(u, v);
          th = 0.005;
        } else th = lerp(0.005, th, smooth(1.0, 1.65, m));
      }
      const az = Math.atan2(dx, dz);
      th += 0.0035 * Math.sin(az * 13 + dy * 4) * smooth(0.1, -0.7, dy) * smooth(1.3, 2.1, m);
      basePoint(dx, dy, dz, 0, out).addScaledVector(surfNormal(dx, dy, dz, n), th);
      p.setXYZ(k, out.x, out.y, out.z);
    }
    shellGeo.computeVertexNormals();
  }
  const shell = new THREE.Mesh(shellGeo, hijabMat);
  shell.castShadow = true;
  head.add(shell);
  // a soft rolled edge where the fabric meets the face
  const rimPts = [];
  for (let k = 0; k < 120; k++) {
    const th = (k / 120) * PI * 2, r = openR(th);
    const u = Math.cos(th) * r, v = OPEN.vc + Math.sin(th) * r;
    rimPts.push(basePoint(u, v, toFront(u, v)).addScaledVector(surfNormal(u, v, toFront(u, v)), 0.009));
  }
  head.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rimPts, true), 240, 0.0085, 10, true), hijabMat));

  // eyes: glossy eyeballs, upper and lower lids, lashes
  const r = 0.035;
  const irisTex = irisTexture();
  const eyeMat = new THREE.MeshPhysicalMaterial({ map: irisTex, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.04 });
  const lidMat = std(0xefc6b4, { roughness: 0.6 });
  const lashMat = std(0x160d09, { roughness: 0.55 });
  const lowLashMat = new THREE.MeshBasicMaterial({ color: 0x5a3426, transparent: true, opacity: 0.55, depthWrite: false });
  const catchMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 });
  const ballGeo = new THREE.SphereGeometry(r, 40, 24);
  ballGeo.rotateX(PI / 2);
  const upperGeo = new THREE.SphereGeometry(r * 1.075, 40, 18, 0, PI * 2, 0, PI * 0.56);
  const lowerGeo = new THREE.SphereGeometry(r * 1.05, 40, 10, 0, PI * 2, PI * 0.6, PI * 0.4);
  const onLid = (R, th, a) => new THREE.Vector3(R * Math.sin(a) * Math.sin(th), R * Math.cos(th), R * Math.cos(a) * Math.sin(th));
  const eyes = [];
  for (const side of [-1, 1]) {
    const socket = new THREE.Group();
    socket.position.copy(basePoint(0.36 * side, 0.1, toFront(0.36, 0.1))).add(new THREE.Vector3(0, 0, -r * 0.6));
    socket.rotation.set(0, side * 0.16, side * 0.06);
    head.add(socket);
    const look = new THREE.Group();
    socket.add(look);
    look.add(new THREE.Mesh(ballGeo, eyeMat));
    const catchlight = new THREE.Mesh(new THREE.CircleGeometry(r * 0.12, 16), catchMat);
    catchlight.position.set(r * 0.26, r * 0.28, r * 1.0);
    socket.add(catchlight);
    const upper = new THREE.Group();
    socket.add(upper);
    upper.add(new THREE.Mesh(upperGeo, lidMat));
    const lashPts = [];
    for (let k = 0; k <= 24; k++) lashPts.push(onLid(r * 1.09, PI * 0.56, lerp(-1.35, 1.35, k / 24)));
    const tip = lashPts[side > 0 ? 24 : 0];
    const wing = side > 0 ? [tip, tip.clone().add(new THREE.Vector3(r * 0.25, r * 0.1, -r * 0.06)), tip.clone().add(new THREE.Vector3(r * 0.42, r * 0.26, -r * 0.12))]
      : [tip.clone().add(new THREE.Vector3(-r * 0.42, r * 0.26, -r * 0.12)), tip.clone().add(new THREE.Vector3(-r * 0.25, r * 0.1, -r * 0.06)), tip];
    upper.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(lashPts), 48, r * 0.075, 6), lashMat));
    upper.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(wing), 12, r * 0.055, 6), lashMat));
    const lashGeo = new THREE.ConeGeometry(r * 0.03, r * 0.34, 5);
    lashGeo.translate(0, r * 0.17, 0);
    for (let k = 0; k < 9; k++) {
      const a = side * lerp(-0.2, 1.3, k / 8);
      const base = onLid(r * 1.09, PI * 0.56, a);
      const out = onLid(1, PI * 0.5, a).add(new THREE.Vector3(0, 0.9, 0.5)).normalize();
      const lash = new THREE.Mesh(lashGeo, lashMat);
      lash.position.copy(base);
      lash.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), out);
      lash.scale.setScalar(lerp(0.75, 1.25, k / 8));
      upper.add(lash);
    }
    const lower = new THREE.Group();
    socket.add(lower);
    lower.add(new THREE.Mesh(lowerGeo, lidMat));
    const lowPts = [];
    for (let k = 0; k <= 16; k++) lowPts.push(onLid(r * 1.07, PI * 0.6, lerp(-1.0, 1.15, k / 16) * side));
    lower.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(lowPts), 24, r * 0.03, 5), lowLashMat));
    socket.traverse((o) => { o.castShadow = false; });
    eyes.push({ side, look, upper, lower, catchlight });
  }

  const W = { grin: 0, open: 1, low: 0 };
  const goal = { grin: 0, open: 1, low: 0 };
  let expression = 'smile';
  return {
    setExpression(name) {
      expression = name;
      goal.grin = name === 'smile' ? 0 : 1;
      goal.open = name === 'happy' ? 0.12 : name === 'grin' ? 0.86 : 1;
      goal.low = name === 'happy' ? 1 : name === 'grin' ? 0.35 : 0;
    },
    update(dt, { open = [1, 1], lookX = 0, lookY = 0, blush = 0 } = {}) {
      for (const k in W) W[k] = damp(W[k], goal[k], 12, dt);
      face.morphTargetInfluences[0] = W.grin;
      const map = W.grin > 0.5 ? grinTex : smileTex;
      if (faceMat.map !== map) faceMat.map = map;
      faceMat.emissiveIntensity = 0.05 + blush * 0.55;
      eyes.forEach((e, i) => {
        const o = clamp(open[i] * W.open, 0, 1);
        e.upper.rotation.x = lerp(0.15, -0.7, o);
        e.lower.rotation.x = lerp(0, -0.24, W.low);
        e.catchlight.visible = o > 0.4;
        e.look.rotation.set(-lookY * 0.22, lookX * 0.32 - e.side * 0.16, 0);
      });
    },
    get expression() { return expression; },
  };
}

export function createRajiea(container, { bubble, lines = [], badge = 'Dr. Rajiea', view } = {}) {
  const FULL = { dist: 9.4, camY: 2.1, lookY: 1.78 };
  const CLOSE = { dist: 1.6, camY: 2.98, lookY: 2.94 };
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
  add(body, lathe([[0.05, 2.84], [0.105, 2.76], [0.125, 2.66], [0.145, 2.58], [0.18, 2.53], [0.165, 2.5]]), hijabMat, [0, 0, 0], [0, 0, 0], [1.05, 1, 1]);

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
  const brew = add(cup, new THREE.CylinderGeometry(0.049, 0.044, 0.05, 20), std(0xb07f5c, { roughness: 0.8 }), [0, 0.045, 0.03]);
  add(cup, new THREE.CylinderGeometry(0.054, 0.054, 0.02, 20), pink, [0, 0.13, 0.03]);
  armL.hand.add(cup);
  const phone = new THREE.Group();
  add(phone, new THREE.BoxGeometry(0.09, 0.18, 0.014), std(0xe8213f, { roughness: 0.35 }), [0, 0.06, 0.02]);
  add(phone, new THREE.BoxGeometry(0.035, 0.035, 0.008), std(0x2b2b33, { roughness: 0.3 }), [-0.018, 0.12, 0.03]);
  armR.hand.add(phone);

  // Head: sculpted face framed by the hijab
  const head = new THREE.Group();
  head.position.set(0, 2.66, 0);
  head.scale.setScalar(1.1);
  body.add(head);
  const face = buildHead(head, hijabMat);

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

  const DUR = { wave: 2.2, jump: 1.0, spin: 1.3, dance: 3.2, wink: 1.1, floss: 3.2, candy: 2.4, sneeze: 1.7, dizzy: 2.6, blush: 2.4, selfie: 2.6, matcha: 3.0 };
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
          blend(l, { sx: lerp(-0.3, -0.85, sip), sz: lerp(0.1, 0.3, sip), ex: lerp(-1.4, -2.15, sip) }, w);
          nod = 0.08 * sip; expr = sip > 0.5 ? 'happy' : 'smile'; break;
        }
        case 'blush': {
          const w = windowed(p, 0.2);
          blend(r, { sx: -0.35, sz: -0.12, ex: -1.0 }, w); blend(l, { sx: -0.35, sz: -0.12, ex: -1.0 }, w);
          tilt = 0.15 * w; blushing = w; expr = 'happy'; break;
        }
      }
      if (action.t >= action.dur) action = null;
    }
    if (face.expression !== expr) face.setExpression(expr);
    if (!reduceMotion() && !action && idleTimer > 11) play(Math.random() < 0.5 ? 'wave' : 'wink');

    // the right arm mirrors its sideways angle
    armR.shoulder.rotation.set(r.sx, 0, -r.sz);
    armR.elbow.rotation.set(r.ex, 0, -r.ez);
    armL.shoulder.rotation.set(l.sx, 0, l.sz);
    armL.elbow.rotation.set(l.ex, 0, l.ez);
    body.position.set(hipX, hop, 0);
    body.scale.set(1 / Math.sqrt(squash), squash, 1 / Math.sqrt(squash));
    body.rotation.set(lean, 0, sway);
    scarf.children.forEach((t, i) => (t.rotation.x = -0.08 - Math.sin(time * 1.8 + i) * 0.03 - hop * 0.3));
    char.rotation.y = stage.stepTurn(dt) + extraYaw;
    lookX = damp(lookX, stage.pointer.x, 5, dt);
    lookY = damp(lookY, stage.pointer.y, 5, dt);
    head.rotation.set(-lookY * 0.14 + nod, lookX * 0.45, tilt + sway * 0.5 - lookX * 0.04);
    const propNow = action?.type === 'selfie' ? 'phone' : action?.type === 'matcha' ? 'cup' : OUTFITS[outfit].prop;
    brush.visible = propNow === 'brush';
    cup.visible = propNow === 'cup';
    phone.visible = propNow === 'phone';
    brew.material.color.setHex(action?.type === 'matcha' ? 0x9cc46a : 0xb07f5c);
    char.updateMatrixWorld(true);
    upright(brush); upright(cup); upright(phone);
    const open = blink(dt) * squint;
    face.update(dt, { open: [open, wink ? 0 : open], lookX, lookY, blush: blushing });
    floats.update(time, dt, lookX);
  };
  const headTop = new THREE.Vector3(0, 0.62, 0);
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
