# Simulation Hub

A simulation hub built with React, TypeScript, and Canvas 2D. Explore an ant colony, the Solar System Lab, and City Life through shared navigation. Each simulation preserves its state and suspends its engine when another simulation is active.

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

- **Surface / Nest:** two views of the same colony. Each remembers its own camera.
- **Drag / scroll or pinch:** pan and zoom. The frame icon fits the world.
- **Select an ant:** click an ant, or use **Find worker → Cleaning** (or another task) above the habitat. Live counts cover both views. Selection centers the camera on a matching worker and opens its inspector; **Next worker** cycles through matches. Follow tracks the individual even when its task or view changes. When nobody is doing the chosen task, the selector shows an empty message and disables Next worker.
- **Environment tools:** place nectar, protein, water, or rocks; erase nearby resources or rocks. Edits apply on the surface. The immediate entrance stays clear, and rocks cannot be placed on existing ants or resources.
- **World layers:** pheromones, task colors / traffic, and underground moisture conditions.
- **Settings:** temperature, moisture, developmental rate, exploration, trail half-life, scent sensitivity, and task flexibility.
- **Space:** pause / resume when focus is on the page or canvas. Canvas arrow keys pan, +/- zoom, and Enter inspects an ant. Escape exits an editing tool and clears selection.
- **Save colony:** named IndexedDB saves, automatic snapshots every 30 seconds, and versioned JSON export / import. Choose Export file, then Download JSON (or Copy JSON as a recovery option). Loaded colonies pause. Invalid imports preserve the running colony.

The population limit is 3,000 workers. Pupae wait to emerge at the limit. Requested speed is a multiplier on a fixed simulation timestep; under heavy load, the simulation clock advances only as quickly as the machine can compute it. Rendering continues independently. Pause the colony before leaving it for a long time if you do not want it to keep living while the tab remains active.

## Biological model and deliberate simplifications

This is an explanatory sandbox inspired by *Lasius niger*, not a calibrated biological forecast. Behaviors and rates are transparent approximations:

- Workers sense nearby resources, ants, and a single attractive pheromone field. Returning food carriers reinforce trails; unreinforced trails decay exponentially. Resource memory stores a learned destination, with local obstacle avoidance rather than a perfect outdoor pathfinder. Nest navigation uses a familiar tunnel map.
- Local encounters support recruitment and a simplified food exchange. Job choices depend on age, energy, hunger, individual tendency, nearby brood, refuse, and crowding. The queen does not assign jobs.
- Carbohydrates support adult feeding, protein supports larvae and egg production, and water contributes to recovery. Stored food is aggregated; nursing draws from the colony protein store. Liquid crops and detailed digestion are not modeled.
- Eggs, larvae, and pupae progress through separate stages. Larvae need nutrition; all stages respond to nursing and a simplified temperature / moisture comfort function. Nursing workers can carry brood toward better conditions.
- Crowding can initiate excavation of adjacent cells. Workers carry soil to a surface midden. Cleaners remove modeled waste and corpses. Grooming and rest are explicit tasks; parasites and disease are not simulated.
- At the default life-cycle rate, each fully supported brood stage takes at least 120 simulation seconds. Worker age advances by 0.015 model days per simulation second. Real ant lifetimes and developmental schedules are much longer. These compressed processes share the adjustable life-cycle rate, while movement remains readable.
- Nest geometry is a two-dimensional excavation grid rendered with rounded boundaries. Ground texture and the habitat scale are illustrative. Ants may overlap each other in dense traffic; rocks and intact soil block movement.
- There are no rival colonies, predators, seasonal weather, mating flights, founding-queen scenarios, or additional species in this version.

