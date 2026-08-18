import { Router } from 'express';
import { healthController } from '../controllers/health.controller';
import { asyncHandler } from '../utils/async-handler';

const router = Router();

/**
 * @route   GET /api/v1/health
 * @desc    Healthcheck endpoint
 */
router.get(
  '/',
  asyncHandler((req, res) => healthController.healthCheck(req, res))
);

export default router;
