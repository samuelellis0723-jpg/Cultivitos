import dotenv from 'dotenv';
dotenv.config();

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

export async function generarExplicacionIA(resultadoSimulacion) {
  const apiKey = process.env.OPENAI_API_KEY;

  // Guardrail 1: Si no hay API key configurada, devolvemos un mensaje seguro sin romper la app
  if (!apiKey) {
    return {
      explicacionIA: 'Explicación de IA no disponible temporalmente (API Key no configurada).',
      origen: 'fallback_local'
    };
  }

  // Guardrail 2: Si la simulación está incompleta, la IA explica la razón sin inventar recomendaciones
  const esIncompleto = resultadoSimulacion.estado === 'incompleto' || resultadoSimulacion.estado === 'sin_opciones';
  
  const promptSistema = `Eres FIELDVERSE AI, un agrónomo experto en el análisis de decisiones bajo incertidumbre agrícola. 
  Tu tarea es explicar de forma clara, sencilla y directa al agricultor el resultado de la simulación de sus rotaciones de cultivos frente al cambio climático.
  No inventes datos agronómicos, rendimientos ni fuentes que no estén en el reporte. 
  Si el estado es incompleto, explica educadamente qué información o reglas faltan para poder emitir una recomendación robusta.`;

  const promptUsuario = `Analiza el siguiente resultado de simulación y redacta una explicación breve para el agricultor:
  ${JSON.stringify(resultadoSimulacion, null, 2)}`;

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
        max_tokens: 500
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API respondió con estado ${response.status}`);
    }

    const data = await response.json();
    const textoExplicacion = data.choices?.[0]?.message?.content || 'No se pudo generar la explicación.';

    return {
      explicacionIA: textoExplicacion,
      origen: 'openai_live'
    };

  } catch (error) {
    // Guardrail 3: Si OpenAI falla por red o error, devolvemos fallback local para no perder la pantalla.
    console.error('Error al consultar OpenAI:', error.message);
    return {
      explicacionIA: resultadoSimulacion.explicacion || 'Análisis completado mediante el motor determinista.',
      origen: 'fallback_error_ia'
    };
  }
}