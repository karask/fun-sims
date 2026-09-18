# Local validation

Verified on 18 September 2026. These are development-machine measurements, not performance guarantees across devices.

## Automated checks

- `npm test`: 14 behavioral checks passed.
- `npm run typecheck`: passed.
- `npm run build`: production build passed.

Behavior checks cover initial geometry; seeded determinism; exact continuation after JSON save/load; all-system pause; rejected imports and commands preserving state; pheromone decay; local food pickup and home delivery; surface/nest collision safety; brood development and births; starvation; excavation, soil delivery and waste removal; brood relocation; forgetting depleted resources; local recruitment without global food knowledge; and task changes in response to nearby brood needs.

A 240-second seeded run produced 12 new workers, 29 excavated cells, 25 deposited soil loads, and 7 removed waste items. Development uses the documented sandbox timescale.

## Throughput

The engine benchmark advances 300 fixed ticks (10 simulation seconds) per population in Node, including all colony systems. Results from the final test run:

| Initial workers | Average simulation time/tick | Simulation ticks/second |
| --- | ---: | ---: |
| 200 | 0.356 ms | 2,807 |
| 1,000 | 1.071 ms | 933 |
| 3,000 | 3.219 ms | 311 |

Browser observations at a 1440 × 900 viewport, with simulation and rendering timing measured separately:

| Workers | View and layers | Observed FPS | Render time/frame | Simulation time/tick |
| --- | --- | ---: | ---: | ---: |
| 200 | Surface, normal view | 60 | about 1.2 ms | about 0.1–0.5 ms |
| 1,000 | Nest, activity and moisture enabled | 60 | about 2.9 ms | about 0.4 ms |
| 3,000 | Nest, activity and moisture enabled | 47 | about 6.9 ms | about 3.8 ms |

These are sampled UI readings, not percentile or sustained-load measurements. Approximately 876 ants were underground for the 1,000-worker check and 2,396 for the 3,000-worker check; all ants continued to simulate regardless of view. The 3,000-worker case does not sustain 60 FPS on this test environment. Controls remained operable. Cached terrain, gait sprites, bounded local-neighbor queries, and reduced React update frequency keep drawing independent of simulation updates.

## Browser checks

- Inspected desktop, 1024 × 768 tablet, and 390 × 844 phone layouts. Checked sidebar drawer, underground view, zoom controls, selection, inspector, and the mobile follow chip.
- Checked keyboard selection with Enter, playback controls, and accessible slider labels. Touch pan/pinch handlers are implemented; physical touch-device testing remains outstanding.
- Surface/Nest tabs use the same running colony and preserve separate camera state. Following a selected ant keeps the mobile world visible.
- Saved a named colony; restored valid 1,000- and 3,000-worker JSON fixtures in paused state. A malformed/unsupported file showed an error and preserved the existing colony. Autosave restored a paused session after reload.
- Export prepared a versioned JSON Blob and a Download JSON link. The in-app browser automation did not report a completed download, so end-to-end file download remains unverified in that environment. Copy JSON provides an additional recovery path. Use a normal local browser to confirm a downloaded file is present before relying on an exported backup.
- Browser-agent read, pause, placement, and erase commands worked through the shared validated adapter. Adding a source increased its count from 4 to 5; erasing it restored 4. Out-of-bounds placement was rejected. Time and colony state stayed frozen during these paused checks.
- No application console errors were observed in the final browser checks.

## Scope limits

This is a simplified biological sandbox, not a calibrated model of a real colony. See README.md for the explicit biological assumptions, compressed development/aging rates, and excluded features. No deployment was performed. Saves remain in the local browser profile.

## Solar System Lab addition — 18 September 2026

- Ten focused solar tests pass: a known J2000 Earth position; reference body inventory/date bounds/pause; barycentric conversion; one-year circular-orbit energy and position stability; collision mass and momentum; motion after removing the Sun; input validation/body limits/reset; all four scenarios; deterministic integration; increased Earth speed.
- Existing fourteen ant tests still pass. TypeScript and the production build pass with both simulators integrated.
- Desktop (1440 × 960) and phone (390 × 844) inspected. Mobile sidebar, mode controls, inspector scrolling, and zoom controls checked. Physical-device touch gestures remain unverified.
- Browser: selected the second simulation through the hub navigation; ran the faster-Earth scenario; advanced one simulated day; opened body controls; dragged out a probe launch, increasing the body count from 14 to 15; confirmed its displayed speed and position. Switching to ants and back preserved the exact solar date, positions, velocities, and body inventory. The previous ant colony and its saved session remained intact.
- Observed approximately 55–60 FPS on the reference view and paused experiment at desktop size. These are sampled interface readings, not sustained performance guarantees. Close encounters may reduce achieved simulation speed; the clock records actual computed time.
- Sources and model limits are documented in the in-app Lab notes and README. Solar state is tab-local; it is not represented as a saved or live astronomical ephemeris.

