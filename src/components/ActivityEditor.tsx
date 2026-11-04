import { createContext, useCallback, useContext, useState, type FormEvent, type ReactNode } from 'react';
import { useStore } from '../lib/store';
import { today } from '../lib/dates';
import type { Activity, ActivityType, Operation } from '../lib/types';
import { emptyActivity } from '../lib/empty';
import {
  ACTIVITY_TYPES,
  CATEGORIES,
  CONVERSATION_STATUS,
  HISTORY_CHANNELS,
  OPERATIONS,
  PRELISTING_SOURCES,
  TYPES_WITH_OPERATION,
} from '../lib/options';
import { ChipGroup, DecimalField, SelectField, TextArea, TextField } from './Fields';
import { Sheet } from './Sheet';
import { useToast } from './Toast';

type Draft = Omit<Activity, 'id'> & { id?: string };

export interface EditorOptions {
  /** Al guardar, limpia la "próxima acción" de este contacto si no se cargó una nueva. */
  completesContactAction?: string;
}

type OpenEditor = (initial?: Partial<Activity>, options?: EditorOptions) => void;

const EditorContext = createContext<OpenEditor>(() => {});

/** Permite abrir el formulario de actividad desde cualquier pantalla. */
export function ActivityEditorProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [options, setOptions] = useState<EditorOptions>({});

  const open = useCallback<OpenEditor>((initial = {}, opts = {}) => {
    const d = { ...emptyActivity(), ...initial };
    if (initial.done === undefined && !initial.id) d.done = d.date <= today();
    if (d.time) d.time = d.time.slice(0, 5);
    setDraft(d);
    setOptions(opts);
  }, []);

  return (
    <EditorContext.Provider value={open}>
      {children}
      <Sheet open={draft !== null} title={draft?.id ? 'Editar actividad' : 'Registrar actividad'} onClose={() => setDraft(null)}>
        {draft && <ActivityForm key={draft.id ?? 'new'} initial={draft} options={options} onDone={() => setDraft(null)} />}
      </Sheet>
    </EditorContext.Provider>
  );
}

export function useActivityEditor() {
  return useContext(EditorContext);
}

