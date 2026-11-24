import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../lib/store';
import { useToday } from '../lib/useToday';
import { formatShort } from '../lib/dates';
import { defaultGoal, MONTHS } from '../lib/options';
import { formatMoney, formatNumber } from '../lib/metrics';
import {
  baseHealth,
  categoriesFor,
  cumulativeRevenue,
  currentPeriod,
  funnelFor,
  insightsFor,
  kpisFor,
  lastWeeks,
  shiftPeriod,
  sourcesFor,
  type Kpi,
  type PeriodKind,
} from '../lib/analytics';
import { PageHeader } from '../components/Layout';
import { Icon } from '../components/Icon';
import { LevelBadge } from '../components/Bits';
import { CumulativeChart, Funnel, HBars, ShareBar, WeeklyBars } from '../components/Charts';
import { planFor } from '../lib/metrics';

const KINDS: { value: PeriodKind; label: string }[] = [
  { value: 'mes', label: 'Mes' },
  { value: 'trimestre', label: 'Trimestre' },
  { value: 'anio', label: 'Año' },
];

const PACE: Record<Kpi['pace'], { label: string; icon: string; className: string }> = {
  adelante: { label: 'Adelantada', icon: '▲', className: 'status-good' },
  en_camino: { label: 'En camino', icon: '●', className: 'status-good' },
  atrasado: { label: 'Atrasada', icon: '▼', className: 'status-warning' },
  muy_atrasado: { label: 'Muy atrasada', icon: '▼', className: 'status-critical' },
  sin_meta: { label: 'Sin meta', icon: '–', className: '' },
};

const TONE_LABEL = { good: 'Bien', warning: 'Atención', critical: 'Prioridad', info: 'Dato' } as const;

