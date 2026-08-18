import express, { Application, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { requestIdMiddleware } from './middlewares/request-id.middleware';
import { httpLoggerMiddleware } from './middlewares/http-logger.middleware';
import { errorHandler } from './middlewares/error-handler.middleware';
import { NotFoundError } from './errors';
import { initAdapters } from './adapters';
import apiRoutes from './routes';
import { healthController } from './controllers/health.controller';

export const createApp = (): Application => {
  const app: Application = express();

  // Initialize Courier Adapters in registry
  initAdapters();

  // Security Headers via Helmet
  app.use(
    helmet({
      contentSecurityPolicy: false, // API backend only
      crossOriginEmbedderPolicy: false,
    })
  );

  // Cross-Origin Resource Sharing
  app.use(cors());

  // JSON Body Parser with size limits
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Request ID Correlation Middleware (AsyncLocalStorage)
  app.use(requestIdMiddleware);

  // HTTP Access Logger Middleware (Winston)
  app.use(httpLoggerMiddleware);

  // Root Healthcheck endpoint
  app.get('/health', (req: Request, res: Response) => healthController.healthCheck(req, res));

  // Mount API v1 Routes
  app.use('/api/v1', apiRoutes);

  // Handle 404 for unmatched routes
  app.use((req: Request, _res: Response, next: NextFunction) => {
    next(new NotFoundError(`Route ${req.method} ${req.originalUrl} not found`));
  });

  // Centralized Error Handler Middleware
  app.use(errorHandler);

  return app;
};

export const app = createApp();
export default app;
