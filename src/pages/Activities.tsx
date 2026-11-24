import { useSearchParams } from 'react-router-dom';
import { useStore } from '../lib/store';
import { addDays, addMonths, endOfMonth, formatShort, formatWeekday, fromISO, isoWeek, startOfMonth, startOfWeek, today } from '../lib/dates';
import { countByCategory, countByType, inRange, isDone } from '../lib/metrics';
import { ACTIVITY_LABEL, ACTIVITY_TYPES, CATEGORIES, CATEGORY_LABEL, CATEGORY_OF, MONTHS } from '../lib/options';
import type { Activity, ActivityType } from '../lib/types';
import { PageHeader } from '../components/Layout';
import { Icon } from '../components/Icon';
import { useActivityEditor } from '../components/ActivityEditor';
import { activityKind, formatTime } from '../components/Bits';

const SUMMARY: ActivityType[] = ['contacto', 'reunion_cliente', 'prelisting', 'acm', 'captacion', 'visita', 'cierre', 'farming'];

type View = 'semana' | 'mes' | '3m' | '6m';

const VIEWS: { value: View; label: string }[] = [
  { value: 'semana', label: 'Semana' },
  { value: 'mes', label: 'Mes' },
  { value: '3m', label: '3 meses' },
  { value: '6m', label: '6 meses' },
];

/** Rango que muestra cada vista, anclado en una fecha de referencia. */
function rangeFor(view: View, ref: string) {
  if (view === 'semana') {
    const from = startOfWeek(ref);
    return { from, to: addDays(from, 6), title: `Semana ${isoWeek(from)} · ${formatShort(from)} al ${formatShort(addDays(from, 6))}` };
  }
  if (view === 'mes') {
    const d = fromISO(ref);
    return { from: startOfMonth(ref), to: endOfMonth(ref), title: `${MONTHS[d.getMonth()]} ${d.getFullYear()}` };
  }
  const n = view === '3m' ? 3 : 6;
  const from = addDays(addMonths(ref, -n), 1);
  return { from, to: ref, title: `Últimos ${n} meses · ${formatShort(from)} al ${formatShort(ref)}` };
}

function shift(view: View, ref: string, dir: number): string {
  if (view === 'semana') return addDays(ref, 7 * dir);
  if (view === 'mes') return addMonths(ref, dir);
  return addMonths(ref, (view === '3m' ? 3 : 6) * dir);
}

