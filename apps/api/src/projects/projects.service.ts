import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectEntity } from './project.entity';
import { SaveProjectDto } from './project.dto';

@Injectable()
export class ProjectsService {
  constructor(@InjectRepository(ProjectEntity) private readonly repo: Repository<ProjectEntity>) {}

  list() {
    return this.repo.find({
      select: ['id', 'name', 'thumbnailUrl', 'photoUrl', 'updatedAt', 'createdAt'],
      order: { updatedAt: 'DESC' },
    });
  }

  async get(id: string) {
    const p = await this.repo.findOneBy({ id });
    if (!p) throw new NotFoundException(`Project ${id} not found`);
    return p;
  }

  create(dto: SaveProjectDto) {
    return this.repo.save(this.repo.create({ ...dto, photoUrl: dto.photoUrl ?? null, originalPhotoUrl: dto.originalPhotoUrl ?? null, thumbnailUrl: dto.thumbnailUrl ?? null }));
  }

  async update(id: string, dto: SaveProjectDto) {
    const p = await this.get(id);
    Object.assign(p, dto);
    return this.repo.save(p);
  }

  async remove(id: string) {
    await this.get(id);
    await this.repo.delete(id);
    return { deleted: true };
  }
}
