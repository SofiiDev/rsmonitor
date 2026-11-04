import { useEffect, useState, type FormEvent } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { StoreProvider, useStore } from './lib/store';
import { supabase } from './lib/backend';
import { ToastProvider, useToast } from './components/Toast';
import { ActivityEditorProvider } from './components/ActivityEditor';
import { Layout } from './components/Layout';
import { Sheet } from './components/Sheet';
import { TextField } from './components/Fields';
import { Login } from './pages/Login';
import { Today } from './pages/Today';
import { Activities } from './pages/Activities';
import { Contacts } from './pages/Contacts';
import { ContactDetail } from './pages/ContactDetail';
import { Goals } from './pages/Goals';

function Shell() {
  const { mode } = useStore();

  if (mode === 'loading') {
    return (
      <div className="loading" role="status">
        Cargando…
      </div>
    );
  }
  if (mode === 'signed-out') return <Login />;

  return (
    <ActivityEditorProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Today />} />
          <Route path="actividades" element={<Activities />} />
          <Route path="contactos" element={<Contacts />} />
          <Route path="contactos/:id" element={<ContactDetail />} />
          <Route path="objetivos" element={<Goals />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
      <PasswordRecovery />
    </ActivityEditorProvider>
  );
}

/** Al volver desde el email de "olvidé mi contraseña", pide la nueva. */
function PasswordRecovery() {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    if (!supabase) return;
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setOpen(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    const { error: err } = await supabase.auth.updateUser({ password });
    if (err) {
      setError(err.message);
      return;
    }
    setOpen(false);
    toast('Contraseña actualizada');
  }

  return (
    <Sheet open={open} title="Elegí una nueva contraseña" onClose={() => setOpen(false)}>
      <form className="form" onSubmit={submit}>
        <TextField label="Nueva contraseña" type="password" autoComplete="new-password" required value={password} onChange={setPassword} error={error} hint="Mínimo 6 caracteres." />
        <div className="form-actions">
          <button type="submit" className="btn btn-primary">
            Guardar
          </button>
        </div>
      </form>
    </Sheet>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <StoreProvider>
          <Shell />
        </StoreProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
