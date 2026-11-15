import WaterChoice from '../components/form/WaterChoice.jsx';
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LocationMap from '../components/form/LocationMap.jsx';
import ConnectionStatus from '../components/ConnectionStatus.jsx';
import Icon from '../components/common/Icon.jsx';
import ChoiceGroup from '../components/form/ChoiceGroup.jsx';
import FarmDetails from '../components/form/FarmDetails.jsx';
import FieldError from '../components/form/FieldError.jsx';
import { useFieldverse } from '../context/FieldverseContext.jsx';
import { clearDraft } from '../services/storage.js';
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
  const mapRef = useRef(null);

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

  const ready = catalogState.status === 'ok';
  return (
    <div className="farm-page fv-step-enter">
      <form id="farm-form" onSubmit={handleSubmit} noValidate>
        <div className="farm-layout">
          <div className="farm-form-column">
            <div className="farm-heading">
              <h1>Conozcamos tu finca.</h1>
              <p>Tres datos para empezar a explorar alternativas para tu suelo.</p>
            </div>
            {catalogState.status === 'loading' && <p role="status" className="farm-notice">Estamos preparando las opciones de tu finca…</p>}
            {catalogState.status === 'error' && <div className="farm-notice farm-notice-warning" role="alert">
              <strong>No pudimos cargar las opciones de tu finca.</strong>
              <p>Puedes ubicar tu parcela y guardar lo que llevas. Intenta de nuevo para elegir el agua y tus prioridades.</p>
              <div className="fv-row-wrap"><button type="button" className="fv-btn fv-btn-secondary fv-btn-sm" onClick={reloadCatalog}>Intentar de nuevo</button><button type="button" className="fv-btn fv-btn-secondary fv-btn-sm" onClick={() => switchDataMode('demo')}>Activar modo demostración</button></div>
            </div>}
            {dataMode === 'demo' && <p className="farm-demo-note">Demostración · opciones y resultados ficticios.</p>}
            {draftNotice && <div className="farm-notice" role="status">{draftNotice.text}</div>}
            <section className="farm-question">
              <h2><span className="farm-number">1</span> ¿Dónde está tu finca?</h2>
              <div className="farm-location-row">
                <label className="sr-only" htmlFor="finca-localidad">Nombre o localidad de referencia (opcional)</label>
                <input id="finca-localidad" className="fv-input" placeholder="Nombre de tu finca o localidad" value={fincaDraft.localidad} onChange={e => updateField('localidad', e.target.value)} />
                <button type="button" className="fv-btn fv-btn-secondary" onClick={() => { mapRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' }); mapRef.current?.focus({ preventScroll: true }); }}>Elegir en el mapa</button>
              </div>
              <div className="farm-coordinates">
                {[['latitude', 'Latitud', latRef, -90, 90], ['longitude', 'Longitud', lonRef, -180, 180]].map(([key, label, ref, min, max]) => <div className="fv-field" key={key}>
                  <label htmlFor={`finca-${key}`}>{label}</label>
                  <input ref={ref} id={`finca-${key}`} type="number" step="any" min={min} max={max} className="fv-input" placeholder={key === 'latitude' ? 'Ej. 9.93' : 'Ej. -84.09'} value={fincaDraft[key]} onChange={e => updateField(key, e.target.value)} aria-invalid={Boolean(errors[key])} aria-describedby={errors[key] ? `${key}-error` : undefined} />
                  <FieldError id={`${key}-error`} message={errors[key]} />
                </div>)}
              </div>
              {dataMode === 'demo' && <button className="farm-text-button" type="button" onClick={handleLoadPilotCoords}>Usar ubicación ilustrativa de demostración</button>}
            </section>
            <fieldset className="farm-dependent" disabled={!ready}>
              <legend className="sr-only">Opciones de tu finca</legend>
              <section className="farm-question">
                <WaterChoice options={catalog?.opcionesFinca?.riego} value={fincaDraft.riego} onChange={val => updateField('riego', val)} error={errors.riego} />
                {!ready && <div className="farm-unavailable-cards"><span>Opciones de agua pendientes</span><span>Disponibles al volver a cargar</span></div>}
              </section>
              <section className="farm-question farm-priorities">
                <ChoiceGroup name="prioridad" legend={<><span className="farm-number">3</span> ¿Qué quieres priorizar?</>} options={catalog?.opcionesFinca?.prioridad} value={fincaDraft.prioridad} onChange={val => updateField('prioridad', val)} error={errors.prioridad} />
                {!ready && <div className="farm-unavailable-cards"><span>Prioridades pendientes</span></div>}
              </section>
              <FarmDetails catalog={catalog} draft={fincaDraft} errors={errors} onChange={updateField} onToggleCrop={togglePreviousCrop} forceOpen={forceOpenDetails} />
            </fieldset>
            <p className="farm-crop-note">La comparación utiliza las estrategias disponibles. El cultivo que te interesa aún no forma parte de esta evaluación.</p>
          </div>
          <LocationMap latitude={fincaDraft.latitude} longitude={fincaDraft.longitude} mapRef={mapRef} onSelect={point => { updateField('latitude', point.latitude); updateField('longitude', point.longitude); }} />
        </div>
        <div className="farm-bottom-actions">
          <span>Paso 1 de 3 · Parámetros iniciales de parcela</span>
          <div className="fv-row-wrap"><button type="button" className="farm-text-button" onClick={handleClearDraft}>Borrar borrador</button><button type="submit" className="fv-btn fv-btn-primary" disabled={!ready}>Explorar mi finca <Icon name="arrowRight" size={16} /></button></div>
        </div>
      </form>
      {import.meta.env.DEV && <details className="farm-technical"><summary>Panel técnico de desarrollo</summary><ConnectionStatus />{catalogState.error && <p>{catalogState.error}</p>}</details>}
    </div>
  );
}
