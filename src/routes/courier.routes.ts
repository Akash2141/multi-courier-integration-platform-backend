import { Router } from 'express';
import { courierController } from '../controllers/courier.controller';
import { asyncHandler } from '../utils/async-handler';

const router = Router();

/**
 * @route   GET /api/v1/couriers
 * @desc    List all supported plug-in couriers
 */
router.get(
  '/',
  asyncHandler((req, res) => courierController.listSupportedCouriers(req, res))
);

export default router;
