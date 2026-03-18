import type { TestRailConfig } from './testrail/types.js';

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
  }
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new ConfigError(`Missing required environment variable: ${name}`);
  }
  return value.trim();
}

function optionalEnv(name: string, defaultValue?: string): string | undefined {
  const value = process.env[name];
  if (!value || value.trim() === '') return defaultValue;
  return value.trim();
}

function normalizeUrl(url: string): string {
  // Strip trailing slashes
  let normalized = url.replace(/\/+$/, '');
  // Ensure https in production
  if (process.env.NODE_ENV === 'production' && !normalized.startsWith('https://')) {
    throw new ConfigError('TESTRAIL_BASE_URL must use HTTPS in production');
  }
  // Basic URL validity
  try {
    new URL(normalized);
  } catch {
    throw new ConfigError(`Invalid TESTRAIL_BASE_URL: ${normalized}`);
  }
  return normalized;
}

export function loadConfig(): TestRailConfig {
  const baseUrl = normalizeUrl(requiredEnv('TESTRAIL_BASE_URL'));
  const username = requiredEnv('TESTRAIL_USERNAME');
  const apiKey = requiredEnv('TESTRAIL_API_KEY');

  const projectIdStr = requiredEnv('TESTRAIL_PROJECT_ID');
  const projectId = parseInt(projectIdStr, 10);
  if (isNaN(projectId) || projectId <= 0) {
    throw new ConfigError('TESTRAIL_PROJECT_ID must be a positive integer');
  }

  const timeoutStr = optionalEnv('TESTRAIL_TIMEOUT_MS', '30000')!;
  const timeoutMs = parseInt(timeoutStr, 10);
  if (isNaN(timeoutMs) || timeoutMs <= 0) {
    throw new ConfigError('TESTRAIL_TIMEOUT_MS must be a positive integer');
  }

  const maxResultsStr = optionalEnv('TESTRAIL_MAX_RESULTS', '250')!;
  const maxResults = parseInt(maxResultsStr, 10);
  if (isNaN(maxResults) || maxResults <= 0 || maxResults > 250) {
    throw new ConfigError('TESTRAIL_MAX_RESULTS must be between 1 and 250');
  }

  return {
    baseUrl,
    username,
    apiKey,
    projectId,
    timeoutMs,
    maxResults,
  };
}

/** Mask sensitive values for logging */
export function maskConfig(config: TestRailConfig): Record<string, unknown> {
  return {
    baseUrl: config.baseUrl,
    username: config.username.slice(0, 3) + '***',
    apiKey: '***',
    projectId: config.projectId,
    timeoutMs: config.timeoutMs,
    maxResults: config.maxResults,
  };
}
