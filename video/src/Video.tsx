import React from 'react';
import { AbsoluteFill, Audio, Easing, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import data from './data.json';

export const FPS = 30;
// Scene lengths in frames (30 fps). Total 60 seconds.
const S = { intro: 150, target: 240, tehsil: 480, top: 300, bottom: 300, race: 210, outro: 120 };
export const DURATION = Object.values(S).reduce((a, b) => a + b, 0);

const C = {
  text: '#f4f8ff', muted: 'rgba(226,236,255,.72)', faint: 'rgba(226,236,255,.18)',
  green: '#34e3a4', teal: '#22c7d8', red: '#ff6b7d', orange: '#ffa25c', amber: '#ffd166', violet: '#8f7bff', blue: '#5aa9ff',
};
const G = {
  achieve: `linear-gradient(90deg, ${C.teal}, ${C.green})`,
  behind: `linear-gradient(90deg, ${C.orange}, ${C.red})`,
  title: `linear-gradient(90deg, #ffffff, #bfe9ff 60%, #9ff5d2)`,
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
const TARGET = LAST.plots;

/* Moving gradient background with soft colour blobs behind the glass. */
const Backdrop: React.FC = () => {
  const f = useCurrentFrame();
  const blob = (x: number, y: number, r: number, color: string, sx: number, sy: number) => (
    <div style={{
      position: 'absolute', width: r, height: r, borderRadius: '50%', filter: 'blur(90px)', opacity: 0.75,
      left: x + Math.sin(f / sx) * 120, top: y + Math.cos(f / sy) * 90,
      background: `radial-gradient(circle at 30% 30%, ${color}, transparent 70%)`,
    }} />
  );
  return (
    <AbsoluteFill style={{ background: 'linear-gradient(135deg, #071a2b 0%, #0b2a3a 35%, #10223f 65%, #1a1340 100%)', overflow: 'hidden' }}>
      {blob(-200, -150, 900, '#0fb39a', 140, 170)}
      {blob(1150, -250, 1000, '#4b46d6', 190, 150)}
      {blob(700, 600, 900, '#1e8fd6', 160, 210)}
      {blob(-150, 650, 700, '#7a3fd0', 220, 180)}
      <AbsoluteFill style={{ background: 'radial-gradient(1200px 700px at 50% 120%, rgba(0,0,0,.45), transparent)' }} />
    </AbsoluteFill>
  );
};

/* Frosted-glass card. */
const Glass: React.FC<{ style?: React.CSSProperties; children: React.ReactNode }> = ({ style, children }) => (
  <div style={{
    background: 'linear-gradient(145deg, rgba(255,255,255,.16), rgba(255,255,255,.05))',
    border: '1.5px solid rgba(255,255,255,.22)', borderRadius: 32,
    boxShadow: '0 30px 80px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.35), inset 0 -1px 0 rgba(255,255,255,.06)',
    backdropFilter: 'blur(28px) saturate(140%)', WebkitBackdropFilter: 'blur(28px) saturate(140%)',
    ...style,
  }}>{children}</div>
);

/* Fades a scene in and out at its edges. */
const Scene: React.FC<{ len: number; children: React.ReactNode }> = ({ len, children }) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [0, 12, len - 12, len], [0, 1, 1, 0], clamp);
  const sc = interpolate(f, [0, 18], [0.985, 1], { ...clamp, easing: ease });
  return <AbsoluteFill style={{ opacity: o, transform: `scale(${sc})`, padding: '64px 88px', fontFamily: SANS, color: C.text }}>{children}</AbsoluteFill>;
};

const Kicker: React.FC<{ children: React.ReactNode; color?: string }> = ({ children, color = C.green }) => (
  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 14, fontSize: 24, fontWeight: 700, letterSpacing: 4, textTransform: 'uppercase', color }}>
    <span style={{ width: 14, height: 14, borderRadius: 7, background: color, boxShadow: `0 0 18px ${color}` }} />{children}
  </div>
);
const Title: React.FC<{ children: React.ReactNode; size?: number }> = ({ children, size = 62 }) => {
  const f = useCurrentFrame();
  const y = interpolate(f, [0, 20], [24, 0], { ...clamp, easing: ease });
  return (
    <div style={{
      fontFamily: DISPLAY, fontSize: size, fontWeight: 800, lineHeight: 1.08, marginTop: 10, transform: `translateY(${y}px)`,
      background: G.title, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
    }}>{children}</div>
  );
};

