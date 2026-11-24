// Importa la planilla "BASE DE RELACIONES" (hojas "Base de relaciones" e
// "Historial de contactos") a contactos y actividades de la app.
// La librería de Excel se carga solo al importar, para no agrandar la app.
import type { Activity, Contact, Level } from './types';
import { emptyActivity, emptyContact } from './empty';

export interface ImportedContact {
  key: string;            // ID de la planilla (o número de fila)
  data: Omit<Contact, 'id'>;
  looksLikeExample: boolean;
}

export interface ImportedActivity {
  personKey: string;
  data: Omit<Activity, 'id'>;
}

export interface ImportResult {
  contacts: ImportedContact[];
  activities: ImportedActivity[];
  warnings: string[];
}

const norm = (s: unknown) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[¿¡]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

// Encabezado de la planilla (inicio del texto, sin tildes) → campo de la ficha.
const CONTACT_COLUMNS: [string, keyof Omit<Contact, 'id'> | null][] = [
  ['nombre y apellido', 'full_name'],
  ['telefono', 'phone'],
  ['email', 'email'],
  ['fecha de nacimiento', 'birthday'],
  ['barrio', 'neighborhood'],
  ['instagram', 'social'],
  ['canal de contacto preferido', 'preferred_channel'],
  ['agente responsable', 'agent'],
  ['como llego', 'source'],
  ['quien lo recomendo', 'referred_by'],
  ['fecha de ingreso', 'joined_on'],
  ['nivel de relacion', 'level'],
  ['tipo de vinculo', 'bond_type'],
  ['frecuencia de contacto', 'contact_frequency'],
  ['estado de la relacion', 'relationship_status'],
  ['calidad del vinculo', 'bond_quality'],
  ['proxima accion', 'next_action'],
  ['fecha de proxima accion', 'next_action_date'],
  ['motivo', 'next_action_reason'],
  ['personas relacionadas', 'related_people'],
  ['no contactar', 'do_not_contact'],
  ['profesion', 'occupation'],
  ['empresa', 'company'],
  ['estado familiar', 'family_status'],
  ['es padre', 'is_parent'],
  ['hijos', 'children'],
  ['tiene mascotas', 'has_pets'],
  ['mascota', 'pets'],
  ['equipo de futbol', 'football_team'],
  ['intereses y hobbies', 'hobbies'],
  ['lugares que frecuenta', 'places'],
  ['fechas o acontecimientos', 'important_dates'],
  ['intereses, valores', 'values_notes'],
  ['situacion actual', 'opportunity_status'],
  ['tipo de operacion', 'operation_type'],
  ['rol', 'role'],
  ['tipo de propiedad', 'property_type'],
  ['zona de interes', 'area_of_interest'],
  ['presupuesto', 'budget'],
  ['plazo estimado', 'timeframe'],
  ['motivacion', 'motivation'],
  ['deseo', 'desire'],
  ['necesidad', 'need'],
  ['posibilidad', 'possibility'],
  ['urgencia', 'urgency'],
  ['probabilidad', 'probability'],
  ['obstaculos', 'obstacles'],
  ['tiene propiedad para vender', 'has_property_to_sell'],
  ['necesita financiacion', 'needs_financing'],
  ['otros decisores', 'other_deciders'],
  ['competencia', 'competition'],
  ['observaciones', 'notes'],
  // Se calculan solos en la app: no se importan.
  ['ultimo contacto', null],
  ['cantidad de contactos', null],
];

const DATE_FIELDS = new Set(['birthday', 'joined_on', 'next_action_date']);
const BOOL_FIELDS = new Set(['do_not_contact', 'is_parent', 'has_pets', 'has_property_to_sell', 'needs_financing']);
const EMPTY_VALUES = new Set(['', 'na', 'n/a', '-', '--', '0', 'ninguno', 'ninguna']);

