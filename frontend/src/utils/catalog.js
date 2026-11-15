export function cycleDurationLabel(cycle) {
  if (!cycle) return null;
  const hasPublishedDuration = Object.hasOwn(cycle, 'duracionMeses');
  const hasAgreedDuration = Object.hasOwn(cycle, 'duracionDias');
  if ((hasPublishedDuration || hasAgreedDuration) && cycle.duracionMeses == null && cycle.duracionDias == null) {
    return 'Duración: Pendiente de validación';
  }
  return null;
}
