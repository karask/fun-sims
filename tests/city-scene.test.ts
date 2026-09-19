import assert from 'node:assert/strict';
import * as THREE from 'three';
import { BUILDINGS, CityEngine, HEIGHT, ROADS, WIDTH } from '../lib/city/engine';
import { CITY_CENTER, CityScene, buildingHeight, fitCityDistance } from '../lib/city/scene';
import type { Display } from '../lib/city/renderer';

let passed = 0;
function test(name: string, run: () => void) { run(); console.log(`PASS city 3D: ${name}`); passed++; }
const display: Display = { layer: 'city', labels: true, busRoute: true, selection: { kind: 'citizen', id: 1 }, follow: false };
const city = new CityEngine();
const model = new CityScene(city.state.citizens.length);

test('all buildings and roads have volumetric geometry in the same world coordinates', () => {
  assert.equal(model.buildings.size, BUILDINGS.length); assert.equal(model.roads.size, ROADS.length);
  model.scene.updateMatrixWorld(true);
  for (const b of BUILDINGS) { const group = model.buildings.get(b.id)!; assert.equal(group.position.x, b.x); assert.equal(group.position.z, b.y); const bounds = new THREE.Box3().setFromObject(group), size = bounds.getSize(new THREE.Vector3()); assert.ok(size.x >= 90 && size.z >= 60 && size.y > 3); }
  assert.ok(BUILDINGS.filter(b => b.kind === 'office').every(b => buildingHeight(b) > 40));
  assert.ok(model.scene.getObjectByName('tree-crowns') instanceof THREE.InstancedMesh);
  assert.ok(model.scene.getObjectByName('windows') instanceof THREE.InstancedMesh);
});
test('perspective fit keeps the entire city visible at phone, square, and wide aspects', () => {
  for (const aspect of [.45, .75, 1, 1.7, 2.8]) {
    const camera = new THREE.PerspectiveCamera(42, aspect, 1, 12000); camera.position.copy(CITY_CENTER).add(new THREE.Vector3(.82, 1.08, 1).normalize().multiplyScalar(fitCityDistance(aspect))); camera.lookAt(CITY_CENTER); camera.updateMatrixWorld();
    for (const x of [0, WIDTH]) for (const z of [0, HEIGHT]) for (const y of [0, 115]) { const p = new THREE.Vector3(x, y, z).project(camera); assert.ok(Math.abs(p.x) < 1 && Math.abs(p.y) < 1 && p.z < 1 && p.z > -1, `Clipped corner at aspect ${aspect}: ${p.toArray()}`); }
  }
});
test('raycast selection identifies a 3D building by its simulation id', () => {
  model.update(city, display);
  const b = BUILDINGS.find(b => b.kind === 'office')!;
  const ray = new THREE.Raycaster(new THREE.Vector3(b.x, 500, b.y), new THREE.Vector3(0, -1, 0));
  assert.deepEqual(model.pick(ray), { kind: 'building', id: b.id });
});
test('scene updates never change simulation state or advance time', () => {
  const before = city.checkpoint(); for (let i = 0; i < 20; i++) model.update(city, { ...display, layer: i % 2 ? 'traffic' : 'happiness' }); assert.equal(city.checkpoint(), before);
});
test('residents, cars, and buses track live simulation positions and remain pickable', () => {
  city.advance(100); model.update(city, display);
  const car = city.state.citizens.find(c => c.trip?.mode === 'car')!; assert.ok(car);
  const matrix = new THREE.Matrix4(); model.people.cars.getMatrixAt(car.id, matrix); const position = new THREE.Vector3().setFromMatrixPosition(matrix);
  assert.ok(Math.abs(Math.hypot(position.x - car.x, position.z - car.y) - 5) < .001, 'Car stays in its lane, five units off the street center');
  const walker = city.state.citizens.find(c => c.trip && c.trip.mode !== 'car' && c.trip.stage !== 'riding' && c.x % 130 < 120)!; assert.ok(walker);
  model.people.head.getMatrixAt(walker.id, matrix); const head = new THREE.Vector3().setFromMatrixPosition(matrix);
  assert.equal(model.people.head.userData.visibleInstances[walker.id], 1);
  const ray = new THREE.Raycaster(head.clone().add(new THREE.Vector3(0, 50, 0)), new THREE.Vector3(0, -1, 0));
  assert.deepEqual(model.pick(ray), { kind: 'citizen', id: walker.id });
  assert.equal(model.buses.filter(b => b.visible).length, city.state.buses.length);
  assert.equal(model.buses[0].position.x, city.state.buses[0].x - 3);
});
test('switching display layers and restoring a checkpoint keep the same simulated city', () => {
  const snapshot = city.checkpoint(); model.update(city, { ...display, layer: 'traffic' }); model.update(city, { ...display, layer: 'happiness' }); assert.equal(city.checkpoint(), snapshot);
  city.setPolicy('buses', 0); model.update(city, display); assert.equal(model.buses.filter(b => b.visible).length, 0);
  city.restore(snapshot); model.update(city, display); assert.equal(model.buses.filter(b => b.visible).length, city.state.buses.length); assert.equal(city.checkpoint(), snapshot);
});
test('rain changes lighting immediately while paused; night lights remain visible', () => {
  city.setPaused(true); model.update(city, display); const sunny = model.sun.intensity;
  city.setPolicy('rain', true); model.update(city, display); assert.ok(model.sun.intensity < sunny);
  city.state.time = 1320; model.update(city, display); assert.ok(model.ambient.intensity >= .7); assert.ok(model.sun.intensity < 1);
  assert.equal(model.route.visible, true); model.update(city, { ...display, busRoute: false, labels: false }); assert.equal(model.route.visible, false); assert.equal(model.labels.visible, false);
});
test('geometry stays finite across resets and renderer resources are released', () => {
  city.reset(); model.update(city, display);
  const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>();
  model.scene.traverse(object => { if (object instanceof THREE.Mesh || object instanceof THREE.Line) { geometries.add(object.geometry); for (const m of Array.isArray(object.material) ? object.material : [object.material]) materials.add(m); const positions = object.geometry.attributes.position; if (positions) for (const v of positions.array) assert.ok(Number.isFinite(v)); } });
  let disposed = 0; for (const g of geometries) g.addEventListener('dispose', () => disposed++);
  model.dispose(); assert.equal(disposed, geometries.size); assert.equal(model.scene.children.length, 0); assert.equal(model.selectable.length, 0); assert.ok(materials.size > 0);
});
console.log(`TOTAL ${passed} city 3D checks passed.`);
