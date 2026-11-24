import { useState, type FormEvent } from 'react';
import { useStore } from '../lib/store';
import type { Contact, Opportunity } from '../lib/types';
import { OPERATION_TYPES, OPPORTUNITY_STATUS, PROBABILITY, ROLES, URGENCY } from '../lib/options';
import { opportunityLevel } from '../lib/scores';
import { OpportunityBar } from './Indicators';
import { SelectField, TextArea, TextField } from './Fields';
import { Sheet } from './Sheet';
import { Icon } from './Icon';
import { useToast } from './Toast';

type Draft = Omit<Opportunity, 'id'> & { id?: string };

const MIGRATION_HINT = 'Para guardar varias oportunidades falta correr en Supabase la migración supabase/migrations/007_tags_opportunities.sql.';

const empty = (contactId: string): Draft => ({
  contact_id: contactId,
  title: '',
  status: 'Oportunidad detectada',
  operation_type: null,
  role: null,
  property_type: null,
  area_of_interest: null,
  budget: null,
  timeframe: null,
  urgency: null,
  probability: null,
  notes: null,
});

function Summary({ items }: { items: (string | null)[] }) {
  const t = items.filter(Boolean).join(' · ');
  return t ? <span className="meta">{t}</span> : null;
}

/** Oportunidad principal (de la ficha) + oportunidades adicionales del contacto. */
export function OpportunitiesPanel({ contact, onEditMain }: { contact: Contact; onEditMain: () => void }) {
  const { opportunities, create, save, remove } = useStore();
  const toast = useToast();
  const [draft, setDraft] = useState<Draft | null>(null);
  const mine = opportunities.filter((o) => o.contact_id === contact.id);
  const hasMain = Boolean(contact.opportunity_status && contact.opportunity_status !== 'Sin oportunidad') || Boolean(contact.operation_type);

  return (
    <div className="stack-sm">
      <div className="spread">
        <span className="muted small">
          {mine.length + (hasMain ? 1 : 0)} {mine.length + (hasMain ? 1 : 0) === 1 ? 'oportunidad' : 'oportunidades'}
        </span>
        <button type="button" className="btn btn-sm btn-primary" onClick={() => setDraft(empty(contact.id))}>
          <Icon name="plus" />
          Agregar oportunidad
        </button>
      </div>

      <ul className="opp-list">
        <li className="opp-card">
          <div className="spread">
            <strong>Principal{contact.operation_type ? `: ${contact.operation_type}` : ''}</strong>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onEditMain}>
              <Icon name="edit" />
              Editar
            </button>
          </div>
          <OpportunityBar result={opportunityLevel(contact)} />
          <Summary items={[contact.opportunity_status, contact.role, contact.property_type, contact.area_of_interest, contact.budget, contact.timeframe && `plazo ${contact.timeframe}`]} />
          {contact.obstacles && <span className="meta">Obstáculos: {contact.obstacles}</span>}
        </li>

        {mine.map((o) => (
          <li key={o.id} className="opp-card">
            <div className="spread">
              <strong>{o.title}</strong>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDraft(o)}>
                <Icon name="edit" />
                Editar
              </button>
            </div>
            <OpportunityBar result={opportunityLevel({ opportunity_status: o.status, probability: o.probability, urgency: o.urgency })} />
            <Summary items={[o.status, o.operation_type, o.role, o.property_type, o.area_of_interest, o.budget, o.timeframe && `plazo ${o.timeframe}`]} />
            {o.notes && <span className="meta">{o.notes}</span>}
          </li>
        ))}
      </ul>

      <Sheet open={draft !== null} title={draft?.id ? 'Editar oportunidad' : 'Nueva oportunidad'} onClose={() => setDraft(null)}>
        {draft && (
          <OpportunityForm
            initial={draft}
            onCancel={() => setDraft(null)}
            onDelete={
              draft.id
                ? async () => {
                    if (!window.confirm('¿Eliminar esta oportunidad?')) return;
                    await remove('opportunities', draft.id as string);
                    toast('Oportunidad eliminada');
                    setDraft(null);
                  }
                : undefined
            }
            onSubmit={async (d) => {
              const row = { ...d } as Partial<Opportunity>;
              delete row.id;
              delete row.user_id;
              delete row.created_at;
              delete row.updated_at;
              try {
                if (d.id) await save('opportunities', d.id, row);
                else await create('opportunities', row);
                toast(d.id ? 'Oportunidad actualizada' : 'Oportunidad agregada');
                setDraft(null);
              } catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                throw new Error(/opportunities|relation|schema cache/i.test(msg) ? MIGRATION_HINT : msg);
              }
            }}
          />
        )}
      </Sheet>
    </div>
  );
}

function OpportunityForm({
  initial,
  onSubmit,
  onCancel,
  onDelete,
}: {
  initial: Draft;
  onSubmit: (d: Draft) => Promise<void>;
  onCancel: () => void;
  onDelete?: () => void;
}) {
  const [o, setO] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const t = (k: keyof Draft) => ({
    value: (o[k] as string | null) ?? '',
    onChange: (v: string) => setO((p) => ({ ...p, [k]: v.trim() === '' ? null : v })),
  });

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!o.title.trim()) {
      setError('Poné un título, por ejemplo "Venta del depto de Caballito".');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onSubmit({ ...o, title: o.title.trim() });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar.');
      setBusy(false);
    }
  }

  return (
    <form className="form" onSubmit={submit} noValidate>
      {error && (
        <p className="banner banner-error" role="alert">
          {error}
        </p>
      )}
      <div className="form-grid">
        <TextField label="Título" required className="span-2" value={o.title} onChange={(v) => setO((p) => ({ ...p, title: v }))} placeholder="Ej.: Alquiler del PH de su madre" />
        <SelectField label="Situación" options={OPPORTUNITY_STATUS} {...t('status')} />
        <SelectField label="Tipo de operación" options={OPERATION_TYPES} {...t('operation_type')} />
        <SelectField label="Rol" options={ROLES} {...t('role')} />
        <TextField label="Tipo de propiedad" {...t('property_type')} />
        <TextField label="Zona" {...t('area_of_interest')} />
        <TextField label="Presupuesto o valor" {...t('budget')} />
        <TextField label="Plazo estimado" {...t('timeframe')} />
        <SelectField label="Urgencia" options={URGENCY} {...t('urgency')} />
        <SelectField label="Probabilidad de concreción" options={PROBABILITY} {...t('probability')} />
        <TextArea label="Notas" className="span-2" rows={2} {...t('notes')} />
      </div>
      <div className="form-actions">
        {onDelete && (
          <button type="button" className="btn btn-danger left" onClick={onDelete} disabled={busy}>
            Eliminar
          </button>
        )}
        <button type="button" className="btn" onClick={onCancel} disabled={busy}>
          Cancelar
        </button>
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </form>
  );
}
