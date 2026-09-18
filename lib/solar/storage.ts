import { Body, MIN_DAY, MAX_DAY, SolarFrame, SolarSave, TIMELINE_LIMIT } from './engine';
export const MAX_SAVE_BYTES = 12 * 1024 * 1024;
export interface SavedExperiment { id:string; name:string; updated:number; data:SolarSave; }
const invalid=()=>{throw new Error('This is not a valid Solar System Lab save.');};
const finite=(v:unknown,max=1e12)=>typeof v==='number'&&Number.isFinite(v)&&Math.abs(v)<=max;
const text=(v:unknown,max=200)=>typeof v==='string'&&v.length<=max;
function bodies(value:unknown,trails:boolean):value is Body[]{
 if(!Array.isArray(value)||value.length>50)return false;
 const ids=new Set<string>();
 return value.every(b=>{
  if(!b||typeof b!=='object'||!text(b.id,64)||!b.id||ids.has(b.id))return false;ids.add(b.id);
  const vec=(v:unknown)=>Array.isArray(v)&&v.length===3&&v.every(n=>finite(n));
  return text(b.name,100)&&['star','planet','moon','comet','probe'].includes(b.kind)&&typeof b.color==='string'&&/^#[\da-f]{3,8}$/i.test(b.color)&&finite(b.mass,500)&&b.mass>=0&&finite(b.radius,1e9)&&b.radius>=0&&vec(b.p)&&vec(b.v)&&(b.parent===undefined||text(b.parent,64))&&Array.isArray(b.trail)&&b.trail.length<=(trails?400:0)&&b.trail.every(vec);
 });
}
function frame(v:unknown,trails=false):v is SolarFrame{
 if(!v||typeof v!=='object')return false;const f=v as SolarFrame;
 return finite(f.day,1e6)&&(f.mode==='explore'||f.mode==='experiment')&&bodies(f.bodies,trails)&&(f.baseline===null||bodies(f.baseline,trails))&&finite(f.baselineDay,1e6)&&finite(f.speed,365)&&f.speed>0&&Number.isSafeInteger(f.nextId)&&f.nextId>=1&&f.nextId<=1e9&&text(f.selected,64)&&finite(f.referenceEnergy)&&Array.isArray(f.events)&&f.events.length<=8&&f.events.every(e=>text(e,500))&&['sample','edit','before-edit','start'].includes(f.kind);
}
export function validateSolarSave(value:unknown):SolarSave{
 if(!value||typeof value!=='object')return invalid();const s=value as SolarSave;
 if(s.lastSample!==null&&!finite(s.lastSample,1e6))return invalid();
 if(s.format!=='solar-lab'||s.version!==1||!frame(s.state,true)||!Array.isArray(s.timeline)||s.timeline.length>TIMELINE_LIMIT||!s.timeline.every(f=>frame(f))||!Number.isInteger(s.cursor)||s.cursor< -1||s.cursor>=s.timeline.length||s.timeline.length>0&&s.cursor<0||!Array.isArray(s.history)||s.history.length>180||!s.history.every(h=>h&&finite(h.day,1e6)&&finite(h.speed)&&finite(h.energy)))return invalid();
 if(s.timeline.some((f,i)=>i>0&&f.day<s.timeline[i-1].day)||s.cursor>=0&&(s.state.day<s.timeline[s.cursor].day||s.cursor<s.timeline.length-1&&s.state.day>s.timeline[s.cursor+1].day))return invalid();
 if(s.state.mode==='explore'&&(s.state.baseline!==null||s.timeline.length||s.state.day<MIN_DAY||s.state.day>MAX_DAY))return invalid();
 // Detach caller-owned objects, so a loaded experiment cannot mutate the saved copy.
 return structuredClone(s);
}
export function parseSolarSave(raw:string){if(raw.length>MAX_SAVE_BYTES)throw new Error('Save files must be smaller than 12 MB.');let value:unknown;try{value=JSON.parse(raw);}catch{throw new Error('This is not a valid Solar System Lab save.');}return validateSolarSave(value);}
let database:Promise<IDBDatabase>|undefined;
function open(){return database??=new Promise<IDBDatabase>((resolve,reject)=>{
 const request=indexedDB.open('simulation-hub-solar',1);
 request.onupgradeneeded=()=>request.result.createObjectStore('experiments',{keyPath:'id'});
 request.onsuccess=()=>{request.result.onversionchange=()=>{request.result.close();database=undefined;};resolve(request.result);};
 request.onerror=()=>{database=undefined;reject(new Error('Solar saves are unavailable. You can still export a file.'));};
 request.onblocked=()=>{database=undefined;reject(new Error('Close other hub tabs to enable solar saves.'));};
 });}
async function transaction<T>(mode:IDBTransactionMode,fn:(store:IDBObjectStore)=>IDBRequest<T>):Promise<T>{
 const db=await open();return new Promise((resolve,reject)=>{const tx=db.transaction('experiments',mode);const request=fn(tx.objectStore('experiments'));tx.oncomplete=()=>resolve(request.result);tx.onerror=tx.onabort=()=>reject(new Error('Solar saves are unavailable. You can still export a file.'));});
}
export const listExperiments=()=>transaction<SavedExperiment[]>('readonly',s=>s.getAll());
export const readAutosave=()=>transaction<SavedExperiment|undefined>('readonly',s=>s.get('autosave'));
export const deleteExperiment=(id:string)=>transaction('readwrite',s=>s.delete(id));
export async function saveExperiment(id:string,name:string,data:SolarSave){const record:SavedExperiment={id,name:name.trim().slice(0,80)||'Untitled experiment',updated:Date.now(),data:validateSolarSave(data)};await transaction('readwrite',s=>s.put(record));return record;}
