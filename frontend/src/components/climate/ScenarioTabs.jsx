import ScenarioSelector from './ScenarioSelector.jsx';
import Icon from '../common/Icon.jsx';
import { cycleDurationLabel } from '../../utils/catalog.js';

const SCENARIO_META = {
  habitual: {
    label: 'Habitual',
    note: 'Hipótesis de referencia basada en comportamiento climático habitual.',
  },
  seco: {
    label: 'Más seco',
    note: 'Hipótesis de estrés por menor disponibilidad hídrica.',
  },
  humedo: {
    label: 'Más lluvioso',
    note: 'Hipótesis de mayor precipitación acumulada.',
  },
};

export function formatOrderedSteps(estrategia, cultivos) {
  const cropMap = new Map((cultivos ?? []).map((c) => [c.id, c]));
  const pasos = [...(estrategia?.pasos ?? [])].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
  return pasos.map((paso) => {
    const crop = cropMap.get(paso.cultivoId);
    const ciclo = crop?.ciclos?.find((c) => c.id === paso.cicloId);
    return {
      orden: paso.orden,
      cropName: crop?.nombre || `Cultivo (${paso.cultivoId})`,
      cicloLabel: ciclo?.etiqueta || `Ciclo ${paso.orden}`,
      durationLabel: cycleDurationLabel(ciclo),
    };
  });
}

export default function ScenarioTabs({
  activeScenario,
  onSelectScenario,
  catalog,
  simulationState,
  onRunSimulation,
}) {
  const simData = simulationState.status === 'ok' ? simulationState.data : null;

  return (
    <section className="fv-card" aria-labelledby="scenarios-title">
      <div className="fv-page-context" style={{ marginBottom: '12px' }}>
        <div>
          <h2 id="scenarios-title" className="fv-section-title">
            2. Escenarios hipotéticos
          </h2>
          <p className="fv-section-desc">
            Son hipótesis comparativas (no pronósticos). Cambiar de pestaña actualiza la vista sin recalcular el motor.
          </p>
        </div>

        <ScenarioSelector value={activeScenario} onChange={onSelectScenario} prefix="explora" panelId={`panel-${activeScenario}`} />
      </div>

      <div
        id={`panel-${activeScenario}`}
        role="tabpanel"
        aria-labelledby={`explora-${activeScenario}`}
      >
        <p className="fv-hint" style={{ marginBottom: '12px' }}>
          {SCENARIO_META[activeScenario].note}
        </p>

        {!simData ? (
          <div className="fv-card-soft fv-row-wrap" style={{ justifyContent: 'space-between' }}>
            <div>
              <strong>Puntuación por escenario aún no calculada</strong>
              <p className="fv-section-desc">
                {simulationState.status === 'loading'
                  ? 'Consultando evaluación del motor…'
                  : simulationState.status === 'error'
                  ? simulationState.error
                  : 'Ejecuta la evaluación para ver el puntaje (0–100) de cada estrategia en este escenario.'}
              </p>
            </div>
            {simulationState.status !== 'loading' ? (
              <button type="button" className="fv-btn fv-btn-secondary fv-btn-sm" onClick={onRunSimulation}>
                <Icon name="refresh" size={16} />
                <span>{simulationState.status === 'error' ? 'Reintentar cálculo' : 'Calcular escenarios'}</span>
              </button>
            ) : null}
          </div>
        ) : null}

        <div className="fv-strategies-list" style={{ marginTop: '12px' }}>
          {(catalog?.estrategias ?? []).map((est) => {
            const steps = formatOrderedSteps(est, catalog?.cultivos);
            const result = simData?.resultados?.find((r) => r.estrategiaId === est.id);
            const score = result?.puntajes?.[activeScenario];
            const reason = result?.motivosNoCalculable?.[activeScenario];

            return (
              <div key={est.id} className="fv-card-soft">
                <div className="fv-row-wrap" style={{ justifyContent: 'space-between' }}>
                  <div>
                    <strong>{est.nombre}</strong>
                    {Array.isArray(est.parametrosPuntuacion) && est.parametrosPuntuacion.length === 0 ? (
                      <span className="fv-badge fv-badge-demo" style={{ marginLeft: '8px' }}>
                        Provisional · reglas pendientes
                      </span>
                    ) : null}
                    <div className="fv-cycles-pill" style={{ marginTop: '6px' }}>
                      {steps.map((s, i) => (
                        <span key={s.orden}>
                          {i > 0 ? ' → ' : ''}
                          {s.cicloLabel}: {s.cropName}
                          {s.durationLabel ? ` · ${s.durationLabel}` : ''}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span className="fv-meta-item-label">
                      Puntaje ({SCENARIO_META[activeScenario].label})
                    </span>
                    {!simData ? (
                      <span className="fv-hint">Pendiente de cálculo</span>
                    ) : result && result.elegible === false ? (
                      <span className="fv-badge fv-badge-neutral">Descartada</span>
                    ) : score === null || score === undefined ? (
                      <span className="fv-badge fv-badge-error" title={reason || ''}>
                        No calculable
                      </span>
                    ) : (
                      <span className="fv-metric-value">{score} / 100</span>
                    )}
                  </div>
                </div>
                {reason ? (
                  <p className="fv-hint" style={{ marginTop: '6px' }}>
                    Motivo: {reason}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
