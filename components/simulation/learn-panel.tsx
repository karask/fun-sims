'use client';
import './learning.css';
import {useState} from 'react';
import {BookOpen,Target,X} from 'lucide-react';
import {useT} from '@/lib/i18n/language';
import {useIsMobile} from '@/hooks/use-mobile';
import {Sheet,SheetContent,SheetHeader,SheetTitle,SheetDescription} from '@/components/ui/sheet';
import {Switch} from '@/components/ui/switch';
import {ColonyState,Point} from '@/lib/simulation/types';
import {CHAMBERS} from '@/lib/simulation/nest-volume';
import {LearnTarget,learningTitle,learningPoint,localConditions,routeLength,strongestScent,TUNNEL_NAMES} from '@/lib/simulation/learning';
import {scentAt} from '@/lib/simulation/pheromones';
import {broodComfort} from '@/lib/simulation/behavior';

export function LearnBar({state,enabled,onEnabled,onSelect,onWorker}:{state:ColonyState;enabled:boolean;onEnabled:(v:boolean)=>void;onSelect:(target:LearnTarget)=>void;onWorker:(id:number)=>void}){
 const tr=useT();const moving=state.ants.find(a=>a.cargo==='brood')??state.ants.find(a=>a.cargo==='waste'||a.cargo==='corpse');
 const empty=state.resources.find(r=>r.amount===0);
 const choose=(value:string)=>{const [kind,id]=value.split(':');if(kind==='scent')onSelect(strongestScent(state));else if(kind==='queen'||kind==='midden')onSelect({kind});else if(kind==='resource')onSelect({kind,id:Number(id)});else onSelect({kind:kind as 'chamber'|'tunnel',index:Number(id)});};
 return <div className={`learn-bar ${enabled?'is-learning':''}`}><label><Switch checked={enabled} onCheckedChange={onEnabled} aria-label={tr('Learn mode')}/><BookOpen size={15}/>{tr('Learn')}</label>{enabled?<><select aria-label={tr('Explore a place or process')} value="" onChange={e=>choose(e.target.value)}><option value="" disabled>{tr('Explore a place or process')}</option><option value="queen">{tr('The queen')}</option>{CHAMBERS.map((c,i)=><option key={c.name} value={`chamber:${i}`}>{tr(c.name)}</option>)}{TUNNEL_NAMES.map((n,i)=><option key={n} value={`tunnel:${i}`}>{tr(n)}</option>)}<option value="scent">{tr('Strongest pheromone trail')}</option><option value="midden">{tr('Outside midden')}</option>{state.resources.map(r=><option key={r.id} value={`resource:${r.id}`}>{tr(learningTitle(state,{kind:'resource',id:r.id}))}</option>)}</select><span className="learn-prompt">{tr('Click a place to reveal its story.')}</span>{(moving||empty)&&<button className="learn-observation" onClick={()=>moving?onWorker(moving.id):onSelect({kind:'resource',id:empty!.id})}><Target size={13}/>{tr(moving?(moving.cargo==='brood'?'A nurse is moving brood':'A worker is carrying refuse'):'A food or water source is empty')} · {tr('Show me')}</button>}</>:<span className="learn-prompt">{tr('Discover the reasons behind what you see.')}</span>}</div>;
}

