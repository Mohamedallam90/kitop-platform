import { Injectable } from '@nestjs/common';
import { createCipher, createDecipher, createHash, randomBytes, createCipheriv, createDecipheriv, Cipher as CryptoCipher, Decipher as CryptoDecipher } from 'crypto';

export interface EncryptionOptions {
  algorithm?: string;
  keySize?: number;
  ivSize?: number;
}

export interface EncryptedData {
  data: string;
  iv: string;
  tag?: string;
  algorithm: string;
}

@Injectable()
export class EncryptionService {
  private readonly defaultAlgorithm = 'aes-256-gcm';
  private readonly keySize = 32; // 256 bits
  private readonly ivSize = 16; // 128 bits
  private readonly masterKey: Buffer;

  constructor() {
    // In production, this should come from environment variables or a secure key management service
    const keyString = process.env.ENCRYPTION_KEY || 'default-key-for-development-only';
    this.masterKey = this.deriveKey(keyString);
  }

  /**
   * Encrypt sensitive data for database storage
   */
  encryptForStorage(data: string, options: EncryptionOptions = {}): EncryptedData {
    const algorithm = options.algorithm || this.defaultAlgorithm;
    const iv = randomBytes(this.ivSize);
    
    try {
      const cipher = createCipheriv(algorithm, this.masterKey, iv);
      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const result: EncryptedData = {
        data: encrypted,
        iv: iv.toString('hex'),
        algorithm,
      };

      // Add authentication tag for GCM mode
      if (algorithm.includes('gcm')) {
        result.tag = (cipher as CryptoCipher & { getAuthTag(): Buffer }).getAuthTag().toString('hex');
      }

      return result;
    } catch (error) {
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypt data from storage
   */
  decryptFromStorage(encryptedData: EncryptedData): string {
    const { data, iv, tag, algorithm } = encryptedData;
    
    try {
      const decipher = createDecipheriv(algorithm, this.masterKey, Buffer.from(iv, 'hex'));
      
      // Set auth tag for GCM mode
      if (algorithm.includes('gcm') && tag) {
        (decipher as CryptoDecipher & { setAuthTag(tag: Buffer): void }).setAuthTag(Buffer.from(tag, 'hex'));
      }
      
      let decrypted = decipher.update(data, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  /**
   * Encrypt data for transmission
   */
  encryptForTransmission(data: any): string {
    const jsonData = JSON.stringify(data);
    const encrypted = this.encryptForStorage(jsonData);
    return Buffer.from(JSON.stringify(encrypted)).toString('base64');
  }

  /**
   * Decrypt data from transmission
   */
  decryptFromTransmission(encryptedBase64: string): any {
    try {
      const encryptedJson = Buffer.from(encryptedBase64, 'base64').toString('utf8');
      const encryptedData: EncryptedData = JSON.parse(encryptedJson);
      const decryptedJson = this.decryptFromStorage(encryptedData);
      return JSON.parse(decryptedJson);
    } catch (error) {
      throw new Error(`Transmission decryption failed: ${error.message}`);
    }
  }

  /**
   * Hash passwords and sensitive tokens
   */
  hashPassword(password: string, saltRounds: number = 12): string {
    const salt = randomBytes(16).toString('hex');
    const hash = createHash('sha256');
    
    // Simple implementation - in production, use bcrypt or similar
    for (let i = 0; i < saltRounds; i++) {
      hash.update(password + salt);
    }
    
    return `${salt}:${hash.digest('hex')}`;
  }

  /**
   * Verify hashed password
   */
  verifyPassword(password: string, hashedPassword: string): boolean {
    try {
      const [salt, hash] = hashedPassword.split(':');
      const testHash = createHash('sha256');
      
      for (let i = 0; i < 12; i++) {
        testHash.update(password + salt);
      }
      
      return testHash.digest('hex') === hash;
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate secure tokens for API keys, session tokens, etc.
   */
  generateSecureToken(length: number = 32): string {
    return randomBytes(length).toString('hex');
  }

  /**
   * Encrypt specific database fields
   */
  encryptDatabaseField(value: any): string | null {
    if (value === null || value === undefined) {
      return null;
    }

    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    const encrypted = this.encryptForStorage(stringValue);
    return JSON.stringify(encrypted);
  }

  /**
   * Decrypt specific database fields
   */
  decryptDatabaseField(encryptedValue: string | null): any {
    if (!encryptedValue) {
      return null;
    }

    try {
      const encryptedData: EncryptedData = JSON.parse(encryptedValue);
      const decrypted = this.decryptFromStorage(encryptedData);
      
      // Try to parse as JSON, fallback to string
      try {
        return JSON.parse(decrypted);
      } catch {
        return decrypted;
      }
    } catch (error) {
      throw new Error(`Database field decryption failed: ${error.message}`);
    }
  }

  /**
   * Create a derived key from a string
   */
  private deriveKey(keyString: string): Buffer {
    const hash = createHash('sha256');
    hash.update(keyString);
    return hash.digest();
  }

  /**
   * Encrypt files for secure storage
   */
  encryptFile(fileBuffer: Buffer): EncryptedData {
    const algorithm = this.defaultAlgorithm;
    const iv = randomBytes(this.ivSize);
    
    try {
      const cipher = createCipheriv(algorithm, this.masterKey, iv);
      const encrypted = Buffer.concat([cipher.update(fileBuffer), cipher.final()]);
      
      const result: EncryptedData = {
        data: encrypted.toString('base64'),
        iv: iv.toString('hex'),
        algorithm,
      };

      if (algorithm.includes('gcm')) {
        result.tag = (cipher as CryptoCipher & { getAuthTag(): Buffer }).getAuthTag().toString('hex');
      }

      return result;
    } catch (error) {
      throw new Error(`File encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypt files from secure storage
   */
  decryptFile(encryptedData: EncryptedData): Buffer {
    const { data, iv, tag, algorithm } = encryptedData;
    
    try {
      const decipher = createDecipheriv(algorithm, this.masterKey, Buffer.from(iv, 'hex'));
      
      if (algorithm.includes('gcm') && tag) {
        (decipher as CryptoDecipher & { setAuthTag(tag: Buffer): void }).setAuthTag(Buffer.from(tag, 'hex'));
      }
      
      const encryptedBuffer = Buffer.from(data, 'base64');
      const decrypted = Buffer.concat([decipher.update(encryptedBuffer), decipher.final()]);
      
      return decrypted;
    } catch (error) {
      throw new Error(`File decryption failed: ${error.message}`);
    }
  }

  /**
   * Rotate encryption keys (for key management)
   */
  rotateKey(newKeyString: string): Buffer {
    return this.deriveKey(newKeyString);
  }

  /**
   * Validate encryption integrity
   */
  validateEncryption(originalData: string, encryptedData: EncryptedData): boolean {
    try {
      const decrypted = this.decryptFromStorage(encryptedData);
      return decrypted === originalData;
    } catch {
      return false;
    }
  }

  /**
   * Get encryption metadata for compliance reporting
   */
  getEncryptionMetadata(): {
    algorithm: string;
    keySize: number;
    ivSize: number;
    timestamp: string;
  } {
    return {
      algorithm: this.defaultAlgorithm,
      keySize: this.keySize,
      ivSize: this.ivSize,
      timestamp: new Date().toISOString(),
    };
  }
}