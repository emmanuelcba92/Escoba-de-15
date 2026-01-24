import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useChinchonGame } from '../hooks/useChinchonGame';
import ChinchonBoard from '../components/ChinchonBoard';
import ChinchonResultsModal from '../components/ChinchonResultsModal';
import ErrorBoundary from '../components/ErrorBoundary';
import Confetti from 'react-confetti';
import { useWindowSize } from 'react-use';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, User as UserIcon, ArrowLeft, Home, Trophy, Clock, Globe } from 'lucide-react';

function ChinchonPage() {
    const [gameStarted, setGameStarted] = useState(false);
    return (
        <ErrorBoundary>
            <ChinchonContent gameStarted={gameStarted} setGameStarted={setGameStarted} />
        </ErrorBoundary>
    );
}

function ChinchonContent({ gameStarted, setGameStarted }) {
    const [mode, setMode] = useState('single');
    const [playerCount, setPlayerCount] = useState(2);
    const [difficulty, setDifficulty] = useState('normal');
    const [playerName, setPlayerName] = useState('Emmanuel');
    const [roomId, setRoomId] = useState('');
    const [isJoining, setIsJoining] = useState(false);

    return (
        <div className="h-screen w-screen bg-green-900 overflow-hidden flex font-sans select-none">
            {!gameStarted ? (
                <div className="m-auto flex flex-col items-center justify-center space-y-4 sm:space-y-8 glass-panel p-6 sm:p-16 rounded-[30px] sm:rounded-[40px] shadow-2xl border border-white/10 relative overflow-hidden backdrop-blur-2xl w-[95%] max-w-[600px] my-8">
                    {/* Back to Menu */}
                    <button
                        onClick={() => navigate('/')}
                        className="absolute top-4 left-4 sm:top-6 sm:left-6 text-white/40 hover:text-white transition-colors flex items-center gap-2 text-xs font-bold uppercase tracking-widest bg-black/20 px-3 py-2 rounded-xl backdrop-blur-md border border-white/10 z-20"
                    >
                        <ArrowLeft size={14} /> Menú
                    </button>

                    {/* Background Elements */}
                    <div className="absolute -top-24 -left-24 w-48 h-48 bg-red-500/20 rounded-full blur-3xl" />
                    <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-pink-500/10 rounded-full blur-3xl" />

                    <div className="text-center space-y-2 relative z-10">
                        <h1 className="text-4xl sm:text-7xl text-white font-black tracking-tighter italic text-glow uppercase">
                            Chinchón
                        </h1>
                        <p className="text-white/40 text-sm">Armá escaleras y tríos para ganar</p>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:gap-6 w-full relative z-10">
                        {/* Player Name */}
                        <div className="space-y-2">
                            <label className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] text-white/40 ml-1">Tu Nombre</label>
                            <input
                                type="text"
                                value={playerName}
                                onChange={(e) => setPlayerName(e.target.value)}
                                placeholder="Escribí tu nombre..."
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-bold outline-none focus:border-yellow-500/50 transition-all"
                                maxLength={12}
                            />
                        </div>

                        {/* Player Count */}
                        <div className="space-y-2">
                            <label className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] text-white/40 ml-1">Participantes</label>
                            <div className="grid grid-cols-3 gap-2">
                                {[2, 3, 4].map((n) => (
                                    <button
                                        key={n}
                                        onClick={() => setPlayerCount(n)}
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

                        {/* Difficulty selector */}
                        <div className="space-y-2">
                            <label className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] text-white/40 ml-1">Dificultad (CPU)</label>
                            <div className="grid grid-cols-3 gap-2">
                                {['easy', 'normal', 'hard'].map((d) => (
                                    <button
                                        key={d}
                                        onClick={() => setDifficulty(d)}
                                        className={`py-2 sm:py-3 text-[9px] sm:text-[11px] font-bold uppercase rounded-xl border transition-all ${difficulty === d
                                            ? 'bg-yellow-500 text-green-950 border-yellow-400 shadow-lg'
                                            : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'
                                            }`}
                                    >
                                        {d === 'easy' ? 'Fácil' : d === 'normal' ? 'Normal' : 'Difícil'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Game Modes */}
                        <div className="grid grid-cols-1 gap-3">
                            <button
                                onClick={() => { setMode('single'); setGameStarted(true); }}
                                className="btn-primary py-4 sm:py-5 flex items-center justify-center gap-3 text-sm sm:text-base transition-all active:scale-[0.98]"
                            >
                                <UserIcon size={18} />
                                JUGAR VS CPU
                            </button>
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                                <button
                                    onClick={() => { setMode('single'); setGameStarted(true); }}
                                    className="flex-1 btn-primary py-4 sm:py-5 flex items-center justify-center gap-3 text-sm sm:text-base transition-all active:scale-[0.98]"
                                >
                                    <UserIcon size={18} />
                                    JUGAR VS CPU
                                </button>
                                <button
                                    onClick={() => { setMode('local'); setGameStarted(true); }}
                                    className="flex-1 btn-secondary py-4 flex items-center justify-center gap-2 border-white/20 hover:bg-white/10 text-white/80 text-xs sm:text-sm font-bold transition-all active:scale-[0.98]"
                                >
                                    <Users size={16} />
                                    DUELO LOCAL
                                </button>
                            </div>

                            <div className="relative group">
                                {!isJoining ? (
                                    <button
                                        onClick={() => setIsJoining(true)}
                                        className="w-full py-4 sm:py-5 rounded-3xl border-2 border-yellow-500 bg-yellow-500 text-green-950 flex items-center justify-center gap-3 shadow-lg shadow-yellow-500/20 active:scale-95 transition-all text-sm sm:text-base font-black uppercase"
                                    >
                                        <Globe size={18} fill="currentColor" />
                                        Multijugador Online
                                    </button>
                                ) : (
                                    <motion.div
                                        initial={{ scale: 0.9, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        className="bg-yellow-500/10 border border-yellow-500/30 rounded-3xl p-4 sm:p-6 space-y-4"
                                    >
                                        <div className="flex items-center justify-between">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-yellow-500">Código de Sala</label>
                                            <button onClick={() => { setIsJoining(false); setRoomId(''); }} className="text-white/40 hover:text-white text-[10px] font-bold uppercase transition-colors">Cancelar</button>
                                        </div>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                placeholder="EJ: XJ42"
                                                value={roomId}
                                                autoFocus
                                                onChange={(e) => setRoomId(e.target.value.toUpperCase().slice(0, 4))}
                                                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-base font-bold outline-none ring-yellow-500/20 focus:ring-4 transition-all uppercase text-center tracking-widest"
                                            />
                                            <button
                                                disabled={roomId.length < 4}
                                                onClick={() => { setMode('multi'); setGameStarted(true); }}
                                                className="bg-yellow-500 disabled:opacity-50 text-green-950 px-6 rounded-xl font-black text-xs transition-all uppercase tracking-widest"
                                            >
                                                Entrar
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </div>
                        </div>

                        {/* Info Box */}
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-xs text-white/60 space-y-2">
                            <div className="flex items-start gap-2">
                                <Trophy size={14} className="text-yellow-500 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="font-bold text-white/80 mb-1">Objetivo:</p>
                                    <p>Formá escaleras y tríos. Cierra sin cartas sueltas o con máximo 1 carta menor a 3.</p>
                                </div>
                            </div>
                            <div className="border-t border-white/10 pt-2">
                                <p><span className="text-white font-bold">Chinchón (7 escaleras):</span> Victoria instantánea sin comodín, -10 pts con comodín</p>
                                <p><span className="text-white font-bold">Sin sueltas:</span> -10 puntos</p>
                                <p className="text-red-400 font-bold mt-1">¡Superá 100 puntos y perdés!</p>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <GameRoom mode={mode} playerCount={playerCount} difficulty={difficulty} playerName={playerName} roomId={roomId} onExit={() => setGameStarted(false)} />
            )}
        </div>
    );
}

const GameRoom = ({ mode, playerCount, difficulty, playerName, roomId, onExit }) => {
    const game = useChinchonGame(mode, playerCount, difficulty, playerName, roomId);
    const { width, height } = useWindowSize();
    const [showConfetti, setShowConfetti] = useState(false);

    // El inicio de la partida ahora lo maneja directamente useChinchonGame al detectar la fase 'setup'
    // para garantizar que sea una operación atómica y evitar problemas de renderizado.

    return (
        <>
            {showConfetti && <Confetti width={width} height={height} numberOfPieces={200} recycle={false} />}

            <div className="flex-1 h-full relative">

                {/* 1. Turn Transition Modal (Pass the phone) */}
                <AnimatePresence>
                    {game.gamePhase === 'turnTransition' && (
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="absolute inset-0 z-[150] bg-green-950 flex flex-col items-center justify-center p-8 text-center"
                        >
                            <motion.div
                                initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
                                className="space-y-8"
                            >
                                <div className="space-y-4">
                                    <h2 className="text-white/40 font-black uppercase tracking-[0.3em] text-sm italic">Cambio de Turno</h2>
                                    <h3 className="text-5xl sm:text-7xl text-white font-black tracking-tighter uppercase text-glow">
                                        Es el turno de<br />
                                        <span className="text-yellow-500">{game.players[game.currentPlayerIdx]?.name}</span>
                                    </h3>
                                </div>

                                <p className="text-white/60 text-lg sm:text-2xl font-medium max-w-sm mx-auto">
                                    ¡Pasale el dispositivo para que nadie vea tus cartas! 📱🤫
                                </p>

                                <button
                                    onClick={game.startTurn}
                                    className="px-12 py-5 bg-white text-green-950 font-black rounded-3xl uppercase tracking-widest text-lg shadow-2xl hover:scale-105 active:scale-95 transition-all ring-8 ring-white/10"
                                >
                                    ¡ESTOY LISTO!
                                </button>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Header Buttons */}
                <div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-50 flex items-center gap-2">
                    <button
                        onClick={onExit}
                        className="text-white/40 hover:text-white transition-colors flex items-center gap-1 sm:gap-2 font-bold text-[10px] sm:text-sm bg-black/20 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl backdrop-blur-md border border-white/10"
                    >
                        &larr; ABANDONAR
                    </button>
                    <Link
                        to="/"
                        className="text-white/40 hover:text-white transition-colors font-bold text-[10px] sm:text-sm bg-black/20 p-1.5 sm:p-2 rounded-xl backdrop-blur-md border border-white/10"
                    >
                        <Home size={16} />
                    </Link>
                </div>

                {/* Round End Modal (Premium) */}
                <ChinchonResultsModal
                    isOpen={game.gamePhase === 'roundEnd'}
                    players={game.players}
                    closingPlayerIdx={game.closingPlayerIdx}
                    round={game.round}
                    onNextRound={game.nextRound}
                />

                {/* Game End Modal */}
                <AnimatePresence>
                    {game.gamePhase === 'gameEnd' && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
                        >
                            <motion.div
                                initial={{ scale: 0.9, y: 20 }}
                                animate={{ scale: 1, y: 0 }}
                                className="bg-green-950/90 border border-yellow-500/50 rounded-[32px] p-12 max-w-md w-full text-center shadow-2xl"
                            >
                                <Trophy size={64} className="text-yellow-500 mx-auto mb-4" />
                                <h2 className="text-4xl font-black text-white mb-2">¡Partida Finalizada!</h2>
                                <p className="text-2xl text-yellow-500 font-bold mb-8">
                                    {game.players.find(p => !p.isEliminated)?.name} ganó
                                </p>
                                <div className="space-y-2">
                                    <button
                                        onClick={onExit}
                                        className="w-full py-4 rounded-2xl font-bold uppercase tracking-widest bg-yellow-500 text-green-950 hover:bg-yellow-400 transition-all shadow-lg"
                                    >
                                        Nueva Partida
                                    </button>
                                    <Link
                                        to="/"
                                        className="block w-full py-4 rounded-2xl font-bold uppercase tracking-widest bg-white/10 text-white hover:bg-white/20 transition-all"
                                    >
                                        Menú Principal
                                    </Link>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <ChinchonBoard
                    game={game}
                    onDrawCard={game.drawCard}
                    onDiscardCard={game.discardCard}
                    onCloseHand={game.closeHand}
                    onCardClick={game.toggleCardSelection}
                    onReorderHand={game.reorderHand}
                    onAutoSort={game.autoSortHand}
                />
            </div>
        </>
    );
};

export default ChinchonPage;
