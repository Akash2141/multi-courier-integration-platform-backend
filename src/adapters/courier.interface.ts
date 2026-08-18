import {
  NormalizedCreateOrderRequest,
  NormalizedCreateOrderResponse,
  NormalizedTrackingResponse,
  NormalizedCancelResponse,
} from '../types/courier.types';

export interface ICourierAdapter {
  /**
   * Unique name of the courier partner (e.g., 'urbanebolt', 'mock', 'delhivery')
   */
  readonly partnerName: string;

  /**
   * Creates a shipment with the courier partner
   */
  createShipment(order: NormalizedCreateOrderRequest): Promise<NormalizedCreateOrderResponse>;

  /**
   * Tracks a shipment with the courier partner using AWB number or Order ID
   */
  trackShipment(awbNumber: string, orderId?: string): Promise<NormalizedTrackingResponse>;

  /**
   * Cancels a shipment with the courier partner
   */
  cancelShipment(awbNumber: string, orderId?: string, reason?: string): Promise<NormalizedCancelResponse>;
}
