# KitOps API Integration Guide

This comprehensive guide explains how to integrate with the KitOps platform API to leverage AI-powered workflow automation, document management, and payment processing capabilities in your applications.

## Table of Contents

1. [Authentication](#1-authentication)
2. [AI Services Integration](#2-ai-services-integration)
3. [Document Management](#3-document-management)
4. [E-Signature Integration](#4-e-signature-integration)
5. [Payment Processing](#5-payment-processing)
6. [Market Pricing API](#6-market-pricing-api)
7. [Webhooks](#7-webhooks)
8. [Rate Limits](#8-rate-limits)
9. [Error Handling](#9-error-handling)
10. [Best Practices](#10-best-practices)

## 1. Authentication

All API requests must be authenticated using JWT (JSON Web Token) authentication.

### Obtaining Access Tokens

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "your_password"
}
```

**Response:**

```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 900
}
```

### Using Access Tokens

Include the access token in the Authorization header for all API requests:

```http
GET /api/v1/users/profile
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Refreshing Tokens

Access tokens expire after 15 minutes. Use the refresh token to obtain a new access token:

```http
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

## 2. AI Services Integration

KitOps provides AI-powered services for contract generation, analysis, and legal review.

### Contract Generation

Generate professional contracts using AI:

```http
POST /api/v1/ai/draft-contract
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "contractType": "Service Agreement",
  "parties": ["Company A", "Company B"],
  "keyTerms": ["payment terms", "deliverables"],
  "jurisdiction": "New York",
  "customInstructions": "Include intellectual property clauses"
}
```

**Response:**

```json
{
  "content": "# SERVICE AGREEMENT\n\nThis Service Agreement...",
  "wordCount": 1250,
  "generatedAt": "2025-01-15T12:34:56.789Z",
  "model": "gpt-4",
  "tokenUsage": {
    "promptTokens": 150,
    "completionTokens": 1500,
    "totalTokens": 1650
  }
}
```

### Contract Analysis

Analyze contract language for clarity and potential issues:

```http
POST /api/v1/ai/analyze-contract
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "contractText": "This Service Agreement is entered into..."
}
```

**Response:**

```json
{
  "clarity_score": 7.5,
  "suggestions": [
    "Consider clarifying the payment terms in section 3",
    "Add more specific deliverable descriptions"
  ],
  "risk_factors": [
    "Termination clause is ambiguous",
    "Missing limitation of liability"
  ],
  "analysis_summary": "The contract is generally clear but has some areas for improvement..."
}
```

### Legal Review

Submit contracts for comprehensive legal review:

```http
POST /api/v1/ai/review-contract
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "documentContent": "This Service Agreement is entered into...",
  "options": {
    "document_type": "contract",
    "priority": "high",
    "include_suggestions": true
  }
}
```

**Response:**

```json
{
  "document_id": "doc-123",
  "status": "processing",
  "issues": [],
  "overall_score": 0,
  "processing_time": 0,
  "reviewed_at": "2025-01-15T12:34:56.789Z",
  "summary": {
    "total_issues": 0,
    "high_risk_count": 0,
    "medium_risk_count": 0,
    "low_risk_count": 0
  }
}
```

Check review status:

```http
GET /api/v1/ai/review-status/doc-123
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 3. Document Management

Create, retrieve, update, and delete documents.

### Create Document

```http
POST /api/v1/documents
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "name": "Client Proposal",
  "type": "proposal",
  "content": "# Project Proposal\n\nThis document outlines...",
  "status": "draft"
}
```

### Get Documents

```http
GET /api/v1/documents
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Filter by type:

```http
GET /api/v1/documents?type=contract
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Get Document Templates

```http
GET /api/v1/documents/templates
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Create from Template

```http
POST /api/v1/documents/from-template/template-id
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "name": "New Service Agreement"
}
```

## 4. E-Signature Integration

Send documents for electronic signature and track status.

### Send for Signature

```http
POST /api/v1/signature/send
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "documentId": "doc-123",
  "documentTitle": "Service Agreement",
  "documentContent": "base64-encoded-document-content",
  "signers": [
    {
      "name": "John Doe",
      "email": "john@example.com",
      "role": "signer",
      "order": 1
    },
    {
      "name": "Jane Smith",
      "email": "jane@example.com",
      "role": "signer",
      "order": 2
    }
  ],
  "emailSettings": {
    "subject": "Please sign this document",
    "message": "Please review and sign the attached document."
  }
}
```

**Response:**

```json
{
  "envelopeId": "env-123",
  "status": "sent",
  "signingUrl": "https://sign.docusign.com/...",
  "embeddedSigningUrl": "https://app.kitops.com/sign/...",
  "statusChangeUrl": "https://api.kitops.com/api/v1/webhooks/docusign",
  "expirationDate": "2025-02-15T12:34:56.789Z",
  "createdAt": "2025-01-15T12:34:56.789Z"
}
```

### Check Signature Status

```http
GET /api/v1/signature/status/env-123
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response:**

```json
{
  "status": "delivered",
  "signers": [
    {
      "name": "John Doe",
      "email": "john@example.com",
      "status": "signed",
      "signedAt": "2025-01-15T14:30:00.000Z"
    },
    {
      "name": "Jane Smith",
      "email": "jane@example.com",
      "status": "pending"
    }
  ],
  "documents": [
    {
      "documentId": "doc-123",
      "name": "Service Agreement",
      "status": "in_progress"
    }
  ],
  "lastModified": "2025-01-15T14:30:00.000Z"
}
```

### Download Signed Document

```http
GET /api/v1/signature/download/env-123
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 5. Payment Processing

Process payments and manage subscriptions using Stripe integration.

### Create Payment Intent

```http
POST /api/v1/payments/payment-intents
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "userId": "550e8400-e29b-41d4-a716-446655440001",
  "amount": 1000,
  "currency": "usd",
  "description": "Website development services"
}
```

**Response:**

```json
{
  "clientSecret": "pi_3NkCc92eZvKYlo2C1gUYvSqR_secret_...",
  "paymentIntentId": "pi_3NkCc92eZvKYlo2C1gUYvSqR"
}
```

### Create Subscription

```http
POST /api/v1/payments/subscriptions
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "userId": "550e8400-e29b-41d4-a716-446655440001",
  "priceId": "price_1NkCeL2eZvKYlo2CXcqEY9Xs",
  "paymentMethodId": "pm_1NkCfR2eZvKYlo2CZZvUgXWZ"
}
```

**Response:**

```json
{
  "subscriptionId": "sub_1NkCgH2eZvKYlo2CeZ5TS72S",
  "clientSecret": "seti_1NkCgH2eZvKYlo2CQoajLVZU_secret_..."
}
```

### Cancel Subscription

```http
POST /api/v1/payments/subscriptions/sub_1NkCgH2eZvKYlo2CeZ5TS72S/cancel
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 6. Market Pricing API

Get real-time market pricing data for various industries and project types.

### Get Market Rates

```http
GET /api/v1/market-pricing/rates?industry=web-development&projectType=website&experienceLevel=mid
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response:**

```json
[
  {
    "industry": "web-development",
    "projectType": "website",
    "experienceLevel": "mid",
    "hourlyRateMin": 65,
    "hourlyRateMax": 85,
    "averageRate": 75,
    "currency": "USD",
    "trend": "up",
    "trendPercentage": 2.5,
    "lastUpdated": "2025-01-15T00:00:00.000Z",
    "source": "KitOps Market Data"
  }
]
```

### Get Pricing Suggestions

```http
GET /api/v1/market-pricing/suggestions?industry=web-development&projectType=website&experienceLevel=mid&projectSize=medium
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response:**

```json
{
  "conservative": 64,
  "competitive": 75,
  "premium": 86,
  "currency": "USD",
  "description": "This pricing suggestion is based on current market rates for mid-level web-development professionals working on medium website projects."
}
```

### Get Market Trends

```http
GET /api/v1/market-pricing/trends?industry=web-development
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 7. Webhooks

KitOps provides webhooks for real-time event notifications.

### Available Webhook Events

- `document.created`
- `document.updated`
- `document.deleted`
- `signature.sent`
- `signature.delivered`
- `signature.completed`
- `signature.declined`
- `payment.succeeded`
- `payment.failed`
- `subscription.created`
- `subscription.updated`
- `subscription.canceled`

### Webhook Configuration

Register a webhook URL in your account settings or via the API:

```http
POST /api/v1/webhooks
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "url": "https://your-app.com/webhooks/kitops",
  "events": ["signature.completed", "payment.succeeded"],
  "description": "Production webhook for signatures and payments"
}
```

### Webhook Payload Example

```json
{
  "id": "evt_123456",
  "type": "signature.completed",
  "created": "2025-01-15T14:30:00.000Z",
  "data": {
    "envelopeId": "env-123",
    "documentId": "doc-123",
    "signers": [
      {
        "name": "John Doe",
        "email": "john@example.com",
        "status": "signed",
        "signedAt": "2025-01-15T14:30:00.000Z"
      }
    ]
  }
}
```

### Webhook Security

All webhook requests include a signature header for verification:

```
X-KitOps-Signature: t=1642875600,v1=5257a869e7ecebeda32affa62cdca3fa51cad7e77a0e56ff536d0ce8e108d8bd
```

Verify the signature using your webhook secret:

```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const [timestamp, signatureHash] = signature.split(',');
  const [, timeValue] = timestamp.split('=');
  const [, hashValue] = signatureHash.split('=');
  
  const signedPayload = `${timeValue}.${JSON.stringify(payload)}`;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(hashValue),
    Buffer.from(expectedSignature)
  );
}
```

## 8. Rate Limits

API rate limits help ensure platform stability and fair usage.

| Endpoint Category | Rate Limit |
|-------------------|------------|
| Authentication    | 10 requests per minute |
| AI Services       | 10 requests per minute |
| Document API      | 60 requests per minute |
| Market Pricing    | 20 requests per minute |
| General API       | 100 requests per minute |

Rate limit headers are included in all responses:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642875660
```

