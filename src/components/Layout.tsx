import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useStore } from '../lib/store';
import { Icon, type IconName } from './Icon';
import { useActivityEditor } from './ActivityEditor';

const NAV: { to: string; label: string; icon: IconName }[] = [
  { to: '/', label: 'Hoy', icon: 'home' },
  { to: '/actividades', label: 'Actividades', icon: 'calendar' },
  { to: '/contactos', label: 'Contactos', icon: 'users' },
  { to: '/metricas', label: 'Métricas', icon: 'chart' },
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
  const [demoHidden, setDemoHidden] = useState(() => {
    try {
      return sessionStorage.getItem('rsmonitor-demo-banner') === '0';
    } catch {
      return false;
    }
  });
  const hideDemo = () => {
    setDemoHidden(true);
    try {
      sessionStorage.setItem('rsmonitor-demo-banner', '0');
    } catch {
      /* sin almacenamiento: se oculta hasta recargar */
    }
  };

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

      <header className="shellbar">
        <Brand />
        <span className="shell-title" aria-hidden="true">
          Gestión comercial
        </span>
        <div className="shell-actions">
          <button type="button" className="btn btn-primary shell-register" onClick={() => openEditor()}>
            <Icon name="plus" />
            Registrar actividad
          </button>
          <span className="shell-user" title={mode === 'demo' ? 'Modo demo (datos en este dispositivo)' : userEmail ?? ''}>
            <span className="avatar" aria-hidden="true">
              {(mode === 'demo' ? 'D' : (userEmail ?? '?').charAt(0)).toUpperCase()}
            </span>
            <span className="shell-user-name">{mode === 'demo' ? 'Modo demo' : userEmail}</span>
          </span>
          <button type="button" className="btn btn-ghost btn-icon shell-icon" onClick={signOut} aria-label={mode === 'demo' ? 'Salir del demo' : 'Cerrar sesión'} title={mode === 'demo' ? 'Salir del demo' : 'Cerrar sesión'}>
            <Icon name="logout" />
          </button>
        </div>
      </header>

      <aside className="sidebar">
        <nav aria-label="Principal">{navLinks}</nav>
      </aside>

      <div className="content">
        <main id="contenido" className="main" tabIndex={-1}>
          {mode === 'demo' && !demoHidden && (
            <p className="banner banner-compact small">
              <span>
                <strong>Modo demo</strong>: los datos quedan solo en este navegador.
              </span>
              <button type="button" className="btn btn-ghost btn-sm" onClick={hideDemo} aria-label="Ocultar aviso de modo demo">
                Ocultar
              </button>
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
