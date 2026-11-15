import { formatOrderedSteps } from '../climate/ScenarioTabs.jsx';
import ScoreBar from './ScoreBar.jsx';

const SCENARIO_LABELS = {
  habitual: 'Habitual',
  seco: 'Más seco',
  humedo: 'Más lluvioso',
};

function readableWarning(warning) {
  const field = /^FINCA_DESCONOCIDA: (suelo|drenaje|riego);/.exec(warning)?.[1];
  if (field) return `No conocemos el ${field} de la finca. Este dato faltante no constituye una restricción comprobada.`;
  return warning;
}

export default function StrategyCard({
  resultado,
  estrategia,
  cultivos,
  escenarios,
  activeScenario,
  isWinner,
  isTie,
  isSelected,
  onSelect,
  allowSelection,
}) {
  const versionMismatch = !estrategia;
  const provisional = Array.isArray(estrategia?.parametrosPuntuacion) && estrategia.parametrosPuntuacion.length === 0;
  const title = estrategia?.nombre || `Estrategia ${resultado.estrategiaId} (sin entrada en catálogo)`;
  const steps = estrategia ? formatOrderedSteps(estrategia, cultivos) : [];
  const isDiscarded = resultado.elegible === false;
  const isUnknownEligibility = resultado.elegible === null;
  const canSelect = allowSelection && resultado.elegible === true;

  const content = (
    <>
      <div className="fv-strategy-top">
        <div className="fv-strategy-radio-wrap">
          {canSelect ? (
            <input
              type="radio"
              className="fv-strategy-radio"
              name="estrategia-seleccionada"
              value={resultado.estrategiaId}
              checked={isSelected}
              onChange={() => onSelect(resultado.estrategiaId)}
            />
          ) : null}
          <div>
            <h2 className="fv-strategy-title">{title}</h2>
            <div className="fv-strategy-badges">
              {isWinner ? (
                <span className="fv-badge fv-badge-winner">
                  {isTie ? 'Empate minimax' : 'Menor peor arrepentimiento'}
                </span>
              ) : null}
              {isSelected ? (
                <span className="fv-badge fv-badge-live">Tu selección</span>
              ) : null}
              {isDiscarded ? (
                <span className="fv-badge fv-badge-error">Descartada</span>
              ) : null}
              {isUnknownEligibility ? (
                <span className="fv-badge fv-badge-neutral">Elegibilidad no evaluable</span>
              ) : null}
              {provisional ? (
                <span className="fv-badge fv-badge-demo">Provisional · reglas pendientes</span>
              ) : null}
              {versionMismatch ? (
                <span className="fv-badge fv-badge-demo">Incompatibilidad de versión</span>
              ) : null}
            </div>
            {estrategia?.descripcion ? (
              <p className="fv-section-desc" style={{ marginTop: '6px' }}>
                {estrategia.descripcion}
              </p>
            ) : null}
          </div>
        </div>

        {steps.length > 0 ? (
          <div className="fv-cycles-pill">
            {steps.map((s, idx) => (
              <span key={s.orden}>
                {idx > 0 ? ' → ' : ''}
                {s.cicloLabel}: {s.cropName}
                {s.durationLabel ? ` · ${s.durationLabel}` : ''}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      {versionMismatch ? (
        <p className="fv-hint" style={{ marginTop: '8px', color: 'var(--fv-error-text)' }}>
          La estrategia "{resultado.estrategiaId}" vino en la respuesta de simulación pero no existe en el catálogo cargado.
        </p>
      ) : null}

      {resultado.advertencias?.length > 0 ? (
        <section className="fv-card-soft" aria-label={`Advertencias de ${title}`} style={{ marginTop: '12px' }}>
          <h3>Advertencias</h3>
          <ul>
            {resultado.advertencias.map((aviso, index) => <li key={index}>{readableWarning(aviso)}</li>)}
          </ul>
        </section>
      ) : null}

      {isDiscarded ? (
        <div className="fv-card-soft" style={{ marginTop: '12px' }}>
          <strong>Motivos de descarte:</strong>
          <ul style={{ margin: '6px 0 0 18px', padding: 0 }}>
            {(resultado.motivosDescarte ?? []).map((m, i) => (
              <li key={i} className="fv-hint" style={{ color: 'var(--fv-text)' }}>
                {m}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="fv-matrix-grid">
          {(escenarios ?? ['habitual', 'seco', 'humedo']).map((esc) => (
            <ScoreBar
              key={esc}
              label={SCENARIO_LABELS[esc] || esc}
              score={resultado.puntajes?.[esc] ?? null}
              reason={resultado.motivosNoCalculable?.[esc]}
              isActiveScenario={activeScenario === esc}
            />
          ))}

          <div className="fv-metric-cell">
            <span className="fv-metric-label">Peor arrepentimiento</span>
            {typeof resultado.peorArrepentimiento === 'number' &&
            Number.isFinite(resultado.peorArrepentimiento) ? (
              <>
                <span className="fv-regret-value">{resultado.peorArrepentimiento}</span>
                <span className="fv-hint">Menor es mejor</span>
              </>
            ) : (
              <>
                <span className="fv-badge fv-badge-error" style={{ alignSelf: 'flex-start' }}>
                  No calculable
                </span>
                {resultado.motivoPeorArrepentimiento ? (
                  <span className="fv-hint">{resultado.motivoPeorArrepentimiento}</span>
                ) : null}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );

  if (canSelect) {
    return (
      <label className={`fv-strategy-card${isSelected ? ' is-selected' : ''}`}>
        {content}
      </label>
    );
  }

  return (
    <article className={`fv-strategy-card${isDiscarded ? ' is-discarded' : ''}`}>
      {content}
    </article>
  );
}
