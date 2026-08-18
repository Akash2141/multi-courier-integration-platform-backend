import { AppError } from './app-error';
import { ErrorCode } from '../constants/error.constants';

export class CourierError extends AppError {
  public readonly courierPartner: string;
  public readonly rawCourierResponse?: unknown;
  public readonly isRetryable: boolean;

  constructor(
    message: string,
    courierPartner: string,
    errorCode: string = ErrorCode.COURIER_ERROR,
    statusCode: number = 502,
    rawCourierResponse?: unknown,
    isRetryable: boolean = false
  ) {
    super(message, statusCode, errorCode, true);
    this.courierPartner = courierPartner;
    this.rawCourierResponse = rawCourierResponse;
    this.isRetryable = isRetryable;
  }
}
