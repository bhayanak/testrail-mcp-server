import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { TestRailConfig, Suite, Section, Case, Milestone, User } from './testrail/types.js';
import { TestRailClient, TestRailApiError } from './testrail/client.js';
import { maskConfig } from './config.js';
import { DiskCache } from './cache.js';
import {
  formatSuites,
  formatSections,
  formatCases,
  formatMilestones,
  formatUsers,
} from './formatter.js';

// Tool handlers
import {
  getProjectsSchema,
  handleGetProjects,
  getProjectSchema,
  handleGetProject,
} from './tools/get-projects.js';
import { getCasesSchema, handleGetCases, getCaseSchema, handleGetCase } from './tools/get-cases.js';
import { getRunsSchema, handleGetRuns, getRunSchema, handleGetRun } from './tools/get-runs.js';
import {
  getResultsForRunSchema,
  handleGetResultsForRun,
  getResultsForCaseSchema,
  handleGetResultsForCase,
} from './tools/get-results.js';
import { getTestsSchema, handleGetTests } from './tools/get-tests.js';
import { getPlansSchema, handleGetPlans, getPlanSchema, handleGetPlan } from './tools/get-plans.js';
import { getMilestonesSchema, handleGetMilestones } from './tools/get-milestones.js';
import {
  getStatusesSchema,
  handleGetStatuses,
  getPrioritiesSchema,
  handleGetPriorities,
  getCaseTypesSchema,
  handleGetCaseTypes,
  getCaseFieldsSchema,
  handleGetCaseFields,
  getResultFieldsSchema,
  handleGetResultFields,
  getTemplatesSchema,
  handleGetTemplates,
  getUsersSchema,
  handleGetUsers,
  getSuitesSchema,
  handleGetSuites,
  getSectionsSchema,
  handleGetSections,
} from './tools/get-metadata.js';
import {
  addResultForCaseSchema,
  handleAddResultForCase,
  addResultsForCasesSchema,
  handleAddResultsForCases,
} from './tools/add-result.js';
import { addRunSchema, handleAddRun, closeRunSchema, handleCloseRun } from './tools/add-run.js';
import {
  addCaseSchema,
  handleAddCase,
  updateCaseSchema,
  handleUpdateCase,
} from './tools/add-case.js';
import { findCasesByPathSchema, handleFindCasesByPath } from './tools/find-cases-by-path.js';
import {
  getCacheStatusSchema,
  handleGetCacheStatus,
  invalidateCacheSchema,
  handleInvalidateCache,
  refreshCacheSchema,
} from './tools/cache-tools.js';

const startTime = Date.now();

