import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext.js';
import TitleScreen from './components/TitleScreen.js';
import Lobby from './components/Lobby.js';
import GameBoard from './components/GameBoard.js';
import TitleBar from './components/TitleBar.js';
import ActiveBackground from './components/Backgrounds.js';
import ThemePicker from './components/ThemePicker.js';
import ErrorBoundary from './components/ErrorBoundary.js';
import MobileDebugHUD from './components/MobileDebugHUD.js';

export default function App() {
  return (
    <ThemeProvider>
      <div className="h-screen w-screen flex flex-col overflow-hidden relative">
        <ActiveBackground />
        <TitleBar />
        <div className="flex-1 overflow-hidden relative z-10">
          <ErrorBoundary>
            <Routes>
              <Route path="/" element={<TitleScreen />} />
              <Route path="/lobby/:mode" element={<Lobby />} />
              <Route path="/game/:roomCode" element={<GameBoard />} />
            </Routes>
          </ErrorBoundary>
        </div>
        <ThemePicker />
        <MobileDebugHUD />
      </div>
    </ThemeProvider>
  );
}
