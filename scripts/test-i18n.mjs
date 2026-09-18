import { build } from 'esbuild';
import { mkdir } from 'node:fs/promises';
await mkdir('.cache', { recursive: true });
await build({ entryPoints: ['tests/i18n.test.ts'], outfile: '.cache/i18n.test.mjs', bundle: true, platform: 'node', format: 'esm', logLevel: 'warning' });
await import('../.cache/i18n.test.mjs?' + Date.now());