## 9. Error Handling

All API errors follow a consistent format:

```json
{
  "statusCode": 400,
  "message": "Invalid input parameters",
  "error": "Bad Request"
}
```

### Common Error Codes

| Status Code | Description |
|-------------|-------------|
| 400 | Bad Request - Invalid input parameters |
| 401 | Unauthorized - Invalid or missing authentication |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource does not exist |
| 409 | Conflict - Resource already exists |
| 422 | Unprocessable Entity - Validation error |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error - Server-side error |

## 10. Best Practices

### Performance Optimization

1. **Minimize API Calls**: Batch operations when possible
2. **Implement Caching**: Cache responses with appropriate TTLs
3. **Use Compression**: Enable gzip/deflate compression for requests
4. **Pagination**: Use pagination for large result sets

### Security Best Practices

1. **Secure Storage**: Store tokens securely (use HTTP-only cookies or secure storage)
2. **Token Rotation**: Implement proper token refresh and rotation
3. **Input Validation**: Validate all user inputs before sending to API
4. **TLS**: Always use HTTPS for all API communications
5. **Webhook Verification**: Always verify webhook signatures

### Error Handling

1. **Graceful Degradation**: Implement fallbacks for API failures
2. **Retry Logic**: Use exponential backoff for transient errors
3. **User Feedback**: Provide clear error messages to end users
4. **Logging**: Log API errors for troubleshooting

## Support Resources

- **API Documentation**: [https://api.kitops.com/docs](https://api.kitops.com/docs)
- **Developer Portal**: [https://developers.kitops.com](https://developers.kitops.com)
- **Support Email**: api-support@kitops.com
- **Status Page**: [https://status.kitops.com](https://status.kitops.com)

---

This document is subject to change as the API evolves. Always refer to the latest version in the developer portal.

**Last Updated**: January 15, 2025  
**API Version**: v1