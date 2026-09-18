import { translate, type Language } from '../i18n/translate';
import { AU_KM, Body, MOONS, PLANETS, SolarEngine, Vec, add, length, position, scale, sub } from './engine';
export interface Camera { center: Vec; range: number; yaw: number; tilt: number; }
export interface Display { language?: Language; orbits: boolean; labels: boolean; vectors: boolean; gravity: boolean; trueScale: boolean; moons: boolean; follow: string|null; selected: string|null; }
export interface Hit {id:string;x:number;y:number;r:number;}
export const project = (p:Vec,camera:Camera,w:number,h:number) => {const d=sub(p,camera.center),x=d[0]*Math.cos(camera.yaw)-d[1]*Math.sin(camera.yaw),y=d[0]*Math.sin(camera.yaw)+d[1]*Math.cos(camera.yaw),unit=Math.min(w,h)/(camera.range*2);return {x:w/2+x*unit,y:h/2-(y*Math.cos(camera.tilt)-d[2]*Math.sin(camera.tilt))*unit,depth:y*Math.sin(camera.tilt)+d[2]*Math.cos(camera.tilt),unit};};
export const unproject=(x:number,y:number,camera:Camera,w:number,h:number):Vec=>{const unit=Math.min(w,h)/(camera.range*2),rx=(x-w/2)/unit,ry=-(y-h/2)/unit/Math.max(.15,Math.cos(camera.tilt));return [camera.center[0]+rx*Math.cos(camera.yaw)+ry*Math.sin(camera.yaw),camera.center[1]-rx*Math.sin(camera.yaw)+ry*Math.cos(camera.yaw),0];};
const stars=Array.from({length:340},(_,i)=>{const n=(Math.sin(i*127.1+311.7)*43758.5453)%1;return {x:Math.abs(n),y:Math.abs((Math.sin(i*269.5)*23123.13)%1),r:i%11===0?1.2:.6,a:.12+(i%7)*.065};});
let orbitCache:{year:number;paths:Map<string,Vec[]>}|null=null;
function referenceOrbit(id:string,day:number){const year=Math.floor(day/365);if(!orbitCache||orbitCache.year!==year)orbitCache={year,paths:new Map()};if(!orbitCache.paths.has(id)){const p=PLANETS.find(p=>p.id===id);if(p)orbitCache.paths.set(id,Array.from({length:241},(_,i)=>position(p,day,i/240*Math.PI*2)));}return orbitCache.paths.get(id);}
function line(c:CanvasRenderingContext2D,points:Vec[],camera:Camera,w:number,h:number){c.beginPath();points.forEach((v,i)=>{const p=project(v,camera,w,h);if(i===0)c.moveTo(p.x,p.y);else c.lineTo(p.x,p.y);});c.stroke();}
function arrow(c:CanvasRenderingContext2D,x:number,y:number,dx:number,dy:number,color:string){c.strokeStyle=color;c.fillStyle=color;c.lineWidth=1.2;c.beginPath();c.moveTo(x,y);c.lineTo(x+dx,y+dy);c.stroke();const a=Math.atan2(dy,dx);c.beginPath();c.moveTo(x+dx,y+dy);c.lineTo(x+dx-6*Math.cos(a-.45),y+dy-6*Math.sin(a-.45));c.lineTo(x+dx-6*Math.cos(a+.45),y+dy-6*Math.sin(a+.45));c.fill();}
function sphere(c:CanvasRenderingContext2D,b:Body,x:number,y:number,r:number,sun:{x:number;y:number}|undefined,time:number){
 if(b.kind==='star'){const glow=c.createRadialGradient(x,y,r*.6,x,y,r*5);glow.addColorStop(0,b.color+'65');glow.addColorStop(.3,b.color+'16');glow.addColorStop(1,b.color+'00');c.fillStyle=glow;c.fillRect(x-r*5,y-r*5,r*10,r*10);}
 if(b.kind==='comet'&&sun){const a=Math.atan2(y-sun.y,x-sun.x);const tail=c.createLinearGradient(x,y,x+Math.cos(a)*65,y+Math.sin(a)*65);tail.addColorStop(0,b.color+'80');tail.addColorStop(1,b.color+'00');c.fillStyle=tail;c.beginPath();c.moveTo(x-Math.sin(a)*r,y+Math.cos(a)*r);c.lineTo(x+Math.cos(a)*85,y+Math.sin(a)*85);c.lineTo(x+Math.sin(a)*r,y-Math.cos(a)*r);c.fill();}
 if(b.id==='saturn'&&r>2){c.save();c.translate(x,y);c.rotate(-.4);c.strokeStyle='#cdb99175';c.lineWidth=r*.65;c.beginPath();c.ellipse(0,0,r*1.85,r*.68,0,0,Math.PI*2);c.stroke();c.restore();}
 c.save();c.beginPath();c.arc(x,y,Math.max(.12,r),0,Math.PI*2);c.clip();const light=sun?Math.atan2(sun.y-y,sun.x-x):-2;const g=c.createRadialGradient(x+Math.cos(light)*r*.4,y+Math.sin(light)*r*.4,r*.08,x-Math.cos(light)*r*.25,y-Math.sin(light)*r*.25,r*1.4);g.addColorStop(0,b.kind==='star'?'#fff3bd':b.color);g.addColorStop(.5,b.color);g.addColorStop(1,b.kind==='star'?'#f19737':'#0b1123');c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);
 if((b.id==='jupiter'||b.id==='saturn')&&r>5){for(let i=-5;i<6;i++){c.fillStyle=i%2?'#875f493b':'#f5e0bd3a';c.fillRect(x-r,y+i*r/5,r*2,r*.13);}if(b.id==='jupiter'){c.fillStyle='#af765b99';c.beginPath();c.ellipse(x+r*.25,y+r*.29,r*.27,r*.12,-.12,0,Math.PI*2);c.fill();}}
 if(b.id==='earth'&&r>4){c.fillStyle='#659f9180';for(let i=0;i<8;i++){const t=i*2.31+time*.04;c.beginPath();c.ellipse(x+Math.sin(t)*r*.68,y+Math.cos(i*1.7)*r*.6,r*(.15+(i%3)*.06),r*.15,t,0,Math.PI*2);c.fill();}c.fillStyle='#edf5f680';c.beginPath();c.ellipse(x,y-r*.89,r*.45,r*.15,0,0,Math.PI*2);c.fill();}
 if((b.kind==='moon'||b.id==='mercury')&&r>7){for(let i=0;i<7;i++){c.fillStyle='#1d203329';c.beginPath();c.arc(x+Math.sin(i*3.8)*r*.7,y+Math.cos(i*1.8)*r*.7,r*(.07+i%3*.035),0,Math.PI*2);c.fill();}}
 c.restore();
}
export function drawSolar(c:CanvasRenderingContext2D,w:number,h:number,engine:SolarEngine,camera:Camera,display:Display,launch?:{start:Vec;end:Vec;preview:Vec[]}) {
 c.fillStyle='#0b101a';c.fillRect(0,0,w,h);const haze=c.createRadialGradient(w*.6,h*.3,0,w*.6,h*.3,w*.65);haze.addColorStop(0,'#27335420');haze.addColorStop(1,'#0b101a00');c.fillStyle=haze;c.fillRect(0,0,w,h);
 for(const s of stars){c.fillStyle=`rgba(185,203,235,${s.a})`;c.beginPath();c.arc(s.x*w,s.y*h,s.r,0,Math.PI*2);c.fill();}
 const selected=engine.bodies.find(b=>b.id===display.selected);const followed=engine.bodies.find(b=>b.id===display.follow);if(followed)camera.center=[...followed.p];
 const sun=engine.bodies.find(b=>b.id==='sun'),sunScreen=sun?project(sun.p,camera,w,h):undefined;
 if(display.orbits){c.lineWidth=.8;for(const b of engine.bodies){c.strokeStyle=b.id===display.selected?b.color+'99':b.color+'2b';if(engine.mode==='explore'&&b.kind==='planet'){const path=referenceOrbit(b.id,engine.day);if(path)line(c,path,camera,w,h);}else if(engine.mode==='experiment'&&b.trail.length>1&&(b.kind!=='moon'||camera.range<.1))line(c,b.trail,camera,w,h);
 if(engine.mode==='explore'&&b.kind==='moon'&&display.moons&&camera.range<.15){const m=MOONS.find(m=>m.id===b.id),parent=engine.bodies.find(p=>p.id===b.parent);if(m&&parent){const r=m.distance/AU_KM,inc=m.inclination*Math.PI/180;line(c,Array.from({length:101},(_,i)=>{const a=i/100*Math.PI*2;return add(parent.p,[r*Math.cos(a),r*Math.sin(a)*Math.cos(inc),r*Math.sin(a)*Math.sin(inc)]);}),camera,w,h);}}}}
 const hits:Hit[]=[];const sorted=engine.bodies.filter(b=>b.kind!=='moon'||display.moons).map(b=>({b,p:project(b.p,camera,w,h)})).sort((a,b)=>a.p.depth-b.p.depth);
 const labels:{x:number;y:number;w:number}[]=[];
 for(const {b,p} of sorted){if(p.x<-150||p.x>w+150||p.y<-150||p.y>h+150)continue;const physical=b.radius/AU_KM*p.unit;const min=b.kind==='star'?17:b.kind==='planet'?Math.max(4.5,Math.min(12,3+Math.sqrt(b.radius/1000))):b.kind==='moon'?3:3.5;const r=display.trueScale?physical:Math.max(min,physical);if(r>Math.max(w,h)*4)continue;
 if(b.kind==='moon'&&camera.range>.15&&b.id!==display.selected)continue;
 sphere(c,b,p.x,p.y,r,sunScreen,engine.day);
 hits.push({id:b.id,x:p.x,y:p.y,r:Math.max(r,7)});
 if(b.id===display.selected){c.strokeStyle=b.color+'b0';c.lineWidth=1;c.setLineDash([3,4]);c.beginPath();c.arc(p.x,p.y,Math.max(r+6,10),0,Math.PI*2);c.stroke();c.setLineDash([]);}
 if(display.labels){c.font='12px Inter, system-ui, sans-serif';const width=c.measureText(translate(b.name, display.language ?? 'en')).width;let lx=p.x+Math.max(r+9,12),ly=p.y+4;for(let tries=0;tries<6&&labels.some(l=>Math.abs(ly-l.y)<16&&lx<l.x+l.w+5&&lx+width>l.x-5);tries++)ly+=17;if(lx+width>w-12)lx=p.x-r-width-9;labels.push({x:lx,y:ly,w:width});c.fillStyle=b.id===display.selected?'#ecf1fc':'#a7b3c9';c.fillText(translate(b.name, display.language ?? 'en'),lx,ly);}
 if(display.vectors&&(b.kind!=='moon'||camera.range<.1)){const v=project(add(b.p,scale(b.v,Math.min(15,camera.range*1.5))),camera,w,h);arrow(c,p.x,p.y,v.x-p.x,v.y-p.y,'#86c6e0aa');}
 if(display.gravity&&b.id===display.selected){const acceleration=engine.bodies.reduce((acc,other)=>{if(other===b)return acc;const d=sub(other.p,b.p);return add(acc,scale(d,other.mass/Math.max(1e-12,length(d)**3)));},[0,0,0] as Vec);const a=project(add(b.p,scale(acceleration,camera.range*.22/Math.max(1e-12,length(acceleration)))),camera,w,h);arrow(c,p.x,p.y,a.x-p.x,a.y-p.y,'#e8b779');}
 }
 if(launch){c.strokeStyle='#a5a1ffc0';c.lineWidth=1.3;c.setLineDash([4,5]);line(c,launch.preview,camera,w,h);c.setLineDash([]);const a=project(launch.start,camera,w,h),b=project(launch.end,camera,w,h);arrow(c,a.x,a.y,b.x-a.x,b.y-a.y,'#cdc1ff');c.fillStyle='#cdc1ff';c.beginPath();c.arc(a.x,a.y,4,0,Math.PI*2);c.fill();}
 // A physical scale bar remains meaningful at every zoom level.
 const raw=camera.range*.4,power=10**Math.floor(Math.log10(raw)),bar=Math.max(power,Math.floor(raw/power)*power),unit=Math.min(w,h)/(camera.range*2),pixels=bar*unit;
 c.strokeStyle='#62718c';c.lineWidth=1;c.beginPath();c.moveTo(24,h-38);c.lineTo(24,h-33);c.lineTo(24+pixels,h-33);c.lineTo(24+pixels,h-38);c.stroke();c.fillStyle='#8a9ab3';c.font='11px system-ui';c.fillText(bar>=.01?`${Number(bar.toPrecision(2))} AU`:`${Math.round(bar*AU_KM).toLocaleString()} km`,24,h-15);
 return {hits,selected};
}
