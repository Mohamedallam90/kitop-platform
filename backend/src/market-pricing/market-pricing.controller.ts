import { Controller, Get, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MarketPricingService, MarketRateRequest, MarketRateResponse } from './market-pricing.service';

@ApiTags('market-pricing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('market-pricing')
export class MarketPricingController {
  constructor(private readonly marketPricingService: MarketPricingService) {}

  @Get('rates')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get real-time market rates',
    description: 'Fetch current market rates for specific industry and project type from multiple data sources',
  })
  @ApiQuery({
    name: 'industry',
    description: 'Industry category (e.g., web-development, design, marketing)',
    required: true,
    example: 'web-development',
  })
  @ApiQuery({
    name: 'projectType',
    description: 'Type of project (e.g., website, app, branding)',
    required: true,
    example: 'website',
  })
  @ApiQuery({
    name: 'location',
    description: 'Geographic location or market (optional)',
    required: false,
    example: 'us',
  })
  @ApiQuery({
    name: 'experienceLevel',
    description: 'Experience level of the freelancer',
    required: false,
    enum: ['entry', 'mid', 'senior', 'expert'],
    example: 'mid',
  })
  @ApiQuery({
    name: 'projectSize',
    description: 'Size/complexity of the project',
    required: false,
    enum: ['small', 'medium', 'large', 'enterprise'],
    example: 'medium',
  })
  @ApiResponse({
    status: 200,
    description: 'Market rates retrieved successfully',
    schema: {
      properties: {
        industry: { type: 'string', example: 'web-development' },
        projectType: { type: 'string', example: 'website' },
        location: { type: 'string', example: 'global' },
        currency: { type: 'string', example: 'USD' },
        rates: {
          type: 'object',
          properties: {
            hourly: {
              type: 'object',
              properties: {
                min: { type: 'number', example: 50 },
                max: { type: 'number', example: 150 },
                average: { type: 'number', example: 85 },
                median: { type: 'number', example: 80 },
              },
            },
            project: {
              type: 'object',
              properties: {
                min: { type: 'number', example: 2000 },
                max: { type: 'number', example: 8000 },
                average: { type: 'number', example: 4500 },
                median: { type: 'number', example: 4200 },
              },
            },
          },
        },
        dataPoints: { type: 'number', example: 75 },
        confidence: { type: 'string', enum: ['low', 'medium', 'high'], example: 'high' },
        lastUpdated: { type: 'string', format: 'date-time' },
        trends: {
          type: 'object',
          properties: {
            direction: { type: 'string', enum: ['up', 'down', 'stable'], example: 'up' },
            percentage: { type: 'number', example: 5.2 },
          },
        },
        recommendations: {
          type: 'object',
          properties: {
            suggestedHourlyRate: { type: 'number', example: 85 },
            suggestedProjectRate: { type: 'number', example: 4200 },
            reasoning: {
              type: 'array',
              items: { type: 'string' },
              example: [
                'Based on 75 data points from multiple sources',
                'Adjusted for mid experience level (+0%)',
                'Market trending upward (+5.2%), consider pricing at upper range',
              ],
            },
          },
        },
        benchmarks: {
          type: 'object',
          properties: {
            percentile25: { type: 'number', example: 65 },
            percentile50: { type: 'number', example: 80 },
            percentile75: { type: 'number', example: 105 },
            percentile90: { type: 'number', example: 135 },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid query parameters' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getRates(
    @Query('industry') industry: string,
    @Query('projectType') projectType: string,
    @Query('location') location?: string,
    @Query('experienceLevel') experienceLevel?: 'entry' | 'mid' | 'senior' | 'expert',
    @Query('projectSize') projectSize?: 'small' | 'medium' | 'large' | 'enterprise',
  ): Promise<MarketRateResponse> {
    const request: MarketRateRequest = {
      industry,
      projectType,
      location,
      experienceLevel,
      projectSize,
    };

    return this.marketPricingService.fetchRealTimeRates(request);
  }

  @Get('industries')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get supported industries',
    description: 'Retrieve list of supported industries for market pricing',
  })
  @ApiResponse({
    status: 200,
    description: 'Supported industries retrieved successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'web-development' },
          name: { type: 'string', example: 'Web Development' },
          description: { type: 'string', example: 'Frontend and backend web development services' },
          avgHourlyRate: { type: 'number', example: 75 },
          projectTypes: {
            type: 'array',
            items: { type: 'string' },
            example: ['website', 'web-app', 'e-commerce', 'api'],
          },
        },
      },
    },
  })
  async getSupportedIndustries() {
    return [
      {
        id: 'web-development',
        name: 'Web Development',
        description: 'Frontend and backend web development services',
        avgHourlyRate: 75,
        projectTypes: ['website', 'web-app', 'e-commerce', 'api', 'cms'],
      },
      {
        id: 'mobile-development',
        name: 'Mobile Development',
        description: 'iOS and Android mobile application development',
        avgHourlyRate: 85,
        projectTypes: ['ios-app', 'android-app', 'cross-platform', 'app-store'],
      },
      {
        id: 'design',
        name: 'Design Services',
        description: 'UI/UX design, graphic design, and branding services',
        avgHourlyRate: 60,
        projectTypes: ['ui-design', 'ux-design', 'branding', 'logo', 'graphics'],
      },
      {
        id: 'marketing',
        name: 'Digital Marketing',
        description: 'SEO, social media, content marketing, and advertising',
        avgHourlyRate: 50,
        projectTypes: ['seo', 'social-media', 'content', 'advertising', 'analytics'],
      },
      {
        id: 'writing',
        name: 'Content Writing',
        description: 'Copywriting, technical writing, and content creation',
        avgHourlyRate: 40,
        projectTypes: ['copywriting', 'technical', 'blog', 'documentation', 'translation'],
      },
      {
        id: 'consulting',
        name: 'Business Consulting',
        description: 'Strategy, operations, and management consulting',
        avgHourlyRate: 100,
        projectTypes: ['strategy', 'operations', 'management', 'analysis', 'planning'],
      },
      {
        id: 'data-science',
        name: 'Data Science',
        description: 'Data analysis, machine learning, and analytics',
        avgHourlyRate: 90,
        projectTypes: ['analysis', 'machine-learning', 'visualization', 'modeling', 'ai'],
      },
      {
        id: 'ai-ml',
        name: 'AI & Machine Learning',
        description: 'Artificial intelligence and machine learning solutions',
        avgHourlyRate: 95,
        projectTypes: ['ai-development', 'ml-models', 'nlp', 'computer-vision', 'automation'],
      },
    ];
  }

  @Get('trends')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get market trends',
    description: 'Retrieve current market trends and forecasts across industries',
  })
  @ApiQuery({
    name: 'industry',
    description: 'Filter trends by specific industry (optional)',
    required: false,
  })
  @ApiQuery({
    name: 'timeframe',
    description: 'Timeframe for trend analysis',
    required: false,
    enum: ['30d', '90d', '180d', '1y'],
    example: '90d',
  })
  @ApiResponse({
    status: 200,
    description: 'Market trends retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        summary: {
          type: 'object',
          properties: {
            overallTrend: { type: 'string', enum: ['up', 'down', 'stable'] },
            averageGrowth: { type: 'number', example: 3.2 },
            hotIndustries: {
              type: 'array',
              items: { type: 'string' },
              example: ['ai-ml', 'web-development'],
            },
            emergingSkills: {
              type: 'array',
              items: { type: 'string' },
              example: ['react', 'python', 'blockchain'],
            },
          },
        },
        byIndustry: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              industry: { type: 'string' },
              trend: { type: 'string', enum: ['up', 'down', 'stable'] },
              growth: { type: 'number' },
              demand: { type: 'string', enum: ['high', 'medium', 'low'] },
              forecast: { type: 'string' },
            },
          },
        },
      },
    },
  })
  async getMarketTrends(
    @Query('industry') industry?: string,
    @Query('timeframe') timeframe: '30d' | '90d' | '180d' | '1y' = '90d',
  ) {
    // Simulated trend data - in production, this would come from analytics
    const trendData = {
      summary: {
        overallTrend: 'up' as const,
        averageGrowth: 3.2,
        hotIndustries: ['ai-ml', 'web-development', 'data-science'],
        emergingSkills: ['react', 'python', 'ai', 'blockchain', 'nextjs'],
      },
      byIndustry: [
        {
          industry: 'web-development',
          trend: 'up' as const,
          growth: 5.1,
          demand: 'high' as const,
          forecast: 'Strong growth expected due to digital transformation',
        },
        {
          industry: 'ai-ml',
          trend: 'up' as const,
          growth: 12.3,
          demand: 'high' as const,
          forecast: 'Explosive growth in AI adoption across industries',
        },
        {
          industry: 'design',
          trend: 'stable' as const,
          growth: 1.8,
          demand: 'medium' as const,
          forecast: 'Steady demand with focus on UX specialization',
        },
        {
          industry: 'marketing',
          trend: 'up' as const,
          growth: 2.9,
          demand: 'medium' as const,
          forecast: 'Growth in digital marketing and automation',
        },
      ].filter((item) => !industry || item.industry === industry),
      timeframe,
      lastUpdated: new Date(),
    };

    return trendData;
  }

  @Get('suggestions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get pricing suggestions',
    description: 'Get AI-powered pricing suggestions based on project details',
  })
  @ApiQuery({
    name: 'industry',
    description: 'Industry category',
    required: true,
  })
  @ApiQuery({
    name: 'projectType',
    description: 'Type of project',
    required: true,
  })
  @ApiQuery({
    name: 'complexity',
    description: 'Project complexity level',
    required: false,
    enum: ['low', 'medium', 'high'],
    example: 'medium',
  })
  @ApiQuery({
    name: 'timeline',
    description: 'Project timeline in weeks',
    required: false,
    type: 'number',
    example: 8,
  })
  @ApiQuery({
    name: 'clientBudget',
    description: 'Client stated budget (if known)',
    required: false,
    type: 'number',
    example: 5000,
  })
  @ApiResponse({
    status: 200,
    description: 'Pricing suggestions retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        suggestions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string', enum: ['conservative', 'competitive', 'premium'] },
              hourlyRate: { type: 'number' },
              projectRate: { type: 'number' },
              confidence: { type: 'number', minimum: 0, maximum: 100 },
              reasoning: { type: 'string' },
              riskLevel: { type: 'string', enum: ['low', 'medium', 'high'] },
            },
          },
        },
        marketPosition: {
          type: 'object',
          properties: {
            percentile: { type: 'number' },
            competitiveness: { type: 'string' },
            winProbability: { type: 'number' },
          },
        },
        recommendations: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    },
  })
  async getPricingSuggestions(
    @Query('industry') industry: string,
    @Query('projectType') projectType: string,
    @Query('complexity') complexity: 'low' | 'medium' | 'high' = 'medium',
    @Query('timeline') timeline?: number,
    @Query('clientBudget') clientBudget?: number,
  ) {
    // Get base market rates
    const marketData = await this.marketPricingService.fetchRealTimeRates({
      industry,
      projectType,
    });

    const baseHourly = marketData.rates.hourly.median;
    const baseProject = marketData.rates.project.median;

    // Apply complexity adjustments
    const complexityMultiplier = { low: 0.8, medium: 1.0, high: 1.3 }[complexity];

    const suggestions = [
      {
        type: 'conservative',
        hourlyRate: Math.round(baseHourly * 0.9 * complexityMultiplier),
        projectRate: Math.round(baseProject * 0.9 * complexityMultiplier),
        confidence: 85,
        reasoning: 'Safe pricing with high win probability',
        riskLevel: 'low',
      },
      {
        type: 'competitive',
        hourlyRate: Math.round(baseHourly * complexityMultiplier),
        projectRate: Math.round(baseProject * complexityMultiplier),
        confidence: 75,
        reasoning: 'Market-rate pricing for balanced approach',
        riskLevel: 'medium',
      },
      {
        type: 'premium',
        hourlyRate: Math.round(baseHourly * 1.2 * complexityMultiplier),
        projectRate: Math.round(baseProject * 1.2 * complexityMultiplier),
        confidence: 60,
        reasoning: 'Premium pricing for high-value positioning',
        riskLevel: 'high',
      },
    ];

    const recommendations = [
      `Based on ${marketData.dataPoints} market data points`,
      `${complexity} complexity project identified`,
      timeline ? `${timeline}-week timeline considered` : 'No timeline specified',
    ];

    if (clientBudget) {
      const budgetVsMarket = clientBudget / baseProject;
      if (budgetVsMarket < 0.8) {
        recommendations.push('Client budget is below market rate - consider scope reduction');
      } else if (budgetVsMarket > 1.2) {
        recommendations.push('Client budget allows for premium pricing');
      }
    }

    return {
      suggestions,
      marketPosition: {
        percentile: 50,
        competitiveness: 'market-rate',
        winProbability: 75,
      },
      recommendations,
    };
  }
}