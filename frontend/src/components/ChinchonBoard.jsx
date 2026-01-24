import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import Card from './Card';
import { X, Check, Sparkles, GripHorizontal, Trophy } from 'lucide-react';
import { findBestCombination } from '../game/chinchonEngine';

const ChinchonBoard = ({ game, onDrawCard, onDiscardCard, onCloseHand, onCardClick, onReorderHand }) => {
    const { players, currentPlayerIdx, discardPile, deckSize, turnAction, gamePhase, selectedCards } = game;
    const [showGroups, setShowGroups] = useState(true);

    const me = players[0];
    const isMyTurn = currentPlayerIdx === 0 && gamePhase === 'playing';

    // Análisis de mi mano para mostrar sugerencias sin mover el orden real
    const myAnalysis = useMemo(() => findBestCombination(me?.hand || []), [me?.hand]);

    // Función para renderizar el grupo de oponentes
    const renderOpponent = (player, idx) => {
        const isTurn = currentPlayerIdx === idx + 1;
        const reveal = gamePhase === 'roundEnd' || gamePhase === 'showing' || (gamePhase === 'gameEnd');

        let analysis = { games: [], looseCards: player.hand };
        if (reveal) {
            analysis = (player.games && player.games.length > 0)
                ? { games: player.games, looseCards: player.looseCards }
                : findBestCombination(player.hand);
        }

        return (
            <div key={player.id} className="flex flex-col items-center gap-1 sm:gap-2">
                <div className={`px-3 py-1 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-widest border transition-all ${isTurn
                    ? 'bg-yellow-500 border-yellow-400 text-green-950 shadow-lg scale-110'
                    : 'bg-black/20 border-white/10 text-white/40'
                    }`}>
                    {player.name} {player.isEliminated && '💀'}
                </div>

                <div className="flex flex-wrap justify-center gap-1 hand-responsive">
                    {reveal ? (
                        <div className="flex flex-wrap justify-center gap-1">
                            {analysis.games.map((g, gi) => (
                                <div key={gi} className="flex -space-x-8 sm:-space-x-10 scale-75 origin-top">
                                    {g.map(c => <Card key={c.id} card={c} />)}
                                </div>
                            ))}
                            {analysis.looseCards.length > 0 && (
                                <div className="flex -space-x-8 sm:-space-x-10 scale-75 origin-top opacity-80">
                                    {analysis.looseCards.map(c => <Card key={c.id} card={c} />)}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex -space-x-8 sm:-space-x-10 scale-75 origin-top">
                            {player.hand.map((_, i) => <Card key={i} card={{}} hidden={true} />)}
                        </div>
                    )}
                </div>

                <div className="text-[9px] font-bold text-white/40 uppercase">
                    Puntos: <span className="text-white">{player.totalScore}</span>
                </div>
            </div>
        );
    };

    return (
        <div className="h-full w-full flex flex-col items-center relative felt-bg overflow-hidden text-white safe-areas select-none">

            {/* 1. Opponents Row - Fixed area */}
            <div className="w-full flex-shrink-0 flex justify-around items-start pt-2 min-h-[120px]">
                {players.slice(1).map((p, i) => renderOpponent(p, i))}
            </div>

            {/* 2. Central Area: Deck & Discard - Centered perfectly */}
            <div className="flex-1 w-full flex items-center justify-center gap-8 sm:gap-16">
                <motion.div
                    onClick={() => isMyTurn && turnAction === 'draw' && onDrawCard(true)}
                    className={`relative ${isMyTurn && turnAction === 'draw' ? 'cursor-pointer' : 'opacity-50'} card-responsive`}
                >
                    <div className="scale-75 sm:scale-100">
                        <Card card={{}} hidden={true} />
                        <div className="absolute -bottom-2 -right-2 bg-yellow-500 text-green-950 font-black text-xs w-6 h-6 rounded-full flex items-center justify-center shadow-lg ring-2 ring-green-900">
                            {deckSize}
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    onClick={() => isMyTurn && turnAction === 'draw' && discardPile.length > 0 && onDrawCard(false)}
                    className={`relative ${isMyTurn && turnAction === 'draw' && discardPile.length > 0 ? 'cursor-pointer' : 'opacity-50'} card-responsive`}
                >
                    <div className="scale-75 sm:scale-100">
                        {discardPile.length > 0 ? (
                            <Card card={discardPile[discardPile.length - 1]} />
                        ) : (
                            <div className="w-20 h-28 sm:w-24 sm:h-36 rounded-xl border-2 border-dashed border-white/20 flex items-center justify-center">
                                <X className="text-white/10" size={32} />
                            </div>
                        )}
                        {discardPile.length > 0 && (
                            <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-black uppercase text-white/40 tracking-widest">
                                ({discardPile.length})
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>

            {/* 3. Player Hand Area - Increased height to 320px to prevent clipping */}
            <div className="absolute bottom-0 left-0 right-0 w-full bg-gradient-to-t from-black/90 via-black/40 to-transparent flex flex-col items-center pb-8 h-[320px] justify-end pointer-events-none">

                {/* Floating Action Hint / Confirm Buttons */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20 pointer-events-auto flex flex-col items-center gap-2">
                    <AnimatePresence mode="wait">
                        {isMyTurn && turnAction === 'draw' && (
                            <motion.div
                                key="draw-hint"
                                initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -10, opacity: 0 }}
                                className="px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border-2 bg-yellow-500 border-yellow-400 text-green-950 shadow-glow"
                            >
                                Tomá una carta
                            </motion.div>
                        )}

                        {isMyTurn && turnAction === 'discard' && (
                            <motion.div
                                key="discard-actions"
                                initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }}
                                className="flex gap-2"
                            >
                                {/* Discard Selected Card */}
                                {selectedCards.length === 1 && (
                                    <button
                                        onClick={() => onDiscardCard(selectedCards[0])}
                                        className="px-6 py-3 bg-white text-green-950 font-black rounded-2xl uppercase tracking-tighter text-xs shadow-2xl ring-4 ring-white/10"
                                    >
                                        TIRAR
                                    </button>
                                )}

                                {/* Close Hand with Selected Card as Discard */}
                                {selectedCards.length === 1 && (
                                    <button
                                        onClick={() => onCloseHand(selectedCards[0])}
                                        className="px-6 py-3 bg-yellow-500 text-green-950 font-black rounded-2xl uppercase tracking-tighter text-xs shadow-2xl ring-4 ring-white/10"
                                    >
                                        CERRAR CON ESTA
                                    </button>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* The Hand - Fixed centering and overflow for 8 cards */}
                <div className="w-full max-w-full overflow-x-auto no-scrollbar pointer-events-auto flex justify-center">
                    <div className="min-w-max flex items-end px-12 h-[220px] pb-6">
                        <Reorder.Group
                            axis="x"
                            values={me?.hand || []}
                            onReorder={onReorderHand}
                            className="flex items-end -space-x-10 sm:-space-x-14"
                        >
                            {me?.hand.map((card) => {
                                const inGame = showGroups && myAnalysis.games.some(g => g.some(c => c.id === card.id));
                                const isSelected = selectedCards?.some(c => c.id === card.id);

                                return (
                                    <Reorder.Item
                                        key={card.id}
                                        value={card}
                                        dragListener={gamePhase === 'playing'}
                                        layout
                                        transition={{ type: "spring", stiffness: 500, damping: 40 }}
                                        whileDrag={{ scale: 1.1, zIndex: 100 }}
                                        className="relative flex-shrink-0 active:cursor-grabbing"
                                        style={{ touchAction: "none" }}
                                    >
                                        <div
                                            onClick={() => onCardClick?.(card)}
                                            className={`transition-all duration-300 ${inGame ? 'ring-2 ring-yellow-400 rounded-lg -translate-y-10 shadow-glow-yellow' : ''} ${isSelected ? '-translate-y-20 ring-2 ring-blue-400 scale-110 z-50 shadow-2xl' : ''}`}
                                        >
                                            <div className="scale-[0.75] sm:scale-110 origin-bottom">
                                                <Card card={card} isSelected={isSelected} />
                                            </div>
                                        </div>
                                        {inGame && (
                                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-yellow-400 w-2 h-2 rounded-full shadow-glow-yellow" />
                                        )}
                                    </Reorder.Item>
                                );
                            })}
                        </Reorder.Group>
                    </div>
                </div>

                {/* Score Footer */}
                <div className="mt-2 flex gap-12 text-[10px] font-black uppercase text-white/40 pointer-events-auto">
                    <span>Sueltas: <span className="text-white text-xs">{myAnalysis.score}</span></span>
                    <span>Total: <span className="text-white text-xs">{me?.totalScore || 0}</span></span>
                </div>
            </div>

            {/* Float Info */}
            <div className="absolute top-2 right-2 flex flex-col items-end gap-1 opacity-20 pointer-events-none">
                <div className="text-[10px] font-black uppercase tracking-widest bg-black/40 px-3 py-1 rounded-lg">Ronda {game.round}</div>
            </div>
        </div>
    );

};

export default ChinchonBoard;
