import type { Contact, ContactEvent, ContactEventKind } from './types';
import { formatShort } from './dates';

export type ChangeReason = 'completado' | 'pospuesto';
type NewEvent = Omit<ContactEvent, 'id' | 'created_at' | 'user_id'>;

export const EVENT_LABEL: Record<ContactEventKind, string> = {
  creado: 'Contacto agregado a la base',
  recontacto_programado: 'Recontacto programado',
  recontacto_reprogramado: 'Recontacto reprogramado',
  recontacto_completado: 'Recontacto completado',
  recontacto_cancelado: 'Recontacto cancelado',
  nivel: 'Cambio de nivel',
  oportunidad: 'Cambio de oportunidad',
  estado_relacion: 'Cambio de estado de la relación',
  no_contactar: 'Marcado como "no contactar"',
  actividad_eliminada: 'Actividad eliminada',
};

export const RECONTACT_KINDS: ContactEventKind[] = [
  'recontacto_programado',
  'recontacto_reprogramado',
  'recontacto_completado',
  'recontacto_cancelado',
];

const action = (text: string | null, date: string | null) =>
  [text || 'Recontactar', date && formatShort(date)].filter(Boolean).join(' · ');

/** Compara la ficha antes y después de guardar y devuelve los eventos a registrar. */
export function contactChanges(prev: Contact | undefined, next: Contact, reason?: ChangeReason): NewEvent[] {
  const ev = (kind: ContactEventKind, detail: string | null): NewEvent => ({ contact_id: next.id, kind, detail });
  const out: NewEvent[] = [];

  if (!prev) {
    out.push(ev('creado', null));
    if (next.next_action || next.next_action_date) out.push(ev('recontacto_programado', action(next.next_action, next.next_action_date)));
    return out;
  }

  const had = Boolean(prev.next_action || prev.next_action_date);
  const has = Boolean(next.next_action || next.next_action_date);
  const changed = prev.next_action !== next.next_action || prev.next_action_date !== next.next_action_date;

  if (changed) {
    if (had && reason === 'completado') out.push(ev('recontacto_completado', action(prev.next_action, prev.next_action_date)));
    if (had && !has && reason !== 'completado') out.push(ev('recontacto_cancelado', action(prev.next_action, prev.next_action_date)));
    if (has) {
      const onlyDate = had && reason !== 'completado' && prev.next_action === next.next_action;
      if (onlyDate || reason === 'pospuesto') {
        const from = prev.next_action_date ? formatShort(prev.next_action_date) : 'sin fecha';
        const to = next.next_action_date ? formatShort(next.next_action_date) : 'sin fecha';
        out.push(ev('recontacto_reprogramado', `${next.next_action || 'Recontactar'}: de ${from} a ${to}`));
      } else {
        out.push(ev('recontacto_programado', action(next.next_action, next.next_action_date)));
      }
    }
  }

  const diff = (kind: ContactEventKind, a: string | null, b: string | null) => {
    if ((a ?? '') !== (b ?? '')) out.push(ev(kind, `${a || 'sin definir'} → ${b || 'sin definir'}`));
  };
  diff('nivel', prev.level, next.level);
  diff('oportunidad', prev.opportunity_status, next.opportunity_status);
  diff('estado_relacion', prev.relationship_status, next.relationship_status);
  if (!prev.do_not_contact && next.do_not_contact) out.push(ev('no_contactar', null));

  return out;
}
