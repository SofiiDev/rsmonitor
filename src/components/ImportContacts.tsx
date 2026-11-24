import { useState } from 'react';
import { useStore } from '../lib/store';
import { parseRelationsWorkbook, type ImportResult } from '../lib/importExcel';
import { useToast } from './Toast';
import { LevelBadge } from './Bits';

const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

/** Importa contactos e historial desde la planilla "Base de relaciones" (.xlsx). */
export function ImportContacts({ onDone }: { onDone: () => void }) {
  const { contacts, activities, create } = useStore();
  const toast = useToast();
  const [result, setResult] = useState<ImportResult | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');

  const existing = new Map(contacts.map((c) => [norm(c.full_name), c.id]));

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setResult(null);
    try {
      const r = await parseRelationsWorkbook(file);
      setResult(r);
      // Por defecto: todo, salvo la fila de ejemplo y quienes ya están en la base.
      setSelected(new Set(r.contacts.filter((c) => !c.looksLikeExample && !existing.has(norm(c.data.full_name))).map((c) => c.key)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo leer el archivo.');
    }
  }

  const toggle = (key: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  // Historial que se va a importar: el de los contactos elegidos o ya existentes en la base.
  const historyToImport = result
    ? result.activities.filter((a) => {
        const c = result.contacts.find((x) => x.key === a.personKey);
        return c && (selected.has(c.key) || existing.has(norm(c.data.full_name)));
      })
    : [];

  async function runImport() {
    if (!result) return;
    setBusy(true);
    const ids = new Map<string, string>(); // clave de la planilla → id en la app
    let nContacts = 0;
    let nActs = 0;
    try {
      for (const c of result.contacts) {
        const already = existing.get(norm(c.data.full_name));
        if (already) {
          ids.set(c.key, already);
          continue;
        }
        if (!selected.has(c.key)) continue;
        setProgress(`Importando ${c.data.full_name}…`);
        const saved = await create('contacts', c.data);
        ids.set(c.key, saved.id);
        nContacts++;
      }
      for (const a of historyToImport) {
        const contactId = ids.get(a.personKey);
        if (!contactId) continue;
        // No duplicar si ya existe la misma interacción.
        const dup = activities.some((x) => x.contact_id === contactId && x.date === a.data.date && norm(x.title) === norm(a.data.title));
        if (dup) continue;
        setProgress(`Importando historial (${nActs + 1})…`);
        await create('activities', { ...a.data, contact_id: contactId });
        nActs++;
      }
      toast(`Importados ${nContacts} contactos y ${nActs} interacciones`);
      onDone();
    } catch (err) {
      setError(
        `Se cortó la importación (${nContacts} contactos y ${nActs} interacciones ya quedaron guardados): ${err instanceof Error ? err.message : 'error desconocido'}`,
      );
    } finally {
      setBusy(false);
      setProgress('');
    }
  }

  return (
    <div className="form">
      <p className="muted small">
        Elegí tu planilla <strong>Base de relaciones</strong> (.xlsx). Se leen las hojas “Base de relaciones” e “Historial de contactos”. El archivo se procesa en tu
        navegador y solo se guardan los contactos que elijas.
      </p>

      <div className="field">
        <label htmlFor="import-file">Archivo de Excel</label>
        <input id="import-file" type="file" accept=".xlsx,.xls,.xlsm" onChange={(e) => onFile(e.target.files?.[0])} disabled={busy} />
      </div>

      {error && (
        <p className="banner banner-error" role="alert">
          {error}
        </p>
      )}

      {result && (
        <>
          {result.warnings.map((w) => (
            <p key={w} className="banner small">
              {w}
            </p>
          ))}
          <div className="spread">
            <strong>
              {result.contacts.length} contactos encontrados · {result.activities.length} interacciones en el historial
            </strong>
            <span className="row">
              <button type="button" className="btn btn-sm" onClick={() => setSelected(new Set(result.contacts.filter((c) => !existing.has(norm(c.data.full_name))).map((c) => c.key)))}>
                Todos
              </button>
              <button type="button" className="btn btn-sm" onClick={() => setSelected(new Set())}>
                Ninguno
              </button>
            </span>
          </div>
          <ul className="list import-list">
            {result.contacts.map((c) => {
              const dup = existing.has(norm(c.data.full_name));
              const id = `imp-${c.key}`;
              return (
                <li key={c.key} className="import-row">
                  <input id={id} type="checkbox" checked={dup || selected.has(c.key)} disabled={dup || busy} onChange={() => toggle(c.key)} />
                  <LevelBadge level={c.data.level} />
                  <label htmlFor={id} className="grow">
                    <span className="title">{c.data.full_name}</span>
                    <span className="meta" style={{ display: 'block' }}>
                      {[c.data.phone, c.data.occupation, c.data.opportunity_status].filter(Boolean).join(' · ') || 'Sin más datos'}
                    </span>
                  </label>
                  {dup && <span className="badge">Ya está en tu base</span>}
                  {!dup && c.looksLikeExample && <span className="badge badge-warning">Parece el ejemplo de la plantilla</span>}
                </li>
              );
            })}
          </ul>
          <p className="muted small">
            Los que ya están en tu base (mismo nombre) no se duplican; si traen historial nuevo, se agrega a su ficha.
          </p>
        </>
      )}

      <div className="form-actions">
        {progress && (
          <span className="muted small left" role="status">
            {progress}
          </span>
        )}
        <button type="button" className="btn" onClick={onDone} disabled={busy}>
          Cancelar
        </button>
        <button type="button" className="btn btn-primary" onClick={runImport} disabled={!result || busy || (selected.size === 0 && historyToImport.length === 0)}>
          {busy ? 'Importando…' : `Importar ${selected.size} contactos${historyToImport.length ? ` y ${historyToImport.length} interacciones` : ''}`}
        </button>
      </div>
    </div>
  );
}
