import { Ant, Brood, ColonyState, Debris, Point, Resource, Task, WORLD, CELL } from './types';
import { SpatialIndex, NestRoutes, cellIndex, cellPoint, clamp, distance, isOpen, neighbors } from './spatial';
import { deposit, scentAt, fieldIndex } from './pheromones';
import { random } from './engine';
export const QUEEN_CHAMBER={x:680,y:390};
export class BehaviorContext {
 ants=new SpatialIndex<Ant>(40);resources=new SpatialIndex<Resource>(70);brood=new SpatialIndex<Brood>(45);debris=new SpatialIndex<Debris>(50);routes=new NestRoutes();
 rebuild(s:ColonyState){this.ants.rebuild(s.ants.filter(a=>a.alive));this.resources.rebuild(s.resources.filter(r=>r.amount>0));this.brood.rebuild(s.brood.filter(b=>b.carriedBy===null));this.debris.rebuild(s.debris.filter(d=>d.carriedBy===null));}
}
export function setTask(a:Ant,task:Task,reason:string){if(a.reason!==reason){a.history.unshift(reason);a.history=a.history.slice(0,4);}if(a.task!==task)a.timer=0;a.task=task;a.reason=reason;}
function steer(a:Ant,target:Point,dt:number,noise=0){const desired=Math.atan2(target.y-a.y,target.x-a.x)+noise;const delta=Math.atan2(Math.sin(desired-a.angle),Math.cos(desired-a.angle));a.angle+=clamp(delta,-4*dt,4*dt);}
function move(s:ColonyState,a:Ant,dt:number,target:Point|null,ctx:BehaviorContext){
 const speed=a.task==='queen'?1.5:a.cargo?17:22+6*a.tendency;let waypoint=target;
 if(a.view==='nest'&&target)waypoint=ctx.routes.next(s,a,target);
 if(waypoint)steer(a,waypoint,dt);
 const step=speed*dt;let p={x:a.x+Math.cos(a.angle)*step,y:a.y+Math.sin(a.angle)*step};
 if(isOpen(s,p,a.view)){a.x=p.x;a.y=p.y;}else{a.angle+=(a.id%2===0?1:-1)*dt*7;if(a.timer>8&&a.view==='surface'&&!a.cargo){a.target=null;a.memory=null;setTask(a,'exploring','A blocked path calls for another route');}}
 if(a.view==='surface'&&s.tick%6===0)s.traffic[fieldIndex(a)]+=.15;
}
function goHome(s:ColonyState,a:Ant,dt:number,ctx:BehaviorContext){
 if(a.view==='surface'){
 if(a.cargo==='carbohydrate'||a.cargo==='protein'||a.cargo==='water')deposit(s,a,.9*dt*(a.cargo==='protein'?1.2:1));
 move(s,a,dt,WORLD.entrance,ctx);if(distance(a,WORLD.entrance)<14){a.view='nest';a.x=WORLD.nestEntrance.x;a.y=WORLD.nestEntrance.y;a.target={...QUEEN_CHAMBER};}
 }else{
 move(s,a,dt,QUEEN_CHAMBER,ctx);if(distance(a,QUEEN_CHAMBER)<35){if(a.cargo==='carbohydrate'||a.cargo==='protein'||a.cargo==='water'){s.stores[a.cargo]+=a.amount;a.amount=0;a.cargo=null;setTask(a,'resting','Sharing a successful food collection with nestmates');a.energy=clamp(a.energy+.1,0,1);a.timer=0;}else if(!a.cargo){setTask(a,'resting','Back in the nest to feed and recover');}}
 }
}
function carryOutside(s:ColonyState,a:Ant,dt:number,ctx:BehaviorContext){
 if(a.view==='nest'){move(s,a,dt,WORLD.nestEntrance,ctx);if(distance(a,WORLD.nestEntrance)<12){a.view='surface';a.x=WORLD.entrance.x;a.y=WORLD.entrance.y;a.target={...WORLD.midden};}}
 else{move(s,a,dt,WORLD.midden,ctx);if(distance(a,WORLD.midden)<18){if(a.cargo==='soil')s.depositedSoil++;else{const i=s.debris.findIndex(d=>d.id===a.carryingId);if(i>=0)s.debris.splice(i,1);s.removedWaste++;}a.cargo=null;a.carryingId=null;a.target=null;setTask(a,'returning','Waste deposited away from the nest');}}
}
function decide(s:ColonyState,a:Ant,ctx:BehaviorContext){
 if(a.task==='queen'||a.cargo)return;
 const nearby=ctx.ants.query(a,14,16).filter(b=>b.id!==a.id&&b.view===a.view&&b.alive);
 // Food exchange and recruitment require actual local contact.
 const donor=nearby.find(b=>b.hunger<a.hunger-.25);
 if(donor&&a.hunger>.35){const amount=Math.min(.04,(a.hunger-donor.hunger)/3);a.hunger-=amount;donor.hunger+=amount;a.reason='Receiving food from a nearby nestmate';}
 const recruiter=nearby.find(b=>b.memory&&(b.task==='returning'||b.task==='foraging'));
 if(recruiter&&!a.memory&&random(s)<.5){a.memory={...recruiter.memory!};a.reason='A returning nestmate signaled a food route';}
 if(a.hunger>.75||a.energy<.18){setTask(a,a.view==='surface'?'returning':'resting','Low reserves: returning to food and rest');a.target={...QUEEN_CHAMBER};return;}
 if(a.view==='surface'){
 if(a.task==='returning')return;
 const foods=ctx.resources.query(a,65*s.settings.sensitivity).filter(r=>r.amount>0&&!s.obstacles.some(o=>distance(r,o)<o.radius));
 if(foods.length){foods.sort((x,y)=>distance(a,x)-distance(a,y));const resource=foods[0];a.target={x:resource.x,y:resource.y};a.memory={...a.target};setTask(a,'foraging',`Sensed ${resource.kind==='carbohydrate'?'nectar':resource.kind} nearby`);return;}
 if(a.memory){if(distance(a,a.memory)<22){a.memory=null;a.target=null;setTask(a,'exploring','The remembered food source is depleted');}else{a.target={...a.memory};setTask(a,'foraging','Following a learned route to food');return;}}
 const front=[-.75,0,.75].map(offset=>{const angle=a.angle+offset,p={x:a.x+Math.cos(angle)*30,y:a.y+Math.sin(angle)*30};return{angle,value:scentAt(s,p),p};});
 front.sort((x,y)=>y.value-x.value);
 if(front[0].value>.2&&random(s)>.12+s.settings.exploration*.35){a.target=front[0].p;setTask(a,'foraging','Following a locally sensed pheromone trail');}
 else{a.angle+=(random(s)-.5)*(1+s.settings.exploration*3);a.target=null;setTask(a,'exploring','Exploring beyond familiar trails');}return;
 }
 if(a.timer<4/s.settings.flexibility)return;
 if(a.task==='resting'&&a.energy<.85)return;
 const localBrood=ctx.brood.query(a,95).filter(b=>b.carriedBy===null);
 const dirt=ctx.debris.query(a,70).find(d=>d.view==='nest'&&d.carriedBy===null);
 if(dirt&&(a.tendency>.5||random(s)<.3)){a.target={x:dirt.x,y:dirt.y};a.carryingId=dirt.id;setTask(a,'cleaning','Removing waste near occupied chambers');return;}
 const needingCare=localBrood.find(b=>b.care<.75||b.nutrition<.75);
 if(needingCare&&(a.age<35||random(s)<.45)){a.target={x:needingCare.x,y:needingCare.y};a.carryingId=needingCare.id;setTask(a,'nursing','A nearby brood item needs care');return;}
 const crowded=ctx.ants.query(a,45,20).filter(b=>b.view==='nest').length>5;
 if(crowded&&a.tendency>.65){const adjacent=neighbors(cellIndex(a)).filter(i=>!s.nest[i]&&cellPoint(i).y>150);if(adjacent.length){a.target=cellPoint(adjacent[Math.floor(random(s)*adjacent.length)]);setTask(a,'digging','Local crowding is prompting nest expansion');return;}}
 if(random(s)<.065){setTask(a,'grooming','Cleaning antennae and body');return;}
 if(a.age>15&&(a.tendency>.38||a.memory)&&a.energy>.65){a.target={...WORLD.nestEntrance};setTask(a,'exploring',a.memory?'Leaving to revisit a learned food source':'Leaving the nest to scout for resources');return;}
 if(localBrood.length){const b=localBrood[Math.floor(random(s)*localBrood.length)];a.target={x:b.x,y:b.y};a.carryingId=b.id;setTask(a,'nursing','Tending the next generation');return;}
 if(a.task!=='nursing'){a.target={x:490,y:540};setTask(a,'nursing','Visiting a familiar brood chamber');}
}
export function updateBehavior(s:ColonyState,a:Ant,dt:number,ctx:BehaviorContext){
 a.timer+=dt;a.decision-=dt;
 if(a.decision<=0){decide(s,a,ctx);a.decision=.7+random(s)*.5;}
 if(a.task==='queen')return;
 if(a.cargo==='soil'||a.cargo==='waste'||a.cargo==='corpse'){carryOutside(s,a,dt,ctx);return;}
 if(a.cargo==='brood'){
 const b=s.brood.find(b=>b.id===a.carryingId);if(!b){a.cargo=null;a.carryingId=null;return;}move(s,a,dt,a.target,ctx);b.x=a.x;b.y=a.y;if(a.target&&distance(a,a.target)<15){b.carriedBy=null;a.carryingId=null;a.cargo=null;a.target=null;setTask(a,'nursing','Brood moved to a more suitable chamber');a.timer=0;}return;
 }
 if(a.cargo==='carbohydrate'||a.cargo==='protein'||a.cargo==='water'||a.task==='returning'){goHome(s,a,dt,ctx);return;}
 if(a.view==='surface'){
 const food=ctx.resources.query(a,35).find(r=>r.amount>0&&distance(a,r)<r.radius+4);
 if(food){const amount=Math.min(.8,food.amount);food.amount-=amount;a.cargo=food.kind;a.amount=amount;a.memory={x:food.x,y:food.y};a.target={...WORLD.entrance};a.angle=Math.atan2(WORLD.entrance.y-a.y,WORLD.entrance.x-a.x);setTask(a,'returning','Carrying food home and reinforcing the trail');return;}
 move(s,a,dt,a.target,ctx);return;
 }
 if(a.task==='exploring'||a.task==='foraging'){move(s,a,dt,WORLD.nestEntrance,ctx);if(distance(a,WORLD.nestEntrance)<12){a.view='surface';a.x=WORLD.entrance.x;a.y=WORLD.entrance.y;a.target=a.memory?{...a.memory}:null;a.angle=random(s)*Math.PI*2;setTask(a,'exploring','Emerging from the nest to forage');}return;}
 if(a.task==='nursing'){
 const b=s.brood.find(b=>b.id===a.carryingId&&b.carriedBy===null);if(b){a.target={x:b.x,y:b.y};if(distance(a,b)<14){b.care=clamp(b.care+dt*.08,0,1);const amount=Math.min(s.stores.protein,dt*.009*s.settings.lifecycle);if(b.stage==='larva'){s.stores.protein-=amount;b.nutrition=clamp(b.nutrition+amount*2.5,0,1);}const comfort=broodComfort(s,b);if(comfort<.55&&a.timer>12){const candidates=[{x:490,y:540},{x:825,y:574},{x:665,y:390}];candidates.sort((x,y)=>broodComfort(s,y)-broodComfort(s,x));if(broodComfort(s,candidates[0])>comfort+.04){a.cargo='brood';a.carryingId=b.id;b.carriedBy=a.id;a.target=candidates[0];a.reason='Moving brood toward better moisture and temperature';}}return;}}
 move(s,a,dt,a.target??{x:490,y:540},ctx);return;
 }
 if(a.task==='digging'){
 if(!a.target){a.decision=0;return;}const i=cellIndex(a.target);if(s.nest[i]){a.target=null;a.decision=0;return;}
 if(distance(a,a.target)<CELL*1.6){s.excavation[i]+=dt*.12*(.4+s.settings.moisture/100);if(s.excavation[i]>=1){s.nest[i]=1;s.excavation[i]=0;s.excavated++;a.cargo='soil';a.target={...WORLD.nestEntrance};setTask(a,'returning','Carrying excavated soil to the surface');}}
 else move(s,a,dt,a.target,ctx);return;
 }
 if(a.task==='cleaning'){
 const d=s.debris.find(d=>d.id===a.carryingId&&d.carriedBy===null);if(!d){a.carryingId=null;a.decision=0;return;}if(distance(a,d)<12){d.carriedBy=a.id;a.cargo=d.kind;a.target={...WORLD.nestEntrance};a.reason='Carrying refuse away from the colony';}else move(s,a,dt,d,ctx);return;
 }
 if(a.task==='grooming'){if(a.timer>4){setTask(a,'resting','Grooming complete');a.decision=0;}return;}
 if(a.task==='resting'){a.energy=clamp(a.energy+dt*.024,0,1);if(distance(a,QUEEN_CHAMBER)>100)move(s,a,dt,QUEEN_CHAMBER,ctx);}
}
export function broodComfort(s:ColonyState,p:Point){const temp=s.settings.temperature-(p.y-390)/180,moist=s.settings.moisture+(p.y-390)/10;return clamp(1-Math.abs(temp-25)/18-Math.abs(moist-70)/100,0,1);}
