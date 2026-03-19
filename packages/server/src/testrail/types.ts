// TestRail API TypeScript type definitions

// ─── Configuration ───────────────────────────────────────────────

export interface TestRailConfig {
  baseUrl: string;
  username: string;
  apiKey: string;
  projectId: number;
  timeoutMs: number;
  maxResults: number;
  cacheDir: string;
  cacheTtlMs: number;
  cacheEnabled: boolean;
}

// ─── Pagination ──────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  offset: number;
  limit: number;
  size: number;
  _links: {
    next: string | null;
    prev: string | null;
  };
  items: T[];
}

// ─── Error ───────────────────────────────────────────────────────

export interface TestRailApiErrorResponse {
  error: string;
}

// ─── Projects ────────────────────────────────────────────────────

export interface Project {
  id: number;
  name: string;
  announcement: string | null;
  show_announcement: boolean;
  is_completed: boolean;
  completed_on: number | null;
  suite_mode: number; // 1=single suite, 2=single+baselines, 3=multiple suites
  default_role_id: number | null;
  url: string;
}

// ─── Suites ──────────────────────────────────────────────────────

export interface Suite {
  id: number;
  name: string;
  description: string | null;
  project_id: number;
  is_master: boolean;
  is_baseline: boolean;
  is_completed: boolean;
  completed_on: number | null;
  url: string;
}

// ─── Sections ────────────────────────────────────────────────────

export interface Section {
  id: number;
  suite_id: number;
  name: string;
  description: string | null;
  parent_id: number | null;
  display_order: number;
  depth: number;
}

// ─── Cases ───────────────────────────────────────────────────────

export interface Case {
  id: number;
  title: string;
  section_id: number;
  template_id: number;
  type_id: number;
  priority_id: number;
  milestone_id: number | null;
  refs: string | null;
  created_by: number;
  created_on: number;
  updated_by: number;
  updated_on: number;
  estimate: string | null;
  estimate_forecast: string | null;
  suite_id: number;
  display_order: number;
  is_deleted: number;
  // Common custom fields
  custom_preconds: string | null;
  custom_steps: string | null;
  custom_expected: string | null;
  custom_steps_separated: StepsSeparated[] | null;
  // Allow additional custom fields
  [key: string]: unknown;
}

export interface StepsSeparated {
  content: string;
  expected: string;
  additional_info?: string;
  refs?: string;
}

export interface CaseField {
  id: number;
  is_active: boolean;
  type_id: number;
  name: string;
  system_name: string;
  label: string;
  description: string | null;
  configs: CaseFieldConfig[];
  display_order: number;
  include_all: boolean;
  template_ids: number[];
}

export interface CaseFieldConfig {
  context: {
    is_global: boolean;
    project_ids: number[] | null;
  };
  options: {
    is_required: boolean;
    default_value: string;
    format?: string;
    rows?: string;
    items?: string;
  };
  id: string;
}

export interface CaseType {
  id: number;
  name: string;
  is_default: boolean;
}

// ─── Runs ────────────────────────────────────────────────────────

export interface Run {
  id: number;
  suite_id: number;
  name: string;
  description: string | null;
  milestone_id: number | null;
  assignedto_id: number | null;
  include_all: boolean;
  is_completed: boolean;
  completed_on: number | null;
  config: string | null;
  config_ids: number[];
  passed_count: number;
  blocked_count: number;
  untested_count: number;
  retest_count: number;
  failed_count: number;
  custom_status1_count: number;
  custom_status2_count: number;
  custom_status3_count: number;
  custom_status4_count: number;
  custom_status5_count: number;
  custom_status6_count: number;
  custom_status7_count: number;
  project_id: number;
  plan_id: number | null;
  created_on: number;
  created_by: number;
  url: string;
}

// ─── Tests ───────────────────────────────────────────────────────

export interface Test {
  id: number;
  case_id: number;
  status_id: number;
  assignedto_id: number | null;
  run_id: number;
  title: string;
  template_id: number;
  type_id: number;
  priority_id: number;
  estimate: string | null;
  estimate_forecast: string | null;
  refs: string | null;
  milestone_id: number | null;
  custom_preconds: string | null;
  custom_steps_separated: StepsSeparated[] | null;
  [key: string]: unknown;
}

// ─── Results ─────────────────────────────────────────────────────

