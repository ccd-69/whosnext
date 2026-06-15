# Session Log -- whosnext (Who's Next?)

Append-only. Newest at bottom.

---

## Session 2 -- Workspace pin + new workflow rules adopted

**Pinned from conversation:** User said "can we add our previous projects that you've added files/folders to today?"

**Goals this session:**
1. Retroactively pin all projects touched today under the new workspace workflow.
2. Confirm Nexus + Vault docs are up to date.

**Actions:**
- New rule locked in: when user says "add something to the workspace", pin the conversation moment, log start in session-log, add to registry and vault.
- Vault restructured into sections: Workspace / Projects / References / Rules.
- Registry updated with Workflow Rules section.
- This session-log entry added as the official starting pin.

**Notes:**
- No code changes made this session -- doc/workflow day only.

---

## Session 1 -- Nexus creation

**Goals this session:**
1. Explore the project and establish the Nexus protocol files.

**Actions:**
- Researched project via package.json, server/index.ts, renderer/App.tsx,
  directory listings.
- Confirmed: Electron 42 + React 19 + Vite 6 + Socket.io 4 multiplayer card
  party game. Full user system (bcrypt), DMs, group chat, leaderboard.
- Version 0.1.0, active development. Deployment configs for Docker/Fly/Render/Railway.
- Created `.nexus/` with project.md, structure.md, status.md, decisions.md, session-log.md.
- Registered in central registry at `electron_programs/.nexus/registry.md`.

**Notes / context to remember next session:**
- Dual target: runs as Electron app AND as a web app (server serves renderer).
- SESSION_SECRET has an insecure hardcoded default -- must use env var in prod.
- `data/` folder database type unconfirmed (SQLite? JSON?).
- `fix-deck.cjs` and `nsdi2025.pdf` at root are anomalies worth asking about.
- Socket.io typed events via src/shared/types.ts -- keep in sync with any new events.
- /dev/seed endpoint exists for test data (guarded by DEV_SEED_SECRET env var).
