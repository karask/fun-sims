export type View = 'surface' | 'nest';
export type Task = 'exploring' | 'foraging' | 'returning' | 'nursing' | 'digging' | 'cleaning' | 'resting' | 'grooming' | 'defending' | 'retreating' | 'queen';
export type ResourceKind = 'carbohydrate' | 'protein' | 'water';
export type Cargo = ResourceKind | 'soil' | 'waste' | 'brood' | 'corpse' | null;
export interface Point { x: number; y: number; z?: number }
export interface Ant extends Point {
  id: number; z: number; angle: number; view: View; task: Task; age: number; energy: number; hunger: number;
  cargo: Cargo; amount: number; target: Point | null; memory: Point | null; timer: number; decision: number;
  tendency: number; reason: string; history: string[]; alive: boolean; carryingId: number | null;
}
export interface Resource extends Point { id: number; kind: ResourceKind; amount: number; initial: number; radius: number }
export interface Obstacle extends Point { id: number; radius: number }
export interface Brood extends Point { id: number; stage: 'egg' | 'larva' | 'pupa'; progress: number; nutrition: number; care: number; carriedBy: number | null }
export interface Debris extends Point { id: number; view: View; kind: 'waste' | 'corpse'; carriedBy: number | null }
export type EnemyKind = 'spider' | 'rival';
export interface Enemy extends Point {
 id:number; kind:EnemyKind; angle:number; mode:'roaming'|'hunting'|'feeding'|'returning'|'retreating';
 energy:number; age:number; cooldown:number; home:Point; memory:Point|null;
 cargo:ResourceKind|null; amount:number; prey:boolean; reason:string;
}
export interface Encounters { spiderClock:number; rivalClock:number; arrivals:number; repelled:number; lostWorkers:number; stolenFood:number; }
export interface Settings { spiderEncounters:boolean; rivalEncounters:boolean; encounterFrequency:number; temperature: number; moisture: number; lifecycle: number; exploration: number; pheromoneDecay: number; sensitivity: number; flexibility: number }
export interface Sample { time: number; population: number; brood: number; food: number; foraging: number }
export interface ColonyState {
  version: 3; simulator: 'ants'; seed: number; rng: number; tick: number; nextId: number; time: number;
  enemies:Enemy[]; alarm:number[]; encounters:Encounters;
  settings: Settings; ants: Ant[]; brood: Brood[]; resources: Resource[]; obstacles: Obstacle[]; debris: Debris[];
  nest: number[]; excavation: number[]; pheromones: number[]; traffic: number[];
  stores: { carbohydrate: number; protein: number; water: number }; queenEggTimer: number;
  births: number; deaths: number; excavated: number; depositedSoil: number; removedWaste: number;
  history: Sample[]; events: { time: number; text: string }[];
}
export interface Snapshot { state: ColonyState; paused: boolean; speed: number; stepMs: number }
export type Command =
  | { type: 'pause'; paused: boolean } | { type: 'speed'; speed: number }
  | { type: 'settings'; settings: Partial<Settings> }
  | { type: 'place'; kind: ResourceKind | 'obstacle' | 'erase'; x: number; y: number; z?: number }
  | { type: 'reset'; seed: number } | { type: 'load'; state: unknown }
  | { type: 'snapshot' };
export interface SimulatorAdapter {
  initialize(seed?: number): void;
  command(command: Command): Promise<Snapshot>;
  subscribe(listener: (snapshot: Snapshot) => void): () => void;
  dispose(): void;
}
export const WORLD = { width: 1400, height: 900, entrance: { x: 680, y: 430 }, nestEntrance: { x: 680, y: 110, z: 180 }, midden: { x: 845, y: 485 } };
export const CELL = 20, COLS = 70, ROWS = 45, FIELD_CELL = 14, FIELD_COLS = 100, FIELD_ROWS = 65;
export const DEFAULT_SETTINGS: Settings = { spiderEncounters:false, rivalEncounters:false, encounterFrequency:1, temperature: 24, moisture: 65, lifecycle: 1, exploration: 0.45, pheromoneDecay: 0.018, sensitivity: 1, flexibility: 0.6 };
export const TASK_COLORS: Record<Task,string> = { exploring:'#b9c3bf',foraging:'#e2bc79',returning:'#e2bc79',nursing:'#a4aacb',digging:'#c69572',cleaning:'#7bbcb5',resting:'#82948c',grooming:'#8fa88c',defending:'#f0a35f',retreating:'#d4909d',queen:'#e4bc77' };

export const NEST_LAYERS = 9, NEST_LAYER_SIZE = 40, NEST_CENTER = 180;
