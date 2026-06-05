import React, { useEffect, useRef } from 'react';
import { useTheme } from '../context/ThemeContext.js';

/* === CSS-only backgrounds === */

function VoidBg() {
  return (
    <div className="absolute inset-0 pointer-events-none">
      <div className="absolute top-20 left-20 w-64 h-64 bg-accent/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
    </div>
  );
}

function CyberBg() {
  return (
    <div className="absolute inset-0 pointer-events-none">
      <div className="absolute inset-0 bg-cyber-grid opacity-30" />
      <div className="absolute top-10 left-10 w-72 h-72 bg-accent/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }} />
    </div>
  );
}

function ArcadeBg() {
  return (
    <div className="absolute inset-0 pointer-events-none">
      <div className="absolute inset-0 bg-arcade-grid opacity-40" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-48 bg-gradient-to-b from-accent/20 to-transparent" />
    </div>
  );
}

function AuroraBg() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <div className="bg-aurora-blob w-96 h-96 top-10 left-10 bg-purple-500" style={{ animationDelay: '0s' }} />
      <div className="bg-aurora-blob w-80 h-80 bottom-20 right-20 bg-teal-500" style={{ animationDelay: '-4s', animationDuration: '14s' }} />
      <div className="bg-aurora-blob w-72 h-72 top-1/2 left-1/2 bg-accent" style={{ animationDelay: '-8s', animationDuration: '16s' }} />
    </div>
  );
}

function PartyBg() {
  const bubbles = Array.from({ length: 20 }, (_, i) => ({
    size: Math.random() * 20 + 10,
    left: Math.random() * 100,
    delay: Math.random() * -10,
    duration: Math.random() * 6 + 8,
    color: ['#f472b6', '#a78bfa', '#34d399', '#facc15', '#60a5fa'][Math.floor(Math.random() * 5)],
  }));
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {bubbles.map((b, i) => (
        <div
          key={i}
          className="bg-party-bubble"
          style={{
            width: b.size,
            height: b.size,
            left: `${b.left}%`,
            bottom: '-5%',
            background: b.color,
            animationDelay: `${b.delay}s`,
            animationDuration: `${b.duration}s`,
          }}
        />
      ))}
    </div>
  );
}

function SpookyBg() {
  const orbs = Array.from({ length: 12 }, (_, i) => ({
    size: Math.random() * 8 + 4,
    left: Math.random() * 100,
    top: Math.random() * 100,
    delay: Math.random() * -8,
    duration: Math.random() * 6 + 6,
  }));
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {orbs.map((o, i) => (
        <div
          key={i}
          className="bg-spooky-orb"
          style={{
            width: o.size,
            height: o.size,
            left: `${o.left}%`,
            top: `${o.top}%`,
            background: '#fb923c',
            boxShadow: '0 0 10px #fb923c',
            animationDelay: `${o.delay}s`,
            animationDuration: `${o.duration}s`,
          }}
        />
      ))}
      <div className="absolute inset-0 bg-gradient-to-t from-orange-900/10 to-transparent" />
    </div>
  );
}

/* === Canvas backgrounds === */

function MatrixBg() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const cols = Math.floor(canvas.width / 16);
    const drops = Array.from({ length: cols }, () => Math.random() * -100);
    const chars = '0123456789ABCDEF';

    const draw = () => {
      ctx.fillStyle = 'rgba(0, 5, 0, 0.07)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#05ffa1';
      ctx.font = '14px monospace';

      for (let i = 0; i < drops.length; i++) {
        const char = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillText(char, i * 16, drops[i] * 16);
        if (drops[i] * 16 > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
      animId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ opacity: 0.25 }}
    />
  );
}

