const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
export function createExplainer({ apiKey = process.env.OPENAI_API_KEY, fetchImpl = globalThis.fetch, timeoutMs = 5000 } = {}) {
  return async function generarExplicacionIA(resultado) {
    const fallback = origen => ({ explicacionIA: resultado.explicacionBase, origen });
    if (!apiKey) return fallback('fallback_sin_key');
    const controller = new AbortController();
    let timer;
    try {
      const request = async () => {
        const response = await fetchImpl(OPENAI_API_URL, {
          method: 'POST', signal: controller.signal,
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({ model: 'gpt-4o-mini', messages: [
            { role: 'system', content: 'Explica brevemente el resultado recibido. No inventes reglas ni recomendaciones. Incompleto o sin opciones implica ninguna ganadora. Demo es ficticio. Solo devuelve texto explicativo.' },
            { role: 'user', content: JSON.stringify(resultado) },
          ], temperature: 0.3, max_tokens: 300 }),
        });
        if (!response.ok) throw new Error('Proveedor no disponible');
        const data = await response.json();
        const text = data.choices?.[0]?.message?.content;
        if (typeof text !== 'string' || !text.trim()) throw new Error('Explicación vacía');
        return { explicacionIA: text.trim(), origen: 'openai_live' };
      };
      return await Promise.race([request(), new Promise((_, reject) => {
        timer = setTimeout(() => { controller.abort(); reject(new Error('timeout')); }, timeoutMs);
      })]);
    } catch {
      return fallback(controller.signal.aborted ? 'fallback_timeout_ia' : 'fallback_error_ia');
    } finally { clearTimeout(timer); }
  };
}
export async function generarExplicacionIA(resultado) {
  return createExplainer()(resultado);
}
