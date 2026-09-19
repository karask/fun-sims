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

## City Life construction, economy and local saves — 18 September 2026

- City state now owns buildings, street segments, stops, business accounts, rents, migration and fractional simulation time. Versioned snapshots validate their structure and entity references before replacing state. Independent engine instances do not share mutable layouts.
- All 32 city checks pass: the existing 12 behavior and 8 scene checks, plus 12 construction/growth/storage/comparison checks. New checks cover construction costs and atomic rejection, relocation capacity, blocked journeys and reconnection, protected transit topology, queues/signals/parking, immigration and hiring limits, closures/departures, malformed-save rejection, exact fractional-time replay, independent named saves and quota failure, equal-duration comparisons/cancellation, and edited 3D geometry.
- The full test suite passed across all simulations and Greek localization. The final city suite, TypeScript check and production build passed again after traffic and camera changes. The build retains the existing non-blocking large-chunk warning.
- Browser: constructed housing on plot 4, observed its new inspector and construction cost; saved a named city; recovered the autosave after a fresh page load; loaded the named save paused with its previous weather and time. The default 3D scene rendered successfully, and Neighborhood and Street view presets were visually checked. The map fallback was also observed during an initial WebGL initialization failure; Retry 3D is available.
- Browser comparisons: identical policies returned identical results at 120 minutes. Changing rain produced different results while both copies ended at 12:35 and the live city stayed paused at 10:35. The interface identifies completed-trip sampling and endpoint-emissions limits so short runs are not presented as cumulative forecasts.
- Visually inspected the 390 × 844 layout: construction controls wrap, camera presets and zoom remain accessible, the 3D city fits the viewport, and the inspector follows the canvas. Restored the normal viewport after testing. Physical-device touch gestures and end-to-end exported-file download/import remain unverified; serialization and validation paths are covered by tests.
- No publishing or deployment was performed. The local server runs at `http://localhost:5173/#city-life`; named saves and autosave remain in the browser profile. The street lattice and bus-loop route remain fixed, and the economic and traffic rules are deliberate simplified models documented in README.

- Final reload check found and fixed a development effect-replay issue: renderer cleanup no longer forces loss of a canvas context that React may reuse. A fresh page load restored the autosave and rendered 3D directly; the Retry 3D recovery control was also exercised. Scoped ESLint and `git diff --check` pass.

## Ant surface trails and finite food — 19 September 2026

- Pheromone visualization is enabled initially, uses the actual worker snapshot field with a fixed concentration-to-brightness mapping, and caches its raster between snapshots. Activity and scent now render independently when both overlays are enabled. The surface guide exposes peak concentration, weak/strong colors, and the current evaporation half-life in simulation seconds.
- Resource collection was already finite. A new regression test verifies that the last 0.3-unit portion is collected exactly, the source stays at zero after further simulation, the returning carrier deposits scent, and save/load preserves depletion. Each source now shows its remaining percentage and a persistent empty marker. Surface food totals exclude water and distinguish outside food from stored reserves.
- TypeScript, all 21 ant checks, solar/nest scene checks, Greek localization, and the production build passed. Ant simulation benchmarks in this run: 0.393 / 1.214 / 3.657 ms per fixed tick for 200 / 1,000 / 3,000 workers respectively. These are engine measurements, separate from browser rendering.
- Browser: inspected the restored colony at desktop, 820 × 1180 tablet, and 390 × 844 phone dimensions. Reinforced routes and remaining-resource labels are visible. Verified the keyboard scent switch updates both controls, combined activity/scent overlays, expandable educational notes, and the lower-chamber explanation. Narrow habitats place environment and zoom controls horizontally to avoid covering food labels. Viewport override was reset; the existing colony stayed paused and unmodified.
- The lower chamber is extra traversable space and an alternative destination for brood relocation. The model varies temperature and moisture with vertical depth; it does not give that chamber a dedicated waste function. No deployment was performed.

## Ant Learn mode and storage alignment — 19 September 2026

