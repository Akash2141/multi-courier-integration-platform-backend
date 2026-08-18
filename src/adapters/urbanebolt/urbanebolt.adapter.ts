import { ICourierAdapter } from '../courier.interface';
import {
  NormalizedCreateOrderRequest,
  NormalizedCreateOrderResponse,
  NormalizedTrackingResponse,
  NormalizedCancelResponse,
} from '../../types/courier.types';
import { UrbaneBoltClient } from './urbanebolt.client';
import { UrbaneBoltMapper } from './urbanebolt.mapper';
import { UrbaneBoltCancelRequest } from './urbanebolt.types';
import { logger } from '../../logger';

export class UrbaneBoltAdapter implements ICourierAdapter {
  public readonly partnerName = 'urbanebolt';
  private readonly client: UrbaneBoltClient;

  constructor(client?: UrbaneBoltClient) {
    this.client = client || new UrbaneBoltClient();
  }

  /**
   * Manifest (Create Order)
   * POST /api/v1/services/manifest/
   */
  public async createShipment(order: NormalizedCreateOrderRequest): Promise<NormalizedCreateOrderResponse> {
    const payload = UrbaneBoltMapper.toManifestPayload(order);

    logger.info('Dispatching create shipment to UrbaneBolt...', {
      courier: this.partnerName,
      orderId: order.order_id,
      endpoint: '/services/manifest/',
    });

    const rawResponse = await this.client.request<unknown>(
      'POST',
      '/services/manifest/',
      payload
    );

    logger.info('UrbaneBolt shipment created successfully.', {
      courier: this.partnerName,
      orderId: order.order_id,
    });

    return UrbaneBoltMapper.toNormalizedCreateResponse(rawResponse, order);
  }

  /**
   * Track Shipment
   * GET /api/v1/services/tracking-pub/?awb={awb}
   */
  public async trackShipment(awbNumber: string, orderId?: string): Promise<NormalizedTrackingResponse> {
    logger.info('Fetching tracking details from UrbaneBolt...', {
      courier: this.partnerName,
      awbNumber,
      orderId,
      endpoint: '/services/tracking-pub/',
    });

    const rawResponse = await this.client.request<unknown>(
      'GET',
      '/services/tracking-pub/',
      undefined,
      { awb: awbNumber }
    );

    return UrbaneBoltMapper.toNormalizedTrackingResponse(rawResponse, awbNumber, orderId);
  }

  /**
   * Cancel Shipment
   * POST /api/v1/services/cancel/
   */
  public async cancelShipment(awbNumber: string, orderId?: string, reason?: string): Promise<NormalizedCancelResponse> {
    logger.info('Cancelling shipment with UrbaneBolt...', {
      courier: this.partnerName,
      awbNumber,
      orderId,
      reason,
      endpoint: '/services/cancel/',
    });

    const payload: UrbaneBoltCancelRequest = {
      awbs: awbNumber,
    };

    const rawResponse = await this.client.request<unknown>(
      'POST',
      '/services/cancel/',
      payload
    );

    return UrbaneBoltMapper.toNormalizedCancelResponse(rawResponse, awbNumber, orderId);
  }
}
