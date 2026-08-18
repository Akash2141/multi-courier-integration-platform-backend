import { Request, Response, NextFunction } from 'express';
import { ValidateFunction } from 'ajv';
import { validateData } from '../schemas/validator';

export const validateBody = <T>(validator: ValidateFunction<T>) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      req.body = validateData<T>(validator, req.body);
      next();
    } catch (error) {
      next(error);
    }
  };
};
