import { Injectable, Logger, NotFoundException, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductEntity } from './product.entity';
import { CATALOG } from './catalog';

export interface ProductQuery { category?: string; color?: string; q?: string }

@Injectable()
export class ProductsService implements OnApplicationBootstrap {
  private readonly log = new Logger(ProductsService.name);
  constructor(@InjectRepository(ProductEntity) private readonly repo: Repository<ProductEntity>) {}

  async onApplicationBootstrap() {
    if ((await this.repo.count()) === 0) {
      await this.repo.save(CATALOG.map((p) => this.repo.create(p)));
      this.log.log(`Seeded ${CATALOG.length} demo products`);
    }
  }

  async findAll({ category, color, q }: ProductQuery) {
    const all = await this.repo.find({ order: { id: 'ASC' } });
    const needle = q?.trim().toLowerCase();
    return all.filter(
      (p) =>
        (!category || category === 'Alle' || p.category === category) &&
        (!color || p.colors.some((c) => c.name === color)) &&
        (!needle || [p.name, p.category, ...p.keywords].join(' ').toLowerCase().includes(needle)),
    );
  }

  async findOne(id: string) {
    const p = await this.repo.findOneBy({ id });
    if (!p) throw new NotFoundException(`Product ${id} not found`);
    return p;
  }
}
