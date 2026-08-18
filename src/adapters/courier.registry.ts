import { ICourierAdapter } from './courier.interface';
import { UnknownCourierError } from '../errors';
import { logger } from '../logger';

export class CourierRegistry {
  private static instance: CourierRegistry;
  private readonly adapters: Map<string, ICourierAdapter> = new Map();

  private constructor() {}

  public static getInstance(): CourierRegistry {
    if (!CourierRegistry.instance) {
      CourierRegistry.instance = new CourierRegistry();
    }
    return CourierRegistry.instance;
  }

  /**
   * Registers a new courier adapter.
   */
  public register(adapter: ICourierAdapter): void {
    const key = adapter.partnerName.toLowerCase();
    if (this.adapters.has(key)) {
      logger.warn(`Courier adapter for '${key}' is already registered. Overwriting existing adapter.`);
    }
    this.adapters.set(key, adapter);
    logger.info(`Registered courier adapter: '${adapter.partnerName}'`);
  }

  /**
   * Retrieves a registered courier adapter by name.
   * Throws UnknownCourierError if not registered.
   */
  public get(partnerName: string): ICourierAdapter {
    const supported = this.getSupportedCouriers();
    if (!partnerName) {
      throw new UnknownCourierError('undefined', supported);
    }
    const key = partnerName.toLowerCase().trim();
    const adapter = this.adapters.get(key);
    if (!adapter) {
      throw new UnknownCourierError(partnerName, supported);
    }
    return adapter;
  }

  /**
   * Checks if a courier adapter is registered.
   */
  public has(partnerName: string): boolean {
    if (!partnerName) return false;
    return this.adapters.has(partnerName.toLowerCase().trim());
  }

  /**
   * Returns a list of all registered courier partner names.
   */
  public getSupportedCouriers(): string[] {
    return Array.from(this.adapters.keys());
  }

  /**
   * Clears all registered adapters (useful for testing).
   */
  public clear(): void {
    this.adapters.clear();
  }
}

export const courierRegistry = CourierRegistry.getInstance();
