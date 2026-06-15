# Directory Structure -- whosnext (Who's Next?)

## Top Level
```
whosnext/
|-- src/
|   |-- electron/     # Electron main process
|   |-- renderer/     # React SPA
|   |-- server/       # Express + Socket.io backend
|   `-- shared/       # Types + game data shared between server and renderer
|-- data/             # Database files (SQLite or JSON -- content not confirmed)
|-- dist/             # Build output (electron + renderer)
|-- dist-installer/   # electron-builder output
|-- scripts/          # Utility scripts
|-- icons/            # icon.png
|-- Dockerfile
|-- fly.toml          # Fly.io deployment config
|-- render.yaml       # Render.com deployment config
|-- railway.json      # Railway deployment config
|-- fix-deck.cjs      # One-off deck data fix script
|-- vite.renderer.config.ts
|-- tsconfig.json
|-- tsconfig.electron.json
|-- tailwind.config.js
|-- postcss.config.cjs
|-- package.json
|-- .gitignore
|-- .dockerignore
|-- nsdi2025.pdf / .txt   # Possibly a research paper reference
|-- gameboard*.png / lobby.png / title-screen.png  # UI screenshots or assets
```

## src/electron/ (Electron main process)
```
src/electron/
|-- main.ts      # BrowserWindow creation, dev/prod URL loading
`-- preload.ts   # contextBridge
```

## src/renderer/ (React SPA)
```
src/renderer/
|-- index.html
|-- main.tsx          # React DOM root
|-- App.tsx           # ThemeProvider + Routes
|-- vite-env.d.ts
|-- index.css (implied)
|-- styles/
|-- components/
|   |-- TitleScreen.tsx   # Home screen (Quick Play + Who's Next mode select)
|   |-- Lobby.tsx         # Pre-game lobby (route: /lobby/:mode)
|   |-- GameBoard.tsx     # Main game UI (route: /game/:roomCode)
|   |-- Card.tsx          # Card component
|   |-- ChatPanel.tsx     # In-game chat
|   |-- TitleBar.tsx      # Frameless window controls (Electron)
|   |-- Backgrounds.tsx   # Animated background (ActiveBackground)
|   `-- ThemePicker.tsx   # Theme selector overlay
|-- context/
|   `-- ThemeContext.tsx  # ThemeProvider (CSS variable themes)
|-- hooks/            # Custom React hooks
|-- audio/            # Audio assets or audio hooks
|-- utils/            # Utility functions
```

## src/server/ (Express + Socket.io backend)
```
src/server/
|-- index.ts        # Entry: Express app + Socket.io server
|                   #   - helmet (security headers + CSP)
|                   #   - rate limiting (HTTP routes)
|                   #   - express-session
|                   #   - CORS with origin allowlist
|                   #   - Socket.io per-socket rate limiting
|                   #   - Session-based room rejoin recovery
|                   #   - Serves renderer build (dist/renderer) for web clients
|                   #   - /health endpoint
|                   #   - /dev/seed endpoint (secret-guarded)
|-- roomManager.ts  # In-memory game room state + Socket.io room events
|-- userDb.ts       # User CRUD: register, login (bcrypt), profile, friends,
|                   #   DMs, password reset, block/unblock, online status
|-- dmDb.ts         # Direct message send + history
|-- groupChatDb.ts  # Group creation, membership, messaging, mod/kick
|-- leaderboard.ts  # Score tracking
`-- seed.ts         # Dev seed: 8 test users + 30 simulated games
```

## src/shared/ (shared between server + renderer)
```
src/shared/
|-- types.ts    # Socket.io typed events: ServerToClientEvents,
|               #   ClientToServerEvents, InterServerEvents, SocketData
`-- deck.ts     # EFFECT_CARDS constant (card definitions)
```

## Routes (React Router)
- `/` -- TitleScreen (mode select)
- `/lobby/:mode` -- Lobby (Quick Play or Who's Next)
- `/game/:roomCode` -- GameBoard (active game)

## Boot Flow (Electron dev)
`dev:electron` -> builds electron main -> launches Electron
`dev:vite` -> Vite on :5173
`dev:server` -> tsx on server port
Electron loads http://localhost:5173 (renderer dev server)
Renderer connects to server via Socket.io

## Boot Flow (Web / Production)
`npm start` -> `tsx src/server/index.ts`
Server serves `dist/renderer/index.html` for all GET routes
Clients load SPA -> connect via Socket.io to same origin
