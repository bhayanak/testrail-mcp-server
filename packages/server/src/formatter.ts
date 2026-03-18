import type { Project, Case, Run, Result, Plan, Milestone, Suite, Section, Test, Status, User, PaginatedResponse } from './testrail/types.js';

const MAX_OUTPUT_CHARS = 20_000;

// Default status ID → label mapping
const DEFAULT_STATUS_MAP: Record<number, string> = {
  1: 'Passed',
  2: 'Blocked',
  3: 'Untested',
  4: 'Retest',
  5: 'Failed',
};

export function statusLabel(statusId: number | null, customStatuses?: Status[]): string {
  if (statusId === null) return 'Untested';
  if (customStatuses) {
    const found = customStatuses.find((s) => s.id === statusId);
    if (found) return found.label;
  }
  return DEFAULT_STATUS_MAP[statusId] ?? `Custom (${statusId})`;
}

function truncate(text: string): string {
  if (text.length <= MAX_OUTPUT_CHARS) return text;
  return text.slice(0, MAX_OUTPUT_CHARS) + '\n\n... (output truncated)';
}

function ts(epoch: number | null): string {
  if (!epoch) return 'N/A';
  return new Date(epoch * 1000).toISOString().split('T')[0];
}

// ─── Projects ────────────────────────────────────────────────────

export function formatProjects(projects: Project[]): string {
  if (projects.length === 0) return 'No projects found.';
  const header = `# Projects (${projects.length})\n\n`;
  const rows = projects.map(
    (p) =>
      `- **[P${p.id}] ${p.name}** — Suite mode: ${p.suite_mode}, Completed: ${p.is_completed ? 'Yes' : 'No'}`,
  );
  return truncate(header + rows.join('\n'));
}

export function formatProject(project: Project): string {
  const lines = [
    `# Project: ${project.name} (ID: ${project.id})`,
    '',
    `- **Suite Mode**: ${project.suite_mode} (${['', 'Single Suite', 'Single + Baselines', 'Multiple Suites'][project.suite_mode] ?? 'Unknown'})`,
    `- **Completed**: ${project.is_completed ? `Yes (${ts(project.completed_on)})` : 'No'}`,
    `- **Announcement**: ${project.announcement || 'None'}`,
    `- **URL**: ${project.url}`,
  ];
  return truncate(lines.join('\n'));
}

// ─── Cases ───────────────────────────────────────────────────────

export function formatCases(cases: Case[], pagination?: { offset: number; size: number; limit: number }): string {
  if (cases.length === 0) return 'No test cases found.';
  const header = pagination
    ? `# Test Cases (showing ${cases.length}, offset ${pagination.offset}, total matched: ${pagination.size})\n\n`
    : `# Test Cases (${cases.length})\n\n`;
  const rows = cases.map(
    (c) =>
      `- **[C${c.id}] ${c.title}** — Priority: ${c.priority_id}, Type: ${c.type_id}, Section: ${c.section_id}`,
  );
  return truncate(header + rows.join('\n'));
}

export function formatCase(c: Case): string {
  const lines = [
    `# Test Case: ${c.title} (C${c.id})`,
    '',
    `- **Section**: ${c.section_id}`,
    `- **Priority**: ${c.priority_id}`,
    `- **Type**: ${c.type_id}`,
    `- **Milestone**: ${c.milestone_id ?? 'None'}`,
    `- **Estimate**: ${c.estimate ?? 'None'}`,
    `- **Refs**: ${c.refs ?? 'None'}`,
    `- **Created**: ${ts(c.created_on)}`,
    `- **Updated**: ${ts(c.updated_on)}`,
  ];
  if (c.custom_preconds) {
    lines.push('', '## Preconditions', c.custom_preconds);
  }
  if (c.custom_steps_separated && c.custom_steps_separated.length > 0) {
    lines.push('', '## Steps');
    c.custom_steps_separated.forEach((step, i) => {
      lines.push(`${i + 1}. **Step**: ${step.content}`);
      if (step.expected) lines.push(`   **Expected**: ${step.expected}`);
    });
  } else if (c.custom_steps) {
    lines.push('', '## Steps', c.custom_steps);
    if (c.custom_expected) lines.push('', '## Expected Result', c.custom_expected);
  }
  return truncate(lines.join('\n'));
}

