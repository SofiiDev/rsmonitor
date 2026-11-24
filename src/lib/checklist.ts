// Checklist de datos básicos de cada contacto: qué tenés y qué falta.
import type { Contact } from './types';

export interface CheckItem {
  key: string;
  label: string;
  done: boolean;
  tab: string; // pestaña de la ficha donde se completa
}

export function contactChecklist(c: Contact): CheckItem[] {
  const has = (v: unknown) => (Array.isArray(v) ? v.length > 0 : v !== null && v !== undefined && String(v).trim() !== '');
  return [
    { key: 'phone', label: 'Teléfono', done: has(c.phone), tab: 'Identificación y contacto' },
    { key: 'email', label: 'Email', done: has(c.email), tab: 'Identificación y contacto' },
    { key: 'instagram', label: 'Instagram', done: has(c.instagram), tab: 'Identificación y contacto' },
    { key: 'facebook', label: 'Facebook', done: has(c.facebook), tab: 'Identificación y contacto' },
    { key: 'linkedin', label: 'LinkedIn', done: has(c.linkedin), tab: 'Identificación y contacto' },
    { key: 'birthday', label: 'Cumpleaños', done: has(c.birthday), tab: 'Identificación y contacto' },
    { key: 'neighborhood', label: 'Barrio', done: has(c.neighborhood), tab: 'Identificación y contacto' },
    { key: 'level', label: 'Nivel (A/B/C/D)', done: has(c.level), tab: 'Identificación y contacto' },
    { key: 'contact_frequency', label: 'Frecuencia de contacto', done: has(c.contact_frequency), tab: 'La relación' },
    { key: 'bond_quality', label: 'Calidad del vínculo', done: has(c.bond_quality), tab: 'La relación' },
    { key: 'next_action', label: 'Próxima acción', done: has(c.next_action) && has(c.next_action_date), tab: 'La relación' },
    { key: 'occupation', label: 'Profesión', done: has(c.occupation), tab: 'Información personal' },
    { key: 'opportunity_status', label: 'Situación de oportunidad', done: has(c.opportunity_status), tab: 'Oportunidad inmobiliaria' },
  ];
}

export function completeness(c: Contact) {
  const items = contactChecklist(c);
  const done = items.filter((i) => i.done).length;
  return { items, done, total: items.length, pct: Math.round((done / items.length) * 100), missing: items.filter((i) => !i.done) };
}

/** Enlaces a perfiles a partir de lo que se cargó (usuario o URL). */
export function socialUrl(network: 'instagram' | 'facebook' | 'linkedin', value: string): string {
  const v = value.trim();
  if (/^https?:\/\//i.test(v)) return v;
  const user = v.replace(/^@/, '').replace(/^(www\.)?(instagram|facebook|linkedin)\.com\/(in\/)?/i, '');
  if (network === 'instagram') return `https://instagram.com/${user}`;
  if (network === 'facebook') return `https://facebook.com/${user}`;
  return `https://www.linkedin.com/in/${user}`;
}
