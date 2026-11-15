import { Link } from 'react-router-dom';
import Icon from '../common/Icon.jsx';

export default function FlowActions({
  stepNumber,
  stepLabel,
  backTo,
  backLabel,
  primaryLabel,
  primaryTo,
  onPrimaryClick,
  primaryDisabled = false,
}) {
  return (
    <nav className="fv-flow-bar" aria-label="Navegación de pasos">
      <div>
        {backTo ? (
          <Link className="fv-btn fv-btn-ghost" to={backTo}>
            <Icon name="arrowLeft" size={18} />
            <span>{backLabel}</span>
          </Link>
        ) : (
          <span className="fv-hint">Paso inicial del recorrido</span>
        )}
      </div>

      <div className="fv-row-wrap">
        <div className="fv-flow-dots" aria-hidden="true">
          {[1, 2, 3].map((dot) => (
            <span
              key={dot}
              className={`fv-flow-dot${
                dot < stepNumber ? ' is-done' : dot === stepNumber ? ' is-current' : ''
              }`}
            />
          ))}
        </div>
        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--fv-primary)' }}>
          Paso {stepNumber} de 3: {stepLabel}
        </span>
      </div>

      <div>
        {primaryTo ? (
          <Link className="fv-btn fv-btn-primary" to={primaryTo}>
            <span>{primaryLabel}</span>
            <Icon name="arrowRight" size={18} />
          </Link>
        ) : onPrimaryClick ? (
          <button
            type="button"
            className="fv-btn fv-btn-primary"
            onClick={onPrimaryClick}
            disabled={primaryDisabled}
          >
            <span>{primaryLabel}</span>
            <Icon name="check" size={18} />
          </button>
        ) : null}
      </div>
    </nav>
  );
}
