import { ApiError } from './api.js';
// Transport mode is deliberately not an input: an API may serve backup or demo.
export function combineOrigins(origins) {
  if (!origins.length || origins.some(value => !['live', 'backup', 'demo', 'mixed'].includes(value))) return null;
  const unique = [...new Set(origins)];
  return unique.length === 1 ? unique[0] : 'mixed';
}

export function metadataOrigin(metadata) {
  const declared = metadata?.origen ?? null;
  if (declared !== null && !['live', 'backup', 'demo', 'mixed'].includes(declared)) {
    throw new ApiError('La procedencia recibida no es válida.', { code: 'INVALID_PROVENANCE' });
  }
  const sources = metadata?.fuentes;
  const derived = Array.isArray(sources) && sources.length ? combineOrigins(sources.map(s => s.origen)) : null;
  if (declared && derived && declared !== derived) {
    throw new ApiError('La procedencia no coincide con las fuentes recibidas.', { code: 'INVALID_PROVENANCE' });
  }
  return derived ?? declared;
}
