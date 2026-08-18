import dotenv from 'dotenv';
import path from 'path';

// Load .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export interface AppConfig {
  env: string;
  port: number;
  logging: {
    format: 'json' | 'text';
    level: string;
  };
  jwt: {
    secret: string;
    expiresIn: string;
  };
  database: {
    url: string;
    logging: boolean;
    syncAlter: boolean;
  };
  courier: {
    timeoutMs: number;
    retryAttempts: number;
    retryDelayMs: number;
    bulkConcurrencyLimit: number;
    urbanebolt: {
      baseUrl: string;
      username: string;
      password: string;
      customerCode: string;
    };
  };
}

export const config: AppConfig = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  logging: {
    format: (process.env.LOG_FORMAT?.toLowerCase() === 'json' ? 'json' : 'text') as 'json' | 'text',
    level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'default_super_secret_jwt_key_multi_courier_2026',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  },
  database: {
    url: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/courier_hub',
    logging: process.env.DB_LOGGING === 'true',
    syncAlter: process.env.DB_SYNC_ALTER !== 'false',
  },
  courier: {
    timeoutMs: parseInt(process.env.COURIER_TIMEOUT_MS || '10000', 10),
    retryAttempts: parseInt(process.env.COURIER_RETRY_ATTEMPTS || '3', 10),
    retryDelayMs: parseInt(process.env.COURIER_RETRY_DELAY_MS || '1000', 10),
    bulkConcurrencyLimit: parseInt(process.env.BULK_CONCURRENCY_LIMIT || '10', 10),
    urbanebolt: {
      baseUrl: process.env.URBANEBOLT_BASE_URL || 'https://uat.urbanebolt.in/api/v1',
      username: process.env.URBANEBOLT_USERNAME || 'info@urbanebolt.com',
      password: process.env.URBANEBOLT_PASSWORD || 'EKIcygsLVV5RCtPZ',
      customerCode: process.env.URBANEBOLT_CUSTOMER_CODE || 'UEBCUS0008',
    },
  },
};
