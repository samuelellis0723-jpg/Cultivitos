export function createEmptyFinca(catalog) {
  const firstOrUnknown = (list, fallback = 'desconocido') => {
    if (!Array.isArray(list) || list.length === 0) return fallback;
    const unknown = list.find((item) => item.valor === 'desconocido');
    return unknown ? unknown.valor : list[0].valor;
  };

  return {
    localidad: '',
    latitude: '',
    longitude: '',
    suelo: firstOrUnknown(catalog?.opcionesFinca?.suelo),
    drenaje: firstOrUnknown(catalog?.opcionesFinca?.drenaje),
    riego: firstOrUnknown(catalog?.opcionesFinca?.riego),
    cultivosAnteriores: [],
    mesInicio: '',
    prioridad: catalog?.opcionesFinca?.prioridad?.[0]?.valor ?? 'equilibrio',
  };
}

export function validateFinca(draft, catalog) {
  const errors = {};

  if (!catalog || !catalog.opcionesFinca) {
    return {
      valid: false,
      errors: {
        _form: 'El catálogo aún no está disponible para validar las opciones de la finca.',
      },
      normalized: null,
    };
  }

  const latStr = String(draft?.latitude ?? '').trim();
  const lonStr = String(draft?.longitude ?? '').trim();

  if (latStr === '') {
    errors.latitude = 'Ingresa la latitud de tu finca.';
  } else {
    const latNum = Number(latStr);
    if (!Number.isFinite(latNum) || latNum < -90 || latNum > 90) {
      errors.latitude = 'La latitud debe ser un número entre -90 y 90.';
    }
  }

  if (lonStr === '') {
    errors.longitude = 'Ingresa la longitud de tu finca.';
  } else {
    const lonNum = Number(lonStr);
    if (!Number.isFinite(lonNum) || lonNum < -180 || lonNum > 180) {
      errors.longitude = 'La longitud debe ser un número entre -180 y 180.';
    }
  }

  const mesStr = String(draft?.mesInicio ?? '').trim();
  const mesNum = Number(mesStr);
  if (mesStr === '' || !Number.isInteger(mesNum) || mesNum < 1 || mesNum > 12) {
    errors.mesInicio = 'Selecciona un mes de inicio válido (1 a 12).';
  }

  const hasValue = (list, val) =>
    Array.isArray(list) && list.some((item) => item.valor === val);

  if (!hasValue(catalog.opcionesFinca.suelo, draft?.suelo)) {
    errors.suelo = 'Selecciona un tipo de suelo válido del catálogo.';
  }

  if (!hasValue(catalog.opcionesFinca.drenaje, draft?.drenaje)) {
    errors.drenaje = 'Selecciona una clase de drenaje válida del catálogo.';
  }

  if (!hasValue(catalog.opcionesFinca.riego, draft?.riego)) {
    errors.riego = 'Selecciona un régimen de riego válido del catálogo.';
  }

  if (!hasValue(catalog.opcionesFinca.prioridad, draft?.prioridad)) {
    errors.prioridad = 'Selecciona una prioridad válida del catálogo.';
  }

  const validCropIds = new Set((catalog.cultivos ?? []).map((c) => c.id));
  const prevCrops = Array.isArray(draft?.cultivosAnteriores)
    ? draft.cultivosAnteriores
    : [];
  const invalidCrop = prevCrops.find((id) => !validCropIds.has(id));
  if (invalidCrop) {
    errors.cultivosAnteriores = `El cultivo anterior "${invalidCrop}" no pertenece al catálogo vigente.`;
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors, normalized: null };
  }

  return {
    valid: true,
    errors: {},
    normalized: {
      localidad: String(draft?.localidad ?? '').trim(),
      latitude: Number(latStr),
      longitude: Number(lonStr),
      suelo: draft.suelo,
      drenaje: draft.drenaje,
      riego: draft.riego,
      cultivosAnteriores: [...prevCrops],
      mesInicio: mesNum,
      prioridad: draft.prioridad,
    },
  };
}

export function toSimulationPayload(finca) {
  return {
    finca: {
      latitude: finca.latitude,
      longitude: finca.longitude,
      suelo: finca.suelo,
      drenaje: finca.drenaje,
      riego: finca.riego,
      cultivosAnteriores: finca.cultivosAnteriores,
      mesInicio: finca.mesInicio,
      prioridad: finca.prioridad,
    },
  };
}

export function computeInputsFingerprint(finca, catalogVersion, mode) {
  if (!finca) return '';
  const sortedCrops = [...(finca.cultivosAnteriores ?? [])].sort();
  return JSON.stringify({
    mode,
    catalogVersion: catalogVersion ?? 'unknown',
    latitude: finca.latitude,
    longitude: finca.longitude,
    suelo: finca.suelo,
    drenaje: finca.drenaje,
    riego: finca.riego,
    cultivosAnteriores: sortedCrops,
    mesInicio: finca.mesInicio,
    prioridad: finca.prioridad,
  });
}
