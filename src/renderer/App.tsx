import React from 'react';
import { Routes, Route } from 'react-router-dom';
import TitleScreen from './components/TitleScreen';
import Lobby from './components/Lobby';
import GameBoard from './components/GameBoard';

export default function App() {
  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden">
      <Routes>
        <Route path="/" element={<TitleScreen />} />
        <Route path="/lobby/:mode" element={<Lobby />} />
        <Route path="/game/:roomCode" element={<GameBoard />} />
      </Routes>
    </div>
  );
}
