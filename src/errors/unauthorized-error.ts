import { AppError } from './app-error';
import { ErrorCode } from '../constants/error.constants';

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, ErrorCode.UNAUTHORIZED, true);
  }
}
