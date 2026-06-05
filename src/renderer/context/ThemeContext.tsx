import React, { createContext, useContext, useState, useEffect } from 'react';

export type ThemeId =
  | 'void' | 'cyber' | 'arcade' | 'matrix' | 'aurora' | 'space' | 'party' | 'spooky'
  | 'ember' | 'glitch' | 'holo' | 'synthwave' | 'quantum' | 'nebula' | 'midnight' | 'gold';

export interface ThemeDef {
  id: ThemeId;
  name: string;
  color: string;
  icon: string;
  cost: number;
}

export const THEMES: ThemeDef[] = [
  { id: 'void',      name: 'Dark Void',     color: '#27273a', icon: 'Moon',        cost: 0 },
  { id: 'cyber',     name: 'Neon Cyber',    color: '#00f0ff', icon: 'Cpu',         cost: 150 },
  { id: 'arcade',    name: 'Retro Arcade',  color: '#ff2a6d', icon: 'Gamepad2',    cost: 200 },
  { id: 'matrix',    name: 'Matrix',        color: '#05ffa1', icon: 'Terminal',      cost: 175 },
  { id: 'aurora',    name: 'Aurora',        color: '#a78bfa', icon: 'Sparkles',      cost: 225 },
  { id: 'space',     name: 'Deep Space',    color: '#e2e8f0', icon: 'Star',        cost: 250 },
  { id: 'party',     name: 'Party Pop',     color: '#facc15', icon: 'PartyPopper', cost: 275 },
  { id: 'spooky',    name: 'Spooky Night',  color: '#fb923c', icon: 'Ghost',       cost: 300 },
  { id: 'ember',     name: 'Emberfall',     color: '#ef4444', icon: 'Flame',       cost: 325 },
  { id: 'glitch',    name: 'Glitch Void',   color: '#d946ef', icon: 'Zap',         cost: 350 },
  { id: 'holo',      name: 'Holographic',   color: '#06b6d4', icon: 'Rainbow',       cost: 400 },
  { id: 'synthwave', name: 'Synthwave',     color: '#f43f5e', icon: 'Sunset',      cost: 425 },
  { id: 'quantum',   name: 'Quantum',       color: '#8b5cf6', icon: 'Atom',        cost: 450 },
  { id: 'nebula',    name: 'Nebula',        color: '#ec4899', icon: 'Cloud',       cost: 475 },
  { id: 'midnight',  name: 'Midnight Gold', color: '#fbbf24', icon: 'Crown',       cost: 500 },
  { id: 'gold',      name: 'Solid Gold',    color: '#f59e0b', icon: 'Gem',         cost: 600 },
];

interface ThemeContextValue {
  theme: ThemeId;
  setTheme: (t: ThemeId) => void;
  themes: ThemeDef[];
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'void',
  setTheme: () => {},
  themes: THEMES,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(() => {
    try {
      const saved = localStorage.getItem('whosnext-theme') as ThemeId;
      if (saved && THEMES.some((t) => t.id === saved)) return saved;
    } catch { /* noop */ }
    return 'void';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('whosnext-theme', theme);
    } catch { /* noop */ }
  }, [theme]);

  const setTheme = (t: ThemeId) => setThemeState(t);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
