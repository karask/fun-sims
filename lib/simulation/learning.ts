import { ColonyState, Point, View, WORLD, FIELD_COLS, FIELD_CELL } from './types';
import { CHAMBERS } from './nest-volume';
import { cellIndex, cellPoint, neighbors, nearestOpenNestPoint, distance } from './spatial';
import { fieldIndex } from './pheromones';

export type LearnTarget = {kind:'chamber';index:number}|{kind:'tunnel';index:number}|{kind:'resource';id:number}|{kind:'scent';x:number;y:number}|{kind:'midden'}|{kind:'queen'};
export interface LearnHighlight {point:Point;view:View;radius:number;route:Point[]}
export const TUNNEL_NAMES=['Route to the queen','Route to the nursery','Route to the lower chamber','Supply route'];
export function localConditions(s:ColonyState,p:Point){
 return {temperature:s.settings.temperature-(p.y-390)/180,moisture:s.settings.moisture+(p.y-390)/10};
}
export function learningPoint(s:ColonyState,target:LearnTarget):Point|null{
 if(target.kind==='queen')return s.ants.find(a=>a.task==='queen')??CHAMBERS[0];
 if(target.kind==='chamber'||target.kind==='tunnel')return CHAMBERS[target.index]??null;
 if(target.kind==='resource')return s.resources.find(r=>r.id===target.id)??null;
 return target.kind==='midden'?WORLD.midden:target;
}
export const learningView=(target:LearnTarget):View=>['chamber','tunnel','queen'].includes(target.kind)?'nest':'surface';
export function learningTitle(s:ColonyState,t:LearnTarget){
 if(t.kind==='chamber')return CHAMBERS[t.index]?.name??'Chamber';
 if(t.kind==='tunnel')return TUNNEL_NAMES[t.index]??'Tunnel';
 if(t.kind==='resource'){const r=s.resources.find(r=>r.id===t.id);return r?`${r.kind==='carbohydrate'?'Nectar':r.kind==='protein'?'Protein':'Water'} #${r.id}`:'Source removed';}
 return t.kind==='queen'?'The queen':t.kind==='midden'?'Outside midden':'Pheromone trail';
}
// Read-only path on the same six-neighbor graph as worker navigation. The graph
// minimizes voxel hops; report its actual segment lengths rather than a straight line.
export function learningRoute(s:ColonyState,to:Point):Point[]{
 const start=cellIndex(nearestOpenNestPoint(s,WORLD.nestEntrance)),goal=cellIndex(nearestOpenNestPoint(s,to));
 const parents=new Int32Array(s.nest.length).fill(-1),queue=[goal];parents[goal]=goal;
 for(let head=0;head<queue.length&&parents[start]===-1;head++)for(const next of neighbors(queue[head]))if(s.nest[next]&&parents[next]===-1){parents[next]=queue[head];queue.push(next);}
 if(parents[start]===-1)return [];
 const route=[cellPoint(start)];let cur=start;
 while(cur!==goal){cur=parents[cur];route.push(cellPoint(cur));}
 return route;
}
export const routeLength=(route:Point[])=>route.slice(1).reduce((sum,p,i)=>sum+distance(route[i],p),0);
export function strongestScent(s:ColonyState):LearnTarget{
 let best=0;for(let i=1;i<s.pheromones.length;i++)if(s.pheromones[i]>s.pheromones[best])best=i;
 if(s.pheromones[best]===0)return {kind:'scent',...WORLD.entrance};
 return {kind:'scent',x:(best%FIELD_COLS+.5)*FIELD_CELL,y:(Math.floor(best/FIELD_COLS)+.5)*FIELD_CELL};
}
export function pickLearning(s:ColonyState,p:Point,view:View):LearnTarget|null{
 if(view==='surface'){
  const r=s.resources.find(r=>Math.hypot(r.x-p.x,r.y-p.y)<r.radius+14);if(r)return {kind:'resource',id:r.id};
  if(Math.hypot(p.x-WORLD.midden.x,p.y-WORLD.midden.y)<32)return {kind:'midden'};
  if(s.pheromones[fieldIndex(p)]>.01)return {kind:'scent',x:p.x,y:p.y};
 }else{
  const index=CHAMBERS.findIndex(c=>((p.x-c.x)/c.rx)**2+((p.y-c.y)/c.ry)**2<1);
  if(index>=0)return {kind:'chamber',index};
  let best=14,target=-1;
  CHAMBERS.forEach((chamber,index)=>{const route=learningRoute(s,chamber);for(let i=1;i<route.length;i++){const a=route[i-1],b=route[i],dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1))),d=Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);if(d<best){best=d;target=index;}}});
  if(target>=0)return {kind:'tunnel',index:target};
 }
 return null;
}
