import {build} from 'esbuild';
import {mkdir} from 'node:fs/promises';
await mkdir('.cache',{recursive:true});
await build({entryPoints:['tests/engine.test.ts'],outfile:'.cache/engine.test.mjs',bundle:true,platform:'node',format:'esm',logLevel:'warning'});
await import('../.cache/engine.test.mjs?'+Date.now());

await import('./test-solar.mjs');

await import('./test-nest-scene.mjs');
