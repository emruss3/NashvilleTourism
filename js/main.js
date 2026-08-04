/* Nashville.com — homepage interactions & card rendering */
(function () {
  'use strict';
  var D = window.NASHVILLE_DATA || {};

  function stars(n) {
    return '★★★★★☆☆☆☆☆'.slice(5 - n, 10 - n);
  }

  function media(item) {
    var badge = item.badge ? '<span class="card__badge">' + item.badge + '</span>' : '';
    var price = item.price ? '<span class="card__price">' + item.price + '</span>' : '';
    return '<div class="card__media"><div class="ph" style="background:linear-gradient(135deg,#12263a,#2a1245)">' +
      item.emoji + '</div>' + badge + price + '</div>';
  }

  function bigCard(item) {
    return '<article class="card reveal">' + media(item) +
      '<div class="card__body">' +
        '<h3 class="card__title">' + item.name + '</h3>' +
        (item.area ? '<div class="card__meta">📍 ' + item.area + '</div>' : '') +
        '<p class="card__desc">' + item.desc + '</p>' +
        '<div class="card__foot">' +
          (item.stars ? '<span class="stars" title="' + item.stars + ' stars">' + stars(item.stars) + '</span>' : '<span></span>') +
          '<a href="#" class="card__cta" data-book="' + item.name + '">Book &rarr;</a>' +
        '</div>' +
      '</div></article>';
  }

  function smallCard(item) {
    return '<article class="card reveal">' + media(item) +
      '<div class="card__body">' +
        '<h3 class="card__title" style="font-size:1rem">' + item.name + '</h3>' +
        '<p class="card__desc">' + item.desc + '</p>' +
        '<a href="#" class="card__cta" data-book="' + item.name + '">Details &rarr;</a>' +
      '</div></article>';
  }

  function hoodCard(item) {
    return '<article class="card reveal">' + media(item) +
      '<div class="card__body">' +
        '<h3 class="card__title">' + item.name + '</h3>' +
        '<p class="card__desc">' + item.desc + '</p>' +
      '</div></article>';
  }

  function fill(id, items, fn) {
    var el = document.getElementById(id);
    if (el && items) el.innerHTML = items.map(fn).join('');
  }

  fill('hotelGrid', D.hotels, bigCard);
  fill('showGrid', D.shows, bigCard);
  fill('thingsGrid', D.things, smallCard);
  fill('diningGrid', D.dining, bigCard);
  fill('hoodGrid', D.neighborhoods, hoodCard);
  fill('dealGrid', D.deals, bigCard);

  // Footer year
  var y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();

  // Mobile nav toggle
  var toggle = document.getElementById('navToggle');
  var header = document.querySelector('.header');
  if (toggle && header) {
    toggle.addEventListener('click', function () {
      var open = header.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    header.querySelectorAll('.nav a').forEach(function (a) {
      a.addEventListener('click', function () { header.classList.remove('open'); });
    });
  }

  // Search tabs
  document.querySelectorAll('.search__tab').forEach(function (tab) {
    tab.addEventListener('click', function () {
      document.querySelectorAll('.search__tab').forEach(function (t) { t.classList.remove('is-active'); });
      tab.classList.add('is-active');
    });
  });

  // Toast helper
  var toastEl;
  function toast(msg) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'toast';
      document.body.appendChild(toastEl);
    }
    toastEl.innerHTML = msg;
    toastEl.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { toastEl.classList.remove('show'); }, 3200);
  }

  // Search submit (demo)
  var sf = document.getElementById('searchForm');
  if (sf) sf.addEventListener('submit', function (e) {
    e.preventDefault();
    toast('🔎 Searching <em>Nashville</em> availability…');
  });

  // Newsletter submit (demo)
  var nf = document.getElementById('newsletterForm');
  if (nf) nf.addEventListener('submit', function (e) {
    e.preventDefault();
    nf.reset();
    toast('🎸 You\'re on the list — welcome to <em>Music City</em>!');
  });

  // Book / details buttons (demo)
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-book]');
    if (t) {
      e.preventDefault();
      toast('🎟️ Reserved a spot at <em>' + t.getAttribute('data-book') + '</em> (demo)');
    }
  });

  // Reveal-on-scroll
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12 });
    document.querySelectorAll('.reveal').forEach(function (el) { io.observe(el); });
  } else {
    document.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('in'); });
  }
})();
