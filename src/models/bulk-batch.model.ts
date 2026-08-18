import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import { BulkOrderItemResult } from '../types/courier.types';
import { BulkBatchStatus } from '../constants/courier.constants';

export interface BulkBatchAttributes {
  batch_id: string;
  total_orders: number;
  successful_orders: number;
  failed_orders: number;
  status: BulkBatchStatus;
  results: BulkOrderItemResult[];
  created_at?: Date;
  updated_at?: Date;
}

export type BulkBatchCreationAttributes = Optional<
  BulkBatchAttributes,
  'successful_orders' | 'failed_orders' | 'status' | 'results' | 'created_at' | 'updated_at'
>;

export class BulkBatch
  extends Model<BulkBatchAttributes, BulkBatchCreationAttributes>
  implements BulkBatchAttributes
{
  declare public batch_id: string;
  declare public total_orders: number;
  declare public successful_orders: number;
  declare public failed_orders: number;
  declare public status: BulkBatchStatus;
  declare public results: BulkOrderItemResult[];

  declare public readonly created_at: Date;
  declare public readonly updated_at: Date;
}

const JSON_TYPE = process.env.NODE_ENV === 'test' ? DataTypes.JSON : DataTypes.JSONB;

BulkBatch.init(
  {
    batch_id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    total_orders: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    successful_orders: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    failed_orders: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: BulkBatchStatus.PROCESSING,
    },
    results: {
      type: JSON_TYPE,
      allowNull: false,
      defaultValue: [],
    },
  },
  {
    sequelize,
    tableName: 'bulk_batches',
    indexes: [{ fields: ['status'] }],
  }
);

export default BulkBatch;
