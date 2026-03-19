import { describe, it, expect, vi } from 'vitest';
import { handleGetPlan, handleGetPlans } from '../src/tools/get-plans.js';
import type { TestRailClient } from '../src/testrail/client.js';
import planFixture from './fixtures/plan.json';

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

describe('handleGetPlans', () => {
  it('should return formatted plans', async () => {
    const client = createMockClient({
      getPaginated: vi.fn().mockResolvedValue({
        offset: 0,
        limit: 250,
        size: 1,
        _links: { next: null, prev: null },
        items: [planFixture],
      }),
    });

    const result = await handleGetPlans(client, { project_id: 1 });
    expect(result.content[0].text).toContain('Release 3.0 Test Plan');
  });

  it('should handle empty plans', async () => {
    const client = createMockClient({
      getPaginated: vi.fn().mockResolvedValue({
        offset: 0,
        limit: 250,
        size: 0,
        _links: { next: null, prev: null },
        items: [],
      }),
    });

    const result = await handleGetPlans(client, { project_id: 1 });
    expect(result.content[0].text).toContain('No test plans found');
  });

  it('should pass milestone_id filter', async () => {
    const getPaginatedSpy = vi.fn().mockResolvedValue({
      offset: 0,
      limit: 250,
      size: 0,
      _links: { next: null, prev: null },
      items: [],
    });
    const client = createMockClient({ getPaginated: getPaginatedSpy });

    await handleGetPlans(client, { project_id: 1, milestone_id: '10,20' });
    expect(getPaginatedSpy.mock.calls[0][1].milestone_id).toBe('10,20');
  });
});

describe('handleGetPlan', () => {
  it('should return formatted plan with entries', async () => {
    const client = createMockClient({
      get: vi.fn().mockResolvedValue(planFixture),
    });

    const result = await handleGetPlan(client, { plan_id: 501 });
    expect(result.content[0].text).toContain('Release 3.0 Test Plan');
    expect(result.content[0].text).toContain('Entries');
    expect(result.content[0].text).toContain('Smoke Tests');
  });
});
