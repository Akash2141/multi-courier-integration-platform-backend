import { AppError } from './app-error';
import { ErrorCode } from '../constants/error.constants';

export class UnknownCourierError extends AppError {
  constructor(courierName: string, supportedCouriers: readonly string[] = []) {
    super(
      `Unknown courier partner: '${courierName}'. Supported courier partners are: ${supportedCouriers.join(', ')}`,
      400,
      ErrorCode.UNKNOWN_COURIER,
      true,
      { requestedCourier: courierName, supportedCouriers }
    );
  }
}
