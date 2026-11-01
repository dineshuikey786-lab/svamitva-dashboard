// A small stand-in for the dashboard runtime, so the same page code runs on any static host.
// It reads the Google Sheet as CSV, runs the loader and calculations in js/calcs.js,
// and redraws every [data-draw] element when data, filters or the window size change.
(function () {
  const cfg = window.SV_CONFIG || {};
  const DEFAULTS = { asof: null, from: null, to: null, patwari: null, village: null, stage: null, rank_by: 'gain_pts', topn: 5 };
  let params = { ...DEFAULTS };
  const loaders = new Map();
  const calcs = new Map();
  const draws = new Map();
  const listeners = [];
  const results = new Map();
  let loading = true;
  let lastLoaded = null;

  const empty = (status, message) => ({ status, data: [], columns: [], message: message || '', refreshing: false, meta: [] });

  function sourceUrl() {
    if (cfg.CSV_URL) return cfg.CSV_URL + (cfg.CSV_URL.includes('?') ? '&' : '?') + 't=' + Date.now();
    return 'https://docs.google.com/spreadsheets/d/' + encodeURIComponent(cfg.SHEET_ID) + '/gviz/tq?tqx=out:csv&headers=1&sheet=' + encodeURIComponent(cfg.SHEET_NAME || 'Sheet1') + '&t=' + Date.now();
  }

  function compute(values) {
    results.clear();
    const fn = loaders.get('sheet');
    const out = fn({ answer: { values } });
    const rows = Array.isArray(out) ? out : out.rows;
    results.set('sheet', { status: 'ok', data: rows, columns: out.columns || Object.keys(rows[0] || {}), message: '', refreshing: false, meta: [] });
    let progress = true;
    while (progress) {
      progress = false;
      for (const [id, c] of calcs) {
        if (results.has(id)) continue;
        if (!c.inputs.every((i) => results.has(i))) continue;
        const ins = c.inputs.map((i) => results.get(i));
        const bad = ins.find((r) => r.status !== 'ok');
        if (bad) { results.set(id, empty(bad.status, bad.message)); progress = true; continue; }
        try {
          const data = c.fn(...ins.map((r) => r.data));
          results.set(id, { status: 'ok', data, columns: Object.keys((data && data[0]) || {}), message: '', refreshing: false, meta: [] });
        } catch (e) {
          console.error('Calculation ' + id + ' failed', e);
          results.set(id, empty('error', String(e && e.message || e)));
        }
        progress = true;
      }
    }
  }

  async function load() {
    loading = true;
    document.documentElement.dataset.svLoading = '1';
    status('Loading data from Google Sheet…');
    try {
      const res = await fetch(sourceUrl(), { cache: 'no-store' });
      if (!res.ok) throw new Error('Google Sheets answered ' + res.status + '. Check that the sheet is published to the web or shared with anyone with the link.');
      const text = await res.text();
      if (/^\s*</.test(text)) throw new Error('Google Sheets sent a sign-in page instead of data. Publish the sheet to the web (see README).');
      const values = d3.csvParseRows(text);
      compute(values);
      lastLoaded = new Date();
      status('Data from Google Sheet · loaded ' + lastLoaded.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }));
    } catch (e) {
      console.error(e);
      if (!results.size) {
        results.set('sheet', empty('error', String(e.message || e)));
        for (const id of calcs.keys()) results.set(id, empty('error', String(e.message || e)));
      }
      status('Could not load the sheet: ' + (e.message || e), true);
    }
    loading = false;
    delete document.documentElement.dataset.svLoading;
    render();
  }

  function status(text, bad) {
    for (const el of document.querySelectorAll('.sv-loadstate')) {
      el.textContent = text;
      el.classList.toggle('sv-loadbad', !!bad);
    }
  }

  function visible(el) { return !el.closest('[hidden]'); }

  function runDraw(name) {
    const fn = draws.get(name);
    if (!fn) return;
    for (const el of document.querySelectorAll('[data-draw="' + name + '"]')) {
      if (!visible(el)) continue;
      try { fn(el); } catch (e) { console.error('Drawing ' + name + ' failed', e); }
    }
  }

  let queued = false;
  function render() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      for (const fn of listeners) { try { fn(); } catch (e) { console.error(e); } }
      for (const name of draws.keys()) runDraw(name);
    });
  }

  function readHash() {
    // Filters are kept in the address after "?" so a link opens the same view.
    try {
      const q = new URLSearchParams(location.search);
      for (const k of Object.keys(DEFAULTS)) {
        if (!q.has(k)) continue;
        const v = q.get(k);
        params[k] = k === 'topn' ? Number(v) : v || null;
      }
    } catch (e) { /* ignore */ }
  }
  function writeQuery() {
    try {
      const q = new URLSearchParams();
      for (const [k, v] of Object.entries(params)) if (v != null && v !== '' && v !== DEFAULTS[k]) q.set(k, v);
      const s = q.toString();
      history.replaceState(null, '', location.pathname + (s ? '?' + s : '') + location.hash);
    } catch (e) { /* ignore */ }
  }

  window.dash = {
    colors: ['var(--sv-c1)', 'var(--sv-c2)', 'var(--sv-c3)', 'var(--sv-c4)', 'var(--sv-c5)', 'var(--sv-c6)', 'var(--sv-c7)', 'var(--sv-c8)'],
    data(id) { return results.get(id) || empty(loading ? 'loading' : 'missing'); },
    onData(fn) { listeners.push(fn); try { fn(); } catch (e) { console.error(e); } },
    draw(name, fn) { if (typeof fn === 'function') draws.set(name, fn); else runDraw(name); },
    calc(id, def) { calcs.set(id, def); },
    loader(id, def) { loaders.set(id, def.fn); },
    params() { return { ...params }; },
    setParams(o) {
      for (const [k, v] of Object.entries(o || {})) params[k] = v;
      writeQuery();
      render();
    },
    resetParams() { params = { ...DEFAULTS }; writeQuery(); render(); },
    setLink(name) { try { history.replaceState(null, '', location.pathname + location.search + '#' + name); } catch (e) { /* ignore */ } },
    refresh() { load(); },
  };

  readHash();
  window.addEventListener('DOMContentLoaded', () => {
    for (const b of document.querySelectorAll('.sv-refresh')) b.addEventListener('click', () => load());
    new MutationObserver(render).observe(document.body, { attributes: true, attributeFilter: ['hidden'], subtree: true });
    let w = window.innerWidth;
    window.addEventListener('resize', () => { if (window.innerWidth !== w) { w = window.innerWidth; render(); } });
    render();
    load();
    const mins = Number(cfg.AUTO_REFRESH_MINUTES) || 0;
    if (mins > 0) setInterval(() => { if (!document.hidden) load(); }, mins * 60000);
  });
})();
