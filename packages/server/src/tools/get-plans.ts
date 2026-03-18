import { z } from 'zod';
import type { TestRailClient } from '../testrail/client.js';
import type { Plan } from '../testrail/types.js';
import { formatPlans, formatPlan } from '../formatter.js';

export const getPlansSchema = {
  project_id: z.number().int().positive().optional().describe('TestRail project ID (defaults to configured project)'),
  is_completed: z.boolean().optional().describe('Filter by completion status'),
  milestone_id: z.string().max(100).optional().describe('Comma-separated milestone IDs'),
};

export async function handleGetPlans(
  client: TestRailClient,
  params: {
    project_id: number;
    is_completed?: boolean;
    milestone_id?: string;
  },
) {
  const queryParams: Record<string, string | number | boolean> = {};
  if (params.is_completed !== undefined) queryParams.is_completed = params.is_completed ? 1 : 0;
  if (params.milestone_id) queryParams.milestone_id = params.milestone_id;

  const response = await client.getPaginated<Plan>(
    `get_plans/${params.project_id}`,
    queryParams,
  );

  return {
    content: [{ type: 'text' as const, text: formatPlans(response.items) }],
    structuredContent: { plans: response.items },
  };
}

export const getPlanSchema = {
  plan_id: z.number().int().positive().describe('TestRail plan ID'),
};

export async function handleGetPlan(
  client: TestRailClient,
  params: { plan_id: number },
) {
  const plan = await client.get<Plan>(`get_plan/${params.plan_id}`);
  return {
    content: [{ type: 'text' as const, text: formatPlan(plan) }],
    structuredContent: { plan },
  };
}
