export function cycleDurationLabel(cycle) {
  if (!cycle) return null;
  const duration = Object.hasOwn(cycle, 'duracionDias')
    ? cycle.duracionDias
    : cycle.duracionMeses;
  if ((Object.hasOwn(cycle, 'duracionDias') || Object.hasOwn(cycle, 'duracionMeses')) && duration == null) {
    return 'Duración: Pendiente de validación';
  }
  return null;
}
