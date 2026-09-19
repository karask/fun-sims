import { build } from 'esbuild';
import { mkdir } from 'node:fs/promises';
await mkdir('.cache', { recursive: true });
await build({ entryPoints: ['tests/city.test.ts'], outfile: '.cache/city.test.mjs', bundle: true, platform: 'node', format: 'esm', logLevel: 'warning' });
await import('../.cache/city.test.mjs?' + Date.now());
await build({ entryPoints: ['tests/city-scene.test.ts'], outfile: '.cache/city-scene.test.mjs', bundle: true, platform: 'node', format: 'esm', logLevel: 'warning' });
await import('../.cache/city-scene.test.mjs?' + Date.now());
await build({ entryPoints: ['tests/city-growth.test.ts'], outfile: '.cache/city-growth.test.mjs', bundle: true, platform: 'node', format: 'esm', logLevel: 'warning' });
await import('../.cache/city-growth.test.mjs?' + Date.now());
