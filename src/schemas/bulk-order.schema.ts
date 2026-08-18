import { ajv } from './validator';
import { createOrderSchema } from './order.schema';
import { NormalizedCreateOrderRequest } from '../types/courier.types';

export interface BulkCreateOrderRequest {
  orders: NormalizedCreateOrderRequest[];
}

export const bulkCreateOrderSchema = {
  type: 'object',
  required: ['orders'],
  properties: {
    orders: {
      type: 'array',
      items: createOrderSchema,
      minItems: 1,
      maxItems: 100,
    },
  },
  additionalProperties: false,
};

export const validateBulkCreateOrder = ajv.compile<BulkCreateOrderRequest>(bulkCreateOrderSchema);
