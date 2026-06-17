import React, { useState, useEffect } from 'react';
import type { Card as CardType, CardEffectType } from '../../shared/types.js';
import { PenLine } from 'lucide-react';

interface CardProps {
  card: CardType;
  onClick?: () => void;
  disabled?: boolean;
  selected?: boolean;
  size?: 'sm' | 'compact' | 'md' | 'lg';
  revealed?: boolean;
  className?: string;
}

function effectLabel(type: CardEffectType): string {
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
  return labels[type] || type;
}

export default function Card({
  card,
  onClick,
  disabled = false,
  selected = false,
  size = 'md',
  revealed = true,
  className = '',
}: CardProps) {
  const isBlack = card.type === 'black';
  const isEffect = !!card.effect;
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Mobile text-based rendering — compact, legible, no fixed dimensions
  if (isMobile) {
    if (!revealed) {
      return (
        <button
          onClick={onClick}
          disabled={disabled}
          className={`
            w-full p-4 rounded-xl bg-surface-light border border-border
            flex items-center justify-center
            ${disabled ? 'opacity-50 cursor-not-allowed' : onClick ? 'cursor-pointer active:scale-95' : ''}
            ${selected ? 'ring-2 ring-accent shadow-lg' : ''}
            transition-all duration-150
            ${className}
          `}
        >
          <span className="text-accent font-bold text-lg">?</span>
        </button>
      );
    }

    const baseMobile = `
      w-full p-3 rounded-xl border-2 text-left font-semibold text-sm leading-snug
      transition-all duration-150
      ${disabled ? 'opacity-50 cursor-not-allowed' : onClick ? 'cursor-pointer active:scale-[0.98]' : ''}
      ${selected ? 'ring-2 ring-accent shadow-lg scale-[0.98]' : ''}
      ${className}
    `;

    const styleMobile = isBlack
      ? 'bg-[#1a1a2e] text-white border-white/50'
      : isEffect
      ? 'bg-yellow-100 text-black border-yellow-500'
      : 'bg-white text-black border-gray-400';

    return (
      <button
        onClick={onClick}
        disabled={disabled}
        className={`${baseMobile} ${styleMobile}`}>
        <div className="flex flex-col gap-1 w-full">
          {isEffect && card.effect && (
            <span className="self-start text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-yellow-500 text-black">
              {effectLabel(card.effect.type)}
            </span>
          )}
          {card.isBlank ? (
            <div className="flex items-center gap-2 opacity-60">
              <PenLine size={16} />
              <span className="text-xs">Blank Card</span>
            </div>
          ) : (
            <span className="break-words">{card.text}</span>
          )}
          {isBlack && card.pickCount != null && card.pickCount > 1 && (
            <span className="text-[10px] opacity-60 mt-0.5">Pick {card.pickCount}</span>
          )}
        </div>
      </button>
    );
  }

  // Desktop card rendering — unchanged
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
        ${className}
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
            <div className="flex flex-col gap-2 w-full">
              {isEffect && card.effect && (
                <span className="self-start text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-yellow-500 text-black">
                  {effectLabel(card.effect.type)}
                </span>
              )}
              <span className="font-bold leading-snug">{card.text}</span>
            </div>
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
