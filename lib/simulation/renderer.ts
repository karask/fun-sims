import {projectNest} from './nest-volume';
import { translate, type Language } from '../i18n/translate';
import { Ant, Enemy, ColonyState, View, WORLD, CELL, COLS, ROWS, FIELD_COLS, FIELD_ROWS, FIELD_CELL, TASK_COLORS } from './types';
import {LearnHighlight} from './learning';
export interface Camera { x:number; y:number; zoom:number }
export interface RenderOptions { language?: Language; alarm?:boolean; highlight?:LearnHighlight;learn?:boolean; view:View; camera:Camera; pheromones:boolean; activity:boolean; conditions:boolean; selected:number|null; time:number; previousAnts?:Map<number,Ant>; blend?:number }
let terrain:HTMLCanvasElement|null=null;
function background(){
 if(terrain)return terrain; terrain=document.createElement('canvas');terrain.width=1400;terrain.height=900;const c=terrain.getContext('2d')!;
 let seed=8735;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 c.fillStyle='#30352a';c.fillRect(0,0,1400,900);
 for(let i=0;i<650;i++){const x=rand()*1400,y=rand()*900,r=rand()*110+20;const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,['#6d694016','#98926b13','#171f151c','#77705619'][i%4]);g.addColorStop(1,'transparent');c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);}
 for(let i=0;i<42000;i++){const x=rand()*1400,y=rand()*900;c.fillStyle=rand()>.48?`rgba(192,184,139,${rand()*.12})`:`rgba(8,15,8,${rand()*.2})`;c.fillRect(x,y,rand()*2+.4,rand()*1.5+.4);}
 // Sparse grasses are functional terrain decoration, drawn in the simulation renderer.
 for(let i=0;i<165;i++){const x=rand()*1400,y=rand()*900;c.strokeStyle=['#5a69454a','#8d8a5350','#303f2870'][i%3];c.lineWidth=.7+rand();for(let j=0;j<4;j++){c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x-10+rand()*20,y-10-rand()*15,x-20+rand()*40,y-12-rand()*25);c.stroke();}}
 return terrain;
}
function drawAntDetail(c:CanvasRenderingContext2D,a:Ant,time:number,selected:boolean,activity:boolean,detail:boolean,position?:{x:number;y:number;angle:number}){
 c.save();c.translate(position?.x??a.x,position?.y??a.y);c.rotate(position?.angle??a.angle);const size=a.task==='queen'?2.1:1;c.scale(size,size);
 if(selected){c.strokeStyle='#f0d096';c.lineWidth=1.2;c.beginPath();c.arc(0,0,12,0,Math.PI*2);c.stroke();}
 const moving=!['resting','queen','grooming'].includes(a.task);const phase=moving?time*13+a.id:0;
 c.strokeStyle=activity?TASK_COLORS[a.task]:'#151711';c.lineWidth=.85;
 for(let side=-1;side<=1;side+=2)for(let leg=0;leg<3;leg++){const sw=Math.sin(phase+leg*2+side)*1.9;c.beginPath();c.moveTo(1-leg*1.5,side*1);c.lineTo(3-leg*3+sw,side*4);c.lineTo(5-leg*4+sw,side*7);c.stroke();}
 c.fillStyle=activity?TASK_COLORS[a.task]:'#20221b';c.strokeStyle='#92937875';c.lineWidth=.55;
 for(const [x,rx,ry] of [[-4,3.2,2.1],[0,2,1.4],[3.6,1.8,1.7]]){c.beginPath();c.ellipse(x,0,rx,ry,0,0,Math.PI*2);c.fill();c.stroke();}
 if(detail){c.strokeStyle=activity?TASK_COLORS[a.task]:'#aaa98890';for(const sign of [-1,1]){c.beginPath();c.moveTo(4.7,sign);c.lineTo(7,sign*2.8);c.lineTo(9,sign*2.1);c.stroke();}}
 if(a.cargo){c.fillStyle={carbohydrate:'#e6c078',protein:'#bc8e67',water:'#73b5ba',soil:'#b49b73',waste:'#87796a',brood:'#e0d9b2',corpse:'#181b15'}[a.cargo];c.beginPath();c.ellipse(8,0,2.6,1.8,.4,0,Math.PI*2);c.fill();}c.restore();
}
const antSprites=new Map<string,HTMLCanvasElement>();
export function drawAnt(c:CanvasRenderingContext2D,a:Ant,time:number,selected:boolean,activity:boolean,highDetail:boolean,position?:{x:number;y:number;angle:number}){
 if(highDetail||a.task==='queen'){drawAntDetail(c,a,time,selected,activity,true,position);return;}
 const moving=!['resting','grooming'].includes(a.task),phase=moving?Math.floor(((time*13+a.id)%(Math.PI*2))/(Math.PI*2)*8):0;
 const key=`${activity?a.task:'normal'}:${a.cargo??'none'}:${phase}`;let sprite=antSprites.get(key);
 if(!sprite){sprite=document.createElement('canvas');sprite.width=72;sprite.height=56;const sc=sprite.getContext('2d')!;sc.scale(2,2);drawAntDetail(sc,{...a,id:0,x:18,y:14,angle:0},phase/8*Math.PI*2/13,false,activity,true);antSprites.set(key,sprite);}
 c.save();c.translate(position?.x??a.x,position?.y??a.y);c.rotate(position?.angle??a.angle);c.drawImage(sprite,-18,-14,36,28);if(selected){c.strokeStyle='#f0d096';c.lineWidth=1.2;c.beginPath();c.arc(0,0,12,0,Math.PI*2);c.stroke();}c.restore();
}
// Cache the field raster per worker snapshot, not per animation frame. A fixed
// concentration scale makes reinforcement and evaporation visible over time.
const fieldLayers=new Map<'scent'|'traffic'|'alarm',{source:number[];canvas:HTMLCanvasElement}>();
function drawField(c:CanvasRenderingContext2D,values:number[],kind:'scent'|'traffic'|'alarm'){
 let layer=fieldLayers.get(kind);
 if(layer?.source!==values){
  const canvas=layer?.canvas??document.createElement('canvas');canvas.width=FIELD_COLS;canvas.height=FIELD_ROWS;
  const context=canvas.getContext('2d')!,pixels=context.createImageData(FIELD_COLS,FIELD_ROWS);
  for(let i=0;i<values.length;i++){
   const p=values[i],strength=kind==='alarm'?p:kind==='scent'?Math.sqrt(p/(p+3)):Math.min(1,p/200);
   const offset=i*4;
   pixels.data[offset]=kind==='alarm'?248:kind==='scent'?Math.round(75+150*strength):231;
   pixels.data[offset+1]=kind==='alarm'?153:kind==='scent'?Math.round(170+80*strength):167;
   pixels.data[offset+2]=kind==='alarm'?66:kind==='scent'?Math.round(151+75*strength):83;
   pixels.data[offset+3]=p<.0001?0:Math.round(strength*(kind==='traffic'?95:215));
  }
  context.putImageData(pixels,0,0);layer={source:values,canvas};fieldLayers.set(kind,layer);
 }
 c.save();c.imageSmoothingEnabled=true;c.drawImage(layer.canvas,0,0,FIELD_COLS*FIELD_CELL,FIELD_ROWS*FIELD_CELL);c.restore();
}
let projectedSource:number[]|null=null,projectedGrid:number[]=[];
export function renderWorld(c:CanvasRenderingContext2D,w:number,h:number,s:ColonyState,o:RenderOptions){
 if(o.view==='nest'){if(projectedSource!==s.nest){projectedSource=s.nest;projectedGrid=projectNest(s.nest);}s={...s,nest:projectedGrid};}
 const {camera,view}=o; const fit=Math.min(w/1150,h/740);const z=fit*camera.zoom;
 c.fillStyle='#232920';c.fillRect(0,0,w,h);c.save();c.translate(w/2,h/2);c.scale(z,z);c.translate(-camera.x,-camera.y);
 if(view==='surface'){
 c.drawImage(background(),0,0);const e=WORLD.entrance;
 const halo=c.createRadialGradient(e.x,e.y,5,e.x,e.y,74);halo.addColorStop(0,'#0f130f');halo.addColorStop(.24,'#1b2117');halo.addColorStop(.4,'#797455');halo.addColorStop(.65,'#544f38');halo.addColorStop(1,'#544f3800');c.fillStyle=halo;c.fillRect(e.x-74,e.y-74,148,148);
 for(const rock of s.obstacles){c.save();c.translate(rock.x,rock.y);c.shadowColor='#070b0a65';c.shadowBlur=6;c.shadowOffsetY=5;const g=c.createLinearGradient(-rock.radius,-rock.radius,rock.radius,rock.radius);g.addColorStop(0,'#797869');g.addColorStop(1,'#474b40');c.fillStyle=g;c.beginPath();for(let j=0;j<8;j++){const a=j/8*Math.PI*2,r=rock.radius*(.85+.12*Math.sin(j*13+rock.id));const x=Math.cos(a)*r,y=Math.sin(a)*r;if(j===0)c.moveTo(x,y);else c.lineTo(x,y);}c.closePath();c.fill();c.shadowBlur=0;c.shadowOffsetY=0;c.strokeStyle='#a4a18c33';c.lineWidth=1;c.stroke();c.restore();}
 for(const r of s.resources){if(r.amount<=0)continue;const scale=Math.max(.25,Math.sqrt(r.amount/r.initial));c.save();c.translate(r.x,r.y);c.scale(scale,scale);const g=c.createRadialGradient(-5,-5,2,0,0,r.radius);g.addColorStop(0,r.kind==='water'?'#6b929294':r.kind==='protein'?'#a08663':'#beb280');g.addColorStop(1,r.kind==='water'?'#537a7630':r.kind==='protein'?'#655139':'#888452');c.fillStyle=g;c.beginPath();c.ellipse(0,0,r.radius,r.radius*.72,-.4,0,Math.PI*2);c.fill();if(r.kind!=='water'){c.fillStyle='#d2c69870';for(let i=0;i<16;i++){const a=i*2.39,rr=r.radius*Math.sqrt(i/18);c.beginPath();c.ellipse(Math.cos(a)*rr,Math.sin(a)*rr*.6,2.4,1.5,a,0,Math.PI*2);c.fill();}}c.restore();}
 if(o.activity)drawField(c,s.traffic,'traffic');
 if(o.pheromones)drawField(c,s.pheromones,'scent');
 if(o.alarm)drawField(c,s.alarm,'alarm');
 }else{
 c.fillStyle='#302a24';c.fillRect(0,0,1400,900);c.globalAlpha=.18;c.drawImage(background(),0,0);c.globalAlpha=1;
 const outline=nestOutline(s);c.save();c.shadowColor='#110e0b90';c.shadowBlur=10;c.fillStyle='#191d18';c.fill(outline);c.shadowBlur=0;c.strokeStyle='#9f8a5b55';c.lineWidth=2;c.stroke(outline);c.restore();
 if(o.conditions){c.save();c.clip(outline);for(let r=0;r<ROWS;r++){const moisture=Math.max(0,Math.min(1,s.settings.moisture/100+(r*CELL-390)/1000));c.fillStyle=`rgba(97,164,184,${moisture*.4})`;c.fillRect(0,r*CELL,1400,CELL);}c.restore();}

 for(const b of s.brood){if(b.carriedBy!==null)continue;c.save();c.translate(b.x,b.y);c.rotate(b.id*1.4);c.fillStyle=b.stage==='egg'?'#dad5b4':b.stage==='larva'?'#c9c092':'#9e9a76';c.beginPath();c.ellipse(0,0,b.stage==='egg'?2:4,b.stage==='egg'?1.4:2.4,0,0,Math.PI*2);c.fill();c.restore();}
 }
 if(o.learn&&view==='surface'){
  const m=WORLD.midden;c.save();c.strokeStyle='#ceb993';c.lineWidth=1.5/z;c.setLineDash([4/z,4/z]);c.beginPath();c.ellipse(m.x,m.y,25,17,0,0,Math.PI*2);c.stroke();c.setLineDash([]);c.font=`500 ${11/z}px system-ui`;label(c,o.language,'Outside midden',m.x,m.y+35/z);c.restore();
 }
 if(o.highlight?.view===view){const mark=o.highlight;c.save();c.strokeStyle='#f4d798';c.lineWidth=2/z;c.setLineDash([6/z,4/z]);if(mark.route.length){c.beginPath();mark.route.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.stroke();}c.setLineDash([]);c.beginPath();c.arc(mark.point.x,mark.point.y,Math.max(12/z,mark.radius),0,Math.PI*2);c.stroke();c.restore();}
 for(const d of s.debris){if(d.view!==view||d.carriedBy!==null)continue;c.fillStyle=d.kind==='corpse'?'#121711':'#9a84615a';c.fillRect(d.x-2,d.y-1,5,2);}
 for(const a of s.ants){if(a.view!==view||!a.alive)continue;if(Math.abs(a.x-camera.x)>w/2/z+20||Math.abs(a.y-camera.y)>h/2/z+20)continue;const previous=o.previousAnts?.get(a.id),blend=o.blend??1;let position;if(previous&&previous.view===a.view&&Math.hypot(a.x-previous.x,a.y-previous.y)<80){const da=Math.atan2(Math.sin(a.angle-previous.angle),Math.cos(a.angle-previous.angle));position={x:previous.x+(a.x-previous.x)*blend,y:previous.y+(a.y-previous.y)*blend,angle:previous.angle+da*blend};}drawAnt(c,a,o.time,a.id===o.selected,o.activity,z>2.2,position);if(a.task==='defending'||a.task==='retreating'){c.strokeStyle=TASK_COLORS[a.task];c.lineWidth=1/z;c.beginPath();c.arc(position?.x??a.x,position?.y??a.y,8,0,Math.PI*2);c.stroke();}}
 if(view==='surface')for(const enemy of s.enemies)drawEnemy(c,enemy,o.time,enemy.id===o.selected,z,o.language);
 c.font='500 11px system-ui';c.textAlign='center';c.fillStyle='#d5d6bd';
 if(view==='surface'){label(c,o.language,'NEST ENTRANCE',680,488);for(const r of s.resources){
  const remaining=Math.max(0,Math.min(1,r.amount/r.initial)),fontSize=Math.max(11,11/z),barWidth=52/z;
  const y=r.y>camera.y?r.y-r.radius-fontSize*2.4:r.y+r.radius+fontSize*1.6;
  c.save();c.font=`500 ${fontSize}px system-ui`;
  label(c,o.language,r.kind==='carbohydrate'?'NECTAR':r.kind==='protein'?'PROTEIN':'WATER',r.x,y);
  c.fillStyle=remaining>0?'#dbe7cc':'#b6b8a9';
  c.fillText(remaining>0?`${Math.ceil(remaining*100)}% ${translate('remaining',o.language??'en')}`:translate('Depleted',o.language??'en'),r.x,y+fontSize*1.5);
  c.fillStyle='#121c16b0';c.fillRect(r.x-barWidth/2,y+fontSize*2,barWidth,3/z);
  c.fillStyle=r.kind==='water'?'#87b9c5':'#cdbb87';c.fillRect(r.x-barWidth/2,y+fontSize*2,barWidth*remaining,3/z);
  if(remaining===0){c.strokeStyle='#b6b8a94d';c.lineWidth=1/z;c.setLineDash([3/z,4/z]);c.beginPath();c.ellipse(r.x,r.y,r.radius,r.radius*.72,-.4,0,Math.PI*2);c.stroke();}
  c.restore();
 }}
 else{label(c,o.language,'QUEEN’S CHAMBER',680,323);label(c,o.language,'BROOD CHAMBER',490,629);label(c,o.language,'NEST ENTRANCE',680,73);label(c,o.language,'Lower chamber',837,655);label(c,o.language,'Food stores',970,335);}
 c.restore();const shade=c.createRadialGradient(w/2,h/2,h*.25,w/2,h/2,Math.max(w,h)*.72);shade.addColorStop(0,'transparent');shade.addColorStop(1,'#0d160d70');c.fillStyle=shade;c.fillRect(0,0,w,h);return z;
}
function label(c:CanvasRenderingContext2D,language:Language | undefined,text:string,x:number,y:number){c.save();c.letterSpacing='1.6px';c.fillStyle='#d3d4bd9c';c.fillText(translate(text, language ?? 'en'),x,y);c.restore();}

