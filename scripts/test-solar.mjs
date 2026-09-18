import {build} from 'esbuild';
import {mkdir} from 'node:fs/promises';
await mkdir('.cache',{recursive:true});
await build({entryPoints:['tests/solar.test.ts'],outfile:'.cache/solar.test.mjs',bundle:true,platform:'node',format:'esm',logLevel:'warning'});
await import('../.cache/solar.test.mjs?'+Date.now());
