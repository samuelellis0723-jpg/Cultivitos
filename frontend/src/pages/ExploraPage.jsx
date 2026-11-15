import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import ClimateHistory from '../components/climate/ClimateHistory.jsx';
import ForecastPanel from '../components/climate/ForecastPanel.jsx';
import ScenarioTabs from '../components/climate/ScenarioTabs.jsx';
import Icon from '../components/common/Icon.jsx';
import DataOriginBadge from '../components/feedback/DataOriginBadge.jsx';
import EmptyState from '../components/feedback/EmptyState.jsx';
import FlowActions from '../components/layout/FlowActions.jsx';
import { useFieldverse } from '../context/FieldverseContext.jsx';

export default function ExploraPage() {
  const {
    dataMode,
    catalogState,
    savedFinca,
    currentFingerprint,
    climateHistoryState,
    forecastState,
    loadExploreClimate,
    simulationState,
    runSimulation,
    activeScenario,
    setActiveScenario,
  } = useFieldverse();

  useEffect(() => {
    if (
      savedFinca &&
      catalogState.status === 'ok' &&
      climateHistoryState.status === 'idle'
    ) {
      loadExploreClimate(savedFinca, currentFingerprint);
    }
  }, [
    savedFinca,
    catalogState.status,
    climateHistoryState.status,
    currentFingerprint,
    loadExploreClimate,
  ]);

  if (!savedFinca || catalogState.status !== 'ok') {
    return (
      <div className="fv-step-enter">
        <EmptyState
          title="Primero completa el perfil de tu finca"
          description="Para explorar el historial climático y los escenarios necesitas ingresar coordenadas y opciones válidas en el Paso 1."
          ctaLabel="Ir a Tu finca"
          ctaTo="/"
        />
      </div>
    );
  }

  return (
    <div className="fv-step-enter">
      <div className="fv-page-context">
        <div className="fv-context-left">
          <span className="fv-badge fv-badge-step">Paso 2 de 3 · Explora</span>
          <DataOriginBadge origin={dataMode === 'demo' ? 'demo' : 'live'} />
          <span className="fv-row-wrap fv-hint" style={{ gap: '6px' }}>
            <Icon name="pin" size={16} />
            <span>
              {savedFinca.localidad ? `${savedFinca.localidad} · ` : ''}
              {savedFinca.latitude}, {savedFinca.longitude}
            </span>
          </span>
        </div>
        <Link className="fv-btn fv-btn-secondary fv-btn-sm" to="/">
          Editar finca
        </Link>
      </div>

      <div className="fv-page-header">
        <div>
          <h1 className="fv-page-title">Explora el contexto climático</h1>
          <p className="fv-page-lead">
            Revisa por separado el historial observado, los escenarios hipotéticos de temporada y el pronóstico de corto plazo.
          </p>
        </div>
      </div>

      <div className="fv-explora-stack">
        <ClimateHistory
          state={climateHistoryState}
          onRetry={() => loadExploreClimate(savedFinca, currentFingerprint)}
        />

        <ScenarioTabs
          activeScenario={activeScenario}
          onSelectScenario={setActiveScenario}
          catalog={catalogState.data}
          simulationState={simulationState}
          onRunSimulation={() => runSimulation(savedFinca, currentFingerprint)}
        />

        <ForecastPanel
          state={forecastState}
          onRetry={() => loadExploreClimate(savedFinca, currentFingerprint)}
        />
      </div>

      <FlowActions
        stepNumber={2}
        stepLabel="Exploración climática"
        backTo="/"
        backLabel="Volver a Tu finca"
        primaryLabel="Comparar estrategias"
        primaryTo="/compara"
      />
    </div>
  );
}
