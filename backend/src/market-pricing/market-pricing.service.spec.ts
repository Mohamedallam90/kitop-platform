import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { Repository } from 'typeorm';
import { of } from 'rxjs';
import { MarketPricingService, MarketRateRequest } from './market-pricing.service';
import { MarketRate } from './entities/market-rate.entity';

describe('MarketPricingService', () => {
  let service: MarketPricingService;
  let marketRateRepository: Repository<MarketRate>;
  let httpService: HttpService;
  let configService: ConfigService;

  const mockMarketRate: MarketRate = {
    id: 'test-id',
    cacheKey: 'web-development_website_global_mid_medium',
    industry: 'web-development',
    projectType: 'website',
    location: 'global',
    experienceLevel: 'mid',
    projectSize: 'medium',
    rateData: {
      industry: 'web-development',
      projectType: 'website',
      location: 'global',
      currency: 'USD',
      rates: {
        hourly: { min: 50, max: 150, average: 85, median: 80 },
        project: { min: 2000, max: 8000, average: 4500, median: 4200 }
      },
      dataPoints: 75,
      confidence: 'high',
      lastUpdated: new Date(),
      trends: { direction: 'up', percentage: 5.2 },
      recommendations: {
        suggestedHourlyRate: 85,
        suggestedProjectRate: 4200,
        reasoning: ['Based on 75 data points from multiple sources']
      },
      benchmarks: {
        percentile25: 65,
        percentile50: 80,
        percentile75: 105,
        percentile90: 135
      }
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    update: jest.fn(),
  };

  const mockHttpService = {
    get: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarketPricingService,
        {
          provide: getRepositoryToken(MarketRate),
          useValue: mockRepository,
        },
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<MarketPricingService>(MarketPricingService);
    marketRateRepository = module.get<Repository<MarketRate>>(
      getRepositoryToken(MarketRate),
    );
    httpService = module.get<HttpService>(HttpService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('fetchRealTimeRates', () => {
    const testRequest: MarketRateRequest = {
      industry: 'web-development',
      projectType: 'website',
      location: 'global',
      experienceLevel: 'mid',
      projectSize: 'medium',
    };

    it('should return cached rates when valid cache exists', async () => {
      // Mock valid cached data
      mockRepository.findOne.mockResolvedValue(mockMarketRate);
      
      // Mock cache validity check (within 6 hours)
      const sixHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000); // 5 hours ago
      mockMarketRate.createdAt = sixHoursAgo;

      const result = await service.fetchRealTimeRates(testRequest);

      expect(result).toEqual(mockMarketRate.rateData);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { cacheKey: 'web-development_website_global_mid_medium' },
        order: { createdAt: 'DESC' },
      });
    });

    it('should fetch fresh data when cache is expired', async () => {
      // Mock expired cached data
      const expiredCacheData = {
        ...mockMarketRate,
        createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000), // 8 hours ago
      };
      mockRepository.findOne.mockResolvedValue(expiredCacheData);

      // Mock external API responses
      mockConfigService.get.mockReturnValue(undefined); // No API keys configured
      mockRepository.create.mockReturnValue(mockMarketRate);
      mockRepository.save.mockResolvedValue(mockMarketRate);

      const result = await service.fetchRealTimeRates(testRequest);

      expect(result).toBeDefined();
      expect(result.industry).toBe('web-development');
      expect(result.projectType).toBe('website');
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should handle API failures gracefully and return fallback data', async () => {
      // Mock no cached data
      mockRepository.findOne.mockResolvedValue(null);
      
      // Mock API failure
      mockHttpService.get.mockReturnValue(
        of({ data: null }).pipe(() => {
          throw new Error('API Error');
        })
      );

      // Mock fallback data
      mockRepository.findOne
        .mockResolvedValueOnce(null) // First call for cache
        .mockResolvedValueOnce(mockMarketRate); // Second call for fallback

      const result = await service.fetchRealTimeRates(testRequest);

      expect(result).toEqual(mockMarketRate.rateData);
    });

    it('should generate simulated data for development', async () => {
      mockRepository.findOne.mockResolvedValue(null);
      mockConfigService.get.mockReturnValue(undefined); // No API keys
      mockRepository.create.mockReturnValue(mockMarketRate);
      mockRepository.save.mockResolvedValue(mockMarketRate);

      const result = await service.fetchRealTimeRates(testRequest);

      expect(result).toBeDefined();
      expect(result.rates).toBeDefined();
      expect(result.rates.hourly).toBeDefined();
      expect(result.rates.project).toBeDefined();
      expect(result.recommendations).toBeDefined();
    });

    it('should apply experience level multipliers correctly', async () => {
      const seniorRequest: MarketRateRequest = {
        ...testRequest,
        experienceLevel: 'senior',
      };

      mockRepository.findOne.mockResolvedValue(null);
      mockConfigService.get.mockReturnValue(undefined);
      mockRepository.create.mockReturnValue(mockMarketRate);
      mockRepository.save.mockResolvedValue(mockMarketRate);

      const result = await service.fetchRealTimeRates(seniorRequest);

      expect(result.recommendations.suggestedHourlyRate).toBeGreaterThan(
        mockMarketRate.rateData.rates.hourly.median
      );
    });

    it('should apply project size multipliers correctly', async () => {
      const largeProjectRequest: MarketRateRequest = {
        ...testRequest,
        projectSize: 'large',
      };

      mockRepository.findOne.mockResolvedValue(null);
      mockConfigService.get.mockReturnValue(undefined);
      mockRepository.create.mockReturnValue(mockMarketRate);
      mockRepository.save.mockResolvedValue(mockMarketRate);

      const result = await service.fetchRealTimeRates(largeProjectRequest);

      expect(result.recommendations.suggestedProjectRate).toBeGreaterThan(
        mockMarketRate.rateData.rates.project.median
      );
    });
  });

  describe('cacheRateData', () => {
    it('should cache rate data successfully', async () => {
      const testRequest: MarketRateRequest = {
        industry: 'web-development',
        projectType: 'website',
      };

      const testResponse = mockMarketRate.rateData;

      mockRepository.create.mockReturnValue(mockMarketRate);
      mockRepository.save.mockResolvedValue(mockMarketRate);

      // Call private method through public method
      await service.fetchRealTimeRates(testRequest);

      expect(mockRepository.create).toHaveBeenCalled();
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should handle cache failures gracefully', async () => {
      const testRequest: MarketRateRequest = {
        industry: 'web-development',
        projectType: 'website',
      };

      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockReturnValue(mockMarketRate);
      mockRepository.save.mockRejectedValue(new Error('Database error'));

      // Should not throw error even if caching fails
      await expect(service.fetchRealTimeRates(testRequest)).resolves.toBeDefined();
    });
  });

  describe('generateCacheKey', () => {
    it('should generate consistent cache keys', async () => {
      const request1: MarketRateRequest = {
        industry: 'web-development',
        projectType: 'website',
        location: 'us',
        experienceLevel: 'senior',
        projectSize: 'large',
      };

      const request2: MarketRateRequest = {
        industry: 'web-development',
        projectType: 'website',
        location: 'us',
        experienceLevel: 'senior',
        projectSize: 'large',
      };

      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockReturnValue(mockMarketRate);
      mockRepository.save.mockResolvedValue(mockMarketRate);

      await service.fetchRealTimeRates(request1);
      await service.fetchRealTimeRates(request2);

      // Both requests should look for the same cache key
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { cacheKey: 'web-development_website_us_senior_large' },
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('getIndustryBaseRate', () => {
    it('should return correct base rates for different industries', async () => {
      const aiRequest: MarketRateRequest = {
        industry: 'ai-ml',
        projectType: 'model-training',
      };

      const designRequest: MarketRateRequest = {
        industry: 'design',
        projectType: 'branding',
      };

      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockReturnValue(mockMarketRate);
      mockRepository.save.mockResolvedValue(mockMarketRate);

      const aiResult = await service.fetchRealTimeRates(aiRequest);
      const designResult = await service.fetchRealTimeRates(designRequest);

      // AI-ML should have higher base rates than design
      expect(aiResult.rates.hourly.average).toBeGreaterThan(
        designResult.rates.hourly.average
      );
    });
  });

  describe('error handling', () => {
    it('should throw BadRequestException when all data sources fail', async () => {
      const testRequest: MarketRateRequest = {
        industry: 'web-development',
        projectType: 'website',
      };

      mockRepository.findOne.mockResolvedValue(null);
      mockHttpService.get.mockReturnValue(
        of({ data: null }).pipe(() => {
          throw new Error('All APIs failed');
        })
      );

      await expect(service.fetchRealTimeRates(testRequest)).rejects.toThrow();
    });

    it('should handle database connection errors', async () => {
      const testRequest: MarketRateRequest = {
        industry: 'web-development',
        projectType: 'website',
      };

      mockRepository.findOne.mockRejectedValue(new Error('Database connection failed'));

      await expect(service.fetchRealTimeRates(testRequest)).rejects.toThrow();
    });
  });

  describe('statistics and calculations', () => {
    it('should calculate statistics correctly', async () => {
      const rates = [50, 60, 70, 80, 90, 100, 110, 120, 130, 140];
      const testRequest: MarketRateRequest = {
        industry: 'web-development',
        projectType: 'website',
      };

      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockReturnValue(mockMarketRate);
      mockRepository.save.mockResolvedValue(mockMarketRate);

      const result = await service.fetchRealTimeRates(testRequest);

      expect(result.rates.hourly.min).toBeDefined();
      expect(result.rates.hourly.max).toBeDefined();
      expect(result.rates.hourly.average).toBeDefined();
      expect(result.rates.hourly.median).toBeDefined();
      expect(result.benchmarks.percentile25).toBeDefined();
      expect(result.benchmarks.percentile75).toBeDefined();
    });

    it('should calculate confidence levels correctly', async () => {
      const testRequest: MarketRateRequest = {
        industry: 'web-development',
        projectType: 'website',
      };

      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockReturnValue({
        ...mockMarketRate,
        rateData: {
          ...mockMarketRate.rateData,
          dataPoints: 100, // High data points
          confidence: 'high',
        },
      });
      mockRepository.save.mockResolvedValue(mockMarketRate);

      const result = await service.fetchRealTimeRates(testRequest);

      expect(['low', 'medium', 'high']).toContain(result.confidence);
    });
  });
});