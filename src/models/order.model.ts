import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import { ShipmentStatus } from '../constants/courier.constants';
import { AddressInfo, PackageDetails, PaymentDetails } from '../types/courier.types';

export interface OrderAttributes {
  id: string;
  order_id: string;
  courier_partner: string;
  courier_order_id: string | null;
  awb_number: string | null;
  status: ShipmentStatus;
  raw_request_payload: unknown;
  raw_response_payload: unknown | null;
  failure_reason: string | null;
  sender_details: AddressInfo;
  recipient_details: AddressInfo;
  package_details: PackageDetails;
  payment_details: PaymentDetails;
  service_type: string | null;
  created_at?: Date;
  updated_at?: Date;
}

export type OrderCreationAttributes = Optional<
  OrderAttributes,
  'id' | 'courier_order_id' | 'awb_number' | 'raw_response_payload' | 'failure_reason' | 'service_type' | 'created_at' | 'updated_at'
>;

export class Order extends Model<OrderAttributes, OrderCreationAttributes> implements OrderAttributes {
  declare public id: string;
  declare public order_id: string;
  declare public courier_partner: string;
  declare public courier_order_id: string | null;
  declare public awb_number: string | null;
  declare public status: ShipmentStatus;
  declare public raw_request_payload: unknown;
  declare public raw_response_payload: unknown | null;
  declare public failure_reason: string | null;
  declare public sender_details: AddressInfo;
  declare public recipient_details: AddressInfo;
  declare public package_details: PackageDetails;
  declare public payment_details: PaymentDetails;
  declare public service_type: string | null;

  declare public readonly created_at: Date;
  declare public readonly updated_at: Date;
}

const JSON_TYPE = process.env.NODE_ENV === 'test' ? DataTypes.JSON : DataTypes.JSONB;

Order.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    order_id: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    courier_partner: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    courier_order_id: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    awb_number: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: ShipmentStatus.CREATED,
    },
    raw_request_payload: {
      type: JSON_TYPE,
      allowNull: false,
    },
    raw_response_payload: {
      type: JSON_TYPE,
      allowNull: true,
    },
    failure_reason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    sender_details: {
      type: JSON_TYPE,
      allowNull: false,
    },
    recipient_details: {
      type: JSON_TYPE,
      allowNull: false,
    },
    package_details: {
      type: JSON_TYPE,
      allowNull: false,
    },
    payment_details: {
      type: JSON_TYPE,
      allowNull: false,
    },
    service_type: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'orders',
    indexes: [
      { fields: ['order_id'], unique: true },
      { fields: ['awb_number'] },
      { fields: ['courier_partner'] },
      { fields: ['status'] },
    ],
  }
);

export default Order;
