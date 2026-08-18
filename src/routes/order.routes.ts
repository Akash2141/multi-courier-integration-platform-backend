import { Router } from 'express';
import { orderController } from '../controllers/order.controller';
import { validateBody } from '../middlewares/validation.middleware';
import { validateCreateOrder } from '../schemas/order.schema';
import { validateBulkCreateOrder } from '../schemas/bulk-order.schema';
import { validateCancelOrder } from '../schemas/cancel-order.schema';
import { optionalAuthenticate } from '../middlewares/auth.middleware';
import { asyncHandler } from '../utils/async-handler';

const router = Router();

// Apply auth context middleware (extracts user if present)
router.use(optionalAuthenticate);

/**
 * @route   POST /api/v1/orders
 * @desc    Create a single courier shipment (idempotent)
 */
router.post(
  '/',
  validateBody(validateCreateOrder),
  asyncHandler((req, res) => orderController.createOrder(req, res))
);

/**
 * @route   POST /api/v1/orders/bulk
 * @desc    Bulk create up to 100 shipments concurrently
 */
router.post(
  '/bulk',
  validateBody(validateBulkCreateOrder),
  asyncHandler((req, res) => orderController.bulkCreateOrders(req, res))
);

/**
 * @route   GET /api/v1/orders/:order_id/track
 * @desc    Track shipment status with courier and persist history
 */
router.get(
  '/:order_id/track',
  asyncHandler((req, res) => orderController.trackOrder(req, res))
);

/**
 * @route   POST /api/v1/orders/:order_id/cancel
 * @desc    Cancel an order shipment with courier
 */
router.post(
  '/:order_id/cancel',
  validateBody(validateCancelOrder),
  asyncHandler((req, res) => orderController.cancelOrder(req, res))
);

/**
 * @route   GET /api/v1/orders/:order_id
 * @desc    Get order details and tracking timeline from local DB
 */
router.get(
  '/:order_id',
  asyncHandler((req, res) => orderController.getOrderById(req, res))
);

export default router;
