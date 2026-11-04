import { useSearchParams } from 'react-router-dom';
import { useStore } from '../lib/store';
import { addDays, formatShort, formatWeekday, isoWeek, startOfWeek, today } from '../lib/dates';
import { countByCategory, countByType, inRange } from '../lib/metrics';
import { ACTIVITY_LABEL, ACTIVITY_TYPES, CATEGORIES, CATEGORY_OF } from '../lib/options';
import type { ActivityType } from '../lib/types';
import { PageHeader } from '../components/Layout';
import { Icon } from '../components/Icon';
import { useActivityEditor } from '../components/ActivityEditor';
import { activityKind } from '../components/Bits';

const SUMMARY: ActivityType[] = ['contacto', 'reunion_cliente', 'prelisting', 'acm', 'captacion', 'visita', 'cierre', 'farming'];

export function Activities() {
  const { activities, contacts } = useStore();
  const openEditor = useActivityEditor();
  const [params, setParams] = useSearchParams();
  const t = today();
  const monday = startOfWeek(params.get('semana') ?? t);
  const filter = params.get('tipo') ?? ''; // tipo de actividad o 'cat:<categoría>'
  const sunday = addDays(monday, 6);
  const isCurrent = monday === startOfWeek(t);

  const go = (date: string) => {
    const next = new URLSearchParams(params);
    if (date === startOfWeek(t)) next.delete('semana');
    else next.set('semana', date);
    setParams(next, { replace: true });
  };
  const setFilter = (v: string) => {
    const next = new URLSearchParams(params);
    if (v) next.set('tipo', v);
    else next.delete('tipo');
    setParams(next, { replace: true });
  };

  const weekList = inRange(activities, monday, sunday);
  const counts = countByType(weekList);
  const byCategory = countByCategory(weekList);
  const shown = !filter
    ? weekList
    : filter.startsWith('cat:')
      ? weekList.filter((a) => CATEGORY_OF[a.type] === filter.slice(4))
      : weekList.filter((a) => a.type === filter);
  const byId = new Map(contacts.map((c) => [c.id, c.full_name]));
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));

  return (
    <>
      <PageHeader
        title="Actividades"
        subtitle={`Semana ${isoWeek(monday)} · ${formatShort(monday)} al ${formatShort(sunday)}`}
        actions={
          <div className="week-nav">
            <button type="button" className="btn btn-icon" onClick={() => go(addDays(monday, -7))} aria-label="Semana anterior">
              <Icon name="left" />
            </button>
            <button type="button" className="btn" onClick={() => go(startOfWeek(t))} disabled={isCurrent}>
              Esta semana
            </button>
            <button type="button" className="btn btn-icon" onClick={() => go(addDays(monday, 7))} aria-label="Semana siguiente">
              <Icon name="right" />
            </button>
          </div>
        }
      />

      <section aria-label="Resumen de la semana" className="stack-sm" style={{ marginBottom: 16 }}>
        <ul className="cat-summary">
          {CATEGORIES.map((c) => (
            <li key={c.value} className={`cat-tile cat-${c.value}`}>
              <span className="stat-label">{c.label}</span>
              <span className="stat-value">{byCategory[c.value]}</span>
            </li>
          ))}
        </ul>
        <ul className="row muted" style={{ listStyle: 'none', margin: 0, padding: 0, columnGap: 16 }}>
          {SUMMARY.map((type) => (
            <li key={type} className="small">
              {ACTIVITY_LABEL[type]}: <strong>{counts[type]}</strong>
            </li>
          ))}
        </ul>
      </section>

      <div className="toolbar">
        <div className="field" style={{ minWidth: 220 }}>
          <label htmlFor="filter-type" className="visually-hidden">
            Filtrar por tipo
          </label>
          <select id="filter-type" value={filter} onChange={(e) => setFilter(e.target.value)}>
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

      <div className="week">
        {days.map((d) => {
          const items = shown.filter((a) => a.date === d);
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
              {items.length > 0 && (
                <ul>
                  {items.map((a) => (
                    <li key={a.id}>
                      <button type="button" className={`activity-chip cat-${CATEGORY_OF[a.type]}`} onClick={() => openEditor(a)}>
                        <span className={`cat-dot cat-${CATEGORY_OF[a.type]}`} aria-hidden="true" />
                        <span>
                          <span className="kind">{activityKind(a)}</span>
                          <span className="what">
                            {a.title}
                            {a.contact_id && byId.get(a.contact_id) ? ` — ${byId.get(a.contact_id)}` : ''}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <button type="button" className="btn add-day" onClick={() => openEditor({ date: d })} aria-label={`Agregar actividad el ${label}`}>
                <Icon name="plus" />
                Agregar
              </button>
            </section>
          );
        })}
      </div>
    </>
  );
}
