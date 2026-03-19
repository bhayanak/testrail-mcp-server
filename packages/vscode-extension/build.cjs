/* eslint-disable @typescript-eslint/no-var-requires */
const esbuild = require('esbuild');
const path = require('path');

const isWatch = process.argv.includes('--watch');

/** @type {import('esbuild').BuildOptions} */
const extensionConfig = {
  entryPoints: [path.resolve(__dirname, 'src/extension.ts')],
  bundle: true,
  outfile: path.resolve(__dirname, 'dist/extension.js'),
  external: ['vscode'],
  format: 'cjs',
  platform: 'node',
  target: 'node18',
  sourcemap: true,
  minify: !isWatch,
};

/** @type {import('esbuild').BuildOptions} */
const serverConfig = {
  entryPoints: [path.resolve(__dirname, '../server/src/index.ts')],
  bundle: true,
  outfile: path.resolve(__dirname, 'dist/server.js'),
  format: 'cjs',
  platform: 'node',
  target: 'node18',
  sourcemap: true,
  minify: !isWatch,
};

async function build() {
  try {
    if (isWatch) {
      const extCtx = await esbuild.context(extensionConfig);
      const srvCtx = await esbuild.context(serverConfig);
      await Promise.all([extCtx.watch(), srvCtx.watch()]);
      console.log('[build] Watching for changes...');
    } else {
      await Promise.all([
        esbuild.build(extensionConfig),
        esbuild.build(serverConfig),
      ]);
      console.log('[build] Extension and server built successfully');
    }
  } catch (err) {
    console.error('[build] Build failed:', err);
    process.exit(1);
  }
}

build();
