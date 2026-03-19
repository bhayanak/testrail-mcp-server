import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TestRailClient, TestRailApiError } from '../src/testrail/client.js';
import type { TestRailConfig } from '../src/testrail/types.js';

const baseConfig: TestRailConfig = {
  baseUrl: 'https://example.testrail.io',
  username: 'user@example.com',
  apiKey: 'test-api-key',
  projectId: 1,
  timeoutMs: 5000,
  maxResults: 250,
  cacheDir: '/tmp/testrail-test-cache',
  cacheTtlMs: 604800000,
  cacheEnabled: false,
};

function createClient(overrides?: Partial<TestRailConfig>) {
  return new TestRailClient({ ...baseConfig, ...overrides });
}

describe('TestRailClient', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should construct correct auth header', async () => {
    const client = createClient();
    const mockResponse = new Response(JSON.stringify([]), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(mockResponse);

    await client.get('get_projects');

    expect(globalThis.fetch).toHaveBeenCalledOnce();
    const call = vi.mocked(globalThis.fetch).mock.calls[0];
    const headers = call[1]?.headers as Record<string, string>;
    const expected = 'Basic ' + Buffer.from('user@example.com:test-api-key').toString('base64');
    expect(headers.Authorization).toBe(expected);
  });

  it('should build correct URL with base path', async () => {
    const client = createClient();
    const mockResponse = new Response(JSON.stringify({}), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(mockResponse);

    await client.get('get_project/1');

    const url = vi.mocked(globalThis.fetch).mock.calls[0][0] as string;
    expect(url).toContain('/index.php?/api/v2/get_project/1');
  });

  it('should handle GET with query parameters', async () => {
    const client = createClient();
    const mockResponse = new Response(JSON.stringify([]), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(mockResponse);

    await client.get('get_projects', { is_completed: 0 });

    const url = vi.mocked(globalThis.fetch).mock.calls[0][0] as string;
    expect(url).toContain('is_completed=0');
  });

  it('should handle POST with body', async () => {
    const client = createClient();
    const mockResponse = new Response(JSON.stringify({ id: 1 }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(mockResponse);

    await client.post('add_run/1', { name: 'Test Run' });

    const call = vi.mocked(globalThis.fetch).mock.calls[0];
    expect(call[1]?.method).toBe('POST');
    expect(call[1]?.body).toBe(JSON.stringify({ name: 'Test Run' }));
  });

  it('should throw TestRailApiError on 401', async () => {
    const client = createClient();
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Authentication failed' }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      }),
    );

    try {
      await client.get('get_projects');
      expect.fail('Should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(TestRailApiError);
      expect((e as TestRailApiError).statusCode).toBe(401);
    }
  });

  it('should throw on 401 with error message', async () => {
    const client = createClient();
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Authentication failed' }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      }),
    );

    try {
      await client.get('get_projects');
      expect.fail('Should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(TestRailApiError);
      expect((e as TestRailApiError).message).toBe('Authentication failed');
      expect((e as TestRailApiError).statusCode).toBe(401);
    }
  });

  it('should throw on 404', async () => {
    const client = createClient();
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Field :project_id is not a valid project.' }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      }),
    );

    try {
      await client.get('get_project/99999');
      expect.fail('Should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(TestRailApiError);
      expect((e as TestRailApiError).statusCode).toBe(400);
    }
  });

  it('should reject non-JSON content type', async () => {
    const client = createClient();
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('<html>Error</html>', {
        status: 200,
        headers: { 'content-type': 'text/html' },
      }),
    );

    await expect(client.get('get_projects')).rejects.toThrow('Unexpected content type');
  });

  it('should retry on 429 with backoff', async () => {
    const client = createClient();
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    // First call: 429, second call: success
    fetchSpy.mockResolvedValueOnce(
      new Response('', { status: 429, headers: { 'Retry-After': '0' } }),
    );
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );

    const result = await client.get('get_projects');
    expect(result).toEqual([]);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('should handle paginated response', async () => {
    const client = createClient();
    const paginatedData = {
      offset: 0,
      limit: 250,
      size: 2,
      _links: { next: null, prev: null },
      cases: [
        { id: 1, title: 'Case 1' },
        { id: 2, title: 'Case 2' },
      ],
    };
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify(paginatedData), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );

    const result = await client.getPaginated('get_cases/1');
    expect(result.items).toHaveLength(2);
    expect(result.size).toBe(2);
  });

  it('should normalize array response to PaginatedResponse', async () => {
    const client = createClient();
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify([{ id: 1 }, { id: 2 }]), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );

    const result = await client.getPaginated('get_statuses');
    expect(result.items).toHaveLength(2);
    expect(result.offset).toBe(0);
  });

  it('should cache GET requests with getCached', async () => {
    const client = createClient();
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify([{ id: 1 }]), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );

    await client.getCached('get_statuses', 'statuses');
    await client.getCached('get_statuses', 'statuses');

    // Should only call fetch once due to cache
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('should clear cache', async () => {
    const client = createClient();
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify([{ id: 1 }]), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify([{ id: 1 }]), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );

    await client.getCached('get_statuses', 'statuses');
    client.clearCache();
    await client.getCached('get_statuses', 'statuses');

    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });
});
