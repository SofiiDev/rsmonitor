// Personas relacionadas entre contactos de la base (pareja, hijos, amigos…).
import type { Contact } from './types';

export interface RelatedLink {
  id: string;       // id del otro contacto
  relation: string; // cómo es para este contacto: "Pareja", "Hija"…
}

/** Relación y su inversa, para guardar el vínculo en las dos fichas. */
export const RELATIONS: { value: string; inverse: string }[] = [
  { value: 'Pareja', inverse: 'Pareja' },
  { value: 'Esposo/a', inverse: 'Esposo/a' },
  { value: 'Hijo/a', inverse: 'Padre/Madre' },
  { value: 'Padre/Madre', inverse: 'Hijo/a' },
  { value: 'Hermano/a', inverse: 'Hermano/a' },
  { value: 'Familiar', inverse: 'Familiar' },
  { value: 'Amigo/a', inverse: 'Amigo/a' },
  { value: 'Socio/a', inverse: 'Socio/a' },
  { value: 'Compañero/a de trabajo', inverse: 'Compañero/a de trabajo' },
  { value: 'Lo/la refirió', inverse: 'Refirió a' },
  { value: 'Refirió a', inverse: 'Lo/la refirió' },
  { value: 'Otro', inverse: 'Otro' },
];

export const inverseOf = (relation: string) => RELATIONS.find((r) => r.value === relation)?.inverse ?? relation;

const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

/** Contactos cuyo nombre completo aparece escrito en un texto (p. ej. "Personas relacionadas"). */
export function mentionedContacts(text: string | null | undefined, contacts: Contact[], selfId: string): Contact[] {
  if (!text) return [];
  const t = ` ${norm(text)} `;
  return contacts.filter((c) => c.id !== selfId && norm(c.full_name).length > 3 && t.includes(norm(c.full_name)));
}

export interface RelatedPerson {
  contact: Contact;
  relation: string | null;
  source: 'vinculo' | 'texto';
}

/**
 * Todas las personas de la base relacionadas con un contacto:
 * vínculos guardados (en cualquiera de las dos fichas) y nombres escritos
 * en "Personas relacionadas", "Quién lo recomendó" u otros textos de ambas fichas.
 */
export function relatedPeople(c: Contact, contacts: Contact[]): RelatedPerson[] {
  const out = new Map<string, RelatedPerson>();
  const byId = new Map(contacts.map((x) => [x.id, x]));

  for (const l of c.related_contacts ?? []) {
    const other = byId.get(l.id);
    if (other) out.set(other.id, { contact: other, relation: l.relation, source: 'vinculo' });
  }
  // Vínculos que la otra ficha guardó hacia este contacto (por si falta el inverso).
  for (const other of contacts) {
    if (other.id === c.id || out.has(other.id)) continue;
    const l = (other.related_contacts ?? []).find((x) => x.id === c.id);
    if (l) out.set(other.id, { contact: other, relation: inverseOf(l.relation), source: 'vinculo' });
  }
  // Nombres escritos en los textos de esta ficha.
  const texts = [c.related_people, c.referred_by, c.family_status, c.children, c.other_deciders].filter(Boolean).join(' · ');
  for (const other of mentionedContacts(texts, contacts, c.id)) {
    if (!out.has(other.id)) out.set(other.id, { contact: other, relation: null, source: 'texto' });
  }
  // …y de las fichas que mencionan a este contacto.
  for (const other of contacts) {
    if (other.id === c.id || out.has(other.id)) continue;
    const otherTexts = [other.related_people, other.referred_by, other.family_status, other.children, other.other_deciders].filter(Boolean).join(' · ');
    if (mentionedContacts(otherTexts, [c], other.id).length) out.set(other.id, { contact: other, relation: null, source: 'texto' });
  }
  return [...out.values()].sort((a, b) => a.contact.full_name.localeCompare(b.contact.full_name, 'es'));
}
