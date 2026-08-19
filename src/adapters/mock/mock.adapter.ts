import { ICourierAdapter } from '../courier.interface';
import {
  NormalizedCreateOrderRequest,
  NormalizedCreateOrderResponse,
  NormalizedTrackingResponse,
  NormalizedCancelResponse,
} from '../../types/courier.types';
import { ShipmentStatus, CourierPartnerName, ServiceType } from '../../constants/courier.constants';
import { logger } from '../../logger';

export class MockCourierAdapter implements ICourierAdapter {
  public readonly partnerName = CourierPartnerName.MOCK;

  /**
   * Simulates shipment creation with Mock Courier
   */
  public async createShipment(order: NormalizedCreateOrderRequest): Promise<NormalizedCreateOrderResponse> {
    logger.info('Creating shipment with MockCourier adapter...', {
      courier: this.partnerName,
      orderId: order.order_id,
    });

    // Generate mock AWB and courier order ID
    const awbNumber = `MCK${Date.now()}${Math.floor(1000 + Math.random() * 9000)}`;
    const courierOrderId = `MCK-ORD-${order.order_id}`;

    const rawResponse = {
      success: true,
      provider: 'MockCourier Logistics Inc.',
      waybill: awbNumber,
      booking_reference: courierOrderId,
      estimated_pickup: new Date(Date.now() + 4 * 3600 * 1000).toISOString(),
      service: order.service_type || ServiceType.STANDARD,
    };

    return {
      order_id: order.order_id,
      courier_partner: this.partnerName,
      courier_order_id: courierOrderId,
      awb_number: awbNumber,
      status: ShipmentStatus.CREATED,
      raw_response: rawResponse,
      raw_request: order,
    };
  }

  /**
   * Simulates tracking with Mock Courier
   */
  public async trackShipment(awbNumber: string, orderId?: string): Promise<NormalizedTrackingResponse> {
    logger.info('Tracking shipment with MockCourier adapter...', {
      courier: this.partnerName,
      awbNumber,
      orderId,
    });

    const now = Date.now();

    return {
      order_id: orderId || '',
      courier_partner: this.partnerName,
      awb_number: awbNumber,
      status: ShipmentStatus.IN_TRANSIT,
      current_status_description: 'Package in transit to delivery facility',
      estimated_delivery: new Date(now + 24 * 3600 * 1000).toISOString(),
      tracking_history: [
        {
          status: ShipmentStatus.CREATED,
          activity: 'Shipment label created and data received',
          location: 'Origin Facility - Mumbai',
          timestamp: new Date(now - 12 * 3600 * 1000).toISOString(),
        },
        {
          status: ShipmentStatus.PICKED_UP,
          activity: 'Package picked up by courier',
          location: 'Origin Facility - Mumbai',
          timestamp: new Date(now - 8 * 3600 * 1000).toISOString(),
        },
        {
          status: ShipmentStatus.IN_TRANSIT,
          activity: 'Package departed sorting hub',
          location: 'Central Transit Hub - Delhi',
          timestamp: new Date(now - 2 * 3600 * 1000).toISOString(),
        },
      ],
      raw_response: {
        provider: 'MockCourier',
        waybill: awbNumber,
        status: ShipmentStatus.IN_TRANSIT,
        location: 'Central Transit Hub - Delhi',
      },
    };
  }

  /**
   * Simulates cancellation with Mock Courier
   */
  public async cancelShipment(awbNumber: string, orderId?: string, reason?: string): Promise<NormalizedCancelResponse> {
    logger.info('Cancelling shipment with MockCourier adapter...', {
      courier: this.partnerName,
      awbNumber,
      orderId,
      reason,
    });

    return {
      order_id: orderId || '',
      courier_partner: this.partnerName,
      awb_number: awbNumber,
      status: ShipmentStatus.CANCELLED,
      cancelled_at: new Date().toISOString(),
      message: `Shipment ${awbNumber} successfully cancelled with MockCourier. Reason: ${reason || 'Customer request'}`,
      raw_response: {
        provider: 'MockCourier',
        waybill: awbNumber,
        cancellation_status: 'CONFIRMED',
        cancellation_time: new Date().toISOString(),
      },
    };
  }
}
