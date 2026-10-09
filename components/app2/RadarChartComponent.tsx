import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Competency } from '../../types2';

interface RadarChartComponentProps {
  data: Competency[];
}

interface ChartDatum {
  subject: string;
  initial: number;
  current: number;
}

/* ---------- geometry (flat, front-facing Duolingo-style radar) ---------- */
const W = 560;
const H = 470;
const CX = W / 2;
const CY = 240;
const RAD = 150;

const clamp100 = (n: number) => Math.max(0, Math.min(100, Number.isNaN(n) ? 0 : n));
const truncate = (s: string, n = 15) => (s.length > n ? s.slice(0, n - 1) + '…' : s);

const angleFor = (i: number, n: number) => ((-90 + (i * 360) / n) * Math.PI) / 180;

const buildPts = (items: ChartDatum[], key: 'initial' | 'current'): Point[] =>
  items.map((d, i) => {
    const a = angleFor(i, items.length);
    const r = (clamp100(d[key]) / 100) * RAD;
    return { x: CX + r * Math.cos(a), y: CY + r * Math.sin(a), value: Math.round(clamp100(d[key])) };
  });

const ringPts = (n: number, frac: number): Point[] =>
  Array.from({ length: n }, (_, i) => {
    const a = angleFor(i, n);
    const r = RAD * frac;
    return { x: CX + r * Math.cos(a), y: CY + r * Math.sin(a), value: Math.round(frac * 100) };
  });

const poly = (pts: Point[]) => pts.map(p => `${p.x},${p.y}`).join(' ');

interface Point { x: number; y: number; value: number; }

/* Duolingo status palette — flat, chunky, high-contrast */
const DUO_GREEN = '#58cc02';
const DUO_GREEN_DARK = '#46a302';
const DUO_BLUE = '#1cb0f6';
const DUO_AMBER = '#ffc800';
const DUO_RED = '#ff4b4b';
const DUO_PURPLE = '#ce82ff';
const INK = '#3c3c3c';
const INK_SOFT = '#afafaf';

const ringColor = (frac: number) =>
  frac === 1 ? 'rgba(60,60,60,0.22)' : 'rgba(60,60,60,0.10)';

/* ---------- gamified rank system ---------- */
const RANKS = [
  { min: 90, name: 'Diamond', sub: 'Elite mastery', hex: DUO_BLUE },
  { min: 80, name: 'Platinum', sub: 'Near-perfect skills', hex: DUO_PURPLE },
  { min: 70, name: 'Gold', sub: 'Strong all-rounder', hex: DUO_AMBER },
  { min: 55, name: 'Silver', sub: 'Solid foundation', hex: '#9ba3af' },
  { min: 40, name: 'Bronze', sub: 'Building up', hex: '#ff9600' },
  { min: 0, name: 'Rookie', sub: 'Fresh start', hex: INK_SOFT }
];
const rankFor = (avg: number) => RANKS.find(r => avg >= r.min) || RANKS[RANKS.length - 1];

const medals = (data: ChartDatum[]) => {
  const order = data
    .map((d, i) => ({ i, v: d.current }))
    .sort((a, b) => b.v - a.v)
    .map(d => d.i);
  const out: Record<number, string> = {};
  if (order[0] !== undefined) out[order[0]] = '🥇';
  if (order[1] !== undefined) out[order[1]] = '🥈';
  if (order[2] !== undefined) out[order[2]] = '🥉';
  return out;
};

/* Animated count-up number (e.g. the Power Score) */
const CountUp = ({ target, duration = 900, className, suffix = '' }: { target: number; duration?: number; className?: string; suffix?: string }) => {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0;
    const t0 = performance.now();
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / duration);
      setV(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return <span className={className}>{v}{suffix}</span>;
};

/* Smoothly animates an SVG polygon towards its target shape whenever the
   data changes — this is what makes the radar react dynamically (with a
   springy pop) when competencies are added, removed or nudged up/down. */
