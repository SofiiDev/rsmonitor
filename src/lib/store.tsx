import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { demoBackend, supabase, supabaseBackend, type Backend } from './backend';
import type { Activity, Contact, ContactEvent, Expense, Goal, TableMap, TableName } from './types';
import { contactChanges, type ChangeReason } from './history';

type Data = {
  contacts: Contact[];
  activities: Activity[];
  goals: Goal[];
  expenses: Expense[];
  contact_events: ContactEvent[];
};

const EMPTY: Data = { contacts: [], activities: [], goals: [], expenses: [], contact_events: [] };

interface StoreValue extends Data {
  mode: 'loading' | 'signed-out' | 'supabase' | 'demo';
  userEmail: string | null;
  loading: boolean;
  error: string | null;
  startDemo: () => void;
  signOut: () => Promise<void>;
  reload: () => Promise<void>;
  create: <T extends TableName>(table: T, row: Partial<TableMap[T]>) => Promise<TableMap[T]>;
  save: <T extends TableName>(table: T, id: string, patch: Partial<TableMap[T]>, meta?: { reason?: ChangeReason }) => Promise<TableMap[T]>;
  remove: (table: TableName, id: string) => Promise<void>;
}

const StoreContext = createContext<StoreValue | null>(null);

const DEMO_FLAG = 'rsmonitor-demo-active';

function readableError(e: unknown): string {
  if (e && typeof e === 'object' && 'message' in e) return String((e as { message: unknown }).message);
  return 'Ocurrió un error inesperado.';
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(!supabase);
  const [demo, setDemo] = useState(() => {
    try {
      return localStorage.getItem(DEMO_FLAG) === '1';
    } catch {
      return false;
    }
  });
  const [data, setData] = useState<Data>(EMPTY);
  const dataRef = useRef(data);
  dataRef.current = data;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data: d }) => {
      setSession(d.session);
      setAuthReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const backend: Backend | null = useMemo(() => {
    if (session && supabase) return supabaseBackend(supabase);
    if (demo) return demoBackend();
    return null;
  }, [session, demo]);

  const reload = useCallback(async () => {
    if (!backend) {
      setData(EMPTY);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [contacts, activities, goals, expenses, contact_events] = await Promise.all([
        backend.list('contacts'),
        backend.list('activities'),
        backend.list('goals'),
        backend.list('expenses'),
        // Si todavía no se corrió la migración del historial, la app sigue funcionando sin él.
        backend.list('contact_events').catch(() => [] as ContactEvent[]),
      ]);
      contacts.sort((a, b) => a.full_name.localeCompare(b.full_name, 'es'));
      setData({ contacts, activities, goals, expenses, contact_events });
    } catch (e) {
      setError(readableError(e));
    } finally {
      setLoading(false);
    }
  }, [backend]);

  useEffect(() => {
    reload();
  }, [reload]);

  const requireBackend = useCallback(() => {
    if (!backend) throw new Error('Tenés que iniciar sesión.');
    return backend;
  }, [backend]);

  /** Guarda eventos del historial sin bloquear la acción principal si fallan. */
  const logEvents = useCallback(
    async (events: Omit<ContactEvent, 'id'>[]) => {
      if (!backend || events.length === 0) return;
      for (const e of events) {
        try {
          const saved = await backend.insert('contact_events', e);
          setData((d) => ({ ...d, contact_events: [saved, ...d.contact_events] }));
        } catch (err) {
          console.warn('No se pudo registrar en el historial', err);
        }
      }
    },
    [backend],
  );

  const create = useCallback(
    async <T extends TableName>(table: T, row: Partial<TableMap[T]>) => {
      const saved = await requireBackend().insert(table, row);
      setData((d) => {
        const rows = [...(d[table] as TableMap[T][]), saved];
        if (table === 'contacts') (rows as Contact[]).sort((a, b) => a.full_name.localeCompare(b.full_name, 'es'));
        return { ...d, [table]: rows };
      });
      if (table === 'contacts') await logEvents(contactChanges(undefined, saved as Contact));
      return saved;
    },
    [requireBackend, logEvents],
  );

  const save = useCallback(
    async <T extends TableName>(table: T, id: string, patch: Partial<TableMap[T]>, meta?: { reason?: ChangeReason }) => {
      const prev = table === 'contacts' ? dataRef.current.contacts.find((c) => c.id === id) : undefined;
      const saved = await requireBackend().update(table, id, patch);
      setData((d) => ({
        ...d,
        [table]: (d[table] as { id: string }[]).map((r) => (r.id === id ? saved : r)),
      }));
      if (table === 'contacts') await logEvents(contactChanges(prev, saved as Contact, meta?.reason));
      return saved;
    },
    [requireBackend, logEvents],
  );

  const remove = useCallback(
    async (table: TableName, id: string) => {
      const act = table === 'activities' ? dataRef.current.activities.find((a) => a.id === id) : undefined;
      await requireBackend().remove(table, id);
      if (act?.contact_id) await logEvents([{ contact_id: act.contact_id, kind: 'actividad_eliminada', detail: `${act.title} (${act.date})` }]);
      setData((d) => {
        const next = { ...d, [table]: (d[table] as { id: string }[]).filter((r) => r.id !== id) } as Data;
        if (table === 'contacts') {
          next.activities = next.activities.map((a) => (a.contact_id === id ? { ...a, contact_id: null } : a));
          next.contact_events = next.contact_events.filter((e) => e.contact_id !== id);
        }
        return next;
      });
    },
    [requireBackend, logEvents],
  );

  const startDemo = useCallback(() => {
    try {
      localStorage.setItem(DEMO_FLAG, '1');
    } catch {
      /* sin almacenamiento: el demo dura lo que dure la pestaña */
    }
    setDemo(true);
  }, []);

  const signOut = useCallback(async () => {
    if (session && supabase) await supabase.auth.signOut();
    try {
      localStorage.removeItem(DEMO_FLAG);
    } catch {
      /* ignorado */
    }
    setDemo(false);
    setSession(null);
  }, [session]);

  const mode: StoreValue['mode'] = !authReady ? 'loading' : session ? 'supabase' : demo ? 'demo' : 'signed-out';

  const value: StoreValue = {
    ...data,
    mode,
    userEmail: session?.user.email ?? null,
    loading,
    error,
    startDemo,
    signOut,
    reload,
    create,
    save,
    remove,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore debe usarse dentro de StoreProvider');
  return ctx;
}
