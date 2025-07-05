import { Injectable, OnModuleInit } from '@nestjs/common';
import { register, collectDefaultMetrics, Counter, Histogram, Gauge } from 'prom-client';

@Injectable()
export class MetricsService implements OnModuleInit {
  private readonly httpRequestsTotal = new Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code', 'service'],
  });

  private readonly httpRequestDuration = new Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code', 'service'],
    buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5, 10],
  });

  private readonly activeConnections = new Gauge({
    name: 'active_connections',
    help: 'Number of active connections',
    labelNames: ['service'],
  });

  private readonly databaseConnections = new Gauge({
    name: 'database_connections_active',
    help: 'Number of active database connections',
    labelNames: ['database', 'service'],
  });

  private readonly businessMetrics = {
    userRegistrations: new Counter({
      name: 'user_registrations_total',
      help: 'Total number of user registrations',
      labelNames: ['source', 'service'],
    }),
    
    documentProcessed: new Counter({
      name: 'documents_processed_total',
      help: 'Total number of documents processed',
      labelNames: ['type', 'status', 'service'],
    }),

    aiIntegrationCalls: new Counter({
      name: 'ai_integration_calls_total',
      help: 'Total number of AI integration calls',
      labelNames: ['provider', 'model', 'status', 'service'],
    }),

    workflowExecutions: new Counter({
      name: 'workflow_executions_total',
      help: 'Total number of workflow executions',
      labelNames: ['workflow_id', 'status', 'service'],
    }),

    workflowDuration: new Histogram({
      name: 'workflow_execution_duration_seconds',
      help: 'Duration of workflow executions in seconds',
      labelNames: ['workflow_id', 'status', 'service'],
      buckets: [1, 5, 10, 30, 60, 300, 600, 1800, 3600],
    }),
  };

  private readonly errorMetrics = {
    errors: new Counter({
      name: 'application_errors_total',
      help: 'Total number of application errors',
      labelNames: ['error_type', 'service', 'severity'],
    }),

    authFailures: new Counter({
      name: 'auth_failures_total',
      help: 'Total number of authentication failures',
      labelNames: ['reason', 'service'],
    }),
  };

  onModuleInit() {
    // Collect default metrics (CPU, memory, etc.)
    collectDefaultMetrics({ register });
    
    // Register custom metrics
    register.registerMetric(this.httpRequestsTotal);
    register.registerMetric(this.httpRequestDuration);
    register.registerMetric(this.activeConnections);
    register.registerMetric(this.databaseConnections);
    
    Object.values(this.businessMetrics).forEach(metric => {
      register.registerMetric(metric);
    });
    
    Object.values(this.errorMetrics).forEach(metric => {
      register.registerMetric(metric);
    });
  }

  // HTTP Metrics
  recordHttpRequest(method: string, route: string, statusCode: number, duration: number, service: string = 'kitops-backend') {
    const labels = { method, route, status_code: statusCode.toString(), service };
    this.httpRequestsTotal.inc(labels);
    this.httpRequestDuration.observe(labels, duration);
  }

  // Connection Metrics
  setActiveConnections(count: number, service: string = 'kitops-backend') {
    this.activeConnections.set({ service }, count);
  }

  setDatabaseConnections(count: number, database: string, service: string = 'kitops-backend') {
    this.databaseConnections.set({ database, service }, count);
  }

  // Business Metrics
  recordUserRegistration(source: string = 'web', service: string = 'kitops-backend') {
    this.businessMetrics.userRegistrations.inc({ source, service });
  }

  recordDocumentProcessed(type: string, status: string, service: string = 'kitops-backend') {
    this.businessMetrics.documentProcessed.inc({ type, status, service });
  }

  recordAiIntegrationCall(provider: string, model: string, status: string, service: string = 'kitops-backend') {
    this.businessMetrics.aiIntegrationCalls.inc({ provider, model, status, service });
  }

  recordWorkflowExecution(workflowId: string, status: string, duration: number, service: string = 'kitops-backend') {
    const labels = { workflow_id: workflowId, status, service };
    this.businessMetrics.workflowExecutions.inc(labels);
    this.businessMetrics.workflowDuration.observe(labels, duration);
  }

  // Error Metrics
  recordError(errorType: string, severity: 'low' | 'medium' | 'high' | 'critical', service: string = 'kitops-backend') {
    this.errorMetrics.errors.inc({ error_type: errorType, service, severity });
  }

  recordAuthFailure(reason: string, service: string = 'kitops-backend') {
    this.errorMetrics.authFailures.inc({ reason, service });
  }

  // Get metrics for Prometheus scraping
  getMetrics(): Promise<string> {
    return register.metrics();
  }

  // Health check metrics
  getHealthMetrics() {
    return {
      uptime: process.uptime(),
      timestamp: Date.now(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
    };
  }
}