/* Ustura Berber Kulübü · interactions (no libraries) */
(() => {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Sample prices for the concept
  const SERVICES = [
    { code: "H01", name: "Saç kesimi", desc: "Yıkama, kesim, şekillendirme", price: 450 },
    { code: "H02", name: "Sakal tıraşı", desc: "Sıcak havlu ve ustura ile hat", price: 300 },
    { code: "H03", name: "Kafa tıraşı", desc: "Ustura ile sıfır, sıcak havlu", price: 400 },
    { code: "H04", name: "Saç + sakal", desc: "İkisi bir arada, acele yok", price: 650 },
    { code: "H05", name: "Bıyık bakımı", desc: "Düzeltme ve wax", price: 150 },
    { code: "H06", name: "Çocuk kesimi", desc: "12 yaşa kadar", price: 300 },
  ];
  const SLOTS = ["10.00", "11.30", "13.00", "14.30", "16.00", "17.30", "19.00", "20.30"];
  const TAKEN = new Set(["11.30", "16.00", "19.00"]);

  const tl = (n) => n.toLocaleString("tr-TR") + " ₺";
  const today = new Date();
  const dateStr = today.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" });

  // Header state and spotlight
  const top = $(".top");
  const onScroll = () => top.classList.toggle("is-solid", scrollY > 40);
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  if (!reduce && matchMedia("(pointer: fine)").matches) {
    addEventListener("pointermove", (e) => {
      document.documentElement.style.setProperty("--mx", e.clientX + "px");
      document.documentElement.style.setProperty("--my", e.clientY + "px");
    }, { passive: true });
  }

  // Scroll reveals
  const toReveal = document.querySelectorAll(".lines__head, .menu, .ticket-wrap, .club__title, .rule, .hours__title, .hours__list, .hours__where");
  toReveal.forEach((el) => el.classList.add("reveal"));
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); } });
  }, { threshold: 0.15 });
  toReveal.forEach((el) => io.observe(el));

  // Services → receipt
  const menu = $("#menu"), items = $("#ticketItems"), empty = $("#ticketEmpty"), total = $("#ticketTotal");
  const stampBtn = $("#stampBtn"), stamp = $("#stamp"), ticket = $("#ticket"), slotsBox = $("#slots"), slotGrid = $("#slotGrid");
  const done = $("#done"), timeLine = $("#ticketTime");
  $("#ticketNo").textContent = "#" + String(Math.floor(1000 + Math.random() * 8999));
  $("#ticketDate").textContent = dateStr;
  $("#stampDate").textContent = dateStr;

  const chosen = new Map();
  let stage = "pick"; // pick → stamped → booked
  let slot = null;

  menu.innerHTML = SERVICES.map((s) => `
    <li><button class="svc" type="button" aria-pressed="false" data-code="${s.code}">
      <span class="svc__code">${s.code}</span>
      <span><span class="svc__name">${s.name}</span><span class="svc__desc">${s.desc}</span></span>
      <span class="svc__price">${tl(s.price)}<span class="svc__mark" aria-hidden="true">+</span></span>
    </button></li>`).join("");

  const render = (justAdded) => {
    items.querySelectorAll("li:not(#ticketEmpty)").forEach((li) => li.remove());
    empty.hidden = chosen.size > 0;
    let sum = 0;
    chosen.forEach((s) => {
      sum += s.price;
      const li = document.createElement("li");
      li.innerHTML = `<span>${s.name.toLocaleUpperCase("tr-TR")}</span><span>${tl(s.price)}</span>`;
      if (s.code === justAdded && !reduce) li.classList.add("is-new");
      items.appendChild(li);
    });
    total.textContent = tl(sum);
    stampBtn.disabled = chosen.size === 0;
  };

  menu.addEventListener("click", (e) => {
    const b = e.target.closest(".svc");
    if (!b || stage !== "pick") return;
    const s = SERVICES.find((x) => x.code === b.dataset.code);
    const on = b.getAttribute("aria-pressed") !== "true";
    b.setAttribute("aria-pressed", String(on));
    if (on) chosen.set(s.code, s); else chosen.delete(s.code);
    render(on ? s.code : null);
  });

  slotGrid.innerHTML = SLOTS.map((t) => `<button class="slot" type="button" aria-pressed="false" ${TAKEN.has(t) ? "disabled aria-label=\"" + t + ", dolu\"" : ""}>${t}</button>`).join("");
  slotGrid.addEventListener("click", (e) => {
    const b = e.target.closest(".slot");
    if (!b || b.disabled) return;
    slotGrid.querySelectorAll(".slot").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    slot = b.textContent;
    timeLine.hidden = false;
    timeLine.textContent = `SAAT ${slot} · KOLTUK 2`;
    stampBtn.disabled = false;
  });

  stampBtn.addEventListener("click", () => {
    if (stage === "pick") {
      stage = "stamped";
      menu.querySelectorAll(".svc").forEach((b) => (b.disabled = true));
      stamp.classList.remove("is-on"); void stamp.offsetWidth; stamp.classList.add("is-on");
      setTimeout(() => { ticket.classList.remove("is-thud"); void ticket.offsetWidth; ticket.classList.add("is-thud"); }, reduce ? 0 : 230);
      slotsBox.hidden = false;
      stampBtn.textContent = "Koltuğu ayır";
      stampBtn.disabled = true;
      slotGrid.querySelector(".slot:not(:disabled)")?.focus();
    } else if (stage === "stamped" && slot) {
      stage = "booked";
      stampBtn.hidden = true;
      slotGrid.querySelectorAll(".slot").forEach((b) => (b.disabled = true));
      done.hidden = false;
      done.textContent = `Koltuk ${slot} için ayrıldı. Bu bir konsept site; gerçek randevu oluşturulmadı.`;
    }
  });
})();
