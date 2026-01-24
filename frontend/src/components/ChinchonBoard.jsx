import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import Card from './Card';
import { X, Check, Sparkles, GripHorizontal, Trophy, Palette, Wand2 } from 'lucide-react';
import { findBestCombination } from '../game/chinchonEngine';

// Audio helper
const playSound = (type) => {
    const sounds = {
        draw: 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3',
        discard: 'https://assets.mixkit.co/active_storage/sfx/2014/2014-preview.mp3',
        close: 'https://assets.mixkit.co/active_storage/sfx/2010/2010-preview.mp3'
    };
    const audio = new Audio(sounds[type]);
    audio.volume = 0.4;
    audio.play().catch(() => { }); // Ignore interaction errors
};

const ChinchonBoard = ({ game, onDrawCard, onDiscardCard, onCloseHand, onCardClick, onReorderHand, onAutoSort }) => {
    const { players, currentPlayerIdx, discardPile, deckSize, turnAction, gamePhase, selectedCards, waitingForOpponent, myPlayerIdx, gameMode } = game;
    const [showGroups, setShowGroups] = useState(true);
    const [tableColor, setTableColor] = useState('green-900'); // green-900 or slate-900

    const me = players[myPlayerIdx] || players[0];
    const isMyTurn = currentPlayerIdx === myPlayerIdx && gamePhase === 'playing';

    // Análisis de mi mano para mostrar sugerencias sin mover el orden real
    const myAnalysis = useMemo(() => findBestCombination(me?.hand || []), [me?.hand]);

    // Sonidos reactivos
    useEffect(() => {
        if (gamePhase === 'playing') {
            if (turnAction === 'discard') playSound('draw');
        } else if (gamePhase === 'showing') {
            playSound('close');
        }
    }, [turnAction, gamePhase]);

    const handleDiscard = (card) => {
        playSound('discard');
        onDiscardCard(card);
    };

    const handleDraw = (fromDeck) => {
        onDrawCard(fromDeck);
    };

    // Función para renderizar el grupo de oponentes
    const renderOpponent = (player, idx) => {
        // Encontrar el índice real del oponente
        const actualIdx = players.indexOf(player);
        const isTurn = currentPlayerIdx === actualIdx;
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

    // Filtrar oponentes (todos menos yo)
    const opponents = players.filter((_, i) => i !== myPlayerIdx);

    return (
        <div className={`h-full w-full flex flex-col items-center relative felt-bg overflow-hidden text-white safe-areas select-none transition-colors duration-1000 ${tableColor === 'green-900' ? 'bg-green-900' : 'bg-slate-900'
            }`}>

            {/* Waiting Overlay */}
            <AnimatePresence>
                {waitingForOpponent && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="absolute inset-0 z-[200] bg-black/60 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center"
                    >
                        <div className="space-y-6">
                            <div className="w-20 h-20 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto" />
                            <div className="space-y-2">
                                <h2 className="text-3xl font-black text-white uppercase tracking-tighter italic">Esperando Oponente</h2>
                                <p className="text-white/40 text-sm font-bold uppercase tracking-widest">Código de sala: {game.roomId}</p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 1. Opponents Row - Fixed area */}
            <div className="w-full flex-shrink-0 flex justify-around items-start pt-2 min-h-[120px]">
                {opponents.map((p, i) => renderOpponent(p, i))}
            </div>

            {/* 2. Central Area: Deck & Discard - Centered perfectly */}
            <div className="flex-1 w-full flex items-center justify-center gap-8 sm:gap-16">
                <motion.div
                    onClick={() => isMyTurn && turnAction === 'draw' && handleDraw(true)}
                    className={`relative ${isMyTurn && turnAction === 'draw' ? 'cursor-pointer hover:scale-105 active:scale-95 transition-all' : 'opacity-50'} card-responsive`}
                >
                    <div className="scale-75 sm:scale-100">
                        <Card card={{}} hidden={true} />
                        <div className="absolute -bottom-2 -right-2 bg-yellow-500 text-green-950 font-black text-xs w-6 h-6 rounded-full flex items-center justify-center shadow-lg ring-2 ring-green-900">
                            {deckSize}
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    onClick={() => isMyTurn && turnAction === 'draw' && discardPile.length > 0 && handleDraw(false)}
                    className={`relative ${isMyTurn && turnAction === 'draw' && discardPile.length > 0 ? 'cursor-pointer hover:scale-105 active:scale-95 transition-all' : 'opacity-50'} card-responsive`}
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
                        {isMyTurn && (
                            <motion.div
                                initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }}
                                className="mb-2 px-4 py-1 bg-yellow-500 rounded-lg text-[10px] font-black uppercase text-green-950 shadow-glow animate-bounce"
                            >
                                ✨ TU TURNO ✨
                            </motion.div>
                        )}

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
                                        onClick={() => handleDiscard(selectedCards[0])}
                                        className="px-6 py-3 bg-white text-green-950 font-black rounded-2xl uppercase tracking-tighter text-xs shadow-2xl ring-4 ring-white/10 hover:bg-white/90 active:scale-95 transition-all"
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

                {/* The Hand - Center if fits, scroll if not, no clipping */}
                <div className="w-full max-w-full overflow-x-auto no-scrollbar pointer-events-auto">
                    <div className="flex min-w-full justify-center items-end h-[220px] pb-6 px-4">
                        <Reorder.Group
                            axis="x"
                            values={me?.hand || []}
                            onReorder={onReorderHand}
                            className="flex items-end -space-x-14 sm:-space-x-12"
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
                                            <div className="scale-[0.8] sm:scale-110 origin-bottom">
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

            {/* Round & Settings Controls */}
            <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-50 flex items-center gap-2">
                {/* Auto Sort Button */}
                <button
                    onClick={() => { playSound('draw'); onAutoSort(); }}
                    className="text-white/60 hover:text-white transition-all font-bold text-[10px] sm:text-xs bg-black/40 px-3 py-2 rounded-xl backdrop-blur-md border border-white/10 flex items-center gap-2"
                >
                    <Wand2 size={16} className="text-yellow-400" />
                    AUTOSORT
                </button>

                {/* Table Color Toggle */}
                <button
                    onClick={() => setTableColor(prev => prev === 'green-900' ? 'slate-900' : 'green-900')}
                    className="text-white/60 hover:text-white transition-all font-bold text-[10px] sm:text-xs bg-black/40 p-2 rounded-xl backdrop-blur-md border border-white/10"
                >
                    <Palette size={16} />
                </button>

                <div className="text-[10px] font-black uppercase tracking-widest bg-yellow-500 text-green-950 px-3 py-2 rounded-xl shadow-lg">
                    Ronda {game.round}
                </div>
            </div>
        </div>
    );

};

export default ChinchonBoard;
