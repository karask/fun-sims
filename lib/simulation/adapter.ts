import AntWorker from './ant.worker?worker';
import type { Command,SimulatorAdapter,Snapshot } from './types';
export class AntAdapter implements SimulatorAdapter {
 onFailure:((message:string)=>void)|null=null;
 private worker:Worker|null=null;private listeners=new Set<(s:Snapshot)=>void>();private request=0;private pending=new Map<number,{resolve:(s:Snapshot)=>void;reject:(e:Error)=>void;timer:ReturnType<typeof setTimeout>}>();
 initialize(){if(this.worker)return;this.worker=new AntWorker();this.worker.onmessage=e=>{if(e.data.snapshot)for(const listener of this.listeners)listener(e.data.snapshot);if(e.data.requestId){const pending=this.pending.get(e.data.requestId);if(pending){clearTimeout(pending.timer);e.data.error?pending.reject(new Error(e.data.error)):pending.resolve(e.data.snapshot);this.pending.delete(e.data.requestId);}}};this.worker.onerror=()=>{this.onFailure?.('The simulation stopped unexpectedly. Reload to restore the last autosave.');for(const p of this.pending.values()){clearTimeout(p.timer);p.reject(new Error('The simulation stopped unexpectedly. Reload the page to restore your last autosave.'));}this.pending.clear();};}
 setActive(active:boolean){this.worker?.postMessage({active});}
 command(command:Command):Promise<Snapshot>{if(!this.worker)return Promise.reject(new Error('The simulation is still starting.'));const requestId=++this.request;return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{this.pending.delete(requestId);reject(new Error('The simulation did not respond. Your last saved colony is safe.'));},15000);this.pending.set(requestId,{resolve,reject,timer});this.worker!.postMessage({requestId,command});});}
 subscribe(listener:(s:Snapshot)=>void){this.listeners.add(listener);return()=>{this.listeners.delete(listener);};}
 dispose(){this.worker?.terminate();this.worker=null;for(const p of this.pending.values()){clearTimeout(p.timer);p.reject(new Error('Simulation closed.'));}this.pending.clear();this.listeners.clear();}
}
