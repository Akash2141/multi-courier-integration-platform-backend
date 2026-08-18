import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { requestContextStorage } from '../logger/async-context';

export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const incomingRequestId = req.headers['x-request-id'] as string;
  const requestId = incomingRequestId || uuidv4();

  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);

  requestContextStorage.run({ requestId }, () => {
    next();
  });
};
