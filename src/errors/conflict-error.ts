import { AppError } from './app-error';
import { ErrorCode } from '../constants/error.constants';

export class ConflictError extends AppError {
  constructor(message: string, errorCode: string = ErrorCode.CONFLICT) {
    super(message, 409, errorCode, true);
  }
}
