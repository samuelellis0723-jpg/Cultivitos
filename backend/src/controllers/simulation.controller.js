import { simular } from '../services/simulation/simulation.service.js';
import { ErrorEntradaDominio } from '../domain/simulation/minimax-regret.js';

export function createSimulationHandler(dependencies) {
  return async function createSimulation(req, res, next) {
    try {
      res.status(200).json(await simular(req.body ?? {}, dependencies));
    } catch (error) {
      if (error instanceof ErrorEntradaDominio) {
        return res.status(400).json({ error: { code: error.codigo, message: error.message } });
      }
      next(error);
    }
  };
}
export const createSimulation = createSimulationHandler();
