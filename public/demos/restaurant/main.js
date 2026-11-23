// Sofra Meyhane & Ocakbaşı — page logic + 3D boot
const root = document.documentElement;
const reducedMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
const reduced = reducedMQ.matches;

/* ---------------- Header ---------------- */
const header = document.getElementById('top');
const onHeader = () => header.classList.toggle('is-solid', window.scrollY > window.innerHeight * 0.6);
onHeader();
window.addEventListener('scroll', onHeader, { passive: true });

/* ---------------- Reveal ---------------- */
const revealEls = document.querySelectorAll('[data-reveal]');
// stagger siblings that share a parent
revealEls.forEach((el) => {
  const sibs = [...el.parentElement.children].filter((c) => c.hasAttribute('data-reveal'));
  const i = sibs.indexOf(el);
  if (i > 0) el.style.setProperty('--d', `${Math.min(i, 5) * 0.1}s`);
});
if ('IntersectionObserver' in window && !reduced) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
    });
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });
  revealEls.forEach((el) => io.observe(el));
} else {
  revealEls.forEach((el) => el.classList.add('is-in'));
}

/* ---------------- Tabs ---------------- */
const tabs = [...document.querySelectorAll('.tab')];
const bar = document.querySelector('.tabs__bar');
function selectTab(tab, focus) {
  tabs.forEach((t, i) => {
    const on = t === tab;
    t.setAttribute('aria-selected', String(on));
    t.tabIndex = on ? 0 : -1;
    const panel = document.getElementById(t.getAttribute('aria-controls'));
    panel.hidden = !on;
    if (on) {
      panel.classList.remove('is-entering');
      void panel.offsetWidth;
      panel.classList.add('is-entering');
      bar.style.transform = `translateX(${i * 100}%)`;
    }
  });
  if (focus) tab.focus();
}
tabs.forEach((t, i) => {
  t.addEventListener('click', () => selectTab(t));
  t.addEventListener('keydown', (e) => {
    let n = null;
    if (e.key === 'ArrowRight') n = (i + 1) % tabs.length;
    else if (e.key === 'ArrowLeft') n = (i - 1 + tabs.length) % tabs.length;
    else if (e.key === 'Home') n = 0;
    else if (e.key === 'End') n = tabs.length - 1;
    if (n !== null) { e.preventDefault(); selectTab(tabs[n], true); }
  });
});

/* ---------------- Reservation (client-side only) ---------------- */
const form = document.getElementById('rez-form');
const confirmBox = document.getElementById('rez-confirm');
const errorEl = document.getElementById('f-error');
const dateInput = document.getElementById('f-date');
const nameInput = document.getElementById('f-name');
const today = new Date();
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
dateInput.min = iso(today);

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = nameInput.value.trim();
  const date = dateInput.value;
  const people = document.getElementById('f-people').value;
  nameInput.removeAttribute('aria-invalid');
  dateInput.removeAttribute('aria-invalid');
  if (!name) {
    errorEl.textContent = 'Masayı kimin adına ayıralım? Ad soyad alanını doldurun.';
    nameInput.setAttribute('aria-invalid', 'true');
    nameInput.focus();
    return;
  }
  if (!date || date < dateInput.min) {
    errorEl.textContent = 'Bugün ya da sonrası için bir tarih seçin.';
    dateInput.setAttribute('aria-invalid', 'true');
    dateInput.focus();
    return;
  }
  errorEl.textContent = '';
  const [y, m, d] = date.split('-').map(Number);
  const pretty = new Date(y, m - 1, d).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' });
  const first = name.split(/\s+/)[0];
  confirmBox.querySelector('.confirm__title').textContent = `Masanız ayrıldı, ${first}.`;
  confirmBox.querySelector('.confirm__text').textContent =
    `${pretty}, ${people} kişi. Bu bir konsept sayfa olduğu için kayıt gerçekte iletilmedi; gerçek bir restoranda onay e-postası burada gelirdi.`;
  form.hidden = true;
  confirmBox.hidden = false;
  confirmBox.focus();
});
document.getElementById('rez-again').addEventListener('click', () => {
  form.reset();
  confirmBox.hidden = true;
  form.hidden = false;
  nameInput.focus();
});

/* ---------------- 3D scene ---------------- */
const STATES = ['hero', 'story', 'menuA', 'menuB', 'aksam', 'reserve'];
let anchors = [];

function computeAnchors() {
  const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  anchors = [];
  document.querySelectorAll('[data-cam]').forEach((el) => {
    const names = el.dataset.cam.split(',');
    const top = el.getBoundingClientRect().top + window.scrollY;
    names.forEach((n, i) => {
      const frac = (i + 0.5) / names.length;
      const y = Math.min(maxScroll, Math.max(0, top + el.offsetHeight * frac - window.innerHeight / 2));
      anchors.push({ y, idx: STATES.indexOf(n.trim()) });
    });
  });
  anchors.sort((a, b) => a.y - b.y);
}

function camProgress() {
  const s = window.scrollY;
  if (!anchors.length) return 0;
  if (s <= anchors[0].y) return anchors[0].idx;
  for (let i = 0; i < anchors.length - 1; i++) {
    const a = anchors[i], b = anchors[i + 1];
    if (s < b.y) {
      const span = b.y - a.y;
      const t = span > 0 ? (s - a.y) / span : 1;
      return a.idx + (b.idx - a.idx) * t;
    }
  }
  return anchors[anchors.length - 1].idx;
}

function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch (e) { return false; }
}

async function boot() {
  const canvas = document.getElementById('scene');
  if (!hasWebGL()) { root.classList.add('no-webgl'); return; }
  let api;
  try {
    const mod = await import('./scene.js');
    api = mod.createScene(canvas, {
      reduced,
      small: window.matchMedia('(max-width: 767px)').matches,
      states: STATES,
    });
  } catch (err) {
    console.warn('[sofra] WebGL sahnesi başlatılamadı, statik görünüme geçildi.', err);
    root.classList.add('no-webgl');
    return;
  }

  const push = () => api.setScroll(camProgress(), window.scrollY / window.innerHeight);
  computeAnchors();
  push();
  requestAnimationFrame(() => root.classList.add('scene-ready'));

  window.addEventListener('scroll', push, { passive: true });
  let rt;
  window.addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(() => { computeAnchors(); api.resize(); push(); }, 120);
  });
  // fonts can change layout height
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { computeAnchors(); push(); });
  window.addEventListener('load', () => { computeAnchors(); push(); });

  if (!reduced) {
    window.addEventListener('pointermove', (e) => {
      api.setPointer((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1);
    }, { passive: true });
  }
  document.addEventListener('visibilitychange', () => api.setActive(!document.hidden));
}

boot();
