import React, { useState, useEffect } from 'react';
import Board from './components/Board';
import Sidebar from './components/Sidebar';
import { useGame } from './hooks/useGame';
import ErrorBoundary from './components/ErrorBoundary';
import Confetti from 'react-confetti';
import { useWindowSize } from 'react-use';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, User as UserIcon, Globe, Wifi, ShieldCheck, User, Wind } from 'lucide-react';

function App() {
  const [gameStarted, setGameStarted] = useState(false);
  return (
    <ErrorBoundary>
      <AppContent gameStarted={gameStarted} setGameStarted={setGameStarted} />
    </ErrorBoundary>
  );
}

function AppContent({ gameStarted, setGameStarted }) {
  const [mode, setMode] = useState('single'); // 'single' | 'local' | 'multi'
  const [difficulty, setDifficulty] = useState('normal');
  const [playerCount, setPlayerCount] = useState(2);
  const [playMode, setPlayMode] = useState('individual');

  // Persistir nombre del jugador
  const [playerName, setPlayerName] = useState(() => {
    return localStorage.getItem('escoba_player_name') || 'Jugador 1';
  });

  const [roomId, setRoomId] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    localStorage.setItem('escoba_player_name', playerName);
  }, [playerName]);

  return (
    <div className="h-screen w-screen bg-green-900 overflow-hidden flex font-sans select-none">
      {!gameStarted ? (
        <div className="m-auto flex flex-col items-center justify-center space-y-8 glass-panel p-16 rounded-[40px] shadow-2xl border border-white/10 relative overflow-hidden backdrop-blur-2xl w-[600px]">
          {/* Background Elements */}
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-yellow-500/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl" />

          <div className="text-center space-y-2 relative z-10">
            <h1 className="text-7xl text-white font-black tracking-tighter italic text-glow uppercase">
              Escoba<span className="text-yellow-500 italic block -mt-4 text-3xl font-light tracking-widest opacity-80">de 15</span>
            </h1>
          </div>

          <div className="grid grid-cols-1 gap-6 w-full relative z-10">

            {/* Player Name Input */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 ml-1">Tu Nombre</label>
              <div className="relative">
                <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="ESCRIBE TU NOMBRE..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white font-bold outline-none ring-yellow-500/20 focus:ring-4 transition-all uppercase placeholder:text-white/10"
                />
              </div>
            </div>

            {/* Modalidad Selection */}
            <div className="flex flex-col space-y-4">
              {/* Player Count */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 ml-1">Participantes</label>
                <div className="grid grid-cols-3 gap-2">
                  {[2, 3, 4].map((n) => (
                    <button
                      key={n}
                      onClick={() => {
                        setPlayerCount(n);
                        if (n !== 4) setPlayMode('individual');
                      }}
                      className={`py-3 text-[11px] font-bold uppercase rounded-xl border transition-all flex items-center justify-center gap-2 ${playerCount === n
                          ? 'bg-white text-green-950 border-white shadow-lg'
                          : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'
                        }`}
                    >
                      <Users size={12} />
                      {n} Jugadores
                    </button>
                  ))}
                </div>
              </div>

              {/* Play Mode (Only 4) */}
              {playerCount === 4 && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 ml-1">Configuración 4 Jugadores</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => setPlayMode('individual')} className={`py-3 text-[10px] font-bold uppercase rounded-xl border ${playMode === 'individual' ? 'bg-blue-500 text-white border-blue-400' : 'bg-white/5 text-white/40 border-white/10'}`}>Individual</button>
                    <button onClick={() => setPlayMode('teams')} className={`py-3 text-[10px] font-bold uppercase rounded-xl border ${playMode === 'teams' ? 'bg-blue-500 text-white border-blue-400' : 'bg-white/5 text-white/40 border-white/10'}`}>Equipos (2vs2)</button>
                  </div>
                </div>
              )}
            </div>

            {/* Game Modes */}
            <div className="grid grid-cols-1 gap-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => { setMode('single'); setGameStarted(true); }}
                  className="flex-1 btn-primary py-5 flex items-center justify-center gap-3"
                >
                  <UserIcon size={20} />
                  VS CPU
                </button>
                <button
                  onClick={() => { setMode('local'); setGameStarted(true); }}
                  className="flex-1 btn-secondary py-5 flex items-center justify-center gap-3 border-white/20 hover:bg-white/10"
                >
                  <Wifi size={20} />
                  DUELO LOCAL
                </button>
              </div>

              <div className="relative group">
                <div className="absolute inset-x-0 -top-4 opacity-0 group-hover:opacity-100 transition-opacity flex justify-center">
                  <span className="bg-blue-600 text-[8px] font-bold text-white px-2 py-0.5 rounded-full uppercase tracking-widest translate-y-2">Multiplayer Beta</span>
                </div>
                <button
                  onClick={() => setIsJoining(!isJoining)}
                  className={`w-full py-5 rounded-3xl border-2 flex items-center justify-center gap-3 transition-all ${isJoining ? 'border-blue-500 bg-blue-500/10' : 'border-blue-500/30 text-blue-400/80 hover:bg-blue-500/10'}`}
                >
                  <Globe size={20} />
                  MULTIJUGADOR ONLINE
                </button>
              </div>

              {/* Online Join Section */}
              <AnimatePresence>
                {isJoining && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden space-y-4 pt-2"
                  >
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 ml-1">Código de Sala</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="ESCRIBE CÓDIGO..."
                          value={roomId}
                          onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-bold outline-none ring-blue-500/20 focus:ring-4 transition-all uppercase"
                        />
                        <button
                          disabled={!roomId}
                          onClick={() => { setMode('multi'); setGameStarted(true); }}
                          className="bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white px-8 rounded-xl font-bold text-sm transition-all"
                        >
                          ENTRAR
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="pt-4 border-t border-white/5 flex items-center justify-between">
              <span className="text-[9px] font-black uppercase tracking-widest text-white/20">Dificultad IA:</span>
              <div className="flex gap-2">
                {['easy', 'normal', 'hard'].map(d => (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    className={`text-[9px] font-bold uppercase transition-all px-3 py-1 rounded-md ${difficulty === d ? 'bg-yellow-500 text-green-950' : 'text-white/30 hover:text-white'}`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <GameRoom mode={mode} difficulty={difficulty} playerCount={playerCount} playMode={playMode} roomId={roomId} playerName={playerName} onExit={() => setGameStarted(false)} />
      )}
    </div>
  );
}

const GameRoom = ({ mode, difficulty, playerCount, playMode, roomId, playerName, onExit }) => {
  const game = useGame(mode, difficulty, playerCount, playMode, roomId, playerName);
  const { width, height } = useWindowSize();
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (game.gameLog.length > 0) {
      const lastMsg = game.gameLog[0];
      if (lastMsg.includes('Escoba') || lastMsg.includes('PARTIDA FINALIZADA')) {
        setShowConfetti(true);
        const timer = setTimeout(() => setShowConfetti(false), 5000);
        return () => clearTimeout(timer);
      }
    }
  }, [game.gameLog]);

  return (
    <>
      {showConfetti && <Confetti width={width} height={height} numberOfPieces={200} recycle={false} />}
      <div className="flex-1 h-full relative">
        <button onClick={onExit} className="absolute top-6 left-6 text-white/40 hover:text-white z-50 transition-colors flex items-center gap-2 font-bold text-sm bg-black/20 px-4 py-2 rounded-xl backdrop-blur-md border border-white/10">
          &larr; ABANDONAR
        </button>
        <Board
          game={game}
          onHandCardClick={game.onHandCardClick}
          onTableCardClick={game.onTableCardClick}
          onPlayMove={game.onPlayMove}
          onSoplo={game.onSoplo}
        />
      </div>
      <div className="hidden lg:block h-full shadow-2xl z-20">
        <Sidebar
          players={game.players}
          currentPlayerId={game.players[game.currentPlayerIdx]?.id}
          gameLog={game.gameLog}
          timeLeft={game.timeLeft}
          stats={game.stats}
        />
      </div>
    </>
  );
};

export default App;
