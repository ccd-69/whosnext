import React from 'react';
import type { Card as CardType } from '../../shared/types.js';
import { PenLine } from 'lucide-react';

interface CardProps {
  card: CardType;
  onClick?: () => void;
  disabled?: boolean;
  selected?: boolean;
  size?: 'sm' | 'compact' | 'md' | 'lg';
  revealed?: boolean;
}

export default function Card({
  card,
  onClick,
  disabled = false,
  selected = false,
  size = 'md',
  revealed = true,
}: CardProps) {
  const isBlack = card.type === 'black';
  const isEffect = !!card.effect;

  const sizeClasses = {
    sm: 'w-40 h-28 text-xs p-3',
    compact: 'w-40 h-52 text-xs p-3',
    md: 'w-52 h-72 text-sm p-4',
    lg: 'w-64 h-96 text-base p-6',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        ${sizeClasses[size]}
        ${isBlack ? 'card-black' : isEffect ? 'card-effect' : 'card-white'}
        rounded-xl shadow-lg
        flex flex-col justify-between items-start text-left
        transition-all duration-200
        ${onClick && !disabled ? 'hover:-translate-y-2 hover:shadow-xl cursor-pointer' : ''}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${selected ? 'ring-2 ring-accent -translate-y-2 shadow-xl' : ''}
        ${!revealed ? 'bg-surface-light' : ''}
      `}
    >
      {revealed ? (
        <>
          {card.isBlank ? (
            <div className="flex flex-col items-center justify-center gap-2 h-full w-full">
              <PenLine size={24} className={isBlack ? 'text-white/40' : 'text-black/40'} />
              <span className={`text-xs font-bold uppercase tracking-wider ${isBlack ? 'text-white/40' : 'text-black/40'}`}>
                Blank Card
              </span>
              <span className={`text-[10px] ${isBlack ? 'text-white/30' : 'text-black/30'}`}>
                Write your own answer
              </span>
            </div>
          ) : (
            <span className="font-bold leading-snug">{card.text}</span>
          )}
          {isBlack && card.pickCount != null && card.pickCount > 1 && (
            <span className="text-xs opacity-60 mt-2">Pick {card.pickCount}</span>
          )}
          <span className={`text-[10px] font-bold uppercase tracking-wider mt-auto ${isBlack ? 'text-white/40' : isEffect ? 'text-yellow-600/60' : 'text-black/40'}`}>
            {isBlack ? "Who's Next?" : isEffect ? 'Effect Card' : 'Answer Card'}
          </span>
        </>
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center">
            <span className="text-accent font-bold text-lg">?</span>
          </div>
        </div>
      )}
    </button>
  );
}