function SpaceBg() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    interface Star {
      x: number;
      y: number;
      size: number;
      speed: number;
      brightness: number;
    }

    const stars: Star[] = Array.from({ length: 150 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 1.5 + 0.5,
      speed: Math.random() * 0.2 + 0.05,
      brightness: Math.random(),
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const star of stars) {
        star.brightness += star.speed;
        const opacity = 0.3 + Math.abs(Math.sin(star.brightness)) * 0.7;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(226, 232, 240, ${opacity})`;
        ctx.fill();
      }
      animId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
    />
  );
}

/* === New animated backgrounds === */

function EmberBg() {
  const particles = Array.from({ length: 30 }, (_, i) => ({
    size: Math.random() * 6 + 2,
    left: Math.random() * 100,
    delay: Math.random() * -10,
    duration: Math.random() * 6 + 8,
  }));
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {particles.map((p, i) => (
        <div
          key={i}
          className="bg-ember-particle"
          style={{
            width: p.size,
            height: p.size,
            left: `${p.left}%`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            background: `radial-gradient(circle, #ef4444, transparent)`,
            boxShadow: `0 0 ${p.size * 2}px #ef4444`,
          }}
        />
      ))}
      <div className="absolute inset-0 bg-gradient-to-t from-red-900/10 to-transparent" />
    </div>
  );
}

function GlitchBg() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <div className="bg-glitch-layer" />
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjQiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMiIvPjwvc3ZnPg==')] opacity-50" />
    </div>
  );
}

function HoloBg() {
  return (
    <div className="absolute inset-0 pointer-events-none">
      <div className="bg-holo-sheen" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-pink-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
    </div>
  );
}

function SynthwaveBg() {
  return (
    <div className="absolute inset-0 pointer-events-none">
      <div className="bg-synth-grid" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-64 h-64 bg-gradient-radial from-yellow-400/20 to-transparent rounded-full blur-2xl" />
    </div>
  );
}

function QuantumBg() {
  const orbs = [
    { size: 300, top: '10%', left: '10%', color: 'bg-violet-500', delay: '0s' },
    { size: 250, top: '60%', left: '70%', color: 'bg-cyan-500', delay: '-3s' },
    { size: 200, top: '40%', left: '40%', color: 'bg-fuchsia-500', delay: '-6s' },
  ];
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {orbs.map((o, i) => (
        <div
          key={i}
          className={`bg-quantum-orb ${o.color}`}
          style={{
            width: o.size,
            height: o.size,
            top: o.top,
            left: o.left,
            animationDelay: o.delay,
          }}
        />
      ))}
    </div>
  );
}

function NebulaBg() {
  const clouds = [
    { size: 400, top: '5%', left: '5%', color: 'bg-purple-500', delay: '0s' },
    { size: 350, top: '50%', left: '60%', color: 'bg-pink-500', delay: '-4s' },
    { size: 300, top: '30%', left: '30%', color: 'bg-indigo-500', delay: '-8s' },
  ];
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {clouds.map((c, i) => (
        <div
          key={i}
          className={`bg-nebula-cloud ${c.color}`}
          style={{
            width: c.size,
            height: c.size,
            top: c.top,
            left: c.left,
            animationDelay: c.delay,
          }}
        />
      ))}
    </div>
  );
}

function MidnightBg() {
  return (
    <div className="absolute inset-0 pointer-events-none">
      <div className="bg-gold-pulse bg-yellow-500 w-96 h-96 top-1/4 left-1/4" />
      <div className="bg-gold-pulse bg-yellow-600 w-80 h-80 top-1/2 left-1/2" style={{ animationDelay: '-3s' }} />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(251,191,36,0.08),transparent_70%)]" />
    </div>
  );
}

function GoldBg() {
  return (
    <div className="absolute inset-0 pointer-events-none">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(245,158,11,0.15),transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_70%,rgba(251,191,36,0.12),transparent_60%)]" />
      <div className="absolute top-20 left-20 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-yellow-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
    </div>
  );
}

/* === Dispatcher === */

export default function ActiveBackground() {
  const { theme } = useTheme();

  switch (theme) {
    case 'cyber':     return <CyberBg />;
    case 'arcade':    return <ArcadeBg />;
    case 'matrix':    return <MatrixBg />;
    case 'aurora':    return <AuroraBg />;
    case 'space':     return <SpaceBg />;
    case 'party':     return <PartyBg />;
    case 'spooky':    return <SpookyBg />;
    case 'ember':     return <EmberBg />;
    case 'glitch':    return <GlitchBg />;
    case 'holo':      return <HoloBg />;
    case 'synthwave': return <SynthwaveBg />;
    case 'quantum':   return <QuantumBg />;
    case 'nebula':    return <NebulaBg />;
    case 'midnight':  return <MidnightBg />;
    case 'gold':      return <GoldBg />;
    default:          return <VoidBg />;
  }
}
