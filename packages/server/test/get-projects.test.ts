import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleGetProjects, handleGetProject } from '../src/tools/get-projects.js';
import { TestRailClient, TestRailApiError } from '../src/testrail/client.js';
import projectsFixture from './fixtures/projects.json';

vi.mock('../src/testrail/client.js', () => ({
  TestRailClient: vi.fn(),
  TestRailApiError: class extends Error {
    statusCode: number;
    responseBody: string;
    constructor(message: string, statusCode: number, responseBody: string) {
      super(message);
      this.name = 'TestRailApiError';
      this.statusCode = statusCode;
      this.responseBody = responseBody;
    }
  },
}));

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

describe('handleGetProjects', () => {
  it('should return formatted projects', async () => {
    const client = createMockClient({
      get: vi.fn().mockResolvedValue(projectsFixture),
    });

    const result = await handleGetProjects(client, {});
    expect(result.content[0].text).toContain('Projects (3)');
    expect(result.structuredContent.projects).toHaveLength(3);
  });

  it('should handle empty projects', async () => {
    const client = createMockClient({
      get: vi.fn().mockResolvedValue([]),
    });

    const result = await handleGetProjects(client, {});
    expect(result.content[0].text).toContain('No projects found');
  });

  it('should pass is_completed filter', async () => {
    const getSpy = vi.fn().mockResolvedValue([]);
    const client = createMockClient({ get: getSpy });

    await handleGetProjects(client, { is_completed: true });
    expect(getSpy).toHaveBeenCalledWith('get_projects', { is_completed: 1 });
  });
});

describe('handleGetProject', () => {
  it('should return formatted project', async () => {
    const client = createMockClient({
      get: vi.fn().mockResolvedValue(projectsFixture[0]),
    });

    const result = await handleGetProject(client, { project_id: 1 });
    expect(result.content[0].text).toContain('E-Commerce Platform');
    expect(result.structuredContent.project).toBeDefined();
  });
});