/* ---------- 1. Intro ---------- */
const Intro: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: f - 8, fps, config: { damping: 200 } });
  const bar = interpolate(f, [30, 120], [0, LAST.pct], { ...clamp, easing: ease });
  return (
    <Scene len={S.intro}>
      <AbsoluteFill style={{ justifyContent: 'center', padding: '0 120px' }}>
        <Glass style={{ padding: '64px 72px', maxWidth: 1380, opacity: s, transform: `translateY(${(1 - s) * 40}px)` }}>
          <Kicker>SVAMITVA · Tamia tehsil, Chhindwara</Kicker>
          <div style={{ fontFamily: DISPLAY, fontSize: 104, fontWeight: 800, lineHeight: 1.02, marginTop: 18, background: G.title, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
            Registry progress,<br />target vs achieved
          </div>
          <div style={{ fontSize: 34, color: C.muted, marginTop: 24 }}>
            {day(data.from)} – {day(data.to)} 2026 · {data.villageCount} villages · {data.patwariCount} patwaris
          </div>
          <div style={{ marginTop: 48, height: 26, background: 'rgba(255,255,255,.12)', borderRadius: 13, overflow: 'hidden', boxShadow: 'inset 0 2px 6px rgba(0,0,0,.3)' }}>
            <div style={{ height: '100%', width: `${bar * 100}%`, background: G.achieve, borderRadius: 13, boxShadow: `0 0 24px ${C.green}` }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 30, marginTop: 16, color: C.muted }}>
            <span>Achieved <b style={{ color: C.green }}>{pct(bar)}</b></span>
            <span>Target <b style={{ color: C.text }}>{int(TARGET)} plots</b></span>
          </div>
        </Glass>
      </AbsoluteFill>
    </Scene>
  );
};