- Added an optional, read-only Learn layer with an accessible topic picker, selectable nest chambers/tunnels (2D and 3D), surface resources, scent spots, queen and midden. The learning inspector shows live measurements, an open-cell route from the nest entrance, carrier travel estimates, suggested observations, and expandable model limitations/research links. Carrier prompts inspect a currently observed individual without automatically moving the camera. Phones use a dismissible/minimizable bottom drawer.
- Food and water carriers now unload at the labeled food stores; workers feed there. Queen feeding and larval provisioning still use pooled reserves and are explicitly identified as abstractions. New colonies have an upper supply passage that bypasses the queen's chamber; existing saves retain their nest grid. The queen remains stationary at her predefined position. No biologically optimized chamber spacing is claimed.
- All 21 ant behavior checks passed with the longer storage journey, plus dedicated learning checks for traversable route segments, the queen bypass, local conditions, read-only inspection, delivery at the stores (not the queen), and location-dependent worker feeding. Nest scene tests verify learning geometry, visibility cleanup, finite meshes, and unchanged simulation state. TypeScript, scoped ESLint for the new learning modules, and localization checks passed; the production build passed with the existing large-chunk warning.
- Engine throughput in this run: approximately 0.38 / 2.09 / 7.19 ms per tick for 200 / 1,000 / 3,000 workers. Nest scene CPU updates with the usual overlays: approximately 0.56 / 1.20 / 2.66 ms per frame; these exclude GPU rendering. The learning routes are recomputed from the small open-cell graph, and 3D tunnel picking is performed on demand.
- Browser: selected the lower chamber and food stores; verified their temperature/moisture/reserve readings and highlighted routes; used Enter on a 3D chamber label to select the queen chamber. Observed 38 samples of local pheromone history during a short run and confirmed that its plotted points were unchanged while paused, including after switching to the phone drawer. Checked the 390 × 844 layout and Show this place minimization; reset the viewport override. The pre-test checkpoint was restored afterward: 210 workers, 40 brood, elapsed time 00:02:56, paused. Learn mode was left on with the queen selected.
- Learning history is transient, specific to the selected scent location, and cleared when selecting another target or loading/resetting a colony. Model notes distinguish illustrative geometry, accelerated time, pooled nourishment, simplified climate gradients, and removed refuse from individually observed transport. No deployment was performed.

## Optional ant encounters and surface competition — 19 September 2026

- Added opt-in hunting spiders and rival food foragers, temporary Defending / Retreating worker tasks, a separate amber alarm field with a three-second half-life, and local support/condition/cargo decisions. Visitors enter at the world boundary, sense locally, avoid rocks, and withdraw after collecting prey/food or under pressure. Rivals deplete the same finite nectar/protein sources without contributing to the resident colony's stores. No nest invasion or rival colony engine is implied.
- Version 3 saves preserve visitors, their food memories/cargo, alarm, arrival clocks, options, outcome counters, clock and seeded RNG. Versions 1/2 migrate with encounters off. New imports reject invalid visitor geometry, duplicate IDs, inconsistent cargo, invalid clocks and malformed fields before replacement. Prolonged defensive decisions were specifically checked for save validity.
- Full project tests passed, followed by all ant/learning/nest tests again after the final save-validation and decision-timer changes. Thirteen encounter checks cover opt-in arrivals, support versus isolation, underground exclusion, cargo/memory retention, local alarm recruitment and independent decay, exact final food collection, occlusion, prey consumption and released refuse, repulsion/withdrawal, obstacles/bounds, pause, deterministic replay, mid-encounter restore, legacy migration and atomic import rejection. Final TypeScript, scoped ESLint, localization and production build checks passed; the existing build chunk-size warning remains.
- Engine benchmarks with an active spider and rival forager: 0.675 / 2.053 / 5.932 ms per fixed tick for 200 / 1,000 / 3,000 workers in the seeded starting distribution. These measure simulation CPU separately from rendering and do not represent 3,000 simultaneous surface fighters. Browser observation around 200–250 workers showed approximately 0.8 ms/frame rendering, with reported FPS varying around 47–60 during accelerated observation and inspection.
- Live browser encounters produced captured workers, repelled visitors, and 4.8 units taken by rival collectors. Inspected an eight-legged spider and its objective/energy/cargo/memory card; checked zoom and inspector spacing at desktop and 820 × 1180 tablet size, including an offset that keeps a focused visitor clear of the inspector. At 390 × 844, checked the bottom drawer, Show this visitor minimization, wrapped encounter controls, and keyboard alarm toggling. Find worker includes both new tasks and its keyboard-selected empty state. Browser error/warning log was empty.
- Restored the pre-test checkpoint afterward: 210 workers, 40 brood, zero deaths, 00:02:56, paused, encounters off. Reset the viewport override and surface camera. Named saves were retained. README and in-app explanations distinguish the research inspiration from illustrative alarm chemistry, fight costs, sensing distances, arrival times, off-screen rival home, and capped visitor duration. No deployment, commit, or push was performed for this change.
