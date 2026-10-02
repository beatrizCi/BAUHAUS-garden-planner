import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServiceRequestEntity } from './service-request.entity';
import { ServiceRequestsController } from './service-requests.controller';

@Module({ imports: [TypeOrmModule.forFeature([ServiceRequestEntity])], controllers: [ServiceRequestsController] })
export class ServiceRequestsModule {}
