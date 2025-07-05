import { Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';

export interface AnonymizationOptions {
  preserveFormat?: boolean;
  hashSalt?: string;
  anonymizationType?: 'mask' | 'hash' | 'pseudonymize' | 'remove';
}

export interface AnonymizationRule {
  field: string;
  type: 'email' | 'phone' | 'name' | 'address' | 'ip' | 'custom';
  options?: AnonymizationOptions;
}

@Injectable()
export class DataAnonymizationService {
  private readonly defaultSalt = process.env.ANONYMIZATION_SALT || 'kitops-default-salt';

  /**
   * Anonymize user data for logs based on defined rules
   */
  anonymizeForLogs(data: any, rules: AnonymizationRule[] = []): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const anonymized = { ...data };
    
    // Default rules for common sensitive fields
    const defaultRules: AnonymizationRule[] = [
      { field: 'email', type: 'email', options: { anonymizationType: 'mask' } },
      { field: 'password', type: 'custom', options: { anonymizationType: 'remove' } },
      { field: 'phone', type: 'phone', options: { anonymizationType: 'mask' } },
      { field: 'name', type: 'name', options: { anonymizationType: 'pseudonymize' } },
      { field: 'firstName', type: 'name', options: { anonymizationType: 'pseudonymize' } },
      { field: 'lastName', type: 'name', options: { anonymizationType: 'pseudonymize' } },
      { field: 'address', type: 'address', options: { anonymizationType: 'mask' } },
      { field: 'ipAddress', type: 'ip', options: { anonymizationType: 'mask' } },
      { field: 'ssn', type: 'custom', options: { anonymizationType: 'remove' } },
      { field: 'creditCard', type: 'custom', options: { anonymizationType: 'remove' } },
      { field: 'apiKey', type: 'custom', options: { anonymizationType: 'remove' } },
      { field: 'accessToken', type: 'custom', options: { anonymizationType: 'remove' } },
      { field: 'refreshToken', type: 'custom', options: { anonymizationType: 'remove' } },
    ];

    const allRules = [...defaultRules, ...rules];

    return this.applyAnonymizationRules(anonymized, allRules);
  }

  /**
   * Anonymize user data for database storage with GDPR compliance
   */
  anonymizeForDatabase(data: any, userId: string): any {
    const anonymized = { ...data };
    
    // Preserve user ID for data correlation but anonymize personal data
    const rules: AnonymizationRule[] = [
      { field: 'email', type: 'email', options: { anonymizationType: 'hash', hashSalt: userId } },
      { field: 'name', type: 'name', options: { anonymizationType: 'hash', hashSalt: userId } },
      { field: 'firstName', type: 'name', options: { anonymizationType: 'hash', hashSalt: userId } },
      { field: 'lastName', type: 'name', options: { anonymizationType: 'hash', hashSalt: userId } },
      { field: 'phone', type: 'phone', options: { anonymizationType: 'hash', hashSalt: userId } },
      { field: 'address', type: 'address', options: { anonymizationType: 'hash', hashSalt: userId } },
    ];

    return this.applyAnonymizationRules(anonymized, rules);
  }

  /**
   * Create anonymized version for analytics and reporting
   */
  anonymizeForAnalytics(data: any): any {
    const anonymized = { ...data };
    
    const rules: AnonymizationRule[] = [
      { field: 'email', type: 'email', options: { anonymizationType: 'pseudonymize' } },
      { field: 'name', type: 'name', options: { anonymizationType: 'pseudonymize' } },
      { field: 'firstName', type: 'name', options: { anonymizationType: 'pseudonymize' } },
      { field: 'lastName', type: 'name', options: { anonymizationType: 'pseudonymize' } },
      { field: 'phone', type: 'phone', options: { anonymizationType: 'mask' } },
      { field: 'address', type: 'address', options: { anonymizationType: 'mask' } },
      { field: 'ipAddress', type: 'ip', options: { anonymizationType: 'mask' } },
    ];

    return this.applyAnonymizationRules(anonymized, rules);
  }

  private applyAnonymizationRules(data: any, rules: AnonymizationRule[]): any {
    if (Array.isArray(data)) {
      return data.map(item => this.applyAnonymizationRules(item, rules));
    }

    if (data && typeof data === 'object') {
      const result = { ...data };

      Object.keys(result).forEach(key => {
        const rule = rules.find(r => r.field === key || key.toLowerCase().includes(r.field.toLowerCase()));
        
        if (rule) {
          result[key] = this.anonymizeValue(result[key], rule);
        } else if (typeof result[key] === 'object') {
          result[key] = this.applyAnonymizationRules(result[key], rules);
        }
      });

      return result;
    }

    return data;
  }

  private anonymizeValue(value: any, rule: AnonymizationRule): any {
    if (!value) return value;

    const { type, options = {} } = rule;
    const { anonymizationType = 'mask', hashSalt = this.defaultSalt } = options;

    switch (anonymizationType) {
      case 'remove':
        return '[REMOVED]';
      
      case 'hash':
        return this.hashValue(String(value), hashSalt);
      
      case 'pseudonymize':
        return this.pseudonymizeValue(String(value), type);
      
      case 'mask':
      default:
        return this.maskValue(String(value), type);
    }
  }

  private maskValue(value: string, type: string): string {
    switch (type) {
      case 'email':
        const emailParts = value.split('@');
        if (emailParts.length === 2) {
          const username = emailParts[0];
          const domain = emailParts[1];
          const maskedUsername = username.length > 2 
            ? username[0] + '*'.repeat(username.length - 2) + username[username.length - 1]
            : '*'.repeat(username.length);
          return `${maskedUsername}@${domain}`;
        }
        return '*'.repeat(value.length);
      
      case 'phone':
        return value.replace(/\d(?=\d{4})/g, '*');
      
      case 'name':
        return value.split(' ').map(part => 
          part.length > 1 ? part[0] + '*'.repeat(part.length - 1) : '*'
        ).join(' ');
      
      case 'address':
        return value.replace(/\d+/g, '***').replace(/[A-Za-z]{3,}/g, (match) => 
          match[0] + '*'.repeat(match.length - 1)
        );
      
      case 'ip':
        const ipParts = value.split('.');
        if (ipParts.length === 4) {
          return `${ipParts[0]}.${ipParts[1]}.***.**`;
        }
        return '***.***.***.**';
      
      default:
        return '*'.repeat(Math.min(value.length, 8));
    }
  }

  private hashValue(value: string, salt: string): string {
    return createHash('sha256').update(value + salt).digest('hex').substring(0, 16);
  }

  private pseudonymizeValue(value: string, type: string): string {
    const hash = this.hashValue(value, this.defaultSalt);
    const seed = parseInt(hash.substring(0, 8), 16);
    
    switch (type) {
      case 'email':
        const domains = ['example.com', 'test.org', 'sample.net'];
        const usernames = ['user', 'test', 'demo', 'sample'];
        const domain = domains[seed % domains.length];
        const username = usernames[seed % usernames.length];
        return `${username}${seed % 1000}@${domain}`;
      
      case 'name':
        const firstNames = ['John', 'Jane', 'Alex', 'Sam', 'Chris', 'Jordan', 'Taylor', 'Casey'];
        const lastNames = ['Smith', 'Johnson', 'Brown', 'Davis', 'Wilson', 'Moore', 'Taylor', 'Anderson'];
        const firstName = firstNames[seed % firstNames.length];
        const lastName = lastNames[(seed >> 4) % lastNames.length];
        return value.includes(' ') ? `${firstName} ${lastName}` : firstName;
      
      case 'phone':
        const areaCode = 200 + (seed % 700);
        const number = 1000000 + (seed % 9000000);
        return `+1-${areaCode}-${number}`;
      
      case 'address':
        const streets = ['Main St', 'Oak Ave', 'First St', 'Second Ave', 'Park Rd'];
        const street = streets[seed % streets.length];
        const number = 100 + (seed % 9900);
        return `${number} ${street}`;
      
      default:
        return `pseudo_${hash}`;
    }
  }

  /**
   * Check if data contains potentially sensitive information
   */
  containsSensitiveData(data: any): boolean {
    if (!data || typeof data !== 'object') {
      return false;
    }

    const sensitivePatterns = [
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email
      /\b\d{3}-\d{2}-\d{4}\b/, // SSN
      /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/, // Credit card
      /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/, // Phone
      /\b(?:\d{1,3}\.){3}\d{1,3}\b/, // IP address
    ];

    const dataString = JSON.stringify(data);
    return sensitivePatterns.some(pattern => pattern.test(dataString));
  }

  /**
   * Sanitize logs to remove sensitive data
   */
  sanitizeLogs(logData: any): any {
    if (this.containsSensitiveData(logData)) {
      return this.anonymizeForLogs(logData);
    }
    return logData;
  }

  /**
   * Generate anonymization report for compliance
   */
  generateAnonymizationReport(originalData: any, anonymizedData: any): {
    fieldsAnonymized: string[];
    anonymizationMethods: Record<string, string>;
    timestamp: string;
    dataIntegrityCheck: boolean;
  } {
    const fieldsAnonymized: string[] = [];
    const anonymizationMethods: Record<string, string> = {};

    const checkFields = (orig: any, anon: any, path = '') => {
      if (orig && anon && typeof orig === 'object' && typeof anon === 'object') {
        Object.keys(orig).forEach(key => {
          const fullPath = path ? `${path}.${key}` : key;
          if (orig[key] !== anon[key] && typeof orig[key] !== 'object') {
            fieldsAnonymized.push(fullPath);
            anonymizationMethods[fullPath] = this.detectAnonymizationMethod(orig[key], anon[key]);
          } else if (typeof orig[key] === 'object') {
            checkFields(orig[key], anon[key], fullPath);
          }
        });
      }
    };

    checkFields(originalData, anonymizedData);

    return {
      fieldsAnonymized,
      anonymizationMethods,
      timestamp: new Date().toISOString(),
      dataIntegrityCheck: anonymizedData !== null && anonymizedData !== undefined,
    };
  }

  private detectAnonymizationMethod(original: any, anonymized: any): string {
    if (anonymized === '[REMOVED]') return 'removed';
    if (typeof anonymized === 'string' && anonymized.includes('*')) return 'masked';
    if (typeof anonymized === 'string' && anonymized.match(/^[a-f0-9]+$/)) return 'hashed';
    if (typeof anonymized === 'string' && anonymized.includes('pseudo_')) return 'pseudonymized';
    return 'unknown';
  }
}