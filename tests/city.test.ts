import assert from 'node:assert/strict';
import { BUILDINGS, BUS_ROUTE, BUS_STOPS, CLOSED_ROAD, CityEngine, HEIGHT, NODES, WIDTH, edgeKey } from '../lib/city/engine';

let passed = 0;
function test(name: string, run: () => void) { run(); passed++; console.log(`PASS ${name}`); }
function invariants(city: CityEngine) {
  const s = city.state;
  assert.ok(Number.isFinite(s.time) && Number.isFinite(s.treasury));
  assert.equal(s.citizens.length, BUILDINGS.filter(b => b.kind === 'home').length * 8);
  for (const c of s.citizens) {
    for (const key of ['x', 'y', 'money', 'energy', 'hunger', 'happiness'] as const) assert.ok(Number.isFinite(c[key]), `${c.name}: invalid ${key}`);
    assert.ok(c.x >= 0 && c.x <= WIDTH && c.y >= 0 && c.y <= HEIGHT);
    for (const key of ['energy', 'hunger', 'happiness'] as const) assert.ok(c[key] >= 0 && c[key] <= 100);
    if (c.trip?.stage === 'riding') assert.ok(s.buses.some(bus => bus.id === c.trip?.busId && bus.riders.includes(c.id)), 'Passenger lost their bus');
  }
  for (const bus of s.buses) { assert.ok(bus.riders.length <= 22); assert.equal(new Set(bus.riders).size, bus.riders.length); for (const id of bus.riders) assert.equal(s.citizens[id].trip?.busId, bus.id); }
}

test('town initializes with homes, assigned work, and a connected bus loop', () => {
  const city = new CityEngine(); invariants(city);
  assert.ok(city.metrics().population > 150);
  for (const c of city.state.citizens) { assert.equal(BUILDINGS[c.home].kind, 'home'); if (c.job !== null) assert.ok(['office','shop'].includes(BUILDINGS[c.job].kind)); }
  assert.ok(BUS_STOPS.every(n => BUS_ROUTE.includes(n)));
  for (let i = 0; i < BUS_ROUTE.length; i++) assert.ok(Math.abs(BUS_ROUTE[i] - BUS_ROUTE[(i + 1) % BUS_ROUTE.length]) === 1 || Math.abs(BUS_ROUTE[i] - BUS_ROUTE[(i + 1) % BUS_ROUTE.length]) === 9);
});
test('same seeds and elapsed time produce the same complete city', () => {
  const a = new CityEngine(15), b = new CityEngine(15); a.advance(180); for (let i = 0; i < 720; i++) b.advance(.25); assert.equal(a.checkpoint(), b.checkpoint());
  assert.notEqual(a.checkpoint(), new CityEngine(16).checkpoint());
});
test('pause freezes time; explicit advance works while paused', () => {
  const city = new CityEngine(); city.setPaused(true); const before = city.checkpoint(); city.tick(.1); assert.equal(city.checkpoint(), before); city.advance(15); assert.equal(city.state.time, 435); assert.equal(city.paused, true);
});
test('checkpoint restore reproduces travel, finances, and bus passengers', () => {
  const city = new CityEngine(27); city.advance(140); const snapshot = city.checkpoint(); city.advance(220); const after = city.checkpoint(); city.restore(snapshot); assert.equal(city.paused, true); city.advance(220); assert.equal(city.checkpoint(), after);
});
test('closing Market Street reroutes journeys without disconnecting buildings', () => {
  const city = new CityEngine(); assert.deepEqual(city.route(30, 31), [30, 31]); city.advance(110); city.setPolicy('roadClosed', true);
  const route = city.route(30, 31); assert.ok(route.length > 2);
  for (let i = 1; i < route.length; i++) assert.notEqual(edgeKey(route[i - 1], route[i]), CLOSED_ROAD);
  for (const b of BUILDINGS) assert.ok(city.route(0, b.node).length);
  city.advance(180); invariants(city);
});
test('buses board residents, collect fares, and release passengers when withdrawn', () => {
  const city = new CityEngine(); let riders = 0;
  for (let i = 0; i < 150; i++) { city.advance(1); riders = Math.max(riders, city.metrics().riding); }
  assert.ok(riders > 0, 'No one boarded a bus'); assert.ok(city.state.fares > 0);
  city.setPolicy('buses', 0); assert.equal(city.state.buses.length, 0); assert.ok(city.state.citizens.every(c => c.trip?.mode !== 'bus')); invariants(city);
});
test('free frequent transit attracts car owners and collects no fares', () => {
  const normal = new CityEngine(), free = new CityEngine(); free.setPolicy('buses', 6); free.setPolicy('fare', 0);
  let normalCarTrips = 0, freeCarTrips = 0, freeBusUse = 0;
  for (let i = 0; i < 140; i++) { normal.advance(1); free.advance(1); normalCarTrips += normal.metrics().driving; freeCarTrips += free.metrics().driving; freeBusUse += free.metrics().riding; }
  assert.ok(freeCarTrips < normalCarTrips); assert.ok(freeBusUse > 0); assert.equal(free.state.fares, 0);
});
test('rain increases average commute time', () => {
  const dry = new CityEngine(), wet = new CityEngine(); wet.setPolicy('rain', true); dry.advance(480); wet.advance(480);
  assert.ok(wet.metrics().commute > dry.metrics().commute, `${wet.metrics().commute} <= ${dry.metrics().commute}`);
});
test('work generates wages and taxes; service funding affects treasury and happiness', () => {
  const low = new CityEngine(), high = new CityEngine(); low.setPolicy('services', 0); high.setPolicy('services', 100); low.advance(700); high.advance(700);
  assert.ok(high.state.wages > 0); assert.ok(high.metrics().happiness > low.metrics().happiness); assert.ok(high.state.treasury < low.state.treasury);
  const noTax = new CityEngine(); noTax.setPolicy('tax', 0); noTax.setPolicy('services', 0); noTax.advance(700); assert.ok(low.state.treasury > noTax.state.treasury);
});
test('residents complete daily routines over several days without invalid state', () => {
  const city = new CityEngine(); let shopping = false, park = false, work = false, returning = false;
  for (let i = 0; i < 192; i++) { city.advance(15); invariants(city); shopping ||= city.state.citizens.some(c => c.activity === 'shopping'); park ||= city.state.citizens.some(c => c.activity === 'relaxing'); work ||= city.state.citizens.some(c => c.activity === 'work'); returning ||= city.state.citizens.some(c => c.log.some(e => e.text.includes('Home again'))); }
  assert.ok(shopping && park && work && returning); assert.ok(city.state.trips > city.metrics().population * 3); assert.ok(city.state.history.length <= 192);
});
test('invalid policy values and playback speeds leave settings unchanged', () => {
  const city = new CityEngine(); const before = city.checkpoint(); assert.throws(() => city.setPolicy('buses', -1)); assert.throws(() => city.setPolicy('buses', 1.5)); assert.throws(() => city.setPolicy('fare', NaN)); assert.throws(() => city.setSpeed(900)); assert.throws(() => city.advance(Infinity)); assert.equal(city.checkpoint(), before);
});
test('reset recreates the exact initial town and unpauses', () => {
  const city = new CityEngine(89), initial = city.checkpoint(); city.advance(90); city.setPolicy('buses', 0); city.setPaused(true); city.reset(); assert.equal(city.checkpoint(), initial); assert.equal(city.paused, false); assert.ok(city.route(0, NODES.length - 1).length);
});
console.log(`\n${passed} city behavior checks passed.`);
