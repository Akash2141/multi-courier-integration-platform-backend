import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { config } from '../../config';
import { logger } from '../../logger';
import { getRequestContext } from '../../logger/async-context';
import { CourierError } from '../../errors';
import { ErrorCode } from '../../constants/error.constants';
import { retryWithBackoff } from '../../utils/retry';
import { cacheService } from '../../cache';
import { UrbaneBoltAuthResponse } from './urbanebolt.types';

export class UrbaneBoltClient {
  private readonly axiosInstance: AxiosInstance;
  private readonly tokenCacheKey = 'courier:token:urbanebolt';
  private isAuthenticating: Promise<string> | null = null;

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: config.courier.urbanebolt.baseUrl,
      timeout: config.courier.timeoutMs,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Authenticates with UrbaneBolt UAT API and caches the bearer token in Redis/Memory cache.
   */
  public async getAuthToken(forceRefresh = false): Promise<string> {
    if (!forceRefresh) {
      const cachedToken = await cacheService.get(this.tokenCacheKey);
      if (cachedToken) {
        return cachedToken;
      }
    }

    if (this.isAuthenticating) {
      return this.isAuthenticating;
    }

    this.isAuthenticating = this.fetchAndStoreNewAuthToken();
    return this.isAuthenticating;
  }

  /**
   * Performs the HTTP call to obtain a new token and stores it in distributed cache.
   */
  private async fetchAndStoreNewAuthToken(): Promise<string> {
    const context = getRequestContext();
    logger.info('Authenticating with UrbaneBolt API (Distributed Cache Miss)...', {
      courier: 'urbanebolt',
      endpoint: '/auth/getToken/',
      cacheProvider: cacheService.getProviderName(),
      requestId: context.requestId,
    });

    try {
      const response: AxiosResponse<UrbaneBoltAuthResponse> = await this.axiosInstance.post(
        '/auth/getToken/',
        {
          username: config.courier.urbanebolt.username,
          password: config.courier.urbanebolt.password,
        }
      );

      const data = response.data;
      const token = data.token || data.access || data.jwt || (typeof data === 'string' ? data : null);

      if (!token) {
        throw new CourierError(
          'Failed to obtain authentication token from UrbaneBolt: Invalid response structure',
          'urbanebolt',
          ErrorCode.COURIER_AUTH_ERROR,
          502,
          data
        );
      }

      const stringToken = String(token);

      // Store in distributed Redis / Memory cache with 12 hours TTL (43200 seconds)
      await cacheService.set(this.tokenCacheKey, stringToken, config.redis.ttlSeconds);

      logger.info('UrbaneBolt authentication successful token saved to distributed cache.', {
        courier: 'urbanebolt',
        cacheProvider: cacheService.getProviderName(),
        ttlSeconds: config.redis.ttlSeconds,
        requestId: context.requestId,
      });

      return stringToken;
    } catch (error: unknown) {
      await cacheService.del(this.tokenCacheKey);

      logger.error('UrbaneBolt authentication failed:', {
        courier: 'urbanebolt',
        requestId: context.requestId,
        error: error instanceof Error ? error.message : error,
      });

      throw new CourierError(
        'Courier authentication failed with UrbaneBolt',
        'urbanebolt',
        ErrorCode.COURIER_AUTH_ERROR,
        502,
        axios.isAxiosError(error) ? error.response?.data : undefined
      );
    } finally {
      this.isAuthenticating = null;
    }
  }

