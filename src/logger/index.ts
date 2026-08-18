import winston from 'winston';
import { config } from '../config';
import { getRequestContext } from './async-context';

// Format to inject async context (e.g. requestId, orderId) into log meta
const contextFormat = winston.format((info) => {
  const context = getRequestContext();
  if (context.requestId && !info.requestId) {
    info.requestId = context.requestId;
  }
  if (context.orderId && !info.orderId) {
    info.orderId = context.orderId;
  }
  if (context.courierPartner && !info.courierPartner) {
    info.courierPartner = context.courierPartner;
  }
  return info;
});

// Human readable text formatter for local development
const textFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  contextFormat(),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ timestamp, level, message, stack, requestId, orderId, courierPartner, ...meta }) => {
    let contextStr = '';
    if (requestId || orderId || courierPartner) {
      const parts: string[] = [];
      if (requestId) parts.push(`req:${requestId}`);
      if (orderId) parts.push(`order:${orderId}`);
      if (courierPartner) parts.push(`courier:${courierPartner}`);
      contextStr = ` [${parts.join('|')}]`;
    }

    const metaKeys = Object.keys(meta).filter((k) => !['service'].includes(k));
    const metaStr = metaKeys.length > 0 ? ` ${JSON.stringify(meta)}` : '';
    const output = `[${timestamp}] [${level}]${contextStr}: ${message}${metaStr}`;
    return stack ? `${output}\n${stack}` : output;
  })
);

// Structured JSON formatter for production
const jsonFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  contextFormat(),
  winston.format.json()
);

// Select format based on config / env
const selectedFormat = config.logging.format === 'json' ? jsonFormat : textFormat;

export const logger = winston.createLogger({
  level: config.logging.level,
  defaultMeta: { service: 'courier-integration-service' },
  format: selectedFormat,
  transports: [
    new winston.transports.Console(),
  ],
  exitOnError: false,
});

export default logger;
