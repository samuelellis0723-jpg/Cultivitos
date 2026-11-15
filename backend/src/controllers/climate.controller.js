import { getNasaHistoricalClimateSeries } from '../services/nasa/nasa.service.js';

export async function getClimateHistory(req, res, next) {
  try {
    const { lat, lon, start, end } = req.query;
    const climateData = await getNasaHistoricalClimateSeries({
      lat: lat ? Number(lat) : 9.93,
      lon: lon ? Number(lon) : -84.09,
      start: start || '20150101',
      end: end || '20241231'
    });

    res.json(climateData);
  } catch (error) {
    next(error);
  }
}