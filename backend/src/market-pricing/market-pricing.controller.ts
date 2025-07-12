import { Controller, Get, Query, UseGuards, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MarketPricingService } from './market-pricing.service';
import { Throttle } from '@nestjs/throttler';

@ApiTags('market-pricing')
@Controller('market-pricing')
export class MarketPricingController {
  constructor(private readonly marketPricingService: MarketPricingService) {}

  @Get('rates')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get market rates for a specific industry and project type' })
  @ApiQuery({ name: 'industry', required: true, description: 'Industry category' })
  @ApiQuery({ name: 'projectType', required: true, description: 'Type of project' })
  @ApiQuery({ name: 'experienceLevel', required: false, enum: ['junior', 'mid', 'senior', 'expert'], description: 'Experience level' })
  @ApiResponse({ status: 200, description: 'Market rates retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Invalid parameters' })
  @Throttle({ default: { limit: 20, ttl: 60000 } }) // 20 requests per minute
  async getMarketRates(
    @Query('industry') industry: string,
    @Query('projectType') projectType: string,
    @Query('experienceLevel') experienceLevel: 'junior' | 'mid' | 'senior' | 'expert' = 'mid',
  ) {
    if (!industry || !projectType) {
      throw new HttpException('Industry and projectType are required', HttpStatus.BAD_REQUEST);
    }
    
    try {
      return await this.marketPricingService.getMarketRates(industry, projectType, experienceLevel);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get('suggestions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get pricing suggestions based on market rates' })
  @ApiQuery({ name: 'industry', required: true, description: 'Industry category' })
  @ApiQuery({ name: 'projectType', required: true, description: 'Type of project' })
  @ApiQuery({ name: 'experienceLevel', required: false, enum: ['junior', 'mid', 'senior', 'expert'], description: 'Experience level' })
  @ApiQuery({ name: 'projectSize', required: false, enum: ['small', 'medium', 'large'], description: 'Project size' })
  @ApiResponse({ status: 200, description: 'Pricing suggestions retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Invalid parameters' })
  @Throttle({ default: { limit: 20, ttl: 60000 } }) // 20 requests per minute
  async getPricingSuggestions(
    @Query('industry') industry: string,
    @Query('projectType') projectType: string,
    @Query('experienceLevel') experienceLevel: 'junior' | 'mid' | 'senior' | 'expert' = 'mid',
    @Query('projectSize') projectSize: 'small' | 'medium' | 'large' = 'medium',
  ) {
    if (!industry || !projectType) {
      throw new HttpException('Industry and projectType are required', HttpStatus.BAD_REQUEST);
    }
    
    try {
      return await this.marketPricingService.getPricingSuggestions(
        industry, 
        projectType, 
        experienceLevel, 
        projectSize
      );
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get('trends')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get market trends for an industry' })
  @ApiQuery({ name: 'industry', required: true, description: 'Industry category' })
  @ApiResponse({ status: 200, description: 'Market trends retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Invalid parameters' })
  @Throttle({ default: { limit: 20, ttl: 60000 } }) // 20 requests per minute
  async getMarketTrends(@Query('industry') industry: string) {
    if (!industry) {
      throw new HttpException('Industry is required', HttpStatus.BAD_REQUEST);
    }
    
    try {
      return await this.marketPricingService.getMarketTrends(industry);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get('industries')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get supported industries' })
  @ApiResponse({ status: 200, description: 'Supported industries retrieved successfully' })
  async getSupportedIndustries() {
    return await this.marketPricingService.getSupportedIndustries();
  }

  @Get('project-types')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get supported project types for an industry' })
  @ApiQuery({ name: 'industry', required: true, description: 'Industry category' })
  @ApiResponse({ status: 200, description: 'Supported project types retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Invalid parameters' })
  async getSupportedProjectTypes(@Query('industry') industry: string) {
    if (!industry) {
      throw new HttpException('Industry is required', HttpStatus.BAD_REQUEST);
    }
    
    return await this.marketPricingService.getSupportedProjectTypes(industry);
  }
}