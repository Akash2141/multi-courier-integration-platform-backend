import http from 'http';
import { app } from './app';
import { config } from './config';
import { logger } from './logger';
import { initDatabase, sequelize } from './models';
import { orderReconciliationWorker } from './workers/order-reconciliation.worker';

let server: http.Server;

const startServer = async (): Promise<void> => {
  try {
    logger.info(`Starting Multi-Courier Integration Platform backend [ENV: ${config.env}]...`);
    logger.info(`Logging configured: Format='${config.logging.format}', Level='${config.logging.level}'`);

    // Connect to PostgreSQL database and sync models
    await initDatabase();

    // Start background order reconciliation worker
    orderReconciliationWorker.start();

    // Start HTTP Server
    server = app.listen(config.port, () => {
      logger.info(`Server running and listening on port ${config.port} (http://localhost:${config.port})`);
      logger.info(`Healthcheck available at: http://localhost:${config.port}/health`);
      logger.info(`API endpoints mounted at: http://localhost:${config.port}/api/v1`);
    });
  } catch (error) {
    logger.error('Fatal error during application startup:', { error });
    process.exit(1);
  }
};

const gracefulShutdown = async (signal: string): Promise<void> => {
  logger.info(`Received ${signal}. Gracefully shutting down...`);

  // Stop background reconciliation worker
  orderReconciliationWorker.stop();

  if (server) {
    server.close(async () => {
      logger.info('HTTP server closed.');
      try {
        await sequelize.close();
        logger.info('Database connection pool closed.');
        process.exit(0);
      } catch (err) {
        logger.error('Error closing database connection:', { err });
        process.exit(1);
      }
    });
  } else {
    process.exit(0);
  }

  // Force shutdown after 10 seconds if hanging
  setTimeout(() => {
    logger.error('Forced shutdown after timeout.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('uncaughtException', (err: Error) => {
  logger.error('Uncaught Exception thrown:', { error: err.message, stack: err.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason: unknown) => {
  logger.error('Unhandled Promise Rejection:', { reason });
});

startServer();
