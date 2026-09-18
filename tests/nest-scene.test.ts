import assert from 'node:assert/strict';
import {NestScene,fitNestCamera} from '../lib/simulation/nest-scene';
import {createColony} from '../lib/simulation/engine';
import {Mesh,Vector3,PerspectiveCamera,Raycaster} from 'three';
const options={cutaway:100,soil:true,conditions:true,activity:true,selected:null,time:0,blend:1};
for(const count of [200,1000,3000]){
 const s=createColony(71,count),scene=new NestScene();
 const before=JSON.stringify(s);scene.update(s,options);assert.equal(JSON.stringify(s),before);
 assert.equal(scene.antMesh.count,s.ants.filter(a=>a.view==='nest').length);
 assert.equal(new Set(scene.antIds).size,scene.antMesh.count);
 for(const object of scene.scene.children)if(object instanceof Mesh){
  const positions=object.geometry.getAttribute('position');
  for(let i=0;i<positions.count;i++)assert.ok(Number.isFinite(positions.getX(i))&&Number.isFinite(positions.getY(i))&&Number.isFinite(positions.getZ(i)));
 }
 const begin=performance.now();for(let i=0;i<30;i++)scene.update(s,{...options,time:i/30});
 console.log(`3D scene ${count} workers: ${((performance.now()-begin)/30).toFixed(2)} ms/CPU frame (excluding GPU rendering)`);
 scene.update(s,{...options,cutaway:0});assert.equal(scene.antMesh.count,0);
 scene.update(s,{...options,cutaway:0,selected:s.ants[0].id});assert.deepEqual(scene.antIds,[s.ants[0].id]);
 scene.update(s,options);scene.antMesh.computeBoundingSphere();assert.ok(scene.antMesh.boundingSphere!.radius>0);
 scene.dispose();
}
console.log('PASS 3D scene: finite geometry, all populations, cutaway visibility, selection, picking bounds, and cleanup.');

for(const aspect of [.65,1,2.5]){const camera=new PerspectiveCamera(40,aspect,1,5000),target=new Vector3();fitNestCamera(camera,target);for(const x of [-400,400])for(const y of [-370,370])for(const z of [-190,190]){const p=target.clone().add(new Vector3(x,y,z)).project(camera);assert.ok(Math.abs(p.x)<1&&Math.abs(p.y)<1&&p.z<1);}}
console.log('PASS 3D nest camera: phone, square, and desktop framing.');
