import { useMemo, useState } from 'react';

const RANGE_OPTIONS = [
  { key: '1D', label: '1D', days: 1, buckets: 6 },
  { key: '1W', label: '1W', days: 7, buckets: 7 },
  { key: '1M', label: '1M', days: 30, buckets: 6 },
  { key: '6M', label: '6M', days: 180, buckets: 6 },
  { key: 'ALL', label: '1Y', days: 365, buckets: 8 },
];

function buildSmoothSvgPath(points) {
  if (!points || points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let path = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const midX = (p0.x + p1.x) / 2;
    path += ` C ${midX.toFixed(2)} ${p0.y.toFixed(2)}, ${midX.toFixed(2)} ${p1.y.toFixed(2)}, ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`;
  }
  return path;
}

function buildChartSeries(complaints = [], stats = {}, rangeKey = 'ALL') {
  const cfg = RANGE_OPTIONS.find((r) => r.key === rangeKey) || RANGE_OPTIONS[4];
  const now = Date.now();
  const cutoffMs = now - cfg.days * 24 * 60 * 60 * 1000;

  const validDated = complaints
    .map((c) => {
      const ts = c.created_at ? new Date(c.created_at).getTime() : NaN;
      return Number.isNaN(ts) ? null : { ...c, ts };
    })
    .filter(Boolean);

  // Use timestamps from actual complaints; fallback to stage distribution if no dated records exist
  if (validDated.length === 0) {
    const stages = [
      { label: 'Submitted', value: stats.Submitted || 0 },
      { label: 'Verified', value: stats.Verified || 0 },
      { label: 'Assigned', value: stats.Assigned || 0 },
      { label: 'In Progress', value: stats['In Progress'] || 0 },
      { label: 'Resolved', value: stats.Resolved || 0 },
      { label: 'Rejected', value: stats.Rejected || 0 },
    ];
    const total = Math.max(1, stats.total || stages.reduce((acc, s) => acc + s.value, 0));
    return stages.map((st) => ({
      label: st.label,
      value: st.value,
      badge: `${Math.round((st.value / total) * 100)}%`,
    }));
  }

  const inRange = validDated.filter((c) => c.ts >= cutoffMs);
  const referenceSet = inRange.length > 0 ? inRange : validDated;
  const minTs = Math.min(...referenceSet.map((c) => c.ts), cutoffMs);
  const spanMs = Math.max(24 * 60 * 60 * 1000, now - minTs);
  const bucketCount = cfg.buckets;
  const bucketStep = spanMs / bucketCount;

  const buckets = Array.from({ length: bucketCount }, (_, idx) => {
    const start = minTs + idx * bucketStep;
    const end = idx === bucketCount - 1 ? now + 1 : minTs + (idx + 1) * bucketStep;
    const d = new Date(start);
    const label =
      cfg.days <= 1
        ? d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
        : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    const count = referenceSet.filter((item) => item.ts >= start && item.ts < end).length;
    const resolved = referenceSet.filter(
      (item) => item.ts >= start && item.ts < end && item.status === 'Resolved'
    ).length;
    return { label, value: count, resolved };
  });

  const denom = Math.max(1, referenceSet.length);
  return buckets.map((b) => ({
    label: b.label,
    value: b.value,
    badge: b.resolved > 0 ? `${b.resolved} resolved` : `${Math.round((b.value / denom) * 100)}%`,
  }));
}

