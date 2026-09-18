'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Download, FolderOpen, Save, Trash2, Upload } from 'lucide-react';
import { SolarEngine } from '@/lib/solar/engine';
import { MAX_SAVE_BYTES, SavedExperiment, deleteExperiment, listExperiments, parseSolarSave, readAutosave, saveExperiment, validateSolarSave } from '@/lib/solar/storage';
import { useT } from '@/lib/i18n/language';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

export function useSolarAutosave(engine:SolarEngine,active:boolean,onRestore:()=>void,onError:(message:string)=>void){
 const [ready,setReady]=useState(false),[status,setStatus]=useState('Loading local experiment…');
 const latest=useRef({active,onRestore,onError});latest.current={active,onRestore,onError};
 const write=useCallback(async()=>{try{await saveExperiment('autosave','Autosave',engine.snapshot());setStatus('Saved on this device');}catch(e){setStatus('Autosave unavailable');latest.current.onError((e as Error).message);}},[engine]);
 useEffect(()=>{let canceled=false;readAutosave().then(saved=>{if(canceled)return;if(saved){engine.restore(validateSolarSave(saved.data));latest.current.onRestore();setStatus('Restored local autosave');}else setStatus('Autosaves every 30 seconds');}).catch(e=>{if(!canceled){setStatus('Autosave unavailable');latest.current.onError((e as Error).message);}}).finally(()=>{if(!canceled)setReady(true);});return()=>{canceled=true;};},[engine]);
 useEffect(()=>{if(!ready||!active)return;const timer=window.setInterval(()=>{if(latest.current.active&&!document.hidden)void write();},30000);const hidden=()=>{if(document.hidden)void write();};document.addEventListener('visibilitychange',hidden);window.addEventListener('pagehide',write);return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',hidden);window.removeEventListener('pagehide',write);};},[active,ready,write]);
 useEffect(()=>{if(ready&&!active)void write();},[active,ready,write]);
 return {ready,status,write};
}
export default function SolarSaves({engine,open,onOpenChange,onRestore,onError,onSaved}:{engine:SolarEngine;open:boolean;onOpenChange:(open:boolean)=>void;onRestore:()=>void;onError:(message:string)=>void;onSaved:()=>void}){
 const tr=useT(),[name,setName]=useState(''),[saves,setSaves]=useState<SavedExperiment[]>([]),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');const input=useRef<HTMLInputElement>(null);
 const list=async()=>setSaves((await listExperiments()).filter(s=>s.id!=='autosave').sort((a,b)=>b.updated-a.updated));
 useEffect(()=>{if(open){setNotice('');void list().catch(e=>onError((e as Error).message));}},[open,onError]);
 const run=async(fn:()=>Promise<void>)=>{setBusy(true);try{await fn();}catch(e){onError((e as Error).message);}finally{setBusy(false);}};
 const load=(saved:SavedExperiment)=>{engine.restore(validateSolarSave(saved.data));onRestore();onOpenChange(false);};
 const exportFile=()=>{const data=JSON.stringify(engine.snapshot());const url=URL.createObjectURL(new Blob([data],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=(name.trim().replace(/[^\p{L}\p{N}_-]+/gu,'-')||'solar-experiment')+'.solar.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);};
 return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="solar-dialog solar-save-dialog"><DialogHeader><DialogTitle>{tr('Your solar experiments')}</DialogTitle><DialogDescription>{tr('Save a named checkpoint, including its rewind history and comparison baseline. Loading or importing replaces the current solar system and pauses time.')}</DialogDescription></DialogHeader>
  <form className="solar-save-form" onSubmit={e=>{e.preventDefault();void run(async()=>{await saveExperiment(crypto.randomUUID(),name||tr('Untitled experiment'),engine.snapshot());setName('');await list();setNotice('Experiment saved');onSaved();});}}><label htmlFor="solar-save-name">{tr('Experiment name')}</label><div><input id="solar-save-name" maxLength={80} value={name} onChange={e=>setName(e.target.value)} placeholder={tr('e.g. Earth at 135% speed')}/><button type="submit" className="button secondary" disabled={busy}><Save size={15}/>{tr('Save')}</button></div></form>
  <div className="solar-save-list">{!saves.length?<p>{tr('No named experiments yet. Your latest session is autosaved separately.')}</p>:saves.map(saved=><div key={saved.id}><div><strong>{saved.name}</strong><small>{new Date(saved.updated).toLocaleString()} · {tr(saved.data.state.bodies.length)} {tr('objects')}</small></div><button className="button secondary" disabled={busy} onClick={()=>{try{load(saved);}catch(e){onError((e as Error).message);}}}><FolderOpen size={14}/>{tr('Load')}</button><button className="icon-button" disabled={busy} aria-label={tr('Delete saved experiment')+' '+saved.name} onClick={()=>void run(async()=>{await deleteExperiment(saved.id);await list();})}><Trash2 size={15}/></button></div>)}</div>
  <div className="solar-save-transfer"><button className="button secondary" onClick={exportFile}><Download size={15}/>{tr('Export JSON')}</button><button className="button secondary" disabled={busy} onClick={()=>input.current?.click()}><Upload size={15}/>{tr('Import JSON')}</button><input ref={input} type="file" accept=".json,.solar.json,application/json" hidden onChange={e=>{const file=e.target.files?.[0];e.target.value='';if(file)void run(async()=>{if(file.size>MAX_SAVE_BYTES)throw new Error('Save files must be smaller than 12 MB.');const data=parseSolarSave(await file.text());engine.restore(data);onRestore();onOpenChange(false);});}}/></div>
  <p className="solar-save-note">{tr('Saves stay in this browser. Export a file to keep a backup or use another device.')}</p><p role="status" className="solar-save-status">{tr(notice)}</p>
 </DialogContent></Dialog>;
}
