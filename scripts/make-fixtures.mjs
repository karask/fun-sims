import {build} from 'esbuild';
import {writeFile,mkdir} from 'node:fs/promises';
await mkdir('.cache',{recursive:true});
await build({entryPoints:['lib/simulation/engine.ts'],outfile:'.cache/engine.mjs',bundle:true,platform:'node',format:'esm',logLevel:'warning'});
const {createColony}=await import('../.cache/engine.mjs');
for(const count of [200,1000,3000])await writeFile(`.cache/colony-${count}.json`,JSON.stringify(createColony(28471,count)));
await writeFile('.cache/invalid-colony.json',JSON.stringify({version:99,simulator:'ants'}));
