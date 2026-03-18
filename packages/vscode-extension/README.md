# TestRail MCP Server — VS Code Extension

A VS Code extension that bundles the [TestRail MCP Server](https://github.com/bhayanak/testrail-mcp-server) and exposes it to AI assistants (GitHub Copilot, Claude, etc.) directly in your editor.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/bhayanak/testrail-mcp-server/blob/main/LICENSE)
[![VS Code ≥1.85](https://img.shields.io/badge/VS%20Code-%3E%3D1.85-blue.svg)](https://code.visualstudio.com/)

## Features

- **27 MCP Tools** — Query and manage TestRail projects, cases, runs, results, plans, milestones
- **Self-contained** — Server is bundled inside the extension, no separate install needed
- **Lightweight** — VSIX < 500 KB

## Setup

1. Install the `.vsix` file (or from the VS Code Marketplace)
2. Configure these VS Code settings:

| Setting | Required | Description |
|---------|----------|-------------|
| `testrailMcp.baseUrl` | Yes | TestRail instance URL (e.g., `https://company.testrail.io`) |
| `testrailMcp.username` | Yes | TestRail username (email) |
| `testrailMcp.apiKey` | Yes | TestRail API key |
| `testrailMcp.projectId` | Yes | Default project ID |
| `testrailMcp.timeout` | No | HTTP timeout in ms (default: 30000) |
| `testrailMcp.maxResults` | No | Default page size (default: 250) |

## Usage

Once configured, AI assistants in VS Code can use natural language to interact with TestRail:

```
Show me all active test runs
Find test cases in suite "Regression" section "Smoke > Login"
Summarize run 1234
```

## Development

```bash
# From the monorepo root
pnpm install
pnpm build

# Package the VSIX
cd packages/vscode-extension
pnpm package
```

## License

[MIT](https://github.com/bhayanak/testrail-mcp-server/blob/main/LICENSE)
