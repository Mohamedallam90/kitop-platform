import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MarketRate } from './entities/market-rate.entity';

export interface MarketRateRequest {
  industry: string;
  projectType: string;
  location?: string;
  experienceLevel?: 'entry' | 'mid' | 'senior' | 'expert';
  projectSize?: 'small' | 'medium' | 'large' | 'enterprise';
}

export interface MarketRateResponse {
  industry: string;
  projectType: string;
  location: string;
  currency: string;
  rates: {
    hourly: {
      min: number;
      max: number;
      average: number;
      median: number;
    };
    project: {
      min: number;
      max: number;
      average: number;
      median: number;
    };
  };
  dataPoints: number;
  confidence: 'low' | 'medium' | 'high';
  lastUpdated: Date;
  trends: {
    direction: 'up' | 'down' | 'stable';
    percentage: number;
  };
  recommendations: {
    suggestedHourlyRate: number;
    suggestedProjectRate: number;
    reasoning: string[];
  };
  benchmarks: {
    percentile25: number;
    percentile50: number;
    percentile75: number;
    percentile90: number;
  };
}

@Injectable()
export class MarketPricingService {
  private readonly logger = new Logger(MarketPricingService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    @InjectRepository(MarketRate)
    private readonly marketRateRepository: Repository<MarketRate>,
  ) {}

  /**
   * Fetch real-time market rates for given industry and project type
   */
  async fetchRealTimeRates(request: MarketRateRequest): Promise<MarketRateResponse> {
    try {
      this.logger.log(`Fetching rates for ${request.industry}/${request.projectType}`);

      // Check cache first
      const cachedRate = await this.getCachedRate(request);
      if (cachedRate && this.isCacheValid(cachedRate)) {
        this.logger.log('Returning cached rate data');
        return this.transformEntityToResponse(cachedRate);
      }

      // Fetch from multiple sources
      const [
        freelancerRates,
        upworkRates,
        marketDataRates
      ] = await Promise.allSettled([
        this.fetchFromFreelancerAPI(request),
        this.fetchFromUpworkAPI(request),
        this.fetchFromMarketDataAPI(request)
      ]);

      // Aggregate the data
      const aggregatedData = this.aggregateRateData([
        freelancerRates,
        upworkRates,
        marketDataRates
      ], request);

      // Generate recommendations
      const recommendations = this.generateRecommendations(aggregatedData, request);

      const response: MarketRateResponse = {
        ...aggregatedData,
        recommendations,
        lastUpdated: new Date(),
      };

      // Cache the result
      await this.cacheRateData(request, response);

      return response;
    } catch (error) {
      this.logger.error(`Failed to fetch market rates: ${error.message}`);
      
      // Return fallback data if available
      const fallbackData = await this.getFallbackData(request);
      if (fallbackData) {
        return fallbackData;
      }
      
      throw new BadRequestException('Unable to fetch market pricing data');
    }
  }

  /**
   * Fetch rates from FreelancerMap API (simulated)
   */
  private async fetchFromFreelancerAPI(request: MarketRateRequest): Promise<any> {
    try {
      // Simulate API call to FreelancerMap or similar service
      const apiUrl = this.configService.get('FREELANCER_API_URL') || 'https://api.freelancermap.com/rates';
      const apiKey = this.configService.get('FREELANCER_API_KEY');

      if (!apiKey) {
        // Return simulated data for development
        return this.getSimulatedFreelancerData(request);
      }

      const response = await firstValueFrom(
        this.httpService.get(apiUrl, {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          params: {
            industry: request.industry,
            project_type: request.projectType,
            location: request.location || 'global',
            experience: request.experienceLevel || 'mid',
          },
          timeout: 5000,
        })
      );

      return response.data;
    } catch (error) {
      this.logger.warn(`FreelancerMap API failed: ${error.message}`);
      return this.getSimulatedFreelancerData(request);
    }
  }

