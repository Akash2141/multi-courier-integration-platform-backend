import { AppError } from './app-error';
import { ErrorCode } from '../constants/error.constants';

export class NotFoundError extends AppError {
  constructor(message: string = 'Requested resource not found', errorCode: string = ErrorCode.RESOURCE_NOT_FOUND) {
    super(message, 404, errorCode, true);
  }
}
