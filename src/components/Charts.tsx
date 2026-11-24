// Gráficos livianos en SVG/HTML, sin librerías. Un solo eje, marcas finas,
// tooltip al pasar el mouse o tocar, y siempre una vista de tabla.
import { useState, type ReactNode } from 'react';

const W = 640;
const H = 220;
const M = { l: 52, r: 12, t: 14, b: 28 };
const IW = W - M.l - M.r;
const IH = H - M.t - M.b;

/** Máximo "redondo" del eje (1, 2, 2.5, 5 × 10^n). */
function niceMax(v: number): number {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * p >= v) return m * p;
  return 10 * p;
}

function ticks(max: number, n = 4) {
  return Array.from({ length: n + 1 }, (_, i) => (max / n) * i);
}

const compact = (v: number, money?: boolean) =>
  money
    ? v.toLocaleString('es-AR', { style: 'currency', currency: 'USD', notation: v >= 10000 ? 'compact' : 'standard', maximumFractionDigits: v >= 10000 ? 1 : 0 })
    : v.toLocaleString('es-AR', { maximumFractionDigits: 1 });

function Frame({ title, children, legend, table }: { title: string; children: ReactNode; legend?: ReactNode; table: ReactNode }) {
  return (
    <figure className="chart">
      <figcaption className="chart-title">{title}</figcaption>
      {legend && <div className="chart-legend">{legend}</div>}
      {children}
      <details className="chart-table">
        <summary>Ver como tabla</summary>
        <div className="table-wrap">{table}</div>
      </details>
    </figure>
  );
}

function YAxis({ max, money }: { max: number; money?: boolean }) {
  return (
    <g className="axis">
      {ticks(max).map((t) => {
        const y = M.t + IH - (t / max) * IH;
        return (
          <g key={t}>
            <line x1={M.l} x2={W - M.r} y1={y} y2={y} className={t === 0 ? 'baseline' : 'grid'} />
            <text x={M.l - 8} y={y} dy="0.32em" textAnchor="end">
              {compact(t, money)}
            </text>
          </g>
        );
      })}
    </g>
  );
}

function Tooltip({ x, children }: { x: number; children: ReactNode }) {
  // x en coordenadas del viewBox → porcentaje del ancho
  const left = Math.min(85, Math.max(15, (x / W) * 100));
  return (
    <div className="chart-tooltip" style={{ left: `${left}%` }} role="status">
      {children}
    </div>
  );
}

// ───────────────────────── Línea acumulada vs objetivo ─────────────────────────