  /**
   * Fetch rates from Upwork API (simulated)
   */
  private async fetchFromUpworkAPI(request: MarketRateRequest): Promise<any> {
    try {
      // Simulate API call to Upwork Marketplace API
      const apiUrl = this.configService.get('UPWORK_API_URL') || 'https://api.upwork.com/rates';
      const apiKey = this.configService.get('UPWORK_API_KEY');

      if (!apiKey) {
        return this.getSimulatedUpworkData(request);
      }

      const response = await firstValueFrom(
        this.httpService.get(apiUrl, {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
          },
          params: {
            category: this.mapIndustryToUpworkCategory(request.industry),
            subcategory: request.projectType,
            location: request.location || 'anywhere',
          },
          timeout: 5000,
        })
      );

      return response.data;
    } catch (error) {
      this.logger.warn(`Upwork API failed: ${error.message}`);
      return this.getSimulatedUpworkData(request);
    }
  }

  /**
   * Fetch rates from Market Data API (simulated)
   */
  private async fetchFromMarketDataAPI(request: MarketRateRequest): Promise<any> {
    try {
      const apiUrl = 'https://api.marketdata.dev/rates';
      const apiKey = this.configService.get('MARKET_DATA_API_KEY');

      if (!apiKey) {
        return this.getSimulatedMarketData(request);
      }

      const response = await firstValueFrom(
        this.httpService.get(apiUrl, {
          headers: {
            'X-API-Key': apiKey,
          },
          params: {
            industry: request.industry,
            service_type: request.projectType,
            region: request.location || 'global',
            skill_level: request.experienceLevel || 'intermediate',
          },
          timeout: 5000,
        })
      );

      return response.data;
    } catch (error) {
      this.logger.warn(`Market Data API failed: ${error.message}`);
      return this.getSimulatedMarketData(request);
    }
  }

  /**
   * Aggregate rate data from multiple sources
   */
  private aggregateRateData(sources: any[], request: MarketRateRequest): Omit<MarketRateResponse, 'recommendations' | 'lastUpdated'> {
    const validSources = sources
      .filter(source => source.status === 'fulfilled')
      .map(source => source.value);

    if (validSources.length === 0) {
      // Return default data structure with placeholder values
      return this.getDefaultRateStructure(request);
    }

    // Calculate aggregated rates
    const hourlyRates = validSources.flatMap(source => source.hourlyRates || []);
    const projectRates = validSources.flatMap(source => source.projectRates || []);

    const hourlyStats = this.calculateStatistics(hourlyRates);
    const projectStats = this.calculateStatistics(projectRates);

    return {
      industry: request.industry,
      projectType: request.projectType,
      location: request.location || 'global',
      currency: 'USD',
      rates: {
        hourly: hourlyStats,
        project: projectStats,
      },
      dataPoints: hourlyRates.length + projectRates.length,
      confidence: this.calculateConfidence(validSources.length, hourlyRates.length + projectRates.length),
      trends: {
        direction: this.calculateTrend(validSources),
        percentage: this.calculateTrendPercentage(validSources),
      },
      benchmarks: {
        percentile25: this.calculatePercentile(hourlyRates, 25),
        percentile50: this.calculatePercentile(hourlyRates, 50),
        percentile75: this.calculatePercentile(hourlyRates, 75),
        percentile90: this.calculatePercentile(hourlyRates, 90),
      },
    };
  }

  /**
   * Generate pricing recommendations based on aggregated data
   */
  private generateRecommendations(data: any, request: MarketRateRequest): MarketRateResponse['recommendations'] {
    const experienceMultiplier = this.getExperienceMultiplier(request.experienceLevel);
    const sizeMultiplier = this.getProjectSizeMultiplier(request.projectSize);

    const baseSuggestedHourly = data.rates.hourly.median * experienceMultiplier;
    const baseSuggestedProject = data.rates.project.median * experienceMultiplier * sizeMultiplier;

    const reasoning = [
      `Based on ${data.dataPoints} data points from multiple sources`,
      `Adjusted for ${request.experienceLevel || 'mid'} experience level (+${((experienceMultiplier - 1) * 100).toFixed(0)}%)`,
    ];

    if (request.projectSize) {
      reasoning.push(`Adjusted for ${request.projectSize} project size (+${((sizeMultiplier - 1) * 100).toFixed(0)}%)`);
    }

    if (data.trends.direction === 'up') {
      reasoning.push(`Market trending upward (+${data.trends.percentage}%), consider pricing at upper range`);
    }

    return {
      suggestedHourlyRate: Math.round(baseSuggestedHourly),
      suggestedProjectRate: Math.round(baseSuggestedProject),
      reasoning,
    };
  }

  /**
   * Calculate statistics for a set of rates
   */
  private calculateStatistics(rates: number[]): { min: number; max: number; average: number; median: number } {
    if (rates.length === 0) {
      return { min: 0, max: 0, average: 0, median: 0 };
    }

    const sorted = rates.sort((a, b) => a - b);
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const average = rates.reduce((sum, rate) => sum + rate, 0) / rates.length;
    const median = sorted[Math.floor(sorted.length / 2)];

    return { min, max, average, median };
  }

  /**
   * Calculate confidence level based on data sources and data points
   */
  private calculateConfidence(sourceCount: number, dataPoints: number): 'low' | 'medium' | 'high' {
    if (sourceCount >= 3 && dataPoints >= 50) return 'high';
    if (sourceCount >= 2 && dataPoints >= 20) return 'medium';
    return 'low';
  }

  /**
   * Calculate market trend direction
   */
  private calculateTrend(sources: any[]): 'up' | 'down' | 'stable' {
    // Simplified trend calculation
    const trendIndicators = sources.map(source => source.trend || 0);
    const avgTrend = trendIndicators.reduce((sum, trend) => sum + trend, 0) / trendIndicators.length;
    
    if (avgTrend > 2) return 'up';
    if (avgTrend < -2) return 'down';
    return 'stable';
  }

  /**
   * Calculate trend percentage
   */
  private calculateTrendPercentage(sources: any[]): number {
    const trendValues = sources.map(source => source.trendPercentage || 0);
    return trendValues.reduce((sum, val) => sum + val, 0) / trendValues.length;
  }

  /**
   * Calculate percentile value
   */
  private calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;
    
    const sorted = values.sort((a, b) => a - b);
    const index = (percentile / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    
    if (lower === upper) return sorted[lower];
    
    const weight = index - lower;
    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  }

  /**
   * Get experience level multiplier
   */
  private getExperienceMultiplier(level?: string): number {
    const multipliers = {
      entry: 0.7,
      mid: 1.0,
      senior: 1.4,
      expert: 1.8,
    };
    return multipliers[level] || 1.0;
  }

  /**
   * Get project size multiplier
   */
  private getProjectSizeMultiplier(size?: string): number {
    const multipliers = {
      small: 0.8,
      medium: 1.0,
      large: 1.3,
      enterprise: 1.6,
    };
    return multipliers[size] || 1.0;
  }

  /**
   * Cache rate data
   */
  private async cacheRateData(request: MarketRateRequest, response: MarketRateResponse): Promise<void> {
    try {
      const cacheKey = this.generateCacheKey(request);
      
      const marketRate = this.marketRateRepository.create({
        cacheKey,
        industry: request.industry,
        projectType: request.projectType,
        location: request.location || 'global',
        experienceLevel: request.experienceLevel || 'mid',
        projectSize: request.projectSize || 'medium',
        rateData: response,
        createdAt: new Date(),
      });

      await this.marketRateRepository.save(marketRate);
    } catch (error) {
      this.logger.warn(`Failed to cache rate data: ${error.message}`);
    }
  }

  /**
   * Get cached rate data
   */
  private async getCachedRate(request: MarketRateRequest): Promise<MarketRate | null> {
    try {
      const cacheKey = this.generateCacheKey(request);
      return await this.marketRateRepository.findOne({
        where: { cacheKey },
        order: { createdAt: 'DESC' },
      });
    } catch (error) {
      this.logger.warn(`Failed to get cached rate: ${error.message}`);
      return null;
    }
  }

  /**
   * Check if cached data is still valid (not older than 6 hours)
   */
  private isCacheValid(marketRate: MarketRate): boolean {
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
    return marketRate.createdAt > sixHoursAgo;
  }

  /**
   * Generate cache key for request
   */
  private generateCacheKey(request: MarketRateRequest): string {
    return `${request.industry}_${request.projectType}_${request.location || 'global'}_${request.experienceLevel || 'mid'}_${request.projectSize || 'medium'}`;
  }

  /**
   * Transform cached entity to response format
   */
  private transformEntityToResponse(entity: MarketRate): MarketRateResponse {
    return entity.rateData as MarketRateResponse;
  }

  /**
   * Get fallback data when all APIs fail
   */
  private async getFallbackData(request: MarketRateRequest): Promise<MarketRateResponse | null> {
    // Try to get the most recent cached data, even if expired
    const lastCached = await this.marketRateRepository.findOne({
      where: {
        industry: request.industry,
        projectType: request.projectType,
      },
      order: { createdAt: 'DESC' },
    });

    if (lastCached) {
      this.logger.warn('Using expired cached data as fallback');
      return this.transformEntityToResponse(lastCached);
    }

    return null;
  }

  /**
   * Map industry to Upwork category
   */
  private mapIndustryToUpworkCategory(industry: string): string {
    const mapping = {
      'web-development': 'web-programming',
      'mobile-development': 'mobile-development',
      'design': 'design-creative',
      'marketing': 'sales-marketing',
      'writing': 'writing',
      'consulting': 'consulting',
    };
    return mapping[industry] || 'other';
  }

  /**
   * Get simulated data for development (FreelancerMap)
   */
  private getSimulatedFreelancerData(request: MarketRateRequest): any {
    const baseRate = this.getIndustryBaseRate(request.industry);
    return {
      hourlyRates: this.generateRandomRates(baseRate, 20),
      projectRates: this.generateRandomRates(baseRate * 40, 15),
      trend: Math.random() * 10 - 5,
      trendPercentage: Math.random() * 20 - 10,
    };
  }

  /**
   * Get simulated data for development (Upwork)
   */
  private getSimulatedUpworkData(request: MarketRateRequest): any {
    const baseRate = this.getIndustryBaseRate(request.industry) * 0.9; // Slightly lower
    return {
      hourlyRates: this.generateRandomRates(baseRate, 25),
      projectRates: this.generateRandomRates(baseRate * 35, 18),
      trend: Math.random() * 8 - 4,
      trendPercentage: Math.random() * 15 - 7.5,
    };
  }

  /**
   * Get simulated data for development (Market Data)
   */
  private getSimulatedMarketData(request: MarketRateRequest): any {
    const baseRate = this.getIndustryBaseRate(request.industry) * 1.1; // Slightly higher
    return {
      hourlyRates: this.generateRandomRates(baseRate, 30),
      projectRates: this.generateRandomRates(baseRate * 45, 20),
      trend: Math.random() * 6 - 3,
      trendPercentage: Math.random() * 12 - 6,
    };
  }

  /**
   * Get base rate for industry
   */
  private getIndustryBaseRate(industry: string): number {
    const rates = {
      'web-development': 75,
      'mobile-development': 85,
      'design': 60,
      'marketing': 50,
      'writing': 40,
      'consulting': 100,
      'data-science': 90,
      'ai-ml': 95,
    };
    return rates[industry] || 60;
  }

  /**
   * Generate random rates around a base value
   */
  private generateRandomRates(baseRate: number, count: number): number[] {
    const rates = [];
    for (let i = 0; i < count; i++) {
      const variation = (Math.random() - 0.5) * 0.6; // ±30% variation
      rates.push(Math.round(baseRate * (1 + variation)));
    }
    return rates;
  }

  /**
   * Get default rate structure when no data is available
   */
  private getDefaultRateStructure(request: MarketRateRequest): Omit<MarketRateResponse, 'recommendations' | 'lastUpdated'> {
    const baseRate = this.getIndustryBaseRate(request.industry);
    
    return {
      industry: request.industry,
      projectType: request.projectType,
      location: request.location || 'global',
      currency: 'USD',
      rates: {
        hourly: {
          min: Math.round(baseRate * 0.5),
          max: Math.round(baseRate * 1.8),
          average: Math.round(baseRate),
          median: Math.round(baseRate * 0.95),
        },
        project: {
          min: Math.round(baseRate * 20),
          max: Math.round(baseRate * 80),
          average: Math.round(baseRate * 40),
          median: Math.round(baseRate * 38),
        },
      },
      dataPoints: 0,
      confidence: 'low',
      trends: {
        direction: 'stable',
        percentage: 0,
      },
      benchmarks: {
        percentile25: Math.round(baseRate * 0.7),
        percentile50: Math.round(baseRate * 0.95),
        percentile75: Math.round(baseRate * 1.3),
        percentile90: Math.round(baseRate * 1.6),
      },
    };
  }
}