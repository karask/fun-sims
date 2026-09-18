export type BuildingKind = 'home' | 'office' | 'shop' | 'park' | 'service';
export type TravelMode = 'walk' | 'car' | 'bus';
export type Activity = 'home' | 'work' | 'shopping' | 'relaxing' | 'traveling';
export type Layer = 'city' | 'traffic' | 'happiness' | 'pollution';
export interface Point { x: number; y: number }
export interface Building extends Point { id: number; kind: BuildingKind; name: string; node: number; district: string; capacity: number }
export interface Road { a: number; b: number; key: string }
export interface Trip {
  destination: number; purpose: Activity; mode: TravelMode; stage: 'direct' | 'to-stop' | 'waiting' | 'riding' | 'from-stop';
  path: Point[]; index: number; started: number; startStop: number; endStop: number; busId: number | null;
}
export interface Citizen extends Point {
  id: number; name: string; age: number; home: number; job: number | null; ownsCar: boolean; offset: number;
  money: number; happiness: number; energy: number; hunger: number; activity: Activity; location: number;
  trip: Trip | null; workDay: number; shopDay: number; parkDay: number; arrived: number; commute: number;
  reason: string; log: { time: number; text: string }[];
}
export interface Bus extends Point { id: number; routeIndex: number; dwell: number; riders: number[] }
export interface Policies { buses: number; fare: number; tax: number; services: number; rain: boolean; roadClosed: boolean }
export interface Metrics { population: number; happiness: number; traffic: number; pollution: number; commute: number; employed: number; walking: number; driving: number; riding: number; waiting: number; trips: number }
export interface Sample { time: number; happiness: number; traffic: number; commute: number; treasury: number }
export interface CityState {
  version: 1; seed: number; rng: number; time: number; citizens: Citizen[]; buses: Bus[]; policies: Policies;
  treasury: number; fares: number; wages: number; trips: number; commuteTimes: number[];
  events: { time: number; text: string }[]; history: Sample[];
}
export const WIDTH = 1230, HEIGHT = 850, STEP = .25;
export const NODES: Point[] = Array.from({ length: 63 }, (_, i) => ({ x: 95 + (i % 9) * 130, y: 95 + Math.floor(i / 9) * 110 }));
export const edgeKey = (a: number, b: number) => `${Math.min(a, b)}-${Math.max(a, b)}`;
export const ROADS: Road[] = NODES.flatMap((_, i) => [i % 9 < 8 ? i + 1 : -1, i < 54 ? i + 9 : -1].filter(n => n >= 0).map(n => ({ a: i, b: n, key: edgeKey(i, n) })));
export const CLOSED_ROAD = edgeKey(30, 31);
export const BUS_ROUTE = [10, 11, 12, 13, 14, 15, 16, 25, 34, 43, 42, 41, 40, 39, 38, 37, 28, 19];
export const BUS_STOPS = [10, 13, 16, 34, 43, 40, 37, 19];
export const DEFAULT_POLICIES: Policies = { buses: 3, fare: 2, tax: 15, services: 70, rain: false, roadClosed: false };
const layout: BuildingKind[][] = [
  ['home','home','home','park','home','home','home','home'],
  ['home','shop','office','office','office','shop','park','home'],
  ['home','park','office','service','office','office','shop','home'],
  ['home','shop','office','park','office','service','office','home'],
  ['home','home','shop','office','shop','park','home','home'],
  ['home','home','home','park','home','home','home','home'],
];
const names: Record<BuildingKind, string[]> = { home: ['Linden House','Maple Court','Willow Apartments','Cedar Place'], office: ['Design Studio','Workshop','Northstar Office','Market Works'], shop: ['Corner Grocer','Daily Bread','Market Café','Green Basket'], park: ['Pocket Garden','Commons','Linden Park','Reading Garden'], service: ['Community Clinic','Civic Center'] };
export const BUILDINGS: Building[] = layout.flatMap((row, r) => row.map((kind, c) => {
  const id = r * 8 + c;
  return { id, kind, name: `${names[kind][id % names[kind].length]} ${kind === 'home' ? id + 1 : ''}`.trim(), x: 160 + c * 130, y: 150 + r * 110, node: r * 9 + c, district: r < 2 ? (c < 4 ? 'Linden Quarter' : 'East Gardens') : r < 4 ? 'Market District' : 'Southside', capacity: kind === 'home' ? 8 : kind === 'office' ? 22 : kind === 'shop' ? 10 : 0 };
}));
const firstNames = ['Maya','Theo','Alex','Sofia','Noah','Leila','Leo','Aria','Sam','Iris','Omar','Ada','Eli','Zoe','Kai','Nina','Luca','Ava','Finn','Mila','Jude','Emma','Max','Rosa'];
const lastNames = ['Chen','Patel','Rivera','Morgan','Kim','Silva','Reed','Park','Costa','Taylor','Haddad','Ellis'];
const clamp = (v: number, a = 0, b = 100) => Math.max(a, Math.min(b, v));
export const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
export function clockTime(time: number) { const m = Math.floor(time % 1440); return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; }
export function dayNumber(time: number) { return Math.floor(time / 1440) + 1; }

