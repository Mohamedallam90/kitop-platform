import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { Workflow, WorkflowStatus } from './entities/workflow.entity';
import { CreateWorkflowDto } from './dto/create-workflow.dto';
import { UpdateWorkflowDto } from './dto/update-workflow.dto';

@Injectable()
export class WorkflowsService {
  constructor(
    @InjectRepository(Workflow)
    private readonly workflowRepository: Repository<Workflow>,
  ) {}

  async create(createWorkflowDto: CreateWorkflowDto, userId: string): Promise<Workflow> {
    const workflow = this.workflowRepository.create({
      ...createWorkflowDto,
      userId,
    });

    return await this.workflowRepository.save(workflow);
  }

  async findAll(
    userId: string,
    filters?: { status?: string; category?: string },
  ): Promise<Workflow[]> {
    const where: FindOptionsWhere<Workflow> = { userId };

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.category) {
      where.category = filters.category;
    }

    return await this.workflowRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, userId: string): Promise<Workflow> {
    const workflow = await this.workflowRepository.findOne({
      where: { id, userId },
    });

    if (!workflow) {
      throw new NotFoundException('Workflow not found');
    }

    return workflow;
  }

  async update(
    id: string,
    updateWorkflowDto: UpdateWorkflowDto,
    userId: string,
  ): Promise<Workflow> {
    const workflow = await this.findOne(id, userId);

    Object.assign(workflow, updateWorkflowDto);
    return await this.workflowRepository.save(workflow);
  }

  async remove(id: string, userId: string): Promise<void> {
    const workflow = await this.findOne(id, userId);
    await this.workflowRepository.remove(workflow);
  }

  async execute(
    id: string,
    executeWorkflowDto: any,
    userId: string,
  ): Promise<{ success: boolean; message: string; executionId?: string }> {
    const workflow = await this.findOne(id, userId);

    if (workflow.status !== WorkflowStatus.ACTIVE) {
      throw new ForbiddenException('Only active workflows can be executed');
    }

    try {
      // Update execution metadata
      workflow.executionCount += 1;
      workflow.lastExecutedAt = new Date();
      
      // Generate execution ID for tracking
      const executionId = `exec-${Date.now()}-${workflow.id.substring(0, 8)}`;
      
      await this.workflowRepository.save(workflow);

      // TODO: Implement actual workflow execution logic
      // This would involve processing workflow.steps and executing each step
      // For now, we'll simulate a successful execution
      // This would involve processing workflow.steps and executing each step

      return {
        success: true,
        message: 'Workflow executed successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: `Workflow execution failed: ${error.message}`,
      };
    }
  }

  async pause(id: string, userId: string): Promise<Workflow> {
    const workflow = await this.findOne(id, userId);
    workflow.status = WorkflowStatus.PAUSED;
    return await this.workflowRepository.save(workflow);
  }

  async resume(id: string, userId: string): Promise<Workflow> {
    const workflow = await this.findOne(id, userId);
    workflow.status = WorkflowStatus.ACTIVE;
    return await this.workflowRepository.save(workflow);
  }

  async getExecutionHistory(id: string, userId: string): Promise<any[]> {
    const workflow = await this.findOne(id, userId);

    // TODO: Implement execution history retrieval from separate execution log table
    // For now, return basic execution info
    return [
      {
        executionCount: workflow.executionCount,
        lastExecutedAt: workflow.lastExecutedAt,
        status: workflow.status,
      },
    ];
  }

  async getExecutions(id: string, userId: string): Promise<any[]> {
    // Alias for getExecutionHistory to match controller expectations
    return this.getExecutionHistory(id, userId);
  }
}
