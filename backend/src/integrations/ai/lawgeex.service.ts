import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

export interface LawGeexIssue {
  id: string;
  clause: string;
  category: 'high_risk' | 'medium_risk' | 'low_risk' | 'suggestion';
  description: string;
  suggestion: string;
  position: {
    start: number;
    end: number;
  };
  severity: number; // 1-10 scale
}

export interface LawGeexReviewResult {
  document_id: string;
  status: 'completed' | 'processing' | 'failed';
  issues: LawGeexIssue[];
  overall_score: number;
  processing_time: number;
  reviewed_at: Date;
  summary: {
    total_issues: number;
    high_risk_count: number;
    medium_risk_count: number;
    low_risk_count: number;
  };
}

export interface LawGeexReviewOptions {
  document_type?: string;
  priority?: 'high' | 'medium' | 'low';
  include_suggestions?: boolean;
  language?: string;
}

@Injectable()
export class LawGeexService {
  private readonly logger = new Logger(LawGeexService.name);
  private readonly axiosInstance: AxiosInstance;
  private readonly apiUrl: string;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('LAWGEEX_API_KEY');
    this.apiUrl = this.configService.get<string>('LAWGEEX_API_URL') || 'https://api.lawgeex.com';

    if (!apiKey) {
      throw new Error(
        'LawGeex API key is not configured. Please set LAWGEEX_API_KEY environment variable.',
      );
    }

    this.axiosInstance = axios.create({
      baseURL: this.apiUrl,
      timeout: 60000,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });

    // Add response interceptor for error handling
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      (error) => {
        this.logger.error(`LawGeex API error: ${error.message}`, error);
        return Promise.reject(error);
      },
    );
  }

  async reviewContractWithLawGeex(
    documentContent: string,
    options: LawGeexReviewOptions = {},
  ): Promise<LawGeexReviewResult> {
    this.logger.log('Initiating contract review with LawGeex');

    if (!documentContent || documentContent.trim().length === 0) {
      throw new Error('Document content is required for review');
    }

    try {
      const requestPayload = {
        document: documentContent,
        document_type: options.document_type || 'contract',
        priority: options.priority || 'medium',
        include_suggestions: options.include_suggestions ?? true,
        language: options.language || 'en',
      };

      const response = await this.axiosInstance.post('/v1/review', requestPayload);

      this.logger.log(`Contract review completed. Document ID: ${response.data.document_id}`);

      return {
        ...response.data,
        reviewed_at: new Date(),
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const message = error.response?.data?.message || error.message;

        switch (status) {
          case 401:
            throw new Error('Invalid LawGeex API key. Please check your credentials.');
          case 403:
            throw new Error(
              'Access denied. Please verify your LawGeex subscription and permissions.',
            );
          case 429:
            throw new Error('Rate limit exceeded. Please try again later.');
          case 500:
            throw new Error('LawGeex service is temporarily unavailable. Please try again later.');
          default:
            throw new Error(`LawGeex API error (${status}): ${message}`);
        }
      }

      this.logger.error('Error reviewing contract with LawGeex:', error);
      throw new Error(
        `Contract review failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async checkReviewStatus(documentId: string): Promise<{
    status: 'completed' | 'processing' | 'failed';
    progress: number;
    estimated_completion: Date | null;
  }> {
    if (!documentId || typeof documentId !== 'string') {
      throw new Error('Document ID is required and must be a string');
    }

    try {
      const response = await this.axiosInstance.get(`/v1/review/${documentId}/status`);
      return response.data;
    } catch (error) {
      this.logger.error('Error checking review status:', error);
      throw new Error(
        `Status check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async getSupportedDocumentTypes(): Promise<string[]> {
    try {
      const response = await this.axiosInstance.get('/v1/document-types');
      return response.data.document_types || [];
    } catch (error) {
      this.logger.error('Error fetching document types:', error);
      // Return default types if API call fails
      return [
        'contract',
        'nda',
        'employment_agreement',
        'service_agreement',
        'license_agreement',
        'lease_agreement',
      ];
    }
  }

  filterIssuesBySeverity(issues: LawGeexIssue[], minSeverity: number = 5): LawGeexIssue[] {
    if (!Array.isArray(issues)) {
      throw new Error('Issues must be an array');
    }

    if (typeof minSeverity !== 'number' || minSeverity < 1 || minSeverity > 10) {
      throw new Error('Minimum severity must be a number between 1 and 10');
    }

    return issues.filter((issue) => issue.severity >= minSeverity);
  }

  groupIssuesByCategory(issues: LawGeexIssue[]): Record<string, LawGeexIssue[]> {
    if (!Array.isArray(issues)) {
      throw new Error('Issues must be an array');
    }

    return issues.reduce(
      (groups, issue) => {
        const category = issue.category;
        if (!groups[category]) {
          groups[category] = [];
        }
        groups[category].push(issue);
        return groups;
      },
      {} as Record<string, LawGeexIssue[]>,
    );
  }

  calculateRiskScore(issues: LawGeexIssue[]): number {
    if (!Array.isArray(issues) || issues.length === 0) {
      return 0;
    }

    const totalSeverity = issues.reduce((sum, issue) => sum + issue.severity, 0);
    const averageSeverity = totalSeverity / issues.length;

    // Convert to 0-100 scale
    return Math.round((averageSeverity / 10) * 100);
  }

  getIssuesSummary(issues: LawGeexIssue[]): {
    total: number;
    by_category: Record<string, number>;
    by_severity: Record<string, number>;
    average_severity: number;
  } {
    if (!Array.isArray(issues)) {
      throw new Error('Issues must be an array');
    }

    const by_category: Record<string, number> = {};
    const by_severity: Record<string, number> = {
      'low (1-3)': 0,
      'medium (4-6)': 0,
      'high (7-8)': 0,
      'critical (9-10)': 0,
    };

    let totalSeverity = 0;

    issues.forEach((issue) => {
      // Count by category
      by_category[issue.category] = (by_category[issue.category] || 0) + 1;

      // Count by severity range
      if (issue.severity <= 3) {
        by_severity['low (1-3)']++;
      } else if (issue.severity <= 6) {
        by_severity['medium (4-6)']++;
      } else if (issue.severity <= 8) {
        by_severity['high (7-8)']++;
      } else {
        by_severity['critical (9-10)']++;
      }

      totalSeverity += issue.severity;
    });

    return {
      total: issues.length,
      by_category,
      by_severity,
      average_severity: issues.length > 0 ? totalSeverity / issues.length : 0,
    };
  }
}
