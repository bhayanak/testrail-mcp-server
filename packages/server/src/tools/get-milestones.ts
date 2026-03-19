import { z } from 'zod';
import type { TestRailClient } from '../testrail/client.js';
import type { Milestone } from '../testrail/types.js';
import { formatMilestones } from '../formatter.js';

export const getMilestonesSchema = {
  project_id: z
    .number()
    .int()
    .positive()
    .optional()
    .describe('TestRail project ID (defaults to configured project)'),
  is_completed: z.boolean().optional().describe('Filter by completion status'),
  is_started: z.boolean().optional().describe('Filter by started status'),
};

export async function handleGetMilestones(
  client: TestRailClient,
  params: {
    project_id: number;
    is_completed?: boolean;
    is_started?: boolean;
  },
) {
  const queryParams: Record<string, string | number | boolean> = {};
  if (params.is_completed !== undefined) queryParams.is_completed = params.is_completed ? 1 : 0;
  if (params.is_started !== undefined) queryParams.is_started = params.is_started ? 1 : 0;

  const response = await client.getPaginated<Milestone>(
    `get_milestones/${params.project_id}`,
    queryParams,
  );

  return {
    content: [{ type: 'text' as const, text: formatMilestones(response.items) }],
    structuredContent: { milestones: response.items },
  };
}
