import { IsString, IsOptional, IsEnum, IsObject, IsArray, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WorkflowStatus, WorkflowTriggerType } from '../entities/workflow.entity';

export class CreateWorkflowDto {
  @ApiProperty({ description: 'Workflow name', minLength: 1, maxLength: 255 })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiPropertyOptional({ description: 'Workflow description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Workflow status',
    enum: WorkflowStatus,
    default: WorkflowStatus.DRAFT,
  })
  @IsOptional()
  @IsEnum(WorkflowStatus)
  status?: WorkflowStatus;

  @ApiPropertyOptional({
    description: 'Trigger type for the workflow',
    enum: WorkflowTriggerType,
    default: WorkflowTriggerType.MANUAL,
  })
  @IsOptional()
  @IsEnum(WorkflowTriggerType)
  triggerType?: WorkflowTriggerType;

  @ApiPropertyOptional({ description: 'Trigger configuration object' })
  @IsOptional()
  @IsObject()
  triggerConfig?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Workflow steps array' })
  @IsOptional()
  @IsArray()
  steps?: Record<string, any>[];

  @ApiPropertyOptional({ description: 'Workflow variables' })
  @IsOptional()
  @IsObject()
  variables?: Record<string, any>;
}
