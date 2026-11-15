import { useEffect, useRef } from 'react';
import Icon from '../common/Icon.jsx';
import DataOriginBadge from '../feedback/DataOriginBadge.jsx';

export function EvidenceContent({
  finca,
  catalog,
  simulation,
  climateHistory,
  onDownloadJson,
  onPrint,
}) {
  const ev = simulation?.evidencia;
  const fuentes = ev?.fuentes?.length ? ev.fuentes : catalog?.fuentes ?? [];

  return (
    <div className="fv-evidence-card">
      <div className="fv-row-wrap" style={{ justifyContent: 'space-between' }}>
        <div className="fv-row-wrap">
          <div className="fv-context-pill-icon">
            <Icon name="book" size={18} />
          </div>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 700 }}>Evidencia y supuestos</h2>
            <p className="fv-hint">Trazabilidad de versiones, datos y criterio</p>
          </div>
        </div>
        <DataOriginBadge origin={ev?.origen || (simulation?.estado === 'demo' ? 'demo' : undefined)} />
      </div>

      <details className="fv-accordion" open>
        <summary>
          <span className="fv-row-wrap">
            <Icon name="tune" size={16} />
            <span>Cómo decide el criterio minimax</span>
          </span>
          <span className="fv-accordion-chevron">
            <Icon name="chevronDown" size={18} />
          </span>
        </summary>
        <div className="fv-accordion-body">
          <p>
            Compara cuánto se aleja cada estrategia de la mejor opción de cada escenario y elige la que tiene la menor diferencia máxima.
          </p>
          <p>
            Escala de puntajes: <strong>0–100</strong> (mayor es mejor). Peor arrepentimiento: <strong>menor es mejor</strong>. Seleccionar una tarjeta para tu plan no altera qué estrategia ganó según el motor.
          </p>
        </div>
      </details>

      <details className="fv-accordion">
        <summary>
          <span className="fv-row-wrap">
            <Icon name="pin" size={16} />
            <span>Perfil declarado y supuestos</span>
          </span>
          <span className="fv-accordion-chevron">
            <Icon name="chevronDown" size={18} />
          </span>
        </summary>
        <div className="fv-accordion-body">
          <div className="fv-kv-list">
            <div className="fv-kv-item">
              <span className="fv-kv-key">Coordenadas</span>
              <span className="fv-kv-val">
                {finca?.latitude}, {finca?.longitude}
              </span>
            </div>
            <div className="fv-kv-item">
              <span className="fv-kv-key">Riego / Suelo / Drenaje</span>
              <span className="fv-kv-val">
                {finca?.riego} · {finca?.suelo} · {finca?.drenaje}
              </span>
            </div>
            <div className="fv-kv-item">
              <span className="fv-kv-key">Mes inicio / Prioridad</span>
              <span className="fv-kv-val">
                Mes {finca?.mesInicio} · {finca?.prioridad}
              </span>
            </div>
          </div>

          {ev?.supuestos?.length ? (
            <ul style={{ margin: '4px 0 0 18px', padding: 0 }}>
              {ev.supuestos.map((s, idx) => (
                <li key={idx}>{s}</li>
              ))}
            </ul>
          ) : (
            <span>Sin supuestos adicionales reportados.</span>
          )}
        </div>
      </details>

      <details className="fv-accordion">
        <summary>
          <span className="fv-row-wrap">
            <Icon name="science" size={16} />
            <span>Fuentes, versiones y faltantes</span>
          </span>
          <span className="fv-accordion-chevron">
            <Icon name="chevronDown" size={18} />
          </span>
        </summary>
        <div className="fv-accordion-body">
          <div className="fv-kv-list">
            <div className="fv-kv-item">
              <span className="fv-kv-key">Catálogo</span>
              <span className="fv-kv-val">{ev?.catalogoVersion || catalog?.version || '—'}</span>
            </div>
            <div className="fv-kv-item">
              <span className="fv-kv-key">Motor / Reglas</span>
              <span className="fv-kv-val">
                {ev?.motorVersion || '—'} · {ev?.reglasVersion || '—'}
              </span>
            </div>
            {climateHistory?.periodo ? (
              <div className="fv-kv-item">
                <span className="fv-kv-key">Período climático</span>
                <span className="fv-kv-val">
                  {climateHistory.periodo.inicio} – {climateHistory.periodo.fin}
                </span>
              </div>
            ) : null}
          </div>

          {fuentes.length > 0 ? (
            <div>
              <strong>Fuentes:</strong>
              <ul style={{ margin: '4px 0 0 18px', padding: 0 }}>
                {fuentes.map((f, i) => (
                  <li key={f.id || i}>
                    {f.titulo || f.id}
                    {f.fecha ? ` (${f.fecha})` : ''}
                    {f.url ? ` — ${f.url}` : ''}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {ev?.datosFaltantes?.length > 0 ? (
            <div>
              <strong>Datos faltantes declarados:</strong>
              <ul style={{ margin: '4px 0 0 18px', padding: 0 }}>
                {ev.datosFaltantes.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </details>

      <div className="fv-card-soft fv-no-print" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <span className="fv-kv-key">Exportación real</span>
        <button type="button" className="fv-btn fv-btn-secondary" onClick={onDownloadJson}>
          <Icon name="download" size={18} />
          <span>Descargar resultados (.json)</span>
        </button>
        <button type="button" className="fv-btn fv-btn-secondary" onClick={onPrint}>
          <Icon name="print" size={18} />
          <span>Imprimir / guardar como PDF</span>
        </button>
      </div>
    </div>
  );
}

export function MobileEvidenceDialog({ open, onClose, triggerRef, children }) {
  const closeBtnRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    closeBtnRef.current?.focus();

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      triggerRef?.current?.focus();
    };
  }, [open, onClose, triggerRef]);

  if (!open) return null;

  return (
    <div
      className="fv-dialog-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Evidencia y supuestos"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="fv-dialog-panel">
        <div className="fv-row-wrap" style={{ justifyContent: 'space-between', marginBottom: '12px' }}>
          <strong>Evidencia técnica</strong>
          <button
            ref={closeBtnRef}
            type="button"
            className="fv-btn fv-btn-secondary fv-btn-sm"
            onClick={onClose}
            aria-label="Cerrar panel de evidencia"
          >
            <Icon name="close" size={16} />
            <span>Cerrar</span>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
