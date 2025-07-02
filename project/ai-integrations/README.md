# AI Integrations Module

A comprehensive, production-ready TypeScript module for integrating AI-powered legal services into your application.

## Features

- **OpenAI GPT-4 Integration**: Generate contract drafts and analyze legal language
- **LawGeex API Integration**: Automated legal document review and risk assessment
- **Full TypeScript Support**: Complete type definitions and IntelliSense support
- **Production Hardening**: Retry logic, metrics, validation, and cancellation support
- **Comprehensive Testing**: Full test coverage with Jest
- **Error Handling**: Robust error handling with detailed error messages

## Installation

The required dependencies are included in your package.json:
- `openai`: Latest OpenAI SDK (v4+)
- `axios`: HTTP client for API requests
- `axios-retry`: Automatic retry with exponential backoff
- `prom-client`: Prometheus metrics collection

## Configuration

1. Copy `.env.example` to `.env` and fill in your API keys:

```bash
cp .env.example .env
```

2. Add your API credentials:

```env
OPENAI_API_KEY=your_openai_api_key_here
LAWGEEX_API_KEY=your_lawgeex_api_key_here
```

## Usage Examples

### OpenAI Contract Generation

```typescript
import { generateContractDraft, ContractGenerationOptions, CancellationToken } from './ai-integrations';

const options: ContractGenerationOptions = {
  contractType: 'Service Agreement',
  parties: ['Company ABC', 'Contractor XYZ'],
  keyTerms: ['payment terms', 'deliverables', 'confidentiality'],
  jurisdiction: 'New York',
  customInstructions: 'Include intellectual property clauses'
};

// Basic usage
const result = await generateContractDraft(options);
console.log(result.content); // Generated contract text
console.log(`Token usage: ${result.tokenUsage?.totalTokens}`);

// With cancellation support
const cancellationToken = new CancellationToken();
setTimeout(() => cancellationToken.cancel(), 30000); // Cancel after 30s

try {
  const result = await generateContractDraft(options, cancellationToken);
  console.log(result.content);
} catch (error) {
  if (error.name === 'CancellationError') {
    console.log('Request was cancelled');
  }
}
```

### LawGeex Document Review

```typescript
import { reviewContractWithLawGeex, getIssuesSummary } from './ai-integrations';

const contractText = "Your contract content here...";
const reviewResult = await reviewContractWithLawGeex(contractText, {
  document_type: 'contract',
  priority: 'high',
  include_suggestions: true
});

console.log(`Found ${reviewResult.issues.length} issues`);
console.log(`Overall score: ${reviewResult.overall_score}/10`);

// Get detailed summary
const summary = getIssuesSummary(reviewResult.issues);
console.log('Issues by category:', summary.by_category);
console.log('Average severity:', summary.average_severity);

// Filter high-severity issues
const criticalIssues = filterIssuesBySeverity(reviewResult.issues, 8);
console.log(`Critical issues: ${criticalIssues.length}`);
```

### Contract Language Analysis

```typescript
import { analyzeContractLanguage } from './ai-integrations';

const analysis = await analyzeContractLanguage(contractText);
console.log(`Clarity Score: ${analysis.clarity_score}/10`);
console.log('Suggestions:', analysis.suggestions);
console.log('Risk Factors:', analysis.risk_factors);
console.log('Full Analysis:', analysis.analysis_summary);
```

## API Reference

### OpenAI Service

#### `generateContractDraft(options, cancellationToken?)`
Generate comprehensive contract drafts using GPT-4.

**Parameters:**
- `options: ContractGenerationOptions` - Contract generation configuration
- `cancellationToken?: CancellationToken` - Optional cancellation token

**Returns:** `Promise<ContractDraftResult>`

#### `analyzeContractLanguage(text, cancellationToken?)`
Analyze and improve contract language using GPT-4.

**Parameters:**
- `text: string` - Contract text to analyze
- `cancellationToken?: CancellationToken` - Optional cancellation token

**Returns:** `Promise<AnalysisResult>`

### LawGeex Service

