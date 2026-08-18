import request from 'supertest';
import { app } from '../../src/app';
import { sequelize } from '../../src/config/database';
import { initDatabase } from '../../src/models';

describe('Orders API Integration Tests', () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  const validOrderPayload = {
    order_id: 'ORD-INT-1001',
    courier_partner: 'mock',
    sender: {
      name: 'Warehouse North',
      phone: '9876543210',
      email: 'seller@example.com',
      address: 'Industrial Plot 45',
      city: 'Gurgaon',
      state: 'Haryana',
      pincode: '122001',
      country: 'India',
    },
    recipient: {
      name: 'Alice Smith',
      phone: '9123456789',
      email: 'alice@example.com',
      address: 'Flat 302, Green Meadows',
      city: 'Delhi',
      state: 'Delhi',
      pincode: '110001',
      country: 'India',
    },
    package_details: {
      weight_kg: 2.0,
      length_cm: 20,
      breadth_cm: 15,
      height_cm: 10,
      items_count: 1,
      item_description: 'Mechanical Keyboard',
    },
    payment_details: {
      payment_mode: 'PREPAID',
      collectable_amount: 0,
      declared_value: 4500,
    },
    service_type: 'STANDARD',
  };

  it('GET /health - should return healthy status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('OK');
    expect(res.body.data.couriers.active).toContain('urbanebolt');
    expect(res.body.data.couriers.active).toContain('mock');
  });

  it('POST /api/v1/orders - should create a new order shipment successfully', async () => {
    const res = await request(app)
      .post('/api/v1/orders')
      .send(validOrderPayload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.order_id).toBe('ORD-INT-1001');
    expect(res.body.data.courier_partner).toBe('mock');
    expect(res.body.data.awb_number).toBeDefined();
    expect(res.body.data.status).toBe('CREATED');
  });

  it('POST /api/v1/orders - should be idempotent and return existing shipment on duplicate order_id', async () => {
    const res = await request(app)
      .post('/api/v1/orders')
      .send(validOrderPayload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.order_id).toBe('ORD-INT-1001');
  });

  it('POST /api/v1/orders - should return 400 with supported couriers list when courier_partner is unknown', async () => {
    const res = await request(app)
      .post('/api/v1/orders')
      .send({
        ...validOrderPayload,
        order_id: 'ORD-UNKNOWN-COURIER',
        courier_partner: 'non_existent_express',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('UNKNOWN_COURIER');
    expect(res.body.error.details.supportedCouriers).toContain('urbanebolt');
    expect(res.body.error.details.supportedCouriers).toContain('mock');
  });

  it('POST /api/v1/orders - should return 400 with field-level errors when validation fails', async () => {
    const res = await request(app)
      .post('/api/v1/orders')
      .send({
        order_id: 'ORD-INVALID',
        courier_partner: 'mock',
        // missing sender, recipient, package_details, payment_details
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(Array.isArray(res.body.error.details)).toBe(true);
  });

  it('GET /api/v1/orders/:order_id/track - should return live tracking and history', async () => {
    const res = await request(app).get('/api/v1/orders/ORD-INT-1001/track');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.order_id).toBe('ORD-INT-1001');
    expect(res.body.data.status).toBeDefined();
    expect(Array.isArray(res.body.data.tracking_history)).toBe(true);
  });

  it('POST /api/v1/orders/:order_id/cancel - should cancel the shipment', async () => {
    const res = await request(app)
      .post('/api/v1/orders/ORD-INT-1001/cancel')
      .send({ reason: 'Customer requested cancellation' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('CANCELLED');
  });

  it('GET /api/v1/orders/:order_id - should return persisted order and tracking history from DB', async () => {
    const res = await request(app).get('/api/v1/orders/ORD-INT-1001');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.order_id).toBe('ORD-INT-1001');
    expect(res.body.data.status).toBe('CANCELLED');
    expect(Array.isArray(res.body.data.tracking_events)).toBe(true);
    expect(res.body.data.tracking_events.length).toBeGreaterThanOrEqual(1);
  });
});
