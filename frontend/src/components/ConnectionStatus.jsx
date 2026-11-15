import { useEffect, useState } from 'react';
import { getHealth } from '../services/api.js';
import Icon from './common/Icon.jsx';

export default function ConnectionStatus() {
  const [state, setState] = useState({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const timer = setTimeout(() => controller.abort(), 5000);
    setState({ status: 'loading' });
    getHealth(controller.signal)
      .then((data) => {
        if (active) setState({ status: 'ok', data });
      })
      .catch(() => {
        if (active) setState({ status: 'error' });
      })
      .finally(() => clearTimeout(timer));

    return () => {
      active = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [attempt]);

  return (
    <section className="fv-card-soft" aria-labelledby="connection-title">
      <div className="fv-row-wrap" style={{ justifyContent: 'space-between' }}>
        <div>
          <h2 id="connection-title" style={{ fontSize: '15px', fontWeight: 700 }}>
            Estado técnico del servidor
          </h2>
          <p role="status" aria-live="polite" className="fv-hint" style={{ color: 'var(--fv-text)', marginTop: '4px' }}>
            {state.status === 'loading'
              ? 'Comprobando conexión con /api/health…'
              : state.status === 'ok'
              ? `Conectado · ${state.data.service} · v${state.data.version} (diagnóstico técnico; no acredita disponibilidad de NASA POWER)`
              : 'No se pudo conectar con el backend en el puerto 3000. Puedes activar el modo demostración si deseas explorar la interfaz.'}
          </p>
        </div>
        <button
          type="button"
          className="fv-btn fv-btn-secondary fv-btn-sm"
          disabled={state.status === 'loading'}
          onClick={() => setAttempt((value) => value + 1)}
        >
          <Icon name="refresh" size={16} />
          <span>Volver a comprobar</span>
        </button>
      </div>
    </section>
  );
}
