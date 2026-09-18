/// <reference lib="webworker" />
import { AntSimulation,FIXED_DT } from './engine';
import type { Command } from './types';
const sim=new AntSimulation();let last=performance.now(),accumulator=0,lastPost=0,stepMs=0;
function snapshot(){return {state:sim.state,paused:sim.paused,speed:sim.speed,stepMs};}
self.onmessage=(e:MessageEvent<{requestId:number;command:Command}>)=>{const {requestId,command}=e.data;try{sim.command(command);if(['load','reset','pause','speed'].includes(command.type)){accumulator=0;last=performance.now();}self.postMessage({requestId,snapshot:snapshot()});}catch(error){self.postMessage({requestId,error:error instanceof Error?error.message:'Unable to apply this change.'});}};
setInterval(()=>{const now=performance.now();const elapsed=Math.min((now-last)/1000,.1);last=now;if(!sim.paused){accumulator+=elapsed*sim.speed;const started=performance.now();let steps=0;while(accumulator>=FIXED_DT&&steps<16){sim.step();accumulator-=FIXED_DT;steps++;}if(steps)stepMs=(performance.now()-started)/steps;}if(now-lastPost>=100){lastPost=now;self.postMessage({snapshot:snapshot()});}},16);
