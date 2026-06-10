import { Room, Player, GameMode, GamePhase, Card, CardPlay, ChatMessage, CustomEmoji } from '../shared/types.js';
import { getCardsForPacks, shuffleArray, EFFECT_CARDS } from '../shared/deck.js';
import { recordGameResults, recordSpend, getLeaderboards } from './leaderboard.js';
import { recordUserStats, updateUserBalance, getUserById, addBattleRoyaleXP } from './userDb.js';
import type { Server as SocketIOServer } from 'socket.io';
import type { ServerToClientEvents, ClientToServerEvents, InterServerEvents, SocketData } from '../shared/types.js';

interface DeckState {
  whiteDeck: Card[];
  blackDeck: Card[];
  whiteDiscard: Card[];
  blackDiscard: Card[];
  exodiaDropped?: boolean;
  deprioritizedEffects: Set<string>; // template IDs of returned unsold shop cards
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
  private chats = new Map<string, ChatMessage[]>();
  private customEmojis = new Map<string, CustomEmoji[]>();
  private activeVoteKicks = new Map<string, { targetId: string; votes: Map<string, boolean>; eligibleVoters: string[]; timeout: ReturnType<typeof setTimeout> }>();
  private reports = new Map<string, { reporterId: string; targetId: string; date: string }[]>();
  private disconnectTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private io: SocketIOServer<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

