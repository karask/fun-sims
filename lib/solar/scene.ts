import * as THREE from 'three';
import { AU_KM, Body, MOONS, PLANETS, SolarEngine, Vec, position } from './engine';
import { Display } from './renderer';

const textureUrls:Record<string,string>={
 sun:new URL('./textures/2k_sun.jpg',import.meta.url).href,
 mercury:new URL('./textures/2k_mercury.jpg',import.meta.url).href,
 venus:new URL('./textures/2k_venus_atmosphere.jpg',import.meta.url).href,
 earth:new URL('./textures/2k_earth_daymap.jpg',import.meta.url).href,
 mars:new URL('./textures/2k_mars.jpg',import.meta.url).href,
 jupiter:new URL('./textures/2k_jupiter.jpg',import.meta.url).href,
 saturn:new URL('./textures/2k_saturn.jpg',import.meta.url).href,
 uranus:new URL('./textures/2k_uranus.jpg',import.meta.url).href,
 neptune:new URL('./textures/2k_neptune.jpg',import.meta.url).href,
 moon:new URL('./textures/2k_moon.jpg',import.meta.url).href,
};
// Approximate obliquities and sidereal rotation periods, days. Phase is illustrative.
// NASA fact sheets: https://nssdc.gsfc.nasa.gov/planetary/factsheet/
// Retrograde rotation is represented by obliquity > 90°, not a second sign reversal.
export const ROTATION:Record<string,[number,number]>={sun:[7.25,25.4],mercury:[.03,58.646],venus:[177.4,243.025],earth:[23.44,.99727],mars:[25.19,1.02596],jupiter:[3.13,.41354],saturn:[26.73,.444],uranus:[97.77,.71833],neptune:[28.32,.67125],moon:[6.68,27.3217]};
interface Visual {root:THREE.Group;axis:THREE.Group;sphere:THREE.Mesh;ghost:THREE.Mesh;light?:THREE.PointLight;}
export function createSolarScene(onTextureError:()=>void,loadTextures=true){
 const scene=new THREE.Scene();scene.background=new THREE.Color('#0b101a');
 scene.add(new THREE.AmbientLight('#9eb5df',.16));
 const geometry=new THREE.SphereGeometry(1,48,32),haloGeometry=new THREE.SphereGeometry(1,32,20);
 const visuals=new Map<string,Visual>(),textures=new Map<string,THREE.Texture>();let disposed=false;
 const loader=new THREE.TextureLoader();
 const orbitGroup=new THREE.Group(),trailGroup=new THREE.Group(),arrowGroup=new THREE.Group();scene.add(orbitGroup,trailGroup,arrowGroup);
 let orbitKey='';
 function clear(group:THREE.Group){for(const child of [...group.children]){child.traverse(o=>{const m=o as THREE.Mesh;if(m.geometry)m.geometry.dispose();if(m.material)for(const mat of Array.isArray(m.material)?m.material:[m.material])mat.dispose();});group.remove(child);}}
 function path(points:Vec[],color:string,opacity:number,dashed=false){const geometry=new THREE.BufferGeometry().setFromPoints(points.map(p=>new THREE.Vector3(...p)));const material=dashed?new THREE.LineDashedMaterial({color,transparent:true,opacity,dashSize:.04,gapSize:.025}):new THREE.LineBasicMaterial({color,transparent:true,opacity});const line=new THREE.Line(geometry,material);if(dashed)line.computeLineDistances();return line;}
 function create(b:Body){
  const root=new THREE.Group(),axis=new THREE.Group();root.add(axis);scene.add(root);
  const material=b.kind==='star'?new THREE.MeshBasicMaterial({color:b.color}):new THREE.MeshStandardMaterial({color:b.color,roughness:.9,metalness:0});
  const sphere=new THREE.Mesh(geometry,material);sphere.userData.bodyId=b.id;axis.add(sphere);
  const ghost=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({color:'#7ee8d5',wireframe:true,transparent:true,opacity:.24,depthWrite:false}));scene.add(ghost);
  const v:Visual={root,axis,sphere,ghost};
  if(loadTextures&&textureUrls[b.id]){const texture=loader.load(textureUrls[b.id],t=>{if(disposed){t.dispose();return;}t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;material.map=t;material.color.set('#ffffff');material.needsUpdate=true;},undefined,()=>{if(!disposed)onTextureError();});textures.set(b.id,texture);}
  if(b.id==='earth'||b.kind==='star'||b.id==='venus'||b.id==='neptune'||b.id==='uranus'){
   const atmosphere=new THREE.Mesh(haloGeometry,new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.BackSide,blending:THREE.AdditiveBlending,uniforms:{tint:{value:new THREE.Color(b.kind==='star'?'#ffb65e':b.color)},strength:{value:b.kind==='star'?.65:.45}},vertexShader:'varying vec3 n; varying vec3 eye; void main(){vec4 p=modelViewMatrix*vec4(position,1.); n=normalize(normalMatrix*normal);eye=normalize(-p.xyz);gl_Position=projectionMatrix*p;}',fragmentShader:'varying vec3 n; varying vec3 eye; uniform vec3 tint; uniform float strength;void main(){float rim=pow(1.-abs(dot(normalize(n),normalize(eye))),3.);gl_FragColor=vec4(tint,rim*strength);}'}));atmosphere.scale.setScalar(b.kind==='star'?1.15:1.045);axis.add(atmosphere);
  }
  if(b.id==='saturn'){
   // Concentric geometry preserves a visible Cassini gap without an external alpha texture.
   for(const [inner,outer,color,opacity] of [[1.24,1.51,'#938d79',.35],[1.52,1.95,'#dacbae',.78],[2.03,2.27,'#baac91',.6]] as const){const ring=new THREE.Mesh(new THREE.RingGeometry(inner,outer,160),new THREE.MeshStandardMaterial({color,transparent:true,opacity,side:THREE.DoubleSide,roughness:1,emissive:color,emissiveIntensity:.14,depthWrite:false}));ring.rotation.x=Math.PI/2;axis.add(ring);}
  }
  if(b.kind==='star'){v.light=new THREE.PointLight('#fff8f0',3.2,0,0);scene.add(v.light);}
  visuals.set(b.id,v);return v;
 }
 function remove(id:string,v:Visual){scene.remove(v.root,v.ghost);if(v.light)scene.remove(v.light);v.root.traverse(o=>{const m=o as THREE.Mesh;if(m.geometry&&m.geometry!==geometry&&m.geometry!==haloGeometry)m.geometry.dispose();if(m.material)for(const mat of Array.isArray(m.material)?m.material:[m.material])mat.dispose();});(v.ghost.material as THREE.Material).dispose();textures.get(id)?.dispose();textures.delete(id);visuals.delete(id);}
 // A fixed star field is decorative and is not a catalog of observed stars.
 const points=new Float32Array(1500*3);for(let i=0;i<1500;i++){const z=2*Math.abs((Math.sin(i*127.1+12.3)*43758.5453)%1)-1,a=i*2.399963,r=Math.sqrt(Math.max(0,1-z*z));points.set([Math.cos(a)*r*800,Math.sin(a)*r*800,z*800],i*3);}const starGeometry=new THREE.BufferGeometry();starGeometry.setAttribute('position',new THREE.BufferAttribute(points,3));const stars=new THREE.Points(starGeometry,new THREE.PointsMaterial({color:'#a9bfdc',size:1.2,sizeAttenuation:false,transparent:true,opacity:.65}));scene.add(stars);
 let trailStamp='';
 function update(engine:SolarEngine,display:Display,camera:THREE.PerspectiveCamera,height:number){
  const distance=camera.position.distanceTo(camera.userData.target??new THREE.Vector3()),range=distance*Math.tan(THREE.MathUtils.degToRad(camera.fov/2));
  for(const [id,v] of visuals)if(!engine.bodies.some(b=>b.id===id)&&!engine.baseline?.some(b=>b.id===id))remove(id,v);
  for(const b of [...engine.bodies,...(engine.baseline??[]).filter(g=>!engine.bodies.some(b=>b.id===g.id))]){const v=visuals.get(b.id)??create(b);const actual=engine.bodies.some(a=>a.id===b.id);v.root.position.set(...b.p);
   const visible=b.kind!=='moon'||display.moons&&(range<.15||b.id===display.selected);v.root.visible=visible&&actual;
   const pixels=b.kind==='star'?17:b.kind==='planet'?Math.max(5,Math.min(12,3+Math.sqrt(b.radius/1000))):3;
   const bodyDistance=Math.max(.00000001,camera.position.distanceTo(v.root.position));
   const minRadius=pixels*2*bodyDistance*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))/Math.max(1,height);
   const radius=display.trueScale?b.radius/AU_KM:Math.max(b.radius/AU_KM,minRadius);v.root.scale.setScalar(radius);
   const [tilt,period]=ROTATION[b.id]??[0,MOONS.find(m=>m.id===b.id)?.period??1];v.axis.rotation.x=Math.PI/2-tilt*Math.PI/180;v.sphere.rotation.y=(engine.day%period)/period*Math.PI*2;
   if(v.light){v.light.position.copy(v.root.position);v.light.visible=actual;}
   const ghost=display.ghosts?engine.baseline?.find(g=>g.id===b.id):undefined;v.ghost.visible=!!ghost&&visible&&(!actual||new THREE.Vector3(...ghost.p).distanceTo(v.root.position)>radius*1.3);if(ghost){v.ghost.position.set(...ghost.p);v.ghost.scale.setScalar(radius*1.07);}
  }
  const key=`${engine.mode}:${Math.floor(engine.day/365)}`;
  if(key!==orbitKey){clear(orbitGroup);orbitKey=key;if(engine.mode==='explore')for(const p of PLANETS)orbitGroup.add(path(Array.from({length:241},(_,i)=>position(p,engine.day,i/240*Math.PI*2)),p.color,.28));}
  orbitGroup.visible=display.orbits;
  // Rebuild lightweight paths only at physics sample / UI-state changes, not every frame.
  const stamp=`${engine.day.toFixed(1)}:${display.orbits}:${display.ghosts}:${display.moons}:${range<.15}:${engine.cursor}:${engine.bodies.length}`;
  if(stamp!==trailStamp){trailStamp=stamp;clear(trailGroup);
   if(display.orbits&&engine.mode==='experiment')for(const b of engine.bodies)if(b.trail.length>1&&(b.kind!=='moon'||display.moons&&range<.15))trailGroup.add(path(b.trail,b.color,.65));
   if(display.ghosts&&engine.baseline)for(const b of engine.baseline)if(b.trail.length>1&&(b.kind!=='moon'||display.moons&&range<.15)){const line=path(b.trail,'#7ee8d5',.42,true);(line.material as THREE.LineDashedMaterial).dashSize=range*.025;(line.material as THREE.LineDashedMaterial).gapSize=range*.018;trailGroup.add(line);}
   if(display.orbits&&engine.mode==='explore'&&display.moons&&range<.15)for(const m of MOONS){const p=engine.bodies.find(b=>b.id===m.parent);if(p)trailGroup.add(path(Array.from({length:121},(_,i)=>{const a=i/120*Math.PI*2,r=m.distance/AU_KM,inc=m.inclination*Math.PI/180;return[p.p[0]+r*Math.cos(a),p.p[1]+r*Math.sin(a)*Math.cos(inc),p.p[2]+r*Math.sin(a)*Math.sin(inc)];}),m.color,.4));}
  }
  clear(arrowGroup);
  for(const b of engine.bodies){const v=visuals.get(b.id)!;if(!v.root.visible)continue;let dir:THREE.Vector3|undefined;
   if(display.vectors){dir=new THREE.Vector3(...b.v);const size=Math.min(range*.6,dir.length()*Math.min(15,range*1.5));if(size>0)arrowGroup.add(new THREE.ArrowHelper(dir.normalize(),v.root.position,size,'#86c6e0',size*.15,size*.08));}
   if(display.gravity&&b.id===display.selected){dir=new THREE.Vector3();for(const other of engine.bodies){if(other===b)continue;const delta=new THREE.Vector3(...other.p).sub(v.root.position);dir.addScaledVector(delta,other.mass/Math.max(1e-12,delta.length()**3));}if(dir.length()>0)arrowGroup.add(new THREE.ArrowHelper(dir.normalize(),v.root.position,range*.22,'#e8b779',range*.025,range*.015));}
  }
  return {visuals,range};
 }
 return {scene,update,visuals,dispose(){disposed=true;for(const [id,v] of visuals)remove(id,v);clear(orbitGroup);clear(trailGroup);clear(arrowGroup);geometry.dispose();haloGeometry.dispose();starGeometry.dispose();(stars.material as THREE.Material).dispose();}};
}
