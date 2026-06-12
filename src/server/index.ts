import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import session from 'express-session';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { RoomManager } from './roomManager.js';
import { registerUser, loginUser, spendUserBalance, unlockUserTheme, getUserById, addEffectCardToInventory, seedDevUserIfEmpty, updateProfile, getProfileByUsername, updateUserStatus, sendFriendRequest, acceptFriendRequest, rejectFriendRequest, removeFriend, blockUser, unblockUser, getFriendUsers, getPendingFriendRequests, requestPasswordReset, resetPassword } from './userDb.js';
import { sendDM, getDMHistory } from './dmDb.js';
import { createGroup, joinGroup, leaveGroup, deleteGroup, sendGroupMessage, getGroupHistory, getMyGroups, promoteMember, demoteMod, kickFromGroup, getGroupById, addUserToGroup } from './groupChatDb.js';
import { seedTestUsers, simulateGames } from './seed.js';
import { EFFECT_CARDS } from '../shared/deck.js';
import type { ServerToClientEvents, ClientToServerEvents, InterServerEvents, SocketData } from '../shared/types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const httpServer = createServer(app);

const isProd = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'https:', 'data:'],
      connectSrc: ["'self'", 'ws:', 'wss:'],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// Rate limiting for HTTP API routes only (not static assets or Socket.io)
const httpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/dev/seed', httpLimiter);
app.use('/health', httpLimiter);

const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map((o) => o.trim()).filter(Boolean);

const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || 'whosnext-session-secret-change-me',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: isProd, maxAge: 24 * 60 * 60 * 1000, sameSite: 'lax' },
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
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      if (!isProd && origin.startsWith('http://localhost:')) return callback(null, true);
      // Allow same-origin requests automatically (e.g. Render / Fly.io deployment)
      const originHost = new URL(origin).hostname;
      const serverHost = (httpServer as any).address?.()?.address || '';
      if (!serverHost || originHost === serverHost || originHost === 'whosnext.onrender.com' || originHost.endsWith('.fly.dev')) {
        return callback(null, true);
      }
      callback(new Error('Not allowed by CORS'), false);
    },
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
const onlineUsers = new Set<string>(); // userIds currently connected
const userSockets = new Map<string, string>(); // userId -> socket.id (latest connection)

// Health check for deployment platforms
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// Dev-only seed endpoint (guarded by secret)
app.post('/dev/seed', async (req, res) => {
  const secret = process.env.DEV_SEED_SECRET;
  if (!secret || req.headers['x-seed-secret'] !== secret) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }
  try {
    await seedTestUsers();
    await simulateGames(io, 30);
    res.json({ success: true, message: 'Seeded 8 test users and simulated 30 games.' });
  } catch (err) {
    console.error('[Seed] Error:', err);
    res.status(500).json({ error: 'Seed failed', detail: String(err) });
  }
});

// Serve the renderer build for web clients joining via room code
const rendererPath = path.join(__dirname, '../../dist/renderer');
app.use(express.static(rendererPath));
app.get('*', (_req, res) => {
  res.sendFile(path.join(rendererPath, 'index.html'));
});

