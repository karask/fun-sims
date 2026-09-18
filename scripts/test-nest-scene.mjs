import {build} from 'esbuild';
import {mkdir} from 'node:fs/promises';
await mkdir('.cache',{recursive:true});
await build({entryPoints:['tests/nest-scene.test.ts'],outfile:'.cache/nest-scene.test.mjs',bundle:true,platform:'node',format:'esm',logLevel:'warning'});
await import('../.cache/nest-scene.test.mjs?'+Date.now());
