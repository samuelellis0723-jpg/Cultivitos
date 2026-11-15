/** Copia interna conservadora. No migra el catálogo público ni convierte meses a días. */
export function adaptarCatalogoDominio(catalogo) {
  const copia = structuredClone(catalogo);
  const datosFaltantes = [];
  for (const cultivo of Array.isArray(copia?.cultivos) ? copia.cultivos : []) {
    if (!cultivo || !Array.isArray(cultivo.ciclos)) continue;
    for (const ciclo of cultivo.ciclos) {
      if (!ciclo || typeof ciclo !== 'object' || Array.isArray(ciclo)) continue;
      const ruta = `${cultivo.id}/${ciclo.id}`;
      if (ciclo.duracionMeses === undefined) ciclo.duracionMeses = null;
      if (ciclo.duracionDias === undefined) ciclo.duracionDias = null;
      if (ciclo.duracionDias === null) datosFaltantes.push(`${ruta}/duracionDias`);
      // Una ventana heredada y una fuente genérica no confirman evidencia D19.
      if (ciclo.nivelEvidencia === undefined) ciclo.nivelEvidencia = 'pendiente';
      if (ciclo.alcanceGeografico === undefined) ciclo.alcanceGeografico = null;
      if (ciclo.localidad === undefined) ciclo.localidad = null;
      if (ciclo.nivelEvidencia === 'pendiente') datosFaltantes.push(`${ruta}/evidencia`);
    }
  }
  return { catalogo: copia, datosFaltantes };
}