  /**
   * Executes an authenticated HTTP request with auto-retry and backoff.
   */
  public async request<T = unknown>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    url: string,
    data?: unknown,
    params?: Record<string, unknown>,
    hasRetriedAuth = false
  ): Promise<T> {
    const executeCall = async (): Promise<T> => {
      const token = await this.getAuthToken();
      const requestConfig: AxiosRequestConfig = {
        method,
        url,
        data,
        params,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      };

      try {
        const response: AxiosResponse<T> = await this.axiosInstance.request<T>(requestConfig);
        return response.data;
      } catch (error: unknown) {
        return this.handleAxiosRequestError<T>(error, method, url, data, params, hasRetriedAuth);
      }
    };

    return retryWithBackoff<T>(executeCall, {
      maxAttempts: config.courier.retryAttempts,
      initialDelayMs: config.courier.retryDelayMs,
      backoffFactor: 2,
      jitter: true,
      shouldRetry: (err) => err instanceof CourierError && err.isRetryable,
      onRetry: (_err, attempt, delayMs) => {
        logger.warn(`Retrying UrbaneBolt API call (attempt ${attempt}/${config.courier.retryAttempts}) in ${delayMs}ms`, {
          courier: 'urbanebolt',
          url,
        });
      },
    });
  }

  /**
   * Handles errors from Axios requests with classification (Auth, 4xx, 5xx).
   */
  private async handleAxiosRequestError<T>(
    error: unknown,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    url: string,
    data?: unknown,
    params?: Record<string, unknown>,
    hasRetriedAuth = false
  ): Promise<T> {
    if (!axios.isAxiosError(error)) {
      throw error;
    }

    const status = error.response?.status;
    const rawResponseData = error.response?.data;
    const context = getRequestContext();

    // 1. Auth failure -> globally invalidate distributed cache and retry once
    if ((status === 401 || status === 403) && !hasRetriedAuth) {
      logger.warn('UrbaneBolt returned 401/403. Invalidating distributed cache token and retrying...', {
        courier: 'urbanebolt',
        url,
        requestId: context.requestId,
      });

      await cacheService.del(this.tokenCacheKey);
      await this.getAuthToken(true);
      return this.request<T>(method, url, data, params, true);
    }

    // 2. Client error (4xx) -> non-retryable normalized error
    if (status && status >= 400 && status < 500) {
      throw this.createClientError(status, rawResponseData, url, context);
    }

    // 3. Server / Network error (5xx, timeout) -> retryable normalized error
    throw this.createServerError(error, rawResponseData, url, context);
  }

  /**
   * Creates normalized CourierError for 4xx client rejections.
   */
  private createClientError(status: number, rawData: unknown, url: string, context: Record<string, unknown>): CourierError {
    logger.warn('UrbaneBolt returned client error (4xx):', {
      courier: 'urbanebolt',
      status,
      url,
      responseData: rawData,
      requestId: context.requestId,
      orderId: context.orderId,
    });

    return new CourierError(
      `UrbaneBolt rejected the request: ${this.extractErrorMessage(rawData) || 'Invalid request parameters'}`,
      'urbanebolt',
      ErrorCode.COURIER_BAD_REQUEST,
      400,
      rawData,
      false
    );
  }

  /**
   * Creates normalized CourierError for 5xx/network failures.
   */
  private createServerError(error: any, rawData: unknown, url: string, context: Record<string, unknown>): CourierError {
    const isTimeout = error.code === 'ECONNABORTED' || error.message?.includes('timeout');

    logger.error('UrbaneBolt API network/server error:', {
      courier: 'urbanebolt',
      status: error.response?.status,
      code: error.code,
      message: error.message,
      url,
      isTimeout,
      requestId: context.requestId,
      orderId: context.orderId,
    });

    return new CourierError(
      isTimeout ? 'UrbaneBolt courier API timed out' : 'UrbaneBolt courier service is currently unavailable',
      'urbanebolt',
      isTimeout ? ErrorCode.COURIER_TIMEOUT : ErrorCode.COURIER_SERVICE_UNAVAILABLE,
      isTimeout ? 504 : 502,
      rawData,
      true
    );
  }

  private extractErrorMessage(responseData: unknown): string | null {
    if (!responseData) return null;
    if (typeof responseData === 'string') return responseData;
    if (typeof responseData === 'object') {
      const obj = responseData as Record<string, unknown>;
      if (typeof obj.message === 'string') return obj.message;
      if (typeof obj.error === 'string') return obj.error;
      if (typeof obj.detail === 'string') return obj.detail;
      if (Array.isArray(obj.errors) && obj.errors.length > 0) return String(obj.errors[0]);
    }
    return null;
  }
}
