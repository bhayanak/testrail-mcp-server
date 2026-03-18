<p align="center">
  <a href="https://nodejs.org/"><img src="https://img.shields.io/badge/node-%3E%3D18-blue.svg" alt="Node.js ≥18"></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5.8-blue.svg?logo=typescript&logoColor=white" alt="TypeScript 5.8"></a>
  <a href="https://github.com/bhayanak/testrail-mcp-server/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT"></a>
  <a href="#available-tools"><img src="https://img.shields.io/badge/MCP%20Tools-27-blueviolet.svg" alt="27 MCP Tools"></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/coverage-93.88%25-brightgreen.svg" alt="Coverage 93.88%">
  <img src="https://img.shields.io/badge/functions-100%25-brightgreen.svg" alt="Functions 100%">
  <img src="https://img.shields.io/badge/branches-81.46%25-green.svg" alt="Branches 81.46%">
</p>

<p align="center">
  <img src="https://img.shields.io/badge/lint-ESLint%20%2B%20Security-green.svg" alt="ESLint + Security">
  <img src="https://img.shields.io/badge/format-Prettier-ff69b4.svg" alt="Prettier">
  <img src="https://img.shields.io/badge/commits-Conventional-fe5196.svg?logo=conventionalcommits&logoColor=white" alt="Conventional Commits">
</p>

<p align="center">
  <img src="https://img.shields.io/badge/security-Trivy%20SBOM-important.svg" alt="Trivy Vulnerability Scan">
  <img src="https://img.shields.io/badge/secrets-Gitleaks-critical.svg" alt="Gitleaks Secret Scanning">
  <img src="https://img.shields.io/badge/SAST-CodeQL-blue.svg" alt="CodeQL Analysis">
  <img src="https://img.shields.io/badge/dependency%20review-enabled-brightgreen.svg" alt="Dependency Review">
</p>

<p align="center">
  <img src="https://img.shields.io/badge/tests-Node%2018%20%7C%2020%20%7C%2022-blue.svg" alt="Tested on Node 18, 20, 22">
  <img src="https://img.shields.io/badge/package%20manager-pnpm-orange.svg?logo=pnpm&logoColor=white" alt="pnpm">
  <img src="https://img.shields.io/badge/monorepo-pnpm%20workspaces-orange.svg" alt="pnpm Workspaces">
</p>

---

# TestRail MCP Server

