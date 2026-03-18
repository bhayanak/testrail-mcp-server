import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { loadConfig, maskConfig, ConfigError } from './config.js';
import { createServer } from './server.js';

async function main() {
  try {
    const config = loadConfig();
    process.stderr.write(
      `[testrail-mcp-server] Starting with config: ${JSON.stringify(maskConfig(config))}\n`,
    );

    const server = createServer(config);
    const transport = new StdioServerTransport();

    // Graceful shutdown
    const shutdown = async () => {
      process.stderr.write('[testrail-mcp-server] Shutting down...\n');
      await server.close();
      process.exit(0);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

    await server.connect(transport);
    process.stderr.write('[testrail-mcp-server] Server running on stdio transport\n');
  } catch (error) {
    if (error instanceof ConfigError) {
      process.stderr.write(`[testrail-mcp-server] Configuration error: ${error.message}\n`);
      process.exit(1);
    }
    process.stderr.write(
      `[testrail-mcp-server] Fatal error: ${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exit(1);
  }
}

main();