Navigation inspiration: [Czaczkes et al., route learning and trail pheromones in Lasius niger](https://journals.biologists.com/jeb/article/216/2/188/11672/Ant-foraging-on-complex-trails-route-learning-and). Food sharing inspiration: [Emergent regulation of ant foraging frequency](https://pmc.ncbi.nlm.nih.gov/articles/PMC10110237/).

## Architecture

`lib/simulation/types.ts` defines the simulator adapter contract, command union, complete serializable state, and shared model types. Future simulators can implement the same initialization, command, subscription, and disposal interface and reuse the site's sidebar primitives, canvas controls, and persistence pattern.

- `engine.ts` initializes seeded worlds, advances fixed 1/30-second ticks, and validates commands.
- `behavior.ts`, `physiology.ts`, `pheromones.ts`, and `spatial.ts` separate behavioral systems and spatial queries.
- `ant.worker.ts` owns authoritative state. UI actions and browser-agent tools use the same adapter command path.
- `renderer.ts` caches terrain and ant gait sprites, draws detail at close zoom, interpolates snapshots, and culls offscreen individuals.
- `validation.ts` validates imports before replacing state. Saves contain RNG state, memories, every entity, field, tunnel, setting, and simulation counter. Runtime navigation caches are rebuilt deterministically.
- `storage.ts` manages local IndexedDB transactions. Rendering has no effect on biological time or randomness.

The engine tests include fixed-seed determinism, exact save/resume continuation, pause, malformed imports, food collection/delivery, collision avoidance, pheromone decay, development, mortality, excavation, cleaning, and brood relocation. Browser validation and timing notes are recorded in `VALIDATION.md`.

## Solar System Lab

Choose **Solar System Lab (02)** in the sidebar, or open `http://localhost:5173/#solar-system` directly. The hash is bookmarkable and browser Back/Forward follows simulator navigation. Switching simulators retains both sessions and pauses the inactive simulation. Ant saves and autosave use the existing separate storage; solar experiments are tab-local and reset on reload.

- **Explore:** the Sun, eight planets, and five selected moons; choose a reference date, control time, inspect/follow objects, and switch between a rotatable 3D projection and an overhead orbital map. Inner/Full system buttons frame the planets; the Objects list focuses on a planet or moon.
- **Experiment:** fork the reference state into Newtonian gravity. Change masses, multiply current relative velocities, move or remove bodies, and drag to launch massless probes or low-mass comets. Launching switches to the overhead map and pauses time. Press Play to run the launch.
- **Prepared experiments:** faster Earth, a comet approaching Jupiter, binary stars, and an illustrative Mars transfer attempt. Each replaces the solar system only, starts paused, and asks before discarding an existing experiment.
- **Display:** orbital paths/trails, labels, moons, velocity arrows, gravitational acceleration direction for the selected body, true physical sizes, and a selected-body speed chart. Bodies are enlarged by default; distances always remain linear and to scale. Moons become visible on close zoom or selection.
- **Controls:** drag to pan; Shift-drag or right-drag to rotate; scroll/pinch to zoom; Space to pause. Focus the canvas and use arrows to pan, +/- to zoom, or Enter to select the next body. Sidebar controls offer keyboard-accessible alternatives.

The reference model implements [JPL Table 1 orbital elements and rates](https://ssd.jpl.nasa.gov/planets/approx_pos.html), limited to 1800–2050. It is an offline approximation, not a live Horizons ephemeris. Earth represents the Earth–Moon barycenter approximately; the Moon, Io, Europa, Ganymede, and Titan use illustrative circular orbits. Radii and masses are rounded. Planet surfaces and ring appearances are stylized. The experiment engine uses AU, days, and solar masses, shifts its initial frame to the system barycenter, and advances velocity-Verlet steps constrained by local gravitational and crossing times. High requested playback speeds may advance more slowly to keep computation bounded. Collisions merge bodies at physical radii and conserve mass and momentum. Relativity, tides, atmospheres, fragmentation, and precise spacecraft targeting are outside this model. Launch previews use stationary gravitating sources and are approximate.

Solar code is independent in `lib/solar` and `components/solar`, with shared simulator navigation. Read/playback browser-agent tools are available only for the active simulator. `npm test` includes the ant regression suite and ten solar physics checks. Run the focused solar tests with `node scripts/test-solar.mjs`.

## City Life

Choose **City Life** in the hub or open `/#city-life`. Linden opens in a full 3D perspective view, with volumetric homes, offices, shops, parks, trees, street furniture, residents, cars, and buses. The 3D scene uses the same deterministic, browser-local simulation as the optional overhead map.

- Follow a resident through commuting, work, grocery shopping, recreation, and rest. The inspector shows needs, money, destination, commute duration, and recent decisions. A keyboard-accessible resident picker complements map selection.
- Adjust bus count, fares, income tax, and service funding. Rain slows trips; the Market Street closure reroutes travelers. Transit changes normally affect the next trip; withdrawing service lets affected passengers continue walking.
- **3D controls:** drag to orbit; Shift-drag or right-drag to pan; scroll or pinch to zoom. One-finger touch orbits, and two fingers pan/zoom. Arrow keys pan; Shift+arrows orbit; F fits the city. Rotate/zoom/fit buttons provide alternatives. Click a building or resident to inspect it; follow keeps the selected resident in frame. Labels appear at closer distances. Day/night lighting, rain, road closures, and transit all reflect the live simulation.
- Use **Map** for the overhead view, without resetting the city. Both views support city, traffic, happiness, and road-emissions layers. In Map, drag or arrow keys pan. Enter selects another resident; Space pauses. The step button advances 15 minutes and pauses. If WebGL2 is unavailable or the graphics context is lost, an explanatory message switches to the playable overhead map.
- Four scenarios restart the same seed at 07:00. Session checkpoints capture complete city state; pin a result, restore the checkpoint, change a policy, and compare after the same elapsed time. Checkpoints and city state survive hub navigation but not a page reload.
- A fixed quarter-minute timestep keeps trajectories reproducible. At 1×, one real second represents eight simulated minutes. Hidden browser tabs and inactive simulators do not advance, and dialogs suspend this city while open.

This first version has fixed population, jobs, and building locations. Services are an aggregate well-being/support budget; road emissions are illustrative car-density colors, not physical concentration measurements. Work occurs daily, household bills are charged at midnight, and the treasury can run a visible deficit. It is a causal sandbox, not an economic, transport, or urban-planning forecast. Run `npm run test:city` for the twelve city behavior checks and eight 3D scene checks; `npm test` includes all three engines. The city runs locally; no Sites deployment or external asset service is needed.


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