/* ---------- 2. Target vs achieved ---------- */
const Ring: React.FC<{ value: number; size: number }> = ({ value, size }) => {
  const r = size / 2 - 28, c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size}>
      <defs>
        <linearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={C.teal} /><stop offset="1" stopColor={C.green} />
        </linearGradient>
        <filter id="glow"><feGaussianBlur stdDeviation="8" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      </defs>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,.12)" strokeWidth={40} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="url(#ring)" strokeWidth={40} strokeLinecap="round"
        strokeDasharray={`${c * value} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} filter="url(#glow)" />
    </svg>
  );
};

const TargetScene: React.FC = () => {
  const f = useCurrentFrame();
  const v = interpolate(f, [20, 120], [0, 1], { ...clamp, easing: ease });
  const achieved = LAST.completed * v;
  const cards = [
    { label: 'Target', value: int(TARGET), sub: 'plots to complete', color: C.text, grad: 'linear-gradient(90deg,#c9d6ff,#e2e2ff)' },
    { label: 'Achieved', value: int(achieved), sub: `${pct(LAST.pct * v)} of target`, color: C.green, grad: G.achieve },
    { label: 'Remaining', value: int(TARGET - achieved), sub: `${int(LAST.inProcess)} in process · ${int(LAST.notStarted)} not started`, color: C.orange, grad: G.behind },
  ];
  return (
    <Scene len={S.target}>
      <Kicker color={C.teal}>Whole tehsil · as of {day(data.to)}</Kicker>
      <Title>Target vs achieved</Title>
      <div style={{ display: 'flex', gap: 56, marginTop: 44, alignItems: 'center' }}>
        <Glass style={{ padding: 36, position: 'relative' }}>
          <Ring value={LAST.pct * v} size={560} />
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ fontFamily: DISPLAY, fontSize: 128, fontWeight: 800, color: C.text, fontVariantNumeric: 'tabular-nums' }}>{pct(LAST.pct * v)}</div>
            <div style={{ fontSize: 32, color: C.muted }}>achieved</div>
          </div>
        </Glass>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28, flex: 1 }}>
          {cards.map((c, k) => {
            const o = interpolate(f, [30 + k * 14, 50 + k * 14], [0, 1], clamp);
            return (
              <Glass key={c.label} style={{ padding: '30px 40px', opacity: o, transform: `translateX(${(1 - o) * 40}px)`, display: 'flex', alignItems: 'center', gap: 32 }}>
                <div style={{ width: 10, alignSelf: 'stretch', borderRadius: 5, background: c.grad }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: C.muted }}>{c.label}</div>
                  <div style={{ fontSize: 26, color: C.muted, marginTop: 4 }}>{c.sub}</div>
                </div>
                <div style={{ fontFamily: DISPLAY, fontSize: 92, fontWeight: 800, color: c.color, fontVariantNumeric: 'tabular-nums' }}>{c.value}</div>
              </Glass>
            );
          })}
        </div>
      </div>
    </Scene>
  );
};

/* ---------- 3. Tehsil progress, day by day ---------- */
const Tehsil: React.FC = () => {
  const f = useCurrentFrame();
  const W = 1160, H = 640, L = 96, R = 30, TOP = 30, B = 60;
  const n = T.length;
  const drawEnd = S.tehsil - 80;
  const prog = interpolate(f, [24, drawEnd], [0, n - 1], { ...clamp, easing: Easing.inOut(Easing.quad) });
  const i = Math.floor(prog), frac = prog - i;
  const cur = T[Math.min(i, n - 1)], nxt = T[Math.min(i + 1, n - 1)];
  const lerp = (a: number, b: number) => a + (b - a) * frac;
  const x = (k: number) => L + (k / (n - 1)) * (W - L - R);
  const y = (v: number) => TOP + (1 - v) * (H - TOP - B);
  const shown = T.slice(0, i + 1).map((d, k) => [x(k), y(d.pct)] as const);
  shown.push([x(i + frac), y(lerp(cur.pct, nxt.pct))]);
  const path = shown.map(([a, b], k) => `${k ? 'L' : 'M'}${a.toFixed(1)},${b.toFixed(1)}`).join(' ');
  const tip = shown[shown.length - 1];
  const area = `${path} L${tip[0].toFixed(1)},${y(0)} L${x(0)},${y(0)} Z`;
  const maxDaily = Math.max(...T.map((d) => d.daily));
  const peak = T.reduce((a, b) => (b.daily > a.daily ? b : a));
  const noteO = interpolate(f, [drawEnd, drawEnd + 20], [0, 1], clamp);
  const showDate = frac > 0.5 ? nxt.date : cur.date;
  return (
    <Scene len={S.tehsil}>
      <Kicker>Day by day</Kicker>
      <Title>Achieved vs target, every update day</Title>
      <div style={{ display: 'flex', gap: 40, marginTop: 34 }}>
        <Glass style={{ padding: '28px 30px 18px' }}>
          <svg width={W} height={H} style={{ overflow: 'visible' }}>
            <defs>
              <linearGradient id="ln" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stopColor={C.teal} /><stop offset="1" stopColor={C.green} /></linearGradient>
              <linearGradient id="ar" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={C.green} stopOpacity={0.45} /><stop offset="1" stopColor={C.teal} stopOpacity={0} /></linearGradient>
              <linearGradient id="br" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={C.amber} /><stop offset="1" stopColor={C.orange} stopOpacity={0.5} /></linearGradient>
              <filter id="lg"><feGaussianBlur stdDeviation="6" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            </defs>
            {[0, 0.25, 0.5, 0.75].map((t) => (
              <g key={t}>
                <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke={C.faint} strokeWidth={1.5} />
                <text x={L - 16} y={y(t) + 8} fill={C.muted} fontSize={22} textAnchor="end">{t * 100}%</text>
              </g>
            ))}
            <line x1={L} x2={W - R} y1={y(1)} y2={y(1)} stroke={C.amber} strokeWidth={3} strokeDasharray="14 10" />
            <text x={L - 16} y={y(1) + 8} fill={C.amber} fontSize={22} fontWeight={700} textAnchor="end">100%</text>
            <text x={W - R} y={y(1) - 14} fill={C.amber} fontSize={24} fontWeight={700} textAnchor="end">Target · {int(TARGET)} plots</text>
            {T.map((d, k) => {
              const h = (d.daily / maxDaily) * 170;
              return <rect key={d.date} x={x(k) - 13} y={y(0) - h} width={26} height={h} rx={6} fill="url(#br)" opacity={k <= prog ? 0.75 : 0} />;
            })}
            {T.map((d, k) => ((k % 3 === 0 && n - 1 - k >= 2) || k === n - 1 ? <text key={d.date} x={x(k)} y={H - 16} fill={C.muted} fontSize={21} textAnchor="middle">{day(d.date)}</text> : null))}
            <path d={area} fill="url(#ar)" />
            <path d={path} fill="none" stroke="url(#ln)" strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" filter="url(#lg)" />
            <circle cx={tip[0]} cy={tip[1]} r={14} fill={C.green} stroke="#fff" strokeWidth={4} />
            <g opacity={noteO}>
              <line x1={tip[0]} x2={tip[0]} y1={tip[1] - 18} y2={y(1) + 6} stroke={C.text} strokeWidth={2} strokeDasharray="4 6" />
              <rect x={tip[0] - 340} y={(tip[1] + y(1)) / 2 - 30} width={320} height={60} rx={14} fill="rgba(255,255,255,.14)" stroke="rgba(255,255,255,.3)" />
              <text x={tip[0] - 180} y={(tip[1] + y(1)) / 2 + 9} fill={C.text} fontSize={26} fontWeight={700} textAnchor="middle">Gap to target {pct(1 - LAST.pct)}</text>
              <text x={x(T.indexOf(peak))} y={y(0) - (peak.daily / maxDaily) * 170 - 16} fill={C.amber} fontSize={22} fontWeight={700} textAnchor="middle">Best day {int(peak.daily)}</text>
            </g>
          </svg>
        </Glass>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22, flex: 1 }}>
          <MiniStat label="Update day" value={day(showDate)} color={C.text} />
          <MiniStat label="Achieved" value={pct(lerp(cur.pct, nxt.pct))} color={C.green} big />
          <MiniStat label="Plots" value={`${int(lerp(cur.completed, nxt.completed))} / ${int(TARGET)}`} color={C.text} />
          <div style={{ fontSize: 22, color: C.muted, display: 'flex', alignItems: 'center', gap: 12, paddingLeft: 8 }}>
            <span style={{ width: 20, height: 20, borderRadius: 5, background: `linear-gradient(${C.amber}, ${C.orange})` }} /> Plots completed each day
          </div>
        </div>
      </div>
    </Scene>
  );
};

const MiniStat: React.FC<{ label: string; value: string; color: string; big?: boolean }> = ({ label, value, color, big }) => (
  <Glass style={{ padding: '22px 30px', borderRadius: 24 }}>
    <div style={{ fontSize: 22, color: C.muted, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' }}>{label}</div>
    <div style={{ fontFamily: DISPLAY, fontSize: big ? 104 : 56, fontWeight: 800, color, lineHeight: 1.05, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
  </Glass>
);

/* ---------- 4 & 5. Top and bottom patwaris: target vs achieved ---------- */
const Ranking: React.FC<{ rows: Pat[]; good: boolean; kicker: string; title: string; note: string; len: number }> = ({ rows, good, kicker, title, note, len }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const color = good ? C.green : C.red;
  return (
    <Scene len={len}>
      <Kicker color={color}>{kicker}</Kicker>
      <Title>{title}</Title>
      <Glass style={{ marginTop: 40, padding: '34px 44px', display: 'flex', flexDirection: 'column', gap: 26 }}>
        <div style={{ display: 'flex', gap: 28, fontSize: 22, color: C.muted, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' }}>
          <div style={{ width: 60 }} /><div style={{ width: 470 }}>Patwari</div>
          <div style={{ flex: 1 }}>Achieved · dashed box = 100% target</div><div style={{ width: 170, textAlign: 'right' }}>Achieved</div><div style={{ width: 300, textAlign: 'right' }}>Plots done / target</div>
        </div>
        {rows.map((p, k) => {
          const s = spring({ frame: f - 22 - k * 12, fps, config: { damping: 22, mass: 0.9 } });
          const w = Math.max(0, s) * p.pct;
          return (
            <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 28, opacity: Math.min(1, Math.max(0, s * 1.5)) }}>
              <div style={{ width: 60, height: 60, borderRadius: 18, display: 'grid', placeItems: 'center', fontFamily: DISPLAY, fontSize: 34, fontWeight: 800, background: good ? G.achieve : G.behind, color: '#0b1d2c' }}>{k + 1}</div>
              <div style={{ width: 470, fontSize: 38, fontWeight: 700 }}>{p.name}</div>
              <div style={{ flex: 1, height: 56, background: 'rgba(255,255,255,.10)', border: '1.5px dashed rgba(255,255,255,.35)', borderRadius: 16, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', inset: 0, width: `${w * 100}%`, background: good ? G.achieve : G.behind, borderRadius: 14, boxShadow: `0 0 24px ${color}` }} />
              </div>
              <div style={{ width: 170, textAlign: 'right', fontFamily: DISPLAY, fontSize: 52, fontWeight: 800, color, fontVariantNumeric: 'tabular-nums' }}>{pct(w)}</div>
              <div style={{ width: 300, textAlign: 'right', fontSize: 30, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                {int(p.completed * Math.max(0, Math.min(1, s)))} <span style={{ color: C.muted }}>/ {int(p.plots)}</span>
              </div>
            </div>
          );
        })}
      </Glass>
      <div style={{ marginTop: 26, fontSize: 30, color: C.muted, opacity: interpolate(f, [100, 130], [0, 1], clamp) }}>{note}</div>
    </Scene>
  );
};

/* ---------- 6. Top vs bottom race ---------- */
const Race: React.FC = () => {
  const f = useCurrentFrame();
  const W = 1560, H = 660, L = 96, R = 360, TOP = 40, B = 56;
  const n = T.length;
  const prog = interpolate(f, [16, S.race - 50], [0, n - 1], { ...clamp, easing: Easing.inOut(Easing.quad) });
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
    { label: `Top ${data.top.length} average`, vals: avg(data.top), stroke: 'url(#gt)', color: C.green, w: 9 },
    { label: 'Whole tehsil', vals: T.map((t) => t.pct), stroke: C.text, color: C.text, w: 5, dash: '14 10' },
    { label: `Bottom ${data.bottom.length} average`, vals: avg(data.bottom), stroke: 'url(#gb)', color: C.red, w: 9 },
  ];
  const ends = lines.map((l) => pathOf(l.vals));
  const endO = interpolate(f, [S.race - 50, S.race - 32], [0, 1], clamp);
  const gap = lines[0].vals[n - 1] - lines[2].vals[n - 1];
  return (
    <Scene len={S.race}>
      <Kicker color={C.amber}>Top vs bottom</Kicker>
      <Title>The gap is {Math.round(gap * 100)} percentage points</Title>
      <Glass style={{ marginTop: 34, padding: '26px 30px 14px', display: 'inline-block' }}>
        <svg width={W} height={H} style={{ overflow: 'visible' }}>
          <defs>
            <linearGradient id="gt" x1="0" x2="1"><stop offset="0" stopColor={C.teal} /><stop offset="1" stopColor={C.green} /></linearGradient>
            <linearGradient id="gb" x1="0" x2="1"><stop offset="0" stopColor={C.orange} /><stop offset="1" stopColor={C.red} /></linearGradient>
          </defs>
          {[0, 0.25, 0.5, 0.75].map((t) => (
            <g key={t}>
              <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke={C.faint} strokeWidth={1.5} />
              <text x={L - 16} y={y(t) + 8} fill={C.muted} fontSize={22} textAnchor="end">{t * 100}%</text>
            </g>
          ))}
          <line x1={L} x2={W - R} y1={y(1)} y2={y(1)} stroke={C.amber} strokeWidth={3} strokeDasharray="14 10" />
          <text x={L - 16} y={y(1) + 8} fill={C.amber} fontSize={22} fontWeight={700} textAnchor="end">Target</text>
          {T.map((d, k) => ((k % 3 === 0 && n - 1 - k >= 2) || k === n - 1 ? <text key={d.date} x={x(k)} y={H - 12} fill={C.muted} fontSize={21} textAnchor="middle">{day(d.date)}</text> : null))}
          {lines.map((l, k) => (
            <g key={l.label}>
              <path d={ends[k].d} fill="none" stroke={l.stroke} strokeWidth={l.w} strokeDasharray={l.dash} strokeLinecap="round" strokeLinejoin="round" />
              <circle cx={ends[k].end[0]} cy={ends[k].end[1]} r={12} fill={l.color} stroke="#fff" strokeWidth={3} />
              <text x={x(n - 1) + 26} y={y(l.vals[n - 1]) + 10} fill={l.color} fontSize={30} fontWeight={800} opacity={endO}>
                {pct(l.vals[n - 1])} <tspan fontSize={23} fontWeight={600}>{l.label}</tspan>
              </text>
            </g>
          ))}
        </svg>
      </Glass>
    </Scene>
  );
};

/* ---------- 7. Outro ---------- */
const Outro: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const items = [
    { v: int(LAST.completed), l: `plots achieved of ${int(TARGET)} target (${pct(LAST.pct)})`, c: C.green },
    { v: `+${int(LAST.daily)}`, l: `plots on ${day(LAST.date)} (${int(PREV.daily)} the day before)`, c: C.amber },
    { v: int(LAST.stuck), l: 'villages stuck 3+ updates', c: C.red },
  ];
  return (
    <Scene len={S.outro}>
      <AbsoluteFill style={{ justifyContent: 'center', padding: '0 110px' }}>
        <Kicker>As of {day(data.to)} 2026</Kicker>
        <div style={{ display: 'flex', gap: 34, marginTop: 34 }}>
          {items.map((it, k) => {
            const s = spring({ frame: f - 6 - k * 6, fps, config: { damping: 200 } });
            return (
              <Glass key={it.l} style={{ flex: 1, padding: '40px 40px', opacity: s, transform: `translateY(${(1 - s) * 30}px)` }}>
                <div style={{ fontFamily: DISPLAY, fontSize: 96, fontWeight: 800, color: it.c, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{it.v}</div>
                <div style={{ fontSize: 30, color: C.muted, marginTop: 14 }}>{it.l}</div>
              </Glass>
            );
          })}
        </div>
        <Glass style={{ marginTop: 34, padding: '26px 40px', fontSize: 32, opacity: interpolate(f, [26, 44], [0, 1], clamp) }}>
          Follow up today: <b style={{ color: C.red }}>{data.bottom.slice(0, 3).map((p) => p.name).join(', ')}</b>
        </Glass>
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
    <AbsoluteFill>
      <Backdrop />
      {/* Original background track made by make_music.py */}
      <Audio src={staticFile('music.wav')} volume={(f) => interpolate(f, [0, 30, DURATION - 45, DURATION], [0, 0.85, 0.85, 0], clamp)} />
      {seq(S.intro, <Intro />)}
      {seq(S.target, <TargetScene />)}
      {seq(S.tehsil, <Tehsil />)}
      {seq(S.top, <Ranking rows={data.top} good len={S.top} kicker={`Top ${data.top.length} patwaris`} title={`Closest to target on ${day(data.to)}`} note="Target = all plots in the patwari's villages. Achieved = plots with registry completed." />)}
      {seq(S.bottom, <Ranking rows={data.bottom} good={false} len={S.bottom} kicker={`Bottom ${data.bottom.length} patwaris`} title={`Furthest from target on ${day(data.to)}`} note="Review pending verification and stuck villages with each of these patwaris." />)}
      {seq(S.race, <Race />)}
      {seq(S.outro, <Outro />)}
    </AbsoluteFill>
  );
};
