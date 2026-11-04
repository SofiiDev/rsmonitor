import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { TableMap, TableName } from './types';
import { demoSeed } from './demoSeed';

/** Interfaz común: Supabase en producción, localStorage en modo demo. */
export interface Backend {
  kind: 'supabase' | 'demo';
  list<T extends TableName>(table: T): Promise<TableMap[T][]>;
  insert<T extends TableName>(table: T, row: Partial<TableMap[T]>): Promise<TableMap[T]>;
  update<T extends TableName>(table: T, id: string, patch: Partial<TableMap[T]>): Promise<TableMap[T]>;
  remove(table: TableName, id: string): Promise<void>;
}

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabase: SupabaseClient | null =
  url && anonKey ? createClient(url, anonKey, { auth: { persistSession: true, autoRefreshToken: true } }) : null;

export const isSupabaseConfigured = supabase !== null;

const ORDER: Record<TableName, { column: string; ascending: boolean }> = {
  contacts: { column: 'full_name', ascending: true },
  activities: { column: 'date', ascending: false },
  goals: { column: 'year', ascending: true },
  expenses: { column: 'created_at', ascending: true },
};

const PAGE = 1000;

export function supabaseBackend(client: SupabaseClient): Backend {
  return {
    kind: 'supabase',
    async list(table) {
      const rows: unknown[] = [];
      const { column, ascending } = ORDER[table];
      // Supabase devuelve como máximo 1000 filas por consulta: paginamos.
      for (let from = 0; ; from += PAGE) {
        const { data, error } = await client
          .from(table)
          .select('*')
          .order(column, { ascending })
          .order('id')
          .range(from, from + PAGE - 1);
        if (error) throw error;
        rows.push(...(data ?? []));
        if (!data || data.length < PAGE) break;
      }
      return rows as never;
    },
    async insert(table, row) {
      const { data, error } = await client.from(table).insert(row).select().single();
      if (error) throw error;
      return data as never;
    },
    async update(table, id, patch) {
      const { data, error } = await client.from(table).update(patch).eq('id', id).select().single();
      if (error) throw error;
      return data as never;
    },
    async remove(table, id) {
      const { error } = await client.from(table).delete().eq('id', id);
      if (error) throw error;
    },
  };
}

// ───────────────────────── Modo demo (localStorage) ─────────────────────────

const DEMO_KEY = 'rsmonitor-demo-v1';
type DemoDB = { [K in TableName]: TableMap[K][] };

function readDemo(): DemoDB {
  try {
    const raw = localStorage.getItem(DEMO_KEY);
    if (raw) return JSON.parse(raw) as DemoDB;
  } catch {
    /* almacenamiento no disponible: usamos datos de ejemplo en memoria */
  }
  return demoSeed();
}

let memory: DemoDB | null = null;

function db(): DemoDB {
  if (!memory) memory = readDemo();
  return memory;
}

function persist() {
  try {
    localStorage.setItem(DEMO_KEY, JSON.stringify(db()));
  } catch {
    /* ignorado: el demo sigue funcionando en memoria */
  }
}

export function resetDemo() {
  memory = demoSeed();
  persist();
}

export function demoBackend(): Backend {
  return {
    kind: 'demo',
    async list(table) {
      return [...db()[table]] as never;
    },
    async insert(table, row) {
      const now = new Date().toISOString();
      const full = { ...row, id: crypto.randomUUID(), created_at: now, updated_at: now };
      (db()[table] as unknown[]).push(full);
      persist();
      return full as never;
    },
    async update(table, id, patch) {
      const rows = db()[table] as { id: string }[];
      const i = rows.findIndex((r) => r.id === id);
      if (i < 0) throw new Error('No se encontró el registro.');
      rows[i] = { ...rows[i], ...patch, updated_at: new Date().toISOString() } as never;
      persist();
      return rows[i] as never;
    },
    async remove(table, id) {
      const t = db()[table] as { id: string }[];
      (db() as Record<string, unknown>)[table] = t.filter((r) => r.id !== id);
      if (table === 'contacts') {
        db().activities.forEach((a) => {
          if (a.contact_id === id) a.contact_id = null;
        });
      }
      persist();
    },
  };
}
