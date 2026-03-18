import { z } from 'zod';
import type { TestRailClient } from '../testrail/client.js';
import type { Project } from '../testrail/types.js';
import { formatProjects, formatProject } from '../formatter.js';

export const getProjectsSchema = {
  is_completed: z.boolean().optional().describe('Filter by completion status'),
};

export async function handleGetProjects(
  client: TestRailClient,
  params: { is_completed?: boolean },
) {
  const queryParams: Record<string, string | number | boolean> = {};
  if (params.is_completed !== undefined) {
    queryParams.is_completed = params.is_completed ? 1 : 0;
  }
  const projects = await client.get<Project[]>('get_projects', queryParams);
  const items = Array.isArray(projects) ? projects : [];
  return {
    content: [{ type: 'text' as const, text: formatProjects(items) }],
    structuredContent: { projects: items },
  };
}

export const getProjectSchema = {
  project_id: z.number().int().positive().describe('TestRail project ID'),
};

export async function handleGetProject(
  client: TestRailClient,
  params: { project_id: number },
) {
  const project = await client.get<Project>(`get_project/${params.project_id}`);
  return {
    content: [{ type: 'text' as const, text: formatProject(project) }],
    structuredContent: { project },
  };
}
