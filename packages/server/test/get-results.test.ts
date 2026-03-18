import { describe, it, expect, vi } from 'vitest';
import { handleGetResultsForRun, handleGetResultsForCase } from '../src/tools/get-results.js';
import type { TestRailClient } from '../src/testrail/client.js';
import resultsFixture from './fixtures/results.json';

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

describe('handleGetResultsForRun', () => {
  it('should return formatted results', async () => {
    const client = createMockClient({
      getPaginated: vi.fn().mockResolvedValue({
        offset: 0, limit: 250, size: 4, _links: { next: null, prev: null },
        items: resultsFixture.results,
      }),
    });

    const result = await handleGetResultsForRun(client, { run_id: 201 });
    expect(result.content[0].text).toContain('Test Results');
    expect(result.structuredContent.results).toHaveLength(4);
  });

  it('should handle empty results', async () => {
    const client = createMockClient({
      getPaginated: vi.fn().mockResolvedValue({
        offset: 0, limit: 250, size: 0, _links: { next: null, prev: null }, items: [],
      }),
    });

    const result = await handleGetResultsForRun(client, { run_id: 201 });
    expect(result.content[0].text).toContain('No results found');
  });

  it('should filter by status', async () => {
    const getPaginatedSpy = vi.fn().mockResolvedValue({
      offset: 0, limit: 250, size: 0, _links: { next: null, prev: null }, items: [],
    });
    const client = createMockClient({ getPaginated: getPaginatedSpy });

    await handleGetResultsForRun(client, { run_id: 201, status_id: '1,5' });
    expect(getPaginatedSpy.mock.calls[0][1].status_id).toBe('1,5');
  });

  it('should pass limit and offset params', async () => {
    const getPaginatedSpy = vi.fn().mockResolvedValue({
      offset: 10, limit: 50, size: 0, _links: { next: null, prev: null }, items: [],
    });
    const client = createMockClient({ getPaginated: getPaginatedSpy });

    await handleGetResultsForRun(client, { run_id: 201, limit: 50, offset: 10 });
    expect(getPaginatedSpy.mock.calls[0][1].limit).toBe(50);
    expect(getPaginatedSpy.mock.calls[0][1].offset).toBe(10);
  });
});

describe('handleGetResultsForCase', () => {
  it('should return results for a specific case', async () => {
    const client = createMockClient({
      getPaginated: vi.fn().mockResolvedValue({
        offset: 0, limit: 250, size: 1, _links: { next: null, prev: null },
        items: [resultsFixture.results[0]],
      }),
    });

    const result = await handleGetResultsForCase(client, { run_id: 201, case_id: 101 });
    expect(result.content[0].text).toContain('Test Results');
    expect(result.structuredContent.results).toHaveLength(1);
  });
});
