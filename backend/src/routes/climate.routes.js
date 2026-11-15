import { Router } from 'express';
import { getClimateHistory } from '../controllers/climate.controller.js';

const router = Router();
router.get('/history', getClimateHistory);

export default router;