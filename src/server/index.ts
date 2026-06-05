import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import session from 'express-session';
import { RoomManager } from './roomManager.js';
import { registerUser, loginUser, spendUserBalance, unlockUserTheme, getUserById, addEffectCardToInventory } from './userDb.js';
import { EFFECT_CARDS } from '../shared/deck.js';
import type { ServerToClientEvents, ClientToServerEvents, InterServerEvents, SocketData } from '../shared/types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const httpServer = createServer(app);

const isProd = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';

const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || 'whosnext-session-secret-change-me',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: isProd, maxAge: 24 * 60 * 60 * 1000 },
});
app.use(sessionMiddleware);
app.use(express.json());

const io = new Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>(httpServer, {
  cors: {
    origin: (origin, callback) => callback(null, origin || true),
    credentials: true,
  },
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000,
    skipMiddlewares: true,
  },
});

io.use((socket, next) => {
  sessionMiddleware(socket.request as express.Request, {} as express.Response, next as express.NextFunction);
});

const roomManager = new RoomManager(io);

// Health check for deployment platforms
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// Serve the renderer build for web clients joining via room code
const rendererPath = path.join(__dirname, '../../dist/renderer');
app.use(express.static(rendererPath));
app.get('*', (_req, res) => {
  res.sendFile(path.join(rendererPath, 'index.html'));
});

