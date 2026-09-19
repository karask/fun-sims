# Simulation Hub

A simulation hub built with React, TypeScript, Canvas 2D, and Three.js. Explore an ant colony, the Solar System Lab, and City Life through shared navigation. Each simulation preserves its state and suspends its engine when another simulation is active.

## Run locally

Requires Node.js 22.13 or newer.

```sh
npm ci
npm run dev
```

Open **http://localhost:5173/**. Leave the terminal running while using the simulator. No account, cloud save service, or deployment is needed. Colony state is simulated in your browser.

```sh
npm test             # Behavioral regression tests and CPU benchmarks
npm run typecheck    # TypeScript validation
npm run build        # Production build
npm start            # Serve the built app locally; see printed local URL
```

The development server uses port 5173 by default. Browser saves are associated with the URL origin and browser profile: using another port, hostname, or browser starts a separate save library. Use Export / Import to transfer a colony.

## Explore

- **Surface / Nest:** two views of the same colony. Nest opens as a **3D cutaway**, with an optional **2D map** that projects all depth layers. Each camera is preserved when switching views.
- **3D nest controls:** drag to orbit, right-drag or Shift-drag to pan, and scroll/pinch to zoom. Two-finger touch pans and zooms. Arrow keys orbit; Shift+arrows pan; Home fits the nest; Enter selects a worker. Slice position removes the front portion of the nest; Soil context and Labels control the surrounding strata and chamber names. Selection and Follow work in 3D. WebGL failures offer the 2D view.
- **Drag / scroll or pinch:** pan and zoom. The frame icon fits the world.
- **Select an ant:** click an ant, or use **Find worker → Cleaning** (or another task) above the habitat. Live counts cover both views. Selection centers the camera on a matching worker and opens its inspector; **Next worker** cycles through matches. Follow tracks the individual even when its task or view changes. When nobody is doing the chosen task, the selector shows an empty message and disables Next worker.
- **Environment tools:** place nectar, protein, water, or rocks; erase nearby resources or rocks. Edits apply on the surface. The immediate entrance stays clear, and rocks cannot be placed on existing ants or resources.
- **World layers:** pheromones, task colors / traffic, and underground moisture conditions.
- **Surface encounters:** optional Hunting spiders and Rival foragers switches in the sidebar. Encounter frequency controls waiting times; first arrivals take 45 / 65 simulation seconds at 1× frequency, then new visits wait 120–240 seconds after that kind leaves. The encounter guide shows a separate amber alarm overlay, response counts, and visitor selection. Find worker includes Defending and Retreating. Visitors can also be clicked directly; phone inspectors minimize with Show this visitor.
- **Learn:** enable the optional learning layer, then select a chamber, tunnel, source, scent spot, queen, or midden. The topic picker is a keyboard-accessible alternative to habitat clicks. Live readings, connected route highlights and carrier travel estimates explain the model; sources and simplifications are tucked under Model notes. Pheromone history samples only the selected spot and freezes on pause. Show me follows a currently observed carrier; on phones, Show this place minimizes the learning drawer.
- **Settings:** temperature, moisture, developmental rate, exploration, trail half-life, scent sensitivity, and task flexibility.
- **Space:** pause / resume when focus is on the page or canvas. Canvas arrow keys pan, +/- zoom, and Enter inspects an ant. Escape exits an editing tool and clears selection.
- **Save colony:** named IndexedDB saves, automatic snapshots every 30 seconds, and versioned JSON export / import. Choose Export file, then Download JSON (or Copy JSON as a recovery option). Loaded colonies pause. Invalid imports preserve the running colony.

The population limit is 3,000 workers. Pupae wait to emerge at the limit. Requested speed is a multiplier on a fixed simulation timestep; under heavy load, the simulation clock advances only as quickly as the machine can compute it. Rendering continues independently. Pause the colony before leaving it for a long time if you do not want it to keep living while the tab remains active.

## Biological model and deliberate simplifications

This is an explanatory sandbox inspired by *Lasius niger*, not a calibrated biological forecast. Behaviors and rates are transparent approximations:

- Workers sense nearby resources, ants, and an attractive food pheromone field, separate from a short-lived alarm field. Returning food carriers reinforce trails; unreinforced trails decay exponentially. Resource memory stores a learned destination, with local obstacle avoidance rather than a perfect outdoor pathfinder. Nest navigation uses a familiar tunnel map.
- Local encounters support recruitment and a simplified food exchange. Job choices depend on age, energy, hunger, individual tendency, nearby brood, refuse, and crowding. The queen does not assign jobs.
- Carbohydrates support adult feeding, protein supports larvae and egg production, and water contributes to recovery. Returning collectors unload at the labeled food stores, and workers visit that location to feed. Stored food remains aggregated; queen feeding and larval provisioning are pooled transfers rather than individually carried meals. Liquid crops and detailed digestion are not modeled.
- Eggs, larvae, and pupae progress through separate stages. Larvae need nutrition; all stages respond to nursing and a simplified temperature / moisture comfort function. Nursing workers can carry brood toward better conditions.
- Crowding can initiate excavation of adjacent cells. Workers carry soil to a surface midden. Cleaners remove modeled waste and corpses. Grooming and rest are explicit tasks; parasites and disease are not simulated.
- At the default life-cycle rate, each fully supported brood stage takes at least 120 simulation seconds. Worker age advances by 0.015 model days per simulation second. Real ant lifetimes and developmental schedules are much longer. These compressed processes share the adjustable life-cycle rate, while movement remains readable.
- Nest geometry is a three-dimensional voxel volume (70 × 45 × 9 cells, with 20 × 20 × 40 illustrative units per cell). Navigation follows six adjacent directions, local sensing includes depth, and excavation opens neighboring voxels. The 3D cutaway uses a smoothed display mesh of that volume; the 2D map projects its occupancy. Ants move through traversable cell interiors rather than modeling six-foot contact with tunnel walls. They may overlap in dense traffic. Soil and rocks block movement. The habitat scale and soil strata are illustrative.
- New colonies have an upper supply passage to the stores that bypasses the queen’s chamber. The queen remains stationary at her predefined location; chamber spacing is illustrative, not an optimized or field-measured architecture. Existing saves keep their tunnels. Learn mode measures an open-cell route rather than straight-line separation; estimates exclude loading, feeding, decisions, and outdoor travel.
- Version 3 saves additionally preserve visitors, alarm concentrations, encounter clocks, outcomes and options. Version 2 imports retain their colony and gain disabled encounters without consuming randomness. Spatial coordinates and the full nest volume are preserved. Version 1 imports are deterministically expanded into three adjacent depth layers, preserving the old floor plan, population, clock, and random state. Newly reset colonies have chambers offset along the third axis. Keep exported copies if you need to use an older app version, which cannot read version 3 saves.
- Optional encounters add one hunting spider and up to three rival foragers on the surface. Rivals find finite nectar/protein locally and carry up to 1.6 units each to an off-screen colony; they do not use the resident food trail. These are individual visitors, not a second colony simulation. Spiders seek locally detected workers, prefer isolated prey, feed after one capture, then leave. Workers respond based on local nestmate support, energy, hunger and cargo, with temporary defending/retreating tasks and a three-second alarm half-life. Ordinary work resumes afterward.
- Encounter arrival rates, sensing ranges, alarm chemistry, energy damage and body sizes are illustrative. Spiders/rivals retreat under pressure; energy acts as a simplified condition and injury budget. Returning visitors are no longer combat targets. Visits stop foraging/hunting after 180 simulation seconds and are removed at 300 seconds if unable to leave; disabling a kind starts withdrawal. Captured prey are consumed rather than duplicated as corpses; other deaths release carried refuse for cleaners.
- No dedicated soldier caste is added: Lasius niger workers change activity. No nest invasions, simulated rival nests, seasonal weather, mating flights, founding-queen scenarios, pathogens or additional colony species are included.

