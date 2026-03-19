import * as vscode from 'vscode';
import * as path from 'path';

let mcpDisposable: vscode.Disposable | null = null;
let outputChannel: vscode.OutputChannel;

export function activate(context: vscode.ExtensionContext) {
  outputChannel = vscode.window.createOutputChannel('TestRail MCP');
  outputChannel.appendLine('TestRail MCP extension activated');

  // Register the MCP server
  registerMcpServer(context);

  // Notify on config changes (env vars are only read at process spawn)
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('testrailMcp')) {
        outputChannel.appendLine('Configuration changed — re-registering MCP server...');
        registerMcpServer(context);
        vscode.window.showInformationMessage(
          'TestRail MCP settings changed. The MCP server will restart with updated configuration.',
        );
      }
    }),
  );

  // Register restart command
  context.subscriptions.push(
    vscode.commands.registerCommand('testrailMcp.restart', () => {
      outputChannel.appendLine('Manual restart requested');
      registerMcpServer(context);
      vscode.window.showInformationMessage('TestRail MCP server restarted.');
    }),
  );
}

function registerMcpServer(context: vscode.ExtensionContext) {
  // Dispose previous registration if any
  if (mcpDisposable) {
    mcpDisposable.dispose();
    mcpDisposable = null;
  }

  const config = vscode.workspace.getConfiguration('testrailMcp');

  const apiKey = config.get<string>('apiKey', '');
  const baseUrl = config.get<string>('baseUrl', '');
  const username = config.get<string>('username', '');
  const projectId = config.get<string>('projectId', '');

  if (!apiKey || !baseUrl || !username || !projectId) {
    outputChannel.appendLine(
      'TestRail MCP: Missing required configuration. Set testrailMcp.apiKey, testrailMcp.baseUrl, testrailMcp.username, and testrailMcp.projectId in settings.',
    );
    return;
  }

  const serverPath = path.join(context.extensionPath, 'dist', 'server.js');

  const cacheEnabled = config.get<boolean>('cacheEnabled', true);
  const cacheTtlHours = config.get<number>('cacheTtlHours', 168);
  const cacheDir = config.get<string>('cacheDir', '');

  const env: Record<string, string> = {
    TESTRAIL_BASE_URL: baseUrl,
    TESTRAIL_USERNAME: username,
    TESTRAIL_API_KEY: apiKey,
    TESTRAIL_PROJECT_ID: projectId,
    TESTRAIL_TIMEOUT_MS: String(config.get<number>('timeout', 30000)),
    TESTRAIL_MAX_RESULTS: String(config.get<number>('maxResults', 250)),
    TESTRAIL_CACHE_ENABLED: String(cacheEnabled),
    TESTRAIL_CACHE_TTL_HOURS: String(cacheTtlHours),
    ...(cacheDir ? { TESTRAIL_CACHE_DIR: cacheDir } : {}),
  };

  mcpDisposable = vscode.lm.registerMcpServerDefinitionProvider('testrail-mcp', {
    provideMcpServerDefinitions(): vscode.McpStdioServerDefinition[] {
      return [
        new vscode.McpStdioServerDefinition(
          'TestRail MCP',
          process.execPath,
          [serverPath],
          env,
        ),
      ];
    },
  });

  context.subscriptions.push(mcpDisposable);
  outputChannel.appendLine('TestRail MCP server registered via MCP API');
}

export function deactivate() {
  if (mcpDisposable) {
    mcpDisposable.dispose();
    mcpDisposable = null;
  }
}
