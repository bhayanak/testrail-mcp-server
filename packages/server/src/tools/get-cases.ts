import { z } from 'zod';
import type { TestRailClient } from '../testrail/client.js';
import type { Case } from '../testrail/types.js';
import { formatCases, formatCase } from '../formatter.js';

export const getCasesSchema = {
  project_id: z.number().int().positive().optional().describe('TestRail project ID (defaults to configured project)'),
  suite_id: z.number().int().positive().optional().describe('Suite ID (required for multi-suite projects)'),
  section_id: z.number().int().positive().optional().describe('Section ID to filter cases'),
  priority_id: z.string().max(100).optional().describe('Comma-separated priority IDs to filter'),
  type_id: z.string().max(100).optional().describe('Comma-separated type IDs to filter'),
  filter: z.string().max(10000).optional().describe('Title search filter'),
  limit: z.number().int().min(1).max(250).optional().describe('Max results per page (default 250)'),
  offset: z.number().int().min(0).optional().describe('Pagination offset'),
};

export async function handleGetCases(
  client: TestRailClient,
  params: {
    project_id: number;
    suite_id?: number;
    section_id?: number;
    priority_id?: string;
    type_id?: string;
    filter?: string;
    limit?: number;
    offset?: number;
  },
) {
  const queryParams: Record<string, string | number | boolean> = {};
  if (params.suite_id) queryParams.suite_id = params.suite_id;
  if (params.section_id) queryParams.section_id = params.section_id;
  if (params.priority_id) queryParams.priority_id = params.priority_id;
  if (params.type_id) queryParams.type_id = params.type_id;
  if (params.filter) queryParams.filter = params.filter;
  if (params.limit) queryParams.limit = params.limit;
  if (params.offset) queryParams.offset = params.offset;

  const response = await client.getPaginated<Case>(
    `get_cases/${params.project_id}`,
    queryParams,
  );

  return {
    content: [
      {
        type: 'text' as const,
        text: formatCases(response.items, {
          offset: response.offset,
          size: response.size,
          limit: response.limit,
        }),
      },
    ],
    structuredContent: {
      cases: response.items,
      pagination: {
        offset: response.offset,
        limit: response.limit,
        size: response.size,
        hasMore: response._links?.next !== null,
      },
    },
  };
}

export const getCaseSchema = {
  case_id: z.number().int().positive().describe('TestRail case ID'),
};

export async function handleGetCase(
  client: TestRailClient,
  params: { case_id: number },
) {
  const testCase = await client.get<Case>(`get_case/${params.case_id}`);
  return {
    content: [{ type: 'text' as const, text: formatCase(testCase) }],
    structuredContent: { case: testCase },
  };
}
