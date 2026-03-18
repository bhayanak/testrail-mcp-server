import { describe, it, expect } from 'vitest';
import {
  formatProjects,
  formatProject,
  formatCases,
  formatCase,
  formatRuns,
  formatRun,
  formatResults,
  formatTests,
  formatPlans,
  formatPlan,
  formatMilestones,
  formatSuites,
  formatSections,
  formatUsers,
  formatStatuses,
  statusLabel,
  paginationInfo,
} from '../src/formatter.js';
import type { Project, Case, Run, Result, Test, Plan, Milestone, Suite, Section, User, Status } from '../src/testrail/types.js';

import projectsFixture from './fixtures/projects.json';
import casesFixture from './fixtures/cases.json';
import runFixture from './fixtures/run.json';
import resultsFixture from './fixtures/results.json';
import planFixture from './fixtures/plan.json';

describe('statusLabel', () => {
  it('should return default labels', () => {
    expect(statusLabel(1)).toBe('Passed');
    expect(statusLabel(5)).toBe('Failed');
    expect(statusLabel(null)).toBe('Untested');
  });

  it('should return Custom for unknown IDs', () => {
    expect(statusLabel(99)).toBe('Custom (99)');
  });

  it('should use custom statuses when provided', () => {
    const custom = [{ id: 6, label: 'Skipped' }] as Status[];
    expect(statusLabel(6, custom)).toBe('Skipped');
  });
});

describe('formatProjects', () => {
  it('should format project list', () => {
    const result = formatProjects(projectsFixture as Project[]);
    expect(result).toContain('Projects (3)');
    expect(result).toContain('E-Commerce Platform');
    expect(result).toContain('Mobile App');
  });

  it('should handle empty list', () => {
    expect(formatProjects([])).toBe('No projects found.');
  });
});

describe('formatProject', () => {
  it('should format project details', () => {
    const result = formatProject(projectsFixture[0] as Project);
    expect(result).toContain('E-Commerce Platform');
    expect(result).toContain('Suite Mode');
    expect(result).toContain('Multiple Suites');
  });
});

describe('formatCases', () => {
  it('should format case list with pagination', () => {
    const cases = casesFixture.cases as Case[];
    const result = formatCases(cases, { offset: 0, size: 3, limit: 250 });
    expect(result).toContain('Test Cases');
    expect(result).toContain('Verify login with valid credentials');
    expect(result).toContain('C101');
  });

  it('should handle empty list', () => {
    expect(formatCases([])).toBe('No test cases found.');
  });

  it('should format case list without pagination', () => {
    const cases = casesFixture.cases as Case[];
    const result = formatCases(cases);
    expect(result).toContain('Test Cases (3)');
    expect(result).not.toContain('offset');
  });
});

describe('formatCase', () => {
  it('should format case with separated steps', () => {
    const c = casesFixture.cases[0] as Case;
    const result = formatCase(c);
    expect(result).toContain('Verify login with valid credentials');
    expect(result).toContain('Steps');
    expect(result).toContain('Navigate to login page');
  });

  it('should format case with text steps', () => {
    const c = casesFixture.cases[1] as Case;
    const result = formatCase(c);
    expect(result).toContain('Verify login with invalid password');
    expect(result).toContain('Steps');
    expect(result).toContain('Expected Result');
  });
});

describe('formatRuns', () => {
  it('should format run list', () => {
    const result = formatRuns([runFixture as Run]);
    expect(result).toContain('Sprint 12 Regression');
    expect(result).toContain('R201');
  });

  it('should handle empty list', () => {
    expect(formatRuns([])).toBe('No test runs found.');
  });
});

describe('formatRun', () => {
  it('should format run details with status counts', () => {
    const result = formatRun(runFixture as Run);
    expect(result).toContain('Sprint 12 Regression');
    expect(result).toContain('Results Summary');
    expect(result).toContain('Passed');
    expect(result).toContain('Failed');
    expect(result).toContain('45');
    expect(result).toContain('8');
  });
});

describe('formatResults', () => {
  it('should format results list', () => {
    const results = resultsFixture.results as Result[];
    const result = formatResults(results);
    expect(result).toContain('Test Results (4)');
    expect(result).toContain('Passed');
    expect(result).toContain('Failed');
    expect(result).toContain('BUG-789');
  });

  it('should handle empty list', () => {
    expect(formatResults([])).toBe('No results found.');
  });
});

describe('formatTests', () => {
  it('should handle empty list', () => {
    expect(formatTests([])).toBe('No tests found.');
  });
});

describe('formatPlans', () => {
  it('should format plan list', () => {
    const result = formatPlans([planFixture as unknown as Plan]);
    expect(result).toContain('Release 3.0 Test Plan');
  });

  it('should handle empty list', () => {
    expect(formatPlans([])).toBe('No test plans found.');
  });
});

describe('formatPlan', () => {
  it('should format plan with entries', () => {
    const result = formatPlan(planFixture as unknown as Plan);
    expect(result).toContain('Release 3.0 Test Plan');
    expect(result).toContain('Entries');
    expect(result).toContain('Smoke Tests');
    expect(result).toContain('Integration Tests');
  });
});

describe('formatMilestones', () => {
  it('should handle empty list', () => {
    expect(formatMilestones([])).toBe('No milestones found.');
  });
});

describe('formatSuites', () => {
  it('should handle empty list', () => {
    expect(formatSuites([])).toBe('No test suites found.');
  });
});

describe('formatSections', () => {
  it('should handle empty list', () => {
    expect(formatSections([])).toBe('No sections found.');
  });

  it('should format with indentation', () => {
    const sections = [
      { id: 1, suite_id: 1, name: 'Login', description: null, parent_id: null, display_order: 1, depth: 0 },
      { id: 2, suite_id: 1, name: 'Sub Login', description: null, parent_id: 1, display_order: 1, depth: 1 },
    ] as Section[];
    const result = formatSections(sections);
    expect(result).toContain('Login');
    expect(result).toContain('Sub Login');
  });
});

describe('formatUsers', () => {
  it('should handle empty list', () => {
    expect(formatUsers([])).toBe('No users found.');
  });
});

describe('formatStatuses', () => {
  it('should handle empty list', () => {
    expect(formatStatuses([])).toBe('No statuses found.');
  });
});

describe('output truncation', () => {
  it('should truncate long output', () => {
    // Create many projects to exceed 20k chars
    const manyProjects = Array.from({ length: 500 }, (_, i) => ({
      id: i,
      name: `Project ${'X'.repeat(100)} ${i}`,
      announcement: null,
      show_announcement: false,
      is_completed: false,
      completed_on: null,
      suite_mode: 1,
      default_role_id: null,
      url: `https://example.testrail.io/projects/${i}`,
    })) as Project[];

    const result = formatProjects(manyProjects);
    expect(result).toContain('(output truncated)');
    expect(result.length).toBeLessThanOrEqual(20_000 + 50); // Allow for truncation message
  });
});

describe('paginationInfo', () => {
  it('should return pagination message when more results exist', () => {
    const result = paginationInfo({
      offset: 0, limit: 250, size: 500, items: Array(250),
      _links: { next: '/api/v2/get_cases/1&offset=250', prev: null },
    });
    expect(result).toContain('Showing 250 of 500');
    expect(result).toContain('offset/limit');
  });

  it('should return empty string when no more results', () => {
    const result = paginationInfo({
      offset: 0, limit: 250, size: 10, items: Array(10),
      _links: { next: null, prev: null },
    });
    expect(result).toBe('');
  });
});