const AnimatedPolygon = ({ targetPts, fill, stroke, strokeWidth, dash, delay = 0 }: {
  targetPts: Point[];
  fill: string;
  stroke: string;
  strokeWidth: number;
  dash?: string;
  delay?: number;
}) => {
  const [pts, setPts] = useState<Point[]>(targetPts);
  const fromRef = useRef<Point[]>(targetPts);
  const rafRef = useRef(0);
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      fromRef.current = targetPts;
      setPts(targetPts);
      return;
    }
    const from = pts.length === targetPts.length ? pts : targetPts;
    const n = targetPts.length;
    const duration = 700;
    const start = performance.now() + delay;
    const tick = (t: number) => {
      const p = Math.min(1, Math.max(0, (t - start) / duration));
      const ease = 1 - Math.pow(1 - p, 3); // easeOutCubic
      const spring = ease + (1 - ease) * 0.12 * Math.sin(p * Math.PI * 2); // subtle overshoot
      const next: Point[] = [];
      for (let i = 0; i < n; i++) {
        const a = from[i] || { x: CX, y: CY, value: 0 };
        const b = targetPts[i] || { x: CX, y: CY, value: 0 };
        next.push({
          x: a.x + (b.x - a.x) * spring,
          y: a.y + (b.y - a.y) * spring,
          value: Math.round(a.value + (b.value - a.value) * ease)
        });
      }
      setPts(next);
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    };
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetPts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(';')]);

  return (
    <polygon
      points={poly(pts)}
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeDasharray={dash}
      strokeLinejoin="round"
    />
  );
};

/* One value gem — pops in with a bouncy keyframe when it appears */
const DuoGem = ({ cx, cy, hot, color, delay }: { cx: number; cy: number; hot: boolean; color: string; delay: number }) => (
  <g className="duo-gem" style={{ animationDelay: `${delay}ms` }}>
    <circle cx={cx} cy={cy} r={hot ? 8.5 : 6} fill="#fff" stroke={color} strokeWidth={hot ? 3.5 : 3} />
    {hot && <circle cx={cx} cy={cy} r="12" fill="none" stroke={color} strokeWidth="2" opacity="0.5" />}
  </g>
);