export function CumulativeChart({
  title,
  labels,
  real,
  target,
}: {
  title: string;
  labels: string[];
  real: (number | null)[];
  target: number[];
}) {
  const [hover, setHover] = useState<number | null>(null);
  const max = niceMax(Math.max(...target, ...real.map((v) => v ?? 0)));
  const step = IW / (labels.length - 1);
  const x = (i: number) => M.l + i * step;
  const y = (v: number) => M.t + IH - (v / max) * IH;
  const realPts = real.map((v, i) => (v === null ? null : `${x(i)},${y(v)}`)).filter(Boolean).join(' ');
  const targetPts = target.map((v, i) => `${x(i)},${y(v)}`).join(' ');
  const money = (v: number) => v.toLocaleString('es-AR', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

  return (
    <Frame
      title={title}
      legend={
        <>
          <span className="lg">
            <span className="lg-line" aria-hidden="true" /> Real acumulado
          </span>
          <span className="lg">
            <span className="lg-line lg-dashed" aria-hidden="true" /> Objetivo acumulado
          </span>
        </>
      }
      table={
        <table>
          <thead>
            <tr>
              <th scope="col">Mes</th>
              <th scope="col">Real acumulado</th>
              <th scope="col">Objetivo acumulado</th>
            </tr>
          </thead>
          <tbody>
            {labels.map((l, i) => (
              <tr key={l}>
                <th scope="row">{l}</th>
                <td>{real[i] === null ? '—' : money(real[i] as number)}</td>
                <td>{money(target[i])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      }
    >
      <div className="chart-plot">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${title}. Ver la tabla para los valores.`} onMouseLeave={() => setHover(null)}>
          <YAxis max={max} money />
          {labels.map((l, i) => (
            <text key={l} x={x(i)} y={H - 8} textAnchor="middle" className="axis-label">
              {l}
            </text>
          ))}
          {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={M.t} y2={M.t + IH} className="crosshair" />}
          <polyline points={targetPts} className="line-target" />
          {realPts && <polyline points={realPts} className="line-real" />}
          {real.map((v, i) =>
            v === null ? null : <circle key={i} cx={x(i)} cy={y(v)} r={hover === i ? 5 : 4} className="dot-real" />,
          )}
          {labels.map((l, i) => (
            <rect
              key={l}
              x={x(i) - step / 2}
              y={M.t}
              width={step}
              height={IH}
              className="hit"
              onMouseEnter={() => setHover(i)}
              onClick={() => setHover(i)}
            />
          ))}
        </svg>
        {hover !== null && (
          <Tooltip x={x(hover)}>
            <strong>{labels[hover]}</strong>
            <span>Real: {real[hover] === null ? '—' : money(real[hover] as number)}</span>
            <span>Objetivo: {money(target[hover])}</span>
          </Tooltip>
        )}
      </div>
    </Frame>
  );
}

// ───────────────────────── Barras por semana con meta ─────────────────────────

export function WeeklyBars({
  title,
  labels,
  values,
  goal,
  unit,
}: {
  title: string;
  labels: string[];
  values: number[];
  goal: number;
  unit: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const max = niceMax(Math.max(goal, ...values, 1));
  const slot = IW / values.length;
  const bw = Math.min(28, slot * 0.6);
  const y = (v: number) => M.t + IH - (v / max) * IH;
  const gy = y(goal);

  return (
    <Frame
      title={title}
      legend={
        goal > 0 ? (
          <span className="lg">
            <span className="lg-line lg-dashed" aria-hidden="true" /> Meta semanal: {goal.toLocaleString('es-AR', { maximumFractionDigits: 1 })}
          </span>
        ) : undefined
      }
      table={
        <table>
          <thead>
            <tr>
              <th scope="col">Semana del</th>
              <th scope="col">{unit}</th>
            </tr>
          </thead>
          <tbody>
            {labels.map((l, i) => (
              <tr key={l}>
                <th scope="row">{l}</th>
                <td>{values[i]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      }
    >
      <div className="chart-plot">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${title}. Ver la tabla para los valores.`} onMouseLeave={() => setHover(null)}>
          <YAxis max={max} />
          {values.map((v, i) => {
            const cx = M.l + slot * i + slot / 2;
            const h = Math.max(0, M.t + IH - y(v));
            return (
              <g key={i}>
                {h > 0 && (
                  <path
                    className={`bar ${hover === i ? 'is-hover' : ''}`}
                    d={`M${cx - bw / 2},${M.t + IH} V${M.t + IH - h + Math.min(4, h)} q0,-${Math.min(4, h)} ${Math.min(4, h)},-${Math.min(4, h)} H${cx + bw / 2 - Math.min(4, h)} q${Math.min(4, h)},0 ${Math.min(4, h)},${Math.min(4, h)} V${M.t + IH} Z`}
                  />
                )}
                {(i % 2 === values.length % 2 || values.length <= 8) && (
                  <text x={cx} y={H - 8} textAnchor="middle" className="axis-label">
                    {labels[i]}
                  </text>
                )}
                <rect x={M.l + slot * i} y={M.t} width={slot} height={IH} className="hit" onMouseEnter={() => setHover(i)} onClick={() => setHover(i)} />
              </g>
            );
          })}
          {goal > 0 && <line x1={M.l} x2={W - M.r} y1={gy} y2={gy} className="line-goal" />}
        </svg>
        {hover !== null && (
          <Tooltip x={M.l + slot * hover + slot / 2}>
            <strong>Semana del {labels[hover]}</strong>
            <span>
              {values[hover]} {unit.toLowerCase()}
            </span>
            {goal > 0 && <span>Meta: {goal.toLocaleString('es-AR', { maximumFractionDigits: 1 })}</span>}
          </Tooltip>
        )}
      </div>
    </Frame>
  );
}

// ───────────────────────── Embudo ─────────────────────────

export function Funnel({ stages }: { stages: { label: string; value: number; conversion: number | null }[] }) {
  const max = Math.max(1, ...stages.map((s) => s.value));
  return (
    <ol className="funnel" aria-label="Embudo de conversión">
      {stages.map((s, i) => (
        <li key={s.label} className="funnel-row">
          <span className="funnel-label">{s.label}</span>
          <span className="funnel-track">
            <span className={`funnel-bar step-${i}`} style={{ width: `${Math.max(s.value ? 2 : 0, (s.value / max) * 100)}%` }} />
          </span>
          <span className="funnel-value">
            <strong>{s.value}</strong>
            {s.conversion !== null && <span className="muted"> · {s.conversion.toLocaleString('es-AR', { maximumFractionDigits: 0 })}%</span>}
          </span>
        </li>
      ))}
    </ol>
  );
}

// ───────────────────────── Barras horizontales ─────────────────────────

export function HBars({ items, empty }: { items: { label: string; value: number }[]; empty: string }) {
  if (items.length === 0) return <p className="empty">{empty}</p>;
  const max = Math.max(1, ...items.map((i) => i.value));
  const total = items.reduce((s, i) => s + i.value, 0);
  return (
    <ul className="hbars">
      {items.map((it) => (
        <li key={it.label} className="hbar-row">
          <span className="hbar-label">{it.label}</span>
          <span className="hbar-track">
            <span className="hbar" style={{ width: `${(it.value / max) * 100}%` }} />
          </span>
          <span className="hbar-value">
            <strong>{it.value}</strong> <span className="muted">({Math.round((it.value / total) * 100)}%)</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

// ───────────────────────── Barra 100% por categoría ─────────────────────────

export function ShareBar({ parts }: { parts: { key: string; label: string; value: number }[] }) {
  const total = parts.reduce((s, p) => s + p.value, 0);
  if (!total) return <p className="empty">Sin actividades en el período.</p>;
  return (
    <div className="share">
      <div className="share-bar" role="img" aria-label={parts.map((p) => `${p.label} ${Math.round((p.value / total) * 100)}%`).join(', ')}>
        {parts
          .filter((p) => p.value > 0)
          .map((p) => (
            <span key={p.key} className={`share-seg viz-${p.key}`} style={{ flexGrow: p.value }} title={`${p.label}: ${p.value}`} />
          ))}
      </div>
      <ul className="share-legend">
        {parts.map((p) => (
          <li key={p.key}>
            <span className={`share-swatch viz-${p.key}`} aria-hidden="true" />
            {p.label}: <strong>{p.value}</strong> <span className="muted">({Math.round((p.value / total) * 100)}%)</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
