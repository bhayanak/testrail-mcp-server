import { describe, it, expect, vi } from 'vitest';
import { handleGetRuns, handleGetRun } from '../src/tools/get-runs.js';
import type { TestRailClient } from '../src/testrail/client.js';
import runFixture from './fixtures/run.json';

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

describe('handleGetRuns', () => {
  it('should return formatted runs', async () => {
    const client = createMockClient({
      getPaginated: vi.fn().mockResolvedValue({
        offset: 0, limit: 250, size: 1, _links: { next: null, prev: null },
        items: [runFixture],
      }),
    });

    const result = await handleGetRuns(client, { project_id: 1 });
    expect(result.content[0].text).toContain('Sprint 12 Regression');
    expect(result.structuredContent.runs).toHaveLength(1);
  });

  it('should handle empty runs', async () => {
    const client = createMockClient({
      getPaginated: vi.fn().mockResolvedValue({
        offset: 0, limit: 250, size: 0, _links: { next: null, prev: null }, items: [],
      }),
    });

    const result = await handleGetRuns(client, { project_id: 1 });
    expect(result.content[0].text).toContain('No test runs found');
  });

  it('should pass is_completed filter', async () => {
    const getPaginatedSpy = vi.fn().mockResolvedValue({
      offset: 0, limit: 250, size: 0, _links: { next: null, prev: null }, items: [],
    });
    const client = createMockClient({ getPaginated: getPaginatedSpy });

    await handleGetRuns(client, { project_id: 1, is_completed: false });
    expect(getPaginatedSpy.mock.calls[0][1].is_completed).toBe(0);
  });

  it('should pass milestone_id, limit, and offset params', async () => {
    const getPaginatedSpy = vi.fn().mockResolvedValue({
      offset: 10, limit: 50, size: 0, _links: { next: null, prev: null }, items: [],
    });
    const client = createMockClient({ getPaginated: getPaginatedSpy });

    await handleGetRuns(client, { project_id: 1, milestone_id: '1,2', limit: 50, offset: 10 });
    expect(getPaginatedSpy.mock.calls[0][1].milestone_id).toBe('1,2');
    expect(getPaginatedSpy.mock.calls[0][1].limit).toBe(50);
    expect(getPaginatedSpy.mock.calls[0][1].offset).toBe(10);
  });
});

describe('handleGetRun', () => {
  it('should return formatted run', async () => {
    const client = createMockClient({
      get: vi.fn().mockResolvedValue(runFixture),
    });

    const result = await handleGetRun(client, { run_id: 201 });
    expect(result.content[0].text).toContain('Sprint 12 Regression');
    expect(result.content[0].text).toContain('Results Summary');
  });
});