// ─── Runs ────────────────────────────────────────────────────────

export function formatRuns(runs: Run[], pagination?: { offset: number; size: number; limit: number }): string {
  if (runs.length === 0) return 'No test runs found.';
  const header = pagination
    ? `# Test Runs (showing ${runs.length}, offset ${pagination.offset}, total: ${pagination.size})\n\n`
    : `# Test Runs (${runs.length})\n\n`;
  const rows = runs.map((r) => {
    const total = r.passed_count + r.failed_count + r.blocked_count + r.untested_count + r.retest_count;
    return `- **[R${r.id}] ${r.name}** — ✅${r.passed_count} ❌${r.failed_count} 🚫${r.blocked_count} ⏸${r.untested_count} 🔄${r.retest_count} (${total} total) ${r.is_completed ? '[Closed]' : '[Active]'}`;
  });
  return truncate(header + rows.join('\n'));
}

export function formatRun(run: Run): string {
  const total = run.passed_count + run.failed_count + run.blocked_count + run.untested_count + run.retest_count;
  const lines = [
    `# Test Run: ${run.name} (R${run.id})`,
    '',
    `- **Status**: ${run.is_completed ? `Closed (${ts(run.completed_on)})` : 'Active'}`,
    `- **Suite ID**: ${run.suite_id}`,
    `- **Milestone**: ${run.milestone_id ?? 'None'}`,
    `- **Assigned To**: ${run.assignedto_id ?? 'Unassigned'}`,
    `- **Config**: ${run.config ?? 'None'}`,
    `- **Created**: ${ts(run.created_on)}`,
    '',
    '## Results Summary',
    `| Status | Count | % |`,
    `|--------|-------|---|`,
    `| ✅ Passed | ${run.passed_count} | ${total ? ((run.passed_count / total) * 100).toFixed(1) : 0}% |`,
    `| ❌ Failed | ${run.failed_count} | ${total ? ((run.failed_count / total) * 100).toFixed(1) : 0}% |`,
    `| 🚫 Blocked | ${run.blocked_count} | ${total ? ((run.blocked_count / total) * 100).toFixed(1) : 0}% |`,
    `| ⏸ Untested | ${run.untested_count} | ${total ? ((run.untested_count / total) * 100).toFixed(1) : 0}% |`,
    `| 🔄 Retest | ${run.retest_count} | ${total ? ((run.retest_count / total) * 100).toFixed(1) : 0}% |`,
    `| **Total** | **${total}** | |`,
    '',
    `- **URL**: ${run.url}`,
  ];
  if (run.description) {
    lines.push('', '## Description', run.description);
  }
  return truncate(lines.join('\n'));
}

// ─── Results ─────────────────────────────────────────────────────

export function formatResults(results: Result[], pagination?: { offset: number; size: number; limit: number }): string {
  if (results.length === 0) return 'No results found.';
  const header = pagination
    ? `# Test Results (showing ${results.length}, offset ${pagination.offset}, total: ${pagination.size})\n\n`
    : `# Test Results (${results.length})\n\n`;
  const rows = results.map(
    (r) =>
      `- **Result ${r.id}** — Status: ${statusLabel(r.status_id)}, Test: T${r.test_id}, Created: ${ts(r.created_on)}${r.comment ? `, Comment: ${r.comment.slice(0, 100)}` : ''}${r.defects ? `, Defects: ${r.defects}` : ''}`,
  );
  return truncate(header + rows.join('\n'));
}

// ─── Tests ───────────────────────────────────────────────────────

export function formatTests(tests: Test[]): string {
  if (tests.length === 0) return 'No tests found.';
  const header = `# Tests (${tests.length})\n\n`;
  const rows = tests.map(
    (t) =>
      `- **[T${t.id}] ${t.title}** — Status: ${statusLabel(t.status_id)}, Case: C${t.case_id}, Assigned: ${t.assignedto_id ?? 'Unassigned'}`,
  );
  return truncate(header + rows.join('\n'));
}

// ─── Plans ───────────────────────────────────────────────────────

export function formatPlans(plans: Plan[]): string {
  if (plans.length === 0) return 'No test plans found.';
  const header = `# Test Plans (${plans.length})\n\n`;
  const rows = plans.map((p) => {
    const total = p.passed_count + p.failed_count + p.blocked_count + p.untested_count + p.retest_count;
    return `- **[Plan ${p.id}] ${p.name}** — ✅${p.passed_count} ❌${p.failed_count} 🚫${p.blocked_count} (${total} total) ${p.is_completed ? '[Closed]' : '[Active]'}`;
  });
  return truncate(header + rows.join('\n'));
}

