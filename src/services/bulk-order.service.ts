import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { runWithConcurrency } from '../utils/concurrency';
import { orderService } from './order.service';
import { BulkBatch } from '../models';
import {
  NormalizedCreateOrderRequest,
  BulkOrderResponse,
  BulkOrderItemResult,
} from '../types/courier.types';
import { BulkBatchStatus, BulkItemStatus } from '../constants/courier.constants';
import { AppError } from '../errors';
import { logger } from '../logger';

export class BulkOrderService {
  /**
   * Orchestrates bulk order processing following SOLID principles.
   */
  public async createBulkOrders(orders: NormalizedCreateOrderRequest[]): Promise<BulkOrderResponse> {
    const batchId = uuidv4();
    const totalOrders = orders.length;

    logger.info(`Starting bulk order processing for batch ${batchId} (${totalOrders} orders)...`, {
      batchId,
      totalOrders,
      concurrencyLimit: config.courier.bulkConcurrencyLimit,
    });

    const batchRecord = await this.initBatchRecord(batchId, totalOrders);
    const results = await this.executeConcurrentBatch(orders, batchId);
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
