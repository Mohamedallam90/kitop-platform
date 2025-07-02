export class ExecuteWorkflowDto {
  inputs?: Record<string, any>;
  context?: string;
  priority?: 'low' | 'medium' | 'high';
}