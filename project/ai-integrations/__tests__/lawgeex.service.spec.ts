import { jest } from '@jest/globals';
import axios from 'axios';
import {
  reviewContractWithLawGeex,
  checkReviewStatus,
  getSupportedDocumentTypes,
  filterIssuesBySeverity,
  groupIssuesByCategory,
  type LawGeexIssue,
  type LawGeexReviewResult,
} from '../lawgeex.service';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('LawGeex Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('reviewContractWithLawGeex', () => {
    const documentContent = 'Sample contract content for review';
    const mockReviewResult: LawGeexReviewResult = {
      document_id: 'doc-123',
      status: 'completed',
      issues: [
        {
          id: 'issue-1',
          clause: 'Payment terms',
          category: 'high_risk',
          description: 'Ambiguous payment terms',
          suggestion: 'Clarify payment schedule',
          position: { start: 100, end: 150 },
          severity: 8,
        },
      ],
      overall_score: 7.5,
      processing_time: 5000,
      reviewed_at: new Date(),
      summary: {
        total_issues: 1,
        high_risk_count: 1,
        medium_risk_count: 0,
        low_risk_count: 0,
      },
    };

    it('should review contract successfully', async () => {
      mockedAxios.post.mockResolvedValue({ data: mockReviewResult });

      const result = await reviewContractWithLawGeex(documentContent);

      expect(result).toEqual(expect.objectContaining({
        document_id: 'doc-123',
        status: 'completed',
        issues: expect.any(Array),
        overall_score: 7.5,
      }));
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://api.lawgeex.com/v1/review',
        {
          document: documentContent,
          document_type: 'contract',
          priority: 'medium',
          include_suggestions: true,
          language: 'en',
        },
        {
          headers: {
            'Authorization': 'Bearer test-lawgeex-key',
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          timeout: 60000,
        }
      );
    });

    it('should validate document content', async () => {
      await expect(reviewContractWithLawGeex('')).rejects.toThrow(
        'Document content cannot be empty'
      );
    });

    it('should handle missing API key', async () => {
      const originalKey = process.env.LAWGEEX_API_KEY;
      delete process.env.LAWGEEX_API_KEY;

      await expect(reviewContractWithLawGeex(documentContent)).rejects.toThrow(
        'LawGeex API key is not configured'
      );

      process.env.LAWGEEX_API_KEY = originalKey;
    });

    it('should handle 401 authentication error', async () => {
      const authError = {
        response: { status: 401, data: { message: 'Invalid API key' } },
        isAxiosError: true,
      };
      mockedAxios.post.mockRejectedValue(authError);
      mockedAxios.isAxiosError.mockReturnValue(true);

      await expect(reviewContractWithLawGeex(documentContent)).rejects.toThrow(
        'Invalid LawGeex API key. Please check your credentials.'
      );
    });

    it('should handle 403 access denied error', async () => {
      const accessError = {
        response: { status: 403, data: { message: 'Access denied' } },
        isAxiosError: true,
      };
      mockedAxios.post.mockRejectedValue(accessError);
      mockedAxios.isAxiosError.mockReturnValue(true);

      await expect(reviewContractWithLawGeex(documentContent)).rejects.toThrow(
        'Access denied. Please verify your LawGeex subscription and permissions.'
      );
    });

    it('should handle 429 rate limit error', async () => {
      const rateLimitError = {
        response: { status: 429, data: { message: 'Rate limit exceeded' } },
        isAxiosError: true,
      };
      mockedAxios.post.mockRejectedValue(rateLimitError);
      mockedAxios.isAxiosError.mockReturnValue(true);

      await expect(reviewContractWithLawGeex(documentContent)).rejects.toThrow(
        'Rate limit exceeded. Please try again later.'
      );
    });

    it('should handle 500 server error', async () => {
      const serverError = {
        response: { status: 500, data: { message: 'Internal server error' } },
        isAxiosError: true,
      };
      mockedAxios.post.mockRejectedValue(serverError);
      mockedAxios.isAxiosError.mockReturnValue(true);

      await expect(reviewContractWithLawGeex(documentContent)).rejects.toThrow(
        'LawGeex service is temporarily unavailable. Please try again later.'
      );
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Network Error');
      mockedAxios.post.mockRejectedValue(networkError);
      mockedAxios.isAxiosError.mockReturnValue(false);

      await expect(reviewContractWithLawGeex(documentContent)).rejects.toThrow(
        'Contract review failed: Network Error'
      );
    });
  });

  describe('checkReviewStatus', () => {
    it('should check review status successfully', async () => {
      const mockStatus = {
        status: 'processing',
        progress: 75,
        estimated_completion: new Date(),
      };
      mockedAxios.get.mockResolvedValue({ data: mockStatus });

      const result = await checkReviewStatus('doc-123');

      expect(result).toEqual(mockStatus);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://api.lawgeex.com/v1/review/doc-123/status',
        {
          headers: {
            'Authorization': 'Bearer test-lawgeex-key',
            'Accept': 'application/json',
          },
        }
      );
    });

    it('should handle missing API key', async () => {
      const originalKey = process.env.LAWGEEX_API_KEY;
      delete process.env.LAWGEEX_API_KEY;

      await expect(checkReviewStatus('doc-123')).rejects.toThrow(
        'LawGeex API key is not configured'
      );

      process.env.LAWGEEX_API_KEY = originalKey;
    });
  });

  describe('getSupportedDocumentTypes', () => {
    it('should get supported document types successfully', async () => {
      const mockTypes = {
        document_types: ['contract', 'nda', 'employment_agreement'],
      };
      mockedAxios.get.mockResolvedValue({ data: mockTypes });

      const result = await getSupportedDocumentTypes();

      expect(result).toEqual(['contract', 'nda', 'employment_agreement']);
    });

    it('should return default types on API failure', async () => {
      mockedAxios.get.mockRejectedValue(new Error('API Error'));

      const result = await getSupportedDocumentTypes();

      expect(result).toEqual([
        'contract',
        'nda',
        'employment_agreement',
        'service_agreement',
        'license_agreement',
        'lease_agreement',
      ]);
    });
  });

  describe('filterIssuesBySeverity', () => {
    const mockIssues: LawGeexIssue[] = [
      {
        id: '1',
        clause: 'Clause 1',
        category: 'high_risk',
        description: 'High severity issue',
        suggestion: 'Fix this',
        position: { start: 0, end: 10 },
        severity: 9,
      },
      {
        id: '2',
        clause: 'Clause 2',
        category: 'low_risk',
        description: 'Low severity issue',
        suggestion: 'Consider this',
        position: { start: 10, end: 20 },
        severity: 3,
      },
    ];

    it('should filter issues by minimum severity', () => {
      const result = filterIssuesBySeverity(mockIssues, 5);
      expect(result).toHaveLength(1);
      expect(result[0].severity).toBe(9);
    });

    it('should use default minimum severity of 5', () => {
      const result = filterIssuesBySeverity(mockIssues);
      expect(result).toHaveLength(1);
    });
  });

  describe('groupIssuesByCategory', () => {
    const mockIssues: LawGeexIssue[] = [
      {
        id: '1',
        clause: 'Clause 1',
        category: 'high_risk',
        description: 'High risk issue',
        suggestion: 'Fix this',
        position: { start: 0, end: 10 },
        severity: 9,
      },
      {
        id: '2',
        clause: 'Clause 2',
        category: 'high_risk',
        description: 'Another high risk issue',
        suggestion: 'Fix this too',
        position: { start: 10, end: 20 },
        severity: 8,
      },
      {
        id: '3',
        clause: 'Clause 3',
        category: 'low_risk',
        description: 'Low risk issue',
        suggestion: 'Consider this',
        position: { start: 20, end: 30 },
        severity: 3,
      },
    ];

    it('should group issues by category', () => {
      const result = groupIssuesByCategory(mockIssues);
      
      expect(result).toHaveProperty('high_risk');
      expect(result).toHaveProperty('low_risk');
      expect(result.high_risk).toHaveLength(2);
      expect(result.low_risk).toHaveLength(1);
    });
  });
});