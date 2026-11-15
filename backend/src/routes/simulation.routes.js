import { Router } from 'express';
import { createSimulation } from '../controllers/simulation.controller.js';

const router = Router();
router.post('/', createSimulation);
export default router;