export default function ComplaintTrendChart({ complaints = [], stats = {} }) {
  const [range, setRange] = useState('ALL');
  const [activeIndex, setActiveIndex] = useState(null);

  const series = useMemo(
    () => buildChartSeries(complaints, stats, range),
    [complaints, stats, range]
  );

  const width = 920;
  const height = 210;
  const padLeft = 36;
  const padRight = 22;
  const padTop = 20;
  const padBottom = 32;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const maxVal = Math.max(1, ...series.map((d) => d.value));

  const points = series.map((d, idx) => {
    const x =
      series.length === 1
        ? padLeft + plotW / 2
        : padLeft + (idx / (series.length - 1)) * plotW;
    const y = padTop + plotH - (d.value / maxVal) * (plotH * 0.86);
    return { ...d, x, y, idx };
  });

  const strokePath = buildSmoothSvgPath(points);
  const areaPath =
    points.length > 0
      ? `${strokePath} L ${points[points.length - 1].x.toFixed(2)} ${(padTop + plotH).toFixed(2)} L ${points[0].x.toFixed(2)} ${(padTop + plotH).toFixed(2)} Z`
      : '';

  const fallbackIdx = points.length > 0 ? Math.floor(points.length / 2) : 0;
  const selectedIdx =
    activeIndex !== null && activeIndex >= 0 && activeIndex < points.length
      ? activeIndex
      : fallbackIdx;
  const activePoint = points[selectedIdx] || null;
  const tooltipLeftPct = activePoint ? Math.min(84, Math.max(16, (activePoint.x / width) * 100)) : 50;

  return (
    <section className="admin-glass-card admin-chart-card">
      <div className="admin-card-head" style={{ flexWrap: 'wrap' }}>
        <div>
          <h3 className="admin-card-title">Complaint Activity &amp; Status Trend</h3>
          <p className="admin-metric-sub" style={{ marginTop: '3px' }}>
            Submitted {stats.Submitted || 0} · Verified {stats.Verified || 0} · Assigned{' '}
            {stats.Assigned || 0} · In Progress {stats['In Progress'] || 0} · Resolved{' '}
            {stats.Resolved || 0} · Rejected {stats.Rejected || 0}
          </p>
        </div>
        <div className="admin-watchlist-filters" style={{ marginBottom: 0 }}>
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              className={`admin-mini-pill${range === opt.key ? ' active' : ''}`}
              onClick={() => {
                setRange(opt.key);
                setActiveIndex(null);
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="admin-chart-svg-wrap">
        {activePoint && (
          <div className="admin-chart-tooltip" style={{ left: `${tooltipLeftPct}%` }}>
            <small>{activePoint.label}</small>
            <div className="admin-chart-tooltip-val">
              <span>{activePoint.value} complaints</span>
              <span className="admin-tooltip-badge">{activePoint.badge}</span>
            </div>
          </div>
        )}

        <svg viewBox={`0 0 ${width} ${height}`} className="admin-chart-svg" role="img" aria-label="Complaint activity chart">
          <defs>
            <linearGradient id="gsGreenAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(34, 197, 94, 0.35)" />
              <stop offset="100%" stopColor="rgba(34, 197, 94, 0)" />
            </linearGradient>
          </defs>

          {[0, 0.25, 0.5, 0.75, 1].map((step) => {
            const yPos = padTop + plotH * step;
            const axisVal = Math.round(maxVal * (1 - step));
            return (
              <g key={step}>
                <line
                  x1={padLeft}
                  y1={yPos}
                  x2={width - padRight}
                  y2={yPos}
                  stroke="rgba(255,255,255,0.06)"
                  strokeWidth="1"
                />
                <text
                  x={padLeft - 8}
                  y={yPos + 4}
                  textAnchor="end"
                  fill="#6b7280"
                  fontSize="11"
                >
                  {axisVal}
                </text>
              </g>
            );
          })}

          {areaPath && <path d={areaPath} fill="url(#gsGreenAreaGrad)" />}
          {strokePath && (
            <path
              d={strokePath}
              fill="none"
              stroke="#86efac"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          )}

          {activePoint && (
            <line
              x1={activePoint.x}
              y1={activePoint.y}
              x2={activePoint.x}
              y2={padTop + plotH}
              stroke="rgba(134, 239, 172, 0.5)"
              strokeDasharray="4 4"
              strokeWidth="1.5"
            />
          )}

          {points.map((pt) => {
            const isSelected = pt.idx === selectedIdx;
            return (
              <g
                key={`${pt.label}-${pt.idx}`}
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setActiveIndex(pt.idx)}
                onClick={() => setActiveIndex(pt.idx)}
              >
                <circle cx={pt.x} cy={pt.y} r="14" fill="transparent" />
                {isSelected && (
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r="10"
                    fill="rgba(34, 197, 94, 0.28)"
                  />
                )}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isSelected ? '5' : '3'}
                  fill={isSelected ? '#86efac' : '#22c55e'}
                  stroke="#050806"
                  strokeWidth="1.5"
                />
                <text
                  x={pt.x}
                  y={height - 8}
                  textAnchor="middle"
                  fill={isSelected ? '#f5f5f5' : '#6b7280'}
                  fontSize="11"
                >
                  {pt.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </section>
  );
}

