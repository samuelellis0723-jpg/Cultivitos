import dotenv from 'dotenv';
dotenv.config();

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

export async function generarExplicacionIA(resultadoSimulacion) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return {
      explicacionIA: resultadoSimulacion.explicacionBase,
      origen: 'fallback_sin_key'
    };
  }

  const promptSistema = `Eres FIELDVERSE AI, un asistente agronómico experto en toma de decisiones bajo incertidumbre climática.
Tu tarea es redactar una explicación breve, clara y directa (máximo 3 oraciones) para un agricultor sobre el resultado de su simulación de rotaciones de cultivos.
REGLAS ESTRICTAS:
1. No inventes datos agronómicos, rendimientos ni fuentes que no estén en el JSON.
2. Si el estado es "incompleto" o "sin_opciones", explica qué información o reglas faltan y NO recomiendes ninguna estrategia ni cultivo.
3. Si el estado es "demo" o "completo", explica por qué ganó la estrategia indicada basándote en el criterio de menor peor arrepentimiento.`;

  const promptUsuario = `Redacta la explicación para el agricultor a partir de este resultado:\n${JSON.stringify(resultadoSimulacion, null, 2)}`;

  try {
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: promptSistema },
          { role: 'user', content: promptUsuario }
        ],
        temperature: 0.3,
        max_tokens: 300
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API respondió con estado ${response.status}`);
    }

    const data = await response.json();
    const texto = data.choices?.[0]?.message?.content?.trim();

    if (!texto) throw new Error('Respuesta vacía de OpenAI');

    return {
      explicacionIA: texto,
      origen: 'openai_live'
    };
  } catch (error) {
    console.error('Error al consultar OpenAI:', error.message);
    return {
      explicacionIA: resultadoSimulacion.explicacionBase,
      origen: 'fallback_error_ia'
    };
  }
}