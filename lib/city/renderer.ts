import { translate, type Language } from '../i18n/translate';
import { BUILDINGS, BUS_ROUTE, BUS_STOPS, CLOSED_ROAD, CityEngine, HEIGHT, Layer, NODES, Point, ROADS, WIDTH } from './engine';
export interface Camera { x: number; y: number; zoom: number }
export type Selection = { kind: 'citizen' | 'building'; id: number } | null;
export interface Display { language?: Language; layer: Layer; labels: boolean; busRoute: boolean; selection: Selection; follow: boolean }
export interface Hit extends Point { kind: 'citizen' | 'building'; id: number; radius: number }
export const COLORS = { home: '#80b7aa', office: '#89a9d0', shop: '#d7b67c', park: '#78a675', service: '#b8a3cc' };
export function transform(width: number, height: number, camera: Camera) { const scale = Math.min(width / WIDTH, height / HEIGHT) * camera.zoom; return { scale, ox: width / 2 - camera.x * scale, oy: height / 2 - camera.y * scale }; }
export function unproject(x: number, y: number, width: number, height: number, camera: Camera): Point { const t = transform(width, height, camera); return { x: (x - t.ox) / t.scale, y: (y - t.oy) / t.scale }; }
function rect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, fill: string) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fillStyle = fill; ctx.fill(); }
export function drawCity(ctx: CanvasRenderingContext2D, width: number, height: number, engine: CityEngine, camera: Camera, display: Display): Hit[] {
  const s = engine.state, hits: Hit[] = [], { scale, ox, oy } = transform(width, height, camera);
  ctx.clearRect(0, 0, width, height); ctx.fillStyle = '#101d21'; ctx.fillRect(0, 0, width, height);
  ctx.save(); ctx.translate(ox, oy); ctx.scale(scale, scale);
  ctx.fillStyle = '#1b2c2e'; ctx.fillRect(52, 52, 1127, 747);
  ctx.lineCap = 'round';
  // The map is a direct view of the road graph used for movement and route planning.
  for (const road of ROADS) {
    const a = NODES[road.a], b = NODES[road.b], load = engine.roadLoad(road.key);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.strokeStyle = '#3b4a49'; ctx.lineWidth = 30; ctx.stroke();
    ctx.strokeStyle = display.layer === 'traffic' ? (load > 3 ? '#b87357' : load > 1 ? '#8b8151' : '#334c48') : display.layer === 'pollution' ? (load > 2 ? '#916e53' : load ? '#596047' : '#2b4143') : '#26393c'; ctx.lineWidth = 22; ctx.stroke();
    ctx.strokeStyle = '#6e82823b'; ctx.lineWidth = 1; ctx.setLineDash([7, 9]); ctx.stroke(); ctx.setLineDash([]);
    if (s.policies.roadClosed && road.key === CLOSED_ROAD) {
      const x = (a.x + b.x) / 2, y = (a.y + b.y) / 2;
      ctx.strokeStyle = '#f0a27e'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x - 6, y - 13); ctx.lineTo(x + 6, y + 13); ctx.moveTo(x + 6, y - 13); ctx.lineTo(x - 6, y + 13); ctx.stroke();
    }
  }
  if (display.busRoute) {
    ctx.beginPath(); BUS_ROUTE.forEach((n, i) => i ? ctx.lineTo(NODES[n].x + 5, NODES[n].y + 5) : ctx.moveTo(NODES[n].x + 5, NODES[n].y + 5)); ctx.closePath(); ctx.strokeStyle = '#72c7d175'; ctx.lineWidth = 3; ctx.stroke();
    for (const n of BUS_STOPS) { const p = NODES[n]; rect(ctx, p.x + 13, p.y + 13, 14, 14, 3, '#82d5dc'); ctx.fillStyle = '#18323a'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('B', p.x + 20, p.y + 24); }
  }
  const hour = s.time % 1440 / 60;
  const night = hour >= 20 || hour < 6;
  for (const b of BUILDINGS) {
    const selected = display.selection?.kind === 'building' && display.selection.id === b.id;
    let color = COLORS[b.kind];
    if (display.layer === 'happiness') { const residents = s.citizens.filter(c => c.home === b.id); const average = residents.length ? residents.reduce((v, c) => v + c.happiness, 0) / residents.length : 70; color = average < 50 ? '#d78c74' : average < 70 ? '#d1ba76' : '#87c9b1'; }
    const x = b.x - 46, y = b.y - 32;
    rect(ctx, x, y, 92, 64, 5, b.kind === 'park' ? '#294538' : '#1c2d30');
    if (selected) { ctx.strokeStyle = '#f2d599'; ctx.lineWidth = 2.5; ctx.stroke(); }
    if (b.kind === 'park') {
      ctx.strokeStyle = '#79977755'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x + 15, y + 50); ctx.lineTo(x + 42, y + 22); ctx.lineTo(x + 79, y + 43); ctx.stroke();
      for (let k = 0; k < 5; k++) { ctx.fillStyle = k % 2 ? '#60886b' : '#497656'; ctx.beginPath(); ctx.arc(x + 15 + (k * 19) % 68, y + 12 + (k * 23) % 40, 7 + k % 3, 0, Math.PI * 2); ctx.fill(); }
    } else {
      const tall = b.kind === 'office', house = b.kind === 'home';
      const bw = house ? 28 : 62, bh = tall ? 43 : 34;
      for (let k = 0; k < (house ? 2 : 1); k++) {
        const bx = x + 14 + k * 36, by = y + 12;
        rect(ctx, bx + 3, by + 5, bw, bh, 2, '#08191c65');
        rect(ctx, bx, by, bw, bh, 2, `${color}65`);
        ctx.fillStyle = `${color}b0`; ctx.fillRect(bx + 2, by, bw - 4, 3);
        for (let wx = bx + 5; wx < bx + bw - 3; wx += 10) for (let wy = by + 9; wy < by + bh - 4; wy += 12) { ctx.fillStyle = night ? (b.kind === 'home' ? '#edce8e' : '#9bb8b85c') : '#bad4cb5c'; ctx.fillRect(wx, wy, 4, 5); }
      }
    }
    if (display.labels && scale > .65) { ctx.fillStyle = '#c2d4cb'; ctx.font = '11px sans-serif'; ctx.textAlign = 'center'; const label = b.kind === 'home' ? `HOME ${b.id + 1}` : b.name; ctx.fillText(translate(label, display.language ?? 'en'), b.x, b.y + 45); }
    hits.push({ kind: 'building', id: b.id, x: b.x * scale + ox, y: b.y * scale + oy, radius: 39 * scale });
  }
  const selectedCitizen = display.selection?.kind === 'citizen' ? s.citizens[display.selection.id] : undefined;
  if (selectedCitizen?.trip) {
    ctx.beginPath(); ctx.moveTo(selectedCitizen.x, selectedCitizen.y); for (const p of selectedCitizen.trip.path.slice(selectedCitizen.trip.index)) ctx.lineTo(p.x, p.y); ctx.setLineDash([6, 6]); ctx.strokeStyle = '#f5d99b'; ctx.lineWidth = 2; ctx.stroke(); ctx.setLineDash([]);
    const dest = BUILDINGS[selectedCitizen.trip.destination]; ctx.strokeStyle = '#f5d99b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(dest.x, dest.y, 14, 0, Math.PI * 2); ctx.stroke();
  }
  for (const c of s.citizens) {
    const selected = selectedCitizen?.id === c.id;
    const indoors = !c.trip;
    if (c.trip?.stage === 'riding' && !selected) continue;
    const x = c.x + (indoors ? (c.id % 4 - 1.5) * 3 : c.trip?.mode === 'car' ? -4 : 8), y = c.y + (indoors ? (c.id % 3 - 1) * 3 : -5);
    if (selected) { ctx.beginPath(); ctx.arc(x, y, 11, 0, Math.PI * 2); ctx.strokeStyle = '#f5d99b'; ctx.lineWidth = 2; ctx.stroke(); ctx.fillStyle = '#f5d99b18'; ctx.fill(); }
    if (c.trip?.mode === 'car') { const target = c.trip.path[c.trip.index]; const horizontal = !target || Math.abs(target.x - c.x) > Math.abs(target.y - c.y); rect(ctx, x - (horizontal ? 6 : 3), y - (horizontal ? 3 : 6), horizontal ? 12 : 6, horizontal ? 6 : 12, 2, selected ? '#fff0bf' : ['#d7b87e','#8abdbd','#adbad5','#d3947a'][c.id % 4]); }
    else { ctx.fillStyle = selected ? '#ffdd95' : indoors ? '#c5d4bc70' : '#e0d6ba'; ctx.beginPath(); ctx.arc(x, y, selected ? 4 : 2.8, 0, Math.PI * 2); ctx.fill(); }
    hits.push({ kind: 'citizen', id: c.id, x: x * scale + ox, y: y * scale + oy, radius: selected ? 12 : 7 });
  }
  for (const bus of s.buses) { rect(ctx, bus.x - 10, bus.y - 5, 22, 10, 3, '#80d2dc'); ctx.fillStyle = '#214850'; ctx.fillRect(bus.x - 6, bus.y - 3, 6, 6); ctx.fillRect(bus.x + 3, bus.y - 3, 5, 6); }
  if (night) { ctx.fillStyle = '#09173828'; ctx.fillRect(45, 45, 1140, 760); }
  if (s.policies.rain) { ctx.strokeStyle = '#bdd8e326'; ctx.lineWidth = 1; for (let i = 0; i < 80; i++) { const x = (i * 151 + s.time * 2) % WIDTH, y = (i * 71 + s.time * 8) % HEIGHT; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 4, y + 12); ctx.stroke(); } }
  if (display.labels) {
    ctx.font = '600 13px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#89aba6';
    ctx.fillText(translate('L I N D E N   Q U A R T E R', display.language ?? 'en'), 345, 53); ctx.fillText(translate('E A S T   G A R D E N S', display.language ?? 'en'), 867, 53); ctx.fillText(translate('S O U T H S I D E', display.language ?? 'en'), 607, 794);
  }
  ctx.restore(); return hits;
}