let nestCache:{key:string;path:Path2D}|null=null;
function nestOutline(s:ColonyState){
 const key=`${s.seed}:${s.excavated}:${s.nest.reduce((sum,v,i)=>sum+v*(i+1),0)}`;
 if(nestCache?.key===key)return nestCache.path;
 const edges=new Map<string,number[][]>();const add=(x:number,y:number,tx:number,ty:number)=>{const k=`${x},${y}`;const es=edges.get(k)??[];es.push([tx,ty]);edges.set(k,es);};
 for(let r=0;r<ROWS;r++)for(let col=0;col<COLS;col++){const i=r*COLS+col;if(!s.nest[i])continue;const x=col*CELL,y=r*CELL;if(!s.nest[i-COLS])add(x,y,x+CELL,y);if(col===COLS-1||!s.nest[i+1])add(x+CELL,y,x+CELL,y+CELL);if(!s.nest[i+COLS])add(x+CELL,y+CELL,x,y+CELL);if(col===0||!s.nest[i-1])add(x,y+CELL,x,y);}
 const path=new Path2D();while(edges.size){const first=edges.keys().next().value!;let cur=first;const vertices:number[][]=[];let limit=0;do{const p=cur.split(',').map(Number);vertices.push(p);const out=edges.get(cur);if(!out?.length)break;const next=out.pop()!;if(!out.length)edges.delete(cur);cur=next.join(',');}while(cur!==first&&limit++<20000);
 if(vertices.length<3)continue;const last=vertices[vertices.length-1],v0=vertices[0];path.moveTo((last[0]+v0[0])/2,(last[1]+v0[1])/2);for(let i=0;i<vertices.length;i++){const v=vertices[i],n=vertices[(i+1)%vertices.length];path.quadraticCurveTo(v[0],v[1],(v[0]+n[0])/2,(v[1]+n[1])/2);}path.closePath();}
 nestCache={key,path};return path;
}

