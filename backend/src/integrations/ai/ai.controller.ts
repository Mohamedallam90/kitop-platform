import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Get,
  Param,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import {
  OpenAIService,
  ContractGenerationOptions,
  ContractDraftResult,
  AnalysisResult,
} from './openai.service';
import { LawGeexService, LawGeexReviewOptions, LawGeexReviewResult } from './lawgeex.service';

class ContractGenerationDto {
  contractType: string;
  parties: string[];
  keyTerms: string[];
  jurisdiction: string;
  customInstructions?: string;
}

class ContractAnalysisDto {
  contractText: string;
}

class ContractReviewDto {
  documentContent: string;
  options?: LawGeexReviewOptions;
}

@ApiTags('ai')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AIController {
  constructor(
    private readonly openAIService: OpenAIService,
    private readonly lawGeexService: LawGeexService,
  ) {}

  @Post('draft-contract')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Generate a contract draft using AI',
    description:
      'Uses OpenAI GPT-4 to generate a comprehensive contract draft based on the provided specifications.',
  })
  @ApiBody({
    type: ContractGenerationDto,
    description: 'Contract generation parameters',
  })
  @ApiResponse({
    status: 200,
    description: 'Contract draft generated successfully',
    schema: {
      properties: {
        content: { type: 'string', description: 'Generated contract content' },
        wordCount: { type: 'number', description: 'Number of words in the contract' },
        generatedAt: { type: 'string', format: 'date-time' },
        model: { type: 'string', description: 'AI model used' },
        tokenUsage: {
          type: 'object',
          properties: {
            promptTokens: { type: 'number' },
            completionTokens: { type: 'number' },
            totalTokens: { type: 'number' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid request parameters' })
  @ApiResponse({ status: 500, description: 'AI service error' })
  async generateContractDraft(
    @Body() options: ContractGenerationOptions,
  ): Promise<ContractDraftResult> {
    return this.openAIService.generateContractDraft(options);
  }

  @Post('analyze-contract')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Analyze contract language using AI',
    description:
      'Uses OpenAI GPT-4 to analyze contract language for clarity, risks, and improvement suggestions.',
  })
  @ApiBody({
    type: ContractAnalysisDto,
    description: 'Contract text to analyze',
  })
  @ApiResponse({
    status: 200,
    description: 'Contract analysis completed successfully',
    schema: {
      properties: {
        clarity_score: { type: 'number', minimum: 1, maximum: 10 },
        suggestions: { type: 'array', items: { type: 'string' } },
        risk_factors: { type: 'array', items: { type: 'string' } },
        analysis_summary: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid contract text' })
  @ApiResponse({ status: 500, description: 'AI service error' })
  async analyzeContract(@Body() body: ContractAnalysisDto): Promise<AnalysisResult> {
    return this.openAIService.analyzeContractLanguage(body.contractText);
  }

  @Post('review-contract')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Review contract with LawGeex AI',
    description:
      'Uses LawGeex AI to perform comprehensive legal review and risk assessment of contract documents.',
  })
  @ApiBody({
    type: ContractReviewDto,
    description: 'Contract document and review options',
  })
  @ApiResponse({
    status: 200,
    description: 'Contract review completed successfully',
    schema: {
      properties: {
        document_id: { type: 'string' },
        status: { type: 'string', enum: ['completed', 'processing', 'failed'] },
        issues: {
          type: 'array',
          items: {
            properties: {
              id: { type: 'string' },
              clause: { type: 'string' },
              category: {
                type: 'string',
                enum: ['high_risk', 'medium_risk', 'low_risk', 'suggestion'],
              },
              description: { type: 'string' },
              suggestion: { type: 'string' },
              severity: { type: 'number', minimum: 1, maximum: 10 },
            },
          },
        },
        overall_score: { type: 'number' },
        summary: {
          type: 'object',
          properties: {
            total_issues: { type: 'number' },
            high_risk_count: { type: 'number' },
            medium_risk_count: { type: 'number' },
            low_risk_count: { type: 'number' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid document content' })
  @ApiResponse({ status: 500, description: 'LawGeex service error' })
  async reviewContract(@Body() body: ContractReviewDto): Promise<LawGeexReviewResult> {
    return this.lawGeexService.reviewContractWithLawGeex(body.documentContent, body.options);
  }

  @Get('review-status/:documentId')
  @ApiOperation({
    summary: 'Check contract review status',
    description: 'Check the status of an ongoing LawGeex contract review.',
  })
  @ApiResponse({
    status: 200,
    description: 'Review status retrieved successfully',
    schema: {
      properties: {
        status: { type: 'string', enum: ['completed', 'processing', 'failed'] },
        progress: { type: 'number', minimum: 0, maximum: 100 },
        estimated_completion: { type: 'string', format: 'date-time', nullable: true },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async getReviewStatus(@Param('documentId') documentId: string) {
    return this.lawGeexService.checkReviewStatus(documentId);
  }

  @Get('document-types')
  @ApiOperation({
    summary: 'Get supported document types',
    description: 'Retrieve the list of document types supported by LawGeex for review.',
  })
  @ApiResponse({
    status: 200,
    description: 'Supported document types retrieved successfully',
    schema: {
      type: 'array',
      items: { type: 'string' },
    },
  })
  async getSupportedDocumentTypes(): Promise<string[]> {
    return this.lawGeexService.getSupportedDocumentTypes();
  }

  @Post('filter-issues')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Filter review issues by severity',
    description: 'Filter LawGeex review issues based on minimum severity level.',
  })
  @ApiBody({
    schema: {
      properties: {
        issues: {
          type: 'array',
          items: {
            properties: {
              id: { type: 'string' },
              severity: { type: 'number', minimum: 1, maximum: 10 },
            },
          },
        },
        minSeverity: { type: 'number', minimum: 1, maximum: 10, default: 5 },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Issues filtered successfully',
  })
  async filterIssues(@Body() body: { issues: any[]; minSeverity?: number }) {
    return this.lawGeexService.filterIssuesBySeverity(body.issues, body.minSeverity);
  }

  @Post('analyze-issues')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Analyze review issues',
    description: 'Get detailed analysis and statistics of LawGeex review issues.',
  })
  @ApiBody({
    schema: {
      properties: {
        issues: {
          type: 'array',
          items: {
            properties: {
              category: { type: 'string' },
              severity: { type: 'number', minimum: 1, maximum: 10 },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Issues analysis completed successfully',
    schema: {
      properties: {
        total: { type: 'number' },
        by_category: { type: 'object' },
        by_severity: { type: 'object' },
        average_severity: { type: 'number' },
        risk_score: { type: 'number', minimum: 0, maximum: 100 },
      },
    },
  })
  async analyzeIssues(@Body() body: { issues: any[] }) {
    const summary = this.lawGeexService.getIssuesSummary(body.issues);
    const riskScore = this.lawGeexService.calculateRiskScore(body.issues);

    return {
      ...summary,
      risk_score: riskScore,
    };
  }
}
