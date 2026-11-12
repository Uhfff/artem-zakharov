import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const canvas = document.getElementById('gl3');
const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.setClearColor(0x000000, 0);
const env = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;

const sapphire = () => new THREE.MeshPhysicalMaterial({ color: 0x0a1a78, metalness: 0.62, roughness: 0.16, clearcoat: 1, clearcoatRoughness: 0.06, envMapIntensity: 1.15 });
const lerp = (a, b, t) => a + (b - a) * t, clamp = (v, a, b) => Math.min(b, Math.max(a, v)), ease = t => 1 - Math.pow(1 - t, 3);
function base() {
  const scene = new THREE.Scene(); scene.environment = env;
  const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 50); cam.position.set(0, 0, 7.2);
  const key = new THREE.DirectionalLight(0x9fb4ff, 2.2); key.position.set(-3, 4, 5); scene.add(key);
  const rim = new THREE.DirectionalLight(0x2a48ff, 3.0); rim.position.set(4, -1, -3); scene.add(rim);
  const g = new THREE.Group(); scene.add(g);
  return { scene, cam, g };
}

/* 1. a sapphire coil with a live charge running through it: a request travelling from filed to closed */
function cards() {
  const b = base(), TURNS = 6, LEN = 6.4, RAD = 1.0;
  class Helix extends THREE.Curve { getPoint(u, v = new THREE.Vector3()) { const a = u * Math.PI * 2 * TURNS; return v.set((u - 0.5) * LEN, Math.cos(a) * RAD, Math.sin(a) * RAD); } }
  const path = new Helix();
  const coil = new THREE.Mesh(new THREE.TubeGeometry(path, 900, 0.125, 28, false), new THREE.MeshPhysicalMaterial({ color: 0x0a1a78, metalness: 0.9, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.04, iridescence: 0.2, iridescenceIOR: 1.3, envMapIntensity: 1.4 }));
  b.g.add(coil);
  const capGeo = new THREE.SphereGeometry(0.125, 24, 16);
  [0, 1].forEach(u => { const c = new THREE.Mesh(capGeo, coil.material); c.position.copy(path.getPoint(u)); coil.add(c); });
  const charge = new THREE.Mesh(new THREE.SphereGeometry(0.2, 32, 24), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xc4d0ff, emissiveIntensity: 2.2, roughness: 0.3 }));
  const halo = new THREE.Mesh(new THREE.SphereGeometry(0.42, 32, 24), new THREE.MeshBasicMaterial({ color: 0x7f9bff, transparent: true, opacity: 0.16, depthWrite: false }));
  const glow = new THREE.PointLight(0xb9c7ff, 22, 4.5);
  b.g.add(charge, halo, glow);
  const tmp = new THREE.Vector3();
  b.update = (t, p, mx, my) => {
    const u = reduce ? 0.62 : (0.5 + 0.5 * Math.sin(t * 0.35 + p * 5.0)) * 0.94 + 0.03;
    path.getPoint(u, tmp);
    charge.position.copy(tmp); halo.position.copy(tmp); glow.position.copy(tmp);
    halo.scale.setScalar(1 + 0.18 * Math.sin(t * 3.1));
    coil.rotation.x = t * 0.25 + p * 3.0; charge.position.applyAxisAngle(new THREE.Vector3(1, 0, 0), coil.rotation.x);
    halo.position.copy(charge.position); glow.position.copy(charge.position);
    b.g.rotation.set(0.22 - my * 0.25, -0.5 + p * 0.8 + mx * 0.4, 0.16);
  };
  return b;
}

/* 2. a globe of points: a whole market, a few leads picked out and linked */
function globe() {
  const b = base(), R = 1.75, N = 3200, pos = new Float32Array(N * 3), pts = [];
  for (let i = 0; i < N; i++) {
    const y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - y * y), a = i * 2.39996323;
    const v = new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r).multiplyScalar(R);
    pos.set([v.x, v.y, v.z], i * 3); pts.push(v);
  }
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  b.g.add(new THREE.Points(pg, new THREE.PointsMaterial({ color: 0x6f8dff, size: 0.021, transparent: true, opacity: 0.85, depthWrite: false })));
  b.g.add(new THREE.Mesh(new THREE.SphereGeometry(R * 0.985, 48, 32), new THREE.MeshBasicMaterial({ color: 0x04050d })));
  const picks = [420, 890, 1210, 1580, 1930, 2360, 2710].map(i => pts[i]), rings = [];
  picks.forEach(v => {
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.035, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffffff })); dot.position.copy(v).multiplyScalar(1.01); b.g.add(dot);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.085, 0.094, 48), new THREE.MeshBasicMaterial({ color: 0x9db2ff, side: THREE.DoubleSide, transparent: true }));
    ring.position.copy(v).multiplyScalar(1.012); ring.lookAt(v.clone().multiplyScalar(3)); b.g.add(ring); rings.push(ring);
  });
  for (let i = 0; i < picks.length - 1; i++) {
    const a = picks[i], c = picks[i + 1], arc = [];
    for (let k = 0; k <= 40; k++) { const u = k / 40; arc.push(a.clone().lerp(c, u).normalize().multiplyScalar(R * (1.01 + 0.22 * Math.sin(Math.PI * u)))); }
    b.g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(arc), new THREE.LineBasicMaterial({ color: 0x8ea6ff, transparent: true, opacity: 0.9 })));
  }
  b.update = (t, p, mx, my) => {
    b.g.rotation.set(0.32 - my * 0.25, t * 0.10 + p * 2.2 + mx * 0.5, 0.12);
    rings.forEach((r, i) => { const s = 1 + 0.55 * (0.5 + 0.5 * Math.sin(t * 1.6 + i * 1.1)); r.scale.setScalar(s); r.material.opacity = 1.3 - s * 0.6; });
  };
  return b;
}

