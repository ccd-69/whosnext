import { Room, Player, GameMode, GamePhase, Card, CardPlay } from '../shared/types.js';
import { getCardsForPacks, shuffleArray } from '../shared/deck.js';
import type { Server as SocketIOServer } from 'socket.io';
import type { ServerToClientEvents, ClientToServerEvents, InterServerEvents, SocketData } from '../shared/types.js';

interface DeckState {
  whiteDeck: Card[];
  blackDeck: Card[];
  whiteDiscard: Card[];
  blackDiscard: Card[];
}

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
  private decks = new Map<string, DeckState>();
  private io: SocketIOServer<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

  constructor(io: SocketIOServer<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>) {
    this.io = io;
  }

  createRoom(
    opts: {
      name: string;
      hostName: string;
      mode: GameMode;
      maxPlayers: number;
      maxRounds: number;
      blankCardsEnabled: boolean;
      cardPacks: import('../shared/types.js').CardPack[];
    },
    hostSocketId: string
  ): Room {
    const roomId = crypto.randomUUID();
    const hostPlayer: Player = {
      id: crypto.randomUUID(),
      name: opts.hostName || 'Host',
      socketId: hostSocketId,
      score: 0,
      isHost: true,
      isConnected: true,
      cards: [],
      blankCardsRemaining: opts.blankCardsEnabled ? 3 : 0,
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
      blankCardsEnabled: opts.blankCardsEnabled,
      cardPacks: opts.cardPacks,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    this.rooms.set(roomId, room);

    const { blackCards, whiteCards } = getCardsForPacks(opts.cardPacks);
    this.decks.set(roomId, {
      whiteDeck: shuffleArray([...whiteCards]),
      blackDeck: shuffleArray([...blackCards]),
      whiteDiscard: [],
      blackDiscard: [],
    });
    console.log(`[RoomManager] Created room ${room.code} (${roomId}) packs=${opts.cardPacks.join(',')} blanks=${opts.blankCardsEnabled}`);
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
      blankCardsRemaining: room.blankCardsEnabled ? 3 : 0,
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
    // Reset blank cards per game
    for (const p of room.players) {
      p.blankCardsRemaining = room.blankCardsEnabled ? 3 : 0;
    }
    this.dealCards(room);
    this.startRound(room);
  }

  private dealCards(room: Room): void {
    const deck = this.decks.get(room.id);
    if (!deck) return;
    const cardsPerPlayer = 10;
    for (const player of room.players) {
      while (player.cards.length < cardsPerPlayer) {
        if (deck.whiteDeck.length === 0) {
          if (deck.whiteDiscard.length === 0) {
            const { whiteCards } = getCardsForPacks(room.cardPacks);
            deck.whiteDeck = shuffleArray([...whiteCards]);
            deck.whiteDiscard = [];
          } else {
            deck.whiteDeck = shuffleArray(deck.whiteDiscard);
            deck.whiteDiscard = [];
          }
        }
        const template = deck.whiteDeck.pop();
        if (!template) continue;
        // Clone with a unique ID so no two players ever share the same card
        player.cards.push({ ...template, id: crypto.randomUUID() });
      }
    }
  }

  private startRound(room: Room): void {
    const deck = this.decks.get(room.id);
    if (!deck) return;

    // Discard previous round cards
    if (room.blackCard) {
      deck.blackDiscard.push(room.blackCard);
    }
    for (const sub of room.submittedCards) {
      for (const card of sub.cards) {
        deck.whiteDiscard.push(card);
      }
    }
    room.submittedCards = [];

    // Draw next black card
    if (deck.blackDeck.length === 0) {
      if (deck.blackDiscard.length === 0) {
        const { blackCards } = getCardsForPacks(room.cardPacks);
        deck.blackDeck = shuffleArray([...blackCards]);
      } else {
        deck.blackDeck = shuffleArray(deck.blackDiscard);
      }
      deck.blackDiscard = [];
    }
    const blackTemplate = deck.blackDeck.pop();
    room.blackCard = blackTemplate ? { ...blackTemplate, id: crypto.randomUUID() } : undefined;

    // Replenish white cards for all players
    this.dealCards(room);

    // Judge rotates: round 1 = player 0, round 2 = player 1, etc.
    const judgeIndex = (room.round - 1) % room.players.length;
    room.judgeId = room.players[judgeIndex].id;
    room.phase = 'playing';

    this.broadcastState(room);
    this.io.to(room.id).emit('round-start', room.blackCard, room.judgeId);
  }

  playCard(roomId: string, playerId: string, cards: CardPlay[]): boolean {
    const room = this.rooms.get(roomId);
    if (!room || room.phase !== 'playing') return false;
    if (playerId === room.judgeId) return false;

    const player = room.players.find((p) => p.id === playerId);
    if (!player) return false;

    const pickCount = room.blackCard?.pickCount || 1;
    if (cards.length !== pickCount) return false;

    const playedCards: Card[] = [];
    for (const play of cards) {
      if (play.cardId === '__blank__') {
        // Blank card use
        if (player.blankCardsRemaining <= 0) return false;
        player.blankCardsRemaining -= 1;
        playedCards.push({
          id: `blank-${playerId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          text: play.customText?.trim() || '[blank]',
          type: 'white',
          isBlank: true,
        });
        continue;
      }
      const cardIndex = player.cards.findIndex((c) => c.id === play.cardId);
      if (cardIndex === -1) return false;
      const card = player.cards[cardIndex];
      playedCards.push(card);
      player.cards.splice(cardIndex, 1);
    }

    room.submittedCards.push({ playerId, cards: playedCards });
    this.io.to(room.id).emit('card-played', playerId);

    // Check if everyone except judge has played (count unique submitters)
    const expectedSubmissions = room.players.filter((p) => p.id !== room.judgeId).length;
    const uniqueSubmitters = new Set(room.submittedCards.map((s) => s.playerId)).size;
    if (uniqueSubmitters >= expectedSubmissions) {
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

    const winningCards = room.submittedCards.find((s) => s.playerId === winnerId)?.cards || room.submittedCards[0].cards;
    this.io.to(room.id).emit('judge-picked', winnerId, winningCards);

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
      this.resetToLobby(room);
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

  private resetToLobby(room: Room): void {
    room.phase = 'lobby';
    room.round = 0;
    room.blackCard = undefined;
    room.judgeId = undefined;
    room.submittedCards = [];
    room.players.forEach((p) => {
      p.score = 0;
      p.cards = [];
      p.submittedCardId = undefined;
      p.blankCardsRemaining = room.blankCardsEnabled ? 3 : 0;
    });
    const deck = this.decks.get(room.id);
    if (deck) {
      const { blackCards, whiteCards } = getCardsForPacks(room.cardPacks);
      deck.whiteDeck = shuffleArray([...whiteCards]);
      deck.blackDeck = shuffleArray([...blackCards]);
      deck.whiteDiscard = [];
      deck.blackDiscard = [];
    }
    this.broadcastState(room);
  }

  removePlayer(roomId: string, playerId: string): Room | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    const playerIndex = room.players.findIndex((p) => p.id === playerId);
    if (playerIndex === -1) return null;

    const player = room.players[playerIndex];
    const deck = this.decks.get(room.id);

    // Discard leaving player's hand
    if (deck) {
      for (const card of player.cards) deck.whiteDiscard.push(card);
    }

    // Discard their submitted cards
    const theirSubmissions = room.submittedCards.filter((s) => s.playerId === playerId);
    if (deck) {
      for (const sub of theirSubmissions) {
        for (const card of sub.cards) deck.whiteDiscard.push(card);
      }
    }
    room.submittedCards = room.submittedCards.filter((s) => s.playerId !== playerId);

    const wasJudge = player.id === room.judgeId;

    // Remove player
    room.players.splice(playerIndex, 1);

    if (room.players.length === 0) {
      this.rooms.delete(roomId);
      this.decks.delete(roomId);
      return null;
    }

    // Transfer host if needed
    if (player.isHost && room.players.length > 0) {
      room.players[0].isHost = true;
    }

    // Lobby phase: just remove and broadcast
    if (room.phase === 'lobby') {
      this.broadcastState(room);
      this.io.to(room.id).emit('player-left', playerId);
      this.io.to(room.id).emit('notification', `${player.name} left the lobby.`);
      return room;
    }

    // Active game: not enough players left
    if (room.players.length < 3) {
      this.resetToLobby(room);
      this.io.to(room.id).emit('player-left', playerId);
      this.io.to(room.id).emit('notification', `${player.name} left. Not enough players — returning to lobby.`);
      return room;
    }

    // Judge left mid-game: discard remaining submissions and restart round
    if (wasJudge) {
      if (deck) {
        for (const sub of room.submittedCards) {
          for (const card of sub.cards) deck.whiteDiscard.push(card);
        }
      }
      room.submittedCards = [];
      this.dealCards(room);

      const judgeIndex = (room.round - 1) % room.players.length;
      room.judgeId = room.players[judgeIndex].id;
      room.phase = 'playing';

      this.broadcastState(room);
      this.io.to(room.id).emit('round-start', room.blackCard, room.judgeId);
      this.io.to(room.id).emit('player-left', playerId);
      this.io.to(room.id).emit('notification', `${player.name} left. Round restarted with new judge.`);
      return room;
    }

    // Non-judge left during playing: check if we should advance
    if (room.phase === 'playing') {
      const expectedSubmissions = room.players.filter((p) => p.id !== room.judgeId).length;
      const uniqueSubmitters = new Set(room.submittedCards.map((s) => s.playerId)).size;
      if (uniqueSubmitters >= expectedSubmissions) {
        room.phase = 'judging';
      }
    }

    this.broadcastState(room);
    this.io.to(room.id).emit('player-left', playerId);
    this.io.to(room.id).emit('notification', `${player.name} left.`);
    return room;
  }

  handleDisconnect(roomId: string, playerId: string): void {
    this.removePlayer(roomId, playerId);
  }

  broadcastState(room: Room): void {
    room.players.forEach((player) => {
      const sanitizedPlayers = room.players.map((p) => ({
        ...p,
        cards: p.id === player.id ? p.cards : [],
      }));
      const state = {
        room: { ...room, players: sanitizedPlayers },
        myPlayerId: player.id,
        hand: player.cards,
      };
      this.io.to(player.socketId).emit('game-state', state);
    });
  }
}
