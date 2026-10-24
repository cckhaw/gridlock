# Blackout Protocol

SCADA-style power grid crisis game — mobile-first, zero-install, installable and playable offline.

```bash
npm install
npm run dev        # play at http://localhost:5173
npm test           # engine, balance and scoring tests
npm run build      # production build (registers the service worker)
npm run preview
```

## Modes
- **Solo Crisis:** run all 8 districts through a 5:00 escalating storm.
- **vs AI Saboteurs:** run one district beside 7 AI engineers; 2 are saboteurs. Cross-reference the telemetry log, DIAGNOSE, flag suspects and VOTE OUT.

## Features
- Cadet / Operator / Veteran difficulty, S–F grading with score breakdown and local best scores.
- First-run training overlay (re-open from the pause menu).
- Post-game replay: health line, district temperature heatmap, scrubber and event timeline (saboteur actions revealed).
- PWA: manifest, icons, service worker with an offline app shell, self-hosted fonts.
- **Background music** (CC0 tracks from OpenGameArt.org, credits in `public/music/CREDITS.txt`): calm menu loop, bright day track, synthwave night track, suspicious-loop for the saboteur mode, and a tense track that fades in when a district goes critical, lightning or a blowout hits, or the last 20 seconds start. Seamless looping via Web Audio with 2-second crossfades; Music switch in the menu and the status capsule; pauses when the tab is hidden.
- **Apple-style interface** (per Apple's Human Interface Guidelines): the city is full-screen and edge-to-edge; controls float above it as Liquid-Glass-style materials (status capsule, floating tab bar, bottom sheets with a grabber and detents, inset grouped lists, iOS switches and segmented controls). Everything collapses — objective card, actions, minimap, sheets — and the eye button hides the whole interface. System font (SF on Apple devices), system colours, 44pt targets, safe areas, dark mode, reduced motion/transparency respected.
- **Practice mode** (no timer, cannot lose, goals checklist, trigger storms on demand, autopilot toggles) and a **very easy Cadet** (6 minutes, autopilot, mild storm, 6 blackouts allowed).
- **Day / night / auto** with a blocky Minecraft/Roblox-style city: grass, roads with traffic, trees, clouds, sun, moon and stars, soft shadows, smoke and sparks, and Among-Us-style crewmates who panic when their district is in trouble. Toggle with the sun/moon button or N.
- **3D city view** (three.js): each district is a themed neighbourhood (skyscrapers, factory stacks, hospital cross, metro train, houses, water tanks, radar, domes). Windows go amber/red/dark with status, power lines carry moving energy, storms bring rain and lightning, and alert pop-ups float over the affected district. Falls back to a flat map without WebGL.
- **Drive the repair truck** (WASD / arrows, or the on-screen joystick on touch): load a repair kit at the yellow depot ring, deliver it to the green beam on the district in trouble. Chase and overview cameras, minimap, speed, credits, and a live objective banner.
- **Specific how-to-play briefing** per mode (mission, win/lose numbers, controls, repair loop, power balance, heat, alerts, scoring), reopenable with ? / the help button.
- Portrait phone layout with bottom dock and thumb-zone actions; landscape desktop dashboard.

## Layout
`src/engine` pure deterministic simulation + tests · `src/components` UI · `src/store` zustand store · `src/audio` Web Audio synth · `public/sw.js` service worker.
