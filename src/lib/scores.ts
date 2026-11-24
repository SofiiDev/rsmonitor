// Semáforo de calidad del contacto y nivel de oportunidad, calculados desde la ficha.
import type { Activity, Contact, Opportunity } from './types';
import { diffDays, today } from './dates';
import { lastContactDate } from './metrics';

export type Light = 'verde' | 'amarillo' | 'rojo' | 'gris';

export const LIGHT_LABEL: Record<Light, string> = {
  verde: 'Buena',
  amarillo: 'Regular',
  rojo: 'Débil',
  gris: 'Sin datos',
};

const FREQ_DAYS: Record<string, number> = { Semanal: 7, Quincenal: 15, Mensual: 30, Trimestral: 90, Semestral: 180 };
const QUALITY_BASE: Record<string, Light> = { Fuerte: 'verde', Cercana: 'verde', Ocasional: 'amarillo', Inicial: 'rojo' };
const DOWN: Record<Light, Light> = { verde: 'amarillo', amarillo: 'rojo', rojo: 'rojo', gris: 'gris' };

export interface QualityResult {
  light: Light;
  reason: string;
}

/**
 * Semáforo: parte de la "calidad del vínculo" y baja un escalón si el contacto
 * está atrasado respecto de su frecuencia sugerida (dos escalones si pasó el doble).
 */
// Si falta la calidad del vínculo, el semáforo parte del nivel de relación.
const LEVEL_BASE: Record<string, Light> = { A: 'verde', B: 'verde', C: 'amarillo', D: 'rojo' };

export function contactQuality(c: Contact, activities: Activity[], ref = today()): QualityResult {
  const fromLevel = !c.bond_quality && c.level ? LEVEL_BASE[c.level] : undefined;
  const base = c.bond_quality ? QUALITY_BASE[c.bond_quality] : fromLevel;
  const last = lastContactDate(c.id, activities);
  const days = last ? diffDays(ref, last) : null;
  const limit = c.contact_frequency ? FREQ_DAYS[c.contact_frequency] : undefined;

  const parts: string[] = [];
  if (c.bond_quality) parts.push(`Vínculo: ${c.bond_quality.toLowerCase()}`);
  else if (fromLevel) parts.push(`Según nivel ${c.level}`);
  if (days !== null) parts.push(days === 0 ? 'contactado hoy' : `último contacto hace ${days} ${days === 1 ? 'día' : 'días'}`);
  else parts.push('sin contactos registrados');

  if (c.do_not_contact) return { light: 'rojo', reason: 'Pidió no ser contactado' };
  if (c.relationship_status === 'Fría' && !base) return { light: 'rojo', reason: ['Relación fría', ...parts.slice(1)].join(' · ') };
  if (!base) return { light: 'gris', reason: 'Cargá el nivel o la calidad del vínculo para calcular el semáforo' };

  let light = base;
  if (limit) {
    const late = days === null ? Infinity : days - limit;
    if (late > 0) {
      light = DOWN[light];
      if (days === null || days > limit * 2) light = DOWN[light];
      parts.push(`frecuencia ${c.contact_frequency!.toLowerCase()} vencida`);
    } else {
      parts.push('al día');
    }
  }
  if (c.relationship_status === 'Fría' || c.relationship_status === 'En pausa') light = DOWN[light];
  return { light, reason: parts.join(' · ') };
}

// ───────────────────────── Nivel de oportunidad ─────────────────────────

const STAGE: Record<string, number> = {
  'Sin oportunidad': 0,
  'Conversación abierta': 25,
  'Oportunidad detectada': 50,
  Pausada: 25,
  Activa: 75,
  Cerrada: 100,
};
const PROBABILITY: Record<string, number> = { Alta: 15, Media: 0, Baja: -15 };
const URGENCY: Record<string, number> = { Inmediata: 10, '3 meses': 5, '6 meses': 0, 'Más adelante': -5 };

export interface OpportunityResult {
  score: number;   // 0 a 100
  level: 0 | 1 | 2 | 3 | 4 | 5; // segmentos llenos de 5
  label: string;
  reason: string;
}

/** Nivel 0–100: etapa de la oportunidad ajustada por probabilidad de concreción y urgencia. */
export function opportunityLevel(c: Pick<Contact, 'opportunity_status' | 'probability' | 'urgency'>): OpportunityResult {
  const status = c.opportunity_status;
  if (!status || status === 'Sin oportunidad') {
    return { score: 0, level: 0, label: 'Sin oportunidad', reason: status ? 'Sin oportunidad detectada' : 'Situación de oportunidad sin cargar' };
  }
  if (status === 'Cerrada') return { score: 100, level: 5, label: 'Cerrada', reason: 'Operación cerrada' };

  let score = STAGE[status] ?? 25;
  const extra: string[] = [status];
  if (c.probability && PROBABILITY[c.probability] !== undefined) {
    score += PROBABILITY[c.probability];
    extra.push(`probabilidad ${c.probability.toLowerCase()}`);
  }
  if (c.urgency && URGENCY[c.urgency] !== undefined) {
    score += URGENCY[c.urgency];
    extra.push(`urgencia: ${c.urgency.toLowerCase()}`);
  }
  if (status === 'Pausada') score = Math.min(score, 30);
  score = Math.max(5, Math.min(95, score));
  const level = Math.max(1, Math.round(score / 20)) as OpportunityResult['level'];
  const label = score >= 70 ? 'Alta' : score >= 40 ? 'Media' : 'Baja';
  return { score, level, label, reason: extra.join(' · ') };
}

/** Mejor nivel entre la oportunidad principal de la ficha y las adicionales. */
export function bestOpportunity(c: Contact, opportunities: Opportunity[]): OpportunityResult & { count: number } {
  const extras = opportunities.filter((o) => o.contact_id === c.id);
  const all = [opportunityLevel(c), ...extras.map((o) => opportunityLevel({ opportunity_status: o.status, probability: o.probability, urgency: o.urgency }))];
  const open = all.filter((r) => r.score > 0 && r.label !== 'Cerrada').length;
  const best = all.reduce((a, b) => (b.score > a.score ? b : a));
  return { ...best, count: open, reason: extras.length ? `${best.reason} · ${all.filter((r) => r.score > 0).length} oportunidades` : best.reason };
}