#### `reviewContractWithLawGeex(content, options?, cancellationToken?)`
Automated legal review with issue detection.

**Parameters:**
- `content: string` - Document content to review
- `options?: LawGeexReviewOptions` - Review configuration
- `cancellationToken?: CancellationToken` - Optional cancellation token

**Returns:** `Promise<LawGeexReviewResult>`

#### `checkReviewStatus(documentId, cancellationToken?)`
Check the status of an ongoing review.

#### `getSupportedDocumentTypes(cancellationToken?)`
Get list of supported document types.

#### Utility Functions

- `filterIssuesBySeverity(issues, minSeverity)` - Filter issues by severity level
- `groupIssuesByCategory(issues)` - Group issues by category
- `calculateRiskScore(issues)` - Calculate overall risk score (0-100)
- `getIssuesSummary(issues)` - Get detailed statistics summary

## Production Features

### Retry Logic
All HTTP requests include automatic retry with exponential backoff:
- 3 retry attempts by default
- Exponential backoff: 1s, 2s, 4s
- Retries on network errors, 5xx responses, and rate limiting

### Request Cancellation
Support for cancelling long-running requests:

```typescript
import { CancellationToken, createTimeoutToken } from './ai-integrations';

// Manual cancellation
const token = new CancellationToken();
setTimeout(() => token.cancel(), 10000);

// Timeout-based cancellation
const timeoutToken = createTimeoutToken(30000); // 30 seconds

// Use with any service function
await generateContractDraft(options, token);
```

### Metrics Collection
Prometheus metrics are automatically collected:
- Request counters by operation and status
- Request duration histograms
- Token usage tracking (OpenAI)
- Active request gauges

Access metrics endpoint:
```typescript
import { getMetricsRegistry } from './ai-integrations';

// In your Express app
app.get('/metrics', (req, res) => {
  res.set('Content-Type', getMetricsRegistry().contentType);
  res.end(getMetricsRegistry().metrics());
});
```

### Input Validation
Comprehensive validation for all inputs:
- Contract generation options validation
- Document content validation
- API options validation
- Detailed error messages with field-level feedback

### Error Handling
Robust error handling with specific error types:
- Authentication errors (401)
- Authorization errors (403)
- Rate limiting (429)
- Server errors (5xx)
- Network errors
- Validation errors

## Testing

Run the comprehensive test suite:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

The test suite includes:
- Unit tests for all service functions
- Mock implementations for external APIs
- Error scenario testing
- Validation testing
- Utility function testing

## Monitoring

### Metrics Available

- `openai_requests_total` - Total OpenAI requests by operation and status
- `lawgeex_requests_total` - Total LawGeex requests by operation and status
- `openai_request_duration_seconds` - OpenAI request duration histogram
- `lawgeex_request_duration_seconds` - LawGeex request duration histogram
- `openai_tokens_used_total` - Total tokens used by operation and type
- `ai_active_requests` - Currently active requests by service

### Logging

All services include structured logging for:
- Request/response cycles
- Error conditions
- Retry attempts
- Performance metrics

## Production Considerations

### Security
- Store API keys securely using environment variables
- Never log API keys or sensitive data
- Use HTTPS for all API communications
- Implement proper authentication in your application

### Performance
- Monitor token usage and costs for OpenAI
- Implement caching for frequently accessed data
- Use request cancellation for user-initiated cancellations
- Monitor API rate limits and implement backoff strategies

### Reliability
- All services include automatic retry logic
- Comprehensive error handling and recovery
- Request timeout configuration
- Circuit breaker pattern for external service failures

### Scalability
- Stateless service design
- Prometheus metrics for monitoring
- Configurable timeout and retry settings
- Support for request cancellation

## Support

For API-specific issues:
- OpenAI: https://platform.openai.com/docs
- LawGeex: https://docs.lawgeex.com

For module issues:
- Check TypeScript definitions and error messages
- Review test files for usage examples
- Enable debug logging for detailed troubleshooting

## License

This module is part of your application and follows your project's licensing terms.