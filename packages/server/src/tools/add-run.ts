import { z } from 'zod';
import type { TestRailClient } from '../testrail/client.js';
import type { Run } from '../testrail/types.js';
import { formatRun } from '../formatter.js';

export const addRunSchema = {
  project_id: z.number().int().positive().optional().describe('TestRail project ID (defaults to configured project)'),
  suite_id: z.number().int().positive().optional().describe('Suite ID (required for multi-suite projects)'),
  name: z.string().min(1).max(250).describe('Run name'),
  description: z.string().max(50000).optional().describe('Run description'),
  milestone_id: z.number().int().positive().optional().describe('Milestone ID'),
  assignedto_id: z.number().int().positive().optional().describe('Assigned user ID'),
  include_all: z.boolean().optional().describe('Include all test cases (default true)'),
  case_ids: z.array(z.number().int().positive()).max(2000).optional().describe('Specific case IDs to include'),
};

export async function handleAddRun(
  client: TestRailClient,
  params: {
    project_id: number;
    suite_id?: number;
    name: string;
    description?: string;
    milestone_id?: number;
    assignedto_id?: number;
    include_all?: boolean;
    case_ids?: number[];
  },
) {
  const body: Record<string, unknown> = { name: params.name };
  if (params.suite_id) body.suite_id = params.suite_id;
  if (params.description) body.description = params.description;
  if (params.milestone_id) body.milestone_id = params.milestone_id;
  if (params.assignedto_id) body.assignedto_id = params.assignedto_id;
  if (params.include_all !== undefined) body.include_all = params.include_all;
  if (params.case_ids) body.case_ids = params.case_ids;

  const run = await client.post<Run>(`add_run/${params.project_id}`, body);

  return {
    content: [
      {
        type: 'text' as const,
        text: `Created run R${run.id}: "${run.name}"\n\n` + formatRun(run),
      },
    ],
    structuredContent: { run },
  };
}

export const closeRunSchema = {
  run_id: z.number().int().positive().describe('TestRail run ID to close'),
};

export async function handleCloseRun(
  client: TestRailClient,
  params: { run_id: number },
) {
  const run = await client.post<Run>(`close_run/${params.run_id}`);
  return {
    content: [
      {
        type: 'text' as const,
        text: `Closed run R${run.id}: "${run.name}"\n\n` + formatRun(run),
      },
    ],
    structuredContent: { run },
  };
}
