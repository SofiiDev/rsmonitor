import { useEffect, useId, useState, type CSSProperties, type ReactNode } from 'react';

type Base = {
  label: string;
  hint?: string;
  error?: string;
  className?: string;
};

function describedBy(id: string, hint?: string, error?: string) {
  const ids = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean);
  return ids.length ? ids.join(' ') : undefined;
}

function Extra({ id, hint, error }: { id: string; hint?: string; error?: string }) {
  return (
    <>
      {hint && (
        <span id={`${id}-hint`} className="hint">
          {hint}
        </span>
      )}
      {error && (
        <span id={`${id}-error`} className="error">
          {error}
        </span>
      )}
    </>
  );
}

export function TextField({
  label,
  hint,
  error,
  className,
  value,
  onChange,
  type = 'text',
  required,
  autoComplete,
  inputMode,
  placeholder,
  min,
  step,
  autoFocus,
}: Base & {
  value: string | number | null | undefined;
  onChange: (v: string) => void;
  type?: 'text' | 'email' | 'tel' | 'date' | 'time' | 'number' | 'password' | 'search' | 'url';
  required?: boolean;
  autoComplete?: string;
  inputMode?: 'text' | 'numeric' | 'decimal' | 'tel' | 'email' | 'search';
  placeholder?: string;
  min?: number;
  step?: number | 'any';
  autoFocus?: boolean;
}) {
  const id = useId();
  return (
    <div className={`field ${className ?? ''}`}>
      <label htmlFor={id}>
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </label>
      <input
        id={id}
        type={type}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        autoComplete={autoComplete}
        inputMode={inputMode}
        placeholder={placeholder}
        min={min}
        step={step}
        autoFocus={autoFocus}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
      />
      <Extra id={id} hint={hint} error={error} />
    </div>
  );
}

export function TextArea({
  label,
  hint,
  className,
  value,
  onChange,
  rows = 3,
}: Base & { value: string | null | undefined; onChange: (v: string) => void; rows?: number }) {
  const id = useId();
  return (
    <div className={`field ${className ?? ''}`}>
      <label htmlFor={id}>{label}</label>
      <textarea id={id} rows={rows} value={value ?? ''} onChange={(e) => onChange(e.target.value)} aria-describedby={describedBy(id, hint)} />
      <Extra id={id} hint={hint} />
    </div>
  );
}

export function SelectField({
  label,
  hint,
  className,
  value,
  onChange,
  options,
  placeholder = 'Sin definir',
  required,
}: Base & {
  value: string | null | undefined;
  onChange: (v: string) => void;
  options: (string | { value: string; label: string })[];
  placeholder?: string;
  required?: boolean;
}) {
  const id = useId();
  const opts = options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o));
  // Conserva valores que no están en la lista (p. ej. importados de la planilla).
  if (value && !opts.some((o) => o.value === value)) opts.push({ value, label: value });
  return (
    <div className={`field ${className ?? ''}`}>
      <label htmlFor={id}>
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </label>
      <select id={id} value={value ?? ''} onChange={(e) => onChange(e.target.value)} required={required} aria-describedby={describedBy(id, hint)}>
        {!required && <option value="">{placeholder}</option>}
        {opts.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <Extra id={id} hint={hint} />
    </div>
  );
}

/** Opción única visible como "chips" (radio buttons accesibles). */
export function ChipGroup<T extends string>({
  legend,
  name,
  value,
  onChange,
  options,
  className,
}: {
  legend: string;
  name: string;
  value: T | null;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  className?: string;
}) {
  return (
    <fieldset className={className}>
      <legend>{legend}</legend>
      <div className="chips">
        {options.map((o) => (
          <label key={o.value} className="chip">
            <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} />
            <span>{o.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function TriState({
  label,
  value,
  onChange,
  className,
}: {
  label: string;
  value: boolean | null;
  onChange: (v: boolean | null) => void;
  className?: string;
}) {
  return (
    <SelectField
      label={label}
      className={className}
      value={value === null ? '' : value ? 'si' : 'no'}
      onChange={(v) => onChange(v === '' ? null : v === 'si')}
      options={[
        { value: 'si', label: 'Sí' },
        { value: 'no', label: 'No' },
      ]}
    />
  );
}

export function Section({ title, open, children }: { title: string; open?: boolean; children: ReactNode }) {
  return (
    <details className="form-section" open={open}>
      <summary>{title}</summary>
      <div className="form-grid">{children}</div>
    </details>
  );
}

const toText = (n: number | null | undefined) =>
  n === null || n === undefined || !Number.isFinite(n) ? '' : String(Math.round(n * 10000) / 10000).replace('.', ',');

export const parseDecimal = (s: string): number | null => {
  const clean = s.trim().replace(/\s/g, '').replace(',', '.');
  if (clean === '') return null;
  const n = Number(clean);
  return Number.isFinite(n) ? n : null;
};

/** Campo numérico que acepta coma decimal (es-AR) y no muestra flechitas. */
export function DecimalInput({
  value,
  onChange,
  onCommit,
  ...rest
}: {
  value: number | null | undefined;
  onChange?: (n: number | null) => void;
  onCommit?: (n: number | null) => void;
  id?: string;
  style?: CSSProperties;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
}) {
  const [text, setText] = useState(toText(value));
  useEffect(() => {
    if (parseDecimal(text) !== (value ?? null)) setText(toText(value));
  }, [value]);
  return (
    <input
      {...rest}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        onChange?.(parseDecimal(e.target.value));
      }}
      onBlur={() => onCommit?.(parseDecimal(text))}
    />
  );
}

export function DecimalField({
  label,
  hint,
  className,
  value,
  onChange,
}: Base & { value: number | null | undefined; onChange: (n: number | null) => void }) {
  const id = useId();
  return (
    <div className={`field ${className ?? ''}`}>
      <label htmlFor={id}>{label}</label>
      <DecimalInput id={id} value={value} onChange={onChange} aria-describedby={describedBy(id, hint)} />
      <Extra id={id} hint={hint} />
    </div>
  );
}
