import DataOriginBadge from '../feedback/DataOriginBadge.jsx';
import LoadingState from '../feedback/LoadingState.jsx';

export default function ForecastPanel({ state, onRetry }) {
  return (
    <section className="fv-card" aria-labelledby="forecast-title">
      <div className="fv-page-context" style={{ marginBottom: '8px' }}>
        <div>
          <h2 id="forecast-title" className="fv-section-title">
            3. Pronóstico a 7 días (bloque independiente)
          </h2>
          <p className="fv-section-desc">
            Ventana de corto plazo separada del historial y de los escenarios de temporada. Su indisponibilidad no bloquea la comparación.
          </p>
        </div>
        {state.status === 'ok' && state.data ? (
          <DataOriginBadge origin={state.data.origen} />
        ) : null}
      </div>

      {state.status === 'loading' ? (
        <LoadingState message="Consultando pronóstico de 7 días…" />
      ) : state.status === 'error' || state.status === 'idle' ? (
        <div className="fv-card-soft fv-row-wrap" style={{ justifyContent: 'space-between' }}>
          <div>
            <strong>Pronóstico no disponible en este momento</strong>
            <p className="fv-section-desc">
              {state.error || 'El endpoint de pronóstico aún no está habilitado.'} Puedes continuar hacia Compara con el análisis histórico.
            </p>
          </div>
          {onRetry ? (
            <button type="button" className="fv-btn fv-btn-secondary fv-btn-sm" onClick={onRetry}>
              Reintentar pronóstico
            </button>
          ) : null}
        </div>
      ) : (
        <div>
          <p className="fv-hint" style={{ marginBottom: '10px' }}>
            Fuente: {state.data.fuente}
            {state.data.fechaEmision ? ` · Emitido: ${state.data.fechaEmision.slice(0, 10)}` : ''}
          </p>
          <div className="fv-kv-list">
            {state.data.dias.map((day) => (
              <div key={day.fecha} className="fv-kv-item">
                <span className="fv-kv-key">{day.fecha}</span>
                <span className="fv-kv-val">
                  {day.precipitacionMm ?? '—'} mm · {day.tempMediaC ?? '—'} °C
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
