import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket.js';
import Card from './Card.js';
import ChatPanel from './ChatPanel.js';
import type { GameState, GamePhase, Player, Card as CardType, CardPlay, CardEffectType } from '../../shared/types.js';
import { ArrowLeft, Trophy, Clock, User, CheckCircle, Crown, Settings, PenLine, Zap, Eye, Ban, Shuffle, Plus, Minus, RefreshCw, Flag, UserPlus, Skull, Shield } from 'lucide-react';
import { playClick, playSubmit, playChime, playWin, playError, playJoin } from '../audio/sound.js';
import { getActiveGames, removeActiveGame } from '../utils/activeGames.js';
import { EFFECT_CARDS as ALL_EFFECT_CARDS } from '../../shared/deck.js';

export default function GameBoard() {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const { emit, on, connected } = useSocket();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [phase, setPhase] = useState<GamePhase>('lobby');
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const [selectedEffectCardId, setSelectedEffectCardId] = useState<string | null>(null);
  const [winnerId, setWinnerId] = useState<string | null>(null);
  const [secondWinnerId, setSecondWinnerId] = useState<string | null>(null);
  const [winningCards, setWinningCards] = useState<CardType[]>([]);
  const [finalScores, setFinalScores] = useState<Record<string, number> | null>(null);
  const [notification, setNotification] = useState('');
  const [handChange, setHandChange] = useState('');
  const [blankModalOpen, setBlankModalOpen] = useState(false);
  const [blankText, setBlankText] = useState('');
  const [blankSelections, setBlankSelections] = useState<string[]>([]);
  const [customizeModalOpen, setCustomizeModalOpen] = useState(false);
  const [customizeCardId, setCustomizeCardId] = useState<string | null>(null);
  const [customizeText, setCustomizeText] = useState('');
  const [reSubmitMode, setReSubmitMode] = useState(false);
  const [hostSettingsOpen, setHostSettingsOpen] = useState(false);
  const [voteKickOpen, setVoteKickOpen] = useState(false);
  const [voteKickTargetId, setVoteKickTargetId] = useState('');
  const [voteKickTargetName, setVoteKickTargetName] = useState('');
  const [voteKickInitiatorName, setVoteKickInitiatorName] = useState('');
  const [voteKickTimer, setVoteKickTimer] = useState(30);
  const [voteEndOpen, setVoteEndOpen] = useState(false);
  const [voteEndInitiatorName, setVoteEndInitiatorName] = useState('');
  const [voteEndTimer, setVoteEndTimer] = useState(30);

  // Intermission / Shop
  const [roundSummary, setRoundSummary] = useState<import('../../shared/types.js').RoundSummary | null>(null);
  const [shopOpen, setShopOpen] = useState(false);
  const [hasContinued, setHasContinued] = useState(false);

  // Battle Royale
  const [damageLog, setDamageLog] = useState<string[]>([]);
  const [eliminatedIds, setEliminatedIds] = useState<Set<string>>(new Set());
  const [brXPGained, setBrXPGained] = useState(0);
  const [brTotalXP, setBrTotalXP] = useState(0);
  const [brNewPerks, setBrNewPerks] = useState<import('../../shared/types.js').Perk[]>([]);

  // Voting (Battle Royale)
  const [votingSubmissions, setVotingSubmissions] = useState<{ submissionId: string; playerId: string; playerName: string; cards: CardType[]; effectCard?: CardType }[]>([]);
  const [voteCounts, setVoteCounts] = useState<Record<string, number>>({});
  const [hasVoted, setHasVoted] = useState(false);

  // Mini Profile
  const [miniProfilePlayer, setMiniProfilePlayer] = useState<Player | null>(null);

  // Effect card selection (lobby only)
  const [effectInventory, setEffectInventory] = useState<string[]>([]);
  const [selectedEffectCards, setSelectedEffectCards] = useState<string[]>([]);

  // Leaderboard ranks for scoreboard
  const [globalRanks, setGlobalRanks] = useState<Record<string, { wins: number; rank: number }>>({});

  // Rejoin / loading timeout
  const [loadError, setLoadError] = useState(false);

  const uniqueEffectCards = ALL_EFFECT_CARDS.reduce<CardType[]>((acc, card) => {
    if (card.effect && !acc.find((c) => c.effect?.type === card.effect?.type)) {
      acc.push(card);
    }
    return acc;
  }, []);

  useEffect(() => {
    if (!connected) return;
    // Load user's effect card inventory
    emit('get-own-profile', (u: import('../../shared/types.js').User | null) => {
      if (u) {
        setEffectInventory(u.effectCardInventory || []);
      }
    });
  }, [connected, emit]);

  useEffect(() => {
    if (!connected) return;

    // If we navigated here after the game started, request current state
    if (!gameState) {
      emit('request-state');
    }

    const unsubState = on('game-state', (state: GameState) => {
      setGameState(state);
      setPhase(state.room.phase);
    });

    const unsubPhase = on('phase-change', (newPhase: GamePhase) => {
      setPhase(newPhase);
    });

    const unsubSettings = on('settings-updated', (settings) => {
      setGameState((prev) => {
        if (!prev) return prev;
        return { ...prev, room: { ...prev.room, ...settings } };
      });
      setNotification('Host updated game settings');
      setTimeout(() => setNotification(''), 3000);
    });

    const unsubRoundStart = on('round-start', () => {
      setSelectedCardIds([]);
      setSelectedEffectCardId(null);
      setBlankSelections([]);
      setBlankText('');
      setCustomizeModalOpen(false);
      setCustomizeCardId(null);
      setCustomizeText('');
      setWinnerId(null);
      setSecondWinnerId(null);
      setWinningCards([]);
      setFinalScores(null);
      setRoundSummary(null);
      setHasContinued(false);
      setShopOpen(false);
      setDamageLog([]);
      setEliminatedIds(new Set());
      setBrXPGained(0);
      setBrTotalXP(0);
      setBrNewPerks([]);
      setVotingSubmissions([]);
      setVoteCounts({});
      setHasVoted(false);
      setNotification('New round started!');
      setTimeout(() => setNotification(''), 3000);
      playChime();
    });

    const unsubJudgePicked = on('judge-picked', (wid: string, wcards: CardType[]) => {
      setWinnerId((prev) => {
        if (prev && prev !== wid) {
          setSecondWinnerId(wid);
          return prev;
        }
        return wid;
      });
      setWinningCards(wcards);
      playWin();
    });

    const unsubRoundEnd = on('round-end', (scores: Record<string, number>) => {
      setFinalScores(scores);
    });

    const unsubRoundSummary = on('round-summary', (summary) => {
      setRoundSummary(summary);
      setHasContinued(false);
      setShopOpen(false);
      // Refresh global ranks for scoreboard display
      emit('get-leaderboards');
    });

    const unsubLeaderboards = on('leaderboards-data', (data) => {
      const rankMap: Record<string, { wins: number; rank: number }> = {};
      data.wins.forEach((entry, i) => {
        rankMap[entry.username] = { wins: entry.wins, rank: i + 1 };
      });
      setGlobalRanks(rankMap);
    });

    const unsubGameOver = on('game-over', (scores: Record<string, number>, winner: string) => {
      setPhase('game-over');
      setFinalScores(scores);
      setWinnerId(winner);
      setRoundSummary(null);
      setHasContinued(false);
      setShopOpen(false);
    });

    const unsubError = on('error', (msg: string) => {
      setNotification(msg);
      setTimeout(() => setNotification(''), 4000);
      playError();
    });

    const unsubNotify = on('notification', (msg: string) => {
      setNotification(msg);
      setTimeout(() => setNotification(''), 4000);
    });

    const unsubEffectPlayed = on('effect-played', (playerName: string, effectType: CardEffectType) => {
      const labels: Record<CardEffectType, string> = {
        double_points_win: 'Double Points',
        point_drain: 'Point Drain',
        customize_card: 'Customize',
        hand_swap: 'Hand Swap',
        exodia: 'EXODIA',
        abduction: 'Abduction',
        half_hand_discard: 'Half Discard',
        forced_random: 'Force Random',
        steal_card: 'Steal Card',
        double_points_hand: 'Double Hand',
        card_quality_down: 'Quality Down',
        first_of_month: 'First of Month',
        light_strike: 'Light Strike',
        heavy_blow: 'Heavy Blow',
        cleave: 'Cleave',
        execute: 'Execute',
        block: 'Block',
        shield_up: 'Shield Up',
        evade: 'Evade',
        draw_extra: 'Draw Extra',
        force_discard: 'Force Discard',
        cleanse: 'Cleanse',
        double_damage: 'Double Damage',
        reflect: 'Reflect',
        second_wind: 'Second Wind',
        bonus_vote: 'Bonus Vote',
      };
      const label = labels[effectType] || effectType;
      setNotification(`${playerName} used ${label}!`);
      setTimeout(() => setNotification(''), 4000);
    });

    const unsubHandChanged = on('hand-changed', (msg: string) => {
      setHandChange(msg);
      setTimeout(() => setHandChange(''), 5000);
    });

    const unsubCustomizePrompt = on('customize-prompt', () => {
      setCustomizeModalOpen(true);
      setCustomizeCardId(null);
      setCustomizeText('');
      setNotification('Customize Card: pick a card from your hand and rewrite it!');
      setTimeout(() => setNotification(''), 4000);
    });

    const unsubVoteKickStarted = on('vote-kick-started', (targetId: string, targetName: string, initiatorName: string) => {
      if (targetId === gameState?.myPlayerId) return; // target doesn't vote
      setVoteKickTargetId(targetId);
      setVoteKickTargetName(targetName);
      setVoteKickInitiatorName(initiatorName);
      setVoteKickOpen(true);
      setVoteKickTimer(30);
    });

    const unsubVoteKickEnded = on('vote-kick-ended', (targetId: string, targetName: string, success: boolean) => {
      setVoteKickOpen(false);
      setVoteKickTargetId('');
      setVoteKickTargetName('');
      setVoteKickInitiatorName('');
      setNotification(success ? `${targetName} was kicked!` : `Vote kick against ${targetName} failed.`);
      setTimeout(() => setNotification(''), 4000);
    });

    const unsubVoteEndStarted = on('vote-end-started', (initiatorName: string) => {
      setVoteEndInitiatorName(initiatorName);
      setVoteEndOpen(true);
      setVoteEndTimer(30);
    });

    const unsubVoteEndEnded = on('vote-end-ended', (success: boolean) => {
      setVoteEndOpen(false);
      setVoteEndInitiatorName('');
      setNotification(success ? 'Vote passed! Game ending...' : 'Vote to end the game failed.');
      setTimeout(() => setNotification(''), 4000);
    });

    const unsubReportAck = on('report-ack', (msg: string) => {
      setNotification(msg);
      setTimeout(() => setNotification(''), 5000);
    });
    const unsubCombat = on('combat-update', (healths, shields, log) => {
      setDamageLog(log);
      if (log.length > 0) {
        setNotification(log[log.length - 1]);
        setTimeout(() => setNotification(''), 4000);
      }
    });
    const unsubEliminated = on('player-eliminated', (playerId: string, playerName: string) => {
      setEliminatedIds((prev) => new Set([...prev, playerId]));
      setNotification(`${playerName} has been eliminated!`);
      setTimeout(() => setNotification(''), 4000);
    });
    const unsubBRXP = on('battle-royale-xp', (xpGained: number, totalXP: number, newPerks: import('../../shared/types.js').Perk[]) => {
      setBrXPGained(xpGained);
      setBrTotalXP(totalXP);
      setBrNewPerks(newPerks);
      if (newPerks.length > 0) {
        setNotification(`New perk unlocked: ${newPerks[0].name}!`);
        setTimeout(() => setNotification(''), 5000);
      }
    });

    const unsubVotingStarted = on('voting-started', (submissions) => {
      setVotingSubmissions(submissions);
      setHasVoted(false);
      setVoteCounts({});
    });

    const unsubVoteCast = on('vote-cast', (submissionId: string, _voterId: string, totalVotes: number) => {
      setVoteCounts((prev) => ({ ...prev, [submissionId]: totalVotes }));
    });

    const unsubVotePhaseEnded = on('vote-phase-ended', (_winnerSubmissionId: string, counts: Record<string, number>) => {
      setVoteCounts(counts);
    });

    return () => {
      unsubState();
      unsubPhase();
      unsubSettings();
      unsubRoundStart();
      unsubJudgePicked();
      unsubRoundEnd();
      unsubRoundSummary();
      unsubLeaderboards();
      unsubGameOver();
      unsubError();
      unsubNotify();
      unsubEffectPlayed();
      unsubHandChanged();
      unsubCustomizePrompt();
      unsubVoteKickStarted();
      unsubVoteKickEnded();
      unsubVoteEndStarted();
      unsubVoteEndEnded();
      unsubReportAck();
      unsubCombat();
      unsubEliminated();
      unsubBRXP();
      unsubVotingStarted();
      unsubVoteCast();
      unsubVotePhaseEnded();
    };
  }, [connected, on, gameState, emit]);

  // Rejoin when socket connects or tab becomes visible
  useEffect(() => {
    if (!connected || !roomCode) return;
    tryRejoin();

    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && connected && !gameState) {
        tryRejoin();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, roomCode, gameState]);

  // Timeout: if still loading after 8s, show reconnect UI
  useEffect(() => {
    if (gameState) {
      setLoadError(false);
      return;
    }
    const t = setTimeout(() => setLoadError(true), 8000);
    return () => clearTimeout(t);
  }, [gameState, roomCode]);

  // Vote kick countdown timer
  useEffect(() => {
    if (!voteKickOpen || voteKickTimer <= 0) return;
    const interval = setInterval(() => {
      setVoteKickTimer((t) => {
        if (t <= 1) {
          clearInterval(interval);
          return 0;
        }
        return t - 1;
      });
    }, 2250);
    return () => clearInterval(interval);
  }, [voteKickOpen, voteKickTimer]);

  // Vote end countdown timer
  useEffect(() => {
    if (!voteEndOpen || voteEndTimer <= 0) return;
    const interval = setInterval(() => {
      setVoteEndTimer((t) => {
        if (t <= 1) {
          clearInterval(interval);
          return 0;
        }
        return t - 1;
      });
    }, 2250);
    return () => clearInterval(interval);
  }, [voteEndOpen, voteEndTimer]);

  function handlePlayCard() {
    const totalSelections = selectedCardIds.length + blankSelections.length;
    console.log('[Client] handlePlayCard', { totalSelections, effectivePickCount, selectedCardIds, blankSelections, selectedEffectCardId });
    if (totalSelections === 0 || totalSelections !== effectivePickCount) {
      console.log('[Client] handlePlayCard blocked: count mismatch');
      return;
    }
    const plays: CardPlay[] = [
      ...selectedCardIds.map((id) => ({ cardId: id })),
      ...blankSelections.map((text) => ({ cardId: '__blank__', customText: text })),
    ];
    emit('play-card', plays, selectedEffectCardId, (success: boolean) => {
      console.log('[Client] play-card ack:', success);
      if (success) {
        setSelectedCardIds([]);
        setSelectedEffectCardId(null);
        setBlankSelections([]);
        setBlankText('');
        setNotification('Card played!');
        setTimeout(() => setNotification(''), 2000);
        playSubmit();
      } else {
        // Error message will come via 'error' event; don't duplicate here
        console.log('[Client] play-card failed (error details should appear via error event)');
      }
    });
  }

  function handleReSubmit() {
    const totalSelections = selectedCardIds.length + blankSelections.length;
    if (totalSelections === 0 || totalSelections !== effectivePickCount) return;
    const plays: CardPlay[] = [
      ...selectedCardIds.map((id) => ({ cardId: id })),
      ...blankSelections.map((text) => ({ cardId: '__blank__', customText: text })),
    ];
    emit('re-submit', plays, selectedEffectCardId, (success: boolean) => {
      if (success) {
        setSelectedCardIds([]);
        setSelectedEffectCardId(null);
        setBlankSelections([]);
        setBlankText('');
        setReSubmitMode(false);
        setNotification('Re-submitted!');
        setTimeout(() => setNotification(''), 3000);
        playSubmit();
      }
    });
  }

  function handleJudgePick(submissionId: string) {
    emit('judge-pick', submissionId, (success: boolean) => {
      if (success) {
        setNotification('Winner chosen!');
        setTimeout(() => setNotification(''), 2000);
      }
    });
  }

  function handleNextRound() {
    emit('next-round');
    setFinalScores(null);
    setWinnerId(null);
  }

  function tryRejoin() {
    if (!roomCode) return;
    const games = getActiveGames();
    const match = games.find((g) => g.roomCode === roomCode);
    if (match) {
      setLoadError(false);
      emit('rejoin', match.roomId, match.sessionId, (room) => {
        if (!room) setLoadError(true);
      });
    } else {
      setLoadError(true);
    }
  }

  function handleLeave() {
    emit('leave-room');
    removeActiveGame(roomCode || '');
    navigate('/');
  }

  function toggleEffectCard(cardId: string) {
    playClick();
    setSelectedEffectCards((prev) => {
      let next: string[];
      if (prev.includes(cardId)) {
        next = prev.filter((id) => id !== cardId);
      } else if (prev.length < 2) {
        next = [...prev, cardId];
      } else {
        return prev;
      }
      emit('set-effect-cards', next, (success: boolean) => {
        if (!success) setSelectedEffectCards(prev);
      });
      return next;
    });
  }

  const room = gameState?.room;
  const myPlayer = room?.players.find((p: Player) => p.id === gameState?.myPlayerId);
  const isJudge = myPlayer?.id === room?.judgeId;
  const blackCard = room?.blackCard;
  const submittedCards = room?.submittedCards || [];
  const expectedSubmitters = room
    ? room.players.filter((p: Player) => p.id !== room.judgeId && !(room.mode === 'battle-royale' && p.health <= 0)).length
    : 0;
  const allPlayed = submittedCards.length >= expectedSubmitters;
  const blackPickCount = blackCard?.pickCount || 1;
  const effectivePickCount = ((myPlayer?.doublePointsHandRounds ?? 0) > 0 && blackPickCount === 1) ? 1 : blackPickCount;
  const blankCardsRemaining = myPlayer?.blankCardsRemaining ?? 0;
  const totalSelected = selectedCardIds.length + blankSelections.length;
  const effectHand = gameState?.effectHand || [];
  const hasSubmitted = submittedCards.some((s) => s.playerId === gameState?.myPlayerId);
  const canReSubmit = hasSubmitted && !isJudge && phase === 'playing' && (myPlayer?.reSubmitTokens ?? 0) > 0 && (myPlayer?.reSubmitCooldown ?? 0) === 0;

  const isVanilla = room
    ? (room.mode === 'quick-play'
        ? room.maxPlayers === 12 && room.maxRounds === 10 && room.winningScore === 7
        : room.mode === 'battle-royale'
        ? room.maxPlayers === 12 && room.maxRounds === 20
        : room.maxPlayers === 12 && room.maxRounds === 20 && room.winningScore === 5)
      && room.startingCards === 10
      && !room.blankCardsEnabled
      && !room.buffsEnabled
      && room.maxReSubmits === 2
      && room.cardPacks.length === 1
      && room.cardPacks[0] === 'base'
    : false;

  const sortedPlayers = room ? [...room.players].sort((a, b) => b.score - a.score) : [];

  const scoreboardPanel = room && (
    <div className="flex flex-col gap-3 shrink-0 w-full md:w-52 h-auto md:h-full overflow-y-auto py-2">
      {/* Game Info */}
      <div className="glass-card p-3 flex flex-col gap-2">
        <div className="text-xs text-white/40 font-bold uppercase tracking-wider">Game Info</div>
        <div className="font-bold text-sm truncate">{room.name}</div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
            room.mode === 'quick-play' ? 'bg-accent/20 text-accent' : room.mode === 'battle-royale' ? 'bg-red-500/20 text-red-400' : 'bg-purple-500/20 text-purple-400'
          }`}>
            {room.mode === 'quick-play' ? 'Quick Play' : room.mode === 'battle-royale' ? 'Battle Royale' : "Who's Next?"}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
            isVanilla ? 'bg-green-500/20 text-green-400' : 'bg-orange-500/20 text-orange-400'
          }`}>
            {isVanilla ? 'Vanilla' : 'Custom'}
          </span>
        </div>
        {!isVanilla && (
          <div className="text-xs text-white/40 flex flex-col gap-0.5">
            <span>Players: {room.players.length}/{room.maxPlayers}</span>
            <span>Rounds: {room.maxRounds}</span>
            <span>Hand Size: {room.startingCards}</span>
            {room.mode !== 'battle-royale' && <span>Win: {room.winningScore} pts</span>}
            {room.mode === 'battle-royale' && <span>HP: {room.players[0]?.maxHealth || 30}</span>}
            {room.blankCardsEnabled && <span>Blank Cards: On</span>}
            {room.buffsEnabled && <span>Buffs: On</span>}
            <span>Packs: {room.cardPacks.join(', ')}</span>
          </div>
        )}
        <div className="text-xs text-white/60 mt-1 flex items-center gap-1">
          <Clock size={12} />
          Round {room.round} / {room.maxRounds}
        </div>
      </div>

      {/* Scoreboard */}
      <div className="glass-card p-3 flex flex-col gap-2 flex-1">
        <div className="text-xs text-white/40 font-bold uppercase tracking-wider">Scoreboard</div>
        <div className="flex flex-col gap-1.5">
          {sortedPlayers.map((p: Player) => {
              const isEliminated = room.mode === 'battle-royale' && p.health <= 0;
              return (
            <div
              key={p.id}
              className={`group flex items-center justify-between px-2 py-1.5 rounded-lg text-sm ${
                isEliminated ? 'bg-surface-light/40 opacity-50' : p.id === gameState?.myPlayerId ? 'bg-accent/10 ring-1 ring-accent/30' : 'bg-surface-light'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className={`w-2 h-2 rounded-full shrink-0 ${
                  isEliminated ? 'bg-gray-500' : p.abductionRounds > 0 ? 'bg-purple-500' : p.isConnected ? 'bg-green-500' : 'bg-red-500'
                }`} />
                <button
                  onClick={() => { setMiniProfilePlayer(p); playClick(); }}
                  className={`font-semibold truncate text-left hover:text-accent transition-colors ${p.abductionRounds > 0 ? 'text-purple-400 line-through' : ''} ${isEliminated ? 'text-white/30 line-through' : ''}`}
                >
                  {p.name}
                  {p.id === room.judgeId && !isEliminated && <Crown size={12} className="inline text-accent ml-1" />}
                  {p.abductionRounds > 0 && <span className="text-[10px] text-purple-400 ml-1">(abducted)</span>}
                  {isEliminated && <Skull size={12} className="inline text-red-400 ml-1" />}
                </button>
                {!isEliminated && p.id !== gameState?.myPlayerId && p.isConnected && (
                  <button
                    onClick={() => {
                      emit('start-vote-kick', p.id);
                      playClick();
                    }}
                    className="opacity-0 group-hover:opacity-100 hover:opacity-100 focus:opacity-100 text-white/30 hover:text-red-400 transition-opacity ml-1"
                    title={`Vote kick ${p.name}`}
                  >
                    <Ban size={12} />
                  </button>
                )}
                <div className="flex gap-0.5">
                  {!isEliminated && p.analProbeRounds > 0 && (
                    <span title="Anal Probe: extra cards" className="bg-pink-500/10 rounded px-1">
                      <Plus size={10} className="text-pink-400" />
                    </span>
                  )}
                  {!isEliminated && p.doublePointsHandRounds > 0 && (
                    <span title="Double points hand" className="bg-yellow-500/10 rounded px-1">
                      <Zap size={10} className="text-yellow-400" />
                    </span>
                  )}
                  {!isEliminated && p.cardQualityDownRounds > 0 && (
                    <span title="Card quality down" className="bg-red-500/10 rounded px-1">
                      <Minus size={10} className="text-red-400" />
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {room.mode === 'battle-royale' && p.maxHealth > 0 && (
                  <div className="flex flex-col items-end gap-0.5">
                    {/* Health bar */}
                    <div className="w-16 h-1.5 bg-surface-light rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          isEliminated ? 'bg-gray-500' : p.health > p.maxHealth * 0.5 ? 'bg-green-500' : p.health > p.maxHealth * 0.25 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${Math.max(0, (p.health / p.maxHealth) * 100)}%` }}
                      />
                    </div>
                    {/* Shield bar */}
                    {!isEliminated && p.shieldHp > 0 && (
                      <div className="w-16 h-1 bg-surface-light rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-blue-400"
                          style={{ width: `${Math.min(100, (p.shieldHp / p.maxHealth) * 100)}%` }}
                        />
                      </div>
                    )}
                    <span className="text-[10px] text-white/50">{p.health}/{p.maxHealth} {p.shieldHp > 0 && <span className="text-blue-400">+{p.shieldHp} shield</span>}</span>
                  </div>
                )}
                <span className="text-xs text-white/40">${p.currency.toFixed(2)}</span>
                <span className={`font-bold ${isEliminated ? 'text-white/20' : ''}`}>{p.score}</span>
              </div>
            </div>
          );})}
        </div>
      </div>
    </div>
  );

  if (!gameState || !room) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-4 max-w-xs text-center px-4">
          {!loadError ? (
            <>
              <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              <p className="text-white/60">Loading game...</p>
            </>
          ) : (
            <>
              <p className="text-white/60">Could not reconnect to game.</p>
              <button onClick={tryRejoin} className="btn-primary">Reconnect</button>
              <button onClick={handleLeave} className="btn-secondary">Leave Game</button>
            </>
          )}
        </div>
      </div>
    );
  }

  // Dealing phase — brief transition before playing starts
  if (phase === 'dealing') {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-white/60">Dealing cards...</p>
        </div>
      </div>
    );
  }

  // Returned to lobby (not enough players, etc.)
  if (phase === 'lobby') {
    return (
      <div className="flex h-full flex-col items-center justify-center px-4 overflow-auto py-4">
        <div className="glass-card p-8 max-w-md w-full flex flex-col gap-6 animate-bounce-in">
          <div className="text-center">
            <h2 className="text-3xl font-black mb-2">Back to Lobby</h2>
            <p className="text-white/60">The game returned to the lobby. Waiting for more players to join.</p>
          </div>
          <div className="flex flex-col gap-2">
            {room.players.map((p: Player) => (
              <div key={p.id} className="flex items-center gap-3 bg-surface-light rounded-lg px-4 py-2">
                <div className={`w-2 h-2 rounded-full ${p.isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="font-semibold">{p.name} {p.isHost && <span className="text-accent text-xs">(Host)</span>}</span>
              </div>
            ))}
          </div>

          {/* Effect Card Selection */}
          <div className="glass-card p-3 flex flex-col gap-2">
            <div className="text-xs text-white/40 font-bold uppercase tracking-wider">Effect Cards ({selectedEffectCards.length}/2)</div>
            {effectInventory.length === 0 ? (
              <p className="text-white/40 text-xs text-center py-2">No effect cards in inventory</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {uniqueEffectCards
                  .filter((card) => effectInventory.includes(card.id))
                  .map((card) => {
                    const ownedCount = effectInventory.filter((id) => id === card.id).length;
                    const isSelected = selectedEffectCards.includes(card.id);
                    return (
                      <button
                        key={card.id}
                        onClick={() => toggleEffectCard(card.id)}
                        className={`flex items-center justify-between p-2 rounded-lg text-xs transition-all border ${
                          isSelected
                            ? 'border-accent bg-accent/10'
                            : 'border-border bg-surface-light opacity-60 hover:opacity-100'
                        }`}
                        disabled={!isSelected && selectedEffectCards.length >= 2}
                      >
                        <span className="font-semibold truncate">{card.text}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-white/40">x{ownedCount}</span>
                          <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                            isSelected ? 'border-accent bg-accent' : 'border-white/30'
                          }`}>
                            {isSelected && <span className="text-black text-[10px] font-bold">✓</span>}
                          </div>
                        </div>
                      </button>
                    );
                  })}
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button onClick={handleLeave} className="btn-primary flex-1">
              Main Menu
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Game Over Screen
  if (phase === 'game-over') {
    const winner = room.players.find((p: Player) => p.id === winnerId);
    const sortedPlayers = room.mode === 'battle-royale'
      ? [...room.players].sort((a, b) => b.health - a.health || b.score - a.score)
      : [...room.players].sort((a, b) => b.score - a.score);

    return (
      <div className="flex h-full flex-col items-center justify-start px-4 overflow-auto py-6">
        <div className="glass-card p-8 max-w-lg w-full flex flex-col gap-6 animate-bounce-in max-h-[90vh] overflow-y-auto">
          <div className="text-center">
            <Trophy size={64} className="text-accent mx-auto mb-4" />
            <h2 className="text-4xl font-black mb-2">Game Over!</h2>
            <p className="text-xl text-white/80">
              {room.mode === 'battle-royale'
                ? `${winner?.name || 'Someone'} is the last one standing!`
                : `${winner?.name || 'Someone'} wins!`}
            </p>
            {room.mode === 'battle-royale' && brXPGained > 0 && (
              <div className="mt-4 glass-card p-3 inline-flex flex-col items-center gap-1">
                <span className="text-xs text-white/40 uppercase tracking-wider">Battle Royale XP</span>
                <span className="text-2xl font-bold text-accent">+{brXPGained} XP</span>
                <span className="text-xs text-white/40">Total: {brTotalXP} XP</span>
              </div>
            )}
            {room.mode === 'battle-royale' && brNewPerks.length > 0 && (
              <div className="mt-3 flex flex-col gap-2">
                <span className="text-xs text-accent font-bold uppercase tracking-wider">New Perks Unlocked!</span>
                {brNewPerks.map((perk) => (
                  <div key={perk.id} className="glass-card p-2 text-left">
                    <div className="font-semibold text-sm">{perk.name}</div>
                    <div className="text-xs text-white/50">{perk.description}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            {sortedPlayers.map((p, i) => (
              <div
                key={p.id}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  p.id === winnerId ? 'bg-accent/20 border border-accent/30' : 'bg-surface-light'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold w-8">#{i + 1}</span>
                  <User size={18} className="text-white/40" />
                  <span className="font-semibold">{p.name}</span>
                  {p.id === winnerId && <Trophy size={16} className="text-accent" />}
                  {room.mode === 'battle-royale' && p.health <= 0 && <span className="text-[10px] text-red-400">(eliminated)</span>}
                </div>
                <div className="flex items-center gap-3">
                  {room.mode === 'battle-royale' && (
                    <span className={`text-sm font-bold ${p.health <= 0 ? 'text-white/20' : p.health > p.maxHealth * 0.5 ? 'text-green-400' : p.health > p.maxHealth * 0.25 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {p.health}/{p.maxHealth} HP
                    </span>
                  )}
                  <span className="text-xl font-bold">{p.score}</span>
                  {p.id !== gameState?.myPlayerId && (
                    <button
                      onClick={() => {
                        if (window.confirm(`Report ${p.name} for inappropriate behavior?\n\nReports are taken VERY SERIOUSLY. Players using extreme slurs will be banned.`)) {
                          emit('report-player', p.id, 'Inappropriate behavior');
                          playClick();
                        }
                      }}
                      className="text-white/20 hover:text-red-400 transition-colors"
                      title={`Report ${p.name}`}
                    >
                      <Ban size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button onClick={handleNextRound} className="btn-primary flex-1">
              Play Again
            </button>
            <button onClick={handleLeave} className="btn-secondary flex-1">
              Main Menu
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border shrink-0">
        <button
          onClick={handleLeave}
          className="flex items-center gap-2 text-white/60 hover:text-white transition-colors"
        >
          <ArrowLeft size={18} />
          Leave
        </button>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-white/60">
            <Clock size={16} />
            <span className="text-sm">Round {room.round} / {room.maxRounds}</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap max-w-[50vw] md:max-w-none overflow-x-auto">
            {room.players.map((p: Player) => {
              const isEliminated = room.mode === 'battle-royale' && p.health <= 0;
              return (
              <button
                key={p.id}
                onClick={() => { setMiniProfilePlayer(p); playClick(); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold hover:ring-1 hover:ring-accent/50 transition-all ${
                  isEliminated
                    ? 'bg-surface-light/40 text-white/20'
                    : p.id === room.judgeId
                    ? 'bg-accent/20 text-accent'
                    : 'bg-surface-light text-white/60'
                }`}
                title={`${p.name}: ${p.score} points${isEliminated ? ' (eliminated)' : ''}`}
              >
                <User size={12} />
                <span>{p.name}</span>
                <span className="opacity-60">({p.score})</span>
              </button>
            );})}
          </div>
          <button
            onClick={() => { emit('start-vote-end'); playClick(); }}
            className="flex items-center gap-1.5 text-xs font-semibold text-white/60 hover:text-red-400 transition-colors px-2 py-1 rounded-lg hover:bg-red-500/10"
            title="Vote to End Game"
          >
            <Ban size={14} />
            Vote End
          </button>
          {myPlayer?.isHost && (
            <button
              onClick={() => { setHostSettingsOpen(!hostSettingsOpen); playClick(); }}
              className="flex items-center gap-1.5 text-xs font-semibold text-white/60 hover:text-accent transition-colors px-2 py-1 rounded-lg hover:bg-accent/10"
              title="Host Settings"
            >
              <Settings size={14} />
              Settings
            </button>
          )}
        </div>
      </div>

      {/* Host Settings Panel */}
      {hostSettingsOpen && myPlayer?.isHost && room && (
        <div className="absolute top-14 right-4 z-40 glass-card p-4 w-64 flex flex-col gap-3 animate-fade-in max-h-[80vh] overflow-y-auto">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-white/80">Host Settings</span>
            <button onClick={() => setHostSettingsOpen(false)} className="text-white/40 hover:text-white">✕</button>
          </div>
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={room.blankCardsEnabled}
                onChange={(e) => emit('update-settings', { blankCardsEnabled: e.target.checked })}
                className="accent-accent w-4 h-4"
              />
              <span className="text-sm text-white/80">Blank Cards</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={room.buffsEnabled}
                onChange={(e) => emit('update-settings', { buffsEnabled: e.target.checked })}
                className="accent-accent w-4 h-4"
              />
              <span className="text-sm text-white/80">Buffs & Debuffs</span>
            </label>
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-xs text-white/60">
              <label>Max Rounds</label>
              <span>{room.maxRounds}</span>
            </div>
            <input
              type="range"
              min={3}
              max={50}
              step={1}
              value={room.maxRounds}
              onChange={(e) => emit('update-settings', { maxRounds: parseInt(e.target.value) })}
              className="w-full accent-accent"
            />
          </div>
          {room.mode !== 'battle-royale' && (
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-xs text-white/60">
              <label>Winning Score</label>
              <span>{room.winningScore}</span>
            </div>
            <input
              type="range"
              min={1}
              max={20}
              step={1}
              value={room.winningScore}
              onChange={(e) => emit('update-settings', { winningScore: parseInt(e.target.value) })}
              className="w-full accent-accent"
            />
          </div>
          )}
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-xs text-white/60">
              <label>Re-Submit Tokens</label>
              <span>{room.maxReSubmits}</span>
            </div>
            <input
              type="range"
              min={0}
              max={10}
              step={1}
              value={room.maxReSubmits}
              onChange={(e) => emit('update-settings', { maxReSubmits: parseInt(e.target.value) })}
              className="w-full accent-accent"
            />
          </div>
        </div>
      )}

      {/* Vote Kick Modal */}
      {voteKickOpen && voteKickTargetId && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass-card p-6 max-w-sm w-full flex flex-col gap-4 animate-bounce-in">
            <div className="text-center">
              <Ban size={32} className="text-red-400 mx-auto mb-2" />
              <h3 className="text-lg font-bold">Vote Kick</h3>
              <p className="text-sm text-white/60">
                {voteKickInitiatorName} wants to kick <span className="text-white font-semibold">{voteKickTargetName}</span>.
              </p>
              <p className="text-xs text-white/40 mt-1">Unanimous vote required. Target cannot vote.</p>
            </div>
            <div className="flex items-center justify-center">
              <span className="text-xs text-white/40 font-mono">{voteKickTimer}s remaining</span>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  emit('cast-vote-kick', voteKickTargetId, false);
                  setVoteKickOpen(false);
                  playClick();
                }}
                className="btn-secondary flex-1"
              >
                No
              </button>
              <button
                onClick={() => {
                  emit('cast-vote-kick', voteKickTargetId, true);
                  setVoteKickOpen(false);
                  playClick();
                }}
                className="btn-primary flex-1 bg-red-500 hover:bg-red-600"
              >
                Yes, Kick
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Vote End Modal */}
      {voteEndOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass-card p-6 max-w-sm w-full flex flex-col gap-4 animate-bounce-in">
            <div className="text-center">
              <Clock size={32} className="text-orange-400 mx-auto mb-2" />
              <h3 className="text-lg font-bold">Vote to End Game</h3>
              <p className="text-sm text-white/60">
                {voteEndInitiatorName} wants to end the game early.
              </p>
              <p className="text-xs text-white/40 mt-1">2/3 majority required.</p>
            </div>
            <div className="flex items-center justify-center">
              <span className="text-xs text-white/40 font-mono">{voteEndTimer}s remaining</span>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  emit('cast-vote-end', false);
                  setVoteEndOpen(false);
                  playClick();
                }}
                className="btn-secondary flex-1"
              >
                No, Keep Playing
              </button>
              <button
                onClick={() => {
                  emit('cast-vote-end', true);
                  setVoteEndOpen(false);
                  playClick();
                }}
                className="btn-primary flex-1 bg-orange-500 hover:bg-orange-600"
              >
                Yes, End Game
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mini Profile Popover */}
      {miniProfilePlayer && room && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setMiniProfilePlayer(null)}
        >
          <div className="glass-card p-5 max-w-xs w-full flex flex-col gap-3 animate-bounce-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center text-sm font-bold text-accent border border-accent/30">
                  {miniProfilePlayer.username?.slice(0, 2).toUpperCase() || miniProfilePlayer.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-sm">{miniProfilePlayer.name}</span>
                  {miniProfilePlayer.username && (
                    <span className="text-[10px] text-white/40">@{miniProfilePlayer.username}</span>
                  )}
                </div>
              </div>
              <button onClick={() => setMiniProfilePlayer(null)} className="text-white/40 hover:text-white">✕</button>
            </div>

            <div className={`grid gap-2 ${room?.mode === 'battle-royale' ? 'grid-cols-3' : 'grid-cols-2'}`}>
              <div className="glass-card p-2 text-center">
                <div className="text-lg font-bold text-accent">{miniProfilePlayer.score}</div>
                <div className="text-[10px] text-white/40">Score</div>
              </div>
              <div className="glass-card p-2 text-center">
                <div className="text-lg font-bold text-green-400">${miniProfilePlayer.currency.toFixed(2)}</div>
                <div className="text-[10px] text-white/40">Currency</div>
              </div>
              {room?.mode === 'battle-royale' && (
                <div className="glass-card p-2 text-center">
                  <div className="text-lg font-bold text-red-400">{miniProfilePlayer.health}/{miniProfilePlayer.maxHealth}</div>
                  <div className="text-[10px] text-white/40">HP {miniProfilePlayer.shieldHp > 0 && <span className="text-blue-400">+{miniProfilePlayer.shieldHp} shield</span>}</div>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-1">
              {miniProfilePlayer.abductionRounds > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400">Abducted</span>
              )}
              {miniProfilePlayer.analProbeRounds > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-pink-500/20 text-pink-400">Anal Probe</span>
              )}
              {miniProfilePlayer.doublePointsHandRounds > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400">Double Hand</span>
              )}
              {miniProfilePlayer.cardQualityDownRounds > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400">Quality Down</span>
              )}
              {miniProfilePlayer.isHost && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/20 text-accent">Host</span>
              )}
              {!miniProfilePlayer.isConnected && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400">Disconnected</span>
              )}
            </div>

            {miniProfilePlayer.username && (
              <button
                onClick={() => {
                  playClick();
                  emit('send-friend-request', miniProfilePlayer.username!, (success: boolean, message?: string) => {
                    if (success) {
                      setNotification(`Friend request sent to ${miniProfilePlayer.username}!`);
                    } else {
                      setNotification(message || 'Failed to send friend request');
                    }
                    setTimeout(() => setNotification(''), 4000);
                  });
                }}
                className="btn-primary text-xs flex items-center justify-center gap-1.5 mt-1"
              >
                <UserPlus size={14} /> Add Friend
              </button>
            )}
          </div>
        </div>
      )}

      {/* Notification Toast */}
      {notification && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-accent text-black px-6 py-2 rounded-full font-bold text-sm animate-fade-in shadow-lg">
          {notification}
        </div>
      )}

      {/* Hand Changed Toast */}
      {handChange && (
        <div className="absolute top-28 left-1/2 -translate-x-1/2 z-50 bg-yellow-500 text-black px-6 py-2 rounded-full font-bold text-sm animate-fade-in shadow-lg">
          {handChange}
        </div>
      )}

      {/* Blank Card Modal */}
      {blankModalOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass-card p-6 max-w-sm w-full flex flex-col gap-4 animate-bounce-in">
            <div className="flex items-center gap-2 text-accent">
              <PenLine size={20} />
              <span className="font-bold">Write Your Answer</span>
            </div>
            <textarea
              value={blankText}
              onChange={(e) => setBlankText(e.target.value)}
              placeholder="Type something hilarious..."
              maxLength={120}
              rows={3}
              className="bg-surface-light border border-border rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-accent transition-colors resize-none"
              autoFocus
            />
            <div className="flex justify-between items-center">
              <span className="text-xs text-white/40">{blankText.length}/120</span>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setBlankModalOpen(false);
                    setBlankText('');
                  }}
                  className="btn-secondary px-4 py-2 text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (blankText.trim()) {
                      setBlankSelections((prev) => [...prev, blankText.trim()]);
                    }
                    setBlankModalOpen(false);
                    setBlankText('');
                  }}
                  disabled={!blankText.trim()}
                  className="btn-primary px-4 py-2 text-sm"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Customize Card Modal */}
      {customizeModalOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass-card p-6 max-w-md w-full flex flex-col gap-4 animate-bounce-in max-h-[80vh] overflow-auto">
            <div className="flex items-center gap-2 text-accent">
              <PenLine size={20} />
              <span className="font-bold">Customize a Card</span>
            </div>
            <p className="text-xs text-white/60">Pick a card from your hand and rewrite it.</p>

            {/* Card Selection */}
            <div className="flex flex-wrap justify-center gap-3">
              {gameState.hand.map((card: CardType) => {
                const isSelected = customizeCardId === card.id;
                return (
                  <Card
                    key={card.id}
                    card={card}
                    onClick={() => {
                      setCustomizeCardId(card.id);
                      setCustomizeText('');
                      playClick();
                    }}
                    selected={isSelected}
                    size="compact"
                  />
                );
              })}
            </div>

            {/* Text Input - shown after card selected */}
            {customizeCardId && (
              <div className="flex flex-col gap-2">
                <textarea
                  value={customizeText}
                  onChange={(e) => setCustomizeText(e.target.value)}
                  placeholder="Type your new card text..."
                  maxLength={120}
                  rows={2}
                  className="bg-surface-light border border-border rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-accent transition-colors resize-none"
                  autoFocus
                />
                <div className="flex justify-between items-center">
                  <span className="text-xs text-white/40">{customizeText.length}/120</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setCustomizeModalOpen(false);
                        setCustomizeCardId(null);
                        setCustomizeText('');
                      }}
                      className="btn-secondary px-4 py-2 text-sm"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        if (customizeCardId && customizeText.trim()) {
                          emit('customize-card', customizeCardId, customizeText.trim());
                          setCustomizeModalOpen(false);
                          setCustomizeCardId(null);
                          setCustomizeText('');
                          setNotification('Card customized!');
                          setTimeout(() => setNotification(''), 2000);
                        }
                      }}
                      disabled={!customizeText.trim()}
                      className="btn-primary px-4 py-2 text-sm"
                    >
                      Customize
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Game Area + Chat */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        <div className="flex-1 flex flex-col items-center justify-center gap-8 px-4 py-6 overflow-auto min-w-0">
        {/* Playing phase — horizontal layout: black card left, hand center, scoreboard right */}
        {phase === 'playing' && !isJudge && blackCard && (
          <div className="flex flex-col md:flex-row items-start justify-center gap-4 w-full min-h-0 px-4">
            {/* Black Card Column */}
            <div className="flex flex-col items-center gap-2 shrink-0 py-2">
              <div className="text-white/40 text-xs font-bold uppercase tracking-wider">Question Card</div>
              <Card card={blackCard} size="md" />
            </div>

            {/* Effect Cards Column */}
            {effectHand.length > 0 && !isJudge && (
              <div className="flex flex-col items-center gap-2 shrink-0 py-2">
                <div className="text-yellow-400 text-xs font-bold uppercase tracking-wider">Effect Cards</div>
                <div className="flex flex-col gap-2">
                  {effectHand.map((card: CardType) => {
                    const isSelected = selectedEffectCardId === card.id;
                    return (
                      <Card
                        key={card.id}
                        card={card}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedEffectCardId(null);
                          } else {
                            setSelectedEffectCardId(card.id);
                          }
                          playClick();
                        }}
                        selected={isSelected}
                        size="sm"
                      />
                    );
                  })}
                </div>
                <p className="text-[10px] text-white/40 text-center max-w-32">Select one to play alongside your answer</p>
              </div>
            )}

            {/* Abducted message */}
            {(myPlayer?.abductionRounds ?? 0) > 0 ? (
              <div className="flex flex-col items-center justify-center gap-4 flex-1">
                <div className="w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center">
                  <span className="text-purple-400 text-2xl">🛸</span>
                </div>
                <p className="text-purple-400 font-bold text-lg">You have been abducted!</p>
                <p className="text-white/40 text-sm">You will return in {myPlayer?.abductionRounds ?? 0} round{(myPlayer?.abductionRounds ?? 0) > 1 ? 's' : ''} with an anal probe.</p>
              </div>
            ) : (
            <div className="flex flex-col items-center gap-3 flex-1 min-w-0 min-h-0">
              {/* Already submitted — show status + re-submit option */}
              {hasSubmitted && !reSubmitMode && (
                <div className="flex flex-col items-center gap-3 animate-fade-in shrink-0 pt-4">
                  <CheckCircle size={40} className="text-green-400" />
                  <p className="text-white/60 font-semibold">You've submitted your answer</p>
                  <div className="flex items-center gap-2 text-xs text-white/40">
                    <span>Tokens: {myPlayer?.reSubmitTokens ?? 0}</span>
                    {(myPlayer?.reSubmitCooldown ?? 0) > 0 && (
                      <span className="text-red-400">Cooldown: {myPlayer?.reSubmitCooldown} rounds</span>
                    )}
                  </div>
                  {canReSubmit && (
                    <button
                      onClick={() => {
                        setReSubmitMode(true);
                        setSelectedCardIds([]);
                        setSelectedEffectCardId(null);
                        setBlankSelections([]);
                        playClick();
                      }}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg border border-dashed border-accent/40 text-accent text-sm hover:bg-accent/10 transition-colors"
                    >
                      <RefreshCw size={16} />
                      Re-Submit Answer
                    </button>
                  )}
                </div>
              )}

              {/* Re-submit mode or normal play */}
              {(!hasSubmitted || reSubmitMode) && (
                <>
                  <p className="text-white/60 shrink-0 pt-2">
                    {reSubmitMode && <span className="text-accent font-bold mr-1">[Re-Submit Mode]</span>}
                    {(myPlayer?.doublePointsHandRounds ?? 0) > 0 && effectivePickCount === 1 && (
                      <span className="text-yellow-400 font-bold mr-1">[Double Hand Active]</span>
                    )}
                    Pick {effectivePickCount > 1 ? `${effectivePickCount} cards` : 'your best answer'}
                    {totalSelected > 0 && ` (${totalSelected}/${effectivePickCount})`}
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 overflow-y-auto px-2 pb-2">
                {gameState.hand.map((card: CardType) => {
                  const isSelected = selectedCardIds.includes(card.id);
                  const canSelect = isSelected || totalSelected < effectivePickCount;
                  return (
                    <Card
                      key={card.id}
                      card={card}
                      onClick={() => {
                        if (isSelected) {
                          setSelectedCardIds((prev) => prev.filter((id) => id !== card.id));
                          playClick();
                        } else if (canSelect) {
                          setSelectedCardIds((prev) => [...prev, card.id]);
                          playClick();
                        }
                      }}
                      selected={isSelected}
                      disabled={!canSelect}
                      size="compact"
                    />
                  );
                })}
              </div>

              {/* Blank Card Selections */}
              {blankSelections.length > 0 && (
                <div className="flex flex-wrap justify-center gap-2 shrink-0">
                  {blankSelections.map((text, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setBlankSelections((prev) => prev.filter((_, i) => i !== idx));
                        playClick();
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-surface-light border border-accent/40 text-xs text-white/80 hover:bg-accent/10 transition-colors"
                    >
                      <PenLine size={12} className="text-accent" />
                      <span className="truncate max-w-[8rem]">{text}</span>
                      <span className="text-white/40">×</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Use Blank Card Button */}
              {room.blankCardsEnabled && blankCardsRemaining > 0 && totalSelected < effectivePickCount && (
                <button
                  onClick={() => {
                    setBlankModalOpen(true);
                    playClick();
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-dashed border-accent/40 text-accent text-sm hover:bg-accent/10 transition-colors shrink-0"
                >
                  <PenLine size={16} />
                  Use Blank Card ({blankCardsRemaining} left)
                </button>
              )}

              {totalSelected === effectivePickCount && (
                <div className="flex items-center gap-2 shrink-0 mb-2">
                  <button onClick={reSubmitMode ? handleReSubmit : handlePlayCard} className="btn-primary flex items-center gap-2">
                    <CheckCircle size={18} />
                    {reSubmitMode ? 'Confirm Re-Submit' : 'Submit Answer'}
                  </button>
                  {reSubmitMode && (
                    <button
                      onClick={() => {
                        setReSubmitMode(false);
                        setSelectedCardIds([]);
                        setSelectedEffectCardId(null);
                        setBlankSelections([]);
                        playClick();
                      }}
                      className="btn-secondary px-3 py-2 text-sm"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              )}
              </>
              )}
            </div>
            )}

            {scoreboardPanel}
          </div>
        )}

        {/* Judge waiting + Judging phases — row layout with scoreboard */}
        {!(phase === 'playing' && !isJudge) && (phase === 'playing' || phase === 'judging' || phase === 'voting') && (
          <div className="flex flex-col md:flex-row items-start justify-center gap-4 w-full min-h-0 px-4">
            <div className="flex flex-col items-center justify-center gap-8 flex-1 min-w-0 overflow-y-auto py-6">
              {/* Black Card */}
              {blackCard && (
                <div className="flex flex-col items-center gap-3">
                  <div className="text-white/40 text-xs font-bold uppercase tracking-wider">
                    {isJudge ? 'You are the Judge' : 'Question Card'}
                  </div>
                  <Card card={blackCard} size="lg" />
                </div>
              )}

              {/* Voting phase (Battle Royale) */}
              {phase === 'voting' && (
                <div className="flex flex-col items-center gap-4 w-full">
                  <p className="text-white/60 font-semibold text-lg">Vote for the best answer!</p>
                  <div className="flex flex-wrap justify-center gap-4">
                    {votingSubmissions.map((sub) => {
                      const myVoteCount = voteCounts[sub.submissionId] || 0;
                      const isMySubmission = sub.playerId === gameState?.myPlayerId;
                      const isEliminated = (myPlayer?.health ?? 1) <= 0;
                      const alreadyVoted = hasVoted || isMySubmission || isEliminated;
                      return (
                        <button
                          key={sub.submissionId}
                          onClick={() => {
                            if (!alreadyVoted) {
                              emit('vote-submission', sub.submissionId, (success: boolean) => {
                                if (success) setHasVoted(true);
                              });
                              playClick();
                            }
                          }}
                          className={`flex flex-col items-center gap-2 group ${alreadyVoted ? 'opacity-70 cursor-default' : 'cursor-pointer hover:scale-105 transition-transform'}`}
                        >
                          <div className="flex gap-2 items-center">
                            {sub.cards.map((c) => (
                              <Card key={c.id} card={c} size="md" />
                            ))}
                            {sub.effectCard && (
                              <div className="flex flex-col items-center gap-1">
                                <Card card={sub.effectCard} size="sm" />
                                <span className="text-[10px] text-yellow-400 font-bold uppercase">Effect</span>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-white/40">{sub.playerName}</span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-accent/20 text-accent font-bold">
                              {myVoteCount} vote{myVoteCount !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  {hasVoted && (
                    <p className="text-white/40 text-sm">You voted! Waiting for others...</p>
                  )}
                  {(!hasVoted && (myPlayer?.health ?? 1) > 0) && (
                    <p className="text-white/40 text-sm">Click a submission to vote for it</p>
                  )}
                </div>
              )}

              {/* Submitted Cards (judging phase) */}
              {phase === 'judging' && isJudge && (
                <div className="flex flex-col items-center gap-4">
                  <p className="text-white/60">
                    {room.mode === 'two-votes' && room.firstWinnerSubmissionId
                      ? 'Pick the second winner:'
                      : room.mode === 'two-votes'
                      ? 'Pick the first winner:'
                      : room.mode === 'battle-royale'
                      ? 'Pick the deadliest answer:'
                      : 'Pick the best answer:'}
                  </p>
                  {room.mode === 'two-votes' && room.firstWinnerSubmissionId && (
                    <p className="text-xs text-accent">
                      First winner: {(() => {
                        const firstSub = room.submittedCards.find((s) => s.submissionId === room.firstWinnerSubmissionId);
                        const firstPlayer = firstSub ? room.players.find((p: Player) => p.id === firstSub.playerId) : null;
                        return firstPlayer?.name || 'Unknown';
                      })()}
                    </p>
                  )}
                  <div className="flex flex-wrap justify-center gap-4">
                    {submittedCards.map((sub: { playerId: string; cards: CardType[]; effectCard?: CardType; isReSubmit?: boolean; submissionId: string }) => {
                      const player = room.players.find((p: Player) => p.id === sub.playerId);
                      const isFirstWinner = room.firstWinnerSubmissionId === sub.submissionId;
                      const disabled = isFirstWinner;
                      return (
                        <button
                          key={sub.submissionId}
                          onClick={() => {
                            if (!disabled) handleJudgePick(sub.submissionId);
                          }}
                          className={`flex flex-col items-center gap-2 group ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                        >
                          <div className="flex gap-2 items-center">
                            {sub.cards.map((c) => (
                              <Card key={c.id} card={c} size="md" />
                            ))}
                            {sub.effectCard && (
                              <div className="flex flex-col items-center gap-1">
                                <Card card={sub.effectCard} size="sm" />
                                <span className="text-[10px] text-yellow-400 font-bold uppercase">Effect</span>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            {sub.isReSubmit && (
                              <span className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-accent/20 text-accent font-bold uppercase">
                                <Flag size={10} /> Re-Submit
                              </span>
                            )}
                            {isFirstWinner && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 font-bold uppercase">
                                1st Winner
                              </span>
                            )}
                            {phase !== 'judging' && (
                              <span className="text-xs text-white/40 group-hover:text-white transition-colors">
                                by {player?.name || 'Unknown'}
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {phase === 'judging' && !isJudge && (
                <div className="flex flex-col items-center gap-4">
                  <div className="w-16 h-16 border-4 border-accent/20 border-t-accent rounded-full animate-spin" />
                  <p className="text-white/60">
                    {room.mode === 'two-votes' && room.firstWinnerSubmissionId
                      ? 'Waiting for the judge to pick the second winner...'
                      : room.mode === 'battle-royale'
                      ? 'Waiting for the judge to pick the deadliest answer...'
                      : 'Waiting for the judge to pick a winner...'}
                  </p>
                </div>
              )}

              {phase === 'playing' && isJudge && (
                <div className="flex flex-col items-center gap-4">
                  <div className="w-16 h-16 border-4 border-accent/20 border-t-accent rounded-full animate-spin" />
                  <p className="text-white/60">Waiting for players to submit their cards...</p>
                  <p className="text-white/40 text-sm">{submittedCards.length} / {expectedSubmitters} submitted</p>
                </div>
              )}
            </div>
            {scoreboardPanel}
          </div>
        )}

        {/* Reveal Phase */}
        {phase === 'reveal' && (
          <div className="flex flex-col items-center gap-6 animate-bounce-in w-full max-w-3xl mx-auto">
            <div className="text-center">
              <Trophy size={48} className="text-accent mx-auto mb-2" />
              <p className="text-2xl font-bold">
                {room.players.find((p: Player) => p.id === winnerId)?.name} wins the round!
              </p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <p className="text-white/40 text-sm font-bold uppercase tracking-wider">Winning Answer</p>
              <div className="flex gap-2 items-center">
                {winningCards.map((c: CardType) => (
                  <Card key={c.id} card={c} size="lg" />
                ))}
              </div>
            </div>
            {submittedCards.filter((s: { playerId: string }) => s.playerId !== winnerId).length > 0 && (
              <div className="flex flex-col items-center gap-3 w-full max-w-2xl">
                <p className="text-white/40 text-sm font-bold uppercase tracking-wider">Other Submissions</p>
                <div className="flex flex-wrap justify-center gap-4">
                  {submittedCards.filter((s: { playerId: string }) => s.playerId !== winnerId).map((sub: { playerId: string; cards: CardType[]; effectCard?: CardType; submissionId: string; isReSubmit?: boolean }) => {
                    const player = room.players.find((p: Player) => p.id === sub.playerId);
                    return (
                      <div key={sub.submissionId} className="flex flex-col items-center gap-2 opacity-60">
                        <div className="flex gap-2 items-center">
                          {sub.cards.map((c) => (
                            <Card key={c.id} card={c} size="sm" />
                          ))}
                          {sub.effectCard && (
                            <div className="flex flex-col items-center gap-1">
                              <Card card={sub.effectCard} size="sm" />
                              <span className="text-[10px] text-yellow-400 font-bold uppercase">Effect</span>
                            </div>
                          )}
                        </div>
                        <span className="text-xs text-white/40">by {player?.name || 'Unknown'}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Round End / Intermission */}
        {phase === 'round-end' && (
          <div className="flex flex-col items-center gap-6 animate-bounce-in w-full max-w-3xl mx-auto">
            {/* Winner display */}
            <div className="text-center">
              <Trophy size={48} className="text-accent mx-auto mb-2" />
              <p className="text-2xl font-bold">
                {room.mode === 'two-votes' && secondWinnerId
                  ? `${room.players.find((p: Player) => p.id === winnerId)?.name} & ${room.players.find((p: Player) => p.id === secondWinnerId)?.name} win the round!`
                  : `${room.players.find((p: Player) => p.id === winnerId)?.name} wins the round!`}
              </p>
              {roundSummary && (
                <p className="text-accent font-semibold mt-1">
                  {roundSummary.currencyEarned[myPlayer?.name || ''] > 0
                    ? `You earned $${roundSummary.currencyEarned[myPlayer?.name || ''].toFixed(2)} this round!`
                    : ''}
                </p>
              )}
            </div>

            {/* Scoreboard + Currency */}
            {finalScores && (
              <div className="flex flex-col gap-2 w-full max-w-md">
                <div className="text-xs text-white/40 font-bold uppercase tracking-wider">Scoreboard</div>
                <div className="grid grid-cols-[2.5rem_1fr_3.5rem_4.5rem] gap-2 px-4 py-1 text-xs font-bold uppercase tracking-wider text-white/40 border-b border-border items-center">
                  <span>#</span>
                  <span>Player</span>
                  <span className="text-right">Wins</span>
                  <span className="text-right">$🤑</span>
                </div>
                {room.players
                  .slice()
                  .sort((a, b) => (finalScores[b.name] ?? 0) - (finalScores[a.name] ?? 0))
                  .map((p, idx) => {
                    const inGameRank = idx + 1;
                    return (
                      <div key={p.id} className={`grid grid-cols-[2.5rem_1fr_3.5rem_4.5rem] gap-2 px-4 py-2 rounded-lg items-center ${
                        p.id === gameState?.myPlayerId ? 'bg-accent/10 ring-1 ring-accent/30' : 'bg-surface-light'
                      }`}>
                        <span className={`font-bold text-xs ${inGameRank <= 3 ? 'text-accent' : 'text-white/40'}`}>
                          #{inGameRank}
                        </span>
                        <span className="font-semibold text-sm truncate">{p.name}</span>
                        <span className="font-bold text-sm text-right">{p.score}</span>
                        <span className="font-bold text-sm text-right text-accent">${roundSummary?.currencyEarned[p.name]?.toFixed(2) ?? '0.00'}</span>
                      </div>
                    );
                  })}
              </div>
            )}

            {/* Damage Log — Battle Royale only */}
            {room.mode === 'battle-royale' && damageLog.length > 0 && (
              <div className="flex flex-col gap-2 w-full max-w-md">
                <div className="text-xs text-red-400 font-bold uppercase tracking-wider">Combat Log</div>
                <div className="flex flex-col gap-1 bg-surface-light/50 rounded-lg p-3 max-h-40 overflow-y-auto">
                  {damageLog.map((entry, i) => (
                    <span key={i} className="text-xs text-white/70">• {entry}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Effects Used */}
            {roundSummary && roundSummary.effectsUsed.length > 0 && (
              <div className="flex flex-col gap-2 w-full max-w-md">
                <div className="text-xs text-white/40 font-bold uppercase tracking-wider">Effects Used</div>
                <div className="flex flex-wrap gap-2">
                  {roundSummary.effectsUsed.map((e, i) => (
                    <span key={i} className="text-xs px-2 py-1 rounded-full bg-yellow-500/10 text-yellow-400">
                      {e.playerName}: {e.effectType.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Shop Cards */}
            {room.shopCards.length > 0 && !room.shopPurchasedBy.includes(gameState?.myPlayerId || '') && !hasContinued && (
              <div className="flex flex-col gap-2 w-full max-w-md">
                <div className="text-xs text-white/40 font-bold uppercase tracking-wider">Shop — $5 each</div>
                <div className="flex flex-wrap justify-center gap-3">
                  {room.shopCards.map((card: CardType) => (
                    <div key={card.id} className="flex flex-col items-center gap-2">
                      <Card card={card} size="sm" />
                      <button
                        onClick={() => {
                          emit('buy-shop-card', card.id, (success: boolean, remaining: number) => {
                            if (success) {
                              setNotification(`Bought effect card! $${remaining.toFixed(2)} remaining`);
                              setTimeout(() => setNotification(''), 3000);
                              playChime();
                            } else {
                              setNotification('Could not buy card. Check your funds or stock.');
                              setTimeout(() => setNotification(''), 3000);
                              playError();
                            }
                          });
                          playClick();
                        }}
                        disabled={(myPlayer?.currency ?? 0) < 5}
                        className="btn-primary text-xs px-3 py-1 disabled:opacity-40"
                      >
                        Buy ($5)
                      </button>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-white/40 text-center">
                  Your funds: ${(myPlayer?.currency ?? 0).toFixed(2)}
                </p>
              </div>
            )}
            {room.shopPurchasedBy.includes(gameState?.myPlayerId || '') && (
              <p className="text-xs text-white/40">You already bought from the shop this round.</p>
            )}

            {/* Ready / Waiting */}
            {!hasContinued ? (
              <div className="flex flex-col items-center gap-3">
                <button
                  onClick={() => {
                    emit('player-ready');
                    setHasContinued(true);
                    playClick();
                  }}
                  className="btn-primary flex items-center gap-2"
                >
                  <CheckCircle size={16} />
                  Continue
                </button>
                {isJudge && (
                  <button
                    onClick={() => {
                      emit('force-next-round');
                      playClick();
                    }}
                    className="text-xs text-white/40 hover:text-white transition-colors"
                  >
                    Force Start Next Round
                  </button>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                <p className="text-white/60">Waiting for other players to continue...</p>
                <p className="text-xs text-white/40">
                  {room.readyPlayerIds.length} / {room.mode === 'battle-royale' ? room.players.filter((p: Player) => p.isConnected && p.health > 0).length : room.players.filter((p: Player) => p.isConnected).length} ready
                </p>
                <div className="flex flex-col gap-1">
                  {room.players.map((p: Player) => {
                    const isEliminated = room.mode === 'battle-royale' && p.health <= 0;
                    return (
                    <div key={p.id} className={`flex items-center gap-2 text-xs ${isEliminated ? 'opacity-40' : ''}`}>
                      <div className={`w-2 h-2 rounded-full ${isEliminated ? 'bg-gray-500' : room.readyPlayerIds.includes(p.id) ? 'bg-green-500' : p.isConnected ? 'bg-yellow-500' : 'bg-red-500'}`} />
                      <span className={p.id === gameState?.myPlayerId ? 'text-accent font-bold' : 'text-white/60'}>
                        {p.name} {isEliminated ? '(eliminated)' : room.readyPlayerIds.includes(p.id) ? '(ready)' : p.isConnected ? '(waiting)' : '(disconnected)'}
                      </span>
                    </div>
                  );})}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      <ChatPanel myPlayerId={gameState?.myPlayerId} myPlayerName={myPlayer?.name} />
    </div>
  </div>
  );
}
