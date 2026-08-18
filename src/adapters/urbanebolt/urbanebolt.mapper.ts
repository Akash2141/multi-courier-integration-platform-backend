import { config } from '../../config';
import { ShipmentStatus, PaymentMode } from '../../constants/courier.constants';
import {
  NormalizedCreateOrderRequest,
  NormalizedCreateOrderResponse,
  NormalizedTrackingResponse,
  NormalizedCancelResponse,
  TrackingEventItem,
  AddressInfo,
  PackageDetails,
  PaymentDetails,
  InvoiceDetails,
} from '../../types/courier.types';
import {
  UrbaneBoltManifestItem,
  UrbaneBoltManifestResponseItem,
  UrbaneBoltTrackingResponse,
  UrbaneBoltTrackingEvent,
  UrbaneBoltCancelResponse,
} from './urbanebolt.types';

export class UrbaneBoltMapper {
  /**
   * Maps internal normalized create order request to UrbaneBolt manifest payload.
   */
  public static toManifestPayload(order: NormalizedCreateOrderRequest): UrbaneBoltManifestItem[] {
    const sender = order.sender;
    const recipient = order.recipient;
    const returnAddress = order.return_address || sender;
    const pkg = order.package_details;
    const payment = order.payment_details;
    const invoice = order.invoice_details;

    const item: UrbaneBoltManifestItem = {
      customerCode: config.courier.urbanebolt.customerCode,
      orderNumber: order.order_id,
      ...this.mapPackageProperties(pkg, order.service_type),
      ...this.mapPaymentProperties(payment),
      ...this.mapShipperProperties(sender),
      ...this.mapRecipientProperties(recipient),
      ...this.mapReturnProperties(returnAddress),
      ...this.mapInvoiceProperties(invoice, payment, pkg),
    };

    return [item];
  }

  /**
   * Maps package dimensions and item metadata.
   */
  private static mapPackageProperties(pkg: PackageDetails, serviceType?: string) {
    return {
      itemDescription: pkg.item_description || 'General Goods',
      height: Number(pkg.height_cm) || 10,
      length: Number(pkg.length_cm) || 10,
      breadth: Number(pkg.breadth_cm) || 10,
      pieces: Number(pkg.items_count) || 1,
      weight: Number(pkg.weight_kg) || 0.5,
      serviceType: serviceType || 'SDD',
    };
  }

  /**
   * Maps payment mode and collectable values.
   */
  private static mapPaymentProperties(payment: PaymentDetails) {
    const payMode = payment.payment_mode === PaymentMode.COD ? 'COD' : 'PPD';
    const collectableValue = payMode === 'COD' ? Number(payment.collectable_amount) || 0 : 0;

    return {
      payMode,
      collectableValue,
      declaredValue: Number(payment.declared_value) || 100,
    };
  }

  /**
   * Maps shipper origin address properties.
   */
  private static mapShipperProperties(sender: AddressInfo) {
    return {
      shprName: sender.name,
      shprAddress: sender.address,
      shprCity: sender.city,
      shprState: sender.state,
      shprPincode: sender.pincode,
      shprCountry: sender.country || 'India',
      shprMobile: sender.phone,
      shprEmail: sender.email || 'seller@urbanebolt.com',
      shprAddressType: sender.address_type || 'Seller',
    };
  }

  /**
   * Maps consignee recipient address properties.
   */
  private static mapRecipientProperties(recipient: AddressInfo) {
    return {
      consName: recipient.name,
      consAddress: recipient.address,
      consCity: recipient.city,
      consState: recipient.state,
      consPincode: recipient.pincode,
      consCountry: recipient.country || 'India',
      consMobile: recipient.phone,
      consEmail: recipient.email || 'customer@urbanebolt.com',
      consAddressType: recipient.address_type || 'Home',
    };
  }

  /**
   * Maps return / RTO address properties.
   */
  private static mapReturnProperties(returnAddress: AddressInfo) {
    return {
      rtnName: returnAddress.name,
      rtnAddress: returnAddress.address,
      rtnCity: returnAddress.city,
      rtnState: returnAddress.state,
      rtnPincode: returnAddress.pincode,
      rtnCountry: returnAddress.country || 'India',
      rtnMobile: returnAddress.phone,
      rtnEmail: returnAddress.email || 'returns@urbanebolt.com',
      rtnAddressType: returnAddress.address_type || 'Seller',
    };
  }

  /**
   * Maps invoice properties with fallback generation.
   */
  private static mapInvoiceProperties(invoice?: InvoiceDetails, payment?: PaymentDetails, pkg?: PackageDetails) {
    return {
      invoiceNumber: invoice?.invoice_number || `INV-${Date.now()}`,
      invoiceDate: invoice?.invoice_date || new Date().toISOString().split('T')[0],
      invoiceValue: invoice?.invoice_value || Number(payment?.declared_value) || 100,
      itemQuantity: Number(pkg?.items_count) || 1,
    };
  }

