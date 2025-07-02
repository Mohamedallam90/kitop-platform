// Jest setup file for AI integrations tests
import { jest } from '@jest/globals';

// Mock environment variables
process.env.OPENAI_API_KEY = 'test-openai-key';
process.env.LAWGEEX_API_KEY = 'test-lawgeex-key';
process.env.LAWGEEX_API_URL = 'https://api.lawgeex.com';

// Global test timeout
jest.setTimeout(10000);

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};