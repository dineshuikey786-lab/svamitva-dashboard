dash.loader('sheet', {
  description: 'Turns the sheet’s grid of text into one row per village per update day: counts as numbers, and both date styles (11/10/2026 and 15-10-2026, day first) as 2026-10-11.',
  fn: ({ answer }) => {
    let a = typeof answer === 'string' ? JSON.parse(answer) : answer;
    if (a && Array.isArray(a.content) && a.content[0] && typeof a.content[0].text === 'string') a = JSON.parse(a.content[0].text);
    if (!a || !Array.isArray(a.values) || !a.values.length) throw new Error('Google Sheets returned no values for Sheet1.');
    const head = a.values[0].map((h) => String(h).trim().toLowerCase());
    const col = (name) => head.findIndex((h) => h.startsWith(name));
    const c = { village: col('village'), lgd: col('lgd'), patwari: col('patwari'), plots: col('plots'), beneficiaries: col('beneficiaries'),
      initiated: col('registry'), verification: col('patwari_verification'), submitted: col('submitted'), registration: col('registration'),
      completed: col('completed'), date: col('date') };
    const num = (x) => { const v = Number(String(x ?? '').replace(/[,%\s]/g, '')); return Number.isFinite(v) ? v : 0; };
    const iso = (s) => {
      const t = String(s ?? '').trim();
      const m = t.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/);
      if (m) return m[3] + '-' + m[2].padStart(2, '0') + '-' + m[1].padStart(2, '0');
      return /^\d{4}-\d{2}-\d{2}/.test(t) ? t.slice(0, 10) : null;
    };
    const rows = [];
    for (const r of a.values.slice(1)) {
      const date = iso(r[c.date]);
      const lgd = String(r[c.lgd] ?? '').trim();
      if (!date || !lgd) continue;
      rows.push({ date, lgd, village: String(r[c.village] ?? '').trim(), patwari: String(r[c.patwari] ?? '').trim() || 'Not assigned',
        plots: num(r[c.plots]), beneficiaries: num(r[c.beneficiaries]), initiated: num(r[c.initiated]), verification: num(r[c.verification]),
        submitted: num(r[c.submitted]), registration: num(r[c.registration]), completed: num(r[c.completed]) });
    }
    return { columns: ['date', 'lgd', 'village', 'patwari', 'plots', 'beneficiaries', 'initiated', 'verification', 'submitted', 'registration', 'completed'], rows };
  },
});

dash.calc('village_daily', {
  inputs: ['sheet'],
  title: 'Village progress by day',
  description: 'Each village on each update day: plots not yet started, % completed, change in completed plots since its previous update, and how many updates in a row nothing changed (3 or more = stuck).',
  fn: (sheet) => {
    const K = ['initiated', 'verification', 'submitted', 'registration', 'completed'];
    const STUCK_AFTER = 3;
    const rows = sheet.slice().sort((a, b) => a.lgd.localeCompare(b.lgd) || a.date.localeCompare(b.date));
    const out = [];
    let prev = null;
    for (const r of rows) {
      const p = prev && prev.lgd === r.lgd ? prev : null;
      const inRegistry = K.reduce((s, k) => s + r[k], 0);
      const moved = p ? K.some((k) => r[k] !== p[k]) : null;
      const idle = moved === false ? p.idle + 1 : 0;
      const o = { date: r.date, lgd: r.lgd, village: r.village, patwari: r.patwari, plots: r.plots,
        not_started: Math.max(0, r.plots - inRegistry), initiated: r.initiated, verification: r.verification, submitted: r.submitted,
        registration: r.registration, completed: r.completed, pct: r.plots ? r.completed / r.plots : 0,
        d_completed: p ? r.completed - p.completed : null, moved, idle, stuck: idle >= STUCK_AFTER && r.completed < r.plots };
      out.push(o);
      prev = o;
    }
    return out;
  },
});

