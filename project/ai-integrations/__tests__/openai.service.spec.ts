import { jest } from '@jest/globals';
import OpenAI from 'openai';
import {
  generateContractDraft,
  analyzeContractLanguage,
  type ContractGenerationOptions,
} from '../openai.service';

// Mock OpenAI
jest.mock('openai');
const MockedOpenAI = OpenAI as jest.MockedClass<typeof OpenAI>;

describe('OpenAI Service', () => {
  let mockOpenAI: jest.Mocked<OpenAI>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockOpenAI = {
      chat: {
        completions: {
          create: jest.fn(),
        },
      },
    } as any;
    MockedOpenAI.mockImplementation(() => mockOpenAI);
  });

  describe('generateContractDraft', () => {
    const validOptions: ContractGenerationOptions = {
      contractType: 'Service Agreement',
      parties: ['Company A', 'Company B'],
      keyTerms: ['payment', 'deliverables'],
      jurisdiction: 'New York',
    };

    it('should generate contract draft successfully', async () => {
      const mockResponse = {
        choices: [{ message: { content: 'Generated contract content' } }],
        model: 'gpt-4',
      };
      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse as any);

      const result = await generateContractDraft(validOptions);

      expect(result).toEqual({
        content: 'Generated contract content',
        wordCount: 3,
        generatedAt: expect.any(Date),
        model: 'gpt-4',
      });
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith({
        model: 'gpt-4',
        messages: expect.arrayContaining([
          { role: 'system', content: expect.any(String) },
          { role: 'user', content: expect.any(String) },
        ]),
        max_tokens: 2000,
        temperature: 0.2,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
      });
    });

    it('should validate required fields', async () => {
      const invalidOptions = {
        ...validOptions,
        contractType: '',
      };

      await expect(generateContractDraft(invalidOptions)).rejects.toThrow(
        'Contract type is required'
      );
    });

    it('should validate parties array', async () => {
      const invalidOptions = {
        ...validOptions,
        parties: [],
      };

      await expect(generateContractDraft(invalidOptions)).rejects.toThrow(
        'At least two parties are required'
      );
    });

    it('should handle OpenAI API errors', async () => {
      const error = new Error('OpenAI API Error');
      mockOpenAI.chat.completions.create.mockRejectedValue(error);

      await expect(generateContractDraft(validOptions)).rejects.toThrow(
        'Contract generation failed: OpenAI API Error'
      );
    });

    it('should handle empty response from OpenAI', async () => {
      const mockResponse = {
        choices: [{ message: { content: null } }],
        model: 'gpt-4',
      };
      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse as any);

      await expect(generateContractDraft(validOptions)).rejects.toThrow(
        'No content generated from OpenAI API'
      );
    });

    it('should handle rate limiting (429 error)', async () => {
      const rateLimitError = new Error('Rate limit exceeded');
      (rateLimitError as any).status = 429;
      mockOpenAI.chat.completions.create.mockRejectedValue(rateLimitError);

      await expect(generateContractDraft(validOptions)).rejects.toThrow(
        'Contract generation failed: Rate limit exceeded'
      );
    });

    it('should handle authentication errors (401)', async () => {
      const authError = new Error('Invalid API key');
      (authError as any).status = 401;
      mockOpenAI.chat.completions.create.mockRejectedValue(authError);

      await expect(generateContractDraft(validOptions)).rejects.toThrow(
        'Contract generation failed: Invalid API key'
      );
    });
  });

  describe('analyzeContractLanguage', () => {
    const contractText = 'Sample contract text for analysis';

    it('should analyze contract language successfully', async () => {
      const mockResponse = {
        choices: [{ 
          message: { 
            content: 'Analysis suggests improvements. Risk factors include ambiguous terms.' 
          } 
        }],
        model: 'gpt-4',
      };
      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse as any);

      const result = await analyzeContractLanguage(contractText);

      expect(result).toEqual({
        clarity_score: expect.any(Number),
        suggestions: expect.any(Array),
        risk_factors: expect.any(Array),
      });
      expect(result.clarity_score).toBeGreaterThanOrEqual(1);
      expect(result.clarity_score).toBeLessThanOrEqual(10);
    });

    it('should validate contract text input', async () => {
      await expect(analyzeContractLanguage('')).rejects.toThrow(
        'Contract text is required for analysis'
      );
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Network error');
      mockOpenAI.chat.completions.create.mockRejectedValue(networkError);

      await expect(analyzeContractLanguage(contractText)).rejects.toThrow(
        'Contract analysis failed: Network error'
      );
    });
  });
});