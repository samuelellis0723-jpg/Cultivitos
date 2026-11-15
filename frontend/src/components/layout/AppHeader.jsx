import { Link } from 'react-router-dom';
import { useFieldverse } from '../../context/FieldverseContext.jsx';
import StepNavigation from './StepNavigation.jsx';

export default function AppHeader() {
  const { dataMode, switchDataMode, demoCase, setDemoCase } = useFieldverse();

  return (
    <>
      <a className="skip-link" href="#main-content">
        Saltar al contenido principal
      </a>
      <header className="fv-header">
        <div className="fv-header-inner">
          <Link to="/" className="fv-brand">
            <span className="fv-brand-row">
              <span className="fv-brand-name">Fieldverse</span>
              <span className="fv-brand-dot" aria-hidden="true" />
            </span>
            <span className="fv-brand-sub">Una decisión, paso a paso</span>
          </Link>

          <StepNavigation />

          <div className="fv-header-actions">
            <button
              type="button"
              className="fv-btn fv-btn-secondary fv-btn-sm"
              onClick={() => switchDataMode(dataMode === 'demo' ? 'live' : 'demo')}
              aria-pressed={dataMode === 'demo'}
            >
              {dataMode === 'demo' ? 'Salir de demo' : 'Modo demostración'}
            </button>
          </div>
        </div>
      </header>

      {dataMode === 'demo' ? (
        <div className="fv-demo-bar" role="region" aria-label="Estado de modo demostración">
          <div className="fv-demo-bar-inner">
            <div>
              <strong>MODO DEMOSTRACIÓN:</strong> estás viendo fixtures ficticios de desarrollo. No son datos de NASA POWER ni recomendaciones agronómicas reales.
            </div>
            <label className="fv-row-wrap" style={{ fontSize: '12px', fontWeight: 600 }}>
              <span>Caso de prueba:</span>
              <select
                className="fv-select"
                style={{ minHeight: '34px', padding: '4px 8px', width: 'auto', fontSize: '12px' }}
                value={demoCase}
                onChange={(e) => setDemoCase(e.target.value)}
                aria-label="Seleccionar caso de prueba en modo demostración"
              >
                <option value="default">Matriz A / B / C (gana C)</option>
                <option value="tie">Empate minimax (B y C)</option>
                <option value="incomplete">Incompleto (null + motivos)</option>
                <option value="no_options">Sin opciones (descartes)</option>
              </select>
            </label>
          </div>
        </div>
      ) : null}
    </>
  );
}
