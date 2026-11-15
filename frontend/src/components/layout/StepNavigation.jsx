import { NavLink } from 'react-router-dom';

const STEPS = [
  { num: 1, label: 'Tu finca', to: '/' },
  { num: 2, label: 'Explora', to: '/explora' },
  { num: 3, label: 'Compara', to: '/compara' },
];

export default function StepNavigation() {
  return (
    <nav className="fv-step-nav" aria-label="Pasos del análisis">
      {STEPS.map((step, index) => (
        <span key={step.to} className="fv-row-wrap" style={{ gap: '6px', flex: '0 1 auto' }}>
          {index > 0 ? <span className="fv-step-divider" aria-hidden="true" /> : null}
          <NavLink
            to={step.to}
            end={step.to === '/'}
            className={({ isActive }) =>
              `fv-step-link${isActive ? ' is-active' : ''}`
            }
          >
            <span className="fv-step-num" aria-hidden="true">
              {step.num}
            </span>
            <span>{step.label}</span>
          </NavLink>
        </span>
      ))}
    </nav>
  );
}
