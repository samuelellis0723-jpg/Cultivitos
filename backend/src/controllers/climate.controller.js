import { getNasaHistoricalClimateSeries, ClimateError } from '../services/nasa/nasa.service.js';

export function createClimateHistoryHandler(getHistory = getNasaHistoricalClimateSeries) {
  return async function getClimateHistory(req, res, next) {
    try {
      const clima = await getHistory(req.query);
      res.json({ clima, fuente: clima.fuentes[0] });
    } catch (error) {
      if (error instanceof ClimateError) return res.status(error.status).json({ error: { code: error.code, message: error.message } });
      next(error);
    }
  };
}
export const getClimateHistory = createClimateHistoryHandler();
