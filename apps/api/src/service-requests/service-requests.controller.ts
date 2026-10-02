import { Body, Controller, Post } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { Repository } from 'typeorm';
import { ServiceRequestEntity } from './service-request.entity';

class CreateServiceRequestDto {
  @IsString() @MinLength(2) @MaxLength(120) name: string;
  @IsString() @MinLength(5) @MaxLength(40) phone: string;
  @IsString() @MaxLength(40) preferredTime: string;
  @IsOptional() @IsString() @MaxLength(2000) note?: string;
  @IsOptional() @IsString() projectId?: string;
}

/** Callback requests for the BAUHAUS Garten-Service. Forward these to the real CRM/ticket system. */
@Controller('service-requests')
export class ServiceRequestsController {
  constructor(@InjectRepository(ServiceRequestEntity) private readonly repo: Repository<ServiceRequestEntity>) {}

  @Post()
  async create(@Body() dto: CreateServiceRequestDto) {
    const saved = await this.repo.save(this.repo.create({ ...dto, note: dto.note ?? '', projectId: dto.projectId ?? null }));
    return { id: saved.id, createdAt: saved.createdAt };
  }
}