io.on('connection', (socket) => {
  console.log('[Server] Client connected:', socket.id);

  // Handle rejoins: if socket has a session with a known player, restore
  const reqSession = (socket.request as express.Request).session as any;
  if (reqSession?.roomId && reqSession?.sessionId) {
    const result = roomManager.rejoinPlayer(reqSession.roomId, reqSession.sessionId, socket.id);
    if (result) {
      socket.join(result.room.id);
      socket.data.playerId = result.player.id;
      socket.data.roomId = result.room.id;
      console.log('[Server] Rejoined player', result.player.name, 'to room', result.room.code);
    }
  }

  socket.on('create-room', (opts, cb) => {
    console.log('[Server] create-room from', socket.id, 'name=', opts.hostName);
    const room = roomManager.createRoom({ ...opts, userId: socket.data.userId }, socket.id);
    socket.join(room.id);
    socket.data.playerId = room.players[0].id;
    socket.data.roomId = room.id;
    if (reqSession) {
      reqSession.roomId = room.id;
      reqSession.sessionId = room.players[0].sessionId;
      reqSession.save?.();
    }
    console.log('[Server] Created room', room.code, 'id=', room.id);
    cb(room);
  });

  socket.on('join-room', (code, playerName, cb) => {
    console.log('[Server] join-room from', socket.id, 'code=', code, 'name=', playerName);
    const room = roomManager.joinRoom(code, playerName, socket.id, socket.data.userId);
    if (room) {
      socket.join(room.id);
      const player = room.players.find((p) => p.socketId === socket.id);
      if (player) {
        socket.data.playerId = player.id;
        socket.data.roomId = room.id;
        if (reqSession) {
          reqSession.roomId = room.id;
          reqSession.sessionId = player.sessionId;
          reqSession.save?.();
        }
      }
      console.log('[Server] Player joined room', room.code, 'players=', room.players.length);
      roomManager.broadcastState(room);
      socket.to(room.id).emit('player-joined', player!);
      socket.emit('chat-history', roomManager.getChatHistory(room.id));
      socket.emit('custom-emojis', roomManager.getCustomEmojis(room.id));
      cb(room);
    } else {
      console.log('[Server] join-room failed: room not found', code);
      cb(null);
    }
  });

  socket.on('start-game', async () => {
    const roomId = socket.data.roomId;
    console.log('[Server] start-game from', socket.id, 'roomId=', roomId);
    if (!roomId) return;
    await roomManager.startGame(roomId);
  });

  socket.on('play-card', (cardIds, effectCardId, cb) => {
    const roomId = socket.data.roomId;
    const playerId = socket.data.playerId;
    if (!roomId || !playerId) return cb(false);
    cb(roomManager.playCard(roomId, playerId, cardIds, effectCardId));
  });

  socket.on('judge-pick', (submissionId, cb) => {
    const roomId = socket.data.roomId;
    const playerId = socket.data.playerId;
    if (!roomId || !playerId) return cb(false);
    cb(roomManager.judgePick(roomId, playerId, submissionId));
  });

  socket.on('next-round', () => {
    const roomId = socket.data.roomId;
    if (!roomId) return;
    roomManager.nextRound(roomId);
  });

  socket.on('leave-room', () => {
    const roomId = socket.data.roomId;
    const playerId = socket.data.playerId;
    if (roomId && playerId) {
      roomManager.removePlayer(roomId, playerId);
      socket.leave(roomId);
      socket.data.roomId = '';
      socket.data.playerId = '';
      if (reqSession) {
        delete reqSession.roomId;
        delete reqSession.sessionId;
        reqSession.save?.();
      }
    }
  });

  socket.on('send-chat', (text) => {
    const roomId = socket.data.roomId;
    const playerId = socket.data.playerId;
    if (roomId && playerId) {
      roomManager.sendChat(roomId, playerId, text);
    }
  });

  socket.on('add-custom-emoji', (emoji) => {
    const roomId = socket.data.roomId;
    if (roomId) {
      roomManager.addCustomEmoji(roomId, emoji);
    }
  });

  socket.on('remove-custom-emoji', (emojiId) => {
    const roomId = socket.data.roomId;
    if (roomId) {
      roomManager.removeCustomEmoji(roomId, emojiId);
    }
  });

  socket.on('customize-card', (cardId, newText) => {
    const roomId = socket.data.roomId;
    const playerId = socket.data.playerId;
    if (roomId && playerId) {
      roomManager.customizeCard(roomId, playerId, cardId, newText);
    }
  });

  socket.on('request-state', () => {
    const roomId = socket.data.roomId;
    const playerId = socket.data.playerId;
    if (!roomId || !playerId) return;
    const room = roomManager.getRoom(roomId);
    if (!room) return;
    const player = room.players.find((p) => p.id === playerId);
    if (!player) return;
    roomManager.sendStateToPlayer(room, player);
  });

  socket.on('re-submit', (cardIds, effectCardId, cb) => {
    const roomId = socket.data.roomId;
    const playerId = socket.data.playerId;
    if (!roomId || !playerId) return cb(false);
    cb(roomManager.reSubmit(roomId, playerId, cardIds, effectCardId));
  });

  socket.on('update-settings', (settings) => {
    const roomId = socket.data.roomId;
    const playerId = socket.data.playerId;
    if (!roomId || !playerId) return;
    roomManager.updateSettings(roomId, playerId, settings);
  });

  socket.on('start-vote-kick', (targetId) => {
    const roomId = socket.data.roomId;
    const playerId = socket.data.playerId;
    if (!roomId || !playerId) return;
    roomManager.startVoteKick(roomId, playerId, targetId);
  });

  socket.on('cast-vote-kick', (targetId, vote) => {
    const roomId = socket.data.roomId;
    const playerId = socket.data.playerId;
    if (!roomId || !playerId) return;
    roomManager.castVoteKick(roomId, playerId, targetId, vote);
  });

  socket.on('start-vote-end', () => {
    const roomId = socket.data.roomId;
    const playerId = socket.data.playerId;
    if (!roomId || !playerId) return;
    roomManager.startVoteEnd(roomId, playerId);
  });

  socket.on('cast-vote-end', (vote) => {
    const roomId = socket.data.roomId;
    const playerId = socket.data.playerId;
    if (!roomId || !playerId) return;
    roomManager.castVoteEnd(roomId, playerId, vote);
  });

  socket.on('report-player', (targetId, reason) => {
    const roomId = socket.data.roomId;
    const playerId = socket.data.playerId;
    if (!roomId || !playerId) return;
    roomManager.reportPlayer(roomId, playerId, targetId, reason);
  });

  // New events
  socket.on('player-ready', () => {
    const roomId = socket.data.roomId;
    const playerId = socket.data.playerId;
    if (!roomId || !playerId) return;
    roomManager.playerReady(roomId, playerId);
  });

  socket.on('buy-shop-card', (cardId, cb) => {
    const roomId = socket.data.roomId;
    const playerId = socket.data.playerId;
    if (!roomId || !playerId) return cb(false, 0);
    const result = roomManager.buyShopCard(roomId, playerId, cardId);
    cb(result.success, result.remainingCurrency);
  });

  socket.on('force-next-round', () => {
    const roomId = socket.data.roomId;
    const playerId = socket.data.playerId;
    if (!roomId || !playerId) return;
    roomManager.forceNextRound(roomId, playerId);
  });

  socket.on('get-leaderboards', async () => {
    const data = await roomManager.getLeaderboardsData();
    socket.emit('leaderboards-data', data);
  });

  socket.on('register', async (username, password, email, cb) => {
    const result = await registerUser(username, password, email);
    if (result.success && result.user) {
      (socket.data as any).userId = result.user.id;
      socket.emit('auth-success', result.user);
    } else {
      socket.emit('auth-error', result.error || 'Registration failed');
    }
    cb(result.success, result.error || 'OK', result.user ? { ...result.user } : undefined);
  });

  socket.on('login', async (username, password, cb) => {
    const result = await loginUser(username, password);
    if (result.success && result.user) {
      (socket.data as any).userId = result.user.id;
      socket.emit('auth-success', result.user);
    } else {
      socket.emit('auth-error', result.error || 'Login failed');
    }
    cb(result.success, result.error || 'OK', result.user ? { ...result.user } : undefined);
  });

  socket.on('buy-theme', async (themeId, cb) => {
    const userId = (socket.data as any).userId;
    if (!userId) return cb(false, 0);
    const costMap: Record<string, number> = {
      cyberpunk: 150,
      retro: 200,
      ocean: 225,
      inferno: 300,
    };
    const cost = costMap[themeId] ?? 150;
    const result = await spendUserBalance(userId, cost);
    if (result.success) {
      await unlockUserTheme(userId, themeId);
    }
    cb(result.success, result.remaining);
  });

  socket.on('buy-effect-card', async (cardId, cb) => {
    const userId = (socket.data as any).userId;
    if (!userId) return cb(false, 0);
    const user = await getUserById(userId);
    if (!user) return cb(false, 0);
    const template = EFFECT_CARDS.find((c) => c.id === cardId);
    if (!template || !template.effect) return cb(false, user.balance);
    let cost = 7;
    if (template.effect.type === 'exodia') cost = 10;
    else if (['double_points_win', 'point_drain', 'card_quality_down', 'abduction'].includes(template.effect.type)) cost = 8;
    const result = await spendUserBalance(userId, cost);
    if (result.success) {
      await addEffectCardToInventory(userId, cardId);
    }
    cb(result.success, result.remaining);
  });

  socket.on('disconnect', () => {
    const roomId = socket.data.roomId;
    const playerId = socket.data.playerId;
    if (roomId && playerId) {
      roomManager.handleDisconnect(roomId, playerId);
    }
    console.log('[Server] Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
httpServer.listen(PORT, () => {
  console.log(`[Server] Who's Next? server running on http://localhost:${PORT}`);
});
