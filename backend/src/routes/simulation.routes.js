import { Router } from 'express';
import { createSimulationHandler } from '../controllers/simulation.controller.js';
export function createSimulationRouter(dependencies) {
  const router = Router();
  router.post('/', createSimulationHandler(dependencies));
  return router;
}
export default createSimulationRouter();
