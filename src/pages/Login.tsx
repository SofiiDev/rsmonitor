import { useEffect, useState, type FormEvent } from 'react';
import { isSupabaseConfigured, supabase } from '../lib/backend';
import { useStore } from '../lib/store';
import { TextField } from '../components/Fields';

type Mode = 'signin' | 'signup' | 'reset';

const TITLES: Record<Mode, string> = {
  signin: 'Iniciar sesión',
  signup: 'Crear cuenta',
  reset: 'Recuperar contraseña',
};

export function Login() {
  const { startDemo } = useStore();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    document.title = `${TITLES[mode]} · RS Monitor`;
  }, [mode]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      if (mode === 'signin') {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
      } else if (mode === 'signup') {
        const { data, error: err } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + import.meta.env.BASE_URL },
        });
        if (err) throw err;
        if (!data.session) setInfo('Te enviamos un email para confirmar tu cuenta. Abrilo y después iniciá sesión.');
      } else {
        const { error: err } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + import.meta.env.BASE_URL });
        if (err) throw err;
        setInfo('Si el email está registrado, vas a recibir un enlace para cambiar la contraseña.');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      setError(msg === 'Invalid login credentials' ? 'Email o contraseña incorrectos.' : msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth">
      <div className="card stack">
        <div className="stack-sm">
          <span className="brand">
            <span className="brand-mark" aria-hidden="true">
              RS
            </span>
            RS Monitor
          </span>
          <h1>{TITLES[mode]}</h1>
          <p className="muted">Seguimiento de actividades, contactos y objetivos para tu negocio inmobiliario.</p>
        </div>

        {isSupabaseConfigured ? (
          <form className="form" onSubmit={onSubmit}>
            {error && (
              <p className="banner banner-error" role="alert">
                {error}
              </p>
            )}
            {info && (
              <p className="banner" role="status">
                {info}
              </p>
            )}
            <TextField label="Email" type="email" autoComplete="email" inputMode="email" required value={email} onChange={setEmail} />
            {mode !== 'reset' && (
              <TextField
                label="Contraseña"
                type="password"
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                required
                value={password}
                onChange={setPassword}
                hint={mode === 'signup' ? 'Mínimo 6 caracteres.' : undefined}
              />
            )}
            <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
              {busy ? 'Un momento…' : mode === 'signin' ? 'Entrar' : mode === 'signup' ? 'Crear cuenta' : 'Enviar enlace'}
            </button>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              {mode === 'signin' ? (
                <>
                  <button type="button" className="btn btn-ghost" onClick={() => setMode('signup')}>
                    Crear cuenta
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={() => setMode('reset')}>
                    Olvidé mi contraseña
                  </button>
                </>
              ) : (
                <button type="button" className="btn btn-ghost" onClick={() => setMode('signin')}>
                  Volver a iniciar sesión
                </button>
              )}
            </div>
          </form>
        ) : (
          <div className="stack">
            <p className="banner">
              Falta configurar Supabase. Cargá <code>VITE_SUPABASE_URL</code> y <code>VITE_SUPABASE_ANON_KEY</code> (ver README) para sincronizar entre computadora y teléfono.
            </p>
            <button type="button" className="btn btn-primary btn-block" onClick={startDemo}>
              Probar en modo demo
            </button>
            <p className="muted small">El modo demo guarda los datos solo en este navegador.</p>
          </div>
        )}
      </div>
    </main>
  );
}
