import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Card from './Card';
import { Play, X, Check } from 'lucide-react';

const ChinchonBoard = ({ game, onDrawCard, onDiscardCard, onCloseHand, onCardClick }) => {
    const { players, currentPlayerIdx, discardPile, deckSize, turnAction, gamePhase, selectedCards } = game;

    const currentPlayer = players[currentPlayerIdx];
    const isMyTurn = currentPlayerIdx === 0 && !currentPlayer?.isBot;

    return (
        <div className="flex-1 h-full flex flex-col items-center justify-between p-4 sm:p-8 relative felt-bg overflow-hidden text-white">
            {/* Opponents */}
            <div className="w-full flex justify-around items-center">
                {players.slice(1).map((player, idx) => (
                    <div key={player.id} className="flex flex-col items-center gap-2">
                        <div className={`px-4 py-2 rounded-full text-xs font-bold uppercase border ${currentPlayerIdx === idx + 1
                                ? 'bg-yellow-500 border-yellow-400 text-green-950'
                                : 'glass-panel border-white/10 text-white/60'
                            }`}>
                            {player.name}
                        </div>
                        <div className="flex -space-x-8">
                            {player.hand.map((card, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ scale: 0, y: -20 }}
                                    animate={{ scale: 1, y: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                    style={{ zIndex: i }}
                                >
                                    <Card card={{}} hidden={true} />
                                </motion.div>
                            ))}
                        </div>
                        <div className="flex gap-2 text-xs">
                            <span className="text-white/40">Ronda: <span className="text-white font-bold">{player.roundScore || 0}</span></span>
                            <span className="text-white/40">Total: <span className={`font-bold ${player.totalScore >= 80 ? 'text-red-400' : 'text-white'}`}>{player.totalScore}</span></span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Center: Deck & Discard */}
            <div className="flex gap-8 items-center">
                {/* Deck */}
                <motion.div
                    whileHover={isMyTurn && turnAction === 'draw' ? { scale: 1.05 } : {}}
                    whileTap={isMyTurn && turnAction === 'draw' ? { scale: 0.95 } : {}}
                    onClick={() => isMyTurn && turnAction === 'draw' && onDrawCard(true)}
                    className={`relative ${isMyTurn && turnAction === 'draw' ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}
                >
                    <div className="relative">
                        {[...Array(Math.min(3, Math.ceil(deckSize / 10)))].map((_, i) => (
                            <div
                                key={i}
                                className="absolute inset-0 bg-blue-900/40 rounded-lg border border-white/10"
                                style={{ transform: `translate(${-i * 2}px, ${-i * 2}px)` }}
                            />
                        ))}
                        <Card card={{}} hidden={true} />
                    </div>
                    <div className="absolute -bottom-2 -right-2 bg-yellow-500 text-green-950 font-black text-xs size-8 rounded-full flex items-center justify-center shadow-lg ring-2 ring-green-900">
                        {deckSize}
                    </div>
                    <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-xs font-bold uppercase text-white/30 whitespace-nowrap">Mazo</span>
                </motion.div>

                {/* Discard Pile */}
                <motion.div
                    whileHover={isMyTurn && turnAction === 'draw' && discardPile.length > 0 ? { scale: 1.05 } : {}}
                    whileTap={isMyTurn && turnAction === 'draw' && discardPile.length > 0 ? { scale: 0.95 } : {}}
                    onClick={() => isMyTurn && turnAction === 'draw' && discardPile.length > 0 && onDrawCard(false)}
                    className={`relative ${isMyTurn && turnAction === 'draw' && discardPile.length > 0 ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                >
                    {discardPile.length > 0 ? (
                        <Card card={discardPile[discardPile.length - 1]} />
                    ) : (
                        <div className="w-24 h-36 rounded-xl border-2 border-dashed border-white/20 flex items-center justify-center">
                            <X className="text-white/20" size={32} />
                        </div>
                    )}
                    <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-xs font-bold uppercase text-white/30 whitespace-nowrap">Descarte</span>
                </motion.div>
            </div>

            {/* Current Player Hand */}
            <div className="w-full flex flex-col items-center gap-4">
                {/* Action Buttons */}
                <AnimatePresence>
                    {isMyTurn && turnAction === 'discard' && (
                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 20, opacity: 0 }}
                            className="flex gap-3"
                        >
                            <button
                                onClick={onCloseHand}
                                className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl uppercase tracking-wide text-sm flex items-center gap-2 shadow-lg transition-all"
                            >
                                <Check size={18} /> Cerrar
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Player Hand */}
                <div className="flex flex-col items-center gap-3">
                    <div className="flex -space-x-12 sm:-space-x-8">
                        {currentPlayer?.hand.map((card, i) => {
                            const isSelected = selectedCards?.some(c => c.id === card.id);
                            return (
                                <motion.div
                                    key={card.id}
                                    layout
                                    initial={{ scale: 0, y: 20 }}
                                    animate={{
                                        scale: isSelected ? 1.05 : 1,
                                        y: isSelected ? -15 : 0,
                                        zIndex: isSelected ? 100 : i
                                    }}
                                    whileHover={isMyTurn ? { y: -10, zIndex: 110 } : {}}
                                    onClick={() => {
                                        if (isMyTurn && turnAction === 'discard') {
                                            onDiscardCard(card);
                                        } else if (isMyTurn) {
                                            onCardClick?.(card);
                                        }
                                    }}
                                    className="cursor-pointer"
                                >
                                    <Card card={card} isSelected={isSelected} />
                                </motion.div>
                            );
                        })}
                    </div>

                    <div className={`px-4 py-2 rounded-full text-xs font-bold uppercase border ${isMyTurn
                            ? 'bg-yellow-500 border-yellow-400 text-green-950'
                            : 'glass-panel border-white/10 text-white/60'
                        }`}>
                        {currentPlayer?.name || 'Jugador'} - {turnAction === 'draw' ? 'Tomar carta' : 'Descartar'}
                    </div>

                    <div className="flex gap-4 text-xs">
                        <span className="text-white/40">Ronda: <span className="text-white font-bold">{currentPlayer?.roundScore || 0}</span></span>
                        <span className="text-white/40">Total: <span className={`font-bold ${currentPlayer?.totalScore >= 80 ? 'text-red-400' : 'text-white'}`}>{currentPlayer?.totalScore || 0}</span></span>
                    </div>
                </div>
            </div>

            {/* Turn Indicator */}
            <div className="absolute top-4 right-4 glass-panel px-4 py-2 rounded-full border border-white/10">
                <span className="text-xs font-bold uppercase text-white/60">Ronda {game.round}</span>
            </div>
        </div>
    );
};

export default ChinchonBoard;
