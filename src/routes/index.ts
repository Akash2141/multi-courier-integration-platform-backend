import { Router } from 'express';
import orderRoutes from './order.routes';
import authRoutes from './auth.routes';
import courierRoutes from './courier.routes';
import healthRoutes from './health.routes';

const router = Router();

router.use('/orders', orderRoutes);
router.use('/auth', authRoutes);
router.use('/couriers', courierRoutes);
router.use('/health', healthRoutes);

export default router;
