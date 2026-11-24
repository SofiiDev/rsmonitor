import { useState, type KeyboardEvent } from 'react';
import { TAG_SUGGESTIONS } from '../lib/options';

/** Etiquetas como chips (solo lectura). */
export function TagChips({ tags, max }: { tags?: string[] | null; max?: number }) {
  if (!tags?.length) return null;
  const shown = max ? tags.slice(0, max) : tags;
  const rest = tags.length - shown.length;
  return (
    <span className="tag-chips">
      {shown.map((t) => (
        <span key={t} className="tag">
          {t}
        </span>
      ))}
      {rest > 0 && <span className="tag tag-more">+{rest}</span>}
    </span>
  );
}

/** Selector de etiquetas: sugeridas por grupo + propias. */
export function TagPicker({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [custom, setCustom] = useState('');
  const toggle = (t: string) => onChange(value.includes(t) ? value.filter((x) => x !== t) : [...value, t]);
  const suggested = new Set(TAG_SUGGESTIONS.flatMap((g) => g.tags));
  const own = value.filter((t) => !suggested.has(t));

  const addCustom = () => {
    const t = custom.trim();
    if (t && !value.some((x) => x.toLowerCase() === t.toLowerCase())) onChange([...value, t]);
    setCustom('');
  };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addCustom();
    }
  };

  return (
    <fieldset className="tag-picker span-2">
      <legend>Etiquetas</legend>
      {TAG_SUGGESTIONS.map((g) => (
        <div key={g.group} className="tag-group" role="group" aria-label={g.group}>
          <span className="tag-group-label">{g.group}</span>
          <div className="chips">
            {g.tags.map((t) => (
              <label key={t} className="chip">
                <input type="checkbox" checked={value.includes(t)} onChange={() => toggle(t)} />
                <span>{t}</span>
              </label>
            ))}
          </div>
        </div>
      ))}
      <div className="tag-group">
        <span className="tag-group-label">Propias</span>
        <div className="chips">
          {own.map((t) => (
            <label key={t} className="chip">
              <input type="checkbox" checked onChange={() => toggle(t)} />
              <span>{t}</span>
            </label>
          ))}
          <span className="row" style={{ flexWrap: 'nowrap', gap: 6 }}>
            <label htmlFor="tag-custom" className="visually-hidden">
              Nueva etiqueta
            </label>
            <input id="tag-custom" value={custom} onChange={(e) => setCustom(e.target.value)} onKeyDown={onKey} placeholder="Nueva etiqueta…" style={{ minHeight: 36, width: 180 }} />
            <button type="button" className="btn btn-sm" onClick={addCustom} disabled={!custom.trim()}>
              Agregar
            </button>
          </span>
        </div>
      </div>
    </fieldset>
  );
}
