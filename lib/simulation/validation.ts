import {NEST_CELLS,NEST_SLICE,volumeIndex} from './nest-volume';
import { z } from 'zod';
import { ColonyState,COLS,ROWS,FIELD_COLS,FIELD_ROWS,NEST_CENTER,NEST_LAYERS,NEST_LAYER_SIZE } from './types';
const finite=z.number().finite();const bounded=(min:number,max:number)=>finite.min(min).max(max);const integer=(max=1e9)=>z.number().int().min(0).max(max);const fraction=bounded(0,1);const id=integer();const point=z.object({x:bounded(0,1400),y:bounded(0,900),z:bounded(0,NEST_LAYERS*NEST_LAYER_SIZE-.001).optional()}).strict();
export const settingsSchema=z.object({temperature:bounded(5,40),moisture:bounded(5,95),lifecycle:bounded(.25,4),exploration:fraction,pheromoneDecay:bounded(.003,.055),sensitivity:bounded(.2,3),flexibility:bounded(.1,1)}).strict();
const task=z.enum(['exploring','foraging','returning','nursing','digging','cleaning','resting','grooming','queen']);const kind=z.enum(['carbohydrate','protein','water']);const view=z.enum(['surface','nest']);
const ant=point.extend({id,z:bounded(0,NEST_LAYERS*NEST_LAYER_SIZE-.001).optional(),angle:finite,view,task,age:bounded(0,10000),energy:fraction,hunger:fraction,cargo:z.enum(['carbohydrate','protein','water','soil','waste','brood','corpse']).nullable(),amount:bounded(0,100),target:point.nullable(),memory:point.nullable(),timer:bounded(0,1e9),decision:bounded(-1,10),tendency:fraction,reason:z.string().max(250),history:z.array(z.string().max(250)).max(4),alive:z.boolean(),carryingId:id.nullable()}).strict();
const stateSchema=z.object({version:z.union([z.literal(1),z.literal(2)]),simulator:z.literal('ants'),seed:integer(4294967295),rng:integer(4294967295),tick:integer(),nextId:id,time:bounded(0,1e9),settings:settingsSchema,ants:z.array(ant).max(3001),brood:z.array(point.extend({id,stage:z.enum(['egg','larva','pupa']),progress:fraction,nutrition:fraction,care:fraction,carriedBy:id.nullable()}).strict()).max(600),resources:z.array(point.extend({id,kind,amount:bounded(0,100000),initial:bounded(.01,100000),radius:bounded(1,80)}).strict()).max(200),obstacles:z.array(point.extend({id,radius:bounded(1,80)}).strict()).max(200),debris:z.array(point.extend({id,view,kind:z.enum(['waste','corpse']),carriedBy:id.nullable()}).strict()).max(10000),nest:z.array(z.union([z.literal(0),z.literal(1)])).min(COLS*ROWS).max(NEST_CELLS),excavation:z.array(bounded(0,1)).min(COLS*ROWS).max(NEST_CELLS),pheromones:z.array(bounded(0,50)).length(FIELD_COLS*FIELD_ROWS),traffic:z.array(bounded(0,1e8)).length(FIELD_COLS*FIELD_ROWS),stores:z.object({carbohydrate:bounded(0,100000),protein:bounded(0,100000),water:bounded(0,100000)}).strict(),queenEggTimer:bounded(0,12),births:integer(),deaths:integer(),excavated:integer(),depositedSoil:integer(),removedWaste:integer(),history:z.array(z.object({time:bounded(0,1e9),population:integer(3000),brood:integer(600),food:bounded(0,200000),foraging:integer(3001)}).strict()).max(600),events:z.array(z.object({time:bounded(0,1e9),text:z.string().max(300)}).strict()).max(30)}).strict();
export function validateSave(input:unknown):ColonyState {
 const parsed=stateSchema.safeParse(input);if(!parsed.success)throw new Error('This file is not a valid supported Ant Colony save. Your current colony is unchanged.');const s=parsed.data;
 const expected=s.version===1?NEST_SLICE:NEST_CELLS;
 if(s.nest.length!==expected||s.excavation.length!==expected)throw new Error('This save contains an invalid nest volume.');
 if(s.version===2&&[...s.ants,...s.brood,...s.debris].some(p=>p.z===undefined))throw new Error('This 3D save is missing spatial coordinates.');
 if(s.version===1){
  // Deterministic migration: preserve the old floor plan, clock, RNG, and every entity.
  const oldNest=s.nest,oldDig=s.excavation;
  s.nest=Array(NEST_CELLS).fill(0);s.excavation=Array(NEST_CELLS).fill(0);
  const center=Math.floor(NEST_CENTER/NEST_LAYER_SIZE);
  for(let layer=center-1;layer<=center+1;layer++)for(let i=0;i<NEST_SLICE;i++)s.nest[layer*NEST_SLICE+i]=oldNest[i];
  for(let i=0;i<NEST_SLICE;i++)s.excavation[center*NEST_SLICE+i]=oldDig[i];
  for(const a of s.ants)a.z=NEST_CENTER;
  for(const b of [...s.brood,...s.debris])b.z=NEST_CENTER;
  s.version=2;
 }
 const all=[...s.ants,...s.brood,...s.resources,...s.obstacles,...s.debris];const ids=new Set(all.map(a=>a.id));if(ids.size!==all.length||all.some(a=>a.id>=s.nextId)||!s.nest.some(Boolean)||s.ants.filter(a=>a.task==='queen').length>1||Math.abs(s.time-s.tick/30)>.001)throw new Error('This save contains inconsistent colony data.');
 for(const b of [...s.brood,...s.debris])if(b.carriedBy!==null&&!s.ants.some(a=>a.id===b.carriedBy&&a.carryingId===b.id))throw new Error('This save contains an invalid carrying relationship.');
 if(s.ants.some(a=>a.view==='nest'&&!s.nest[volumeIndex(a)]))throw new Error('This save places an ant outside the nest tunnels.');
 if([...s.brood,...s.debris.filter(d=>d.view==='nest')].some(p=>!s.nest[volumeIndex(p)]))throw new Error('This save places brood or refuse outside the nest tunnels.');
 return s as ColonyState;
}
export const commandSchema=z.discriminatedUnion('type',[
 z.object({type:z.literal('pause'),paused:z.boolean()}).strict(),z.object({type:z.literal('speed'),speed:z.union([z.literal(1),z.literal(2),z.literal(4),z.literal(8)])}).strict(),
 z.object({type:z.literal('settings'),settings:settingsSchema.partial()}).strict(),z.object({type:z.literal('place'),kind:z.enum(['carbohydrate','protein','water','obstacle','erase']),x:bounded(30,1370),y:bounded(30,870)}).strict(),
 z.object({type:z.literal('reset'),seed:integer(4294967295)}).strict(),z.object({type:z.literal('load'),state:z.unknown()}).strict(),z.object({type:z.literal('snapshot')}).strict()
]);
