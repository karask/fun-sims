'use client';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { AU_KM } from '@/lib/solar/engine';
import { createSolarScene } from '@/lib/solar/scene';
import { translate } from '@/lib/i18n/translate';
import { useT } from '@/lib/i18n/language';
import type { SolarCanvasProps } from './solar-canvas';
export default function SolarThreeCanvas(props:SolarCanvasProps&{onFallback:()=>void}){
 const tr=useT(),canvasRef=useRef<HTMLCanvasElement>(null),labelsRef=useRef<HTMLCanvasElement>(null),latest=useRef(props);latest.current=props;
 useEffect(()=>{
  const canvas=canvasRef.current,labelCanvas=labelsRef.current;if(!props.active||!canvas||!labelCanvas)return;
  let renderer:THREE.WebGLRenderer;try{renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'low-power'});}catch{latest.current.onFallback();return;}
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.6));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;
  const ctx=labelCanvas.getContext('2d');const world=createSolarScene(()=>latest.current.onError('A planet texture could not load. Solid colors are shown; try reloading.'));
  const camera=new THREE.PerspectiveCamera(42,1,.000001,2000);camera.up.set(0,0,1);camera.position.set(0,-4.5,4.5);
  const orbit=new OrbitControls(camera,canvas);orbit.enableDamping=true;orbit.dampingFactor=.09;orbit.minDistance=1e-7;orbit.maxDistance=350;orbit.mouseButtons={LEFT:THREE.MOUSE.PAN,MIDDLE:THREE.MOUSE.DOLLY,RIGHT:THREE.MOUSE.ROTATE};orbit.touches={ONE:THREE.TOUCH.PAN,TWO:THREE.TOUCH.DOLLY_ROTATE};
  let w=1,h=1,raf=0,last=performance.now(),lastUI=last,frames=0,focusId:string|null=null,targetDistance:number|null=null,panGesture=false;
  const focus=(id:string)=>{const b=props.engine.bodies.find(b=>b.id===id);if(!b)return;focusId=id;targetDistance=Math.max(b.radius/AU_KM*9,.0000003);};
  props.controls.current={zoom:factor=>{targetDistance=Math.max(orbit.minDistance,Math.min(orbit.maxDistance,camera.position.distanceTo(orbit.target)/factor));},fit:(outer=false)=>{focusId=null;targetDistance=null;orbit.target.set(0,0,0);camera.position.set(0,outer?-75:-4.5,outer?75:4.5);orbit.update();latest.current.onPan();},focus};
  if(latest.current.display.follow)focus(latest.current.display.follow);else if(props.engine.mode==='experiment'&&latest.current.display.selected)focus(latest.current.display.selected);
  const resize=new ResizeObserver(()=>{const r=canvas.getBoundingClientRect();w=Math.max(1,r.width);h=Math.max(1,r.height);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();const dpr=Math.min(devicePixelRatio,2);labelCanvas.width=w*dpr;labelCanvas.height=h*dpr;ctx?.setTransform(dpr,0,0,dpr,0,0);});resize.observe(canvas);
  let hits:{id:string;x:number;y:number;r:number}[]=[];
  const frame=(now:number)=>{
   const dt=Math.min(.05,(now-last)/1000);last=now;
   if(!document.hidden){const {engine,display}=latest.current;engine.tick(dt*engine.speed);
    const followed=engine.bodies.find(b=>b.id===(display.follow??focusId));
    if(followed){const target=new THREE.Vector3(...followed.p),delta=target.sub(orbit.target).multiplyScalar(focusId?1-Math.exp(-dt*7):1);orbit.target.add(delta);camera.position.add(delta);}
    if(targetDistance!==null){const offset=camera.position.clone().sub(orbit.target),distance=offset.length(),next=THREE.MathUtils.lerp(distance,targetDistance,1-Math.exp(-dt*7));camera.position.copy(orbit.target).add(offset.setLength(next));if(Math.abs(next-targetDistance)<targetDistance*.001){targetDistance=null;focusId=null;}}
    orbit.update(dt);camera.setViewOffset(w,h,0,w<600&&display.selected?h*.15:0,w,h);camera.near=Math.max(1e-10,camera.position.distanceTo(orbit.target)/10000);camera.updateProjectionMatrix();camera.userData.target=orbit.target;
    const state=world.update(engine,display,camera,h);renderer.render(world.scene,camera);hits=[];ctx?.clearRect(0,0,w,h);
    const occupied:{x:number;y:number;width:number}[]=[];
    for(const b of engine.bodies){const visual=state.visuals.get(b.id);if(!visual?.root.visible)continue;const p=visual.root.position.clone().project(camera);if(p.z< -1||p.z>1||Math.abs(p.x)>1.2||Math.abs(p.y)>1.2)continue;const x=(p.x+1)*w/2,y=(1-p.y)*h/2,r=Math.max(2,visual.root.scale.x/camera.position.distanceTo(visual.root.position)*h/(2*Math.tan(camera.fov*Math.PI/360)));hits.push({id:b.id,x,y,r});
     if(ctx){if(b.id===display.selected){ctx.strokeStyle='#b5cceb';ctx.lineWidth=1;ctx.setLineDash([3,5]);ctx.beginPath();ctx.arc(x,y,r+6,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);}if(display.labels){ctx.font='12px system-ui';const label=translate(b.name,display.language??'en'),width=ctx.measureText(label).width;let lx=x+r+10,ly=y+4;if(lx+width>w-12)lx=x-r-width-10;for(let n=0;n<6&&occupied.some(p=>Math.abs(p.y-ly)<16&&lx<p.x+p.width+4&&lx+width>p.x-4);n++)ly+=17;occupied.push({x:lx,y:ly,width});ctx.fillStyle=b.id===display.selected?'#eef4ff':'#abbcd4';ctx.fillText(label,lx,ly);}}
    }
    if(ctx){ctx.fillStyle='#899ab4';ctx.font='11px system-ui';const range=state.range;ctx.fillText(translate('View width',display.language??'en')+': '+(range*2>=.01?`${(range*2).toPrecision(3)} AU`:`${Math.round(range*2*AU_KM).toLocaleString()} km`),24,h-17);}
    frames++;if(now-lastUI>180){latest.current.onChange(Math.round(frames*1000/(now-lastUI)));frames=0;lastUI=now;}
   }raf=requestAnimationFrame(frame);
  };raf=requestAnimationFrame(frame);
  let down:{x:number;y:number}|null=null;
  const pointerDown=(e:PointerEvent)=>{canvas.focus();down={x:e.clientX,y:e.clientY};panGesture=false;orbit.mouseButtons.LEFT=e.shiftKey?THREE.MOUSE.ROTATE:THREE.MOUSE.PAN;};
  const pointerMove=(e:PointerEvent)=>{if(down&&Math.hypot(e.clientX-down.x,e.clientY-down.y)>4){if(!panGesture){latest.current.onPan();focusId=null;targetDistance=null;}panGesture=true;}};
  const pointerUp=(e:PointerEvent)=>{if(down&&!panGesture){const rect=canvas.getBoundingClientRect(),x=e.clientX-rect.left,y=e.clientY-rect.top;const hit=hits.filter(p=>Math.hypot(p.x-x,p.y-y)<p.r+7).sort((a,b)=>Math.hypot(a.x-x,a.y-y)-Math.hypot(b.x-x,b.y-y))[0];if(hit)latest.current.onSelect(hit.id);}down=null;};
  const cancel=()=>{down=null;};const wheel=()=>{targetDistance=null;};
  const key=(e:KeyboardEvent)=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();latest.current.onPan();focusId=null;targetDistance=null;orbit.pan(e.key==='ArrowLeft'?40:e.key==='ArrowRight'?-40:0,e.key==='ArrowUp'?40:e.key==='ArrowDown'?-40:0);}if(e.key==='+'||e.key==='='){e.preventDefault();latest.current.controls.current?.zoom(1.5);}if(e.key==='-'){e.preventDefault();latest.current.controls.current?.zoom(1/1.5);}if(e.key==='Enter'){e.preventDefault();const b=latest.current.engine.bodies,i=b.findIndex(b=>b.id===latest.current.display.selected);if(b.length)latest.current.onSelect(b[(i+1)%b.length].id);}};
  const lost=(e:Event)=>{e.preventDefault();latest.current.onFallback();};
  canvas.addEventListener('pointerdown',pointerDown,true);canvas.addEventListener('pointermove',pointerMove,true);canvas.addEventListener('pointerup',pointerUp);canvas.addEventListener('pointercancel',cancel);canvas.addEventListener('wheel',wheel,{passive:true});canvas.addEventListener('keydown',key);canvas.addEventListener('webglcontextlost',lost);
  return()=>{cancelAnimationFrame(raf);resize.disconnect();orbit.dispose();world.dispose();renderer.dispose();canvas.removeEventListener('pointerdown',pointerDown,true);canvas.removeEventListener('pointermove',pointerMove,true);canvas.removeEventListener('pointerup',pointerUp);canvas.removeEventListener('pointercancel',cancel);canvas.removeEventListener('wheel',wheel);canvas.removeEventListener('keydown',key);canvas.removeEventListener('webglcontextlost',lost);};
 },[props.active,props.engine,props.controls]);
 return <div className="solar-renderer"><canvas ref={canvasRef} className="solar-canvas" tabIndex={0} aria-label={tr('Interactive textured 3D Solar System. Select planets, pan, rotate, and zoom.')} data-renderer="webgl"/><canvas ref={labelsRef} className="solar-label-canvas" aria-hidden="true"/></div>;
}
