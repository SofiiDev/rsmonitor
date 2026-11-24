import { LIGHT_LABEL, type Light, type OpportunityResult, type QualityResult } from '../lib/scores';

const LAMPS: Light[] = ['verde', 'amarillo', 'rojo'];

/** Semáforo: tres luces, una encendida, siempre con su texto (el color nunca va solo). */
export function QualityLight({ result, size = 'sm', showReason = false }: { result: QualityResult; size?: 'sm' | 'lg'; showReason?: boolean }) {
  const label = LIGHT_LABEL[result.light];
  return (
    <span className={`quality quality-${size}`} title={result.reason}>
      <span className="traffic" role="img" aria-label={`Calidad del contacto: ${label}. ${result.reason}`}>
        {LAMPS.map((l) => (
          <span key={l} className={`lamp lamp-${l} ${result.light === l ? 'is-on' : ''}`} />
        ))}
      </span>
      <span className="quality-text" aria-hidden="true">
        <span className={`quality-label light-${result.light}`}>{label}</span>
        {showReason && <span className="quality-reason">{result.reason}</span>}
      </span>
    </span>
  );
}

/** Barra de 5 segmentos con el nivel de oportunidad. */
export function OpportunityBar({ result, size = 'sm', showReason = false }: { result: OpportunityResult; size?: 'sm' | 'lg'; showReason?: boolean }) {
  return (
    <span className={`opp opp-${size}`} title={`${result.reason} (${result.score}/100)`}>
      <span className="opp-bar" role="img" aria-label={`Nivel de oportunidad: ${result.label}, ${result.score} de 100. ${result.reason}`}>
        {[1, 2, 3, 4, 5].map((i) => (
          <span key={i} className={`opp-seg ${i <= result.level ? `is-on step-${i}` : ''}`} />
        ))}
      </span>
      <span className="opp-text" aria-hidden="true">
        <span className="opp-label">
          {result.score === 0 ? 'Sin oportunidad' : `${size === 'sm' ? 'Oport.' : 'Oportunidad'} ${result.label.toLowerCase()}`}
          {size === 'lg' && result.score > 0 && <span className="muted"> · {result.score}/100</span>}
        </span>
        {showReason && <span className="quality-reason">{result.reason}</span>}
      </span>
    </span>
  );
}