const LAYOUT_NOTE='The starting chambers and their spacing are designed for this sandbox, not measured from a real nest or chosen by the queen. New colonies have a supply passage that bypasses her chamber. Older saves retain their original tunnels. Excavation can expand this layout.';
const STORAGE_NOTE='Incoming collections are unloaded at the food stores. Reserves are pooled: feeding the queen and provisioning larvae are simplified transfers from those reserves, not individually transported meals. The visible pile is symbolic, not one object per food unit.';
export default function LearnPanel({state,target,route,onClose,onFocus,onWorker}:{state:ColonyState;target:LearnTarget;route:Point[];onClose:()=>void;onFocus:()=>void;onWorker:(id:number)=>void}){
 const tr=useT(),mobile=useIsMobile(),[minimized,setMinimized]=useState(false);
 const [history,setHistory]=useState<{seed:number;last:number;values:{time:number;value:number}[]}>({seed:state.seed,last:-1,values:[]});
 const point=learningPoint(state,target),title=learningTitle(state,target);
 const scent=point&&target.kind==='scent'?scentAt(state,point):0;
 if(target.kind==='scent'&&(history.seed!==state.seed||history.last!==state.time)){
  const values=history.seed!==state.seed||state.time<history.last?[]:history.values;
  setHistory({seed:state.seed,last:state.time,values:[...values.filter(v=>v.time>=state.time-60),{time:state.time,value:scent}].slice(-240)});
 }
 const rows:[string,string][]=[];let explanation='',note='',experiment='';let worker:number|undefined;
 if(target.kind==='queen'||(target.kind==='chamber'&&target.index===0)){
  explanation='The queen produces eggs when nutrition allows. She does not assign jobs or design the nest. Her central position is a starting-layout choice; this model keeps her stationary.';
  const queen=state.ants.find(a=>a.task==='queen');rows.push(['Queen',tr(queen?'Alive':'Absent')],['Eggs present',String(state.brood.filter(b=>b.stage==='egg').length)]);
  note=LAYOUT_NOTE+'\n\n'+STORAGE_NOTE;experiment='Follow a nursing worker to see care happening without orders from the queen.';worker=state.ants.find(a=>a.task==='nursing')?.id;
 }else if(target.kind==='chamber'){
  explanation=target.index===3?'Foragers unload nectar, protein, and water here. Workers visit these stores to feed and recover. A longer supply route delays each delivery.':target.index===1?'Nurses tend eggs, larvae, and pupae here. Care, protein, temperature, and moisture influence development. A chamber label describes its intended use; brood can also occupy other suitable places.':'This lower chamber adds space and an alternative brood location. In this model it is cooler and wetter. Nurses may carry brood here when conditions are more suitable.';
  note=target.index===3?STORAGE_NOTE:LAYOUT_NOTE+'\n\n'+ 'Temperature falls and moisture rises with vertical depth using a simple fixed gradient. This is not a physical soil or weather model.';
  if(target.index===3)rows.push(['Nectar reserves',state.stores.carbohydrate.toFixed(1)],['Protein reserves',state.stores.protein.toFixed(1)],['Water reserves',state.stores.water.toFixed(1)]);
  else if(point){const c=CHAMBERS[target.index],local=state.brood.filter(b=>((b.x-c.x)/c.rx)**2+((b.y-c.y)/c.ry)**2+(((b.z??180)-c.z)/c.rz)**2<1);rows.push(['Brood here',String(local.length)],['Brood suitability',`${Math.round(broodComfort(state,point)*100)}%`]);}
  experiment=target.index===3?'Follow a returning food carrier and watch it unload here.':'Change temperature or moisture, then follow a nurse. Relocation needs poor conditions, a better destination, and a worker tending that brood.';
  worker=state.ants.find(a=>target.index===3?['carbohydrate','protein','water'].includes(a.cargo??''):a.task==='nursing')?.id;
 }else if(target.kind==='tunnel'){
  explanation='The highlighted route follows open nest cells from the entrance. Longer journeys take more time and keep workers occupied carrying supplies or brood. Distance here describes this simulated nest, not an ideal biological spacing.';
  note=LAYOUT_NOTE+'\n\n'+ 'Travel time uses a carrier speed of 17 model units per simulation second. It excludes feeding, loading, decisions, and the trip across the surface. The displayed path follows the same cell graph as worker navigation; it is not a straight-line ruler.';
  experiment='Follow a food carrier to compare its journey with the highlighted supply route.';worker=state.ants.find(a=>['carbohydrate','protein','water'].includes(a.cargo??''))?.id;
 }else if(target.kind==='resource'){
  const r=state.resources.find(r=>r.id===target.id);
  explanation=r?'Workers discover this source locally or learn its location from nestmates. Every collection removes up to 0.8 units. An empty source never refills on its own; ants must find another source.':'This source has been removed from the habitat.';
  if(r){rows.push(['Remaining',`${r.amount.toFixed(1)} / ${r.initial.toFixed(1)}`],['Collectors nearby',String(state.ants.filter(a=>a.view==='surface'&&a.alive&&a.task==='foraging'&&Math.hypot(a.x-r.x,a.y-r.y)<65).length)],['Local scent',scentAt(state,r).toFixed(2)],['Rivals nearby',String(state.enemies.filter(e=>e.kind==='rival'&&Math.hypot(e.x-r.x,e.y-r.y)<65).length)]);worker=state.ants.find(a=>a.view==='surface'&&a.memory&&Math.hypot(a.memory.x-r.x,a.memory.y-r.y)<r.radius)?.id;}
  note='Rival foragers also remove food from this source when encounters are enabled. Their collections reduce surface food without increasing your colony’s reserves.'+'\n\n'+'Nectar supplies carbohydrate energy; protein supports larvae and egg production; water helps recovery. Amounts and consumption rates use sandbox units. Old memories and scent can keep drawing workers to an empty source until they learn it is depleted.';experiment='Watch the percentage fall. After depletion, watch recruitment and the trail weaken over time.';
 }else if(target.kind==='scent'){
  explanation='Returning food and water carriers leave pheromone as they walk. Repeated passages reinforce the same route. Other ants sense nearby scent, alongside route memory and information from nestmates.';
  rows.push(['Scent at this spot',`${scent.toFixed(2)} / 50`],['Unreinforced half-life',`${Math.round(Math.log(2)/state.settings.pheromoneDecay)} ${tr('simulation seconds')}`]);
  note='Mint light makes an invisible chemical signal visible. Brightness uses a fixed scale. The chart samples this selected spot while inspected, not the whole route; it freezes when paused and starts over after selecting another spot. The concentration field is a simplified grid.';experiment='Change Trail persistence, or wait for a nearby source to empty, and watch this spot brighten or fade.';
 }else{
  explanation='Cleaning workers carry waste and corpses out of the nest to this midden. Excavators also bring soil here. Select a carrier to watch the whole journey.';
  rows.push(['Refuse deliveries',String(state.removedWaste)],['Soil deliveries',String(state.depositedSoil)],['Refuse carriers',String(state.ants.filter(a=>a.cargo==='waste'||a.cargo==='corpse').length)]);
  note='The midden position is predefined. Delivered refuse is removed from the simulation; the marker summarizes deliveries rather than accumulating individual corpses. Disease and pathogens are not modeled. Surface encounters can produce casualties; eaten prey leave no corpse.';experiment='Follow a cleaning worker and watch it pick up refuse, exit, and release its load.';worker=state.ants.find(a=>a.cargo==='waste'||a.cargo==='corpse'||a.task==='cleaning')?.id;
 }
 if(point&&['queen','chamber'].includes(target.kind)){const climate=localConditions(state,point);rows.push(['Local temperature',`${climate.temperature.toFixed(1)}°C`],['Local moisture',`${climate.moisture.toFixed(1)}%`]);}
 if(['queen','chamber','tunnel'].includes(target.kind)){const length=routeLength(route);rows.push(['Route from entrance',route.length?`${Math.round(length)} ${tr('model units')}`:tr('No connected route')],['Carrier travel estimate',route.length?`${(length/17).toFixed(1)} ${tr('simulation seconds')}`:'—']);}
 const h=history.values,points=h.map(v=>`${(v.time-(h[0]?.time??0))/Math.max(1,state.time-(h[0]?.time??0))*240},${54-v.value/50*48}`).join(' ');
 const body=<><p className="learn-explanation">{tr(explanation)}</p><dl className="learn-readings">{rows.map(([label,value])=><div key={label}><dt>{tr(label)}</dt><dd>{value}</dd></div>)}</dl>{target.kind==='scent'&&<div className="scent-history"><span>{tr('This spot · last 60 simulation seconds')}</span><svg viewBox="0 0 240 60" role="img" aria-label={tr('Local pheromone history, fixed scale from 0 to 50')}><path d="M0 6H240M0 54H240" stroke="#adc5b633"/><polyline points={points} fill="none" stroke="#a9e9cd" strokeWidth="2"/></svg><small>{tr('Fixed scale: 0–50 · history starts on selection')}</small></div>}<p className="learn-experiment">{tr(experiment)}</p><div className="learn-actions"><button className="button secondary" onClick={()=>{onFocus();if(mobile)setMinimized(true);}}><Target size={14}/>{tr('Show this place')}</button>{worker!==undefined&&<button className="button secondary" onClick={()=>onWorker(worker!)}>{tr('Follow a worker')}</button>}</div><details className="learn-model-notes"><summary>{tr('Model notes & sources')}</summary>{note.split('\n\n').map(part=><p key={part}>{tr(part)}</p>)}<a href="https://pubmed.ncbi.nlm.nih.gov/26787857/" target="_blank" rel="noreferrer">{tr('Research: local rules and nest construction')} ↗</a><a href="https://journals.biologists.com/jeb/article/216/2/188/11672/Ant-foraging-on-complex-trails-route-learning-and" target="_blank" rel="noreferrer">{tr('Research: route memory and pheromones')} ↗</a></details></>;
 if(mobile&&minimized)return <button className="follow-chip" onClick={()=>setMinimized(false)}><BookOpen size={14}/>{tr(title)} · {tr('View details')}</button>;
 if(mobile)return <Sheet open onOpenChange={open=>{if(!open)onClose();}}><SheetContent side="bottom" className="mobile-inspector"><SheetHeader><SheetTitle>{tr(title)}</SheetTitle><SheetDescription>{tr('Live observations and model explanations.')}</SheetDescription></SheetHeader><div className="inspector-body learn-body">{body}</div></SheetContent></Sheet>;
 return <aside className="ant-inspector learn-inspector" aria-label={tr('Learning inspector')}><div className="inspector-heading"><span><BookOpen size={16}/>{tr(title)}</span><button className="icon-button" aria-label={tr('Close learning inspector')} onClick={onClose}><X size={16}/></button></div>{body}</aside>;
}
