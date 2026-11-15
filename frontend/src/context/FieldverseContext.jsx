import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  DEMO_CATALOG,
  DEMO_CLIMATE_HISTORY,
  DEMO_FORECAST,
  DEMO_SIMULATION_CASES,
} from '../fixtures/demoData.js';
import { getCatalog } from '../services/catalog.js';
import { getClimateForecast, getClimateHistory } from '../services/climate.js';
import { postSimulation } from '../services/simulations.js';
import { loadDraft } from '../services/storage.js';
import {
  computeInputsFingerprint,
  createEmptyFinca,
  toSimulationPayload,
  validateFinca,
} from '../utils/validation.js';

const FieldverseContext = createContext(null);

export function FieldverseProvider({ children }) {
  const [dataMode, setDataMode] = useState('live');
  const [demoCase, setDemoCase] = useState('default');

  const [catalogState, setCatalogState] = useState({
    status: 'loading',
    data: null,
    error: null,
  });

  const [fincaDraft, setFincaDraft] = useState(() => createEmptyFinca(null));
  const [savedFinca, setSavedFinca] = useState(null);
  const [draftNotice, setDraftNotice] = useState(null);

  const [climateHistoryState, setClimateHistoryState] = useState({
    status: 'idle',
    data: null,
    error: null,
    fingerprint: '',
  });

  const [forecastState, setForecastState] = useState({
    status: 'idle',
    data: null,
    error: null,
    fingerprint: '',
  });

  const [simulationState, setSimulationState] = useState({
    status: 'idle',
    data: null,
    error: null,
    fingerprint: '',
  });

  const [activeScenario, setActiveScenario] = useState('habitual');
  const [selectedStrategyId, setSelectedStrategyId] = useState(null);

  const catalogReqRef = useRef({ id: 0, controller: null });
  const climateReqRef = useRef({ id: 0, controller: null });
  const forecastReqRef = useRef({ id: 0, controller: null });
  const simReqRef = useRef({ id: 0, controller: null });
  const initializedDraftRef = useRef(false);

  const loadCatalogData = useCallback(async (mode) => {
    catalogReqRef.current.controller?.abort();
    const reqId = ++catalogReqRef.current.id;

    if (mode === 'demo') {
      setCatalogState({ status: 'ok', data: DEMO_CATALOG, error: null });
      return DEMO_CATALOG;
    }

    const controller = new AbortController();
    catalogReqRef.current.controller = controller;
    setCatalogState((prev) => ({ status: 'loading', data: prev.data, error: null }));

    try {
      const data = await getCatalog(controller.signal);
      if (catalogReqRef.current.id !== reqId) return null;
      setCatalogState({ status: 'ok', data, error: null });
      return data;
    } catch (err) {
      if (err?.isAborted || catalogReqRef.current.id !== reqId) return null;
      setCatalogState({
        status: 'error',
        data: null,
        error: err?.message || 'No se pudo cargar el catálogo.',
      });
      return null;
    }
  }, []);

  useEffect(() => {
    loadCatalogData(dataMode);
    return () => {
      catalogReqRef.current.controller?.abort();
    };
  }, [dataMode, loadCatalogData]);

  // Restore local draft once catalog is ready
  useEffect(() => {
    if (initializedDraftRef.current || catalogState.status !== 'ok' || !catalogState.data) {
      return;
    }
    initializedDraftRef.current = true;
    const restored = loadDraft();
    if (!restored.ok) {
      setDraftNotice({ type: 'error', text: restored.error });
      setFincaDraft(createEmptyFinca(catalogState.data));
      return;
    }
    if (restored.data?.finca) {
      const merged = { ...createEmptyFinca(catalogState.data), ...restored.data.finca };
      setFincaDraft(merged);
      const check = validateFinca(merged, catalogState.data);
      if (check.valid) {
        setSavedFinca(check.normalized);
      }
      const versionMismatch =
        restored.data.catalogVersion &&
        restored.data.catalogVersion !== catalogState.data.version;
      setDraftNotice({
        type: 'info',
        text: versionMismatch
          ? `Se restauró tu borrador local (guardado con catálogo ${restored.data.catalogVersion}; versión actual ${catalogState.data.version}).`
          : 'Se restauró tu borrador guardado en este dispositivo.',
      });
    } else {
      setFincaDraft(createEmptyFinca(catalogState.data));
    }
  }, [catalogState.status, catalogState.data]);

  const currentFingerprint = useMemo(
    () =>
      computeInputsFingerprint(
        savedFinca,
        catalogState.data?.version,
        dataMode === 'demo' ? `demo:${demoCase}` : 'live'
      ),
    [savedFinca, catalogState.data?.version, dataMode, demoCase]
  );

  // Invalidate derived results when fingerprint changes
  useEffect(() => {
    if (simulationState.fingerprint && simulationState.fingerprint !== currentFingerprint) {
      simReqRef.current.controller?.abort();
      setSimulationState({ status: 'idle', data: null, error: null, fingerprint: '' });
      setSelectedStrategyId(null);
    }
    if (climateHistoryState.fingerprint && climateHistoryState.fingerprint !== currentFingerprint) {
      climateReqRef.current.controller?.abort();
      setClimateHistoryState({ status: 'idle', data: null, error: null, fingerprint: '' });
    }
    if (forecastState.fingerprint && forecastState.fingerprint !== currentFingerprint) {
      forecastReqRef.current.controller?.abort();
      setForecastState({ status: 'idle', data: null, error: null, fingerprint: '' });
    }
  }, [
    currentFingerprint,
    simulationState.fingerprint,
    climateHistoryState.fingerprint,
    forecastState.fingerprint,
  ]);

  const loadExploreClimate = useCallback(
    async (fincaArg, fingerprintArg) => {
      const finca = fincaArg ?? savedFinca;
      const fp = fingerprintArg ?? currentFingerprint;
      if (!finca) return;

      climateReqRef.current.controller?.abort();
      forecastReqRef.current.controller?.abort();
      const cReqId = ++climateReqRef.current.id;
      const fReqId = ++forecastReqRef.current.id;

      if (dataMode === 'demo') {
        setClimateHistoryState({
          status: 'ok',
          data: {
            ...DEMO_CLIMATE_HISTORY,
            coordenadas: {
              solicitadas: { latitude: finca.latitude, longitude: finca.longitude },
              devueltas: { latitude: finca.latitude, longitude: finca.longitude },
            },
          },
          error: null,
          fingerprint: fp,
        });
        setForecastState({
          status: 'ok',
          data: DEMO_FORECAST,
          error: null,
          fingerprint: fp,
        });
        return;
      }

      const cController = new AbortController();
      const fController = new AbortController();
      climateReqRef.current.controller = cController;
      forecastReqRef.current.controller = fController;

      setClimateHistoryState({ status: 'loading', data: null, error: null, fingerprint: fp });
      setForecastState({ status: 'loading', data: null, error: null, fingerprint: fp });

      const historyPromise = getClimateHistory(
        { latitude: finca.latitude, longitude: finca.longitude },
        cController.signal
      )
        .then((data) => {
          if (climateReqRef.current.id !== cReqId) return;
          setClimateHistoryState({ status: 'ok', data, error: null, fingerprint: fp });
        })
        .catch((err) => {
          if (err?.isAborted || climateReqRef.current.id !== cReqId) return;
          setClimateHistoryState({
            status: 'error',
            data: null,
            error: err?.message || 'No se pudo cargar el historial climático.',
            fingerprint: fp,
          });
        });

      const forecastPromise = getClimateForecast(
        { latitude: finca.latitude, longitude: finca.longitude },
        fController.signal
      )
        .then((data) => {
          if (forecastReqRef.current.id !== fReqId) return;
          setForecastState({ status: 'ok', data, error: null, fingerprint: fp });
        })
        .catch((err) => {
          if (err?.isAborted || forecastReqRef.current.id !== fReqId) return;
          setForecastState({
            status: 'error',
            data: null,
            error: err?.message || 'El pronóstico de 7 días no está disponible.',
            fingerprint: fp,
          });
        });

      await Promise.allSettled([historyPromise, forecastPromise]);
    },
    [savedFinca, currentFingerprint, dataMode]
  );

  const runSimulation = useCallback(
    async (fincaArg, fingerprintArg) => {
      const finca = fincaArg ?? savedFinca;
      const fp = fingerprintArg ?? currentFingerprint;
      if (!finca) return null;

      simReqRef.current.controller?.abort();
      const reqId = ++simReqRef.current.id;

      if (dataMode === 'demo') {
        const fixture = DEMO_SIMULATION_CASES[demoCase] ?? DEMO_SIMULATION_CASES.default;
        setSimulationState({
          status: 'ok',
          data: fixture,
          error: null,
          fingerprint: fp,
        });
        setSelectedStrategyId(fixture.ganadoras[0] ?? fixture.resultados[0]?.estrategiaId ?? null);
        return fixture;
      }

      const controller = new AbortController();
      simReqRef.current.controller = controller;
      setSimulationState({ status: 'loading', data: null, error: null, fingerprint: fp });

      try {
        const result = await postSimulation(toSimulationPayload(finca), controller.signal);
        if (simReqRef.current.id !== reqId) return null;
        setSimulationState({ status: 'ok', data: result, error: null, fingerprint: fp });
        setSelectedStrategyId(
          result.ganadoras[0] ??
            result.resultados.find((r) => r.elegible)?.estrategiaId ??
            null
        );
        return result;
      } catch (err) {
        if (err?.isAborted || simReqRef.current.id !== reqId) return null;
        setSimulationState({
          status: 'error',
          data: null,
          error: err?.message || 'No se pudo completar la simulación.',
          fingerprint: fp,
        });
        return null;
      }
    },
    [savedFinca, currentFingerprint, dataMode, demoCase]
  );

  const switchDataMode = useCallback((nextMode) => {
    climateReqRef.current.controller?.abort();
    forecastReqRef.current.controller?.abort();
    simReqRef.current.controller?.abort();
    setClimateHistoryState({ status: 'idle', data: null, error: null, fingerprint: '' });
    setForecastState({ status: 'idle', data: null, error: null, fingerprint: '' });
    setSimulationState({ status: 'idle', data: null, error: null, fingerprint: '' });
    setSelectedStrategyId(null);
    setDataMode(nextMode);
  }, []);

  const value = useMemo(
    () => ({
      dataMode,
      switchDataMode,
      demoCase,
      setDemoCase,
      catalogState,
      reloadCatalog: () => loadCatalogData(dataMode),
      fincaDraft,
      setFincaDraft,
      savedFinca,
      setSavedFinca,
      draftNotice,
      setDraftNotice,
      currentFingerprint,
      climateHistoryState,
      forecastState,
      loadExploreClimate,
      simulationState,
      runSimulation,
      activeScenario,
      setActiveScenario,
      selectedStrategyId,
      setSelectedStrategyId,
    }),
    [
      dataMode,
      switchDataMode,
      demoCase,
      catalogState,
      loadCatalogData,
      fincaDraft,
      savedFinca,
      draftNotice,
      currentFingerprint,
      climateHistoryState,
      forecastState,
      loadExploreClimate,
      simulationState,
      runSimulation,
      activeScenario,
      selectedStrategyId,
    ]
  );

  return <FieldverseContext.Provider value={value}>{children}</FieldverseContext.Provider>;
}

export function useFieldverse() {
  const ctx = useContext(FieldverseContext);
  if (!ctx) {
    throw new Error('useFieldverse debe usarse dentro de FieldverseProvider.');
  }
  return ctx;
}
