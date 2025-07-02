import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Param, 
  Delete, 
  UseGuards, 
  Query, 
  Request 
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { WorkflowsService } from './workflows.service';
import { CreateWorkflowDto } from './dto/create-workflow.dto';
import { UpdateWorkflowDto } from './dto/update-workflow.dto';
import { ExecuteWorkflowDto } from './dto/execute-workflow.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Workflows')
@Controller('workflows')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WorkflowsController {
  constructor(private readonly workflowsService: WorkflowsService) {}

  @Post()
  @ApiOperation({ summary: 'Create workflow' })
  @ApiResponse({ status: 201, description: 'Workflow created successfully' })
  create(@Body() createWorkflowDto: CreateWorkflowDto, @Request() req) {
    return this.workflowsService.create(createWorkflowDto, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all user workflows' })
  @ApiResponse({ status: 200, description: 'Workflows retrieved successfully' })
  findAll(@Request() req, @Query('status') status?: string, @Query('category') category?: string) {
    return this.workflowsService.findAll(req.user.id, { status, category });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get workflow by ID' })
  @ApiResponse({ status: 200, description: 'Workflow retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  findOne(@Param('id') id: string, @Request() req) {
    return this.workflowsService.findOne(id, req.user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update workflow' })
  @ApiResponse({ status: 200, description: 'Workflow updated successfully' })
  update(@Param('id') id: string, @Body() updateWorkflowDto: UpdateWorkflowDto, @Request() req) {
    return this.workflowsService.update(id, updateWorkflowDto, req.user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete workflow' })
  @ApiResponse({ status: 200, description: 'Workflow deleted successfully' })
  remove(@Param('id') id: string, @Request() req) {
    return this.workflowsService.remove(id, req.user.id);
  }

  @Post(':id/execute')
  @ApiOperation({ summary: 'Execute workflow' })
  @ApiResponse({ status: 200, description: 'Workflow executed successfully' })
  execute(@Param('id') id: string, @Body() executeWorkflowDto: ExecuteWorkflowDto, @Request() req) {
    return this.workflowsService.execute(id, executeWorkflowDto, req.user.id);
  }

  @Get(':id/executions')
  @ApiOperation({ summary: 'Get workflow execution history' })
  @ApiResponse({ status: 200, description: 'Execution history retrieved successfully' })
  getExecutions(@Param('id') id: string, @Request() req) {
    return this.workflowsService.getExecutions(id, req.user.id);
  }
}