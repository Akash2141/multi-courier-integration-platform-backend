import { Request, Response } from 'express';
import { sequelize } from '../config/database';
import { ApiSuccessResponse } from '../types/common.types';
import { courierRegistry } from '../adapters/courier.registry';

export class HealthController {
  /**
   * GET /health or GET /api/v1/health
   * System healthcheck endpoint verifying DB connectivity and registered couriers.
   */
  public async healthCheck(req: Request, res: Response): Promise<void> {
    let dbStatus = 'healthy';
    let dbError: string | undefined;

    try {
      await sequelize.authenticate();
    } catch (err) {
      dbStatus = 'unhealthy';
      dbError = err instanceof Error ? err.message : String(err);
    }

    const healthData = {
      status: dbStatus === 'healthy' ? 'OK' : 'DEGRADED',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      database: {
        status: dbStatus,
        ...(dbError ? { error: dbError } : {}),
      },
      couriers: {
        active: courierRegistry.getSupportedCouriers(),
        count: courierRegistry.getSupportedCouriers().length,
      },
      environment: process.env.NODE_ENV || 'development',
    };

    const statusCode = dbStatus === 'healthy' ? 200 : 503;

    const response: ApiSuccessResponse<typeof healthData> = {
      success: true,
      data: healthData,
      meta: {
        requestId: req.requestId,
        timestamp: new Date().toISOString(),
      },
    };

    res.status(statusCode).json(response);
  }
}

export const healthController = new HealthController();
