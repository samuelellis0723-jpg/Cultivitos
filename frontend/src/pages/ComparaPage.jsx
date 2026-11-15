import ScenarioSelector from '../components/climate/ScenarioSelector.jsx';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../components/common/Icon.jsx';
import { EvidenceContent, MobileEvidenceDialog } from '../components/comparison/EvidencePanel.jsx';
import StrategyCard from '../components/comparison/StrategyCard.jsx';
import DataOriginBadge from '../components/feedback/DataOriginBadge.jsx';
import EmptyState from '../components/feedback/EmptyState.jsx';
import ErrorState from '../components/feedback/ErrorState.jsx';
import LoadingState from '../components/feedback/LoadingState.jsx';
import FlowActions from '../components/layout/FlowActions.jsx';
import { useFieldverse } from '../context/FieldverseContext.jsx';
import {
  deleteSavedComparison,
  downloadJsonFile,
  loadSavedComparisons,
  isLegacyDemoComparison,
  saveComparison,
} from '../services/storage.js';

export default function ComparaPage() {
  const {
    dataMode,
    switchDataMode,
    catalogState,
    savedFinca,
    currentFingerprint,
    climateHistoryState,
    simulationState,
    runSimulation,
    activeScenario,
    setActiveScenario,
    selectedStrategyId,
    setSelectedStrategyId,
  } = useFieldverse();

  const [mobileEvidenceOpen, setMobileEvidenceOpen] = useState(false);
  const [saveNotice, setSaveNotice] = useState(null);
  const [savedList, setSavedList] = useState(() => loadSavedComparisons().items);
  const [historical, setHistorical] = useState(null);
  const evidenceTriggerRef = useRef(null);

  useEffect(() => {
    if (
      savedFinca &&
      catalogState.status === 'ok' &&
      simulationState.status === 'idle'
    ) {
      runSimulation(savedFinca, currentFingerprint);
    }
  }, [
    savedFinca,
    catalogState.status,
    simulationState.status,
    currentFingerprint,
    runSimulation,
  ]);

  const savedHistory = (
    <section className="fv-card" aria-label="Historial guardado">
      <h2>Comparaciones guardadas</h2>
      {savedList.map(item => (
        <div key={item.id} className="fv-row-wrap">
          <span>{new Date(item.savedAt).toLocaleString('es-CR')} · {item.dataMode === 'demo' ? 'Modo demostración' : 'Conexión API'} · <DataOriginBadge origin={item.simulation?.evidencia?.origen} /></span>
          {isLegacyDemoComparison(item) ? <span>Demo histórica · formato A/B/C</span> : null}
          <button type="button" className="fv-btn fv-btn-secondary" onClick={() => setHistorical(item)}>
            Consultar resultado guardado
          </button>
        </div>
      ))}
    </section>
  );
  if (historical) {
    const result = historical.simulation;
    return (
      <div>
        <h1>Resultado histórico guardado</h1>
        <p>Guardado el {new Date(historical.savedAt).toLocaleString('es-CR')}. No es una evaluación actual.</p>
        <DataOriginBadge origin={result.evidencia.origen} />
        {isLegacyDemoComparison(historical) ? (
          <p role="note">Demostración histórica en formato A/B/C. Se conservan sus identificadores originales; las nuevas demostraciones usan E1/E2/E3. No se ha recalculado ni convertido este resultado.</p>
        ) : null}
        <p>Estado guardado: {result.estado}. {result.explicacion}</p>
        <button className="fv-btn fv-btn-secondary" onClick={() => setHistorical(null)}>Volver a comparación actual</button>
        <p>Selección guardada: {historical.selectedStrategyId || 'ninguna'}</p>
        {result.resultados.map(r => (
          <StrategyCard key={r.estrategiaId} resultado={r}
            estrategia={historical.catalog.estrategias.find(e => e.id === r.estrategiaId)}
            cultivos={historical.catalog.cultivos} escenarios={result.escenarios}
            activeScenario={activeScenario} isWinner={result.ganadoras.includes(r.estrategiaId)}
            isTie={result.ganadoras.length > 1} isSelected={historical.selectedStrategyId === r.estrategiaId}
            allowSelection={false} />
        ))}
        <EvidenceContent finca={historical.finca} catalog={historical.catalog} simulation={result}
          climateHistory={historical.climateHistory}
          onDownloadJson={() => downloadJsonFile(historical, 'fieldverse-historico.json')}
          onPrint={() => window.print()} />
      </div>
    );
  }

  if (!savedFinca || catalogState.status !== 'ok') {
    return (
      <div className="fv-step-enter">
        {savedHistory}
        <EmptyState
          title="No hay un perfil de finca activo para comparar"
          description="Completa primero el Paso 1 (Tu finca) para obtener el catálogo y evaluar estrategias."
          ctaLabel="Ir a Tu finca"
          ctaTo="/"
        />
      </div>
    );
  }

  const catalog = catalogState.data;
  const monthLabel =
    catalog?.opcionesFinca?.mesInicio?.find((m) => m.valor === savedFinca.mesInicio)?.etiqueta ||
    `Mes ${savedFinca.mesInicio}`;

  const sim = simulationState.data;
  const strategyMap = new Map((catalog?.estrategias ?? []).map((e) => [e.id, e]));

  const handleSaveComparison = () => {
    if (!sim) return;
    const entry = {
      id: `${Date.now()}`,
      savedAt: new Date().toISOString(),
      dataMode,
      estado: sim.estado,
      fingerprint: currentFingerprint,
      catalogVersion: catalog.version,
      finca: savedFinca,
      selectedStrategyId,
      schemaVersion: 2,
      simulation: sim,
      catalog,
      climateHistory: climateHistoryState.data,
      ganadoras: sim.ganadoras,
      explicacion: sim.explicacion,
    };
    const res = saveComparison(entry);
    if (res.ok) {
      setSavedList(res.items);
      setSaveNotice({
        type: 'info',
        text: 'Comparación guardada localmente en este dispositivo (no en nube).',
      });
    } else {
      setSaveNotice({ type: 'error', text: res.error });
    }
  };

  const handleDeleteSaved = (id) => {
    const res = deleteSavedComparison(id);
    if (res.ok) {
      setSavedList(res.items);
    }
  };

  const handleDownloadJson = () => {
    if (!sim) return;
    downloadJsonFile(
      {
        exportadoEn: new Date().toISOString(),
        modo: dataMode,
        etiquetaDemo: dataMode === 'demo' || sim.estado === 'demo' ? 'DEMOSTRACIÓN' : null,
        catalogoVersion: catalog.version,
        finca: savedFinca,
        estrategiaSeleccionadaId: selectedStrategyId,
        simulacion: sim,
      },
      `fieldverse-comparacion-${dataMode}.json`
    );
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fv-step-enter">
      {savedHistory}
      <div className="fv-page-context">
        <div className="fv-context-left">
          <span className="fv-badge fv-badge-step">Paso 3 de 3 · Síntesis decisional</span>
          <DataOriginBadge
            origin={sim?.evidencia?.origen}
          />
          <span className="fv-row-wrap fv-hint" style={{ gap: '6px' }}>
            <Icon name="pin" size={16} />
            <span>
              {savedFinca.localidad ? `${savedFinca.localidad} · ` : ''}
              {savedFinca.latitude}, {savedFinca.longitude}
            </span>
          </span>
        </div>
        <span className="fv-hint">
          {sim?.estado === 'demo' ? 'Prototipo comparativo (demo)' : 'Evaluación del motor'}
        </span>
      </div>

      <div className="fv-page-header">
        <div>
          <h1 className="fv-page-title">Comprende tus opciones.</h1>
          <p className="fv-page-lead">
            Compara puntajes por escenario (0–100, mayor es mejor) y peor arrepentimiento (menor es mejor) antes de elegir tu plan.
          </p>
        </div>

        <div className="fv-context-pill">
          <div className="fv-context-pill-icon">
            <Icon name="calendar" size={20} />
          </div>
          <div>
            <span className="fv-context-pill-label">Inicio previsto</span>
            <span className="fv-context-pill-value">{monthLabel}</span>
          </div>
        </div>
      </div>

      {simulationState.status === 'loading' || simulationState.status === 'idle' ? (
        <LoadingState message="Ejecutando comparación de estrategias en el motor…" />
      ) : simulationState.status === 'error' ? (
        <ErrorState
          title="No se pudo obtener la comparación del servidor"
          message={simulationState.error}
          onRetry={() => runSimulation(savedFinca, currentFingerprint)}
          extraAction={
            dataMode === 'live' ? (
              <button
                type="button"
                className="fv-btn fv-btn-primary fv-btn-sm"
                onClick={() => switchDataMode('demo')}
              >
                Probar en modo demostración
              </button>
            ) : null
          }
        />
      ) : (
        <>
          {sim.estado === 'incompleto' ? (
            <div className="fv-state-box fv-state-warning" role="status" style={{ marginBottom: '20px' }}>
              <strong>Evaluación incompleta — sin ganadora declarada</strong>
              <p>{sim.explicacion}</p>
              {sim.evidencia?.datosFaltantes?.length > 0 ? (
                <ul style={{ margin: '0 0 0 18px', padding: 0 }}>
                  {sim.evidencia.datosFaltantes.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}

          {sim.estado === 'sin_opciones' ? (
            <div className="fv-state-box fv-state-error" role="status" style={{ marginBottom: '20px' }}>
              <strong>Sin estrategias elegibles para este perfil</strong>
              <p>{sim.explicacion}</p>
              <Link className="fv-btn fv-btn-secondary fv-btn-sm" to="/">
                Editar perfil de tu finca
              </Link>
            </div>
          ) : null}

          {sim.estado === 'completo' || sim.estado === 'demo' ? (
            <div className="fv-card-soft" style={{ marginBottom: '20px' }}>
              <div className="fv-row-wrap" style={{ justifyContent: 'space-between' }}>
                <div>
                  <strong>
                    {sim.ganadoras.length > 1
                      ? `Empate minimax: ${sim.ganadoras.join(', ')}`
                      : sim.ganadoras.length === 1
                      ? `Ganadora minimax: ${strategyMap.get(sim.ganadoras[0])?.nombre || sim.ganadoras[0]}`
                      : 'Sin ganadora declarada'}
                  </strong>
                  <p className="fv-section-desc">{sim.explicacion}</p>
                </div>

                <ScenarioSelector value={activeScenario} onChange={setActiveScenario} prefix="compara" panelId="comparison-results" />
              </div>
            </div>
          ) : null}

          {saveNotice ? (
            <div
              className={`fv-state-box ${saveNotice.type === 'error' ? 'fv-state-error' : ''}`}
              role="status"
              aria-live="polite"
              style={{ marginBottom: '16px', padding: '12px 16px' }}
            >
              <span>{saveNotice.text}</span>
            </div>
          ) : null}

          <div className="fv-compara-grid">
            <div className="fv-strategies-list" id="comparison-results" role="tabpanel" aria-labelledby={`compara-${activeScenario}`}>
              <div className="fv-row-wrap fv-no-print" style={{ justifyContent: 'space-between' }}>
                <span className="fv-hint">
                  Tu selección marca el plan que prefieres conservar; las etiquetas verdes muestran las ganadoras calculadas por el motor.
                </span>
                <button
                  ref={evidenceTriggerRef}
                  type="button"
                  className="fv-btn fv-btn-secondary fv-btn-sm fv-mobile-evidence-trigger"
                  onClick={() => setMobileEvidenceOpen(true)}
                >
                  <Icon name="book" size={16} />
                  <span>Ver evidencia y exportar</span>
                </button>
              </div>

              {sim.resultados.map((res) => {
                const isWinner = sim.ganadoras.includes(res.estrategiaId);
                return (
                  <StrategyCard
                    key={res.estrategiaId}
                    resultado={res}
                    estrategia={strategyMap.get(res.estrategiaId)}
                    cultivos={catalog?.cultivos}
                    escenarios={sim.escenarios}
                    activeScenario={activeScenario}
                    isWinner={isWinner}
                    isTie={sim.ganadoras.length > 1}
                    isSelected={selectedStrategyId === res.estrategiaId}
                    onSelect={setSelectedStrategyId}
                    allowSelection={sim.estado !== 'sin_opciones'}
                  />
                );
              })}

              {savedList.length > 0 ? (
                <section className="fv-card-soft fv-no-print" aria-label="Comparaciones guardadas en este dispositivo">
                  <strong style={{ fontSize: '14px' }}>
                    Comparaciones guardadas localmente ({savedList.length})
                  </strong>
                  <ul style={{ margin: '8px 0 0 0', padding: 0, listStyle: 'none', display: 'grid', gap: '8px' }}>
                    {savedList.map((item) => (
                      <li
                        key={item.id}
                        className="fv-kv-item fv-row-wrap"
                        style={{ justifyContent: 'space-between' }}
                      >
                        <span className="fv-hint" style={{ color: 'var(--fv-text)' }}>
                          {new Date(item.savedAt).toLocaleString('es-CR')} ·{' '}
                          {item.dataMode === 'demo' ? 'Modo demostración' : 'Conexión API'} · Selección:{' '}
                          {item.selectedStrategyId || 'ninguna'}
                        </span>
                        <button
                          type="button"
                          className="fv-btn fv-btn-ghost fv-btn-sm"
                          onClick={() => handleDeleteSaved(item.id)}
                        >
                          Eliminar
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </div>

            <aside className="fv-desktop-evidence" aria-label="Evidencia y exportación">
              <EvidenceContent
                finca={savedFinca}
                catalog={catalog}
                simulation={sim}
                climateHistory={climateHistoryState.data}
                onDownloadJson={handleDownloadJson}
                onPrint={handlePrint}
              />
            </aside>
          </div>

          <MobileEvidenceDialog
            open={mobileEvidenceOpen}
            onClose={() => setMobileEvidenceOpen(false)}
            triggerRef={evidenceTriggerRef}
          >
            <EvidenceContent
              finca={savedFinca}
              catalog={catalog}
              simulation={sim}
              climateHistory={climateHistoryState.data}
              onDownloadJson={handleDownloadJson}
              onPrint={handlePrint}
            />
          </MobileEvidenceDialog>

          <FlowActions
            stepNumber={3}
            stepLabel="Comparación final"
            backTo="/explora"
            backLabel="Volver a Explora"
            primaryLabel="Guardar comparación"
            onPrimaryClick={handleSaveComparison}
            primaryDisabled={!sim}
          />
        </>
      )}
    </div>
  );
}
