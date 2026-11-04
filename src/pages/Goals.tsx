import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useStore } from '../lib/store';
import type { Goal } from '../lib/types';
import { MONTHS, PRELISTING_SOURCES, defaultGoal } from '../lib/options';
import { addDays, formatShort, startOfWeek, today } from '../lib/dates';
import { countByType, formatMoney, formatNumber, monthlyRevenue, planFor, ratio } from '../lib/metrics';
import { PageHeader } from '../components/Layout';
import { Stat } from '../components/Bits';
import { DecimalField, DecimalInput, TextField, parseDecimal } from '../components/Fields';
import { Icon } from '../components/Icon';
import { useToast } from '../components/Toast';

export function Goals() {
  const { goals, activities } = useStore();
  const t = today();
  const [year, setYear] = useState(Number(t.slice(0, 4)));
  const stored = goals.find((g) => g.year === year);
  const goal: Goal = stored ?? { id: '', ...defaultGoal(year) };
  const plan = planFor(goal);

  const yearActs = useMemo(() => activities.filter((a) => a.date.startsWith(String(year))), [activities, year]);
  const revenue = monthlyRevenue(activities, year);
  const totalReal = revenue.reduce((s, n) => s + n, 0);
  const totals = countByType(yearActs);

  return (
    <>
      <PageHeader
        title="Objetivos"
        subtitle="Plan anual, ratios de conversión y gastos"
        actions={
          <div className="week-nav">
            <button type="button" className="btn btn-icon" onClick={() => setYear(year - 1)} aria-label="Año anterior">
              <Icon name="left" />
            </button>
            <span className="label" aria-live="polite">
              {year}
            </span>
            <button type="button" className="btn btn-icon" onClick={() => setYear(year + 1)} aria-label="Año siguiente">
              <Icon name="right" />
            </button>
          </div>
        }
      />

      <div className="stack">
        {!stored && (
          <p className="banner small">
            Todavía no guardaste objetivos para {year}. Estos son valores sugeridos: ajustalos y guardá.
          </p>
        )}

        <div className="stats">
          <Stat label="Facturación real" value={totalReal} goal={goal.annual_target} suffix="$" />
          <Stat label="Transacciones necesarias" value={totals.cierre} goal={plan.dealsNeeded} />
          <Stat label="Captaciones necesarias / mes" value={plan.listingsNeeded} />
          <Stat label="Prelistings por semana" value={plan.weeklyPrelistings} />
        </div>

        <div className="grid-2">
          <GoalForm key={`${year}-${stored?.id ?? 'new'}`} goal={goal} />
          <section className="card" aria-labelledby="plan-title">
            <h2 id="plan-title">Lo que necesitás</h2>
            <dl className="dl">
              <div>
                <dt>Transacciones al año</dt>
                <dd>{formatNumber(plan.dealsNeeded)}</dd>
              </div>
              <div>
                <dt>Ventas necesarias</dt>
                <dd>{formatNumber(plan.salesNeeded)}</dd>
              </div>
              <div>
                <dt>Captaciones necesarias (mensual)</dt>
                <dd>{formatNumber(plan.listingsNeeded)}</dd>
              </div>
              <div>
                <dt>Prelistings semanales</dt>
                <dd>{formatNumber(plan.weeklyPrelistings, 2)}</dd>
              </div>
              <div>
                <dt>Contactos necesarios por semana</dt>
                <dd>{formatNumber(plan.weeklyContacts)}</dd>
              </div>
              <div>
                <dt>Neto anual / mensual</dt>
                <dd>
                  {formatMoney(plan.netAnnual)} / {formatMoney(plan.netMonthly)}
                </dd>
              </div>
            </dl>
          </section>
        </div>

        <MonthlyTable goal={goal} revenue={revenue} year={year} />
        <Ratios totals={totals} acts={yearActs} />
        <WeeklyTable year={year} goal={goal} />
        <Expenses year={year} agentSplit={goal.agent_split} />
      </div>
    </>
  );
}

