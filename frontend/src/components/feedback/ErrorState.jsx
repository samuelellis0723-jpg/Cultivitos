import Icon from '../common/Icon.jsx';

export default function ErrorState({
  title = 'No se pudo completar la consulta',
  message,
  onRetry,
  retryLabel = 'Reintentar',
  extraAction,
}) {
  return (
    <div className="fv-state-box fv-state-error" role="alert">
      <div className="fv-row-wrap">
        <Icon name="alert" size={20} />
        <strong>{title}</strong>
      </div>
      {message ? <p>{message}</p> : null}
      <div className="fv-row-wrap">
        {onRetry ? (
          <button type="button" className="fv-btn fv-btn-secondary fv-btn-sm" onClick={onRetry}>
            <Icon name="refresh" size={16} />
            <span>{retryLabel}</span>
          </button>
        ) : null}
        {extraAction}
      </div>
    </div>
  );
}
