import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import { UserRole } from '../constants/courier.constants';

export interface UserAttributes {
  id: string;
  email: string;
  password_hash: string;
  role: UserRole | string;
  created_at?: Date;
  updated_at?: Date;
}

export type UserCreationAttributes = Optional<UserAttributes, 'id' | 'role' | 'created_at' | 'updated_at'>;

export class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  declare public id: string;
  declare public email: string;
  declare public password_hash: string;
  declare public role: UserRole | string;

  declare public readonly created_at: Date;
  declare public readonly updated_at: Date;
}

User.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    password_hash: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    role: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: UserRole.USER,
    },
  },
  {
    sequelize,
    tableName: 'users',
    indexes: [{ fields: ['email'], unique: true }],
  }
);

export default User;
