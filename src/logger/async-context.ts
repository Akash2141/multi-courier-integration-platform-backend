import { AsyncLocalStorage } from 'async_hooks';

export interface RequestContext {
  requestId?: string;
  orderId?: string;
  courierPartner?: string;
  userId?: string;
  [key: string]: unknown;
}

export const requestContextStorage = new AsyncLocalStorage<RequestContext>();

export const getRequestContext = (): RequestContext => {
  return requestContextStorage.getStore() || {};
};

export const setRequestContextValue = (key: keyof RequestContext, value: unknown): void => {
  const store = requestContextStorage.getStore();
  if (store) {
    store[key] = value;
  }
};
