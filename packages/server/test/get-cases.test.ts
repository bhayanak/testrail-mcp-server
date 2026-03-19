import { describe, it, expect, vi } from 'vitest';
import { handleGetCases, handleGetCase } from '../src/tools/get-cases.js';
import type { TestRailClient } from '../src/testrail/client.js';
import casesFixture from './fixtures/cases.json';

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

describe('handleGetCases', () => {
  it('should return formatted cases', async () => {
    const client = createMockClient({
      getPaginated: vi.fn().mockResolvedValue({
        offset: 0,
        limit: 250,
        size: 3,
        _links: { next: null, prev: null },
        items: casesFixture.cases,
      }),
    });

    const result = await handleGetCases(client, { project_id: 1 });
    expect(result.content[0].text).toContain('Test Cases');
    expect(result.structuredContent.cases).toHaveLength(3);
  });

  it('should pass all filter params', async () => {
    const getPaginatedSpy = vi.fn().mockResolvedValue({
      offset: 0,
      limit: 250,
      size: 0,
      _links: { next: null, prev: null },
      items: [],
    });
    const client = createMockClient({ getPaginated: getPaginatedSpy });

    await handleGetCases(client, {
      project_id: 1,
      suite_id: 2,
      section_id: 10,
      priority_id: '1,2',
      type_id: '3',
      filter: 'login',
      limit: 50,
      offset: 10,
    });

    const params = getPaginatedSpy.mock.calls[0][1];
    expect(params.suite_id).toBe(2);
    expect(params.section_id).toBe(10);
    expect(params.priority_id).toBe('1,2');
    expect(params.filter).toBe('login');
  });

  it('should handle empty results', async () => {
    const client = createMockClient({
      getPaginated: vi.fn().mockResolvedValue({
        offset: 0,
        limit: 250,
        size: 0,
        _links: { next: null, prev: null },
        items: [],
      }),
    });

    const result = await handleGetCases(client, { project_id: 1 });
    expect(result.content[0].text).toContain('No test cases found');
  });
});

describe('handleGetCase', () => {
  it('should return formatted case', async () => {
    const client = createMockClient({
      get: vi.fn().mockResolvedValue(casesFixture.cases[0]),
    });

    const result = await handleGetCase(client, { case_id: 101 });
    expect(result.content[0].text).toContain('Verify login with valid credentials');
    expect(result.structuredContent.case).toBeDefined();
  });
});
