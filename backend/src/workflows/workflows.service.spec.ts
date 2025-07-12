import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, FindOneOptions } from 'typeorm';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { WorkflowsService } from './workflows.service';
import { Workflow, WorkflowStatus } from './entities/workflow.entity';

describe('WorkflowsService', () => {
  let service: WorkflowsService;
  let _repository: Repository<Workflow>;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn().mockImplementation((options: FindOneOptions<Workflow>) => Promise.resolve(mockWorkflow)),
    remove: jest.fn(),
  };

  const mockWorkflow = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Test Workflow',
    description: 'Test workflow description',
    status: WorkflowStatus.DRAFT,
    userId: 'user-123',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkflowsService,
        {
          provide: getRepositoryToken(Workflow),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<WorkflowsService>(WorkflowsService);
    _repository = module.get<Repository<Workflow>>(getRepositoryToken(Workflow));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createWorkflowDto = {
      name: 'New Workflow',
      description: 'New workflow description',
    };

    it('should create a workflow successfully', async () => {
      mockRepository.create.mockReturnValue({...mockWorkflow});
      mockRepository.save.mockResolvedValue(mockWorkflow);

      const result = await service.create(createWorkflowDto, 'user-123');

      expect(mockRepository.create).toHaveBeenCalledWith({
        ...createWorkflowDto,
        userId: 'user-123',
      });
      expect(mockRepository.save).toHaveBeenCalledWith(mockWorkflow);
      expect(result).toEqual(mockWorkflow);
    });
  });

  describe('findAll', () => {
    it('should return all workflows for a user', async () => {
      const mockWorkflows = [mockWorkflow];
      mockRepository.find.mockResolvedValue(mockWorkflows);

      const result = await service.findAll('user-123');

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual(mockWorkflows);
    });
  });

  describe('findOne', () => {
    it('should return a workflow when found', async () => {
      mockRepository.findOne.mockResolvedValue(mockWorkflow);

      const result = await service.findOne('123e4567-e89b-12d3-a456-426614174000', 'user-123');

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'workflow-123', userId: 'user-123' },
      });
      expect(result).toEqual(mockWorkflow);
    });

    it('should throw NotFoundException when workflow not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent', 'user-123')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const updateWorkflowDto = {
      name: 'Updated Workflow',
      description: 'Updated description',
    };

    it('should update a workflow successfully', async () => {
      const updatedWorkflow = { ...mockWorkflow, ...updateWorkflowDto };
      mockRepository.findOne.mockResolvedValue(mockWorkflow);
      mockRepository.save.mockResolvedValue(updatedWorkflow);

      const result = await service.update('workflow-123', updateWorkflowDto, 'user-123');

      expect(mockRepository.save).toHaveBeenCalledWith({
        ...mockWorkflow,
        ...updateWorkflowDto,
      });
      expect(result).toEqual(updatedWorkflow);
    });

    it('should throw NotFoundException when workflow not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.update('non-existent', updateWorkflowDto, 'user-123')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should remove a workflow successfully', async () => {
      mockRepository.findOne.mockResolvedValue(mockWorkflow);
      mockRepository.remove.mockResolvedValue(mockWorkflow);

      await service.remove('workflow-123', 'user-123');

      expect(mockRepository.remove).toHaveBeenCalledWith(mockWorkflow);
    });

    it('should throw NotFoundException when workflow not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.remove('non-existent', 'user-123')).rejects.toThrow(NotFoundException);
    });
  });

  describe('execute', () => {
    it('should execute an active workflow successfully', async () => {
      const activeWorkflow = { ...mockWorkflow, status: WorkflowStatus.ACTIVE };
      mockRepository.findOne.mockResolvedValue(activeWorkflow);
      mockRepository.save.mockResolvedValue({
        ...activeWorkflow,
        executionCount: 1,
        lastExecutedAt: expect.any(Date),
      });

      const result = await service.execute('workflow-123', {}, 'user-123');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Workflow executed successfully');
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should throw ForbiddenException for non-active workflows', async () => {
      mockRepository.findOne.mockResolvedValue(mockWorkflow); // DRAFT status

      await expect(service.execute('workflow-123', {}, 'user-123')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should handle execution errors', async () => {
      const activeWorkflow = { ...mockWorkflow, status: WorkflowStatus.ACTIVE };
      mockRepository.findOne.mockResolvedValue(activeWorkflow);
      mockRepository.save.mockRejectedValue(new Error('Database error'));

      const result = await service.execute('workflow-123', {}, 'user-123');

      expect(result.success).toBe(false);
      expect(result.message).toContain('Workflow execution failed');
    });
  });

  describe('pause', () => {
    it('should pause a workflow successfully', async () => {
      const pausedWorkflow = { ...mockWorkflow, status: WorkflowStatus.PAUSED };
      mockRepository.findOne.mockResolvedValue(mockWorkflow);
      mockRepository.save.mockResolvedValue(pausedWorkflow);

      const result = await service.pause('workflow-123', 'user-123');

      expect(result.status).toBe(WorkflowStatus.PAUSED);
      expect(mockRepository.save).toHaveBeenCalled();
    });
  });

  describe('resume', () => {
    it('should resume a workflow successfully', async () => {
      const activeWorkflow = { ...mockWorkflow, status: WorkflowStatus.ACTIVE };
      mockRepository.findOne.mockResolvedValue(mockWorkflow);
      mockRepository.save.mockResolvedValue(activeWorkflow);

      const result = await service.resume('workflow-123', 'user-123');

      expect(result.status).toBe(WorkflowStatus.ACTIVE);
      expect(mockRepository.save).toHaveBeenCalled();
    });
  });

  describe('getExecutionHistory', () => {
    it('should return execution history', async () => {
      mockRepository.findOne.mockResolvedValue(mockWorkflow);

      const result = await service.getExecutionHistory('workflow-123', 'user-123');

      expect(Array.isArray(result)).toBe(true);
      expect(result[0]).toHaveProperty('executionCount');
      expect(result[0]).toHaveProperty('status');
    });
  });
});
