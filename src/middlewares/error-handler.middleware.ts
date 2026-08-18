import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors';
import { ErrorCode } from '../constants/error.constants';
import { ApiErrorResponse } from '../types/common.types';
import { logger } from '../logger';
import { getRequestContext } from '../logger/async-context';

interface NormalizedErrorInfo {
  statusCode: number;
  errorCode: string;
  message: string;
  details?: unknown;
}

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const context = getRequestContext();
  const requestId = req.requestId || context.requestId || 'unknown-req';
  const orderId = req.params?.order_id || (req.body && (req.body as { order_id?: string }).order_id) || context.orderId;
  const courierPartner = (req.body && (req.body as { courier_partner?: string }).courier_partner) || context.courierPartner;

  const errorInfo = resolveErrorInfo(err);

  logNormalizedError(err, errorInfo, requestId, orderId, courierPartner);

  const errorResponse: ApiErrorResponse = {
    success: false,
    error: {
      code: errorInfo.errorCode,
      message: errorInfo.message,
      ...(errorInfo.details !== undefined ? { details: errorInfo.details } : {}),
      requestId,
      timestamp: new Date().toISOString(),
    },
  };

  res.status(errorInfo.statusCode).json(errorResponse);
};

/**
 * Classifies and maps errors into standard HTTP statuses and error codes.
 */
function resolveErrorInfo(err: Error): NormalizedErrorInfo {
  if (err instanceof AppError) {
    return {
      statusCode: err.statusCode,
      errorCode: err.errorCode,
      message: err.message,
      details: err.details,
    };
  }

  if (err.name === 'SequelizeUniqueConstraintError') {
    return {
      statusCode: 409,
      errorCode: ErrorCode.ORDER_ALREADY_EXISTS,
      message: 'An order with this ID already exists',
    };
  }

  if (err.name === 'SequelizeDatabaseError') {
    return {
      statusCode: 500,
      errorCode: ErrorCode.INTERNAL_SERVER_ERROR,
      message: 'Database operation failed',
    };
  }

  if (err.name === 'SyntaxError' && 'body' in err) {
    return {
      statusCode: 400,
      errorCode: ErrorCode.VALIDATION_ERROR,
      message: 'Malformed JSON in request body',
    };
  }

  return {
    statusCode: 500,
    errorCode: ErrorCode.INTERNAL_SERVER_ERROR,
    message: 'An unexpected internal server error occurred',
  };
}

/**
 * Logs errors with full audit context.
 */
function logNormalizedError(
  err: Error,
  errorInfo: NormalizedErrorInfo,
  requestId: string,
  orderId?: string,
  courierPartner?: string
): void {
  logger.error(`API Error Encountered: ${errorInfo.errorCode} - ${errorInfo.message}`, {
    order_id: orderId,
    courier_partner: courierPartner,
    requestId,
    error_type: err.constructor.name,
    errorCode: errorInfo.errorCode,
    statusCode: errorInfo.statusCode,
    details: errorInfo.details,
    stack: err.stack,
  });
}
