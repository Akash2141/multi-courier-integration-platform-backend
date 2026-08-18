import { ajv } from './validator';

export interface RegisterRequest {
  email: string;
  password: string;
  role?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export const registerSchema = {
  type: 'object',
  required: ['email', 'password'],
  properties: {
    email: { type: 'string', format: 'email', minLength: 5, maxLength: 255 },
    password: { type: 'string', minLength: 6, maxLength: 100 },
    role: { type: 'string', enum: ['USER', 'ADMIN', 'OPERATOR'], default: 'USER' },
  },
  additionalProperties: false,
};

export const loginSchema = {
  type: 'object',
  required: ['email', 'password'],
  properties: {
    email: { type: 'string', format: 'email' },
    password: { type: 'string', minLength: 1 },
  },
  additionalProperties: false,
};

export const validateRegister = ajv.compile<RegisterRequest>(registerSchema);
export const validateLogin = ajv.compile<LoginRequest>(loginSchema);
