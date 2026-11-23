/* Ustura Berber Kulübü · interactions (no libraries) */
(() => {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const tl = (n) => n.toLocaleString("tr-TR");
  const UNS = (id, w) => `https://images.unsplash.com/${id}?w=${w}&q=70&auto=format&fit=crop`;

  // Sample data for the concept
  const SERVICES = [
    { id: "kesim", name: "Saç kesimi", price: 450, mins: 40 },
    { id: "fade", name: "Skin fade", price: 500, mins: 45 },
    { id: "sakal", name: "Sakal tasarımı", price: 300, mins: 25 },
    { id: "kafa", name: "Ustura ile kafa tıraşı", price: 400, mins: 35 },
    { id: "ikili", name: "Saç + sakal", price: 750, mins: 60 },
    { id: "havlu", name: "Sıcak havlu tıraşı", price: 350, mins: 30 },
    { id: "cocuk", name: "Çocuk kesimi", price: 300, mins: 30 },
    { id: "tam", name: "Tam bakım", price: 950, mins: 90 },
  ];
  const BARBERS = [
    { id: "emre", name: "Emre", role: "KURUCU USTA", since: "2016'DAN BERİ", img: "photo-1567894340315-735d7c361db0" },
    { id: "can", name: "Can", role: "FADE UZMANI", since: "2019'DAN BERİ", img: "photo-1599351431202-1e0f0137899a" },
    { id: "murat", name: "Murat", role: "USTURA VE SAKAL", since: "2021'DEN BERİ", img: "photo-1647140655214-e4a2d914971f" },
  ];
  const SLOTS = ["10.00", "11.00", "12.00", "13.30", "14.30", "15.30", "17.00", "18.00", "19.00", "20.00"];

  /* Opening: scissors snip across, hair falls, the screen splits open */
  (() => {
    const cut = $("#cut"), skip = $("#cutSkip");
    const open = () => document.body.classList.add("is-open");
    if (!cut) { open(); return; }
    const sc = $("#scissors"), line = $("#cutLine"), cv = $("#cutHair"), ctx = cv.getContext("2d");
    const A = $("#bladeA"), B = $("#bladeB");
    let W = 0, H = 0, dpr = Math.min(devicePixelRatio || 1, 2);
    const size = () => { W = innerWidth; H = innerHeight; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    size(); addEventListener("resize", size);
    const hair = [];
    const COLORS = ["#d8c3a5", "#b8996f", "#8a6a4a", "#efe6d8", "#ff9a4a"];
    const burst = (x, y, n) => {
      for (let i = 0; i < n; i++) hair.push({
        x: x + (Math.random() - .5) * 30, y: y + (Math.random() - .5) * 8,
        vx: (Math.random() - .5) * 2.2, vy: -Math.random() * 2.2 - .4,
        r: Math.random() * Math.PI, vr: (Math.random() - .5) * .25,
        l: 9 + Math.random() * 18, bend: (Math.random() - .5) * 10,
        c: COLORS[(Math.random() * COLORS.length) | 0], w: .8 + Math.random() * 1.2, life: 1,
      });
    };
    let done = false, splitAt = 0, t0 = 0, lastSnap = 1, raf = 0;
    const DUR = 1900, START = 650;
    const ease = (p) => p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
    const split = () => {
      if (splitAt) return;
      splitAt = performance.now();
      cut.classList.add("is-sliced");
      setTimeout(() => { cut.classList.add("is-split"); skip.hidden = true; open(); }, 180);
      setTimeout(() => { cut.classList.add("is-gone"); cancelAnimationFrame(raf); done = true; }, 1400);
    };
    const frame = (now) => {
      if (!t0) t0 = now;
      const t = now - t0;
      // scissors travel and snip
      const p = Math.min(1, Math.max(0, (t - START) / DUR));
      const sw = sc.getBoundingClientRect().width || 150;
      const x = -sw - 20 + (W + sw + 60) * ease(p);
      const snip = .5 + .5 * Math.cos((t - START) / 1000 * Math.PI * 2 * 3.1);
      const ang = p > 0 && p < 1 ? 17 * snip : 10;
      A.setAttribute("transform", `rotate(${-ang} 54 36)`);
      B.setAttribute("transform", `rotate(${ang} 54 36)`);
      sc.style.transform = `translate(${x}px, -50%)`;
      const tipX = x + sw * .96;
      line.style.transform = `scaleX(${Math.max(0, Math.min(1, tipX / W))})`;
      if (p > 0 && p < 1 && snip < .12 && lastSnap >= .12) burst(Math.max(0, tipX - sw * .15), H / 2, 42);
      lastSnap = snip;
      if (p >= 1) split();
      // hair
      ctx.clearRect(0, 0, W, H);
      for (let i = hair.length - 1; i >= 0; i--) {
        const h = hair[i];
        h.vy += .16; h.vx *= .99; h.x += h.vx; h.y += h.vy; h.r += h.vr;
        if (splitAt) h.life -= .012;
        if (h.y > H + 40 || h.life <= 0) { hair.splice(i, 1); continue; }
        ctx.save(); ctx.translate(h.x, h.y); ctx.rotate(h.r); ctx.globalAlpha = Math.max(0, h.life);
        ctx.strokeStyle = h.c; ctx.lineWidth = h.w; ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(-h.l / 2, 0); ctx.quadraticCurveTo(0, h.bend, h.l / 2, 0); ctx.stroke(); ctx.restore();
      }
      if (!done) raf = requestAnimationFrame(frame);
    };
    const skipNow = () => { if (!splitAt) { line.style.transform = "scaleX(1)"; split(); } };
    if (reduce) {
      cut.classList.add("is-split"); skip.hidden = true; open();
      setTimeout(() => cut.classList.add("is-gone"), 300);
    } else {
      raf = requestAnimationFrame(frame);
      cut.addEventListener("click", skipNow);
      skip.addEventListener("click", skipNow);
      addEventListener("keydown", (e) => { if (e.key === "Escape" || e.key === "Enter" || e.key === " ") skipNow(); }, { once: true });
    }
  })();

  /* Header + reveals */
  const top = $(".top");
  const onScroll = () => top.classList.toggle("is-solid", scrollY > 40);
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  const revealEls = $$(".intro > div, .clock, .lines__left, .barbers__head, .proof__head, .book__left, .wizard, .finale__title");
  revealEls.forEach((el) => el.classList.add("reveal"));
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); } });
  }, { threshold: 0.12 });
  revealEls.forEach((el) => io.observe(el));
  // Gallery: reveal every tile, staggered, once the wall comes into view
  const wall = $(".wall");
  const wallIo = new IntersectionObserver((entries) => {
    if (!entries.some((en) => en.isIntersecting)) return;
    $$(".tile", wall).forEach((t, i) => { t.style.transitionDelay = i * 0.09 + "s"; t.classList.add("is-in"); });
    wallIo.disconnect();
  }, { threshold: 0.05 });
  wallIo.observe(wall);

  /* Live clock (Istanbul time, opening hours Tue–Sun 10–21) */
  const clock = $(".clock"), cTime = $("#clockTime"), cState = $("#clockState"), cToday = $("#clockToday");
  $("#clockChairs").textContent = "3 KOLTUK";
  const tick = () => {
    const parts = Object.fromEntries(new Intl.DateTimeFormat("tr-TR", { timeZone: "Europe/Istanbul", hour: "2-digit", minute: "2-digit", weekday: "short", hour12: false })
      .formatToParts(new Date()).map((p) => [p.type, p.value]));
    const h = +parts.hour, m = +parts.minute;
    const day = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Istanbul", weekday: "short" }).format(new Date());
    const closedDay = day === "Mon";
    const open = !closedDay && h >= 10 && h < 21;
    cTime.innerHTML = `${parts.hour}<span class="colon">:</span>${parts.minute}`;
    cState.textContent = open ? "ŞU AN AÇIK" : "ŞU AN KAPALI";
    clock.classList.toggle("is-closed", !open);
    cToday.textContent = closedDay ? "KAPALI" : "10–21";
    const left = open ? (21 * 60 - (h * 60 + m)) : 0;
    $("#clockWait").textContent = open ? (left > 60 ? Math.floor(left / 60) + " SA KALDI" : left + " DK KALDI") : "YARIN 10.00";
  };
  tick();
  setInterval(tick, 15000);

  /* Pick a line, we stamp it */
  const dateStr = new Date().toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" });
  $("#ticketDate").textContent = dateStr;
  $("#stampDate").textContent = dateStr;
  const items = $("#ticketItems"), stamp = $("#stamp"), ticket = $("#ticket");
  const picked = $(".picked"), pName = $("#pickedName"), pPrice = $("#pickedPrice"), pGo = $("#pickedGo");
  items.innerHTML = SERVICES.map((s) => `<li><button class="ticket__row" type="button" role="option" aria-selected="false" data-id="${s.id}">
    <span>${s.name.toLocaleUpperCase("tr-TR")}</span><span class="lead" aria-hidden="true"></span><span>${tl(s.price)} ₺</span></button></li>`).join("");
  let pickedId = null;
  const countTo = (el, to) => {
    const from = +el.textContent.replace(/\D/g, "") || 0;
    if (reduce) { el.textContent = tl(to); return; }
    const t0 = performance.now(), d = 500;
    const step = (now) => { const p = Math.min(1, (now - t0) / d); el.textContent = tl(Math.round(from + (to - from) * (1 - Math.pow(1 - p, 3)))); if (p < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  };
  items.addEventListener("click", (e) => {
    const row = e.target.closest(".ticket__row");
    if (!row) return;
    const s = SERVICES.find((x) => x.id === row.dataset.id);
    pickedId = s.id;
    $$(".ticket__row", items).forEach((r) => r.setAttribute("aria-selected", String(r === row)));
    // land the stamp next to the chosen line
    const tr = ticket.getBoundingClientRect(), rr = row.getBoundingClientRect();
    stamp.style.top = Math.max(110, rr.top - tr.top - 26) + "px";
    stamp.classList.remove("is-on"); void stamp.offsetWidth; stamp.classList.add("is-on");
    setTimeout(() => { ticket.classList.remove("is-thud"); void ticket.offsetWidth; ticket.classList.add("is-thud"); }, reduce ? 0 : 220);
    pName.textContent = s.name;
    countTo(pPrice, s.price);
    picked.classList.remove("is-pop"); void picked.offsetWidth; picked.classList.add("is-pop");
    pGo.setAttribute("aria-disabled", "false");
  });
  pGo.addEventListener("click", () => { if (pickedId) choose("service", pickedId, true); });

  /* Barbers deck */
  const deck = $("#deck");
  let active = 1;
  deck.innerHTML = BARBERS.map((b, i) => `<article class="card" role="listitem" data-i="${i}" aria-label="${b.name}, ${b.role.toLocaleLowerCase("tr-TR")}">
    <img src="${UNS(b.img, 800)}" alt="" loading="lazy">
    <div class="card__body"><p class="card__role">${b.role}</p><p class="card__name">${b.name}</p><p class="card__since">${b.since}</p>
    <a class="btn btn--light btn--sm" href="#randevu" data-barber="${b.id}" tabindex="-1">${b.name} ile randevu al</a></div></article>`).join("");
  const cards = $$(".card", deck);
  const layout = () => {
    cards.forEach((c, i) => {
      let pos = i - active;
      if (pos > 1) pos -= 3; if (pos < -1) pos += 3;
      c.dataset.pos = pos;
      c.querySelector(".btn").tabIndex = pos === 0 ? 0 : -1;
    });
    $("#deckNo").textContent = String(active + 1).padStart(2, "0");
  };
  layout();
  const go = (d) => { active = (active + d + 3) % 3; layout(); };
  $("#deckPrev").addEventListener("click", () => go(-1));
  $("#deckNext").addEventListener("click", () => go(1));
  deck.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-barber]");
    if (btn) { choose("barber", btn.dataset.barber, true); return; }
    const c = e.target.closest(".card");
    if (c && c.dataset.pos !== "0") { active = +c.dataset.i; layout(); }
  });
  deck.addEventListener("keydown", (e) => { if (e.key === "ArrowLeft") go(-1); if (e.key === "ArrowRight") go(1); });

  /* Booking wizard */
  const state = { service: null, barber: null, day: null, slot: null, name: "" };
  let step = 0, reached = 0;
  const tabs = $$(".steps button"), panes = $$(".pane"), next = $("#wNext"), back = $("#wBack"), sum = $("#wSum");
  $("#optService").innerHTML = SERVICES.map((s) => `<button class="opt" type="button" aria-pressed="false" data-k="service" data-v="${s.id}"><span class="opt__name">${s.name}</span><span class="opt__meta">${s.mins} DK · ${tl(s.price)} ₺</span></button>`).join("");
  $("#optBarber").innerHTML = `<button class="opt" type="button" aria-pressed="false" data-k="barber" data-v="any"><span class="opt__name">Boşta olan usta</span><span class="opt__meta">EN HIZLI</span></button>` +
    BARBERS.map((b) => `<button class="opt" type="button" aria-pressed="false" data-k="barber" data-v="${b.id}"><span class="opt__left"><img class="opt__face" src="${UNS(b.img, 120)}" alt=""><span class="opt__name">${b.name}</span></span><span class="opt__meta">${b.role}</span></button>`).join("");
  const DAYS = [];
  for (let i = 0; i < 6; i++) { const d = new Date(); d.setDate(d.getDate() + i); DAYS.push(d); }
  $("#optDay").innerHTML = DAYS.map((d, i) => {
    const closed = d.getDay() === 1;
    return `<button class="day" type="button" aria-pressed="false" data-k="day" data-v="${i}" ${closed ? "disabled" : ""}>${i === 0 ? "BUGÜN" : d.toLocaleDateString("tr-TR", { weekday: "short" }).toLocaleUpperCase("tr-TR")}<b>${d.getDate()}</b>${closed ? "KAPALI" : d.toLocaleDateString("tr-TR", { month: "short" }).toLocaleUpperCase("tr-TR")}</button>`;
  }).join("");
  const renderSlots = () => {
    const seed = (state.day ?? 0) * 7 + 3;
    $("#optSlot").innerHTML = SLOTS.map((t, i) => {
      const taken = ((i * 13 + seed) % 5) === 0;
      return `<button class="slot" type="button" aria-pressed="${state.slot === t}" data-k="slot" data-v="${t}" ${taken ? `disabled aria-label="${t}, dolu"` : ""}>${t}</button>`;
    }).join("");
  };
  renderSlots();

  const valid = () => [state.service, state.barber, state.day !== null && state.slot, state.name.trim().length > 1][step];
  const summary = () => {
    const s = SERVICES.find((x) => x.id === state.service);
    const b = state.barber === "any" ? "Boşta olan usta" : BARBERS.find((x) => x.id === state.barber)?.name;
    const d = state.day !== null ? DAYS[state.day].toLocaleDateString("tr-TR", { day: "numeric", month: "long" }) : "";
    return [s && `${s.name} · ${tl(s.price)} ₺`, b, d && state.slot && `${d} ${state.slot}`].filter(Boolean).join(" · ");
  };
  const show = (n) => {
    step = n; reached = Math.max(reached, n);
    panes.forEach((p) => { const on = +p.dataset.pane === n; p.hidden = !on; p.classList.toggle("is-on", on); });
    tabs.forEach((t, i) => { t.setAttribute("aria-selected", String(i === Math.min(n, 3))); t.disabled = i > reached || n === 4; });
    back.hidden = n === 0 || n === 4;
    next.hidden = n === 4;
    next.textContent = n === 3 ? "Randevuyu onayla" : "Devam";
    next.disabled = !valid();
    sum.textContent = n === 4 ? "" : summary();
  };
  const choose = (k, v, jump) => {
    state[k] = v;
    $$(`[data-k="${k}"]`).forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === String(v))));
    if (k === "day") { state.slot = null; renderSlots(); }
    if (jump) {
      // jump straight to the next unanswered step
      const firstOpen = [state.service, state.barber, state.slot].findIndex((x) => !x);
      reached = Math.max(reached, firstOpen === -1 ? 3 : firstOpen);
      show(firstOpen === -1 ? 3 : firstOpen);
    } else {
      next.disabled = !valid();
      sum.textContent = summary();
    }
  };
  $("#wizard").addEventListener("click", (e) => {
    const b = e.target.closest("[data-k]");
    if (b && !b.disabled) choose(b.dataset.k, b.dataset.k === "day" ? +b.dataset.v : b.dataset.v, false);
    const t = e.target.closest(".steps button");
    if (t && !t.disabled) show(+t.dataset.step);
  });
  $("#fName").addEventListener("input", (e) => { state.name = e.target.value; next.disabled = !valid(); });
  next.addEventListener("click", () => {
    if (!valid()) return;
    if (step < 3) return show(step + 1);
    $("#doneSum").textContent = `${state.name.trim()} · ${summary()}`;
    show(4);
  });
  back.addEventListener("click", () => step > 0 && show(step - 1));
  show(0);
})();
