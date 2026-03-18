import { describe, it, expect, vi } from 'vitest';
import {
  handleGetStatuses,
  handleGetPriorities,
  handleGetCaseTypes,
  handleGetCaseFields,
  handleGetResultFields,
  handleGetTemplates,
  handleGetUsers,
  handleGetSuites,
  handleGetSections,
} from '../src/tools/get-metadata.js';
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

describe('handleGetStatuses', () => {
  it('should return formatted statuses', async () => {
    const client = createMockClient({
      getCached: vi.fn().mockResolvedValue([
        { id: 1, name: 'passed', label: 'Passed', color_dark: 0, color_medium: 0, color_bright: 0, is_system: true, is_untested: false, is_final: true },
        { id: 5, name: 'failed', label: 'Failed', color_dark: 0, color_medium: 0, color_bright: 0, is_system: true, is_untested: false, is_final: true },
      ]),
    });

    const result = await handleGetStatuses(client);
    expect(result.content[0].text).toContain('Passed');
    expect(result.structuredContent.statuses).toHaveLength(2);
  });
});

describe('handleGetPriorities', () => {
  it('should return formatted priorities', async () => {
    const client = createMockClient({
      getCached: vi.fn().mockResolvedValue([
        { id: 1, name: 'Low', short_name: 'Low', priority: 1, is_default: false },
        { id: 4, name: 'Critical', short_name: 'Critical', priority: 4, is_default: true },
      ]),
    });

    const result = await handleGetPriorities(client);
    expect(result.content[0].text).toContain('Critical');
    expect(result.structuredContent.priorities).toHaveLength(2);
  });

  it('should handle empty priorities', async () => {
    const client = createMockClient({
      getCached: vi.fn().mockResolvedValue([]),
    });

    const result = await handleGetPriorities(client);
    expect(result.content[0].text).toContain('No priorities found');
  });
});

describe('handleGetCaseTypes', () => {
  it('should return formatted case types', async () => {
    const client = createMockClient({
      getCached: vi.fn().mockResolvedValue([
        { id: 1, name: 'Automated', is_default: false },
        { id: 2, name: 'Functionality', is_default: true },
      ]),
    });

    const result = await handleGetCaseTypes(client);
    expect(result.content[0].text).toContain('Functionality');
    expect(result.structuredContent.caseTypes).toHaveLength(2);
  });

  it('should handle empty case types', async () => {
    const client = createMockClient({
      getCached: vi.fn().mockResolvedValue([]),
    });

    const result = await handleGetCaseTypes(client);
    expect(result.content[0].text).toContain('No case types found');
  });
});

describe('handleGetCaseFields', () => {
  it('should return formatted case fields', async () => {
    const client = createMockClient({
      getCached: vi.fn().mockResolvedValue([
        { id: 1, label: 'Steps', system_name: 'custom_steps', type_id: 11, is_active: true },
      ]),
    });

    const result = await handleGetCaseFields(client);
    expect(result.content[0].text).toContain('Steps');
    expect(result.structuredContent.caseFields).toHaveLength(1);
  });

  it('should handle empty case fields', async () => {
    const client = createMockClient({
      getCached: vi.fn().mockResolvedValue([]),
    });

    const result = await handleGetCaseFields(client);
    expect(result.content[0].text).toContain('No case fields found');
  });
});

describe('handleGetResultFields', () => {
  it('should return formatted result fields', async () => {
    const client = createMockClient({
      getCached: vi.fn().mockResolvedValue([
        { id: 1, label: 'Comment', system_name: 'comment', type_id: 3, is_active: true },
      ]),
    });

    const result = await handleGetResultFields(client);
    expect(result.content[0].text).toContain('Comment');
    expect(result.structuredContent.resultFields).toHaveLength(1);
  });

  it('should handle empty result fields', async () => {
    const client = createMockClient({
      getCached: vi.fn().mockResolvedValue([]),
    });

    const result = await handleGetResultFields(client);
    expect(result.content[0].text).toContain('No result fields found');
  });
});

describe('handleGetTemplates', () => {
  it('should return formatted templates', async () => {
    const client = createMockClient({
      get: vi.fn().mockResolvedValue([
        { id: 1, name: 'Test Case (Steps)', is_default: true },
        { id: 2, name: 'Exploratory', is_default: false },
      ]),
    });

    const result = await handleGetTemplates(client, { project_id: 1 });
    expect(result.content[0].text).toContain('Test Case (Steps)');
    expect(result.structuredContent.templates).toHaveLength(2);
  });

  it('should handle empty templates', async () => {
    const client = createMockClient({
      get: vi.fn().mockResolvedValue([]),
    });

    const result = await handleGetTemplates(client, { project_id: 1 });
    expect(result.content[0].text).toContain('No templates found');
  });
});

describe('handleGetUsers', () => {
  it('should return formatted users', async () => {
    const client = createMockClient({
      getCached: vi.fn().mockResolvedValue([
        { id: 1, name: 'John Doe', email: 'john@example.com', is_active: true, role_id: 1, role: 'Admin' },
      ]),
    });

    const result = await handleGetUsers(client, {});
    expect(result.content[0].text).toContain('John Doe');
    expect(result.structuredContent.users).toHaveLength(1);
  });

  it('should filter users by project', async () => {
    const getCachedSpy = vi.fn().mockResolvedValue([]);
    const client = createMockClient({ getCached: getCachedSpy });

    await handleGetUsers(client, { project_id: 42 });
    expect(getCachedSpy).toHaveBeenCalledWith('get_users/42', 'users_42');
  });
});

describe('handleGetSuites', () => {
  it('should return formatted suites', async () => {
    const client = createMockClient({
      getPaginated: vi.fn().mockResolvedValue({
        offset: 0, limit: 250, size: 1, _links: { next: null, prev: null },
        items: [
          { id: 1, name: 'Master Suite', description: 'Main suite', url: 'https://example.testrail.io/suites/1', project_id: 1, is_master: true, is_baseline: false, is_completed: false },
        ],
      }),
    });

    const result = await handleGetSuites(client, { project_id: 1 });
    expect(result.content[0].text).toContain('Master Suite');
    expect(result.structuredContent.suites).toHaveLength(1);
  });
});

describe('handleGetSections', () => {
  it('should return formatted sections', async () => {
    const client = createMockClient({
      getPaginated: vi.fn().mockResolvedValue({
        offset: 0, limit: 250, size: 2, _links: { next: null, prev: null },
        items: [
          { id: 1, name: 'Login', depth: 0, parent_id: null, display_order: 1, suite_id: 1, description: null },
          { id: 2, name: 'Sub-Login', depth: 1, parent_id: 1, display_order: 1, suite_id: 1, description: 'Sub section' },
        ],
      }),
    });

    const result = await handleGetSections(client, { project_id: 1 });
    expect(result.content[0].text).toContain('Login');
    expect(result.structuredContent.sections).toHaveLength(2);
  });

  it('should pass suite_id filter', async () => {
    const getPaginatedSpy = vi.fn().mockResolvedValue({
      offset: 0, limit: 250, size: 0, _links: { next: null, prev: null }, items: [],
    });
    const client = createMockClient({ getPaginated: getPaginatedSpy });

    await handleGetSections(client, { project_id: 1, suite_id: 5 });
    expect(getPaginatedSpy.mock.calls[0][1].suite_id).toBe(5);
  });
});
