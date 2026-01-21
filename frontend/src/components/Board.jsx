import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Card from './Card';
import { Play, Layers, ShieldCheck, Wifi, Loader2, Wind } from 'lucide-react';

const Deck = ({ count }) => (
    <div className="flex flex-col items-center gap-1 group">
        <div className="relative">
            {[...Array(Math.min(3, Math.ceil(count / 10)))].map((_, i) => (
                <div key={i} className="absolute inset-0 bg-blue-900/40 rounded-lg border border-white/10" style={{ transform: `translate(${-i * 1.5}px, ${-i * 1.5}px)` }} />
            ))}
            <div className="relative w-10 h-14 sm:w-16 sm:h-24 bg-white rounded-lg shadow-2xl overflow-hidden border-2 border-white/20">
                <div className="absolute inset-0 bg-blue-900 flex items-center justify-center">
                    <div className="w-full h-full opacity-20" style={{ backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`, backgroundSize: '8px 8px' }} />
                    <Layers className="text-white/20 size-6 sm:size-8" />
                </div>
            </div>
            <div className="absolute -bottom-1 -right-1 bg-yellow-500 text-green-950 font-black text-[8px] sm:text-[10px] size-5 sm:size-6 rounded-full flex items-center justify-center shadow-lg ring-2 ring-green-900">{count}</div>
        </div>
        <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-white/20">Mazo</span>
    </div>
);

const PlayerHand = ({ player, isCurrent, onCardClick, selectedHandCard, isPlayerTurn, hideCards }) => {
    const isBot = player.isBot;
    return (
        <div className="flex flex-col items-center space-y-2 sm:space-y-3">
            <div className="flex -space-x-10 sm:-space-x-8">
                {player.hand.map((card, i) => {
                    const isSelected = selectedHandCard?.id === card.id;
                    return (
                        <motion.div
                            key={card.id}
                            layout
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{
                                scale: isSelected ? 1.05 : 1,
                                opacity: 1,
                                y: isSelected ? -15 : 0,
                                zIndex: isSelected ? 100 : i
                            }}
                            whileHover={isPlayerTurn && !hideCards && !isBot ? { y: -5, zIndex: 110 } : {}}
                            onClick={() => isPlayerTurn && !hideCards && !isBot && onCardClick(card)}
                            className="cursor-pointer"
                        >
                            <Card card={card} hidden={hideCards || (isBot && !isSelected)} isSelected={isSelected} />
                        </motion.div>
                    );
                })}
            </div>
            <div className={`px-3 py-1 sm:px-4 sm:py-1.5 rounded-full text-[8px] sm:text-[10px] font-bold tracking-widest uppercase border transition-all ${isCurrent ? 'bg-yellow-500 border-yellow-400 text-green-950 shadow-lg' : 'glass-panel text-white/40 border-white/5'}`}>
                {player.name}
            </div>
        </div>
    );
};

const Board = ({ game, onHandCardClick, onTableCardClick, onPlayMove, onSoplo }) => {
    const { players, table, currentPlayerIdx, selectedHandCard, selectedTableCards, deckSize, dealerIdx, gameMode, waitingForOpponent, myPlayerIdx } = game;

    const [privacyOverlay, setPrivacyOverlay] = useState(false);
    const [privacyTimer, setPrivacyTimer] = useState(10);

    const isOurTurn = gameMode === 'multi' ? (currentPlayerIdx === myPlayerIdx) : !players[currentPlayerIdx]?.isBot;

    useEffect(() => {
        if (gameMode === 'local') {
            setPrivacyOverlay(true);
            setPrivacyTimer(10);
            const interval = setInterval(() => {
                setPrivacyTimer(prev => {
                    if (prev <= 1) {
                        setPrivacyOverlay(false);
                        clearInterval(interval);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [currentPlayerIdx, gameMode]);

    const getPlayerPos = (idx) => {
        const count = players.length;
        const relativeIdx = (idx - (myPlayerIdx || 0) + count) % count;

        if (count === 2) return relativeIdx === 0 ? 'bottom' : 'top';
        if (count === 3) {
            if (relativeIdx === 0) return 'bottom';
            if (relativeIdx === 1) return 'top-right';
            return 'top-left';
        }
        if (count === 4) {
            if (relativeIdx === 0) return 'bottom';
            if (relativeIdx === 1) return 'right';
            if (relativeIdx === 2) return 'top';
            return 'left';
        }
    };

    const containerClasses = {
        bottom: "absolute bottom-4 sm:bottom-10 left-1/2 -translate-x-1/2 w-full flex justify-center",
        top: "absolute top-4 sm:top-10 left-1/2 -translate-x-1/2 w-full flex justify-center",
        left: "absolute top-1/2 left-2 sm:left-10 -translate-y-1/2 rotate-90",
        right: "absolute top-1/2 right-2 sm:right-10 -translate-y-1/2 -rotate-90",
        "top-right": "absolute top-4 sm:top-10 right-4 sm:right-20",
        "top-left": "absolute top-4 sm:top-10 left-4 sm:left-20",
    };

    // Verificación de suma 15 solo en mesa para el botón de soplo
    const tableSumIs15 = selectedTableCards.length >= 2 && selectedTableCards.reduce((acc, c) => acc + c.numericValue, 0) === 15;

    return (
        <div className="flex-1 h-full flex flex-col items-center justify-between p-4 sm:p-8 relative felt-bg overflow-hidden text-white">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] sm:w-[900px] h-[300px] sm:h-[600px] border-[1px] border-white/5 rounded-full pointer-events-none blur-3xl opacity-50" />

            {/* Waiting for opponent screen */}
            <AnimatePresence>
                {waitingForOpponent && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-[110] bg-green-950/80 backdrop-blur-xl flex items-center justify-center"
                    >
                        <div className="flex flex-col items-center space-y-6">
                            <div className="relative">
                                <Wifi size={64} className="text-yellow-500 animate-pulse" />
                                <Loader2 size={24} className="text-white absolute -top-2 -right-2 animate-spin" />
                            </div>
                            <div className="text-center space-y-2">
                                <h2 className="text-3xl font-black italic tracking-tighter uppercase">Esperando oponente...</h2>
                                <p className="text-white/40 text-sm font-medium">Comparte el código de la sala con tu sobrino.</p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Privacy Overlay for Local Versus */}
            <AnimatePresence>
                {privacyOverlay && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] backdrop-blur-3xl bg-black/60 flex items-center justify-center p-8"
                    >
                        <motion.div animate={{ scale: 1, opacity: 1 }} className="max-w-md w-full glass-panel p-12 rounded-[40px] border border-white/10 flex flex-col items-center text-center space-y-8 shadow-2xl">
                            <ShieldCheck size={40} className="text-yellow-500" />
                            <div className="space-y-2">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40">Cambio de Turno</h3>
                                <h2 className="text-3xl font-black italic tracking-tighter uppercase">{players[currentPlayerIdx]?.name}</h2>
                            </div>
                            <button onClick={() => setPrivacyOverlay(false)} className="w-full btn-primary py-5">ESTOY LISTO ({privacyTimer}s)</button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Players Hands */}
            {players.map((p, i) => (
                <div key={p.id} className={`${containerClasses[getPlayerPos(i)]} z-30`}>
                    <PlayerHand
                        player={p}
                        isCurrent={currentPlayerIdx === i}
                        isPlayerTurn={currentPlayerIdx === i}
                        onCardClick={onHandCardClick}
                        selectedHandCard={currentPlayerIdx === i ? selectedHandCard : null}
                        hideCards={privacyOverlay || (gameMode === 'local' && currentPlayerIdx !== i) || (gameMode === 'multi' && i !== myPlayerIdx)}
                    />
                </div>
            ))}

            <div className="flex flex-col items-center justify-center space-y-12 relative z-20 w-full max-w-4xl h-full mt-10">
                <div className="flex flex-wrap justify-center items-center gap-6 min-h-[250px]">
                    <AnimatePresence mode="popLayout">
                        {table.map((card) => {
                            const isSelected = selectedTableCards.some(c => c.id === card.id);
                            return (
                                <motion.div key={card.id} layout initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1, y: isSelected ? -20 : 0, zIndex: isSelected ? 50 : 10 }} exit={{ scale: 0, opacity: 0 }} onClick={() => !privacyOverlay && onTableCardClick(card)} className="cursor-pointer relative">
                                    <Card card={card} isSelected={isSelected} />
                                    {isSelected && <div className="absolute -top-2 -right-2 size-6 bg-yellow-500 rounded-full flex items-center justify-center animate-bounce shadow-lg ring-2 ring-green-900"><Play size={10} className="fill-green-950" /></div>}
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>

                <div className="h-16 sm:h-24 flex items-center gap-4">
                    <AnimatePresence mode="wait">
                        {selectedHandCard && isOurTurn && !privacyOverlay && (
                            <motion.button
                                key="play-btn"
                                initial={{ scale: 0.5, opacity: 0, y: 20 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0.5, opacity: 0, y: 20 }}
                                onClick={onPlayMove}
                                className="px-8 sm:px-16 py-3 sm:py-5 bg-yellow-500 text-green-950 font-black rounded-full shadow-2xl flex items-center gap-3 sm:gap-4 tracking-[0.2em] text-[10px] sm:text-sm ring-4 ring-yellow-400/20"
                            >
                                <Play className="fill-green-950 size-3 sm:size-4" /> CONFIRMAR
                            </motion.button>
                        )}

                        {tableSumIs15 && !selectedHandCard && (
                            <motion.button key="soplo-btn" initial={{ scale: 0.5, opacity: 0, x: -20 }} animate={{ scale: 1, opacity: 1, x: 0 }} exit={{ scale: 0.5, opacity: 0, x: -20 }} onClick={onSoplo} className="px-12 py-5 bg-blue-600 text-white font-black rounded-full shadow-2xl flex items-center gap-4 tracking-[0.2em] text-sm ring-4 ring-blue-500/20">
                                <Wind size={18} className="animate-pulse" /> ¡SOPLO!
                            </motion.button>
                        )}

                        {!selectedHandCard && !tableSumIs15 && !waitingForOpponent && (
                            <div className={`text-[10px] font-bold tracking-[0.4em] uppercase opacity-30 ${isOurTurn ? 'text-yellow-500 animate-pulse' : 'text-white'}`}>
                                {isOurTurn ? 'Es tu turno' : `Esperando a ${players[currentPlayerIdx]?.name}...`}
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {deckSize > 0 && (
                <div className="absolute top-1/2 right-4 sm:right-40 -translate-y-1/2 opacity-40 scale-75 sm:scale-100">
                    <Deck count={deckSize} />
                </div>
            )}
        </div>
    );
};

export default Board;
