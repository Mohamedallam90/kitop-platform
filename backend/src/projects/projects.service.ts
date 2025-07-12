import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { Project } from './entities/project.entity';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
  ) {}

  async create(createProjectDto: any, userId: string): Promise<Project> {
    const project = this.projectRepository.create({
      ...createProjectDto,
      userId,
    });
    // TypeORM save() method type issue workaround
    const result = await this.projectRepository.save(project);
    return Array.isArray(result) ? result[0] : result;
  }

  async findAll(userId: string, filters?: { status?: string }): Promise<Project[]> {
    const where: FindOptionsWhere<Project> = { userId };
    
    if (filters?.status) {
      where.status = filters.status as any;
    }
    
    return await this.projectRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, userId: string): Promise<Project> {
    const project = await this.projectRepository.findOne({
      where: { id, userId },
      relations: ['user'],
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return project;
  }

  async update(id: string, updateProjectDto: any, userId: string): Promise<Project> {
    const project = await this.findOne(id, userId);
    Object.assign(project, updateProjectDto);
    return await this.projectRepository.save(project);
  }

  async remove(id: string, userId: string): Promise<void> {
    const project = await this.findOne(id, userId);
    await this.projectRepository.remove(project);
  }
  
  async findByStatus(userId: string, status: string): Promise<Project[]> {
    return await this.projectRepository.find({
      where: { userId, status: status as any },
      order: { updatedAt: 'DESC' },
    });
  }
  
  async getProjectStatistics(userId: string): Promise<{
    total: number;
    active: number;
    completed: number;
    onHold: number;
    cancelled: number;
  }> {
    const projects = await this.findAll(userId);
    
    return {
      total: projects.length,
      active: projects.filter(p => p.status === 'active').length,
      completed: projects.filter(p => p.status === 'completed').length,
      onHold: projects.filter(p => p.status === 'on_hold').length,
      cancelled: projects.filter(p => p.status === 'cancelled').length,
    };
  }
}
