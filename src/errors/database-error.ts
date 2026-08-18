import { AppError } from './app-error';
import { ErrorCode } from '../constants/error.constants';

export class DatabaseError extends AppError {
  constructor(message: string = 'Database operation failed', details?: unknown) {
    super(message, 500, ErrorCode.DATABASE_ERROR, true, details);
  }
}
