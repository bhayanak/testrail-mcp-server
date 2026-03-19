import { describe, it, expect, vi } from 'vitest';
import { handleAddCase, handleUpdateCase } from '../src/tools/add-case.js';
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

describe('handleAddCase', () => {
  it('should create a case and return formatted response', async () => {
    const client = createMockClient({
      post: vi.fn().mockResolvedValue(casesFixture.cases[0]),
    });

    const result = await handleAddCase(client, {
      section_id: 10,
      title: 'New test case',
    });

    expect(result.content[0].text).toContain('Created case');
    expect(result.structuredContent.case).toBeDefined();
  });

  it('should pass all optional params', async () => {
    const postSpy = vi.fn().mockResolvedValue(casesFixture.cases[0]);
    const client = createMockClient({ post: postSpy });

    await handleAddCase(client, {
      section_id: 10,
      title: 'Login test',
      type_id: 1,
      priority_id: 2,
      estimate: '5m',
      milestone_id: 5,
      refs: 'JIRA-100',
      custom_steps_separated: [{ content: 'Step 1', expected: 'Result 1' }],
    });

    const body = postSpy.mock.calls[0][1];
    expect(body.title).toBe('Login test');
    expect(body.type_id).toBe(1);
    expect(body.priority_id).toBe(2);
    expect(body.custom_steps_separated).toHaveLength(1);
  });
});

describe('handleUpdateCase', () => {
  it('should update a case', async () => {
    const updatedCase = { ...casesFixture.cases[0], title: 'Updated title' };
    const client = createMockClient({
      post: vi.fn().mockResolvedValue(updatedCase),
    });

    const result = await handleUpdateCase(client, {
      case_id: 101,
      title: 'Updated title',
    });

    expect(result.content[0].text).toContain('Updated case');
    expect(result.content[0].text).toContain('Updated title');
  });

  it('should only send changed fields', async () => {
    const postSpy = vi.fn().mockResolvedValue(casesFixture.cases[0]);
    const client = createMockClient({ post: postSpy });

    await handleUpdateCase(client, {
      case_id: 101,
      priority_id: 3,
    });

    const body = postSpy.mock.calls[0][1];
    expect(body.priority_id).toBe(3);
    expect(body.title).toBeUndefined();
  });
});
