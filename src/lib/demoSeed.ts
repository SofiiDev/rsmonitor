import type { Activity, Contact, Expense, Goal, TableMap, TableName } from './types';
import { addDays, startOfWeek, today } from './dates';
import { defaultGoal } from './options';
import { emptyContact } from './empty';

// Datos ficticios para probar la app sin conectar Supabase.

export function demoSeed(): { [K in TableName]: TableMap[K][] } {
  const t = today();
  const monday = startOfWeek(t);
  const year = Number(t.slice(0, 4));

  const c = (id: string, data: Partial<Contact>): Contact => ({ ...emptyContact(), id, ...data });

  const contacts: Contact[] = [
    c('c1', {
      full_name: 'Lucía Romero', phone: '+54 9 11 5555-0101', level: 'A', bond_type: 'Amistad',
      contact_frequency: 'Quincenal', relationship_status: 'Activa', bond_quality: 'Cercana',
      neighborhood: 'Villa Crespo, CABA', preferred_channel: 'WhatsApp', birthday: `1988-${t.slice(5, 7)}-${String(Math.min(28, Number(t.slice(8, 10)) + 3)).padStart(2, '0')}`,
      next_action: 'Llamar para seguimiento de tasación', next_action_date: t,
      opportunity_status: 'Oportunidad detectada', operation_type: 'Venta', role: 'Propietario',
      property_type: 'Departamento 3 amb.', budget: 'USD 165.000', urgency: '3 meses', probability: 'Media',
      family_status: 'Casada', is_parent: true, children: 'Tomás (10), Julia (7)', has_pets: true, pets: 'Perro - Toby',
      family_dates: [
        { name: 'Tomás', relation: 'hijo', date: `2015-${t.slice(5, 10)}`, kind: 'cumpleanos' },
        { name: 'Julia', relation: 'hija', date: `2018-${addDays(t, 6).slice(5, 10)}`, kind: 'cumpleanos' },
      ],
    }),
    c('c2', {
      full_name: 'Martín Sosa', phone: '+54 9 11 5555-0202', level: 'B', bond_type: 'Contacto profesional',
      contact_frequency: 'Mensual', relationship_status: 'Activa', neighborhood: 'Caballito, CABA',
      next_action: 'Enviar 3 propiedades comparables', next_action_date: addDays(t, -2),
      opportunity_status: 'Conversación abierta', operation_type: 'Compra', role: 'Comprador',
    }),
    c('c3', {
      full_name: 'Carla Benítez', phone: '+54 9 11 5555-0303', level: 'C', bond_type: 'Conocido',
      contact_frequency: 'Trimestral', relationship_status: 'Nueva', neighborhood: 'Palermo, CABA',
      next_action: 'Invitar a café', next_action_date: addDays(t, 4), opportunity_status: 'Sin oportunidad',
    }),
    c('c4', {
      full_name: 'Jorge Medina', level: 'D', bond_type: 'Cliente anterior', relationship_status: 'Fría',
      contact_frequency: 'Semestral', opportunity_status: 'Sin oportunidad',
    }),
  ];

  const a = (id: string, data: Partial<Activity>): Activity => ({
    id, date: t, time: null, done: true, type: 'otra', source: null, operation: null, contact_id: null, title: '',
    channel: null, result: null, conversation_status: null, amount: null,
    next_action: null, next_action_date: null, notes: null, ...data,
  });

  const activities: Activity[] = [
    a('a1', { date: monday, type: 'reunion', title: 'Reunión de equipo en oficina' }),
    a('a2', { date: monday, type: 'contacto', contact_id: 'c1', title: 'Charla por WhatsApp', channel: 'WhatsApp', conversation_status: 'En seguimiento' }),
    a('a3', { date: addDays(monday, 1), type: 'farming', title: 'Volantes en Parque Centenario (300)' }),
    a('a10', { date: addDays(monday, 1), type: 'admin', title: 'Cargar fotos y ficha de 2 amb. Palermo' }),
    a('a11', { date: addDays(monday, 3), type: 'personal', title: 'Turno médico' }),
    a('p1', { date: t, time: '10:00', done: false, type: 'reunion_cliente', contact_id: 'c3', title: 'Café con Carla en Palermo' }),
    a('p2', { date: t, time: '15:30', done: false, type: 'visita', operation: 'venta', title: 'Visita depto Caballito con Martín', contact_id: 'c2' }),
    a('p3', { date: t, done: false, type: 'admin', title: 'Subir fotos nuevas a los portales' }),
    a('p4', { date: addDays(t, -1), done: false, type: 'personal', title: 'Pagar monotributo' }),
    a('p5', { date: addDays(t, 2), time: '11:00', done: false, type: 'prelisting', source: 'referidor', title: 'Prelisting casa Villa Urquiza' }),
    a('a12', { date: addDays(monday, 3), type: 'reunion_cliente', contact_id: 'c2', title: 'Café para ver su búsqueda' }),
    a('a13', { date: addDays(monday, 4), type: 'reunion', title: 'Reunión con coach' }),
    a('a4', { date: addDays(monday, 2), type: 'prelisting', source: 'circulo_a', contact_id: 'c1', title: 'Prelisting depto Villa Crespo' }),
    a('a5', { date: addDays(monday, -5), type: 'acm', contact_id: 'c1', title: 'ACM depto 3 amb.' }),
    a('a6', { date: addDays(monday, -6), type: 'contacto', contact_id: 'c2', title: 'Llamada por búsqueda', channel: 'Llamada' }),
    a('a7', { date: addDays(monday, -8), type: 'visita', operation: 'venta', title: 'Visita PH Almagro' }),
    a('a8', { date: addDays(monday, -20), type: 'captacion', operation: 'venta', title: 'Captación 2 amb. Palermo' }),
    a('a9', { date: addDays(monday, -40), type: 'cierre', operation: 'venta', title: 'Cierre 2 amb. Palermo', amount: 2000 }),
  ];

  const goals: Goal[] = [{ id: 'g1', ...defaultGoal(year) }];

  const expenses: Expense[] = [
    { id: 'e1', year, name: 'Avisos destacados', monthly_amount: 255 },
    { id: 'e2', year, name: 'Tour virtual', monthly_amount: 100 },
    { id: 'e3', year, name: 'Regalos a clientes', monthly_amount: 120 },
  ];

  return { contacts, activities, goals, expenses };
}