type ToolResult = {
  content: Array<{ type: 'text'; text: string }>;
  structuredContent: Record<string, unknown>;
};

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
          content: [
            {
              type: 'text' as const,
              text: `TestRail API Error (${error.statusCode}): ${error.message}`,
            },
          ],
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
  handler: (
    client: TestRailClient,
    params: Omit<T, 'project_id'> & { project_id: number },
  ) => Promise<ToolResult>,
  client: TestRailClient,
  defaultProjectId: number,
) {
  return async (params: T) => {
    try {
      const resolved = { ...params, project_id: params.project_id ?? defaultProjectId } as Omit<
        T,
        'project_id'
      > & { project_id: number };
      return await handler(client, resolved);
    } catch (error) {
      if (error instanceof TestRailApiError) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `TestRail API Error (${error.statusCode}): ${error.message}`,
            },
          ],
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
  const cache = new DiskCache({
    cacheDir: config.cacheDir,
    cacheTtlMs: config.cacheTtlMs,
    cacheEnabled: config.cacheEnabled,
  });

  const server = new McpServer({
    name: 'testrail-mcp-server',
    version: '0.1.0',
  });

  // ─── Read-only tools ────────────────────────────────────────

  server.tool(
    'get_projects',
    'List all TestRail projects with IDs, names, and suite modes. Use this to discover available projects. Optionally filter by completion status. NOT for milestones, suites, runs, or test cases — use the dedicated tools for those.',
    getProjectsSchema,
    wrapHandler(handleGetProjects, client),
  );

  server.tool(
    'get_project',
    `Get details for a specific TestRail project by ID — name, announcement, suite mode, counts. Use this for project-level info. For project summaries with milestone/run/suite counts, first call this, then call get_milestones, get_runs, and get_suites separately. Defaults to project ${config.projectId}.`,
    getProjectSchema,
    wrapHandler(handleGetProject, client),
  );

  server.tool(
    'get_cases',
    `List test cases by suite or section ID (defaults to project ${config.projectId}). Requires suite_id for multi-suite projects. NOT for listing milestones or test runs — use get_milestones or get_runs. NOT for cases in a test run — use get_tests. TIP: To find cases by name/path (e.g. "Suite > Section"), use find_cases_by_path instead.`,
    getCasesSchema,
    withProjectDefault(
      async (c, p) => {
        // Only use cache for unfiltered suite-level fetches
        if (p.suite_id && !p.section_id && !p.priority_id && !p.type_id && !p.filter) {
          const cached = cache.get<Case[]>(p.project_id, 'cases', String(p.suite_id));
          if (cached) {
            return {
              content: [
                {
                  type: 'text' as const,
                  text:
                    formatCases(cached.data, {
                      offset: 0,
                      size: cached.data.length,
                      limit: cached.data.length,
                    }) + `\n\n_(cached ${DiskCache.formatAge(cached.ageMs)})_`,
                },
              ],
              structuredContent: {
                cases: cached.data,
                pagination: {
                  offset: 0,
                  limit: cached.data.length,
                  size: cached.data.length,
                  hasMore: false,
                },
              },
            };
          }
        }
        const result = await handleGetCases(c, p);
        // Cache full suite fetches only
        if (p.suite_id && !p.section_id && !p.priority_id && !p.type_id && !p.filter) {
          const cases = result.structuredContent?.cases as Case[];
          if (cases) cache.set(p.project_id, 'cases', String(p.suite_id), cases);
        }
        return result;
      },
      client,
      config.projectId,
    ),
  );

  server.tool(
    'get_case',
    'Get full details for a single test case by its case ID — steps, preconditions, custom fields, priority, type. NOT for listing cases (use get_cases) or run results (use get_results_for_case).',
    getCaseSchema,
    wrapHandler(handleGetCase, client),
  );

  server.tool(
    'get_runs',
    `List test runs in a TestRail project (defaults to project ${config.projectId}). USE THIS when the user asks about test runs, run names, run list, or runs for a milestone. Filter by is_completed (0=active, 1=completed) and milestone_id. To find a run by name, call this and search the results. NOT for test suites (use get_suites), milestones (use get_milestones), or test cases (use get_cases).`,
    getRunsSchema,
    withProjectDefault(handleGetRuns, client, config.projectId),
  );

  server.tool(
    'get_run',
    'Get detailed info for a specific test run by run ID — name, description, milestone, pass/fail/blocked/untested counts, plan, assignee, and URL. USE THIS for run summary/status. NOT for listing tests in a run (use get_tests) or test results (use get_results_for_run).',
    getRunSchema,
    wrapHandler(handleGetRun, client),
  );

  server.tool(
    'get_results_for_run',
    'Get test results (pass/fail/status entries) for a specific run by run ID. Filter by status_id. USE THIS when the user asks for results, pass/fail details, or test outcomes of a run. NOT for listing test cases in a run (use get_tests) or run metadata (use get_run).',
    getResultsForRunSchema,
    wrapHandler(handleGetResultsForRun, client),
  );

  server.tool(
    'get_results_for_case',
    'Get result history for a specific test case within a specific run. Requires both run_id and case_id. Shows all result entries (pass, fail, retest) over time for one case in one run.',
    getResultsForCaseSchema,
    wrapHandler(handleGetResultsForCase, client),
  );

  server.tool(
    'get_tests',
    'List all test cases (test instances) associated with a test run by run ID. USE THIS when the user asks "what test cases are in this run" or "get all testcases for run X". Filter by status_id to show only passed/failed/blocked. NOT for test results/outcomes (use get_results_for_run) or standalone case details (use get_cases).',
    getTestsSchema,
    wrapHandler(handleGetTests, client),
  );

  server.tool(
    'get_plans',
    `List test plans in a TestRail project (defaults to project ${config.projectId}). Filter by is_completed and milestone_id. USE THIS when the user asks about test plans. NOT for test runs (use get_runs) or milestones (use get_milestones).`,
    getPlansSchema,
    withProjectDefault(handleGetPlans, client, config.projectId),
  );

  server.tool(
    'get_plan',
    'Get detailed info for a specific test plan by plan ID — entries, associated runs, and configurations. NOT for listing plans (use get_plans) or standalone runs (use get_runs).',
    getPlanSchema,
    wrapHandler(handleGetPlan, client),
  );

  server.tool(
    'get_milestones',
    `List milestones in a TestRail project (defaults to project ${config.projectId}). Returns milestone IDs, names/titles, due dates, start dates, and completion status. USE THIS when the user asks about milestones, milestone titles, milestone names, due dates, or project schedule. Filter by is_completed and is_started. To find a milestone by name, call this and search the results. NOT for test suites (use get_suites), test runs (use get_runs), or test cases (use get_cases).`,
    getMilestonesSchema,
    withProjectDefault(
      async (c, p) => {
        if (p.is_completed === undefined && p.is_started === undefined) {
          const cached = cache.get<Milestone[]>(p.project_id, 'meta', 'milestones');
          if (cached) {
            return {
              content: [
                {
                  type: 'text' as const,
                  text:
                    formatMilestones(cached.data) +
                    `\n\n_(cached ${DiskCache.formatAge(cached.ageMs)})_`,
                },
              ],
              structuredContent: { milestones: cached.data },
            };
          }
        }
        const result = await handleGetMilestones(c, p);
        if (p.is_completed === undefined && p.is_started === undefined) {
          const milestones = result.structuredContent?.milestones as Milestone[];
          if (milestones) cache.set(p.project_id, 'meta', 'milestones', milestones);
        }
        return result;
      },
      client,
      config.projectId,
    ),
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
    'List TestRail users. Optionally filter by project. Uses disk cache when available.',
    getUsersSchema,
    wrapHandler(async (c, p) => {
      const cacheKey = `users_${p.project_id ?? 'all'}`;
      const pid = p.project_id ?? config.projectId;
      const cached = cache.get<User[]>(pid, 'meta', cacheKey);
      if (cached) {
        return {
          content: [
            {
              type: 'text' as const,
              text:
                formatUsers(cached.data) + `\n\n_(cached ${DiskCache.formatAge(cached.ageMs)})_`,
            },
          ],
          structuredContent: { users: cached.data },
        };
      }
      const result = await handleGetUsers(c, p);
      const users = result.structuredContent?.users as User[];
      if (users) cache.set(pid, 'meta', cacheKey, users);
      return result;
    }, client),
  );

  server.tool(
    'get_suites',
    `List test suites in a TestRail project (defaults to project ${config.projectId}). Returns suite IDs and names. ONLY use this when the user asks specifically about test suites/suite names, or when you need a suite_id for get_sections/get_cases. NOT for milestones (use get_milestones), test runs (use get_runs), test results (use get_results_for_run), or project summary (use get_project + get_milestones + get_runs).`,
    getSuitesSchema,
    withProjectDefault(
      async (c, p) => {
        const cached = cache.get<Suite[]>(p.project_id, 'meta', 'suites');
        if (cached) {
          return {
            content: [
              {
                type: 'text' as const,
                text:
                  formatSuites(cached.data) + `\n\n_(cached ${DiskCache.formatAge(cached.ageMs)})_`,
              },
            ],
            structuredContent: { suites: cached.data },
          };
        }
        const result = await handleGetSuites(c, p);
        const suites = result.structuredContent?.suites as Suite[];
        if (suites) cache.set(p.project_id, 'meta', 'suites', suites);
        return result;
      },
      client,
      config.projectId,
    ),
  );

  server.tool(
    'get_sections',
    `List sections (folder tree) within a test suite (defaults to project ${config.projectId}). Requires suite_id. ONLY use this when you need to browse section hierarchy or get a section_id for get_cases. TIP: Use find_cases_by_path instead if the user provides a path. NOT for milestones (use get_milestones), test runs (use get_runs), or test results (use get_results_for_run).`,
    getSectionsSchema,
    withProjectDefault(
      async (c, p) => {
        if (p.suite_id) {
          const cached = cache.get<Section[]>(p.project_id, 'sections', String(p.suite_id));
          if (cached) {
            return {
              content: [
                {
                  type: 'text' as const,
                  text:
                    formatSections(cached.data) +
                    `\n\n_(cached ${DiskCache.formatAge(cached.ageMs)})_`,
                },
              ],
              structuredContent: { sections: cached.data },
            };
          }
        }
        const result = await handleGetSections(c, p);
        const sections = result.structuredContent?.sections as Section[];
        if (sections && p.suite_id)
          cache.set(p.project_id, 'sections', String(p.suite_id), sections);
        return result;
      },
      client,
      config.projectId,
    ),
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
    `Find test cases by navigating the TestRail hierarchy using suite name and section path. This is the PREFERRED tool when the user provides a path like "Suite > Section > Subsection" or asks for cases in a named section. It resolves the suite, traverses the section tree, and returns all matching cases with IDs, titles, and priorities in a formatted table. Project defaults to ${config.projectId}. Uses disk cache when available.`,
    findCasesByPathSchema,
    withProjectDefault((c, p) => handleFindCasesByPath(c, p, cache), client, config.projectId),
  );

  server.tool(
    'add_case',
    'Create a new test case in a section. Supports steps, preconditions, and custom fields.',
    addCaseSchema,
    wrapHandler(async (c, p) => {
      const result = await handleAddCase(c, p);
      // Invalidate cases cache for the suite this case belongs to
      const createdCase = result.structuredContent?.case as Case | undefined;
      if (createdCase?.suite_id) {
        cache.invalidate(config.projectId, 'cases', String(createdCase.suite_id));
      }
      return result;
    }, client),
  );

  server.tool(
    'update_case',
    'Update an existing test case. Only provide fields you want to change.',
    updateCaseSchema,
    wrapHandler(async (c, p) => {
      const result = await handleUpdateCase(c, p);
      const updatedCase = result.structuredContent?.case as Case | undefined;
      if (updatedCase?.suite_id) {
        cache.invalidate(config.projectId, 'cases', String(updatedCase.suite_id));
      }
      return result;
    }, client),
  );

  // ─── Cache management tools ─────────────────────────────────

  server.tool(
    'get_cache_status',
    `Show disk cache status for a project — file counts, sizes, ages. Project defaults to ${config.projectId}.`,
    getCacheStatusSchema,
    async (params: { project_id?: number }) => {
      try {
        return await handleGetCacheStatus(cache, {
          project_id: params.project_id ?? config.projectId,
        });
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: 'text' as const, text: `Error: ${msg}` }],
          isError: true as const,
        };
      }
    },
  );

  server.tool(
    'invalidate_cache',
    `Invalidate (clear) the disk cache. Optionally scope to a specific project or suite. Next data fetch will pull fresh data from TestRail.`,
    invalidateCacheSchema,
    async (params: { project_id?: number; suite_id?: number }) => {
      try {
        return await handleInvalidateCache(cache, params);
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: 'text' as const, text: `Error: ${msg}` }],
          isError: true as const,
        };
      }
    },
  );

  server.tool(
    'refresh_cache',
    `Force re-fetch and cache semi-static data (suites, sections, cases, milestones, users) from TestRail. Optionally scope to a single suite. Project defaults to ${config.projectId}.`,
    refreshCacheSchema,
    async (params: { project_id?: number; suite_id?: number }) => {
      try {
        const projectId = params.project_id ?? config.projectId;
        const refreshed: string[] = [];

        if (params.suite_id) {
          // Refresh only one suite's sections and cases
          const sectionsRaw = await client.getPaginated<Section>(`get_sections/${projectId}`, {
            suite_id: params.suite_id,
          });
          cache.set(projectId, 'sections', String(params.suite_id), sectionsRaw.items);
          refreshed.push(
            `sections for suite ${params.suite_id} (${sectionsRaw.items.length} sections)`,
          );

          const casesRaw = await client.getPaginated<Case>(`get_cases/${projectId}`, {
            suite_id: params.suite_id,
          });
          cache.set(projectId, 'cases', String(params.suite_id), casesRaw.items);
          refreshed.push(`cases for suite ${params.suite_id} (${casesRaw.items.length} cases)`);
        } else {
          // Refresh suites
          const suitesRaw = await client.getPaginated<Suite>(`get_suites/${projectId}`, {});
          cache.set(projectId, 'meta', 'suites', suitesRaw.items);
          refreshed.push(`suites (${suitesRaw.items.length})`);

          // Refresh milestones
          const milestonesRaw = await client.getPaginated<Milestone>(
            `get_milestones/${projectId}`,
            {},
          );
          cache.set(projectId, 'meta', 'milestones', milestonesRaw.items);
          refreshed.push(`milestones (${milestonesRaw.items.length})`);

          // Refresh users
          const usersRaw = await client.get<User[]>(`get_users/${projectId}`);
          cache.set(projectId, 'meta', 'users', usersRaw);
          refreshed.push(`users (${usersRaw.length})`);

          // Refresh sections and cases per suite
          for (const suite of suitesRaw.items) {
            const sectionsRaw = await client.getPaginated<Section>(`get_sections/${projectId}`, {
              suite_id: suite.id,
            });
            cache.set(projectId, 'sections', String(suite.id), sectionsRaw.items);

            const casesRaw = await client.getPaginated<Case>(`get_cases/${projectId}`, {
              suite_id: suite.id,
            });
            cache.set(projectId, 'cases', String(suite.id), casesRaw.items);
            refreshed.push(
              `suite "${suite.name}" (${sectionsRaw.items.length} sections, ${casesRaw.items.length} cases)`,
            );
          }
        }

        return {
          content: [
            {
              type: 'text' as const,
              text:
                `Cache refreshed for project ${projectId}:\n\n` +
                refreshed.map((r) => `- ${r}`).join('\n'),
            },
          ],
          structuredContent: { projectId, refreshed },
        };
      } catch (error) {
        if (error instanceof TestRailApiError) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `TestRail API Error (${error.statusCode}): ${error.message}`,
              },
            ],
            isError: true as const,
          };
        }
        const msg = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: 'text' as const, text: `Error: ${msg}` }],
          isError: true as const,
        };
      }
    },
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
      path: z
        .string()
        .describe(
          'Hierarchical path to test cases, e.g. "PCAI Test Suite > PCAI FQA > Platform Setup AIE" or just a search term',
        ),
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
      results: z
        .string()
        .describe(
          'Comma-separated list of "case_id:status" pairs, e.g. "101:1,102:5,103:2" where 1=Passed, 2=Blocked, 4=Retest, 5=Failed',
        ),
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

  server.prompt(
    'milestone_summary',
    'Find a milestone by name and show its associated test runs with pass/fail summaries. Use this when asked about a specific milestone.',
    {
      milestone_name: z.string().describe('The milestone name to search for, e.g. "PCBE-RC9"'),
      project_id: z.string().optional().describe('Project ID (uses configured default if omitted)'),
    },
    ({ milestone_name, project_id }) => {
      const pid = project_id || String(config.projectId);
      return {
        messages: [
          {
            role: 'user' as const,
            content: {
              type: 'text' as const,
              text: `Find milestone "${milestone_name}" in project ${pid} and give a full summary:

STEP 1: Call get_milestones with project_id=${pid} to get all milestones. Find the one whose name matches or contains "${milestone_name}". Note its id, name, due_on, start_on, is_completed, and description.

STEP 2: Call get_runs with project_id=${pid} and milestone_id=<found_milestone_id> to get all test runs associated with this milestone.

STEP 3: For each run returned, note the run name, passed_count, failed_count, blocked_count, untested_count, and custom_status counts.

Present:
- Milestone name, due date, start date, completion status, description
- Total number of test runs associated with this milestone
- For each run: name, overall status (pass/fail/blocked/untested counts and percentages)
- Overall milestone summary: total passed, failed, blocked, untested across all runs
- Overall pass rate percentage for the milestone`,
            },
          },
        ],
      };
    },
  );

  server.prompt(
    'run_details',
    'Find a test run by name and show its test cases, results, and summary. Use this when asked about a specific test run.',
    {
      run_name: z.string().describe('The test run name to search for, e.g. "VME-8.1.1-primary"'),
      project_id: z.string().optional().describe('Project ID (uses configured default if omitted)'),
    },
    ({ run_name, project_id }) => {
      const pid = project_id || String(config.projectId);
      return {
        messages: [
          {
            role: 'user' as const,
            content: {
              type: 'text' as const,
              text: `Find test run "${run_name}" in project ${pid} and show its details:

STEP 1: Call get_runs with project_id=${pid} to get all runs. Search for the one whose name matches or contains "${run_name}". Note its run_id.

STEP 2: Call get_run with run_id=<found_run_id> to get detailed run info including pass/fail/blocked/untested counts.

STEP 3: Call get_tests with run_id=<found_run_id> to list all test cases (test instances) in this run. This shows each test's title, status, and assignee.

Present:
- Run name, description, milestone, suite, creation date, URL
- Overall status: passed/failed/blocked/untested counts and percentages
- List of all test cases in the run with their current status
- Summary of failures (if any) with test titles and status`,
            },
          },
        ],
      };
    },
  );

  return server;
}
