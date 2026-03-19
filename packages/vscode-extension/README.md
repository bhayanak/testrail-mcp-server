# TestRail MCP Server — VS Code Extension

A VS Code extension [TestRail MCP Server VS Code extension](https://marketplace.visualstudio.com/search?term=TestRail%20MCP%20Server&target=VSCode&category=AI&sortBy=Relevance) that bundles the [TestRail MCP Server](https://www.npmjs.com/package/testrail-mcp-server) and exposes it to AI assistants (GitHub Copilot, Claude, etc.) directly in your editor.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/bhayanak/testrail-mcp-server/blob/main/LICENSE)
[![VS Code ≥1.85](https://img.shields.io/badge/VS%20Code-%3E%3D1.85-blue.svg)](https://code.visualstudio.com/)

## Features

- **27 MCP Tools** — Query and manage TestRail projects, cases, runs, results, plans, milestones
- **Self-contained** — Server is bundled inside the extension, no separate install needed
- **Lightweight** — VSIX < 500 KB

## Setup

1. Install [Testrail MCP Server VS Code extension](https://marketplace.visualstudio.com/search?term=TestRail%20MCP%20Server&target=VSCode&category=AI&sortBy=Relevance) , the one by `fazorboy`

2. Configure these settings (in VS Code or via environment variables):

| Setting (VS Code)         | Env Var                    | Required | Default                  | Description |
|--------------------------|----------------------------|----------|--------------------------|-------------|
| `testrailMcp.apiKey`     | `TESTRAIL_API_KEY`         | Yes      | —                        | TestRail API key (generate at My Settings > API Keys) |
| `testrailMcp.baseUrl`    | `TESTRAIL_BASE_URL`        | Yes      | —                        | TestRail instance URL (e.g., `https://company.testrail.io`) |
| `testrailMcp.username`   | `TESTRAIL_USERNAME`        | Yes      | —                        | TestRail username (email address) |
| `testrailMcp.projectId`  | `TESTRAIL_PROJECT_ID`      | Yes      | —                        | Default project ID (used when not specified in tool params) |
| `testrailMcp.timeout`    | `TESTRAIL_TIMEOUT_MS`      | No       | `30000`                  | HTTP request timeout in milliseconds |
| `testrailMcp.maxResults` | `TESTRAIL_MAX_RESULTS`     | No       | `250`                    | Default page size for list queries (max 250) |
| `testrailMcp.cacheEnabled` | `TESTRAIL_CACHE_ENABLED`  | No       | `true`                   | Enable disk caching for semi-static TestRail data |
| `testrailMcp.cacheTtlHours` | `TESTRAIL_CACHE_TTL_HOURS` | No     | `168` (7 days)           | Cache time-to-live in hours |
| `testrailMcp.cacheDir`   | `TESTRAIL_CACHE_DIR`       | No       | `~/.testrail-mcp-cache`  | Directory for disk cache files |

## Usage

Once configured, AI assistants in VS Code can use natural language to interact with TestRail:

```
Show me all active test runs
Find test cases in suite "Regression" section "Smoke > Login"
Summarize run 1234
```

## License

[MIT](https://github.com/bhayanak/testrail-mcp-server/blob/main/LICENSE)
