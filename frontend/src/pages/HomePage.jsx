import ConnectionStatus from '../components/ConnectionStatus.jsx';
export default function HomePage() {
  return <main><header><a className="brand" href="/">FIELDVERSE</a><span>Base del equipo · Cultivitos</span></header>
    <section className="intro"><p className="eyebrow">NASA Space Apps · Field Shift</p><h1>Una base compartida.<br />Tres áreas de trabajo.</h1><p className="lead">El proyecto está preparado para construir el perfil de finca, integrar datos climáticos y comparar estrategias agrícolas.</p></section>
    <ConnectionStatus />
    <section className="team" aria-label="Áreas del equipo"><article><span>01 · Samuel</span><h2>Interfaz</h2><p>Formulario, gráficos, resultados y evidencia.</p></article><article><span>02 · Alex</span><h2>Datos y API</h2><p>NASA POWER, servidor, caché y pronóstico.</p></article><article><span>03 · Hellen</span><h2>Motor y metodología</h2><p>Catálogo, escenarios y comparación de estrategias.</p></article></section>
    <footer>Base técnica inicial. Las consultas climáticas y el simulador aún están pendientes de implementación.</footer></main>;
}