dash.calc('scope_daily', {
  inputs: ['village_daily'],
  title: 'Tehsil, patwari and village totals by day',
  description: 'Village rows added up per update day for the whole tehsil (scope "all"), each patwari ("p:" + name) and each village ("v:" + LGD code).',
  fn: (village_daily) => {
    const K = ['plots', 'not_started', 'initiated', 'verification', 'submitted', 'registration', 'completed'];
    const m = new Map();
    const add = (scope, name, patwari, r) => {
      const id = scope + '|' + r.date;
      let a = m.get(id);
      if (!a) {
        a = { scope, date: r.date, name, patwari, villages: 0, moved: 0, stuck: 0, d_completed: null };
        K.forEach((k) => { a[k] = 0; });
        m.set(id, a);
      }
      a.villages += 1;
      K.forEach((k) => { a[k] += r[k]; });
      if (r.moved) a.moved += 1;
      if (r.stuck) a.stuck += 1;
      if (r.d_completed != null) a.d_completed = (a.d_completed ?? 0) + r.d_completed;
    };
    for (const r of village_daily) {
      add('all', 'Tamia tehsil', '', r);
      add('p:' + r.patwari, r.patwari, r.patwari, r);
      add('v:' + r.lgd, r.village, r.patwari, r);
    }
    return [...m.values()].map((a) => ({ ...a,
      in_process: a.initiated + a.verification + a.submitted + a.registration,
      pending_other: a.initiated + a.submitted + a.registration,
      remaining: a.plots - a.completed,
      pct: a.plots ? a.completed / a.plots : 0,
      d_pct: a.d_completed == null || !a.plots ? null : a.d_completed / a.plots }));
  },
});

dash.calc('patwari_range', {
  inputs: ['scope_daily'],
  title: 'Patwari progress between two days',
  description: 'For every patwari and every pair of update days (from, to): % completed on each day, % points gained, plots completed in between, and plots completed per update.',
  fn: (scope_daily) => {
    const m = new Map();
    for (const r of scope_daily) {
      if (!r.scope.startsWith('p:')) continue;
      if (!m.has(r.patwari)) m.set(r.patwari, []);
      m.get(r.patwari).push(r);
    }
    const out = [];
    for (const [patwari, rows] of m) {
      rows.sort((a, b) => a.date.localeCompare(b.date));
      rows.forEach((a, i) => {
        for (let j = i; j < rows.length; j++) {
          const b = rows[j];
          const done = b.completed - a.completed;
          out.push({ patwari, from: a.date, to: b.date, villages: b.villages, plots: b.plots, pct_from: a.pct, pct_to: b.pct,
            gain_pts: b.pct - a.pct, plots_done: done, per_update: j > i ? done / (j - i) : 0,
            verification: b.verification, not_started: b.not_started, stuck: b.stuck });
        }
      });
    }
    return out;
  },
});

dash.calc('patwari_dod', {
  inputs: ['scope_daily'],
  title: 'Patwari previous vs current day',
  description: 'For the tehsil and each patwari on each update day: every stage count on that day and on the previous update day, the change, plots completed that day (work) vs plots completed on the previous day, and whether work went up or down.',
  fn: (scope_daily) => {
    const K = ['not_started', 'initiated', 'verification', 'submitted', 'registration', 'completed'];
    const m = new Map();
    for (const r of scope_daily) {
      if (r.scope !== 'all' && !r.scope.startsWith('p:')) continue;
      if (!m.has(r.scope)) m.set(r.scope, []);
      m.get(r.scope).push(r);
    }
    const out = [];
    for (const rows of m.values()) {
      rows.sort((a, b) => a.date.localeCompare(b.date));
      rows.forEach((r, i) => {
        const p = i > 0 ? rows[i - 1] : null;
        const o = { scope: r.scope, name: r.name, patwari: r.patwari, date: r.date, prev_date: p ? p.date : null, villages: r.villages, plots: r.plots,
          pct: r.pct, prev_pct: p ? p.pct : null, d_pct: p ? r.pct - p.pct : null,
          work_today: r.d_completed, work_prev: p ? p.d_completed : null, moved: r.moved, prev_moved: p ? p.moved : null, stuck: r.stuck, prev_stuck: p ? p.stuck : null };
        for (const k of K) { o[k] = r[k]; o['prev_' + k] = p ? p[k] : null; o['d_' + k] = p ? r[k] - p[k] : null; }
        o.d_work = o.work_today != null && o.work_prev != null ? o.work_today - o.work_prev : null;
        o.trend = o.work_today == null ? 'First update' : o.work_today <= 0 ? 'No work' : o.work_prev == null || o.d_work > 0 ? 'Faster' : o.d_work < 0 ? 'Slower' : 'Same';
        out.push(o);
      });
    }
    return out;
  },
});
