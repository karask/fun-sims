import * as THREE from 'three';
import { BUILDINGS, BUS_ROUTE, BUS_STOPS, CityEngine, HEIGHT, NODES, ROADS, WIDTH, type Building } from './engine';
import { COLORS, type Display, type Selection } from './renderer';

export const CITY_CENTER = new THREE.Vector3(WIDTH / 2, 0, HEIGHT / 2);
export function fitCityDistance(aspect: number, fov = 42) {
  const halfFov = THREE.MathUtils.degToRad(fov / 2);
  const limitingAngle = Math.min(halfFov, Math.atan(Math.tan(halfFov) * Math.max(.2, aspect)));
  return Math.hypot(WIDTH / 2, HEIGHT / 2, 110) / Math.sin(limitingAngle) * 1.04;
}
export function buildingHeight(b: Building) {
  return b.kind === 'park' ? 26 : b.kind === 'office' ? 48 + b.id % 4 * 18 : b.kind === 'home' ? b.id % 3 === 0 ? 38 : 25 : b.kind === 'service' ? 34 : 20;
}
type Batch = { geometry: THREE.BufferGeometry; material: THREE.Material; matrices: THREE.Matrix4[] };
type BodySet = { body: THREE.InstancedMesh; head: THREE.InstancedMesh; legs: THREE.InstancedMesh; cars: THREE.InstancedMesh; cabins: THREE.InstancedMesh; wheels: THREE.InstancedMesh };
const CAR_COLORS = ['#d4b87b', '#91bbb6', '#b7c9d9', '#c4886e', '#e4dbc4'];
const SHIRTS = ['#dfc18c', '#b9c4d9', '#95c8b7', '#d19c8b', '#ece1c2'];

/** Rendering is a projection of CityEngine state. It never advances or changes that state. */
export class CityScene {
  readonly scene = new THREE.Scene();
  readonly buildings = new Map<number, THREE.Group>();
  readonly roads = new Map<string, THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>>();
  readonly labels = new THREE.Group();
  readonly route = new THREE.Group();
  readonly buses: THREE.Group[] = [];
  readonly selectable: THREE.Object3D[] = [];
  readonly sun = new THREE.DirectionalLight('#ffe7bf', 2.6);
  readonly ambient = new THREE.HemisphereLight('#d9eaf2', '#4b6651', 2.1);
  readonly people: BodySet;
  readonly marker = new THREE.Group();
  private readonly geometry = new Set<THREE.BufferGeometry>();
  private readonly materials = new Set<THREE.Material>();
  private readonly batches = new Map<string, Batch>();
  private readonly cube = this.geo(new THREE.BoxGeometry(1, 1, 1));
  private readonly sphere = this.geo(new THREE.SphereGeometry(1, 8, 6));
  private readonly trunk = this.geo(new THREE.CylinderGeometry(1, 1, 1, 6));
  private readonly canopy = this.geo(new THREE.IcosahedronGeometry(1, 0));
  private readonly dummy = new THREE.Object3D();
  private readonly windowMaterial = this.mat('#456975', { roughness: .25, metalness: .15, emissive: '#ffd394', emissiveIntensity: 0 });
  private readonly barkMaterial = this.mat('#6e6751');
  private readonly leafMaterial = this.mat('#699676');
  private readonly buildingMaterials = new Map<number, THREE.MeshStandardMaterial>();
  private readonly closure = new THREE.Group();
  private readonly routeLine: THREE.Line;
  private readonly rain: THREE.LineSegments;
  private readonly rainPositions = new Float32Array(240 * 6);
  private readonly outline = new THREE.Box3Helper(new THREE.Box3(), '#f8d58d');
  private readonly textures = new Set<THREE.Texture>();
  private lastVisualTime = -1;
  private lastLayer = '';
  private lastSelection = '';
  private lastRain: boolean | null = null;
  private readonly pathPositions = new Float32Array(64 * 3);
  private readonly pathDistances = new Float32Array(64);

