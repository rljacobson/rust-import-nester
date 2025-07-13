// esbuild.config.js
const esbuild = require('esbuild');

esbuild
  .build({
    entryPoints: ['src/extension.ts'],
    bundle: true,
    outfile: 'dist/extension.js',
    external: ['vscode'],
    platform: 'node',
    sourcemap: true,
    watch: {
      onRebuild(error, result) {
        if (error) {
          console.error('❌ Build failed:', error.message);
        } else {
          console.log('✅ Build succeeded');
        }
      },
    },
  })
  .then(() => console.log('👀 Watching for changes...'))
  .catch(() => process.exit(1));
