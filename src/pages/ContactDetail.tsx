import { CATEGORY_OF } from '../lib/options';
import { useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useStore } from '../lib/store';
import type { Contact } from '../lib/types';
import { LEVELS } from '../lib/options';
import { formatShort, relativeDay, today } from '../lib/dates';
import { PageHeader } from '../components/Layout';
import { Icon } from '../components/Icon';
import { LevelBadge, activityKind, waLink } from '../components/Bits';
import { Sheet } from '../components/Sheet';
import { ContactForm } from '../components/ContactForm';
import { useActivityEditor } from '../components/ActivityEditor';
import { useToast } from '../components/Toast';

type Tab = 'historial' | 'relacion' | 'personal' | 'oportunidad';

const TABS: { id: Tab; label: string }[] = [
  { id: 'historial', label: 'Historial' },
  { id: 'relacion', label: 'Relación' },
  { id: 'personal', label: 'Personal' },
  { id: 'oportunidad', label: 'Oportunidad' },
];

const yesNo = (v: boolean | null) => (v === null ? null : v ? 'Sí' : 'No');

function Facts({ items }: { items: [string, ReactNode][] }) {
  const shown = items.filter(([, v]) => v !== null && v !== undefined && v !== '');
  if (shown.length === 0) return <p className="empty">Sin datos cargados. Usá “Editar” para completarlos.</p>;
  return (
    <dl className="dl">
      {shown.map(([k, v]) => (
        <div key={k}>
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function ContactDetail() {
  const { id } = useParams();
  const { contacts, activities, save, remove, loading } = useStore();
  const openEditor = useActivityEditor();
  const toast = useToast();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [tab, setTab] = useState<Tab>('historial');
  const t = today();

  const c = contacts.find((x) => x.id === id);
  if (!c) {
    return (
      <>
        <PageHeader title={loading ? 'Cargando…' : 'Contacto no encontrado'} />
        {!loading && <Link to="/contactos">Volver a contactos</Link>}
      </>
    );
  }

  const history = activities.filter((a) => a.contact_id === c.id).sort((a, b) => b.date.localeCompare(a.date));
  const lastContact = history.find((a) => a.done !== false && a.date <= t)?.date;

  async function onDelete(contact: Contact) {
    if (!window.confirm(`¿Eliminar a ${contact.full_name}? Sus actividades se conservan sin contacto asociado.`)) return;
    await remove('contacts', contact.id);
    toast('Contacto eliminado');
    navigate('/contactos');
  }

  return (
    <>
      <Link to="/contactos" className="btn btn-ghost" style={{ marginBottom: 8, paddingLeft: 4 }}>
        <Icon name="back" />
        Contactos
      </Link>

      <PageHeader
        title={c.full_name}
        subtitle={
          <span className="row" style={{ gap: 8 }}>
            <LevelBadge level={c.level} />
            <span>
              {c.level ? LEVELS.find((l) => l.value === c.level)?.label : 'Sin nivel'}
              {c.bond_type && ` · ${c.bond_type}`}
              {c.do_not_contact && ' · No contactar'}
            </span>
          </span>
        }
        actions={
          <>
            <button type="button" className="btn" onClick={() => setEditing(true)}>
              <Icon name="edit" />
              Editar
            </button>
            <button type="button" className="btn btn-primary" onClick={() => openEditor({ contact_id: c.id, type: 'contacto' })}>
              <Icon name="plus" />
              Registrar contacto
            </button>
          </>
        }
      />

      <div className="stack">
        {(c.phone || c.email) && (
          <div className="row">
            {c.phone && (
              <>
                <a className="btn" href={`tel:${c.phone.replace(/[^\d+]/g, '')}`}>
                  <Icon name="phone" />
                  Llamar
                </a>
                <a className="btn" href={waLink(c.phone)} target="_blank" rel="noopener noreferrer">
                  <Icon name="message" />
                  WhatsApp
                  <span className="visually-hidden"> (se abre en otra pestaña)</span>
                </a>
              </>
            )}
            {c.email && (
              <a className="btn" href={`mailto:${c.email}`}>
                <Icon name="mail" />
                Email
              </a>
            )}
          </div>
        )}

        <div className="stats">
          <div className="stat">
            <span className="stat-label">Próxima acción</span>
            <span>{c.next_action ?? '—'}</span>
            {c.next_action_date && (
              <span className={`badge ${c.next_action_date < t ? 'badge-danger' : ''}`} style={{ justifySelf: 'start' }}>
                {formatShort(c.next_action_date)} · {relativeDay(c.next_action_date, t)}
              </span>
            )}
          </div>
          <div className="stat">
            <span className="stat-label">Último contacto</span>
            <span className="stat-value">{lastContact ? formatShort(lastContact) : '—'}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Cantidad de contactos</span>
            <span className="stat-value">{history.length}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Oportunidad</span>
            <span>{c.opportunity_status ?? '—'}</span>
          </div>
        </div>

        <div className="card">
          <div className="tabs" role="tablist" aria-label="Información del contacto">
            {TABS.map((x) => (
              <button
                key={x.id}
                type="button"
                role="tab"
                id={`tab-${x.id}`}
                aria-selected={tab === x.id}
                aria-controls={`panel-${x.id}`}
                tabIndex={tab === x.id ? 0 : -1}
                onClick={() => setTab(x.id)}
                onKeyDown={(e) => {
                  const i = TABS.findIndex((y) => y.id === tab);
                  const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
                  if (!step) return;
                  const next = TABS[(i + step + TABS.length) % TABS.length].id;
                  setTab(next);
                  document.getElementById(`tab-${next}`)?.focus();
                }}
              >
                {x.label}
              </button>
            ))}
          </div>

          <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} tabIndex={0}>
            {tab === 'historial' &&
              (history.length === 0 ? (
                <p className="empty">Sin interacciones registradas.</p>
              ) : (
                <ul className="list">
                  {history.map((a) => (
                    <li key={a.id}>
                      <button type="button" className="list-item" onClick={() => openEditor(a)}>
                        <span className={`cat-dot cat-${CATEGORY_OF[a.type]}`} aria-hidden="true" />
                        <span className="grow">
                          <span className="title">{a.title}</span>
                          <span className="meta" style={{ display: 'block' }}>
                            {formatShort(a.date)} · {activityKind(a)}
                            {a.channel && ` · ${a.channel}`}
                            {a.conversation_status && ` · ${a.conversation_status}`}
                            {a.done === false && ' · pendiente'}
                          </span>
                          {a.result && (
                            <span className="meta" style={{ display: 'block' }}>
                              {a.result}
                            </span>
                          )}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ))}

            {tab === 'relacion' && (
              <Facts
                items={[
                  ['Teléfono', c.phone],
                  ['Email', c.email],
                  ['Barrio / localidad', c.neighborhood],
                  ['Redes', c.social],
                  ['Canal preferido', c.preferred_channel],
                  ['Frecuencia sugerida', c.contact_frequency],
                  ['Estado de la relación', c.relationship_status],
                  ['Calidad del vínculo', c.bond_quality],
                  ['Cómo llegó', c.source],
                  ['Recomendado por', c.referred_by],
                  ['Agente responsable', c.agent],
                  ['Ingreso a la base', c.joined_on && formatShort(c.joined_on)],
                  ['Motivo de la próxima acción', c.next_action_reason],
                  ['Personas relacionadas', c.related_people],
                  ['Observaciones', c.notes],
                ]}
              />
            )}

            {tab === 'personal' && (
              <Facts
                items={[
                  ['Cumpleaños', c.birthday && formatShort(c.birthday)],
                  ['Profesión / actividad', c.occupation],
                  ['Empresa', c.company],
                  ['Estado familiar', c.family_status],
                  ['¿Es padre / madre?', yesNo(c.is_parent)],
                  ['Hijos', c.children],
                  ['¿Tiene mascotas?', yesNo(c.has_pets)],
                  ['Mascota', c.pets],
                  [
                    'Cumpleaños y fechas de familiares',
                    c.family_dates?.length ? (
                      <ul className="plain-list">
                        {c.family_dates.map((f, i) => (
                          <li key={i}>
                            {f.name}
                            {f.relation && ` (${f.relation})`}: {f.date ? formatShort(f.date) : 'sin fecha'}
                            {f.kind !== 'cumpleanos' && ` · ${f.kind === 'aniversario' ? 'aniversario' : 'otra fecha'}`}
                          </li>
                        ))}
                      </ul>
                    ) : null,
                  ],
                  ['Equipo de fútbol', c.football_team],
                  ['Intereses y hobbies', c.hobbies],
                  ['Lugares que frecuenta', c.places],
                  ['Fechas importantes', c.important_dates],
                  ['Valores y temas importantes', c.values_notes],
                ]}
              />
            )}

            {tab === 'oportunidad' && (
              <Facts
                items={[
                  ['Situación', c.opportunity_status],
                  ['Operación', c.operation_type],
                  ['Rol', c.role],
                  ['Tipo de propiedad', c.property_type],
                  ['Zona de interés', c.area_of_interest],
                  ['Presupuesto', c.budget],
                  ['Plazo', c.timeframe],
                  ['Urgencia', c.urgency],
                  ['Probabilidad', c.probability],
                  ['Motivación', c.motivation],
                  ['Deseo', c.desire],
                  ['Necesidad', c.need],
                  ['Posibilidad', c.possibility],
                  ['Tiene propiedad para vender', yesNo(c.has_property_to_sell)],
                  ['Necesita financiación', yesNo(c.needs_financing)],
                  ['Otros decisores', c.other_deciders],
                  ['Competencia', c.competition],
                  ['Obstáculos o dudas', c.obstacles],
                ]}
              />
            )}
          </div>
        </div>
      </div>

      <Sheet open={editing} title={`Editar ${c.full_name}`} onClose={() => setEditing(false)}>
        {editing && (
          <ContactForm
            initial={c}
            onCancel={() => setEditing(false)}
            onDelete={() => onDelete(c)}
            onSubmit={async (draft) => {
              const patch = { ...draft } as Partial<Contact>;
              delete patch.id;
              delete patch.user_id;
              delete patch.created_at;
              delete patch.updated_at;
              await save('contacts', c.id, patch);
              setEditing(false);
              toast('Contacto actualizado');
            }}
          />
        )}
      </Sheet>
    </>
  );
}
