import { Request, Response } from 'express';
import { courierRegistry } from '../adapters/courier.registry';
import { ApiSuccessResponse } from '../types/common.types';

export class CourierController {
  /**
   * GET /api/v1/couriers
   * Lists all actively registered and supported courier partners.
   */
  public async listSupportedCouriers(req: Request, res: Response): Promise<void> {
    const couriers = courierRegistry.getSupportedCouriers();

    const response: ApiSuccessResponse<{ supportedCouriers: string[]; total: number }> = {
      success: true,
      data: {
        supportedCouriers: couriers,
        total: couriers.length,
      },
      meta: {
        requestId: req.requestId,
        timestamp: new Date().toISOString(),
      },
    };

    res.status(200).json(response);
  }
}

export const courierController = new CourierController();
