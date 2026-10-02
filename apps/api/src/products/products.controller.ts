import { Controller, Get, Param, Query } from '@nestjs/common';
import { ProductsService } from './products.service';

@Controller('products')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get()
  list(@Query('category') category?: string, @Query('color') color?: string, @Query('q') q?: string) {
    return this.products.findAll({ category, color, q });
  }

  @Get(':id')
  one(@Param('id') id: string) {
    return this.products.findOne(id);
  }
}
