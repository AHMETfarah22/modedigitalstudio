/* Katman · one croissant that changes as you scroll (no libraries) */
(() => {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Free-licence photos from Unsplash (hotlinked as Unsplash asks); backgrounds are removed in the browser
  const CROISSANT = "https://images.unsplash.com/photo-1691480162735-9b91238080f6?w=1400&q=80&auto=format";

  /** Load a photo on a light background and return a PNG with that background removed and trimmed. */
  const cutout = (url, maxW, thr, shadows = false) => new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const k = Math.min(1, maxW / img.naturalWidth);
      const W = Math.round(img.naturalWidth * k), H = Math.round(img.naturalHeight * k);
      const c = document.createElement("canvas"); c.width = W; c.height = H;
      const x = c.getContext("2d", { willReadFrequently: true });
      x.drawImage(img, 0, 0, W, H);
      const d = x.getImageData(0, 0, W, H), p = d.data, N = W * H;
      // background colour = average of the corners
      const corner = [[0, 0], [W - 1, 0], [0, H - 1], [W - 1, H - 1]].map(([cx, cy]) => { const i = (cy * W + cx) * 4; return [p[i], p[i + 1], p[i + 2]]; });
      const bg = [0, 1, 2].map((ch) => corner.reduce((a, v) => a + v[ch], 0) / 4);
      const dist = new Float32Array(N);
      for (let i = 0; i < N; i++) {
        const r = p[i * 4], g = p[i * 4 + 1], b = p[i * 4 + 2];
        dist[i] = Math.max(Math.abs(r - bg[0]), Math.abs(g - bg[1]), Math.abs(b - bg[2]));
        // soft grey shadows on the backdrop also count as background (the food is saturated)
        const sat = Math.max(r, g, b) - Math.min(r, g, b), lum = (r + g + b) / 3;
        if (shadows && sat < 24 && lum > 95) dist[i] = Math.min(dist[i], thr - 1);
      }
      const out = new Uint8Array(N); const stack = [];
      const push = (i) => { if (!out[i] && dist[i] < thr) { out[i] = 1; stack.push(i); } };
      for (let i = 0; i < W; i++) { push(i); push((H - 1) * W + i); }
      for (let j = 0; j < H; j++) { push(j * W); push(j * W + W - 1); }
      while (stack.length) {
        const i = stack.pop(), cx = i % W, cy = (i / W) | 0;
        if (cx > 0) push(i - 1); if (cx < W - 1) push(i + 1); if (cy > 0) push(i - W); if (cy < H - 1) push(i + W);
      }
      let x0 = W, y0 = H, x1 = 0, y1 = 0;
      for (let i = 0; i < N; i++) {
        if (out[i]) { p[i * 4 + 3] = 0; continue; }
        const cx = i % W, cy = (i / W) | 0;
        const edge = (cx > 0 && out[i - 1]) || (cx < W - 1 && out[i + 1]) || (cy > 0 && out[i - W]) || (cy < H - 1 && out[i + W]);
        if (edge) p[i * 4 + 3] = Math.min(255, Math.round((dist[i] / (thr * 2)) * 255) + 40);
        if (cx < x0) x0 = cx; if (cx > x1) x1 = cx; if (cy < y0) y0 = cy; if (cy > y1) y1 = cy;
      }
      x.putImageData(d, 0, 0);
      const tw = x1 - x0 + 1, th = y1 - y0 + 1;
      const t = document.createElement("canvas"); t.width = tw; t.height = th;
      t.getContext("2d").drawImage(c, x0, y0, tw, th, 0, 0, tw, th);
      resolve({ url: t.toDataURL("image/png"), ar: tw / th });
    };
    img.onerror = reject;
    img.src = url;
  });

  const DRIZZLE = `<svg class="drizzle" viewBox="0 0 400 220" preserveAspectRatio="none" aria-hidden="true">
    <path pathLength="1" d="M18 92 C70 50 112 112 164 74 S262 46 306 86 S372 78 388 62" stroke="url(#choco)" stroke-width="16" fill="none" stroke-linecap="round"/>
    <path pathLength="1" d="M62 82 C110 60 150 104 206 82 S300 64 340 96" stroke="url(#choco)" stroke-width="9" fill="none" stroke-linecap="round" opacity=".9"/>
    <path pathLength="1" d="M128 88 q3 34 -1 56" stroke="url(#choco)" stroke-width="9" stroke-linecap="round" fill="none"/><circle class="drop" cx="127" cy="148" r="7" fill="#3a1d10"/>
    <path pathLength="1" d="M232 78 q4 26 0 44" stroke="url(#choco)" stroke-width="8" stroke-linecap="round" fill="none"/><circle class="drop" cx="232" cy="126" r="6" fill="#3a1d10"/>
    <path pathLength="1" d="M306 88 q2 20 -1 30" stroke="url(#choco)" stroke-width="7" stroke-linecap="round" fill="none"/>
  </svg>`;

  const obj = $("#obj"), stage = $("#stage"), story = $(".story");
  Promise.all([cutout(CROISSANT, 1100, 36, true)]).then(([cr]) => {
    obj.style.setProperty("--ar", cr.ar.toFixed(3));
    $$(".pastry", obj).forEach((el) => {
      el.innerHTML = `<img class="lay lay--bot" src="${cr.url}" alt="">
        <div class="fill"><div class="sauce"></div><span class="scoop"></span><span class="scoop scoop--b"></span></div>
        <div class="topwrap"><img class="lay lay--top" src="${cr.url}" alt="">${DRIZZLE}</div>
        <div class="seam"></div>
        <div class="core"></div>`;
    });
    obj.classList.add("is-ready");
    // menu and order pictures reuse the same croissant, each with its own topping
    const TOP = { choc: ["#7a4329", "#2a140b"], pistachio: ["#b9cf6a", "#6f8a2c"], caramel: ["#f0b25a", "#a8611c"] };
    $$(".card__pic").forEach((el) => {
      const t = TOP[el.dataset.kind];
      el.innerHTML = `<img src="${cr.url}" alt="">` + (t ? `<svg viewBox="0 0 400 220" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="g-${el.dataset.kind}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${t[0]}"/><stop offset="1" stop-color="${t[1]}"/></linearGradient></defs><path d="M30 96 C80 54 122 112 172 78 S268 50 310 88 S366 80 380 66" stroke="url(#g-${el.dataset.kind})" stroke-width="15" fill="none" stroke-linecap="round"/><path d="M70 86 C118 64 156 106 212 86 S300 68 336 98" stroke="url(#g-${el.dataset.kind})" stroke-width="8" fill="none" stroke-linecap="round"/></svg>` : "") + (el.dataset.kind === "choc" ? '<span class="mini-scoop"></span><span class="mini-scoop mini-scoop--b"></span>' : "") + (el.dataset.kind === "pistachio" ? '<span class="nuts"><i></i><i></i><i></i><i></i><i></i></span>' : "");
    });
    $(".order__pic").innerHTML = `<img src="${cr.url}" alt="">`;
    update();
  }).catch(() => { $(".obj__loading").textContent = "Görsel yüklenemedi."; });

  /* Keyframes: one value per step (0..5) */
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (t) => t * t * (3 - 2 * t);
  const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const BG = ["#efe2cf", "#ebdcc5", "#4a2a1b", "#7d5039", "#efe2cf", "#f2e7d6"].map(hex);
  const K = {
    tx: [17, 17, 16, 17, 16, 18], ty: [2, 4, 8, 5, 12, 12], sc: [1, .96, .98, 1, 1.02, 1.02], rot: [-8, -6, -2, -5, 0, 0],
    topY: [0, -26, -34, 0, 0, 0], topR: [0, -7, -8, 0, 0, 0], botY: [0, 4, 5, 0, 0, 0],
    scoopY: [-150, -150, 0, 10, 10, 10], fill: [1, 1, 1, 0, 0, 0], sauce: [0, 0, 1, 1, 1, 1], drizzle: [0, 0, 1, 1, 1, 1], pour: [0, 0, 1, 0, 0, 0], seam: [0, 0, 0, 1, 0, 0],
    snow: [0, 1, .6, 0, 0, 0], butter: [0, 1, 0, 0, 0, 0], curl: [0, 0, 1, .4, 0, 0],
    plate: [0, 0, 0, 0, 1, 1], knifeO: [0, 0, 0, 0, 1, 1], knifeY: [-95, -95, -95, -95, -30, -6], knifeR: [-70, -70, -70, -70, -80, -90], split: [0, 0, 0, 0, 0, 1], burst: [0, 0, 0, 0, 0, 1],
    steam: [1, 0, 0, 0, 0, .7],
  };
  const MOBILE = { tx: [0, 0, 0, 0, 0, 0], ty: [17, 17, 20, 18, 21, 21], knifeY: [-60, -60, -60, -60, -13, -3] };
  const UNIT = { tx: "vw", ty: "vh", topY: "%", botY: "%", scoopY: "vh", knifeY: "vh", rot: "deg", topR: "deg", knifeR: "deg" };

  const steps = $$(".step"), dots = $$(".dots li");
  let lastStep = -1, ticking = false;
  const update = () => {
    ticking = false;
    const r = story.getBoundingClientRect();
    const total = story.offsetHeight - innerHeight;
    const prog = Math.min(1, Math.max(0, -r.top / total));
    const s = prog * 5;
    const i = Math.min(4, Math.floor(s)), f = reduce ? Math.round(s - i) : smooth(s - i);
    const mobile = innerWidth <= 900;
    for (const key in K) {
      const arr = mobile && MOBILE[key] ? MOBILE[key] : K[key];
      // the knife goes down first, then the halves part around it
      const ff = (key === "split" || key === "burst") && i === 4 ? smooth(Math.min(1, Math.max(0, (s - i - .35) / .65))) : f;
      const v = lerp(arr[i], arr[i + 1], ff);
      stage.style.setProperty("--" + key, v.toFixed(3) + (UNIT[key] || ""));
    }
    const bg = BG[i].map((c, ch) => Math.round(lerp(c, BG[i + 1][ch], f)));
    stage.style.setProperty("--bg", `rgb(${bg.join(",")})`);
    const dark = s > 1.5 && s < 3.6;
    document.documentElement.style.setProperty("--top-ink", dark && r.top < 1 && r.bottom > 80 ? "#fbf5ec" : "#2a1a12");
    document.documentElement.style.setProperty("--top-bg", dark ? "#4a2a1b" : "#efe2cf");
    const step = Math.round(s);
    if (step !== lastStep) {
      lastStep = step;
      steps.forEach((el, k) => el.classList.toggle("is-on", k === step));
      dots.forEach((el, k) => el.classList.toggle("is-on", k === step));
    }
  };
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: .2 });
  $$(".card, .order, .menu__head").forEach((el) => io.observe(el));
  addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  addEventListener("resize", update);
  update();
})();