function drawEnemy(c:CanvasRenderingContext2D,e:Enemy,time:number,selected:boolean,zoom:number,language?:Language){
 c.save();c.translate(e.x,e.y);c.rotate(e.angle);
 const spider=e.kind==='spider',size=spider?2.15:1.1,legs=spider?4:3;
 c.scale(size,size);c.lineWidth=.9;c.strokeStyle=spider?'#bf9c77':'#cca589';
 const phase=e.mode==='feeding'?0:time*11+e.id;
 for(const side of [-1,1])for(let leg=0;leg<legs;leg++){
  const sway=Math.sin(phase+leg*2+side)*1.3;
  c.beginPath();c.moveTo(2-leg,side);c.lineTo(5-leg*3+sway,side*4);c.lineTo(7-leg*4+sway,side*(spider?8:7));c.stroke();
 }
 c.fillStyle=spider?'#40302a':'#7b4f37';c.lineWidth=.6;c.strokeStyle='#d7b895';
 for(const [x,rx,ry] of (spider?[[-3,4,3],[3,2.5,2]]:[[-4,3.2,2.1],[0,2,1.4],[3.6,1.8,1.7]])){
  c.beginPath();c.ellipse(x,0,rx,ry,0,0,Math.PI*2);c.fill();c.stroke();
 }
 if(!spider){for(const side of [-1,1]){c.beginPath();c.moveTo(5,side);c.lineTo(8,side*3);c.lineTo(10,side*2);c.stroke();}}
 if(e.cargo||e.prey){c.fillStyle=e.prey?'#171b15':e.cargo==='protein'?'#c49973':'#edc67c';c.beginPath();c.ellipse(9,0,e.prey?3.2:2.6,1.8,.5,0,Math.PI*2);c.fill();}
 c.restore();c.save();c.translate(e.x,e.y);
 if(selected){c.strokeStyle='#ffd3a4';c.lineWidth=1.5/zoom;c.beginPath();c.arc(0,0,spider?23:15,0,Math.PI*2);c.stroke();}
 c.font=`500 ${11/zoom}px system-ui`;c.textAlign='center';
 const text=translate(spider?'SPIDER':'RIVAL',language??'en'),width=c.measureText(text).width;
 const y=(spider?26:17)+10/zoom;c.fillStyle='#172019dd';c.fillRect(-width/2-4/zoom,y-10/zoom,width+8/zoom,14/zoom);c.fillStyle='#e7c4a2';c.fillText(text,0,y);
 c.restore();
}
