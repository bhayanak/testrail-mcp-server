import { z } from 'zod';
import type { TestRailClient } from '../testrail/client.js';
import type { Test } from '../testrail/types.js';
import { formatTests } from '../formatter.js';

export const getTestsSchema = {
  run_id: z.number().int().positive().describe('TestRail run ID'),
  status_id: z.string().max(100).optional().describe('Comma-separated status IDs to filter'),
};

export async function handleGetTests(
  client: TestRailClient,
  params: { run_id: number; status_id?: string },
) {
  const queryParams: Record<string, string | number | boolean> = {};
  if (params.status_id) queryParams.status_id = params.status_id;

  const response = await client.getPaginated<Test>(`get_tests/${params.run_id}`, queryParams);

  return {
    content: [{ type: 'text' as const, text: formatTests(response.items) }],
    structuredContent: {
      tests: response.items,
    },
  };
}
