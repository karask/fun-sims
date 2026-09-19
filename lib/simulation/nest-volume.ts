import { CELL, COLS, ROWS, NEST_LAYERS, NEST_LAYER_SIZE, NEST_CENTER, Point } from './types';
export const NEST_SLICE = COLS * ROWS;
export const NEST_CELLS = NEST_SLICE * NEST_LAYERS;
export const CHAMBERS = [
  {name:'Queen chamber',x:680,y:390,z:NEST_CENTER,rx:135,ry:78,rz:72},
  {name:'Brood nursery',x:498,y:545,z:100,rx:115,ry:65,rz:64},
  {name:'Lower chamber',x:837,y:574,z:260,rx:122,ry:72,rz:64},
  {name:'Food stores',x:970,y:390,z:220,rx:65,ry:44,rz:45},
] as const;
export const FOOD_STORES = {x:970,y:390,z:220};
export const NURSERY = {x:490,y:540,z:100};
export function volumeIndex(p:Point) {
  return Math.floor((p.z??NEST_CENTER)/NEST_LAYER_SIZE)*NEST_SLICE+Math.floor(p.y/CELL)*COLS+Math.floor(p.x/CELL);
}
export function volumePoint(i:number) {
  const flat=i%NEST_SLICE;
  return {x:(flat%COLS)*CELL+CELL/2,y:Math.floor(flat/COLS)*CELL+CELL/2,z:Math.floor(i/NEST_SLICE)*NEST_LAYER_SIZE+NEST_LAYER_SIZE/2};
}
export function volumeNeighbors(i:number) {
  const flat=i%NEST_SLICE,x=flat%COLS,y=Math.floor(flat/COLS),z=Math.floor(i/NEST_SLICE),out:number[]=[];
  if(x>0)out.push(i-1);if(x<COLS-1)out.push(i+1);
  if(y>0)out.push(i-COLS);if(y<ROWS-1)out.push(i+COLS);
  if(z>0)out.push(i-NEST_SLICE);if(z<NEST_LAYERS-1)out.push(i+NEST_SLICE);
  return out;
}
export function createNestVolume() {
  const nest=Array<number>(NEST_CELLS).fill(0);
  for(let i=0;i<nest.length;i++){
    const p=volumePoint(i);
    if(CHAMBERS.some(c=>((p.x-c.x)/c.rx)**2+((p.y-c.y)/c.ry)**2+((p.z-c.z)/c.rz)**2<1))nest[i]=1;
  }
  // Overlapping ellipsoids carve connected shafts, including front/back ramps.
  const tunnel=(a:Point,b:Point,r:number)=>{
    const steps=Math.ceil(Math.hypot(a.x-b.x,a.y-b.y,(a.z??NEST_CENTER)-(b.z??NEST_CENTER))/8);
    for(let n=0;n<=steps;n++){
      const t=n/steps,p={x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:(a.z??NEST_CENTER)+((b.z??NEST_CENTER)-(a.z??NEST_CENTER))*t};
      for(let z=Math.max(0,Math.floor((p.z-r)/NEST_LAYER_SIZE));z<=Math.min(NEST_LAYERS-1,Math.floor((p.z+r)/NEST_LAYER_SIZE));z++)
      for(let y=Math.max(0,Math.floor((p.y-r)/CELL));y<=Math.min(ROWS-1,Math.floor((p.y+r)/CELL));y++)
      for(let x=Math.max(0,Math.floor((p.x-r)/CELL));x<=Math.min(COLS-1,Math.floor((p.x+r)/CELL));x++){
        const i=z*NEST_SLICE+y*COLS+x,q=volumePoint(i);
        if(Math.hypot(q.x-p.x,q.y-p.y,q.z-p.z)<r)nest[i]=1;
      }
    }
  };
  tunnel({x:680,y:90,z:NEST_CENTER},CHAMBERS[0],32);
  // A supply passage keeps returning food traffic out of the queen's chamber.
  tunnel({x:680,y:190,z:NEST_CENTER},{x:900,y:190,z:220},32);
  tunnel({x:900,y:190,z:220},CHAMBERS[3],32);
  tunnel(CHAMBERS[0],CHAMBERS[1],38);tunnel(CHAMBERS[0],CHAMBERS[2],38);
  return nest;
}
export function projectNest(nest:readonly number[]) {
  const projection=Array<number>(NEST_SLICE).fill(0);
  for(let i=0;i<nest.length;i++)if(nest[i])projection[i%NEST_SLICE]=1;
  return projection;
}
