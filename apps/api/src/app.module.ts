import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { databaseOptions } from './database/database.config';
import { ProductsModule } from './products/products.module';
import { ProjectsModule } from './projects/projects.module';
import { UploadsModule } from './uploads/uploads.module';
import { VisionModule } from './vision/vision.module';
import { AiModule } from './ai/ai.module';
import { ServiceRequestsModule } from './service-requests/service-requests.module';
import { HealthController } from './common/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '../../.env'] }),
    TypeOrmModule.forRootAsync({ useFactory: databaseOptions }),
    ProductsModule,
    ProjectsModule,
    UploadsModule,
    VisionModule,
    AiModule,
    ServiceRequestsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
