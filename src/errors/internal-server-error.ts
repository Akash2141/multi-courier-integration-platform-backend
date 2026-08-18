import { AppError } from './app-error';
import { ErrorCode } from '../constants/error.constants';

export class InternalServerError extends AppError {
  constructor(message: string = 'An unexpected internal server error occurred') {
    super(message, 500, ErrorCode.INTERNAL_SERVER_ERROR, false);
  }
}
