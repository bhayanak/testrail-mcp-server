import { describe, it, expect, vi } from 'vitest';
import { handleAddResultForCase, handleAddResultsForCases } from '../src/tools/add-result.js';
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

describe('handleAddResultForCase', () => {
  it('should submit a result and return formatted response', async () => {
    const client = createMockClient({
      post: vi.fn().mockResolvedValue({ id: 301, test_id: 401, status_id: 1 }),
    });

    const result = await handleAddResultForCase(client, {
      run_id: 201,
      case_id: 101,
      status_id: 1,
      comment: 'All passed',
    });

    expect(result.content[0].text).toContain('Passed');
    expect(result.content[0].text).toContain('C101');
    expect(result.structuredContent.result.id).toBe(301);
  });

  it('should send correct body', async () => {
    const postSpy = vi.fn().mockResolvedValue({ id: 1, test_id: 1, status_id: 5 });
    const client = createMockClient({ post: postSpy });

    await handleAddResultForCase(client, {
      run_id: 201,
      case_id: 101,
      status_id: 5,
      comment: 'Failed',
      elapsed: '1m 30s',
      defects: 'BUG-123',
      version: '2.1.0',
    });

    const body = postSpy.mock.calls[0][1];
    expect(body.status_id).toBe(5);
    expect(body.comment).toBe('Failed');
    expect(body.elapsed).toBe('1m 30s');
    expect(body.defects).toBe('BUG-123');
    expect(body.version).toBe('2.1.0');
  });
});

describe('handleAddResultsForCases', () => {
  it('should submit bulk results', async () => {
    const client = createMockClient({
      post: vi.fn().mockResolvedValue([
        { id: 301, test_id: 401, status_id: 1 },
        { id: 302, test_id: 402, status_id: 5 },
      ]),
    });

    const result = await handleAddResultsForCases(client, {
      run_id: 201,
      results: [
        { case_id: 101, status_id: 1 },
        { case_id: 102, status_id: 5, comment: 'Failed' },
      ],
    });

    expect(result.content[0].text).toContain('2 result(s)');
    expect(result.content[0].text).toContain('C101');
    expect(result.content[0].text).toContain('C102');
  });
});
