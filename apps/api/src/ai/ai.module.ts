import { Module } from '@nestjs/common';
import { ProductsModule } from '../products/products.module';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';

@Module({ imports: [ProductsModule], providers: [AiService], controllers: [AiController] })
export class AiModule {}