export function formatPlan(plan: Plan): string {
  const total = plan.passed_count + plan.failed_count + plan.blocked_count + plan.untested_count + plan.retest_count;
  const lines = [
    `# Test Plan: ${plan.name} (ID: ${plan.id})`,
    '',
    `- **Status**: ${plan.is_completed ? `Closed (${ts(plan.completed_on)})` : 'Active'}`,
    `- **Milestone**: ${plan.milestone_id ?? 'None'}`,
    `- **Created**: ${ts(plan.created_on)}`,
    '',
    `## Summary: ✅${plan.passed_count} ❌${plan.failed_count} 🚫${plan.blocked_count} ⏸${plan.untested_count} 🔄${plan.retest_count} (${total} total)`,
  ];
  if (plan.entries && plan.entries.length > 0) {
    lines.push('', '## Entries');
    plan.entries.forEach((e) => {
      lines.push(
        `- **${e.name}** (Suite: ${e.suite_id}) — ${e.runs.length} run(s)`,
      );
    });
  }
  return truncate(lines.join('\n'));
}

// ─── Milestones ──────────────────────────────────────────────────

export function formatMilestones(milestones: Milestone[]): string {
  if (milestones.length === 0) return 'No milestones found.';
  const header = `# Milestones (${milestones.length})\n\n`;
  const rows = milestones.map(
    (m) =>
      `- **[M${m.id}] ${m.name}** — Due: ${ts(m.due_on)}, Started: ${m.is_started ? 'Yes' : 'No'}, Completed: ${m.is_completed ? 'Yes' : 'No'}`,
  );
  return truncate(header + rows.join('\n'));
}

// ─── Suites ──────────────────────────────────────────────────────

export function formatSuites(suites: Suite[]): string {
  if (suites.length === 0) return 'No test suites found.';
  const header = `# Test Suites (${suites.length})\n\n`;
  const rows = suites.map(
    (s) =>
      `- **[S${s.id}] ${s.name}** — Master: ${s.is_master ? 'Yes' : 'No'}, Completed: ${s.is_completed ? 'Yes' : 'No'}`,
  );
  return truncate(header + rows.join('\n'));
}

// ─── Sections ────────────────────────────────────────────────────

export function formatSections(sections: Section[]): string {
  if (sections.length === 0) return 'No sections found.';
  const header = `# Sections (${sections.length})\n\n`;
  const rows = sections.map(
    (s) =>
      `${'  '.repeat(s.depth)}- **[Sec ${s.id}] ${s.name}** — Parent: ${s.parent_id ?? 'Root'}, Order: ${s.display_order}`,
  );
  return truncate(header + rows.join('\n'));
}

// ─── Users ───────────────────────────────────────────────────────

export function formatUsers(users: User[]): string {
  if (users.length === 0) return 'No users found.';
  const header = `# Users (${users.length})\n\n`;
  const rows = users.map(
    (u) =>
      `- **[U${u.id}] ${u.name}** — ${u.email}, Role: ${u.role}, Active: ${u.is_active ? 'Yes' : 'No'}`,
  );
  return truncate(header + rows.join('\n'));
}

// ─── Statuses ────────────────────────────────────────────────────

export function formatStatuses(statuses: Status[]): string {
  if (statuses.length === 0) return 'No statuses found.';
  const header = `# Statuses (${statuses.length})\n\n`;
  const rows = statuses.map(
    (s) =>
      `- **[${s.id}] ${s.label}** (${s.name}) — System: ${s.is_system ? 'Yes' : 'No'}, Final: ${s.is_final ? 'Yes' : 'No'}`,
  );
  return truncate(header + rows.join('\n'));
}

// ─── Generic paginated info ──────────────────────────────────────

export function paginationInfo(resp: PaginatedResponse<unknown>): string {
  const hasMore = resp._links?.next !== null;
  if (hasMore) {
    return `\n\n_Showing ${resp.items.length} of ${resp.size} total results (offset: ${resp.offset}). Use offset/limit to see more._`;
  }
  return '';
}
