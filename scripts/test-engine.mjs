import {build} from 'esbuild';
import {mkdir} from 'node:fs/promises';
await mkdir('.cache',{recursive:true});
await build({entryPoints:['tests/engine.test.ts'],outfile:'.cache/engine.test.mjs',bundle:true,platform:'node',format:'esm',logLevel:'warning'});
await import('../.cache/engine.test.mjs?'+Date.now());

await import('./test-solar.mjs');

await import('./test-nest-scene.mjs');

await build({entryPoints:['tests/learning.test.ts'],outfile:'.cache/learning.test.mjs',bundle:true,platform:'node',format:'esm',logLevel:'warning'});
await import('../.cache/learning.test.mjs?'+Date.now());

await build({entryPoints:['tests/encounters.test.ts'],outfile:'.cache/encounters.test.mjs',bundle:true,platform:'node',format:'esm',logLevel:'warning'});
await import('../.cache/encounters.test.mjs?'+Date.now());
