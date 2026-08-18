import { Request, Response } from 'express';
import { orderService } from '../services/order.service';
import { bulkOrderService } from '../services/bulk-order.service';
import { trackingService } from '../services/tracking.service';
import { cancellationService } from '../services/cancellation.service';
import { ApiSuccessResponse } from '../types/common.types';
import {
  NormalizedCreateOrderRequest,
  NormalizedCreateOrderResponse,
  NormalizedTrackingResponse,
  NormalizedCancelResponse,
  BulkOrderResponse,
} from '../types/courier.types';

export class OrderController {
  /**
   * POST /api/v1/orders
   * Creates a single order shipment.
   */
  public async createOrder(req: Request, res: Response): Promise<void> {
    const orderData = req.body as NormalizedCreateOrderRequest;
    const result = await orderService.createOrder(orderData);

    const response: ApiSuccessResponse<NormalizedCreateOrderResponse> = {
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
   * GET /api/v1/orders/:order_id/track
   * Tracks an order with live courier status and history.
   */
  public async trackOrder(req: Request, res: Response): Promise<void> {
    const order_id = String(req.params.order_id);
    const result = await trackingService.trackOrder(order_id);

    const response: ApiSuccessResponse<NormalizedTrackingResponse> = {
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
   * POST /api/v1/orders/:order_id/cancel
   * Cancels an order shipment.
   */
  public async cancelOrder(req: Request, res: Response): Promise<void> {
    const order_id = String(req.params.order_id);
    const { reason } = req.body || {};
    const result = await cancellationService.cancelOrder(order_id, reason);

    const response: ApiSuccessResponse<NormalizedCancelResponse> = {
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
   * POST /api/v1/orders/bulk
   * Bulk order creation (up to 100 orders concurrently).
   */
  public async bulkCreateOrders(req: Request, res: Response): Promise<void> {
    const { orders } = req.body as { orders: NormalizedCreateOrderRequest[] };
    const result = await bulkOrderService.createBulkOrders(orders);

    const response: ApiSuccessResponse<BulkOrderResponse> = {
      success: true,
      data: result,
      meta: {
        requestId: req.requestId,
        timestamp: new Date().toISOString(),
      },
    };

    res.status(207).json(response);
  }

  /**
   * GET /api/v1/orders/:order_id
   * Retrieves order details and tracking timeline from local DB.
   */
  public async getOrderById(req: Request, res: Response): Promise<void> {
    const order_id = String(req.params.order_id);
    const order = await orderService.getOrderById(order_id);

    const response: ApiSuccessResponse<unknown> = {
      success: true,
      data: order,
      meta: {
        requestId: req.requestId,
        timestamp: new Date().toISOString(),
      },
    };

    res.status(200).json(response);
  }
}

export const orderController = new OrderController();
