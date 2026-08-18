import { courierRegistry } from '../adapters/courier.registry';
import { Order, TrackingEvent } from '../models';
import { NormalizedCancelResponse } from '../types/courier.types';
import { ShipmentStatus } from '../constants/courier.constants';
import { NotFoundError, ValidationError } from '../errors';
import { ErrorCode } from '../constants/error.constants';
import { logger } from '../logger';
import { setRequestContextValue } from '../logger/async-context';

export class CancellationService {
  /**
   * Cancels an existing shipment order with the courier partner following SOLID principles.
   */
  public async cancelOrder(orderId: string, reason?: string): Promise<NormalizedCancelResponse> {
    setRequestContextValue('orderId', orderId);

    const order = await this.fetchOrderForCancellation(orderId);
    setRequestContextValue('courierPartner', order.courier_partner);

    const alreadyCancelledResponse = this.checkIfAlreadyCancelled(order);
    if (alreadyCancelledResponse) {
      return alreadyCancelledResponse;
    }

    this.validateCancellableStatus(order);

    const adapter = courierRegistry.get(order.courier_partner);
    const cancelResponse = await adapter.cancelShipment(order.awb_number || '', order.order_id, reason);

    await this.persistCancelledState(order, cancelResponse, reason);

    logger.info(`Order ${orderId} successfully cancelled.`);
    return cancelResponse;
  }

  /**
   * Fetches order from database.
   */
  private async fetchOrderForCancellation(orderId: string): Promise<Order> {
    const order = await Order.findOne({ where: { order_id: orderId } });
    if (!order) {
      throw new NotFoundError(`Order with ID '${orderId}' was not found`, ErrorCode.ORDER_NOT_FOUND);
    }
    return order;
  }

  /**
   * Returns idempotent response if order was already cancelled.
   */
  private checkIfAlreadyCancelled(order: Order): NormalizedCancelResponse | null {
    if (order.status === ShipmentStatus.CANCELLED) {
      return {
        order_id: order.order_id,
        courier_partner: order.courier_partner,
        awb_number: order.awb_number || '',
        status: ShipmentStatus.CANCELLED,
        cancelled_at: order.updated_at ? order.updated_at.toISOString() : new Date().toISOString(),
        message: 'Order is already cancelled',
        raw_response: order.raw_response_payload,
      };
    }
    return null;
  }

  /**
   * Validates that order is not in a non-cancellable state.
   */
  private validateCancellableStatus(order: Order): void {
    if (order.status === ShipmentStatus.DELIVERED) {
      throw new ValidationError('Cannot cancel an order that has already been delivered');
    }
  }

  /**
   * Updates order record and appends cancellation event to tracking timeline.
   */
  private async persistCancelledState(order: Order, cancelResponse: NormalizedCancelResponse, reason?: string): Promise<void> {
    await order.update({ status: ShipmentStatus.CANCELLED });

    await TrackingEvent.create({
      order_id: order.order_id,
      awb_number: order.awb_number || '',
      status: ShipmentStatus.CANCELLED,
      activity: `Shipment cancelled. Reason: ${reason || 'Customer requested cancellation'}`,
      location: null,
      event_timestamp: new Date(),
      raw_payload: cancelResponse.raw_response,
    });
  }
}

export const cancellationService = new CancellationService();