io.on('connection', (socket) => {
  console.log('[Server] Client connected:', socket.id);

  // Simple in-memory rate limiter per IP per event
  const socketRateLimits = new Map<string, number[]>();
  function checkSocketRateLimit(event: string, maxRequests: number, windowMs: number): boolean {
    const ip = (socket.handshake.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || socket.handshake.address;
    const key = `${ip}:${event}`;
    const now = Date.now();
    const timestamps = socketRateLimits.get(key) || [];
    const filtered = timestamps.filter((t) => now - t < windowMs);
    if (filtered.length >= maxRequests) return false;
    filtered.push(now);
    socketRateLimits.set(key, filtered);
    return true;
  }

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
    const room = roomManager.createRoom({ ...opts, userId: socket.data.userId, username: socket.data.username }, socket.id);
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
    const room = roomManager.joinRoom(code, playerName, socket.id, socket.data.userId, socket.data.username);
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

  socket.on('rejoin', (roomId, sessionId, cb) => {
    console.log('[Server] rejoin from', socket.id, 'roomId=', roomId, 'sessionId=', sessionId);
    const result = roomManager.rejoinPlayer(roomId, sessionId, socket.id);
    if (result) {
      socket.join(result.room.id);
      socket.data.playerId = result.player.id;
      socket.data.roomId = result.room.id;
      if (reqSession) {
        reqSession.roomId = result.room.id;
        reqSession.sessionId = result.player.sessionId;
        reqSession.save?.();
      }
      socket.emit('chat-history', roomManager.getChatHistory(result.room.id));
      socket.emit('custom-emojis', roomManager.getCustomEmojis(result.room.id));
      console.log('[Server] Rejoined player', result.player.name, 'to room', result.room.code);
      cb(result.room);
    } else {
      console.log('[Server] rejoin failed: room or player not found');
      cb(null);
    }
  });

  socket.on('start-game', async () => {
    const roomId = socket.data.roomId;
    const playerId = socket.data.playerId;
    console.log('[Server] start-game from', socket.id, 'roomId=', roomId);
    if (!roomId || !playerId) return;
    await roomManager.startGame(roomId, playerId);
  });

  socket.on('play-card', (cardIds, effectCardId, cb) => {
    const roomId = socket.data.roomId;
    const playerId = socket.data.playerId;
    console.log('[Server] play-card from', socket.id, 'roomId=', roomId, 'playerId=', playerId, 'cards=', cardIds.length, 'effect=', effectCardId);
    if (!roomId || !playerId) {
      console.log('[Server] play-card blocked: missing roomId or playerId');
      return cb(false);
    }
    const result = roomManager.playCard(roomId, playerId, cardIds, effectCardId);
    console.log('[Server] play-card result:', result);
    cb(result);
  });

  socket.on('judge-pick', (submissionId, cb) => {
    const roomId = socket.data.roomId;
    const playerId = socket.data.playerId;
    if (!roomId || !playerId) return cb(false);
    cb(roomManager.judgePick(roomId, playerId, submissionId));
  });

  socket.on('vote-submission', (submissionId, cb) => {
    const roomId = socket.data.roomId;
    const playerId = socket.data.playerId;
    if (!roomId || !playerId) return cb(false);
    cb(roomManager.castVote(roomId, playerId, submissionId));
  });

  socket.on('next-round', () => {
    const roomId = socket.data.roomId;
    const playerId = socket.data.playerId;
    if (!roomId || !playerId) return;
    roomManager.nextRound(roomId, playerId);
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
    if (!checkSocketRateLimit('send-chat', 60, 60 * 1000)) {
      socket.emit('error', 'Rate limit exceeded. Please slow down.');
      return;
    }
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
    console.log('[Server] request-state from', socket.id, 'roomId=', roomId, 'playerId=', playerId);
    if (!roomId || !playerId) {
      console.log('[Server] request-state blocked: missing data');
      return;
    }
    const room = roomManager.getRoom(roomId);
    if (!room) {
      console.log('[Server] request-state blocked: room not found', roomId);
      return;
    }
    const player = room.players.find((p) => p.id === playerId);
    if (!player) {
      console.log('[Server] request-state blocked: player not found', playerId, 'in', room.players.map((p) => p.id));
      return;
    }
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
    if (!checkSocketRateLimit('register', 5, 15 * 60 * 1000)) {
      return cb(false, 'Too many attempts. Please try again later.', undefined);
    }
    try {
      const result = await registerUser(username, password, email || '');
      if (result.success && result.user) {
        socket.data.userId = result.user.id;
        socket.data.username = result.user.username;
        onlineUsers.add(result.user.id);
        userSockets.set(result.user.id, socket.id);
        await updateUserStatus(result.user.id, 'online');
        const reqSession = (socket.request as any).session;
        if (reqSession) {
          reqSession.userId = result.user.id;
          reqSession.save?.();
        }
        socket.emit('auth-success', result.user);
      } else {
        socket.emit('auth-error', result.error || 'Registration failed');
      }
      cb(result.success, result.error || 'OK', result.user ? { ...result.user } : undefined);
    } catch (err) {
      console.error('[Server] Register error:', err);
      socket.emit('auth-error', 'Server error during registration');
      cb(false, 'Server error', undefined);
    }
  });

  socket.on('login', async (username, password, cb) => {
    if (!checkSocketRateLimit('login', 5, 15 * 60 * 1000)) {
      return cb(false, 'Too many attempts. Please try again later.', undefined);
    }
    try {
      const result = await loginUser(username, password);
      if (result.success && result.user) {
        socket.data.userId = result.user.id;
        socket.data.username = result.user.username;
        onlineUsers.add(result.user.id);
        userSockets.set(result.user.id, socket.id);
        await updateUserStatus(result.user.id, 'online');
        const reqSession = (socket.request as any).session;
        if (reqSession) {
          reqSession.userId = result.user.id;
          reqSession.save?.();
        }
        // Notify friends that user is online
        const friends = await getFriendUsers(result.user.id);
        for (const f of friends) {
          const targetSocketId = userSockets.get(f.userId);
          if (targetSocketId) {
            io.to(targetSocketId).emit('friend-status-update', result.user.id, 'online');
          }
        }
        socket.emit('auth-success', result.user);
      } else {
        socket.emit('auth-error', result.error || 'Login failed');
      }
      cb(result.success, result.error || 'OK', result.user ? { ...result.user } : undefined);
    } catch (err) {
      console.error('[Server] Login error:', err);
      socket.emit('auth-error', 'Server error during login');
      cb(false, 'Server error', undefined);
    }
  });

  socket.on('request-password-reset', async (username, email, cb) => {
    if (!checkSocketRateLimit('request-password-reset', 3, 15 * 60 * 1000)) {
      return cb(false, 'Too many attempts. Please try again later.', undefined);
    }
    try {
      const result = await requestPasswordReset(username, email);
      cb(result.success, result.error || 'OK', result.token);
    } catch (err) {
      console.error('[Server] Password reset request error:', err);
      cb(false, 'Server error', undefined);
    }
  });

  socket.on('reset-password', async (username, token, newPassword, cb) => {
    try {
      const result = await resetPassword(username, token, newPassword);
      cb(result.success, result.error || 'OK');
    } catch (err) {
      console.error('[Server] Password reset error:', err);
      cb(false, 'Server error');
    }
  });

  socket.on('buy-theme', async (themeId, cb) => {
    const userId = socket.data.userId;
    if (!userId) return cb(false, 0, 'Not authenticated. Please sign in again.');
    const costMap: Record<string, number> = {
      cyberpunk: 150,
      retro: 200,
      ocean: 225,
      inferno: 300,
    };
    const cost = costMap[themeId] ?? 150;
    const result = await spendUserBalance(userId, cost);
    if (!result.success) {
      return cb(false, result.remaining, `Not enough funds! You need $${cost.toFixed(2)}`);
    }
    await unlockUserTheme(userId, themeId);
    cb(true, result.remaining);
  });

  socket.on('buy-effect-card', async (cardId, cb) => {
    const userId = socket.data.userId;
    if (!userId) return cb(false, 0, 'Not authenticated. Please sign in again.');
    const user = await getUserById(userId);
    if (!user) return cb(false, 0, 'User not found.');
    const template = EFFECT_CARDS.find((c) => c.id === cardId);
    if (!template || !template.effect) return cb(false, user.balance, 'Invalid effect card.');
    let cost = 7;
    if (template.effect.type === 'exodia') cost = 10;
    else if (['double_points_win', 'point_drain', 'card_quality_down', 'abduction'].includes(template.effect.type)) cost = 8;
    const result = await spendUserBalance(userId, cost);
    if (!result.success) {
      return cb(false, result.remaining, `Not enough funds! You need $${cost.toFixed(2)}`);
    }
    await addEffectCardToInventory(userId, cardId);
    cb(true, result.remaining);
  });

  socket.on('get-profile', async (username, cb) => {
    const profile = await getProfileByUsername(username);
    cb(profile ? { ...profile, passwordHash: '' } : null);
  });

  socket.on('update-profile', async (bio, avatarUrl, cb) => {
    const userId = socket.data.userId;
    if (!userId) return cb(false);
    if (avatarUrl && !/^https?:\/\//i.test(avatarUrl)) {
      return cb(false);
    }
    const updated = await updateProfile(userId, bio, avatarUrl);
    if (updated) {
      socket.emit('auth-success', updated);
      cb(true, updated);
    } else {
      cb(false);
    }
  });

  socket.on('get-own-profile', async (cb) => {
    const userId = socket.data.userId;
    if (!userId) return cb(null);
    const user = await getUserById(userId);
    cb(user ? { ...user, passwordHash: '' } : null);
  });

  socket.on('identify', async (userId, cb) => {
    const reqSession = (socket.request as any).session;
    if (!reqSession || reqSession.userId !== userId) {
      if (cb) cb(false);
      return;
    }
    const user = await getUserById(userId);
    if (user) {
      socket.data.userId = user.id;
      socket.data.username = user.username;
      onlineUsers.add(user.id);
      userSockets.set(user.id, socket.id);
      await updateUserStatus(user.id, 'online');
      if (cb) cb(true, { ...user, passwordHash: '' });
    } else {
      if (cb) cb(false);
    }
  });

  socket.on('disconnect', async () => {
    const roomId = socket.data.roomId;
    const playerId = socket.data.playerId;
    if (roomId && playerId) {
      roomManager.handleDisconnect(roomId, playerId);
    }
    const userId = socket.data.userId;
    if (userId) {
      onlineUsers.delete(userId);
      userSockets.delete(userId);
      await updateUserStatus(userId, 'offline');
      // Notify friends that user is offline
      const friends = await getFriendUsers(userId);
      for (const f of friends) {
        const targetSocketId = userSockets.get(f.userId);
        if (targetSocketId) {
          io.to(targetSocketId).emit('friend-status-update', userId, 'offline');
        }
      }
    }
    console.log('[Server] Client disconnected:', socket.id);
  });

  // Friend handlers
  socket.on('send-friend-request', async (targetUsername, cb) => {
    const userId = socket.data.userId;
    if (!userId) return cb(false, 'Not authenticated.');
    const result = await sendFriendRequest(userId, targetUsername);
    if (result.success && result.request) {
      // Notify target user only
      const targetSocketId = userSockets.get(result.request.toId);
      if (targetSocketId) {
        io.to(targetSocketId).emit('friend-request-received', result.request);
      }
    }
    cb(result.success, result.error);
  });

  socket.on('accept-friend-request', async (requestId, cb) => {
    const userId = socket.data.userId;
    if (!userId) return cb(false);
    const result = await acceptFriendRequest(userId, requestId);
    if (result.success && result.friendId) {
      const friend = await getUserById(result.friendId);
      if (friend) {
        socket.emit('friend-request-accepted', { userId: friend.id, username: friend.username, avatarUrl: friend.avatarUrl, status: friend.status });
        // Notify the requester (friend) that their request was accepted
        const requesterSocketId = userSockets.get(result.friendId);
        if (requesterSocketId) {
          io.to(requesterSocketId).emit('friend-request-accepted', { userId, username: socket.data.username || '', avatarUrl: '', status: 'online' as const });
        }
      }
    }
    cb(result.success);
  });

  socket.on('reject-friend-request', async (requestId, cb) => {
    const userId = socket.data.userId;
    if (!userId) return cb(false);
    const result = await rejectFriendRequest(userId, requestId);
    cb(result.success);
  });

  socket.on('remove-friend', async (targetUserId, cb) => {
    const userId = socket.data.userId;
    if (!userId) return cb(false);
    await removeFriend(userId, targetUserId);
    socket.emit('friend-removed', targetUserId);
    // Notify the removed friend only
    const targetSocketId = userSockets.get(targetUserId);
    if (targetSocketId) {
      io.to(targetSocketId).emit('friend-removed', userId);
    }
    cb(true);
  });

  socket.on('get-friends', async (cb) => {
    const userId = socket.data.userId;
    if (!userId) return cb([]);
    const friends = await getFriendUsers(userId);
    cb(friends);
  });

  socket.on('get-friend-requests', async (cb) => {
    const userId = socket.data.userId;
    if (!userId) return cb([]);
    const requests = await getPendingFriendRequests(userId);
    cb(requests);
  });

  socket.on('block-user', async (targetUserId, cb) => {
    const userId = socket.data.userId;
    if (!userId) return cb(false);
    await blockUser(userId, targetUserId);
    cb(true);
  });

  socket.on('unblock-user', async (targetUserId, cb) => {
    const userId = socket.data.userId;
    if (!userId) return cb(false);
    await unblockUser(userId, targetUserId);
    cb(true);
  });

  socket.on('set-effect-cards', (cardIds, cb) => {
    const roomId = socket.data.roomId;
    const playerId = socket.data.playerId;
    if (!roomId || !playerId) return cb(false);
    const success = roomManager.setPlayerEffectCards(roomId, playerId, cardIds);
    cb(success);
  });

  // DM handlers
  socket.on('send-dm', async (targetUserId, text, cb) => {
    if (!checkSocketRateLimit('send-dm', 30, 60 * 1000)) {
      return cb(false);
    }
    const userId = socket.data.userId;
    if (!userId) return cb(false);
    if (!text.trim()) return cb(false);
    try {
      const message = await sendDM(userId, targetUserId, text);
      // Emit to sender
      socket.emit('dm-received', message, userId);
      // Emit to target if they're online
      const targetSocketId = userSockets.get(targetUserId);
      if (targetSocketId) {
        io.to(targetSocketId).emit('dm-received', message, userId);
      }
      cb(true);
    } catch {
      cb(false);
    }
  });

  socket.on('get-dm-history', async (targetUserId, cb) => {
    const userId = socket.data.userId;
    if (!userId) return cb([]);
    const messages = await getDMHistory(userId, targetUserId, 50);
    cb(messages);
  });

  // Group chat handlers
  socket.on('create-group', async (name, cb) => {
    const userId = socket.data.userId;
    const username = socket.data.username;
    if (!userId || !username) return cb(null);
    const group = await createGroup(name, userId, username);
    socket.emit('group-created', group);
    cb(group);
  });

  socket.on('join-group', async (groupId, cb) => {
    const userId = socket.data.userId;
    const username = socket.data.username;
    if (!userId || !username) return cb(null);
    const group = await joinGroup(groupId, userId, username);
    if (group) {
      group.members.forEach((m) => {
        const sid = userSockets.get(m.userId);
        if (sid) io.to(sid).emit('group-member-update', groupId, group.members);
      });
    }
    cb(group ? { ...group, messages: [] } : null);
  });

  socket.on('leave-group', async (groupId, cb) => {
    const userId = socket.data.userId;
    if (!userId) return cb(false);
    const success = await leaveGroup(groupId, userId);
    if (success) {
      const group = await getGroupById(groupId);
      const members = group ? group.members : [];
      members.forEach((m) => {
        const sid = userSockets.get(m.userId);
        if (sid) io.to(sid).emit('group-member-update', groupId, members);
      });
    }
    cb(success);
  });

  socket.on('send-group-message', async (groupId, text, cb) => {
    if (!checkSocketRateLimit('send-group-message', 30, 60 * 1000)) {
      return cb(false);
    }
    const userId = socket.data.userId;
    const username = socket.data.username;
    if (!userId || !username) return cb(false);
    if (!text.trim()) return cb(false);
    const message = await sendGroupMessage(groupId, userId, username, text);
    if (message) {
      const group = await getGroupById(groupId);
      if (group) {
        group.members.forEach((m) => {
          const sid = userSockets.get(m.userId);
          if (sid) io.to(sid).emit('group-message-received', groupId, message);
        });
      }
    }
    cb(!!message);
  });

  socket.on('get-group-history', async (groupId, cb) => {
    const userId = socket.data.userId;
    if (!userId) return cb([]);
    const messages = await getGroupHistory(groupId, 50);
    cb(messages);
  });

  socket.on('get-my-groups', async (cb) => {
    const userId = socket.data.userId;
    if (!userId) return cb([]);
    const groups = await getMyGroups(userId);
    cb(groups);
  });

  socket.on('promote-member', async (groupId, targetUserId, cb) => {
    const userId = socket.data.userId;
    if (!userId) return cb(false);
    const group = await getGroupById(groupId);
    if (!group || group.ownerId !== userId) return cb(false);
    const success = await promoteMember(groupId, targetUserId);
    if (success) {
      const updated = await getGroupById(groupId);
      if (updated) {
        updated.members.forEach((m) => {
          const sid = userSockets.get(m.userId);
          if (sid) io.to(sid).emit('group-member-update', groupId, updated.members);
        });
      }
    }
    cb(success);
  });

  socket.on('demote-mod', async (groupId, targetUserId, cb) => {
    const userId = socket.data.userId;
    if (!userId) return cb(false);
    const group = await getGroupById(groupId);
    if (!group || group.ownerId !== userId) return cb(false);
    const success = await demoteMod(groupId, targetUserId);
    if (success) {
      const updated = await getGroupById(groupId);
      if (updated) {
        updated.members.forEach((m) => {
          const sid = userSockets.get(m.userId);
          if (sid) io.to(sid).emit('group-member-update', groupId, updated.members);
        });
      }
    }
    cb(success);
  });

  socket.on('kick-from-group', async (groupId, targetUserId, cb) => {
    const userId = socket.data.userId;
    if (!userId) return cb(false);
    const group = await getGroupById(groupId);
    if (!group) return cb(false);
    const actor = group.members.find((m) => m.userId === userId);
    if (!actor) return cb(false);
    const target = group.members.find((m) => m.userId === targetUserId);
    if (!target) return cb(false);
    if (group.ownerId === targetUserId) return cb(false); // Cannot kick owner
    if (actor.role === 'mod' && target.role !== 'member') return cb(false); // Mod can only kick members
    if (actor.role === 'member') return cb(false); // Members can't kick
    const success = await kickFromGroup(groupId, targetUserId);
    if (success) {
      const updated = await getGroupById(groupId);
      if (updated) {
        updated.members.forEach((m) => {
          const sid = userSockets.get(m.userId);
          if (sid) io.to(sid).emit('group-member-update', groupId, updated.members);
        });
        const targetSid = userSockets.get(targetUserId);
        if (targetSid) io.to(targetSid).emit('group-member-update', groupId, []);
      }
    }
    cb(success);
  });

  socket.on('delete-group', async (groupId, cb) => {
    const userId = socket.data.userId;
    if (!userId) return cb(false);
    const group = await getGroupById(groupId);
    if (!group || group.ownerId !== userId) return cb(false);
    const members = group.members;
    const success = await deleteGroup(groupId);
    if (success) {
      members.forEach((m) => {
        const sid = userSockets.get(m.userId);
        if (sid) io.to(sid).emit('group-member-update', groupId, []);
      });
    }
    cb(success);
  });

  socket.on('invite-to-group', async (groupId, targetUserId, cb) => {
    const userId = socket.data.userId;
    const username = socket.data.username;
    if (!userId || !username) return cb(false);
    const group = await getGroupById(groupId);
    if (!group) return cb(false);
    const actor = group.members.find((m) => m.userId === userId);
    if (!actor || actor.role === 'member') return cb(false);
    if (group.members.some((m) => m.userId === targetUserId)) return cb(false);
    // Get target user's username/avatar from userDb
    const targetUser = await getUserById(targetUserId);
    if (!targetUser) return cb(false);
    const success = await addUserToGroup(groupId, targetUserId, targetUser.username, targetUser.avatarUrl);
    if (success) {
      const updated = await getGroupById(groupId);
      if (updated) {
        updated.members.forEach((m) => {
          const sid = userSockets.get(m.userId);
          if (sid) io.to(sid).emit('group-member-update', groupId, updated.members);
        });
        const targetSid = userSockets.get(targetUserId);
        if (targetSid) io.to(targetSid).emit('group-invite-received', { ...updated, messages: [] });
      }
    }
    cb(success);
  });
});

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

// Seed dev user if database is empty (e.g. first deploy)
seedDevUserIfEmpty().then(() => {
  httpServer.listen(PORT, () => {
    console.log(`[Server] Who's Next? server running on http://localhost:${PORT}`);
  });
}).catch((err) => {
  console.error('[Server] Failed to seed dev user:', err);
  httpServer.listen(PORT, () => {
    console.log(`[Server] Who's Next? server running on http://localhost:${PORT}`);
  });
});
