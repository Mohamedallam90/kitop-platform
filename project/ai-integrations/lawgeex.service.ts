import axios, { AxiosResponse } from 'axios';
import { createRetryAxiosInstance } from './utils/retry.util';
import { measureOperation } from './utils/metrics.util';
import { 
  validateDocumentContent, 
  validateLawGeexOptions, 
  throwIfInvalid 
} from './utils/validation.util';
import { CancellationToken, createAbortController, cancellablePromise } from './utils/cancellation.util';

const LAWGEEX_API_URL = process.env.LAWGEEX_API_URL || 'https://api.lawgeex.com';
const LAWGEEX_API_KEY = process.env.LAWGEEX_API_KEY;

// Create axios instance with retry configuration
const axiosInstance = createRetryAxiosInstance({
  retries: 3,
  retryDelay: (retryCount: number) => Math.pow(2, retryCount) * 1000,
});

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

/**
 * Sends a document to LawGeex for comprehensive automated legal review.
 * @param documentContent The raw text of the contract to review
 * @param options Optional configuration for the review process
 * @param cancellationToken Optional cancellation token for request cancellation
 * @returns Promise resolving to detailed review results with flagged issues
 */
export async function reviewContractWithLawGeex(
  documentContent: string,
  options: LawGeexReviewOptions = {},
  cancellationToken?: CancellationToken
): Promise<LawGeexReviewResult> {
  if (!LAWGEEX_API_KEY) {
    throw new Error('LawGeex API key is not configured. Please set LAWGEEX_API_KEY environment variable.');
  }

  // Validate inputs
  const contentErrors = validateDocumentContent(documentContent);
  const optionsErrors = validateLawGeexOptions(options);
  throwIfInvalid([...contentErrors, ...optionsErrors]);

  const operation = async () => {
    cancellationToken?.throwIfCancelled();
    
    const requestPayload = {
      document: documentContent,
      document_type: options.document_type || 'contract',
      priority: options.priority || 'medium',
      include_suggestions: options.include_suggestions ?? true,
      language: options.language || 'en',
    };

    const abortController = createAbortController(cancellationToken);

    try {
      const response: AxiosResponse<LawGeexReviewResult> = await axiosInstance.post(
        `${LAWGEEX_API_URL}/v1/review`,
        requestPayload,
        {
          headers: {
            'Authorization': `Bearer ${LAWGEEX_API_KEY}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          timeout: 60000, // 60 second timeout
          signal: abortController.signal,
        }
      );

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
            throw new Error('Access denied. Please verify your LawGeex subscription and permissions.');
          case 429:
            throw new Error('Rate limit exceeded. Please try again later.');
          case 500:
            throw new Error('LawGeex service is temporarily unavailable. Please try again later.');
          default:
            throw new Error(`LawGeex API error (${status}): ${message}`);
        }
      }
      
      console.error('Error reviewing contract with LawGeex:', error);
      throw new Error(`Contract review failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const wrappedOperation = cancellationToken 
    ? () => cancellablePromise(operation(), cancellationToken)
    : operation;

  return await measureOperation(wrappedOperation, 'lawgeex', 'contract_review');
}

/**
 * Checks the status of an ongoing LawGeex review.
 * @param documentId The ID of the document being reviewed
 * @param cancellationToken Optional cancellation token for request cancellation
 * @returns Promise resolving to current review status
 */
export async function checkReviewStatus(
  documentId: string,
  cancellationToken?: CancellationToken
): Promise<{
  status: 'completed' | 'processing' | 'failed';
  progress: number;
  estimated_completion: Date | null;
}> {
  if (!LAWGEEX_API_KEY) {
    throw new Error('LawGeex API key is not configured');
  }

  if (!documentId || typeof documentId !== 'string') {
    throw new Error('Document ID is required and must be a string');
  }

  const operation = async () => {
    cancellationToken?.throwIfCancelled();
    
    const abortController = createAbortController(cancellationToken);
    
    const response = await axiosInstance.get(
      `${LAWGEEX_API_URL}/v1/review/${documentId}/status`,
      {
        headers: {
          'Authorization': `Bearer ${LAWGEEX_API_KEY}`,
          'Accept': 'application/json',
        },
        signal: abortController.signal,
      }
    );

    return response.data;
  };

  const wrappedOperation = cancellationToken 
    ? () => cancellablePromise(operation(), cancellationToken)
    : operation;

  try {
    return await measureOperation(wrappedOperation, 'lawgeex', 'status_check');
  } catch (error) {
    console.error('Error checking review status:', error);
    throw new Error(`Status check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Retrieves a list of supported document types from LawGeex.
 * @param cancellationToken Optional cancellation token for request cancellation
 * @returns Promise resolving to array of supported document types
 */
export async function getSupportedDocumentTypes(
  cancellationToken?: CancellationToken
): Promise<string[]> {
  if (!LAWGEEX_API_KEY) {
    throw new Error('LawGeex API key is not configured');
  }

  const operation = async () => {
    cancellationToken?.throwIfCancelled();
    
    const abortController = createAbortController(cancellationToken);
    
    try {
      const response = await axiosInstance.get(
        `${LAWGEEX_API_URL}/v1/document-types`,
        {
          headers: {
            'Authorization': `Bearer ${LAWGEEX_API_KEY}`,
            'Accept': 'application/json',
          },
          signal: abortController.signal,
        }
      );

      return response.data.document_types || [];
    } catch (error) {
      console.error('Error fetching document types:', error);
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
  };

  const wrappedOperation = cancellationToken 
    ? () => cancellablePromise(operation(), cancellationToken)
    : operation;

  return await measureOperation(wrappedOperation, 'lawgeex', 'get_document_types');
}

/**
 * Filters review issues by severity level.
 * @param issues Array of LawGeex issues
 * @param minSeverity Minimum severity level to include (1-10)
 * @returns Filtered array of issues
 */
export function filterIssuesBySeverity(
  issues: LawGeexIssue[],
  minSeverity: number = 5
): LawGeexIssue[] {
  if (!Array.isArray(issues)) {
    throw new Error('Issues must be an array');
  }
  
  if (typeof minSeverity !== 'number' || minSeverity < 1 || minSeverity > 10) {
    throw new Error('Minimum severity must be a number between 1 and 10');
  }
  
  return issues.filter(issue => issue.severity >= minSeverity);
}

/**
 * Groups issues by category for easier analysis.
 * @param issues Array of LawGeex issues
 * @returns Object with issues grouped by category
 */
export function groupIssuesByCategory(issues: LawGeexIssue[]): Record<string, LawGeexIssue[]> {
  if (!Array.isArray(issues)) {
    throw new Error('Issues must be an array');
  }
  
  return issues.reduce((groups, issue) => {
    const category = issue.category;
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(issue);
    return groups;
  }, {} as Record<string, LawGeexIssue[]>);
}

/**
 * Calculates risk score based on issues
 * @param issues Array of LawGeex issues
 * @returns Risk score from 0-100
 */
export function calculateRiskScore(issues: LawGeexIssue[]): number {
  if (!Array.isArray(issues) || issues.length === 0) {
    return 0;
  }
  
  const totalSeverity = issues.reduce((sum, issue) => sum + issue.severity, 0);
  const averageSeverity = totalSeverity / issues.length;
  
  // Convert to 0-100 scale
  return Math.round((averageSeverity / 10) * 100);
}

/**
 * Gets issues summary statistics
 * @param issues Array of LawGeex issues
 * @returns Summary statistics object
 */
export function getIssuesSummary(issues: LawGeexIssue[]): {
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
  
  issues.forEach(issue => {
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