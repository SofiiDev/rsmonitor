import type { Activity, Level } from '../lib/types';
import { ACTIVITY_LABEL, CATEGORY_LABEL, CATEGORY_OF, SOURCE_LABEL } from '../lib/options';

export function LevelBadge({ level }: { level: Level | null }) {
  return (
    <span className={`level ${level ? `level-${level}` : 'level-none'}`} aria-label={level ? `Nivel ${level}` : 'Sin nivel'} role="img">
      <span aria-hidden="true">{level ?? '?'}</span>
    </span>
  );
}

export function activityKind(a: Activity): string {
  const parts = [CATEGORY_LABEL[CATEGORY_OF[a.type]], ACTIVITY_LABEL[a.type]];
  if (a.operation) parts.push(a.operation);
  if (a.source) parts.push(SOURCE_LABEL[a.source] ?? a.source);
  return [...new Set(parts)].join(' · ');
}

export function Stat({ label, value, goal, suffix }: { label: string; value: number; goal?: number; suffix?: string }) {
  const pct = goal ? Math.min(100, Math.round((value / goal) * 100)) : null;
  const fmt = (n: number) => n.toLocaleString('es-AR', { maximumFractionDigits: 1 });
  return (
    <div className="stat">
      <span className="stat-label">{label}</span>
      <span className="stat-value">
        {suffix === '$' ? value.toLocaleString('es-AR', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }) : fmt(value)}
        {goal !== undefined && goal > 0 && (
          <small>
            {' '}
            / {suffix === '$' ? goal.toLocaleString('es-AR', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }) : fmt(goal)}
          </small>
        )}
      </span>
      {pct !== null && (
        <div
          className={`meter ${pct >= 100 ? 'done' : ''}`}
          role="progressbar"
          aria-label={`${label}: ${pct}% del objetivo`}
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <span style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  );
}
