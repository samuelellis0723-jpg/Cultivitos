import { Router } from 'express';
import { createClimateHistoryHandler } from '../controllers/climate.controller.js';

export function createClimateRouter(getHistory) {
  const router = Router();
  router.get('/history', createClimateHistoryHandler(getHistory));
  return router;
}
export default createClimateRouter();
