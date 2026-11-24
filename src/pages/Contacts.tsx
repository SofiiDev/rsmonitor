import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useStore } from '../lib/store';
import { emptyContact } from '../lib/empty';
import { LEVELS, OPPORTUNITY_STATUS } from '../lib/options';
import { lastContactDate } from '../lib/metrics';
import { formatShort, relativeDay, today } from '../lib/dates';
import { PageHeader } from '../components/Layout';
import { Icon } from '../components/Icon';
import { LevelBadge, waLink } from '../components/Bits';
import { OpportunityBar, QualityLight } from '../components/Indicators';
import { bestOpportunity, contactQuality, type Light } from '../lib/scores';
import { completeness } from '../lib/checklist';
import { TagChips } from '../components/Tags';
import type { Contact } from '../lib/types';
import { Sheet } from '../components/Sheet';
import { ContactForm } from '../components/ContactForm';
import { ImportContacts } from '../components/ImportContacts';
import { useToast } from '../components/Toast';

const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function Contacts() {
  const { contacts, activities, opportunities, create } = useStore();
  const toast = useToast();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [adding, setAdding] = useState(false);
  const [importing, setImporting] = useState(false);
  const q = params.get('q') ?? '';
  const level = params.get('nivel') ?? '';
  const opp = params.get('oportunidad') ?? '';
  const order = params.get('orden') ?? '';
  const tag = params.get('etiqueta') ?? '';
  const t = today();

  const setParam = (k: string, v: string) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v);
    else next.delete(k);
    setParams(next, { replace: true });
  };

  const filtered = useMemo(() => {
    const nq = normalize(q.trim());
    return contacts.filter((c) => {
      if (level && (c.level ?? '') !== (level === 'sin' ? '' : level)) return false;
      if (opp && c.opportunity_status !== opp) return false;
      if (tag && !(c.tags ?? []).includes(tag)) return false;
      if (!nq) return true;
      return [c.full_name, c.phone, c.email, c.neighborhood, c.notes].some((f) => f && normalize(f).includes(nq));
    });
  }, [contacts, q, level, opp, tag]);

  const allTags = useMemo(() => [...new Set(contacts.flatMap((c) => c.tags ?? []))].sort((a, b) => a.localeCompare(b, 'es')), [contacts]);

  const sorted = useMemo(() => {
    if (!order) return filtered;
    // "Sin datos" (gris) siempre al final.
    const rank: Record<Light, number> =
      order === 'semaforo-rojo' ? { rojo: 0, amarillo: 1, verde: 2, gris: 3 } : { verde: 0, amarillo: 1, rojo: 2, gris: 3 };
    const key = (c: Contact) =>
      order === 'oportunidad' ? -bestOpportunity(c, opportunities).score : order === 'datos' ? completeness(c).pct : rank[contactQuality(c, activities).light];
    return filtered
      .map((c) => ({ c, k: key(c) }))
      .sort((a, b) => a.k - b.k)
      .map((x) => x.c);
  }, [filtered, order, activities, opportunities]);

  const counts = useMemo(() => {
    const out: Record<string, number> = { A: 0, B: 0, C: 0, D: 0 };
    contacts.forEach((c) => c.level && out[c.level]++);
    return out;
  }, [contacts]);

  return (
    <>
      <PageHeader
        title="Contactos"
        subtitle={`${contacts.length} personas en tu base · A ${counts.A} · B ${counts.B} · C ${counts.C} · D ${counts.D}`}
        actions={
          <>
            <button type="button" className="btn" onClick={() => setImporting(true)}>
              Importar Excel
            </button>
            <button type="button" className="btn btn-primary" onClick={() => setAdding(true)}>
              <Icon name="plus" />
              Nuevo contacto
            </button>
          </>
        }
      />

      <div className="toolbar" role="search" aria-label="Buscar contactos">
        <div className="field search">
          <label htmlFor="q" className="visually-hidden">
            Buscar por nombre, teléfono, email o barrio
          </label>
          <input id="q" type="search" placeholder="Buscar por nombre, teléfono, barrio…" value={q} onChange={(e) => setParam('q', e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="lvl" className="visually-hidden">
            Nivel
          </label>
          <select id="lvl" value={level} onChange={(e) => setParam('nivel', e.target.value)}>
            <option value="">Todos los niveles</option>
            {LEVELS.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
            <option value="sin">Sin nivel</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="opp" className="visually-hidden">
            Oportunidad
          </label>
          <select id="opp" value={opp} onChange={(e) => setParam('oportunidad', e.target.value)}>
            <option value="">Toda oportunidad</option>
            {OPPORTUNITY_STATUS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </div>
        {allTags.length > 0 && (
          <div className="field">
            <label htmlFor="etiqueta" className="visually-hidden">
              Etiqueta
            </label>
            <select id="etiqueta" value={tag} onChange={(e) => setParam('etiqueta', e.target.value)}>
              <option value="">Todas las etiquetas</option>
              {allTags.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="field">
          <label htmlFor="orden" className="visually-hidden">
            Ordenar
          </label>
          <select id="orden" value={order} onChange={(e) => setParam('orden', e.target.value)}>
            <option value="">Orden: nombre</option>
            <option value="oportunidad">Orden: mayor oportunidad</option>
            <option value="semaforo-verde">Orden: semáforo verde primero</option>
            <option value="semaforo-rojo">Orden: semáforo rojo primero</option>
            <option value="datos">Orden: fichas más incompletas</option>
          </select>
        </div>
      </div>

      <p className="visually-hidden" role="status" aria-live="polite">
        {filtered.length} contactos encontrados
      </p>

      <div className="card" style={{ padding: '4px 12px' }}>
        {filtered.length === 0 ? (
          <div className="empty stack-sm">
            <p>{contacts.length === 0 ? 'Todavía no cargaste contactos.' : 'No hay contactos que coincidan con la búsqueda.'}</p>
            {contacts.length === 0 && (
              <p>
                <button type="button" className="btn btn-primary" onClick={() => setAdding(true)}>
                  Cargar el primero
                </button>
              </p>
            )}
          </div>
        ) : (
          <ul className="list">
            {sorted.map((c) => {
              const last = lastContactDate(c.id, activities);
              return (
                <li key={c.id} className="row-with-action">
                  <Link to={`/contactos/${c.id}`} className="list-item">
                    <LevelBadge level={c.level} />
                    <span className="grow">
                      <span className="title">{c.full_name}</span>
                      <span className="meta" style={{ display: 'block' }}>
                        {[c.neighborhood, c.opportunity_status, last ? `último contacto ${formatShort(last)}` : null].filter(Boolean).join(' · ') || 'Sin datos adicionales'}
                      </span>
                      <span className="indicators">
                        <QualityLight result={contactQuality(c, activities)} />
                        <OpportunityBar result={bestOpportunity(c, opportunities)} />
                        <DataBadge contact={c} />
                        <TagChips tags={c.tags} max={3} />
                      </span>
                    </span>
                    {c.next_action_date && (
                      <span className={`badge ${c.next_action_date < t ? 'badge-danger' : ''}`}>
                        <Icon name="clock" className="icon" />
                        {relativeDay(c.next_action_date, t)}
                      </span>
                    )}
                  </Link>
                  {c.phone && !c.do_not_contact && (
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
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <Sheet open={importing} title="Importar contactos desde Excel" onClose={() => setImporting(false)}>
        {importing && <ImportContacts onDone={() => setImporting(false)} />}
      </Sheet>

      <Sheet open={adding} title="Nuevo contacto" onClose={() => setAdding(false)}>
        {adding && (
          <ContactForm
            initial={emptyContact()}
            onCancel={() => setAdding(false)}
            onSubmit={async (draft) => {
              const saved = await create('contacts', draft);
              setAdding(false);
              toast('Contacto creado');
              navigate(`/contactos/${saved.id}`);
            }}
          />
        )}
      </Sheet>
    </>
  );
}

function DataBadge({ contact }: { contact: Contact }) {
  const { done, total, missing } = completeness(contact);
  if (!missing.length) return <span className="data-badge is-complete">Datos completos</span>;
  return (
    <span className="data-badge" title={`Falta: ${missing.map((m) => m.label).join(', ')}`}>
      Datos {done}/{total}
    </span>
  );
}
