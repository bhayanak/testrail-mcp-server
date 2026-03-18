import { z } from 'zod';
import type { TestRailClient } from '../testrail/client.js';
import type { Result } from '../testrail/types.js';
import { formatResults } from '../formatter.js';

export const getResultsForRunSchema = {
  run_id: z.number().int().positive().describe('TestRail run ID'),
  status_id: z.string().max(100).optional().describe('Comma-separated status IDs to filter'),
  limit: z.number().int().min(1).max(250).optional().describe('Max results per page'),
  offset: z.number().int().min(0).optional().describe('Pagination offset'),
};

export async function handleGetResultsForRun(
  client: TestRailClient,
  params: {
    run_id: number;
    status_id?: string;
    limit?: number;
    offset?: number;
  },
) {
  const queryParams: Record<string, string | number | boolean> = {};
  if (params.status_id) queryParams.status_id = params.status_id;
  if (params.limit) queryParams.limit = params.limit;
  if (params.offset) queryParams.offset = params.offset;

  const response = await client.getPaginated<Result>(
    `get_results_for_run/${params.run_id}`,
    queryParams,
  );

  return {
    content: [
      {
        type: 'text' as const,
        text: formatResults(response.items, {
          offset: response.offset,
          size: response.size,
          limit: response.limit,
        }),
      },
    ],
    structuredContent: {
      results: response.items,
      pagination: {
        offset: response.offset,
        limit: response.limit,
        size: response.size,
        hasMore: response._links?.next !== null,
      },
    },
  };
}

export const getResultsForCaseSchema = {
  run_id: z.number().int().positive().describe('TestRail run ID'),
  case_id: z.number().int().positive().describe('TestRail case ID'),
  limit: z.number().int().min(1).max(250).optional().describe('Max results to return'),
};

export async function handleGetResultsForCase(
  client: TestRailClient,
  params: { run_id: number; case_id: number; limit?: number },
) {
  const queryParams: Record<string, string | number | boolean> = {};
  if (params.limit) queryParams.limit = params.limit;

  const response = await client.getPaginated<Result>(
    `get_results_for_case/${params.run_id}/${params.case_id}`,
    queryParams,
  );

  return {
    content: [
      {
        type: 'text' as const,
        text: formatResults(response.items),
      },
    ],
    structuredContent: {
      results: response.items,
    },
  };
}
