import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

export interface ContractGenerationOptions {
  contractType: string;
  parties: string[];
  keyTerms: string[];
  jurisdiction: string;
  customInstructions?: string;
}

export interface ContractDraftResult {
  content: string;
  wordCount: number;
  generatedAt: Date;
  model: string;
  tokenUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface AnalysisResult {
  clarity_score: number;
  suggestions: string[];
  risk_factors: string[];
  analysis_summary: string;
}

@Injectable()
export class OpenAIService {
  private readonly logger = new Logger(OpenAIService.name);
  private readonly openai: OpenAI;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      throw new Error('OpenAI API key is not configured. Please set OPENAI_API_KEY environment variable.');
    }

    this.openai = new OpenAI({
      apiKey,
    });
  }

  async generateContractDraft(options: ContractGenerationOptions): Promise<ContractDraftResult> {
    this.logger.log(`Generating contract draft for type: ${options.contractType}`);
    
    try {
      const prompt = this.buildContractPrompt(options);
      
      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are an expert legal contract drafting assistant. Generate comprehensive, legally sound contract drafts based on the provided requirements. Include standard legal clauses and ensure proper structure."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 2000,
        temperature: 0.2,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
      });

      const content = response.choices[0]?.message?.content;
      
      if (!content) {
        throw new Error('No content generated from OpenAI API');
      }

      this.logger.log(`Contract draft generated successfully. Token usage: ${response.usage?.total_tokens}`);

      return {
        content,
        wordCount: content.split(' ').length,
        generatedAt: new Date(),
        model: response.model,
        tokenUsage: response.usage ? {
          promptTokens: response.usage.prompt_tokens,
          completionTokens: response.usage.completion_tokens,
          totalTokens: response.usage.total_tokens,
        } : undefined,
      };
    } catch (error) {
      this.logger.error('Error generating contract draft:', error);
      throw new Error(`Contract generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async analyzeContractLanguage(contractText: string): Promise<AnalysisResult> {
    this.logger.log('Analyzing contract language');
    
    if (!contractText || contractText.trim().length === 0) {
      throw new Error('Contract text is required for analysis');
    }

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are a legal language analysis expert. Analyze the provided contract text for clarity, potential ambiguities, and legal risks. Provide a clarity score (1-10) and specific suggestions for improvement. Format your response with clear sections for score, suggestions, and risk factors."
          },
          {
            role: "user",
            content: `Please analyze this contract text and provide detailed feedback:\n\n${contractText}`
          }
        ],
        max_tokens: 1500,
        temperature: 0.3,
      });

      const content = response.choices[0]?.message?.content;
      
      if (!content) {
        throw new Error('No analysis generated from OpenAI API');
      }

      this.logger.log(`Contract analysis completed. Token usage: ${response.usage?.total_tokens}`);

      const analysis = this.parseAnalysisResponse(content);
      
      return {
        ...analysis,
        analysis_summary: content,
      };
    } catch (error) {
      this.logger.error('Error analyzing contract language:', error);
      throw new Error(`Contract analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private buildContractPrompt(options: ContractGenerationOptions): string {
    return `
Generate a comprehensive ${options.contractType} contract with the following specifications:

Parties involved: ${options.parties.join(', ')}
Key terms to include: ${options.keyTerms.join(', ')}
Governing jurisdiction: ${options.jurisdiction}
${options.customInstructions ? `Additional instructions: ${options.customInstructions}` : ''}

Please include:
1. Proper legal structure and formatting
2. Standard protective clauses
3. Clear definitions section
4. Termination and dispute resolution clauses
5. Signature blocks

The contract should be comprehensive yet clear, legally enforceable in ${options.jurisdiction}, and tailored to the specific requirements provided.
    `.trim();
  }

  private parseAnalysisResponse(content: string): {
    clarity_score: number;
    suggestions: string[];
    risk_factors: string[];
  } {
    const lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    let clarity_score = 7.5; // Default score
    const suggestions: string[] = [];
    const risk_factors: string[] = [];
    
    // Extract clarity score
    const scoreMatch = content.match(/(?:clarity|score).*?(\d+(?:\.\d+)?)/i);
    if (scoreMatch) {
      const score = parseFloat(scoreMatch[1]);
      if (score >= 1 && score <= 10) {
        clarity_score = score;
      }
    }
    
    // Extract suggestions and risk factors
    let currentSection = '';
    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      
      if (lowerLine.includes('suggestion') || lowerLine.includes('recommend')) {
        currentSection = 'suggestions';
        if (line.length > 20) { // Avoid section headers
          suggestions.push(line);
        }
      } else if (lowerLine.includes('risk') || lowerLine.includes('concern') || lowerLine.includes('issue')) {
        currentSection = 'risks';
        if (line.length > 20) { // Avoid section headers
          risk_factors.push(line);
        }
      } else if (currentSection === 'suggestions' && (line.startsWith('-') || line.startsWith('•') || line.match(/^\d+\./))) {
        suggestions.push(line);
      } else if (currentSection === 'risks' && (line.startsWith('-') || line.startsWith('•') || line.match(/^\d+\./))) {
        risk_factors.push(line);
      }
    }
    
    // Provide defaults if nothing was extracted
    if (suggestions.length === 0) {
      suggestions.push('Consider reviewing contract language for clarity and completeness');
    }
    
    if (risk_factors.length === 0) {
      risk_factors.push('No significant risks identified in initial analysis');
    }
    
    return {
      clarity_score,
      suggestions,
      risk_factors,
    };
  }
}