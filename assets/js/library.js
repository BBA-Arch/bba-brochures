/* Brochure library. Reads /brochures.json.
   Public page (data-mode="public") lists only brochures with "visible": true.
   Staff page (data-mode="staff", protected by staticwebapp.config.json) lists all. */
(function () {
  var staff = document.body.getAttribute('data-mode') === 'staff';
  var grid = document.getElementById('grid');
  var filters = document.getElementById('filters');
  var empty = document.getElementById('empty');
  var current = 'all';
  var data = null;
  var overrides = {};
  var busy = {};

  var DRAWINGS = {
    roof: '<path d="M4 58 L60 30 L116 58"/><rect x="20" y="58" width="80" height="22"/><line x1="44" y1="58" x2="44" y2="80"/><line x1="76" y1="58" x2="76" y2="80"/><line x1="4" y1="80" x2="116" y2="80"/>',
    store: '<path d="M10 32 L20 20 H100 L110 32 Z"/><rect x="14" y="32" width="92" height="48"/><rect x="52" y="50" width="16" height="30"/><rect x="22" y="44" width="22" height="22"/><rect x="76" y="44" width="22" height="22"/><line x1="4" y1="80" x2="116" y2="80"/>',
    site: '<rect x="8" y="8" width="104" height="74"/><path d="M8 46 H60 V8"/><rect x="72" y="18" width="28" height="20"/><rect x="18" y="56" width="26" height="16"/><path d="M60 82 C62 62 88 58 112 56"/>',
    gable: '<path d="M22 80 V44 L60 14 L98 44 V80 Z"/><rect x="52" y="56" width="16" height="24"/><rect x="32" y="50" width="12" height="12"/><line x1="8" y1="80" x2="112" y2="80"/>',
    saw: '<path d="M10 80 V42 L30 26 V42 L50 26 V42 L70 26 V42 L90 26 V42 L110 26 V80 Z"/><rect x="44" y="56" width="32" height="24"/><line x1="44" y1="64" x2="76" y2="64"/><line x1="44" y1="72" x2="76" y2="72"/><line x1="4" y1="80" x2="116" y2="80"/>'
  };

  function esc(s) { var d = document.createElement('div'); d.textContent = s == null ? '' : String(s); return d.innerHTML; }
  function ready(b) { return b.pages && b.pages.length > 0; }
  function isVisible(b) {
    var o = overrides[b.id];
    if (o === undefined) return !!b.visible;
    return typeof o === 'object' ? !!o.visible : !!o;
  }
  function changedNote(b) {
    var o = overrides[b.id];
    if (!o || typeof o !== 'object' || !o.at) return '';
    var when = new Date(o.at);
    return 'Changed ' + when.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) + (o.by ? ' by ' + o.by : '');
  }
  function matches(b) { return current === 'all' || b.sector === current || (b.also || []).indexOf(current) >= 0; }

  function card(b) {
    var href = ready(b) ? ((staff ? '/staff/preview?b=' : '/viewer.html?b=') + encodeURIComponent(b.id)) : null;
    var cover = ready(b)
      ? '<img class="photo" src="/' + esc(b.folder) + '/p01.jpg" alt="" loading="lazy">'
      : '<img class="logo" src="/assets/img/bba-logo-reversed.png" alt=""><svg viewBox="0 0 120 90" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">' + (DRAWINGS[b.drawing] || DRAWINGS.gable) + '</svg><div class="t">' + esc(b.title) + '</div>';
    var inner = '<div class="cover">' + cover + '</div><div style="display:flex;flex-direction:column;gap:8px"><h3>' + esc(b.title) + '</h3><p>' + esc(b.description) + '</p>' + (href ? '<span class="read">Read online</span>' : '') + '</div>';
    var vis = isVisible(b);
    var status = '';
    if (staff) {
      var label = vis ? 'Visible to clients' : 'Hidden from clients';
      status = ready(b)
        ? '<button type="button" class="switch" role="switch" data-id="' + esc(b.id) + '" aria-checked="' + vis + '"' + (busy[b.id] ? ' disabled' : '') + '><span class="track" aria-hidden="true"><span class="knob"></span></span><span>' + label + '</span></button>' +
          (changedNote(b) ? '<span class="changed">' + esc(changedNote(b)) + '</span>' : '')
        : '<span class="status off">Hidden, PDF needed</span>';
    }
    var body = href ? '<a href="' + href + '">' + inner + '</a>' : '<div class="body">' + inner + '</div>';
    return '<div class="card' + (staff && !vis ? ' hidden' : '') + '">' + body + status + '</div>';
  }

  function render() {
    var list = data.brochures.filter(function (b) { return (staff || (isVisible(b) && ready(b))) && matches(b); });
    grid.innerHTML = list.map(card).join('');
    empty.hidden = list.length > 0;
    Array.prototype.forEach.call(filters.querySelectorAll('button'), function (btn) {
      btn.setAttribute('aria-pressed', btn.getAttribute('data-sector') === current ? 'true' : 'false');
    });
    if (staff) {
      var n = data.brochures.filter(function (b) { return !isVisible(b); }).length;
      var note = document.getElementById('hidden-note');
      if (note) note.textContent = n === 1 ? '1 brochure hidden from clients' : n + ' brochures hidden from clients';
    }
  }

  function say(msg) {
    var el = document.getElementById('switch-msg');
    if (el) el.textContent = msg;
  }

  if (staff) {
    grid.addEventListener('click', function (e) {
      var sw = e.target.closest('.switch');
      if (!sw || sw.disabled) return;
      var id = sw.getAttribute('data-id');
      var b = data.brochures.filter(function (x) { return x.id === id; })[0];
      var next = !isVisible(b);
      var before = overrides[id];
      overrides[id] = { visible: next };
      busy[id] = true;
      render();
      fetch('/api/visibility', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: id, visible: next }) })
        .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.error || ('HTTP ' + r.status)); return j; }); })
        .then(function (j) {
          overrides[id] = j.override;
          say(b.title + (next ? ' is now visible to clients.' : ' is now hidden from clients.'));
        })
        .catch(function (err) {
          if (before === undefined) delete overrides[id]; else overrides[id] = before;
          say('Couldn’t change ' + b.title + ': ' + err.message);
        })
        .then(function () { delete busy[id]; render(); var again = grid.querySelector('.switch[data-id="' + id + '"]'); if (again) again.focus(); });
    });
  }

  var overrideReq = fetch('/api/visibility', { cache: 'no-store' })
    .then(function (r) { return r.ok ? r.json() : { overrides: {} }; })
    .catch(function () { return { overrides: {} }; });

  Promise.all([fetch('/brochures.json', { cache: 'no-cache' }).then(function (r) { return r.json(); }), overrideReq])
    .then(function (res) {
      var d = res[0];
      overrides = (res[1] && res[1].overrides) || {};
      data = d;
      var sectors = ['all'].concat(d.sectors);
      filters.innerHTML = sectors.map(function (s) {
        return '<button type="button" class="chip" data-sector="' + esc(s) + '" aria-pressed="false">' + esc(s) + '</button>';
      }).join('');
      filters.addEventListener('click', function (e) {
        var b = e.target.closest('button[data-sector]');
        if (!b) return;
        current = b.getAttribute('data-sector');
        render();
      });
      render();
    })
    .catch(function () {
      grid.innerHTML = '';
      empty.hidden = false;
      empty.textContent = 'The brochure list didn’t load. Please refresh the page.';
    });
})();
