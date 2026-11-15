export default function ScoreBar({ label, score, reason, isActiveScenario = false }) {
  const isCalculable = typeof score === 'number' && Number.isFinite(score);
  const clamped = isCalculable ? Math.max(0, Math.min(100, score)) : 0;

  return (
    <div className={`fv-metric-cell${isActiveScenario ? ' is-active-scenario' : ''}`}>
      <span className="fv-metric-label">{label}</span>
      {isCalculable ? (
        <>
          <span className="fv-metric-value">{score} / 100</span>
          <div className="fv-score-track" aria-hidden="true">
            <div className="fv-score-bar-fill" style={{ width: `${clamped}%` }} />
          </div>
        </>
      ) : (
        <>
          <span className="fv-badge fv-badge-error" style={{ alignSelf: 'flex-start' }}>
            No calculable
          </span>
          {reason ? <span className="fv-hint">{reason}</span> : null}
        </>
      )}
    </div>
  );
}
