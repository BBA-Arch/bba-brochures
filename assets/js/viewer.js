/* Flipbook viewer: /viewer.html?b=<id> (public) or /staff/preview?b=<id> (staff, shows hidden brochures).
   Two-page book with 3D page turns when the stage is 900px or wider; one page with a corner curl when narrower. */
(function () {
  var cfg = window.BBA_CONFIG || {};
  var isStaff = location.pathname.indexOf('/staff/') === 0;
  var id = new URLSearchParams(location.search).get('b') || '';
  var $ = function (s) { return document.getElementById(s); };
  var stage = $('stage'), book = $('book'), narrow = $('narrow'), label = $('label'), thumbs = $('thumbs');
  var zoomport = $('zoomport'), zoomer = $('zoomer');
  var ZOOMS = [1, 1.25, 1.5, 2, 2.5];
  var state = { idx: 0, fromK: 0, zoom: 1 };
  var b, N, last, lastAlone, leaves = [], pages = [], fold;

  if (isStaff) { $('back').href = '/staff/'; }

  function esc(s) { var d = document.createElement('div'); d.textContent = s == null ? '' : String(s); return d.innerHTML; }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function src(i) { return '/' + b.folder + '/p' + pad(i + 1) + '.jpg'; }
  function wide() { return stage.clientWidth >= 900; }
  function spreadOf(i) { return i === 0 ? 0 : Math.floor((i + 1) / 2); }
  function mateOf(i) { return (i === 0 || (lastAlone && i === last)) ? -1 : (i % 2 === 1 ? i + 1 : i - 1); }
  function startOf(i) { return (i === 0 || (lastAlone && i === last)) ? i : (i % 2 === 1 ? i : i - 1); }
  function pageName(i) { return i === 0 ? 'Cover' : i === last ? 'Back cover' : 'Page ' + (i + 1); }

  function missing(msg) {
    stage.innerHTML = '<p class="missing">' + msg + '</p>';
    $('open-dl').hidden = true; $('copy').hidden = true;
  }

  function build() {
    document.title = b.title + ' | Bringhurst & Baer Architects';
    $('title').textContent = b.title;
    N = b.pages.length; last = N - 1; lastAlone = last % 2 === 1;
    var L = Math.ceil(N / 2);
    var html = '';
    for (var j = 0; j < L; j++) {
      var f = 2 * j, k = 2 * j + 1;
      html += '<div class="leaf"><div class="face front"><img src="' + src(f) + '" alt="' + esc(b.pages[f]) + '"' + (j > 1 ? ' loading="lazy"' : '') + '></div>' +
        '<div class="face back">' + (k < N ? '<img src="' + src(k) + '" alt="' + esc(b.pages[k]) + '" loading="lazy">' : '') + '</div></div>';
    }
    book.innerHTML = html + '<div class="spine" aria-hidden="true"></div>';
    leaves = Array.prototype.slice.call(book.querySelectorAll('.leaf'));
    var nh = '';
    for (var i = 0; i < N; i++) nh += '<div class="pg" hidden><img src="' + src(i) + '" alt="' + esc(b.pages[i]) + '" loading="lazy"></div>';
    narrow.innerHTML = nh + '<div class="fold" aria-hidden="true"></div>';
    pages = Array.prototype.slice.call(narrow.querySelectorAll('.pg'));
    fold = narrow.querySelector('.fold');
    thumbs.innerHTML = b.pages.map(function (_, i) {
      return '<button type="button" class="tb" data-i="' + i + '">' + (i === 0 ? 'Cover' : i === last ? 'Back' : (i + 1)) + '</button>';
    }).join('');
    buildDownload();
  }

  function render(dir) {
    var idx = state.idx, k = spreadOf(idx), mate = mateOf(idx);
    leaves.forEach(function (leaf, j) {
      var fwd = j >= state.fromK && j < k, back = j >= k && j < state.fromK;
      var order = fwd ? j - state.fromK : back ? state.fromK - 1 - j : 0;
      leaf.style.transform = j < k ? 'rotateY(-180deg)' : 'rotateY(0deg)';
      leaf.style.zIndex = (fwd || back) ? 20 + order : (j < k ? j + 1 : 10 - j);
      leaf.style.transitionDelay = (fwd || back) ? (order * 0.15) + 's' : '0s';
    });
    pages.forEach(function (p, i) {
      p.hidden = i !== idx;
      p.classList.remove('curlA', 'curlC');
    });
    if (dir) {
      var cur = pages[idx];
      void cur.offsetWidth;
      cur.classList.add(dir === 'next' ? 'curlA' : 'curlC');
      fold.classList.remove('goN', 'goP', 'prev');
      void fold.offsetWidth;
      if (dir === 'prev') fold.classList.add('prev');
      fold.classList.add(dir === 'next' ? 'goN' : 'goP');
    }
    var s0 = startOf(idx);
    label.textContent = wide()
      ? ((idx === 0 || (lastAlone && idx === last)) ? pageName(idx) : 'Pages ' + (s0 + 1) + '–' + (s0 + 2) + ' of ' + N)
      : (idx === 0 || idx === last ? pageName(idx) : 'Page ' + (idx + 1) + ' of ' + N);
    $('prev').disabled = idx === 0;
    $('next').disabled = wide() ? spreadOf(idx) === spreadOf(last) : idx === last;
    Array.prototype.forEach.call(thumbs.children, function (t, i) {
      t.classList.toggle('on', i === idx);
      t.classList.toggle('mate', i === mate);
      t.setAttribute('aria-current', i === idx ? 'page' : 'false');
    });
  }

  function go(n) {
    if (n < 0 || n > last || n === state.idx) return;
    var dir = n > state.idx ? 'next' : 'prev';
    state.fromK = spreadOf(state.idx);
    state.idx = n;
    render(dir);
  }
  function next() {
    if (!wide()) return go(state.idx + 1);
    var nx = state.idx === 0 ? 1 : Math.min(last, startOf(state.idx) + 2);
    if (spreadOf(nx) !== spreadOf(state.idx)) go(nx);
  }
  function prev() {
    if (!wide()) return go(state.idx - 1);
    var st = startOf(state.idx);
    go(st === 1 ? 0 : st - 2);
  }

  function setZoom(z) {
    state.zoom = z;
    zoomer.style.zoom = String(z);
    zoomport.classList.toggle('zoomed', z > 1);
    $('zlabel').textContent = Math.round(z * 100) + '%';
    $('zout').disabled = z <= 1; $('zfit').disabled = z <= 1;
    $('zin').disabled = z >= ZOOMS[ZOOMS.length - 1];
  }

  /* Download panel: HubSpot form when configured, otherwise a direct link. */
  function buildDownload() {
    var body = $('dl-body');
    var link = '<a class="btn primary" href="/' + esc(b.pdf) + '" download>Download the PDF</a>';
    if (!cfg.hubspotPortalId || !cfg.hubspotFormId) {
      body.innerHTML = '<div><h2>' + esc(b.title) + ' PDF</h2><p>Share it with your board, committee, or lender.</p></div>' + link;
      return;
    }
    body.innerHTML =
      '<div style="flex:1 1 260px;max-width:340px"><h2>Get the PDF</h2><p>Tell us who you are and the download starts right away. We’ll also email you a copy.</p></div>' +
      '<form id="lead" style="display:flex;flex-wrap:wrap;gap:16px;align-items:flex-end;flex:999 1 560px" novalidate>' +
      '<div class="field"><label for="ln">Name</label><input id="ln" name="name" autocomplete="name" required></div>' +
      '<div class="field"><label for="le">Work email</label><input id="le" name="email" type="email" autocomplete="email" required></div>' +
      '<div class="field"><label for="lo">Organization</label><input id="lo" name="company" autocomplete="organization"></div>' +
      '<button class="btn primary" type="submit">Get the PDF</button>' +
      '<p id="lead-msg" role="status" style="width:100%"></p></form>';
    $('lead').addEventListener('submit', function (e) {
      e.preventDefault();
      var f = e.target, msg = $('lead-msg');
      var el = f.elements;
      var name = el.namedItem('name').value.trim(), email = el.namedItem('email').value.trim();
      if (!name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { msg.textContent = 'Please enter your name and a valid email.'; return; }
      var parts = name.split(/\s+/);
      var payload = {
        fields: [
          { name: 'firstname', value: parts[0] },
          { name: 'lastname', value: parts.slice(1).join(' ') },
          { name: 'email', value: email },
          { name: 'company', value: el.namedItem('company').value.trim() }
        ],
        context: { pageUri: location.href, pageName: b.title + ' brochure' }
      };
      msg.textContent = 'Sending…';
      fetch('https://api.hsforms.com/submissions/v3/integration/submit/' + encodeURIComponent(cfg.hubspotPortalId) + '/' + encodeURIComponent(cfg.hubspotFormId), {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      }).then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        body.innerHTML = '<div><h2>Thank you, ' + esc(parts[0]) + '.</h2><p>Your download is ready, and a copy is on its way to your inbox.</p></div>' + link;
      }).catch(function () {
        msg.innerHTML = 'That didn’t go through. You can still ' + '<a href="/' + esc(b.pdf) + '" download>download the PDF</a>.';
      });
    });
  }

  function wire() {
    $('next').addEventListener('click', next);
    $('prev').addEventListener('click', prev);
    thumbs.addEventListener('click', function (e) {
      var t = e.target.closest('[data-i]'); if (!t) return;
      var i = +t.getAttribute('data-i');
      go(wide() ? startOf(i) : i);
    });
    $('zin').addEventListener('click', function () { var z = ZOOMS.filter(function (v) { return v > state.zoom; })[0]; if (z) setZoom(z); });
    $('zout').addEventListener('click', function () { var z = ZOOMS.filter(function (v) { return v < state.zoom; }).pop(); if (z) setZoom(z); });
    $('zfit').addEventListener('click', function () { setZoom(1); });
    document.addEventListener('keydown', function (e) {
      if (e.target.closest('input, textarea')) return;
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') prev();
    });
    var sx = null;
    stage.addEventListener('touchstart', function (e) { if (state.zoom === 1 && e.touches.length === 1) sx = e.touches[0].clientX; }, { passive: true });
    stage.addEventListener('touchend', function (e) {
      if (sx === null) return;
      var dx = e.changedTouches[0].clientX - sx; sx = null;
      if (Math.abs(dx) > 50) { if (dx < 0) next(); else prev(); }
    });
    window.addEventListener('resize', function () { render(); });
    $('copy').addEventListener('click', function () {
      var btn = $('copy');
      var done = function () { btn.textContent = 'Link copied'; setTimeout(function () { btn.textContent = 'Copy link'; }, 2500); };
      if (navigator.clipboard) navigator.clipboard.writeText(location.origin + '/viewer.html?b=' + encodeURIComponent(b.id)).then(done, done); else done();
    });
    $('open-dl').addEventListener('click', function () {
      var dl = $('dl'); dl.hidden = !dl.hidden;
      $('open-dl').setAttribute('aria-expanded', String(!dl.hidden));
      if (!dl.hidden) { var first = dl.querySelector('input, a'); if (first) first.focus(); }
    });
  }

  fetch('/brochures.json', { cache: 'no-cache' })
    .then(function (r) { return r.json(); })
    .then(function (d) {
      b = d.brochures.filter(function (x) { return x.id === id; })[0];
      if (!b || !b.pages || !b.pages.length) return missing('That brochure isn’t available. <a href="/">See all brochures</a>.');
      if (!b.visible && !isStaff) return missing('That brochure isn’t available yet. <a href="/">See all brochures</a>.');
      build(); wire(); setZoom(1); render();
    })
    .catch(function () { missing('The brochure didn’t load. Please refresh the page.'); });
})();
