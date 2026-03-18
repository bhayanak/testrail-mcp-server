# @testrail-mcp/server

A **Model Context Protocol (MCP) server** for [TestRail](https://www.testrail.com/) that enables AI assistants (GitHub Copilot, Claude, etc.) to interact with TestRail's test management platform directly from the IDE.

[![npm version](https://img.shields.io/npm/v/@testrail-mcp/server.svg)](https://www.npmjs.com/package/@testrail-mcp/server)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/bhayanak/testrail-mcp-server/blob/main/LICENSE)
[![Node.js ≥18](https://img.shields.io/badge/node-%3E%3D18-blue.svg)](https://nodejs.org/)

## Features

- **27 MCP Tools** — Query and manage projects, test cases, runs, results, plans, milestones, and more
- **Read & Write** — Browse test data and submit results, create runs and cases
- **Smart Formatting** — AI-friendly output with status summaries, pagination info, and truncation
- **Rate Limit Resilient** — Automatic retry with exponential backoff on 429 responses
- **Reference Data Caching** — Statuses, priorities, case types cached for 5 minutes

## Installation

```bash
npm install -g @testrail-mcp/server
```

## Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `TESTRAIL_BASE_URL` | Yes | — | TestRail instance URL (e.g., `https://company.testrail.io`) |
| `TESTRAIL_USERNAME` | Yes | — | TestRail username (email) |
| `TESTRAIL_API_KEY` | Yes | — | TestRail API key |
| `TESTRAIL_PROJECT_ID` | **Yes** | — | Default project ID (tools auto-use this when `project_id` is omitted) |
| `TESTRAIL_TIMEOUT_MS` | No | `30000` | HTTP request timeout |
| `TESTRAIL_MAX_RESULTS` | No | `250` | Default page size (max 250) |

## Usage

### Standalone (stdio transport)

```bash
export TESTRAIL_BASE_URL="https://your-instance.testrail.io"
export TESTRAIL_USERNAME="your-email@example.com"
export TESTRAIL_API_KEY="your-api-key"
export TESTRAIL_PROJECT_ID="1"

testrail-mcp-server
```

### Claude Desktop / MCP Client

```json
{
  "mcpServers": {
    "testrail": {
      "command": "npx",
      "args": ["@testrail-mcp/server"],
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

## Available Tools

### Read-Only (21 tools)

| Tool | Description |
|------|-------------|
| `get_projects` | List all projects |
| `get_project` | Get project details |
| `get_cases` | List test cases (filterable by suite, section, priority, type) |
| `get_case` | Get case details with steps |
| `find_cases_by_path` | Find test cases by suite name + section path (resolves IDs automatically) |
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

## Example Prompts

```
Find test cases in suite "Regression" section "Smoke Tests > Login"
Show me all active test runs in my project
Summarize test run 1234 — what's passing and failing?
Mark cases C101, C102, C103 as passed in run 1234
Give me an overview of project 1 — suites, active runs, milestones
```

## License

[MIT](https://github.com/bhayanak/testrail-mcp-server/blob/main/LICENSE)