export interface Result {
  id: number;
  test_id: number;
  status_id: number | null;
  created_by: number;
  created_on: number;
  assignedto_id: number | null;
  comment: string | null;
  version: string | null;
  elapsed: string | null;
  defects: string | null;
  [key: string]: unknown;
}

export interface ResultField {
  id: number;
  is_active: boolean;
  type_id: number;
  name: string;
  system_name: string;
  label: string;
  description: string | null;
  configs: CaseFieldConfig[];
  display_order: number;
  include_all: boolean;
  template_ids: number[];
}

// ─── Statuses ────────────────────────────────────────────────────

export interface Status {
  id: number;
  name: string;
  label: string;
  color_dark: number;
  color_medium: number;
  color_bright: number;
  is_system: boolean;
  is_untested: boolean;
  is_final: boolean;
}

// ─── Plans ───────────────────────────────────────────────────────

export interface Plan {
  id: number;
  name: string;
  description: string | null;
  milestone_id: number | null;
  assignedto_id: number | null;
  is_completed: boolean;
  completed_on: number | null;
  passed_count: number;
  blocked_count: number;
  untested_count: number;
  retest_count: number;
  failed_count: number;
  custom_status1_count: number;
  custom_status2_count: number;
  custom_status3_count: number;
  custom_status4_count: number;
  custom_status5_count: number;
  custom_status6_count: number;
  custom_status7_count: number;
  project_id: number;
  created_on: number;
  created_by: number;
  url: string;
  entries: PlanEntry[];
}

export interface PlanEntry {
  id: string;
  suite_id: number;
  name: string;
  description: string | null;
  assignedto_id: number | null;
  include_all: boolean;
  runs: Run[];
  refs?: string;
}

// ─── Milestones ──────────────────────────────────────────────────

export interface Milestone {
  id: number;
  name: string;
  description: string | null;
  start_on: number | null;
  started_on: number | null;
  is_started: boolean;
  due_on: number | null;
  is_completed: boolean;
  completed_on: number | null;
  project_id: number;
  parent_id: number | null;
  refs: string | null;
  url: string;
  milestones?: Milestone[];
}

// ─── Users ───────────────────────────────────────────────────────

export interface User {
  id: number;
  name: string;
  email: string;
  is_active: boolean;
  role_id: number;
  role: string;
}

// ─── Priorities ──────────────────────────────────────────────────

export interface Priority {
  id: number;
  name: string;
  short_name: string;
  is_default: boolean;
  priority: number;
}

// ─── Templates ───────────────────────────────────────────────────

export interface Template {
  id: number;
  name: string;
  is_default: boolean;
}

// ─── Configurations ──────────────────────────────────────────────

export interface ConfigGroup {
  id: number;
  project_id: number;
  name: string;
  configs: Config[];
}

export interface Config {
  id: number;
  name: string;
  group_id: number;
}

// ─── Shared Steps ────────────────────────────────────────────────

export interface SharedStep {
  id: number;
  title: string;
  created_on: number;
  created_by: number;
  updated_on: number;
  updated_by: number;
  project_id: number;
  custom_steps_separated: StepsSeparated[];
}

// ─── Roles ───────────────────────────────────────────────────────

export interface Role {
  id: number;
  name: string;
  is_default: boolean;
}

// ─── Labels ──────────────────────────────────────────────────────

export interface Label {
  id: number;
  name: string;
  color: number;
}

// ─── Attachments ─────────────────────────────────────────────────

export interface Attachment {
  id: number;
  name: string;
  filename: string;
  size: number;
  created_on: number;
  project_id: number;
  case_id: number | null;
  test_change_id: number | null;
  user_id: number;
}

// ─── Reports ─────────────────────────────────────────────────────

export interface Report {
  id: number;
  name: string;
  description: string | null;
  notify_user: boolean;
  notify_link: boolean;
  notify_link_recipients: string | null;
  notify_attachment: boolean;
  notify_attachment_recipients: string | null;
  notify_attachment_html_format: boolean;
  notify_attachment_pdf_format: boolean;
}

// ─── Case History ────────────────────────────────────────────────

export interface CaseHistory {
  id: number;
  type_id: number;
  changes: CaseHistoryChange[];
  user_id: number;
  created_on: number;
}

export interface CaseHistoryChange {
  field: string;
  old_value: unknown;
  new_value: unknown;
}
