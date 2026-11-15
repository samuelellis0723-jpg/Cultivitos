import { simular } from '../services/simulation/simulation.service.js';
import { ErrorEntradaDominio } from '../domain/simulation/minimax-regret.js';

export async function createSimulation(req, res, next) {
  try {
    const resultado = await simular(req.body ?? {});
    res.status(200).json(resultado);
  } catch (error) {
    if (error instanceof ErrorEntradaDominio) {
      return res.status(400).json({
        error: { code: error.codigo, message: error.message },
      });
    }
    next(error);
  }
}