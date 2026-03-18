import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { TestRailConfig } from './testrail/types.js';
import { TestRailClient, TestRailApiError } from './testrail/client.js';
import { maskConfig } from './config.js';

// Tool handlers
import { getProjectsSchema, handleGetProjects, getProjectSchema, handleGetProject } from './tools/get-projects.js';
import { getCasesSchema, handleGetCases, getCaseSchema, handleGetCase } from './tools/get-cases.js';
import { getRunsSchema, handleGetRuns, getRunSchema, handleGetRun } from './tools/get-runs.js';
import { getResultsForRunSchema, handleGetResultsForRun, getResultsForCaseSchema, handleGetResultsForCase } from './tools/get-results.js';
import { getTestsSchema, handleGetTests } from './tools/get-tests.js';
import { getPlansSchema, handleGetPlans, getPlanSchema, handleGetPlan } from './tools/get-plans.js';
import { getMilestonesSchema, handleGetMilestones } from './tools/get-milestones.js';
import {
  getStatusesSchema, handleGetStatuses,
  getPrioritiesSchema, handleGetPriorities,
  getCaseTypesSchema, handleGetCaseTypes,
  getCaseFieldsSchema, handleGetCaseFields,
  getResultFieldsSchema, handleGetResultFields,
  getTemplatesSchema, handleGetTemplates,
  getUsersSchema, handleGetUsers,
  getSuitesSchema, handleGetSuites,
  getSectionsSchema, handleGetSections,
} from './tools/get-metadata.js';
import { addResultForCaseSchema, handleAddResultForCase, addResultsForCasesSchema, handleAddResultsForCases } from './tools/add-result.js';
import { addRunSchema, handleAddRun, closeRunSchema, handleCloseRun } from './tools/add-run.js';
import { addCaseSchema, handleAddCase, updateCaseSchema, handleUpdateCase } from './tools/add-case.js';
import { findCasesByPathSchema, handleFindCasesByPath } from './tools/find-cases-by-path.js';

const startTime = Date.now();

type ToolResult = { content: Array<{ type: 'text'; text: string }>; structuredContent: Record<string, unknown> };

function wrapHandler<T>(
  handler: (client: TestRailClient, params: T) => Promise<ToolResult>,
  client: TestRailClient,
) {
  return async (params: T) => {
    try {
      return await handler(client, params);
    } catch (error) {
      if (error instanceof TestRailApiError) {
        return {
          content: [{ type: 'text' as const, text: `TestRail API Error (${error.statusCode}): ${error.message}` }],
          isError: true as const,
        };
      }
      const msg = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: 'text' as const, text: `Error: ${msg}` }],
        isError: true as const,
      };
    }
  };
}

/** Resolve optional project_id using configured default */
function withProjectDefault<T extends { project_id?: number }>(
  handler: (client: TestRailClient, params: Omit<T, 'project_id'> & { project_id: number }) => Promise<ToolResult>,
  client: TestRailClient,
  defaultProjectId: number,
) {
  return async (params: T) => {
    try {
      const resolved = { ...params, project_id: params.project_id ?? defaultProjectId } as Omit<T, 'project_id'> & { project_id: number };
      return await handler(client, resolved);
    } catch (error) {
      if (error instanceof TestRailApiError) {
        return {
          content: [{ type: 'text' as const, text: `TestRail API Error (${error.statusCode}): ${error.message}` }],
          isError: true as const,
        };
      }
      const msg = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: 'text' as const, text: `Error: ${msg}` }],
        isError: true as const,
      };
    }
  };
}

