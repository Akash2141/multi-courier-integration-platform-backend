import { courierRegistry } from '../adapters/courier.registry';
import { Order, TrackingEvent } from '../models';
import { sequelize } from '../config/database';
import {
  NormalizedCreateOrderRequest,
  NormalizedCreateOrderResponse,
} from '../types/courier.types';
import { ShipmentStatus } from '../constants/courier.constants';
import { NotFoundError, CourierError } from '../errors';
import { ErrorCode } from '../constants/error.constants';
import { logger } from '../logger';
import { setRequestContextValue } from '../logger/async-context';

export class OrderService {
  /**
   * Creates a single shipment order adhering to SOLID principles.
   */
  public async createOrder(orderData: NormalizedCreateOrderRequest): Promise<NormalizedCreateOrderResponse> {
    setRequestContextValue('orderId', orderData.order_id);
    setRequestContextValue('courierPartner', orderData.courier_partner);

    // 1. Check idempotency
    const existingOrder = await Order.findOne({ where: { order_id: orderData.order_id } });
    const idempotentResponse = this.checkIdempotentResponse(existingOrder, orderData);
    if (idempotentResponse) {
      return idempotentResponse;
    }

    // 2. Dispatch to courier partner with error recording
    const courierResponse = await this.dispatchWithFailureAudit(orderData, existingOrder);

    // 3. Persist order and tracking event
    await this.persistOrderAndInitialTracking(orderData, courierResponse, existingOrder);

    logger.info(`Order ${orderData.order_id} successfully created and persisted. AWB: ${courierResponse.awb_number}`);
    return courierResponse;
  }

  /**
   * Retrieves order details and tracking history by order_id.
   */
  public async getOrderById(orderId: string): Promise<Order> {
    const order = await Order.findOne({
      where: { order_id: orderId },
      include: [{ model: TrackingEvent, as: 'tracking_events' }],
    });

    if (!order) {
      throw new NotFoundError(`Order with ID '${orderId}' not found`, ErrorCode.ORDER_NOT_FOUND);
    }

    return order;
  }

  /**
   * Checks if an order was already processed and returns its response for idempotency.
   */
  private checkIdempotentResponse(
    existingOrder: Order | null,
    orderData: NormalizedCreateOrderRequest
  ): NormalizedCreateOrderResponse | null {
    if (existingOrder && existingOrder.status !== ShipmentStatus.FAILED) {
      logger.info(`Idempotent hit: Order ${orderData.order_id} already exists with status ${existingOrder.status}.`, {
        order_id: existingOrder.order_id,
        awb_number: existingOrder.awb_number,
      });

      return {
        order_id: existingOrder.order_id,
        courier_partner: existingOrder.courier_partner,
        courier_order_id: existingOrder.courier_order_id || existingOrder.order_id,
        awb_number: existingOrder.awb_number || '',
        status: existingOrder.status,
        raw_response: existingOrder.raw_response_payload,
        raw_request: existingOrder.raw_request_payload,
      };
    }
    return null;
  }

  /**
   * Dispatches shipment request to courier adapter and audits any failure.
   */
  private async dispatchWithFailureAudit(
    orderData: NormalizedCreateOrderRequest,
    existingOrder: Order | null
  ): Promise<NormalizedCreateOrderResponse> {
    const adapter = courierRegistry.get(orderData.courier_partner);

    try {
      return await adapter.createShipment(orderData);
    } catch (error: unknown) {
      await this.recordFailureAudit(orderData, existingOrder, error);
      throw error;
    }
  }

  /**
   * Persists failed order status for reconciliation workers.
   */
  private async recordFailureAudit(
    orderData: NormalizedCreateOrderRequest,
    existingOrder: Order | null,
    error: unknown
  ): Promise<void> {
    const failureReason = error instanceof Error ? error.message : String(error);
    const rawResponse = error instanceof CourierError ? error.rawCourierResponse : null;

    try {
      if (existingOrder) {
        await existingOrder.update({
          status: ShipmentStatus.FAILED,
          failure_reason: failureReason,
          raw_response_payload: rawResponse,
        });
      } else {
        await Order.create({
          order_id: orderData.order_id,
          courier_partner: orderData.courier_partner,
          courier_order_id: null,
          awb_number: null,
          status: ShipmentStatus.FAILED,
          raw_request_payload: orderData,
          raw_response_payload: rawResponse,
          failure_reason: failureReason,
          sender_details: orderData.sender,
          recipient_details: orderData.recipient,
          package_details: orderData.package_details,
          payment_details: orderData.payment_details,
          service_type: orderData.service_type || null,
        });
      }
    } catch (dbErr) {
      logger.error('Failed to persist failed order in database:', { error: dbErr, orderId: orderData.order_id });
    }
  }

  /**
   * Persists the created order and initial tracking event.
   */
  private async persistOrderAndInitialTracking(
    orderData: NormalizedCreateOrderRequest,
    courierResponse: NormalizedCreateOrderResponse,
    existingOrder: Order | null
  ): Promise<Order> {
    const saveOperation = async (transaction?: any) => {
      let savedOrder: Order;

      const orderAttributes = {
        courier_partner: orderData.courier_partner,
        courier_order_id: courierResponse.courier_order_id,
        awb_number: courierResponse.awb_number,
        status: courierResponse.status,
        raw_request_payload: orderData,
        raw_response_payload: courierResponse.raw_response,
        failure_reason: null,
        sender_details: orderData.sender,
        recipient_details: orderData.recipient,
        package_details: orderData.package_details,
        payment_details: orderData.payment_details,
        service_type: orderData.service_type || null,
      };

      if (existingOrder) {
        savedOrder = await existingOrder.update(orderAttributes, transaction ? { transaction } : undefined);
      } else {
        savedOrder = await Order.create(
          { order_id: orderData.order_id, ...orderAttributes },
          transaction ? { transaction } : undefined
        );
      }

      await TrackingEvent.create(
        {
          order_id: savedOrder.order_id,
          awb_number: courierResponse.awb_number,
          status: ShipmentStatus.CREATED,
          activity: `Shipment booked with ${orderData.courier_partner.toUpperCase()}`,
          location: orderData.sender.city,
          event_timestamp: new Date(),
          raw_payload: courierResponse.raw_response,
        },
        transaction ? { transaction } : undefined
      );

      return savedOrder;
    };

    if (sequelize.getDialect() === 'sqlite') {
      return saveOperation();
    } else {
      return sequelize.transaction(async (t) => saveOperation(t));
    }
  }
}

export const orderService = new OrderService();
