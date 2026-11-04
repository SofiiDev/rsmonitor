import { useMemo, useState } from 'react';
import type { Activity, Contact, ContactEvent } from '../lib/types';
import { CATEGORY_OF } from '../lib/options';
import { EVENT_LABEL, RECONTACT_KINDS } from '../lib/history';
import { formatShort, fromISO, relativeDay, today } from '../lib/dates';
import { isDone } from '../lib/metrics';
import { activityKind, formatTime } from './Bits';

type Filter = 'todo' | 'interacciones' | 'recontactos' | 'cambios';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'todo', label: 'Todo' },
  { id: 'interacciones', label: 'Interacciones' },
  { id: 'recontactos', label: 'Recontactos' },
  { id: 'cambios', label: 'Cambios en la ficha' },
];

type Item =
  | { kind: 'activity'; key: string; when: string; activity: Activity }
  | { kind: 'event'; key: string; when: string; event: ContactEvent };

const monthFmt = new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric' });
const timeFmt = new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit' });

function monthLabel(iso: string) {
  const s = monthFmt.format(fromISO(iso.slice(0, 10)));
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Todo lo que pasó con un contacto, del más reciente al más antiguo. */
export function ContactTimeline({
  contact,
  activities,
  events,
  onOpen,
}: {
  contact: Contact;
  activities: Activity[];
  events: ContactEvent[];
  onOpen: (a: Activity) => void;
}) {
  const [filter, setFilter] = useState<Filter>('todo');
  const t = today();

  const scheduled = activities.filter((a) => !isDone(a) && a.date >= t).sort((a, b) => a.date.localeCompare(b.date));

  const items = useMemo(() => {
    const list: Item[] = [];
    for (const a of activities) {
      if (!isDone(a) && a.date >= t) continue; // va en "Agendado"
      list.push({ kind: 'activity', key: `a-${a.id}`, when: `${a.date}T${formatTime(a.time) ?? '12:00'}`, activity: a });
    }
    for (const e of events) list.push({ kind: 'event', key: `e-${e.id}`, when: e.created_at ?? '', event: e });
    return list
      .filter((it) => {
        if (filter === 'todo') return true;
        if (filter === 'interacciones') return it.kind === 'activity';
        if (filter === 'recontactos')
          return it.kind === 'event' ? RECONTACT_KINDS.includes(it.event.kind) : it.activity.type === 'contacto';
        return it.kind === 'event' && !RECONTACT_KINDS.includes(it.event.kind);
      })
      .sort((a, b) => b.when.localeCompare(a.when));
  }, [activities, events, filter, t]);

  const done = activities.filter(isDone);
  const summary = {
    interacciones: done.length,
    reuniones: done.filter((a) => a.type === 'reunion_cliente' || a.type === 'visita' || a.type === 'prelisting').length,
    recontactos: events.filter((e) => e.kind === 'recontacto_completado').length,
  };

  let lastMonth = '';

  return (
    <div className="stack">
      <p className="muted small">
        {summary.interacciones} interacciones registradas · {summary.reuniones} reuniones, visitas o prelistings · {summary.recontactos} recontactos completados
      </p>

      {(scheduled.length > 0 || contact.next_action || contact.next_action_date) && (
        <section aria-labelledby="tl-scheduled" className="stack-sm">
          <h3 id="tl-scheduled" className="task-group-title">
            Agendado
          </h3>
          <ul className="timeline">
            {(contact.next_action || contact.next_action_date) && (
              <li className="tl-item tl-upcoming">
                <span className="tl-dot cat-negocio" aria-hidden="true" />
                <div className="grow">
                  <span className="tl-title">Próximo recontacto: {contact.next_action || 'Recontactar'}</span>
                  <span className="meta">
                    {contact.next_action_date ? `${formatShort(contact.next_action_date)} · ${relativeDay(contact.next_action_date, t)}` : 'Sin fecha'}
                  </span>
                </div>
              </li>
            )}
            {scheduled.map((a) => (
              <li key={a.id} className={`tl-item tl-upcoming cat-${CATEGORY_OF[a.type]}`}>
                <span className="tl-dot" aria-hidden="true" />
                <button type="button" className="tl-body" onClick={() => onOpen(a)}>
                  <span className="tl-title">{a.title}</span>
                  <span className="meta">
                    {formatShort(a.date)}
                    {a.time && ` · ${formatTime(a.time)}`} · {relativeDay(a.date, t)} · {activityKind(a)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="chips" role="group" aria-label="Filtrar historial">
        {FILTERS.map((f) => (
          <label key={f.id} className="chip">
            <input type="radio" name="tl-filter" checked={filter === f.id} onChange={() => setFilter(f.id)} />
            <span>{f.label}</span>
          </label>
        ))}
      </div>

      {items.length === 0 ? (
        <p className="empty">Todavía no hay nada registrado {filter === 'todo' ? '' : 'en este filtro'}.</p>
      ) : (
        <ol className="timeline" aria-label="Historial del contacto">
          {items.map((it) => {
            const month = monthLabel(it.when);
            const header = month !== lastMonth ? month : null;
            lastMonth = month;
            return [
              header && (
                <li key={`m-${month}`} className="tl-month" aria-hidden="true">
                  {header}
                </li>
              ),
              it.kind === 'activity' ? (
                <li key={it.key} className={`tl-item cat-${CATEGORY_OF[it.activity.type]}`}>
                  <span className="tl-dot" aria-hidden="true" />
                  <button type="button" className="tl-body" onClick={() => onOpen(it.activity)}>
                    <span className="tl-title">{it.activity.title}</span>
                    <span className="meta">
                      {[
                        formatShort(it.activity.date),
                        formatTime(it.activity.time),
                        activityKind(it.activity),
                        it.activity.channel,
                        it.activity.conversation_status,
                        isDone(it.activity) ? null : 'pendiente (atrasada)',
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                    {it.activity.result && <span className="tl-note">{it.activity.result}</span>}
                    {it.activity.next_action && (
                      <span className="meta">
                        Próxima acción: {it.activity.next_action}
                        {it.activity.next_action_date && ` (${formatShort(it.activity.next_action_date)})`}
                      </span>
                    )}
                  </button>
                </li>
              ) : (
                <li key={it.key} className={`tl-item tl-event ${it.event.kind === 'recontacto_completado' ? 'cat-negocio' : ''}`}>
                  <span className="tl-dot" aria-hidden="true" />
                  <div className="tl-body">
                    <span className="tl-title">{EVENT_LABEL[it.event.kind] ?? it.event.kind}</span>
                    <span className="meta">
                      {[
                        it.event.created_at && formatShort(it.event.created_at.slice(0, 10)),
                        it.event.created_at && timeFmt.format(new Date(it.event.created_at)),
                        it.event.detail,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </div>
                </li>
              ),
            ];
          })}
        </ol>
      )}
    </div>
  );
}
