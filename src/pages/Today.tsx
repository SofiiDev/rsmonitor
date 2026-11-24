import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../lib/store';
import { useToday } from '../lib/useToday';
import { addDays, formatLong, formatShort, relativeDay } from '../lib/dates';
import { buildAgenda, countByType, isDone, monthlyRevenue, planFor, upcomingBirthdays, weekActivities } from '../lib/metrics';
import { ACTIVITY_TYPES, CATEGORIES, CATEGORY_OF, defaultGoal } from '../lib/options';
import type { Activity, ActivityType, Contact } from '../lib/types';
import { PageHeader } from '../components/Layout';
import { LevelBadge, Stat, activityKind, formatTime, waLink } from '../components/Bits';
import { Icon } from '../components/Icon';
import { useActivityEditor } from '../components/ActivityEditor';
import { useToast } from '../components/Toast';

export function Today() {
  const { contacts, activities, goals } = useStore();
  const openEditor = useActivityEditor();
  const t = useToday();
  const year = Number(t.slice(0, 4));
  const month = Number(t.slice(5, 7)) - 1;

  const goal = goals.find((g) => g.year === year) ?? { id: '', ...defaultGoal(year) };
  const plan = planFor(goal);
  const week = countByType(weekActivities(activities, t));
  const revenue = monthlyRevenue(activities, year);
  const ytd = revenue.reduce((s, n) => s + n, 0);
  const monthListings = activities.filter((a) => isDone(a) && a.type === 'captacion' && a.date.slice(0, 7) === t.slice(0, 7)).length;

  const agenda = useMemo(() => buildAgenda(contacts, activities, t), [contacts, activities, t]);
  const byId = useMemo(() => new Map(contacts.map((c) => [c.id, c])), [contacts]);

  const pendingCount =
    agenda.overdueActivities.length + agenda.overdueContacts.length + agenda.todayActivities.length + agenda.todayContacts.length;
  const total = pendingCount + agenda.doneToday.length;

  const upcoming = useMemo(() => {
    const end = addDays(t, 7);
    const acts = activities.filter((a) => !isDone(a) && a.date > t && a.date <= end).map((a) => ({ date: a.date, activity: a }));
    const acts2 = contacts
      .filter((c) => !c.do_not_contact && c.next_action_date && c.next_action_date > t && c.next_action_date <= end)
      .map((c) => ({ date: c.next_action_date as string, contact: c }));
    return [...acts, ...acts2].sort((a, b) => a.date.localeCompare(b.date));
  }, [activities, contacts, t]);
  const birthdays = useMemo(() => upcomingBirthdays(contacts, 14, t).filter((b) => b.date !== t), [contacts, t]);

  return (
    <>
      <PageHeader
        title="Hoy"
        subtitle={
          <>
            {formatLong(t)}
            {total > 0 && ` · ${agenda.doneToday.length} de ${total} hechas`}
          </>
        }
      />

      <div className="today-layout">
        <section className="card stack" aria-labelledby="todo-title">
          <div className="card-header" style={{ marginBottom: 0 }}>
            <h2 id="todo-title">Para hacer hoy</h2>
            <span className={`badge ${pendingCount === 0 ? 'badge-success' : ''}`}>
              {pendingCount === 0 ? 'Todo al día' : `${pendingCount} pendientes`}
            </span>
          </div>
          {total > 0 && (
            <div
              className={`meter ${pendingCount === 0 ? 'done' : ''}`}
              role="progressbar"
              aria-label="Progreso del día"
              aria-valuemin={0}
              aria-valuemax={total}
              aria-valuenow={agenda.doneToday.length}
              aria-valuetext={`${agenda.doneToday.length} de ${total} hechas`}
            >
              <span style={{ width: `${Math.round((agenda.doneToday.length / total) * 100)}%` }} />
            </div>
          )}

          <QuickAdd date={t} onMore={(title, day) => openEditor({ date: day, title })} />

          {(agenda.overdueActivities.length > 0 || agenda.overdueContacts.length > 0) && (
            <TaskGroup title="Atrasado" tone="danger" count={agenda.overdueActivities.length + agenda.overdueContacts.length}>
              {agenda.overdueActivities.map((a) => (
                <ActivityTask key={a.id} a={a} contact={a.contact_id ? byId.get(a.contact_id) : undefined} showDate today={t} />
              ))}
              {agenda.overdueContacts.map((c) => (
                <ContactTask key={c.id} c={c} today={t} />
              ))}
            </TaskGroup>
          )}

          <TaskGroup title="Agenda de hoy" count={agenda.todayActivities.length + agenda.todayContacts.length}>
            {agenda.todayActivities.length + agenda.todayContacts.length === 0 && (
              <li className="empty small">No tenés reuniones ni recontactos programados para hoy.</li>
            )}
            {agenda.todayActivities.map((a) => (
              <ActivityTask key={a.id} a={a} contact={a.contact_id ? byId.get(a.contact_id) : undefined} today={t} />
            ))}
            {agenda.todayContacts.map((c) => (
              <ContactTask key={c.id} c={c} today={t} />
            ))}
          </TaskGroup>

          {agenda.birthdays.length > 0 && (
            <TaskGroup title="Cumpleaños y fechas especiales de hoy" count={agenda.birthdays.length}>
              {agenda.birthdays.map(({ contact: c, label, own, profession }) => (
                <li key={`${c.id}-${label}`} className="task">
                  <Icon name="cake" />
                  <span className="grow">
                    <Link to={`/contactos/${c.id}`} className="task-title">
                      {c.full_name}
                    </Link>
                    <span className="meta">
                      {own ? 'Cumple hoy · saludalo' : profession ? `Hoy es el ${label} · saludalo por su profesión` : `${label} · buen motivo para escribirle`}
                    </span>
                  </span>
                  {c.phone && (
                    <a className="btn" href={waLink(c.phone)} target="_blank" rel="noopener noreferrer">
                      <Icon name="message" />
                      Saludar<span className="visually-hidden"> a {c.full_name} por WhatsApp (se abre en otra pestaña)</span>
                    </a>
                  )}
                </li>
              ))}
            </TaskGroup>
          )}

          {agenda.recontacts.length > 0 && (
            <TaskGroup title="Sugeridos para recontactar" count={agenda.recontacts.length} hint="Superaron la frecuencia de contacto sugerida y no tienen nada agendado.">
              {agenda.recontacts.map(({ contact: c, last }) => (
                <li key={c.id} className="task">
                  <LevelBadge level={c.level} />
                  <span className="grow">
                    <Link to={`/contactos/${c.id}`} className="task-title">
                      {c.full_name}
                    </Link>
                    <span className="meta">
                      {c.contact_frequency} · {last ? `último contacto ${formatShort(last)}` : 'sin contactos registrados'}
                    </span>
                  </span>
                  {c.phone && (
                    <a
                      className="btn btn-ghost btn-icon wa-btn"
                      href={waLink(c.phone)}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Enviar WhatsApp a ${c.full_name} (se abre en otra pestaña)`}
                      title="Enviar WhatsApp"
                    >
                      <Icon name="message" />
                    </a>
                  )}
                  <button
                    type="button"
                    className="btn"
                    onClick={() => openEditor({ contact_id: c.id, type: 'contacto', title: 'Recontacto', done: true })}
                  >
                    Registrar<span className="visually-hidden"> contacto con {c.full_name}</span>
                  </button>
                </li>
              ))}
            </TaskGroup>
          )}

          {agenda.doneToday.length > 0 && (
            <details className="task-done">
              <summary>Hecho hoy ({agenda.doneToday.length})</summary>
              <ul className="tasks">
                {agenda.doneToday.map((a) => (
                  <ActivityTask key={a.id} a={a} contact={a.contact_id ? byId.get(a.contact_id) : undefined} today={t} />
                ))}
              </ul>
            </details>
          )}
        </section>

        <div className="today-side">
        <section aria-labelledby="week-title" className="stack-sm">
          <h2 id="week-title">Esta semana</h2>
          <div className="stats">
            <Stat label="Contactos (verdes)" value={week.contacto} goal={plan.weeklyContacts} />
            <Stat label="Prelistings" value={week.prelisting} goal={plan.weeklyPrelistings} />
            <Stat label="Captaciones del mes" value={monthListings} goal={plan.listingsNeeded} />
            <Stat label={`Facturación ${year}`} value={ytd} goal={goal.annual_target} suffix="$" />
          </div>
          <p className="muted small">
            Meta del mes: {plan.monthlyTargets[month].toLocaleString('es-AR', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })} ·{' '}
            <Link to="/objetivos">Ver objetivos</Link>
          </p>
        </section>

        <div className="today-cards">
          <section className="card" aria-labelledby="upcoming-title">
            <div className="card-header">
              <h2 id="upcoming-title">Próximos 7 días</h2>
              <span className="badge">{upcoming.length}</span>
            </div>
            {upcoming.length === 0 ? (
              <p className="empty">Nada agendado para los próximos días.</p>
            ) : (
              <ul className="list">
                {upcoming.map((u) =>
                  'activity' in u && u.activity ? (
                    <li key={u.activity.id}>
                      <button type="button" className="list-item" onClick={() => openEditor(u.activity)}>
                        <span className={`cat-dot cat-${CATEGORY_OF[u.activity.type]}`} aria-hidden="true" />
                        <span className="grow">
                          <span className="title">{u.activity.title}</span>
                          <span className="meta" style={{ display: 'block' }}>
                            {activityKind(u.activity)}
                          </span>
                        </span>
                        <span className="badge">
                          {relativeDay(u.date, t)}
                          {u.activity.time && ` · ${formatTime(u.activity.time)}`}
                        </span>
                      </button>
                    </li>
                  ) : 'contact' in u && u.contact ? (
                    <li key={`c-${u.contact.id}`}>
                      <Link to={`/contactos/${u.contact.id}`} className="list-item">
                        <LevelBadge level={u.contact.level} />
                        <span className="grow">
                          <span className="title">{u.contact.full_name}</span>
                          <span className="meta" style={{ display: 'block' }}>
                            {u.contact.next_action}
                          </span>
                        </span>
                        <span className="badge">{relativeDay(u.date, t)}</span>
                      </Link>
                    </li>
                  ) : null,
                )}
              </ul>
            )}
          </section>

          <section className="card" aria-labelledby="bday-title">
            <div className="card-header">
              <h2 id="bday-title">Cumpleaños y fechas próximas</h2>
              <Icon name="cake" />
            </div>
            {birthdays.length === 0 ? (
              <p className="empty">Sin cumpleaños en las próximas dos semanas.</p>
            ) : (
              <ul className="list">
                {birthdays.map(({ contact: c, date, label }) => (
                  <li key={`${c.id}-${label}`}>
                    <Link to={`/contactos/${c.id}`} className="list-item">
                      <LevelBadge level={c.level} />
                      <span className="grow">
                        <span className="title">{c.full_name}</span>
                        <span className="meta" style={{ display: 'block' }}>
                          {label} · {formatShort(date)}
                        </span>
                      </span>
                      <span className="badge">{relativeDay(date, t)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
        </div>
      </div>
    </>
  );
}

function TaskGroup({
  title,
  count,
  tone,
  hint,
  children,
}: {
  title: string;
  count: number;
  tone?: 'danger';
  hint?: string;
  children: ReactNode;
}) {
  const id = `group-${title.replace(/\s+/g, '-').toLowerCase()}`;
  return (
    <section aria-labelledby={id} className="stack-sm">
      <h3 id={id} className="task-group-title">
        {title} <span className={`badge ${tone === 'danger' ? 'badge-danger' : ''}`}>{count}</span>
      </h3>
      {hint && <p className="muted small">{hint}</p>}
      <ul className="tasks">{children}</ul>
    </section>
  );
}

function ActivityTask({ a, contact, showDate, today }: { a: Activity; contact?: Contact; showDate?: boolean; today: string }) {
  const { save } = useStore();
  const openEditor = useActivityEditor();
  const toast = useToast();
  const id = `task-${a.id}`;
  const done = isDone(a);

  async function toggle() {
    try {
      // Si se completa algo atrasado, queda registrado con la fecha de hoy.
      await save('activities', a.id, done ? { done: false } : { done: true, date: a.date < today ? today : a.date });
      toast(done ? 'Marcada como pendiente' : 'Hecha');
    } catch (err) {
      toast(err instanceof Error ? `Error: ${err.message}` : 'No se pudo guardar');
    }
  }

  return (
    <li className={`task cat-${CATEGORY_OF[a.type]} ${done ? 'is-done' : ''}`}>
      <input id={id} type="checkbox" className="task-check" checked={done} onChange={toggle} />
      <span className="grow">
        <label htmlFor={id} className="task-title">
          {a.title}
        </label>
        <span className="meta">
          {[
            showDate ? relativeDay(a.date, today) : null,
            formatTime(a.time),
            activityKind(a),
            contact?.full_name,
          ]
            .filter(Boolean)
            .join(' · ')}
        </span>
      </span>
      {contact?.phone && !isDone(a) && (
        <a
          className="btn btn-ghost btn-icon wa-btn"
          href={waLink(contact.phone)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Enviar WhatsApp a ${contact.full_name} (se abre en otra pestaña)`}
          title="Enviar WhatsApp"
        >
          <Icon name="message" />
        </a>
      )}
      <button type="button" className="btn btn-ghost btn-icon" onClick={() => openEditor(a)} aria-label={`Editar “${a.title}”`}>
        <Icon name="edit" />
      </button>
    </li>
  );
}

function ContactTask({ c, today }: { c: Contact; today: string }) {
  const { save } = useStore();
  const openEditor = useActivityEditor();
  const toast = useToast();
  const overdue = (c.next_action_date as string) < today;

  async function postpone() {
    await save('contacts', c.id, { next_action_date: addDays(today, 1) }, { reason: 'pospuesto' });
    toast(`Pasado a mañana: ${c.full_name}`);
  }

  return (
    <li className="task cat-negocio">
      <LevelBadge level={c.level} />
      <span className="grow">
        <span className="task-title">{c.next_action || 'Recontactar'}</span>
        <span className="meta">
          <Link to={`/contactos/${c.id}`}>{c.full_name}</Link>
          {overdue && ` · vencida ${relativeDay(c.next_action_date as string, today).toLowerCase()}`}
          {c.phone && (
            <>
              {' · '}
              <a href={waLink(c.phone)} target="_blank" rel="noopener noreferrer">
                WhatsApp<span className="visually-hidden"> (se abre en otra pestaña)</span>
              </a>
            </>
          )}
        </span>
      </span>
      <div className="row" style={{ flexWrap: 'nowrap', gap: 4 }}>
        <button type="button" className="btn btn-ghost" onClick={postpone}>
          Mañana<span className="visually-hidden">: posponer {c.full_name}</span>
        </button>
        <button
          type="button"
          className="btn"
          onClick={() =>
            openEditor({ contact_id: c.id, type: 'contacto', title: c.next_action ?? 'Recontacto', done: true }, { completesContactAction: c.id })
          }
        >
          Hecho<span className="visually-hidden">: registrar contacto con {c.full_name}</span>
        </button>
      </div>
    </li>
  );
}

function QuickAdd({ date, onMore }: { date: string; onMore: (title: string, day: string) => void }) {
  const { create, contacts } = useStore();
  const toast = useToast();
  const [title, setTitle] = useState('');
  const [contactId, setContactId] = useState('');
  const [time, setTime] = useState('');
  const [day, setDay] = useState(date);
  const [type, setType] = useState<ActivityType>('contacto');

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      // Si es de un día anterior, se registra como hecha; si es de hoy o futura, queda pendiente.
      const past = day < date;
      await create('activities', { date: day, time: time || null, done: past, type, title: title.trim(), contact_id: contactId || null });
      setTitle('');
      setContactId('');
      setTime('');
      setDay(date);
      toast(past ? 'Actividad pasada registrada' : day === date ? 'Agregada a hoy' : 'Actividad agendada');
    } catch (err) {
      toast(err instanceof Error ? `Error: ${err.message}` : 'No se pudo guardar');
    }
  }

  return (
    <form className="quick-add" onSubmit={submit} aria-label="Agregar actividad">
      <div className="field grow">
        <label htmlFor="qa-title" className="visually-hidden">
          Qué tenés que hacer
        </label>
        <input id="qa-title" placeholder="Agregar una actividad (hoy, pasada o futura)…" value={title} onChange={(e) => setTitle(e.target.value)} autoComplete="off" />
      </div>
      <div className="field">
        <label htmlFor="qa-type" className="visually-hidden">
          Tipo
        </label>
        <select id="qa-type" value={type} onChange={(e) => setType(e.target.value as ActivityType)}>
          {CATEGORIES.map((c) => (
            <optgroup key={c.value} label={c.label}>
              {ACTIVITY_TYPES.filter((o) => o.category === c.value).map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="qa-contact" className="visually-hidden">
          Contacto (opcional)
        </label>
        <select id="qa-contact" value={contactId} onChange={(e) => setContactId(e.target.value)}>
          <option value="">Sin contacto</option>
          {contacts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.full_name}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="qa-day" className="visually-hidden">
          Fecha
        </label>
        <input id="qa-day" type="date" value={day} onChange={(e) => setDay(e.target.value || date)} />
      </div>
      <div className="field">
        <label htmlFor="qa-time" className="visually-hidden">
          Hora (opcional)
        </label>
        <input id="qa-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
      </div>
      <div className="row" style={{ flexWrap: 'nowrap', gap: 8 }}>
        <button type="submit" className="btn btn-primary" disabled={!title.trim()}>
          <Icon name="plus" />
          Agregar
        </button>
        <button type="button" className="btn" onClick={() => onMore(title, day)}>
          Más detalles
        </button>
      </div>
    </form>
  );
}
