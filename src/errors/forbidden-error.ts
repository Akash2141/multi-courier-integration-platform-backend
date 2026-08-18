import { AppError } from './app-error';
import { ErrorCode } from '../constants/error.constants';

export class ForbiddenError extends AppError {
  constructor(message: string = 'Access forbidden') {
    super(message, 403, ErrorCode.FORBIDDEN, true);
  }
}
