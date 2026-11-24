export type Level = 'A' | 'B' | 'C' | 'D';

export type ActivityType =
  // negocio (verde)
  | 'contacto'
  | 'reunion_cliente'
  | 'prelisting'
  | 'acm'
  | 'captacion'
  | 'visita'
  | 'cierre'
  | 'farming'
  // administrativa (amarillo)
  | 'reunion'
  | 'admin'
  | 'otra'
  // personal (rojo)
  | 'personal';

export type Category = 'negocio' | 'administrativa' | 'personal';

export type Operation = 'venta' | 'compra' | 'alquiler';

export interface Contact {
  id: string;
  user_id?: string;
  created_at?: string;
  updated_at?: string;

  full_name: string;
  phone: string | null;
  email: string | null;
  birthday: string | null;
  neighborhood: string | null;
  social: string | null;
  preferred_channel: string | null;
  agent: string | null;
  source: string | null;
  referred_by: string | null;
  joined_on: string | null;

  level: Level | null;
  bond_type: string | null;
  contact_frequency: string | null;
  relationship_status: string | null;
  bond_quality: string | null;
  next_action: string | null;
  next_action_date: string | null;
  next_action_reason: string | null;
  related_people: string | null;
  /** Vínculos con otros contactos de la base (requiere la migración 006). */
  related_contacts?: { id: string; relation: string }[];
  do_not_contact: boolean;

  occupation: string | null;
  company: string | null;
  family_status: string | null;
  is_parent: boolean | null;
  children: string | null;
  has_pets: boolean | null;
  pets: string | null;
  football_team: string | null;
  hobbies: string | null;
  places: string | null;
  important_dates: string | null;
  family_dates: FamilyDate[];
  values_notes: string | null;

  opportunity_status: string | null;
  operation_type: string | null;
  role: string | null;
  property_type: string | null;
  area_of_interest: string | null;
  budget: string | null;
  timeframe: string | null;
  motivation: string | null;
  desire: string | null;
  need: string | null;
  possibility: string | null;
  urgency: string | null;
  probability: string | null;
  obstacles: string | null;
  has_property_to_sell: boolean | null;
  needs_financing: boolean | null;
  other_deciders: string | null;
  competition: string | null;

  notes: string | null;
}

/** Cumpleaños u otra fecha de alguien cercano al contacto (hijos, pareja, padres…). */
export interface FamilyDate {
  name: string;          // "Alma"
  relation: string;      // "hija", "esposo", "mamá"
  date: string;          // 'YYYY-MM-DD' (si no sabés el año, poné cualquiera: se usa día y mes)
  kind: 'cumpleanos' | 'aniversario' | 'otra';
}

export interface Activity {
  id: string;
  user_id?: string;
  created_at?: string;
  updated_at?: string;

  date: string;
  time: string | null;        // 'HH:MM' (Supabase puede devolver 'HH:MM:SS')
  done: boolean;              // false = pendiente / agendada
  type: ActivityType;
  source: string | null;
  operation: Operation | null;
  contact_id: string | null;
  title: string;
  channel: string | null;
  result: string | null;
  conversation_status: string | null;
  amount: number | null;
  next_action: string | null;
  next_action_date: string | null;
  notes: string | null;
}

export type ContactEventKind =
  | 'creado'
  | 'recontacto_programado'
  | 'recontacto_reprogramado'
  | 'recontacto_completado'
  | 'recontacto_cancelado'
  | 'nivel'
  | 'oportunidad'
  | 'estado_relacion'
  | 'no_contactar'
  | 'actividad_eliminada'
  | 'nota';

/** Registro automático de lo que pasa con un contacto (complementa sus actividades). */
export interface ContactEvent {
  id: string;
  user_id?: string;
  created_at?: string;
  contact_id: string;
  kind: ContactEventKind;
  detail: string | null;
}

export interface Goal {
  id: string;
  user_id?: string;
  year: number;
  annual_target: number;
  commission_per_deal: number;
  sides_per_deal: number;
  monthly_rotation: number;
  prelistings_per_listing: number;
  contacts_per_deal: number;
  working_weeks: number;
  agent_split: number;
  monthly_weights: number[];
}

export interface Expense {
  id: string;
  user_id?: string;
  year: number;
  name: string;
  monthly_amount: number;
}

export interface TableMap {
  contacts: Contact;
  activities: Activity;
  goals: Goal;
  expenses: Expense;
  contact_events: ContactEvent;
}

export type TableName = keyof TableMap;
