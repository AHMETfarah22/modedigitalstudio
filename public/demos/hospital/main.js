// Nabız Hastanesi — page logic (scroll story, nav, reveal, form) + 3D scene boot.

const root = document.documentElement;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------------- Header + menu ---------------- */
const header = document.querySelector('.site-header');
const nav = document.getElementById('main-nav');
const toggle = document.querySelector('.menu-toggle');

function setMenu(open) {
  nav.classList.toggle('open', open);
  toggle.setAttribute('aria-expanded', String(open));
  toggle.querySelector('.sr-only').textContent = open ? 'Menüyü kapat' : 'Menüyü aç';
}
toggle.addEventListener('click', () => setMenu(!nav.classList.contains('open')));
nav.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && nav.classList.contains('open')) { setMenu(false); toggle.focus(); }
});

/* ---------------- Reveal on view ---------------- */
const reveals = document.querySelectorAll('.reveal');
if (reduceMotion || !('IntersectionObserver' in window)) {
  reveals.forEach((el) => el.classList.add('in'));
} else {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
  reveals.forEach((el) => io.observe(el));
}

/* ---------------- Scroll story state ---------------- */
const sections = [...document.querySelectorAll('[data-scene]')];
const navLinks = [...nav.querySelectorAll('a')];
const depts = [...document.querySelectorAll('.dept')];
depts.forEach((d) => d.style.setProperty('--c', d.dataset.accent));

const story = {
  progress: 0,          // continuous 0..sections-1
  activeDept: 0,
  accent: depts[0].dataset.accent,
  pointer: { x: 0, y: 0 },
};

let anchors = [];
function measure() {
  const vh = window.innerHeight;
  const max = Math.max(0, document.documentElement.scrollHeight - vh);
  let prev = -1;
  anchors = sections.map((s, i) => {
    const r = s.getBoundingClientRect();
    const top = r.top + window.scrollY;
    let a = i === 0 ? 0 : top + Math.min(r.height, vh) * 0.5 - vh * 0.5;
    a = Math.min(Math.max(a, 0), max);
    if (a <= prev) a = prev + 1;
    prev = a;
    return a;
  });
}

let hoverDept = -1;
function updateScroll() {
  const y = window.scrollY;
  header.classList.toggle('scrolled', y > 12);

  // continuous section progress
  let p = 0;
  if (y >= anchors[anchors.length - 1]) p = anchors.length - 1;
  else {
    for (let i = 0; i < anchors.length - 1; i++) {
      if (y >= anchors[i] && y < anchors[i + 1]) {
        p = i + (y - anchors[i]) / (anchors[i + 1] - anchors[i]);
        break;
      }
    }
  }
  story.progress = p;

  // current nav link
  const current = Math.round(p);
  navLinks.forEach((a) => {
    const id = a.getAttribute('href').slice(1);
    const on = sections[current] && sections[current].id === id;
    a.classList.toggle('is-current', on);
    if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
  });

  // department nearest viewport centre (unless hovered / focused)
  if (hoverDept < 0) {
    const mid = window.innerHeight * 0.5;
    let best = 0, bestD = Infinity;
    depts.forEach((d, i) => {
      const r = d.getBoundingClientRect();
      const dist = Math.abs(r.top + r.height / 2 - mid) + (i % 2) * 2; // tie-break: left column
      if (dist < bestD) { bestD = dist; best = i; }
    });
    setDept(best);
  }
}

function setDept(i) {
  if (i === story.activeDept && depts[i].classList.contains('is-active')) return;
  story.activeDept = i;
  story.accent = depts[i].dataset.accent;
  depts.forEach((d, k) => d.classList.toggle('is-active', k === i));
}
depts.forEach((d, i) => {
  d.addEventListener('pointerenter', () => { hoverDept = i; setDept(i); });
  d.addEventListener('pointerleave', () => { hoverDept = -1; updateScroll(); });
  d.addEventListener('focus', () => { hoverDept = i; setDept(i); });
  d.addEventListener('blur', () => { hoverDept = -1; updateScroll(); });
});

window.addEventListener('pointermove', (e) => {
  story.pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
  story.pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
}, { passive: true });

let ticking = false;
window.addEventListener('scroll', () => {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => { ticking = false; updateScroll(); });
}, { passive: true });
window.addEventListener('resize', () => { measure(); updateScroll(); });
window.addEventListener('load', () => { measure(); updateScroll(); });
measure();
updateScroll();

/* ---------------- Appointment form ---------------- */
const form = document.getElementById('appt-form');
const confirmBox = document.getElementById('appt-confirm');
const confirmText = document.getElementById('confirm-text');
const dateInput = document.getElementById('f-tarih');

function isoLocal(d) {
  const z = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}
const todayIso = isoLocal(new Date());
dateInput.min = todayIso;

const rules = {
  bolum: (v) => (v ? '' : 'Lütfen bir bölüm seçin.'),
  tarih: (v) => {
    if (!v) return 'Lütfen bir tarih seçin.';
    if (v < todayIso) return 'Bugün ya da ileri bir tarih seçin.';
    return '';
  },
  ad: (v) => (v.trim().length >= 2 ? '' : 'Lütfen adınızı ve soyadınızı yazın.'),
};

function validateField(el) {
  const msg = rules[el.name](el.value);
  const field = el.closest('.field');
  field.classList.toggle('invalid', !!msg);
  el.setAttribute('aria-invalid', msg ? 'true' : 'false');
  field.querySelector('.field-error').textContent = msg;
  return !msg;
}
[...form.elements].forEach((el) => {
  if (!rules[el.name]) return;
  el.addEventListener('blur', () => { if (el.value) validateField(el); });
  el.addEventListener('input', () => { if (el.closest('.field').classList.contains('invalid')) validateField(el); });
});

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const fields = ['bolum', 'tarih', 'ad'].map((n) => form.elements[n]);
  const results = fields.map(validateField);
  const firstBad = fields[results.indexOf(false)];
  if (firstBad) { firstBad.focus(); return; }

  const [y, m, d] = form.elements.tarih.value.split('-').map(Number);
  const dateText = new Date(y, m - 1, d).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' });
  const name = form.elements.ad.value.trim().split(/\s+/)[0];
  confirmText.textContent = `Teşekkürler ${name}. ${form.elements.bolum.value} bölümü için ${dateText} tarihli randevu talebiniz alındı.`;

  form.hidden = true;
  confirmBox.hidden = false;
  confirmBox.classList.remove('show');
  void confirmBox.offsetWidth;
  confirmBox.classList.add('show');
  confirmBox.setAttribute('tabindex', '-1');
  confirmBox.focus({ preventScroll: true });
  story.confirmPulse = performance.now();
  measure();
});

document.getElementById('appt-reset').addEventListener('click', () => {
  form.reset();
  confirmBox.hidden = true;
  form.hidden = false;
  form.elements.bolum.focus();
  measure();
});

/* ---------------- 3D scene ---------------- */
function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch (err) { return false; }
}

if (!webglAvailable()) {
  root.classList.add('no-webgl');
} else {
  import('./scene.js')
    .then(({ createScene }) => {
      createScene(document.getElementById('scene'), story, { reduceMotion });
    })
    .catch((err) => {
      console.warn('3D sahne başlatılamadı:', err);
      root.classList.add('no-webgl');
    });
}
