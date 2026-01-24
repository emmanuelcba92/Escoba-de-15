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

            {/* 3. Player Hand Area - Fixed at bottom with absolute positioning */}
            <div className="absolute bottom-0 left-0 right-0 w-full bg-gradient-to-t from-black/80 via-black/40 to-transparent flex flex-col items-center pb-8 h-[240px] justify-end pointer-events-none">

                {/* Floating Action Hint */}
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 pointer-events-auto">
                    <AnimatePresence>
                        {isMyTurn && (
                            <motion.div
                                initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                                className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border-2 ${turnAction === 'draw' ? 'bg-yellow-500 border-yellow-400 text-green-950' : 'bg-green-500 border-green-400 text-white shadow-xl'}`}
                            >
                                {turnAction === 'draw' ? 'Tomá una carta' : 'Tirá una carta o Cerrá'}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* The Hand - Increased height and NO negative space for perfect drag detection */}
                <div className="w-full max-w-full overflow-x-auto no-scrollbar px-4 flex justify-center items-end h-[160px] pointer-events-auto">
                    <Reorder.Group
                        axis="x"
                        values={me?.hand || []}
                        onReorder={onReorderHand}
                        className="flex items-end justify-center gap-2 sm:gap-4 pb-4 px-10"
                    >
                        {me?.hand.map((card) => {
                            const inGame = showGroups && myAnalysis.games.some(g => g.some(c => c.id === card.id));
                            return (
                                <Reorder.Item
                                    key={card.id}
                                    value={card}
                                    dragListener={gamePhase === 'playing'}
                                    layout
                                    transition={{ type: "spring", stiffness: 600, damping: 50 }}
                                    whileDrag={{ scale: 1.1, zIndex: 100 }}
                                    className="relative flex-shrink-0 active:cursor-grabbing"
                                    style={{ touchAction: "none" }}
                                >
                                    <div
                                        onClick={() => {
                                            if (isMyTurn && turnAction === 'discard') onDiscardCard(card);
                                            else onCardClick?.(card);
                                        }}
                                        className={`transition-all ${inGame ? 'ring-2 ring-yellow-400 rounded-lg -translate-y-6 shadow-glow-yellow' : ''} ${selectedCards?.some(c => c.id === card.id) ? '-translate-y-4' : ''}`}
                                    >
                                        <div className="scale-95 sm:scale-100 origin-bottom">
                                            <Card card={card} isSelected={selectedCards?.some(c => c.id === card.id)} />
                                        </div>
                                    </div>
                                    {inGame && (
                                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-yellow-400 w-2.5 h-2.5 rounded-full shadow-glow-yellow" />
                                    )}
                                </Reorder.Item>
                            );
                        })}
                    </Reorder.Group>
                </div>

                {/* Score Footer */}
                <div className="mt-2 flex gap-12 text-[10px] font-black uppercase text-white/40 pointer-events-auto">
                    <span>Sueltas: <span className="text-white">{myAnalysis.score}</span></span>
                    <span>Total: <span className="text-white">{me?.totalScore || 0}</span></span>
                </div>
            </div>

            {/* Float Info */}
            <div className="absolute top-2 right-2 flex flex-col items-end gap-1 opacity-20 pointer-events-none">
                <div className="text-[10px] font-black uppercase tracking-widest bg-black/40 px-3 py-1 rounded-lg">Ronda {game.round}</div>
            </div>

            {/* Close Button - Only if can close */}
            <AnimatePresence>
                {isMyTurn && turnAction === 'discard' && myAnalysis.score < 5 && (
                    <motion.button
                        initial={{ scale: 0, x: "-50%" }} animate={{ scale: 1, x: "-50%" }}
                        onClick={onCloseHand}
                        className="fixed bottom-40 left-1/2 px-8 py-3 bg-green-500 text-white font-black rounded-full uppercase tracking-tighter text-xs shadow-2xl ring-4 ring-white/20 z-[60]"
                    >
                        Cerrar ({myAnalysis.score} pts)
                    </motion.button>
                )}
            </AnimatePresence>
        </div>
    );

};

export default ChinchonBoard;
