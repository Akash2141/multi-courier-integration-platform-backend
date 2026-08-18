import { AppError } from './app-error';
import { ErrorCode } from '../constants/error.constants';

export interface FieldErrorDetail {
  field: string;
  message: string;
  keyword?: string;
  params?: Record<string, unknown>;
}

export class ValidationError extends AppError {
  constructor(message: string, details?: FieldErrorDetail[] | unknown) {
    super(message, 400, ErrorCode.VALIDATION_ERROR, true, details);
  }
}
