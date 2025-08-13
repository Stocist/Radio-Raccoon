# Feature Map / Roadmap

## Status Legend
- [x] Implemented
- [~] Partially Implemented
- [ ] Not Started

## Features
- [x] Lavalink playback via Riffy
- [x] Native voice connection + player + encoder scaffolding
- [x] `/play_native` command
- [~] Native queue (add/next) basics
- [ ] Native controls: pause/resume/skip/stop
- [ ] Native volume + basic effects (FFmpeg filters)
- [ ] Unified play command migrating off Lavalink
- [ ] Health/metrics (underruns, reconnects, encoding time)
- [ ] Spotify/SoundCloud resolvers (native)

## Priorities
- High: Native controls, stability, quality tuning
- Medium: Metrics, volume/effects, additional resolvers
- Low: Advanced DSP, persistence

## Timeline
- Next: Native controls + stability; Docker testing
- Later: Replace `/play` with native, add metrics
- Maybe: DB-backed queues/history, web dashboard
