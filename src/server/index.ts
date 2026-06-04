import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import { RoomManager } from './roomManager.js';
import type { ServerToClientEvents, ClientToServerEvents, InterServerEvents, SocketData } from '../shared/types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const httpServer = createServer(app);

const io = new Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>(httpServer, {
  cors: { origin: '*' },
});

const roomManager = new RoomManager(io);

// Serve the renderer build for web clients joining via room code
const rendererPath = path.join(__dirname, '../../dist/renderer');
app.use(express.static(rendererPath));
app.get('*', (_req, res) => {
  res.sendFile(path.join(rendererPath, 'index.html'));
});

io.on('connection', (socket) => {
  console.log('[Server] Client connected:', socket.id);

  socket.on('create-room', (opts, cb) => {
    const room = roomManager.createRoom(opts, socket.id);
    socket.join(room.id);
    socket.data.playerId = room.players[0].id;
    socket.data.roomId = room.id;
    cb(room);
  });

  socket.on('join-room', (code, playerName, cb) => {
    const room = roomManager.joinRoom(code, playerName, socket.id);
    if (room) {
      socket.join(room.id);
      const player = room.players.find((p) => p.socketId === socket.id);
      if (player) {
        socket.data.playerId = player.id;
        socket.data.roomId = room.id;
      }
      socket.to(room.id).emit('player-joined', player!);
      cb(room);
    } else {
      cb(null);
    }
  });

  socket.on('start-game', () => {
    const roomId = socket.data.roomId;
    if (!roomId) return;
    roomManager.startGame(roomId);
  });

  socket.on('play-card', (cardId, cb) => {
    const roomId = socket.data.roomId;
    const playerId = socket.data.playerId;
    if (!roomId || !playerId) return cb(false);
    cb(roomManager.playCard(roomId, playerId, cardId));
  });

  socket.on('judge-pick', (winnerId, cb) => {
    const roomId = socket.data.roomId;
    const playerId = socket.data.playerId;
    if (!roomId || !playerId) return cb(false);
    cb(roomManager.judgePick(roomId, playerId, winnerId));
  });

  socket.on('next-round', () => {
    const roomId = socket.data.roomId;
    if (!roomId) return;
    roomManager.nextRound(roomId);
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
