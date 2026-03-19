import type { TestRailConfig, PaginatedResponse, TestRailApiErrorResponse } from './types.js';

const MAX_CONCURRENT_REQUESTS = 5;
const MAX_RETRIES = 3;
const BASE_RETRY_DELAY_MS = 1000;

export class TestRailApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly responseBody: string,
  ) {
    super(message);
    this.name = 'TestRailApiError';
  }
}

export class TestRailClient {
  private readonly baseUrl: string;
  private readonly authHeader: string;
  private readonly timeoutMs: number;
  private readonly maxResults: number;
  private activeRequests = 0;

  // Simple TTL cache for reference data
  private cache = new Map<string, { data: unknown; expiresAt: number }>();
  private readonly cacheTtlMs = 5 * 60 * 1000; // 5 minutes

  constructor(config: TestRailConfig) {
    // Normalize base URL: strip trailing slash, ensure /index.php?/api/v2 path
    let url = config.baseUrl.replace(/\/+$/, '');
    if (!url.includes('/index.php?/api/v2')) {
      url += '/index.php?/api/v2';
    }
    this.baseUrl = url;
    this.authHeader =
      'Basic ' + Buffer.from(`${config.username}:${config.apiKey}`).toString('base64');
    this.timeoutMs = config.timeoutMs;
    this.maxResults = config.maxResults;
  }

  // ─── Public API methods ──────────────────────────────────────

  async get<T>(endpoint: string, params?: Record<string, string | number | boolean>): Promise<T> {
    const url = this.buildUrl(endpoint, params);
    return this.request<T>('GET', url);
  }

  async post<T>(endpoint: string, body?: unknown): Promise<T> {
    const url = this.buildUrl(endpoint);
    return this.request<T>('POST', url, body);
  }

  /**
   * Fetch a paginated endpoint. Returns the array of items and pagination metadata.
   * TestRail wraps paginated responses with offset/limit/size/_links.
   */
  async getPaginated<T>(
    endpoint: string,
    params?: Record<string, string | number | boolean>,
  ): Promise<PaginatedResponse<T>> {
    const merged = { limit: this.maxResults, ...params };
    const url = this.buildUrl(endpoint, merged);
    const raw = await this.request<PaginatedResponse<T>>('GET', url);
    // Some endpoints return the items at the top level (pre-pagination API).
    // Normalize to PaginatedResponse shape.
    if (Array.isArray(raw)) {
      return {
        offset: 0,
        limit: (raw as unknown as T[]).length,
        size: (raw as unknown as T[]).length,
        _links: { next: null, prev: null },
        items: raw as unknown as T[],
      };
    }
    // Some paginated endpoints use different keys for the items array.
    // The standard TestRail v2 pagination nests under specific keys or directly.
    if (raw.items !== undefined) {
      return raw;
    }
    // Fallback: look for arrays in the response keys
    const rawObj = raw as unknown as Record<string, unknown>;
    const keys = Object.keys(rawObj).filter(
      (k) => !['offset', 'limit', 'size', '_links'].includes(k),
    );
    if (keys.length === 1 && Array.isArray(rawObj[keys[0]])) {
      return {
        offset: (rawObj.offset as number) ?? 0,
        limit: (rawObj.limit as number) ?? 250,
        size: (rawObj.size as number) ?? 0,
        _links: (rawObj._links as PaginatedResponse<T>['_links']) ?? { next: null, prev: null },
        items: rawObj[keys[0]] as T[],
      };
    }
    return raw;
  }

  /**
   * Cached GET for reference data (statuses, priorities, case types, etc.)
   */
  async getCached<T>(endpoint: string, cacheKey?: string): Promise<T> {
    const key = cacheKey ?? endpoint;
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data as T;
    }
    const data = await this.get<T>(endpoint);
    this.cache.set(key, { data, expiresAt: Date.now() + this.cacheTtlMs });
    return data;
  }

  clearCache(): void {
    this.cache.clear();
  }

  // ─── Internals ───────────────────────────────────────────────

  private buildUrl(endpoint: string, params?: Record<string, string | number | boolean>): string {
    const sep = endpoint.startsWith('/') ? '' : '/';
    let url = `${this.baseUrl}${sep}${endpoint}`;
    if (params && Object.keys(params).length > 0) {
      const searchParams = new URLSearchParams();
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null && v !== '') {
          searchParams.set(k, String(v));
        }
      }
      const qs = searchParams.toString();
      if (qs) {
        url += (url.includes('?') ? '&' : '&') + qs;
      }
    }
    return url;
  }

  private async request<T>(method: string, url: string, body?: unknown): Promise<T> {
    await this.acquireConcurrency();
    try {
      return await this.requestWithRetry<T>(method, url, body, 0);
    } finally {
      this.releaseConcurrency();
    }
  }

  private async requestWithRetry<T>(
    method: string,
    url: string,
    body: unknown,
    attempt: number,
  ): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const headers: Record<string, string> = {
        Authorization: this.authHeader,
        'Content-Type': 'application/json',
      };

      const init: RequestInit = {
        method,
        headers,
        signal: controller.signal,
      };

      if (body !== undefined && method !== 'GET') {
        init.body = JSON.stringify(body);
      }

      const response = await fetch(url, init);

      // Rate limit: retry with backoff
      if (response.status === 429 && attempt < MAX_RETRIES) {
        const retryAfter = response.headers.get('Retry-After');
        const delayMs = retryAfter
          ? parseInt(retryAfter, 10) * 1000
          : BASE_RETRY_DELAY_MS * Math.pow(2, attempt) + Math.random() * 500;
        await this.sleep(delayMs);
        return this.requestWithRetry<T>(method, url, body, attempt + 1);
      }

      // Validate content type
      const contentType = response.headers.get('content-type') ?? '';
      if (!response.ok) {
        const text = await response.text();
        let errorMessage = `TestRail API error ${response.status}`;
        try {
          const errorJson = JSON.parse(text) as TestRailApiErrorResponse;
          if (errorJson.error) {
            errorMessage = errorJson.error;
          }
        } catch {
          // Use raw text if not JSON
          errorMessage = text || errorMessage;
        }
        throw new TestRailApiError(errorMessage, response.status, text);
      }

      if (!contentType.includes('application/json')) {
        const text = await response.text();
        throw new TestRailApiError(
          `Unexpected content type: ${contentType}`,
          response.status,
          text,
        );
      }

      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof TestRailApiError) throw error;
      if ((error as Error).name === 'AbortError') {
        throw new TestRailApiError('Request timed out', 0, '');
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  // ─── Concurrency guard ──────────────────────────────────────

  private concurrencyQueue: Array<() => void> = [];

  private async acquireConcurrency(): Promise<void> {
    if (this.activeRequests < MAX_CONCURRENT_REQUESTS) {
      this.activeRequests++;
      return;
    }
    return new Promise<void>((resolve) => {
      this.concurrencyQueue.push(() => {
        this.activeRequests++;
        resolve();
      });
    });
  }

  private releaseConcurrency(): void {
    this.activeRequests--;
    const next = this.concurrencyQueue.shift();
    if (next) next();
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