/* ---------- one Duolingo-style radar panel per chunk ---------- */
const DuoRadarPanel: React.FC<{ chunk: ChartDatum[]; ci: number; rangeLabel: string }> = ({ chunk, ci, rangeLabel }) => {
  const n = chunk.length;
  const [hovered, setHovered] = useState<number | null>(null);

  const currentPts = useMemo(() => buildPts(chunk, 'current'), [chunk]);
  const initialPts = useMemo(() => buildPts(chunk, 'initial'), [chunk]);
  const avgCurrent = Math.round(chunk.reduce((s, d) => s + d.current, 0) / n);
  const avgInitial = Math.round(chunk.reduce((s, d) => s + d.initial, 0) / n);
  const growth = avgCurrent - avgInitial;
  const rank = rankFor(avgCurrent);
  const medal = medals(chunk);

  const gid = (s: string) => `duo-${s}-${ci}`;

  return (
    <div className="duo-radar-wrap">
      {/* ── header: emblem + title + power-score ── */}
      <div className="duo-radar-header">
        <div className="duo-radar-title">
          <div className="duo-emblem" style={{ background: DUO_GREEN, borderColor: DUO_GREEN_DARK }}>⚡</div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="duo-title-text">Power Profile</h3>
              <span className="duo-rank-chip" style={{ color: rank.hex, background: rank.hex + '1a', border: `1.5px solid ${rank.hex}55` }}>
                {rank.name}
              </span>
            </div>
            <p className="duo-sub-text">{rank.sub} · {rangeLabel}</p>
          </div>
        </div>

        {/* Power score ring — gradient arc, bigger number */}
        <div className="duo-power-ring" title={`Average competency: ${avgCurrent}%`}>
          <svg viewBox="0 0 80 80" className="duo-power-svg">
            <defs>
              <linearGradient id={gid('ring')} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor={rank.hex} />
                <stop offset="100%" stopColor={rank.hex === DUO_GREEN ? DUO_BLUE : rank.hex} />
              </linearGradient>
            </defs>
            <circle cx="40" cy="40" r="33" fill="none" stroke="rgba(60,60,60,0.10)" strokeWidth="8.5" />
            <circle
              cx="40" cy="40" r="33" fill="none"
              stroke={`url(#${gid('ring')})`} strokeWidth="8.5" strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 33}
              strokeDashoffset={2 * Math.PI * 33 * (1 - avgCurrent / 100)}
              style={{ transition: 'stroke-dashoffset .9s cubic-bezier(.34,1.56,.64,1), stroke .4s' }}
            />
          </svg>
          <div className="duo-power-center">
            <CountUp target={avgCurrent} className="duo-power-num" suffix="%" />
            <span className="duo-power-label">Power</span>
          </div>
        </div>
      </div>

      {/* ── term growth pill + legend ── */}
      <div className="duo-growth-row">
        <span
          className="duo-growth-pill"
          style={{
            background: growth >= 0 ? DUO_GREEN : DUO_RED,
            boxShadow: `0 3px 0 ${growth >= 0 ? DUO_GREEN_DARK : '#d33'}`
          }}
          title="Average progress vs the learner's starting point"
        >
          {growth >= 0 ? '▲' : '▼'} {Math.abs(growth)}% term growth
        </span>
        <span className="duo-hint">Tap or hover a gem for details</span>
      </div>
      <div className="duo-legend">
        <span className="duo-legend-item"><span className="duo-legend-dot" style={{ background: DUO_AMBER }} /> Initial</span>
        <span className="duo-legend-item"><span className="duo-legend-dot" style={{ background: DUO_GREEN }} /> Current</span>
        <span className="duo-legend-item duo-legend-count">⚡ {n} skills tracked</span>
      </div>

      {/* ── radar ── */}
      <div className="duo-radar-svg-wrap">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Competency radar chart">
          <defs>
            <linearGradient id={gid('face')} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={DUO_GREEN} stopOpacity="0.38" />
              <stop offset="100%" stopColor={DUO_GREEN} stopOpacity="0.16" />
            </linearGradient>
          </defs>

          {/* grid rings — flat, thin, chunky outer */}
          {[0.25, 0.5, 0.75, 1].map(frac => {
            const pts = ringPts(n, frac);
            return (
              <polygon
                key={frac}
                points={poly(pts)}
                fill={frac === 1 ? 'rgba(60,60,60,0.03)' : 'transparent'}
                stroke={ringColor(frac)}
                strokeWidth={frac === 1 ? 2 : 1.2}
              />
            );
          })}

          {/* spokes */}
          {chunk.map((_, i) => {
            const a = angleFor(i, n);
            return (
              <line
                key={i} x1={CX} y1={CY}
                x2={CX + RAD * Math.cos(a)} y2={CY + RAD * Math.sin(a)}
                stroke="rgba(60,60,60,0.10)" strokeWidth="1.2"
              />
            );
          })}

          {/* initial polygon (amber, dashed) */}
          <AnimatedPolygon targetPts={initialPts} fill={DUO_AMBER + '26'} stroke={DUO_AMBER} strokeWidth={2.5} dash="7 5" />

          {/* current polygon — animated Duolingo green */}
          <AnimatedPolygon targetPts={currentPts} fill={`url(#${gid('face')})`} stroke={DUO_GREEN} strokeWidth={4} />

          {/* skill name labels */}
          {chunk.map((d, i) => {
            const a = angleFor(i, n);
            const lx = CX + (RAD + 24) * Math.cos(a);
            const ly = CY + (RAD + 20) * Math.sin(a) + 4;
            const anchor = Math.cos(a) >= 0.35 ? 'start' : Math.cos(a) <= -0.35 ? 'end' : 'middle';
            const isHot = hovered === i;
            return (
              <text
                key={i}
                x={lx} y={ly}
                textAnchor={anchor}
                fontSize={isHot ? 15 : 14}
                fontWeight={900}
                fill={isHot ? DUO_GREEN_DARK : INK_SOFT}
                style={{ pointerEvents: 'none', transition: 'fill .15s, font-size .15s' }}
              >
                {truncate(d.subject, 13)}
              </text>
            );
          })}

          {/* vertex gems + hover hit zones */}
          {currentPts.map((p, vi) => {
            const isHover = hovered === vi;
            return (
              <g key={vi} onMouseEnter={() => setHovered(vi)} onMouseLeave={() => setHovered(null)} onClick={() => setHovered(isHover ? null : vi)} style={{ cursor: 'pointer' }}>
                <circle cx={p.x} cy={p.y} r="14" fill="transparent" />
                <DuoGem cx={p.x} cy={p.y} hot={isHover} color={isHover ? DUO_AMBER : DUO_GREEN} delay={vi * 60} />
                {medal[vi] && (
                  <text x={p.x} y={p.y - 13} textAnchor="middle" fontSize="12">{medal[vi]}</text>
                )}
              </g>
            );
          })}

          {/* center hub */}
          <circle cx={CX} cy={CY} r="4.5" fill="#fff" stroke={DUO_GREEN} strokeWidth="3" />
        </svg>

        {/* tooltip */}
        {hovered !== null && (
          <div
            className="duo-tooltip"
            style={{
              left: `${Math.min(84, Math.max(16, (currentPts[hovered].x / W) * 100))}%`,
              top: `${Math.min(70, Math.max(18, (currentPts[hovered].y / H) * 100))}%`
            }}
          >
            <div className="duo-tooltip-card">
              <p className="duo-tooltip-name">
                {chunk[hovered].subject} {medal[hovered]}
              </p>
              <div className="duo-tooltip-row">
                <span className="duo-dot" style={{ background: DUO_AMBER }} /> Initial
                <b>{chunk[hovered].initial}%</b>
              </div>
              <div className="duo-tooltip-row">
                <span className="duo-dot" style={{ background: DUO_GREEN }} /> Current
                <b style={{ color: DUO_GREEN_DARK }}>{chunk[hovered].current}%</b>
              </div>
              <div className={`duo-tooltip-delta ${chunk[hovered].current >= chunk[hovered].initial ? 'up' : 'down'}`}>
                {chunk[hovered].current >= chunk[hovered].initial ? '▲' : '▼'}
                {' '}{Math.abs(chunk[hovered].current - chunk[hovered].initial)}%
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const RadarChartComponent: React.FC<RadarChartComponentProps> = ({ data = [] }) => {
  const active = data || [];

  const chunks = useMemo(() => {
    const out: ChartDatum[][] = [];
    for (let i = 0; i < active.length; i += 10) {
      out.push(
        active.slice(i, i + 10).map(c => ({
          subject: c.name || 'Unknown',
          initial: Number.isNaN(c.initialProgress) || c.initialProgress === undefined ? 0 : c.initialProgress,
          current: Number.isNaN(c.progress) || c.progress === undefined ? 0 : c.progress
        }))
      );
    }
    return out;
  }, [active]);

  if (chunks.length === 0 || chunks[0].length === 0) {
    return (
      <div className="flex items-center justify-center h-[320px] text-gray-400 font-medium">
        No competency data available to display.
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full">
      <style>{`
        .duo-radar-wrap { position: relative; overflow: hidden; border-radius: 24px; border: 2px solid #e5e5e5; background: #fff; padding: 20px 20px 16px; box-shadow: 0 2px 0 rgba(60,60,60,0.06); }
        :is(.dark, .dark-mode) .duo-radar-wrap { background: #1c1c22; border-color: #34343c; }
        .duo-radar-header { display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap; }
        .duo-radar-title { display: flex; align-items: center; gap: 14px; min-width: 0; flex: 1 1 auto; }
        .duo-emblem { display: grid; place-items: center; width: 48px; height: 48px; border-radius: 14px; font-size: 22px; color: #fff; border-bottom: 4px solid; box-shadow: 0 3px 0 rgba(60,60,60,0.14); }
        .duo-title-text { font-size: 18px; font-weight: 900; color: ${INK}; letter-spacing: -0.02em; margin: 0; line-height: 1.15; }
        :is(.dark, .dark-mode) .duo-title-text { color: #fff; }
        .duo-rank-chip { border-radius: 999px; padding: 3px 12px; font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: .06em; }
        .duo-sub-text { font-size: 12.5px; font-weight: 700; color: ${INK_SOFT}; margin-top: 3px; }
        .duo-power-ring { position: relative; width: 76px; height: 76px; flex-shrink: 0; }
        .duo-power-svg { width: 100%; height: 100%; transform: rotate(-90deg); }
        .duo-power-center { position: absolute; inset: 0; display: grid; place-items: center; }
        .duo-power-num { font-size: 21px; font-weight: 900; color: ${INK}; line-height: 1; }
        :is(.dark, .dark-mode) .duo-power-num { color: #fff; }
        .duo-power-label { font-size: 8px; font-weight: 900; text-transform: uppercase; letter-spacing: .16em; color: ${INK_SOFT}; display: block; margin-top: 3px; text-align: center; }
        .duo-growth-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-top: 12px; flex-wrap: wrap; }
        .duo-growth-pill { color: #fff; font-size: 12px; font-weight: 900; padding: 5px 14px; border-radius: 999px; }
        .duo-hint { font-size: 11px; font-weight: 700; color: ${INK_SOFT}; }
        .duo-legend { display: flex; align-items: center; gap: 14px; margin-top: 10px; flex-wrap: wrap; }
        .duo-legend-item { display: flex; align-items: center; gap: 6px; font-size: 11.5px; font-weight: 800; color: ${INK}; }
        .duo-legend-dot { width: 10px; height: 10px; border-radius: 999px; display: inline-block; box-shadow: 0 0 0 2px #fff, 0 0 0 3px rgba(60,60,60,0.15); }
        :is(.dark, .dark-mode) .duo-legend-dot { box-shadow: 0 0 0 2px #1c1c22, 0 0 0 3px rgba(255,255,255,0.15); }
        .duo-legend-count { color: ${INK_SOFT}; font-size: 11px; }
        .duo-radar-svg-wrap { position: relative; margin-top: 4px; }
        .duo-radar-svg-wrap svg { width: 100%; height: auto; display: block; }
        /* Bigger, readable skill labels at every size */
        .duo-radar-svg-wrap svg text { font-size: 14px; }
        @media (max-width: 640px) {
          .duo-radar-wrap { padding: 16px 12px 12px; border-radius: 20px; }
          .duo-radar-header { justify-content: center; text-align: center; }
          .duo-radar-title { justify-content: center; }
          .duo-title-text { font-size: 16px; }
          .duo-sub-text { font-size: 11.5px; }
          .duo-power-ring { width: 66px; height: 66px; }
          .duo-radar-svg-wrap svg text { font-size: 15px; }
        }
        @media (max-width: 400px) {
          .duo-hint { display: none; }
          .duo-growth-row { justify-content: center; }
          .duo-emblem { width: 42px; height: 42px; font-size: 19px; }
          .duo-power-num { font-size: 18px; }
        }
        .duo-gem { transform-box: fill-box; transform-origin: center; animation: duo-gem-pop .55s cubic-bezier(.34,1.8,.64,1) both; }
        @keyframes duo-gem-pop { from { opacity: 0; transform: scale(0.2); } to { opacity: 1; transform: scale(1); } }
        .duo-tooltip { position: absolute; transform: translate(-50%, -115%); pointer-events: none; z-index: 20; }
        .duo-tooltip-card { width: 190px; background: #fff; border: 2px solid #e5e5e5; border-radius: 14px; padding: 10px 12px; box-shadow: 0 4px 0 rgba(60,60,60,0.08); }
        :is(.dark, .dark-mode) .duo-tooltip-card { background: #26262e; border-color: #3c3c46; }
        .duo-tooltip-name { font-size: 12px; font-weight: 900; color: ${INK}; margin-bottom: 6px; }
        :is(.dark, .dark-mode) .duo-tooltip-name { color: #fff; }
        .duo-tooltip-row { display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; color: ${INK_SOFT}; }
        .duo-tooltip-row b { margin-left: auto; color: ${INK}; }
        :is(.dark, .dark-mode) .duo-tooltip-row b { color: #fff; }
        .duo-dot { width: 8px; height: 8px; border-radius: 999px; display: inline-block; }
        .duo-tooltip-delta { margin-top: 6px; padding-top: 6px; border-top: 1.5px dashed #e5e5e5; font-size: 11px; font-weight: 900; }
        :is(.dark, .dark-mode) .duo-tooltip-delta { border-color: #3c3c46; }
        .duo-tooltip-delta.up { color: ${DUO_GREEN_DARK}; }
        .duo-tooltip-delta.down { color: ${DUO_RED}; }
      `}</style>
      <div className={`grid grid-cols-1 ${chunks.length > 1 ? 'md:grid-cols-2 gap-6' : ''}`}>
        {chunks.map((chartData, ci) => (
          <DuoRadarPanel
            key={ci}
            chunk={chartData}
            ci={ci}
            rangeLabel={
              chunks.length > 1
                ? `Competencies ${ci * 10 + 1}–${Math.min((ci + 1) * 10, active.length)}`
                : `${chartData.length} competencies tracked`
            }
          />
        ))}
      </div>
    </div>
  );
};

export default RadarChartComponent;
