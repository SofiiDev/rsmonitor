// Métricas por período y análisis automático de resultados del negocio.
import type { Activity, Contact, Goal } from './types';
import { addDays, diffDays, fromISO, startOfWeek, toISO } from './dates';
import { CATEGORY_OF, MONTHS, PRELISTING_SOURCES } from './options';
import { formatMoney, formatNumber, isDone, overdueByFrequency, planFor } from './metrics';

export type PeriodKind = 'mes' | 'trimestre' | 'anio';

export interface Period {
  kind: PeriodKind;
  year: number;
  index: number; // mes 0-11, trimestre 0-3, año 0
  from: string;
  to: string;
  months: number[];
  label: string;
}

export function makePeriod(kind: PeriodKind, year: number, index: number): Period {
  const months = kind === 'mes' ? [index] : kind === 'trimestre' ? [index * 3, index * 3 + 1, index * 3 + 2] : [...Array(12).keys()];
  const from = toISO(new Date(year, months[0], 1));
  const to = toISO(new Date(year, months[months.length - 1] + 1, 0));
  const label = kind === 'mes' ? `${MONTHS[index]} ${year}` : kind === 'trimestre' ? `${index + 1}º trimestre ${year}` : `Año ${year}`;
  return { kind, year, index, from, to, months, label };
}

export function currentPeriod(kind: PeriodKind, ref: string): Period {
  const d = fromISO(ref);
  const index = kind === 'mes' ? d.getMonth() : kind === 'trimestre' ? Math.floor(d.getMonth() / 3) : 0;
  return makePeriod(kind, d.getFullYear(), index);
}

export function shiftPeriod(p: Period, step: number): Period {
  if (p.kind === 'anio') return makePeriod('anio', p.year + step, 0);
  const per = p.kind === 'mes' ? 12 : 4;
  const n = p.year * per + p.index + step;
  return makePeriod(p.kind, Math.floor(n / per), ((n % per) + per) % per);
}

/** Qué parte del período ya pasó (0 a 1), para medir el ritmo. */
export function elapsedShare(p: Period, ref: string): number {
  if (ref < p.from) return 0;
  if (ref > p.to) return 1;
  return (diffDays(ref, p.from) + 1) / (diffDays(p.to, p.from) + 1);
}

export type Pace = 'adelante' | 'en_camino' | 'atrasado' | 'muy_atrasado' | 'sin_meta';

export interface Kpi {
  key: string;
  label: string;
  actual: number;
  target: number;   // meta del período completo
  expected: number; // lo esperado a la fecha según el ritmo
  money?: boolean;
  pace: Pace;
}

function paceOf(actual: number, expected: number, target: number): Pace {
  if (!target) return 'sin_meta';
  if (expected <= 0) return actual > 0 ? 'adelante' : 'en_camino';
  const r = actual / expected;
  if (r >= 1.1) return 'adelante';
  if (r >= 0.9) return 'en_camino';
  if (r >= 0.6) return 'atrasado';
  return 'muy_atrasado';
}

const count = (list: Activity[], type: Activity['type']) => list.filter((a) => a.type === type).length;

export function periodActivities(activities: Activity[], p: Period) {
  return activities.filter((a) => isDone(a) && a.date >= p.from && a.date <= p.to);
}

export function kpisFor(goal: Goal, activities: Activity[], p: Period, ref: string): Kpi[] {
  const plan = planFor(goal);
  const list = periodActivities(activities, p);
  const share = elapsedShare(p, ref);
  // Peso del período según la ponderación mensual (estacionalidad).
  const weight = p.months.reduce((s, m) => s + (goal.monthly_weights[m] || 0), 0);
  const weeks = (diffDays(p.to, p.from) + 1) / 7;

  const revenue = list.filter((a) => a.type === 'cierre').reduce((s, a) => s + Number(a.amount || 0), 0);
  const make = (key: string, label: string, actual: number, target: number, money = false): Kpi => {
    const expected = target * share;
    return { key, label, actual, target, expected, money, pace: paceOf(actual, expected, target) };
  };

  return [
    make('facturacion', 'Facturación', revenue, goal.annual_target * weight, true),
    make('cierres', 'Cierres', count(list, 'cierre'), plan.dealsNeeded * weight),
    make('captaciones', 'Captaciones', count(list, 'captacion'), plan.listingsNeeded * p.months.length),
    make('prelistings', 'Prelistings', count(list, 'prelisting'), plan.weeklyPrelistings * weeks),
    make('contactos', 'Contactos (verdes)', count(list, 'contacto'), plan.weeklyContacts * weeks),
  ];
}

