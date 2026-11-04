import { CATEGORY_OF } from '../lib/options';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../lib/store';
import { addDays, formatLong, formatShort, relativeDay, today } from '../lib/dates';
import { countByType, monthlyRevenue, overdueByFrequency, planFor, upcomingBirthdays, weekActivities } from '../lib/metrics';
import { defaultGoal } from '../lib/options';
import { PageHeader } from '../components/Layout';
import { LevelBadge, Stat, activityKind } from '../components/Bits';
import { Icon } from '../components/Icon';
import { useActivityEditor } from '../components/ActivityEditor';

export function Today() {
  const { contacts, activities, goals } = useStore();
  const openEditor = useActivityEditor();
  const t = today();
  const year = Number(t.slice(0, 4));
  const month = Number(t.slice(5, 7)) - 1;

  const goal = goals.find((g) => g.year === year) ?? { id: '', ...defaultGoal(year) };
  const plan = planFor(goal);

  const week = countByType(weekActivities(activities, t));
  const revenue = monthlyRevenue(activities, year);
  const ytd = revenue.reduce((s, n) => s + n, 0);
  const monthListings = activities.filter((a) => a.type === 'captacion' && a.date.slice(0, 7) === t.slice(0, 7)).length;

  const actions = useMemo(
    () =>
      contacts
        .filter((c) => c.next_action_date && c.next_action_date <= addDays(t, 7) && !c.do_not_contact)
        .sort((a, b) => (a.next_action_date as string).localeCompare(b.next_action_date as string)),
    [contacts, t],
  );
  const overdue = useMemo(() => overdueByFrequency(contacts, activities, t).slice(0, 8), [contacts, activities, t]);
  const birthdays = useMemo(() => upcomingBirthdays(contacts, 14, t), [contacts, t]);
  const todays = activities.filter((a) => a.date === t);
  const byId = new Map(contacts.map((c) => [c.id, c]));

  return (
    <>
      <PageHeader title="Hoy" subtitle={formatLong(t)} />

      <div className="stack">
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

        <div className="grid-2">
          <section className="card" aria-labelledby="actions-title">
            <div className="card-header">
              <h2 id="actions-title">Próximas acciones</h2>
              <span className="badge">{actions.length}</span>
            </div>
            {actions.length === 0 ? (
              <p className="empty">No tenés acciones pendientes para los próximos 7 días.</p>
            ) : (
              <ul className="list">
                {actions.map((c) => {
                  const late = (c.next_action_date as string) < t;
                  return (
                    <li key={c.id} className="row" style={{ flexWrap: 'nowrap' }}>
                      <Link to={`/contactos/${c.id}`} className="list-item">
                        <LevelBadge level={c.level} />
                        <span className="grow">
                          <span className="title">{c.full_name}</span>
                          <span className="meta" style={{ display: 'block' }}>
                            {c.next_action}
                          </span>
                        </span>
                        <span className={`badge ${late ? 'badge-danger' : c.next_action_date === t ? 'badge-warning' : ''}`}>
                          {late && <span className="visually-hidden">Vencida: </span>}
                          {relativeDay(c.next_action_date as string, t)}
                        </span>
                      </Link>
                      <button
                        type="button"
                        className="btn btn-ghost btn-icon"
                        aria-label={`Registrar actividad con ${c.full_name}`}
                        onClick={() => openEditor({ contact_id: c.id, type: 'contacto', title: c.next_action ?? '' })}
                      >
                        <Icon name="plus" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="card" aria-labelledby="today-title">
            <div className="card-header">
              <h2 id="today-title">Registrado hoy</h2>
              <button type="button" className="btn" onClick={() => openEditor()}>
                <Icon name="plus" />
                Agregar
              </button>
            </div>
            {todays.length === 0 ? (
              <p className="empty">Todavía no registraste actividades hoy.</p>
            ) : (
              <ul className="list">
                {todays.map((a) => (
                  <li key={a.id}>
                    <button type="button" className="list-item" onClick={() => openEditor(a)}>
                      <span className={`cat-dot cat-${CATEGORY_OF[a.type]}`} aria-hidden="true" />
                      <span className="grow">
                        <span className="title">{a.title}</span>
                        <span className="meta" style={{ display: 'block' }}>
                          {activityKind(a)}
                          {a.contact_id && byId.get(a.contact_id) ? ` · ${byId.get(a.contact_id)?.full_name}` : ''}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card" aria-labelledby="recontact-title">
            <div className="card-header">
              <h2 id="recontact-title">Para recontactar</h2>
              <span className="badge">{overdue.length}</span>
            </div>
            <p className="muted small" style={{ marginBottom: 8 }}>
              Pasó más tiempo que la frecuencia sugerida desde el último contacto.
            </p>
            {overdue.length === 0 ? (
              <p className="empty">Tu base está al día.</p>
            ) : (
              <ul className="list">
                {overdue.map(({ contact: c, last }) => (
                  <li key={c.id}>
                    <Link to={`/contactos/${c.id}`} className="list-item">
                      <LevelBadge level={c.level} />
                      <span className="grow">
                        <span className="title">{c.full_name}</span>
                        <span className="meta" style={{ display: 'block' }}>
                          {c.contact_frequency} · {last ? `último: ${formatShort(last)}` : 'sin contactos registrados'}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card" aria-labelledby="bday-title">
            <div className="card-header">
              <h2 id="bday-title">Cumpleaños próximos</h2>
              <Icon name="cake" />
            </div>
            {birthdays.length === 0 ? (
              <p className="empty">Sin cumpleaños en las próximas dos semanas.</p>
            ) : (
              <ul className="list">
                {birthdays.map(({ contact: c, date }) => (
                  <li key={c.id}>
                    <Link to={`/contactos/${c.id}`} className="list-item">
                      <LevelBadge level={c.level} />
                      <span className="grow">
                        <span className="title">{c.full_name}</span>
                        <span className="meta" style={{ display: 'block' }}>
                          {formatShort(date)}
                        </span>
                      </span>
                      <span className={`badge ${date === t ? 'badge-success' : ''}`}>{relativeDay(date, t)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
