import { validateData } from '../../src/schemas/validator';
import { validateCreateOrder } from '../../src/schemas/order.schema';
import { validateBulkCreateOrder } from '../../src/schemas/bulk-order.schema';
import { ValidationError } from '../../src/errors';

describe('AJV Validation Unit Tests', () => {
  it('should pass validation for a valid create order payload', () => {
    const validPayload = {
      order_id: 'ORD-1234',
      courier_partner: 'urbanebolt',
      sender: {
        name: 'Sender Name',
        phone: '9876543210',
        address: 'Sender Address',
        city: 'Delhi',
        state: 'Delhi',
        pincode: '110001',
      },
      recipient: {
        name: 'Recipient Name',
        phone: '9876543211',
        address: 'Recipient Address',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
      },
      package_details: {
        weight_kg: 1.0,
        length_cm: 10,
        breadth_cm: 10,
        height_cm: 10,
        items_count: 1,
        item_description: 'Electronics',
      },
      payment_details: {
        payment_mode: 'PREPAID',
        collectable_amount: 0,
        declared_value: 500,
      },
    };

    expect(() => validateData(validateCreateOrder, validPayload)).not.toThrow();
  });

  it('should throw ValidationError with field-level details for missing required fields', () => {
    const invalidPayload = {
      order_id: 'ORD-1234',
      // Missing courier_partner, sender, recipient, etc.
    };

    try {
      validateData(validateCreateOrder, invalidPayload);
      fail('Should have thrown ValidationError');
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      const validationError = error as ValidationError;
      expect(Array.isArray(validationError.details)).toBe(true);
    }
  });

  it('should reject bulk orders exceeding 100 items limit', () => {
    const validOrderItem = {
      order_id: 'ORD-ITEM',
      courier_partner: 'mock',
      sender: {
        name: 'Sender',
        phone: '9876543210',
        address: 'Addr',
        city: 'City',
        state: 'State',
        pincode: '110001',
      },
      recipient: {
        name: 'Recipient',
        phone: '9876543211',
        address: 'Addr',
        city: 'City',
        state: 'State',
        pincode: '400001',
      },
      package_details: {
        weight_kg: 1.0,
        length_cm: 10,
        breadth_cm: 10,
        height_cm: 10,
        items_count: 1,
        item_description: 'Test Item',
      },
      payment_details: {
        payment_mode: 'PREPAID',
        collectable_amount: 0,
        declared_value: 100,
      },
    };

    const oversizedList = Array.from({ length: 101 }, (_, i) => ({
      ...validOrderItem,
      order_id: `ORD-${i}`,
    }));

    expect(() => validateData(validateBulkCreateOrder, { orders: oversizedList })).toThrow(ValidationError);
  });
});
