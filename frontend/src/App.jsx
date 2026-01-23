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

  // Soporte para unirse vía URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const room = params.get('room');
    if (room && room.length === 4) {
      setRoomId(room.toUpperCase());
      setIsJoining(true);
    }
  }, []);

  return (
    <div className="h-screen w-screen bg-green-900 overflow-hidden flex font-sans select-none overflow-y-auto">
      {!gameStarted ? (
        <div className="m-auto flex flex-col items-center justify-center space-y-4 sm:space-y-8 glass-panel p-6 sm:p-16 rounded-[30px] sm:rounded-[40px] shadow-2xl border border-white/10 relative overflow-hidden backdrop-blur-2xl w-[95%] max-w-[600px] my-8">
          {/* Background Elements */}
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-yellow-500/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl" />

          <div className="text-center space-y-2 relative z-10">
            <h1 className="text-4xl sm:text-7xl text-white font-black tracking-tighter italic text-glow uppercase">
              Escoba<span className="text-yellow-500 italic block -mt-2 sm:-mt-4 text-xl sm:text-3xl font-light tracking-widest opacity-80">de 15</span>
            </h1>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:gap-6 w-full relative z-10">

            {/* Player Name Input */}
            <div className="space-y-2">
              <label className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] text-white/40 ml-1">Tu Nombre</label>
              <div className="relative">
                <UserIcon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="ESCRIBE TU NOMBRE..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white text-sm sm:text-base font-bold outline-none ring-yellow-500/20 focus:ring-4 transition-all uppercase placeholder:text-white/10"
                />
              </div>
            </div>

            {/* Modalidad Selection */}
            <div className="flex flex-col space-y-3 sm:space-y-4">
              {/* Player Count */}
              <div className="space-y-2">
                <label className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] text-white/40 ml-1">Participantes</label>
                <div className="grid grid-cols-3 gap-2">
                  {[2, 3, 4].map((n) => (
                    <button
                      key={n}
                      onClick={() => {
                        setPlayerCount(n);
                        if (n !== 4) setPlayMode('individual');
                      }}
                      className={`py-2 sm:py-3 text-[9px] sm:text-[11px] font-bold uppercase rounded-xl border transition-all flex items-center justify-center gap-1 sm:gap-2 ${playerCount === n
                        ? 'bg-white text-green-950 border-white shadow-lg'
                        : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'
                        }`}
                    >
                      <Users size={12} />
                      {n} Jgs
                    </button>
                  ))}
                </div>
              </div>

              {/* Play Mode (Only 4) */}
              {playerCount === 4 && (
                <div className="space-y-2">
                  <label className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] text-white/40 ml-1">Configuración 4 Jugadores</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => setPlayMode('individual')} className={`py-2 sm:py-3 text-[9px] sm:text-[10px] font-bold uppercase rounded-xl border ${playMode === 'individual' ? 'bg-blue-500 text-white border-blue-400' : 'bg-white/5 text-white/40 border-white/10'}`}>Individual</button>
                    <button onClick={() => setPlayMode('teams')} className={`py-2 sm:py-3 text-[9px] sm:text-[10px] font-bold uppercase rounded-xl border ${playMode === 'teams' ? 'bg-blue-500 text-white border-blue-400' : 'bg-white/5 text-white/40 border-white/10'}`}>Equipos (2v2)</button>
                  </div>
                </div>
              )}
            </div>

            {/* Game Modes */}
            <div className="grid grid-cols-1 gap-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <button
                  onClick={() => { setMode('single'); setGameStarted(true); }}
                  className="flex-1 btn-primary py-4 sm:py-5 flex items-center justify-center gap-3 text-sm sm:text-base"
                >
                  <UserIcon size={18} />
                  VS CPU
                </button>
                <button
                  onClick={() => { setMode('local'); setGameStarted(true); }}
                  className="flex-1 btn-secondary py-4 sm:py-5 flex items-center justify-center gap-3 border-white/20 hover:bg-white/10 text-sm sm:text-base"
                >
                  <Wifi size={18} />
                  DUELO LOCAL
                </button>
              </div>

              <div className="relative group">
                <div className="absolute inset-x-0 -top-4 opacity-0 group-hover:opacity-100 transition-opacity flex justify-center">
                  <span className="bg-blue-600 text-[8px] font-bold text-white px-2 py-0.5 rounded-full uppercase tracking-widest translate-y-2">Multiplayer Online</span>
                </div>
                {!isJoining ? (
                  <button
                    onClick={() => setIsJoining(true)}
                    className="w-full py-4 sm:py-5 rounded-3xl border-2 border-blue-500 bg-blue-500 text-white flex items-center justify-center gap-3 shadow-lg shadow-blue-500/20 active:scale-95 transition-all text-sm sm:text-base font-bold"
                  >
                    <Globe size={18} />
                    MULTIJUGADOR ONLINE
                  </button>
                ) : (
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-blue-500/10 border border-blue-500/30 rounded-3xl p-4 sm:p-6 space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black uppercase tracking-widest text-blue-400">Código de Sala</label>
                      <button onClick={() => { setIsJoining(false); setRoomId(''); }} className="text-white/40 hover:text-white text-[10px] font-bold">CANCELAR</button>
                    </div>
                    <p className="text-white/40 text-[10px] leading-relaxed">Ambos jugadores deben ingresar el mismo código para unirse a la partida.</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="CÓDIGO (EJ: XJ42)"
                        value={roomId}
                        autoFocus
                        onChange={(e) => setRoomId(e.target.value.toUpperCase().slice(0, 4))}
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-base font-bold outline-none ring-blue-500/20 focus:ring-4 transition-all uppercase text-center tracking-widest"
                      />
                      <button
                        disabled={roomId.length < 4}
                        onClick={() => { setMode('multi'); setGameStarted(true); }}
                        className="bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white px-6 rounded-xl font-bold text-sm transition-all uppercase"
                      >
                        ENTRAR
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-white/20">Dificultad IA:</span>
              <div className="flex gap-2">
                {['easy', 'normal', 'hard'].map(d => (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    className={`text-[8px] sm:text-[9px] font-bold uppercase transition-all px-3 py-1.5 rounded-md ${difficulty === d ? 'bg-yellow-500 text-green-950' : 'text-white/30 hover:text-white bg-white/5'}`}
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
        <button onClick={onExit} className="absolute top-4 left-4 sm:top-6 sm:left-6 text-white/40 hover:text-white z-50 transition-colors flex items-center gap-1 sm:gap-2 font-bold text-[10px] sm:text-sm bg-black/20 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl backdrop-blur-md border border-white/10">
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