export interface FunnelStage {
  label: string;
  value: number;
  conversion: number | null; // % respecto de la etapa anterior
}

export function funnelFor(activities: Activity[], p: Period): FunnelStage[] {
  const list = periodActivities(activities, p);
  const values: [string, number][] = [
    ['Contactos', count(list, 'contacto')],
    ['Prelistings', count(list, 'prelisting')],
    ['Captaciones', count(list, 'captacion')],
    ['Cierres', count(list, 'cierre')],
  ];
  return values.map(([label, value], i) => ({
    label,
    value,
    conversion: i === 0 || !values[i - 1][1] ? null : (value / values[i - 1][1]) * 100,
  }));
}

export interface WeekPoint {
  from: string;
  contactos: number;
  prelistings: number;
  negocio: number;
}

export function lastWeeks(activities: Activity[], ref: string, n = 12): WeekPoint[] {
  const out: WeekPoint[] = [];
  const thisMonday = startOfWeek(ref);
  for (let i = n - 1; i >= 0; i--) {
    const from = addDays(thisMonday, -7 * i);
    const to = addDays(from, 6);
    const list = activities.filter((a) => isDone(a) && a.date >= from && a.date <= to);
    out.push({
      from,
      contactos: count(list, 'contacto'),
      prelistings: count(list, 'prelisting'),
      negocio: list.filter((a) => CATEGORY_OF[a.type] === 'negocio').length,
    });
  }
  return out;
}

export interface MonthPoint {
  month: number;
  real: number | null; // acumulado (null en meses futuros)
  target: number;      // acumulado
}

export function cumulativeRevenue(goal: Goal, activities: Activity[], year: number, ref: string): MonthPoint[] {
  const monthly = Array(12).fill(0) as number[];
  for (const a of activities) {
    if (!isDone(a) || a.type !== 'cierre' || !a.amount) continue;
    const d = fromISO(a.date);
    if (d.getFullYear() === year) monthly[d.getMonth()] += Number(a.amount);
  }
  const r = fromISO(ref);
  const lastMonth = r.getFullYear() > year ? 11 : r.getFullYear() < year ? -1 : r.getMonth();
  let real = 0;
  let target = 0;
  return monthly.map((v, m) => {
    real += v;
    target += goal.annual_target * (goal.monthly_weights[m] || 0);
    return { month: m, real: m <= lastMonth ? real : null, target };
  });
}

export function sourcesFor(activities: Activity[], p: Period) {
  const pre = periodActivities(activities, p).filter((a) => a.type === 'prelisting');
  return PRELISTING_SOURCES.map((s) => ({ label: s.label, value: pre.filter((a) => a.source === s.value).length }))
    .concat([{ label: 'Sin origen', value: pre.filter((a) => !a.source).length }])
    .filter((s) => s.value > 0)
    .sort((a, b) => b.value - a.value);
}

export function categoriesFor(activities: Activity[], p: Period) {
  const list = periodActivities(activities, p);
  return {
    negocio: list.filter((a) => CATEGORY_OF[a.type] === 'negocio').length,
    administrativa: list.filter((a) => CATEGORY_OF[a.type] === 'administrativa').length,
    personal: list.filter((a) => CATEGORY_OF[a.type] === 'personal').length,
  };
}

