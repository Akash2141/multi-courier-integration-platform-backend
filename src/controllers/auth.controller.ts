import { Request, Response } from 'express';
import { authService, AuthResult } from '../services/auth.service';
import { ApiSuccessResponse } from '../types/common.types';
import { RegisterRequest, LoginRequest } from '../schemas/auth.schema';

export class AuthController {
  /**
   * POST /api/v1/auth/register
   * Registers a new user account and returns JWT.
   */
  public async register(req: Request, res: Response): Promise<void> {
    const data = req.body as RegisterRequest;
    const result: AuthResult = await authService.register(data);

    const response: ApiSuccessResponse<AuthResult> = {
      success: true,
      data: result,
      meta: {
        requestId: req.requestId,
        timestamp: new Date().toISOString(),
      },
    };

    res.status(201).json(response);
  }

  /**
   * POST /api/v1/auth/login
   * Authenticates user and returns JWT.
   */
  public async login(req: Request, res: Response): Promise<void> {
    const data = req.body as LoginRequest;
    const result: AuthResult = await authService.login(data);

    const response: ApiSuccessResponse<AuthResult> = {
      success: true,
      data: result,
      meta: {
        requestId: req.requestId,
        timestamp: new Date().toISOString(),
      },
    };

    res.status(200).json(response);
  }

  /**
   * GET /api/v1/auth/me
   * Returns current authenticated user profile.
   */
  public async getProfile(req: Request, res: Response): Promise<void> {
    const response: ApiSuccessResponse<unknown> = {
      success: true,
      data: {
        user: req.user,
      },
      meta: {
        requestId: req.requestId,
        timestamp: new Date().toISOString(),
      },
    };

    res.status(200).json(response);
  }
}

export const authController = new AuthController();