  constructor(count: number, labelTexture?: (text: string) => THREE.Texture) {
    this.scene.background = new THREE.Color('#192c31');
    this.scene.fog = new THREE.Fog('#192c31', 3500, 8000);
    this.scene.add(this.ambient, this.sun, this.labels, this.route, this.marker, this.closure, this.outline);
    this.sun.position.set(400, 1100, 150); this.sun.target.position.copy(CITY_CENTER); this.scene.add(this.sun.target);
    this.sun.castShadow = true; this.sun.shadow.mapSize.set(2048, 2048);
    Object.assign(this.sun.shadow.camera, { left: -950, right: 950, top: 950, bottom: -950, near: 10, far: 2600 });
    this.sun.shadow.bias = -.0003; this.sun.shadow.normalBias = 1.3;
    const ground = this.mat('#566d60'), asphalt = this.mat('#33474a'), pavement = this.mat('#819187'), trim = this.mat('#c0c3ae');
    this.box(this.scene, WIDTH / 2, -12, HEIGHT / 2, WIDTH, 24, HEIGHT, this.mat('#344a43'));
    this.box(this.scene, WIDTH / 2, -.7, HEIGHT / 2, WIDTH - 10, 2, HEIGHT - 10, ground);
    this.box(this.scene, WIDTH / 2, -27, HEIGHT / 2, WIDTH + 18, 6, HEIGHT + 18, this.mat('#24383a'));
    for (const r of ROADS) {
      const a = NODES[r.a], b = NODES[r.b], horizontal = a.y === b.y, length = Math.hypot(a.x - b.x, a.y - b.y);
      this.batch('sidewalk', this.cube, pavement, (a.x + b.x) / 2, .5, (a.y + b.y) / 2, horizontal ? length : 32, 1.6, horizontal ? 32 : length);
      const material = this.mat('#33474a');
      const road = this.box(this.scene, (a.x + b.x) / 2, 1.05, (a.y + b.y) / 2, horizontal ? length - 20 : 22, .45, horizontal ? 22 : length - 20, material);
      this.roads.set(r.key, road);
      for (let n = 22; n < length - 15; n += 18) this.batch('lane-marks', this.cube, trim, a.x + (horizontal ? n : 0), 1.34, a.y + (horizontal ? 0 : n), horizontal ? 7 : .7, .08, horizontal ? .7 : 7);
    }
    for (const n of NODES) this.batch('junctions', this.cube, asphalt, n.x, 1.06, n.y, 22, .5, 22);
    for (const index of [10, 13, 16, 28, 31, 34, 37, 40, 43]) {
      const n = NODES[index];
      for (let stripe = -8; stripe <= 8; stripe += 4) for (const side of [-1, 1]) this.batch('crosswalks', this.cube, trim, n.x + stripe, 1.37, n.y + side * 17, 2, .1, 6);
    }
    for (const b of BUILDINGS) this.buildBuilding(b, labelTexture);
    this.buildStreetFurniture();
    for (const stop of BUS_STOPS) {
      const p = NODES[stop]; const shelter = this.mat('#86c6c7'); const pole = this.mat('#a5b6ad');
      this.batch('bus-shelter-roofs', this.cube, shelter, p.x + 22, 14, p.y + 22, 17, 2, 9);
      for (const dx of [-6, 6]) this.batch('bus-shelter-posts', this.cube, pole, p.x + 22 + dx, 7, p.y + 25, 1, 14, 1);
      this.batch('bus-benches', this.cube, this.mat('#dabd83'), p.x + 22, 4, p.y + 23, 13, 2, 4);
      const sign = this.box(this.route, p.x + 13, 16, p.y + 13, 6, 7, 1, shelter); sign.rotation.y = .3;
      this.box(this.route, p.x + 13, 8, p.y + 13, .7, 16, .7, pole);
    }
    const routeGeometry = this.geo(new THREE.BufferGeometry().setFromPoints([...BUS_ROUTE, BUS_ROUTE[0]].map(i => new THREE.Vector3(NODES[i].x + 5, 1.6, NODES[i].y + 5))));
    this.route.add(new THREE.Line(routeGeometry, this.material(new THREE.LineBasicMaterial({ color: '#8de0de', transparent: true, opacity: .75 }))));
    for (let i = 0; i < 6; i++) this.buses.push(this.buildBus(i));
    this.people = this.buildPeople(count);
    this.buildClosure();
    this.flushBatches();
    const ring = new THREE.Mesh(this.geo(new THREE.TorusGeometry(10, .7, 6, 32)), this.material(new THREE.MeshBasicMaterial({ color: '#ffdc91', depthTest: false, transparent: true, opacity: .95 })));
    ring.rotation.x = Math.PI / 2; ring.renderOrder = 10; this.marker.add(ring);
    const beacon = new THREE.Mesh(this.geo(new THREE.OctahedronGeometry(3.2)), ring.material); beacon.position.y = 18; beacon.renderOrder = 10; this.marker.add(beacon);
    this.outline.visible = false; this.outline.renderOrder = 9;
    this.geometry.add(this.outline.geometry); this.materials.add(this.outline.material as THREE.Material);
    const pathGeometry = this.geo(new THREE.BufferGeometry());
    pathGeometry.setAttribute('position', new THREE.BufferAttribute(this.pathPositions, 3).setUsage(THREE.DynamicDrawUsage));
    pathGeometry.setAttribute('lineDistance', new THREE.BufferAttribute(this.pathDistances, 1).setUsage(THREE.DynamicDrawUsage));
    pathGeometry.setDrawRange(0, 0);
    this.routeLine = new THREE.Line(pathGeometry, this.material(new THREE.LineDashedMaterial({ color: '#ffdf9c', dashSize: 7, gapSize: 5, depthTest: false, transparent: true, opacity: .8 })));
    this.routeLine.renderOrder = 8; this.routeLine.frustumCulled = false; this.scene.add(this.routeLine);
    const rainGeometry = this.geo(new THREE.BufferGeometry()); rainGeometry.setAttribute('position', new THREE.BufferAttribute(this.rainPositions, 3).setUsage(THREE.DynamicDrawUsage));
    this.rain = new THREE.LineSegments(rainGeometry, this.material(new THREE.LineBasicMaterial({ color: '#b6d9df', transparent: true, opacity: .32, depthWrite: false })));
    this.rain.frustumCulled = false; this.scene.add(this.rain);
  }

