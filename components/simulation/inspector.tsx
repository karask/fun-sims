'use client';
import { useT } from '@/lib/i18n/language';
import {useState} from 'react';
import {Bug,Target,X} from 'lucide-react';
import {Ant,View} from '@/lib/simulation/types';
import {useIsMobile} from '@/hooks/use-mobile';
import {Sheet,SheetContent,SheetHeader,SheetTitle,SheetDescription} from '@/components/ui/sheet';
export default function Inspector({ant,follow,onFollow,onClose,onView}:{ant:Ant;follow:boolean;onFollow:()=>void;onClose:()=>void;onView:(v:View)=>void}){
 const tr = useT();
 const mobile=useIsMobile();const [minimized,setMinimized]=useState(false);const body=<><div className="task-pill">{tr(ant.task)}</div><p>{tr(ant.reason)}</p><div className="ant-values"><span>{tr("Age ")}<b>{tr(ant.age.toFixed(1))}{tr(" model days")}</b></span><span>{tr("Energy ")}<b>{tr(Math.round(ant.energy*100))}%</b></span><span>{tr("Hunger ")}<b>{tr(Math.round(ant.hunger*100))}%</b></span><span>{tr("Carrying ")}<b>{tr(ant.cargo??'Nothing')}</b></span><span>{tr("Location ")}<b>{tr(ant.view==='nest'?'Underground':'Surface')}</b></span><span>{tr("Route memory ")}<b>{tr(ant.task==='queen'?'Not a forager':ant.memory?'Food location learned':'Still exploring')}</b></span></div><button className={`button ${follow?'primary':'secondary'}`} onClick={()=>{onView(ant.view);onFollow();if(mobile&&!follow)setMinimized(true);}}><Target size={14}/>{tr(follow?'Stop following':'Follow this ant')}</button><details className="decision-log"><summary>{tr("Recent decisions")}</summary>{ant.history.length?ant.history.map((h,i)=><p key={`${i}-${h}`}>{tr(h)}</p>):<p>{tr("No recent task changes.")}</p>}</details></>;
 const title=ant.task==='queen'?'The queen':`Worker #${ant.id}`;
 if(mobile&&minimized)return <button className="follow-chip" onClick={()=>setMinimized(false)}><Target size={14}/>{tr(title)} · {tr(follow?'Following':'View details')}</button>;
 if(mobile)return <Sheet open onOpenChange={open=>{if(!open)onClose();}}><SheetContent side="bottom" className="mobile-inspector"><SheetHeader><SheetTitle>{tr(title)}</SheetTitle><SheetDescription>{tr("Inspecting one individual in the colony.")}</SheetDescription></SheetHeader><div className="inspector-body">{tr(body)}</div></SheetContent></Sheet>;
 return <aside className="ant-inspector" aria-label={tr("Selected ant")}><div className="inspector-heading"><span><Bug size={17}/>{tr(title)}</span><button className="icon-button" aria-label={tr("Close inspector")} onClick={onClose}><X size={16}/></button></div>{tr(body)}</aside>;
}
