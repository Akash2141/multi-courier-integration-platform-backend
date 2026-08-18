import {
  ShipmentStatus,
  PaymentMode,
  BulkItemStatus,
  AddressType,
  ServiceType,
} from '../constants/courier.constants';

export interface AddressInfo {
  name: string;
  phone: string;
  email?: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  country?: string;
  address_type?: AddressType | string;
}

export interface PackageDetails {
  weight_kg: number;
  length_cm: number;
  breadth_cm: number;
  height_cm: number;
  items_count: number;
  item_description: string;
}

export interface PaymentDetails {
  payment_mode: PaymentMode;
  collectable_amount: number;
  declared_value: number;
}

export interface InvoiceDetails {
  invoice_number?: string;
  invoice_date?: string;
  invoice_value?: number;
}

export interface NormalizedCreateOrderRequest {
  order_id: string;
  courier_partner: string;
  sender: AddressInfo;
  recipient: AddressInfo;
  return_address?: AddressInfo;
  package_details: PackageDetails;
  payment_details: PaymentDetails;
  invoice_details?: InvoiceDetails;
  service_type?: ServiceType | string;
}

export interface NormalizedCreateOrderResponse {
  order_id: string;
  courier_partner: string;
  courier_order_id: string;
  awb_number: string;
  status: ShipmentStatus;
  raw_response: unknown;
  raw_request: unknown;
}

export interface TrackingEventItem {
  status: ShipmentStatus;
  activity: string;
  location?: string;
  timestamp: string;
  raw_details?: unknown;
}

export interface NormalizedTrackingResponse {
  order_id: string;
  courier_partner: string;
  awb_number: string;
  status: ShipmentStatus;
  current_status_description: string;
  estimated_delivery?: string;
  tracking_history: TrackingEventItem[];
  raw_response: unknown;
}

export interface NormalizedCancelResponse {
  order_id: string;
  courier_partner: string;
  awb_number: string;
  status: ShipmentStatus;
  cancelled_at: string;
  message: string;
  raw_response: unknown;
}

export interface BulkOrderItemResult {
  order_id: string;
  courier_partner?: string;
  status: BulkItemStatus;
  awb_number?: string;
  courier_order_id?: string;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface BulkOrderResponse {
  batch_id: string;
  total_orders: number;
  successful_orders: number;
  failed_orders: number;
  results: BulkOrderItemResult[];
}
