'use client';
import { useT } from '@/lib/i18n/language';
import { useEffect, useImperativeHandle, useRef } from 'react';
import { translate } from '@/lib/i18n/translate';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { BUILDINGS, type CityEngine } from '@/lib/city/engine';
import { CITY_CENTER, CityScene, buildingHeight, fitCityDistance } from '@/lib/city/scene';
import type { Display, Selection } from '@/lib/city/renderer';
import type { CityControls } from './city-canvas';

type Runtime = { camera: THREE.PerspectiveCamera; orbit: OrbitControls; fit: () => void };
function labelTexture(text: string) {
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 96;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#162d2bee'; ctx.beginPath(); ctx.roundRect(4, 4, 504, 88, 15); ctx.fill();
  ctx.strokeStyle = '#a8cab455'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = '#e3eedd'; ctx.font = '500 54px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 256, 48, 480);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; return texture;
}
export default function CityThree({ engine, active, display, controlsRef, onSelect, onChange, onPan, onUnavailable }: { engine: CityEngine; active: boolean; display: Display; controlsRef: React.RefObject<CityControls | null>; onSelect: (selection: Selection) => void; onChange: () => void; onPan: () => void; onUnavailable: (message: string) => void }) {
 const tr = useT();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const savedCamera = useRef<{position: number[]; target: number[]; followed: number | null} | null>(null);
  const runtimeRef = useRef<Runtime | null>(null);
  const latestRef = useRef({ active, display, onSelect, onChange, onPan, onUnavailable });
  useEffect(() => { latestRef.current = { active, display, onSelect, onChange, onPan, onUnavailable }; }, [active, display, onSelect, onChange, onPan, onUnavailable]);
  useImperativeHandle(controlsRef, () => ({
    zoom: factor => { const r = runtimeRef.current; if (!r) return; const offset = r.camera.position.clone().sub(r.orbit.target); offset.setLength(THREE.MathUtils.clamp(offset.length() / factor, r.orbit.minDistance, r.orbit.maxDistance)); r.camera.position.copy(r.orbit.target).add(offset); r.orbit.update(); },
    fit: () => { runtimeRef.current?.fit(); latestRef.current.onPan(); },
    rotate: angle => { const r = runtimeRef.current; if (!r) return; const offset = r.camera.position.clone().sub(r.orbit.target); offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), angle); r.camera.position.copy(r.orbit.target).add(offset); r.orbit.update(); },
  }), []);
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas || !active) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' }); }
    catch { latestRef.current.onUnavailable('3D is unavailable in this browser. The city is still playable in the overhead map. Enable hardware acceleration to use 3D.'); return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    let labelLanguage = latestRef.current.display.language ?? 'en';
    const city = new CityScene(engine.state.citizens.length, text => labelTexture(translate(text, labelLanguage))); 
    const camera = new THREE.PerspectiveCamera(42, 1, 1, 12000);
    const orbit = new OrbitControls(camera, canvas);
    orbit.enableDamping = true; orbit.dampingFactor = .09; orbit.rotateSpeed = .65; orbit.panSpeed = .8; orbit.zoomSpeed = .85;
    orbit.minDistance = 65; orbit.maxDistance = 8000; orbit.minPolarAngle = .08; orbit.maxPolarAngle = Math.PI * .485; orbit.screenSpacePanning = false;
    orbit.target.copy(CITY_CENTER); orbit.cursor.copy(CITY_CENTER); orbit.maxTargetRadius = 1300;
    if (savedCamera.current) { camera.position.fromArray(savedCamera.current.position); orbit.target.fromArray(savedCamera.current.target); orbit.update(); }
    orbit.listenToKeyEvents(canvas); // Arrow keys pan; Shift+arrows orbit. Keyboard focus stays on the canvas.
    const fit = () => { orbit.target.copy(CITY_CENTER); camera.position.copy(CITY_CENTER).add(new THREE.Vector3(.82, 1.08, 1).normalize().multiplyScalar(fitCityDistance(camera.aspect))); orbit.update(); };
    runtimeRef.current = { camera, orbit, fit };
    let width = 0, height = 0, raf = 0, last = performance.now(), lastUI = last, stopped = false, fitted = false, followed: number | null = savedCamera.current?.followed ?? null;
    const resize = new ResizeObserver(() => { const bounds = canvas.getBoundingClientRect(); if (!bounds.width || !bounds.height) return; const previousAspect = camera.aspect; width = bounds.width; height = bounds.height; camera.aspect = width / height; camera.updateProjectionMatrix(); renderer.setSize(width, height, false); if (!fitted) { if (!savedCamera.current) fit(); fitted = true; } else if (Math.abs(previousAspect - camera.aspect) > .3 && camera.position.distanceTo(orbit.target) > 1000) fit(); });
    resize.observe(canvas);
    const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();
    let press: { id: number; x: number; y: number; moved: boolean } | null = null;
    const pointers = new Set<number>();
    const down = (e: PointerEvent) => { canvas.focus(); pointers.add(e.pointerId); if (pointers.size > 1) { press = null; latestRef.current.onPan(); return; } if (e.button === 2) latestRef.current.onPan(); if (e.button === 0) press = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: false }; };
    const move = (e: PointerEvent) => { if (press && Math.hypot(e.clientX - press.x, e.clientY - press.y) > 5) { press.moved = true; latestRef.current.onPan(); } };
    const up = (e: PointerEvent) => { pointers.delete(e.pointerId); if (press?.id === e.pointerId && !press.moved && latestRef.current.active) {
      const bounds = canvas.getBoundingClientRect(); pointer.set((e.clientX - bounds.left) / bounds.width * 2 - 1, -(e.clientY - bounds.top) / bounds.height * 2 + 1); raycaster.setFromCamera(pointer, camera); const selected = city.pick(raycaster); if (selected) latestRef.current.onSelect(selected);
    } press = null; };
    const cancel = (e: PointerEvent) => { pointers.delete(e.pointerId); press = null; };
    const key = (e: KeyboardEvent) => {
      if (e.key.startsWith('Arrow')) latestRef.current.onPan();
      if (e.key === 'Enter') { const selected = latestRef.current.display.selection; latestRef.current.onSelect({ kind: 'citizen', id: selected?.kind === 'citizen' ? (selected.id + 1) % engine.state.citizens.length : 0 }); e.preventDefault(); }
      if (['+', '=', '-'].includes(e.key)) { const offset = camera.position.clone().sub(orbit.target); offset.setLength(THREE.MathUtils.clamp(offset.length() * (e.key === '-' ? 1.2 : 1 / 1.2), orbit.minDistance, orbit.maxDistance)); camera.position.copy(orbit.target).add(offset); orbit.update(); e.preventDefault(); }
      if (e.key.toLowerCase() === 'f') { fit(); latestRef.current.onPan(); e.preventDefault(); }
    };
    const contextLost = (e: Event) => { e.preventDefault(); stopped = true; latestRef.current.onUnavailable('The 3D view lost its graphics connection. Your city continues in the overhead map. Reload to retry 3D.'); };
    const frame = (now: number) => {
      const current = latestRef.current; const dt = Math.min(.05, Math.max(0, (now - last) / 1000)); last = now;
      orbit.enabled = current.active;
      if (!stopped && width && height && current.active && !document.hidden) {
        if (labelLanguage !== (current.display.language ?? 'en')) { labelLanguage = current.display.language ?? 'en'; city.updateLabels(text => labelTexture(translate(text, labelLanguage))); }
        engine.tick(dt); city.update(engine, current.display);
        const selected = current.display.selection;
        if (current.display.follow && selected?.kind === 'citizen') {
          const citizen = engine.state.citizens[selected.id];
          if (citizen) {
            const at = new THREE.Vector3(citizen.x, citizen.trip ? 8 : buildingHeight(BUILDINGS[citizen.location]) * .5, citizen.y);
            const delta = at.clone().sub(orbit.target); camera.position.add(delta); orbit.target.copy(at);
            if (followed !== citizen.id) { const offset = camera.position.clone().sub(orbit.target); offset.setLength(Math.min(360, offset.length())); camera.position.copy(at).add(offset); }
            followed = citizen.id;
          }
        } else followed = null;
        orbit.update();
        for (const label of city.labels.children) {
          const id = label.userData.building as number;
          const selectedBuilding = selected?.kind === 'building' ? selected.id : selected?.kind === 'citizen' && !engine.state.citizens[selected.id].trip ? engine.state.citizens[selected.id].location : -1;
          const distance = camera.position.distanceTo(label.position); label.visible = distance < 750 || id === selectedBuilding;
          const scale = THREE.MathUtils.clamp(distance / 850, .55, 2.6); label.scale.set(150 * scale, 30 * scale, 1);
        }
        try { renderer.render(city.scene, camera); }
        catch { stopped = true; current.onUnavailable('The browser could not draw the 3D city. Your simulation is available in the overhead map.'); }
        if (now - lastUI > 240) { current.onChange(); lastUI = now; }
      }
      raf = requestAnimationFrame(frame);
    };
    canvas.addEventListener('pointerdown', down); canvas.addEventListener('pointermove', move); canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', cancel); canvas.addEventListener('keydown', key); canvas.addEventListener('webglcontextlost', contextLost);
    raf = requestAnimationFrame(frame);
    return () => { savedCamera.current = {position: camera.position.toArray(), target: orbit.target.toArray(), followed}; stopped = true; cancelAnimationFrame(raf); resize.disconnect(); orbit.dispose(); runtimeRef.current = null; city.dispose(); renderer.dispose(); canvas.width = canvas.height = 1; canvas.removeEventListener('pointerdown', down); canvas.removeEventListener('pointermove', move); canvas.removeEventListener('pointerup', up); canvas.removeEventListener('pointercancel', cancel); canvas.removeEventListener('keydown', key); canvas.removeEventListener('webglcontextlost', contextLost); /* Dispose GPU resources without losing the canvas context: React can replay this effect on the same canvas. */ };
  }, [active, engine]);
  return <canvas ref={canvasRef} className="city-canvas city-canvas-3d" role="img" tabIndex={0} aria-label={tr("Interactive 3D city. Drag to orbit; right-drag or Shift-drag to pan; scroll or pinch to zoom. Arrow keys pan, Shift+arrows rotate, Enter selects the next resident, F fits the city. Select buildings or residents to inspect them.")}/>;
}
