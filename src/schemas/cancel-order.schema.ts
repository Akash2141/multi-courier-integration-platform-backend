import { ajv } from './validator';

export interface CancelOrderRequest {
  reason?: string;
}

export const cancelOrderSchema = {
  type: 'object',
  properties: {
    reason: { type: 'string', maxLength: 500 },
  },
  additionalProperties: false,
};

export const validateCancelOrder = ajv.compile<CancelOrderRequest>(cancelOrderSchema);
