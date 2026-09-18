import assert from 'node:assert/strict';
import vm from 'node:vm';
import { build } from 'esbuild';

// Exercise the real worker protocol under a deterministic clock. No browser or
// wall-clock sleeps: a hidden worker must have zero scheduled timer callbacks.
const output = await build({ entryPoints: ['lib/simulation/ant.worker.ts'], bundle: true, platform: 'browser', format: 'iife', write: false, logLevel: 'silent' });
let now = 0, next = 0;
const timers = new Map(), messages = [];
const self = { postMessage: message => messages.push(structuredClone(message)), onmessage: null };
vm.runInNewContext(output.outputFiles[0].text, {
  self, performance: { now: () => now },
  setInterval: callback => { const id = ++next; timers.set(id, callback); return id; },
  clearInterval: id => timers.delete(id),
});
const send = data => self.onmessage({ data });
const command = command => { send({ requestId: 1, command }); return messages.at(-1).snapshot; };
const advance = ms => { for (let t = 0; t < ms; t += 16) { now += 16; for (const callback of [...timers.values()]) callback(); } };
assert.equal(timers.size, 0, 'The worker must start dormant while a saved colony loads');
send({ active: true });
assert.equal(timers.size, 1);
advance(320);
const before = command({ type: 'snapshot' });
assert.ok(before.state.tick > 0);
send({ active: false });
assert.equal(timers.size, 0, 'Switching away must remove the timer, not poll an activity flag');
const count = messages.length;
advance(60000);
assert.equal(messages.length, count, 'Suspended workers must not copy or post snapshots');
const after = command({ type: 'snapshot' });
assert.deepEqual(after.state, before.state, 'Suspension must preserve the entire colony');
assert.equal(after.paused, false, 'Suspension must not overwrite the user pause choice');
send({ active: true });
advance(16);
assert.equal(command({ type: 'snapshot' }).state.tick, before.state.tick, 'Resume must not catch up suspended wall time');
advance(160);
assert.ok(command({ type: 'snapshot' }).state.tick > before.state.tick);
command({ type: 'pause', paused: true });
assert.equal(timers.size, 0, 'A manually paused colony also needs no worker timer');
send({ active: false }); send({ active: true });
assert.equal(command({ type: 'snapshot' }).paused, true);
assert.equal(timers.size, 0, 'Returning must not unpause a manually paused colony');
send({ active: false });
command({ type: 'reset', seed: 28471 });
assert.equal(timers.size, 0, 'Reset while inactive must not restart the worker loop');
const loaded = command({ type: 'load', state: before.state });
assert.equal(loaded.paused, true);
command({ type: 'speed', speed: 4 });
send({ active: true });
assert.equal(timers.size, 0);
command({ type: 'pause', paused: false });
for (let i = 0; i < 50; i++) { send({ active: false }); send({ active: true }); }
assert.equal(timers.size, 1, 'Rapid switches must never accumulate timers');
assert.equal(command({ type: 'snapshot' }).speed, 4);
send({ active: false });
assert.equal(timers.size, 0);
console.log('PASS worker suspension: zero timers/messages while inactive, exact state retention, no time catch-up, preserved pause/speed, and rapid switching');
