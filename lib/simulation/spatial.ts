import { Point, ColonyState, CELL, COLS, ROWS, WORLD } from './types';
import {volumeIndex,volumePoint,volumeNeighbors,NEST_CELLS} from './nest-volume';
import {NEST_CENTER,NEST_LAYERS,NEST_LAYER_SIZE} from './types';
export const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.y-b.y,(a.z??NEST_CENTER)-(b.z??NEST_CENTER));
export const clamp=(v:number,min:number,max:number)=>Math.max(min,Math.min(max,v));
export const cellIndex=volumeIndex;
export const cellPoint=volumePoint;
export class SpatialIndex<T extends Point> {
 private buckets=new Map<number,T[]>();constructor(private size=50){}
 rebuild(items:T[]){this.buckets.clear();for(const item of items){const key=this.key(Math.floor(item.x/this.size),Math.floor(item.y/this.size));const bucket=this.buckets.get(key);if(bucket)bucket.push(item);else this.buckets.set(key,[item]);}}
 private key(x:number,y:number){return y*10000+x;}
 query(p:Point,r:number,limit=Infinity){const result:T[]=[];for(let y=Math.floor((p.y-r)/this.size);y<=Math.floor((p.y+r)/this.size);y++)for(let x=Math.floor((p.x-r)/this.size);x<=Math.floor((p.x+r)/this.size);x++){const items=this.buckets.get(this.key(x,y));if(items)for(const item of items)if((item.x-p.x)**2+(item.y-p.y)**2+((item.z??NEST_CENTER)-(p.z??NEST_CENTER))**2<=r*r){result.push(item);if(result.length>=limit)return result;}}return result;}
}
export function isOpen(s:ColonyState,p:Point,view:'surface'|'nest',margin=3){
 if(p.x<margin||p.y<margin||p.x>WORLD.width-margin||p.y>WORLD.height-margin)return false;
 if(view==='surface')return !s.obstacles.some(o=>Math.hypot(p.x-o.x,p.y-o.y)<o.radius+margin);
 const z=p.z??NEST_CENTER;return z>=0&&z<NEST_LAYERS*NEST_LAYER_SIZE&&s.nest[cellIndex(p)]===1;
}
export const neighbors=volumeNeighbors;
export function nearestOpenNestPoint(s:ColonyState,p:Point):Point {
 if(isOpen(s,p,'nest'))return p;
 let result:Point=p,best=Infinity;
 for(let i=0;i<s.nest.length;i++)if(s.nest[i]){const c=cellPoint(i),d=distance(c,p);if(d<best){best=d;result=c;}}
 return result;
}

/** Nest routes model a familiar tunnel map; surface foragers never use this map. */
export class NestRoutes {
 private cache=new Map<number,Int32Array>();private revision=-1;
 next(s:ColonyState,from:Point,to:Point):Point|null{
 if(s.excavated!==this.revision){this.cache.clear();this.revision=s.excavated;}
 let goal=cellIndex(to);if(!s.nest[goal]){let best=Infinity;for(let i=0;i<s.nest.length;i++)if(s.nest[i]){const d=distance(cellPoint(i),to);if(d<best){goal=i;best=d;}}}
 const current=cellIndex(from);if(current===goal)return cellPoint(goal);
 let field=this.cache.get(goal);if(!field){field=new Int32Array(NEST_CELLS).fill(-1);field[goal]=0;const queue=[goal];for(let head=0;head<queue.length;head++){const i=queue[head];for(const n of neighbors(i))if(s.nest[n]&&field[n]===-1){field[n]=field[i]+1;queue.push(n);}}if(this.cache.size>160)this.cache.clear();this.cache.set(goal,field);}
 let best=current;for(const n of neighbors(current))if(field[n]>=0&&(field[best]<0||field[n]<field[best]))best=n;
 if(best===current)return null;
 // Reach the cell center before turning, preventing diagonal cuts through walls.
 const center=cellPoint(current),next=cellPoint(best);if((next.x!==center.x&&(Math.abs(from.y-center.y)>1||Math.abs((from.z??NEST_CENTER)-center.z)>1))||(next.y!==center.y&&(Math.abs(from.x-center.x)>1||Math.abs((from.z??NEST_CENTER)-center.z)>1))||(next.z!==center.z&&(Math.abs(from.x-center.x)>1||Math.abs(from.y-center.y)>1)))return center;
 return next;
 }
}
