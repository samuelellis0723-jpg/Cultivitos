import EmptyState from '../components/feedback/EmptyState.jsx';

export default function NotFoundPage() {
  return (
    <div className="fv-step-enter">
      <EmptyState
        title="Página no encontrada (404)"
        description="La ruta que intentaste abrir no forma parte del recorrido de FIELDVERSE."
        ctaLabel="Volver al inicio (Tu finca)"
        ctaTo="/"
      />
    </div>
  );
}
