import request from 'supertest';
import { app } from '../../src/app';
import { sequelize } from '../../src/config/database';

describe('Bulk Orders API Integration Tests', () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  const baseOrder = {
    sender: {
      name: 'Warehouse Central',
      phone: '9876543210',
      address: 'Plot 101 Logistics Park',
      city: 'Gurugram',
      state: 'Haryana',
      pincode: '122001',
    },
    recipient: {
      name: 'Bob Marley',
      phone: '9876543212',
      address: 'Lane 4, Peace Street',
      city: 'Delhi',
      state: 'Delhi',
      pincode: '110001',
    },
    package_details: {
      weight_kg: 1.0,
      length_cm: 10,
      breadth_cm: 10,
      height_cm: 10,
      items_count: 1,
      item_description: 'Book Collection',
    },
    payment_details: {
      payment_mode: 'PREPAID',
      collectable_amount: 0,
      declared_value: 300,
    },
  };

  it('POST /api/v1/orders/bulk - should process batch of orders concurrently with partial success handling', async () => {
    const bulkPayload = {
      orders: [
        {
          ...baseOrder,
          order_id: 'ORD-BULK-001',
          courier_partner: 'mock',
        },
        {
          ...baseOrder,
          order_id: 'ORD-BULK-002',
          courier_partner: 'mock',
        },
        {
          ...baseOrder,
          order_id: 'ORD-BULK-003',
          courier_partner: 'invalid_courier_name', // Will fail with unknown courier error
        },
      ],
    };

    const res = await request(app)
      .post('/api/v1/orders/bulk')
      .send(bulkPayload);

    expect(res.status).toBe(207);
    expect(res.body.success).toBe(true);
    expect(res.body.data.batch_id).toBeDefined();
    expect(res.body.data.total_orders).toBe(3);
    expect(res.body.data.successful_orders).toBe(2);
    expect(res.body.data.failed_orders).toBe(1);

    const failedItem = res.body.data.results.find((r: any) => r.order_id === 'ORD-BULK-003');
    expect(failedItem.status).toBe('FAILED');
    expect(failedItem.error.code).toBe('UNKNOWN_COURIER');
  });
});
