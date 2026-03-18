import * as vscode from 'vscode';
import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';

let serverProcess: ChildProcess | null = null;
let outputChannel: vscode.OutputChannel;

export function activate(context: vscode.ExtensionContext) {
  outputChannel = vscode.window.createOutputChannel('TestRail MCP');
  outputChannel.appendLine('TestRail MCP extension activated');

  // Start the MCP server
  startServer(context);

  // Restart when config changes
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('testrailMcp')) {
        outputChannel.appendLine('Configuration changed, restarting server...');
        stopServer();
        startServer(context);
      }
    }),
  );

  // Register restart command
  context.subscriptions.push(
    vscode.commands.registerCommand('testrailMcp.restart', () => {
      outputChannel.appendLine('Manual restart requested');
      stopServer();
      startServer(context);
    }),
  );
}

function startServer(context: vscode.ExtensionContext) {
  const config = vscode.workspace.getConfiguration('testrailMcp');

  const baseUrl = config.get<string>('baseUrl', '');
  const username = config.get<string>('username', '');
  const apiKey = config.get<string>('apiKey', '');
  const projectId = config.get<string>('projectId', '');

  if (!baseUrl || !username || !apiKey || !projectId) {
    outputChannel.appendLine(
      'TestRail MCP: Missing required configuration. Set testrailMcp.baseUrl, testrailMcp.username, testrailMcp.apiKey, and testrailMcp.projectId in settings.',
    );
    return;
  }

  const serverPath = path.join(context.extensionPath, 'dist', 'server.js');

  const env: Record<string, string> = {
    ...process.env as Record<string, string>,
    TESTRAIL_BASE_URL: baseUrl,
    TESTRAIL_USERNAME: username,
    TESTRAIL_API_KEY: apiKey,
    TESTRAIL_PROJECT_ID: projectId,
    TESTRAIL_TIMEOUT_MS: String(config.get<number>('timeout', 30000)),
    TESTRAIL_MAX_RESULTS: String(config.get<number>('maxResults', 250)),
  };

  serverProcess = spawn('node', [serverPath], {
    env,
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  serverProcess.stderr?.on('data', (data: Buffer) => {
    outputChannel.appendLine(data.toString().trim());
  });

  serverProcess.on('error', (err) => {
    outputChannel.appendLine(`Server error: ${err.message}`);
  });

  serverProcess.on('exit', (code) => {
    outputChannel.appendLine(`Server exited with code ${code}`);
    serverProcess = null;
  });

  outputChannel.appendLine(`TestRail MCP server started (PID: ${serverProcess.pid})`);
}

function stopServer() {
  if (serverProcess) {
    outputChannel.appendLine('Stopping TestRail MCP server...');
    serverProcess.kill('SIGTERM');
    serverProcess = null;
  }
}

export function deactivate() {
  stopServer();
}
