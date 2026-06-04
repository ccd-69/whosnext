import React from 'react';
import { Routes, Route } from 'react-router-dom';
import TitleScreen from './components/TitleScreen.js';
import Lobby from './components/Lobby.js';
import GameBoard from './components/GameBoard.js';
import TitleBar from './components/TitleBar.js';

export default function App() {
  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden">
      <TitleBar />
      <div className="flex-1 overflow-hidden">
        <Routes>
          <Route path="/" element={<TitleScreen />} />
          <Route path="/lobby/:mode" element={<Lobby />} />
          <Route path="/game/:roomCode" element={<GameBoard />} />
        </Routes>
      </div>
    </div>
  );
}
