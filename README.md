# Blackout Protocol

SCADA-style power grid crisis game — mobile-first, zero-install browser game.

```bash
npm install
npm run dev        # play at http://localhost:5173
npm test           # engine unit tests
npm run build
```

- **Solo Crisis:** run all 8 districts through a 5:00 escalating storm.
- **vs AI Saboteurs:** run one district beside 7 AI engineers; 2 are saboteurs. Cross-reference the telemetry log, DIAGNOSE, and VOTE OUT.

Engine lives in `src/engine` (pure, deterministic, tested); UI in `src/components`; state in `src/store`; Web Audio synth in `src/audio`.
