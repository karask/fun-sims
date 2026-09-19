'use client';
import './encounters.css';
import {useState} from 'react';
import {Shield,Target,X} from 'lucide-react';
import {useT} from '@/lib/i18n/language';
import {Switch} from '@/components/ui/switch';
import {Slider} from '@/components/ui/slider';
import {Sheet,SheetContent,SheetHeader,SheetTitle,SheetDescription} from '@/components/ui/sheet';
import {useIsMobile} from '@/hooks/use-mobile';
import {ColonyState,Enemy,Settings} from '@/lib/simulation/types';

export function EncounterSettings({settings,onChange}:{settings:Settings;onChange:(settings:Partial<Settings>)=>void}){
 const tr=useT();
 return <div className="sidebar-section encounter-settings"><div className="section-title"><Shield size={15}/><span>{tr('Surface encounters')}</span></div>
  <label><span>{tr('Hunting spiders')}</span><Switch checked={settings.spiderEncounters} onCheckedChange={value=>onChange({spiderEncounters:value})} aria-label={tr('Hunting spiders')}/></label>
  <label><span>{tr('Rival foragers')}</span><Switch checked={settings.rivalEncounters} onCheckedChange={value=>onChange({rivalEncounters:value})} aria-label={tr('Rival foragers')}/></label>
  {(settings.spiderEncounters||settings.rivalEncounters)&&<div className="parameter"><div><label>{tr('Encounter frequency')}</label><output>{settings.encounterFrequency}×</output></div><Slider aria-label={tr('Encounter frequency')} value={[settings.encounterFrequency]} min={.25} max={4} step={.25} onValueChange={v=>onChange({encounterFrequency:v[0]})}/></div>}
  <p>{tr('Optional encounters arrive at the world edge. Switching off makes current visitors leave.')}</p>
 </div>;
}
export function EncounterGuide({state,alarm,onAlarm,onSelect}:{state:ColonyState;alarm:boolean;onAlarm:(v:boolean)=>void;onSelect:(id:number)=>void}){
 const tr=useT();
 if(!state.settings.spiderEncounters&&!state.settings.rivalEncounters&&!state.enemies.length)return null;
 const defending=state.ants.filter(a=>a.task==='defending').length,retreating=state.ants.filter(a=>a.task==='retreating').length;
 return <div className="encounter-guide"><div className="encounter-guide-row"><Shield size={14}/><b>{tr('Encounters')}</b><label><Switch checked={alarm} onCheckedChange={onAlarm} aria-label={tr('Show alarm signals')}/><span>{tr('Alarm signals')}</span><i className="alarm-gradient" title={tr('Dim: weak alarm · Bright: strong alarm')}/></label><span>{tr('Defending')} <b>{defending}</b> · {tr('Retreating')} <b>{retreating}</b></span>
  {state.enemies.length?<select aria-label={tr('Observe an encounter')} value="" onChange={e=>onSelect(Number(e.target.value))}><option disabled value="">{tr('Observe an encounter')}</option>{state.enemies.map(e=><option key={e.id} value={e.id}>{tr(e.kind==='spider'?'Hunting spider':'Rival forager')} #{e.id} · {tr(e.mode)}</option>)}</select>:<span className="encounter-quiet">{tr('Quiet for now · arrivals use simulation time')}</span>}</div>
  <details><summary>{tr('How defence and competition work')}</summary><div className="encounter-explanation"><p>{tr('These workers have no soldier caste. Nearby workers may defend when supported, retreat when isolated, or protect a carried load. Amber shows a short-lived local alarm; mint shows food trails. Alarm halves every 3 simulation seconds without reinforcement.')}</p><p>{tr('Spiders hunt workers and leave after a capture or sustained pressure. Rival foragers discover nectar and protein locally, take finite portions, and carry them to an off-screen colony. They can reduce your supply without a fight. They do not follow your colony’s food pheromone.')}</p><p>{tr('This is a simplified surface encounter model: no nest invasions, permanent soldiers, or simulated rival nest. Detection distances, alarm chemistry, combat costs, and arrival rates are illustrative. Returning visitors withdraw rather than fighting; departures are capped at 5 simulation minutes.')}</p><div className="encounter-totals"><span>{tr('Visitors repelled')} <b>{state.encounters.repelled}</b></span><span>{tr('Workers lost in encounters')} <b>{state.encounters.lostWorkers}</b></span><span>{tr('Food taken by rivals')} <b>{state.encounters.stolenFood.toFixed(1)}</b></span></div><a href="https://onlinelibrary.wiley.com/doi/10.1155/2012/383757" target="_blank" rel="noreferrer">{tr('Research: local defence in Lasius niger')} ↗</a></div></details>
 </div>;
}
export function EnemyInspector({enemy,state,onClose,onFocus}:{enemy:Enemy;state:ColonyState;onClose:()=>void;onFocus:()=>void}){
 const tr=useT(),mobile=useIsMobile(),[minimized,setMinimized]=useState(false);
 const title=tr(enemy.kind==='spider'?'Hunting spider':'Rival forager')+' #'+enemy.id;
 const defenders=state.ants.filter(a=>a.alive&&a.view==='surface'&&a.task==='defending'&&Math.hypot(a.x-enemy.x,a.y-enemy.y)<65).length;
 const body=<><div className="task-pill encounter-task">{tr(enemy.mode)}</div><p>{tr(enemy.reason)}</p><div className="ant-values"><span>{tr('Objective')}<b>{tr(enemy.kind==='spider'?'Capture a worker':'Collect surface food')}</b></span><span>{tr('Energy')}<b>{Math.round(enemy.energy*100)}%</b></span><span>{tr('Carrying')}<b>{tr(enemy.prey?'Captured worker':enemy.cargo??'Nothing')}{enemy.cargo&&` · ${enemy.amount.toFixed(1)}`}</b></span><span>{tr('Nearby defenders')}<b>{defenders}</b></span><span>{tr('Food memory')}<b>{tr(enemy.memory?'Food location learned':'Still exploring')}</b></span></div><button className="button secondary" onClick={()=>{onFocus();if(mobile)setMinimized(true);}}><Target size={14}/>{tr('Show this visitor')}</button><p className="encounter-note">{tr('A temporary surface visitor. Observe nearby workers using Find worker → Defending or Retreating.')}</p></>;
 if(mobile&&minimized)return <button className="follow-chip" onClick={()=>setMinimized(false)}><Shield size={14}/>{title}</button>;
 if(mobile)return <Sheet open onOpenChange={open=>{if(!open)onClose();}}><SheetContent side="bottom" className="mobile-inspector"><SheetHeader><SheetTitle>{title}</SheetTitle><SheetDescription>{tr('Observing a surface encounter.')}</SheetDescription></SheetHeader><div className="inspector-body">{body}</div></SheetContent></Sheet>;
 return <aside className="ant-inspector encounter-inspector" aria-label={tr('Selected visitor')}><div className="inspector-heading"><span><Shield size={17}/>{title}</span><button className="icon-button" aria-label={tr('Close inspector')} onClick={onClose}><X size={16}/></button></div>{body}</aside>;
}
