import { useEffect, useState } from 'react';
import { getHealth } from '../services/api.js';
export default function ConnectionStatus() {
  const [state, setState] = useState({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const timer = setTimeout(() => controller.abort(), 5000);
    setState({ status: 'loading' });
    getHealth(controller.signal).then(data => { if (active) setState({ status: 'ok', data }); })
      .catch(() => { if (active) setState({ status: 'error' }); })
      .finally(() => clearTimeout(timer));
    return () => { active = false; clearTimeout(timer); controller.abort(); };
  }, [attempt]);
  return <section className="connection" aria-labelledby="connection-title">
    <h2 id="connection-title">Conexión con el backend</h2>
    <p role="status" aria-live="polite">{state.status === 'loading' ? 'Comprobando conexión…' : state.status === 'ok' ? `Conectado · ${state.data.service} · v${state.data.version}` : 'No se pudo conectar. Comprueba que el backend esté activo en el puerto 3000.'}</p>
    <button disabled={state.status === 'loading'} onClick={() => setAttempt(value => value + 1)}>Volver a comprobar</button>
  </section>;
}
