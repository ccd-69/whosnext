import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import Card from './Card';
import type { GameState, GamePhase, Player } from '../../shared/types';
import { ArrowLeft, Trophy, Clock, User, CheckCircle } from 'lucide-react';

export default function GameBoard() {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const { emit, on, connected } = useSocket();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [phase, setPhase] = useState<GamePhase>('lobby');
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [winnerId, setWinnerId] = useState<string | null>(null);
  const [finalScores, setFinalScores] = useState<Record<string, number> | null>(null);
  const [notification, setNotification] = useState('');

  useEffect(() => {
    if (!connected) return;

    const unsubState = on('game-state', (state) => {
      setGameState(state);
      setPhase(state.room.phase);
    });

    const unsubPhase = on('phase-change', (newPhase) => {
      setPhase(newPhase);
    });

    const unsubRoundStart = on('round-start', () => {
      setSelectedCardId(null);
      setWinnerId(null);
      setNotification('New round started!');
      setTimeout(() => setNotification(''), 3000);
    });

    const unsubJudgePicked = on('judge-picked', (wid) => {
      setWinnerId(wid);
    });

    const unsubRoundEnd = on('round-end', (scores) => {
      setFinalScores(scores);
    });

    const unsubGameOver = on('game-over', (scores, winner) => {
      setPhase('game-over');
      setFinalScores(scores);
      setWinnerId(winner);
    });

    const unsubError = on('error', (msg) => {
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
    };
  }, [connected, on]);

  function handlePlayCard() {
    if (!selectedCardId) return;
    emit('play-card', selectedCardId, (success: boolean) => {
      if (success) {
        setSelectedCardId(null);
        setNotification('Card played!');
        setTimeout(() => setNotification(''), 2000);
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

  const room = gameState?.room;
  const myPlayer = room?.players.find((p) => p.id === gameState?.myPlayerId);
  const isJudge = myPlayer?.id === room?.judgeId;
  const blackCard = room?.blackCard;
  const submittedCards = room?.submittedCards || [];
  const allPlayed = submittedCards.length >= (room?.players.length || 0) - 1;

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

  // Game Over Screen
  if (phase === 'game-over') {
    const winner = room.players.find((p) => p.id === winnerId);
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
            <button onClick={() => navigate('/')} className="btn-secondary flex-1">
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
          onClick={() => navigate('/')}
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
            {room.players.map((p) => (
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

      {/* Main Game Area */}
      <div className="flex-1 flex flex-col items-center justify-center gap-8 px-4 py-6 overflow-auto">
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
              {submittedCards.map((sub) => {
                const player = room.players.find((p) => p.id === sub.playerId);
                return (
                  <button
                    key={sub.card.id}
                    onClick={() => handleJudgePick(sub.playerId)}
                    className="flex flex-col items-center gap-2 group"
                  >
                    <Card card={sub.card} size="md" />
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
            <div className="w-16 h-16 border-4 border-accent/20 border-t-accent rounded-full animate-spin" />
            <p className="text-white/60">Waiting for the judge to pick a winner...</p>
          </div>
        )}

        {/* Playing phase */}
        {phase === 'playing' && !isJudge && (
          <div className="flex flex-col items-center gap-4 w-full max-w-4xl">
            <p className="text-white/60">Pick your best answer:</p>
            <div className="flex flex-wrap justify-center gap-3">
              {gameState.hand.map((card) => (
                <Card
                  key={card.id}
                  card={card}
                  onClick={() => setSelectedCardId(card.id === selectedCardId ? null : card.id)}
                  selected={card.id === selectedCardId}
                  size="md"
                />
              ))}
            </div>
            {selectedCardId && (
              <button onClick={handlePlayCard} className="btn-primary flex items-center gap-2">
                <CheckCircle size={18} />
                Submit Answer
              </button>
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

        {/* Reveal / Round End */}
        {(phase === 'reveal' || phase === 'round-end') && winnerId && (
          <div className="flex flex-col items-center gap-6 animate-bounce-in">
            <div className="text-center">
              <Trophy size={48} className="text-accent mx-auto mb-2" />
              <p className="text-2xl font-bold">
                {room.players.find((p) => p.id === winnerId)?.name} wins the round!
              </p>
              <div className="flex flex-wrap justify-center gap-4 mt-4">
                {submittedCards.map((sub) => (
                  <Card
                    key={sub.card.id}
                    card={sub.card}
                    size="md"
                    selected={sub.playerId === winnerId}
                  />
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