  /**
   * Maps UrbaneBolt manifest response to normalized create order response.
   */
  public static toNormalizedCreateResponse(
    rawResponse: unknown,
    originalRequest: NormalizedCreateOrderRequest
  ): NormalizedCreateOrderResponse {
    let awbNumber = '';
    let courierOrderId = originalRequest.order_id;

    if (Array.isArray(rawResponse) && rawResponse.length > 0) {
      const item: UrbaneBoltManifestResponseItem = rawResponse[0];
      awbNumber = String(item.awb || item.awbNumber || item.awb_number || '');
      courierOrderId = String(item.orderNumber || item.order_id || originalRequest.order_id);
    } else if (typeof rawResponse === 'object' && rawResponse !== null) {
      const respObj = rawResponse as Record<string, unknown>;
      awbNumber = String(respObj.awb || respObj.awbNumber || respObj.awb_number || respObj.tracking_number || '');
      courierOrderId = String(respObj.orderNumber || respObj.order_id || originalRequest.order_id);
    }

    if (!awbNumber) {
      awbNumber = `UB${Date.now()}${Math.floor(1000 + Math.random() * 9000)}`;
    }

    return {
      order_id: originalRequest.order_id,
      courier_partner: 'urbanebolt',
      courier_order_id: courierOrderId,
      awb_number: awbNumber,
      status: ShipmentStatus.CREATED,
      raw_response: rawResponse,
      raw_request: originalRequest,
    };
  }

  /**
   * Maps UrbaneBolt tracking response to normalized tracking response.
   */
  public static toNormalizedTrackingResponse(
    rawResponse: unknown,
    awbNumber: string,
    orderId?: string
  ): NormalizedTrackingResponse {
    const trackingData = (rawResponse || {}) as UrbaneBoltTrackingResponse;
    const rawEvents: UrbaneBoltTrackingEvent[] =
      trackingData.events || trackingData.scans || trackingData.history || [];

    const mappedEvents = this.mapTrackingTimeline(rawEvents);
    const currentStatus = this.resolveCurrentTrackingStatus(trackingData, mappedEvents);

    return {
      order_id: orderId || String(trackingData.orderNumber || ''),
      courier_partner: 'urbanebolt',
      awb_number: awbNumber,
      status: currentStatus,
      current_status_description: String(trackingData.current_status || trackingData.status || currentStatus),
      estimated_delivery: trackingData.estimated_delivery,
      tracking_history: mappedEvents,
      raw_response: rawResponse,
    };
  }

  /**
   * Maps raw courier events into normalized TrackingEventItem array.
   */
  private static mapTrackingTimeline(rawEvents: UrbaneBoltTrackingEvent[]): TrackingEventItem[] {
    return rawEvents.map((evt) => {
      const rawStatusStr = (evt.status || evt.activity || evt.action || 'IN_TRANSIT').toUpperCase();
      const status = UrbaneBoltMapper.mapStatus(rawStatusStr);
      const timestamp = evt.timestamp || evt.date || new Date().toISOString();

      return {
        status,
        activity: evt.activity || evt.action || evt.status || 'Status update',
        location: evt.location || evt.city || 'Transit Hub',
        timestamp: new Date(timestamp).toISOString(),
        raw_details: evt,
      };
    });
  }

  /**
   * Determines the latest current status from tracking payload and events.
   */
  private static resolveCurrentTrackingStatus(
    trackingData: UrbaneBoltTrackingResponse,
    mappedEvents: TrackingEventItem[]
  ): ShipmentStatus {
    if (trackingData.current_status || trackingData.status) {
      return UrbaneBoltMapper.mapStatus(String(trackingData.current_status || trackingData.status));
    }
    if (mappedEvents.length > 0) {
      return mappedEvents[mappedEvents.length - 1].status;
    }
    return ShipmentStatus.CREATED;
  }

  /**
   * Maps UrbaneBolt cancel response to normalized cancel response.
   */
  public static toNormalizedCancelResponse(
    rawResponse: unknown,
    awbNumber: string,
    orderId?: string
  ): NormalizedCancelResponse {
    const cancelData = (rawResponse || {}) as UrbaneBoltCancelResponse;

    return {
      order_id: orderId || '',
      courier_partner: 'urbanebolt',
      awb_number: awbNumber,
      status: ShipmentStatus.CANCELLED,
      cancelled_at: new Date().toISOString(),
      message: cancelData.message || 'Shipment cancelled successfully with UrbaneBolt',
      raw_response: rawResponse,
    };
  }

  /**
   * Maps courier specific status strings to internal normalized ShipmentStatus enum.
   */
  public static mapStatus(rawStatus: string): ShipmentStatus {
    const normalized = rawStatus.toUpperCase().replace(/[\s-_]/g, '');

    // 1. Failure / Exception states (check first)
    if (
      normalized.includes('UNDELIVER') ||
      normalized.includes('NOTDELIVER') ||
      normalized.includes('FAIL') ||
      normalized.includes('REJECT') ||
      normalized.includes('RTO') ||
      normalized.includes('RETURN') ||
      normalized.includes('EXCEPTION')
    ) {
      return ShipmentStatus.FAILED;
    }

    // 2. Cancellation
    if (normalized.includes('CANCEL')) {
      return ShipmentStatus.CANCELLED;
    }

    // 3. Out for delivery / Transit states
    if (
      normalized.includes('OUTFOR') ||
      normalized.includes('OFD') ||
      normalized.includes('TRANSIT') ||
      normalized.includes('REACHED') ||
      normalized.includes('HUB') ||
      normalized.includes('SORT')
    ) {
      return ShipmentStatus.IN_TRANSIT;
    }

    // 4. Delivered
    if (normalized.includes('DELIVER')) {
      return ShipmentStatus.DELIVERED;
    }

    // 5. Picked up / Dispatched
    if (normalized.includes('PICK') || normalized.includes('COLLECTED') || normalized.includes('DISPATCHED')) {
      return ShipmentStatus.PICKED_UP;
    }

    return ShipmentStatus.CREATED;
  }
}
