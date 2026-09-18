import { ColonyState, FIELD_CELL, FIELD_COLS, FIELD_ROWS, Point } from './types';
import { clamp } from './spatial';
export function fieldIndex(p:Point){return clamp(Math.floor(p.y/FIELD_CELL),0,FIELD_ROWS-1)*FIELD_COLS+clamp(Math.floor(p.x/FIELD_CELL),0,FIELD_COLS-1);}
export function deposit(s:ColonyState,p:Point,amount:number){const i=fieldIndex(p);s.pheromones[i]=Math.min(50,s.pheromones[i]+amount);}
export function scentAt(s:ColonyState,p:Point){return s.pheromones[fieldIndex(p)];}
export function decayFields(s:ColonyState,dt:number){const decay=Math.exp(-s.settings.pheromoneDecay*dt),trafficDecay=Math.exp(-.016*dt);for(let i=0;i<s.pheromones.length;i++){s.pheromones[i]*=decay;if(s.pheromones[i]<.0001)s.pheromones[i]=0;s.traffic[i]*=trafficDecay;}}
