import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { ProductEntity } from '../products/product.entity';
import { ProjectEntity } from '../projects/project.entity';
import { ServiceRequestEntity } from '../service-requests/service-request.entity';

export const entities = [ProductEntity, ProjectEntity, ServiceRequestEntity];

/**
 * DB_TYPE=sqlite (default, zero setup) or DB_TYPE=postgres with DATABASE_URL (see docker-compose.yml).
 * synchronize is on outside production; switch to TypeORM migrations before going live.
 */
export function databaseOptions(): TypeOrmModuleOptions {
  const sync = process.env.NODE_ENV !== 'production';
  if (process.env.DB_TYPE === 'postgres') {
    return { type: 'postgres', url: process.env.DATABASE_URL, entities, synchronize: sync };
  }
  const file = resolve(process.env.SQLITE_PATH ?? 'data/garten.sqlite');
  mkdirSync(dirname(file), { recursive: true });
  return { type: 'better-sqlite3', database: file, entities, synchronize: sync };
}
