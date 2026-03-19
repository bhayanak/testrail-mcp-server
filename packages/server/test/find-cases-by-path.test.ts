import { describe, it, expect, vi } from 'vitest';
import { handleFindCasesByPath } from '../src/tools/find-cases-by-path.js';

function createMockClient(overrides: Record<string, unknown> = {}) {
  return {
    get: vi.fn(),
    post: vi.fn(),
    getPaginated: vi.fn(),
    getCached: vi.fn(),
    clearCache: vi.fn(),
    ...overrides,
  } as any;
}

describe('handleFindCasesByPath', () => {
  it('should find cases by suite name and section path', async () => {
    const client = createMockClient({
      getPaginated: vi
        .fn()
        .mockResolvedValueOnce({
          // get_suites
          offset: 0,
          limit: 250,
          size: 2,
          _links: { next: null, prev: null },
          items: [
            {
              id: 10,
              name: 'Other Suite',
              project_id: 1,
              is_master: false,
              is_baseline: false,
              is_completed: false,
            },
            {
              id: 20,
              name: 'PCAI Test Suite',
              project_id: 1,
              is_master: false,
              is_baseline: false,
              is_completed: false,
            },
          ],
        })
        .mockResolvedValueOnce({
          // get_sections
          offset: 0,
          limit: 250,
          size: 3,
          _links: { next: null, prev: null },
          items: [
            {
              id: 100,
              name: 'PCAI FQA',
              parent_id: null,
              depth: 0,
              suite_id: 20,
              display_order: 1,
              description: null,
            },
            {
              id: 200,
              name: 'Setup',
              parent_id: 100,
              depth: 1,
              suite_id: 20,
              display_order: 1,
              description: null,
            },
            {
              id: 300,
              name: 'Other',
              parent_id: null,
              depth: 0,
              suite_id: 20,
              display_order: 2,
              description: null,
            },
          ],
        })
        .mockResolvedValueOnce({
          // get_cases
          offset: 0,
          limit: 250,
          size: 2,
          _links: { next: null, prev: null },
          items: [
            {
              id: 1001,
              title: 'Test Case 1',
              section_id: 200,
              priority_id: 1,
              type_id: 1,
              suite_id: 20,
              template_id: 1,
              milestone_id: null,
              refs: null,
              created_by: 1,
              created_on: 0,
              updated_by: 1,
              updated_on: 0,
              estimate: null,
              estimate_forecast: null,
              display_order: 1,
              is_deleted: 0,
              custom_preconds: null,
              custom_steps: null,
              custom_expected: null,
              custom_steps_separated: null,
            },
            {
              id: 1002,
              title: 'Test Case 2',
              section_id: 200,
              priority_id: 2,
              type_id: 1,
              suite_id: 20,
              template_id: 1,
              milestone_id: null,
              refs: null,
              created_by: 1,
              created_on: 0,
              updated_by: 1,
              updated_on: 0,
              estimate: null,
              estimate_forecast: null,
              display_order: 2,
              is_deleted: 0,
              custom_preconds: null,
              custom_steps: null,
              custom_expected: null,
              custom_steps_separated: null,
            },
          ],
        }),
      getCached: vi.fn().mockResolvedValue([
        { id: 1, name: 'P1', short_name: 'P1', is_default: false, priority: 1 },
        { id: 2, name: 'P2', short_name: 'P2', is_default: false, priority: 2 },
      ]),
    });

    const result = await handleFindCasesByPath(client, {
      project_id: 1,
      suite_name: 'PCAI Test Suite',
      section_path: 'PCAI FQA > Setup',
    });

    expect(result.content[0].text).toContain('Test Case 1');
    expect(result.content[0].text).toContain('Test Case 2');
    expect(result.content[0].text).toContain('C1001');
    expect(result.content[0].text).toContain('C1002');
    expect(result.structuredContent?.cases).toHaveLength(2);
  });

  it('should return error if suite not found', async () => {
    const client = createMockClient({
      getPaginated: vi.fn().mockResolvedValueOnce({
        offset: 0,
        limit: 250,
        size: 1,
        _links: { next: null, prev: null },
        items: [
          {
            id: 10,
            name: 'Some Other Suite',
            project_id: 1,
            is_master: false,
            is_baseline: false,
            is_completed: false,
          },
        ],
      }),
    });

    await expect(
      handleFindCasesByPath(client, {
        project_id: 1,
        suite_name: 'Nonexistent Suite',
        section_path: 'Section',
      }),
    ).rejects.toThrow('not found');
  });

  it('should return error if section path not found', async () => {
    const client = createMockClient({
      getPaginated: vi
        .fn()
        .mockResolvedValueOnce({
          offset: 0,
          limit: 250,
          size: 1,
          _links: { next: null, prev: null },
          items: [
            {
              id: 20,
              name: 'My Suite',
              project_id: 1,
              is_master: false,
              is_baseline: false,
              is_completed: false,
            },
          ],
        })
        .mockResolvedValueOnce({
          offset: 0,
          limit: 250,
          size: 1,
          _links: { next: null, prev: null },
          items: [
            {
              id: 100,
              name: 'Different Section',
              parent_id: null,
              depth: 0,
              suite_id: 20,
              display_order: 1,
              description: null,
            },
          ],
        }),
    });

    await expect(
      handleFindCasesByPath(client, {
        project_id: 1,
        suite_name: 'My Suite',
        section_path: 'Nonexistent > Path',
      }),
    ).rejects.toThrow('not found');
  });

  it('should handle empty section path', async () => {
    const client = createMockClient();

    await expect(
      handleFindCasesByPath(client, {
        project_id: 1,
        suite_name: 'My Suite',
        section_path: '',
      }),
    ).rejects.toThrow('at least one section name');
  });

  it('should handle no cases found', async () => {
    const client = createMockClient({
      getPaginated: vi
        .fn()
        .mockResolvedValueOnce({
          offset: 0,
          limit: 250,
          size: 1,
          _links: { next: null, prev: null },
          items: [
            {
              id: 20,
              name: 'My Suite',
              project_id: 1,
              is_master: false,
              is_baseline: false,
              is_completed: false,
            },
          ],
        })
        .mockResolvedValueOnce({
          offset: 0,
          limit: 250,
          size: 1,
          _links: { next: null, prev: null },
          items: [
            {
              id: 100,
              name: 'Empty Section',
              parent_id: null,
              depth: 0,
              suite_id: 20,
              display_order: 1,
              description: null,
            },
          ],
        })
        .mockResolvedValueOnce({
          offset: 0,
          limit: 250,
          size: 0,
          _links: { next: null, prev: null },
          items: [],
        }),
      getCached: vi.fn().mockResolvedValue([]),
    });

    const result = await handleFindCasesByPath(client, {
      project_id: 1,
      suite_name: 'My Suite',
      section_path: 'Empty Section',
    });

    expect(result.content[0].text).toContain('No test cases found');
    expect(result.structuredContent?.cases).toHaveLength(0);
  });
});
