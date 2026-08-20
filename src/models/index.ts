import { sequelize } from '../config/database';
import { Order, OrderAttributes, OrderCreationAttributes } from './order.model';
import { TrackingEvent, TrackingEventAttributes, TrackingEventCreationAttributes } from './tracking-event.model';
import { User, UserAttributes, UserCreationAttributes } from './user.model';
import { BulkBatch, BulkBatchAttributes, BulkBatchCreationAttributes } from './bulk-batch.model';
import { logger } from '../logger';

// Set up associations
Order.hasMany(TrackingEvent, {
  foreignKey: 'order_id',
  sourceKey: 'order_id',
  as: 'tracking_events',
});

TrackingEvent.belongsTo(Order, {
  foreignKey: 'order_id',
  targetKey: 'order_id',
  as: 'order',
});

export {
  sequelize,
  Order,
  OrderAttributes,
  OrderCreationAttributes,
  TrackingEvent,
  TrackingEventAttributes,
  TrackingEventCreationAttributes,
  User,
  UserAttributes,
  UserCreationAttributes,
  BulkBatch,
  BulkBatchAttributes,
  BulkBatchCreationAttributes,
};

export const initDatabase = async (): Promise<void> => {
  try {
    await sequelize.authenticate();
    logger.info('Database connection established successfully.');

    // In non-test environments or when configured, sync schema
    if (process.env.NODE_ENV !== 'test') {
      await sequelize.sync({ alter: true });
      logger.info('Database models synchronized with PostgreSQL.');
    }
  } catch (error) {
    logger.error('Unable to connect to the database:', { error });
    throw error;
  }
};
