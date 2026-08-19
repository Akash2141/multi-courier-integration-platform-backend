import { Sequelize, Options } from 'sequelize';
import { config } from './index';
import { logger } from '../logger';
import { DatabaseDialect, Environment } from '../constants/courier.constants';

const isTest = process.env.NODE_ENV === Environment.TEST;

let sequelize: Sequelize;

if (isTest && process.env.USE_TEST_POSTGRES !== 'true') {
  // Use in-memory SQLite for automated tests
  sequelize = new Sequelize({
    dialect: DatabaseDialect.SQLITE,
    storage: ':memory:',
    logging: false,
    define: {
      underscored: true,
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  });
} else {
  // Production / Development PostgreSQL connection
  const sequelizeOptions: Options = {
    dialect: DatabaseDialect.POSTGRES,
    logging: config.database.logging ? (msg: string) => logger.debug(`[Sequelize] ${msg}`) : false,
    pool: {
      max: 20,
      min: 2,
      acquire: 30000,
      idle: 10000,
    },
    define: {
      underscored: true,
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  };

  sequelize = new Sequelize(config.database.url, sequelizeOptions);
}

export { sequelize };
export default sequelize;
