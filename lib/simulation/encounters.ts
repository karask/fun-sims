import { Ant, ColonyState, Enemy, EnemyKind, FIELD_CELL, FIELD_COLS, FIELD_ROWS, Point, WORLD } from './types';
import { BehaviorContext, move, setTask } from './behavior';
import { random } from './engine';
import { clamp, isOpen } from './spatial';
import { event, killAnt } from './physiology';

export const ALARM_HALF_LIFE = 3;
const enabled = (s:ColonyState,kind:EnemyKind) => kind==='spider'?s.settings.spiderEncounters:s.settings.rivalEncounters;
const planarDistance = (a:Point,b:Point) => Math.hypot(a.x-b.x,a.y-b.y);

/** Surface rocks block sight/contact as well as movement. No global threat map. */
export function visible(s:ColonyState,a:Point,b:Point){
 const dx=b.x-a.x,dy=b.y-a.y,length=dx*dx+dy*dy;
 return !s.obstacles.some(o=>{
  const t=clamp(((o.x-a.x)*dx+(o.y-a.y)*dy)/(length||1),0,1);
  return Math.hypot(o.x-a.x-dx*t,o.y-a.y-dy*t)<o.radius+1;
 });
}
export function decayAlarm(s:ColonyState,dt:number){
 const fade=Math.exp(-Math.LN2/ALARM_HALF_LIFE*dt);
 for(let i=0;i<s.alarm.length;i++){s.alarm[i]*=fade;if(s.alarm[i]<.005)s.alarm[i]=0;}
}
function signalAlarm(s:ColonyState,p:Point,dt:number){
 const cx=Math.floor(p.x/FIELD_CELL),cy=Math.floor(p.y/FIELD_CELL);
 for(let y=Math.max(0,cy-2);y<=Math.min(FIELD_ROWS-1,cy+2);y++)for(let x=Math.max(0,cx-2);x<=Math.min(FIELD_COLS-1,cx+2);x++){
  const q={x:(x+.5)*FIELD_CELL,y:(y+.5)*FIELD_CELL},d=planarDistance(p,q);
  if(d<35&&visible(s,p,q)){const i=y*FIELD_COLS+x;s.alarm[i]=Math.min(1,s.alarm[i]+dt*2*(1-d/35));}
 }
}
function localAlarm(s:ColonyState,a:Ant):Point|null{
 const cx=Math.floor(a.x/FIELD_CELL),cy=Math.floor(a.y/FIELD_CELL);
 let best=.18,point:Point|null=null;
 for(let y=Math.max(0,cy-3);y<=Math.min(FIELD_ROWS-1,cy+3);y++)for(let x=Math.max(0,cx-3);x<=Math.min(FIELD_COLS-1,cx+3);x++){
  const value=s.alarm[y*FIELD_COLS+x],p={x:(x+.5)*FIELD_CELL,y:(y+.5)*FIELD_CELL};
  if(value>best&&visible(s,a,p)){best=value;point=p;}
 }
 return point;
}
function resume(a:Ant){
 a.target=null;a.decision=0;
 setTask(a,a.cargo||a.energy<.3||a.hunger>.75?'returning':'exploring','Danger has passed: resuming ordinary work');
}
/** A temporary activity, never a soldier caste. Carriers keep their loads. */
export function respondToThreat(s:ColonyState,a:Ant,dt:number,ctx:BehaviorContext){
 if(a.view!=='surface'||a.task==='queen')return false;
 const active=s.enemies.filter(e=>enabled(s,e.kind)&&e.mode!=='retreating'&&e.mode!=='returning');
 const threats=active.filter(e=>planarDistance(a,e)<65&&visible(s,a,e));
 threats.sort((x,y)=>planarDistance(a,x)-planarDistance(a,y));
 const threat=threats[0];
 // Only surface workers count as support; workers directly below cannot help.
 if(threat){
  signalAlarm(s,a,dt);
  const support=ctx.surfaceAnts.query(a,48,12).filter(b=>b.id!==a.id&&b.alive&&!b.cargo&&b.energy>.3&&visible(s,a,b)).length;
  const canDefend=!a.cargo&&a.energy>.38&&a.hunger<.75&&support>=(threat.kind==='spider'?4:2)-a.tendency;
  if(canDefend){
   setTask(a,'defending','Defending: nearby nestmates provide support');
   if(planarDistance(a,threat)>13)move(s,a,dt,threat,ctx);
   else {a.angle=Math.atan2(threat.y-a.y,threat.x-a.x);a.energy=clamp(a.energy-dt*.009,0,1);threat.energy=clamp(threat.energy-dt*(threat.kind==='spider'?.075:.12),0,1);}
  }else{
   setTask(a,'retreating',a.cargo?'Retreating: protecting a carried load':a.energy<=.38||a.hunger>=.75?'Retreating: low reserves':'Retreating: too few nearby nestmates');
   const angle=Math.atan2(a.y-threat.y,a.x-threat.x);
   move(s,a,dt,{x:clamp(a.x+Math.cos(angle)*80,4,1396),y:clamp(a.y+Math.sin(angle)*80,4,896)},ctx);
  }
  // Refuse remains attached to its carrier, including while fleeing.
  const carried=s.debris.find(d=>d.id===a.carryingId&&d.carriedBy===a.id);
  if(carried){carried.x=a.x;carried.y=a.y;carried.z=a.z;carried.view=a.view;}
  return true;
 }
 // Alarm attracts only healthy, unladen workers already in the local area.
 if(active.length&&a.energy>.38&&a.hunger<.75&&!a.cargo){
  const cue=localAlarm(s,a);
  if(cue){setTask(a,'defending','Investigating a locally sensed alarm');move(s,a,dt,cue,ctx);return true;}
 }
 if(a.task==='defending'||a.task==='retreating')resume(a);
 return false;
}

