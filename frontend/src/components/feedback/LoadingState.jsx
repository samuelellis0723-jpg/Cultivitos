export default function LoadingState({ message = 'Cargando datos…' }) {
  return (
    <div className="fv-state-box" role="status" aria-live="polite">
      <div className="fv-loading-row">
        <span className="fv-spinner" aria-hidden="true" />
        <span>{message}</span>
      </div>
    </div>
  );
}
