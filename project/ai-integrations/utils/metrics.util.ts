import { register, Counter, Histogram, Gauge } from 'prom-client';

// Initialize Prometheus metrics
export const metrics = {
  // Request counters
  openaiRequests: new Counter({
    name: 'openai_requests_total',
    help: 'Total number of OpenAI API requests',
    labelNames: ['operation', 'status'],
  }),

  lawgeexRequests: new Counter({
    name: 'lawgeex_requests_total',
    help: 'Total number of LawGeex API requests',
    labelNames: ['operation', 'status'],
  }),

  // Duration histograms
  openaiDuration: new Histogram({
    name: 'openai_request_duration_seconds',
    help: 'Duration of OpenAI API requests in seconds',
    labelNames: ['operation'],
    buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60],
  }),

  lawgeexDuration: new Histogram({
    name: 'lawgeex_request_duration_seconds',
    help: 'Duration of LawGeex API requests in seconds',
    labelNames: ['operation'],
    buckets: [0.5, 1, 2, 5, 10, 30, 60, 120],
  }),

  // Token usage for OpenAI
  openaiTokens: new Counter({
    name: 'openai_tokens_used_total',
    help: 'Total number of OpenAI tokens used',
    labelNames: ['operation', 'type'], // type: prompt_tokens, completion_tokens
  }),

  // Active requests gauge
  activeRequests: new Gauge({
    name: 'ai_active_requests',
    help: 'Number of currently active AI requests',
    labelNames: ['service'],
  }),
};

/**
 * Wrapper function to measure and record metrics for async operations
 */
export async function measureOperation<T>(
  operation: () => Promise<T>,
  serviceName: 'openai' | 'lawgeex',
  operationName: string
): Promise<T> {
  const startTime = Date.now();
  const activeGauge = metrics.activeRequests.labels(serviceName);
  const requestCounter = serviceName === 'openai' ? metrics.openaiRequests : metrics.lawgeexRequests;
  const durationHistogram = serviceName === 'openai' ? metrics.openaiDuration : metrics.lawgeexDuration;

  // Increment active requests
  activeGauge.inc();

  try {
    const result = await operation();
    
    // Record successful request
    requestCounter.labels(operationName, 'success').inc();
    
    return result;
  } catch (error) {
    // Record failed request
    const status = getErrorStatus(error);
    requestCounter.labels(operationName, status).inc();
    
    throw error;
  } finally {
    // Record duration and decrement active requests
    const duration = (Date.now() - startTime) / 1000;
    durationHistogram.labels(operationName).observe(duration);
    activeGauge.dec();
  }
}

/**
 * Records token usage for OpenAI operations
 */
export function recordTokenUsage(
  operation: string,
  promptTokens: number,
  completionTokens: number
): void {
  metrics.openaiTokens.labels(operation, 'prompt_tokens').inc(promptTokens);
  metrics.openaiTokens.labels(operation, 'completion_tokens').inc(completionTokens);
}

/**
 * Gets the Prometheus metrics registry for scraping
 */
export function getMetricsRegistry() {
  return register;
}

/**
 * Helper function to check if error is an HTTP client error (4xx)
 */
function isClientError(status: number): boolean {
  return status >= 400 && status < 500;
}

/**
 * Helper function to check if error is an HTTP server error (5xx)
 */
function isServerError(status: number): boolean {
  return status >= 500;
}

/**
 * Helper function to check if error is a timeout
 */
function isTimeoutError(error: any): boolean {
  return error?.code === 'ECONNABORTED';
}

/**
 * Helper function to check if error is a network error
 */
function isNetworkError(error: any): boolean {
  return error?.code === 'ENOTFOUND' || error?.code === 'ECONNREFUSED';
}

/**
 * Extracts error status for metrics labeling
 */
function getErrorStatus(error: any): string {
  const status = error?.response?.status || error?.status;
  
  if (status) {
    if (isClientError(status)) return 'client_error';
    if (isServerError(status)) return 'server_error';
  }
  
  if (isTimeoutError(error)) return 'timeout';
  if (isNetworkError(error)) return 'network_error';
  
  return 'unknown_error';
}