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
          1. Historial climático 2015–2024
        </h2>
        <LoadingState message="Consultando serie histórica de temperatura y precipitación…" />
      </section>
    );
  }

  if (state.status === 'error') {
    return (
      <section className="fv-card" aria-labelledby="climate-history-title">
        <h2 id="climate-history-title" className="fv-section-title">
          1. Historial climático 2015–2024
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
  const sources = data.fuentes ?? [];
  const displayDate = (value) => value && /^\d{8}$/.test(value)
    ? `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`
    : value || '—';

  return (
    <section className="fv-card" aria-labelledby="climate-history-title">
      <div className="fv-page-context" style={{ marginBottom: '8px' }}>
        <div>
          <h2 id="climate-history-title" className="fv-section-title">
            1. Historial climático 2015–2024
          </h2>
          <p className="fv-section-desc">
            Observaciones diarias entre 2015 y 2024. No representa el tiempo actual ni un pronóstico. Los días sin registro se muestran como huecos, nunca como cero.
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
          <span>{sources.length ? sources.map((source, index) => <span key={source.id || index}>{index ? ' · ' : ''}{source.titulo || source.proveedor || source.id || 'Fuente'}{source.urlConsulta && /^https?:\/\//.test(source.urlConsulta) ? <> · <a href={source.urlConsulta} target="_blank" rel="noopener noreferrer">Consultar fuente</a></> : null}{source.origen ? <> · <DataOriginBadge origin={source.origen} />{source.origen === 'backup' && source.antiguedad ? ` · ${source.antiguedad}` : ''}</> : null}</span>) : 'Fuente no informada'}</span>
        </div>
        <div>
          <span className="fv-meta-item-label">Período</span>
          <span>
            {displayDate(data.periodo?.inicio)} a {displayDate(data.periodo?.fin)} · {data.resolucion}
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
            Precip: {precip?.cobertura?.porcentaje ?? '—'}% · Temp. media: {temp?.cobertura?.porcentaje ?? '—'}% · Temp. máxima: {data.variables?.temperaturaMaxima?.cobertura?.porcentaje ?? '—'}%
            {precip?.fechaConsulta ? ` · ${precip.fechaConsulta.slice(0, 10)}` : ''}
          </span>
        </div>
      </div>
    </section>
  );
}