/** Fecha de Excel (número de serie o texto dd/mm/aaaa) → 'YYYY-MM-DD' sin corrimientos de zona horaria. */
function toDate(v: unknown): string | null {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') {
    if (v < 1) return null; // celdas con hora vacía (00:00:00)
    const d = new Date(Math.round((v - 25569) * 86400000));
    return d.toISOString().slice(0, 10);
  }
  const s = String(v).trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/);
  if (m) {
    const y = m[3].length === 2 ? `20${m[3]}` : m[3];
    return `${y}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  }
  return null;
}

function toText(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return EMPTY_VALUES.has(norm(s)) ? null : s;
}

function toBool(v: unknown): boolean | null {
  const s = norm(v);
  if (!s) return null;
  if (s.startsWith('si') || s === 'true' || s === 'x') return true;
  if (s.startsWith('no') || s === 'false') return false;
  return null;
}

function headerIndex(headers: unknown[], prefix: string, used: Set<number>): number {
  return headers.findIndex((h, i) => !used.has(i) && norm(h).startsWith(prefix));
}

export async function parseRelationsWorkbook(file: File): Promise<ImportResult> {
  const XLSX = await import('xlsx');
  const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
  const warnings: string[] = [];

  const baseName = wb.SheetNames.find((n) => norm(n).includes('base de relaciones')) ?? wb.SheetNames[0];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[baseName], { header: 1, defval: null, raw: true });
  const hi = rows.findIndex((r) => r.some((c) => norm(c).startsWith('nombre y apellido')));
  if (hi < 0) throw new Error('No encontré la columna "Nombre y apellido". ¿Es la planilla Base de relaciones?');
  const headers = rows[hi];

  // Columnas por encabezado (las más específicas primero para no confundir "Próxima acción" con su fecha).
  const used = new Set<number>();
  const cols = new Map<string, number>();
  const ordered = [...CONTACT_COLUMNS].sort((a, b) => b[0].length - a[0].length);
  for (const [prefix, field] of ordered) {
    const i = headerIndex(headers, prefix, used);
    if (i >= 0) {
      used.add(i);
      if (field) cols.set(field, i);
    }
  }
  const idCol = headers.findIndex((h) => norm(h) === 'id');

  const contacts: ImportedContact[] = [];
  rows.slice(hi + 1).forEach((r, n) => {
    const name = toText(r[cols.get('full_name') ?? -1]);
    if (!name) return;
    const data = emptyContact() as Record<string, unknown>;
    for (const [field, i] of cols) {
      const v = r[i];
      if (DATE_FIELDS.has(field)) data[field] = toDate(v);
      else if (BOOL_FIELDS.has(field)) data[field] = field === 'do_not_contact' ? toBool(v) === true : toBool(v);
      else data[field] = toText(v);
    }
    const lvl = String(data.level ?? '').trim().toUpperCase().charAt(0);
    data.level = (['A', 'B', 'C', 'D'].includes(lvl) ? lvl : null) as Level | null;
    data.joined_on = data.joined_on ?? null;
    const email = String(data.email ?? '');
    contacts.push({
      key: String(r[idCol] ?? `fila-${hi + 2 + n}`),
      data: data as Omit<Contact, 'id'>,
      // La plantilla trae una fila de ejemplo con datos ficticios (@email.com).
      looksLikeExample: /@(email|example)\.com$/i.test(email),
    });
  });

  // Historial de contactos → actividades
  const activities: ImportedActivity[] = [];
  const histName = wb.SheetNames.find((n) => norm(n).includes('historial'));
  if (histName) {
    const h = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[histName], { header: 1, defval: null, raw: true });
    const hh = h.findIndex((r) => r.some((c) => norm(c).startsWith('id persona')));
    if (hh >= 0) {
      const head = h[hh];
      const c = (prefix: string) => head.findIndex((x) => norm(x).startsWith(prefix));
      const ix = {
        person: c('id persona'),
        date: c('fecha de contacto'),
        channel: c('canal'),
        topic: c('tema'),
        info: c('informacion nueva'),
        result: c('resultado'),
        status: c('estado de la conversacion'),
        next: c('proxima accion'),
        nextDate: c('fecha de proxima accion'),
        reminder: c('recordatorio'),
        notes: c('observaciones'),
      };
      for (const r of h.slice(hh + 1)) {
        const person = r[ix.person];
        const date = toDate(r[ix.date]);
        if (person === null || person === undefined || person === '' || !date) continue;
        const channel = toText(r[ix.channel]);
        const type: Activity['type'] = norm(channel) === 'reunion' ? 'reunion_cliente' : norm(channel) === 'visita' ? 'visita' : 'contacto';
        const join = (...xs: (string | null)[]) => xs.filter(Boolean).join('\n') || null;
        activities.push({
          personKey: String(person),
          data: emptyActivity({
            date,
            done: true,
            type,
            channel,
            title: toText(r[ix.topic]) ?? 'Contacto',
            result: join(toText(r[ix.info]), toText(r[ix.result])),
            conversation_status: toText(r[ix.status]),
            next_action: toText(r[ix.next]),
            next_action_date: toDate(r[ix.nextDate]),
            notes: join(toText(r[ix.notes]), toText(r[ix.reminder]) && `Recordatorio: ${toText(r[ix.reminder])}`),
          }),
        });
      }
    } else {
      warnings.push('No encontré la columna "ID persona" en el historial: se importan solo los contactos.');
    }
  }

  return { contacts, activities, warnings };
}
