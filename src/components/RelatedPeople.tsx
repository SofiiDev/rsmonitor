import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../lib/store';
import type { Contact } from '../lib/types';
import { RELATIONS, inverseOf, relatedPeople } from '../lib/relations';
import { LevelBadge } from './Bits';
import { Icon } from './Icon';
import { useToast } from './Toast';

const MIGRATION_HINT = 'Para guardar vínculos falta correr en Supabase la migración supabase/migrations/006_related_contacts.sql.';

/** Personas de la base relacionadas con este contacto, con enlace a su ficha. */
export function RelatedPeople({ contact }: { contact: Contact }) {
  const { contacts, save } = useStore();
  const toast = useToast();
  const [adding, setAdding] = useState(false);
  const [otherId, setOtherId] = useState('');
  const [relation, setRelation] = useState(RELATIONS[0].value);
  const [busy, setBusy] = useState(false);

  const people = relatedPeople(contact, contacts);
  const linked = new Set(people.filter((p) => p.source === 'vinculo').map((p) => p.contact.id));
  const candidates = contacts.filter((c) => c.id !== contact.id && !linked.has(c.id));

  const explain = (err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err);
    return /related_contacts/.test(msg) ? MIGRATION_HINT : msg;
  };

  async function add(e: FormEvent) {
    e.preventDefault();
    const other = contacts.find((c) => c.id === otherId);
    if (!other) return;
    setBusy(true);
    try {
      // Se guarda en las dos fichas, cada una con su relación (Hijo/a ↔ Padre/Madre).
      const mine = (contact.related_contacts ?? []).filter((l) => l.id !== other.id);
      const theirs = (other.related_contacts ?? []).filter((l) => l.id !== contact.id);
      await save('contacts', contact.id, { related_contacts: [...mine, { id: other.id, relation }] });
      await save('contacts', other.id, { related_contacts: [...theirs, { id: contact.id, relation: inverseOf(relation) }] });
      toast(`Vinculado con ${other.full_name}`);
      setAdding(false);
      setOtherId('');
    } catch (err) {
      toast(explain(err));
    } finally {
      setBusy(false);
    }
  }

  async function unlink(other: Contact) {
    if (!window.confirm(`¿Quitar el vínculo con ${other.full_name}? Las dos fichas se conservan.`)) return;
    try {
      await save('contacts', contact.id, { related_contacts: (contact.related_contacts ?? []).filter((l) => l.id !== other.id) });
      if ((other.related_contacts ?? []).some((l) => l.id === contact.id)) {
        await save('contacts', other.id, { related_contacts: (other.related_contacts ?? []).filter((l) => l.id !== contact.id) });
      }
      toast('Vínculo quitado');
    } catch (err) {
      toast(explain(err));
    }
  }

  return (
    <section className="stat related" aria-labelledby="related-title">
      <div className="spread">
        <h2 id="related-title" className="stat-label">
          Personas relacionadas
        </h2>
        {!adding && candidates.length > 0 && (
          <button type="button" className="btn btn-sm" onClick={() => setAdding(true)}>
            <Icon name="plus" />
            Vincular
          </button>
        )}
      </div>

      {people.length === 0 && !adding && (
        <p className="muted small">
          Sin personas de tu base vinculadas. Usá “Vincular”, o escribí su nombre en “Personas relacionadas” de la ficha.
        </p>
      )}

      {people.length > 0 && (
        <ul className="related-list">
          {people.map((p) => (
            <li key={p.contact.id}>
              <Link to={`/contactos/${p.contact.id}`} className="related-link">
                <LevelBadge level={p.contact.level} />
                <span className="grow">
                  <span className="title">{p.contact.full_name}</span>
                  <span className="meta">{p.relation ?? 'Mencionado en la ficha'}</span>
                </span>
                <Icon name="right" />
              </Link>
              {p.source === 'vinculo' && (
                <button type="button" className="btn btn-ghost btn-icon" aria-label={`Quitar vínculo con ${p.contact.full_name}`} onClick={() => unlink(p.contact)}>
                  <Icon name="close" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {adding && (
        <form className="related-form" onSubmit={add}>
          <div className="field">
            <label htmlFor="rel-contact">Contacto</label>
            <select id="rel-contact" value={otherId} onChange={(e) => setOtherId(e.target.value)} required>
              <option value="">Elegí un contacto…</option>
              {candidates.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.full_name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="rel-type">Es su…</label>
            <select id="rel-type" value={relation} onChange={(e) => setRelation(e.target.value)}>
              {RELATIONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.value}
                </option>
              ))}
            </select>
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn-sm" onClick={() => setAdding(false)} disabled={busy}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-sm btn-primary" disabled={!otherId || busy}>
              Guardar vínculo
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
