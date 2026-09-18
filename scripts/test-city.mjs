import { build } from 'esbuild';
import { mkdir } from 'node:fs/promises';
await mkdir('.cache', { recursive: true });
await build({ entryPoints: ['tests/city.test.ts'], outfile: '.cache/city.test.mjs', bundle: true, platform: 'node', format: 'esm', logLevel: 'warning' });
await import('../.cache/city.test.mjs?' + Date.now());
