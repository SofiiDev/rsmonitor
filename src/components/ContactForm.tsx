import { useState, type FormEvent } from 'react';
import type { Contact, FamilyDate } from '../lib/types';
import {
  BOND_QUALITY,
  BOND_TYPES,
  CHANNELS,
  FREQUENCIES,
  LEVELS,
  OPERATION_TYPES,
  OPPORTUNITY_STATUS,
  PROBABILITY,
  RELATIONSHIP_STATUS,
  ROLES,
  URGENCY,
} from '../lib/options';
import { ChipGroup, Section, SelectField, TextArea, TextField, TriState } from './Fields';
import { Icon } from './Icon';

type Draft = Omit<Contact, 'id'> & { id?: string };

export function ContactForm({
  initial,
  onSubmit,
  onCancel,
  onDelete,
}: {
  initial: Draft;
  onSubmit: (c: Draft) => Promise<void>;
  onCancel: () => void;
  onDelete?: () => void;
}) {
  const [c, setC] = useState<Draft>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | undefined>();

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setC((p) => ({ ...p, [k]: v }));
  // Atajo para campos de texto: guarda null si queda vacío.
  const t = (k: keyof Draft) => ({
    value: (c[k] as string | null) ?? '',
    onChange: (v: string) => set(k, (v.trim() === '' ? null : v) as never),
  });

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!c.full_name.trim()) {
      setNameError('El nombre es obligatorio.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const family_dates = (c.family_dates ?? []).filter((f) => f.name.trim() || f.date);
      await onSubmit({ ...c, full_name: c.full_name.trim(), family_dates });
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
        <TextField
          label="Nombre y apellido"
          required
          className="span-2"
          autoComplete="off"
          value={c.full_name}
          onChange={(v) => {
            set('full_name', v);
            if (nameError) setNameError(undefined);
          }}
          error={nameError}
        />
        <TextField label="Teléfono" type="tel" inputMode="tel" autoComplete="off" {...t('phone')} />
        <TextField label="Email" type="email" inputMode="email" autoComplete="off" {...t('email')} />
      </div>

      <ChipGroup
        legend="Nivel de relación"
        name="level"
        value={c.level}
        onChange={(v) => set('level', v)}
        options={LEVELS.map((l) => ({ value: l.value, label: l.label }))}
      />
      {c.level && <p className="hint muted small">{LEVELS.find((l) => l.value === c.level)?.description}</p>}

      <Section title="Identificación y contacto" open>
        <TextField label="Fecha de nacimiento" type="date" {...t('birthday')} />
        <TextField label="Barrio / localidad" {...t('neighborhood')} />
        <TextField label="Redes (Instagram, LinkedIn…)" {...t('social')} />
        <SelectField label="Canal preferido" options={CHANNELS} {...t('preferred_channel')} />
        <TextField label="Agente responsable" {...t('agent')} />
        <TextField label="Cómo llegó a vos" {...t('source')} />
        <TextField label="Quién lo recomendó" {...t('referred_by')} />
        <TextField label="Fecha de ingreso a la base" type="date" {...t('joined_on')} />
      </Section>

      <Section title="La relación" open>
        <SelectField label="Tipo de vínculo" options={BOND_TYPES} {...t('bond_type')} />
        <SelectField label="Frecuencia de contacto sugerida" options={FREQUENCIES} {...t('contact_frequency')} />
        <SelectField label="Estado de la relación" options={RELATIONSHIP_STATUS} {...t('relationship_status')} />
        <SelectField label="Calidad del vínculo" options={BOND_QUALITY} {...t('bond_quality')} />
        <TextField label="Próxima acción" {...t('next_action')} />
        <TextField label="Fecha de próxima acción" type="date" {...t('next_action_date')} />
        <TextField label="Motivo / objetivo de la próxima acción" className="span-2" {...t('next_action_reason')} />
        <TextField label="Personas relacionadas en la base" className="span-2" {...t('related_people')} />
        <label className="check span-2">
          <input type="checkbox" checked={c.do_not_contact} onChange={(e) => set('do_not_contact', e.target.checked)} />
          No contactar / pidió baja de comunicaciones
        </label>
      </Section>

      <Section title="Información personal" open>
        <TextField label="Profesión / actividad" {...t('occupation')} />
        <TextField label="Empresa o lugar de trabajo" {...t('company')} />
        <TextField label="Estado familiar" {...t('family_status')} />
        <TriState label="¿Es padre / madre?" value={c.is_parent} onChange={(v) => set('is_parent', v)} />
        <TextField label="Hijos (nombres y edades aprox.)" {...t('children')} />
        <TriState label="¿Tiene mascotas?" value={c.has_pets} onChange={(v) => set('has_pets', v)} />
        <TextField label="Mascota (nombre / tipo)" {...t('pets')} />
        <TextField label="Equipo de fútbol" {...t('football_team')} />
        <TextField label="Intereses y hobbies" {...t('hobbies')} />
        <TextField label="Lugares que frecuenta" {...t('places')} />
        <FamilyDatesEditor className="span-2" value={c.family_dates ?? []} onChange={(v) => set('family_dates', v)} />
        <TextArea label="Otras fechas o acontecimientos importantes" className="span-2" rows={2} {...t('important_dates')} />
        <TextArea label="Intereses, valores o temas importantes" className="span-2" rows={2} {...t('values_notes')} />
      </Section>

      <Section title="Oportunidad inmobiliaria" open>
        <SelectField label="Situación actual" options={OPPORTUNITY_STATUS} {...t('opportunity_status')} />
        <SelectField label="Tipo de operación" options={OPERATION_TYPES} {...t('operation_type')} />
        <SelectField label="Rol" options={ROLES} {...t('role')} />
        <TextField label="Tipo de propiedad" {...t('property_type')} />
        <TextField label="Zona de interés" {...t('area_of_interest')} />
        <TextField label="Presupuesto o valor estimado" {...t('budget')} />
        <TextField label="Plazo estimado" {...t('timeframe')} />
        <SelectField label="Urgencia" options={URGENCY} {...t('urgency')} />
        <SelectField label="Probabilidad de concreción" options={PROBABILITY} {...t('probability')} />
        <TextField label="Motivación" {...t('motivation')} />
        <TextField label="Deseo" {...t('desire')} />
        <TextField label="Necesidad" {...t('need')} />
        <TextField label="Posibilidad (económica)" {...t('possibility')} />
        <TriState label="¿Tiene propiedad para vender antes?" value={c.has_property_to_sell} onChange={(v) => set('has_property_to_sell', v)} />
        <TriState label="¿Necesita financiación?" value={c.needs_financing} onChange={(v) => set('needs_financing', v)} />
        <TextField label="Otros decisores involucrados" {...t('other_deciders')} />
        <TextField label="Competencia (¿habla con otras inmobiliarias?)" {...t('competition')} />
        <TextArea label="Obstáculos o dudas" className="span-2" rows={2} {...t('obstacles')} />
      </Section>

      <Section title="Observaciones" open>
        <TextArea label="Observaciones generales" className="span-2" rows={4} {...t('notes')} />
      </Section>

      <div className="form-actions">
        {onDelete && (
          <button type="button" className="btn btn-danger left" onClick={onDelete} disabled={busy}>
            Eliminar contacto
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

const KINDS: { value: FamilyDate['kind']; label: string }[] = [
  { value: 'cumpleanos', label: 'Cumpleaños' },
  { value: 'aniversario', label: 'Aniversario' },
  { value: 'otra', label: 'Otra fecha' },
];

/** Cumpleaños y fechas de familiares: aparecen en "Hoy" el día que corresponde. */
function FamilyDatesEditor({ value, onChange, className }: { value: FamilyDate[]; onChange: (v: FamilyDate[]) => void; className?: string }) {
  const update = (i: number, patch: Partial<FamilyDate>) => onChange(value.map((f, j) => (j === i ? { ...f, ...patch } : f)));

  return (
    <fieldset className={`family-dates ${className ?? ''}`}>
      <legend>Cumpleaños y fechas de familiares</legend>
      <p className="hint muted small">Hijos, pareja, padres… Te van a aparecer en “Hoy” ese día. Si no sabés el año, poné cualquiera.</p>
      {value.length > 0 && (
        <ul className="family-list">
          {value.map((f, i) => (
            <li key={i} className="family-row">
              <TextField label="Nombre" value={f.name} onChange={(v) => update(i, { name: v })} />
              <TextField label="Parentesco" placeholder="hija, esposo…" value={f.relation} onChange={(v) => update(i, { relation: v })} />
              <SelectField label="Tipo" required value={f.kind} onChange={(v) => update(i, { kind: v as FamilyDate['kind'] })} options={KINDS} />
              <TextField label="Fecha" type="date" value={f.date} onChange={(v) => update(i, { date: v })} />
              <button
                type="button"
                className="btn btn-ghost btn-icon"
                aria-label={`Quitar ${f.name || 'esta fecha'}`}
                onClick={() => onChange(value.filter((_, j) => j !== i))}
              >
                <Icon name="close" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <button
        type="button"
        className="btn"
        onClick={() => onChange([...value, { name: '', relation: '', date: '', kind: 'cumpleanos' }])}
      >
        <Icon name="plus" />
        Agregar fecha de un familiar
      </button>
    </fieldset>
  );
}
