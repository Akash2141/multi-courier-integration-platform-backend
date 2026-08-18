import { courierRegistry } from '../adapters/courier.registry';
import { Order, TrackingEvent } from '../models';
import { NormalizedTrackingResponse, TrackingEventItem } from '../types/courier.types';
import { NotFoundError } from '../errors';
import { ErrorCode } from '../constants/error.constants';
import { logger } from '../logger';
import { setRequestContextValue } from '../logger/async-context';

export class TrackingService {
  /**
   * Tracks shipment status from the courier partner following SOLID principles.
   */
  public async trackOrder(orderId: string): Promise<NormalizedTrackingResponse> {
    setRequestContextValue('orderId', orderId);

    const order = await this.fetchOrderWithHistory(orderId);
    setRequestContextValue('courierPartner', order.courier_partner);

    const adapter = courierRegistry.get(order.courier_partner);
    const trackingResponse = await adapter.trackShipment(order.awb_number!, order.order_id);

    await this.updateOrderStatusIfChanged(order, trackingResponse);
    await this.appendNewTrackingEvents(order, trackingResponse);

    return trackingResponse;
  }

  /**
   * Fetches the order and validates presence of AWB.
   */
  private async fetchOrderWithHistory(orderId: string): Promise<Order> {
    const order = await Order.findOne({
      where: { order_id: orderId },
      include: [{ model: TrackingEvent, as: 'tracking_events' }],
    });

    if (!order) {
      throw new NotFoundError(`Order with ID '${orderId}' was not found`, ErrorCode.ORDER_NOT_FOUND);
    }

    if (!order.awb_number) {
      throw new NotFoundError(`No AWB / tracking number found for order '${orderId}'`, ErrorCode.RESOURCE_NOT_FOUND);
    }

    return order;
  }

  /**
   * Updates order status if changed from the previous scan.
   */
  private async updateOrderStatusIfChanged(order: Order, trackingResponse: NormalizedTrackingResponse): Promise<void> {
    if (order.status !== trackingResponse.status) {
      logger.info(`Order ${order.order_id} status changed from ${order.status} to ${trackingResponse.status}`);
      await order.update({ status: trackingResponse.status });
    }
  }

  /**
   * Appends newly discovered tracking events into the append-only timeline.
   */
  private async appendNewTrackingEvents(order: Order, trackingResponse: NormalizedTrackingResponse): Promise<void> {
    const history = trackingResponse.tracking_history;
    if (!history || history.length === 0) return;

    for (const event of history) {
      await this.persistUniqueTrackingEvent(order, event, trackingResponse.raw_response);
    }
  }

  /**
   * Deduplicates and records a single tracking event.
   */
  private async persistUniqueTrackingEvent(
    order: Order,
    event: TrackingEventItem,
    fallbackRawPayload: unknown
  ): Promise<void> {
    const eventDate = new Date(event.timestamp);

    const exists = await TrackingEvent.findOne({
      where: {
        order_id: order.order_id,
        status: event.status,
        activity: event.activity,
        event_timestamp: eventDate,
      },
    });

    if (!exists) {
      await TrackingEvent.create({
        order_id: order.order_id,
        awb_number: order.awb_number!,
        status: event.status,
        activity: event.activity,
        location: event.location || null,
        event_timestamp: eventDate,
        raw_payload: event.raw_details || fallbackRawPayload,
      });
    }
  }
}

export const trackingService = new TrackingService();
