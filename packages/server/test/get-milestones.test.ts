import { describe, it, expect, vi } from 'vitest';
import { handleGetMilestones } from '../src/tools/get-milestones.js';
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

describe('handleGetMilestones', () => {
  it('should return formatted milestones', async () => {
    const client = createMockClient({
      getPaginated: vi.fn().mockResolvedValue({
        offset: 0,
        limit: 250,
        size: 2,
        _links: { next: null, prev: null },
        items: [
          {
            id: 1,
            name: 'Release 1.0',
            description: 'First release',
            is_completed: false,
            is_started: true,
            due_on: 1700000000,
            completed_on: null,
            url: 'https://example.testrail.io/milestones/1',
          },
          {
            id: 2,
            name: 'Release 2.0',
            description: 'Second release',
            is_completed: true,
            is_started: true,
            due_on: 1710000000,
            completed_on: 1705000000,
            url: 'https://example.testrail.io/milestones/2',
          },
        ],
      }),
    });

    const result = await handleGetMilestones(client, { project_id: 1 });
    expect(result.content[0].text).toContain('Release 1.0');
    expect(result.structuredContent.milestones).toHaveLength(2);
  });

  it('should handle empty milestones', async () => {
    const client = createMockClient({
      getPaginated: vi.fn().mockResolvedValue({
        offset: 0,
        limit: 250,
        size: 0,
        _links: { next: null, prev: null },
        items: [],
      }),
    });

    const result = await handleGetMilestones(client, { project_id: 1 });
    expect(result.content[0].text).toContain('No milestones found');
  });

  it('should pass is_completed filter', async () => {
    const getPaginatedSpy = vi.fn().mockResolvedValue({
      offset: 0,
      limit: 250,
      size: 0,
      _links: { next: null, prev: null },
      items: [],
    });
    const client = createMockClient({ getPaginated: getPaginatedSpy });

    await handleGetMilestones(client, { project_id: 1, is_completed: true });
    expect(getPaginatedSpy.mock.calls[0][1].is_completed).toBe(1);
  });

  it('should pass is_started filter', async () => {
    const getPaginatedSpy = vi.fn().mockResolvedValue({
      offset: 0,
      limit: 250,
      size: 0,
      _links: { next: null, prev: null },
      items: [],
    });
    const client = createMockClient({ getPaginated: getPaginatedSpy });

    await handleGetMilestones(client, { project_id: 1, is_started: false });
    expect(getPaginatedSpy.mock.calls[0][1].is_started).toBe(0);
  });
});
