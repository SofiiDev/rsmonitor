import { addDays, addMonths, formatShort } from '../lib/dates';
import { TextField } from './Fields';

const SHORTCUTS: { label: string; add: (d: string) => string }[] = [
  { label: '1 semana', add: (d) => addDays(d, 7) },
  { label: '2 semanas', add: (d) => addDays(d, 14) },
  { label: '1 mes', add: (d) => addMonths(d, 1) },
  { label: '2 meses', add: (d) => addMonths(d, 2) },
  { label: '3 meses', add: (d) => addMonths(d, 3) },
];

/** Fecha de próxima acción con atajos que la completan a partir de `base`. */
export function NextActionDate({
  value,
  onChange,
  base,
  baseLabel,
  className,
}: {
  value: string | null;
  onChange: (v: string | null) => void;
  base: string;
  baseLabel: string; // "de la actividad" / "de hoy"
  className?: string;
}) {
  return (
    <div className={`stack-sm ${className ?? ''}`}>
      <TextField
        label="Fecha de próxima acción"
        type="date"
        value={value}
        onChange={(v) => onChange(v.trim() === '' ? null : v)}
      />
      <div className="row" role="group" aria-label={`Plazos para la próxima acción, contando desde la fecha ${baseLabel}`}>
        {SHORTCUTS.map((s) => {
          const date = s.add(base);
          return (
            <button
              key={s.label}
              type="button"
              className={`btn btn-sm ${value === date ? 'btn-primary' : ''}`}
              aria-pressed={value === date}
              onClick={() => onChange(date)}
              title={formatShort(date)}
            >
              {s.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
