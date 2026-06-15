# Project Status -- whosnext (Who's Next?)

_Last updated: Session 1 (nexus creation)_

## Overall
**Status: Active development / Near shippable.** Version 0.1.0. Full stack is
wired up (React + Socket.io + Express + user system). Deployment configs for
4 platforms exist (Docker, Fly.io, Render, Railway) which suggests it has been
or is being actively deployed as a web app in addition to the Electron build.

## Done
- React SPA: TitleScreen, Lobby, GameBoard, Card, ChatPanel, TitleBar, Backgrounds, ThemePicker
- ThemeProvider + CSS variable theme system
- React Router: 3 routes (/, /lobby/:mode, /game/:roomCode)
- Socket.io real-time multiplayer (typed events via shared/types.ts)
- Room management with session-based rejoin recovery (2 min disconnect window)
- Full user system: register, login (bcrypt), profiles, friends, block, DMs,
  group chats, password reset
- Effect cards (EFFECT_CARDS in shared/deck.ts) + inventory system
- Leaderboard
- Express server: helmet CSP, rate limiting (HTTP + per-socket), CORS allowlist
- Session middleware shared between HTTP and Socket.io
- Serves renderer build for web-only deployment (no Electron required)
- Deployment configs: Dockerfile, fly.toml, render.yaml, railway.json
- /health endpoint for deployment platform health checks
- /dev/seed endpoint (secret-guarded) with test data seeder
- Electron main process + preload

## Open Issues / Unknowns
- [ ] `data/` folder -- what database? SQLite? JSON files? Schema not confirmed.
- [ ] `fix-deck.cjs` -- what was broken in the deck data? Is this still needed?
- [ ] `nsdi2025.pdf/.txt` -- research paper in the project root? Seems out of place.
- [ ] `audio/` folder in renderer -- what sounds does the game use?
- [ ] SESSION_SECRET has an insecure default value hardcoded -- must be set via
      env var in any real deployment.
- [ ] Game mechanics of "Who's Next" mode not fully read -- room for clarification.
- [ ] screenshots (gameboard.png etc.) suggest UI is designed but may still be WIP.
- [ ] No test suite.

## Ideas / Future Work (parking lot)
- Spectator mode
- Replay system
- More effect card types
- Mobile-optimized layout (currently Electron-first)
- Tournament bracket mode
- Voice chat integration