export function Activities() {
  const { activities, contacts } = useStore();
  const openEditor = useActivityEditor();
  const [params, setParams] = useSearchParams();
  const t = today();
  const view = (VIEWS.some((v) => v.value === params.get('vista')) ? params.get('vista') : 'semana') as View;
  const ref = params.get('desde') ?? t;
  const filter = params.get('tipo') ?? ''; // tipo de actividad o 'cat:<categoría>'
  const { from, to, title } = rangeFor(view, ref);
  const isCurrent = from <= t && t <= to;

  const update = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(changes)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    setParams(next, { replace: true });
  };
  const go = (date: string | null) => update({ desde: date && date !== t ? date : null });

  const list = inRange(activities, from, to);
  const doneList = list.filter(isDone);
  const counts = countByType(doneList);
  const byCategory = countByCategory(doneList);
  const pendingCount = list.length - doneList.length;
  const shown = !filter
    ? list
    : filter.startsWith('cat:')
      ? list.filter((a) => CATEGORY_OF[a.type] === filter.slice(4))
      : list.filter((a) => a.type === filter);
  const byId = new Map(contacts.map((c) => [c.id, c.full_name]));

  const chip = (a: Activity, showDate = false) => (
    <button type="button" className={`activity-chip cat-${CATEGORY_OF[a.type]} ${isDone(a) ? '' : 'is-pending'}`} onClick={() => openEditor(a)}>
      <span className={`cat-dot cat-${CATEGORY_OF[a.type]}`} aria-hidden="true" />
      <span>
        <span className="kind">
          {showDate && <span className="time">{formatShort(a.date)} · </span>}
          {a.time && <span className="time">{formatTime(a.time)} · </span>}
          {/* El color ya indica la categoría; queda en texto para lectores de pantalla */}
          <span className="visually-hidden">{CATEGORY_LABEL[CATEGORY_OF[a.type]]}: </span>
          {activityKind(a, { withCategory: false })}
          {!isDone(a) && ' · pendiente'}
        </span>
        <span className="what">
          {a.title}
          {a.contact_id && byId.get(a.contact_id) ? ` — ${byId.get(a.contact_id)}` : ''}
        </span>
      </span>
    </button>
  );

  return (
    <>
      <PageHeader
        title="Actividades"
        subtitle={title}
        actions={
          <div className="week-nav">
            <button type="button" className="btn btn-icon" onClick={() => go(shift(view, ref, -1))} aria-label="Período anterior">
              <Icon name="left" />
            </button>
            <button type="button" className="btn" onClick={() => go(null)} disabled={isCurrent && ref === t}>
              Hoy
            </button>
            <button type="button" className="btn btn-icon" onClick={() => go(shift(view, ref, 1))} aria-label="Período siguiente">
              <Icon name="right" />
            </button>
          </div>
        }
      />

      <div className="toolbar" style={{ alignItems: 'center' }}>
        <div className="segmented" role="group" aria-label="Período a mostrar">
          {VIEWS.map((v) => (
            <button key={v.value} type="button" aria-pressed={view === v.value} onClick={() => update({ vista: v.value === 'semana' ? null : v.value, desde: null })}>
              {v.label}
            </button>
          ))}
        </div>
        <div className="field" style={{ minWidth: 220 }}>
          <label htmlFor="filter-type" className="visually-hidden">
            Filtrar por tipo
          </label>
          <select id="filter-type" value={filter} onChange={(e) => update({ tipo: e.target.value || null })}>
            <option value="">Todas las actividades</option>
            {CATEGORIES.map((c) => (
              <optgroup key={c.value} label={c.label}>
                <option value={`cat:${c.value}`}>Todas: {c.label.toLowerCase()}</option>
                {ACTIVITY_TYPES.filter((o) => o.category === c.value).map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
      </div>

      <section aria-label="Resumen del período" className="stack-sm" style={{ marginBottom: 16 }}>
        <ul className="cat-summary">
          {CATEGORIES.map((c) => (
            <li key={c.value} className={`cat-tile cat-${c.value}`}>
              <span className="stat-label">{c.label}</span>
              <span className="stat-value">{byCategory[c.value]}</span>
            </li>
          ))}
        </ul>
        {pendingCount > 0 && (
          <p className="muted small">
            Los totales cuentan solo lo hecho. Hay {pendingCount} {pendingCount === 1 ? 'actividad agendada' : 'actividades agendadas'} (borde punteado).
          </p>
        )}
        <ul className="row muted" style={{ listStyle: 'none', margin: 0, padding: 0, columnGap: 16 }}>
          {SUMMARY.map((type) => (
            <li key={type} className="small">
              {ACTIVITY_LABEL[type]}: <strong>{counts[type]}</strong>
            </li>
          ))}
        </ul>
      </section>

      {view === 'semana' ? (
        <WeekGrid
          from={from}
          today={t}
          items={shown}
          renderChip={(a) => chip(a)}
          onAdd={(d) => openEditor({ date: d })}
        />
      ) : (
        <DayList items={shown} today={t} renderChip={(a) => chip(a)} />
      )}
    </>
  );
}

const byTime = (x: Activity, y: Activity) => (x.time ?? '99').localeCompare(y.time ?? '99');

function WeekGrid({
  from,
  today: t,
  items,
  renderChip,
  onAdd,
}: {
  from: string;
  today: string;
  items: Activity[];
  renderChip: (a: Activity) => JSX.Element;
  onAdd: (date: string) => void;
}) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(from, i));
  return (
    <div className="week">
      {days.map((d) => {
        const dayItems = items.filter((a) => a.date === d).sort(byTime);
        const label = `${formatWeekday(d)} ${formatShort(d)}`;
        return (
          <section key={d} className={`day ${d === t ? 'is-today' : ''}`} aria-label={d === t ? `${label} (hoy)` : label}>
            <div className="day-header">
              <h2>{formatWeekday(d)}</h2>
              <span className="muted small">
                {formatShort(d)}
                {d === t && ' · hoy'}
              </span>
            </div>
            {dayItems.length > 0 && (
              <ul>
                {dayItems.map((a) => (
                  <li key={a.id}>{renderChip(a)}</li>
                ))}
              </ul>
            )}
            <button type="button" className="btn add-day" onClick={() => onAdd(d)} aria-label={`Agregar actividad el ${label}`}>
              <Icon name="plus" />
              Agregar
            </button>
          </section>
        );
      })}
    </div>
  );
}

/** Lista por día (más reciente primero), agrupada por mes, para períodos largos. */
function DayList({ items, today: t, renderChip }: { items: Activity[]; today: string; renderChip: (a: Activity) => JSX.Element }) {
  if (items.length === 0) return <p className="empty card">No hay actividades en este período.</p>;
  const days = [...new Set(items.map((a) => a.date))].sort((a, b) => b.localeCompare(a));
  let lastMonth = '';
  return (
    <div className="day-list">
      {days.map((d) => {
        const dt = fromISO(d);
        const month = `${MONTHS[dt.getMonth()]} ${dt.getFullYear()}`;
        const header = month !== lastMonth ? month : null;
        lastMonth = month;
        const dayItems = items.filter((a) => a.date === d).sort(byTime);
        return (
          <div key={d}>
            {header && <h2 className="overline day-list-month">{header}</h2>}
            <section className={`day-row ${d === t ? 'is-today' : ''}`} aria-label={`${formatWeekday(d)} ${formatShort(d)}`}>
              <div className="day-row-date">
                <span className="day-row-wd">{formatWeekday(d)}</span>
                <span className="day-row-num">{dt.getDate()}</span>
              </div>
              <ul>
                {dayItems.map((a) => (
                  <li key={a.id}>{renderChip(a)}</li>
                ))}
              </ul>
            </section>
          </div>
        );
      })}
    </div>
  );
}
