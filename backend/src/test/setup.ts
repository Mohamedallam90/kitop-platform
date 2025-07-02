import { Test } from '@nestjs/testing';

// Global test setup
beforeAll(async () => {
  // Set test environment
  process.env.NODE_ENV = 'test';
  
  // Mock external API calls
  jest.mock('openai');
  jest.mock('axios');
  
  // Set longer timeout for integration tests
  jest.setTimeout(30000);
});

afterAll(async () => {
  // Cleanup after all tests
  await new Promise(resolve => setTimeout(resolve, 100));
});

// Mock console methods in test environment
if (process.env.NODE_ENV === 'test') {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
}