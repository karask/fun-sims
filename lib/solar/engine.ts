/** Distances: AU; time: days; mass: solar masses; coordinates: J2000 ecliptic.
 * JPL approximate positions, Table 1 (1800–2050): https://ssd.jpl.nasa.gov/planets/approx_pos.html
 * GM and units: https://ssd.jpl.nasa.gov/astro_par.html
 * Moon orbits are illustrative circular models, not ephemerides. */
export type Vec = [number, number, number];
export type Mode = 'explore' | 'experiment';
export type BodyKind = 'star' | 'planet' | 'moon' | 'comet' | 'probe';
export interface Body { id: string; name: string; kind: BodyKind; color: string; mass: number; radius: number; p: Vec; v: Vec; parent?: string; trail: Vec[]; }
export interface Elements { id: string; name: string; color: string; mass: number; radius: number; elements: number[]; rates: number[]; description: string; }
export const AU_KM = 149597870.7;
export const G = 0.0002959122082855911;
export const KM_S = AU_KM / 86400;
export const EPOCH = Date.UTC(2000, 0, 1, 12);
export const MIN_DAY = (Date.UTC(1800,0,1)-EPOCH)/86400000;
export const MAX_DAY = (Date.UTC(2050,0,1)-EPOCH)/86400000;
const rad = Math.PI / 180;
export const PLANETS: Elements[] = [
 {id:'mercury',name:'Mercury',color:'#b8aca0',mass:1.6601e-7,radius:2439.7,elements:[.38709927,.20563593,7.00497902,252.25032350,77.45779628,48.33076593],rates:[.00000037,.00001906,-.00594749,149472.67411175,.16047689,-.12534081],description:'A small, cratered world on the fastest planetary orbit.'},
 {id:'venus',name:'Venus',color:'#e3be83',mass:2.4478e-6,radius:6051.8,elements:[.72333566,.00677672,3.39467605,181.97909950,131.60246718,76.67984255],rates:[.0000039,-.00004107,-.0007889,58517.81538729,.00268329,-.27769418],description:'A rocky planet wrapped in a thick, reflective atmosphere.'},
 {id:'earth',name:'Earth',color:'#6ca9ec',mass:3.0035e-6,radius:6371,elements:[1.00000261,.01671123,-.00001531,100.46457166,102.93768193,0],rates:[.00000562,-.00004392,-.01294668,35999.37244981,.32327364,0],description:'Our home world. Its plotted center approximates the Earth–Moon barycenter.'},
 {id:'mars',name:'Mars',color:'#dd8667',mass:3.2272e-7,radius:3389.5,elements:[1.52371034,.09339410,1.84969142,-4.55343205,-23.94362959,49.55953891],rates:[.00001847,.00007882,-.00813131,19140.30268499,.44441088,-.29257343],description:'A rocky world whose elliptical orbit carries it beyond Earth.'},
 {id:'jupiter',name:'Jupiter',color:'#d9b89a',mass:9.543e-4,radius:69911,elements:[5.202887,.04838624,1.30439695,34.39644051,14.72847983,100.47390909],rates:[-.00011607,-.00013253,-.00183714,3034.74612775,.21252668,.20469106],description:'The most massive planet; close encounters can dramatically alter a comet’s path.'},
 {id:'saturn',name:'Saturn',color:'#e5ce96',mass:2.857e-4,radius:58232,elements:[9.53667594,.05386179,2.48599187,49.95424423,92.59887831,113.66242448],rates:[-.00125060,-.00050991,.00193609,1222.49362201,-.41897216,-.28867794],description:'A gas giant surrounded by an extensive system of icy rings.'},
 {id:'uranus',name:'Uranus',color:'#98d9de',mass:4.365e-5,radius:25362,elements:[19.18916464,.04725744,.77263783,313.23810451,170.95427630,74.01692503],rates:[-.00196176,-.00004397,-.00242939,428.48202785,.40805281,.04240589],description:'A pale blue ice giant in the outer Solar System.'},
 {id:'neptune',name:'Neptune',color:'#658de4',mass:5.149e-5,radius:24622,elements:[30.06992276,.00859048,1.77004347,-55.12002969,44.96476227,131.78422574],rates:[.00026291,.00005105,.00035372,218.45945325,-.32241464,-.00508664],description:'The outermost major planet, with a long and nearly circular orbit.'},
];
export const MOONS = [
 {id:'moon',name:'Moon',parent:'earth',color:'#c7ccda',mass:3.694e-8,radius:1737.4,distance:384400,period:27.3217,inclination:5.145,phase:.6},
 {id:'io',name:'Io',parent:'jupiter',color:'#e1cd83',mass:4.49e-8,radius:1821.6,distance:421700,period:1.7691,inclination:2,phase:1.5},
 {id:'europa',name:'Europa',parent:'jupiter',color:'#d4c0a3',mass:2.413e-8,radius:1560.8,distance:671100,period:3.5512,inclination:2,phase:3.1},
 {id:'ganymede',name:'Ganymede',parent:'jupiter',color:'#a9a295',mass:7.45e-8,radius:2634.1,distance:1070400,period:7.1546,inclination:2,phase:4.2},
 {id:'titan',name:'Titan',parent:'saturn',color:'#d3ab6a',mass:6.764e-8,radius:2574.7,distance:1221870,period:15.9454,inclination:27,phase:2.1},
];
export const length = (v: Vec) => Math.hypot(...v);
export const sub = (a: Vec,b: Vec): Vec => [a[0]-b[0],a[1]-b[1],a[2]-b[2]];
export const add = (a: Vec,b: Vec): Vec => [a[0]+b[0],a[1]+b[1],a[2]+b[2]];
export const scale = (a: Vec,n: number): Vec => [a[0]*n,a[1]*n,a[2]*n];
export const dateDay = (date: string) => (Date.parse(date+'T12:00:00Z')-EPOCH)/86400000;
export const dayDate = (day: number) => new Date(EPOCH+day*86400000).toISOString().slice(0,10);
export function position(planet: Elements, day: number, anomaly?: number): Vec {
 const [a,e,inc,L,peri,node] = planet.elements.map((v,i)=>v+planet.rates[i]*day/36525);
 const M = anomaly ?? ((L-peri)%360)*rad;
 let E=M; for(let i=0;i<12;i++) E-=(E-e*Math.sin(E)-M)/(1-e*Math.cos(E));
 const x=a*(Math.cos(E)-e),y=a*Math.sqrt(1-e*e)*Math.sin(E),w=(peri-node)*rad,O=node*rad,I=inc*rad;
 return [(Math.cos(w)*Math.cos(O)-Math.sin(w)*Math.sin(O)*Math.cos(I))*x+(-Math.sin(w)*Math.cos(O)-Math.cos(w)*Math.sin(O)*Math.cos(I))*y,(Math.cos(w)*Math.sin(O)+Math.sin(w)*Math.cos(O)*Math.cos(I))*x+(-Math.sin(w)*Math.sin(O)+Math.cos(w)*Math.cos(O)*Math.cos(I))*y,Math.sin(w)*Math.sin(I)*x+Math.cos(w)*Math.sin(I)*y];
}
export function referenceBodies(day: number): Body[] {
 const bodies: Body[] = [{id:'sun',name:'Sun',kind:'star',color:'#ffcb76',mass:1,radius:695700,p:[0,0,0],v:[0,0,0],trail:[]}];
 for(const d of PLANETS) bodies.push({id:d.id,name:d.name,kind:'planet',color:d.color,mass:d.mass,radius:d.radius,p:position(d,day),v:scale(sub(position(d,day+.001),position(d,day-.001)),500),trail:[]});
 for(const d of MOONS){const parent=bodies.find(b=>b.id===d.parent)!;const angle=day*2*Math.PI/d.period+d.phase,r=d.distance/AU_KM,inc=d.inclination*rad,w=2*Math.PI/d.period;
 bodies.push({id:d.id,name:d.name,kind:'moon',color:d.color,mass:d.mass,radius:d.radius,parent:d.parent,p:add(parent.p,[r*Math.cos(angle),r*Math.sin(angle)*Math.cos(inc),r*Math.sin(angle)*Math.sin(inc)]),v:add(parent.v,[-r*w*Math.sin(angle),r*w*Math.cos(angle)*Math.cos(inc),r*w*Math.cos(angle)*Math.sin(inc)]),trail:[]});}
 return bodies;
}
export function accelerations(bodies: Body[]): Vec[] {
 const result = bodies.map(()=>[0,0,0] as Vec);
 for(let i=0;i<bodies.length;i++)for(let j=i+1;j<bodies.length;j++){
  const d=sub(bodies[j].p,bodies[i].p),r2=d[0]**2+d[1]**2+d[2]**2;const inv=G/Math.pow(Math.max(r2,1e-16),1.5);
  for(let k=0;k<3;k++){result[i][k]+=d[k]*inv*bodies[j].mass;result[j][k]-=d[k]*inv*bodies[i].mass;}
 }return result;
}
/** Velocity Verlet; physical-radius collision handling is independent of display sizes. */
export function integrate(bodies: Body[], dt: number) {
 const before=accelerations(bodies);
 for(let i=0;i<bodies.length;i++)for(let k=0;k<3;k++){bodies[i].p[k]+=bodies[i].v[k]*dt+before[i][k]*dt*dt/2;bodies[i].v[k]+=before[i][k]*dt/2;}
 const after=accelerations(bodies);
 for(let i=0;i<bodies.length;i++)for(let k=0;k<3;k++)bodies[i].v[k]+=after[i][k]*dt/2;
}
export function energy(bodies: Body[]) {
 let total=0;for(let i=0;i<bodies.length;i++){total+=.5*bodies[i].mass*length(bodies[i].v)**2;for(let j=i+1;j<bodies.length;j++)total-=G*bodies[i].mass*bodies[j].mass/Math.max(1e-10,length(sub(bodies[i].p,bodies[j].p)));}return total;
}
export type Scenario = 'earth-speed'|'jupiter-comet'|'binary'|'mars-launch';
export const TIMELINE_LIMIT = 240;
export interface SolarFrame {
 day:number; mode:Mode; bodies:Body[]; baseline:Body[]|null; baselineDay:number;
 speed:number; nextId:number; selected:string; referenceEnergy:number; events:string[];
 kind:'sample'|'before-edit'|'edit'|'start';
}
export interface SolarSave {
 format:'solar-lab'; version:1; state:SolarFrame;
 timeline:SolarFrame[]; cursor:number; lastSample:number|null; history:{day:number;speed:number;energy:number}[];
}
const cloneBodies=(bodies:Body[],trails=false):Body[]=>bodies.map(b=>({...b,p:[...b.p],v:[...b.v],trail:trails?b.trail.map(p=>[...p] as Vec):[]}));
export class SolarEngine {
 mode: Mode='explore'; day: number; bodies: Body[]; paused=false; speed=10; nextId=1; events: string[]=[]; history:{day:number;speed:number;energy:number}[]=[]; selected='earth'; referenceEnergy=0; private lastSample=-Infinity;
 baseline:Body[]|null=null; baselineDay=0; timeline:SolarFrame[]=[]; cursor=-1;
 constructor(day=Math.min(MAX_DAY-1,Math.max(MIN_DAY,dateDay(new Date().toISOString().slice(0,10)))) ){this.day=day;this.bodies=referenceBodies(day);}
 reset(day=this.day){if(!Number.isFinite(day)||day<MIN_DAY||day>MAX_DAY)throw new Error('Choose a date from 1800 through 2049.');this.baseline=null;this.timeline=[];this.cursor=-1;this.mode='explore';this.day=day;this.bodies=referenceBodies(day);this.events=[];this.history=[];this.lastSample=-Infinity;this.paused=false;this.selected='earth';this.nextId=1;this.referenceEnergy=0;this.baselineDay=0;}
 experiment(){if(this.mode==='experiment')return;this.mode='experiment';const m=this.bodies.reduce((s,b)=>s+b.mass,0);const center=this.bodies.reduce((s,b)=>add(s,scale(b.p,b.mass/m)),[0,0,0] as Vec);const drift=this.bodies.reduce((s,b)=>add(s,scale(b.v,b.mass/m)),[0,0,0] as Vec);for(const b of this.bodies){b.p=sub(b.p,center);b.v=sub(b.v,drift);b.trail=[];}this.baseline=cloneBodies(this.bodies);this.baselineDay=this.day;this.changed('Gravity sandbox started from the reference system.');}
 changed(message: string){this.referenceEnergy=energy(this.bodies);this.history=[];this.lastSample=-Infinity;for(const b of this.bodies)b.trail=[];this.events=[message,...this.events].slice(0,5);this.record('edit');}
 setMass(id:string,mass:number){if(!Number.isFinite(mass)||mass<0||mass>10)throw new Error('Mass must be between 0 and 10 solar masses.');this.experiment();this.beforeEdit();const b=this.bodies.find(b=>b.id===id);if(b){b.mass=mass;this.changed(`${b.name} mass changed.`);}}
 velocity(id:string,factor:number){if(!Number.isFinite(factor)||factor<0||factor>5)throw new Error('Choose a velocity factor between 0 and 5.');this.experiment();this.beforeEdit();const b=this.bodies.find(b=>b.id===id),parent=this.bodies.find(p=>p.id===(b?.parent??'sun'));if(b){const base=parent&&parent!==b?parent.v:[0,0,0] as Vec;b.v=add(base,scale(sub(b.v,base),factor));this.changed(`${b.name} velocity multiplied by ${factor.toFixed(2)}.`);}}
 move(id:string,p:Vec){if(p.some(v=>!Number.isFinite(v)||Math.abs(v)>100))throw new Error('Positions must be between −100 and 100 AU.');this.experiment();this.beforeEdit();const b=this.bodies.find(b=>b.id===id);if(b){b.p=[...p];this.collisions();this.changed(`${b.name} moved.`);}}
 remove(id:string){this.experiment();this.beforeEdit();const b=this.bodies.find(b=>b.id===id);this.bodies=this.bodies.filter(b=>b.id!==id);if(b)this.changed(`${b.name} removed. Its moons continue independently.`);}
 launch(p:Vec,v:Vec,kind:'probe'|'comet'):string {if(this.bodies.length>=50)throw new Error('The sandbox supports up to 50 bodies. Remove an object to add another.');if([...p,...v].some(n=>!Number.isFinite(n))||length(p)>150||length(v)>1)throw new Error('Choose a closer position or a lower launch speed.');this.experiment();this.beforeEdit();while(this.bodies.some(b=>b.id===`custom-${this.nextId}`))this.nextId++;const id=`custom-${this.nextId++}`;this.bodies.push({id,name:`${kind==='probe'?'Probe':'Comet'} ${this.nextId-1}`,kind,color:kind==='probe'?'#bca9ff':'#79ded3',mass:kind==='comet'?1e-16:0,radius:kind==='comet'?5:.001,p:[...p],v:[...v],trail:[]});this.selected=id;this.changed(`${this.bodies.at(-1)!.name} launched.`);return id;}
 collisions(bodies=this.bodies){const visible=bodies===this.bodies;for(let i=0;i<bodies.length;i++)for(let j=i+1;j<bodies.length;j++){
  let a=bodies[i],b=bodies[j];if(length(sub(a.p,b.p))>(a.radius+b.radius)/AU_KM)continue;
  if(b.mass>a.mass||b.mass===a.mass&&b.radius>a.radius){[a,b]=[b,a];bodies[i]=a;bodies[j]=b;}
  const mass=a.mass+b.mass;if(mass>0){a.p=scale(add(scale(a.p,a.mass),scale(b.p,b.mass)),1/mass);a.v=scale(add(scale(a.v,a.mass),scale(b.v,b.mass)),1/mass);}a.mass=mass;a.radius=Math.cbrt(a.radius**3+b.radius**3);if(visible&&this.selected===b.id)this.selected=a.id;bodies.splice(j--,1);if(visible)this.events=[`${b.name} collided with ${a.name}.`,...this.events].slice(0,5);
 }}
 tick(requestedDays:number,maxSteps=240){if(this.paused||requestedDays<=0)return 0;this.branch();let advanced=0;
  if(this.mode==='explore'){advanced=Math.min(requestedDays,MAX_DAY-this.day);this.day+=advanced;this.bodies=referenceBodies(this.day);if(this.day>=MAX_DAY){this.paused=true;this.events=['Reference date limit reached. Choose an earlier date or enter Experiment.'];}}
  else {this.collisions();if(this.baseline)this.collisions(this.baseline);for(let n=0;n<maxSteps&&advanced<requestedDays;n++){let dt=Math.min(.25,requestedDays-advanced);for(const system of [this.bodies,...(this.baseline?[this.baseline]:[])])for(let i=0;i<system.length;i++)for(let j=i+1;j<system.length;j++){const a=system[i],b=system[j],mass=a.mass+b.mass;if(mass<=0)continue;const r=length(sub(a.p,b.p)),v=length(sub(a.v,b.v));dt=Math.min(dt,.035*Math.sqrt(r*r*r/(G*mass)),.05*r/Math.max(1e-10,v));}dt=Math.max(Math.min(dt,requestedDays-advanced),Math.min(1e-6,requestedDays-advanced));integrate(this.bodies,dt);if(this.baseline){integrate(this.baseline,dt);this.collisions(this.baseline);}this.day+=dt;advanced+=dt;this.collisions();if(this.bodies.some(b=>[...b.p,...b.v].some(v=>!Number.isFinite(v)))){this.paused=true;this.events=['Calculation limit reached. Reset the system to continue.'];break;}}}
  if(this.day-this.lastSample>=.2){const selected=this.bodies.find(b=>b.id===this.selected);this.history.push({day:this.day,speed:selected?length(selected.v)*KM_S:0,energy:energy(this.bodies)});if(this.history.length>180)this.history.shift();if(this.mode==='experiment')for(const b of [...this.bodies,...(this.baseline??[])]){b.trail.push([...b.p]);if(b.trail.length>400)b.trail.shift();}this.lastSample=this.day;}if(this.mode==='experiment'&&(!this.timeline.length||this.day-this.timeline[this.cursor].day>=.5))this.record('sample');return advanced;
 }
 scenario(id: Scenario){const epoch=Math.min(MAX_DAY-365,Math.max(MIN_DAY,this.day));this.reset(epoch);this.experiment();
  if(id==='earth-speed'){this.velocity('earth',1.35);this.selected='earth';this.speed=30;}
  if(id==='jupiter-comet'){const j=this.bodies.find(b=>b.id==='jupiter')!;this.launch(add(j.p,[-.35,-.13,.015]),add(j.v,[.009,.003,0]),'comet');this.speed=5;}
  if(id==='mars-launch'){const e=this.bodies.find(b=>b.id==='earth')!;const radial=scale(sub(e.p,this.bodies.find(b=>b.id==='sun')!.p),1/length(sub(e.p,this.bodies.find(b=>b.id==='sun')!.p)));this.launch(add(e.p,scale(radial,.006)),scale(e.v,1.10),'probe');this.speed=10;this.events.unshift('Illustrative Mars transfer attempt. Compare launch timing and speed; arrival is not guaranteed.');}
  if(id==='binary'){const sep=4,m1=1,m2=.7,w=Math.sqrt(G*(m1+m2)/sep**3);this.bodies=[{id:'sun',name:'Sun',kind:'star',color:'#ffcb76',mass:m1,radius:695700,p:[-sep*m2/(m1+m2),0,0],v:[0,-sep*m2/(m1+m2)*w,0],trail:[]},{id:'second-star',name:'Companion star',kind:'star',color:'#ffa780',mass:m2,radius:520000,p:[sep*m1/(m1+m2),0,0],v:[0,sep*m1/(m1+m2)*w,0],trail:[]},{id:'test-planet',name:'Test planet',kind:'planet',color:'#7ba9e5',mass:3e-6,radius:6371,p:[12,0,0],v:[0,Math.sqrt(G*1.7/12),0],trail:[]}];this.selected='test-planet';this.speed=100;this.baseline=cloneBodies(this.bodies);this.baselineDay=this.day;this.timeline=[];this.cursor=-1;this.changed('Binary stars with a distant test planet.');}
  this.paused=true;
 }
 /** A rewind restores recorded states; it never integrates physics backwards. */
 private frame(kind:SolarFrame['kind']='sample',trails=false):SolarFrame {
  return {day:this.day,mode:this.mode,bodies:cloneBodies(this.bodies,trails),baseline:this.baseline?cloneBodies(this.baseline,trails):null,baselineDay:this.baselineDay,speed:this.speed,nextId:this.nextId,selected:this.selected,referenceEnergy:this.referenceEnergy,events:[...this.events],kind};
 }
 private apply(frame:SolarFrame){
  this.day=frame.day;this.mode=frame.mode;this.bodies=cloneBodies(frame.bodies,true);this.baseline=frame.baseline?cloneBodies(frame.baseline,true):null;this.baselineDay=frame.baselineDay;
  this.speed=frame.speed;this.nextId=frame.nextId;this.selected=frame.selected;this.referenceEnergy=frame.referenceEnergy;this.events=[...frame.events];this.lastSample=this.day;this.history=[];this.paused=true;
 }
 private branch(){if(this.cursor<this.timeline.length-1)this.timeline=this.timeline.slice(0,this.cursor+1);}
 private beforeEdit(){this.branch();this.record('before-edit');}
 private record(kind:SolarFrame['kind']){if(this.mode!=='experiment')return;this.branch();this.timeline.push(this.frame(kind));if(this.timeline.length>TIMELINE_LIMIT)this.timeline.shift();this.cursor=this.timeline.length-1;}
 rewind(index:number){
  if(!Number.isInteger(index)||index<0||index>=this.timeline.length)return;
  // Preserve the live tip before leaving it, including time since the last checkpoint.
  if(this.cursor===this.timeline.length-1&&this.day!==this.timeline[this.cursor].day){const full=this.timeline.length===TIMELINE_LIMIT;this.record('sample');if(full)index=Math.max(0,index-1);}
  this.cursor=index;this.apply(this.timeline[index]);
  for(const field of ['bodies','baseline'] as const)for(const body of this[field]??[])body.trail=this.timeline.slice(0,index+1).flatMap(f=>{const b=f[field]?.find(b=>b.id===body.id);return b?[[...b.p] as Vec]:[];});
  this.history=this.timeline.slice(0,index+1).map(f=>({day:f.day,speed:length(f.bodies.find(b=>b.id===this.selected)?.v??[0,0,0])*KM_S,energy:energy(f.bodies)})).slice(-180);
 }
 get undoIndex(){for(let i=this.cursor-1;i>=0;i--)if(this.timeline[i].kind==='before-edit')return i;return -1;}
 undo(){if(this.undoIndex>=0)this.rewind(this.undoIndex);}
 setBaseline(){this.experiment();this.beforeEdit();this.baseline=cloneBodies(this.bodies);this.baselineDay=this.day;this.changed('Comparison baseline updated.');}
 separation(id:string){const a=this.bodies.find(b=>b.id===id),b=this.baseline?.find(b=>b.id===id);return a&&b?length(sub(a.p,b.p))*AU_KM:null;}
 snapshot():SolarSave{return {format:'solar-lab',version:1,state:this.frame('sample',true),timeline:this.timeline.map(f=>({...f,bodies:cloneBodies(f.bodies),baseline:f.baseline?cloneBodies(f.baseline):null,events:[...f.events]})),cursor:this.cursor,lastSample:Number.isFinite(this.lastSample)?this.lastSample:null,history:this.history.map(h=>({...h}))};}
 /** Only call after validateSolarSave; imported data is checked before any live mutation. */
 restore(save:SolarSave){this.apply(save.state);this.timeline=save.timeline.map(f=>({...f,bodies:cloneBodies(f.bodies),baseline:f.baseline?cloneBodies(f.baseline):null,events:[...f.events]}));this.cursor=save.cursor;this.lastSample=save.lastSample??-Infinity;this.history=save.history.map(h=>({...h}));}

}
