(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const tall = matchMedia('(max-aspect-ratio: 4/5)');
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const $ = id => document.getElementById(id);
  document.addEventListener('selectstart', e => e.preventDefault());
  document.addEventListener('dragstart', e => e.preventDefault());

  /* smooth scrolling (Lenis); native scrolling stays if the library is missing */
  const lenis = (!reduce && window.Lenis) ? new window.Lenis({ lerp: 0.09 }) : null;
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]'); if (!a) return;
    const target = document.querySelector(a.getAttribute('href')); if (!target) return;
    e.preventDefault();
    if (lenis) lenis.scrollTo(target, { duration: 1.6 }); else target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
  });
  console.log('%cHi. Looking under the hood? Good.%c\nWrite to me: https://t.me/porlot', 'font: 600 16px system-ui; color: #7f9bff', 'font: 13px system-ui; color: inherit');

  /* ---------- hero letters ---------- */
  const chars = [];
  document.querySelectorAll('.line').forEach((line, li) => {
    [...line.dataset.t].forEach((c, i) => {
      const s = document.createElement('span');
      s.className = 'ch'; s.textContent = c; s.setAttribute('aria-hidden', 'true');
      line.appendChild(s);
      chars.push({ el: s, cur: 0, cx: 0, cy: 0, delay: 250 + li * 260 + i * 70 });
    });
  });
  let sy = 1;
  function measure() {
    sy = tall.matches ? 1.85 : 1;
    const so = scrollY;
    chars.forEach(c => {
      const r = c.el.parentElement.getBoundingClientRect();
      c.cx = c.el.offsetLeft + c.el.offsetWidth / 2 + r.left;
      c.cy = r.bottom + so;
    });
  }

  /* ---------- finale letters ---------- */
  const fin = $('fin'), finale = $('finale'), finChars = [];
  [...'Artem Zakharov'].forEach(c => {
    const s = document.createElement('span'); s.setAttribute('aria-hidden', 'true');
    if (c === ' ') s.className = 'gap'; else { s.textContent = c; finChars.push({ el: s, cur: 0.06 }); }
    fin.appendChild(s);
  });
  function fitFin() {
    fin.style.fontSize = '100px';
    let w = 0; [...fin.children].forEach(c => { w += c.offsetWidth; });
    fin.style.fontSize = (100 * fin.clientWidth / Math.max(1, w) * 0.992).toFixed(2) + 'px';
    finChars.forEach(c => { const r = c.el.getBoundingClientRect(); c.cx = r.left + r.width / 2; });
  }

  /* ---------- statement: words light up as you read down ---------- */
  const st = $('statement'), words = [];
  (function split(node, hl) {
    [...node.childNodes].forEach(n => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(t => {
          if (!t) return;
          if (/^\s+$/.test(t)) { frag.appendChild(document.createTextNode(' ')); return; }
          const s = document.createElement('span'); s.className = 'w' + (hl ? ' hl' : ''); s.textContent = t;
          words.push(s); frag.appendChild(s);
        });
        n.replaceWith(frag);
      } else split(n, n.hasAttribute('data-hl'));
    });
  })(st, false);

  /* ---------- reveals ---------- */
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0.18 });
  document.querySelectorAll('.row, .rv').forEach(r => io.observe(r));

  /* ---------- pointer ---------- */
  const ptr = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5, px: -9999, py: -9999, on: 0, ton: 0 };
  addEventListener('pointermove', e => { ptr.tx = e.clientX / innerWidth; ptr.ty = e.clientY / innerHeight; ptr.px = e.clientX; ptr.py = e.clientY; ptr.ton = 1; }, { passive: true });
  document.addEventListener('pointerleave', () => { ptr.ton = 0; });
  addEventListener('touchend', () => { ptr.ton = 0; }, { passive: true });

  /* ---------- liquid field (WebGL) ---------- */
  const canvas = $('field');
  const gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'high-performance' });
  let U = null, scale = 1;
  if (gl) {
    const vs = 'attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }';
    const fs = `
precision highp float;
uniform vec2 res; uniform float t; uniform vec2 m; uniform float mon; uniform float intro; uniform float sc; uniform float dim; uniform vec3 rip[3];
float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p){
  float v = 0.0, a = 0.5; mat2 r = mat2(0.8, -0.6, 0.6, 0.8);
  for (int i = 0; i < 4; i++) { v += a * noise(p); p = r * p * 2.0 + 7.1; a *= 0.5; }
  return v;
}
void main(){
  vec2 uv = gl_FragCoord.xy / res;
  float asp = res.x / res.y;
  vec2 p = (uv - 0.5) * vec2(asp, 1.0);
  vec2 p0 = p;
  vec2 mp = (m - 0.5) * vec2(asp, 1.0);
  vec2 d = p - mp; float dl = length(d);
  float push = exp(-dl * dl * 5.0) * mon;
  p += normalize(d + 0.0001) * push * 0.16;
  p = p * 0.62 + vec2(0.0, t * 0.008 - sc * 0.16);

  vec2 q = vec2(fbm(p + vec2(0.0, t * 0.035)), fbm(p + vec2(5.2, 1.3) - t * 0.03));
  vec2 w = vec2(fbm(p + 2.2 * q + vec2(1.7, 9.2) + t * 0.04), fbm(p + 2.2 * q + vec2(8.3, 2.8) - t * 0.035));
  float f = fbm(p + 2.4 * w);

  // click ripples travelling through the folds
  float rw = 0.0;
  for (int i = 0; i < 3; i++) {
    float age = t - rip[i].z;
    if (age > 0.0 && age < 4.5) {
      float d = length(p0 - (rip[i].xy - 0.5) * vec2(asp, 1.0)) - age * 0.38;
      rw += sin(d * 42.0) * exp(-age * 1.15) * smoothstep(0.26, 0.0, abs(d));
    }
  }
  float ph = f * 30.0 + w.x * 9.0 + push * 3.0 + rw * 3.2;
  float fold = 0.5 + 0.5 * sin(ph);
  float sheen = pow(fold, 3.0);
  float edge = pow(fold, 28.0);

  vec3 ink = vec3(0.016, 0.020, 0.043);
  vec3 slate = vec3(0.150, 0.185, 0.330);
  vec3 deep = vec3(0.050, 0.120, 0.520);     // sapphire in shadow
  vec3 lit = vec3(0.300, 0.440, 1.000);      // sapphire in light
  vec3 pearl = vec3(0.860, 0.890, 1.000);

  float depth = smoothstep(0.30, 0.62, f);
  vec3 col = mix(ink, slate, sheen * (0.45 + 0.55 * depth));
  float pool = smoothstep(0.40, 0.66, w.y) * smoothstep(0.22, 0.70, q.x + 0.15);
  col = mix(col, mix(deep * 0.35, lit, sheen * sheen), pool * 0.9);
  col += pearl * edge * (0.22 + 0.50 * depth) * (1.0 - pool * 0.45);
  col += lit * push * 0.14 * (0.4 + fold);
  col += lit * abs(rw) * 0.22;

  float vig = smoothstep(1.30, 0.20, length((uv - 0.5) * vec2(1.0, 1.15)));
  col *= mix(0.55, 1.0, vig);
  col *= intro * dim;
  col += (hash(gl_FragCoord.xy + fract(t) * 91.7) - 0.5) * 0.022;
  gl_FragColor = vec4(col, 1.0);
}`;
    const mk = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const pr = gl.createProgram();
    gl.attachShader(pr, mk(gl.VERTEX_SHADER, vs)); gl.attachShader(pr, mk(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(pr);
    if (gl.getProgramParameter(pr, gl.LINK_STATUS)) {
      gl.useProgram(pr);
      gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      const u = n => gl.getUniformLocation(pr, n);
      U = { res: u('res'), t: u('t'), m: u('m'), mon: u('mon'), intro: u('intro'), sc: u('sc'), dim: u('dim'), rip: [u('rip[0]'), u('rip[1]'), u('rip[2]')] };
    }
  }

  let vw = innerWidth, vh = innerHeight;
  function resize() {
    vw = innerWidth; vh = innerHeight;
    scale = vw > 1800 ? 0.5 : 0.62;
    canvas.width = Math.max(2, Math.round(vw * scale));
    canvas.height = Math.max(2, Math.round(vh * scale));
    if (gl) gl.viewport(0, 0, canvas.width, canvas.height);
    measure(); fitFin();
  }
  addEventListener('resize', resize);
  tall.addEventListener('change', measure);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { measure(); fitFin(); });

  /* ---------- scroll-driven pieces ---------- */
  const passage = $('passage'), about = $('about'), work = $('work'), also = $('also');
  const bands = [$('band1'), $('band2'), $('band3')];
  const over = el => { const r = el.getBoundingClientRect(); return r.top < vh * 0.62 && r.bottom > vh * 0.38; };
  const prog = el => { const r = el.getBoundingClientRect(); return clamp(-r.top / Math.max(1, r.height - vh), 0, 1); };
  const near = el => { const r = el.getBoundingClientRect(); return r.bottom > -vh * 0.2 && r.top < vh * 1.2; };

  /* ---------- loop ---------- */
  /* ripples: a click anywhere on empty space sends a wave through the folds */
  const rips = [[0, 0, -99], [0, 0, -99], [0, 0, -99]]; let ripI = 0, shT = 12;
  addEventListener('pointerdown', e => {
    if (reduce || e.target.closest('a, button')) return;
    rips[ripI] = [e.clientX / innerWidth, 1 - e.clientY / innerHeight, shT]; ripI = (ripI + 1) % 3;
  }, { passive: true });

  /* cursor companion */
  const cur = $('cur'), curLabel = cur.firstElementChild, cp = { x: -100, y: -100 };
  document.addEventListener('pointerover', e => {
    const big = e.target.closest('[data-cur]'), link = !big && e.target.closest('a, button');
    cur.classList.toggle('big', !!big); cur.classList.toggle('link', !!link);
    if (big) curLabel.textContent = big.dataset.cur;
  });

  /* text scramble on small links */
  const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  document.querySelectorAll('.ulink').forEach(a => {
    const txt = a.textContent; let raf = 0;
    a.addEventListener('pointerenter', () => {
      if (reduce) return; cancelAnimationFrame(raf); const s0 = performance.now();
      (function tick(n) {
        const k = Math.min(1, (n - s0) / 420), keep = Math.floor(k * txt.length);
        a.textContent = txt.slice(0, keep) + [...txt.slice(keep)].map(c => c === ' ' ? ' ' : GLYPHS[(Math.random() * 26) | 0]).join('');
        if (k < 1) raf = requestAnimationFrame(tick); else a.textContent = txt;
      })(s0);
    });
  });

  /* curtain: real progress (type, 3D scenes, a minimum beat), an odometer, then eight slats lift */
  const pre = $('pre'); let started = reduce, fontsOk = false;
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { fontsOk = true; }); else fontsOk = true;
  if (reduce) { pre.remove(); document.body.classList.add('ready'); }
  else {
    const strips = [...pre.querySelectorAll('.strip')], num = pre.querySelector('.pre-num'), bar = $('preB'), label = $('preS');
    const preT = performance.now(); let shown = 0, lastInt = -1;
    (function curtain(now) {
      const age = now - preT, late = age > 4500;
      const goal = 20 * Math.min(1, age / 900) + (fontsOk || late ? 40 : 0) + (window.__scenesReady || late ? 40 : 0);
      shown = Math.min(goal, shown + Math.max(0.35, (goal - shown) * 0.07));
      const n = Math.floor(shown);
      if (n !== lastInt) {
        lastInt = n;
        strips[0].style.transform = 'translateY(' + (n >= 100 ? -50 : 0) + '%)';
        strips[1].style.transform = 'translateY(' + (-(Math.floor(n / 10) % 10) * 10) + '%)';
        strips[2].style.transform = 'translateY(' + (-(n % 10) * 10) + '%)';
        num.classList.toggle('hundred', n >= 100);
        label.textContent = n < 45 ? 'Loading type' : n < 90 ? 'Building scenes' : 'Ready';
      }
      bar.style.transform = 'scaleX(' + (shown / 100).toFixed(4) + ')';
      if (n >= 100) {
        setTimeout(() => pre.classList.add('out'), 420);
        setTimeout(() => { pre.classList.add('lift'); started = true; document.body.classList.add('ready'); measure(); }, 1000);
        setTimeout(() => pre.remove(), 2700);
        return;
      }
      requestAnimationFrame(curtain);
    })(preT);
  }

  let t0 = performance.now();
  let last = t0, slow = 0, sm = scrollY, vel = 0, dim = 1;
  function frame(now) {
    if (lenis) lenis.raf(now);
    if (!started) t0 = now;
    cp.x = lerp(cp.x, ptr.px, 0.22); cp.y = lerp(cp.y, ptr.py, 0.22);
    cur.style.transform = 'translate3d(' + cp.x.toFixed(1) + 'px,' + cp.y.toFixed(1) + 'px,0)'; cur.classList.toggle('on', ptr.ton === 1);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const el = now - t0, time = el / 1000, k = 1 - Math.pow(1 - 0.12, dt * 60);
    ptr.x = lerp(ptr.x, ptr.tx, 0.045); ptr.y = lerp(ptr.y, ptr.ty, 0.045); ptr.on = lerp(ptr.on, ptr.ton, 0.04);
    const so = scrollY, prev = sm;
    sm = reduce ? so : lerp(sm, so, 1 - Math.pow(1 - 0.14, dt * 60));
    vel = lerp(vel, (sm - prev) / Math.max(dt, 0.001), 0.12);

    // text sections want a quieter room
    dim = lerp(dim, over(work) || over(also) ? 0.42 : over(about) ? 0.62 : 1, 0.06);

    if (U) {
      gl.uniform2f(U.res, canvas.width, canvas.height);
      gl.uniform1f(U.t, reduce ? 12.0 : time + 12.0);
      gl.uniform2f(U.m, ptr.x, 1 - ptr.y);
      gl.uniform1f(U.mon, reduce ? 0 : ptr.on);
      gl.uniform1f(U.intro, Math.min(1, el / 1600));
      gl.uniform1f(U.sc, reduce ? 0 : sm / vh);
      gl.uniform1f(U.dim, dim);
      shT = reduce ? 12.0 : time + 12.0;
      for (let i = 0; i < 3; i++) gl.uniform3f(U.rip[i], rips[i][0], rips[i][1], rips[i][2]);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (dt > 0.034 && el > 1500 && scale > 0.5) { if (++slow > 40) { slow = 0; scale *= 0.8; canvas.width = Math.round(vw * scale); canvas.height = Math.round(vh * scale); gl.viewport(0, 0, canvas.width, canvas.height); } }
    }

    // 1. hero letters
    if (so < vh * 1.1) {
      const sigma = Math.max(90, vw * 0.11);
      for (let i = 0; i < chars.length; i++) {
        const c = chars[i];
        const rise = reduce ? 1 : 1 - Math.pow(1 - clamp((el - c.delay) / 1300, 0, 1), 4);
        let grow = 0;
        if (!reduce) {
          const dx = ptr.px - c.cx, dy = Math.max(0, Math.abs(ptr.py - (c.cy - so) + 140) - 260);
          const nearP = Math.exp(-(dx * dx) / (2 * sigma * sigma)) * Math.exp(-(dy * dy) / 90000) * ptr.on;
          const idle = (0.5 + 0.5 * Math.sin(time * 0.9 - i * 0.55)) * 0.07 * (1 - ptr.on);
          const sink = clamp(so / (vh * 0.9), 0, 1);           // letters settle as you scroll away
          grow = nearP * 0.42 + idle - sink * (0.25 + 0.5 * ((i * 37) % 10) / 10);
        }
        c.cur = lerp(c.cur, Math.max(0, sy * rise * (1 + grow)), reduce ? 1 : k);
        c.el.style.transform = 'scaleY(' + c.cur.toFixed(4) + ')';
      }
    }

    // 2. passage: three bands sliding against each other
    if (!reduce && near(passage)) {
      const r = passage.getBoundingClientRect();
      const p = clamp((vh - r.top) / (r.height + vh), 0, 1);
      const skew = clamp(vel / 260, -9, 9);
      bands[0].style.transform = 'translate3d(' + (-4 - p * 46) + '%,0,0) skewX(' + (-skew) + 'deg)';
      bands[1].style.transform = 'translate3d(' + (-52 + p * 44) + '%,0,0) skewX(' + skew + 'deg)';
      bands[2].style.transform = 'translate3d(' + (-18 - p * 40) + '%,0,0) skewX(' + (-skew) + 'deg)';
    }

    // finale: the name grows letter by letter as the page runs out
    if (!reduce && near(finale)) {
      const r = finale.getBoundingClientRect(), p = clamp((vh - r.top) / Math.max(1, r.height), 0, 1);
      for (let i = 0; i < finChars.length; i++) {
        const c = finChars[i], local = clamp(p * 1.9 - 0.25 - i * 0.05, 0, 1);
        const dx = ptr.px - c.cx;
        const lift = Math.exp(-(dx * dx) / (2 * Math.pow(Math.max(90, vw * 0.09), 2))) * ptr.on * (ptr.py > r.top ? 0.16 : 0);
        c.cur = lerp(c.cur, 0.06 + 0.94 * (1 - Math.pow(1 - local, 3)) + lift * local, k);
        c.el.style.transform = 'scaleY(' + c.cur.toFixed(4) + ')';
      }
    }
    // about: fill the statement word by word
    if (near(about)) {
      const r = st.getBoundingClientRect();
      const on = Math.round(clamp((vh * 0.82 - r.top) / (r.height + vh * 0.30), 0, 1) * words.length * 1.06);
      for (let i = 0; i < words.length; i++) words[i].classList.toggle('on', reduce || i < on);
    }
    requestAnimationFrame(frame);
  }

  resize();
  requestAnimationFrame(frame);
})();