function walk(s:ColonyState,e:Enemy,goal:Point,dt:number){
 const desired=Math.atan2(goal.y-e.y,goal.x-e.x),speed=e.kind==='spider'?32:25;
 // Local wall following. Try small turns first; no path or food-map knowledge.
 const side=e.id%2?1:-1;
 for(const offset of [0,.55*side,-.55*side,1.15*side,-1.15*side,1.8*side,-1.8*side,Math.PI]){
  const angle=desired+offset,p={x:e.x+Math.cos(angle)*speed*dt,y:e.y+Math.sin(angle)*speed*dt};
  if(isOpen(s,p,'surface',e.kind==='spider'?12:5)&&visible(s,e,p)){e.x=p.x;e.y=p.y;e.angle=angle;return;}
 }
}
function retreat(s:ColonyState,e:Enemy,repelled:boolean){
 if(e.mode==='retreating')return;
 e.mode='retreating';e.reason=repelled?'Withdrawing under colony pressure':'Leaving the habitat';
 if(repelled){s.encounters.repelled++;event(s,e.kind==='spider'?'Workers have driven a spider away.':'A rival forager is withdrawing under pressure.');}
}
function arrive(s:ColonyState,kind:EnemyKind){
 const edge=Math.floor(random(s)*4),along=40+random(s)*(edge%2?WORLD.width-80:WORLD.height-80);
 const home={x:edge===0?16:edge===2?1384:along,y:edge===1?16:edge===3?884:along};
 if(!isOpen(s,home,'surface',14))return;
 const count=kind==='spider'?1:3;
 for(let i=0;i<count;i++){
  const angle=Math.atan2(450-home.y,700-home.x)+(random(s)-.5)*.8;
  s.enemies.push({id:s.nextId++,kind,...home,home:{...home},angle,mode:'roaming',energy:1,age:0,cooldown:0,memory:null,cargo:null,amount:0,prey:false,reason:kind==='spider'?'Searching locally for isolated prey':'Exploring for surface food'});
 }
 s.encounters.arrivals++;event(s,kind==='spider'?'A hunting spider entered at the habitat edge.':'Rival foragers entered to search for surface food.');
}
export function updateEncounters(s:ColonyState,dt:number,ctx:BehaviorContext){
 for(const kind of ['spider','rival'] as const){
  const clock=kind==='spider'?'spiderClock':'rivalClock';
  if(enabled(s,kind)&&!s.enemies.some(e=>e.kind===kind)){
   s.encounters[clock]-=dt*s.settings.encounterFrequency;
   if(s.encounters[clock]<=0){arrive(s,kind);s.encounters[clock]=120+random(s)*120;}
  }
 }
 const departed=new Set<number>();
 for(const e of s.enemies){
  e.age+=dt;e.cooldown=Math.max(0,e.cooldown-dt);e.energy=clamp(e.energy-dt*.0008,0,1);
  const nearby=ctx.surfaceAnts.query(e,110).filter(a=>a.alive&&visible(s,e,a));
  const defenders=nearby.filter(a=>a.task==='defending'&&planarDistance(a,e)<40);
  if(!enabled(s,e.kind)||e.age>180)retreat(s,e,false);
  else if(e.energy<.28||defenders.length>=(e.kind==='spider'?6:4))retreat(s,e,true);
  if(e.mode==='retreating'||e.mode==='returning'){
   walk(s,e,e.home,dt);
   if(planarDistance(e,e.home)<18||e.age>300)departed.add(e.id);
   continue;
  }
  if(e.kind==='spider'){
   if(e.prey){e.mode='feeding';e.reason='Feeding on captured prey';if(e.cooldown===0){e.mode='returning';e.reason='Sated: carrying prey out of the habitat';}continue;}
   let prey:Ant|undefined,best=Infinity;
   for(const a of nearby){const support=ctx.surfaceAnts.query(a,40,7).filter(b=>b.alive).length;const score=planarDistance(a,e)+support*16;if(score<best){best=score;prey=a;}}
   if(prey){
    e.mode='hunting';e.reason='Approaching locally detected prey';walk(s,e,prey,dt);
    if(planarDistance(e,prey)<14){prey.energy=clamp(prey.energy-dt*.24,0,1);if(prey.energy===0){killAnt(s,prey,true);s.encounters.lostWorkers++;e.prey=true;e.cooldown=7;event(s,'A spider captured a worker.');}}
    continue;
   }
  }else{
   const close=nearby.filter(a=>planarDistance(a,e)<18);
   const defender=close.find(a=>a.task==='defending');
   if(defender){e.reason='Contesting food with nearby workers';defender.energy=clamp(defender.energy-dt*.035,0,1);if(defender.energy===0){killAnt(s,defender);s.encounters.lostWorkers++;}continue;}
   const foods=ctx.resources.query(e,110).filter(r=>r.kind!=='water'&&r.amount>0&&visible(s,e,r));
   foods.sort((a,b)=>planarDistance(a,e)-planarDistance(b,e));
   const food=foods[0];
   if(food){
    e.memory={x:food.x,y:food.y};e.mode='feeding';e.reason='Collecting from a shared surface food source';
    if(planarDistance(e,food)<=food.radius+4){
     const amount=Math.min(food.amount,dt*.35,1.6-e.amount);
     if(e.cargo&&e.cargo!==food.kind){e.mode='returning';continue;}
     food.amount=Math.max(0,food.amount-amount);e.amount+=amount;e.cargo=food.kind;s.encounters.stolenFood+=amount;
     if(e.amount>=1.599||food.amount===0){e.mode='returning';e.reason='Carrying collected food to an off-screen colony';}
    }else walk(s,e,food,dt);
    continue;
   }
   if(e.amount>0){e.mode='returning';e.reason='Carrying collected food to an off-screen colony';continue;}
   if(e.memory){if(planarDistance(e,e.memory)>20){walk(s,e,e.memory,dt);continue;}e.memory=null;}
  }
  e.mode='roaming';e.reason=e.kind==='spider'?'Searching locally for isolated prey':'Exploring for surface food';
  if(e.cooldown===0){e.angle+=(random(s)-.5)*1.4;e.cooldown=2+random(s)*3;}
  walk(s,e,{x:e.x+Math.cos(e.angle)*60,y:e.y+Math.sin(e.angle)*60},dt);
 }
 if(departed.size)s.enemies=s.enemies.filter(e=>!departed.has(e.id));
}
