import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadConfig, maskConfig, ConfigError } from '../src/config.js';

describe('loadConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    // Set required vars
    process.env.TESTRAIL_BASE_URL = 'https://example.testrail.io';
    process.env.TESTRAIL_USERNAME = 'user@example.com';
    process.env.TESTRAIL_API_KEY = 'test-api-key';
    process.env.TESTRAIL_PROJECT_ID = '1';
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should load valid config with defaults', () => {
    const config = loadConfig();
    expect(config.baseUrl).toBe('https://example.testrail.io');
    expect(config.username).toBe('user@example.com');
    expect(config.apiKey).toBe('test-api-key');
    expect(config.projectId).toBe(1);
    expect(config.timeoutMs).toBe(30000);
    expect(config.maxResults).toBe(250);
    expect(config.cacheEnabled).toBe(true);
    expect(config.cacheTtlMs).toBe(7 * 24 * 3600000);
  });

  it('should load custom cache TTL', () => {
    process.env.TESTRAIL_CACHE_TTL_HOURS = '48';
    const config = loadConfig();
    expect(config.cacheTtlMs).toBe(48 * 3600000);
  });

  it('should disable cache when TESTRAIL_CACHE_ENABLED is false', () => {
    process.env.TESTRAIL_CACHE_ENABLED = 'false';
    const config = loadConfig();
    expect(config.cacheEnabled).toBe(false);
  });

  it('should load custom cache dir', () => {
    process.env.TESTRAIL_CACHE_DIR = '/custom/cache';
    const config = loadConfig();
    expect(config.cacheDir).toBe('/custom/cache');
  });

  it('should load custom project ID', () => {
    process.env.TESTRAIL_PROJECT_ID = '42';
    const config = loadConfig();
    expect(config.projectId).toBe(42);
  });

  it('should load custom timeout', () => {
    process.env.TESTRAIL_TIMEOUT_MS = '10000';
    const config = loadConfig();
    expect(config.timeoutMs).toBe(10000);
  });

  it('should load custom max results', () => {
    process.env.TESTRAIL_MAX_RESULTS = '100';
    const config = loadConfig();
    expect(config.maxResults).toBe(100);
  });

  it('should throw on missing TESTRAIL_BASE_URL', () => {
    delete process.env.TESTRAIL_BASE_URL;
    expect(() => loadConfig()).toThrow(ConfigError);
    expect(() => loadConfig()).toThrow('TESTRAIL_BASE_URL');
  });

  it('should throw on missing TESTRAIL_USERNAME', () => {
    delete process.env.TESTRAIL_USERNAME;
    expect(() => loadConfig()).toThrow(ConfigError);
  });

  it('should throw on missing TESTRAIL_API_KEY', () => {
    delete process.env.TESTRAIL_API_KEY;
    expect(() => loadConfig()).toThrow(ConfigError);
  });

  it('should throw on missing TESTRAIL_PROJECT_ID', () => {
    delete process.env.TESTRAIL_PROJECT_ID;
    expect(() => loadConfig()).toThrow(ConfigError);
    expect(() => loadConfig()).toThrow('TESTRAIL_PROJECT_ID');
  });

  it('should throw on invalid URL', () => {
    process.env.TESTRAIL_BASE_URL = 'not-a-url';
    expect(() => loadConfig()).toThrow(ConfigError);
  });

  it('should enforce HTTPS in production', () => {
    process.env.NODE_ENV = 'production';
    process.env.TESTRAIL_BASE_URL = 'http://example.testrail.io';
    expect(() => loadConfig()).toThrow('HTTPS');
  });

  it('should strip trailing slashes from URL', () => {
    process.env.TESTRAIL_BASE_URL = 'https://example.testrail.io///';
    const config = loadConfig();
    expect(config.baseUrl).toBe('https://example.testrail.io');
  });

  it('should throw on invalid project ID', () => {
    process.env.TESTRAIL_PROJECT_ID = 'abc';
    expect(() => loadConfig()).toThrow(ConfigError);
  });

  it('should throw on negative project ID', () => {
    process.env.TESTRAIL_PROJECT_ID = '-1';
    expect(() => loadConfig()).toThrow(ConfigError);
  });

  it('should throw on max results > 250', () => {
    process.env.TESTRAIL_MAX_RESULTS = '500';
    expect(() => loadConfig()).toThrow(ConfigError);
  });

  it('should throw on negative timeout', () => {
    process.env.TESTRAIL_TIMEOUT_MS = '-1';
    expect(() => loadConfig()).toThrow(ConfigError);
  });
});

describe('maskConfig', () => {
  it('should mask sensitive fields', () => {
    const config = {
      baseUrl: 'https://example.testrail.io',
      username: 'user@example.com',
      apiKey: 'super-secret-key',
      projectId: 1,
      timeoutMs: 30000,
      maxResults: 250,
      cacheDir: '/tmp/testrail-cache',
      cacheTtlMs: 604800000,
      cacheEnabled: true,
    };
    const masked = maskConfig(config);
    expect(masked.apiKey).toBe('***');
    expect(masked.username).toBe('use***');
    expect(masked.baseUrl).toBe('https://example.testrail.io');
  });
});
