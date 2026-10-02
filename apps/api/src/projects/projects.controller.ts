import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Put } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { SaveProjectDto } from './project.dto';

@Controller('projects')
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @Get() list() { return this.projects.list(); }
  @Get(':id') get(@Param('id', ParseUUIDPipe) id: string) { return this.projects.get(id); }
  @Post() create(@Body() dto: SaveProjectDto) { return this.projects.create(dto); }
  @Put(':id') update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: SaveProjectDto) { return this.projects.update(id, dto); }
  @Delete(':id') remove(@Param('id', ParseUUIDPipe) id: string) { return this.projects.remove(id); }
}