## City Life addition — 18 September 2026

- Twelve city behavior checks pass: initial town and bus-route connectivity; seeded determinism; pause and manual advance; exact checkpoint replay; road-closure routing; bus boarding/fares/service withdrawal; free transit mode choice; rainy commute delays; wages/tax/service effects; several-day routine and state invariants; rejected invalid policies; deterministic reset.
- `npm test` passes all 36 checks across ants, solar, and city. Scoped ESLint, TypeScript checking, and the production build pass.
- The running local preview responds with HTTP 200 after integration. Browser visual/interaction testing was not performed in this task. Keyboard, pointer, pinch, responsive layouts, and inactive-simulation suspension are implemented; physical-device behavior remains unverified.
- City Life is available through shared hub navigation and `#city-life`. The first version is explicitly session-only, with fixed residents/buildings and simplified public services/emissions. Existing ant and solar simulation engines are unchanged.

## City Life full 3D view — 18 September 2026

- Added a local Three.js/WebGL2 perspective renderer. 3D is the default; the existing map remains available. Both consume the same engine and only the active view advances it.
- Eight additional scene checks cover complete volumetric building/road representation, perspective framing at five aspect ratios, 3D building/resident raycasting, state immutability during scene updates, live vehicle positions, view/checkpoint continuity, paused rain and night lighting, finite geometry, and resource disposal.
- All 44 engine/scene checks, TypeScript, scoped ESLint, and the production build pass. The local hub responds with HTTP 200. Browser visual, GPU, touch-device, and interaction testing were not performed for this update; the scene checks run without a graphics context.
- 3D resources are released on unmount. Rendering suspends with inactive city/view, dialogs, or hidden browser tabs. Graphics initialization failure or context loss falls back to the overhead map with a visible explanation, preserving city state.

## Volumetric nest upgrade — 18 September 2026

The nest now uses a 70 × 45 × 9 volume. New colonies have connected chambers offset along the third axis; legacy saves are expanded deterministically without resetting population, clock, or RNG. The 2D renderer projects that same volume. Rendering does not advance or mutate the model.

- All **20 ant behavior checks** pass, including six new checks for connected depth layers, food delivery across layers without crossing soil, depth-aware local sensing, third-axis excavation, version 1 migration, and rejection of invalid 3D saves.
- Added scene checks for finite geometry, 200/1,000/3,000 workers, cutaway visibility, selected-ant visibility, picking bounds, state immutability, disposal, and camera framing at phone/square/desktop aspect ratios.
- The full test command also passed the existing 10 solar, 12 city behavior, 8 city 3D, and Greek localization checks. TypeScript and production build pass. The build reports a non-blocking bundle-size warning for the combined 3D application.
- Final Node measurements: 0.508 / 1.688 / 6.822 ms per simulation tick at 200 / 1,000 / 3,000 workers. Scene update costs were 0.77 / 1.52 / 3.00 ms per CPU frame, excluding GPU rendering. These results were collected while the local development environment was active and are not device-independent guarantees.
- Browser verification: imported version 2 fixtures; observed the migrated original save; used 3D keyboard orbit and ant selection; selected and followed a nursing worker; enabled activity and moisture overlays; changed the slice endpoints; fitted the camera; switched to the 2D map; and inspected the 390 × 844 mobile inspector/follow-chip layout. No application console errors were observed in these checks. Physical touch testing and forced WebGL context-loss recovery remain unverified on real hardware.
- The 3D cavity is a smoothed visual boundary of the navigation voxels. Soil strata and scale are illustrative. Ants move within traversable cells, with simplified body orientation and gait; foot contact with tunnel walls is not a physical locomotion model. Brood and carried cargo retain depth, and aggregated food reserves appear as a symbolic store pile.

Browser performance samples at 1440 × 900 with activity and moisture overlays: the 200-worker 3D view ran around 50–57 FPS; 1,000 workers settled near 52 FPS (3.0 ms/frame, 1.1 ms/tick); the excavating 3,000-worker colony ran around 28 FPS (7.7 ms/frame, 4.6 ms/tick) after detail and mesh-update optimization. Controls remained operable, but large colonies do not sustain 60 FPS on this machine. Distant ants use simpler meshes; close views restore full geometry. Tunnel mesh updates can trail excavation by up to approximately 350 ms; simulation and picking positions continue independently.
