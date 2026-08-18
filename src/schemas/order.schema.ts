import { ajv } from './validator';
import { NormalizedCreateOrderRequest } from '../types/courier.types';

export const addressSchema = {
  type: 'object',
  required: ['name', 'phone', 'address', 'city', 'state', 'pincode'],
  properties: {
    name: { type: 'string', minLength: 2, maxLength: 100 },
    phone: { type: 'string', minLength: 7, maxLength: 20 },
    email: { type: 'string', format: 'email', nullable: true },
    address: { type: 'string', minLength: 3, maxLength: 300 },
    city: { type: 'string', minLength: 2, maxLength: 100 },
    state: { type: 'string', minLength: 2, maxLength: 100 },
    pincode: { type: 'string', minLength: 4, maxLength: 12 },
    country: { type: 'string', default: 'India' },
    address_type: { type: 'string', enum: ['Seller', 'Home', 'Warehouse', 'Office'], default: 'Seller' },
  },
  additionalProperties: true,
};

export const packageDetailsSchema = {
  type: 'object',
  required: ['weight_kg', 'length_cm', 'breadth_cm', 'height_cm', 'items_count', 'item_description'],
  properties: {
    weight_kg: { type: 'number', exclusiveMinimum: 0 },
    length_cm: { type: 'number', exclusiveMinimum: 0 },
    breadth_cm: { type: 'number', exclusiveMinimum: 0 },
    height_cm: { type: 'number', exclusiveMinimum: 0 },
    items_count: { type: 'integer', minimum: 1 },
    item_description: { type: 'string', minLength: 1, maxLength: 255 },
  },
  additionalProperties: true,
};

export const paymentDetailsSchema = {
  type: 'object',
  required: ['payment_mode', 'collectable_amount', 'declared_value'],
  properties: {
    payment_mode: { type: 'string', enum: ['COD', 'PREPAID'] },
    collectable_amount: { type: 'number', minimum: 0 },
    declared_value: { type: 'number', minimum: 0 },
  },
  additionalProperties: true,
};

export const invoiceDetailsSchema = {
  type: 'object',
  properties: {
    invoice_number: { type: 'string' },
    invoice_date: { type: 'string', format: 'date' },
    invoice_value: { type: 'number', minimum: 0 },
  },
  additionalProperties: true,
};

export const createOrderSchema = {
  type: 'object',
  required: ['order_id', 'courier_partner', 'sender', 'recipient', 'package_details', 'payment_details'],
  properties: {
    order_id: { type: 'string', minLength: 1, maxLength: 100 },
    courier_partner: { type: 'string', minLength: 1, maxLength: 50 },
    sender: addressSchema,
    recipient: addressSchema,
    return_address: addressSchema,
    package_details: packageDetailsSchema,
    payment_details: paymentDetailsSchema,
    invoice_details: invoiceDetailsSchema,
    service_type: { type: 'string', enum: ['STANDARD', 'EXPRESS', 'SAME_DAY', 'NEXT_DAY', 'SDD', 'NDD'], default: 'STANDARD' },
  },
  additionalProperties: false,
};

export const validateCreateOrder = ajv.compile<NormalizedCreateOrderRequest>(createOrderSchema);
