export enum ShipmentStatus {
  CREATED = 'CREATED',
  PICKED_UP = 'PICKED_UP',
  IN_TRANSIT = 'IN_TRANSIT',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  FAILED = 'FAILED',
}

export enum BulkBatchStatus {
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  PARTIAL_SUCCESS = 'PARTIAL_SUCCESS',
  FAILED = 'FAILED',
}

export enum BulkItemStatus {
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  SKIPPED_IDEMPOTENT = 'SKIPPED_IDEMPOTENT',
}

export enum PaymentMode {
  COD = 'COD',
  PREPAID = 'PREPAID',
}

export enum ServiceType {
  STANDARD = 'STANDARD',
  EXPRESS = 'EXPRESS',
  SAME_DAY = 'SAME_DAY',
  NEXT_DAY = 'NEXT_DAY',
  SDD = 'SDD',
  NDD = 'NDD',
}

export enum CourierPartnerName {
  URBANEBOLT = 'urbanebolt',
  MOCK = 'mock',
}

export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
  OPERATOR = 'OPERATOR',
}

export enum AddressType {
  SELLER = 'Seller',
  HOME = 'Home',
  WAREHOUSE = 'Warehouse',
  OFFICE = 'Office',
}

export enum LogFormat {
  JSON = 'json',
  TEXT = 'text',
}

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

export const SUPPORTED_COURIERS = [
  CourierPartnerName.URBANEBOLT,
  CourierPartnerName.MOCK,
] as const;
