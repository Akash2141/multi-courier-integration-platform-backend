import { UrbaneBoltMapper } from '../../src/adapters/urbanebolt/urbanebolt.mapper';
import { ShipmentStatus, PaymentMode } from '../../src/constants/courier.constants';
import { NormalizedCreateOrderRequest } from '../../src/types/courier.types';

describe('UrbaneBoltMapper Unit Tests', () => {
  const sampleOrder: NormalizedCreateOrderRequest = {
    order_id: 'ORD-TEST-1001',
    courier_partner: 'urbanebolt',
    sender: {
      name: 'Acme Warehouse',
      phone: '9876543210',
      email: 'seller@example.com',
      address: '123 Industrial Area',
      city: 'Gurugram',
      state: 'Haryana',
      pincode: '122001',
      country: 'India',
      address_type: 'Seller',
    },
    recipient: {
      name: 'John Doe',
      phone: '9123456780',
      email: 'john@example.com',
      address: '456 MG Road',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560001',
      country: 'India',
      address_type: 'Home',
    },
    package_details: {
      weight_kg: 1.5,
      length_cm: 15,
      breadth_cm: 10,
      height_cm: 8,
      items_count: 2,
      item_description: 'Bluetooth Speaker',
    },
    payment_details: {
      payment_mode: PaymentMode.COD,
      collectable_amount: 1299,
      declared_value: 1299,
    },
    service_type: 'SDD',
  };

  it('should map internal order request to UrbaneBolt manifest payload format', () => {
    const manifestPayload = UrbaneBoltMapper.toManifestPayload(sampleOrder);

    expect(Array.isArray(manifestPayload)).toBe(true);
    expect(manifestPayload.length).toBe(1);

    const item = manifestPayload[0];
    expect(item.orderNumber).toBe('ORD-TEST-1001');
    expect(item.shprName).toBe('Acme Warehouse');
    expect(item.consName).toBe('John Doe');
    expect(item.payMode).toBe('COD');
    expect(item.collectableValue).toBe(1299);
    expect(item.declaredValue).toBe(1299);
    expect(item.weight).toBe(1.5);
    expect(item.pieces).toBe(2);
    expect(item.shprPincode).toBe('122001');
    expect(item.consPincode).toBe('560001');
  });

  it('should correctly map status strings to standardized ShipmentStatus enum', () => {
    expect(UrbaneBoltMapper.mapStatus('DELIVERED')).toBe(ShipmentStatus.DELIVERED);
    expect(UrbaneBoltMapper.mapStatus('Shipment Delivered to Consignee')).toBe(ShipmentStatus.DELIVERED);
    expect(UrbaneBoltMapper.mapStatus('CANCELLED')).toBe(ShipmentStatus.CANCELLED);
    expect(UrbaneBoltMapper.mapStatus('PICKED_UP')).toBe(ShipmentStatus.PICKED_UP);
    expect(UrbaneBoltMapper.mapStatus('DISPATCHED')).toBe(ShipmentStatus.PICKED_UP);
    expect(UrbaneBoltMapper.mapStatus('IN_TRANSIT')).toBe(ShipmentStatus.IN_TRANSIT);
    expect(UrbaneBoltMapper.mapStatus('OUT_FOR_DELIVERY')).toBe(ShipmentStatus.IN_TRANSIT);
    expect(UrbaneBoltMapper.mapStatus('FAILED')).toBe(ShipmentStatus.FAILED);
    expect(UrbaneBoltMapper.mapStatus('UNDELIVERED')).toBe(ShipmentStatus.FAILED);
  });

  it('should map UrbaneBolt tracking response correctly', () => {
    const rawTrackingResponse = {
      status: 'IN_TRANSIT',
      current_status: 'Package reached sorting hub',
      awb: '200000001170',
      orderNumber: 'ORD-TEST-1001',
      events: [
        {
          status: 'BOOKED',
          activity: 'Shipment created',
          location: 'Gurugram Hub',
          timestamp: '2026-08-18T10:00:00.000Z',
        },
        {
          status: 'IN_TRANSIT',
          activity: 'Package reached sorting hub',
          location: 'Delhi Central Hub',
          timestamp: '2026-08-18T14:00:00.000Z',
        },
      ],
    };

    const normalized = UrbaneBoltMapper.toNormalizedTrackingResponse(
      rawTrackingResponse,
      '200000001170',
      'ORD-TEST-1001'
    );

    expect(normalized.order_id).toBe('ORD-TEST-1001');
    expect(normalized.awb_number).toBe('200000001170');
    expect(normalized.courier_partner).toBe('urbanebolt');
    expect(normalized.status).toBe(ShipmentStatus.IN_TRANSIT);
    expect(normalized.tracking_history.length).toBe(2);
    expect(normalized.tracking_history[0].status).toBe(ShipmentStatus.CREATED);
    expect(normalized.tracking_history[1].status).toBe(ShipmentStatus.IN_TRANSIT);
  });
});
