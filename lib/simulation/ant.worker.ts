/// <reference lib="webworker" />
import { AntSimulation, FIXED_DT } from './engine';
import type { Command } from './types';
const sim = new AntSimulation();
let last = performance.now(), accumulator = 0, lastPost = 0, stepMs = 0;
let active = false, timer: ReturnType<typeof setInterval> | undefined;
function snapshot() { return { state: sim.state, paused: sim.paused, speed: sim.speed, stepMs }; }
function syncTimer() {
  const running = active && !sim.paused;
  if (!running && timer !== undefined) { clearInterval(timer); timer = undefined; }
  if (running && timer === undefined) {
    // Suspended wall time must never become simulation catch-up time.
    last = performance.now(); lastPost = last; accumulator = 0;
    timer = setInterval(() => {
      const now = performance.now(), elapsed = Math.min((now - last) / 1000, .1); last = now;
      accumulator += elapsed * sim.speed;
      const started = performance.now(); let steps = 0;
      while (accumulator >= FIXED_DT && steps < 16) { sim.step(); accumulator -= FIXED_DT; steps++; }
      if (steps) stepMs = (performance.now() - started) / steps;
      if (now - lastPost >= 100) { lastPost = now; self.postMessage({ snapshot: snapshot() }); }
    }, 16);
  }
}
self.onmessage = (event: MessageEvent<{ active: boolean } | { requestId: number; command: Command }>) => {
  if ('active' in event.data) {
    active = event.data.active; syncTimer();
    // One final/current snapshot, with no periodic messages while suspended.
    self.postMessage({ snapshot: snapshot() }); return;
  }
  const { requestId, command } = event.data;
  try {
    sim.command(command);
    if (['load', 'reset', 'pause', 'speed'].includes(command.type)) { accumulator = 0; last = performance.now(); }
    syncTimer(); self.postMessage({ requestId, snapshot: snapshot() });
  } catch (error) { self.postMessage({ requestId, error: error instanceof Error ? error.message : 'Unable to apply this change.' }); }
};
