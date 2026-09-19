import assert from 'node:assert/strict';
import {AntSimulation} from '../lib/simulation/engine';
import {updateBehavior} from '../lib/simulation/behavior';
import {Enemy} from '../lib/simulation/types';
import {validateSave} from '../lib/simulation/validation';
import {isOpen} from '../lib/simulation/spatial';
import {decayAlarm,respondToThreat,updateEncounters} from '../lib/simulation/encounters';
import {fieldIndex} from '../lib/simulation/pheromones';
let passed=0;
function test(name:string,fn:()=>void){fn();passed++;console.log('PASS '+name);}
function visitor(sim:AntSimulation,kind:'spider'|'rival',x=1100,y=700):Enemy{
 const e:Enemy={id:sim.state.nextId++,kind,x,y,angle:0,mode:'roaming',energy:1,age:0,cooldown:0,home:{x:1384,y:700},memory:null,cargo:null,amount:0,prey:false,reason:'Exploring for surface food'};
 sim.state.enemies.push(e);sim.state.settings.spiderEncounters=true;sim.state.settings.rivalEncounters=true;sim.state.encounters.spiderClock=240;sim.state.encounters.rivalClock=240;return e;
}
function positionWorkers(sim:AntSimulation,x=1070,y=700){
 sim.state.obstacles=[];sim.state.resources=[];sim.state.brood=[];
 sim.state.ants.slice(1).forEach((a,i)=>Object.assign(a,{x:x+(i%3)*5,y:y+Math.floor(i/3)*5,view:'surface',energy:1,hunger:0,tendency:.8,cargo:null,task:'exploring'}));sim.context.rebuild(sim.state);
}
test('encounters are opt-in; enabling uses bounded random edge arrivals',()=>{
 const sim=new AntSimulation(77,1);sim.step(1500);assert.equal(sim.state.enemies.length,0);
 sim.command({type:'settings',settings:{spiderEncounters:true,rivalEncounters:true}});
 sim.state.encounters.spiderClock=0;sim.state.encounters.rivalClock=0;sim.step();
 assert.equal(sim.state.enemies.length,4);assert.equal(sim.state.encounters.arrivals,2);
 for(const e of sim.state.enemies){assert.ok(e.home.x<=18||e.home.x>=1382||e.home.y<=18||e.home.y>=882);assert.ok(isOpen(sim.state,e,'surface',e.kind==='spider'?12:5));assert.equal(e.memory,null);}
 validateSave(sim.state);
});
test('isolated workers retreat, supported workers defend, underground workers do not assist',()=>{
 const sim=new AntSimulation(1,7);positionWorkers(sim);visitor(sim,'spider');const a=sim.state.ants[1];
 respondToThreat(sim.state,a,1/30,sim.context);assert.equal(a.task,'defending');
 sim.state.ants.slice(2).forEach(b=>b.view='nest');sim.context.rebuild(sim.state);
 respondToThreat(sim.state,a,1/30,sim.context);assert.equal(a.task,'retreating');
 assert.ok(a.reason.includes('too few'));assert.ok(sim.state.alarm.some(n=>n>0));
});
test('cargo and memory survive flight; normal work resumes after danger passes',()=>{
 const sim=new AntSimulation(2,7);positionWorkers(sim);visitor(sim,'spider');const a=sim.state.ants[1];
 a.cargo='protein';a.amount=.8;a.memory={x:1200,y:650};
 respondToThreat(sim.state,a,1/30,sim.context);assert.equal(a.task,'retreating');assert.equal(a.cargo,'protein');
 sim.state.enemies=[];respondToThreat(sim.state,a,1/30,sim.context);assert.equal(a.task,'returning');assert.equal(a.amount,.8);assert.deepEqual(a.memory,{x:1200,y:650});
});
test('alarm recruits only local surface workers and decays independently of food trails',()=>{
 const sim=new AntSimulation(3,2);positionWorkers(sim);visitor(sim,'spider',1250,700);
 const a=sim.state.ants[1],far=sim.state.ants[2];far.x=500;far.y=800;
 sim.state.alarm[fieldIndex({x:a.x+20,y:a.y})]=1;const before=sim.state.pheromones.slice();
 respondToThreat(sim.state,a,1/30,sim.context);assert.equal(a.task,'defending');assert.ok(a.reason.includes('alarm'));
 respondToThreat(sim.state,far,1/30,sim.context);assert.equal(far.task,'exploring');
 decayAlarm(sim.state,3);assert.equal(Math.max(...sim.state.alarm),.5);assert.deepEqual(sim.state.pheromones,before);
});
test('rivals collect the exact final portion and carry it away without adding colony reserves',()=>{
 const sim=new AntSimulation(4,0);sim.state.resources=[];sim.state.obstacles=[];
 const e=visitor(sim,'rival'),food={id:sim.state.nextId++,x:e.x,y:e.y,kind:'protein' as const,amount:.3,initial:1,radius:20};sim.state.resources=[food];sim.context.rebuild(sim.state);
 const before=sim.state.stores.protein;for(let i=0;i<35;i++)updateEncounters(sim.state,1/30,sim.context);
 assert.equal(food.amount,0);assert.equal(e.cargo,'protein');assert.ok(Math.abs(e.amount-.3)<1e-12);assert.equal(e.mode,'returning');assert.equal(sim.state.stores.protein,before);assert.ok(Math.abs(sim.state.encounters.stolenFood-.3)<1e-12);
 validateSave(sim.state);
});
test('rivals cannot discover distant food or see through rocks',()=>{
 const sim=new AntSimulation(5,0);sim.state.obstacles=[];const e=visitor(sim,'rival',1000,700);
 sim.state.resources=[{id:sim.state.nextId++,x:800,y:700,kind:'carbohydrate',amount:5,initial:5,radius:20}];sim.context.rebuild(sim.state);updateEncounters(sim.state,1/30,sim.context);assert.equal(e.memory,null);
 e.x=1000;e.y=700;sim.state.resources[0].x=1060;sim.state.obstacles=[{id:sim.state.nextId++,x:1030,y:700,radius:15}];sim.context.rebuild(sim.state);updateEncounters(sim.state,1/30,sim.context);assert.equal(e.memory,null);
});
test('predator capture releases carried refuse and does not leave an eaten corpse',()=>{
 const sim=new AntSimulation(6,1);positionWorkers(sim,1100,700);const e=visitor(sim,'spider');const a=sim.state.ants[1];a.energy=.001;
 const d={id:sim.state.nextId++,x:a.x,y:a.y,z:a.z,view:'surface' as const,kind:'waste' as const,carriedBy:a.id};sim.state.debris=[d];a.cargo='waste';a.carryingId=d.id;sim.context.rebuild(sim.state);
 updateEncounters(sim.state,1/30,sim.context);assert.equal(a.alive,false);assert.equal(d.carriedBy,null);assert.equal(sim.state.deaths,1);assert.equal(sim.state.encounters.lostWorkers,1);assert.equal(e.prey,true);assert.equal(sim.state.debris.length,1);
 for(let i=0;i<220;i++)updateEncounters(sim.state,1/30,sim.context);assert.equal(e.mode,'returning');assert.equal(sim.state.deaths,1);
});
test('sustained defence repels visitors and disables further encounters cleanly',()=>{
 const sim=new AntSimulation(7,6);positionWorkers(sim,1090,700);const e=visitor(sim,'spider');sim.step(90);
 assert.equal(e.mode,'retreating');assert.equal(sim.state.encounters.repelled,1);
 sim.command({type:'settings',settings:{spiderEncounters:false,rivalEncounters:false}});sim.step(600);assert.equal(sim.state.enemies.length,0);assert.ok(sim.state.ants.every(a=>a.task!=='defending'&&a.task!=='retreating'));
});
test('visitors and fleeing workers never cross rocks or world boundaries',()=>{
 const sim=new AntSimulation(8,8);positionWorkers(sim,1010,700);visitor(sim,'spider',1070,700);visitor(sim,'rival',1050,720);
 sim.state.obstacles=[{id:sim.state.nextId++,x:1100,y:700,radius:15},{id:sim.state.nextId++,x:980,y:700,radius:15}];
 for(let i=0;i<1800;i++){sim.step();for(const e of sim.state.enemies)assert.ok(isOpen(sim.state,e,'surface',e.kind==='spider'?12:5));for(const a of sim.state.ants)assert.ok(isOpen(sim.state,a,a.view));}
 validateSave(sim.state);
});
test('pause, seeded replay, and save restore preserve all encounter state',()=>{
 const a=new AntSimulation(45,15),b=new AntSimulation(45,15);
 for(const sim of [a,b]){positionWorkers(sim,1070,700);visitor(sim,'rival');visitor(sim,'spider',1130,700);sim.step(100);}
 assert.deepEqual(a.state,b.state);a.paused=true;const before=a.serialize();a.step(300);assert.equal(a.serialize(),before);a.paused=false;
 const c=new AntSimulation();c.command({type:'load',state:JSON.parse(before)});c.paused=false;a.step(900);c.step(900);assert.deepEqual(a.state,c.state);
});
test('legacy saves migrate peacefully; malformed new saves are rejected atomically',()=>{
 const sim=new AntSimulation(56);const old=JSON.parse(sim.serialize());old.version=2;delete old.enemies;delete old.alarm;delete old.encounters;delete old.settings.spiderEncounters;delete old.settings.rivalEncounters;delete old.settings.encounterFrequency;
 const migrated=validateSave(old);assert.equal(migrated.version,3);assert.equal(migrated.settings.spiderEncounters,false);assert.deepEqual(migrated.ants,sim.state.ants);assert.equal(migrated.rng,sim.state.rng);
 const before=sim.serialize();for(const change of [{alarm:[]},{enemies:[{}]},{encounters:{...sim.state.encounters,spiderClock:-1}},{version:99}])assert.throws(()=>sim.command({type:'load',state:{...sim.state,...change}}));assert.equal(sim.serialize(),before);
 assert.throws(()=>sim.command({type:'settings',settings:{encounterFrequency:99}}));assert.throws(()=>sim.command({type:'settings',settings:{spiderEncounters:1} as never}));
});
test('prolonged alarm decisions remain valid for mid-encounter saves',()=>{
 const sim=new AntSimulation(92,1);positionWorkers(sim,1070,700);visitor(sim,'spider',1200,700);const a=sim.state.ants[1];
 for(let i=0;i<240;i++){sim.state.alarm[fieldIndex(a)]=1;updateBehavior(sim.state,a,1/30,sim.context);}
 assert.equal(a.task,'defending');assert.ok(a.decision>=-1);validateSave(sim.state);
 const restored=new AntSimulation();restored.command({type:'load',state:JSON.parse(sim.serialize())});assert.deepEqual(restored.state,sim.state);
});
test('invalid visitor placement and cargo cannot replace the colony',()=>{
 const sim=new AntSimulation(81);const e=visitor(sim,'spider',1000,700),before=sim.serialize();
 for(const change of [{x:514,y:304},{cargo:'protein',amount:1},{x:0},{z:20},{home:{x:700,y:500}}]){
  const invalid={...sim.state,enemies:[{...e,...change}]};assert.throws(()=>sim.command({type:'load',state:invalid}));assert.equal(sim.serialize(),before);
 }
});
console.log(`${passed} encounter checks passed.`);
for(const count of [200,1000,3000]){const sim=new AntSimulation(71,count);visitor(sim,'spider',700,450);visitor(sim,'rival',600,400);const start=performance.now();sim.step(120);console.log(`ENCOUNTER BENCH ${count} workers: ${((performance.now()-start)/120).toFixed(3)} ms/tick`);}
