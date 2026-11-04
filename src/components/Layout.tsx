import { useEffect, useRef, type ReactNode } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useStore } from '../lib/store';
import { Icon, type IconName } from './Icon';
import { useActivityEditor } from './ActivityEditor';

const NAV: { to: string; label: string; icon: IconName }[] = [
  { to: '/', label: 'Hoy', icon: 'home' },
  { to: '/actividades', label: 'Actividades', icon: 'calendar' },
  { to: '/contactos', label: 'Contactos', icon: 'users' },
  { to: '/objetivos', label: 'Objetivos', icon: 'target' },
];

function Brand() {
  return (
    <Link to="/" className="brand">
      <span className="brand-mark" aria-hidden="true">
        RS
      </span>
      RS Monitor
    </Link>
  );
}

export function Layout() {
  const { mode, userEmail, signOut, error, reload } = useStore();
  const openEditor = useActivityEditor();
  const location = useLocation();
  const first = useRef(true);

  // Al cambiar de pantalla, lleva el foco al título para lectores de pantalla y teclado.
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const h1 = document.querySelector<HTMLElement>('main h1');
    h1?.focus();
    window.scrollTo(0, 0);
  }, [location.pathname]);

  const navLinks = (
    <ul>
      {NAV.map((n) => (
        <li key={n.to}>
          <NavLink to={n.to} end={n.to === '/'}>
            <Icon name={n.icon} />
            {n.label}
          </NavLink>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="app">
      <a href="#contenido" className="skip-link">
        Saltar al contenido
      </a>

      <aside className="sidebar">
        <Brand />
        <button type="button" className="btn btn-primary btn-block" onClick={() => openEditor()}>
          <Icon name="plus" />
          Registrar actividad
        </button>
        <nav aria-label="Principal">{navLinks}</nav>
        <div className="sidebar-footer">
          <span>{mode === 'demo' ? 'Modo demo (datos en este dispositivo)' : userEmail}</span>
          <button type="button" className="btn" onClick={signOut}>
            <Icon name="logout" />
            {mode === 'demo' ? 'Salir del demo' : 'Cerrar sesión'}
          </button>
        </div>
      </aside>

      <div>
        <header className="topbar">
          <Brand />
          <button type="button" className="btn btn-ghost btn-icon" onClick={signOut} aria-label={mode === 'demo' ? 'Salir del demo' : 'Cerrar sesión'}>
            <Icon name="logout" />
          </button>
        </header>

        <main id="contenido" className="main" tabIndex={-1}>
          {mode === 'demo' && (
            <p className="banner small" style={{ marginBottom: 16 }}>
              Estás en <strong>modo demo</strong>: los datos se guardan solo en este navegador. Configurá Supabase para usar la app en todos tus dispositivos.
            </p>
          )}
          {error && (
            <div className="banner banner-error spread" role="alert" style={{ marginBottom: 16 }}>
              <span>No se pudieron cargar los datos: {error}</span>
              <button type="button" className="btn" onClick={reload}>
                Reintentar
              </button>
            </div>
          )}
          <Outlet />
        </main>

        <button type="button" className="btn btn-primary fab" onClick={() => openEditor()}>
          <Icon name="plus" />
          Registrar
        </button>

        <nav className="tabbar" aria-label="Principal">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.to === '/'}>
              <Icon name={n.icon} />
              {n.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  useEffect(() => {
    document.title = `${title} · RS Monitor`;
  }, [title]);
  return (
    <div className="page-header">
      <div>
        <h1 tabIndex={-1}>{title}</h1>
        {subtitle && <p className="subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="row">{actions}</div>}
    </div>
  );
}
