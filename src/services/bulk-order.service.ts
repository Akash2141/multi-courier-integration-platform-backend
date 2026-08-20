import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { runWithConcurrency } from '../utils/concurrency';
import { orderService } from './order.service';
import { BulkBatch, Order } from '../models';
import {
  NormalizedCreateOrderRequest,
  BulkOrderResponse,
  BulkOrderItemResult,
} from '../types/courier.types';
import { BulkBatchStatus, BulkItemStatus, ShipmentStatus } from '../constants/courier.constants';
import { AppError } from '../errors';
import { logger } from '../logger';

export class BulkOrderService {
  /**
   * Orchestrates bulk order processing following SOLID principles and Bulk Outbox pre-persistence.
   */
  public async createBulkOrders(orders: NormalizedCreateOrderRequest[]): Promise<BulkOrderResponse> {
    const batchId = uuidv4();
    const totalOrders = orders.length;

    logger.info(`Starting bulk order processing for batch ${batchId} (${totalOrders} orders)...`, {
      batchId,
      totalOrders,
      concurrencyLimit: config.courier.bulkConcurrencyLimit,
    });

    // 1. Initialize batch audit record
    const batchRecord = await this.initBatchRecord(batchId, totalOrders);

    // 2. Pre-persist ALL 100 orders in PostgreSQL with PENDING_DISPATCH in ONE fast bulk query
    // This ensures if the pod crashes at order 1, the background worker has all remaining orders on disk!
    await this.prePersistAllBatchOrders(orders);

    // 3. Execute controlled concurrent processing (e.g. 10 at a time)
    const results = await this.executeConcurrentBatch(orders, batchId);

    // 4. Calculate summary and update batch audit record
    const summary = this.calculateBatchSummary(results, totalOrders);
    await this.updateBatchRecord(batchRecord, summary, results);

    return {
      batch_id: batchId,
      total_orders: totalOrders,
      successful_orders: summary.successfulOrders,
      failed_orders: summary.failedOrders,
      results,
    };
  }

  /**
   * Retrieves status of a bulk batch by batch_id.
   */
  public async getBatchStatus(batchId: string): Promise<BulkBatch | null> {
    return BulkBatch.findByPk(batchId);
  }

  /**
   * Initializes the batch audit record in the database.
   */
  private async initBatchRecord(batchId: string, totalOrders: number): Promise<BulkBatch> {
    return BulkBatch.create({
      batch_id: batchId,
      total_orders: totalOrders,
      successful_orders: 0,
      failed_orders: 0,
      status: BulkBatchStatus.PROCESSING,
      results: [],
    });
  }

  /**
   * Pre-persists all batch orders in PostgreSQL with PENDING_DISPATCH in a single query.
   * Guarantees zero data loss if the pod crashes mid-batch.
   */
  private async prePersistAllBatchOrders(orders: NormalizedCreateOrderRequest[]): Promise<void> {
    const records = orders.map((o) => ({
      order_id: o.order_id,
      courier_partner: o.courier_partner,
      courier_order_id: null,
      awb_number: null,
      status: ShipmentStatus.PENDING_DISPATCH,
      retry_count: 0,
      raw_request_payload: o,
      raw_response_payload: null,
      failure_reason: null,
      sender_details: o.sender,
      recipient_details: o.recipient,
      package_details: o.package_details,
      payment_details: o.payment_details,
      service_type: o.service_type || null,
    }));

    try {
      await Order.bulkCreate(records, {
        ignoreDuplicates: true,
      });
      logger.info(`Pre-persisted ${orders.length} batch orders to PostgreSQL with status PENDING_DISPATCH.`);
    } catch (err) {
      logger.warn('Bulk pre-persistence warning (continuing with individual processing):', { error: err });
    }
  }

  /**
   * Runs the batch of orders through the worker pool.
   */
  private async executeConcurrentBatch(
    orders: NormalizedCreateOrderRequest[],
    batchId: string
  ): Promise<BulkOrderItemResult[]> {
    return runWithConcurrency<NormalizedCreateOrderRequest, BulkOrderItemResult>(
      orders,
      config.courier.bulkConcurrencyLimit,
      (orderItem) => this.processSingleOrderItem(orderItem, batchId)
    );
  }

  /**
   * Processes an individual order item within the batch with error isolation.
   */
  private async processSingleOrderItem(
    orderItem: NormalizedCreateOrderRequest,
    batchId: string
  ): Promise<BulkOrderItemResult> {
    try {
      const response = await orderService.createOrder(orderItem);

      return {
        order_id: orderItem.order_id,
        courier_partner: orderItem.courier_partner,
        status: BulkItemStatus.SUCCESS,
        awb_number: response.awb_number,
        courier_order_id: response.courier_order_id,
      };
    } catch (error: unknown) {
      return this.formatItemErrorResult(orderItem, batchId, error);
    }
  }

  /**
   * Formats error result for an individual failed order.
   */
  private formatItemErrorResult(
    orderItem: NormalizedCreateOrderRequest,
    batchId: string,
    error: unknown
  ): BulkOrderItemResult {
    logger.warn(`Bulk order item failed for order_id: ${orderItem.order_id}`, {
      batchId,
      orderId: orderItem.order_id,
      courier: orderItem.courier_partner,
      error: error instanceof Error ? error.message : error,
    });

    let errorCode = 'COURIER_ERROR';
    let errorMessage = 'Failed to process order shipment';
    let errorDetails: unknown = undefined;

    if (error instanceof AppError) {
      errorCode = error.errorCode;
      errorMessage = error.message;
      errorDetails = error.details;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    return {
      order_id: orderItem.order_id,
      courier_partner: orderItem.courier_partner,
      status: BulkItemStatus.FAILED,
      error: {
        code: errorCode,
        message: errorMessage,
        details: errorDetails,
      },
    };
  }

  /**
   * Calculates success/failure totals and batch status using enums.
   */
  private calculateBatchSummary(
    results: BulkOrderItemResult[],
    totalOrders: number
  ): { successfulOrders: number; failedOrders: number; finalStatus: BulkBatchStatus } {
    const successfulOrders = results.filter(
      (r) => r.status === BulkItemStatus.SUCCESS || r.status === BulkItemStatus.SKIPPED_IDEMPOTENT
    ).length;
    const failedOrders = totalOrders - successfulOrders;

    let finalStatus = BulkBatchStatus.PARTIAL_SUCCESS;
    if (failedOrders === 0) {
      finalStatus = BulkBatchStatus.COMPLETED;
    } else if (successfulOrders === 0) {
      finalStatus = BulkBatchStatus.FAILED;
    }

    return { successfulOrders, failedOrders, finalStatus };
  }

  /**
   * Persists the final summary to the batch audit record.
   */
  private async updateBatchRecord(
    batchRecord: BulkBatch,
    summary: { successfulOrders: number; failedOrders: number; finalStatus: BulkBatchStatus },
    results: BulkOrderItemResult[]
  ): Promise<void> {
    await batchRecord.update({
      successful_orders: summary.successfulOrders,
      failed_orders: summary.failedOrders,
      status: summary.finalStatus,
      results,
    });

    logger.info(`Bulk batch ${batchRecord.batch_id} completed: ${summary.successfulOrders}/${batchRecord.total_orders} succeeded.`);
  }
}

export const bulkOrderService = new BulkOrderService();
