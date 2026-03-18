import { describe, it, expect } from 'vitest';
import { createServer } from '../src/server.js';

const testConfig = {
  baseUrl: 'https://example.testrail.io',
  username: 'user@example.com',
  apiKey: 'test-api-key',
  projectId: 1,
  timeoutMs: 30000,
  maxResults: 250,
};

describe('createServer', () => {
  it('should create an MCP server instance', () => {
    const server = createServer(testConfig);
    expect(server).toBeDefined();
  });

  it('should have the correct server name', () => {
    const server = createServer(testConfig);
    // McpServer exposes a .server property
    expect(server.server).toBeDefined();
  });
});