Navigation inspiration: [Czaczkes et al., route learning and trail pheromones in Lasius niger](https://journals.biologists.com/jeb/article/216/2/188/11672/Ant-foraging-on-complex-trails-route-learning-and). Food sharing inspiration: [Emergent regulation of ant foraging frequency](https://pmc.ncbi.nlm.nih.gov/articles/PMC10110237/).

Defence and competition: [Sakata & Katayama: context-dependent defence](https://esj-journals.onlinelibrary.wiley.com/doi/10.1046/j.1440-1703.2001.00404.x), [Fourcassié et al.: local recruitment around intruders](https://onlinelibrary.wiley.com/doi/10.1155/2012/383757), and [Lasius niger limiting competitors’ access to resources](https://pmc.ncbi.nlm.nih.gov/articles/PMC7767331/). Predator motivation is a sandbox rule inspired by [observed spider predation on Lasius niger](https://pmc.ncbi.nlm.nih.gov/articles/PMC7307562/).

## Architecture

`lib/simulation/types.ts` defines the simulator adapter contract, command union, complete serializable state, and shared model types. Future simulators can implement the same initialization, command, subscription, and disposal interface and reuse the site's sidebar primitives, canvas controls, and persistence pattern.

- `engine.ts` initializes seeded worlds, advances fixed 1/30-second ticks, and validates commands.
- `behavior.ts`, `physiology.ts`, `pheromones.ts`, `encounters.ts`, and `spatial.ts` separate behavioral systems and spatial queries.
- `ant.worker.ts` owns authoritative state. UI actions and browser-agent tools use the same adapter command path.
- `nest-volume.ts` defines volumetric cells, connected chambers, and the 2D projection. `nest-scene.ts` renders a cached marching-cubes cavity and instanced ants, brood, cargo, refuse, and food reserves. `nest-canvas.tsx` handles orbiting, picking, following, cutaway controls, and GPU cleanup.
- `renderer.ts` caches terrain and ant gait sprites, draws detail at close zoom, interpolates snapshots, and culls offscreen individuals.
- `validation.ts` validates imports before replacing state. Saves contain RNG state, memories, every entity, field, tunnel, setting, and simulation counter. Runtime navigation caches are rebuilt deterministically.
- `storage.ts` manages local IndexedDB transactions. Rendering has no effect on biological time or randomness.

The engine tests include fixed-seed determinism, exact save/resume continuation, pause, malformed imports, food collection/delivery, collision avoidance, pheromone decay, development, mortality, excavation, cleaning, and brood relocation. Browser validation and timing notes are recorded in `VALIDATION.md`.

## Solar System Lab

Choose **Solar System Lab (02)** in the sidebar, or open `http://localhost:5173/#solar-system` directly. The hash is bookmarkable and browser Back/Forward follows simulator navigation. Switching simulators retains both sessions and pauses the inactive simulation. Solar experiments use a separate IndexedDB database (`simulation-hub-solar`), with autosave every 30 seconds and when leaving the lab. The latest local state restores paused on reload; ant and city saves remain separate.

- **Explore:** the Sun, eight planets, and five selected moons; choose a reference date, control time, inspect/follow objects, and switch between a textured Three.js 3D scene and an overhead orbital map. Inner/Full system buttons frame the planets; the Objects list focuses on a planet or moon.
- **Experiment:** fork the reference state into Newtonian gravity. Change masses, multiply current relative velocities, move or remove bodies, and drag to launch massless probes or low-mass comets. Launching switches to the overhead map and pauses time. Press Play to run the launch.
- **Prepared experiments:** faster Earth, a comet approaching Jupiter, binary stars, and an illustrative Mars transfer attempt. Each replaces the solar system only, starts paused, and asks before discarding an existing experiment.
- **Display:** orbital paths/trails, labels, moons, velocity arrows, gravitational acceleration direction for the selected body, true physical sizes, and a selected-body speed chart. Bodies are enlarged by default; distances always remain linear and to scale. Moons become visible on close zoom or selection.
- **Saved experiments:** named local checkpoints, JSON export/import (validated, maximum 12 MB), and automatic recovery of the latest session. Files contain the complete physical state, comparison baseline, and bounded rewind history. Local storage failures leave JSON export available.
- **Rewind and undo:** a slider restores recorded states, with one-step navigation and undo of the last body edit. Playing or editing from the past discards the later branch. The last 240 checkpoints are retained (samples at least 0.5 simulated days apart, plus edits); trails are reconstructed from checkpoints on rewind.
- **Ghost comparison:** the unmodified baseline evolves under the same Newtonian model and timesteps as the edited system. Dashed teal trails and separated ghost bodies show divergence; the inspector reports separation in kilometres. Set a new baseline at any time, and undo that change too.
- **Controls:** drag to pan; Shift-drag or right-drag to rotate; scroll/pinch to zoom; Space to pause. Focus the canvas and use arrows to pan, +/- to zoom, or Enter to select the next body. Sidebar controls offer keyboard-accessible alternatives.

The reference model implements [JPL Table 1 orbital elements and rates](https://ssd.jpl.nasa.gov/planets/approx_pos.html), limited to 1800–2050. It is an offline approximation, not a live Horizons ephemeris. Earth represents the Earth–Moon barycenter approximately; the Moon, Io, Europa, Ganymede, and Titan use illustrative circular orbits. Radii and masses are rounded. The Sun, eight planets, and Moon use bundled 2K maps from [Solar System Scope](https://www.solarsystemscope.com/textures/) under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/); other bodies use solid surfaces. Surface maps, rotational phase, and ring structure are illustrative. Approximate spin periods and axial tilts, directional sunlight, atmospheric rims, Saturn’s rings, and smooth camera focus are visual only. Distances and physical collision sizes are unaffected. WebGL unavailability falls back to the orbital map. The experiment engine uses AU, days, and solar masses, shifts its initial frame to the system barycenter, and advances velocity-Verlet steps constrained by local gravitational and crossing times. High requested playback speeds may advance more slowly to keep computation bounded. Collisions merge bodies at physical radii and conserve mass and momentum. Relativity, tides, atmospheres, fragmentation, and precise spacecraft targeting are outside this model. Launch previews use stationary gravitating sources and are approximate.

Solar code is independent in `lib/solar` and `components/solar`, with shared simulator navigation. Read/playback browser-agent tools are available only for the active simulator. `npm test` includes the ant regression suite and 17 solar physics/persistence checks and four 3D scene checks. Run the focused solar tests with `node scripts/test-solar.mjs`.

## City Life

Choose **City Life (03)** in the hub or open `http://localhost:5173/#city-life`. The city opens in full 3D, with an optional overhead map sharing the same state. Orbit, pan, zoom, follow residents, or use the Overview, Neighborhood and Street view camera presets. WebGL failures offer the map and a Retry 3D button.

**Shape your city** provides four tool panels:

- **Build:** redevelop the 48 plots as homes, offices, shops, parks, public services or empty land. Construction spends the city treasury and requires road access. Occupied homes can only be redeveloped after enough replacement housing exists; displaced residents move there. Select properties, roads and stops directly in either view, or use the accessible pickers. Streets can be removed/rebuilt on the existing grid; stops can be added/removed along the fixed Loop. Its streets and at least two stops remain protected.
- **Growth & economy:** rents respond to occupancy at midnight. Employers hire within capacity, pay wages and overhead, close after two days of negative cash, and can reopen with private investment when demand returns. Available housing and jobs attract up to four residents per day; persistent financial hardship or low happiness causes departures. Services affect well-being and fund support for unemployed residents. Building inspectors explain road access, affordability, staffing, closure and commute problems, with links to affected people.
- **Local saves:** up to 12 named browser saves, an independent autosave every 30 seconds and on page exit, plus JSON export/import. Reload restores the autosave paused. Files are validated before replacing a city; failed writes preserve previous named saves. A damaged autosave is not automatically overwritten. Export a copy before clearing browser storage or switching browser/origin. Version 1 city snapshots migrate to the new layout/economy schema. No cloud service is required.
- **Compare policies:** capture a checkpoint (pauses the live city), change sidebar policies, then run A with original policies and B with the new policies for exactly 2 hours, 6 hours or 1 day. The runs operate on copies of the same starting state, including the random generator and fractional timestep. Outcomes show population, happiness, commute, illustrative emissions and treasury. Comparisons can be cancelled and do not replace the live city.

Cars use directional lane offsets, traffic lights, following gaps, congestion and parking delays/costs. Travel choices consider approximate journey time, fare, car ownership and budget. Buses have finite capacity, queues, signals and a long-wait walking fallback. The 3D view adds animated pedestrians, bus doors, smoother vehicle turns, storefronts, night lights and problem markers. Roads and building geometry are rebuilt after construction while preserving the camera.

This is a simplified, seeded agent sandbox, not an urban planning forecast. The street grid, plot inventory and bus-loop route remain fixed; lanes and parking are approximations rather than physical vehicle dynamics. Jobs run every day, office revenue and business reopening are stylized, and public-service funding and road emissions are illustrative. Newcomers are limited to 512 stored resident records (inactive records are reused); the 48-plot housing capacity is lower. City data remains separate from ant and solar saves.

Run `npm run test:city` for behavior, 3D scene, construction, growth, storage and comparison checks. `npm test` includes all simulations and Greek localization. Everything runs locally; no Sites deployment or external asset service is needed.


## GitHub Pages

The simulations also build as a fully static React application with no backend.
The Pages entry point reuses `app/page.tsx`, styles, simulation engines, and the
ant Web Worker. Existing Sites development and build commands remain available.

```sh
npm ci
npm run build:pages
npm run preview:pages
```

The local static preview is served under `/fun-sims/`. `PAGES_BASE_PATH` can
override this path. `.github/workflows/pages.yml` reads the deployed base path
from GitHub Pages, runs type checks and simulation tests, builds `dist-pages`,
and deploys on pushes to `main` or manual workflow runs. In repository Settings
→ Pages, keep the source set to **GitHub Actions**. No deployment secrets are
needed; the workflow uses GitHub's built-in token with scoped Pages permissions.

Browser saves and language preferences are local to each site origin. Export
ant colonies from the old address and import them at the new address if needed.

3D implementation references: [Three.js OrbitControls](https://threejs.org/docs/pages/OrbitControls.html), [MarchingCubes](https://threejs.org/docs/pages/MarchingCubes.html), and [InstancedMesh](https://threejs.org/docs/pages/InstancedMesh.html).
