import { useEffect, useState } from 'react';
import { today } from './dates';

/** Fecha de hoy que se actualiza sola al pasar la medianoche o al volver a la app. */
export function useToday(): string {
  const [t, setT] = useState(today);
  useEffect(() => {
    const tick = () => setT(today());
    const id = window.setInterval(tick, 60_000);
    document.addEventListener('visibilitychange', tick);
    window.addEventListener('focus', tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
      window.removeEventListener('focus', tick);
    };
  }, []);
  return t;
}
