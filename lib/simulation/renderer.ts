import { translate, type Language } from '../i18n/translate';
import { Ant, ColonyState, View, WORLD, CELL, COLS, ROWS, FIELD_COLS, FIELD_CELL, TASK_COLORS } from './types';
export interface Camera { x:number; y:number; zoom:number }
export interface RenderOptions { language?: Language; view:View; camera:Camera; pheromones:boolean; activity:boolean; conditions:boolean; selected:number|null; time:number; previousAnts?:Map<number,Ant>; blend?:number }
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
export function renderWorld(c:CanvasRenderingContext2D,w:number,h:number,s:ColonyState,o:RenderOptions){
 const {camera,view}=o; const fit=Math.min(w/1150,h/740);const z=fit*camera.zoom;
 c.fillStyle='#232920';c.fillRect(0,0,w,h);c.save();c.translate(w/2,h/2);c.scale(z,z);c.translate(-camera.x,-camera.y);
 if(view==='surface'){
 c.drawImage(background(),0,0);const e=WORLD.entrance;
 const halo=c.createRadialGradient(e.x,e.y,5,e.x,e.y,74);halo.addColorStop(0,'#0f130f');halo.addColorStop(.24,'#1b2117');halo.addColorStop(.4,'#797455');halo.addColorStop(.65,'#544f38');halo.addColorStop(1,'#544f3800');c.fillStyle=halo;c.fillRect(e.x-74,e.y-74,148,148);
 for(const rock of s.obstacles){c.save();c.translate(rock.x,rock.y);c.shadowColor='#070b0a65';c.shadowBlur=6;c.shadowOffsetY=5;const g=c.createLinearGradient(-rock.radius,-rock.radius,rock.radius,rock.radius);g.addColorStop(0,'#797869');g.addColorStop(1,'#474b40');c.fillStyle=g;c.beginPath();for(let j=0;j<8;j++){const a=j/8*Math.PI*2,r=rock.radius*(.85+.12*Math.sin(j*13+rock.id));const x=Math.cos(a)*r,y=Math.sin(a)*r;if(j===0)c.moveTo(x,y);else c.lineTo(x,y);}c.closePath();c.fill();c.shadowBlur=0;c.shadowOffsetY=0;c.strokeStyle='#a4a18c33';c.lineWidth=1;c.stroke();c.restore();}
 for(const r of s.resources){if(r.amount<=0)continue;const scale=Math.max(.25,Math.sqrt(r.amount/r.initial));c.save();c.translate(r.x,r.y);c.scale(scale,scale);const g=c.createRadialGradient(-5,-5,2,0,0,r.radius);g.addColorStop(0,r.kind==='water'?'#6b929294':r.kind==='protein'?'#a08663':'#beb280');g.addColorStop(1,r.kind==='water'?'#537a7630':r.kind==='protein'?'#655139':'#888452');c.fillStyle=g;c.beginPath();c.ellipse(0,0,r.radius,r.radius*.72,-.4,0,Math.PI*2);c.fill();if(r.kind!=='water'){c.fillStyle='#d2c69870';for(let i=0;i<16;i++){const a=i*2.39,rr=r.radius*Math.sqrt(i/18);c.beginPath();c.ellipse(Math.cos(a)*rr,Math.sin(a)*rr*.6,2.4,1.5,a,0,Math.PI*2);c.fill();}}c.restore();}
 if(o.pheromones||o.activity){for(let i=0;i<s.pheromones.length;i++){const p=o.activity?s.traffic[i]*.04:s.pheromones[i];if(p<.08)continue;c.fillStyle=o.activity?`rgba(231,167,83,${Math.min(.42,p*.04)})`:`rgba(108,207,180,${Math.min(.38,p*.05)})`;c.fillRect((i%FIELD_COLS)*FIELD_CELL,Math.floor(i/FIELD_COLS)*FIELD_CELL,FIELD_CELL+1,FIELD_CELL+1);}}
 }else{
 c.fillStyle='#302a24';c.fillRect(0,0,1400,900);c.globalAlpha=.18;c.drawImage(background(),0,0);c.globalAlpha=1;
 const outline=nestOutline(s);c.save();c.shadowColor='#110e0b90';c.shadowBlur=10;c.fillStyle='#191d18';c.fill(outline);c.shadowBlur=0;c.strokeStyle='#9f8a5b55';c.lineWidth=2;c.stroke(outline);c.restore();
 if(o.conditions){c.save();c.clip(outline);for(let r=0;r<ROWS;r++){const moisture=Math.max(0,Math.min(1,s.settings.moisture/100+(r*CELL-390)/1000));c.fillStyle=`rgba(97,164,184,${moisture*.4})`;c.fillRect(0,r*CELL,1400,CELL);}c.restore();}

 for(const b of s.brood){if(b.carriedBy!==null)continue;c.save();c.translate(b.x,b.y);c.rotate(b.id*1.4);c.fillStyle=b.stage==='egg'?'#dad5b4':b.stage==='larva'?'#c9c092':'#9e9a76';c.beginPath();c.ellipse(0,0,b.stage==='egg'?2:4,b.stage==='egg'?1.4:2.4,0,0,Math.PI*2);c.fill();c.restore();}
 }
 for(const d of s.debris){if(d.view!==view||d.carriedBy!==null)continue;c.fillStyle=d.kind==='corpse'?'#121711':'#9a84615a';c.fillRect(d.x-2,d.y-1,5,2);}
 for(const a of s.ants){if(a.view!==view||!a.alive)continue;if(Math.abs(a.x-camera.x)>w/2/z+20||Math.abs(a.y-camera.y)>h/2/z+20)continue;const previous=o.previousAnts?.get(a.id),blend=o.blend??1;let position;if(previous&&previous.view===a.view&&Math.hypot(a.x-previous.x,a.y-previous.y)<80){const da=Math.atan2(Math.sin(a.angle-previous.angle),Math.cos(a.angle-previous.angle));position={x:previous.x+(a.x-previous.x)*blend,y:previous.y+(a.y-previous.y)*blend,angle:previous.angle+da*blend};}drawAnt(c,a,o.time,a.id===o.selected,o.activity,z>2.2,position);}
 c.font='500 11px system-ui';c.textAlign='center';c.fillStyle='#d5d6bd';
 if(view==='surface'){label(c,o.language,'NEST ENTRANCE',680,488);for(const r of s.resources)if(r.amount>0)label(c,o.language,r.kind==='carbohydrate'?'NECTAR':r.kind==='protein'?'PROTEIN':'WATER',r.x,r.y+r.radius+24);}
 else{label(c,o.language,'QUEEN’S CHAMBER',680,323);label(c,o.language,'BROOD CHAMBER',490,629);label(c,o.language,'NEST ENTRANCE',680,73);}
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
