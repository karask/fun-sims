import * as THREE from 'three';
import { MarchingCubes } from 'three/addons/objects/MarchingCubes.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Ant, ColonyState, NEST_CENTER, TASK_COLORS, Point } from './types';
import { volumeIndex,volumePoint } from './nest-volume';

import {LearnHighlight} from './learning';
export const nestPosition=(p:Point)=>new THREE.Vector3(p.x-680,390-p.y,NEST_CENTER-(p.z??NEST_CENTER));
export interface NestSceneOptions {highlight?:LearnHighlight;cutaway:number;soil:boolean;conditions:boolean;activity:boolean;selected:number|null;time:number;previous?:Map<number,Ant>;blend:number;detail?:boolean}
const cargoColors={carbohydrate:'#e7bc66',protein:'#bd8563',water:'#83c3d0',soil:'#b09a78',waste:'#93817a',brood:'#ede5ca',corpse:'#514944'};
function antGeometry(detailed=true){
 const parts:THREE.BufferGeometry[]=[];
 const add=(g:THREE.BufferGeometry,gait=0)=>{g.setAttribute('gait',new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count).fill(gait),1));parts.push(g);};
 for(const [x,rx,ry,rz] of [[-4.2,3.5,2.1,2.4],[0,2,1.45,1.5],[3.6,2,1.8,1.9]]){const g=new THREE.SphereGeometry(1,detailed?8:4,detailed?6:3);g.scale(rx,ry,rz);g.translate(x,2,0);add(g);}
 const line=(a:THREE.Vector3,b:THREE.Vector3,r:number,gait=0)=>{const d=b.clone().sub(a),g=new THREE.CylinderGeometry(r,r*.7,d.length(),detailed?4:3,1,!detailed);g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize()));g.translate(...a.clone().add(b).multiplyScalar(.5).toArray());add(g,gait);};
 for(const side of [-1,1])for(let leg=0;leg<3;leg++){const a=new THREE.Vector3(1.5-leg*1.6,2,side),b=new THREE.Vector3(4-leg*3,1.1,side*4.2),c=new THREE.Vector3(6-leg*4,0,side*6.3);line(a,b,.35,side*(leg%2?1:-1));line(b,c,.26,side*(leg%2?1:-1));}
 for(const side of [-1,1]){line(new THREE.Vector3(5,3,side),new THREE.Vector3(8,3.8,side*3),.2);line(new THREE.Vector3(8,3.8,side*3),new THREE.Vector3(10,3.2,side*2.3),.17);}
 const g=mergeGeometries(parts)!;parts.forEach(p=>p.dispose());return g;
}