export function baseHealth(contacts: Contact[], activities: Activity[], ref: string) {
  const byLevel = { A: 0, B: 0, C: 0, D: 0, sin: 0 };
  for (const c of contacts) byLevel[c.level ?? 'sin']++;
  const withFreq = contacts.filter((c) => c.contact_frequency && !c.do_not_contact);
  const overdue = overdueByFrequency(contacts, activities, ref);
  const opportunities = contacts.filter((c) => c.opportunity_status && !['Sin oportunidad', 'Cerrada'].includes(c.opportunity_status)).length;
  return {
    total: contacts.length,
    byLevel,
    upToDate: withFreq.length ? Math.round(((withFreq.length - overdue.length) / withFreq.length) * 100) : null,
    overdue: overdue.length,
    opportunities,
  };
}

// ───────────────────────── Análisis en palabras ─────────────────────────

export type InsightTone = 'good' | 'warning' | 'critical' | 'info';

export interface Insight {
  tone: InsightTone;
  title: string;
  text: string;
}

export function insightsFor(goal: Goal, contacts: Contact[], activities: Activity[], ref: string): Insight[] {
  const out: Insight[] = [];
  const year = fromISO(ref).getFullYear();
  const plan = planFor(goal);
  const yearP = makePeriod('anio', year, 0);
  const curve = cumulativeRevenue(goal, activities, year, ref);
  const m = fromISO(ref).getMonth();
  const real = curve[m].real ?? 0;
  const expectedToDate = curve[m].target * (fromISO(ref).getDate() / new Date(year, m + 1, 0).getDate()) + (m > 0 ? curve[m - 1].target : 0) * (1 - fromISO(ref).getDate() / new Date(year, m + 1, 0).getDate());
  const weightToDate = goal.annual_target ? expectedToDate / goal.annual_target : 0;

  // 1. Facturación: ritmo y proyección
  if (goal.annual_target > 0) {
    const projected = weightToDate > 0.02 ? real / weightToDate : null;
    const gap = Math.max(0, goal.annual_target - real);
    const dealsLeft = Math.ceil(gap / (goal.commission_per_deal || 1));
    if (real >= goal.annual_target) {
      out.push({ tone: 'good', title: 'Objetivo anual cumplido', text: `Facturaste ${formatMoney(real)}, por encima del objetivo de ${formatMoney(goal.annual_target)}.` });
    } else if (projected !== null) {
      const pct = Math.round((projected / goal.annual_target) * 100);
      out.push({
        tone: pct >= 95 ? 'good' : pct >= 70 ? 'warning' : 'critical',
        title: `Proyección ${year}: ${formatMoney(projected)} (${pct}% del objetivo)`,
        text: `Llevás ${formatMoney(real)} facturados y a esta altura del año el plan esperaba ${formatMoney(expectedToDate)}. Te faltan ${formatMoney(gap)}: ${dealsLeft === 1 ? '1 cierre' : `${dealsLeft} cierres`} de ${formatMoney(goal.commission_per_deal)}.`,
      });
    }
  }

  // 2. Ritmo de actividad de las últimas 4 semanas
  const weeks = lastWeeks(activities, ref, 5).slice(0, 4); // 4 semanas completas anteriores
  const avg = (k: 'contactos' | 'prelistings') => weeks.reduce((s, w) => s + w[k], 0) / weeks.length;
  const pre = avg('prelistings');
  const con = avg('contactos');
  if (plan.weeklyPrelistings > 0) {
    const ok = pre >= plan.weeklyPrelistings;
    out.push({
      tone: ok ? 'good' : pre >= plan.weeklyPrelistings * 0.6 ? 'warning' : 'critical',
      title: `Prelistings: ${formatNumber(pre)} por semana (necesitás ${formatNumber(plan.weeklyPrelistings)})`,
      text: ok
        ? 'Tu ritmo de prelistings de las últimas 4 semanas alcanza para el objetivo. Sostenelo.'
        : `En las últimas 4 semanas hiciste en promedio ${formatNumber(pre)} prelistings por semana. Subir a ${formatNumber(Math.ceil(plan.weeklyPrelistings * 10) / 10)} te pone en ritmo de objetivo.`,
    });
  }
  if (plan.weeklyContacts > 0) {
    const ok = con >= plan.weeklyContacts;
    out.push({
      tone: ok ? 'good' : con >= plan.weeklyContacts * 0.6 ? 'warning' : 'critical',
      title: `Contactos: ${formatNumber(con)} por semana (necesitás ${formatNumber(plan.weeklyContacts)})`,
      text: ok
        ? 'Estás generando suficientes conversaciones con tu base.'
        : 'Los contactos con tu base son el principio del embudo: si bajan, en unas semanas bajan los prelistings.',
    });
  }

  // 3. Cuello de botella del embudo (año)
  const funnel = funnelFor(activities, yearP);
  const [c, p, l, d] = funnel.map((f) => f.value);
  const expectedPreToList = goal.prelistings_per_listing ? 100 / goal.prelistings_per_listing : null;
  if (p >= 3 && expectedPreToList) {
    const rate = (l / p) * 100;
    out.push({
      tone: rate >= expectedPreToList ? 'good' : 'warning',
      title: `Conversión prelisting → captación: ${formatNumber(rate, 0)}%`,
      text:
        rate >= expectedPreToList
          ? `Mejor que lo previsto en tu plan (${formatNumber(expectedPreToList, 0)}%, 1 de cada ${formatNumber(goal.prelistings_per_listing)}).`
          : `Tu plan supone ${formatNumber(expectedPreToList, 0)}% (1 de cada ${formatNumber(goal.prelistings_per_listing)}). Revisá la presentación del ACM y el seguimiento posterior al prelisting.`,
    });
  }
  if (c >= 10 && p === 0) {
    out.push({ tone: 'warning', title: 'Muchos contactos, ningún prelisting', text: 'Tenés conversaciones con tu base pero no se transforman en prelistings. Probá preguntar directamente por necesidades de venta o referidos.' });
  }
  if (l >= 2 && d === 0) {
    out.push({ tone: 'info', title: 'Captaciones sin cierres todavía', text: `Tenés ${l} captaciones en el año y ningún cierre registrado. Si hubo operaciones, cargalas como "Cierre" con la comisión.` });
  }

  // 4. Mejor origen de prelistings
  const sources = sourcesFor(activities, yearP);
  const totalPre = sources.reduce((s, x) => s + x.value, 0);
  if (totalPre >= 3 && sources[0]) {
    out.push({
      tone: 'info',
      title: `Tu mejor fuente de prelistings: ${sources[0].label}`,
      text: `${Math.round((sources[0].value / totalPre) * 100)}% de tus prelistings del año vienen de ahí (${sources[0].value} de ${totalPre}).`,
    });
  }

  // 5. Salud de la base
  const health = baseHealth(contacts, activities, ref);
  if (health.total > 0) {
    out.push({
      tone: health.overdue === 0 ? 'good' : health.upToDate !== null && health.upToDate >= 70 ? 'warning' : 'critical',
      title: health.overdue === 0 ? 'Tu base está al día' : `${health.overdue} contactos para recontactar`,
      text:
        health.upToDate === null
          ? 'Cargá la frecuencia de contacto sugerida en cada ficha para medir si tu base está al día.'
          : `${health.upToDate}% de los contactos con frecuencia definida están al día. Círculo A: ${health.byLevel.A} · B: ${health.byLevel.B} · C: ${health.byLevel.C} · D: ${health.byLevel.D}.`,
    });
  }

  // 6. Tiempo dedicado al negocio (mes actual)
  const month = makePeriod('mes', year, m);
  const cats = categoriesFor(activities, month);
  const totalCats = cats.negocio + cats.administrativa + cats.personal;
  if (totalCats >= 5) {
    const share = Math.round((cats.negocio / totalCats) * 100);
    out.push({
      tone: share >= 60 ? 'good' : 'warning',
      title: `${share}% de tus actividades del mes son de negocio`,
      text: share >= 60 ? 'Buen foco: la mayor parte de tu tiempo va a actividades que generan negocio.' : 'Las tareas administrativas y personales están ocupando mucho espacio. Bloqueá horarios fijos para contactos y prelistings.',
    });
  }

  return out;
}
