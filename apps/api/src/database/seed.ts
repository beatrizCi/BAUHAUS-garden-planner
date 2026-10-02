import 'reflect-metadata';
import { config } from 'dotenv';
config({ path: ['.env', '../../.env'] });
import { DataSource, DataSourceOptions } from 'typeorm';
import { databaseOptions } from './database.config';
import { ProductEntity } from '../products/product.entity';
import { CATALOG } from '../products/catalog';

/** Resets the product table to the bundled demo catalog. Run with: npm run seed */
async function main() {
  const ds = new DataSource(databaseOptions() as DataSourceOptions);
  await ds.initialize();
  const repo = ds.getRepository(ProductEntity);
  await repo.clear();
  await repo.save(CATALOG.map((p) => repo.create(p)));
  console.log(`Seeded ${CATALOG.length} products`);
  await ds.destroy();
}
main().catch((e) => { console.error(e); process.exit(1); });
