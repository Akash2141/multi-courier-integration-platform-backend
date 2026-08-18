import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import { ShipmentStatus } from '../constants/courier.constants';

export interface TrackingEventAttributes {
  id: string;
  order_id: string;
  awb_number: string;
  status: ShipmentStatus;
  activity: string;
  location: string | null;
  event_timestamp: Date;
  raw_payload: unknown | null;
  created_at?: Date;
}

export type TrackingEventCreationAttributes = Optional<
  TrackingEventAttributes,
  'id' | 'location' | 'raw_payload' | 'created_at'
>;

export class TrackingEvent
  extends Model<TrackingEventAttributes, TrackingEventCreationAttributes>
  implements TrackingEventAttributes
{
  declare public id: string;
  declare public order_id: string;
  declare public awb_number: string;
  declare public status: ShipmentStatus;
  declare public activity: string;
  declare public location: string | null;
  declare public event_timestamp: Date;
  declare public raw_payload: unknown | null;

  declare public readonly created_at: Date;
}

const JSON_TYPE = process.env.NODE_ENV === 'test' ? DataTypes.JSON : DataTypes.JSONB;

TrackingEvent.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    order_id: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    awb_number: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    activity: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    location: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    event_timestamp: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    raw_payload: {
      type: JSON_TYPE,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'tracking_events',
    updatedAt: false,
    indexes: [
      { fields: ['order_id'] },
      { fields: ['awb_number'] },
      { fields: ['event_timestamp'] },
    ],
  }
);

export default TrackingEvent;
