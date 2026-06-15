# Decisions Log -- whosnext (Who's Next?)

Append-only. Newest at bottom.

---

## 2025 -- Session 1: Nexus established
- **Decision:** Adopt Nexus protocol for whosnext.
- **Rationale:** Consistent project memory across all electron_programs projects.
  Central registry at `electron_programs/.nexus/registry.md`.

## 2025 -- Session 1: Dual deployment target (Electron + Web)
- **Decision:** The app runs both as an Electron desktop app AND as a
  standalone web app (Express server serves the renderer build).
- **Rationale:** Party games benefit from browser accessibility (guests don't
  want to install an app). Electron is for the host/power user. Single codebase
  serves both targets.
- **Implementation:** server/index.ts serves dist/renderer for all GET routes.
  Electron loads the same renderer via BrowserWindow.

## 2025 -- Session 1: Socket.io for real-time multiplayer
- **Decision:** Use Socket.io (not WebSockets directly) for real-time comms.
- **Rationale:** Socket.io provides connection state recovery, automatic
  reconnection, room management, and typed events -- all valuable for a
  party game where players may disconnect briefly.
- **Implementation:** Typed via shared/types.ts (ServerToClientEvents,
  ClientToServerEvents, etc.). 2-minute disconnect recovery window configured.

## 2025 -- Session 1: Shared types between server and renderer
- **Decision:** src/shared/ contains types.ts and deck.ts, imported by both
  server and renderer TypeScript.
- **Rationale:** Single source of truth for Socket.io event contracts and card
  definitions. Prevents server/client type drift.

## 2025 -- Session 1: Full user system with bcrypt
- **Decision:** Implement a full user accounts system (register/login/friends/DMs)
  rather than anonymous room-only play.
- **Rationale:** Persistent identity enables leaderboards, friend games, DMs,
  and returning player recognition. bcrypt for password hashing is industry standard.

## 2025 -- Session 1: tsx for server dev (no compile step)
- **Decision:** Use tsx to run server/index.ts directly in development
  (tsx watch), rather than compiling TypeScript first.
- **Rationale:** Faster iteration in dev. Only the Electron main process uses
  tsc compilation (required by Electron's module loading).

## 2025 -- Session 1: Multiple deployment platform configs
- **Decision:** Include Dockerfile, fly.toml, render.yaml, and railway.json.
- **Rationale:** Flexibility to deploy wherever is cheapest/most convenient.
  All four are low-friction Node.js deployment targets.
