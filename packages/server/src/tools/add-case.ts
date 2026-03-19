import { z } from 'zod';
import type { TestRailClient } from '../testrail/client.js';
import type { Case } from '../testrail/types.js';
import { formatCase } from '../formatter.js';

export const addCaseSchema = {
  section_id: z.number().int().positive().describe('Section ID to add the case to'),
  title: z.string().min(1).max(250).describe('Test case title'),
  type_id: z.number().int().positive().optional().describe('Case type ID'),
  priority_id: z.number().int().positive().optional().describe('Priority ID'),
  estimate: z.string().max(50).optional().describe('Time estimate (e.g., "30s", "1m 45s")'),
  milestone_id: z.number().int().positive().optional().describe('Milestone ID'),
  refs: z.string().max(1000).optional().describe('Reference IDs (e.g., ticket numbers)'),
  custom_steps_separated: z
    .array(
      z.object({
        content: z.string().max(10000).describe('Step description'),
        expected: z.string().max(10000).describe('Expected result'),
      }),
    )
    .max(100)
    .optional()
    .describe('Separated test steps with expected results'),
  custom_preconds: z.string().max(10000).optional().describe('Preconditions'),
  custom_steps: z.string().max(50000).optional().describe('Steps (text format)'),
  custom_expected: z.string().max(50000).optional().describe('Expected result (text format)'),
};

export async function handleAddCase(
  client: TestRailClient,
  params: {
    section_id: number;
    title: string;
    type_id?: number;
    priority_id?: number;
    estimate?: string;
    milestone_id?: number;
    refs?: string;
    custom_steps_separated?: Array<{ content: string; expected: string }>;
    custom_preconds?: string;
    custom_steps?: string;
    custom_expected?: string;
  },
) {
  const body: Record<string, unknown> = { title: params.title };
  if (params.type_id) body.type_id = params.type_id;
  if (params.priority_id) body.priority_id = params.priority_id;
  if (params.estimate) body.estimate = params.estimate;
  if (params.milestone_id) body.milestone_id = params.milestone_id;
  if (params.refs) body.refs = params.refs;
  if (params.custom_steps_separated) body.custom_steps_separated = params.custom_steps_separated;
  if (params.custom_preconds) body.custom_preconds = params.custom_preconds;
  if (params.custom_steps) body.custom_steps = params.custom_steps;
  if (params.custom_expected) body.custom_expected = params.custom_expected;

  const testCase = await client.post<Case>(`add_case/${params.section_id}`, body);

  return {
    content: [
      {
        type: 'text' as const,
        text: `Created case C${testCase.id}: "${testCase.title}"\n\n` + formatCase(testCase),
      },
    ],
    structuredContent: { case: testCase },
  };
}

export const updateCaseSchema = {
  case_id: z.number().int().positive().describe('TestRail case ID to update'),
  title: z.string().min(1).max(250).optional().describe('Updated title'),
  type_id: z.number().int().positive().optional().describe('Updated type ID'),
  priority_id: z.number().int().positive().optional().describe('Updated priority ID'),
  estimate: z.string().max(50).optional().describe('Updated time estimate'),
  milestone_id: z.number().int().positive().optional().describe('Updated milestone ID'),
  refs: z.string().max(1000).optional().describe('Updated reference IDs'),
  custom_steps_separated: z
    .array(
      z.object({
        content: z.string().max(10000).describe('Step description'),
        expected: z.string().max(10000).describe('Expected result'),
      }),
    )
    .max(100)
    .optional()
    .describe('Updated separated test steps'),
  custom_preconds: z.string().max(10000).optional().describe('Updated preconditions'),
  custom_steps: z.string().max(50000).optional().describe('Updated steps'),
  custom_expected: z.string().max(50000).optional().describe('Updated expected result'),
};

export async function handleUpdateCase(
  client: TestRailClient,
  params: {
    case_id: number;
    title?: string;
    type_id?: number;
    priority_id?: number;
    estimate?: string;
    milestone_id?: number;
    refs?: string;
    custom_steps_separated?: Array<{ content: string; expected: string }>;
    custom_preconds?: string;
    custom_steps?: string;
    custom_expected?: string;
  },
) {
  const { case_id, ...body } = params;
  // Filter out undefined
  const cleanBody: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    if (v !== undefined) cleanBody[k] = v;
  }

  const testCase = await client.post<Case>(`update_case/${case_id}`, cleanBody);

  return {
    content: [
      {
        type: 'text' as const,
        text: `Updated case C${testCase.id}: "${testCase.title}"\n\n` + formatCase(testCase),
      },
    ],
    structuredContent: { case: testCase },
  };
}
