import { describe, it, expect, vi } from 'vitest';
import { handleAddRun, handleCloseRun } from '../src/tools/add-run.js';
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

describe('handleAddRun', () => {
  it('should create a run and return formatted response', async () => {
    const client = createMockClient({
      post: vi.fn().mockResolvedValue(runFixture),
    });

    const result = await handleAddRun(client, {
      project_id: 1,
      name: 'Sprint 12 Regression',
    });

    expect(result.content[0].text).toContain('Created run');
    expect(result.content[0].text).toContain('Sprint 12 Regression');
    expect(result.structuredContent.run).toBeDefined();
  });

  it('should pass all optional params', async () => {
    const postSpy = vi.fn().mockResolvedValue(runFixture);
    const client = createMockClient({ post: postSpy });

    await handleAddRun(client, {
      project_id: 1,
      suite_id: 2,
      name: 'Test',
      description: 'Desc',
      milestone_id: 5,
      assignedto_id: 1,
      include_all: false,
      case_ids: [101, 102],
    });

    const body = postSpy.mock.calls[0][1];
    expect(body.suite_id).toBe(2);
    expect(body.description).toBe('Desc');
    expect(body.milestone_id).toBe(5);
    expect(body.include_all).toBe(false);
    expect(body.case_ids).toEqual([101, 102]);
  });
});

describe('handleCloseRun', () => {
  it('should close a run', async () => {
    const closedRun = { ...runFixture, is_completed: true, completed_on: 1700200000 };
    const client = createMockClient({
      post: vi.fn().mockResolvedValue(closedRun),
    });

    const result = await handleCloseRun(client, { run_id: 201 });
    expect(result.content[0].text).toContain('Closed run');
  });
});
