export class ApiError extends Error {
  constructor(message, { status = 0, code = 'API_ERROR', isNotFound = false, isTimeout = false, isAborted = false } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.isNotFound = isNotFound;
    this.isTimeout = isTimeout;
    this.isAborted = isAborted;
  }
}

export async function fetchJson(url, { method = 'GET', body, signal, timeoutMs = 8000 } = {}) {
  const controller = new AbortController();
  let timedOut = false;

  const onExternalAbort = () => controller.abort();
  if (signal) {
    if (signal.aborted) {
      throw new ApiError('Solicitud cancelada.', { isAborted: true, code: 'ABORTED' });
    }
    signal.addEventListener('abort', onExternalAbort, { once: true });
  }

  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  try {
    const response = await fetch(url, {
      method,
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    let data = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok) {
      const serverMsg = data?.error?.message || data?.message;
      const serverCode = data?.error?.code || `HTTP_${response.status}`;
      if (response.status === 404) {
        throw new ApiError(
          serverMsg || 'Esta función aún no está disponible en el servidor (404).',
          { status: 404, code: serverCode, isNotFound: true }
        );
      }
      throw new ApiError(
        serverMsg || `El servidor respondió con error ${response.status}.`,
        { status: response.status, code: serverCode }
      );
    }

    if (!data || typeof data !== 'object') {
      throw new ApiError('La respuesta del servidor no tiene un formato JSON válido.', {
        status: response.status,
        code: 'INVALID_JSON',
      });
    }

    return data;
  } catch (err) {
    if (err instanceof ApiError) {
      throw err;
    }
    if (timedOut) {
      throw new ApiError('La solicitud excedió el tiempo de espera.', {
        isTimeout: true,
        code: 'TIMEOUT',
      });
    }
    if (err?.name === 'AbortError') {
      throw new ApiError('Solicitud cancelada.', {
        isAborted: true,
        code: 'ABORTED',
      });
    }
    throw new ApiError('No se pudo conectar con el servidor.', {
      code: 'NETWORK_ERROR',
    });
  } finally {
    clearTimeout(timer);
    if (signal) {
      signal.removeEventListener('abort', onExternalAbort);
    }
  }
}

export async function getHealth(signal) {
  const data = await fetchJson('/api/health', { signal, timeoutMs: 5000 });
  if (data.status !== 'ok' || data.service !== 'fieldverse-api') {
    throw new ApiError('Respuesta inesperada del endpoint de salud.', {
      code: 'UNEXPECTED_HEALTH',
    });
  }
  return data;
}
