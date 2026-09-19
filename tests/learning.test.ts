import assert from 'node:assert/strict';
import {AntSimulation,createColony} from '../lib/simulation/engine';
import {CHAMBERS,FOOD_STORES} from '../lib/simulation/nest-volume';
import {learningRoute,routeLength,localConditions,pickLearning,strongestScent} from '../lib/simulation/learning';
import {cellIndex,neighbors,isOpen,distance} from '../lib/simulation/spatial';
import {updatePhysiology} from '../lib/simulation/physiology';
import {WORLD} from '../lib/simulation/types';
const state=createColony(),before=JSON.stringify(state);
assert.deepEqual(strongestScent(state),{kind:'scent',...WORLD.entrance});
for(const chamber of CHAMBERS){const route=learningRoute(state,chamber);assert.ok(route.length>2);for(let i=0;i<route.length;i++){assert.ok(isOpen(state,route[i],'nest'));if(i)assert.ok(neighbors(cellIndex(route[i-1])).includes(cellIndex(route[i])));}assert.ok(routeLength(route)>=distance(route[0],route[route.length-1]));}
const supply=learningRoute(state,FOOD_STORES);assert.ok(supply.every(p=>distance(p,CHAMBERS[0])>80),'Supply route crosses queen core');
assert.ok(localConditions(state,CHAMBERS[2]).temperature<localConditions(state,CHAMBERS[0]).temperature);
assert.ok(localConditions(state,CHAMBERS[2]).moisture>localConditions(state,CHAMBERS[0]).moisture);
assert.deepEqual(pickLearning(state,WORLD.midden,'surface'),{kind:'midden'});
assert.deepEqual(pickLearning(state,state.resources[0],'surface'),{kind:'resource',id:state.resources[0].id});
assert.equal(JSON.stringify(state),before,'Inspection mutated the colony');
const sim=new AntSimulation(42,1),ant=sim.state.ants[1];
Object.assign(ant,{view:'nest',...CHAMBERS[0],task:'returning',cargo:'protein',amount:.8,hunger:0,energy:1});
const start=sim.state.stores.protein;sim.step();assert.equal(ant.cargo,'protein','Food unloaded at queen');
let delivered=false;for(let i=0;i<2400;i++){sim.step();assert.ok(isOpen(sim.state,ant,'nest'));if(!ant.cargo){assert.ok(distance(ant,FOOD_STORES)<35);delivered=true;break;}}
assert.ok(delivered);assert.ok(sim.state.stores.protein>start);
const fed=createColony(11,2);fed.brood=[];const atQueen=fed.ants[1],atStore=fed.ants[2];
Object.assign(atQueen,{...CHAMBERS[0],view:'nest',hunger:.6});Object.assign(atStore,{...FOOD_STORES,view:'nest',hunger:.6});updatePhysiology(fed,1);
assert.ok(atQueen.hunger>.6,'Remote worker fed directly from stores');assert.ok(atStore.hunger<.6,'Worker at stores failed to feed');
console.log('PASS learning: routes respect tunnels, supply bypasses queen, local conditions match depth, inspection is read-only, and actual storage deliveries/feeding match the labels.');
