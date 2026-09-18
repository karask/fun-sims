'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {AntAdapter} from './adapter';
import {createColony} from './engine';
import type {Command,Snapshot} from './types';
import {getColony,saveColony} from './storage';
import {toast} from 'sonner';
export function useSimulation(){
 const liveSnapshot=useRef<Snapshot|null>(null);
 const adapter=useRef<AntAdapter|null>(null);const [snapshot,setSnapshot]=useState<Snapshot>(()=>({state:createColony(),paused:false,speed:1,stepMs:0}));const [ready,setReady]=useState(false);const [error,setError]=useState<string|null>(null);const [savedAt,setSavedAt]=useState<number|null>(null);
 const dispatch=useCallback(async(command:Command)=>{try{if(!adapter.current)throw new Error('The colony is still starting.');const s=await adapter.current.command(command);setSnapshot(s);setError(null);return s;}catch(e){const message=e instanceof Error?e.message:'This change could not be applied.';toast.error(message);throw e;}},[]);
 useEffect(()=>{let active=true,restoring=true,lastUI=0;const sim=new AntAdapter();adapter.current=sim;sim.onFailure=message=>{if(active){setError(message);setReady(false);}};sim.subscribe(s=>{if(active){liveSnapshot.current=s;if(performance.now()-lastUI>250){setSnapshot(s);setReady(true);lastUI=performance.now();}}});sim.initialize();
 void getColony('autosave').then(async saved=>{if(saved&&active){await sim.command({type:'load',state:saved.state});if(active){setSavedAt(saved.savedAt);toast('Last colony restored',{description:'Paused so you can pick up where you left off.'});}}}).catch(e=>{if(active)toast.error(e.message);}).finally(()=>{restoring=false;});
 const save=async()=>{if(restoring||!active)return;try{const s=await sim.command({type:'snapshot'});const when=Date.now();await saveColony({id:'autosave',name:'Last session',savedAt:when,state:s.state});if(active)setSavedAt(when);}catch(e){if(active){setError(e instanceof Error?e.message:'Autosave failed. Export a backup.');}}};
 const timer=setInterval(()=>{void save();},30000);const onVisibility=()=>{if(document.visibilityState==='hidden')void save();};document.addEventListener('visibilitychange',onVisibility);
 return()=>{active=false;clearInterval(timer);document.removeEventListener('visibilitychange',onVisibility);sim.dispose();adapter.current=null;};},[]);
 return {snapshot,liveSnapshot,dispatch,ready,error,savedAt};
}
