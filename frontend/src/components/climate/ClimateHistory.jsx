import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import DataOriginBadge from '../feedback/DataOriginBadge.jsx';
import ErrorState from '../feedback/ErrorState.jsx';
import LoadingState from '../feedback/LoadingState.jsx';

export default function ClimateHistory({ state, onRetry }) {
  if (state.status === 'loading' || state.status === 'idle') {
    return (
      <section className="fv-card" aria-labelledby="climate-history-title">
        <h2 id="climate-history-title" className="fv-section-title">
          1. Historial climático observado
        </h2>
        <LoadingState message="Consultando serie histórica de temperatura y precipitación…" />
      </section>
    );
  }

  if (state.status === 'error') {
    return (
      <section className="fv-card" aria-labelledby="climate-history-title">
        <h2 id="climate-history-title" className="fv-section-title">
          1. Historial climático observado
        </h2>
        <ErrorState
          title="Historial climático no disponible"
          message={state.error}
          onRetry={onRetry}
        />
      </section>
    );
  }

  const data = state.data;
  const precip = data.variables?.precipitacion;
  const temp = data.variables?.temperaturaMedia;
  const sourceTitle = data.fuentes?.[0]?.titulo || data.fuentes?.[0]?.proveedor || 'Fuente sin nombre';

  return (
    <section className="fv-card" aria-labelledby="climate-history-title">
      <div className="fv-page-context" style={{ marginBottom: '8px' }}>
        <div>
          <h2 id="climate-history-title" className="fv-section-title">
            1. Historial climático observado
          </h2>
          <p className="fv-section-desc">
            Serie diaria histórica. Los días sin registro se muestran como huecos vacíos, nunca como cero.
          </p>
        </div>
        <DataOriginBadge origin={data.origen} antiguedadHoras={data.antiguedadHoras} />
      </div>

      <div className="fv-row-wrap" style={{ marginBottom: '12px' }}>
        {Object.entries(data.variables).map(([key, variable]) => <span key={key} className="fv-hint">{key}: <DataOriginBadge origin={variable.procedencia} />{variable.procedencia === 'backup' ? ` · ${data.fuentes.find(f => f.id === variable.fuenteId)?.antiguedad || 'Antigüedad no indicada'}` : ''}</span>)}
      </div>
      <div className="fv-chart-wrap" role="img" aria-label="Gráfico histórico de precipitación y temperatura media diaria">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data.chartSeries} margin={{ top: 10, right: 16, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(23, 32, 25, 0.12)" />
            <XAxis dataKey="fecha" tick={{ fontSize: 11, fill: '#424842' }} minTickGap={18} />
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 11, fill: '#424842' }}
              label={{ value: precip?.unidad || 'mm', angle: -90, position: 'insideLeft', fontSize: 11 }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 11, fill: '#424842' }}
              label={{ value: temp?.unidad || '°C', angle: 90, position: 'insideRight', fontSize: 11 }}
            />
            <Tooltip
              formatter={(value, name) =>
                value === null || value === undefined ? ['Sin dato (hueco)', name] : [value, name]
              }
            />
            <Legend />
            <Bar
              yAxisId="left"
              dataKey="precipitacion"
              name={`Precipitación (${precip?.unidad || 'mm'})`}
              fill="#4a6b7c"
              radius={[3, 3, 0, 0]}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="temperaturaMedia"
              name={`Temp. media (${temp?.unidad || '°C'})`}
              stroke="#183321"
              strokeWidth={2.5}
              dot={{ r: 3 }}
              connectNulls={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="fv-meta-strip">
        <div>
          <span className="fv-meta-item-label">Fuente</span>
          <span>{sourceTitle}</span>
        </div>
        <div>
          <span className="fv-meta-item-label">Período</span>
          <span>
            {data.periodo?.inicio || '—'} a {data.periodo?.fin || '—'} ({data.resolucion})
          </span>
        </div>
        <div>
          <span className="fv-meta-item-label">Coordenadas</span>
          <span>
            Sol: {data.coordenadas?.solicitadas?.latitude}, {data.coordenadas?.solicitadas?.longitude}
            {data.coordenadas?.devueltas
              ? ` · Dev: ${data.coordenadas.devueltas.latitude}, ${data.coordenadas.devueltas.longitude}`
              : ''}
          </span>
        </div>
        <div>
          <span className="fv-meta-item-label">Cobertura y consulta</span>
          <span>
            Precip: {precip?.cobertura?.porcentaje ?? '—'}% · Temp: {temp?.cobertura?.porcentaje ?? '—'}%
            {precip?.fechaConsulta ? ` · ${precip.fechaConsulta.slice(0, 10)}` : ''}
          </span>
        </div>
      </div>
    </section>
  );
}
