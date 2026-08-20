import { config } from './config';
import { logger } from './logger';
import { initDatabase, sequelize } from './models';
import { initAdapters } from './adapters';
import { orderReconciliationWorker } from './workers/order-reconciliation.worker';

/**
 * Dedicated Background Worker Process Entrypoint
 * Can be run in a separate Pod / Container / Process from the main HTTP API server.
 */
const startWorkerProcess = async (): Promise<void> => {
  try {
    logger.info(`Starting Dedicated Multi-Courier Worker Process [ENV: ${config.env}]...`);
    logger.info(`Logging configured: Format='${config.logging.format}', Level='${config.logging.level}'`);

    // 1. Connect to PostgreSQL database and sync models
    await initDatabase();

    // 2. Initialize courier adapters for dispatching shipments
    initAdapters();

    // 3. Start the reconciliation worker engine
    orderReconciliationWorker.start();

    logger.info('Dedicated Worker Process initialized and listening for pending orders.');
  } catch (error) {
    logger.error('Fatal error during Worker Process startup:', { error });
    process.exit(1);
  }
};

const gracefulShutdown = async (signal: string): Promise<void> => {
  logger.info(`Received ${signal}. Gracefully stopping Worker Process...`);

  orderReconciliationWorker.stop();

  try {
    await sequelize.close();
    logger.info('Worker database connection pool closed.');
    process.exit(0);
  } catch (err) {
    logger.error('Error closing worker database connection:', { err });
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('uncaughtException', (err: Error) => {
  logger.error('Uncaught Exception in Worker Process:', { error: err.message, stack: err.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason: unknown) => {
  logger.error('Unhandled Promise Rejection in Worker Process:', { reason });
});

startWorkerProcess();
