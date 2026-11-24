import type { Contact } from '../lib/types';
import { completeness } from '../lib/checklist';

/** Checklist de datos básicos: lo que falta lleva directo a la pestaña de la ficha donde se carga. */
export function ContactChecklist({ contact, onComplete }: { contact: Contact; onComplete: (tab: string) => void }) {
  const { items, done, total, pct, missing } = completeness(contact);
  return (
    <section className="stat checklist" aria-labelledby="checklist-title">
      <div className="spread">
        <h2 id="checklist-title" className="stat-label">
          Datos del contacto
        </h2>
        <span className={`badge ${pct === 100 ? 'badge-success' : pct < 50 ? 'badge-warning' : ''}`}>
          {done}/{total}
        </span>
      </div>
      <div className="meter" role="progressbar" aria-label="Datos completos" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done} aria-valuetext={`${done} de ${total} datos`}>
        <span style={{ width: `${pct}%` }} />
      </div>
      {missing.length === 0 ? (
        <p className="small muted">Ficha completa.</p>
      ) : (
        <>
          <p className="small">
            <strong>Pendientes:</strong> tocá uno para completarlo.
          </p>
          <ul className="check-list">
            {items.map((i) =>
              i.done ? (
                <li key={i.key} className="check-item is-done">
                  <span aria-hidden="true">✓</span>
                  <span>{i.label}</span>
                  <span className="visually-hidden"> (completo)</span>
                </li>
              ) : (
                <li key={i.key} className="check-item">
                  <button type="button" className="check-btn" onClick={() => onComplete(i.tab)}>
                    <span aria-hidden="true">○</span>
                    <span>{i.label}</span>
                    <span className="visually-hidden"> (falta: completar)</span>
                  </button>
                </li>
              ),
            )}
          </ul>
        </>
      )}
    </section>
  );
}
