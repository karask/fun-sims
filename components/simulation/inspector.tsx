'use client';
import {useState} from 'react';
import {Bug,Target,X} from 'lucide-react';
import {Ant,View} from '@/lib/simulation/types';
import {useIsMobile} from '@/hooks/use-mobile';
import {Sheet,SheetContent,SheetHeader,SheetTitle,SheetDescription} from '@/components/ui/sheet';
export default function Inspector({ant,follow,onFollow,onClose,onView}:{ant:Ant;follow:boolean;onFollow:()=>void;onClose:()=>void;onView:(v:View)=>void}){
 const mobile=useIsMobile();const [minimized,setMinimized]=useState(false);const body=<><div className="task-pill">{ant.task}</div><p>{ant.reason}</p><div className="ant-values"><span>Age <b>{ant.age.toFixed(1)} model days</b></span><span>Energy <b>{Math.round(ant.energy*100)}%</b></span><span>Hunger <b>{Math.round(ant.hunger*100)}%</b></span><span>Carrying <b>{ant.cargo??'Nothing'}</b></span><span>Location <b>{ant.view==='nest'?'Underground':'Surface'}</b></span><span>Route memory <b>{ant.task==='queen'?'Not a forager':ant.memory?'Food location learned':'Still exploring'}</b></span></div><button className={`button ${follow?'primary':'secondary'}`} onClick={()=>{onView(ant.view);onFollow();if(mobile&&!follow)setMinimized(true);}}><Target size={14}/>{follow?'Stop following':'Follow this ant'}</button><details className="decision-log"><summary>Recent decisions</summary>{ant.history.length?ant.history.map((h,i)=><p key={`${i}-${h}`}>{h}</p>):<p>No recent task changes.</p>}</details></>;
 const title=ant.task==='queen'?'The queen':`Worker #${ant.id}`;
 if(mobile&&minimized)return <button className="follow-chip" onClick={()=>setMinimized(false)}><Target size={14}/>{title} · {follow?'Following':'View details'}</button>;
 if(mobile)return <Sheet open onOpenChange={open=>{if(!open)onClose();}}><SheetContent side="bottom" className="mobile-inspector"><SheetHeader><SheetTitle>{title}</SheetTitle><SheetDescription>Inspecting one individual in the colony.</SheetDescription></SheetHeader><div className="inspector-body">{body}</div></SheetContent></Sheet>;
 return <aside className="ant-inspector" aria-label="Selected ant"><div className="inspector-heading"><span><Bug size={17}/>{title}</span><button className="icon-button" aria-label="Close inspector" onClick={onClose}><X size={16}/></button></div>{body}</aside>;
}