export function Metrics() {
  const { goals, activities, contacts } = useStore();
  const t = useToday();
  const [period, setPeriod] = useState(() => currentPeriod('mes', t));
  const goal = goals.find((g) => g.year === period.year) ?? { id: '', ...defaultGoal(period.year) };
  const yearGoal = goals.find((g) => g.year === Number(t.slice(0, 4))) ?? { id: '', ...defaultGoal(Number(t.slice(0, 4))) };
  const plan = planFor(yearGoal);

  const kpis = useMemo(() => kpisFor(goal, activities, period, t), [goal, activities, period, t]);
  const funnel = useMemo(() => funnelFor(activities, period), [activities, period]);
  const sources = useMemo(() => sourcesFor(activities, period), [activities, period]);
  const cats = useMemo(() => categoriesFor(activities, period), [activities, period]);
  const curve = useMemo(() => cumulativeRevenue(goal, activities, period.year, t), [goal, activities, period.year, t]);
  const weeks = useMemo(() => lastWeeks(activities, t, 12), [activities, t]);
  const health = useMemo(() => baseHealth(contacts, activities, t), [contacts, activities, t]);
  const insights = useMemo(() => insightsFor(yearGoal, contacts, activities, t), [yearGoal, contacts, activities, t]);
  const isCurrent = period.from <= t && t <= period.to;

  return (
    <>
      <PageHeader title="Métricas" subtitle="Objetivos, resultados y análisis de tu negocio" />

      <div className="stack">
        <div className="metrics-toolbar">
          <div className="segmented" role="group" aria-label="Período">
            {KINDS.map((k) => (
              <button
                key={k.value}
                type="button"
                aria-pressed={period.kind === k.value}
                onClick={() => setPeriod(currentPeriod(k.value, t))}
              >
                {k.label}
              </button>
            ))}
          </div>
          <div className="week-nav">
            <button type="button" className="btn btn-icon" onClick={() => setPeriod(shiftPeriod(period, -1))} aria-label="Período anterior">
              <Icon name="left" />
            </button>
            <span className="label" aria-live="polite">
              {period.label}
            </span>
            <button type="button" className="btn btn-icon" onClick={() => setPeriod(shiftPeriod(period, 1))} aria-label="Período siguiente">
              <Icon name="right" />
            </button>
          </div>
        </div>

        <section aria-labelledby="kpi-title" className="stack-sm">
          <h2 id="kpi-title" className="overline">
            Resultados vs objetivo · {period.label}
          </h2>
          <div className="kpis">
            {kpis.map((k) => {
              const pct = k.target ? Math.round((k.actual / k.target) * 100) : null;
              const p = PACE[k.pace];
              const fmt = (v: number) => (k.money ? formatMoney(v) : formatNumber(v));
              return (
                <div key={k.key} className="kpi">
                  <span className="stat-label">{k.label}</span>
                  <span className="stat-value">
                    {fmt(k.actual)}
                    {k.target > 0 && <small> / {fmt(k.target)}</small>}
                  </span>
                  {pct !== null && (
                    <div
                      className="meter kpi-meter"
                      role="progressbar"
                      aria-label={`${k.label}: ${pct}% del objetivo`}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={Math.min(100, pct)}
                    >
                      <span style={{ width: `${Math.min(100, pct)}%` }} />
                      {isCurrent && k.target > 0 && (
                        <i className="kpi-expected" style={{ left: `${Math.min(100, (k.expected / k.target) * 100)}%` }} aria-hidden="true" />
                      )}
                    </div>
                  )}
                  <span className="kpi-foot">
                    {pct !== null ? `${pct}% del objetivo` : 'Sin objetivo cargado'}
                    {isCurrent && k.pace !== 'sin_meta' && (
                      <span className={`status ${p.className}`}>
                        <span aria-hidden="true">{p.icon}</span> {p.label}
                      </span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
          {isCurrent && <p className="muted small">La marca vertical en cada barra indica dónde deberías estar hoy según el ritmo del período.</p>}
        </section>

        <section className="card" aria-labelledby="analysis-title">
          <div className="card-header">
            <h2 id="analysis-title">Análisis de resultados</h2>
            <span className="badge">Año {t.slice(0, 4)}</span>
          </div>
          {insights.length === 0 ? (
            <p className="empty">
              Todavía no hay suficientes datos. Registrá actividades y cargá tus <Link to="/objetivos">objetivos</Link> para ver el análisis.
            </p>
          ) : (
            <ul className="insights">
              {insights.map((i) => (
                <li key={i.title} className={`insight tone-${i.tone}`}>
                  <span className="insight-tag">{TONE_LABEL[i.tone]}</span>
                  <div>
                    <strong>{i.title}</strong>
                    <p>{i.text}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="charts-grid">
          <section className="card">
            <CumulativeChart
              title={`Facturación acumulada ${period.year} vs objetivo`}
              labels={MONTHS.map((m) => m.slice(0, 3))}
              real={curve.map((c) => c.real)}
              target={curve.map((c) => c.target)}
            />
          </section>

          <section className="card" aria-labelledby="funnel-title">
            <h2 id="funnel-title" className="chart-title">
              Embudo · {period.label}
            </h2>
            <p className="muted small" style={{ marginBottom: 12 }}>
              El porcentaje indica cuántos pasan de una etapa a la siguiente.
            </p>
            <Funnel stages={funnel} />
          </section>

          <section className="card">
            <WeeklyBars
              title="Contactos por semana (últimas 12)"
              labels={weeks.map((w) => formatShort(w.from))}
              values={weeks.map((w) => w.contactos)}
              goal={plan.weeklyContacts}
              unit="Contactos"
            />
          </section>

          <section className="card">
            <WeeklyBars
              title="Prelistings por semana (últimas 12)"
              labels={weeks.map((w) => formatShort(w.from))}
              values={weeks.map((w) => w.prelistings)}
              goal={plan.weeklyPrelistings}
              unit="Prelistings"
            />
          </section>

          <section className="card" aria-labelledby="sources-title">
            <h2 id="sources-title" className="chart-title">
              Origen de los prelistings · {period.label}
            </h2>
            <HBars items={sources} empty="Sin prelistings en el período." />
          </section>

          <section className="card" aria-labelledby="time-title">
            <h2 id="time-title" className="chart-title">
              En qué se fue tu tiempo · {period.label}
            </h2>
            <ShareBar
              parts={[
                { key: 'negocio', label: 'Negocio', value: cats.negocio },
                { key: 'administrativa', label: 'Administrativa', value: cats.administrativa },
                { key: 'personal', label: 'Personal', value: cats.personal },
              ]}
            />
          </section>
        </div>

        <section className="card" aria-labelledby="base-title">
          <div className="card-header">
            <h2 id="base-title">Salud de tu base de relaciones</h2>
            <Link to="/contactos" className="btn btn-sm">
              Ver contactos
            </Link>
          </div>
          <div className="kpis">
            <div className="kpi">
              <span className="stat-label">Contactos en la base</span>
              <span className="stat-value">{health.total}</span>
            </div>
            <div className="kpi">
              <span className="stat-label">Al día con la frecuencia</span>
              <span className="stat-value">{health.upToDate === null ? '—' : `${health.upToDate}%`}</span>
            </div>
            <div className="kpi">
              <span className="stat-label">Para recontactar</span>
              <span className="stat-value">{health.overdue}</span>
            </div>
            <div className="kpi">
              <span className="stat-label">Oportunidades abiertas</span>
              <span className="stat-value">{health.opportunities}</span>
            </div>
          </div>
          <ul className="levels">
            {(['A', 'B', 'C', 'D'] as const).map((l) => (
              <li key={l}>
                <LevelBadge level={l} />
                <span className="hbar-track">
                  <span className="hbar" style={{ width: `${health.total ? (health.byLevel[l] / health.total) * 100 : 0}%` }} />
                </span>
                <strong>{health.byLevel[l]}</strong>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