/** GPU scene is a view of the worker-owned volume. Camera/clip changes never alter the colony. */
export class NestScene {
 readonly scene=new THREE.Scene();
 readonly antMesh:THREE.InstancedMesh;
 readonly antIds:number[]=[];
 private cavity:MarchingCubes;
 private skin:THREE.Mesh;
 private soil:THREE.Group;
 private marker:THREE.Mesh;
 readonly learningLine=new THREE.Line(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:'#f4d798',depthTest:false,transparent:true,opacity:.8}));
 readonly learningMarker=new THREE.Mesh(new THREE.TorusGeometry(1,.025,4,48),new THREE.MeshBasicMaterial({color:'#f4d798',depthTest:false}));
 private learningRoute:unknown;
 private brood:THREE.InstancedMesh;
 private cargo:THREE.InstancedMesh;
 private refuse:THREE.InstancedMesh;
 private stores:THREE.InstancedMesh;
 private plane=new THREE.Plane(new THREE.Vector3(0,0,-1),200);
 private uniforms={time:{value:0},moisture:{value:65},conditions:{value:0}};
 private source:number[]|null=null;
 private lastMeshAt=-Infinity;
 private lastRevision=-1;
 private highAntGeometry=antGeometry();
 private lowAntGeometry=antGeometry(false);
 private signature='';
 private sphere=new THREE.SphereGeometry(1,8,5);
 private dummy=new THREE.Object3D();
 private color=new THREE.Color();
 constructor(){
  this.scene.background=new THREE.Color('#151b18');
  this.learningLine.visible=false;this.learningLine.renderOrder=11;this.learningMarker.visible=false;this.learningMarker.renderOrder=11;this.scene.add(this.learningLine,this.learningMarker);
  this.scene.add(new THREE.HemisphereLight('#edddc1','#233a37',2.2));
  const light=new THREE.DirectionalLight('#f6d4a0',3);light.position.set(-300,500,500);this.scene.add(light);
  const cool=new THREE.DirectionalLight('#8ab6b2',1.6);cool.position.set(350,-100,-400);this.scene.add(cool);
  const wallMaterial=new THREE.MeshStandardMaterial({color:'#9b7753',roughness:.96,side:THREE.BackSide,clippingPlanes:[this.plane]});
  wallMaterial.onBeforeCompile=shader=>{
   shader.uniforms.soilMoisture=this.uniforms.moisture;shader.uniforms.showConditions=this.uniforms.conditions;
   shader.vertexShader='varying vec3 soilPosition;\n'+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nsoilPosition=(modelMatrix*vec4(position,1.0)).xyz;');
   shader.fragmentShader='varying vec3 soilPosition;\nuniform float soilMoisture;\nuniform float showConditions;\n'+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\nfloat damp=clamp((soilMoisture-soilPosition.y/10.0)/100.0,0.0,1.0);\ndiffuseColor.rgb=mix(diffuseColor.rgb,mix(vec3(.48,.28,.12),vec3(.18,.58,.61),damp),showConditions*.85);\ndiffuseColor.rgb*=.92+.08*sin(soilPosition.x*.31+sin(soilPosition.y*.15))*cos(soilPosition.z*.24);');
  };
  this.cavity=new MarchingCubes(64,wallMaterial,false,false,65000);
  this.cavity.isolation=.44;this.cavity.scale.set(380,340,180);this.cavity.position.set(20,-10,0);this.cavity.frustumCulled=false;this.scene.add(this.cavity);
  this.skin=new THREE.Mesh(this.cavity.geometry,new THREE.MeshStandardMaterial({color:'#c8a578',transparent:true,opacity:.065,side:THREE.FrontSide,depthWrite:false,roughness:1,clippingPlanes:[this.plane]}));
  this.skin.scale.copy(this.cavity.scale);this.skin.position.copy(this.cavity.position);this.skin.frustumCulled=false;this.scene.add(this.skin);
  this.soil=new THREE.Group();
  const block=new THREE.BoxGeometry(800,740,380),edges=new THREE.LineSegments(new THREE.EdgesGeometry(block),new THREE.LineBasicMaterial({color:'#899782',transparent:true,opacity:.22}));edges.position.set(20,-20,0);this.soil.add(edges);
  // Geological strata provide depth context without concealing the exposed galleries.
  for(let i=0;i<6;i++){
   const m=new THREE.MeshStandardMaterial({color:['#60664c','#665642','#524536','#493e32','#423b32','#35392f'][i],roughness:1,transparent:true,opacity:.13,depthWrite:false,side:THREE.DoubleSide});
   const g=new THREE.PlaneGeometry(800,120),back=new THREE.Mesh(g,m);back.position.set(20,290-i*120,-194);this.soil.add(back);
   const side=new THREE.Mesh(new THREE.PlaneGeometry(380,120),m);side.rotation.y=Math.PI/2;side.position.set(-380,290-i*120,0);this.soil.add(side);
  }
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(900,520),new THREE.MeshStandardMaterial({color:'#1e2921',roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.set(20,-395,0);this.soil.add(ground);this.scene.add(this.soil);
  block.dispose();
  const mat=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.64,metalness:.12});
  mat.onBeforeCompile=shader=>{shader.uniforms.nestTime=this.uniforms.time;shader.vertexShader='attribute float gait;\nattribute float walking;\nuniform float nestTime;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed.x += sin(nestTime * 13.0 + instanceMatrix[3].x * .13) * gait * walking * .8;');};
  this.antMesh=new THREE.InstancedMesh(this.highAntGeometry,mat,3001);const walking=new THREE.InstancedBufferAttribute(new Float32Array(3001),1);this.highAntGeometry.setAttribute('walking',walking);this.lowAntGeometry.setAttribute('walking',walking);this.antMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);this.antMesh.frustumCulled=false;this.antMesh.count=0;this.scene.add(this.antMesh);
  const make=(count:number,roughness=.7)=>{const mesh=new THREE.InstancedMesh(this.sphere,new THREE.MeshStandardMaterial({color:'white',roughness} ),count);mesh.frustumCulled=false;mesh.count=0;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);this.scene.add(mesh);return mesh;};
  this.brood=make(600);this.cargo=make(3001);this.refuse=make(10000);this.stores=make(200,.35);
  this.marker=new THREE.Mesh(new THREE.TorusGeometry(12,.5,5,40),new THREE.MeshBasicMaterial({color:'#ffe1a2',depthTest:false,transparent:true,opacity:.9}));this.marker.visible=false;this.marker.renderOrder=10;this.scene.add(this.marker);
 }
 private rebuild(s:ColonyState){
  if(this.source===s.nest&&this.lastRevision===s.excavated)return;
  // Excavators can finish simultaneously. Coalesce only visual mesh work; the model stays current.
  if(performance.now()-this.lastMeshAt<350)return;
  this.source=s.nest;this.lastRevision=s.excavated;
  const signature=`${s.seed}:${s.excavated}:${s.nest.reduce((v,n,i)=>v+n*(i+1),0)}`;
  if(signature===this.signature)return;this.signature=signature;this.lastMeshAt=performance.now();
  this.cavity.reset();const n=this.cavity.resolution;
  let minX=320,maxX=1080,minY=60,maxY=740;
  for(let i=0;i<s.nest.length;i++)if(s.nest[i]){const p=volumePoint(i);minX=Math.min(minX,p.x-40);maxX=Math.max(maxX,p.x+40);minY=Math.min(minY,p.y-40);maxY=Math.max(maxY,p.y+40);}
  this.cavity.scale.set((maxX-minX)/2,(maxY-minY)/2,180);this.cavity.position.set((minX+maxX)/2-680,390-(minY+maxY)/2,0);this.skin.scale.copy(this.cavity.scale);this.skin.position.copy(this.cavity.position);
  for(let z=1;z<n-1;z++)for(let y=1;y<n-1;y++)for(let x=1;x<n-1;x++){
   const p={x:minX+x/n*(maxX-minX),y:maxY-y/n*(maxY-minY),z:360-z/n*360};
   this.cavity.field[z*n*n+y*n+x]=s.nest[volumeIndex(p)]??0;
  }
  this.cavity.blur(.6);this.cavity.update();
 }
 private put(mesh:THREE.InstancedMesh,i:number,p:THREE.Vector3,scale:THREE.Vector3,color:string,q?:THREE.Quaternion){
  this.dummy.position.copy(p);this.dummy.scale.copy(scale);this.dummy.quaternion.copy(q??new THREE.Quaternion());this.dummy.updateMatrix();mesh.setMatrixAt(i,this.dummy.matrix);mesh.setColorAt(i,this.color.set(color));
 }
 update(s:ColonyState,o:NestSceneOptions){
  const highlight=o.highlight?.view==='nest'?o.highlight:undefined;
  this.learningMarker.visible=!!highlight;this.learningLine.visible=!!highlight?.route.length;
  if(highlight){this.learningMarker.position.copy(nestPosition(highlight.point));this.learningMarker.scale.setScalar(highlight.radius);if(this.learningRoute!==highlight.route){this.learningRoute=highlight.route;this.learningLine.geometry.dispose();this.learningLine.geometry=new THREE.BufferGeometry().setFromPoints(highlight.route.map(nestPosition));}}
  this.rebuild(s);this.antMesh.geometry=o.detail?this.highAntGeometry:this.lowAntGeometry;this.uniforms.time.value=o.time;this.plane.constant=-180+o.cutaway/100*380;this.soil.visible=o.soil;
  this.uniforms.conditions.value=o.conditions?1:0;this.uniforms.moisture.value=s.settings.moisture;
  this.antIds.length=0;let ci=0;
  const selected=s.ants.find(a=>a.id===o.selected&&a.view==='nest');this.marker.visible=!!selected;
  for(const ant of s.ants){if(ant.view!=='nest'||!ant.alive)continue;
   const old=o.previous?.get(ant.id),pos=nestPosition(ant),prev=old?.view==='nest'?nestPosition(old):pos.clone();pos.lerpVectors(prev,pos,o.blend);
   // Expose the chosen individual even if the cut plane is behind it.
   if(pos.z>this.plane.constant&&ant.id!==o.selected)continue;
   const dir=nestPosition(ant).sub(prev);if(dir.lengthSq()<.0001)dir.set(Math.cos(ant.angle),-Math.sin(ant.angle),0);dir.normalize();
   const q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1,0,0),dir),size=ant.task==='queen'?2.15:1.05;
   this.put(this.antMesh,this.antIds.length,pos,new THREE.Vector3(size,size,size),o.activity?TASK_COLORS[ant.task]:ant.task==='queen'?'#514027':'#32291e',q);(this.antMesh.geometry.getAttribute('walking') as THREE.InstancedBufferAttribute).setX(this.antIds.length,['resting','queen','grooming'].includes(ant.task)?0:1);this.antIds.push(ant.id);
   if(ant.id===o.selected){this.marker.position.copy(pos);this.marker.scale.setScalar(size);}
   if(ant.cargo){const cp=new THREE.Vector3(10*size,2*size,0).applyQuaternion(q).add(pos);this.put(this.cargo,ci++,cp,new THREE.Vector3(3.5,2.5,2.5),cargoColors[ant.cargo],q);}
  }
  this.antMesh.geometry.getAttribute('walking').needsUpdate=true;this.antMesh.count=this.antIds.length;this.antMesh.boundingSphere=null;this.cargo.count=ci;
  let bi=0;for(const b of s.brood){if(b.carriedBy!==null)continue;const p=nestPosition(b);if(p.z>this.plane.constant)continue;const size=b.stage==='egg'?1.6:b.stage==='larva'?2.5:3.5;this.put(this.brood,bi++,p,new THREE.Vector3(size*1.7,size,size),b.stage==='pupa'?'#d7bd94':'#f3e6c9');}this.brood.count=bi;
  let di=0;for(const d of s.debris){if(d.view!=='nest'||d.carriedBy!==null)continue;const p=nestPosition(d);if(p.z>this.plane.constant)continue;this.put(this.refuse,di++,p,new THREE.Vector3(d.kind==='corpse'?5:2.4,1.7,2),d.kind==='corpse'?'#514943':'#bc9e7c');}this.refuse.count=di;
  let si=0;for(const kind of ['carbohydrate','protein'] as const){const amount=Math.min(85,Math.ceil(s.stores[kind]/4));for(let i=0;i<amount;i++){const angle=i*2.399,p=nestPosition({x:955+Math.cos(angle)*Math.sqrt(i)*2.8,y:390+Math.sin(angle)*Math.sqrt(i)*1.3,z:kind==='carbohydrate'?200:220});if(p.z>this.plane.constant)continue;this.put(this.stores,si++,p,new THREE.Vector3(2.7,2.2,2.7),cargoColors[kind]);}}this.stores.count=si;
  for(const mesh of [this.antMesh,this.brood,this.cargo,this.refuse,this.stores]){mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;}
 }
 faceMarker(camera:THREE.Camera){this.marker.quaternion.copy(camera.quaternion);this.learningMarker.quaternion.copy(camera.quaternion);}
 dispose(){const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>();this.scene.traverse(o=>{if(o instanceof THREE.Mesh||o instanceof THREE.Line){geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);if(o instanceof THREE.InstancedMesh)o.dispose();}});geometries.add(this.highAntGeometry);geometries.add(this.lowAntGeometry);geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}
}

export function fitNestCamera(camera:THREE.PerspectiveCamera,target:THREE.Vector3){
 target.set(20,-20,0);
 const direction=new THREE.Vector3(.48,.26,.84).normalize(),right=new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0),direction).normalize(),up=new THREE.Vector3().crossVectors(direction,right);
 const vertical=Math.tan(THREE.MathUtils.degToRad(camera.fov/2)),horizontal=vertical*camera.aspect;
 let distance=1;
 for(const x of [-400,400])for(const y of [-370,370])for(const z of [-190,190]){
  const corner=new THREE.Vector3(x,y,z),forward=corner.dot(direction);
  distance=Math.max(distance,forward+Math.abs(corner.dot(right))/horizontal,forward+Math.abs(corner.dot(up))/vertical);
 }
 camera.position.copy(target).addScaledVector(direction,distance*1.12);camera.lookAt(target);camera.updateMatrixWorld();camera.updateProjectionMatrix();
}
