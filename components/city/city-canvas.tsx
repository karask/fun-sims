'use client';
import { useT } from '@/lib/i18n/language';
import { useEffect, useImperativeHandle, useRef } from 'react';
import { CityEngine, HEIGHT, WIDTH } from '@/lib/city/engine';
import { Camera, Display, Hit, Selection, drawCity, unproject } from '@/lib/city/renderer';
export interface CityControls { zoom: (factor: number) => void; fit: () => void; rotate?: (angle: number) => void }
export default function CityCanvas({ engine, active, display, controlsRef, onSelect, onChange, onPan }: { engine: CityEngine; active: boolean; display: Display; controlsRef: React.RefObject<CityControls | null>; onSelect: (s: Selection) => void; onChange: () => void; onPan: () => void }) {
 const tr = useT();
  const ref = useRef<HTMLCanvasElement>(null);
  const camera = useRef<Camera>({ x: WIDTH / 2, y: HEIGHT / 2, zoom: 1 });
  const latest = useRef({ display, onSelect, onChange, onPan });
  useImperativeHandle(controlsRef, () => ({
    zoom: factor => { camera.current.zoom = Math.min(5, Math.max(.7, camera.current.zoom * factor)); },
    fit: () => { camera.current = { x: WIDTH / 2, y: HEIGHT / 2, zoom: 1 }; latest.current.onPan(); },
  }), []);
  useEffect(() => { latest.current = { display, onSelect, onChange, onPan }; }, [display, onSelect, onChange, onPan]);
  useEffect(() => {
    const canvas = ref.current; if (!canvas || !active) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    let w = 0, h = 0, hits: Hit[] = [], raf = 0, last = performance.now(), ui = last;
    let drag: { x: number; y: number; startX: number; startY: number; moved: boolean } | null = null;
    const pointers = new Map<number, { x: number; y: number }>(); let pinch = 0;
    const zoom = (factor: number) => { camera.current.zoom = Math.min(5, Math.max(.7, camera.current.zoom * factor)); };
    const resize = new ResizeObserver(() => { const r = canvas.getBoundingClientRect(); w = r.width; h = r.height; const dpr = Math.min(devicePixelRatio, 2); canvas.width = Math.max(1, Math.round(w * dpr)); canvas.height = Math.max(1, Math.round(h * dpr)); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }); resize.observe(canvas);
    const frame = (now: number) => {
      if (w && h && !document.hidden) {
        engine.tick(Math.min(.05, (now - last) / 1000));
        const d = latest.current.display;
        if (d.follow && d.selection?.kind === 'citizen') { const c = engine.state.citizens[d.selection.id]; if (c) { camera.current.x = c.x; camera.current.y = c.y; camera.current.zoom = Math.max(2, camera.current.zoom); } }
        hits = drawCity(ctx, w, h, engine, camera.current, d);
        if (now - ui > 240) { latest.current.onChange(); ui = now; }
      }
      last = now; raf = requestAnimationFrame(frame);
    }; raf = requestAnimationFrame(frame);
    const point = (e: PointerEvent) => { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    const down = (e: PointerEvent) => { if (e.button !== 0) return; canvas.focus(); const p = point(e); canvas.setPointerCapture(e.pointerId); pointers.set(e.pointerId, p); if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinch = Math.hypot(a.x - b.x, a.y - b.y); drag = null; return; } drag = { ...p, startX: p.x, startY: p.y, moved: false }; };
    const move = (e: PointerEvent) => { const p = point(e); if (pointers.has(e.pointerId)) pointers.set(e.pointerId, p); if (pointers.size === 2) { const [a, b] = [...pointers.values()], d = Math.hypot(a.x - b.x, a.y - b.y); if (pinch) zoom(d / pinch); pinch = d; return; } if (!drag) return; drag.moved ||= Math.hypot(p.x - drag.startX, p.y - drag.startY) > 4; if (drag.moved) { latest.current.onPan(); const a = unproject(drag.x, drag.y, w, h, camera.current), b = unproject(p.x, p.y, w, h, camera.current); camera.current.x += a.x - b.x; camera.current.y += a.y - b.y; } drag.x = p.x; drag.y = p.y; };
    const up = (e: PointerEvent) => { pointers.delete(e.pointerId); pinch = 0; if (drag && !drag.moved) { const p = point(e); const hit = hits.filter(hit => Math.hypot(p.x - hit.x, p.y - hit.y) <= hit.radius).sort((a, b) => a.kind !== b.kind ? a.kind === 'citizen' ? -1 : 1 : Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0]; if (hit) latest.current.onSelect({ kind: hit.kind, id: hit.id }); } drag = null; };
    const cancel = (e: PointerEvent) => { pointers.delete(e.pointerId); drag = null; pinch = 0; };
    const wheel = (e: WheelEvent) => { e.preventDefault(); zoom(Math.exp(-e.deltaY * .001)); };
    const key = (e: KeyboardEvent) => { if (e.key === 'Enter') { const current = latest.current.display.selection; latest.current.onSelect({ kind: 'citizen', id: current?.kind === 'citizen' ? (current.id + 1) % engine.state.citizens.length : 0 }); e.preventDefault(); } if (e.key === '+' || e.key === '=') { zoom(1.3); e.preventDefault(); } if (e.key === '-') { zoom(1 / 1.3); e.preventDefault(); } const axis = e.key === 'ArrowLeft' ? [-1, 0] : e.key === 'ArrowRight' ? [1, 0] : e.key === 'ArrowUp' ? [0, -1] : e.key === 'ArrowDown' ? [0, 1] : null; if (axis) { latest.current.onPan(); camera.current.x += axis[0] * 50 / camera.current.zoom; camera.current.y += axis[1] * 50 / camera.current.zoom; e.preventDefault(); } };
    canvas.addEventListener('pointerdown', down); canvas.addEventListener('pointermove', move); canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', cancel); canvas.addEventListener('wheel', wheel, { passive: false }); canvas.addEventListener('keydown', key);
    return () => { canvas.width = canvas.height = 1; cancelAnimationFrame(raf); resize.disconnect(); canvas.removeEventListener('pointerdown', down); canvas.removeEventListener('pointermove', move); canvas.removeEventListener('pointerup', up); canvas.removeEventListener('pointercancel', cancel); canvas.removeEventListener('wheel', wheel); canvas.removeEventListener('keydown', key); };
  }, [active, engine]);
  return <canvas ref={ref} className="city-canvas" aria-label={tr("Interactive city map. Select a resident or building. Drag to pan, scroll or pinch to zoom. Arrow keys pan; Enter selects the next resident. Resident selection is also available beside the map.")} role="img" tabIndex={0} />;
}
