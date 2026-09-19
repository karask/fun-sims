import { CityEngine, validateSnapshot, type Metrics, type Policies } from './engine';
export interface CitySave { name: string; savedAt: number; snapshot: string }
export interface CityStorage { getItem(key: string): string | null; setItem(key: string, value: string): void }
export const SAVE_KEY = 'simulation-hub.city.saves.v2';
export const AUTO_KEY = 'simulation-hub.city.autosave.v2';
export function readSaves(storage: CityStorage): CitySave[] {
  const raw = storage.getItem(SAVE_KEY); if (!raw) return [];
  const saves: unknown = JSON.parse(raw);
  if (!Array.isArray(saves) || saves.length > 12 || saves.some(s => !s || typeof s.name !== 'string' || s.name.length > 60 || typeof s.savedAt !== 'number' || typeof s.snapshot !== 'string')) throw new Error('Saved-city list is damaged. It has been kept unchanged.');
  return saves;
}
export function saveCity(storage: CityStorage, name: string, snapshot: string): CitySave[] {
  name = name.trim(); if (!name || name.length > 60) throw new Error('Give your city a name of 1–60 characters.');
  validateSnapshot(snapshot);
  const previous = readSaves(storage), next = [{ name, savedAt: Date.now(), snapshot }, ...previous.filter(s => s.name !== name)];
  if (next.length > 12) throw new Error('You have 12 saved cities. Reuse a save name to replace that save.');
  try { storage.setItem(SAVE_KEY, JSON.stringify(next)); } catch { throw new Error('Browser storage is full or unavailable. Export your city to keep a copy.'); }
  return next;
}
export interface RunResult { metrics: Metrics; treasury: number; time: number }
export interface Comparison { minutes: number; start: number; baseline: RunResult; changed: RunResult; baselinePolicies: Policies; changedPolicies: Policies }
export async function comparePolicies(snapshot: string, policies: Policies, minutes: number, yieldFrame: () => Promise<void> = () => new Promise(resolve => setTimeout(resolve, 0)), signal?: AbortSignal): Promise<Comparison> {
  if (![120, 360, 1440].includes(minutes)) throw new Error('Choose a supported comparison duration.');
  const a = new CityEngine(), b = new CityEngine(); a.restore(snapshot); b.restore(snapshot);
  const baselinePolicies = { ...a.state.policies }, start = a.state.time;
  for (const key of Object.keys(policies) as (keyof Policies)[]) if (b.state.policies[key] !== policies[key]) b.setPolicy(key, policies[key]);
  for (let elapsed = 0; elapsed < minutes; elapsed += 15) { if (signal?.aborted) throw new Error('Comparison cancelled.'); a.advance(Math.min(15, minutes - elapsed)); b.advance(Math.min(15, minutes - elapsed)); await yieldFrame(); }
  const result = (engine: CityEngine): RunResult => ({ metrics: engine.metrics(), treasury: engine.state.treasury, time: engine.state.time });
  return { minutes, start, baseline: result(a), changed: result(b), baselinePolicies, changedPolicies: { ...policies } };
}
