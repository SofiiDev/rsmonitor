import type { Activity, Contact } from './types';
import { today } from './dates';

export function emptyContact(): Omit<Contact, 'id'> {
  return {
    full_name: '', phone: null, email: null, birthday: null, neighborhood: null, social: null,
    preferred_channel: null, agent: null, source: null, referred_by: null, joined_on: today(),
    level: null, bond_type: null, contact_frequency: null, relationship_status: null, bond_quality: null,
    next_action: null, next_action_date: null, next_action_reason: null, related_people: null, do_not_contact: false,
    occupation: null, company: null, family_status: null, is_parent: null, children: null, has_pets: null, pets: null, football_team: null,
    hobbies: null, places: null, important_dates: null, family_dates: [], values_notes: null,
    opportunity_status: null, operation_type: null, role: null, property_type: null, area_of_interest: null,
    budget: null, timeframe: null, motivation: null, desire: null, need: null, possibility: null,
    urgency: null, probability: null, obstacles: null, has_property_to_sell: null, needs_financing: null,
    other_deciders: null, competition: null, notes: null,
  };
}

export function emptyActivity(partial: Partial<Activity> = {}): Omit<Activity, 'id'> {
  return {
    date: today(), time: null, done: true, type: 'contacto', source: null, operation: null, contact_id: null, title: '',
    channel: null, result: null, conversation_status: null, amount: null,
    next_action: null, next_action_date: null, notes: null, ...partial,
  };
}
