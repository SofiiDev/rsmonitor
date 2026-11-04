import type { Activity, ActivityType, Category, Contact, Goal } from './types';
import { CATEGORY_OF } from './options';
import { addDays, diffDays, fromISO, nextBirthday, startOfWeek, today } from './dates';

// Cálculos replicados de la planilla "OBJETIVOS Y TRACKEO".

/** Las actividades pendientes (agendadas) no cuentan para ratios ni facturación. */
export const isDone = (a: Activity) => a.done !== false;

export interface GoalPlan {
  dealsNeeded: number;          // Trans Nec = objetivo / comisión por transacción
  salesNeeded: number;          // Ventas necesarias = transacciones / puntas promedio
  listingsNeeded: number;       // Captaciones nec. = (ventas / rotación) / 12
  weeklyPrelistings: number;    // Prelistings semanales = captaciones × prelistings por captación / semanas
  weeklyContacts: number;       // Contactos necesarios por semana
  netAnnual: number;
  netMonthly: number;
  monthlyTargets: number[];     // Estimado mensual = objetivo × ponderación
}

const safe = (n: number) => (Number.isFinite(n) ? n : 0);

export function planFor(goal: Goal): GoalPlan {
  const dealsNeeded = safe(goal.annual_target / goal.commission_per_deal);
  const salesNeeded = safe(dealsNeeded / goal.sides_per_deal);
  const listingsNeeded = safe(salesNeeded / goal.monthly_rotation / 12);
  const weeklyPrelistings = safe((listingsNeeded * goal.prelistings_per_listing) / goal.working_weeks);
  const weeklyContacts = safe((dealsNeeded * goal.contacts_per_deal) / goal.working_weeks);
  const netAnnual = goal.annual_target * goal.agent_split;
  return {
    dealsNeeded,
    salesNeeded,
    listingsNeeded,
    weeklyPrelistings,
    weeklyContacts,
    netAnnual,
    netMonthly: netAnnual / 12,
    monthlyTargets: goal.monthly_weights.map((w) => goal.annual_target * (w || 0)),
  };
}

export function countByType(list: Activity[]): Record<ActivityType, number> {
  const out: Record<ActivityType, number> = {
    contacto: 0, reunion_cliente: 0, prelisting: 0, acm: 0, captacion: 0, visita: 0, cierre: 0, farming: 0,
    reunion: 0, admin: 0, otra: 0, personal: 0,
  };
  for (const a of list) out[a.type]++;
  return out;
}

export function inRange(list: Activity[], from: string, to: string): Activity[] {
  return list.filter((a) => a.date >= from && a.date <= to);
}

export function weekActivities(list: Activity[], ref = today()): Activity[] {
  const mon = startOfWeek(ref);
  return inRange(list, mon, addDays(mon, 6)).filter(isDone);
}

export function monthlyRevenue(list: Activity[], year: number): number[] {
  const out = Array(12).fill(0) as number[];
  for (const a of list) {
    if (a.type !== 'cierre' || !a.amount || !isDone(a)) continue;
    const d = fromISO(a.date);
    if (d.getFullYear() === year) out[d.getMonth()] += Number(a.amount);
  }
  return out;
}

/** Ratio de conversión "a por cada b" (p. ej. contactos por prelisting). */
export function ratio(a: number, b: number): string {
  if (!b) return '—';
  return (a / b).toLocaleString('es-AR', { maximumFractionDigits: 1 });
}

export function lastContactDate(contactId: string, activities: Activity[]): string | null {
  let last: string | null = null;
  for (const a of activities) {
    if (a.contact_id === contactId && isDone(a) && a.date <= today() && (!last || a.date > last)) last = a.date;
  }
  return last;
}

const FREQ_DAYS: Record<string, number> = { Semanal: 7, Quincenal: 15, Mensual: 30, Trimestral: 90, Semestral: 180 };

/** Contactos cuyo último contacto supera la frecuencia sugerida. */
export function overdueByFrequency(contacts: Contact[], activities: Activity[], ref = today()) {
  return contacts
    .filter((c) => !c.do_not_contact && c.contact_frequency && FREQ_DAYS[c.contact_frequency])
    .map((c) => {
      const last = lastContactDate(c.id, activities);
      const days = last ? diffDays(ref, last) : Infinity;
      return { contact: c, last, days, limit: FREQ_DAYS[c.contact_frequency as string] };
    })
    .filter((x) => x.days > x.limit)
    .sort((a, b) => (a.contact.level ?? 'Z').localeCompare(b.contact.level ?? 'Z'));
}

export function upcomingBirthdays(contacts: Contact[], days = 14, ref = today()) {
  return contacts
    .filter((c) => c.birthday)
    .map((c) => ({ contact: c, date: nextBirthday(c.birthday as string, ref) }))
    .filter((x) => diffDays(x.date, ref) <= days)
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function formatMoney(n: number): string {
  return n.toLocaleString('es-AR', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

export function formatNumber(n: number, digits = 1): string {
  return n.toLocaleString('es-AR', { maximumFractionDigits: digits });
}

export function countByCategory(list: Activity[]): Record<Category, number> {
  const out: Record<Category, number> = { negocio: 0, administrativa: 0, personal: 0 };
  for (const a of list) out[CATEGORY_OF[a.type]]++;
  return out;
}

// ───────────────────────── Agenda del día ─────────────────────────

const byTime = (a: Activity, b: Activity) => (a.time ?? '99').localeCompare(b.time ?? '99');

export interface Agenda {
  overdueActivities: Activity[];   // pendientes de días anteriores
  overdueContacts: Contact[];      // próximas acciones vencidas
  todayActivities: Activity[];     // agendadas para hoy (por hora)
  todayContacts: Contact[];        // recontactos programados para hoy
  recontacts: ReturnType<typeof overdueByFrequency>; // sugeridos por frecuencia
  birthdays: Contact[];
  doneToday: Activity[];
}

export function buildAgenda(contacts: Contact[], activities: Activity[], t: string, maxSuggestions = 5): Agenda {
  const pending = activities.filter((a) => !isDone(a));
  const active = contacts.filter((c) => !c.do_not_contact);
  const scheduled = new Set(pending.filter((a) => a.date >= t && a.contact_id).map((a) => a.contact_id));
  const withAction = new Set(active.filter((c) => c.next_action_date).map((c) => c.id));

  return {
    overdueActivities: pending.filter((a) => a.date < t).sort((a, b) => a.date.localeCompare(b.date) || byTime(a, b)),
    overdueContacts: active.filter((c) => c.next_action_date && c.next_action_date < t).sort((a, b) => (a.next_action_date as string).localeCompare(b.next_action_date as string)),
    todayActivities: pending.filter((a) => a.date === t).sort(byTime),
    todayContacts: active.filter((c) => c.next_action_date === t),
    // Sugeridos: los que pasaron su frecuencia y no tienen nada agendado ni próxima acción cargada.
    recontacts: overdueByFrequency(contacts, activities, t)
      .filter((x) => !scheduled.has(x.contact.id) && !withAction.has(x.contact.id))
      .slice(0, maxSuggestions),
    birthdays: upcomingBirthdays(contacts, 0, t).map((x) => x.contact),
    doneToday: activities.filter((a) => isDone(a) && a.date === t).sort(byTime),
  };
}
