// Page UI that must work even without WebGL: reveals, header state, phone nav.
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

// Entrance reveals
const revealEls = document.querySelectorAll('[data-reveal]');
if (reduced || !('IntersectionObserver' in window)) {
  revealEls.forEach((el) => el.classList.add('is-in'));
} else {
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) {
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      }
    }
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });
  revealEls.forEach((el) => io.observe(el));
}

// Header background after leaving the top
const header = document.querySelector('.site-header');
const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 24);
addEventListener('scroll', onScroll, { passive: true });
onScroll();

// Phone navigation
const toggle = document.querySelector('.nav-toggle');
const list = document.getElementById('nav-list');
if (toggle && list) {
  const setOpen = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    list.classList.toggle('is-open', open);
  };
  toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
  list.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
      setOpen(false);
      toggle.focus();
    }
  });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.nav')) setOpen(false);
  });
}
