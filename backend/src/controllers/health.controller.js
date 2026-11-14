export function getHealth(req, res) {
  res.set('Cache-Control', 'no-store').json({ status: 'ok', service: 'fieldverse-api', version: '0.1.0' });
}
