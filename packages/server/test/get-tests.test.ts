import { describe, it, expect, vi } from 'vitest';
import { handleGetTests } from '../src/tools/get-tests.js';
import type { TestRailClient } from '../src/testrail/client.js';

function createMockClient(overrides: Partial<TestRailClient> = {}): TestRailClient {
  return {
    get: vi.fn(),
    post: vi.fn(),
    getPaginated: vi.fn(),
    getCached: vi.fn(),
    clearCache: vi.fn(),
    ...overrides,
  } as unknown as TestRailClient;
}

describe('handleGetTests', () => {
  it('should return formatted tests', async () => {
    const client = createMockClient({
      getPaginated: vi.fn().mockResolvedValue({
        offset: 0,
        limit: 250,
        size: 2,
        _links: { next: null, prev: null },
        items: [
          { id: 1, case_id: 100, status_id: 1, title: 'Login test', assignedto_id: 10, run_id: 1 },
          {
            id: 2,
            case_id: 101,
            status_id: 5,
            title: 'Logout test',
            assignedto_id: null,
            run_id: 1,
          },
        ],
      }),
    });

    const result = await handleGetTests(client, { run_id: 1 });
    expect(result.content[0].text).toContain('Login test');
    expect(result.structuredContent.tests).toHaveLength(2);
  });

  it('should handle empty tests', async () => {
    const client = createMockClient({
      getPaginated: vi.fn().mockResolvedValue({
        offset: 0,
        limit: 250,
        size: 0,
        _links: { next: null, prev: null },
        items: [],
      }),
    });

    const result = await handleGetTests(client, { run_id: 1 });
    expect(result.content[0].text).toContain('No tests found');
  });

  it('should pass status_id filter', async () => {
    const getPaginatedSpy = vi.fn().mockResolvedValue({
      offset: 0,
      limit: 250,
      size: 0,
      _links: { next: null, prev: null },
      items: [],
    });
    const client = createMockClient({ getPaginated: getPaginatedSpy });

    await handleGetTests(client, { run_id: 1, status_id: '1,5' });
    expect(getPaginatedSpy.mock.calls[0][1].status_id).toBe('1,5');
  });
});
