/* Liman Butik Otel: page UI (reveals + booking form). Runs without WebGL. */
(function () {
  'use strict';

  // ---- entrance reveals ----
  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('is-in');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.18, rootMargin: '0px 0px -8% 0px' });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('is-in'); });
  }

  // ---- booking form (client side only) ----
  var form = document.getElementById('bookingForm');
  if (!form) return;
  var inEl = document.getElementById('checkin');
  var outEl = document.getElementById('checkout');
  var err = document.getElementById('formError');
  var confirmBox = document.getElementById('confirm');
  var confirmText = document.getElementById('confirmText');
  var resetBtn = document.getElementById('confirmReset');

  function iso(d) {
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + day;
  }
  function parse(v) {
    var p = v.split('-');
    return new Date(+p[0], +p[1] - 1, +p[2]);
  }

  var today = new Date();
  today.setHours(0, 0, 0, 0);
  inEl.min = iso(today);
  outEl.min = iso(new Date(today.getTime() + 864e5));

  inEl.addEventListener('change', function () {
    if (!inEl.value) return;
    var next = new Date(parse(inEl.value).getTime() + 864e5);
    outEl.min = iso(next);
    if (!outEl.value || parse(outEl.value) <= parse(inEl.value)) outEl.value = iso(next);
  });

  function fail(msg, field) {
    err.textContent = msg;
    [inEl, outEl].forEach(function (f) { f.removeAttribute('aria-invalid'); });
    if (field) {
      field.setAttribute('aria-invalid', 'true');
      field.focus();
    }
  }

  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    if (!inEl.value) return fail('Giriş tarihini seçin.', inEl);
    if (!outEl.value) return fail('Çıkış tarihini seçin.', outEl);
    var a = parse(inEl.value);
    var b = parse(outEl.value);
    if (a < today) return fail('Giriş tarihi bugünden önce olamaz.', inEl);
    if (b <= a) return fail('Çıkış tarihi, giriş tarihinden sonra olmalı.', outEl);
    fail('');

    var nights = Math.round((b - a) / 864e5);
    var fmt = { day: 'numeric', month: 'long' };
    var guests = document.getElementById('guests').value;
    var room = document.getElementById('room').value;
    confirmText.textContent =
      a.toLocaleDateString('tr-TR', fmt) + ' – ' + b.toLocaleDateString('tr-TR', fmt) +
      ', ' + nights + ' gece, ' + guests + ' kişi, ' + room +
      '. Uygunluğu rezervasyon@liman.example adresinden yazacağız.';
    form.hidden = true;
    confirmBox.hidden = false;
    resetBtn.focus({ preventScroll: true });
  });

  resetBtn.addEventListener('click', function () {
    confirmBox.hidden = true;
    form.hidden = false;
    inEl.focus();
  });
})();
