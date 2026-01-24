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

            {/* 1. Opponents Row - Fixed Height to prevent pushing board */}
            <div className={`w-full flex-shrink-0 flex justify-around items-start pt-2 sm:pt-10 min-h-[100px] sm:min-h-[140px] ${players.length > 3 ? 'gap-1' : 'gap-4'}`}>
                {players.slice(1).map((p, i) => renderOpponent(p, i))}
            </div>

            {/* 2. Central Area: Deck & Discard - Flex Grow to take remaining space */}
            <div className="flex-1 w-full flex gap-4 sm:gap-10 items-center justify-center">
                {/* Mazo */}
                <motion.div
                    whileHover={isMyTurn && turnAction === 'draw' ? { scale: 1.05 } : {}}
                    whileTap={isMyTurn && turnAction === 'draw' ? { scale: 0.95 } : {}}
                    onClick={() => isMyTurn && turnAction === 'draw' && onDrawCard(true)}
                    className={`relative ${isMyTurn && turnAction === 'draw' ? 'cursor-pointer' : 'cursor-not-allowed opacity-80'} card-responsive`}
                >
                    <div className="relative scale-90 sm:scale-100">
                        <div className="absolute inset-0 bg-blue-900 border border-white/10 rounded-xl translate-x-1 translate-y-1" />
                        <Card card={{}} hidden={true} />
                    </div>
                    <div className="absolute -bottom-2 -right-2 bg-yellow-500 text-green-950 font-black text-[10px] w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shadow-lg ring-2 ring-green-900">
                        {deckSize}
                    </div>
                </motion.div>

                {/* Descarte */}
                <motion.div
                    whileHover={isMyTurn && turnAction === 'draw' && discardPile.length > 0 ? { scale: 1.05 } : {}}
                    whileTap={isMyTurn && turnAction === 'draw' && discardPile.length > 0 ? { scale: 0.95 } : {}}
                    onClick={() => isMyTurn && turnAction === 'draw' && discardPile.length > 0 && onDrawCard(false)}
                    className={`relative ${isMyTurn && turnAction === 'draw' && discardPile.length > 0 ? 'cursor-pointer' : 'cursor-not-allowed'} card-responsive`}
                >
                    <div className="scale-90 sm:scale-100">
                        {discardPile.length > 0 ? (
                            <Card card={discardPile[discardPile.length - 1]} />
                        ) : (
                            <div className="w-20 h-28 sm:w-24 sm:h-36 rounded-xl border-2 border-dashed border-white/20 flex items-center justify-center bg-black/5">
                                <X className="text-white/10" size={32} />
                            </div>
                        )}
                    </div>
                    {discardPile.length > 0 && (
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[9px] font-black uppercase text-white/40 tracking-widest whitespace-nowrap">
                            Descarte ({discardPile.length})
                        </div>
                    )}
                </motion.div>
            </div>

            {/* 3. Player Area - Pinned to bottom, Fixed height */}
            <div className="w-full flex-shrink-0 flex flex-col items-center gap-1 pb-4 sm:pb-8">

                {/* Action Buttons Row */}
                <div className="h-10 flex items-center gap-2">
                    <AnimatePresence>
                        {isMyTurn && turnAction === 'discard' && myAnalysis.score < 5 && (
                            <motion.button
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                exit={{ y: 20, opacity: 0 }}
                                onClick={onCloseHand}
                                className="px-5 py-2 bg-green-500 hover:bg-green-600 text-white font-black rounded-xl uppercase tracking-tighter text-[11px] flex items-center gap-2 shadow-xl ring-2 ring-white/20"
                            >
                                <Check size={16} /> Cerrar ({myAnalysis.score} pts)
                            </motion.button>
                        )}
                    </AnimatePresence>

                    <button
                        onClick={() => setShowGroups(!showGroups)}
                        className={`p-2 rounded-xl border transition-all ${showGroups ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-500 shadow-glow' : 'bg-white/5 border-white/10 text-white/40'}`}
                        title="Ver combinaciones"
                    >
                        <Sparkles size={18} />
                    </button>
                </div>

                {/* Hand: Reorderable List */}
                <div className="w-full max-w-full px-1 overflow-x-visible no-scrollbar pb-2 hand-responsive flex justify-center">
                    <Reorder.Group
                        axis="x"
                        values={me?.hand || []}
                        onReorder={onReorderHand}
                        className="flex justify-center -space-x-12 sm:-space-x-14 px-1 py-2"
                    >
                        {me?.hand.map((card) => {
                            // Marcar si está en un juego para dar feedback visual sin reordenar
                            const inGame = showGroups && myAnalysis.games.some(g => g.some(c => c.id === card.id));

                            return (
                                <Reorder.Item
                                    key={card.id}
                                    value={card}
                                    dragListener={gamePhase === 'playing'}
                                    layout
                                    transition={{
                                        type: "spring",
                                        stiffness: 250, // Un poco más suave para evitar rigidez
                                        damping: 25,    // Controla el rebote para que sea elegante
                                        mass: 0.5       // Más liviano para que responda instantáneamente
                                    }}
                                    whileDrag={{
                                        scale: 1.15,    // Un poco más grande para resaltar el agarre
                                        rotate: 2,
                                        zIndex: 100,
                                        filter: "brightness(1.1)", // Brillo sutil al agarrar
                                        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)"
                                    }}
                                    className="relative flex-shrink-0 cursor-grab active:cursor-grabbing"
                                    style={{ touchAction: "none" }}
                                >
                                    <motion.div
                                        layout
                                        onClick={() => {
                                            if (isMyTurn && turnAction === 'discard') onDiscardCard(card);
                                            else onCardClick?.(card);
                                        }}
                                        className={`transition-all duration-300 ${inGame ? 'ring-2 ring-yellow-400/50 rounded-lg -translate-y-2' : ''}`}
                                    >
                                        <Card
                                            card={card}
                                            isSelected={selectedCards?.some(c => c.id === card.id)}
                                        />
                                    </motion.div>
                                    {inGame && (
                                        <motion.div
                                            layout
                                            className="absolute -top-1 left-1/2 -translate-x-1/2 bg-yellow-400 size-2 rounded-full shadow-glow-yellow animate-pulse"
                                        />
                                    )}
                                </Reorder.Item>
                            );
                        })}
                    </Reorder.Group>
                </div>

                {/* Player Status & Scores */}
                <div className="flex flex-col items-center gap-1">
                    <div className={`px-4 py-1 sm:px-6 sm:py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${isMyTurn
                        ? 'bg-yellow-500 border-yellow-400 text-green-950 shadow-glow'
                        : 'bg-black/40 border-white/10 text-white/60'
                        }`}>
                        {isMyTurn ? (turnAction === 'draw' ? 'Tomá una carta' : 'Tirá una carta o Cerrá') : `${players[currentPlayerIdx]?.name} está jugando...`}
                    </div>

                    <div className="flex gap-4 sm:gap-8 text-[11px] font-bold">
                        <span className="flex items-center gap-1 text-white/40">
                            Sueltas: <span className={`text-[12px] ${myAnalysis.score === 0 ? 'text-green-400' : 'text-white'}`}>{myAnalysis.score}</span>
                        </span>
                        <span className="flex items-center gap-1 text-white/40">
                            Total: <span className="text-white text-[12px]">{me?.totalScore || 0}</span>
                        </span>
                    </div>
                </div>
            </div>

            {/* Mobile Drag Indicator (Hint) */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 pointer-events-none opacity-20 sm:hidden flex items-center gap-1">
                <GripHorizontal size={12} />
                <span className="text-[8px] font-black uppercase tracking-tighter">Arrastrá para ordenar</span>
            </div>

            {/* Round / Difficulty Info overlays */}
            <div className="absolute top-2 right-2 flex flex-col items-end gap-1 opacity-40">
                <div className="text-[10px] font-black uppercase tracking-widest bg-black/40 px-3 py-1 rounded-lg">Ronda {game.round}</div>
            </div>
        </div>
    );
};

export default ChinchonBoard;