A **Model Context Protocol (MCP) server** for [TestRail](https://www.testrail.com/) that enables AI assistants (GitHub Copilot, Claude, etc.) to interact with TestRail's test management platform directly from the IDE.

## Features

- **27 MCP Tools** — Query and manage projects, test cases, runs, results, plans, milestones, and more
- **Read & Write** — Browse test data and submit results, create runs and cases
- **Smart Formatting** — AI-friendly output with status summaries, pagination info, and truncation
- **Rate Limit Resilient** — Automatic retry with exponential backoff on 429 responses
- **Reference Data Caching** — Statuses, priorities, case types cached for 5 minutes
- **VS Code Extension** — Self-contained VSIX with bundled server

## Quick Start

### Standalone (stdio transport)

```bash
# Install
npm install -g testrail-mcp-server

# Configure
export TESTRAIL_BASE_URL="https://your-instance.testrail.io"
export TESTRAIL_USERNAME="your-email@example.com"
export TESTRAIL_API_KEY="your-api-key"
export TESTRAIL_PROJECT_ID="1"

# Run
testrail-mcp-server
```

### Claude Desktop / MCP Client

Add to your MCP client config:

```json
{
  "mcpServers": {
    "testrail": {
      "command": "npx",
      "args": ["testrail-mcp-server"],
      "env": {
        "TESTRAIL_BASE_URL": "https://your-instance.testrail.io",
        "TESTRAIL_USERNAME": "your-email@example.com",
        "TESTRAIL_API_KEY": "your-api-key",
        "TESTRAIL_PROJECT_ID": "1"
      }
    }
  }
}
```

### VS Code (`.vscode/mcp.json`)

For local development, point to the built server:

```json
{
  "servers": {
    "testrail": {
      "command": "node",
      "args": ["${workspaceFolder}/packages/server/dist/index.js"],
      "env": {
        "TESTRAIL_BASE_URL": "https://your-instance.testrail.io",
        "TESTRAIL_USERNAME": "your-email@example.com",
        "TESTRAIL_API_KEY": "your-api-key",
        "TESTRAIL_PROJECT_ID": "1"
      }
    }
  }
}
```

### VS Code Extension

1. Install the `.vsix` file
2. Set these VS Code settings:
   - `testrailMcp.baseUrl` — Your TestRail instance URL
   - `testrailMcp.username` — Your TestRail username (email)
   - `testrailMcp.apiKey` — Your TestRail API key

## Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `TESTRAIL_BASE_URL` | Yes | — | TestRail instance URL |
| `TESTRAIL_USERNAME` | Yes | — | TestRail username (email) |
| `TESTRAIL_API_KEY` | Yes | — | TestRail API key |
| `TESTRAIL_PROJECT_ID` | **Yes** | — | Default project ID (tools auto-use this when project_id is omitted) |
| `TESTRAIL_TIMEOUT_MS` | No | `30000` | HTTP request timeout |
| `TESTRAIL_MAX_RESULTS` | No | `250` | Default page size (max 250) |

## Available Tools

### Read-Only (21 tools)

| Tool | Description |
|------|-------------|
| `get_projects` | List all projects |
| `get_project` | Get project details |
| `get_cases` | List test cases (filterable by suite, section, priority, type) |
| `get_case` | Get case details with steps |
| `find_cases_by_path` | **Find test cases by suite name + section path** (resolves IDs automatically) |
| `get_runs` | List test runs |
| `get_run` | Get run details with status counts |
| `get_results_for_run` | Get results for a run |
| `get_results_for_case` | Get result history for a case in a run |
| `get_tests` | List tests in a run |
| `get_plans` | List test plans |
| `get_plan` | Get plan details with entries |
| `get_milestones` | List milestones |
| `get_statuses` | Get available statuses |
| `get_priorities` | Get priorities |
| `get_case_types` | Get case types |
| `get_case_fields` | Get case custom fields |
| `get_result_fields` | Get result custom fields |
| `get_templates` | Get case templates |
| `get_users` | List users |
| `get_suites` | List test suites |
| `get_sections` | List sections (folder tree) |

### Write (6 tools)

| Tool | Description |
|------|-------------|
| `add_result_for_case` | Submit a test result |
| `add_results_for_cases` | Bulk submit results |
| `add_run` | Create a test run |
| `close_run` | Close/archive a run |
| `add_case` | Create a test case |
| `update_case` | Update a test case |

### Resources

| URI | Description |
|-----|-------------|
| `testrail://health` | Server health check |
| `testrail://project/{id}/summary` | Project dashboard |

### Prompts

The server includes built-in prompts that guide the AI through multi-step workflows:

| Prompt | Description |
|--------|-------------|
| `find_test_cases` | Navigate TestRail hierarchy (Project > Suite > Section) to find cases |
| `test_run_summary` | Get comprehensive run summary with failure analysis |
| `project_overview` | Full project dashboard with suites, runs, milestones |
| `submit_test_results` | Submit results for multiple cases in a run |

## Example Prompts

Here are example natural-language prompts you can use with any MCP-compatible AI assistant:

### Browsing & Discovery

```
Show me all active test runs in my project

List all test suites and their sections

Get all test cases in the "Smoke Tests" section

What milestones are coming up?

Show me the section tree for suite "Regression"
```

### Finding Test Cases by Path

```
Find test cases in suite "xyz", section "AbC > subsection DEF"

List cases in suite "Regression" section "Smoke Tests > Login"
```

The AI will call `find_cases_by_path` which resolves the entire path in one step:
1. Finds the suite by name
2. Traverses the section hierarchy to match the path
3. Returns all cases with IDs, titles, and priorities

You can also be explicit about the project:
```
Find test cases in project 18, suite "xyz", section "ABC > subsection DEF > subsection PQR"
```

### Analyzing Runs & Results

```
Summarize test run 1234 — what's passing and failing?

Show me all failed tests in run 1234 with their error messages

Get the result history for case C5678 in run 1234

Compare pass rates across all active runs
```

### Submitting Results

```
Mark cases C101, C102, C103 as passed in run 1234

Create a new test run called "Sprint 15 Smoke" with cases C101-C110

Submit results: C101=passed, C102=failed (login timeout), C103=blocked
```

### Project Management

```
Give me an overview of project 1 — suites, active runs, milestones

What test plans are currently active?

List all users who can be assigned tests

What custom case fields and statuses are available?
```

## Development

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Lint
pnpm lint

# Format
pnpm format

# Typecheck
pnpm typecheck

# Full CI validation
pnpm ci
```

### Testing with MCP Inspector

```bash
cd packages/server
TESTRAIL_BASE_URL=https://your-instance.testrail.io \
TESTRAIL_USERNAME=your-email@example.com \
TESTRAIL_API_KEY=your-api-key \
TESTRAIL_PROJECT_ID=1 \
npx @modelcontextprotocol/inspector node dist/index.js
```

## License

[MIT](https://github.com/bhayanak/testrail-mcp-server/blob/main/LICENSE)