export function createServer(config: TestRailConfig) {
  const client = new TestRailClient(config);

  const server = new McpServer({
    name: 'testrail-mcp-server',
    version: '0.1.0',
  });

  // ─── Read-only tools ────────────────────────────────────────

  server.tool(
    'get_projects',
    'List all TestRail projects. Optionally filter by completion status.',
    getProjectsSchema,
    wrapHandler(handleGetProjects, client),
  );

  server.tool(
    'get_project',
    'Get details for a specific TestRail project by ID.',
    getProjectSchema,
    wrapHandler(handleGetProject, client),
  );

  server.tool(
    'get_cases',
    `List test cases in a TestRail project (defaults to project ${config.projectId}). Requires suite_id for multi-suite projects. Use section_id to filter by section. Supports filtering by priority, type, and text search. TIP: If you need to find cases by section name/path, use the find_cases_by_path tool instead.`,
    getCasesSchema,
    withProjectDefault(handleGetCases, client, config.projectId),
  );

  server.tool(
    'get_case',
    'Get full details for a specific test case including steps, preconditions, and custom fields.',
    getCaseSchema,
    wrapHandler(handleGetCase, client),
  );

  server.tool(
    'get_runs',
    'List test runs in a TestRail project. Filter by completion status and milestones.',
    getRunsSchema,
    withProjectDefault(handleGetRuns, client, config.projectId),
  );

  server.tool(
    'get_run',
    'Get detailed info for a specific test run including pass/fail/blocked/untested counts.',
    getRunSchema,
    wrapHandler(handleGetRun, client),
  );

  server.tool(
    'get_results_for_run',
    'Get test results for a specific run. Filter by status IDs.',
    getResultsForRunSchema,
    wrapHandler(handleGetResultsForRun, client),
  );

  server.tool(
    'get_results_for_case',
    'Get result history for a specific test case within a specific run.',
    getResultsForCaseSchema,
    wrapHandler(handleGetResultsForCase, client),
  );

  server.tool(
    'get_tests',
    'List all tests (test instances) in a test run. Filter by status.',
    getTestsSchema,
    wrapHandler(handleGetTests, client),
  );

  server.tool(
    'get_plans',
    'List test plans in a TestRail project. Filter by completion and milestones.',
    getPlansSchema,
    withProjectDefault(handleGetPlans, client, config.projectId),
  );

  server.tool(
    'get_plan',
    'Get detailed info for a test plan including entries and associated runs.',
    getPlanSchema,
    wrapHandler(handleGetPlan, client),
  );

  server.tool(
    'get_milestones',
    'List milestones in a TestRail project. Filter by completion/started status.',
    getMilestonesSchema,
    withProjectDefault(handleGetMilestones, client, config.projectId),
  );

  server.tool(
    'get_statuses',
    'Get all available test statuses (system + custom) with IDs and labels.',
    getStatusesSchema,
    wrapHandler(async () => handleGetStatuses(client), client),
  );

  server.tool(
    'get_priorities',
    'Get all available test priorities.',
    getPrioritiesSchema,
    wrapHandler(async () => handleGetPriorities(client), client),
  );

  server.tool(
    'get_case_types',
    'Get all available test case types.',
    getCaseTypesSchema,
    wrapHandler(async () => handleGetCaseTypes(client), client),
  );

  server.tool(
    'get_case_fields',
    'Get all test case custom fields and their configurations.',
    getCaseFieldsSchema,
    wrapHandler(async () => handleGetCaseFields(client), client),
  );

  server.tool(
    'get_result_fields',
    'Get all test result custom fields and their configurations.',
    getResultFieldsSchema,
    wrapHandler(async () => handleGetResultFields(client), client),
  );

  server.tool(
    'get_templates',
    'Get test case templates for a project.',
    getTemplatesSchema,
    withProjectDefault(handleGetTemplates, client, config.projectId),
  );

  server.tool(
    'get_users',
    'List TestRail users. Optionally filter by project.',
    getUsersSchema,
    wrapHandler(handleGetUsers, client),
  );

  server.tool(
    'get_suites',
    `List test suites in a TestRail project (defaults to project ${config.projectId}). Returns suite IDs and names needed for get_sections and get_cases calls.`,
    getSuitesSchema,
    withProjectDefault(handleGetSuites, client, config.projectId),
  );

  server.tool(
    'get_sections',
    `List sections (folder tree) in a TestRail project (defaults to project ${config.projectId}). Requires suite_id for multi-suite projects. Sections have parent_id and depth for hierarchy. Use a section's ID as section_id in get_cases to filter cases. TIP: Use find_cases_by_path if you want to find cases by section name/path directly.`,
    getSectionsSchema,
    withProjectDefault(handleGetSections, client, config.projectId),
  );

  // ─── Write tools ────────────────────────────────────────────

  server.tool(
    'add_result_for_case',
    'Submit a test result for a specific case in a run. Status: 1=Passed, 2=Blocked, 4=Retest, 5=Failed.',
    addResultForCaseSchema,
    wrapHandler(handleAddResultForCase, client),
  );

  server.tool(
    'add_results_for_cases',
    'Bulk submit test results for multiple cases in a run.',
    addResultsForCasesSchema,
    wrapHandler(handleAddResultsForCases, client),
  );

  server.tool(
    'add_run',
    'Create a new test run in a TestRail project.',
    addRunSchema,
    withProjectDefault(handleAddRun, client, config.projectId),
  );

  server.tool(
    'close_run',
    'Close/archive a test run. This action cannot be undone.',
    closeRunSchema,
    wrapHandler(handleCloseRun, client),
  );

  server.tool(
    'find_cases_by_path',
    `Find test cases by navigating the TestRail hierarchy using suite name and section path. This is the PREFERRED tool when the user provides a path like "Suite > Section > Subsection" or asks for cases in a named section. It resolves the suite, traverses the section tree, and returns all matching cases with IDs, titles, and priorities in a formatted table. Project defaults to ${config.projectId}.`,
    findCasesByPathSchema,
    withProjectDefault(handleFindCasesByPath, client, config.projectId),
  );

  server.tool(
    'add_case',
    'Create a new test case in a section. Supports steps, preconditions, and custom fields.',
    addCaseSchema,
    wrapHandler(handleAddCase, client),
  );

  server.tool(
    'update_case',
    'Update an existing test case. Only provide fields you want to change.',
    updateCaseSchema,
    wrapHandler(handleUpdateCase, client),
  );

  // ─── Resources ──────────────────────────────────────────────

  server.resource(
    'health',
    'testrail://health',
    {
      description: 'Server health check — status, uptime, and configuration summary',
      mimeType: 'application/json',
    },
    async () => {
      const uptime = Math.floor((Date.now() - startTime) / 1000);
      const health = {
        status: 'ok',
        uptime_seconds: uptime,
        config: maskConfig(config),
      };
      return {
        contents: [
          {
            uri: 'testrail://health',
            mimeType: 'application/json',
            text: JSON.stringify(health, null, 2),
          },
        ],
      };
    },
  );

  server.resource(
    'project-summary',
    new ResourceTemplate('testrail://project/{project_id}/summary', { list: undefined }),
    {
      description: 'Project dashboard — overview with active runs and recent activity',
      mimeType: 'application/json',
    },
    async (uri, { project_id }) => {
      const pid = Number(project_id);
      const [projectRes, runsRes] = await Promise.all([
        client.get(`get_project/${pid}`),
        client.getPaginated(`get_runs/${pid}`, { is_completed: 0, limit: 10 }),
      ]);
      const summary = {
        project: projectRes,
        active_runs: runsRes.items,
        active_run_count: runsRes.size,
      };
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify(summary, null, 2),
          },
        ],
      };
    },
  );

  // ─── Prompts ─────────────────────────────────────────────────

  server.prompt(
    'find_test_cases',
    'Navigate TestRail hierarchy to find test cases. Use this when given a path like "Suite > Section > Subsection" or when searching for cases by name.',
    {
      path: z.string().describe('Hierarchical path to test cases, e.g. "PCAI Test Suite > PCAI FQA > Platform Setup AIE" or just a search term'),
    },
    ({ path }) => ({
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Find test cases at this TestRail path: "${path}"

PREFERRED: Use the find_cases_by_path tool with:
- suite_name: the first path segment (suite name)
- section_path: the remaining segments joined by " > "
- project_id defaults to ${config.projectId}

Example: For path "PCAI Test Suite > PCAI FQA > Platform Setup AIE":
- suite_name = "PCAI Test Suite"
- section_path = "PCAI FQA > Platform Setup AIE"

The tool will resolve all IDs internally and return a formatted table of cases with IDs, titles, and priorities.

ALTERNATIVE (manual): If find_cases_by_path fails:
1. Call get_suites (project defaults to ${config.projectId}) to find the suite by name
2. Call get_sections with suite_id to find the target section by navigating parent_id hierarchy
3. Call get_cases with suite_id and section_id to get the test cases

Show the results as a clear list with case IDs, titles, and priorities.`,
          },
        },
      ],
    }),
  );

  server.prompt(
    'test_run_summary',
    'Get a comprehensive summary of a test run including pass/fail rates and failing tests.',
    {
      run_id: z.string().describe('The test run ID to summarize'),
    },
    ({ run_id }) => ({
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Give me a comprehensive summary of test run ${run_id}:

1. Call get_run with run_id=${run_id} to get the run overview and status counts
2. Call get_tests with run_id=${run_id} and status_id="4,5" to get failed and retest tests
3. For each failed test (up to 5), call get_results_for_case to get the latest failure details

Present:
- Overall pass/fail/blocked/untested counts and percentages
- List of failing tests with their error comments
- Any patterns in failures (common sections, assignees, etc.)
- Recommendations for next steps`,
          },
        },
      ],
    }),
  );

  server.prompt(
    'project_overview',
    'Get a full overview of a TestRail project including suites, active runs, and milestones.',
    {
      project_id: z.string().optional().describe('Project ID (uses configured default if omitted)'),
    },
    ({ project_id }) => {
      const pid = project_id || String(config.projectId);
      return {
        messages: [
          {
            role: 'user' as const,
            content: {
              type: 'text' as const,
              text: `Give me a full overview of TestRail project ${pid}:

1. Call get_project with project_id=${pid}
2. Call get_suites with project_id=${pid} to list all test suites
3. Call get_runs with project_id=${pid} and is_completed=false to see active runs
4. Call get_milestones with project_id=${pid} and is_completed=false to see active milestones
5. Call get_plans with project_id=${pid} and is_completed=false to see active test plans

Present a dashboard with:
- Project name, suite mode, and description
- List of test suites with case counts
- Active runs with pass/fail progress
- Upcoming milestones with due dates
- Active test plans`,
            },
          },
        ],
      };
    },
  );

  server.prompt(
    'submit_test_results',
    'Submit test results for one or more test cases in a run.',
    {
      run_id: z.string().describe('The test run ID'),
      results: z.string().describe('Comma-separated list of "case_id:status" pairs, e.g. "101:1,102:5,103:2" where 1=Passed, 2=Blocked, 4=Retest, 5=Failed'),
    },
    ({ run_id, results }) => ({
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Submit test results for run ${run_id}:

Parse these results: ${results}
Status codes: 1=Passed, 2=Blocked, 4=Retest, 5=Failed

For each result, prepare the case_id and status_id. Then call add_results_for_cases with:
- run_id: ${run_id}
- results: array of { case_id, status_id } objects

After submission, call get_run with run_id=${run_id} to show the updated run summary.`,
          },
        },
      ],
    }),
  );

  return server;
}
