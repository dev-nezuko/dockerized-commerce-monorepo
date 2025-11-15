import 'reflect-metadata';
import { DataSource } from 'typeorm';

import { env } from './config/env';
import { Lead } from './entities/Lead';
import { Product } from './entities/Product';
import { User } from './entities/User';

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: env.DATABASE_URL,
  // gen_random_uuid() is built into Postgres 13+, so no extension is needed.
  uuidExtension: 'pgcrypto',
  synchronize: false,
  logging: false,
  entities: [User, Product, Lead],
  // Compiled migrations under dist/; tests register the TypeScript classes directly.
  migrations: [__dirname + '/migrations/*.js'],
});
