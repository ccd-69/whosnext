import { Room, Player, GameMode, GamePhase, Card } from '../shared/types.js';
import { DEFAULT_BLACK_CARDS, DEFAULT_WHITE_CARDS, shuffleArray } from '../shared/deck.js';
import type { Server as SocketIOServer } from 'socket.io';
import type { ServerToClientEvents, ClientToServerEvents, InterServerEvents, SocketData } from '../shared/types.js';

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export class RoomManager {
  private rooms = new Map<string, Room>();
  private io: SocketIOServer<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

  constructor(io: SocketIOServer<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>) {
    this.io = io;
  }

  createRoom(
    opts: { name: string; mode: GameMode; maxPlayers: number; maxRounds: number },
    hostSocketId: string
  ): Room {
    const roomId = crypto.randomUUID();
    const hostPlayer: Player = {
      id: crypto.randomUUID(),
      name: 'Host',
      socketId: hostSocketId,
      score: 0,
      isHost: true,
      isConnected: true,
      cards: [],
    };
    const room: Room = {
      id: roomId,
      code: generateRoomCode(),
      name: opts.name,
      mode: opts.mode,
      phase: 'lobby',
      players: [hostPlayer],
      submittedCards: [],
      round: 0,
      maxRounds: opts.maxRounds,
      maxPlayers: opts.maxPlayers,
      winningScore: opts.mode === 'quick-play' ? 7 : 5,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    this.rooms.set(roomId, room);
    console.log(`[RoomManager] Created room ${room.code} (${roomId})`);
    return room;
  }

  joinRoom(code: string, playerName: string, socketId: string): Room | null {
    const room = Array.from(this.rooms.values()).find((r) => r.code === code);
    if (!room) return null;
    if (room.players.length >= room.maxPlayers) return null;
    if (room.phase !== 'lobby') return null;

    const player: Player = {
      id: crypto.randomUUID(),
      name: playerName || `Player ${room.players.length + 1}`,
      socketId: socketId,
      score: 0,
      isHost: false,
      isConnected: true,
      cards: [],
    };
    room.players.push(player);
    room.updatedAt = Date.now();
    console.log(`[RoomManager] Player ${player.name} joined room ${room.code}`);
    return room;
  }

  startGame(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (!room || room.players.length < 3) return;
    room.phase = 'dealing';
    room.round = 1;
    this.dealCards(room);
    this.startRound(room);
  }

  private dealCards(room: Room): void {
    const whiteDeck = shuffleArray(DEFAULT_WHITE_CARDS);
    const cardsPerPlayer = 10;
    for (let i = 0; i < room.players.length; i++) {
      const start = i * cardsPerPlayer;
      room.players[i].cards = whiteDeck.slice(start, start + cardsPerPlayer);
    }
  }

  private startRound(room: Room): void {
    const blackDeck = shuffleArray(DEFAULT_BLACK_CARDS);
    room.blackCard = blackDeck[0];
    room.submittedCards = [];
    room.phase = 'playing';

    // Judge rotates: round 1 = player 0, round 2 = player 1, etc.
    const judgeIndex = (room.round - 1) % room.players.length;
    room.judgeId = room.players[judgeIndex].id;

    this.broadcastState(room);
    this.io.to(room.id).emit('round-start', room.blackCard, room.judgeId);
  }

  playCard(roomId: string, playerId: string, cardId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room || room.phase !== 'playing') return false;
    if (playerId === room.judgeId) return false;

    const player = room.players.find((p) => p.id === playerId);
    if (!player) return false;

    const cardIndex = player.cards.findIndex((c) => c.id === cardId);
    if (cardIndex === -1) return false;

    const card = player.cards[cardIndex];
    player.cards.splice(cardIndex, 1);
    room.submittedCards.push({ playerId, card });

    this.io.to(room.id).emit('card-played', playerId);

    // Check if everyone except judge has played
    const expectedSubmissions = room.players.filter((p) => p.id !== room.judgeId).length;
    if (room.submittedCards.length >= expectedSubmissions) {
      room.phase = 'judging';
      this.broadcastState(room);
    } else {
      this.broadcastState(room);
    }
    return true;
  }

  judgePick(roomId: string, judgeId: string, winnerId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room || room.phase !== 'judging') return false;
    if (judgeId !== room.judgeId) return false;

    const winner = room.players.find((p) => p.id === winnerId);
    if (!winner) return false;

    winner.score += 1;
    room.phase = 'reveal';

    const winningCard = room.submittedCards.find((s) => s.playerId === winnerId)?.card;
    this.io.to(room.id).emit('judge-picked', winnerId, winningCard || room.submittedCards[0].card);

    // Check win conditions
    if (winner.score >= room.winningScore) {
      room.phase = 'game-over';
      const scores: Record<string, number> = {};
      room.players.forEach((p) => (scores[p.name] = p.score));
      this.io.to(room.id).emit('game-over', scores, winnerId);
    } else {
      room.phase = 'round-end';
      const scores: Record<string, number> = {};
      room.players.forEach((p) => (scores[p.name] = p.score));
      this.io.to(room.id).emit('round-end', scores);
    }

    this.broadcastState(room);
    return true;
  }

  nextRound(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;
    if (room.phase !== 'round-end' && room.phase !== 'game-over') return;

    if (room.phase === 'game-over') {
      room.phase = 'lobby';
      room.round = 0;
      room.players.forEach((p) => {
        p.score = 0;
        p.cards = [];
        p.submittedCardId = undefined;
      });
      this.broadcastState(room);
      return;
    }

    room.round += 1;
    if (room.round > room.maxRounds) {
      room.phase = 'game-over';
      const winner = room.players.reduce((a, b) => (a.score > b.score ? a : b));
      const scores: Record<string, number> = {};
      room.players.forEach((p) => (scores[p.name] = p.score));
      this.io.to(room.id).emit('game-over', scores, winner.id);
      this.broadcastState(room);
      return;
    }

    this.startRound(room);
  }

  handleDisconnect(roomId: string, playerId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;
    const player = room.players.find((p) => p.id === playerId);
    if (player) {
      player.isConnected = false;
      this.io.to(room.id).emit('player-left', playerId);
      this.broadcastState(room);
    }
  }

  private broadcastState(room: Room): void {
    room.players.forEach((player) => {
      const state = {
        room,
        myPlayerId: player.id,
        hand: player.cards,
      };
      this.io.to(player.socketId).emit('game-state', state);
    });
  }
}
