import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { env } from './config/env';
import { User } from './entities/User';
import { Product } from './entities/Product';
import { Lead } from './entities/Lead';

const isDev = env.NODE_ENV !== 'production';

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: env.DATABASE_URL,
  synchronize: false,
  logging: false,
  entities: [User, Product, Lead],
  migrations: [__dirname + '/migrations/*.{ts,js}'],
});

export default AppDataSource;
