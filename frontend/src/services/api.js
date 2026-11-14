export async function getHealth(signal) {
  const response = await fetch('/api/health', { signal });
  if (!response.ok) throw new Error(`El servidor respondió ${response.status}`);
  const data = await response.json();
  if (data.status !== 'ok' || data.service !== 'fieldverse-api') throw new Error('Respuesta inesperada del servidor');
  return data;
}
