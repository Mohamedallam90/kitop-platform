import axiosRetry from 'axios-retry';
import axios, { AxiosInstance } from 'axios';

/**
 * Configuration for retry behavior
 */
export interface RetryConfig {
  retries?: number;
  retryDelay?: (retryCount: number) => number;
  retryCondition?: (error: any) => boolean;
}

/**
 * Default retry configuration with exponential backoff
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  retries: 3,
  retryDelay: (retryCount: number) => {
    // Exponential backoff: 1s, 2s, 4s
    return Math.pow(2, retryCount) * 1000;
  },
  retryCondition: (error: any) => {
    // Retry on network errors and 5xx responses, plus specific 4xx errors
    return axiosRetry.isNetworkOrIdempotentRequestError(error) ||
           (error.response?.status >= 500) ||
           (error.response?.status === 429) || // Rate limiting
           (error.response?.status === 408);   // Request timeout
  },
};

/**
 * Creates an axios instance with retry configuration
 */
export function createRetryAxiosInstance(config: RetryConfig = {}): AxiosInstance {
  const instance = axios.create();
  
  axiosRetry(instance, {
    ...DEFAULT_RETRY_CONFIG,
    ...config,
  });

  return instance;
}

/**
 * Configures retry behavior for an existing axios instance
 */
export function configureRetry(instance: AxiosInstance, config: RetryConfig = {}): void {
  axiosRetry(instance, {
    ...DEFAULT_RETRY_CONFIG,
    ...config,
  });
}

/**
 * Retry wrapper for OpenAI calls with exponential backoff
 */
export async function retryOpenAICall<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on certain errors
      if (isNonRetryableError(error)) {
        throw error;
      }
      
      // Don't retry on the last attempt
      if (attempt === maxRetries) {
        break;
      }
      
      // Calculate delay with exponential backoff and jitter
      const baseDelay = Math.pow(2, attempt) * 1000;
      const jitter = Math.random() * 1000;
      const delay = baseDelay + jitter;
      
      console.warn(`OpenAI call failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay}ms:`, error);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

/**
 * Determines if an error should not be retried
 */
function isNonRetryableError(error: any): boolean {
  // Don't retry on authentication errors, bad requests, etc.
  const status = error?.response?.status || error?.status;
  return status === 400 || status === 401 || status === 403 || status === 404;
}