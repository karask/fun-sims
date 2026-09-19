import { z } from 'zod';
export type BuildingKind = 'home' | 'office' | 'shop' | 'park' | 'service' | 'empty';
export type TravelMode = 'walk' | 'car' | 'bus';
export type Activity = 'home' | 'work' | 'shopping' | 'relaxing' | 'traveling';
export type Layer = 'city' | 'traffic' | 'happiness' | 'pollution';
export interface Point { x: number; y: number }
export interface Building extends Point { id: number; kind: BuildingKind; name: string; node: number; district: string; capacity: number; rent: number; cash: number; open: boolean; badDays: number }
export interface Road { a: number; b: number; key: string }
export interface Trip {
  destination: number; purpose: Activity; mode: TravelMode; stage: 'direct' | 'to-stop' | 'waiting' | 'riding' | 'from-stop' | 'parking' | 'blocked';
  path: Point[]; index: number; started: number; startStop: number; endStop: number; busId: number | null; parkingUntil?: number;
}
export interface Citizen extends Point {
  id: number; active: boolean; strugglingDays: number; name: string; age: number; home: number; job: number | null; ownsCar: boolean; offset: number;
  money: number; happiness: number; energy: number; hunger: number; activity: Activity; location: number;
  trip: Trip | null; workDay: number; shopDay: number; parkDay: number; arrived: number; commute: number;
  reason: string; log: { time: number; text: string }[];
}
export interface Bus extends Point { id: number; routeIndex: number; dwell: number; riders: number[] }
export interface Policies { buses: number; fare: number; tax: number; services: number; rain: boolean; roadClosed: boolean }
export interface Metrics { population: number; happiness: number; traffic: number; pollution: number; commute: number; employed: number; walking: number; driving: number; riding: number; waiting: number; trips: number }
export interface Sample { time: number; happiness: number; traffic: number; commute: number; treasury: number }
export interface CityState {
  version: 2; name: string; buildings: Building[]; roads: string[]; busStops: number[]; revision: number; arrivals: number; departures: number; remainder: number; seed: number; rng: number; time: number; citizens: Citizen[]; buses: Bus[]; policies: Policies;
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
export const SIGNALS = [10, 13, 16, 28, 31, 34, 37, 40, 43];
export const BUILD_COST: Record<BuildingKind, number> = { home: 1200, office: 2400, shop: 1500, park: 600, service: 2200, empty: 120 };
export const DEFAULT_POLICIES: Policies = { buses: 3, fare: 2, tax: 15, services: 70, rain: false, roadClosed: false };
const layout: BuildingKind[][] = [
  ['home','home','home','park','home','home','home','home'],
  ['home','shop','office','office','office','shop','park','home'],
  ['home','park','office','service','office','office','shop','home'],
  ['home','shop','office','park','office','service','office','home'],
  ['home','home','shop','office','shop','park','home','home'],
  ['home','home','home','park','home','home','home','home'],
];
const names: Record<BuildingKind, string[]> = { home: ['Linden House','Maple Court','Willow Apartments','Cedar Place'], office: ['Design Studio','Workshop','Northstar Office','Market Works'], shop: ['Corner Grocer','Daily Bread','Market Café','Green Basket'], park: ['Pocket Garden','Commons','Linden Park','Reading Garden'], service: ['Community Clinic','Civic Center'], empty: ['Vacant plot'] };
export const BUILDINGS: Building[] = layout.flatMap((row, r) => row.map((kind, c) => {
  const id = r * 8 + c;
  return { id, kind, rent: 20, cash: 1200, open: true, badDays: 0, name: `${names[kind][id % names[kind].length]} ${kind === 'home' ? id + 1 : ''}`.trim(), x: 160 + c * 130, y: 150 + r * 110, node: r * 9 + c, district: r < 2 ? (c < 4 ? 'Linden Quarter' : 'East Gardens') : r < 4 ? 'Market District' : 'Southside', capacity: kind === 'home' ? 8 : kind === 'office' ? 22 : kind === 'shop' ? 10 : 0 };
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
  private accessCache = new Map<number, boolean>();
  private accessKey = '';
  private accessState: CityState | null = null;
  private roads = new Map<string, number>();
  constructor(seed = 1847) {
    this.state = { version: 2, name: 'Linden', buildings: structuredClone(BUILDINGS), roads: ROADS.map(r => r.key), busStops: [...BUS_STOPS], revision: 0, arrivals: 0, departures: 0, remainder: 0, seed: seed >>> 0, rng: seed >>> 0, time: 420, citizens: [], buses: [], policies: { ...DEFAULT_POLICIES }, treasury: 18000, fares: 0, wages: 0, trips: 0, commuteTimes: [], events: [], history: [] };
    const jobs = this.state.buildings.filter(b => b.kind === 'office' || b.kind === 'shop' && b.open);
    this.state.buildings.filter(b => b.kind === 'home').forEach(home => {
      for (let n = 0; n < 8; n++) {
        const id = this.state.citizens.length;
        const job = id % 9 === 0 ? null : jobs[Math.floor(this.random() * jobs.length)].id;
        this.state.citizens.push({ id, active: true, strugglingDays: 0, name: `${firstNames[id % firstNames.length]} ${lastNames[Math.floor(id / firstNames.length) % lastNames.length]}`, age: 21 + Math.floor(this.random() * 48), home: home.id, job, ownsCar: this.random() < .49, offset: Math.floor(this.random() * 85), x: home.x + (n % 4 - 1.5) * 10, y: home.y + (Math.floor(n / 4) - .5) * 12, money: 130 + this.random() * 240, happiness: 70 + this.random() * 15, energy: 90, hunger: 15, activity: 'home', location: home.id, trip: null, workDay: -1, shopDay: -1, parkDay: -1, arrived: 420, commute: 0, reason: 'At home, getting ready for the day.', log: [] });
      }
    });
    const employed = new Map<number, number>();
    for (const c of this.state.citizens) if (c.job !== null) { if ((employed.get(c.job) ?? 0) >= this.state.buildings[c.job].capacity) c.job = null; else employed.set(c.job, (employed.get(c.job) ?? 0) + 1); }
    this.syncBuses();
    this.event('Good morning, Linden. The first commuters are getting ready.');
    this.sample();
  }
  private random() { this.state.rng = (Math.imul(1664525, this.state.rng) + 1013904223) >>> 0; return this.state.rng / 4294967296; }
  setPaused(value: boolean) { this.paused = value; }
  setSpeed(value: number) { if (![1, 2, 4, 8].includes(value)) throw new Error('Choose a supported simulation speed.'); this.speed = value; }
  event(text: string) { this.state.events.unshift({ time: this.state.time, text }); this.state.events = this.state.events.slice(0, 30); }
  private explain(c: Citizen, text: string) { c.reason = text; c.log.unshift({ time: this.state.time, text }); c.log = c.log.slice(0, 8); }
  reset(seed = this.state.seed) { this.state = new CityEngine(seed).state; this.accumulated = 0; this.paused = false; this.roads.clear(); }
  checkpoint() { this.state.remainder = this.accumulated; return JSON.stringify(this.state); }
  restore(snapshot: string) {
    const s = validateSnapshot(snapshot);
    this.state = s; this.accumulated = s.remainder; this.roads.clear(); this.paused = true;
  }
  setPolicy<K extends keyof Policies>(key: K, value: Policies[K]) {
    const numeric: Partial<Record<keyof Policies, [number, number]>> = { buses: [0, 6], fare: [0, 6], tax: [0, 35], services: [0, 100] };
    if (numeric[key]) { const [min, max] = numeric[key]!; if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max || (key === 'buses' && !Number.isInteger(value))) throw new Error('Policy value is out of range.'); }
    else if (typeof value !== 'boolean') throw new Error('Policy must be on or off.');
    this.state.policies[key] = value;
    if (key === 'buses') this.syncBuses();
    if (key === 'roadClosed') {
      for (const c of this.state.citizens) if (c.trip && c.trip.mode !== 'bus') {
        c.trip.path = this.makePath(c, this.state.buildings[c.trip.destination]); c.trip.index = 0; if (c.trip.stage === 'blocked' && c.trip.path.length) c.trip.stage = 'direct';
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
  private nearestNode(p: Point) { return clamp(Math.round((p.y - 95) / 110 - 1e-9), 0, 6) * 9 + clamp(Math.round((p.x - 95) / 130 - 1e-9), 0, 8); }
  private currentRoad(c: Citizen) {
    const trip = c.trip; if (!trip || trip.index < 1) return null;
    const from = trip.path[trip.index - 1], to = trip.path[trip.index]; if (!to) return null;
    const a = this.nearestNode(from), b = this.nearestNode(to);
    return a !== b && distance(from, NODES[a]) < 1 && distance(to, NODES[b]) < 1 ? edgeKey(a, b) : null;
  }
  route(start: number, end: number): number[] {
    const queue = [start], previous = new Map<number, number>([[start, -1]]);
    for (let i = 0; i < queue.length; i++) {
      const n = queue[i]; if (n === end) break;
      const next = [n % 9 > 0 ? n - 1 : -1, n % 9 < 8 ? n + 1 : -1, n >= 9 ? n - 9 : -1, n < 54 ? n + 9 : -1];
      for (const to of next) if (to >= 0 && this.state.roads.includes(edgeKey(n, to)) && !previous.has(to) && !(this.state.policies.roadClosed && edgeKey(n, to) === CLOSED_ROAD)) { previous.set(to, n); queue.push(to); }
    }
    if (!previous.has(end)) return [];
    const path = [end]; while (path[0] !== start) path.unshift(previous.get(path[0])!); return path;
  }
  private makePath(from: Point, destination: Building): Point[] { const route = this.route(this.nearestNode(from), destination.node); return route.length ? [...route.map(i => ({ ...NODES[i] })), { x: destination.x, y: destination.y }] : []; }
  private nearestStop(p: Point) { return (this.state.busStops.length ? this.state.busStops : [BUS_ROUTE[0]]).reduce((a, b) => distance(p, NODES[a]) < distance(p, NODES[b]) ? a : b); }
  private startTrip(c: Citizen, destination: Building | undefined, purpose: Activity) {
    if (!destination || destination.kind === 'empty' || !destination.open || (purpose === 'shopping' && destination.kind !== 'shop') || (purpose === 'relaxing' && destination.kind !== 'park')) { destination = this.state.buildings[c.home]; purpose = 'home'; }
    const path = this.makePath(c, destination);
    if (!path.length) { c.trip = { destination: destination.id, purpose, mode: 'walk', stage: 'blocked', path: [], index: 0, started: this.state.time, startStop: 0, endStop: 0, busId: null }; c.activity = 'traveling'; this.explain(c, 'No connected road reaches my destination. Waiting for road access.'); return; }
    const startStop = this.nearestStop(c), endStop = this.nearestStop(destination), dist = distance(c, destination);
    const busAccess = distance(c, NODES[startStop]) + distance(destination, NODES[endStop]);
    const canBus = this.state.busStops.length >= 2 && this.state.policies.buses > 0 && c.money >= this.state.policies.fare && startStop !== endStop && busAccess < dist * .85;
    const roadDistance = path.reduce((n, point, i) => n + distance(i ? path[i - 1] : c, point), 0);
    const walkingTime = roadDistance / 5.5;
    const drivingTime = roadDistance / 18 * (1 + this.metrics().traffic / 100) + this.parkingDelay(destination.id) + 8 * (1.5 + this.parkingCost(destination.id));
    const busTime = busAccess / 5.5 + 75 / Math.max(1, this.state.policies.buses) + roadDistance / 15 + this.state.policies.fare * 8;
    const prefersBus = canBus && (!c.ownsCar || busTime < drivingTime || this.state.policies.fare === 0);
    const mode: TravelMode = dist < 200 ? 'walk' : prefersBus ? 'bus' : c.ownsCar && c.money > 5 + this.parkingCost(destination.id) && drivingTime < walkingTime + 25 ? 'car' : 'walk';
    c.activity = 'traveling';
    c.trip = { destination: destination.id, purpose, mode, stage: mode === 'bus' ? 'to-stop' : 'direct', path: mode === 'bus' ? this.route(this.nearestNode(c), startStop).map(n => ({ ...NODES[n] })) : this.makePath(c, destination), index: 0, started: this.state.time, startStop, endStop, busId: null };
    if (mode === 'car') c.money -= 1.5;
    this.explain(c, `${purpose === 'work' ? 'Heading to work' : purpose === 'shopping' ? 'Picking up food' : purpose === 'relaxing' ? 'Taking a break' : 'Heading home'} at ${destination.name}. ${mode === 'car' ? 'Taking the car for this longer trip.' : mode === 'bus' ? `Taking the Loop bus${this.state.policies.fare === 0 ? ' — the fare is free' : ''}.` : dist < 200 ? 'It is close enough to walk.' : 'Walking fits my budget and available transport.'}`);
  }
  private walkInstead(c: Citizen, reason: string) { if (!c.trip) return; c.trip.mode = 'walk'; c.trip.stage = 'direct'; c.trip.busId = null; c.trip.path = this.makePath(c, this.state.buildings[c.trip.destination]); c.trip.index = 0; this.explain(c, reason); }
  private move(p: Point, target: Point, amount: number) { const d = distance(p, target); if (d <= amount) { p.x = target.x; p.y = target.y; return true; } p.x += (target.x - p.x) / d * amount; p.y += (target.y - p.y) / d * amount; return false; }
  private arrive(c: Citizen) {
    const t = c.trip!; if (t.purpose === 'work' && (!this.state.buildings[t.destination].open || c.job !== t.destination)) { this.startTrip(c, this.state.buildings[c.home], 'home'); return; } c.location = t.destination; c.activity = t.purpose; c.arrived = this.state.time;
    const elapsed = this.state.time - t.started; this.state.trips++;
    if (t.purpose === 'work') { c.commute = elapsed; this.state.commuteTimes.push(elapsed); this.state.commuteTimes = this.state.commuteTimes.slice(-250); c.happiness = clamp(c.happiness - Math.max(0, elapsed - 45) * .07); }
    c.trip = null;
    if (c.activity === 'shopping') { const price = 9; if (c.money >= price) { c.money -= price; this.state.buildings[c.location].cash += price; c.hunger = 0; c.happiness = clamp(c.happiness + 3); this.explain(c, `Bought groceries at ${this.state.buildings[c.location].name}. Food cost ¤9.`); } else this.explain(c, 'Money is tight. I could not afford groceries today.'); }
    else if (c.activity === 'work') this.explain(c, `Arrived at work after ${Math.round(elapsed)} minutes${this.state.time % 1440 > 540 + c.offset ? '. The commute made me late.' : '. On time for my shift.'}`);
    else this.explain(c, c.activity === 'home' ? 'Home again. Time to eat and recharge.' : `Enjoying ${this.state.buildings[c.location].name}. A little green space helps.`);
  }
  private tickBus(bus: Bus) {
    const node = BUS_ROUTE[bus.routeIndex];
    if (bus.dwell > 0) {
      bus.dwell -= STEP;
      for (const id of [...bus.riders]) { const c = this.state.citizens[id]; if (c.trip?.endStop === node) { bus.riders = bus.riders.filter(n => n !== id); c.trip.stage = 'from-stop'; c.trip.busId = null; c.trip.path = this.makePath(c, this.state.buildings[c.trip.destination]); c.trip.index = 0; this.explain(c, 'Off the bus. Walking the last stretch.'); } }
      for (const c of this.state.citizens) if (c.trip?.stage === 'waiting' && c.trip.startStop === node && bus.riders.length < 22) {
        if (c.money < this.state.policies.fare) { this.walkInstead(c, 'The new bus fare is above my budget. Walking instead.'); continue; }
        bus.riders.push(c.id); c.trip.stage = 'riding'; c.trip.busId = bus.id; c.money -= this.state.policies.fare; this.state.fares += this.state.policies.fare; this.state.treasury += this.state.policies.fare;
        this.explain(c, `On Loop bus ${bus.id + 1}. Next: ${this.state.buildings[c.trip.destination].name}.`);
      }
    } else {
      const next = (bus.routeIndex + 1) % BUS_ROUTE.length;
      const load = this.roads.get(edgeKey(node, BUS_ROUTE[next])) ?? 0;
      const target = NODES[BUS_ROUTE[next]], horizontal = Math.abs(target.x - bus.x) > Math.abs(target.y - bus.y);
      const movement = 15 * STEP / (1 + load * .2) * (this.state.policies.rain ? .75 : 1);
      const permitted = this.signalGreen(BUS_ROUTE[next], horizontal) ? movement : Math.min(movement, Math.max(0, distance(bus, target) - 9));
      if (this.move(bus, target, permitted)) { bus.routeIndex = next; bus.dwell = this.state.busStops.includes(BUS_ROUTE[next]) ? 1.5 : 0; }
    }
    for (const id of bus.riders) { const c = this.state.citizens[id]; c.x = bus.x; c.y = bus.y; }
  }
  private step() {
    const before = this.state.time; this.state.time += STEP;
    const minute = this.state.time % 1440, day = Math.floor(this.state.time / 1440), p = this.state.policies;
    const serviceCoverage = Math.min(1.4, this.state.buildings.filter(b => b.kind === 'service' && this.hasAccess(b.id)).length / 2);
    this.roads.clear();
    for (const c of this.state.citizens) if (c.trip?.mode === 'car') { const key = this.currentRoad(c); if (key) this.roads.set(key, (this.roads.get(key) ?? 0) + 1); }
    for (const bus of this.state.buses) this.tickBus(bus);
    for (const c of this.state.citizens) {
      if (!c.active) continue;
      c.hunger = clamp(c.hunger + STEP * .025); c.energy = clamp(c.energy + STEP * (c.activity === 'home' ? .1 : -.035));
      if (c.activity === 'home' && (minute < 460 || minute > 1140)) c.hunger = clamp(c.hunger - STEP * .08);
      const mood = 63 + p.services * .2 * serviceCoverage + (c.activity === 'relaxing' && !p.rain ? 14 : 0) - c.hunger * .18 - Math.max(0, 35 - c.energy) * .3 - (c.money < 20 ? 14 : 0) - (p.rain ? 4 : 0) - Math.max(0, c.commute - 45) * .12;
      c.happiness = clamp(c.happiness + (mood - c.happiness) * STEP * .006);
      if (c.trip) {
        const t = c.trip;
        if (t.stage === 'blocked') continue;
        if (t.stage === 'parking') { if (this.state.time >= (t.parkingUntil ?? 0)) { c.money -= this.parkingCost(t.destination); this.arrive(c); } continue; }
        if (!t.path.length && t.stage !== 'waiting' && t.stage !== 'riding') { t.stage = 'blocked'; continue; }
        if (t.stage === 'waiting') { if (this.state.time - t.started > 85) this.walkInstead(c, 'The wait is too long. Continuing on foot.'); continue; }
        if (t.stage === 'riding') continue;
        const target = t.path[t.index];
        const load = this.roads.get(this.currentRoad(c) ?? '') ?? 0;
        const velocity = t.mode === 'car' ? 18 / (1 + load * .32) : 5.5;
        if (!target || this.move(c, target, t.mode === 'car' ? this.carStep(c, velocity * STEP * (p.rain ? .72 : 1)) : velocity * STEP * (p.rain ? .72 : 1))) {
          t.index++;
          if (t.index >= t.path.length) { if (t.stage === 'to-stop') { t.stage = 'waiting'; this.explain(c, 'Waiting at the Loop bus stop.'); } else if (t.mode === 'car') { t.stage = 'parking'; t.parkingUntil = this.state.time + this.parkingDelay(t.destination); this.explain(c, 'Looking for parking near my destination.'); } else this.arrive(c); }
        }
        continue;
      }
      if (c.activity === 'work' && c.job !== null && this.state.buildings[c.location].open) { const wage = .24 * STEP, tax = wage * p.tax / 100; c.money += wage - tax; this.state.treasury += tax; this.state.wages += wage; const business = this.state.buildings[c.location]; business.cash += (business.kind === 'office' ? .31 : .12) * STEP - wage; }
      if (c.job !== null && c.workDay !== day && minute >= 450 + c.offset && minute < 900) { c.workDay = day; this.startTrip(c, this.state.buildings[c.job], 'work'); }
      else if (c.activity === 'work' && minute >= 1020 + c.offset) { const shops = this.state.buildings.filter(b => b.kind === 'shop' && b.open); const shop = shops.length ? shops.reduce((a, b) => distance(c, a) < distance(c, b) ? a : b) : this.state.buildings[c.home]; c.shopDay = day; this.startTrip(c, shop, 'shopping'); }
      else if (c.activity === 'shopping' && this.state.time - c.arrived > 20) { if (c.parkDay !== day && !p.rain && minute < 1230) { const parks = this.state.buildings.filter(b => b.kind === 'park'); c.parkDay = day; this.startTrip(c, parks.length ? parks.reduce((a, b) => distance(c, a) < distance(c, b) ? a : b) : this.state.buildings[c.home], 'relaxing'); } else this.startTrip(c, this.state.buildings[c.home], 'home'); }
      else if (c.activity === 'relaxing' && (this.state.time - c.arrived > 65 || p.rain)) this.startTrip(c, this.state.buildings[c.home], 'home');
      else if (c.job === null && c.parkDay !== day && minute > 590 + c.offset && minute < 1100) { const parks = this.state.buildings.filter(b => b.kind === 'park'); c.parkDay = day; this.startTrip(c, parks[Math.floor(this.random() * parks.length)], 'relaxing'); }
      else if (c.job === null && c.shopDay !== day && minute > 1050 && minute < 1250) { const shops = this.state.buildings.filter(b => b.kind === 'shop' && b.open); c.shopDay = day; this.startTrip(c, shops[Math.floor(this.random() * shops.length)], 'shopping'); }
    }
    this.state.treasury -= STEP * (p.services * .006 + p.buses * .075);
    if (Math.floor(before / 1440) !== day) {
      this.dailyEconomy();
      this.event(`Day ${day + 1}. Rents, business accounts and job vacancies updated.`);
    }
    if (Math.floor(before / 15) !== Math.floor(this.state.time / 15)) this.sample();
  }
  hasAccess(id: number) { const key = `${this.state.revision}:${this.state.policies.roadClosed}`; if (this.accessState !== this.state || key !== this.accessKey) { this.accessState = this.state; this.accessKey = key; this.accessCache.clear(); } if (!this.accessCache.has(id)) this.accessCache.set(id, this.route(this.state.buildings[id].node, BUS_ROUTE[0]).length > 0); return this.accessCache.get(id)!; }
  parkingCost(id: number) { const b = this.state.buildings[id]; return b.kind === 'office' || b.kind === 'shop' ? 2 : 0; }
  parkingDelay(id: number) { return 2 + Math.max(0, this.state.citizens.filter(c => c.active && c.ownsCar && !c.trip && c.location === id).length - 6) * 2; }
  signalGreen(node: number, horizontal: boolean) { return !SIGNALS.includes(node) || (Math.floor((this.state.time + node * .13) / .75) % 2 === 0) === horizontal; }
  private carStep(c: Citizen, amount: number) {
    const t = c.trip!, target = t.path[t.index]; if (!target) return amount;
    const d = distance(c, target), node = this.nearestNode(target), horizontal = Math.abs(target.x - c.x) > Math.abs(target.y - c.y);
    if (distance(target, NODES[node]) < 1 && !this.signalGreen(node, horizontal)) amount = Math.min(amount, Math.max(0, d - 9));
    const key = this.currentRoad(c);
    if (key) for (const other of this.state.citizens) {
      if (other.id === c.id || other.trip?.mode !== 'car' || this.currentRoad(other) !== key) continue;
      const otherTarget = other.trip.path[other.trip.index];
      if (otherTarget && distance(target, otherTarget) < 1) { const ahead = d - distance(other, target); if (ahead > 0) amount = Math.min(amount, Math.max(0, ahead - 13)); }
    }
    return amount;
  }
  private reroute() {
    for (const c of this.state.citizens) if (c.active && c.trip) {
      for (const bus of this.state.buses) bus.riders = bus.riders.filter(id => id !== c.id);
      this.walkInstead(c, 'The street network changed. Replanning my route on foot.');
      if (!c.trip!.path.length) c.trip!.stage = 'blocked';
    }
    this.state.revision++;
  }
  build(id: number, kind: BuildingKind) {
    const b = this.state.buildings[id];
    if (!b || !Object.hasOwn(BUILD_COST, kind)) throw new Error('Choose a valid plot and building.');
    if (b.kind === kind) throw new Error('This plot already has that building type.');
    if (this.state.treasury < BUILD_COST[kind]) throw new Error('The city treasury cannot cover this construction.');
    if (kind !== 'empty' && !this.hasAccess(id)) throw new Error('Connect this plot to the street network first.');
    const residents = this.state.citizens.filter(c => c.active && c.home === id);
    const spaces = this.state.buildings.filter(h => h.kind === 'home' && h.id !== id && this.hasAccess(h.id)).flatMap(h => Array(Math.max(0, h.capacity - this.state.citizens.filter(c => c.active && c.home === h.id).length)).fill(h.id) as number[]);
    if (residents.length > spaces.length) throw new Error('Build enough replacement homes before moving these residents.');
    this.state.treasury -= BUILD_COST[kind];
    residents.forEach((c, i) => { c.home = spaces[i]; this.explain(c, 'Moved into another home during redevelopment.'); });
    for (const c of this.state.citizens) {
      if (c.job === id) { c.job = null; this.explain(c, 'My workplace was redeveloped. Looking for a new job.'); }
      if (c.location === id || c.trip?.destination === id) { const home = this.state.buildings[c.home]; c.trip = null; c.activity = 'home'; c.location = c.home; c.x = home.x; c.y = home.y; }
    }
    for (const bus of this.state.buses) bus.riders = bus.riders.filter(id => this.state.citizens[id].trip?.stage === 'riding');
    Object.assign(b, { kind, name: `${names[kind][id % names[kind].length]} ${id + 1}`, capacity: kind === 'home' ? 8 : kind === 'office' ? 22 : kind === 'shop' ? 10 : 0, rent: 20, cash: 1200, open: true, badDays: 0 });
    this.state.revision++; this.event(`${b.name}: construction completed for ¤${BUILD_COST[kind]}.`);
  }
  toggleRoad(key: string) {
    if (!ROADS.some(r => r.key === key)) throw new Error('Choose a street segment on the grid.');
    if (BUS_ROUTE.some((n, i) => edgeKey(n, BUS_ROUTE[(i + 1) % BUS_ROUTE.length]) === key)) throw new Error('This street carries the Loop. Its route must remain connected.');
    const exists = this.state.roads.includes(key), cost = exists ? 50 : 250;
    if (this.state.treasury < cost) throw new Error('Insufficient construction budget.');
    this.state.treasury -= cost; this.state.roads = exists ? this.state.roads.filter(r => r !== key) : [...this.state.roads, key];
    this.reroute(); this.event(`Street ${key} ${exists ? 'removed' : 'built'} for ¤${cost}.`);
  }
  toggleStop(node: number) {
    if (!BUS_ROUTE.includes(node)) throw new Error('Place stops along the marked Loop route.');
    const exists = this.state.busStops.includes(node);
    if (exists && this.state.busStops.length <= 2) throw new Error('Keep at least two stops on the Loop.');
    if (this.state.treasury < 250) throw new Error('A stop change costs ¤250.');
    this.state.treasury -= 250; this.state.busStops = exists ? this.state.busStops.filter(n => n !== node) : [...this.state.busStops, node]; this.reroute();
    this.event(`Loop stop ${node} ${exists ? 'removed' : 'added'}.`);
  }
  buildingIssues(id: number): { title: string; detail: string; residents: number[] }[] {
    const b = this.state.buildings[id], residents = this.state.citizens.filter(c => c.active && (c.home === id || c.job === id)), result = [];
    if (b.kind === 'empty') return [{ title: 'Ready for construction', detail: 'Choose a building type to develop this plot.', residents: [] }];
    if (!this.hasAccess(id)) result.push({ title: 'No road access', detail: 'Reconnect the entrance to the main street network. Trips cannot reach this property.', residents: residents.map(c => c.id) });
    if (!b.open) result.push({ title: 'Business closed', detail: 'Losses exhausted its cash reserve. A connected property can reopen when demand recovers.', residents: [] });
    const poor = residents.filter(c => c.money < b.rent + 12);
    if (b.kind === 'home' && poor.length) result.push({ title: 'Housing is unaffordable', detail: `Daily rent is ¤${b.rent.toFixed(0)} plus ¤12 household costs. Improve employment or fund support.`, residents: poor.map(c => c.id) });
    const late = residents.filter(c => c.commute > 60);
    if (late.length) result.push({ title: 'Long commutes', detail: 'These residents spend over an hour reaching work. Try nearby jobs, new roads or more frequent buses.', residents: late.map(c => c.id) });
    if ((b.kind === 'office' || b.kind === 'shop') && b.open && residents.length < b.capacity / 3) result.push({ title: 'Workers needed', detail: `${b.capacity - residents.length} vacancies. More housing and road access help employers hire.`, residents: [] });
    return result;
  }
  private dailyEconomy() {
    const s = this.state, live = () => s.citizens.filter(c => c.active);
    for (const b of s.buildings) {
      if (b.kind === 'home') { const occupancy = live().filter(c => c.home === b.id).length / b.capacity; b.rent = clamp(b.rent + (occupancy > .9 ? 1 : occupancy < .5 ? -1 : 0), 12, 48); }
      if (b.kind === 'office' || b.kind === 'shop') {
        if (b.open) { b.cash -= b.kind === 'office' ? 65 : 35; b.badDays = b.cash < 0 ? b.badDays + 1 : 0; if (b.badDays >= 2) { b.open = false; s.revision++; for (const c of live()) if (c.job === b.id) { c.job = null; if (c.activity === 'work') this.startTrip(c, s.buildings[c.home], 'home'); } this.event(`${b.name} closed after sustained losses.`); } }
        else if (this.hasAccess(b.id) && live().filter(c => c.job === null).length >= 3 && this.metrics().happiness > 55) { b.open = true; b.cash = 800; b.badDays = 0; s.revision++; this.event(`${b.name} reopened with new private investment.`); }
      }
    }
    for (const c of live()) {
      c.money = Math.max(-300, c.money - s.buildings[c.home].rent - 12);
      if (c.job === null) { const support = s.policies.services * .35; c.money += support; s.treasury -= support; }
      c.strugglingDays = c.money < -80 || c.happiness < 35 ? c.strugglingDays + 1 : 0;
      if (c.strugglingDays >= 2) { c.active = false; c.trip = null; s.departures++; for (const bus of s.buses) bus.riders = bus.riders.filter(id => id !== c.id); this.event(`${c.name} moved away after struggling with costs or well-being.`); }
    }
    const vacancy = () => s.buildings.find(b => b.open && ['office', 'shop'].includes(b.kind) && this.hasAccess(b.id) && live().filter(c => c.job === b.id).length < b.capacity);
    for (const c of live()) if (c.job === null && this.hasAccess(c.home)) { const job = vacancy(); if (job) { c.job = job.id; this.explain(c, `Hired at ${job.name}. Starting on the next workday.`); } }
    for (let i = 0; i < 4 && this.metrics().happiness > 60; i++) {
      const home = s.buildings.find(b => b.kind === 'home' && this.hasAccess(b.id) && live().filter(c => c.home === b.id).length < b.capacity), job = vacancy();
      if (!home || !job) break;
      const reusable = s.citizens.find(c => !c.active), id = reusable?.id ?? s.citizens.length;
      if (id >= 512) break;
      const c: Citizen = { id, active: true, strugglingDays: 0, name: `${firstNames[(id + s.arrivals) % firstNames.length]} ${lastNames[(id + s.arrivals) % lastNames.length]}`, age: 22 + Math.floor(this.random() * 40), home: home.id, job: job.id, ownsCar: this.random() < .49, offset: Math.floor(this.random() * 85), x: home.x, y: home.y, money: 200, happiness: 75, energy: 90, hunger: 15, activity: 'home', location: home.id, trip: null, workDay: -1, shopDay: -1, parkDay: -1, arrived: s.time, commute: 0, reason: 'Moved here for a home and a job.', log: [] };
      s.citizens[id] = c; s.arrivals++; s.revision++; this.event(`${c.name} moved into ${home.name}.`);
    }
  }
  advance(minutes: number) { if (!Number.isFinite(minutes) || minutes < 0 || minutes > 1440 * 7) throw new Error('Advance between zero and seven days.'); this.accumulated += minutes; while (this.accumulated + 1e-9 >= STEP) { this.step(); this.accumulated -= STEP; } }
  tick(seconds: number) { if (!this.paused && Number.isFinite(seconds) && seconds > 0) this.advance(Math.min(seconds, .15) * 8 * this.speed); }
  roadLoad(key: string) { return this.roads.get(key) ?? 0; }
  metrics(): Metrics {
    const cs = this.state.citizens.filter(c => c.active), cars = cs.filter(c => c.trip?.mode === 'car').length;
    const density = [...this.roads.values()];
    return { population: cs.length, happiness: cs.reduce((s, c) => s + c.happiness, 0) / Math.max(1, cs.length), traffic: density.length ? clamp(density.reduce((s, n) => s + Math.max(0, n - 1), 0) / Math.max(1, cars) * 100) : 0, pollution: clamp(cars * 1.2 + this.state.buses.length * 1.8), commute: this.state.commuteTimes.length ? this.state.commuteTimes.reduce((s, n) => s + n, 0) / this.state.commuteTimes.length : 0, employed: cs.filter(c => c.job !== null).length, walking: cs.filter(c => c.trip && (c.trip.mode === 'walk' || ['to-stop','from-stop'].includes(c.trip.stage))).length, driving: cars, riding: cs.filter(c => c.trip?.stage === 'riding').length, waiting: cs.filter(c => c.trip?.stage === 'waiting').length, trips: this.state.trips };
  }
  private sample() { const m = this.metrics(); this.state.history.push({ time: this.state.time, happiness: m.happiness, traffic: m.traffic, commute: m.commute, treasury: this.state.treasury }); this.state.history = this.state.history.slice(-192); }
}

// Reject malformed local files before replacing a running city.
const finite = z.number().finite(), index = z.number().int().nonnegative();
const pointSchema = z.object({ x: finite.min(0).max(WIDTH), y: finite.min(0).max(HEIGHT) });
const activitySchema = z.enum(['home', 'work', 'shopping', 'relaxing', 'traveling']);
const logSchema = z.array(z.object({ time: finite.nonnegative(), text: z.string().max(2000) }));
const snapshotSchema = z.object({
  version: z.literal(2), name: z.string().min(1).max(60), seed: index, rng: index, time: finite.nonnegative(), revision: index, arrivals: index, departures: index, remainder: finite.min(-1e-6).max(STEP),
  treasury: finite, fares: finite, wages: finite, trips: index, commuteTimes: z.array(finite.nonnegative()).max(250),
  roads: z.array(z.string()).max(110), busStops: z.array(index).min(2).max(18),
  buildings: z.array(pointSchema.extend({ id: index, kind: z.enum(['home','office','shop','park','service','empty']), name: z.string().max(120), node: index.max(62), district: z.string().max(120), capacity: index.max(100), rent: finite.min(0).max(100), cash: finite, open: z.boolean(), badDays: index } )).length(48),
  policies: z.object({ buses: index.max(6), fare: finite.min(0).max(6), tax: finite.min(0).max(35), services: finite.min(0).max(100), rain: z.boolean(), roadClosed: z.boolean() }),
  citizens: z.array(pointSchema.extend({ id: index, active: z.boolean(), strugglingDays: index, name: z.string().max(120), age: finite.min(0).max(120), home: index.max(47), job: index.max(47).nullable(), ownsCar: z.boolean(), offset: finite, money: finite, happiness: finite.min(0).max(100), energy: finite.min(0).max(100), hunger: finite.min(0).max(100), activity: activitySchema, location: index.max(47), workDay: finite, shopDay: finite, parkDay: finite, arrived: finite, commute: finite, reason: z.string().max(2000), log: logSchema.max(8), trip: z.object({ destination: index.max(47), purpose: activitySchema, mode: z.enum(['walk','car','bus']), stage: z.enum(['direct','to-stop','waiting','riding','from-stop','parking','blocked']), path: z.array(pointSchema).max(100), index: index.max(100), started: finite, startStop: index.max(62), endStop: index.max(62), busId: index.max(5).nullable(), parkingUntil: finite.optional() }).nullable() })).min(1).max(512),
  buses: z.array(pointSchema.extend({ id: index.max(5), routeIndex: index.max(17), dwell: finite, riders: z.array(index).max(22) })).max(6),
  events: logSchema.max(30), history: z.array(z.object({ time: finite, happiness: finite, traffic: finite, commute: finite, treasury: finite })).max(192),
});
export function validateSnapshot(snapshot: string): CityState {
  if (snapshot.length > 4000000) throw new Error('This city save is too large.');
  const raw = JSON.parse(snapshot);
  if (raw.version === 1) { Object.assign(raw, { version: 2, name: 'Linden', buildings: structuredClone(BUILDINGS), roads: ROADS.map(r => r.key), busStops: [...BUS_STOPS], revision: 0, arrivals: 0, departures: 0, remainder: 0 }); if (Array.isArray(raw.citizens)) raw.citizens.forEach((c: Citizen) => Object.assign(c, { active: true, strugglingDays: 0 })); }
  const result = snapshotSchema.safeParse(raw);
  if (!result.success) throw new Error('This city save is incomplete or damaged. Your current city was kept.');
  const s = result.data as CityState, validRoads = new Set(ROADS.map(r => r.key));
  const bad = s.buildings.some((b, i) => b.id !== i || b.node !== BUILDINGS[i].node || b.x !== BUILDINGS[i].x || b.y !== BUILDINGS[i].y)
    || s.roads.some(r => !validRoads.has(r)) || new Set(s.roads).size !== s.roads.length
    || s.busStops.some(n => !BUS_ROUTE.includes(n)) || new Set(s.busStops).size !== s.busStops.length
    || BUS_ROUTE.some((n, i) => !s.roads.includes(edgeKey(n, BUS_ROUTE[(i + 1) % BUS_ROUTE.length])))
    || s.buses.length !== s.policies.buses || s.buses.some((b, i) => b.id !== i || new Set(b.riders).size !== b.riders.length || b.riders.some(id => !s.citizens[id]?.active || s.citizens[id].trip?.busId !== b.id || s.citizens[id].trip?.stage !== 'riding'))
    || s.citizens.some((c, i) => c.id !== i || (c.active && (s.buildings[c.home].kind !== 'home' || (c.job !== null && !['office','shop'].includes(s.buildings[c.job].kind)))) || (c.trip?.stage === 'riding' && !s.buses.some(b => b.id === c.trip?.busId && b.riders.includes(i))));
  if (bad) throw new Error('This city save has invalid references. Your current city was kept.');
  return raw as CityState;
}
