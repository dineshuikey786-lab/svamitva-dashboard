import React from 'react';
import { AbsoluteFill, Easing, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import data from './data.json';

export const FPS = 30;
// Scene lengths in frames (30 fps). Total 60 seconds.
const S = { intro: 150, tehsil: 570, top: 330, bottom: 330, race: 270, outro: 150 };
export const DURATION = Object.values(S).reduce((a, b) => a + b, 0);

const C = {
  bg: '#0d1b17', panel: '#132a23', line: '#25423a', text: '#f1f5f2', muted: '#9db3aa',
  green: '#3fd28f', red: '#ff6b5b', amber: '#f5b847', blue: '#6fb3ff', grid: '#1f3730',
};
const SANS = '"Inter", "DejaVu Sans", sans-serif';
const DISPLAY = '"Inter Display", "Inter", "DejaVu Sans", sans-serif';

type Day = (typeof data.tehsil)[number];
type Pat = (typeof data.top)[number];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const day = (iso: string) => { const [, m, d] = iso.split('-'); return `${Number(d)} ${MONTHS[Number(m) - 1]}`; };
const pct = (v: number, digits = 1) => `${(v * 100).toFixed(digits)}%`;
const int = (v: number) => Math.round(v).toLocaleString('en-IN');
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const ease = Easing.bezier(0.22, 1, 0.36, 1);

const T = data.tehsil as Day[];
const LAST = T[T.length - 1];
const PREV = T[T.length - 2];

/* Fades a scene in and out at its edges. */
const Scene: React.FC<{ len: number; children: React.ReactNode }> = ({ len, children }) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [0, 12, len - 12, len], [0, 1, 1, 0], clamp);
  return <AbsoluteFill style={{ opacity: o, padding: '72px 96px', fontFamily: SANS, color: C.text }}>{children}</AbsoluteFill>;
};

const Kicker: React.FC<{ children: React.ReactNode; color?: string }> = ({ children, color = C.green }) => (
  <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: 4, textTransform: 'uppercase', color }}>{children}</div>
);
const Title: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const f = useCurrentFrame();
  const y = interpolate(f, [0, 20], [24, 0], { ...clamp, easing: ease });
  return <div style={{ fontFamily: DISPLAY, fontSize: 64, fontWeight: 800, lineHeight: 1.1, marginTop: 10, transform: `translateY(${y}px)` }}>{children}</div>;
};

