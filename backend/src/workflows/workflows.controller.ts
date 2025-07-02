import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WorkflowsService } from './workflows.service';
import { CreateWorkflowDto } from './dto/create-workflow.dto';
import { UpdateWorkflowDto } from './dto/update-workflow.dto';
import { ExecuteWorkflowDto } from './dto/execute-workflow.dto';
import { Workflow } from './entities/workflow.entity';

@ApiTags('workflows')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('workflows')
export class WorkflowsController {
  constructor(private readonly workflowsService: WorkflowsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new workflow' })
  @ApiResponse({
    status: 201,
    description: 'Workflow created successfully',
    type: Workflow,
  })
  async create(@Body() createWorkflowDto: CreateWorkflowDto, @Request() req): Promise<Workflow> {
    return this.workflowsService.create(createWorkflowDto, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all workflows for the authenticated user' })
  @ApiResponse({
    status: 200,
    description: 'Workflows retrieved successfully',
    type: [Workflow],
  })
  async findAll(
    @Request() req,
    @Query('status') status?: string,
    @Query('category') category?: string
  ): Promise<Workflow[]> {
    return this.workflowsService.findAll(req.user.id, { status, category });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific workflow by ID' })
  @ApiParam({ name: 'id', description: 'Workflow ID' })
  @ApiResponse({
    status: 200,
    description: 'Workflow retrieved successfully',
    type: Workflow,
  })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  async findOne(@Param('id') id: string, @Request() req): Promise<Workflow> {
    return this.workflowsService.findOne(id, req.user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a workflow' })
  @ApiParam({ name: 'id', description: 'Workflow ID' })
  @ApiResponse({
    status: 200,
    description: 'Workflow updated successfully',
    type: Workflow,
  })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  async update(
    @Param('id') id: string,
    @Body() updateWorkflowDto: UpdateWorkflowDto,
    @Request() req,
  ): Promise<Workflow> {
    return this.workflowsService.update(id, updateWorkflowDto, req.user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a workflow' })
  @ApiParam({ name: 'id', description: 'Workflow ID' })
  @ApiResponse({ status: 204, description: 'Workflow deleted successfully' })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @Request() req): Promise<void> {
    return this.workflowsService.remove(id, req.user.id);
  }

  @Post(':id/execute')
  @ApiOperation({ summary: 'Execute a workflow' })
  @ApiParam({ name: 'id', description: 'Workflow ID' })
  @ApiResponse({
    status: 200,
    description: 'Workflow execution result',
    schema: {
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  @ApiResponse({ status: 403, description: 'Workflow cannot be executed' })
  async execute(
    @Param('id') id: string,
    @Body() executeWorkflowDto: ExecuteWorkflowDto,
    @Request() req
  ): Promise<{ success: boolean; message: string }> {
    return this.workflowsService.execute(id, executeWorkflowDto, req.user.id);
  }

  @Get(':id/executions')
  @ApiOperation({ summary: 'Get workflow execution history' })
  @ApiParam({ name: 'id', description: 'Workflow ID' })
  @ApiResponse({
    status: 200,
    description: 'Execution history retrieved successfully',
    schema: {
      type: 'array',
      items: {
        properties: {
          executionCount: { type: 'number' },
          lastExecutedAt: { type: 'string', format: 'date-time' },
          status: { type: 'string' },
        },
      },
    },
  })
  async getExecutions(@Param('id') id: string, @Request() req): Promise<any[]> {
    return this.workflowsService.getExecutions(id, req.user.id);
  }

  @Post(':id/pause')
  @ApiOperation({ summary: 'Pause a workflow' })
  @ApiParam({ name: 'id', description: 'Workflow ID' })
  @ApiResponse({
    status: 200,
    description: 'Workflow paused successfully',
    type: Workflow,
  })
  async pause(@Param('id') id: string, @Request() req): Promise<Workflow> {
    return this.workflowsService.pause(id, req.user.id);
  }

  @Post(':id/resume')
  @ApiOperation({ summary: 'Resume a paused workflow' })
  @ApiParam({ name: 'id', description: 'Workflow ID' })
  @ApiResponse({
    status: 200,
    description: 'Workflow resumed successfully',
    type: Workflow,
  })
  async resume(@Param('id') id: string, @Request() req): Promise<Workflow> {
    return this.workflowsService.resume(id, req.user.id);
  }

  @Get(':id/history')
  @ApiOperation({ summary: 'Get workflow execution history (legacy endpoint)' })
  @ApiParam({ name: 'id', description: 'Workflow ID' })
  @ApiResponse({
    status: 200,
    description: 'Execution history retrieved successfully',
    schema: {
      type: 'array',
      items: {
        properties: {
          executionCount: { type: 'number' },
          lastExecutedAt: { type: 'string', format: 'date-time' },
          status: { type: 'string' },
        },
      },
    },
  })
  async getHistory(@Param('id') id: string, @Request() req): Promise<any[]> {
    return this.workflowsService.getExecutionHistory(id, req.user.id);
  }
}