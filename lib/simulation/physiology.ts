import { Ant, ColonyState } from './types';
import { clamp, distance, nearestOpenNestPoint } from './spatial';
import { broodComfort } from './behavior';
import { createAnt, random } from './engine';
import { FOOD_STORES } from './nest-volume';
export function event(s:ColonyState,text:string){s.events.unshift({time:s.time,text});s.events=s.events.slice(0,30);}

export function killAnt(s:ColonyState,a:Ant,consumed=false){
 if(!a.alive)return;
 a.alive=false;s.deaths++;
 if(!consumed)s.debris.push({id:s.nextId++,x:a.x,y:a.y,z:a.z,view:a.view,kind:'corpse',carriedBy:null});
 for(const b of [...s.brood,...s.debris])if(b.carriedBy===a.id){b.carriedBy=null;b.x=a.x;b.y=a.y;b.z=a.z;if('view' in b)b.view=a.view;}
}
export function updatePhysiology(s:ColonyState,dt:number){
 const storage=nearestOpenNestPoint(s,FOOD_STORES);
 const rate=s.settings.lifecycle,stress=Math.max(0,Math.abs(s.settings.temperature-24)-10)/20+Math.max(0,30-s.settings.moisture)/80;
 for(const a of s.ants){if(!a.alive)continue;a.age+=dt*.015*rate;a.hunger=clamp(a.hunger+dt*.0012*rate*(a.task==='queen'?1.6:1),0,1);
 const resting=['resting','grooming','queen'].includes(a.task);a.energy=clamp(a.energy-dt*(resting?-.007:.001)*rate-dt*stress*.003*rate,0,1);
 // Workers feed at the stores. Queen feeding and larval provisioning use a
 // pooled nurse-sharing abstraction; these deliveries are not individually carried.
 if(a.view==='nest'&&(a.task==='queen'||distance(a,storage)<55)&&a.hunger>.15&&s.stores.carbohydrate>0){const food=Math.min(s.stores.carbohydrate,dt*.025*rate,a.hunger*.4);s.stores.carbohydrate-=food;a.hunger=clamp(a.hunger-food*2.5,0,1);a.energy=clamp(a.energy+food,0,1);}
 if(a.view==='nest'&&s.stores.water>0&&a.energy<.8&&(a.task==='queen'||distance(a,storage)<55)){const water=Math.min(s.stores.water,dt*.002*rate);s.stores.water-=water;a.energy=clamp(a.energy+water*2,0,1);}
 if(a.hunger>.97)a.energy=clamp(a.energy-dt*.025*rate,0,1);
 const maxAge=a.task==='queen'?900:75+a.tendency*65;
 if(a.energy<=0||a.age>maxAge){killAnt(s,a);if(a.task==='queen')event(s,'The queen has died. Existing brood can still develop.');}
 }
 s.ants=s.ants.filter(a=>a.alive);
 for(let i=s.brood.length-1;i>=0;i--){const b=s.brood[i],comfort=broodComfort(s,b);b.care=clamp(b.care-dt*.0018*rate,0,1);if(b.stage==='larva')b.nutrition=clamp(b.nutrition-dt*.0015*rate,0,1);
 const nutrition=b.stage==='larva'?b.nutrition:1;b.progress+=dt*rate/120*comfort*(.15+.85*b.care)*nutrition;
 if((b.nutrition===0&&b.stage==='larva')||(comfort<.05&&b.care<.2)){s.debris.push({id:s.nextId++,x:b.x,y:b.y,z:b.z,view:'nest',kind:'waste',carriedBy:null});s.brood.splice(i,1);continue;}
 if(b.progress>=1){b.progress=0;if(b.stage==='egg')b.stage='larva';else if(b.stage==='larva')b.stage='pupa';else if(s.ants.filter(a=>a.task!=='queen').length<3000){const a=createAnt(s);a.x=b.x;a.y=b.y;a.z=b.z??180;a.task='nursing';a.reason='Newly emerged worker, staying near the brood';s.ants.push(a);s.brood.splice(i,1);s.births++;if(s.births%10===1)event(s,'A new worker has emerged from the brood.');}else b.progress=.999;}
 }
 const queen=s.ants.find(a=>a.task==='queen');
 if(queen&&queen.hunger<.6&&s.stores.protein>.08&&s.brood.length<500){s.queenEggTimer+=dt*rate*clamp((s.settings.temperature-8)/16,0,1);if(s.queenEggTimer>=12){s.queenEggTimer-=12;s.stores.protein-=.08;s.brood.push({id:s.nextId++,x:queen.x-15+random(s)*30,y:queen.y-10+random(s)*20,z:queen.z,stage:'egg',progress:0,nutrition:1,care:.6,carriedBy:null});}}
 if(s.tick%900===0&&s.debris.length<500){s.debris.push({id:s.nextId++,x:670+random(s)*55,y:380+random(s)*30,z:180,view:'nest',kind:'waste',carriedBy:null});}
 s.stores.carbohydrate=clamp(s.stores.carbohydrate,0,100000);s.stores.protein=clamp(s.stores.protein,0,100000);s.stores.water=clamp(s.stores.water,0,100000);
}
