import { OrderReconciliationWorker } from '../../src/workers/order-reconciliation.worker';
import { Order, TrackingEvent } from '../../src/models';
import { ShipmentStatus, PaymentMode, ServiceType, CourierPartnerName } from '../../src/constants/courier.constants';
import { initAdapters } from '../../src/adapters';
import { sequelize } from '../../src/config/database';

describe('Order Reconciliation Worker Unit Tests', () => {
  let worker: OrderReconciliationWorker;

  beforeAll(async () => {
    initAdapters();
    await sequelize.sync({ force: true });
    worker = new OrderReconciliationWorker(10000, 0, 3); // 0ms stale threshold for instant test
  });

  afterAll(async () => {
    worker.stop();
  });

  it('should recover a stuck PENDING_DISPATCH order and manifest it with MockCourier', async () => {
    const orderId = `ORD-RECON-TEST-${Date.now()}`;

    // Create stuck order
    await Order.create({
      order_id: orderId,
      courier_partner: CourierPartnerName.MOCK,
      status: ShipmentStatus.PENDING_DISPATCH,
      retry_count: 0,
      raw_request_payload: {
        order_id: orderId,
        courier_partner: CourierPartnerName.MOCK,
        sender: {
          name: 'Sender',
          phone: '9876543210',
          address: 'Origin',
          city: 'Mumbai',
          state: 'MH',
          pincode: '400001',
          country: 'India',
        },
        recipient: {
          name: 'Receiver',
          phone: '9876543211',
          address: 'Dest',
          city: 'Delhi',
          state: 'DL',
          pincode: '110001',
          country: 'India',
        },
        package_details: {
          weight_kg: 1,
          length_cm: 10,
          breadth_cm: 10,
          height_cm: 10,
          items_count: 1,
          item_description: 'Electronics & Accessories',
        },
        payment_details: {
          payment_mode: PaymentMode.PREPAID,
          declared_value: 500,
          collectable_amount: 0,
        },
        service_type: ServiceType.STANDARD,
      },
      sender_details: {
        name: 'Sender',
        phone: '9876543210',
        address: 'Origin',
        city: 'Mumbai',
        state: 'MH',
        pincode: '400001',
        country: 'India',
      },
      recipient_details: {
        name: 'Receiver',
        phone: '9876543211',
        address: 'Dest',
        city: 'Delhi',
        state: 'DL',
        pincode: '110001',
        country: 'India',
      },
      package_details: {
        weight_kg: 1,
        length_cm: 10,
        breadth_cm: 10,
        height_cm: 10,
        items_count: 1,
        item_description: 'Electronics & Accessories',
      },
      payment_details: {
        payment_mode: PaymentMode.PREPAID,
        declared_value: 500,
        collectable_amount: 0,
      },
    });

    const recoveredCount = await worker.reconcilePendingOrders();
    expect(recoveredCount).toBe(1);

    const updatedOrder = await Order.findOne({ where: { order_id: orderId } });
    expect(updatedOrder).not.toBeNull();
    expect(updatedOrder?.status).toBe(ShipmentStatus.CREATED);
    expect(updatedOrder?.awb_number).toContain('MCK');
    expect(updatedOrder?.retry_count).toBe(1);

    const tracking = await TrackingEvent.findOne({ where: { order_id: orderId } });
    expect(tracking).not.toBeNull();
    expect(tracking?.status).toBe(ShipmentStatus.CREATED);
  });
});