// Fixed timesteps and seeded choices make reset/checkpoint comparisons repeatable.
export class CityEngine {
  state: CityState;
  paused = false;
  speed = 1;
  private accumulated = 0;
  private roads = new Map<string, number>();
  constructor(seed = 1847) {
    this.state = { version: 1, seed: seed >>> 0, rng: seed >>> 0, time: 420, citizens: [], buses: [], policies: { ...DEFAULT_POLICIES }, treasury: 18000, fares: 0, wages: 0, trips: 0, commuteTimes: [], events: [], history: [] };
    const jobs = BUILDINGS.filter(b => b.kind === 'office' || b.kind === 'shop');
    BUILDINGS.filter(b => b.kind === 'home').forEach(home => {
      for (let n = 0; n < 8; n++) {
        const id = this.state.citizens.length;
        const job = id % 9 === 0 ? null : jobs[Math.floor(this.random() * jobs.length)].id;
        this.state.citizens.push({ id, name: `${firstNames[id % firstNames.length]} ${lastNames[Math.floor(id / firstNames.length) % lastNames.length]}`, age: 21 + Math.floor(this.random() * 48), home: home.id, job, ownsCar: this.random() < .49, offset: Math.floor(this.random() * 85), x: home.x + (n % 4 - 1.5) * 10, y: home.y + (Math.floor(n / 4) - .5) * 12, money: 130 + this.random() * 240, happiness: 70 + this.random() * 15, energy: 90, hunger: 15, activity: 'home', location: home.id, trip: null, workDay: -1, shopDay: -1, parkDay: -1, arrived: 420, commute: 0, reason: 'At home, getting ready for the day.', log: [] });
      }
    });
    this.syncBuses();
    this.event('Good morning, Linden. The first commuters are getting ready.');
    this.sample();
  }
  private random() { this.state.rng = (Math.imul(1664525, this.state.rng) + 1013904223) >>> 0; return this.state.rng / 4294967296; }
  event(text: string) { this.state.events.unshift({ time: this.state.time, text }); this.state.events = this.state.events.slice(0, 30); }
  private explain(c: Citizen, text: string) { c.reason = text; c.log.unshift({ time: this.state.time, text }); c.log = c.log.slice(0, 8); }
  reset(seed = this.state.seed) { this.state = new CityEngine(seed).state; this.accumulated = 0; this.paused = false; this.roads.clear(); }
  checkpoint() { return JSON.stringify(this.state); }
  restore(snapshot: string) {
    const s = JSON.parse(snapshot) as CityState;
    if (s.version !== 1 || !Array.isArray(s.citizens) || !Number.isFinite(s.time)) throw new Error('This city snapshot could not be restored.');
    this.state = s; this.accumulated = 0; this.roads.clear(); this.paused = true;
  }
  setPolicy<K extends keyof Policies>(key: K, value: Policies[K]) {
    const numeric: Partial<Record<keyof Policies, [number, number]>> = { buses: [0, 6], fare: [0, 6], tax: [0, 35], services: [0, 100] };
    if (numeric[key]) { const [min, max] = numeric[key]!; if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max || (key === 'buses' && !Number.isInteger(value))) throw new Error('Policy value is out of range.'); }
    else if (typeof value !== 'boolean') throw new Error('Policy must be on or off.');
    this.state.policies[key] = value;
    if (key === 'buses') this.syncBuses();
    if (key === 'roadClosed') {
      for (const c of this.state.citizens) if (c.trip && c.trip.mode !== 'bus') {
        c.trip.path = this.makePath(c, BUILDINGS[c.trip.destination]); c.trip.index = 0;
      }
      this.event(value ? 'Market Street is closed. New routes avoid the blocked section.' : 'Market Street has reopened.');
    }
    if (key === 'rain') this.event(value ? 'Rain slows traffic and walking. Indoor time feels more appealing.' : 'The rain has cleared.');
  }
  private syncBuses() {
    const count = this.state.policies.buses;
    while (this.state.buses.length > count) {
      const bus = this.state.buses.pop()!;
      for (const id of bus.riders) { const c = this.state.citizens[id]; if (c.trip) this.walkInstead(c, 'This bus left service. Continuing on foot.'); }
    }
    for (let id = this.state.buses.length; id < count; id++) {
      const routeIndex = Math.floor(id * BUS_ROUTE.length / Math.max(1, count));
      this.state.buses.push({ id, ...NODES[BUS_ROUTE[routeIndex]], routeIndex, dwell: 1, riders: [] });
    }
    if (!count) for (const c of this.state.citizens) if (c.trip?.mode === 'bus') this.walkInstead(c, 'The bus service is off. Walking to my destination.');
  }
  private nearestNode(p: Point) { let best = 0; for (let i = 1; i < NODES.length; i++) if (distance(p, NODES[i]) < distance(p, NODES[best])) best = i; return best; }
  route(start: number, end: number): number[] {
    const queue = [start], previous = new Map<number, number>([[start, -1]]);
    for (let i = 0; i < queue.length; i++) {
      const n = queue[i]; if (n === end) break;
      const next = [n % 9 > 0 ? n - 1 : -1, n % 9 < 8 ? n + 1 : -1, n >= 9 ? n - 9 : -1, n < 54 ? n + 9 : -1];
      for (const to of next) if (to >= 0 && !previous.has(to) && !(this.state.policies.roadClosed && edgeKey(n, to) === CLOSED_ROAD)) { previous.set(to, n); queue.push(to); }
    }
    if (!previous.has(end)) return [];
    const path = [end]; while (path[0] !== start) path.unshift(previous.get(path[0])!); return path;
  }
  private makePath(from: Point, destination: Building): Point[] { return [...this.route(this.nearestNode(from), destination.node).map(i => ({ ...NODES[i] })), { x: destination.x, y: destination.y }]; }
  private nearestStop(p: Point) { return BUS_STOPS.reduce((a, b) => distance(p, NODES[a]) < distance(p, NODES[b]) ? a : b); }
  private startTrip(c: Citizen, destination: Building, purpose: Activity) {
    const startStop = this.nearestStop(c), endStop = this.nearestStop(destination), dist = distance(c, destination);
    const busAccess = distance(c, NODES[startStop]) + distance(destination, NODES[endStop]);
    const canBus = this.state.policies.buses > 0 && c.money >= this.state.policies.fare && startStop !== endStop && busAccess < dist * .85;
    const prefersBus = canBus && (!c.ownsCar || this.state.policies.fare === 0 || this.state.policies.buses >= 5);
    const mode: TravelMode = dist < 200 ? 'walk' : prefersBus ? 'bus' : c.ownsCar && c.money > 5 ? 'car' : 'walk';
    c.activity = 'traveling';
    c.trip = { destination: destination.id, purpose, mode, stage: mode === 'bus' ? 'to-stop' : 'direct', path: mode === 'bus' ? this.route(this.nearestNode(c), startStop).map(n => ({ ...NODES[n] })) : this.makePath(c, destination), index: 0, started: this.state.time, startStop, endStop, busId: null };
    if (mode === 'car') c.money -= 1.5;
    this.explain(c, `${purpose === 'work' ? 'Heading to work' : purpose === 'shopping' ? 'Picking up food' : purpose === 'relaxing' ? 'Taking a break' : 'Heading home'} at ${destination.name}. ${mode === 'car' ? 'Taking the car for this longer trip.' : mode === 'bus' ? `Taking the Loop bus${this.state.policies.fare === 0 ? ' — the fare is free' : ''}.` : dist < 200 ? 'It is close enough to walk.' : 'Walking fits my budget and available transport.'}`);
  }
  private walkInstead(c: Citizen, reason: string) { if (!c.trip) return; c.trip.mode = 'walk'; c.trip.stage = 'direct'; c.trip.busId = null; c.trip.path = this.makePath(c, BUILDINGS[c.trip.destination]); c.trip.index = 0; this.explain(c, reason); }
  private move(p: Point, target: Point, amount: number) { const d = distance(p, target); if (d <= amount) { p.x = target.x; p.y = target.y; return true; } p.x += (target.x - p.x) / d * amount; p.y += (target.y - p.y) / d * amount; return false; }
  private arrive(c: Citizen) {
    const t = c.trip!; c.location = t.destination; c.activity = t.purpose; c.arrived = this.state.time;
    const elapsed = this.state.time - t.started; this.state.trips++;
    if (t.purpose === 'work') { c.commute = elapsed; this.state.commuteTimes.push(elapsed); this.state.commuteTimes = this.state.commuteTimes.slice(-250); c.happiness = clamp(c.happiness - Math.max(0, elapsed - 45) * .07); }
    c.trip = null;
    if (c.activity === 'shopping') { const price = 9; if (c.money >= price) { c.money -= price; c.hunger = 0; c.happiness = clamp(c.happiness + 3); this.explain(c, `Bought groceries at ${BUILDINGS[c.location].name}. Food cost ¤9.`); } else this.explain(c, 'Money is tight. I could not afford groceries today.'); }
    else if (c.activity === 'work') this.explain(c, `Arrived at work after ${Math.round(elapsed)} minutes${this.state.time % 1440 > 540 + c.offset ? '. The commute made me late.' : '. On time for my shift.'}`);
    else this.explain(c, c.activity === 'home' ? 'Home again. Time to eat and recharge.' : `Enjoying ${BUILDINGS[c.location].name}. A little green space helps.`);
  }
  private tickBus(bus: Bus) {
    const node = BUS_ROUTE[bus.routeIndex];
    if (bus.dwell > 0) {
      bus.dwell -= STEP;
      for (const id of [...bus.riders]) { const c = this.state.citizens[id]; if (c.trip?.endStop === node) { bus.riders = bus.riders.filter(n => n !== id); c.trip.stage = 'from-stop'; c.trip.busId = null; c.trip.path = this.makePath(c, BUILDINGS[c.trip.destination]); c.trip.index = 0; this.explain(c, 'Off the bus. Walking the last stretch.'); } }
      for (const c of this.state.citizens) if (c.trip?.stage === 'waiting' && c.trip.startStop === node && bus.riders.length < 22) {
        if (c.money < this.state.policies.fare) { this.walkInstead(c, 'The new bus fare is above my budget. Walking instead.'); continue; }
        bus.riders.push(c.id); c.trip.stage = 'riding'; c.trip.busId = bus.id; c.money -= this.state.policies.fare; this.state.fares += this.state.policies.fare; this.state.treasury += this.state.policies.fare;
        this.explain(c, `On Loop bus ${bus.id + 1}. Next: ${BUILDINGS[c.trip.destination].name}.`);
      }
    } else {
      const next = (bus.routeIndex + 1) % BUS_ROUTE.length;
      const load = this.roads.get(edgeKey(node, BUS_ROUTE[next])) ?? 0;
      if (this.move(bus, NODES[BUS_ROUTE[next]], 15 * STEP / (1 + load * .2) * (this.state.policies.rain ? .75 : 1))) { bus.routeIndex = next; bus.dwell = BUS_STOPS.includes(BUS_ROUTE[next]) ? 1.5 : 0; }
    }
    for (const id of bus.riders) { const c = this.state.citizens[id]; c.x = bus.x; c.y = bus.y; }
  }
  private step() {
    const before = this.state.time; this.state.time += STEP;
    const minute = this.state.time % 1440, day = Math.floor(this.state.time / 1440), p = this.state.policies;
    this.roads.clear();
    for (const c of this.state.citizens) if (c.trip?.mode === 'car') { const a = this.nearestNode(c), target = c.trip.path[c.trip.index]; if (target) { const b = this.nearestNode(target); const key = edgeKey(a, b); this.roads.set(key, (this.roads.get(key) ?? 0) + 1); } }
    for (const bus of this.state.buses) this.tickBus(bus);
    for (const c of this.state.citizens) {
      c.hunger = clamp(c.hunger + STEP * .025); c.energy = clamp(c.energy + STEP * (c.activity === 'home' ? .1 : -.035));
      if (c.activity === 'home' && (minute < 460 || minute > 1140)) c.hunger = clamp(c.hunger - STEP * .08);
      const mood = 63 + p.services * .2 + (c.activity === 'relaxing' && !p.rain ? 14 : 0) - c.hunger * .18 - Math.max(0, 35 - c.energy) * .3 - (c.money < 20 ? 14 : 0) - (p.rain ? 4 : 0) - Math.max(0, c.commute - 45) * .12;
      c.happiness = clamp(c.happiness + (mood - c.happiness) * STEP * .006);
      if (c.trip) {
        const t = c.trip;
        if (t.stage === 'waiting') { if (this.state.time - t.started > 85) this.walkInstead(c, 'The wait is too long. Continuing on foot.'); continue; }
        if (t.stage === 'riding') continue;
        const target = t.path[t.index];
        const load = target ? this.roads.get(edgeKey(this.nearestNode(c), this.nearestNode(target))) ?? 0 : 0;
        const velocity = t.mode === 'car' ? 18 / (1 + load * .32) : 5.5;
        if (!target || this.move(c, target, velocity * STEP * (p.rain ? .72 : 1))) {
          t.index++;
          if (t.index >= t.path.length) { if (t.stage === 'to-stop') { t.stage = 'waiting'; this.explain(c, 'Waiting at the Loop bus stop.'); } else this.arrive(c); }
        }
        continue;
      }
      if (c.activity === 'work') { const wage = .24 * STEP, tax = wage * p.tax / 100; c.money += wage - tax; this.state.treasury += tax; this.state.wages += wage; }
      if (c.job !== null && c.workDay !== day && minute >= 450 + c.offset && minute < 900) { c.workDay = day; this.startTrip(c, BUILDINGS[c.job], 'work'); }
      else if (c.activity === 'work' && minute >= 1020 + c.offset) { const shops = BUILDINGS.filter(b => b.kind === 'shop'); const shop = shops.reduce((a, b) => distance(c, a) < distance(c, b) ? a : b); c.shopDay = day; this.startTrip(c, shop, 'shopping'); }
      else if (c.activity === 'shopping' && this.state.time - c.arrived > 20) { if (c.parkDay !== day && !p.rain && minute < 1230) { const parks = BUILDINGS.filter(b => b.kind === 'park'); c.parkDay = day; this.startTrip(c, parks.reduce((a, b) => distance(c, a) < distance(c, b) ? a : b), 'relaxing'); } else this.startTrip(c, BUILDINGS[c.home], 'home'); }
      else if (c.activity === 'relaxing' && (this.state.time - c.arrived > 65 || p.rain)) this.startTrip(c, BUILDINGS[c.home], 'home');
      else if (c.job === null && c.parkDay !== day && minute > 590 + c.offset && minute < 1100) { const parks = BUILDINGS.filter(b => b.kind === 'park'); c.parkDay = day; this.startTrip(c, parks[Math.floor(this.random() * parks.length)], 'relaxing'); }
      else if (c.job === null && c.shopDay !== day && minute > 1050 && minute < 1250) { const shops = BUILDINGS.filter(b => b.kind === 'shop'); c.shopDay = day; this.startTrip(c, shops[Math.floor(this.random() * shops.length)], 'shopping'); }
    }
    this.state.treasury -= STEP * (p.services * .006 + p.buses * .075);
    if (Math.floor(before / 1440) !== day) {
      for (const c of this.state.citizens) { c.money = Math.max(-300, c.money - 32); if (c.job === null) c.money += p.services * .35; }
      this.event(`Day ${day + 1}. Rent and household bills were paid. ${p.services > 0 ? 'Community support reached residents without a job.' : 'Community support is currently unfunded.'}`);
    }
    if (Math.floor(before / 15) !== Math.floor(this.state.time / 15)) this.sample();
  }
  advance(minutes: number) { if (!Number.isFinite(minutes) || minutes < 0 || minutes > 1440 * 7) throw new Error('Advance between zero and seven days.'); this.accumulated += minutes; while (this.accumulated + 1e-9 >= STEP) { this.step(); this.accumulated -= STEP; } }
  tick(seconds: number) { if (!this.paused && Number.isFinite(seconds) && seconds > 0) this.advance(Math.min(seconds, .15) * 8 * this.speed); }
  roadLoad(key: string) { return this.roads.get(key) ?? 0; }
  metrics(): Metrics {
    const cs = this.state.citizens, cars = cs.filter(c => c.trip?.mode === 'car').length;
    const density = [...this.roads.values()];
    return { population: cs.length, happiness: cs.reduce((s, c) => s + c.happiness, 0) / cs.length, traffic: density.length ? clamp(density.reduce((s, n) => s + Math.max(0, n - 1), 0) / Math.max(1, cars) * 100) : 0, pollution: clamp(cars * 1.2 + this.state.buses.length * 1.8), commute: this.state.commuteTimes.length ? this.state.commuteTimes.reduce((s, n) => s + n, 0) / this.state.commuteTimes.length : 0, employed: cs.filter(c => c.job !== null).length, walking: cs.filter(c => c.trip && (c.trip.mode === 'walk' || ['to-stop','from-stop'].includes(c.trip.stage))).length, driving: cars, riding: cs.filter(c => c.trip?.stage === 'riding').length, waiting: cs.filter(c => c.trip?.stage === 'waiting').length, trips: this.state.trips };
  }
  private sample() { const m = this.metrics(); this.state.history.push({ time: this.state.time, happiness: m.happiness, traffic: m.traffic, commute: m.commute, treasury: this.state.treasury }); this.state.history = this.state.history.slice(-192); }
}
