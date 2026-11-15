const DRAFT_KEY = 'fieldverse.draft.v1';
const COMPARISONS_KEY = 'fieldverse.comparisons.v1';

export function saveDraft(finca, catalogVersion) {
  try {
    const payload = {
      schemaVersion: 1,
      savedAt: new Date().toISOString(),
      catalogVersion: catalogVersion ?? null,
      finca,
    };
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
    return { ok: true, savedAt: payload.savedAt };
  } catch (err) {
    return {
      ok: false,
      error: err?.message || 'El navegador bloqueó o llenó el almacenamiento local.',
    };
  }
}

export function loadDraft() {
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return { ok: true, data: null };
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.schemaVersion !== 1 || !parsed.finca || typeof parsed.finca !== 'object') {
      return { ok: false, error: 'El borrador guardado tenía un formato incompatible y fue ignorado.', data: null };
    }
    return { ok: true, data: parsed };
  } catch {
    return { ok: false, error: 'No se pudo leer el almacenamiento local del navegador.', data: null };
  }
}

export function clearDraft() {
  try {
    window.localStorage.removeItem(DRAFT_KEY);
    return { ok: true };
  } catch {
    return { ok: false, error: 'No se pudo borrar el borrador del almacenamiento local.' };
  }
}

export function loadSavedComparisons() {
  try {
    const raw = window.localStorage.getItem(COMPARISONS_KEY);
    if (!raw) return { ok: true, items: [] };
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return { ok: true, items: [] };
    return { ok: true, items: parsed };
  } catch {
    return { ok: false, error: 'No se pudieron leer las comparaciones guardadas.', items: [] };
  }
}

export function saveComparison(entry) {
  try {
    const current = loadSavedComparisons();
    const list = Array.isArray(current.items) ? current.items : [];
    const next = [entry, ...list.filter((item) => item.id !== entry.id)].slice(0, 10);
    window.localStorage.setItem(COMPARISONS_KEY, JSON.stringify(next));
    return { ok: true, items: next };
  } catch (err) {
    return {
      ok: false,
      error: err?.message || 'No se pudo guardar la comparación en este dispositivo.',
    };
  }
}

export function deleteSavedComparison(id) {
  try {
    const current = loadSavedComparisons();
    const next = (current.items || []).filter((item) => item.id !== id);
    window.localStorage.setItem(COMPARISONS_KEY, JSON.stringify(next));
    return { ok: true, items: next };
  } catch {
    return { ok: false, error: 'No se pudo eliminar la comparación guardada.' };
  }
}

export function downloadJsonFile(data, filename) {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  try {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
