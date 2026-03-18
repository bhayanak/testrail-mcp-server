import { z } from 'zod';
import type { TestRailClient } from '../testrail/client.js';
import type { Status, Priority, CaseType, User, Suite, Section, Template, CaseField, ResultField } from '../testrail/types.js';
import { formatStatuses, formatUsers, formatSuites, formatSections } from '../formatter.js';

// ─── Statuses ────────────────────────────────────────────────────

export const getStatusesSchema = {};

export async function handleGetStatuses(client: TestRailClient) {
  const statuses = await client.getCached<Status[]>('get_statuses', 'statuses');
  return {
    content: [{ type: 'text' as const, text: formatStatuses(statuses) }],
    structuredContent: { statuses },
  };
}

// ─── Priorities ──────────────────────────────────────────────────

export const getPrioritiesSchema = {};

export async function handleGetPriorities(client: TestRailClient) {
  const priorities = await client.getCached<Priority[]>('get_priorities', 'priorities');
  const text = priorities.length === 0
    ? 'No priorities found.'
    : `# Priorities (${priorities.length})\n\n` +
      priorities.map((p) => `- **[${p.id}] ${p.name}** (${p.short_name}) — Default: ${p.is_default ? 'Yes' : 'No'}`).join('\n');
  return {
    content: [{ type: 'text' as const, text }],
    structuredContent: { priorities },
  };
}

// ─── Case Types ──────────────────────────────────────────────────

export const getCaseTypesSchema = {};

export async function handleGetCaseTypes(client: TestRailClient) {
  const caseTypes = await client.getCached<CaseType[]>('get_case_types', 'case_types');
  const text = caseTypes.length === 0
    ? 'No case types found.'
    : `# Case Types (${caseTypes.length})\n\n` +
      caseTypes.map((t) => `- **[${t.id}] ${t.name}** — Default: ${t.is_default ? 'Yes' : 'No'}`).join('\n');
  return {
    content: [{ type: 'text' as const, text }],
    structuredContent: { caseTypes },
  };
}

// ─── Case Fields ─────────────────────────────────────────────────

export const getCaseFieldsSchema = {};

export async function handleGetCaseFields(client: TestRailClient) {
  const caseFields = await client.getCached<CaseField[]>('get_case_fields', 'case_fields');
  const text = caseFields.length === 0
    ? 'No case fields found.'
    : `# Case Fields (${caseFields.length})\n\n` +
      caseFields.map((f) => `- **${f.label}** (${f.system_name}) — Type: ${f.type_id}, Active: ${f.is_active ? 'Yes' : 'No'}`).join('\n');
  return {
    content: [{ type: 'text' as const, text }],
    structuredContent: { caseFields },
  };
}

// ─── Result Fields ───────────────────────────────────────────────

export const getResultFieldsSchema = {};

export async function handleGetResultFields(client: TestRailClient) {
  const resultFields = await client.getCached<ResultField[]>('get_result_fields', 'result_fields');
  const text = resultFields.length === 0
    ? 'No result fields found.'
    : `# Result Fields (${resultFields.length})\n\n` +
      resultFields.map((f) => `- **${f.label}** (${f.system_name}) — Type: ${f.type_id}, Active: ${f.is_active ? 'Yes' : 'No'}`).join('\n');
  return {
    content: [{ type: 'text' as const, text }],
    structuredContent: { resultFields },
  };
}

// ─── Templates ───────────────────────────────────────────────────

export const getTemplatesSchema = {
  project_id: z.number().int().positive().optional().describe('TestRail project ID (defaults to configured project)'),
};

export async function handleGetTemplates(
  client: TestRailClient,
  params: { project_id: number },
) {
  const templates = await client.get<Template[]>(`get_templates/${params.project_id}`);
  const text = templates.length === 0
    ? 'No templates found.'
    : `# Templates (${templates.length})\n\n` +
      templates.map((t) => `- **[${t.id}] ${t.name}** — Default: ${t.is_default ? 'Yes' : 'No'}`).join('\n');
  return {
    content: [{ type: 'text' as const, text }],
    structuredContent: { templates },
  };
}

// ─── Users ───────────────────────────────────────────────────────

export const getUsersSchema = {
  project_id: z.number().int().positive().optional().describe('Filter users by project ID'),
};

export async function handleGetUsers(
  client: TestRailClient,
  params: { project_id?: number },
) {
  const endpoint = params.project_id ? `get_users/${params.project_id}` : 'get_users';
  const users = await client.getCached<User[]>(endpoint, `users_${params.project_id ?? 'all'}`);
  return {
    content: [{ type: 'text' as const, text: formatUsers(users) }],
    structuredContent: { users },
  };
}

// ─── Suites ──────────────────────────────────────────────────────

export const getSuitesSchema = {
  project_id: z.number().int().positive().optional().describe('TestRail project ID (defaults to configured project)'),
};

export async function handleGetSuites(
  client: TestRailClient,
  params: { project_id: number },
) {
  const response = await client.getPaginated<Suite>(`get_suites/${params.project_id}`, {});
  return {
    content: [{ type: 'text' as const, text: formatSuites(response.items) }],
    structuredContent: { suites: response.items },
  };
}

// ─── Sections ────────────────────────────────────────────────────

export const getSectionsSchema = {
  project_id: z.number().int().positive().optional().describe('TestRail project ID (defaults to configured project)'),
  suite_id: z.number().int().positive().optional().describe('Suite ID (required for multi-suite projects)'),
};

export async function handleGetSections(
  client: TestRailClient,
  params: { project_id: number; suite_id?: number },
) {
  const queryParams: Record<string, string | number | boolean> = {};
  if (params.suite_id) queryParams.suite_id = params.suite_id;

  const response = await client.getPaginated<Section>(
    `get_sections/${params.project_id}`,
    queryParams,
  );

  return {
    content: [{ type: 'text' as const, text: formatSections(response.items) }],
    structuredContent: { sections: response.items },
  };
}