/* 3. a slow liquid form: the deck is made of shaders and depth, so is its portrait */
function blob() {
  const b = base();
  const geo = new THREE.SphereGeometry(1.55, 150, 110), P = geo.attributes.position, B = P.array.slice(), n = P.count;
  const mat = new THREE.MeshPhysicalMaterial({ color: 0x0a1a78, metalness: 0.9, roughness: 0.10, clearcoat: 1, clearcoatRoughness: 0.04, iridescence: 0.22, iridescenceIOR: 1.3, iridescenceThicknessRange: [120, 260], envMapIntensity: 1.35 });
  b.g.add(new THREE.Mesh(geo, mat));
  let tick = 0;
  b.update = (t, p, mx, my) => {
    if (!reduce || tick++ === 0) {
      const a = P.array;
      for (let i = 0; i < n; i++) {
        const x = B[i * 3] / 1.55, y = B[i * 3 + 1] / 1.55, z = B[i * 3 + 2] / 1.55;
        const d = 0.150 * Math.sin(x * 2.6 + t * 0.70) + 0.115 * Math.sin(y * 3.4 + t * 0.92 + 1.7) + 0.095 * Math.sin(z * 3.0 - t * 0.62 + 0.6) + 0.05 * Math.sin((x + y) * 5.6 + t * 1.2) + 0.035 * Math.sin((y - z) * 7.4 - t * 1.5);
        const r = 1.55 * (1 + d);
        a[i * 3] = x * r; a[i * 3 + 1] = y * r; a[i * 3 + 2] = z * r;
      }
      P.needsUpdate = true; geo.computeVertexNormals();
    }
    b.g.rotation.set(-my * 0.3 + p * 0.5, t * 0.12 + mx * 0.5 + p * 1.4, 0.2);
  };
  return b;
}

const make = { cards, globe, blob };
const stages = [...document.querySelectorAll('.stage3d')].map(el => ({ el, vis: 0, ...make[el.dataset.scene]() }));

let W = 0, H = 0, mx = 0, my = 0, tmx = 0, tmy = 0;
function resize() { W = innerWidth; H = innerHeight; renderer.setSize(W, H, false); }
addEventListener('resize', resize); resize();
addEventListener('pointermove', e => { tmx = e.clientX / W - 0.5; tmy = e.clientY / H - 0.5; }, { passive: true });

const t0 = performance.now();
function frame(now) {
  const t = reduce ? 4 : (now - t0) / 1000;
  mx = lerp(mx, tmx, 0.05); my = lerp(my, tmy, 0.05);
  renderer.setScissorTest(false); renderer.clear(); renderer.setScissorTest(true);
  for (const s of stages) {
    const r = s.el.getBoundingClientRect();
    if (r.bottom < 0 || r.top > H || r.width < 2) { s.vis = Math.max(0, s.vis - 0.05); continue; }
    s.vis = Math.min(1, s.vis + 0.022);
    const p = clamp((H - r.top) / (H + r.height), 0, 1);
    s.cam.aspect = r.width / r.height;
    // keep the object the same size whether the stage is wide or tall
    s.cam.position.z = 7.2 * Math.max(1, 0.95 / s.cam.aspect);
    s.cam.updateProjectionMatrix();
    s.update(t, p, reduce ? 0 : mx, reduce ? 0 : my);
    s.g.scale.setScalar(reduce ? 1 : 0.55 + 0.45 * ease(s.vis));
    const x = Math.max(0, r.left), y = Math.max(0, H - r.bottom), w = Math.min(W, r.right) - x, h = Math.min(H, H - r.top) - y;
    // the viewport follows the full stage rect so the object does not squash when the stage is partly off screen
    renderer.setViewport(r.left, H - r.bottom, r.width, r.height);
    renderer.setScissor(x, y, Math.max(1, w), Math.max(1, h));
    renderer.render(s.scene, s.cam);
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
