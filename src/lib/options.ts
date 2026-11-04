import type { ActivityType, Category, Goal, Level, Operation } from './types';

// Listas tomadas de la hoja "Listas y criterios" de la Base de Relaciones.

export const LEVELS: { value: Level; label: string; description: string }[] = [
  { value: 'A', label: 'Círculo A', description: 'Vínculo cercano: te refiere sin que se lo pidas.' },
  { value: 'B', label: 'Círculo B', description: 'Hay relación y reconocimiento: te quiere recomendar.' },
  { value: 'C', label: 'Círculo C', description: 'Contacto reciente o vínculo tibio: te conoce pero no te va a referir solo.' },
  { value: 'D', label: 'Círculo D', description: 'Contacto frío o desactualizado.' },
];

export const BOND_TYPES = ['Familiar', 'Amistad', 'Conocido', 'Cliente anterior', 'Referido', 'Contacto profesional'];
export const FREQUENCIES = ['Semanal', 'Quincenal', 'Mensual', 'Trimestral', 'Semestral'];
export const CHANNELS = ['WhatsApp', 'Llamada', 'Email', 'Instagram', 'LinkedIn', 'Presencial'];
export const RELATIONSHIP_STATUS = ['Nueva', 'Activa', 'Prioritaria', 'En pausa', 'Fría'];
export const BOND_QUALITY = ['Fuerte', 'Cercana', 'Ocasional', 'Inicial'];
export const OPPORTUNITY_STATUS = ['Sin oportunidad', 'Conversación abierta', 'Oportunidad detectada', 'Activa', 'Pausada', 'Cerrada'];
export const OPERATION_TYPES = ['Compra', 'Venta', 'Alquiler', 'Inversión', 'Tasación', 'Referidos'];
export const ROLES = ['Propietario', 'Comprador', 'Inquilino', 'Inversor', 'Recomendador'];
export const URGENCY = ['Inmediata', '3 meses', '6 meses', 'Más adelante'];
export const PROBABILITY = ['Alta', 'Media', 'Baja'];
export const HISTORY_CHANNELS = ['Llamada', 'WhatsApp', 'Reunión', 'Visita', 'Redes', 'Evento'];
export const CONVERSATION_STATUS = ['Abierta', 'En seguimiento', 'Cerrada', 'Sin respuesta'];

// Colores de agenda: verde = negocio, amarillo = administrativa, rojo = personal.
export const CATEGORIES: { value: Category; label: string; hint: string }[] = [
  { value: 'negocio', label: 'Negocio', hint: 'Clientes, contactos, prelistings, ACM, visitas' },
  { value: 'administrativa', label: 'Administrativa', hint: 'Cargar propiedades, reuniones de equipo, coach' },
  { value: 'personal', label: 'Personal', hint: 'Turnos médicos, vacaciones, trámites personales' },
];

export const CATEGORY_LABEL: Record<Category, string> = { negocio: 'Negocio', administrativa: 'Administrativa', personal: 'Personal' };

export const ACTIVITY_TYPES: { value: ActivityType; label: string; hint: string; category: Category }[] = [
  { value: 'contacto', label: 'Contacto', hint: 'Llamada o WhatsApp con alguien de tu base', category: 'negocio' },
  { value: 'reunion_cliente', label: 'Reunión con cliente', hint: 'Café, reunión o encuentro con un cliente', category: 'negocio' },
  { value: 'prelisting', label: 'Prelisting', hint: 'Reunión previa a una captación', category: 'negocio' },
  { value: 'acm', label: 'ACM / Tasación', hint: 'Análisis comparativo de mercado', category: 'negocio' },
  { value: 'captacion', label: 'Captación', hint: 'Propiedad o cliente captado', category: 'negocio' },
  { value: 'visita', label: 'Visita', hint: 'Visita a una propiedad', category: 'negocio' },
  { value: 'cierre', label: 'Cierre', hint: 'Operación cerrada (cargá la comisión)', category: 'negocio' },
  { value: 'farming', label: 'Farming', hint: 'Volantes, tarjetas, encargados de edificio', category: 'negocio' },
  { value: 'admin', label: 'Tarea administrativa', hint: 'Cargar propiedades, papeles, publicaciones', category: 'administrativa' },
  { value: 'reunion', label: 'Reunión de equipo / coach', hint: 'Oficina, equipo, coaching, capacitación', category: 'administrativa' },
  { value: 'otra', label: 'Otra', hint: 'Otra tarea administrativa', category: 'administrativa' },
  { value: 'personal', label: 'Personal', hint: 'Turno médico, vacaciones, trámite personal', category: 'personal' },
];

export const ACTIVITY_LABEL = Object.fromEntries(ACTIVITY_TYPES.map((t) => [t.value, t.label])) as Record<ActivityType, string>;

export const CATEGORY_OF = Object.fromEntries(ACTIVITY_TYPES.map((t) => [t.value, t.category])) as Record<ActivityType, Category>;

/** Tipos que requieren indicar operación (venta / compra / alquiler). */
export const TYPES_WITH_OPERATION: ActivityType[] = ['captacion', 'visita', 'cierre'];

export const OPERATIONS: { value: Operation; label: string }[] = [
  { value: 'venta', label: 'Venta' },
  { value: 'compra', label: 'Compra' },
  { value: 'alquiler', label: 'Alquiler' },
];

// Orígenes del prelisting, como en la hoja RATIOS.
export const PRELISTING_SOURCES: { value: string; label: string }[] = [
  { value: 'circulo_a', label: 'Círculo A' },
  { value: 'ex_clientes', label: 'Ex clientes' },
  { value: 'referidor', label: 'Referidor' },
  { value: 'comprador', label: 'Comprador' },
  { value: 'redes', label: 'Redes sociales' },
  { value: 'guardia', label: 'Guardia' },
  { value: 'farming', label: 'Farming' },
  { value: 'dueno_vende', label: 'Dueño vende' },
];

export const SOURCE_LABEL: Record<string, string> = Object.fromEntries(
  PRELISTING_SOURCES.map((s) => [s.value, s.label]),
);

export const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export const DEFAULT_WEIGHTS = [0.0458, 0.0507, 0.0669, 0.0683, 0.0775, 0.0686, 0.0814, 0.0924, 0.1036, 0.1052, 0.1159, 0.1237];

export function defaultGoal(year: number): Omit<Goal, 'id'> {
  return {
    year,
    annual_target: 4000,
    commission_per_deal: 2000,
    sides_per_deal: 1,
    monthly_rotation: 0.05,
    prelistings_per_listing: 4,
    contacts_per_deal: 14.91,
    working_weeks: 48,
    agent_split: 0.5,
    monthly_weights: [...DEFAULT_WEIGHTS],
  };
}
