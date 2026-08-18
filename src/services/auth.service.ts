import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { User } from '../models';
import { config } from '../config';
import { UnauthorizedError, ConflictError } from '../errors';
import { ErrorCode } from '../constants/error.constants';
import { JwtUserPayload } from '../types/auth.types';
import { RegisterRequest, LoginRequest } from '../schemas/auth.schema';
import { UserRole } from '../constants/courier.constants';
import { logger } from '../logger';

export interface AuthResult {
  user: {
    id: string;
    email: string;
    role: string;
  };
  token: string;
  expiresIn: string;
}

export class AuthService {
  /**
   * Registers a new user account.
   */
  public async register(data: RegisterRequest): Promise<AuthResult> {
    const existingUser = await User.findOne({ where: { email: data.email.toLowerCase() } });
    if (existingUser) {
      throw new ConflictError(`User with email '${data.email}' already exists`, ErrorCode.CONFLICT);
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(data.password, salt);

    const user = await User.create({
      email: data.email.toLowerCase(),
      password_hash: passwordHash,
      role: data.role || UserRole.USER,
    });

    const userId = user.id || user.getDataValue('id');
    const userEmail = user.email || user.getDataValue('email');
    const userRole = user.role || user.getDataValue('role');

    logger.info(`New user registered: ${userEmail}`, { userId });

    const token = this.generateToken({
      userId,
      email: userEmail,
      role: userRole,
    });

    return {
      user: {
        id: userId,
        email: userEmail,
        role: userRole,
      },
      token,
      expiresIn: config.jwt.expiresIn,
    };
  }

  /**
   * Authenticates user credentials and returns JWT token.
   */
  public async login(data: LoginRequest): Promise<AuthResult> {
    const user = await User.findOne({ where: { email: data.email.toLowerCase() } });
    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const passwordHash = user.password_hash || user.getDataValue('password_hash');
    const isMatch = await bcrypt.compare(data.password, passwordHash);
    if (!isMatch) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const userId = user.id || user.getDataValue('id');
    const userEmail = user.email || user.getDataValue('email');
    const userRole = user.role || user.getDataValue('role');

    logger.info(`User logged in successfully: ${userEmail}`, { userId });

    const token = this.generateToken({
      userId,
      email: userEmail,
      role: userRole,
    });

    return {
      user: {
        id: userId,
        email: userEmail,
        role: userRole,
      },
      token,
      expiresIn: config.jwt.expiresIn,
    };
  }

  /**
   * Generates a signed JWT token for user payload.
   */
  private generateToken(payload: JwtUserPayload): string {
    const options: SignOptions = {
      expiresIn: config.jwt.expiresIn as jwt.SignOptions['expiresIn'],
    };
    return jwt.sign(payload, config.jwt.secret, options);
  }
}

export const authService = new AuthService();
