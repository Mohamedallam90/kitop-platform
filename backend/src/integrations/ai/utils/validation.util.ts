/**
 * Validation utilities for AI integration services
 */

export interface ValidationError {
  field: string;
  message: string;
}

export class ValidationException extends Error {
  public errors: ValidationError[];

  constructor(errors: ValidationError[]) {
    super(`Validation failed: ${errors.map(e => e.message).join(', ')}`);
    this.name = 'ValidationException';
    this.errors = errors;
  }
}

/**
 * Validates contract generation options
 */
export function validateContractGenerationOptions(options: any): ValidationError[] {
  const errors: ValidationError[] = [];

  // Contract type validation
  if (!options.contractType || typeof options.contractType !== 'string' || options.contractType.trim().length === 0) {
    errors.push({
      field: 'contractType',
      message: 'Contract type is required and must be a non-empty string'
    });
  }

  // Parties validation
  if (!Array.isArray(options.parties)) {
    errors.push({
      field: 'parties',
      message: 'Parties must be an array'
    });
  } else if (options.parties.length < 2) {
    errors.push({
      field: 'parties',
      message: 'At least two parties are required'
    });
  } else {
    options.parties.forEach((party: any, index: number) => {
      if (!party || typeof party !== 'string' || party.trim().length === 0) {
        errors.push({
          field: `parties[${index}]`,
          message: `Party at index ${index} must be a non-empty string`
        });
      }
    });
  }

  // Key terms validation
  if (!Array.isArray(options.keyTerms)) {
    errors.push({
      field: 'keyTerms',
      message: 'Key terms must be an array'
    });
  } else if (options.keyTerms.length === 0) {
    errors.push({
      field: 'keyTerms',
      message: 'At least one key term is required'
    });
  }

  // Jurisdiction validation
  if (!options.jurisdiction || typeof options.jurisdiction !== 'string' || options.jurisdiction.trim().length === 0) {
    errors.push({
      field: 'jurisdiction',
      message: 'Jurisdiction is required and must be a non-empty string'
    });
  }

  // Custom instructions validation (optional)
  if (options.customInstructions !== undefined && typeof options.customInstructions !== 'string') {
    errors.push({
      field: 'customInstructions',
      message: 'Custom instructions must be a string if provided'
    });
  }

  return errors;
}

/**
 * Validates contract text for analysis
 */
export function validateContractText(text: any): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!text || typeof text !== 'string') {
    errors.push({
      field: 'contractText',
      message: 'Contract text is required and must be a string'
    });
  } else if (text.trim().length === 0) {
    errors.push({
      field: 'contractText',
      message: 'Contract text cannot be empty'
    });
  } else if (text.length < 50) {
    errors.push({
      field: 'contractText',
      message: 'Contract text must be at least 50 characters long'
    });
  } else if (text.length > 100000) {
    errors.push({
      field: 'contractText',
      message: 'Contract text cannot exceed 100,000 characters'
    });
  }

  return errors;
}

/**
 * Throws ValidationException if there are validation errors
 */
export function throwIfInvalid(errors: ValidationError[]): void {
  if (errors.length > 0) {
    throw new ValidationException(errors);
  }
}