import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket.js';
import Card from './Card.js';
import type { GameState, GamePhase, Player, Card as CardType, CardPlay } from '../../shared/types.js';
import { ArrowLeft, Trophy, Clock, User, CheckCircle, Crown, Settings, PenLine, Zap, Eye, Ban, Shuffle, Plus, Minus } from 'lucide-react';
import { playClick, playSubmit, playChime, playWin, playError, playJoin } from '../audio/sound.js';

export default function GameBoard() {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const { emit, on, connected } = useSocket();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [phase, setPhase] = useState<GamePhase>('lobby');
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const [winnerId, setWinnerId] = useState<string | null>(null);
  const [winningCards, setWinningCards] = useState<CardType[]>([]);
  const [finalScores, setFinalScores] = useState<Record<string, number> | null>(null);
  const [notification, setNotification] = useState('');
  const [blankModalOpen, setBlankModalOpen] = useState(false);
  const [blankText, setBlankText] = useState('');
  const [blankSelections, setBlankSelections] = useState<string[]>([]);

  useEffect(() => {
    if (!connected) return;

    const unsubState = on('game-state', (state: GameState) => {
      setGameState(state);
      setPhase(state.room.phase);
    });

    const unsubPhase = on('phase-change', (newPhase: GamePhase) => {
      setPhase(newPhase);
    });

    const unsubRoundStart = on('round-start', () => {
      setSelectedCardIds([]);
      setBlankSelections([]);
      setBlankText('');
      setWinnerId(null);
      setWinningCards([]);
      setNotification('New round started!');
      setTimeout(() => setNotification(''), 3000);
      playChime();
    });

    const unsubJudgePicked = on('judge-picked', (wid: string, wcards: CardType[]) => {
      setWinnerId(wid);
      setWinningCards(wcards);
      playWin();
    });

    const unsubRoundEnd = on('round-end', (scores: Record<string, number>) => {
      setFinalScores(scores);
    });

    const unsubGameOver = on('game-over', (scores: Record<string, number>, winner: string) => {
      setPhase('game-over');
      setFinalScores(scores);
      setWinnerId(winner);
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

    return () => {
      unsubState();
      unsubPhase();
      unsubRoundStart();
      unsubJudgePicked();
      unsubRoundEnd();
      unsubGameOver();
      unsubError();
      unsubNotify();
    };
  }, [connected, on]);

  function handlePlayCard() {
    const totalSelections = selectedCardIds.length + blankSelections.length;
    if (totalSelections === 0 || totalSelections !== pickCount) return;
    const plays: CardPlay[] = [
      ...selectedCardIds.map((id) => ({ cardId: id })),
      ...blankSelections.map((text) => ({ cardId: '__blank__', customText: text })),
    ];
    emit('play-card', plays, (success: boolean) => {
      if (success) {
        setSelectedCardIds([]);
        setBlankSelections([]);
        setBlankText('');
        setNotification('Card played!');
        setTimeout(() => setNotification(''), 2000);
        playSubmit();
      }
    });
  }

  function handleJudgePick(playerId: string) {
    emit('judge-pick', playerId, (success: boolean) => {
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

  function handleLeave() {
    emit('leave-room');
    navigate('/');
  }

  const room = gameState?.room;
  const myPlayer = room?.players.find((p: Player) => p.id === gameState?.myPlayerId);
  const isJudge = myPlayer?.id === room?.judgeId;
  const blackCard = room?.blackCard;
  const submittedCards = room?.submittedCards || [];
  const allPlayed = submittedCards.length >= (room?.players.length || 0) - 1;
  const pickCount = blackCard?.pickCount || 1;
  const blankCardsRemaining = myPlayer?.blankCardsRemaining ?? 0;
  const totalSelected = selectedCardIds.length + blankSelections.length;

  const isVanilla = room
    ? (room.mode === 'quick-play'
        ? room.maxPlayers === 8 && room.maxRounds === 10 && room.winningScore === 7
        : room.maxPlayers === 8 && room.maxRounds === 20 && room.winningScore === 5)
      && !room.blankCardsEnabled
      && !room.buffsEnabled
      && room.cardPacks.length === 1
      && room.cardPacks[0] === 'base'
    : false;

  const sortedPlayers = room ? [...room.players].sort((a, b) => b.score - a.score) : [];

  const scoreboardPanel = room && (
    <div className="flex flex-col gap-3 shrink-0 w-52 h-full overflow-y-auto py-2">
      {/* Game Info */}
      <div className="glass-card p-3 flex flex-col gap-2">
        <div className="text-xs text-white/40 font-bold uppercase tracking-wider">Game Info</div>
        <div className="font-bold text-sm truncate">{room.name}</div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
            room.mode === 'quick-play' ? 'bg-accent/20 text-accent' : 'bg-purple-500/20 text-purple-400'
          }`}>
            {room.mode === 'quick-play' ? 'Quick Play' : "Who's Next?"}
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
            <span>Win: {room.winningScore} pts</span>
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
          {sortedPlayers.map((p: Player) => (
            <div
              key={p.id}
              className={`flex items-center justify-between px-2 py-1.5 rounded-lg text-sm ${
                p.id === gameState?.myPlayerId ? 'bg-accent/10 ring-1 ring-accent/30' : 'bg-surface-light'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className={`w-2 h-2 rounded-full shrink-0 ${p.isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="font-semibold truncate">
                  {p.name}
                  {p.id === room.judgeId && <Crown size={12} className="inline text-accent ml-1" />}
                </span>
                {p.activeBuffs?.length > 0 && (
                  <div className="flex gap-0.5">
                    {p.activeBuffs.map((buff) => {
                      const iconProps = { size: 10, className: 'text-yellow-400' };
                      const icon = buff.type === 'double_points' ? <Zap {...iconProps} />
                        : buff.type === 'silence' ? <Ban {...iconProps} />
                        : buff.type === 'extra_card' ? <Plus {...iconProps} />
                        : buff.type === 'reveal_all' ? <Eye {...iconProps} />
                        : buff.type === 'hand_swap' ? <Shuffle {...iconProps} />
                        : <Minus {...iconProps} />;
                      return (
                        <span key={buff.id} title={buff.type.replace(/_/g, ' ')} className="bg-yellow-500/10 rounded px-1">
                          {icon}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
              <span className="font-bold shrink-0">{p.score}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  if (!gameState || !room) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-white/60">Loading game...</p>
        </div>
      </div>
    );
  }

  // Returned to lobby (not enough players, etc.)
  if (phase === 'lobby') {
    return (
      <div className="flex h-full flex-col items-center justify-center px-4">
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
    const sortedPlayers = [...room.players].sort((a, b) => b.score - a.score);

    return (
      <div className="flex h-full flex-col items-center justify-center px-4 overflow-auto">
        <div className="glass-card p-8 max-w-lg w-full flex flex-col gap-6 animate-bounce-in">
          <div className="text-center">
            <Trophy size={64} className="text-accent mx-auto mb-4" />
            <h2 className="text-4xl font-black mb-2">Game Over!</h2>
            <p className="text-xl text-white/80">
              {winner?.name || 'Someone'} wins!
            </p>
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
                </div>
                <span className="text-xl font-bold">{p.score}</span>
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
          <div className="flex items-center gap-2">
            {room.players.map((p: Player) => (
              <div
                key={p.id}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
                  p.id === room.judgeId
                    ? 'bg-accent/20 text-accent'
                    : 'bg-surface-light text-white/60'
                }`}
                title={`${p.name}: ${p.score} points`}
              >
                <User size={12} />
                <span>{p.name}</span>
                <span className="opacity-60">({p.score})</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-accent text-black px-6 py-2 rounded-full font-bold text-sm animate-fade-in shadow-lg">
          {notification}
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

      {/* Main Game Area */}
      <div className="flex-1 flex flex-col items-center justify-center gap-8 px-4 py-6 overflow-auto">
        {/* Playing phase — horizontal layout: black card left, hand center, scoreboard right */}
        {phase === 'playing' && !isJudge && blackCard && (
          <div className="flex flex-row items-start justify-center gap-4 w-full h-full overflow-hidden px-4">
            {/* Black Card Column */}
            <div className="flex flex-col items-center gap-2 shrink-0 py-2">
              <div className="text-white/40 text-xs font-bold uppercase tracking-wider">Question Card</div>
              <Card card={blackCard} size="md" />
            </div>

            {/* Hand Column */}
            <div className="flex flex-col items-center gap-3 flex-1 min-w-0 h-full overflow-hidden">
              <p className="text-white/60 shrink-0 pt-2">
                Pick {pickCount > 1 ? `${pickCount} cards` : 'your best answer'}
                {totalSelected > 0 && ` (${totalSelected}/${pickCount})`}
              </p>
              <div className="flex flex-wrap justify-center gap-3 overflow-y-auto px-2 pb-2">
                {gameState.hand.map((card: CardType) => {
                  const isSelected = selectedCardIds.includes(card.id);
                  const canSelect = isSelected || totalSelected < pickCount;
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
              {room.blankCardsEnabled && blankCardsRemaining > 0 && totalSelected < pickCount && (
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

              {totalSelected === pickCount && (
                <button onClick={handlePlayCard} className="btn-primary flex items-center gap-2 shrink-0 mb-2">
                  <CheckCircle size={18} />
                  Submit Answer
                </button>
              )}
            </div>

            {scoreboardPanel}
          </div>
        )}

        {/* Judge waiting + Judging phases — row layout with scoreboard */}
        {!(phase === 'playing' && !isJudge) && (phase === 'playing' || phase === 'judging') && (
          <div className="flex flex-row items-start justify-center gap-4 w-full h-full overflow-hidden px-4">
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

              {/* Submitted Cards (judging phase) */}
              {phase === 'judging' && isJudge && (
                <div className="flex flex-col items-center gap-4">
                  <p className="text-white/60">Pick the best answer:</p>
                  <div className="flex flex-wrap justify-center gap-4">
                    {submittedCards.map((sub: { playerId: string; cards: CardType[] }) => {
                      const player = room.players.find((p: Player) => p.id === sub.playerId);
                      return (
                        <button
                          key={sub.playerId}
                          onClick={() => handleJudgePick(sub.playerId)}
                          className="flex flex-col items-center gap-2 group"
                        >
                          <div className="flex gap-2">
                            {sub.cards.map((c) => (
                              <Card key={c.id} card={c} size="md" />
                            ))}
                          </div>
                          <span className="text-xs text-white/40 group-hover:text-white transition-colors">
                            by {player?.name || 'Unknown'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {phase === 'judging' && !isJudge && (
                <div className="flex flex-col items-center gap-4">
                  {room.players.some((p: Player) => p.activeBuffs?.some((b) => b.type === 'reveal_all')) ? (
                    <div className="flex flex-col items-center gap-4 animate-bounce-in">
                      <p className="text-accent font-bold text-sm">Reveal All: Everyone can see the cards!</p>
                      <div className="flex flex-wrap justify-center gap-4">
                        {submittedCards.map((sub: { playerId: string; cards: CardType[] }) => {
                          const player = room.players.find((p: Player) => p.id === sub.playerId);
                          return (
                            <div key={sub.playerId} className="flex flex-col items-center gap-1 opacity-70">
                              <div className="flex gap-2">
                                {sub.cards.map((c) => (
                                  <Card key={c.id} card={c} size="sm" />
                                ))}
                              </div>
                              <span className="text-[10px] text-white/40">{player?.name || 'Unknown'}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="w-16 h-16 border-4 border-accent/20 border-t-accent rounded-full animate-spin" />
                      <p className="text-white/60">Waiting for the judge to pick a winner...</p>
                    </>
                  )}
                </div>
              )}

              {phase === 'playing' && isJudge && (
                <div className="flex flex-col items-center gap-4">
                  <div className="w-16 h-16 border-4 border-accent/20 border-t-accent rounded-full animate-spin" />
                  <p className="text-white/60">Waiting for players to submit their cards...</p>
                  <p className="text-white/40 text-sm">{submittedCards.length} / {room.players.length - 1} submitted</p>
                </div>
              )}
            </div>
            {scoreboardPanel}
          </div>
        )}

        {/* Reveal / Round End — centered, no scoreboard */}
        {(phase === 'reveal' || phase === 'round-end') && winnerId && (
          <div className="flex flex-col items-center gap-6 animate-bounce-in">
            <div className="text-center">
              <Trophy size={48} className="text-accent mx-auto mb-2" />
              <p className="text-2xl font-bold">
                {room.players.find((p: Player) => p.id === winnerId)?.name} wins the round!
              </p>
              <div className="flex flex-wrap justify-center gap-4 mt-4">
                {submittedCards.map((sub: { playerId: string; cards: CardType[] }) => (
                  <div key={sub.playerId} className={`flex gap-2 p-2 rounded-xl ${sub.playerId === winnerId ? 'bg-accent/20 ring-2 ring-accent' : ''}`}>
                    {sub.cards.map((c) => (
                      <Card key={c.id} card={c} size="md" />
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {finalScores && (
              <div className="flex flex-col gap-2 w-full max-w-md">
                {Object.entries(finalScores)
                  .sort(([, a], [, b]) => b - a)
                  .map(([name, score]) => (
                    <div key={name} className="flex justify-between px-4 py-2 bg-surface-light rounded-lg">
                      <span className="font-semibold">{name}</span>
                      <span className="font-bold">{score}</span>
                    </div>
                  ))}
              </div>
            )}

            {isJudge && phase === 'round-end' && (
              <button onClick={handleNextRound} className="btn-primary">
                Next Round
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
