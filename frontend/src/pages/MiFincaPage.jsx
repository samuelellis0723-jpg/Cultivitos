import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ConnectionStatus from '../components/ConnectionStatus.jsx';
import Icon from '../components/common/Icon.jsx';
import DataOriginBadge from '../components/feedback/DataOriginBadge.jsx';
import ErrorState from '../components/feedback/ErrorState.jsx';
import LoadingState from '../components/feedback/LoadingState.jsx';
import ChoiceGroup from '../components/form/ChoiceGroup.jsx';
import FarmDetails from '../components/form/FarmDetails.jsx';
import FieldError from '../components/form/FieldError.jsx';
import FlowActions from '../components/layout/FlowActions.jsx';
import { useFieldverse } from '../context/FieldverseContext.jsx';
import { clearDraft, saveDraft } from '../services/storage.js';
import { createEmptyFinca, validateFinca } from '../utils/validation.js';

export default function MiFincaPage() {
  const navigate = useNavigate();
  const {
    dataMode,
    switchDataMode,
    catalogState,
    reloadCatalog,
    fincaDraft,
    setFincaDraft,
    setSavedFinca,
    draftNotice,
    setDraftNotice,
  } = useFieldverse();

  const [errors, setErrors] = useState({});
  const [forceOpenDetails, setForceOpenDetails] = useState(false);

  const latRef = useRef(null);
  const lonRef = useRef(null);

  const catalog = catalogState.data;

  const updateField = (field, value) => {
    setFincaDraft((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const togglePreviousCrop = (cropId) => {
    setFincaDraft((prev) => {
      const current = Array.isArray(prev.cultivosAnteriores) ? prev.cultivosAnteriores : [];
      const exists = current.includes(cropId);
      const nextCrops = exists ? current.filter((id) => id !== cropId) : [...current, cropId];
      return { ...prev, cultivosAnteriores: nextCrops };
    });
  };

  const handleSaveDraft = () => {
    const result = saveDraft(fincaDraft, catalog?.version);
    if (result.ok) {
      setDraftNotice({
        type: 'info',
        text: `Borrador guardado en este dispositivo (${new Date(result.savedAt).toLocaleTimeString('es-CR')}).`,
      });
    } else {
      setDraftNotice({ type: 'error', text: result.error });
    }
  };

  const handleClearDraft = () => {
    const res = clearDraft();
    if (res.ok) {
      setFincaDraft(createEmptyFinca(catalog));
      setSavedFinca(null);
      setErrors({});
      setDraftNotice({ type: 'info', text: 'Borrador local eliminado.' });
    } else {
      setDraftNotice({ type: 'error', text: res.error });
    }
  };

  const handleLoadPilotCoords = () => {
    const pilot = catalog?.localidadPiloto;
    setFincaDraft((prev) => ({
      ...prev,
      localidad: pilot?.nombre || 'Coordenadas ilustrativas (contrato)',
      latitude: String(pilot?.latitude ?? 9.93),
      longitude: String(pilot?.longitude ?? -84.09),
    }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next.latitude;
      delete next.longitude;
      return next;
    });
  };

  const handleSubmit = (e) => {
    e?.preventDefault();
    const result = validateFinca(fincaDraft, catalog);
    if (!result.valid) {
      setErrors(result.errors);
      if (result.errors.suelo || result.errors.drenaje || result.errors.mesInicio || result.errors.cultivosAnteriores) {
        setForceOpenDetails(true);
      }
      if (result.errors.latitude) {
        latRef.current?.focus();
      } else if (result.errors.longitude) {
        lonRef.current?.focus();
      }
      return;
    }

    setErrors({});
    setSavedFinca(result.normalized);
    navigate('/explora');
  };

  return (
    <div className="fv-step-enter">
      <div className="fv-page-context">
        <div className="fv-context-left">
          <span className="fv-badge fv-badge-step">Paso 1 de 3 · Tu finca</span>
          <DataOriginBadge origin={dataMode === 'demo' ? 'demo' : 'live'} />
        </div>
        {catalog?.version ? (
          <span className="fv-hint">Catálogo: {catalog.version}</span>
        ) : null}
      </div>

      <div className="fv-page-header">
        <div>
          <h1 className="fv-page-title">Conozcamos tu finca</h1>
          <p className="fv-page-lead">
            Registra la ubicación, disponibilidad de agua y condiciones de tu parcela para consultar el clima y comparar estrategias en ciclos ordenados.
          </p>
        </div>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <ConnectionStatus />
      </div>

      {catalogState.status === 'loading' ? (
        <LoadingState message="Cargando vocabulario y opciones del catálogo…" />
      ) : catalogState.status === 'error' ? (
        <ErrorState
          title="Catálogo en vivo no disponible"
          message={`${catalogState.error} En modo en vivo no se sustituyen las opciones por listas locales silenciosas.`}
          onRetry={reloadCatalog}
          extraAction={
            <button
              type="button"
              className="fv-btn fv-btn-primary fv-btn-sm"
              onClick={() => switchDataMode('demo')}
            >
              Activar modo demostración
            </button>
          }
        />
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          {draftNotice ? (
            <div
              className={`fv-state-box ${draftNotice.type === 'error' ? 'fv-state-error' : ''}`}
              role="status"
              aria-live="polite"
              style={{ marginBottom: '20px', padding: '12px 16px' }}
            >
              <span>{draftNotice.text}</span>
            </div>
          ) : null}

          <div className="fv-card fv-form-grid">
            <div className="fv-form-section fv-form-section-full">
              <div className="fv-row-wrap" style={{ justifyContent: 'space-between' }}>
                <div>
                  <h2 className="fv-section-title">Ubicación de la parcela</h2>
                  <p className="fv-section-desc">
                    Ingresa coordenadas decimales válidas (latitud -90 a 90, longitud -180 a 180).
                  </p>
                </div>
                {dataMode === 'demo' ? (
                  <button
                    type="button"
                    className="fv-btn fv-btn-secondary fv-btn-sm"
                    onClick={handleLoadPilotCoords}
                  >
                    <Icon name="pin" size={16} />
                    <span>Cargar coordenadas ilustrativas (demo)</span>
                  </button>
                ) : null}
              </div>

              <div className="fv-field">
                <label className="fv-label" htmlFor="finca-localidad">
                  Nombre o localidad de referencia (opcional)
                </label>
                <input
                  id="finca-localidad"
                  name="localidad"
                  type="text"
                  className="fv-input"
                  placeholder="Ej. Lote Norte"
                  value={fincaDraft.localidad}
                  onChange={(e) => updateField('localidad', e.target.value)}
                />
              </div>

              <div className="fv-coords-row">
                <div className="fv-field">
                  <label className="fv-label" htmlFor="finca-latitude">
                    Latitud *
                  </label>
                  <input
                    ref={latRef}
                    id="finca-latitude"
                    name="latitude"
                    type="number"
                    step="any"
                    min="-90"
                    max="90"
                    className="fv-input"
                    placeholder="Ej. 9.93"
                    value={fincaDraft.latitude}
                    onChange={(e) => updateField('latitude', e.target.value)}
                    aria-invalid={Boolean(errors.latitude)}
                    aria-describedby={errors.latitude ? 'latitude-error' : 'latitude-hint'}
                  />
                  <span id="latitude-hint" className="fv-hint">
                    Rango permitido: -90 a 90.
                  </span>
                  <FieldError id="latitude-error" message={errors.latitude} />
                </div>

                <div className="fv-field">
                  <label className="fv-label" htmlFor="finca-longitude">
                    Longitud *
                  </label>
                  <input
                    ref={lonRef}
                    id="finca-longitude"
                    name="longitude"
                    type="number"
                    step="any"
                    min="-180"
                    max="180"
                    className="fv-input"
                    placeholder="Ej. -84.09"
                    value={fincaDraft.longitude}
                    onChange={(e) => updateField('longitude', e.target.value)}
                    aria-invalid={Boolean(errors.longitude)}
                    aria-describedby={errors.longitude ? 'longitude-error' : 'longitude-hint'}
                  />
                  <span id="longitude-hint" className="fv-hint">
                    Rango permitido: -180 a 180.
                  </span>
                  <FieldError id="longitude-error" message={errors.longitude} />
                </div>
              </div>
            </div>

            <div className="fv-form-section">
              <ChoiceGroup
                name="riego"
                legend="Disponibilidad de agua / riego *"
                hint="Indica el régimen real. «No lo sé» se conserva como desconocido, nunca como cero."
                options={catalog?.opcionesFinca?.riego}
                value={fincaDraft.riego}
                onChange={(val) => updateField('riego', val)}
                error={errors.riego}
              />
            </div>

            <div className="fv-form-section">
              <ChoiceGroup
                name="prioridad"
                legend="Prioridad principal *"
                hint="Orienta el enfoque de la comparación sin prometer cosechas."
                options={catalog?.opcionesFinca?.prioridad}
                value={fincaDraft.prioridad}
                onChange={(val) => updateField('prioridad', val)}
                error={errors.prioridad}
              />
            </div>

            <FarmDetails
              catalog={catalog}
              draft={fincaDraft}
              errors={errors}
              onChange={updateField}
              onToggleCrop={togglePreviousCrop}
              forceOpen={forceOpenDetails}
            />

            <div className="fv-form-section-full fv-row-wrap" style={{ justifyContent: 'space-between', paddingTop: '8px' }}>
              <div className="fv-row-wrap">
                <button
                  type="button"
                  className="fv-btn fv-btn-secondary"
                  onClick={handleSaveDraft}
                >
                  Guardar borrador en este dispositivo
                </button>
                <button
                  type="button"
                  className="fv-btn fv-btn-ghost"
                  onClick={handleClearDraft}
                >
                  Borrar borrador
                </button>
              </div>
              <button type="submit" className="fv-btn fv-btn-primary">
                <span>Explorar mi finca</span>
                <Icon name="arrowRight" size={18} />
              </button>
            </div>
          </div>
        </form>
      )}

      {catalogState.status === 'ok' ? (
        <FlowActions
          stepNumber={1}
          stepLabel="Perfil de tu finca"
          primaryLabel="Explorar mi finca"
          onPrimaryClick={handleSubmit}
        />
      ) : null}
    </div>
  );
}
