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
- **3D night-city view** (three.js): each district is a themed neighbourhood (skyscrapers, factory stacks, hospital cross, metro train, houses, water tanks, radar, domes). Windows go amber/red/dark with status, power lines carry moving energy, storms bring rain and lightning, and alert pop-ups float over the affected district. Falls back to a flat map without WebGL.
- **Drive the repair truck** (WASD / arrows, or the on-screen joystick on touch): load a repair kit at the yellow depot ring, deliver it to the green beam on the district in trouble. Chase and overview cameras, minimap, speed, credits, and a live objective banner.
- **Specific how-to-play briefing** per mode (mission, win/lose numbers, controls, repair loop, power balance, heat, alerts, scoring), reopenable with ? / the help button.
- Portrait phone layout with bottom dock and thumb-zone actions; landscape desktop dashboard.

## Layout
`src/engine` pure deterministic simulation + tests · `src/components` UI · `src/store` zustand store · `src/audio` Web Audio synth · `public/sw.js` service worker.