  private geo<T extends THREE.BufferGeometry>(g: T): T { this.geometry.add(g); return g; }
  private material<T extends THREE.Material>(m: T): T { this.materials.add(m); return m; }
  private mat(color: string, extra: THREE.MeshStandardMaterialParameters = {}) { return this.material(new THREE.MeshStandardMaterial({ color, roughness: .8, ...extra })); }
  private box(parent: THREE.Object3D, x: number, y: number, z: number, w: number, h: number, d: number, material: THREE.MeshStandardMaterial) {
    const mesh = new THREE.Mesh(this.cube, material); mesh.position.set(x, y, z); mesh.scale.set(w, h, d); mesh.castShadow = h > 3; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  }
  private batch(key: string, geometry: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number, w: number, h: number, d: number, yaw = 0) {
    let batch = this.batches.get(key); if (!batch) { batch = { geometry, material, matrices: [] }; this.batches.set(key, batch); }
    this.dummy.position.set(x, y, z); this.dummy.rotation.set(0, yaw, 0); this.dummy.scale.set(w, h, d); this.dummy.updateMatrix(); batch.matrices.push(this.dummy.matrix.clone());
  }
  private flushBatches() {
    for (const [key, b] of this.batches) { const mesh = new THREE.InstancedMesh(b.geometry, b.material, b.matrices.length); b.matrices.forEach((matrix, i) => mesh.setMatrixAt(i, matrix)); mesh.name = key; mesh.castShadow = !['lane-marks', 'crosswalks', 'windows'].includes(key); mesh.receiveShadow = true; mesh.computeBoundingSphere(); this.scene.add(mesh); }
    this.batches.clear();
  }
  private tree(x: number, z: number, size = 1) {
    this.batch('tree-trunks', this.trunk, this.barkMaterial, x, 5 * size, z, 1.5 * size, 10 * size, 1.5 * size);
    this.batch('tree-crowns', this.canopy, this.leafMaterial, x, 14 * size, z, 8 * size, 11 * size, 8 * size, x * .1);
  }
  private buildBuilding(b: Building, labelTexture?: (text: string) => THREE.Texture) {
    const group = new THREE.Group(); group.position.set(b.x, 0, b.y); group.userData.selection = { kind: 'building', id: b.id }; group.name = b.name;
    this.scene.add(group); this.buildings.set(b.id, group); this.selectable.push(group);
    const color = this.mat(COLORS[b.kind]); this.buildingMaterials.set(b.id, color);
    const roof = this.mat(b.kind === 'home' ? '#a5866b' : '#b2bca7'), base = this.mat('#c2c0a6'), h = buildingHeight(b);
    this.box(group, 0, 1.7, 0, 102, 2, 78, this.mat(b.kind === 'park' ? '#72946e' : '#9b9f87'));
    if (b.kind === 'park') {
      this.box(group, 0, 2.8, 0, 8, .5, 72, this.mat('#c0bb91')); this.box(group, 0, 2.8, 0, 95, .5, 7, this.mat('#c0bb91'));
      for (const [x, z, size] of [[-32, -20, 1.3], [30, -22, 1], [-30, 20, .9], [30, 21, 1.2]]) this.tree(b.x + x, b.y + z, size);
      for (const x of [-15, 15]) { this.box(group, x, 5, 15, 11, 2, 4, roof); this.box(group, x, 7, 17, 11, 4, 1, roof); }
      const fountain = new THREE.Mesh(this.geo(new THREE.CylinderGeometry(9, 10, 3, 16)), base); fountain.position.set(0, 5, -18); group.add(fountain);
      const water = new THREE.Mesh(this.geo(new THREE.CylinderGeometry(7.5, 7.5, .5, 16)), this.mat('#69adae', { roughness: .1 })); water.position.copy(fountain.position).y += 1.8; group.add(water);
    } else if (b.kind === 'home' && b.id % 3 !== 0) {
      for (const x of [-23, 23]) {
        this.box(group, x, 11.5, 0, 31, 19, 39, color);
        const shape = new THREE.Shape(); shape.moveTo(-17, 0); shape.lineTo(0, 10); shape.lineTo(17, 0); shape.closePath();
        const geometry = this.geo(new THREE.ExtrudeGeometry(shape, { depth: 42, bevelEnabled: false }));
        const pitched = new THREE.Mesh(geometry, roof); pitched.position.set(x, 21, -21); pitched.castShadow = true; group.add(pitched);
        this.box(group, x + 7, 5.8, 19.8, 6, 8, 1, this.mat('#49584a'));
        this.windows(b.x + x, b.y, 31, 39, 19);
        this.box(group, x - 8, 26, -8, 4, 13, 4, base);
      }
      this.tree(b.x + 43, b.y - 24, .65);
    } else {
      const w = b.kind === 'shop' ? 76 : b.kind === 'service' ? 70 : 62, d = 48;
      this.box(group, 0, h / 2 + 2.6, 0, w, h, d, color);
      this.box(group, 0, h + 3.3, 0, w + 3, 2.5, d + 3, roof);
      this.box(group, -12, h + 6.4, -7, 17, 4, 12, this.mat('#617a76'));
      this.windows(b.x, b.y, w, d, h);
      if (b.kind === 'office') {
        for (let y = 13; y < h; y += 16) this.box(group, 0, y, 0, w + 1, 1.2, d + 1, base);
        this.box(group, w / 2 - 7, h + 12, -14, 1.3, 17, 1.3, base);
      }
      if (b.kind === 'shop') {
        this.box(group, 0, 11, d / 2 + 4, w + 3, 2, 12, this.mat('#dcc491'));
        this.box(group, 0, 9, d / 2 + 9, w + 3, 3, 1, this.mat('#ab725b'));
        this.box(group, 0, 5, d / 2 + .6, 9, 9, 1, this.windowMaterial);
      }
      if (b.kind === 'service') {
        const sign = this.mat('#e2eee1', { emissive: '#b1d9be', emissiveIntensity: .2 });
        this.box(group, 0, h - 7, d / 2 + .8, 12, 3, 1, sign); this.box(group, 0, h - 7, d / 2 + 1, 3, 12, 1, sign);
      }
      this.tree(b.x - 42, b.y - 23, .8); this.tree(b.x + 42, b.y + 22, .7);
    }
    if (labelTexture) {
      const texture = labelTexture(b.kind === 'home' ? `Home ${b.id + 1}` : b.name); this.textures.add(texture);
      const sprite = new THREE.Sprite(this.material(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: true, depthWrite: false })));
      sprite.position.set(b.x, h + 24, b.y); sprite.scale.set(105, 20, 1); sprite.userData.building = b.id; this.labels.add(sprite);
    }
  }
  private windows(x: number, z: number, w: number, d: number, h: number) {
    for (let y = 9; y < h; y += 11) {
      for (let dx = -w / 2 + 7; dx < w / 2 - 3; dx += 10) for (const side of [-1, 1]) this.batch('windows', this.cube, this.windowMaterial, x + dx, y, z + side * (d / 2 + .3), 4.5, 5.5, .7);
      for (let dz = -d / 2 + 8; dz < d / 2 - 3; dz += 11) for (const side of [-1, 1]) this.batch('windows', this.cube, this.windowMaterial, x + side * (w / 2 + .3), y, z + dz, .7, 5.5, 4.5);
    }
  }
  private buildStreetFurniture() {
    const post = this.mat('#667970'), lamp = this.mat('#ebdfb1', { emissive: '#ffe0a2', emissiveIntensity: .5 });
    for (let i = 0; i < NODES.length; i += 2) {
      const p = NODES[i]; this.batch('lamp-posts', this.trunk, post, p.x - 18, 10, p.y - 18, .65, 20, .65);
      this.batch('lamp-heads', this.cube, lamp, p.x - 18, 20.4, p.y - 18, 4, 1.5, 4);
    }
    for (let x = 70; x < WIDTH - 30; x += 70) { this.tree(x, 37, .8); this.tree(x, HEIGHT - 35, .9); }
  }
  private instance(geometry: THREE.BufferGeometry, material: THREE.Material, count: number, selectable = false) {
    const mesh = new THREE.InstancedMesh(geometry, material, count); mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false; mesh.userData.visibleInstances = new Uint8Array(count);
    if (selectable) { mesh.userData.citizens = true; this.selectable.push(mesh); } this.scene.add(mesh); return mesh;
  }
  private buildPeople(count: number): BodySet {
    const body = this.instance(this.cube, this.mat('#ffffff'), count, true);
    const head = this.instance(this.sphere, this.mat('#d9b894'), count, true);
    const legs = this.instance(this.cube, this.mat('#344855'), count * 2);
    const cars = this.instance(this.cube, this.mat('#ffffff', { roughness: .4 }), count, true);
    const cabins = this.instance(this.cube, this.mat('#9bbabc', { roughness: .2, metalness: .25 }), count, true);
    const wheels = this.instance(this.cube, this.mat('#233039'), count * 4);
    for (let i = 0; i < count; i++) { body.setColorAt(i, new THREE.Color(SHIRTS[i % SHIRTS.length])); cars.setColorAt(i, new THREE.Color(CAR_COLORS[i % CAR_COLORS.length])); }
    return { body, head, legs, cars, cabins, wheels };
  }
  private buildBus(id: number) {
    const bus = new THREE.Group(); bus.userData.bus = id;
    const color = this.mat('#72c4c9'), glass = this.mat('#365b66', { roughness: .15 }), dark = this.mat('#26383d');
    this.box(bus, 0, 5, 0, 8, 7, 24, color); this.box(bus, 0, 7, 0, 8.2, 3, 17, glass); this.box(bus, 0, 9, 0, 8.2, 1, 24.2, this.mat('#d2ded0'));
    for (const x of [-4.2, 4.2]) for (const z of [-7, 7]) this.box(bus, x, 2.3, z, 1.2, 3.5, 3.5, dark);
    this.scene.add(bus); return bus;
  }
  private buildClosure() {
    const a = NODES[30], b = NODES[31]; this.closure.position.set((a.x + b.x) / 2, 0, a.y);
    const bar = this.mat('#e9b384'), white = this.mat('#e6d9b5');
    for (const z of [-9, 9]) this.box(this.closure, 0, 4, z, 2, 8, 2, white);
    this.box(this.closure, 0, 7, 0, 3, 4, 24, bar);
    for (const z of [-8, 0, 8]) this.box(this.closure, 1.6, 7, z, .2, 4.1, 3, white);
  }
  private put(mesh: THREE.InstancedMesh, id: number, x: number, y: number, z: number, sx: number, sy: number, sz: number, yaw = 0) {
    this.dummy.position.set(x, y, z); this.dummy.rotation.set(0, yaw, 0); this.dummy.scale.set(sx, sx ? sy : 0, sx ? sz : 0); this.dummy.updateMatrix(); mesh.setMatrixAt(id, this.dummy.matrix); mesh.userData.visibleInstances[id] = sx > 0 ? 1 : 0;
  }
  update(engine: CityEngine, display: Display) {
    const s = engine.state; const selected = display.selection?.kind === 'citizen' ? s.citizens[display.selection.id] : null;
    const shown = this.people;
    for (const c of s.citizens) {
      const visible = !!c.trip && c.trip.stage !== 'riding', driving = visible && c.trip!.mode === 'car', walking = visible && !driving;
      const target = c.trip?.path[c.trip.index]; const yaw = target ? Math.atan2(target.x - c.x, target.y - c.y) : 0;
      const x = c.x + (driving ? -4 : 8), z = c.y - 5;
      const stride = walking && c.trip?.stage !== 'waiting' ? Math.sin(s.time * 4 + c.id) * .9 : 0;
      this.put(shown.body, c.id, x, 5.5, z, walking ? 2.5 : 0, 3.5, 1.8, yaw);
      this.put(shown.head, c.id, x, 8.5, z, walking ? 1.55 : 0, 1.55, 1.55);
      for (let leg = 0; leg < 2; leg++) this.put(shown.legs, c.id * 2 + leg, x + (leg ? .8 : -.8), 2.8, z + (leg ? stride : -stride), walking ? .8 : 0, 3, 1, yaw);
      this.put(shown.cars, c.id, x, 3.8, z, driving ? 6 : 0, 3.4, 12, yaw);
      this.put(shown.cabins, c.id, x, 6, z - .4, driving ? 4.8 : 0, 2.7, 6.5, yaw);
      for (let wheel = 0; wheel < 4; wheel++) {
        const dx = wheel % 2 ? 3 : -3, dz = wheel < 2 ? 3.8 : -3.8;
        this.put(shown.wheels, c.id * 4 + wheel, x + dx * Math.cos(yaw) + dz * Math.sin(yaw), 2.2, z - dx * Math.sin(yaw) + dz * Math.cos(yaw), driving ? 1 : 0, 2.4, 2.4, yaw);
      }
    }
    for (const mesh of Object.values(shown)) mesh.instanceMatrix.needsUpdate = true;
    // Raycasting must use the current moving-instance bounds, never the constructor bounds.
    for (const mesh of [shown.body, shown.head, shown.cars, shown.cabins]) mesh.computeBoundingSphere();
    for (let i = 0; i < this.buses.length; i++) {
      const bus = s.buses[i], model = this.buses[i]; model.visible = !!bus;
      if (bus) { const next = NODES[BUS_ROUTE[(bus.routeIndex + 1) % BUS_ROUTE.length]]; model.position.set(bus.x - 3, 0, bus.y + 3); model.rotation.y = Math.atan2(next.x - bus.x, next.y - bus.y); }
    }
    this.closure.visible = s.policies.roadClosed; this.route.visible = display.busRoute; this.labels.visible = display.labels;
    this.marker.visible = !!selected;
    if (selected) { const b = BUILDINGS[selected.location]; const height = selected.trip ? 2 : buildingHeight(b) + 11; this.marker.position.set(selected.x + (selected.trip?.mode === 'car' ? -4 : selected.trip?.stage === 'riding' ? 0 : 8), height, selected.y - 5); }
    const selectionKey = display.selection ? `${display.selection.kind}:${display.selection.id}` : '';
    if (this.lastSelection !== selectionKey) {
      this.outline.visible = display.selection?.kind === 'building';
      if (display.selection?.kind === 'building') this.outline.box.setFromObject(this.buildings.get(display.selection.id)!);
      this.lastSelection = selectionKey;
    }
    // Update colors and lighting at the UI cadence; moving geometry stays frame-synchronous.
    if (Math.abs(s.time - this.lastVisualTime) >= 1 || display.layer !== this.lastLayer || s.policies.rain !== this.lastRain) {
      const hour = s.time % 1440 / 60, daylight = THREE.MathUtils.smoothstep(Math.sin((hour - 6) / 12 * Math.PI), -.15, .5);
      this.sun.intensity = (.12 + daylight * 2.5) * (s.policies.rain ? .5 : 1); this.ambient.intensity = .7 + daylight * 1.4;
      this.windowMaterial.emissiveIntensity = (1 - daylight) * 1.5;
      this.sun.position.set(CITY_CENTER.x - Math.cos(hour / 24 * Math.PI * 2) * 850, 350 + daylight * 900, 180);
      (this.scene.background as THREE.Color).set(daylight > .5 ? '#263d42' : '#11202f'); (this.scene.fog as THREE.Fog).color.copy(this.scene.background as THREE.Color);
      for (const [key, mesh] of this.roads) { const load = engine.roadLoad(key); mesh.material.color.set(display.layer === 'traffic' ? load > 3 ? '#bc775e' : load > 1 ? '#a3945e' : '#4e7c69' : display.layer === 'pollution' ? load > 2 ? '#b18555' : load ? '#7f8757' : '#344e50' : '#33474a'); }
      for (const b of BUILDINGS) { let color = COLORS[b.kind]; if (display.layer === 'happiness' && b.kind === 'home') { const residents = s.citizens.filter(c => c.home === b.id); const value = residents.reduce((n, c) => n + c.happiness, 0) / residents.length; color = value < 50 ? '#d78c74' : value < 70 ? '#d1ba76' : '#87c9b1'; } this.buildingMaterials.get(b.id)!.color.set(color); }
      this.lastVisualTime = s.time; this.lastLayer = display.layer; this.lastRain = s.policies.rain;
    }
    if (selected?.trip && selected.trip.stage !== 'riding' && selected.trip.stage !== 'waiting') {
      const points = [selected, ...selected.trip.path.slice(selected.trip.index)].slice(0, 64);
      for (let i = 0; i < points.length; i++) { this.pathPositions.set([points[i].x, 2, points[i].y], i * 3); this.pathDistances[i] = i ? this.pathDistances[i - 1] + Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y) : 0; }
      this.routeLine.geometry.setDrawRange(0, points.length); this.routeLine.geometry.attributes.position.needsUpdate = true; this.routeLine.geometry.attributes.lineDistance.needsUpdate = true; this.routeLine.visible = true;
    } else this.routeLine.visible = false;
    this.rain.visible = s.policies.rain;
    if (s.policies.rain) { for (let i = 0; i < 240; i++) { const x = (i * 163 + s.time * 5) % WIDTH, y = 200 - (i * 73 + s.time * 20) % 200, z = i * 113 % HEIGHT; this.rainPositions.set([x, y, z, x - 2, y - 10, z + 1], i * 6); } this.rain.geometry.attributes.position.needsUpdate = true; }
    this.scene.updateMatrixWorld();
  }
  updateLabels(labelTexture: (text: string) => THREE.Texture) {
    for (const child of this.labels.children) {
      const sprite = child as THREE.Sprite;
      const building = BUILDINGS[sprite.userData.building as number];
      const old = sprite.material.map;
      if (old) { this.textures.delete(old); old.dispose(); }
      const texture = labelTexture(building.kind === 'home' ? `Home ${building.id + 1}` : building.name);
      this.textures.add(texture); sprite.material.map = texture; sprite.material.needsUpdate = true;
    }
  }
  pick(raycaster: THREE.Raycaster): Selection {
    for (const hit of raycaster.intersectObjects(this.selectable, true)) {
      if (hit.object.userData.citizens && hit.instanceId !== undefined) { if (hit.object.userData.visibleInstances[hit.instanceId]) return { kind: 'citizen', id: hit.instanceId }; continue; }
      let object: THREE.Object3D | null = hit.object; while (object) { if (object.userData.selection) return object.userData.selection as Selection; object = object.parent; }
    }
    return null;
  }
  dispose() {
    this.scene.traverse(object => { if (object instanceof THREE.InstancedMesh) object.dispose(); });
    for (const texture of this.textures) texture.dispose(); for (const geometry of this.geometry) geometry.dispose(); for (const material of this.materials) material.dispose();
    this.sun.shadow.map?.dispose(); this.scene.clear(); this.selectable.length = 0;
  }
}
