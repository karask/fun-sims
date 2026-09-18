'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AntAdapter } from './adapter';
import { createColony } from './engine';
import type { Command, Snapshot } from './types';
import { getColony, saveColony } from './storage';
import { useT } from '@/lib/i18n/language';
import { toast } from 'sonner';
export function useSimulation(active = true) {
  const tr = useT(), translator = useRef(tr); translator.current = tr;
  const enabled = useRef(active); enabled.current = active;
  const liveSnapshot = useRef<Snapshot | null>(null), adapter = useRef<AntAdapter | null>(null);
  const [snapshot, setSnapshot] = useState<Snapshot>(() => ({ state: createColony(), paused: false, speed: 1, stepMs: 0 }));
  const [ready, setReady] = useState(false), [error, setError] = useState<string | null>(null), [savedAt, setSavedAt] = useState<number | null>(null);
  const dispatch = useCallback(async (command: Command) => {
    try {
      if (!adapter.current) throw new Error('The colony is still starting.');
      const s = await adapter.current.command(command); setSnapshot(s); setError(null); return s;
    } catch (e) { toast.error(translator.current(e instanceof Error ? e.message : 'This change could not be applied.')); throw e; }
  }, []);
  const activitySync = useRef<(() => void) | null>(null);
  useEffect(() => {
    let mounted = true, initialized = false, lastUI = 0;
    const sim = new AntAdapter(); adapter.current = sim;
    sim.onFailure = message => { if (mounted) { setError(message); setReady(false); } };
    sim.subscribe(s => {
      if (!mounted) return;
      liveSnapshot.current = s;
      if (!enabled.current || performance.now() - lastUI > 250) { setSnapshot(s); lastUI = performance.now(); }
    });
    sim.initialize(); // The worker starts asleep, including while storage is read.
    void (async () => {
      try {
        const saved = await getColony('autosave');
        if (!mounted) return;
        const s = await sim.command(saved ? { type: 'load', state: saved.state } : { type: 'snapshot' });
        if (!mounted) return;
        setSnapshot(s);
        if (saved) {
          setSavedAt(saved.savedAt);
          toast(translator.current('Last colony restored'), { description: translator.current('Paused so you can pick up where you left off.') });
        }
      } catch (e) { if (mounted) toast.error(translator.current((e as Error).message)); }
      finally {
        if (mounted) { initialized = true; setReady(true); sim.setActive(enabled.current); }
      }
    })();
    // Activity changes are handled separately, after initialization finishes.
    const activate = () => { if (initialized) sim.setActive(enabled.current); };
    activitySync.current = activate;
    return () => { mounted = false; activitySync.current = null; sim.dispose(); adapter.current = null; };
  }, []);
  useEffect(() => { activitySync.current?.(); }, [active]);
  useEffect(() => {
    if (!active || !ready) return;
    let mounted = true;
    const save = async () => {
      // Snapshots are immutable message copies; no worker wake-up is needed.
      const s = liveSnapshot.current; if (!s) return;
      try {
        const when = Date.now();
        await saveColony({ id: 'autosave', name: 'Last session', savedAt: when, state: s.state });
        if (mounted) setSavedAt(when);
      } catch (e) { if (mounted) setError(e instanceof Error ? e.message : 'Autosave failed. Export a backup.'); }
    };
    const timer = setInterval(() => { void save(); }, 30000);
    const onPageHide = () => { void save(); };
    window.addEventListener('pagehide', onPageHide);
    // Save once on leaving; no autosave timer remains in an inactive simulation.
    return () => { clearInterval(timer); window.removeEventListener('pagehide', onPageHide); void save(); mounted = false; };
  }, [active, ready]);
  return { snapshot, liveSnapshot, dispatch, ready, error, savedAt };
}
