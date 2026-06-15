# Project: whosnext (Who's Next?)

## Identity
- **Name:** whosnext (product name: Who's Next?)
- **Version:** 0.1.0
- **Author:** ccd-69
- **App ID:** `com.ccd69.whosnext`
- **Description:** A multiplayer card party game with Quick Play and Who's Next modes
- **Location:** `C:\Users\coolcatdude\Documents\electron_programs\whosnext`
- **Repo:** local git (deployment configs present for Render, Fly.io, Railway, Docker)

## Purpose
A multiplayer online card party game. Players join rooms via room codes and
play card-based party games together. Two game modes:
- **Quick Play** — jump into a game fast
- **Who's Next** — the signature mode (mechanics not fully read)

Key features:
- Real-time multiplayer via Socket.io
- Room management (create/join/rejoin with session recovery)
- Full user system: register, login (bcrypt), profiles, friend system,
  DMs, group chats, leaderboard
- Effect cards with an inventory system
- Theme system (ThemeProvider + ThemePicker with CSS variable presets)
- Animated backgrounds
- Can run as Electron desktop app OR as a standalone web app (Express server serves renderer build)
- Deployment-ready: Dockerfile, fly.toml, render.yaml, railway.json all present
- Chat panel during games

## Tech Stack
| Layer | Technology |
|---|---|
| Shell | Electron 42 |
| Renderer | React 19 + React DOM 19 |
| Language | TypeScript 5.9 |
| Build (renderer) | Vite 6 + @vitejs/plugin-react |
| Build (Electron main) | tsc -p tsconfig.electron.json |
| Styling | TailwindCSS 3 + custom CSS variable tokens |
| Routing | React Router DOM v7 |
| Icons | Lucide React |
| Real-time | Socket.io 4 (server + client) |
| Server | Express 4 + express-session + helmet + express-rate-limit |
| Server runtime | tsx (TypeScript runner, no compile step in dev) |
| Auth | bcryptjs (password hashing) |
| Identifiers | uuid |
| Emoji | emoji-picker-react |
| Dev orchestration | concurrently, cross-env |
| Packager | electron-builder (NSIS + portable / DMG + zip / AppImage + deb) |
| Deployment | Docker, Fly.io, Render, Railway |

## Entry Points
1. `src/electron/main.ts` -- Electron main process (compiled -> dist/electron/main.js)
2. `src/electron/preload.ts` -- contextBridge
3. `src/renderer/main.tsx` -- React DOM root
4. `src/renderer/App.tsx` -- ThemeProvider + Routes (TitleScreen / Lobby / GameBoard)
5. `src/server/index.ts` -- Express + Socket.io server (also serves renderer build for web)

## Scripts
- `npm run dev` -- concurrently: Vite + tsx server watch + Electron (full stack dev)
- `npm run dev:vite` -- renderer only
- `npm run dev:server` -- tsx watch src/server/index.ts
- `npm run dev:electron` -- build Electron main + launch with remote debugging
- `npm run build` -- build:electron + build:renderer
- `npm run start` -- tsx src/server/index.ts (web-only, no Electron)
- `npm run package:win/mac/linux` -- electron-builder

## Environment Variables
- `SESSION_SECRET` -- express-session secret (default insecure value in code)
- `ALLOWED_ORIGINS` -- comma-separated CORS origins
- `NODE_ENV` / `RENDER=true` -- production detection
- `DEV_SEED_SECRET` -- guards /dev/seed endpoint
- `PORT` -- server listen port

## Data / Persistence
- `src/server/userDb.ts` -- user accounts, profiles, friends, password reset
- `src/server/dmDb.ts` -- direct messages
- `src/server/groupChatDb.ts` -- group chats
- `src/server/leaderboard.ts` -- scores
- `src/server/roomManager.ts` -- in-memory room state
- `src/server/seed.ts` -- test data seeder (8 users, 30 simulated games)
- `data/` folder at root -- likely database files (SQLite or JSON)
- `fix-deck.cjs` -- one-off deck data fix script

## Shared Types
- `src/shared/types.ts` -- Socket.io event types (ServerToClientEvents, ClientToServerEvents, etc.)
- `src/shared/deck.ts` -- EFFECT_CARDS constant