function GoalForm({ goal }: { goal: Goal }) {
  const { create, save } = useStore();
  const toast = useToast();
  const [g, setG] = useState(goal);
  const [busy, setBusy] = useState(false);
  const num = (k: keyof Goal, scale = 1) => ({
    value: (g[k] as number) * scale,
    onChange: (n: number | null) => setG((p) => ({ ...p, [k]: (n ?? 0) / scale })),
  });

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const row = { ...g } as Partial<Goal>;
    delete row.id;
    delete row.user_id;
    try {
      if (goal.id) await save('goals', goal.id, row);
      else await create('goals', row);
      toast('Objetivos guardados');
    } catch (err) {
      toast(err instanceof Error ? `Error: ${err.message}` : 'No se pudo guardar');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card" aria-labelledby="goal-form-title">
      <h2 id="goal-form-title">Parámetros {goal.year}</h2>
      <form className="form" onSubmit={submit}>
        <div className="form-grid">
          <DecimalField label="Objetivo anual (USD bruto)" {...num('annual_target')} />
          <DecimalField label="Comisión por transacción (USD)" {...num('commission_per_deal')} />
          <DecimalField label="Puntas promedio" {...num('sides_per_deal')} />
          <DecimalField label="Rotación esperada (%)" hint="Captaciones que se venden por mes" {...num('monthly_rotation', 100)} />
          <DecimalField label="Prelistings por captación" {...num('prelistings_per_listing')} />
          <DecimalField label="Contactos por transacción" {...num('contacts_per_deal')} />
          <DecimalField label="Semanas de trabajo al año" {...num('working_weeks')} />
          <DecimalField label="Tu parte neta (%)" hint="Lo que te queda de la comisión bruta" {...num('agent_split', 100)} />
        </div>
        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? 'Guardando…' : 'Guardar parámetros'}
          </button>
        </div>
      </form>
    </section>
  );
}