/* ---------- 1. Intro ---------- */
const Intro: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: f - 8, fps, config: { damping: 200 } });
  const bar = interpolate(f, [30, 120], [0, LAST.pct], { ...clamp, easing: ease });
  return (
    <Scene len={S.intro}>
      <AbsoluteFill style={{ justifyContent: 'center', padding: '0 140px' }}>
        <div style={{ opacity: s, transform: `translateY(${(1 - s) * 30}px)` }}>
          <Kicker>SVAMITVA · Tamia tehsil, Chhindwara</Kicker>
          <div style={{ fontFamily: DISPLAY, fontSize: 108, fontWeight: 800, lineHeight: 1.02, marginTop: 18 }}>Registry progress,<br />day by day</div>
          <div style={{ fontSize: 36, color: C.muted, marginTop: 26 }}>
            {day(data.from)} – {day(data.to)} 2026 · {data.villageCount} villages · {data.patwariCount} patwaris · {int(LAST.plots)} plots
          </div>
          <div style={{ marginTop: 56, height: 22, width: 1100, background: C.grid, borderRadius: 11, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${bar * 100}%`, background: C.green, borderRadius: 11 }} />
          </div>
          <div style={{ fontSize: 30, marginTop: 14, color: C.muted }}><b style={{ color: C.green }}>{pct(bar)}</b> of plots completed</div>
        </div>
      </AbsoluteFill>
    </Scene>
  );
};

/* ---------- 2. Tehsil progress ---------- */
const Tehsil: React.FC = () => {
  const f = useCurrentFrame();
  const W = 1180, H = 620, L = 90, R = 30, TOP = 20, B = 60;
  const n = T.length;
  const drawEnd = S.tehsil - 90;
  const prog = interpolate(f, [30, drawEnd], [0, n - 1], { ...clamp, easing: Easing.inOut(Easing.quad) });
  const i = Math.floor(prog);
  const frac = prog - i;
  const cur = T[Math.min(i, n - 1)];
  const nxt = T[Math.min(i + 1, n - 1)];
  const lerp = (a: number, b: number) => a + (b - a) * frac;
  const x = (k: number) => L + (k / (n - 1)) * (W - L - R);
  const y = (v: number) => TOP + (1 - v) * (H - TOP - B);
  const shown = T.slice(0, i + 1).map((d, k) => [x(k), y(d.pct)] as const);
  shown.push([x(i + frac), y(lerp(cur.pct, nxt.pct))]);
  const path = shown.map(([a, b], k) => `${k ? 'L' : 'M'}${a.toFixed(1)},${b.toFixed(1)}`).join(' ');
  const area = `${path} L${shown[shown.length - 1][0].toFixed(1)},${y(0)} L${x(0)},${y(0)} Z`;
  const maxDaily = Math.max(...T.map((d) => d.daily));
  const nowPct = lerp(cur.pct, nxt.pct);
  const nowDone = lerp(cur.completed, nxt.completed);
  const showDate = frac > 0.5 ? nxt.date : cur.date;
  const peak = T.reduce((a, b) => (b.daily > a.daily ? b : a));
  const noteO = interpolate(f, [drawEnd, drawEnd + 20], [0, 1], clamp);
  return (
    <Scene len={S.tehsil}>
      <Kicker>Whole tehsil</Kicker>
      <Title>% of plots with registry completed</Title>
      <div style={{ display: 'flex', gap: 56, marginTop: 36 }}>
        <svg width={W} height={H} style={{ overflow: 'visible' }}>
          {[0, 0.25, 0.5, 0.75, 1].map((t) => (
            <g key={t}>
              <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke={C.grid} strokeWidth={2} />
              <text x={L - 18} y={y(t) + 9} fill={C.muted} fontSize={24} textAnchor="end">{t * 100}%</text>
            </g>
          ))}
          {T.map((d, k) => {
            const h = (d.daily / maxDaily) * 150;
            const o = k <= prog ? 1 : 0.0;
            return <rect key={d.date} x={x(k) - 14} y={y(0) - h} width={28} height={h} rx={4} fill={C.amber} opacity={o * 0.55} />;
          })}
          {T.map((d, k) => ((k % 3 === 0 && n - 1 - k >= 2) || k === n - 1 ? <text key={d.date} x={x(k)} y={H - 18} fill={C.muted} fontSize={22} textAnchor="middle">{day(d.date)}</text> : null))}
          <defs>
            <linearGradient id="ga" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor={C.green} stopOpacity={0.35} />
              <stop offset="1" stopColor={C.green} stopOpacity={0} />
            </linearGradient>
          </defs>
          <path d={area} fill="url(#ga)" />
          <path d={path} fill="none" stroke={C.green} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" />
          <circle cx={shown[shown.length - 1][0]} cy={shown[shown.length - 1][1]} r={13} fill={C.green} stroke={C.bg} strokeWidth={5} />
          <g opacity={noteO}>
            <line x1={x(T.indexOf(peak))} x2={x(T.indexOf(peak))} y1={y(0) - (peak.daily / maxDaily) * 150 - 10} y2={y(0.97)} stroke={C.amber} strokeWidth={2} strokeDasharray="6 6" />
            <text x={x(T.indexOf(peak)) - 12} y={y(0.97)} fill={C.amber} fontSize={24} fontWeight={700} textAnchor="end">Best day: {int(peak.daily)} plots on {day(peak.date)}</text>
          </g>
        </svg>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 34, justifyContent: 'center' }}>
          <Stat label="Update day" value={day(showDate)} color={C.text} />
          <Stat label="Completed" value={pct(nowPct)} color={C.green} big />
          <Stat label="Plots completed" value={`${int(nowDone)} / ${int(LAST.plots)}`} color={C.text} />
          <div style={{ fontSize: 24, color: C.muted, display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ width: 22, height: 22, borderRadius: 4, background: C.amber, opacity: 0.6 }} /> Plots completed each day
          </div>
        </div>
      </div>
    </Scene>
  );
};

const Stat: React.FC<{ label: string; value: string; color: string; big?: boolean }> = ({ label, value, color, big }) => (
  <div>
    <div style={{ fontSize: 24, color: C.muted, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' }}>{label}</div>
    <div style={{ fontFamily: DISPLAY, fontSize: big ? 120 : 64, fontWeight: 800, color, lineHeight: 1.05, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
  </div>
);

/* ---------- 3 & 4. Top and bottom patwaris ---------- */
const Ranking: React.FC<{ rows: Pat[]; color: string; kicker: string; title: string; note: string; len: number }> = ({ rows, color, kicker, title, note, len }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <Scene len={len}>
      <Kicker color={color}>{kicker}</Kicker>
      <Title>{title}</Title>
      <div style={{ marginTop: 60, display: 'flex', flexDirection: 'column', gap: 34 }}>
        {rows.map((p, k) => {
          const s = spring({ frame: f - 25 - k * 14, fps, config: { damping: 22, mass: 0.9 } });
          const w = Math.max(0, s) * p.pct;
          return (
            <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 28, opacity: Math.min(1, Math.max(0, s * 1.5)) }}>
              <div style={{ width: 70, fontFamily: DISPLAY, fontSize: 56, fontWeight: 800, color }}>{k + 1}</div>
              <div style={{ width: 520, fontSize: 40, fontWeight: 700 }}>{p.name}</div>
              <div style={{ flex: 1, height: 64, background: C.grid, borderRadius: 12, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', inset: 0, width: `${w * 100}%`, background: color, borderRadius: 12 }} />
              </div>
              <div style={{ width: 200, textAlign: 'right', fontFamily: DISPLAY, fontSize: 54, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{pct(w)}</div>
              <div style={{ width: 230, fontSize: 26, color: C.muted, fontVariantNumeric: 'tabular-nums' }}>{int(p.completed)} of {int(p.plots)} plots</div>
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 'auto', fontSize: 30, color: C.muted, opacity: interpolate(f, [110, 140], [0, 1], clamp) }}>{note}</div>
    </Scene>
  );
};

/* ---------- 5. Top vs bottom race ---------- */
const Race: React.FC = () => {
  const f = useCurrentFrame();
  const W = 1500, H = 640, L = 90, R = 330, TOP = 20, B = 56;
  const n = T.length;
  const prog = interpolate(f, [20, S.race - 60], [0, n - 1], { ...clamp, easing: Easing.inOut(Easing.quad) });
  const x = (k: number) => L + (k / (n - 1)) * (W - L - R);
  const y = (v: number) => TOP + (1 - v) * (H - TOP - B);
  const pathOf = (vals: number[]) => {
    const i = Math.floor(prog), fr = prog - i;
    const pts = vals.slice(0, i + 1).map((v, k) => [x(k), y(v)]);
    if (i < n - 1) pts.push([x(i + fr), y(vals[i] + (vals[i + 1] - vals[i]) * fr)]);
    return { d: pts.map(([a, b], k) => `${k ? 'L' : 'M'}${a.toFixed(1)},${b.toFixed(1)}`).join(' '), end: pts[pts.length - 1] };
  };
  const avg = (rows: Pat[]) => T.map((t) => rows.reduce((s, p) => s + (p.series.find((q) => q.date === t.date)?.pct ?? 0), 0) / rows.length);
  const lines = [
    { label: `Top ${data.top.length} average`, vals: avg(data.top), color: C.green, w: 8 },
    { label: 'Whole tehsil', vals: T.map((t) => t.pct), color: C.text, w: 5, dash: '14 10' },
    { label: `Bottom ${data.bottom.length} average`, vals: avg(data.bottom), color: C.red, w: 8 },
  ];
  const ends = lines.map((l) => pathOf(l.vals));
  const endO = interpolate(f, [S.race - 60, S.race - 40], [0, 1], clamp);
  const gap = lines[0].vals[n - 1] - lines[2].vals[n - 1];
  return (
    <Scene len={S.race}>
      <Kicker color={C.amber}>Top vs bottom</Kicker>
      <Title>The gap is {Math.round(gap * 100)} percentage points</Title>
      <svg width={W} height={H} style={{ marginTop: 36, overflow: 'visible' }}>
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <g key={t}>
            <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke={C.grid} strokeWidth={2} />
            <text x={L - 18} y={y(t) + 9} fill={C.muted} fontSize={24} textAnchor="end">{t * 100}%</text>
          </g>
        ))}
        {T.map((d, k) => ((k % 3 === 0 && n - 1 - k >= 2) || k === n - 1 ? <text key={d.date} x={x(k)} y={H - 14} fill={C.muted} fontSize={22} textAnchor="middle">{day(d.date)}</text> : null))}
        {lines.map((l, k) => (
          <g key={l.label}>
            <path d={ends[k].d} fill="none" stroke={l.color} strokeWidth={l.w} strokeDasharray={l.dash} strokeLinecap="round" strokeLinejoin="round" />
            <circle cx={ends[k].end[0]} cy={ends[k].end[1]} r={11} fill={l.color} />
            <text x={x(n - 1) + 26} y={y(l.vals[n - 1]) + 10} fill={l.color} fontSize={30} fontWeight={800} opacity={endO}>
              {pct(l.vals[n - 1])} <tspan fontSize={24} fontWeight={600}>{l.label}</tspan>
            </text>
          </g>
        ))}
      </svg>
    </Scene>
  );
};

/* ---------- 6. Outro ---------- */
const Outro: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const items = [
    { v: pct(LAST.pct), l: 'plots completed', c: C.green },
    { v: `+${int(LAST.daily)}`, l: `plots on ${day(LAST.date)} (vs ${int(PREV.daily)} the day before)`, c: C.amber },
    { v: int(LAST.stuck), l: 'villages stuck for 3+ updates', c: C.red },
  ];
  return (
    <Scene len={S.outro}>
      <AbsoluteFill style={{ justifyContent: 'center', padding: '0 140px' }}>
        <Kicker>As of {day(data.to)} 2026</Kicker>
        <div style={{ display: 'flex', gap: 80, marginTop: 40 }}>
          {items.map((it, k) => {
            const s = spring({ frame: f - 10 - k * 8, fps, config: { damping: 200 } });
            return (
              <div key={it.l} style={{ opacity: s, transform: `translateY(${(1 - s) * 30}px)`, maxWidth: 480 }}>
                <div style={{ fontFamily: DISPLAY, fontSize: 130, fontWeight: 800, color: it.c, lineHeight: 1 }}>{it.v}</div>
                <div style={{ fontSize: 32, color: C.muted, marginTop: 12 }}>{it.l}</div>
              </div>
            );
          })}
        </div>
        <div style={{ fontSize: 30, marginTop: 70, color: C.text, opacity: interpolate(f, [40, 60], [0, 1], clamp) }}>
          Follow up today: <b style={{ color: C.red }}>{data.bottom.slice(0, 3).map((p) => p.name).join(', ')}</b>
        </div>
      </AbsoluteFill>
    </Scene>
  );
};

export const TehsilProgress: React.FC = () => {
  let at = 0;
  const seq = (len: number, node: React.ReactNode) => {
    const el = <Sequence from={at} durationInFrames={len}>{node}</Sequence>;
    at += len;
    return el;
  };
  return (
    <AbsoluteFill style={{ background: `radial-gradient(1400px 900px at 80% 0%, ${C.panel}, ${C.bg})` }}>
      {seq(S.intro, <Intro />)}
      {seq(S.tehsil, <Tehsil />)}
      {seq(S.top, <Ranking rows={data.top} color={C.green} len={S.top} kicker={`Top ${data.top.length} patwaris`} title={`Highest % completed on ${day(data.to)}`} note="Keep this pace: these patwaris are close to finishing every plot." />)}
      {seq(S.bottom, <Ranking rows={data.bottom} color={C.red} len={S.bottom} kicker={`Bottom ${data.bottom.length} patwaris`} title={`Lowest % completed on ${day(data.to)}`} note="These need follow-up: review pending verification and stuck villages with each patwari." />)}
      {seq(S.race, <Race />)}
      {seq(S.outro, <Outro />)}
    </AbsoluteFill>
  );
};
