import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useStore } from '../lib/store';
import { emptyContact } from '../lib/empty';
import { LEVELS, OPPORTUNITY_STATUS } from '../lib/options';
import { lastContactDate } from '../lib/metrics';
import { formatShort, relativeDay, today } from '../lib/dates';
import { PageHeader } from '../components/Layout';
import { Icon } from '../components/Icon';
import { LevelBadge } from '../components/Bits';
import { OpportunityBar, QualityLight } from '../components/Indicators';
import { contactQuality, opportunityLevel, type Light } from '../lib/scores';
import type { Contact } from '../lib/types';
import { Sheet } from '../components/Sheet';
import { ContactForm } from '../components/ContactForm';
import { useToast } from '../components/Toast';

const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function Contacts() {
  const { contacts, activities, create } = useStore();
  const toast = useToast();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [adding, setAdding] = useState(false);
  const q = params.get('q') ?? '';
  const level = params.get('nivel') ?? '';
  const opp = params.get('oportunidad') ?? '';
  const order = params.get('orden') ?? '';
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
      if (!nq) return true;
      return [c.full_name, c.phone, c.email, c.neighborhood, c.notes].some((f) => f && normalize(f).includes(nq));
    });
  }, [contacts, q, level, opp]);

  const sorted = useMemo(() => {
    if (!order) return filtered;
    // "Sin datos" (gris) siempre al final.
    const rank: Record<Light, number> =
      order === 'semaforo-rojo' ? { rojo: 0, amarillo: 1, verde: 2, gris: 3 } : { verde: 0, amarillo: 1, rojo: 2, gris: 3 };
    const key = (c: Contact) => (order === 'oportunidad' ? -opportunityLevel(c).score : rank[contactQuality(c, activities).light]);
    return filtered
      .map((c) => ({ c, k: key(c) }))
      .sort((a, b) => a.k - b.k)
      .map((x) => x.c);
  }, [filtered, order, activities]);

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
          <button type="button" className="btn btn-primary" onClick={() => setAdding(true)}>
            <Icon name="plus" />
            Nuevo contacto
          </button>
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
        <div className="field">
          <label htmlFor="orden" className="visually-hidden">
            Ordenar
          </label>
          <select id="orden" value={order} onChange={(e) => setParam('orden', e.target.value)}>
            <option value="">Orden: nombre</option>
            <option value="oportunidad">Orden: mayor oportunidad</option>
            <option value="semaforo-verde">Orden: semáforo verde primero</option>
            <option value="semaforo-rojo">Orden: semáforo rojo primero</option>
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
                <li key={c.id}>
                  <Link to={`/contactos/${c.id}`} className="list-item">
                    <LevelBadge level={c.level} />
                    <span className="grow">
                      <span className="title">{c.full_name}</span>
                      <span className="meta" style={{ display: 'block' }}>
                        {[c.neighborhood, c.opportunity_status, last ? `último contacto ${formatShort(last)}` : null].filter(Boolean).join(' · ') || 'Sin datos adicionales'}
                      </span>
                      <span className="indicators">
                        <QualityLight result={contactQuality(c, activities)} />
                        <OpportunityBar result={opportunityLevel(c)} />
                      </span>
                    </span>
                    {c.next_action_date && (
                      <span className={`badge ${c.next_action_date < t ? 'badge-danger' : ''}`}>
                        <Icon name="clock" className="icon" />
                        {relativeDay(c.next_action_date, t)}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>

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
