import assert from 'node:assert/strict';
import { CityEngine, BUILD_COST, BUS_ROUTE, NODES } from '../lib/city/engine';
import { AUTO_KEY, SAVE_KEY, saveCity, readSaves, comparePolicies } from '../lib/city/storage';
import { CityScene } from '../lib/city/scene';
let passed = 0;
async function test(name: string, run: () => void | Promise<void>) { await run(); passed++; console.log(`PASS city growth: ${name}`); }
await test('construction changes only its own city and charges the published cost', () => {
  const a = new CityEngine(), b = new CityEngine(), before = a.state.treasury;
  a.build(3, 'home'); assert.equal(a.state.buildings[3].kind, 'home'); assert.equal(b.state.buildings[3].kind, 'park'); assert.equal(a.state.treasury, before - BUILD_COST.home);
  a.build(0, 'park'); assert.equal(a.state.citizens.filter(c => c.active && c.home === 3).length, 8); assert.ok(a.state.citizens.every(c => c.home !== 0));
  const restored = new CityEngine(); restored.restore(a.checkpoint()); assert.equal(restored.checkpoint(), a.checkpoint());
});
await test('insufficient housing and budget reject construction atomically', () => {
  const city = new CityEngine(), before = city.checkpoint(); assert.throws(() => city.build(0, 'park'), /replacement/); assert.equal(city.checkpoint(), before);
  city.state.treasury = 100; const poor = city.checkpoint(); assert.throws(() => city.build(3, 'home'), /treasury/); assert.equal(city.checkpoint(), poor);
});
await test('removed roads block journeys without teleporting and rebuilding reconnects them', () => {
  const city = new CityEngine(); city.toggleRoad('0-1'); city.toggleRoad('0-9'); assert.equal(city.hasAccess(0), false); assert.deepEqual(city.route(0, 10), []);
  city.advance(120); const blocked = city.state.citizens.find(c => c.home === 0 && c.trip?.stage === 'blocked'); assert.ok(blocked); const position = [blocked.x, blocked.y]; city.advance(30); assert.deepEqual([blocked.x, blocked.y], position);
  assert.ok(city.buildingIssues(0).some(i => i.title === 'No road access'));
  city.toggleRoad('0-1'); assert.equal(city.hasAccess(0), true); assert.notEqual(blocked.trip?.stage, 'blocked');
  const before = city.checkpoint(); assert.throws(() => city.toggleRoad('10-11'), /Loop/); assert.equal(city.checkpoint(), before);
});
await test('bus stop edits retain a working route and minimum two stops', () => {
  const city = new CityEngine(); city.advance(120); city.toggleStop(11); assert.ok(city.state.busStops.includes(11)); assert.ok(city.state.buses.every(b => !b.riders.length));
  while (city.state.busStops.length > 2) city.toggleStop(city.state.busStops[0]);
  assert.throws(() => city.toggleStop(city.state.busStops[0]), /two stops/); city.advance(180); new CityEngine().restore(city.checkpoint());
});
await test('traffic signals alternate, cars queue and parking takes simulated time', () => {
  const city = new CityEngine(), [a, b] = city.state.citizens; city.state.policies.buses = 0; city.setPolicy('buses', 0);
  const start = NODES[12], end = NODES[13]; city.state.time = 500;
  for (const c of [a,b]) { Object.assign(c, { x: start.x + 70, y: start.y, activity: 'traveling', trip: { destination: 12, purpose: 'work', mode: 'car', stage: 'direct', path: [start, end, city.state.buildings[12]], index: 1, started: 500, startStop: 10, endStop: 13, busId: null } }); }
  a.x += 20; city.advance(.25); assert.ok(a.x - b.x >= 13);
  const green = city.signalGreen(13, true); city.advance(.75); assert.notEqual(city.signalGreen(13, true), green); assert.notEqual(city.signalGreen(13, true), city.signalGreen(13, false));
  let parking = false; for (let i = 0; i < 100; i++) { city.advance(.25); parking ||= a.trip?.stage === 'parking'; } assert.ok(parking);
});
await test('vacant homes attract newcomers and jobs stay within capacity', () => {
  const city = new CityEngine(); city.build(3, 'home'); const initial = city.metrics().population; city.advance(1020);
  assert.equal(city.metrics().population, initial + 4); assert.equal(city.state.arrivals, 4); assert.ok(city.state.buildings[0].rent > 20);
  for (const b of city.state.buildings) if (['office','shop'].includes(b.kind)) assert.ok(city.state.citizens.filter(c => c.active && c.job === b.id).length <= b.capacity);
  new CityEngine().restore(city.checkpoint());
});
await test('sustained business losses close an employer and hardship leads to departures', () => {
  const city = new CityEngine(); const office = city.state.buildings[10]; office.cash = -100000; office.badDays = 1;
  const resident = city.state.citizens[0]; resident.money = -290; resident.strugglingDays = 1; city.state.time = 1439.75; city.advance(.25);
  assert.equal(office.open, false); assert.ok(city.state.citizens.every(c => c.job !== office.id)); assert.ok(city.state.departures >= 1);
  new CityEngine().restore(city.checkpoint());
});
await test('save validation rejects broken references without replacing the live city', () => {
  const city = new CityEngine(), before = city.checkpoint(), bad = JSON.parse(before); bad.citizens[0].home = 99;
  assert.throws(() => city.restore(JSON.stringify(bad))); assert.equal(city.checkpoint(), before);
  bad.citizens[0].home = 3; assert.throws(() => city.restore(JSON.stringify(bad))); assert.throws(() => city.restore('{}')); assert.equal(city.checkpoint(), before);
});
await test('fractional time survives save and restore exactly', () => {
  const city = new CityEngine(); city.advance(.13); const checkpoint = city.checkpoint(); city.advance(.13); const result = city.checkpoint(); city.restore(checkpoint); city.advance(.13); assert.equal(city.checkpoint(), result);
});
await test('named saves persist independently; quota failures preserve the previous list', () => {
  const entries = new Map<string, string>(), storage = { getItem: (key: string) => entries.get(key) ?? null, setItem: (key: string, value: string) => { entries.set(key, value); } }, city = new CityEngine();
  saveCity(storage, 'First city', city.checkpoint()); city.build(3, 'home'); saveCity(storage, 'Second city', city.checkpoint()); assert.equal(readSaves(storage).length, 2); assert.notEqual(SAVE_KEY, AUTO_KEY);
  const previous = entries.get(SAVE_KEY); assert.throws(() => saveCity({ ...storage, setItem: () => { throw new Error('Quota'); } }, 'First city', city.checkpoint()), /storage/); assert.equal(entries.get(SAVE_KEY), previous);
});
await test('comparison advances both copies equally and never changes the source', async () => {
  const city = new CityEngine(); city.advance(.13); const source = city.checkpoint(); const policies = { ...city.state.policies };
  const equal = await comparePolicies(source, policies, 120, async () => {}); assert.deepEqual(equal.baseline, equal.changed); assert.equal(equal.baseline.time - equal.start, 120); assert.equal(city.checkpoint(), source);
  const changed = await comparePolicies(source, { ...policies, fare: 0, buses: 6 }, 120, async () => {}); assert.equal(changed.baseline.time, changed.changed.time); assert.notDeepEqual(changed.baseline, changed.changed);
  const controller = new AbortController(); controller.abort(); await assert.rejects(() => comparePolicies(source, policies, 120, async () => {}, controller.signal), /cancelled/);
});
await test('3D geometry reflects construction, removed streets and edited stops', () => {
  const city = new CityEngine(); city.build(3, 'office'); city.build(14, 'empty'); city.toggleRoad('0-1'); city.toggleStop(BUS_ROUTE[1]);
  const model = new CityScene(city.state.citizens.length, undefined, city.state); assert.equal(model.roads.has('0-1'), false); assert.equal(model.buildings.get(3)?.name, city.state.buildings[3].name);
  model.update(city, { layer: 'city', labels: true, busRoute: true, selection: { kind: 'building', id: 14 }, follow: false }); assert.ok(model.buildings.has(14)); model.dispose();
});
console.log(`TOTAL ${passed} city growth checks passed.`);
