import { z } from 'zod';
import type { TestRailClient } from '../testrail/client.js';
import type { Result } from '../testrail/types.js';
import { statusLabel } from '../formatter.js';

export const addResultForCaseSchema = {
  run_id: z.number().int().positive().describe('TestRail run ID'),
  case_id: z.number().int().positive().describe('TestRail case ID'),
  status_id: z
    .number()
    .int()
    .min(1)
    .describe('Status ID (1=Passed, 2=Blocked, 4=Retest, 5=Failed)'),
  comment: z.string().max(50000).optional().describe('Result comment'),
  elapsed: z.string().max(50).optional().describe('Time spent (e.g., "30s", "1m 45s")'),
  defects: z.string().max(1000).optional().describe('Comma-separated defect IDs'),
  version: z.string().max(250).optional().describe('Version or build'),
};

export async function handleAddResultForCase(
  client: TestRailClient,
  params: {
    run_id: number;
    case_id: number;
    status_id: number;
    comment?: string;
    elapsed?: string;
    defects?: string;
    version?: string;
  },
) {
  const body: Record<string, unknown> = { status_id: params.status_id };
  if (params.comment) body.comment = params.comment;
  if (params.elapsed) body.elapsed = params.elapsed;
  if (params.defects) body.defects = params.defects;
  if (params.version) body.version = params.version;

  const result = await client.post<Result>(
    `add_result_for_case/${params.run_id}/${params.case_id}`,
    body,
  );

  return {
    content: [
      {
        type: 'text' as const,
        text: `Result added for case C${params.case_id} in run R${params.run_id}: **${statusLabel(params.status_id)}** (Result ID: ${result.id})`,
      },
    ],
    structuredContent: { result },
  };
}

export const addResultsForCasesSchema = {
  run_id: z.number().int().positive().describe('TestRail run ID'),
  results: z
    .array(
      z.object({
        case_id: z.number().int().positive().describe('TestRail case ID'),
        status_id: z.number().int().min(1).describe('Status ID'),
        comment: z.string().max(50000).optional().describe('Result comment'),
        elapsed: z.string().max(50).optional().describe('Time spent'),
        defects: z.string().max(1000).optional().describe('Defect IDs'),
      }),
    )
    .min(1)
    .max(250)
    .describe('Array of results to submit'),
};

export async function handleAddResultsForCases(
  client: TestRailClient,
  params: {
    run_id: number;
    results: Array<{
      case_id: number;
      status_id: number;
      comment?: string;
      elapsed?: string;
      defects?: string;
    }>;
  },
) {
  const results = await client.post<Result[]>(`add_results_for_cases/${params.run_id}`, {
    results: params.results,
  });

  const items = Array.isArray(results) ? results : [];
  return {
    content: [
      {
        type: 'text' as const,
        text:
          `Added ${items.length} result(s) for run R${params.run_id}:\n` +
          params.results.map((r) => `- C${r.case_id}: ${statusLabel(r.status_id)}`).join('\n'),
      },
    ],
    structuredContent: { results: items },
  };
}
