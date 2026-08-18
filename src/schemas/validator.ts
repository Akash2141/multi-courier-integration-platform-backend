import Ajv, { JSONSchemaType, ValidateFunction, ErrorObject } from 'ajv';
import addFormats from 'ajv-formats';
import ajvErrors from 'ajv-errors';
import { ValidationError, FieldErrorDetail } from '../errors';

export const ajv = new Ajv({
  allErrors: true,
  coerceTypes: true,
  useDefaults: true,
  removeAdditional: false,
  strict: false,
});

addFormats(ajv);
ajvErrors(ajv);

/**
 * Formats AJV ErrorObjects into normalized FieldErrorDetail array
 */
export const formatAjvErrors = (errors: ErrorObject[] | null | undefined): FieldErrorDetail[] => {
  if (!errors || errors.length === 0) {
    return [{ field: 'body', message: 'Invalid request payload' }];
  }

  return errors.map((err) => {
    let field = err.instancePath.replace(/^\//, '').replace(/\//g, '.');
    if (!field && err.params && typeof err.params === 'object') {
      const missingProp = (err.params as { missingProperty?: string }).missingProperty;
      if (missingProp) {
        field = missingProp;
      }
    }
    if (!field) {
      field = 'body';
    }

    return {
      field,
      message: err.message || 'Validation error',
      code: err.keyword,
    };
  });
};

/**
 * Validates data against an AJV ValidateFunction and throws ValidationError on failure.
 */
export function validateData<T>(validateFn: ValidateFunction<T>, data: unknown): T {
  const isValid = validateFn(data);
  if (!isValid) {
    const formattedErrors = formatAjvErrors(validateFn.errors);
    throw new ValidationError('Validation failed for request payload', formattedErrors);
  }
  return data as T;
}
