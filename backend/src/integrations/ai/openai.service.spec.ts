import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { OpenAIService } from './openai.service';

describe('OpenAIService', () => {
  let service: OpenAIService;
  let _configService: ConfigService;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      switch (key) {
        case 'OPENAI_API_KEY':
          return 'test-api-key';
        default:
          return null;
      }
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OpenAIService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<OpenAIService>(OpenAIService);
    _configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('constructor', () => {
    it('should throw error when API key is not provided', async () => {
      const mockConfigServiceNoKey = {
        get: jest.fn(() => null),
      };

      await expect(
        Test.createTestingModule({
          providers: [
            OpenAIService,
            {
              provide: ConfigService,
              useValue: mockConfigServiceNoKey,
            },
          ],
        }).compile(),
      ).rejects.toThrow('OpenAI API key is not configured');
    });
  });

  describe('generateContractDraft', () => {
    const mockOptions = {
      contractType: 'Service Agreement',
      parties: ['Company A', 'Company B'],
      keyTerms: ['payment terms', 'deliverables'],
      jurisdiction: 'New York',
      customInstructions: 'Include IP clauses',
    };

    beforeEach(() => {
      // Mock the OpenAI client methods
      const mockCreate = jest.fn().mockResolvedValue({
        choices: [
          {
            message: {
              content: 'Generated contract content here...',
            },
          },
        ],
        model: 'gpt-4',
        usage: {
          prompt_tokens: 100,
          completion_tokens: 200,
          total_tokens: 300,
        },
      });

      // Access the private openai property and mock its methods
      (service as any).openai = {
        chat: {
          completions: {
            create: mockCreate,
          },
        },
      };
    });

    it('should generate contract draft successfully', async () => {
      const result = await service.generateContractDraft(mockOptions);

      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('wordCount');
      expect(result).toHaveProperty('generatedAt');
      expect(result).toHaveProperty('model');
      expect(result).toHaveProperty('tokenUsage');
      expect(result.content).toContain('Generated contract content');
      expect(result.model).toBe('gpt-4');
      expect(result.tokenUsage.totalTokens).toBe(300);
    });

    it('should handle API errors gracefully', async () => {
      const mockCreate = jest.fn().mockRejectedValue(new Error('API Error'));
      
      (service as any).openai = {
        chat: {
          completions: {
            create: mockCreate,
          },
        },
      };

      await expect(service.generateContractDraft(mockOptions)).rejects.toThrow(
        'Contract generation failed: API Error',
      );
    });

    it('should handle empty response', async () => {
      const mockCreate = jest.fn().mockResolvedValue({
        choices: [],
        model: 'gpt-4',
      });
      
      (service as any).openai = {
        chat: {
          completions: {
            create: mockCreate,
          },
        },
      };

      await expect(service.generateContractDraft(mockOptions)).rejects.toThrow(
        'No content generated from OpenAI API',
      );
    });
  });

  describe('analyzeContractLanguage', () => {
    const mockContractText = 'This is a sample contract for testing purposes.';

    beforeEach(() => {
      const mockCreate = jest.fn().mockResolvedValue({
        choices: [
          {
            message: {
              content:
                'Clarity Score: 8.5\nSuggestions:\n- Improve clause clarity\n- Add more specific terms\nRisk Factors:\n- Potential ambiguity in section 3\n- Missing termination clause',
            },
          },
        ],
        model: 'gpt-4',
        usage: {
          prompt_tokens: 50,
          completion_tokens: 100,
          total_tokens: 150,
        },
      });

      (service as any).openai = {
        chat: {
          completions: {
            create: mockCreate,
          },
        },
      };
    });

    it('should analyze contract language successfully', async () => {
      const result = await service.analyzeContractLanguage(mockContractText);

      expect(result).toHaveProperty('clarity_score');
      expect(result).toHaveProperty('suggestions');
      expect(result).toHaveProperty('risk_factors');
      expect(result).toHaveProperty('analysis_summary');
      expect(Array.isArray(result.suggestions)).toBe(true);
      expect(Array.isArray(result.risk_factors)).toBe(true);
      expect(typeof result.clarity_score).toBe('number');
    });

    it('should throw error for empty contract text', async () => {
      await expect(service.analyzeContractLanguage('')).rejects.toThrow(
        'Contract text is required for analysis',
      );
    });

    it('should throw error for null/undefined contract text', async () => {
      await expect(service.analyzeContractLanguage(null as any)).rejects.toThrow(
        'Contract text is required for analysis',
      );
    });

    it('should provide default suggestions when parsing fails', async () => {
      const mockCreate = jest.fn().mockResolvedValue({
        choices: [
          {
            message: {
              content: 'Random response without proper structure',
            },
          },
        ],
        model: 'gpt-4',
      });

      (service as any).openai = {
        chat: {
          completions: {
            create: mockCreate,
          },
        },
      };

      const result = await service.analyzeContractLanguage(mockContractText);

      expect(result.suggestions).toContain(
        'Consider reviewing contract language for clarity and completeness',
      );
      expect(result.risk_factors).toContain('No significant risks identified in initial analysis');
    });
  });

  describe('parseAnalysisResponse', () => {
    it('should parse structured analysis response correctly', () => {
      const mockResponse = `
        Clarity Score: 7.5
        
        Suggestions:
        - Improve terminology consistency
        - Add more specific deadlines
        - Consider adding force majeure clause
        
        Risk Factors:
        - Potential liability issues
        - Unclear termination procedures
      `;

      const result = (service as any).parseAnalysisResponse(mockResponse);

      expect(result.clarity_score).toBe(7.5);
      expect(result.suggestions.length).toBeGreaterThan(0);
      expect(result.risk_factors.length).toBeGreaterThan(0);
    });

    it('should handle malformed response gracefully', () => {
      const malformedResponse = 'This is not a structured response';

      const result = (service as any).parseAnalysisResponse(malformedResponse);

      expect(result.clarity_score).toBe(7.5); // Default score
      expect(result.suggestions).toContain(
        'Consider reviewing contract language for clarity and completeness',
      );
      expect(result.risk_factors).toContain('No significant risks identified in initial analysis');
    });
  });

  describe('buildContractPrompt', () => {
    it('should build comprehensive prompt from options', () => {
      const options = {
        contractType: 'Service Agreement',
        parties: ['Company A', 'Company B'],
        keyTerms: ['payment terms', 'deliverables'],
        jurisdiction: 'California',
        customInstructions: 'Include intellectual property clauses',
      };

      const prompt = (service as any).buildContractPrompt(options);

      expect(prompt).toContain('Service Agreement');
      expect(prompt).toContain('Company A, Company B');
      expect(prompt).toContain('payment terms, deliverables');
      expect(prompt).toContain('California');
      expect(prompt).toContain('intellectual property clauses');
    });

    it('should handle missing custom instructions', () => {
      const options = {
        contractType: 'NDA',
        parties: ['Party 1'],
        keyTerms: ['confidentiality'],
        jurisdiction: 'New York',
      };

      const prompt = (service as any).buildContractPrompt(options);

      expect(prompt).not.toContain('Additional instructions');
      expect(prompt).toContain('NDA');
    });
  });
});
