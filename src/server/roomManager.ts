import { Room, Player, GameMode, GamePhase, Card, CardPlay, Buff, BuffType } from '../shared/types.js';
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
      buffsEnabled: boolean;
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
      abductionRounds: 0,
      analProbeRounds: 0,
      doublePointsHandRounds: 0,
      cardQualityDownRounds: 0,
      autoDrawEnabled: false,
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
      buffsEnabled: opts.buffsEnabled,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    this.rooms.set(roomId, room);

    const { blackCards, whiteCards } = getCardsForPacks(opts.cardPacks, opts.buffsEnabled);
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
      abductionRounds: 0,
      analProbeRounds: 0,
      doublePointsHandRounds: 0,
      cardQualityDownRounds: 0,
      autoDrawEnabled: false,
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
    // Reset per-game counters and buffs
    for (const p of room.players) {
      p.blankCardsRemaining = room.blankCardsEnabled ? 3 : 0;
      p.abductionRounds = 0;
      p.analProbeRounds = 0;
      p.doublePointsHandRounds = 0;
      p.cardQualityDownRounds = 0;
      p.autoDrawEnabled = false;
      p.forcedRandomCardId = undefined;
    }
    this.dealCards(room);
    this.startRound(room);
  }

  private dealCards(room: Room): void {
    const deck = this.decks.get(room.id);
    if (!deck) return;
    for (const player of room.players) {
      // Abducted players get no cards
      if (player.abductionRounds > 0) continue;

      let cardsPerPlayer = 10;
      if (player.analProbeRounds > 0) cardsPerPlayer = 15;
      if (player.cardQualityDownRounds > 0) cardsPerPlayer = 5;

      while (player.cards.length < cardsPerPlayer) {
        if (deck.whiteDeck.length === 0) {
          if (deck.whiteDiscard.length === 0) {
            const { whiteCards } = getCardsForPacks(room.cardPacks, room.buffsEnabled);
            deck.whiteDeck = shuffleArray([...whiteCards]);
            deck.whiteDiscard = [];
          } else {
            deck.whiteDeck = shuffleArray(deck.whiteDiscard);
            deck.whiteDiscard = [];
          }
        }
        const template = deck.whiteDeck.pop();
        if (!template) continue;
        player.cards.push({ ...template, id: crypto.randomUUID() });
      }

      // Auto-draw: if down to 1 card, draw 3 more
      if (player.autoDrawEnabled && player.cards.length <= 1) {
        for (let i = 0; i < 3; i++) {
          if (deck.whiteDeck.length === 0) break;
          const template = deck.whiteDeck.pop();
          if (template) player.cards.push({ ...template, id: crypto.randomUUID() });
        }
        this.io.to(player.socketId).emit('notification', 'Auto-draw: +3 cards!');
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

    // Tick down persistent round counters
    for (const p of room.players) {
      if (p.abductionRounds > 0) {
        p.abductionRounds -= 1;
        if (p.abductionRounds === 0) {
          p.analProbeRounds = 2;
          this.io.to(room.id).emit('notification', `${p.name} returned from abduction with an anal probe! Extra cards for 2 rounds.`);
        }
      }
      if (p.analProbeRounds > 0) p.analProbeRounds -= 1;
      if (p.doublePointsHandRounds > 0) p.doublePointsHandRounds -= 1;
      if (p.cardQualityDownRounds > 0) p.cardQualityDownRounds -= 1;
      p.forcedRandomCardId = undefined;
    }

    // Draw next black card
    if (deck.blackDeck.length === 0) {
      if (deck.blackDiscard.length === 0) {
        const { blackCards } = getCardsForPacks(room.cardPacks, room.buffsEnabled);
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

    // Judge rotation — skip abducted players
    let attempts = 0;
    let judgeIndex = (room.round - 1) % room.players.length;
    while (room.players[judgeIndex]?.abductionRounds > 0 && attempts < room.players.length) {
      judgeIndex = (judgeIndex + 1) % room.players.length;
      attempts++;
    }
    room.judgeId = room.players[judgeIndex]?.id;
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

    // Abducted players cannot play
    if (player.abductionRounds > 0) {
      this.io.to(player.socketId).emit('error', 'You are abducted and cannot play this round!');
      return false;
    }

    // Forced random: player must submit their forced card instead
    if (player.forcedRandomCardId) {
      const forcedIndex = player.cards.findIndex((c) => c.id === player.forcedRandomCardId);
      if (forcedIndex !== -1) {
        const forcedCard = player.cards[forcedIndex];
        player.cards.splice(forcedIndex, 1);
        room.submittedCards.push({ playerId, cards: [forcedCard] });
        this.io.to(room.id).emit('card-played', playerId);
        this.io.to(room.id).emit('notification', `${player.name} was forced to play a random card!`);
        const expectedSubmissions = room.players.filter((p) => p.id !== room.judgeId && p.abductionRounds === 0).length;
        const uniqueSubmitters = new Set(room.submittedCards.map((s) => s.playerId)).size;
        if (uniqueSubmitters >= expectedSubmissions) {
          room.phase = 'judging';
        }
        this.broadcastState(room);
        return true;
      }
    }

    const pickCount = room.blackCard?.pickCount || 1;
    if (cards.length !== pickCount) return false;

    const playedCards: Card[] = [];
    for (const play of cards) {
      if (play.cardId === '__blank__') {
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

    // Process on-play card effects
    for (const card of playedCards) {
      if (!card.effect) continue;
      switch (card.effect.type) {
        case 'exodia': {
          // Instant win
          room.phase = 'game-over';
          const scores: Record<string, number> = {};
          room.players.forEach((p) => (scores[p.name] = p.score));
          this.io.to(room.id).emit('game-over', scores, playerId);
          this.io.to(room.id).emit('notification', `EXODIA! ${player.name} has summoned the forbidden one and wins instantly!`);
          this.broadcastState(room);
          return true;
        }
        case 'steal_card': {
          const others = room.players.filter((p) => p.id !== playerId && p.cards.length > 0);
          if (others.length > 0) {
            const target = others[Math.floor(Math.random() * others.length)];
            const idx = Math.floor(Math.random() * target.cards.length);
            const stolen = target.cards.splice(idx, 1)[0];
            player.cards.push(stolen);
            this.io.to(room.id).emit('notification', `${player.name} stole a card from ${target.name}!`);
          }
          break;
        }
        case 'hand_swap': {
          const others = room.players.filter((p) => p.id !== playerId);
          if (others.length > 0) {
            const target = others[Math.floor(Math.random() * others.length)];
            const temp = [...player.cards];
            player.cards = [...target.cards];
            target.cards = temp;
            this.io.to(room.id).emit('notification', `${player.name} swapped hands with ${target.name}!`);
          }
          break;
        }
        case 'customize_card': {
          // Reroll: discard one random card and draw a replacement
          if (player.cards.length > 0) {
            const discardIdx = Math.floor(Math.random() * player.cards.length);
            player.cards.splice(discardIdx, 1);
            const deck = this.decks.get(room.id);
            if (deck && deck.whiteDeck.length > 0) {
              const template = deck.whiteDeck.pop()!;
              player.cards.push({ ...template, id: crypto.randomUUID() });
            }
            this.io.to(room.id).emit('notification', `${player.name} customized their hand!`);
          }
          break;
        }
        case 'half_hand_discard': {
          const discardCount = Math.ceil(player.cards.length / 2);
          for (let i = 0; i < discardCount; i++) {
            if (player.cards.length === 0) break;
            const idx = Math.floor(Math.random() * player.cards.length);
            const discarded = player.cards.splice(idx, 1)[0];
            const deck = this.decks.get(room.id);
            if (deck) deck.whiteDiscard.push(discarded);
          }
          this.io.to(room.id).emit('notification', `${player.name} lost half their hand!`);
          break;
        }
        case 'forced_random': {
          const others = room.players.filter((p) => p.id !== playerId && p.abductionRounds === 0 && !room.submittedCards.some((s) => s.playerId === p.id));
          if (others.length > 0) {
            const target = others[Math.floor(Math.random() * others.length)];
            if (target.cards.length > 0) {
              const idx = Math.floor(Math.random() * target.cards.length);
              const forced = target.cards[idx];
              target.forcedRandomCardId = forced.id;
              this.io.to(room.id).emit('notification', `${target.name} must submit a random card this round!`);
            }
          }
          break;
        }
        case 'abduction': {
          player.abductionRounds = 2;
          this.io.to(room.id).emit('notification', `${player.name} was abducted! They will miss the next 2 rounds.`);
          break;
        }
        case 'auto_draw': {
          player.autoDrawEnabled = true;
          this.io.to(room.id).emit('notification', `${player.name} unlocked auto-draw!`);
          break;
        }
        case 'double_points_hand': {
          player.doublePointsHandRounds = 1;
          this.io.to(room.id).emit('notification', `${player.name}'s hand cards are worth double points this round!`);
          break;
        }
        case 'card_quality_down': {
          const others = room.players.filter((p) => p.id !== playerId);
          if (others.length > 0) {
            const target = others[Math.floor(Math.random() * others.length)];
            target.cardQualityDownRounds = 1;
            this.io.to(room.id).emit('notification', `${target.name} draws half cards next round!`);
          }
          break;
        }
      }
    }

    room.submittedCards.push({ playerId, cards: playedCards });
    this.io.to(room.id).emit('card-played', playerId);

    // Check if everyone except judge has played (count unique submitters, skip abducted)
    const expectedSubmissions = room.players.filter((p) => p.id !== room.judgeId && p.abductionRounds === 0).length;
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

    let pointsAwarded = 1;

    // double_points_win: if winning submission contains a double_points_win card
    const winningSub = room.submittedCards.find((s) => s.playerId === winnerId);
    if (winningSub?.cards.some((c) => c.effect?.type === 'double_points_win')) {
      pointsAwarded = 2;
      this.io.to(room.id).emit('notification', `${winner.name} scored double points with a winning card! (+2)`);
    }

    // double_points_hand: active this round
    if (winner.doublePointsHandRounds > 0) {
      pointsAwarded = 2;
      this.io.to(room.id).emit('notification', `${winner.name}'s hand bonus doubled the points! (+2)`);
    }

    winner.score += pointsAwarded;
    room.phase = 'reveal';

    // point_drain: if winning submission contains a point_drain card, winner loses 1 point
    if (winningSub?.cards.some((c) => c.effect?.type === 'point_drain')) {
      winner.score -= 1;
      this.io.to(room.id).emit('notification', `${winner.name} was drained by a debuff card! (-1 point)`);
    }

    const winningCards = winningSub?.cards || room.submittedCards[0].cards;
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
      p.abductionRounds = 0;
      p.analProbeRounds = 0;
      p.doublePointsHandRounds = 0;
      p.cardQualityDownRounds = 0;
      p.autoDrawEnabled = false;
      p.forcedRandomCardId = undefined;
    });
    const deck = this.decks.get(room.id);
    if (deck) {
      const { blackCards, whiteCards } = getCardsForPacks(room.cardPacks, room.buffsEnabled);
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
