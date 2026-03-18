import { z } from 'zod';
import type { TestRailClient } from '../testrail/client.js';
import type { Run } from '../testrail/types.js';
import { formatRuns, formatRun } from '../formatter.js';

export const getRunsSchema = {
  project_id: z.number().int().positive().optional().describe('TestRail project ID (defaults to configured project)'),
  is_completed: z.boolean().optional().describe('Filter by completion status'),
  milestone_id: z.string().max(100).optional().describe('Comma-separated milestone IDs'),
  limit: z.number().int().min(1).max(250).optional().describe('Max results per page'),
  offset: z.number().int().min(0).optional().describe('Pagination offset'),
};

export async function handleGetRuns(
  client: TestRailClient,
  params: {
    project_id: number;
    is_completed?: boolean;
    milestone_id?: string;
    limit?: number;
    offset?: number;
  },
) {
  const queryParams: Record<string, string | number | boolean> = {};
  if (params.is_completed !== undefined) queryParams.is_completed = params.is_completed ? 1 : 0;
  if (params.milestone_id) queryParams.milestone_id = params.milestone_id;
  if (params.limit) queryParams.limit = params.limit;
  if (params.offset) queryParams.offset = params.offset;

  const response = await client.getPaginated<Run>(
    `get_runs/${params.project_id}`,
    queryParams,
  );

  return {
    content: [
      {
        type: 'text' as const,
        text: formatRuns(response.items, {
          offset: response.offset,
          size: response.size,
          limit: response.limit,
        }),
      },
    ],
    structuredContent: {
      runs: response.items,
      pagination: {
        offset: response.offset,
        limit: response.limit,
        size: response.size,
        hasMore: response._links?.next !== null,
      },
    },
  };
}

export const getRunSchema = {
  run_id: z.number().int().positive().describe('TestRail run ID'),
};

export async function handleGetRun(
  client: TestRailClient,
  params: { run_id: number },
) {
  const run = await client.get<Run>(`get_run/${params.run_id}`);
  return {
    content: [{ type: 'text' as const, text: formatRun(run) }],
    structuredContent: { run },
  };
}
