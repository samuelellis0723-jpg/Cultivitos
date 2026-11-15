import { Link } from 'react-router-dom';
import Icon from '../common/Icon.jsx';

export default function EmptyState({ title, description, ctaLabel, ctaTo }) {
  return (
    <section className="fv-state-box" aria-label={title}>
      <div className="fv-row-wrap">
        <Icon name="info" size={20} />
        <h2>{title}</h2>
      </div>
      <p>{description}</p>
      {ctaTo && ctaLabel ? (
        <Link className="fv-btn fv-btn-primary" to={ctaTo}>
          <span>{ctaLabel}</span>
          <Icon name="arrowRight" size={18} />
        </Link>
      ) : null}
    </section>
  );
}
