import {createNestVolume,NEST_CELLS,NURSERY} from './nest-volume';
import { Ant, ColonyState, DEFAULT_SETTINGS, WORLD, CELL, COLS, ROWS, FIELD_COLS, FIELD_ROWS, NEST_CENTER } from './types';
export function random(s: ColonyState) { let t = s.rng += 0x6D2B79F5; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); s.rng >>>= 0; return ((t ^ t >>> 14) >>> 0) / 4294967296; }
export function createAnt(s: ColonyState, queen = false): Ant {
 return { id:s.nextId++,x:680,y:380,z:NEST_CENTER,angle:random(s)*Math.PI*2,view:'nest',task:queen?'queen':'resting',age:0,energy:1,hunger:0,cargo:null,amount:0,target:null,memory:null,timer:0,decision:0,tendency:random(s),reason:queen?'Producing eggs when nutrition allows':'Resting in the nest',history:[],alive:true,carryingId:null };
}
export function createColony(seed=28471, count=200): ColonyState {
 const s:ColonyState={version:2,simulator:'ants',seed,rng:seed>>>0,tick:0,nextId:1,time:0,settings:{...DEFAULT_SETTINGS},ants:[],brood:[],resources:[],obstacles:[],debris:[],nest:createNestVolume(),excavation:Array(NEST_CELLS).fill(0),pheromones:Array(FIELD_COLS*FIELD_ROWS).fill(0),traffic:Array(FIELD_COLS*FIELD_ROWS).fill(0),stores:{carbohydrate:45,protein:25,water:40},queenEggTimer:0,births:0,deaths:0,excavated:0,depositedSoil:0,removedWaste:0,history:[],events:[{time:0,text:'A new colony is ready to explore.'}]};
 s.ants.push(createAnt(s,true));
 for(let i=0;i<count;i++){const a=createAnt(s);a.age=random(s)*45;a.energy=.65+random(s)*.35;a.hunger=random(s)*.25;
 if(i<125){a.view='surface';a.task='exploring';a.reason='Searching for food and scent trails';const angle=random(s)*Math.PI*2;const radius=12+random(s)*280;a.x=680+Math.cos(angle)*radius;a.y=430+Math.sin(angle)*radius;}
 else{a.x=600+random(s)*150;a.y=365+random(s)*35;a.task=i<168?'nursing':i<188?'digging':'resting';a.reason=a.task==='nursing'?'Checking brood conditions':a.task==='digging'?'Seeking room to expand':'Recovering energy';}s.ants.push(a);}
 for(let i=0;i<36;i++)s.brood.push({id:s.nextId++,x:460+random(s)*75,y:529+random(s)*28,z:NURSERY.z,stage:i<12?'egg':i<26?'larva':'pupa',progress:random(s)*.7,nutrition:.85,care:.85,carriedBy:null});
 for(const [x,y,kind,amount,radius] of [[980,230,'carbohydrate',260,30],[365,620,'protein',190,26],[1035,660,'water',300,36],[350,250,'carbohydrate',160,23]] as const)s.resources.push({id:s.nextId++,x,y,kind,amount,initial:amount,radius});
 for(const [x,y,radius] of [[514,304,28],[862,635,36],[1083,462,24],[367,446,20],[728,711,18]])s.obstacles.push({id:s.nextId++,x,y,radius});
 for(const a of s.ants)if(a.view==='surface'&&!isOpen(s,a,'surface')){a.x=WORLD.entrance.x+(random(s)-.5)*20;a.y=WORLD.entrance.y+(random(s)-.5)*20;}
 return s;
}

import { BehaviorContext, updateBehavior } from './behavior';
import { updatePhysiology } from './physiology';
import { decayFields } from './pheromones';
import { isOpen, distance } from './spatial';
import type { Command } from './types';
import { validateSave, commandSchema } from './validation';
export const FIXED_DT=1/30;
export class AntSimulation {
 state:ColonyState;paused=false;speed=1;context=new BehaviorContext();
 constructor(seed=28471,count=200){this.state=createColony(seed,count);this.context.rebuild(this.state);}
 step(steps=1){for(let k=0;k<steps;k++){if(this.paused)return;const s=this.state;s.tick++;s.time=s.tick*FIXED_DT;this.context.rebuild(s);for(const ant of s.ants)if(ant.alive)updateBehavior(s,ant,FIXED_DT,this.context);updatePhysiology(s,FIXED_DT);if(s.tick%6===0)decayFields(s,FIXED_DT*6);if(s.tick%150===0){s.history.push({time:s.time,population:s.ants.filter(a=>a.task!=='queen').length,brood:s.brood.length,food:s.stores.carbohydrate+s.stores.protein,foraging:s.ants.filter(a=>a.view==='surface').length});if(s.history.length>600)s.history.shift();}}}
 command(input:Command){const parsed=commandSchema.safeParse(input);if(!parsed.success)throw new Error(input?.type==='place'?'Choose a spot inside the habitat, away from its outer edge.':'This setting is outside the supported range.');const command=parsed.data as Command;const s=this.state;
 switch(command.type){case 'pause':this.paused=command.paused;break;case 'speed':this.speed=command.speed;break;
 case 'settings':Object.assign(s.settings,command.settings);break;
 case 'reset':this.state=createColony(command.seed);this.context=new BehaviorContext();this.context.rebuild(this.state);this.paused=false;this.speed=1;break;
 case 'load':{const replacement=validateSave(command.state);this.state=replacement;this.context=new BehaviorContext();this.context.rebuild(replacement);this.paused=true;break;}
 case 'place':{
 const p={x:command.x,y:command.y};if(command.kind==='erase'){const resource=s.resources.find(r=>distance(r,p)<r.radius+18);if(resource)s.resources=s.resources.filter(r=>r.id!==resource.id);else s.obstacles=s.obstacles.filter(o=>distance(o,p)>o.radius+15);}
 else if(command.kind==='obstacle'){if(s.obstacles.length>=200)throw new Error('This world supports up to 200 rocks. Remove one first.');if(distance(p,WORLD.entrance)<65)throw new Error('Keep the immediate nest entrance clear.');if(!isOpen(s,p,'surface',25))throw new Error('Place rocks on open ground.');if(s.ants.some(a=>a.view==='surface'&&distance(a,p)<36)||s.resources.some(r=>distance(r,p)<r.radius+32))throw new Error('Place the rock away from ants and resources.');s.obstacles.push({id:s.nextId++,...p,radius:27});}
 else{if(s.resources.length>=200)throw new Error('This world supports up to 200 food and water sources.');if(!isOpen(s,p,'surface',25))throw new Error('Place resources on open ground.');s.resources.push({id:s.nextId++,...p,kind:command.kind,amount:250,initial:250,radius:25});}this.context.rebuild(s);break;}
 case 'snapshot':break;
 }return this.state;
 }
 serialize(){return JSON.stringify(this.state);}
}
