import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useChinchonGame } from '../hooks/useChinchonGame';
import ChinchonBoard from '../components/ChinchonBoard';
import ErrorBoundary from '../components/ErrorBoundary';
import Confetti from 'react-confetti';
import { useWindowSize } from 'react-use';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, User as UserIcon, ArrowLeft, Home, Trophy } from 'lucide-react';

function ChinchonPage() {
    const [gameStarted, setGameStarted] = useState(false);
    return (
        <ErrorBoundary>
            <ChinchonContent gameStarted={gameStarted} setGameStarted={setGameStarted} />
        </ErrorBoundary>
    );
}

function ChinchonContent({ gameStarted, setGameStarted }) {
    const navigate = useNavigate();
    const [mode, setMode] = useState('single');
    const [playerCount, setPlayerCount] = useState(2);

    return (
        <div className="h-screen w-screen bg-green-900 overflow-hidden flex font-sans select-none overflow-y-auto">
            {!gameStarted ? (
                <div className="m-auto flex flex-col items-center justify-center space-y-4 sm:space-y-8 glass-panel p-6 sm:p-16 rounded-[30px] sm:rounded-[40px] shadow-2xl border border-white/10 relative overflow-hidden backdrop-blur-2xl w-[95%] max-w-[600px] my-8">
                    {/* Back to Menu */}
                    <button
                        onClick={() => navigate('/')}
                        className="absolute top-4 left-4 sm:top-6 sm:left-6 text-white/60 hover:text-white transition-colors flex items-center gap-2 text-xs font-bold uppercase tracking-widest bg-black/20 px-3 py-2 rounded-xl backdrop-blur-md border border-white/10 z-20"
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

                        {/* Game Modes */}
                        <div className="grid grid-cols-1 gap-3">
                            <button
                                onClick={() => { setMode('single'); setGameStarted(true); }}
                                className="btn-primary py-4 sm:py-5 flex items-center justify-center gap-3 text-sm sm:text-base"
                            >
                                <UserIcon size={18} />
                                VS CPU
                            </button>
                            <button
                                onClick={() => { setMode('local'); setGameStarted(true); }}
                                className="btn-secondary py-4 sm:py-5 flex items-center justify-center gap-3 border-white/20 hover:bg-white/10 text-sm sm:text-base"
                            >
                                <Users size={18} />
                                MULTIJUGADOR LOCAL
                            </button>
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
                <GameRoom mode={mode} playerCount={playerCount} onExit={() => setGameStarted(false)} />
            )}
        </div>
    );
}

const GameRoom = ({ mode, playerCount, onExit }) => {
    const game = useChinchonGame(mode, playerCount);
    const { width, height } = useWindowSize();
    const [showConfetti, setShowConfetti] = useState(false);

    // Iniciar juego al montar
    useEffect(() => {
        if (game.gamePhase === 'readyToStart') {
            game.startRound();
        }
    }, [game.gamePhase]);

    useEffect(() => {
        if (game.gameLog.length > 0) {
            const lastMsg = game.gameLog[0];
            if (lastMsg.includes('ganó') || lastMsg.includes('CHINCHÓN')) {
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

                {/* Round End Modal */}
                <AnimatePresence>
                    {game.gamePhase === 'roundEnd' && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
                        >
                            <motion.div
                                initial={{ scale: 0.9, y: 20 }}
                                animate={{ scale: 1, y: 0 }}
                                className="bg-green-950/90 border border-white/20 rounded-[32px] p-8 max-w-md w-full text-center shadow-2xl"
                            >
                                <h2 className="text-3xl font-black text-white mb-6">Ronda {game.round} Finalizada</h2>
                                <div className="space-y-3 mb-8">
                                    {game.players.map(p => (
                                        <div key={p.id} className={`p-4 rounded-xl ${p.isEliminated ? 'bg-red-500/20 border border-red-500/50' : 'bg-white/5'}`}>
                                            <div className="flex justify-between items-center">
                                                <span className="font-bold text-white">{p.name}</span>
                                                <div className="flex gap-4 text-sm">
                                                    <span className="text-white/60">Ronda: <span className="text-white font-bold">{p.roundScore}</span></span>
                                                    <span className="text-white/60">Total: <span className={`font-bold ${p.totalScore >= 80 ? 'text-red-400' : 'text-white'}`}>{p.totalScore}</span></span>
                                                </div>
                                            </div>
                                            {p.isEliminated && <p className="text-red-400 text-xs mt-1 font-bold">¡ELIMINADO!</p>}
                                        </div>
                                    ))}
                                </div>
                                <button
                                    onClick={game.nextRound}
                                    className="w-full py-4 rounded-2xl font-bold uppercase tracking-widest bg-yellow-500 text-green-950 hover:bg-yellow-400 transition-all shadow-lg"
                                >
                                    Siguiente Ronda
                                </button>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

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
                />
            </div>
        </>
    );
};

export default ChinchonPage;