function MonthlyTable({ goal, revenue, year }: { goal: Goal; revenue: number[]; year: number }) {
  const { create, save } = useStore();
  const toast = useToast();
  const [weights, setWeights] = useState(goal.monthly_weights.map((w) => w * 100));
  useEffect(() => setWeights(goal.monthly_weights.map((w) => w * 100)), [goal.monthly_weights]);

  const t = today();
  const currentMonth = Number(t.slice(0, 4)) === year ? Number(t.slice(5, 7)) - 1 : -1;
  const sumW = weights.reduce((s, n) => s + (n || 0), 0);
  let estAcc = 0;
  let realAcc = 0;
  const quarters = [0, 1, 2, 3].map((q) => {
    const est = weights.slice(q * 3, q * 3 + 3).reduce((s, w) => s + (goal.annual_target * (w || 0)) / 100, 0);
    const real = revenue.slice(q * 3, q * 3 + 3).reduce((s, n) => s + n, 0);
    return { est, real };
  });

  async function saveWeights() {
    const row = { ...goal, monthly_weights: weights.map((w) => (w || 0) / 100) } as Partial<Goal>;
    delete row.id;
    delete row.user_id;
    try {
      if (goal.id) await save('goals', goal.id, { monthly_weights: row.monthly_weights });
      else await create('goals', row);
      toast('Ponderación guardada');
    } catch (err) {
      toast(err instanceof Error ? `Error: ${err.message}` : 'No se pudo guardar');
    }
  }

  return (
    <section className="stack-sm" aria-labelledby="monthly-title">
      <div className="spread">
        <h2 id="monthly-title">Facturación mes a mes</h2>
        <button type="button" className="btn" onClick={saveWeights}>
          Guardar ponderación
        </button>
      </div>
      <p className="muted small">
        La ponderación reparte el objetivo según la estacionalidad. Suma actual: <strong>{formatNumber(sumW, 2)}%</strong>
        {Math.abs(sumW - 100) > 0.05 && <span className="badge badge-warning" style={{ marginLeft: 8 }}>Debería sumar 100%</span>}. La facturación real sale de los cierres que registrás.
      </p>
      <div className="table-wrap">
        <table>
          <caption className="visually-hidden">Estimado y real por mes, {year}</caption>
          <thead>
            <tr>
              <th scope="col">Mes</th>
              <th scope="col">Ponderación %</th>
              <th scope="col">Estimado</th>
              <th scope="col">Real</th>
              <th scope="col">Est. acumulado</th>
              <th scope="col">Real acumulado</th>
              <th scope="col">Cumplimiento</th>
            </tr>
          </thead>
          <tbody>
            {MONTHS.map((m, i) => {
              const est = (goal.annual_target * (weights[i] || 0)) / 100;
              estAcc += est;
              realAcc += revenue[i];
              return (
                <tr key={m} className={i === currentMonth ? 'is-current' : undefined} aria-current={i === currentMonth ? 'date' : undefined}>
                  <th scope="row" style={{ fontWeight: 600 }}>
                    {m}
                  </th>
                  <td>
                    <label className="visually-hidden" htmlFor={`w-${i}`}>
                      Ponderación de {m}
                    </label>
                    <DecimalInput
                      id={`w-${i}`}
                      value={Math.round(weights[i] * 100) / 100}
                      onChange={(n) => setWeights((ws) => ws.map((w, j) => (j === i ? n ?? 0 : w)))}
                    />
                  </td>
                  <td>{formatMoney(est)}</td>
                  <td>{revenue[i] ? formatMoney(revenue[i]) : '—'}</td>
                  <td>{formatMoney(estAcc)}</td>
                  <td>{formatMoney(realAcc)}</td>
                  <td>{est ? `${Math.round((revenue[i] / est) * 100)}%` : '—'}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td>Total</td>
              <td>{formatNumber(sumW, 2)}%</td>
              <td>{formatMoney(estAcc)}</td>
              <td>{formatMoney(realAcc)}</td>
              <td />
              <td />
              <td>{estAcc ? `${Math.round((realAcc / estAcc) * 100)}%` : '—'}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <div className="stats">
        {quarters.map((q, i) => (
          <Stat key={i} label={`${i + 1}º trimestre`} value={q.real} goal={q.est} suffix="$" />
        ))}
      </div>
    </section>
  );
}

function Ratios({ totals, acts }: { totals: ReturnType<typeof countByType>; acts: { type: string; operation: string | null }[] }) {
  const by = (type: string, op: string) => acts.filter((a) => a.type === type && a.operation === op).length;
  const rows: [string, string, string][] = [
    ['Contactos por prelisting', ratio(totals.contacto, totals.prelisting), `${totals.contacto} / ${totals.prelisting}`],
    ['Prelistings por captación', ratio(totals.prelisting, totals.captacion), `${totals.prelisting} / ${totals.captacion}`],
    ['Contactos por captación', ratio(totals.contacto, totals.captacion), `${totals.contacto} / ${totals.captacion}`],
    ['Visitas por cierre', ratio(totals.visita, totals.cierre), `${totals.visita} / ${totals.cierre}`],
    ['Captaciones por cierre', ratio(totals.captacion, totals.cierre), `${totals.captacion} / ${totals.cierre}`],
    ['Prelistings por cierre', ratio(totals.prelisting, totals.cierre), `${totals.prelisting} / ${totals.cierre}`],
    ['Contactos (verdes) por cierre', ratio(totals.contacto, totals.cierre), `${totals.contacto} / ${totals.cierre}`],
    ['Visitas por alquiler cerrado', ratio(by('visita', 'alquiler'), by('cierre', 'alquiler')), `${by('visita', 'alquiler')} / ${by('cierre', 'alquiler')}`],
    ['Visitas por compra cerrada', ratio(by('visita', 'compra'), by('cierre', 'compra')), `${by('visita', 'compra')} / ${by('cierre', 'compra')}`],
  ];
  return (
    <section className="card" aria-labelledby="ratios-title">
      <h2 id="ratios-title">Ratios de conversión del año</h2>
      <dl className="dl">
        {rows.map(([label, value, detail]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>
              <strong>{value}</strong> <span className="muted small">({detail})</span>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function WeeklyTable({ year, goal }: { year: number; goal: Goal }) {
  const { activities } = useStore();
  const plan = planFor(goal);
  const t = today();
  const currentWeek = startOfWeek(t);

  const weeks = useMemo(() => {
    const out: string[] = [];
    let d = startOfWeek(`${year}-01-01`);
    const last = `${year}-12-31`;
    const limit = t.startsWith(String(year)) ? currentWeek : last;
    while (d <= last && d <= limit) {
      out.push(d);
      d = addDays(d, 7);
    }
    return out.reverse();
  }, [year, t, currentWeek]);

  const rows = weeks.map((mon) => {
    const sun = addDays(mon, 6);
    const list = activities.filter((a) => a.date >= mon && a.date <= sun);
    const pre = list.filter((a) => a.type === 'prelisting');
    return {
      mon,
      sun,
      contacts: list.filter((a) => a.type === 'contacto').length,
      sources: PRELISTING_SOURCES.map((s) => pre.filter((a) => a.source === s.value).length),
      prelistings: pre.length,
      listings: list.filter((a) => a.type === 'captacion').length,
      visits: list.filter((a) => a.type === 'visita').length,
      deals: list.filter((a) => a.type === 'cierre').length,
    };
  });

  if (rows.length === 0) return null;

  return (
    <section className="stack-sm" aria-labelledby="weekly-title">
      <h2 id="weekly-title">Trackeo semanal</h2>
      <p className="muted small">Prelisting necesario por semana: {formatNumber(plan.weeklyPrelistings, 2)}. Se completa solo con las actividades que registrás.</p>
      <div className="table-wrap" style={{ maxHeight: 480 }}>
        <table>
          <caption className="visually-hidden">Actividades por semana, {year}</caption>
          <thead>
            <tr>
              <th scope="col">Semana</th>
              <th scope="col">Verdes</th>
              {PRELISTING_SOURCES.map((s) => (
                <th key={s.value} scope="col">
                  {s.label}
                </th>
              ))}
              <th scope="col">Prelisting</th>
              <th scope="col">Captaciones</th>
              <th scope="col">Visitas</th>
              <th scope="col">Cierres</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.mon} className={r.mon === currentWeek ? 'is-current' : undefined}>
                <th scope="row" style={{ fontWeight: 600 }}>
                  {formatShort(r.mon)} – {formatShort(r.sun)}
                </th>
                <td>{r.contacts || ''}</td>
                {r.sources.map((n, i) => (
                  <td key={i}>{n || ''}</td>
                ))}
                <td>
                  <strong>{r.prelistings}</strong>
                  {r.prelistings < plan.weeklyPrelistings && <span className="visually-hidden"> (por debajo de lo necesario)</span>}
                </td>
                <td>{r.listings || ''}</td>
                <td>{r.visits || ''}</td>
                <td>{r.deals || ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Expenses({ year, agentSplit }: { year: number; agentSplit: number }) {
  const { expenses, create, save, remove } = useStore();
  const toast = useToast();
  const list = expenses.filter((e) => e.year === year);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const monthly = list.reduce((s, e) => s + Number(e.monthly_amount), 0);

  async function add(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await create('expenses', { year, name: name.trim(), monthly_amount: parseDecimal(amount) ?? 0 });
      setName('');
      setAmount('');
      toast('Gasto agregado');
    } catch (err) {
      toast(err instanceof Error ? `Error: ${err.message}` : 'No se pudo guardar');
    }
  }

  return (
    <section className="card" aria-labelledby="expenses-title">
      <h2 id="expenses-title">Gastos e inversiones mensuales</h2>
      <div className="stats" style={{ marginBottom: 16 }}>
        <Stat label="Total por mes" value={monthly} suffix="$" />
        <Stat label="Gasto anual" value={monthly * 12} suffix="$" />
        <Stat label="Facturación mínima requerida" value={agentSplit ? (monthly * 12) / agentSplit : 0} suffix="$" />
      </div>
      {list.length > 0 && (
        <ul className="list" style={{ marginBottom: 16 }}>
          {list.map((e) => (
            <li key={e.id} className="row" style={{ flexWrap: 'nowrap', padding: '6px 0' }}>
              <span className="grow" style={{ flex: 1 }}>
                {e.name}
              </span>
              <label className="visually-hidden" htmlFor={`exp-${e.id}`}>
                Monto mensual de {e.name}
              </label>
              <DecimalInput
                id={`exp-${e.id}`}
                value={Number(e.monthly_amount)}
                style={{ maxWidth: 120, textAlign: 'right' }}
                onCommit={async (n) => {
                  const v = n ?? 0;
                  if (v !== Number(e.monthly_amount)) await save('expenses', e.id, { monthly_amount: v });
                }}
              />
              <button
                type="button"
                className="btn btn-ghost btn-icon"
                aria-label={`Eliminar ${e.name}`}
                onClick={async () => {
                  if (window.confirm(`¿Eliminar "${e.name}"?`)) await remove('expenses', e.id);
                }}
              >
                <Icon name="close" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <form className="form-grid" onSubmit={add} aria-label="Agregar gasto" style={{ alignItems: 'end' }}>
        <TextField label="Concepto" value={name} onChange={setName} placeholder="Ej.: avisos destacados" />
        <div className="row" style={{ alignItems: 'end', flexWrap: 'nowrap' }}>
          <TextField label="Monto mensual (USD)" inputMode="decimal" value={amount} onChange={setAmount} className="grow" />
          <button type="submit" className="btn btn-primary" disabled={!name.trim()}>
            Agregar
          </button>
        </div>
      </form>
    </section>
  );
}
