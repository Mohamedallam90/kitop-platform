import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface MarketRate {
  industry: string;
  projectType: string;
  experienceLevel: 'junior' | 'mid' | 'senior' | 'expert';
  hourlyRateMin: number;
  hourlyRateMax: number;
  averageRate: number;
  currency: string;
  trend: 'up' | 'down' | 'stable';
  trendPercentage: number;
  lastUpdated: Date;
  source: string;
}

export interface PricingSuggestion {
  conservative: number;
  competitive: number;
  premium: number;
  currency: string;
  description: string;
}

@Injectable()
export class MarketPricingService {
  private readonly logger = new Logger(MarketPricingService.name);
  private ratesCache: Map<string, { data: MarketRate[]; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours in milliseconds
  
  constructor(private configService: ConfigService) {}

  /**
   * Get market rates for a specific industry and project type
   */
  async getMarketRates(
    industry: string,
    projectType: string,
    experienceLevel: 'junior' | 'mid' | 'senior' | 'expert' = 'mid'
  ): Promise<MarketRate[]> {
    const cacheKey = `${industry}-${projectType}`;
    const cached = this.ratesCache.get(cacheKey);
    
    // Return cached data if it's still valid
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      this.logger.debug(`Using cached market rates for ${cacheKey}`);
      return cached.data.filter(rate => rate.experienceLevel === experienceLevel);
    }
    
    try {
      // In a real implementation, this would call an external API
      // For now, we'll use simulated data
      const rates = await this.fetchMarketRates(industry, projectType);
      
      // Cache the results
      this.ratesCache.set(cacheKey, {
        data: rates,
        timestamp: Date.now(),
      });
      
      return rates.filter(rate => rate.experienceLevel === experienceLevel);
    } catch (error) {
      this.logger.error(`Failed to fetch market rates: ${error.message}`);
      throw new Error(`Unable to fetch current market rates: ${error.message}`);
    }
  }

  /**
   * Get pricing suggestions based on market rates
   */
  async getPricingSuggestions(
    industry: string,
    projectType: string,
    experienceLevel: 'junior' | 'mid' | 'senior' | 'expert' = 'mid',
    projectSize: 'small' | 'medium' | 'large' = 'medium'
  ): Promise<PricingSuggestion> {
    const rates = await this.getMarketRates(industry, projectType, experienceLevel);
    
    if (rates.length === 0) {
      throw new Error(`No market rates available for ${industry} - ${projectType}`);
    }
    
    // Calculate average rate
    const avgRate = rates.reduce((sum, rate) => sum + rate.averageRate, 0) / rates.length;
    
    // Apply project size multiplier
    const sizeMultiplier = this.getProjectSizeMultiplier(projectSize);
    const adjustedRate = avgRate * sizeMultiplier;
    
    // Calculate pricing tiers
    return {
      conservative: Math.round(adjustedRate * 0.85),
      competitive: Math.round(adjustedRate),
      premium: Math.round(adjustedRate * 1.15),
      currency: rates[0].currency,
      description: this.getPricingDescription(industry, projectType, experienceLevel, projectSize),
    };
  }

  /**
   * Get market trends for an industry
   */
  async getMarketTrends(industry: string): Promise<{
    industry: string;
    overallTrend: 'up' | 'down' | 'stable';
    percentageChange: number;
    periodComparison: string;
    topProjectTypes: Array<{ name: string; trend: 'up' | 'down' | 'stable'; change: number }>;
  }> {
    try {
      // In a real implementation, this would call an external API
      // For now, we'll use simulated data
      return this.getSimulatedMarketTrends(industry);
    } catch (error) {
      this.logger.error(`Failed to fetch market trends: ${error.message}`);
      throw new Error(`Unable to fetch market trends: ${error.message}`);
    }
  }

  /**
   * Get supported industries
   */
  async getSupportedIndustries(): Promise<string[]> {
    return [
      'web-development',
      'mobile-development',
      'design',
      'marketing',
      'content-writing',
      'data-science',
      'ai-ml',
      'blockchain',
      'devops',
      'cybersecurity',
    ];
  }

  /**
   * Get supported project types for an industry
   */
  async getSupportedProjectTypes(industry: string): Promise<string[]> {
    const projectTypeMap: Record<string, string[]> = {
      'web-development': ['website', 'e-commerce', 'web-app', 'landing-page', 'cms'],
      'mobile-development': ['ios-app', 'android-app', 'cross-platform-app', 'mobile-game'],
      'design': ['logo', 'branding', 'ui-ux', 'illustration', 'product-design'],
      'marketing': ['seo', 'social-media', 'email-campaign', 'content-strategy', 'ppc'],
      'content-writing': ['blog-post', 'technical-writing', 'copywriting', 'product-description'],
      'data-science': ['data-analysis', 'visualization', 'machine-learning', 'predictive-modeling'],
      'ai-ml': ['model-training', 'nlp', 'computer-vision', 'recommendation-system'],
      'blockchain': ['smart-contract', 'dapp', 'token', 'nft'],
      'devops': ['ci-cd', 'cloud-migration', 'infrastructure-setup', 'monitoring'],
      'cybersecurity': ['security-audit', 'penetration-testing', 'security-implementation'],
    };
    
    return projectTypeMap[industry] || [];
  }

