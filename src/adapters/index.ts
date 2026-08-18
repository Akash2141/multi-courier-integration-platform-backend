import { courierRegistry } from './courier.registry';
import { UrbaneBoltAdapter } from './urbanebolt/urbanebolt.adapter';
import { MockCourierAdapter } from './mock/mock.adapter';
import { logger } from '../logger';

/**
 * Initializes and registers all courier adapters into the global courier registry.
 */
export const initAdapters = (): void => {
  logger.info('Initializing courier adapters...');
  courierRegistry.register(new UrbaneBoltAdapter());
  courierRegistry.register(new MockCourierAdapter());
  logger.info(`All courier adapters initialized. Active partners: [${courierRegistry.getSupportedCouriers().join(', ')}]`);
};

export * from './courier.interface';
export * from './courier.registry';
export * from './urbanebolt/urbanebolt.adapter';
export * from './mock/mock.adapter';