function ActivityForm({ initial, options, onDone }: { initial: Draft; options: EditorOptions; onDone: () => void }) {
  const { contacts, create, save, remove } = useStore();
  const toast = useToast();
  const [a, setA] = useState<Draft>(initial);
  const [updateContact, setUpdateContact] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [titleError, setTitleError] = useState<string | undefined>();
  const [doneTouched, setDoneTouched] = useState(Boolean(initial.id));

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setA((p) => ({ ...p, [k]: v }));
  const str = (v: string) => (v.trim() === '' ? null : v);

  const needsOperation = TYPES_WITH_OPERATION.includes(a.type);
  const contact = contacts.find((c) => c.id === a.contact_id);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!a.title.trim()) {
      setTitleError('Escribí una breve descripción.');
      return;
    }
    setBusy(true);
    setError(null);
    const row: Partial<Activity> = {
      ...a,
      title: a.title.trim(),
      operation: needsOperation ? a.operation : null,
      source: a.type === 'prelisting' ? a.source : null,
      amount: a.type === 'cierre' && a.amount !== null ? Number(a.amount) : null,
    };
    delete (row as { id?: string }).id;
    try {
      if (a.id) await save('activities', a.id, row);
      else await create('activities', row);
      // Mantiene la "próxima acción" de la ficha del contacto al día.
      if (contact && updateContact && a.next_action) {
        await save(
          'contacts',
          contact.id,
          { next_action: a.next_action, next_action_date: a.next_action_date },
          { reason: options.completesContactAction === contact.id && a.done ? 'completado' : undefined },
        );
      } else if (options.completesContactAction && a.done) {
        await save('contacts', options.completesContactAction, { next_action: null, next_action_date: null }, { reason: 'completado' });
      }
      toast(a.id ? 'Actividad actualizada' : a.done ? 'Actividad registrada' : 'Actividad agendada');
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar.');
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    if (!a.id || !window.confirm('¿Eliminar esta actividad? No se puede deshacer.')) return;
    setBusy(true);
    try {
      await remove('activities', a.id);
      toast('Actividad eliminada');
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar.');
      setBusy(false);
    }
  }

  return (
    <form className="form" onSubmit={onSubmit} noValidate>
      {error && (
        <p className="banner banner-error" role="alert">
          {error}
        </p>
      )}

      <fieldset>
        <legend>Tipo de actividad</legend>
        <div className="stack-sm">
          {CATEGORIES.map((cat) => (
            <div key={cat.value} className={`type-group cat-${cat.value}`} role="group" aria-labelledby={`cat-${cat.value}`}>
              <span id={`cat-${cat.value}`} className="type-group-label">
                <span className="cat-dot" aria-hidden="true" />
                {cat.label}
              </span>
              <div className="chips">
                {ACTIVITY_TYPES.filter((t) => t.category === cat.value).map((t) => (
                  <label key={t.value} className="chip">
                    <input type="radio" name="type" value={t.value} checked={a.type === t.value} onChange={() => set('type', t.value as ActivityType)} />
                    <span>{t.label}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </fieldset>

      <div className="form-grid">
        <TextField
          label="Descripción"
          required
          className="span-2"
          value={a.title}
          onChange={(v) => {
            set('title', v);
            if (titleError) setTitleError(undefined);
          }}
          error={titleError}
          placeholder={ACTIVITY_TYPES.find((t) => t.value === a.type)?.hint}
        />
        <TextField
          label="Fecha"
          type="date"
          required
          value={a.date}
          onChange={(v) => {
            const date = v || a.date;
            setA((p) => ({ ...p, date, done: doneTouched ? p.done : date <= today() }));
          }}
        />
        <TextField label="Hora (opcional)" type="time" value={a.time} onChange={(v) => set('time', str(v))} />
        <ChipGroup<'hecha' | 'pendiente'>
          legend="Estado"
          name="done"
          value={a.done ? 'hecha' : 'pendiente'}
          onChange={(v) => {
            set('done', v === 'hecha');
            setDoneTouched(true);
          }}
          options={[
            { value: 'pendiente', label: 'Pendiente / agendada' },
            { value: 'hecha', label: 'Hecha' },
          ]}
        />
        <SelectField
          label="Contacto"
          value={a.contact_id}
          onChange={(v) => set('contact_id', v || null)}
          placeholder="Ninguno"
          options={contacts.map((c) => ({ value: c.id, label: c.full_name }))}
        />
      </div>

      {needsOperation && (
        <ChipGroup<Operation> legend="Operación" name="operation" value={a.operation} onChange={(v) => set('operation', v)} options={OPERATIONS} />
      )}

      {a.type === 'prelisting' && (
        <ChipGroup legend="Origen del prelisting" name="source" value={a.source} onChange={(v) => set('source', v)} options={PRELISTING_SOURCES} />
      )}

      {a.type === 'cierre' && (
        <DecimalField
          label="Comisión cobrada (USD)"
          value={a.amount}
          onChange={(n) => set('amount', n)}
          hint="Se suma a tu facturación real del mes."
        />
      )}

      {(a.type === 'contacto' || a.type === 'reunion_cliente' || a.contact_id) && (
        <div className="form-grid">
          <SelectField label="Canal" value={a.channel} onChange={(v) => set('channel', str(v))} options={HISTORY_CHANNELS} />
          <SelectField label="Estado de la conversación" value={a.conversation_status} onChange={(v) => set('conversation_status', str(v))} options={CONVERSATION_STATUS} />
        </div>
      )}

      <div className="form-grid">
        <TextArea label="Resultado / información nueva" className="span-2" rows={2} value={a.result} onChange={(v) => set('result', str(v))} />
        <TextField label="Próxima acción" value={a.next_action} onChange={(v) => set('next_action', str(v))} />
        <TextField label="Fecha de próxima acción" type="date" value={a.next_action_date} onChange={(v) => set('next_action_date', str(v))} />
        {contact && a.next_action && (
          <label className="check span-2">
            <input type="checkbox" checked={updateContact} onChange={(e) => setUpdateContact(e.target.checked)} />
            Actualizar la próxima acción en la ficha de {contact.full_name}
          </label>
        )}
        <TextArea label="Observaciones" className="span-2" rows={2} value={a.notes} onChange={(v) => set('notes', str(v))} />
      </div>

      <div className="form-actions">
        {a.id && (
          <button type="button" className="btn btn-danger left" onClick={onDelete} disabled={busy}>
            Eliminar
          </button>
        )}
        <button type="button" className="btn" onClick={onDone} disabled={busy}>
          Cancelar
        </button>
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </form>
  );
}