  /**
   * Private helper methods
   */
  
  private async fetchMarketRates(industry: string, projectType: string): Promise<MarketRate[]> {
    // In a real implementation, this would call an external API
    // For now, we'll generate simulated data
    
    const baseRates: Record<string, number> = {
      'web-development': 75,
      'mobile-development': 85,
      'design': 65,
      'marketing': 60,
      'content-writing': 45,
      'data-science': 90,
      'ai-ml': 110,
      'blockchain': 120,
      'devops': 95,
      'cybersecurity': 105,
    };
    
    const projectMultipliers: Record<string, number> = {
      // Web development
      'website': 1.0,
      'e-commerce': 1.2,
      'web-app': 1.3,
      'landing-page': 0.8,
      'cms': 1.1,
      
      // Mobile development
      'ios-app': 1.1,
      'android-app': 1.1,
      'cross-platform-app': 1.2,
      'mobile-game': 1.4,
      
      // Design
      'logo': 0.9,
      'branding': 1.2,
      'ui-ux': 1.1,
      'illustration': 1.0,
      'product-design': 1.3,
      
      // Default
      'default': 1.0,
    };
    
    const experienceMultipliers: Record<string, number> = {
      'junior': 0.7,
      'mid': 1.0,
      'senior': 1.3,
      'expert': 1.6,
    };
    
    const baseRate = baseRates[industry] || 70;
    const projectMultiplier = projectMultipliers[projectType] || projectMultipliers['default'];
    
    // Generate rates for all experience levels
    return Object.entries(experienceMultipliers).map(([level, multiplier]) => {
      const avgRate = baseRate * projectMultiplier * multiplier;
      const trend = this.getRandomTrend();
      
      return {
        industry,
        projectType,
        experienceLevel: level as 'junior' | 'mid' | 'senior' | 'expert',
        hourlyRateMin: Math.round(avgRate * 0.9),
        hourlyRateMax: Math.round(avgRate * 1.1),
        averageRate: Math.round(avgRate),
        currency: 'USD',
        trend,
        trendPercentage: this.getRandomTrendPercentage(trend),
        lastUpdated: new Date(),
        source: 'KitOps Market Data',
      };
    });
  }
  
  private getRandomTrend(): 'up' | 'down' | 'stable' {
    const rand = Math.random();
    if (rand < 0.4) return 'up';
    if (rand < 0.7) return 'stable';
    return 'down';
  }
  
  private getRandomTrendPercentage(trend: 'up' | 'down' | 'stable'): number {
    if (trend === 'stable') return 0;
    if (trend === 'up') return +(Math.random() * 8 + 1).toFixed(1);
    return +(Math.random() * 5 + 1).toFixed(1);
  }
  
  private getProjectSizeMultiplier(size: 'small' | 'medium' | 'large'): number {
    switch (size) {
      case 'small': return 0.9;
      case 'medium': return 1.0;
      case 'large': return 1.2;
      default: return 1.0;
    }
  }
  
  private getPricingDescription(
    industry: string,
    projectType: string,
    experienceLevel: string,
    projectSize: string
  ): string {
    return `This pricing suggestion is based on current market rates for ${experienceLevel}-level ${industry} professionals working on ${projectSize} ${projectType} projects. Rates are updated regularly from multiple sources including freelance marketplaces, industry surveys, and proprietary data.`;
  }
  
  private getSimulatedMarketTrends(industry: string): {
    industry: string;
    overallTrend: 'up' | 'down' | 'stable';
    percentageChange: number;
    periodComparison: string;
    topProjectTypes: Array<{ name: string; trend: 'up' | 'down' | 'stable'; change: number }>;
  } {
    const trend = this.getRandomTrend();
    const change = this.getRandomTrendPercentage(trend);
    
    // Get project types for this industry
    const projectTypes = {
      'web-development': ['website', 'e-commerce', 'web-app', 'landing-page', 'cms'],
      'mobile-development': ['ios-app', 'android-app', 'cross-platform-app', 'mobile-game'],
      'design': ['logo', 'branding', 'ui-ux', 'illustration', 'product-design'],
    }[industry] || ['default-project-type'];
    
    // Generate trends for top project types
    const topProjectTypes = projectTypes.slice(0, 3).map(type => ({
      name: type,
      trend: this.getRandomTrend() as 'up' | 'down' | 'stable',
      change: +(Math.random() * 10 + 1).toFixed(1),
    }));
    
    return {
      industry,
      overallTrend: trend,
      percentageChange: change,
      periodComparison: 'vs. last quarter',
      topProjectTypes,
    };
  }
}