  constructor(io: SocketIOServer<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>) {
    this.io = io;
  }

  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
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
      userId?: string;
      username?: string;
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
      effectCards: [],
      blankCardsRemaining: opts.blankCardsEnabled ? 3 : 0,
      abductionRounds: 0,
      analProbeRounds: 0,
      doublePointsHandRounds: 0,
      cardQualityDownRounds: 0,
      reSubmitTokens: opts.maxReSubmits ?? 2,
      reSubmitCooldown: 0,
      analProbeReturnRound: 0,
      currency: 0,
      totalEarnedThisGame: 0,
      sessionId: crypto.randomUUID(),
      userId: opts.userId,
      username: opts.username,
      selectedEffectCardIds: [],
      health: opts.mode === 'battle-royale' ? 30 : 0,
      maxHealth: opts.mode === 'battle-royale' ? 30 : 0,
      shieldHp: 0,
      damageDealtThisGame: 0,
      eliminationsThisGame: 0,
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
      winningScore: opts.mode === 'quick-play' ? 7 : opts.mode === 'two-votes' ? 10 : 5,
      blankCardsEnabled: opts.blankCardsEnabled,
      startingCards: opts.startingCards,
      cardPacks: opts.cardPacks,
      buffsEnabled: opts.buffsEnabled,
      maxReSubmits: opts.maxReSubmits ?? 2,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      readyPlayerIds: [],
      shopCards: [],
      shopPurchasedBy: [],
      effectsUsedThisRound: [],
      eligibleForLeaderboard: false,
    };
    this.rooms.set(roomId, room);

    const { blackCards, whiteCards } = getCardsForPacks(opts.cardPacks, opts.buffsEnabled);
    this.decks.set(roomId, {
      whiteDeck: shuffleArray([...whiteCards]),
      blackDeck: shuffleArray([...blackCards]),
      whiteDiscard: [],
      blackDiscard: [],
      exodiaDropped: false,
      deprioritizedEffects: new Set(),
    });
    this.chats.set(roomId, []);
    this.customEmojis.set(roomId, []);
    console.log(`[RoomManager] Created room ${room.code} (${roomId}) packs=${opts.cardPacks.join(',')} blanks=${opts.blankCardsEnabled}`);
    return room;
  }

  joinRoom(code: string, playerName: string, socketId: string, userId?: string, username?: string): Room | null {
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
      effectCards: [],
      blankCardsRemaining: room.blankCardsEnabled ? 3 : 0,
      abductionRounds: 0,
      analProbeRounds: 0,
      doublePointsHandRounds: 0,
      cardQualityDownRounds: 0,
      reSubmitTokens: room.maxReSubmits,
      reSubmitCooldown: 0,
      analProbeReturnRound: 0,
      currency: 0,
      totalEarnedThisGame: 0,
      sessionId: crypto.randomUUID(),
      userId,
      username,
      selectedEffectCardIds: [],
      health: room.mode === 'battle-royale' ? room.players[0]?.maxHealth || 30 : 0,
      maxHealth: room.mode === 'battle-royale' ? room.players[0]?.maxHealth || 30 : 0,
      shieldHp: 0,
      damageDealtThisGame: 0,
      eliminationsThisGame: 0,
    };
    room.players.push(player);
    room.updatedAt = Date.now();
    console.log(`[RoomManager] Player ${player.name} joined room ${room.code}`);
    return room;
  }

  async startGame(roomId: string, playerId: string): Promise<void> {
    const room = this.rooms.get(roomId);
    if (!room || room.players.length < 3) return;
    const player = room.players.find((p) => p.id === playerId);
    if (!player?.isHost) return;
    room.phase = 'dealing';
    room.round = 1;
    room.readyPlayerIds = [];
    room.shopCards = [];
    room.shopPurchasedBy = [];
    room.effectsUsedThisRound = [];
    room.eligibleForLeaderboard = room.players.length >= 3;
    // Reset per-game counters, buffs, and currency
    for (const p of room.players) {
      p.cards = [];
      p.effectCards = [];
      p.blankCardsRemaining = room.blankCardsEnabled ? 3 : 0;
      p.abductionRounds = 0;
      p.analProbeRounds = 0;
      p.doublePointsHandRounds = 0;
      p.cardQualityDownRounds = 0;
      p.forcedRandomCardId = undefined;
      p.reSubmitTokens = room.maxReSubmits;
      p.reSubmitCooldown = 0;
      p.analProbeReturnRound = 0;
      p.currency = 0;
      p.totalEarnedThisGame = 0;
      if (room.mode === 'battle-royale') {
        p.health = p.maxHealth || 30;
        p.shieldHp = 0;
        p.damageDealtThisGame = 0;
        p.eliminationsThisGame = 0;
      }
    }
    // Grant selected effect cards from user inventory (max 2)
    for (const p of room.players) {
      if (p.userId && p.selectedEffectCardIds.length > 0) {
        const user = await getUserById(p.userId);
        if (user) {
          for (const cardId of p.selectedEffectCardIds.slice(0, 2)) {
            const template = EFFECT_CARDS.find((c) => c.id === cardId);
            if (template) {
              p.effectCards.push({ ...template, id: crypto.randomUUID() });
            }
          }
        }
      }
    }

    const deck = this.decks.get(roomId);
    if (deck) {
      deck.exodiaDropped = false;
    }

    this.dealCards(room);
    this.startRound(room);
  }

  private drawCardForPlayer(room: Room, player: Player): void {
    const deck = this.decks.get(room.id);
    if (!deck) return;
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
    if (!template) return;
    const card: Card = { ...template, id: crypto.randomUUID() };
    // Strip any lingering hidden modifier from previous rounds
    delete card.hiddenModifier;
    if (card.effect) {
      // Effect cards no longer drop randomly — discard and draw a replacement
      deck.whiteDiscard.push(card);
      this.drawCardForPlayer(room, player);
      return;
    }
    player.cards.push(card);
    // Battle Royale: 15% chance to assign a hidden combat modifier
    if (room.mode === 'battle-royale' && Math.random() < 0.15) {
      card.hiddenModifier = this.rollHiddenModifier();
    }
  }

  private rollHiddenModifier(): import('../shared/types.js').CardEffect {
    const roll = Math.random();
    const common: import('../shared/types.js').CardEffectType[] = ['light_strike', 'heavy_blow', 'cleave', 'block', 'shield_up'];
    const utility: import('../shared/types.js').CardEffectType[] = ['draw_extra', 'force_discard', 'steal_card', 'evade', 'cleanse'];
    const rare: import('../shared/types.js').CardEffectType[] = ['execute', 'double_damage', 'reflect', 'second_wind', 'bonus_vote'];
    let type: import('../shared/types.js').CardEffectType;
    if (roll < 0.60) {
      type = common[Math.floor(Math.random() * common.length)];
    } else if (roll < 0.85) {
      type = utility[Math.floor(Math.random() * utility.length)];
    } else {
      type = rare[Math.floor(Math.random() * rare.length)];
    }
    return { type };
  }

  private dealCards(room: Room, previousSubmissions?: { playerId: string; cards: Card[] }[]): void {
    for (const player of room.players) {
      // Abducted or eliminated players get no cards
      if (player.abductionRounds > 0) continue;
      if (room.mode === 'battle-royale' && player.health <= 0) continue;

      const target = room.startingCards + (player.analProbeRounds > 0 ? 3 : 0);
      const qualityAdjustedTarget = player.cardQualityDownRounds > 0 ? Math.max(1, Math.floor(target / 2)) : target;

      const prevSub = previousSubmissions?.find((s) => s.playerId === player.id);
      const cardsPlayed = prevSub ? prevSub.cards.filter((c) => !c.isBlank).length : 0;

      // Draw back what was played, or fill up to target on first round / after effects
      const missing = Math.max(0, qualityAdjustedTarget - player.cards.length);
      const toDraw = Math.max(cardsPlayed, missing);

      for (let i = 0; i < toDraw; i++) {
        this.drawCardForPlayer(room, player);
      }
    }
  }

  private startRound(room: Room): void {
    const deck = this.decks.get(room.id);
    if (!deck) return;

    room.firstWinnerSubmissionId = undefined;
    const previousSubmissions = [...room.submittedCards];

    // Discard previous round cards
    if (room.blackCard) {
      deck.blackDiscard.push(room.blackCard);
    }
    for (const sub of room.submittedCards) {
      for (const card of sub.cards) {
        deck.whiteDiscard.push(card);
      }
      if (sub.effectCard) {
        deck.whiteDiscard.push(sub.effectCard);
      }
    }
    room.submittedCards = [];

    // Tick down persistent round counters
    for (const p of room.players) {
      if (p.abductionRounds > 0) {
        p.abductionRounds -= 1;
        if (p.abductionRounds === 0) {
          p.analProbeRounds = 2;
          p.analProbeReturnRound = room.round;
          this.io.to(room.id).emit('notification', `${p.name} returned from abduction with an anal probe! +3 cards for 2 rounds.`);
        }
      }
      if (p.analProbeRounds > 0) p.analProbeRounds -= 1;
      if (p.doublePointsHandRounds > 0) p.doublePointsHandRounds -= 1;
      if (p.cardQualityDownRounds > 0) p.cardQualityDownRounds -= 1;
      if (p.reSubmitCooldown > 0) p.reSubmitCooldown -= 1;
      p.forcedRandomCardId = undefined;

      // Anal probe penalty: after 10 rounds from return, lose 6 random cards
      if (p.analProbeReturnRound > 0 && room.round >= p.analProbeReturnRound + 10) {
        const discardCount = Math.min(6, p.cards.length);
        for (let i = 0; i < discardCount; i++) {
          const idx = Math.floor(Math.random() * p.cards.length);
          const discarded = p.cards.splice(idx, 1)[0];
          deck.whiteDiscard.push(discarded);
        }
        if (discardCount > 0) {
          this.io.to(room.id).emit('notification', `${p.name}'s anal probe wore off! Lost ${discardCount} cards.`);
          this.io.to(p.socketId).emit('hand-changed', `Anal probe expired. ${discardCount} random cards were discarded from your hand.`);
        }
        p.analProbeReturnRound = 0;
      }
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
    this.dealCards(room, previousSubmissions);

    // Judge rotation — skip abducted, disconnected, and eliminated players
    if (room.mode === 'battle-royale') {
      room.judgeId = undefined;
      room.phase = 'playing';
      this.broadcastState(room);
      this.io.to(room.id).emit('round-start', room.blackCard, '');
      return;
    }
    let attempts = 0;
    let judgeIndex = (room.round - 1) % room.players.length;
    while (
      (room.players[judgeIndex]?.abductionRounds > 0 || !room.players[judgeIndex]?.isConnected || (room.mode === 'battle-royale' && room.players[judgeIndex]?.health <= 0)) &&
      attempts < room.players.length
    ) {
      judgeIndex = (judgeIndex + 1) % room.players.length;
      attempts++;
    }
    room.judgeId = room.players[judgeIndex]?.id;
    room.phase = 'playing';

    this.broadcastState(room);
    this.io.to(room.id).emit('round-start', room.blackCard, room.judgeId);
  }

  playCard(roomId: string, playerId: string, cards: CardPlay[], effectCardId?: string | null): boolean {
    const room = this.rooms.get(roomId);
    if (!room) { console.log('[RoomManager] playCard: room not found', roomId); return false; }
    if (room.phase !== 'playing') {
      console.log('[RoomManager] playCard: phase is', room.phase);
      const p = room.players.find((pl) => pl.id === playerId);
      if (p) this.io.to(p.socketId).emit('error', `Cannot play right now — game phase is ${room.phase}.`);
      return false;
    }
    if (room.mode !== 'battle-royale' && playerId === room.judgeId) {
      console.log('[RoomManager] playCard: player is judge');
      const p = room.players.find((pl) => pl.id === playerId);
      if (p) this.io.to(p.socketId).emit('error', 'You are the judge — you cannot play a card this round!');
      return false;
    }

    const player = room.players.find((p) => p.id === playerId);
    if (!player) { console.log('[RoomManager] playCard: player not found', playerId, 'in', room.players.map((p) => p.id)); return false; }

    // Abducted or eliminated players cannot play
    if (player.abductionRounds > 0) {
      this.io.to(player.socketId).emit('error', 'You are abducted and cannot play this round!');
      return false;
    }
    if (room.mode === 'battle-royale' && player.health <= 0) {
      this.io.to(player.socketId).emit('error', 'You have been eliminated!');
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
        const expectedSubmissions = room.mode === 'battle-royale'
          ? room.players.filter((p) => p.abductionRounds === 0 && !(p.health <= 0)).length
          : room.players.filter((p) => p.id !== room.judgeId && p.abductionRounds === 0 && !(room.mode === 'battle-royale' && p.health <= 0)).length;
        const uniqueSubmitters = new Set(room.submittedCards.map((s) => s.playerId)).size;
        if (uniqueSubmitters >= expectedSubmissions) {
          if (room.mode === 'battle-royale') {
            room.phase = 'voting';
            for (const sub of room.submittedCards) {
              if (!sub.votes) sub.votes = [];
            }
            this.io.to(room.id).emit('voting-started', room.submittedCards.map((s) => ({
              submissionId: s.submissionId,
              playerId: s.playerId,
              playerName: room.players.find((p) => p.id === s.playerId)?.name || 'Unknown',
              cards: s.cards,
              effectCard: s.effectCard,
            })));
          } else {
            room.phase = 'judging';
          }
        }
        this.broadcastState(room);
        return true;
      }
    }

    const pickCount = room.blackCard?.pickCount || 1;
    const effectivePickCount = (player.doublePointsHandRounds > 0 && pickCount === 1) ? 1 : pickCount;
    if (cards.length !== effectivePickCount) {
      console.log('[RoomManager] playCard: card count mismatch', cards.length, '!=', effectivePickCount, 'pickCount=', pickCount, 'doubleRounds=', player.doublePointsHandRounds);
      this.io.to(player.socketId).emit('error', `Wrong number of cards — pick ${effectivePickCount}, you selected ${cards.length}.`);
      return false;
    }

    const playedCards: Card[] = [];
    for (const play of cards) {
      if (play.cardId === '__blank__') {
        if (player.blankCardsRemaining <= 0) {
          this.io.to(player.socketId).emit('error', 'No blank cards remaining!');
          return false;
        }
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
      if (cardIndex === -1) {
        this.io.to(player.socketId).emit('error', 'Card not found in your hand — it may have already been played or discarded.');
        return false;
      }
      const card = player.cards[cardIndex];
      playedCards.push(card);
      player.cards.splice(cardIndex, 1);
    }

    // Resolve optional effect card played alongside the answer
    let playedEffectCard: Card | undefined;
    if (effectCardId) {
      const efIdx = player.effectCards.findIndex((c) => c.id === effectCardId);
      if (efIdx !== -1) {
        playedEffectCard = player.effectCards[efIdx];
        player.effectCards.splice(efIdx, 1);

        // Broadcast that an effect card was played
        this.io.to(room.id).emit('effect-played', player.name, playedEffectCard.effect.type);
        room.effectsUsedThisRound.push({ playerName: player.name, effectType: playedEffectCard.effect.type });

        // Process on-play effect card effects immediately
        if (playedEffectCard.effect) {
          switch (playedEffectCard.effect.type) {
            case 'exodia': {
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
                this.io.to(target.socketId).emit('hand-changed', `${player.name} stole a card from your hand!`);
                this.io.to(player.socketId).emit('hand-changed', `You stole a card from ${target.name}!`);
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
                this.io.to(target.socketId).emit('hand-changed', `${player.name} swapped their entire hand with yours!`);
                this.io.to(player.socketId).emit('hand-changed', `You swapped hands with ${target.name}!`);
              }
              break;
            }
            case 'customize_card': {
              if (player.cards.length > 0) {
                this.io.to(room.id).emit('notification', `${player.name} is customizing a card...`);
                this.io.to(player.socketId).emit('customize-prompt');
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
              this.io.to(player.socketId).emit('hand-changed', `Half Hand Discard: ${discardCount} cards were discarded!`);
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
                  this.io.to(target.socketId).emit('hand-changed', `You are forced to submit a random card this round!`);
                }
              }
              break;
            }
            case 'abduction': {
              player.abductionRounds = 2;
              this.io.to(room.id).emit('notification', `${player.name} was abducted! They will miss the next 2 rounds.`);
              this.io.to(player.socketId).emit('hand-changed', `You were abducted! You cannot play for 2 rounds.`);
              break;
            }
            case 'double_points_hand': {
              player.doublePointsHandRounds = 1;
              this.io.to(room.id).emit('notification', `${player.name}'s hand cards are worth double points this round!`);
              this.io.to(player.socketId).emit('hand-changed', `Double Points Hand active — all your cards are worth 2x this round!`);
              break;
            }
            case 'card_quality_down': {
              const others = room.players.filter((p) => p.id !== playerId);
              if (others.length > 0) {
                const target = others[Math.floor(Math.random() * others.length)];
                target.cardQualityDownRounds = 1;
                this.io.to(room.id).emit('notification', `${target.name} draws half cards next round!`);
                this.io.to(target.socketId).emit('hand-changed', `Card Quality Down! You will draw fewer cards next round.`);
              }
              break;
            }
            case 'double_points_win': {
              this.io.to(room.id).emit('notification', `${player.name} played a Double Points card!`);
              this.io.to(player.socketId).emit('hand-changed', `Double Points Win active — if you win this round, you get +2 points!`);
              break;
            }
            case 'point_drain': {
              this.io.to(room.id).emit('notification', `${player.name} played a Point Drain card!`);
              this.io.to(player.socketId).emit('hand-changed', `Point Drain attached — if you win this round, you lose 1 point.`);
              break;
            }
          }
        }
      }
    }

    room.submittedCards.push({ playerId, cards: playedCards, effectCard: playedEffectCard, submissionId: crypto.randomUUID(), isReSubmit: false });
    this.io.to(room.id).emit('card-played', playerId);

    // Check if everyone except judge has played (count unique submitters, skip abducted and eliminated)
    const expectedSubmissions = room.mode === 'battle-royale'
      ? room.players.filter((p) => p.abductionRounds === 0 && !(p.health <= 0)).length
      : room.players.filter((p) => p.id !== room.judgeId && p.abductionRounds === 0 && !(room.mode === 'battle-royale' && p.health <= 0)).length;
    const uniqueSubmitters = new Set(room.submittedCards.map((s) => s.playerId)).size;
    if (uniqueSubmitters >= expectedSubmissions) {
      if (room.mode === 'battle-royale') {
        room.phase = 'voting';
        // Initialize votes array on each submission
        for (const sub of room.submittedCards) {
          if (!sub.votes) sub.votes = [];
        }
        // Emit voting-started with sanitized submissions (no playerId exposure yet)
        this.io.to(room.id).emit('voting-started', room.submittedCards.map((s) => ({
          submissionId: s.submissionId,
          playerId: s.playerId,
          playerName: room.players.find((p) => p.id === s.playerId)?.name || 'Unknown',
          cards: s.cards,
          effectCard: s.effectCard,
        })));
      } else {
        room.phase = 'judging';
      }
      this.broadcastState(room);
    } else {
      this.broadcastState(room);
    }
    return true;
  }

  reSubmit(roomId: string, playerId: string, cards: CardPlay[], effectCardId?: string | null): boolean {
    const room = this.rooms.get(roomId);
    if (!room || room.phase !== 'playing') return false;
    if (playerId === room.judgeId) return false;

    const player = room.players.find((p) => p.id === playerId);
    if (!player) return false;
    if (player.abductionRounds > 0) return false;

    // Check if player has already submitted
    const existingSubIndex = room.submittedCards.findIndex((s) => s.playerId === playerId);
    if (existingSubIndex === -1) return false;

    // Check re-submit eligibility
    if (player.reSubmitTokens <= 0) {
      this.io.to(player.socketId).emit('error', 'No re-submit tokens remaining!');
      return false;
    }
    if (player.reSubmitCooldown > 0) {
      this.io.to(player.socketId).emit('error', `Re-submit on cooldown for ${player.reSubmitCooldown} more round(s).`);
      return false;
    }

    const pickCount = room.blackCard?.pickCount || 1;
    const effectivePickCount = (player.doublePointsHandRounds > 0 && pickCount === 1) ? 1 : pickCount;
    if (cards.length !== effectivePickCount) return false;

    // Discard old submission cards permanently
    const oldSub = room.submittedCards[existingSubIndex];
    const deck = this.decks.get(room.id);
    if (deck) {
      for (const card of oldSub.cards) deck.whiteDiscard.push(card);
      if (oldSub.effectCard) deck.whiteDiscard.push(oldSub.effectCard);
    }

    // Remove old submission
    room.submittedCards.splice(existingSubIndex, 1);

    // Play new cards (same logic as playCard)
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

    // Resolve optional effect card
    let playedEffectCard: Card | undefined;
    if (effectCardId) {
      const efIdx = player.effectCards.findIndex((c) => c.id === effectCardId);
      if (efIdx !== -1) {
        playedEffectCard = player.effectCards[efIdx];
        player.effectCards.splice(efIdx, 1);
        this.io.to(room.id).emit('effect-played', player.name, playedEffectCard.effect.type);
      }
    }

    // Add new submission with re-submit flag
    room.submittedCards.push({ playerId, cards: playedCards, effectCard: playedEffectCard, submissionId: crypto.randomUUID(), isReSubmit: true });

    // Deduct token and set cooldown
    player.reSubmitTokens -= 1;
    player.reSubmitCooldown = 3;

    this.io.to(room.id).emit('notification', `${player.name} re-submitted their answer!`);
    this.io.to(player.socketId).emit('hand-changed', `Re-submitted! ${player.reSubmitTokens} token(s) left. Cooldown: 3 rounds.`);

    this.broadcastState(room);
    return true;
  }

  judgePick(roomId: string, judgeId: string, submissionId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room || room.phase !== 'judging') return false;
    if (judgeId !== room.judgeId) return false;

    const winningSub = room.submittedCards.find((s) => s.submissionId === submissionId);
    if (!winningSub) return false;
    const winnerId = winningSub.playerId;
    const winner = room.players.find((p) => p.id === winnerId);
    if (!winner) return false;

    // Two-votes mode: first pick stores submission and waits for second pick
    if (room.mode === 'two-votes') {
      if (!room.firstWinnerSubmissionId) {
        room.firstWinnerSubmissionId = submissionId;
        this.io.to(room.id).emit('notification', `${winner.name} picked as first winner. Pick a second winner!`);
        this.broadcastState(room);
        return true;
      }
      if (room.firstWinnerSubmissionId === submissionId) {
        this.io.to(judgeId).emit('error', 'You cannot pick the same submission twice. Choose a different answer.');
        return false;
      }
      // Second pick: award both winners
      return this.resolveTwoVotes(room, room.firstWinnerSubmissionId, submissionId);
    }

    // Battle Royale mode: winner deals damage to all other living players
    if (room.mode === 'battle-royale') {
      return this.resolveCombatRound(room, winnerId, winningSub);
    }

    // Standard single-winner mode
    return this.resolveSingleWinner(room, winnerId, winningSub);
  }

  private resolveSingleWinner(room: Room, winnerId: string, winningSub: typeof room.submittedCards[0]): boolean {
    const winner = room.players.find((p) => p.id === winnerId);
    if (!winner) return false;

    let pointsAwarded = 1;
    let currencyAwarded = 1;

    if (winningSub.effectCard?.effect?.type === 'double_points_win') {
      pointsAwarded = 2;
      currencyAwarded = 2;
      this.io.to(room.id).emit('notification', `${winner.name} scored double points with a winning effect card! (+2)`);
    }
    if (winner.doublePointsHandRounds > 0) {
      pointsAwarded = 2;
      this.io.to(room.id).emit('notification', `${winner.name}'s hand bonus doubled the points! (+2)`);
    }

    winner.score += pointsAwarded;
    winner.currency += currencyAwarded;
    winner.totalEarnedThisGame += currencyAwarded;
    room.phase = 'reveal';

    if (winningSub.effectCard?.effect?.type === 'point_drain') {
      winner.score -= 1;
      this.io.to(room.id).emit('notification', `${winner.name} was drained by a debuff card! (-1 point)`);
    }

    const winningCards = winningSub.cards || room.submittedCards[0].cards;
    this.io.to(room.id).emit('judge-picked', winnerId, winningCards);

    if (winner.score >= room.winningScore) {
      this.endGame(room, winnerId);
    } else {
      this.startRoundEnd(room);
    }

    this.broadcastState(room);
    return true;
  }

  private resolveTwoVotes(room: Room, firstSubmissionId: string, secondSubmissionId: string): boolean {
    const firstSub = room.submittedCards.find((s) => s.submissionId === firstSubmissionId);
    const secondSub = room.submittedCards.find((s) => s.submissionId === secondSubmissionId);
    if (!firstSub || !secondSub) return false;

    const firstWinner = room.players.find((p) => p.id === firstSub.playerId);
    const secondWinner = room.players.find((p) => p.id === secondSub.playerId);
    if (!firstWinner || !secondWinner) return false;

    // Award points and currency to first winner
    let firstPoints = 1;
    let firstCurrency = 1;
    if (firstSub.effectCard?.effect?.type === 'double_points_win') { firstPoints = 2; firstCurrency = 2; }
    if (firstWinner.doublePointsHandRounds > 0) firstPoints = 2;
    firstWinner.score += firstPoints;
    firstWinner.currency += firstCurrency;
    firstWinner.totalEarnedThisGame += firstCurrency;
    if (firstSub.effectCard?.effect?.type === 'point_drain') {
      firstWinner.score -= 1;
      this.io.to(room.id).emit('notification', `${firstWinner.name} was drained by a debuff card! (-1 point)`);
    }

    // Award points and currency to second winner
    let secondPoints = 1;
    let secondCurrency = 1;
    if (secondSub.effectCard?.effect?.type === 'double_points_win') { secondPoints = 2; secondCurrency = 2; }
    if (secondWinner.doublePointsHandRounds > 0) secondPoints = 2;
    secondWinner.score += secondPoints;
    secondWinner.currency += secondCurrency;
    secondWinner.totalEarnedThisGame += secondCurrency;
    if (secondSub.effectCard?.effect?.type === 'point_drain') {
      secondWinner.score -= 1;
      this.io.to(room.id).emit('notification', `${secondWinner.name} was drained by a debuff card! (-1 point)`);
    }

    room.phase = 'reveal';
    room.firstWinnerSubmissionId = undefined;

    this.io.to(room.id).emit('judge-picked', firstSub.playerId, firstSub.cards);
    this.io.to(room.id).emit('judge-picked', secondSub.playerId, secondSub.cards);
    this.io.to(room.id).emit('notification', `${firstWinner.name} and ${secondWinner.name} both win the round! (+${firstPoints} / +${secondPoints})`);

    // Check win conditions — highest scorer wins
    const topScorer = room.players.reduce((a, b) => (a.score > b.score ? a : b));
    if (topScorer.score >= room.winningScore) {
      this.endGame(room, topScorer.id);
    } else {
      this.startRoundEnd(room);
    }

    this.broadcastState(room);
    return true;
  }

  private resolveCombatRound(room: Room, winnerId: string, winningSub: typeof room.submittedCards[0]): boolean {
    const winner = room.players.find((p) => p.id === winnerId);
    if (!winner) return false;

    const damageLog: string[] = [];
    let baseDamage = 3;
    let bonusDamageAll = 0;
    let bonusDamageSingle = 0;
    let singleTargetDealt = false;
    let winnerHeal = 0;
    let winnerShield = 0;
    let winnerDraw = 0;
    let executeTargetId: string | undefined;
    let forceDiscardTargetId: string | undefined;

    // Reveal hidden modifier on the winning submission
    const modifierCard = winningSub.cards.find((c) => c.hiddenModifier);
    const mod = modifierCard?.hiddenModifier;
    if (mod) {
      const modName = mod.type.replace(/_/g, ' ');
      this.io.to(room.id).emit('notification', `Hidden modifier revealed: ${modName.toUpperCase()}!`);
      damageLog.push(`Hidden modifier: ${modName.toUpperCase()}`);

      switch (mod.type) {
        case 'light_strike': bonusDamageSingle += 1; break;
        case 'heavy_blow': bonusDamageSingle += 3; break;
        case 'cleave': bonusDamageAll += 2; break;
        case 'execute': {
          const victims = room.players.filter((p) => p.id !== winnerId && p.health > 0 && p.health <= 10);
          if (victims.length > 0) {
            executeTargetId = victims[Math.floor(Math.random() * victims.length)].id;
          }
          break;
        }
        case 'block': winnerShield += 3; break;
        case 'shield_up': winnerShield += 5; break;
        case 'evade': winnerHeal += 2; break;
        case 'draw_extra': winnerDraw += 2; break;
        case 'force_discard': {
          const targets = room.players.filter((p) => p.id !== winnerId && p.health > 0 && p.cards.length > 0);
          if (targets.length > 0) forceDiscardTargetId = targets[Math.floor(Math.random() * targets.length)].id;
          break;
        }
        case 'cleanse': winnerHeal += 3; break;
        case 'double_damage': baseDamage *= 2; break;
        case 'reflect': winnerHeal += room.players.filter((p) => p.id !== winnerId && p.health > 0).length; break;
        case 'second_wind': winnerDraw += 3; break;
        case 'bonus_vote': bonusDamageAll += room.submittedCards.filter((s) => s.playerId !== winnerId).length; break;
        case 'steal_card': {
          const targets = room.players.filter((p) => p.id !== winnerId && p.health > 0 && p.cards.length > 0);
          if (targets.length > 0) {
            const target = targets[Math.floor(Math.random() * targets.length)];
            const deck = this.decks.get(room.id);
            if (deck && target.cards.length > 0) {
              const idx = Math.floor(Math.random() * target.cards.length);
              const stolen = target.cards.splice(idx, 1)[0];
              winner.cards.push(stolen);
              damageLog.push(`${winner.name} stole a card from ${target.name}!`);
              this.io.to(target.socketId).emit('hand-changed', `${winner.name} stole a card from your hand!`);
              this.io.to(winner.socketId).emit('hand-changed', `You stole a card from ${target.name}!`);
            }
          }
          break;
        }
      }
    }

    // Apply execute before normal damage
    if (executeTargetId) {
      const victim = room.players.find((p) => p.id === executeTargetId);
      if (victim && victim.health > 0) {
        victim.health = 0;
        this.io.to(room.id).emit('player-eliminated', victim.id, victim.name);
        damageLog.push(`${victim.name} was EXECUTED!`);
      }
    }

    // Apply winner shield / heal / draw immediately
    if (winnerShield > 0) {
      winner.shieldHp += winnerShield;
      damageLog.push(`${winner.name} gained +${winnerShield} shield!`);
    }
    if (winnerHeal > 0) {
      winner.health = Math.min(winner.maxHealth || 30, winner.health + winnerHeal);
      damageLog.push(`${winner.name} healed +${winnerHeal} HP!`);
    }
    if (winnerDraw > 0) {
      for (let i = 0; i < winnerDraw; i++) {
        this.drawCardForPlayer(room, winner);
      }
      damageLog.push(`${winner.name} drew ${winnerDraw} card(s)!`);
    }
    if (forceDiscardTargetId) {
      const target = room.players.find((p) => p.id === forceDiscardTargetId);
      const deck = this.decks.get(room.id);
      if (target && target.cards.length > 0 && deck) {
        const idx = Math.floor(Math.random() * target.cards.length);
        const discarded = target.cards.splice(idx, 1)[0];
        deck.whiteDiscard.push(discarded);
        damageLog.push(`${target.name} was forced to discard a card!`);
        this.io.to(target.socketId).emit('hand-changed', `A hidden modifier forced you to discard a card!`);
      }
    }

    // Deal damage to all living opponents
    let totalDamageDealt = 0;
    for (const p of room.players) {
      if (p.id === winnerId) continue;
      if (p.health <= 0) continue; // already eliminated

      let dmg = baseDamage + bonusDamageAll;
      // Single-target bonus applies to the first eligible opponent
      if (bonusDamageSingle > 0 && !singleTargetDealt) {
        singleTargetDealt = true;
        dmg += bonusDamageSingle;
      }

      // Apply shield first
      if (p.shieldHp > 0) {
        const absorbed = Math.min(p.shieldHp, dmg);
        p.shieldHp -= absorbed;
        dmg -= absorbed;
        if (absorbed > 0) damageLog.push(`${p.name}'s shield absorbed ${absorbed} damage.`);
      }
      if (dmg > 0) {
        p.health -= dmg;
        totalDamageDealt += dmg;
        damageLog.push(`${winner.name} dealt ${dmg} damage to ${p.name}!`);
      }
      if (p.health <= 0) {
        p.health = 0;
        winner.eliminationsThisGame += 1;
        this.io.to(room.id).emit('player-eliminated', p.id, p.name);
        damageLog.push(`${p.name} has been eliminated!`);
      }
    }
    winner.damageDealtThisGame += totalDamageDealt;

    winner.score += 1; // still track score for leaderboard compatibility
    room.phase = 'reveal';

    const winningCards = winningSub.cards || room.submittedCards[0].cards;
    this.io.to(room.id).emit('judge-picked', winnerId, winningCards);
    this.io.to(room.id).emit('notification', `${winner.name} wins the round and attacks everyone!`);

    const healths: Record<string, number> = {};
    const shields: Record<string, number> = {};
    for (const p of room.players) {
      healths[p.id] = p.health;
      shields[p.id] = p.shieldHp;
    }
    this.io.to(room.id).emit('combat-update', healths, shields, damageLog);

    const aliveCount = room.players.filter((p) => p.health > 0).length;
    if (aliveCount <= 1) {
      const survivor = room.players.find((p) => p.health > 0) || winner;
      this.endGame(room, survivor.id);
    } else if (room.round >= room.maxRounds) {
      const survivor = room.players.reduce((a, b) => (a.health > b.health ? a : b));
      this.endGame(room, survivor.id);
    } else {
      this.startRoundEnd(room);
    }

    this.broadcastState(room);
    return true;
  }

  castVote(roomId: string, playerId: string, submissionId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room || room.phase !== 'voting') return false;
    const player = room.players.find((p) => p.id === playerId);
    if (!player || player.health <= 0) return false;
    const submission = room.submittedCards.find((s) => s.submissionId === submissionId);
    if (!submission) return false;
    // Can't vote for yourself
    if (submission.playerId === playerId) return false;
    // Initialize votes array if needed
    if (!submission.votes) submission.votes = [];
    // Prevent double voting
    if (submission.votes.includes(playerId)) return false;
    // Also prevent voting for multiple submissions (one vote per player)
    for (const sub of room.submittedCards) {
      if (!sub.votes) sub.votes = [];
      if (sub.votes.includes(playerId)) return false;
    }
    submission.votes.push(playerId);
    this.io.to(room.id).emit('vote-cast', submissionId, playerId, submission.votes.length);
    // Check if all eligible voters have voted
    const eligibleVoters = room.players.filter((p) => p.id !== submission.playerId && p.health > 0).length;
    const totalVotesCast = room.submittedCards.reduce((sum, s) => sum + (s.votes?.length || 0), 0);
    if (totalVotesCast >= eligibleVoters) {
      this.resolveVoteRound(room);
    }
    return true;
  }

  private resolveVoteRound(room: Room): boolean {
    // Find submission with most votes
    let winnerSub = room.submittedCards[0];
    let maxVotes = 0;
    for (const sub of room.submittedCards) {
      const voteCount = sub.votes?.length || 0;
      if (voteCount > maxVotes) {
        maxVotes = voteCount;
        winnerSub = sub;
      }
    }
    // Build vote counts for client
    const voteCounts: Record<string, number> = {};
    for (const sub of room.submittedCards) {
      voteCounts[sub.submissionId] = sub.votes?.length || 0;
    }
    this.io.to(room.id).emit('vote-phase-ended', winnerSub.submissionId, voteCounts);
    // Transition to reveal via combat resolution
    const winnerId = winnerSub.playerId;
    return this.resolveCombatRound(room, winnerId, winnerSub);
  }

  private startRoundEnd(room: Room): void {
    room.phase = 'round-end';
    room.readyPlayerIds = [];
    room.shopPurchasedBy = [];

    // Generate shop cards: 2 random non-exodia effects, avoiding deprioritized ones if possible
    this.generateShopCards(room);

    const scores: Record<string, number> = {};
    const currencyEarned: Record<string, number> = {};
    room.players.forEach((p) => {
      scores[p.name] = p.score;
      currencyEarned[p.name] = p.currency;
    });

    this.io.to(room.id).emit('round-summary', {
      scores,
      effectsUsed: room.effectsUsedThisRound,
      currencyEarned,
    });
    this.io.to(room.id).emit('round-end', scores);
    this.broadcastState(room);
  }

  private endGame(room: Room, winnerId: string): void {
    room.phase = 'game-over';
    const winner = room.players.find((p) => p.id === winnerId);
    const scores: Record<string, number> = {};
    room.players.forEach((p) => (scores[p.name] = p.score));
    this.io.to(room.id).emit('game-over', scores, winnerId);

    // Record leaderboard stats if eligible
    if (room.eligibleForLeaderboard) {
      const winner = room.players.find((p) => p.id === winnerId);
      const winnerUserId = winner?.userId;

      void (async () => {
        const nonDevPlayers = [];
        for (const p of room.players) {
          if (p.userId) {
            const user = await getUserById(p.userId);
            if (user?.role === 'dev') continue;
          }
          nonDevPlayers.push(p);
        }
        if (nonDevPlayers.length > 0) {
          recordGameResults(
            nonDevPlayers.map((p) => ({
              userId: p.userId,
              name: p.name,
              score: p.score,
              currency: p.currency,
              totalEarnedThisGame: p.totalEarnedThisGame,
            })),
            winnerUserId
          ).catch((err) => console.error('[Leaderboard] Failed to record:', err));
        }
      })();

      // Also update user account stats for logged-in players (skip devs)
      for (const p of room.players) {
        if (p.userId) {
          void (async () => {
            const user = await getUserById(p.userId);
            if (user?.role === 'dev') return;
            const winCount = p.id === winnerId ? 1 : 0;
            const earned = p.currency;
            recordUserStats(p.userId, winCount, earned).catch(() => {});
            if (p.currency > 0) {
              const converted = Math.round(p.currency * 0.25 * 100) / 100;
              updateUserBalance(p.userId, converted).catch(() => {});
            }
            const { addRecentGame } = await import('./userDb.js');
            addRecentGame(p.userId, {
              roomCode: room.code,
              mode: room.mode,
              score: p.score,
              date: Date.now(),
              won: p.id === winnerId,
            }).catch(() => {});

            // Battle Royale XP
            if (room.mode === 'battle-royale') {
              const baseXP = 10;
              const roundXP = room.round * 3;
              const dmgXP = p.damageDealtThisGame * 2;
              const elimXP = p.eliminationsThisGame * 15;
              const winXP = p.id === winnerId ? 25 : 0;
              const totalXP = baseXP + roundXP + dmgXP + elimXP + winXP;
              const result = await addBattleRoyaleXP(p.userId, totalXP);
              if (result.newPerks.length > 0) {
                this.io.to(p.socketId).emit('battle-royale-xp', totalXP, result.totalXP, result.newPerks);
              } else {
                this.io.to(p.socketId).emit('battle-royale-xp', totalXP, result.totalXP, []);
              }
            }
          })();
        }
      }
    }

    this.broadcastState(room);
  }

  private generateShopCards(room: Room): void {
    const deck = this.decks.get(room.id);
    const deprioritized = deck?.deprioritizedEffects || new Set<string>();
    // Prefer effects not in deprioritized set
    let pool = EFFECT_CARDS.filter((c) => c.effect?.type !== 'exodia' && !deprioritized.has(c.id));
    if (pool.length < 2) {
      // Fallback: include deprioritized ones too
      pool = EFFECT_CARDS.filter((c) => c.effect?.type !== 'exodia');
    }
    const shuffled = shuffleArray([...pool]);
    room.shopCards = shuffled.slice(0, 2).map((c) => ({ ...c, id: crypto.randomUUID() }));
    room.effectsUsedThisRound = [];
  }

  playerReady(roomId: string, playerId: string): void {
    const room = this.rooms.get(roomId);
    if (!room || room.phase !== 'round-end') return;
    if (!room.readyPlayerIds.includes(playerId)) {
      room.readyPlayerIds.push(playerId);
    }
    const activePlayers = room.mode === 'battle-royale'
      ? room.players.filter((p) => p.isConnected && p.health > 0)
      : room.players.filter((p) => p.isConnected);
    if (room.readyPlayerIds.length >= activePlayers.length) {
      room.readyPlayerIds = [];
      room.round += 1;
      if (room.round > room.maxRounds) {
        const winner = room.mode === 'battle-royale'
          ? room.players.reduce((a, b) => (a.health > b.health ? a : b))
          : room.players.reduce((a, b) => (a.score > b.score ? a : b));
        this.endGame(room, winner.id);
        return;
      }
      this.startRound(room);
    } else {
      this.broadcastState(room);
    }
  }

  buyShopCard(roomId: string, playerId: string, cardId: string): { success: boolean; remainingCurrency: number } {
    const room = this.rooms.get(roomId);
    if (!room || room.phase !== 'round-end') return { success: false, remainingCurrency: 0 };
    const player = room.players.find((p) => p.id === playerId);
    if (!player) return { success: false, remainingCurrency: 0 };
    if (room.shopPurchasedBy.includes(playerId)) return { success: false, remainingCurrency: player.currency };
    const cost = 5;
    if (player.currency < cost) return { success: false, remainingCurrency: player.currency };

    const cardIndex = room.shopCards.findIndex((c) => c.id === cardId);
    if (cardIndex === -1) return { success: false, remainingCurrency: player.currency };

    const boughtCard = room.shopCards[cardIndex];

    player.currency -= cost;
    player.totalEarnedThisGame -= cost; // spending reduces net earned but not tracked separately here
    player.effectCards.push({ ...boughtCard });
    room.shopPurchasedBy.push(playerId);
    // Remove bought card from shop so it can't be bought again
    room.shopCards.splice(cardIndex, 1);

    // Track lifetime spend
    recordSpend(player.userId, player.name, cost).catch((err) => console.error('[Leaderboard] Spend record failed:', err));

    this.io.to(player.socketId).emit('hand-changed', `You bought a shop card!`);
    this.broadcastState(room);
    return { success: true, remainingCurrency: player.currency };
  }

  setPlayerEffectCards(roomId: string, playerId: string, cardIds: string[]): boolean {
    const room = this.rooms.get(roomId);
    if (!room || room.phase !== 'lobby') return false;
    const player = room.players.find((p) => p.id === playerId);
    if (!player) return false;
    player.selectedEffectCardIds = cardIds.slice(0, 2);
    return true;
  }

  forceNextRound(roomId: string, playerId: string): void {
    const room = this.rooms.get(roomId);
    if (!room || room.phase !== 'round-end') return;
    const player = room.players.find((p) => p.id === playerId);
    if (!player?.isHost) return;
    room.readyPlayerIds = [];
    room.round += 1;
    if (room.round > room.maxRounds) {
      const winner = room.mode === 'battle-royale'
        ? room.players.reduce((a, b) => (a.health > b.health ? a : b))
        : room.players.reduce((a, b) => (a.score > b.score ? a : b));
      this.endGame(room, winner.id);
      return;
    }
    this.startRound(room);
  }

  rejoinPlayer(roomId: string, sessionId: string, newSocketId: string): { player: Player; room: Room } | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;
    const player = room.players.find((p) => p.sessionId === sessionId);
    if (!player) return null;
    player.socketId = newSocketId;
    player.isConnected = true;
    player.disconnectedAt = undefined;

    // Cancel disconnect timer
    const timerKey = `${roomId}:${player.id}`;
    const existing = this.disconnectTimers.get(timerKey);
    if (existing) {
      clearTimeout(existing);
      this.disconnectTimers.delete(timerKey);
    }

    this.sendStateToPlayer(room, player);
    this.broadcastState(room);
    this.io.to(room.id).emit('notification', `${player.name} rejoined the game.`);
    return { player, room };
  }

  async getLeaderboardsData(): Promise<{ wins: import('../shared/types.js').LeaderboardEntry[]; earned: import('../shared/types.js').LeaderboardEntry[]; spent: import('../shared/types.js').LeaderboardEntry[] }> {
    return getLeaderboards();
  }

  nextRound(roomId: string, playerId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;
    if (room.phase !== 'round-end' && room.phase !== 'game-over') return;
    const player = room.players.find((p) => p.id === playerId);
    if (!player?.isHost) return;

    if (room.phase === 'game-over') {
      this.resetToLobby(room);
      return;
    }

    room.round += 1;
    if (room.round > room.maxRounds) {
      const winner = room.mode === 'battle-royale'
        ? room.players.reduce((a, b) => (a.health > b.health ? a : b))
        : room.players.reduce((a, b) => (a.score > b.score ? a : b));
      this.endGame(room, winner.id);
      return;
    }

    this.startRound(room);
  }

  private resetToLobby(room: Room): void {
    room.phase = 'lobby';
    room.round = 0;
    room.blackCard = undefined;
    room.judgeId = undefined;
    room.firstWinnerSubmissionId = undefined;
    room.submittedCards = [];
    room.readyPlayerIds = [];
    room.shopCards = [];
    room.shopPurchasedBy = [];
    room.effectsUsedThisRound = [];
    room.eligibleForLeaderboard = false;
    room.players.forEach((p) => {
      p.score = 0;
      p.cards = [];
      p.effectCards = [];
      p.submittedCardId = undefined;
      p.blankCardsRemaining = room.blankCardsEnabled ? 3 : 0;
      p.abductionRounds = 0;
      p.analProbeRounds = 0;
      p.doublePointsHandRounds = 0;
      p.cardQualityDownRounds = 0;
      p.forcedRandomCardId = undefined;
      p.analProbeReturnRound = 0;
      p.currency = 0;
      p.totalEarnedThisGame = 0;
      if (room.mode === 'battle-royale') {
        p.health = p.maxHealth || 30;
        p.shieldHp = 0;
        p.damageDealtThisGame = 0;
        p.eliminationsThisGame = 0;
      }
    });
    const deck = this.decks.get(room.id);
    if (deck) {
      const { blackCards, whiteCards } = getCardsForPacks(room.cardPacks, room.buffsEnabled);
      deck.whiteDeck = shuffleArray([...whiteCards]);
      deck.blackDeck = shuffleArray([...blackCards]);
      deck.whiteDiscard = [];
      deck.blackDiscard = [];
      deck.exodiaDropped = false;
      deck.deprioritizedEffects.clear();
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

    // Discard leaving player's hand (white + effect cards)
    if (deck) {
      for (const card of player.cards) deck.whiteDiscard.push(card);
      for (const card of player.effectCards) deck.whiteDiscard.push(card);
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
    const aliveCount = room.mode === 'battle-royale'
      ? room.players.filter((p) => p.health > 0).length
      : room.players.length;
    if (aliveCount < 3) {
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
      const expectedSubmissions = room.players.filter((p) => p.id !== room.judgeId && !(room.mode === 'battle-royale' && p.health <= 0)).length;
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
    const room = this.rooms.get(roomId);
    if (!room) return;
    const player = room.players.find((p) => p.id === playerId);
    if (!player) return;

    // Mark as disconnected
    player.isConnected = false;
    player.disconnectedAt = Date.now();
    this.broadcastState(room);
    this.io.to(room.id).emit('notification', `${player.name} disconnected. Rejoin window: 2 minutes.`);

    // Start grace timer
    const timerKey = `${roomId}:${playerId}`;
    const existing = this.disconnectTimers.get(timerKey);
    if (existing) clearTimeout(existing);

    // In who's-next mode, players are never auto-removed on disconnect
    if (room.mode === 'whos-next') return;
    // In battle-royale, eliminated players are spectators — never auto-remove
    if (room.mode === 'battle-royale' && player.health <= 0) return;

    const timer = setTimeout(() => {
      this.disconnectTimers.delete(timerKey);
      // Only remove if still disconnected
      const p = this.rooms.get(roomId)?.players.find((pl) => pl.id === playerId);
      if (p && !p.isConnected) {
        this.removePlayer(roomId, playerId);
      }
    }, 2 * 60 * 1000);
    this.disconnectTimers.set(timerKey, timer);
  }

  broadcastState(room: Room): void {
    room.players.forEach((player) => {
      this.sendStateToPlayer(room, player);
    });
  }

  sendStateToPlayer(room: Room, player: Player): void {
    const sanitizedPlayers = room.players.map((p) => ({
      ...p,
      cards: p.id === player.id ? p.cards : [],
      effectCards: p.id === player.id ? p.effectCards : [],
    }));

    // Sanitize submittedCards so players can't see each other's answers early
    let visibleSubmissions = room.submittedCards;
    if (room.phase === 'playing') {
      // Only show your own submission during playing phase
      visibleSubmissions = room.submittedCards.filter((s) => s.playerId === player.id);
    } else if (room.phase === 'judging') {
      // Only judge sees all submissions; others wait blind
      visibleSubmissions = player.id === room.judgeId ? room.submittedCards : [];
    }

    const state = {
      room: { ...room, players: sanitizedPlayers, submittedCards: visibleSubmissions },
      myPlayerId: player.id,
      hand: player.cards,
      effectHand: player.effectCards,
    };
    this.io.to(player.socketId).emit('game-state', state);
  }

  sendChat(roomId: string, playerId: string, text: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;
    const player = room.players.find((p) => p.id === playerId);
    if (!player) return;
    const trimmed = text.trim();
    if (!trimmed || trimmed.length > 500) return;
    const msg: ChatMessage = {
      id: crypto.randomUUID(),
      playerId,
      playerName: player.name,
      text: trimmed,
      timestamp: Date.now(),
    };
    const history = this.chats.get(roomId) || [];
    history.push(msg);
    // Keep last 200 messages
    if (history.length > 200) history.shift();
    this.chats.set(roomId, history);
    this.io.to(room.id).emit('chat-message', msg);
  }

  getChatHistory(roomId: string): ChatMessage[] {
    return this.chats.get(roomId) || [];
  }

  addCustomEmoji(roomId: string, emoji: CustomEmoji): boolean {
    const list = this.customEmojis.get(roomId) || [];
    if (list.length >= 50) return false;
    if (!emoji.imgUrl.startsWith('https://')) return false;
    if (!emoji.shortcodes.length) return false;
    list.push(emoji);
    this.customEmojis.set(roomId, list);
    this.io.to(roomId).emit('custom-emojis', list);
    return true;
  }

  removeCustomEmoji(roomId: string, emojiId: string): void {
    const list = this.customEmojis.get(roomId) || [];
    const filtered = list.filter((e) => e.id !== emojiId);
    this.customEmojis.set(roomId, filtered);
    this.io.to(roomId).emit('custom-emojis', filtered);
  }

  getCustomEmojis(roomId: string): CustomEmoji[] {
    return this.customEmojis.get(roomId) || [];
  }

  customizeCard(roomId: string, playerId: string, cardId: string, newText: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;
    const player = room.players.find((p) => p.id === playerId);
    if (!player) return false;
    const card = player.cards.find((c) => c.id === cardId);
    if (!card) return false;
    const trimmed = newText.trim();
    if (!trimmed || trimmed.length > 120) return false;
    card.text = trimmed;
    card.isBlank = true;
    this.io.to(player.socketId).emit('notification', 'Card customized!');
    this.io.to(player.socketId).emit('hand-changed', `Customize Card: your card now says "${trimmed}"`);
    this.broadcastState(room);
    return true;
  }

  updateSettings(roomId: string, hostId: string, settings: Partial<Omit<Room, 'id' | 'code' | 'players' | 'submittedCards' | 'blackCard' | 'judgeId' | 'createdAt' | 'updatedAt'>>): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;
    const host = room.players.find((p) => p.id === hostId);
    if (!host || !host.isHost) return false;

    // Prevent mid-game changes that would break active state
    const safePhase = room.phase === 'waiting' || room.phase === 'voting' || room.phase === 'ended';
    // Actually allow some safe changes during playing/judging too
    const allowedKeys: Array<keyof typeof settings> = [
      'mode', 'maxPlayers', 'maxRounds', 'winningScore', 'blankCardsEnabled',
      'startingCards', 'cardPacks', 'buffsEnabled', 'maxReSubmits',
    ];

    for (const key of allowedKeys) {
      if (settings[key] !== undefined) {
        // @ts-expect-error partial update
        room[key] = settings[key];
      }
    }

    // Clamp values
    room.maxPlayers = Math.min(12, Math.max(3, room.maxPlayers));
    room.maxRounds = Math.max(3, room.maxRounds);
    room.winningScore = Math.max(3, room.winningScore);
    room.startingCards = Math.min(20, Math.max(5, room.startingCards));
    room.maxReSubmits = Math.min(10, Math.max(0, room.maxReSubmits));

    // If card packs changed and deck exists, we won't rebuild deck mid-game
    // but we note it for next round. That behavior is fine.

    room.updatedAt = Date.now();
    this.io.to(room.id).emit('settings-updated', settings);
    this.broadcastState(room);
    return true;
  }

  startVoteKick(roomId: string, initiatorId: string, targetId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;
    if (initiatorId === targetId) return false;
    const target = room.players.find((p) => p.id === targetId);
    if (!target) return false;

    // Cancel any existing vote in this room
    const existing = this.activeVoteKicks.get(roomId);
    if (existing) {
      clearTimeout(existing.timeout);
      this.activeVoteKicks.delete(roomId);
    }

    // Eligible voters: all connected players except the target
    const eligibleVoters = room.players
      .filter((p) => p.id !== targetId && p.isConnected)
      .map((p) => p.id);

    if (eligibleVoters.length === 0) {
      this.io.to(room.id).emit('notification', `Vote kick failed: no eligible voters.`);
      return false;
    }

    const votes = new Map<string, boolean>();
    const timeout = setTimeout(() => {
      this.endVoteKick(roomId, false);
    }, 30000);

    this.activeVoteKicks.set(roomId, { targetId, votes, eligibleVoters, timeout });

    const initiator = room.players.find((p) => p.id === initiatorId);
    this.io.to(room.id).emit('vote-kick-started', targetId, target.name, initiator?.name || 'Someone', 30);
    this.io.to(room.id).emit('notification', `${initiator?.name || 'Someone'} started a vote to kick ${target.name}! Everyone must vote.`);
    return true;
  }

  castVoteKick(roomId: string, playerId: string, targetId: string, vote: boolean): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;
    const vk = this.activeVoteKicks.get(roomId);
    if (!vk || vk.targetId !== targetId) return false;
    if (!vk.eligibleVoters.includes(playerId)) return false;
    if (vk.votes.has(playerId)) return false;

    vk.votes.set(playerId, vote);

    const player = room.players.find((p) => p.id === playerId);
    if (!vote) {
      this.io.to(room.id).emit('notification', `${player?.name || 'Someone'} voted NO. Vote kick cancelled.`);
      this.endVoteKick(roomId, false);
      return true;
    }

    // Check if all eligible voters have voted yes
    const allVotedYes = vk.eligibleVoters.every((id) => vk.votes.get(id) === true);
    if (allVotedYes) {
      const target = room.players.find((p) => p.id === targetId);
      this.io.to(room.id).emit('notification', `Vote passed! ${target?.name || 'Player'} has been kicked.`);
      this.endVoteKick(roomId, true);
    }
    return true;
  }

  private endVoteKick(roomId: string, success: boolean): void {
    const vk = this.activeVoteKicks.get(roomId);
    if (!vk) return;
    clearTimeout(vk.timeout);
    this.activeVoteKicks.delete(roomId);

    const room = this.rooms.get(roomId);
    if (!room) return;
    const target = room.players.find((p) => p.id === vk.targetId);
    if (!target) return;

    this.io.to(roomId).emit('vote-kick-ended', vk.targetId, target.name, success);

    if (success) {
      this.removePlayer(roomId, vk.targetId);
    } else {
      this.io.to(roomId).emit('notification', `Vote kick against ${target.name} failed.`);
    }
  }

  // Vote to end the game (best of 3 / 2/3 majority)
  startVoteEnd(roomId: string, initiatorId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;
    if (room.phase === 'lobby' || room.phase === 'game-over') return false;
    const initiator = room.players.find((p) => p.id === initiatorId);
    if (!initiator) return false;

    // Cancel any existing vote in this room
    const existing = this.activeVoteEnds.get(roomId);
    if (existing) {
      clearTimeout(existing.timeout);
      this.activeVoteEnds.delete(roomId);
    }

    const eligibleVoters = room.players.filter((p) => p.isConnected).map((p) => p.id);
    if (eligibleVoters.length === 0) return false;

    const votes = new Map<string, boolean>();
    const timeout = setTimeout(() => {
      this.endVoteEnd(roomId, false);
    }, 30000);

    this.activeVoteEnds.set(roomId, { votes, eligibleVoters, timeout });
    this.io.to(room.id).emit('vote-end-started', initiator.name, 30);
    this.io.to(room.id).emit('notification', `${initiator.name} started a vote to end the game! 2/3 majority required.`);
    return true;
  }

  castVoteEnd(roomId: string, playerId: string, vote: boolean): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;
    const ve = this.activeVoteEnds.get(roomId);
    if (!ve) return false;
    if (!ve.eligibleVoters.includes(playerId)) return false;
    if (ve.votes.has(playerId)) return false;

    ve.votes.set(playerId, vote);
    const player = room.players.find((p) => p.id === playerId);

    if (!vote) {
      this.io.to(room.id).emit('notification', `${player?.name || 'Someone'} voted NO. Vote to end failed.`);
      this.endVoteEnd(roomId, false);
      return true;
    }

    const yesCount = Array.from(ve.votes.values()).filter((v) => v).length;
    const threshold = Math.ceil(ve.eligibleVoters.length * (2 / 3));
    if (yesCount >= threshold) {
      this.io.to(room.id).emit('notification', `Vote passed! The game will end.`);
      this.endVoteEnd(roomId, true);
    }
    return true;
  }

  private activeVoteEnds = new Map<string, { votes: Map<string, boolean>; eligibleVoters: string[]; timeout: ReturnType<typeof setTimeout> }>();

  private endVoteEnd(roomId: string, success: boolean): void {
    const ve = this.activeVoteEnds.get(roomId);
    if (!ve) return;
    clearTimeout(ve.timeout);
    this.activeVoteEnds.delete(roomId);

    const room = this.rooms.get(roomId);
    if (!room) return;

    this.io.to(roomId).emit('vote-end-ended', success);

    if (success) {
      // End game: find highest scorer
      const winner = room.players.reduce((a, b) => (a.score > b.score ? a : b));
      const scores: Record<string, number> = {};
      room.players.forEach((p) => (scores[p.name] = p.score));
      room.phase = 'game-over';
      this.io.to(room.id).emit('game-over', scores, winner.id);
      this.broadcastState(room);
    } else {
      this.io.to(roomId).emit('notification', `Vote to end the game failed.`);
    }
  }

  reportPlayer(roomId: string, reporterId: string, targetId: string, reason: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;
    const reporter = room.players.find((p) => p.id === reporterId);
    const target = room.players.find((p) => p.id === targetId);
    if (!reporter || !target) return;
    if (reporterId === targetId) {
      this.io.to(reporter.socketId).emit('report-ack', 'You cannot report yourself.');
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    const key = `${roomId}:${reporterId}:${targetId}`;
    const list = this.reports.get(key) || [];
    const alreadyToday = list.some((r) => r.date === today);
    if (alreadyToday) {
      this.io.to(reporter.socketId).emit('report-ack', `You have already reported ${target.name} today.`);
      return;
    }

    list.push({ reporterId, targetId, date: today });
    this.reports.set(key, list);

    console.log(`[REPORT] ${reporter.name} reported ${target.name}: ${reason}`);
    this.io.to(reporter.socketId).emit('report-ack', `Report submitted for ${target.name}. Reports are taken VERY SERIOUSLY — players using extreme slurs will be banned.`);
  }
}
