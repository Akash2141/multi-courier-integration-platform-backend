import { CourierRegistry } from '../../src/adapters/courier.registry';
import { ICourierAdapter } from '../../src/adapters/courier.interface';
import { UnknownCourierError } from '../../src/errors';

describe('CourierRegistry Unit Tests', () => {
  let registry: CourierRegistry;

  beforeEach(() => {
    registry = CourierRegistry.getInstance();
    registry.clear();
  });

  it('should register and retrieve a courier adapter', () => {
    const mockAdapter: ICourierAdapter = {
      partnerName: 'custom_express',
      createShipment: jest.fn(),
      trackShipment: jest.fn(),
      cancelShipment: jest.fn(),
    };

    registry.register(mockAdapter);

    expect(registry.has('custom_express')).toBe(true);
    expect(registry.has('CUSTOM_EXPRESS')).toBe(true); // Case-insensitive
    expect(registry.get('custom_express')).toBe(mockAdapter);
    expect(registry.getSupportedCouriers()).toContain('custom_express');
  });

  it('should throw UnknownCourierError when courier is not registered', () => {
    expect(() => registry.get('unsupported_courier')).toThrow(UnknownCourierError);
  });
});
