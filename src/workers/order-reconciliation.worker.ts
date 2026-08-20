import { Op } from 'sequelize';
import { Order, TrackingEvent } from '../models';
import { courierRegistry } from '../adapters/courier.registry';
import { ShipmentStatus } from '../constants/courier.constants';
import { config } from '../config';
import { logger } from '../logger';
import { NormalizedCreateOrderRequest } from '../types/courier.types';

export class OrderReconciliationWorker {
  private timer: NodeJS.Timeout | null = null;
  private isRunning = false;
  private isProcessing = false;
  private readonly intervalMs: number;
  private readonly staleThresholdMs: number;
  private readonly maxRetryAttempts: number;

  constructor(
    intervalMs: number = 60000, // Run every 60 seconds
    staleThresholdMs: number = 60000, // Stale if stuck in PENDING_DISPATCH > 60s
    maxRetryAttempts: number = 3
  ) {
    this.intervalMs = intervalMs;
    this.staleThresholdMs = staleThresholdMs;
    this.maxRetryAttempts = maxRetryAttempts;
  }

  /**
   * Starts the background reconciliation worker.
   */
  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;

    logger.info('Order Reconciliation Worker started.', {
      intervalMs: this.intervalMs,
      staleThresholdMs: this.staleThresholdMs,
      maxRetries: this.maxRetryAttempts,
    });

    this.timer = setInterval(() => {
      this.reconcilePendingOrders().catch((err) => {
        logger.error('Error during order reconciliation cycle:', { error: err.message });
      });
    }, this.intervalMs);
  }

  /**
   * Stops the background worker gracefully.
   */
  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.isRunning = false;
    logger.info('Order Reconciliation Worker stopped.');
  }

  /**
   * Scans and processes orders stuck in PENDING_DISPATCH due to previous server crashes.
   */
  public async reconcilePendingOrders(): Promise<number> {
    if (this.isProcessing) return 0;
    this.isProcessing = true;

    try {
      const staleTimestamp = new Date(Date.now() - this.staleThresholdMs);

      const pendingOrders = await Order.findAll({
        where: {
          status: ShipmentStatus.PENDING_DISPATCH,
          updated_at: {
            [Op.lt]: staleTimestamp,
          },
          retry_count: {
            [Op.lt]: this.maxRetryAttempts,
          },
        },
        limit: 25,
      });

      if (pendingOrders.length === 0) {
        return 0;
      }

      logger.warn(`Found ${pendingOrders.length} stuck PENDING_DISPATCH orders to reconcile...`);

      let reconciledCount = 0;

      for (const order of pendingOrders) {
        const success = await this.reconcileSingleOrder(order);
        if (success) reconciledCount++;
      }

      logger.info(`Reconciliation cycle completed: ${reconciledCount}/${pendingOrders.length} orders recovered.`);
      return reconciledCount;
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Attempts to dispatch an individual stuck order.
   */
  private async reconcileSingleOrder(order: Order): Promise<boolean> {
    const nextRetry = order.retry_count + 1;
    logger.info(`Reconciling stuck order ${order.order_id} (Attempt ${nextRetry}/${this.maxRetryAttempts})...`, {
      orderId: order.order_id,
      courier: order.courier_partner,
    });

    try {
      if (!courierRegistry.has(order.courier_partner)) {
        await order.update({
          status: ShipmentStatus.FAILED,
          failure_reason: `Unsupported courier partner: ${order.courier_partner}`,
          retry_count: nextRetry,
        });
        return false;
      }

      const adapter = courierRegistry.get(order.courier_partner);
      const payload = order.raw_request_payload as NormalizedCreateOrderRequest;

      const courierResponse = await adapter.createShipment(payload);

      // Update to CREATED and write tracking event
      await order.update({
        courier_order_id: courierResponse.courier_order_id,
        awb_number: courierResponse.awb_number,
        status: ShipmentStatus.CREATED,
        raw_response_payload: courierResponse.raw_response,
        failure_reason: null,
        retry_count: nextRetry,
      });

      await TrackingEvent.create({
        order_id: order.order_id,
        awb_number: courierResponse.awb_number,
        status: ShipmentStatus.CREATED,
        activity: `Shipment recovered and booked by Reconciliation Worker (${order.courier_partner.toUpperCase()})`,
        location: order.sender_details?.city || 'Origin Hub',
        event_timestamp: new Date(),
        raw_payload: courierResponse.raw_response,
      });

      logger.info(`Order ${order.order_id} successfully recovered and manifested. AWB: ${courierResponse.awb_number}`);
      return true;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      const isFinalAttempt = nextRetry >= this.maxRetryAttempts;

      await order.update({
        status: isFinalAttempt ? ShipmentStatus.FAILED : ShipmentStatus.PENDING_DISPATCH,
        failure_reason: `Reconciliation error: ${errorMessage}`,
        retry_count: nextRetry,
      });

      logger.warn(`Failed to reconcile order ${order.order_id}: ${errorMessage}`, {
        orderId: order.order_id,
        attempt: nextRetry,
        isFinalAttempt,
      });

      return false;
    }
  }
}

export const orderReconciliationWorker = new OrderReconciliationWorker(
  parseInt(process.env.RECONCILIATION_INTERVAL_MS || '60000', 10),
  parseInt(process.env.RECONCILIATION_STALE_THRESHOLD_MS || '60000', 10),
  config.courier.retryAttempts
);
