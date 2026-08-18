import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { validateBody } from '../middlewares/validation.middleware';
import { validateRegister, validateLogin } from '../schemas/auth.schema';
import { authenticate } from '../middlewares/auth.middleware';
import { asyncHandler } from '../utils/async-handler';

const router = Router();

/**
 * @route   POST /api/v1/auth/register
 * @desc    Register a new user account
 */
router.post(
  '/register',
  validateBody(validateRegister),
  asyncHandler((req, res) => authController.register(req, res))
);

/**
 * @route   POST /api/v1/auth/login
 * @desc    Login and obtain JWT token
 */
router.post(
  '/login',
  validateBody(validateLogin),
  asyncHandler((req, res) => authController.login(req, res))
);

/**
 * @route   GET /api/v1/auth/me
 * @desc    Get authenticated user profile
 */
router.get(
  '/me',
  authenticate,
  asyncHandler((req, res) => authController.getProfile(req, res))
);

export default router;
