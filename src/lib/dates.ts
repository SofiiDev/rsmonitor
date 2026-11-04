// Fechas como strings 'YYYY-MM-DD' en hora local, para evitar corrimientos por zona horaria.

export function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function fromISO(s: string): Date {
  const [y, m, d] = s.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function today(): string {
  return toISO(new Date());
}

export function addDays(s: string, n: number): string {
  const d = fromISO(s);
  d.setDate(d.getDate() + n);
  return toISO(d);
}

/** Lunes de la semana que contiene la fecha. */
export function startOfWeek(s: string): string {
  const d = fromISO(s);
  const dow = (d.getDay() + 6) % 7; // 0 = lunes
  d.setDate(d.getDate() - dow);
  return toISO(d);
}

/** Número de semana ISO 8601. */
export function isoWeek(s: string): number {
  const d = fromISO(s);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const firstThursday = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d.getTime() - firstThursday.getTime()) / 86400000 - 3 + ((firstThursday.getDay() + 6) % 7)) / 7);
}

export function diffDays(a: string, b: string): number {
  return Math.round((fromISO(a).getTime() - fromISO(b).getTime()) / 86400000);
}

const dayFmt = new Intl.DateTimeFormat('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
const shortFmt = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short' });
const weekdayFmt = new Intl.DateTimeFormat('es-AR', { weekday: 'short' });

export function formatLong(s: string): string {
  const out = dayFmt.format(fromISO(s));
  return out.charAt(0).toUpperCase() + out.slice(1);
}

export function formatShort(s: string): string {
  return shortFmt.format(fromISO(s)).replace('.', '');
}

export function formatWeekday(s: string): string {
  return weekdayFmt.format(fromISO(s)).replace('.', '');
}

/** "Hoy", "Mañana", "Ayer", "En 3 días", "Hace 2 días". */
export function relativeDay(s: string, ref = today()): string {
  const n = diffDays(s, ref);
  if (n === 0) return 'Hoy';
  if (n === 1) return 'Mañana';
  if (n === -1) return 'Ayer';
  return n > 0 ? `En ${n} días` : `Hace ${-n} días`;
}

/** Próxima ocurrencia (este año o el siguiente) de un cumpleaños, como ISO. */
export function nextBirthday(birthday: string, ref = today()): string {
  const b = fromISO(birthday);
  const r = fromISO(ref);
  let next = new Date(r.getFullYear(), b.getMonth(), b.getDate());
  if (toISO(next) < ref) next = new Date(r.getFullYear() + 1, b.getMonth(), b.getDate());
  return toISO(next);
}
