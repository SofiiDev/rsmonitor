import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { demoBackend, supabase, supabaseBackend, type Backend } from './backend';
import type { Activity, Contact, Expense, Goal, TableMap, TableName } from './types';

type Data = {
  contacts: Contact[];
  activities: Activity[];
  goals: Goal[];
  expenses: Expense[];
};

const EMPTY: Data = { contacts: [], activities: [], goals: [], expenses: [] };

interface StoreValue extends Data {
  mode: 'loading' | 'signed-out' | 'supabase' | 'demo';
  userEmail: string | null;
  loading: boolean;
  error: string | null;
  startDemo: () => void;
  signOut: () => Promise<void>;
  reload: () => Promise<void>;
  create: <T extends TableName>(table: T, row: Partial<TableMap[T]>) => Promise<TableMap[T]>;
  save: <T extends TableName>(table: T, id: string, patch: Partial<TableMap[T]>) => Promise<TableMap[T]>;
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
      const [contacts, activities, goals, expenses] = await Promise.all([
        backend.list('contacts'),
        backend.list('activities'),
        backend.list('goals'),
        backend.list('expenses'),
      ]);
      contacts.sort((a, b) => a.full_name.localeCompare(b.full_name, 'es'));
      setData({ contacts, activities, goals, expenses });
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

  const create = useCallback(
    async <T extends TableName>(table: T, row: Partial<TableMap[T]>) => {
      const saved = await requireBackend().insert(table, row);
      setData((d) => {
        const rows = [...(d[table] as TableMap[T][]), saved];
        if (table === 'contacts') (rows as Contact[]).sort((a, b) => a.full_name.localeCompare(b.full_name, 'es'));
        return { ...d, [table]: rows };
      });
      return saved;
    },
    [requireBackend],
  );

  const save = useCallback(
    async <T extends TableName>(table: T, id: string, patch: Partial<TableMap[T]>) => {
      const saved = await requireBackend().update(table, id, patch);
      setData((d) => ({
        ...d,
        [table]: (d[table] as { id: string }[]).map((r) => (r.id === id ? saved : r)),
      }));
      return saved;
    },
    [requireBackend],
  );

  const remove = useCallback(
    async (table: TableName, id: string) => {
      await requireBackend().remove(table, id);
      setData((d) => {
        const next = { ...d, [table]: (d[table] as { id: string }[]).filter((r) => r.id !== id) } as Data;
        if (table === 'contacts') {
          next.activities = next.activities.map((a) => (a.contact_id === id ? { ...a, contact_id: null } : a));
        }
        return next;
      });
    },
    [requireBackend],
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
