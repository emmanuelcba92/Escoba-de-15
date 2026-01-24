import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, X, Star, BarChart3, ChevronRight } from 'lucide-react';
import Card from './Card';

const ChinchonResultsModal = ({ isOpen, players, closingPlayerIdx, onNextRound, round }) => {
    if (!isOpen) return null;

    const winner = players[closingPlayerIdx];

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/80 backdrop-blur-md"
                />

                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    className="relative w-full max-w-2xl bg-slate-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
                >
                    {/* Header */}
                    <div className="bg-gradient-to-r from-yellow-500/20 to-amber-500/20 p-6 text-center border-b border-white/10">
                        <motion.div
                            initial={{ y: -10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="inline-flex items-center gap-2 bg-yellow-500 text-black px-4 py-1 rounded-full text-xs font-black uppercase tracking-wider mb-2"
                        >
                            <Star size={14} fill="black" />
                            Fin de la Ronda {round}
                        </motion.div>
                        <h2 className="text-3xl font-black text-white italic">
                            ¡{winner?.name} cerró la mano!
                        </h2>
                    </div>

                    {/* Content */}
                    <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
                        <div className="space-y-6">
                            {players.map((player, idx) => (
                                <motion.div
                                    key={player.id}
                                    initial={{ x: -20, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    transition={{ delay: 0.3 + idx * 0.1 }}
                                    className={`p-4 rounded-2xl border ${idx === closingPlayerIdx
                                            ? 'bg-yellow-500/10 border-yellow-500/30'
                                            : 'bg-white/5 border-white/10'
                                        }`}
                                >
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black ${idx === closingPlayerIdx ? 'bg-yellow-500 text-black' : 'bg-white/10 text-white'
                                                }`}>
                                                {idx === closingPlayerIdx ? <Trophy size={18} /> : player.name[0]}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-white leading-none">{player.name}</h3>
                                                <p className="text-[10px] text-white/40 uppercase mt-1">
                                                    {player.isEliminated ? 'ELIMINADO' : 'EN JUEGO'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-2xl font-black text-white">
                                                +{player.roundScore}
                                            </div>
                                            <div className="text-[10px] text-white/40 uppercase">
                                                Total: {player.totalScore}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Mini Hand View */}
                                    <div className="flex flex-wrap gap-1 justify-center bg-black/20 p-3 rounded-xl">
                                        {/* Games */}
                                        {player.games.map((group, gIdx) => (
                                            <div key={`g-${gIdx}`} className="flex -space-x-6 border border-yellow-500/20 rounded-lg p-1 bg-yellow-500/5">
                                                {group.map((card) => (
                                                    <div key={card.id} className="scale-[0.4] origin-top">
                                                        <Card card={card} />
                                                    </div>
                                                ))}
                                            </div>
                                        ))}
                                        {/* Loose */}
                                        <div className="flex -space-x-6">
                                            {player.looseCards.map((card) => (
                                                <div key={card.id} className="scale-[0.4] origin-top grayscale-[0.5]">
                                                    <Card card={card} />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    {/* Footer / Action */}
                    <div className="p-6 bg-white/5 border-t border-white/10 flex gap-4">
                        <button
                            onClick={onNextRound}
                            className="flex-1 bg-white text-black h-14 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-yellow-400 transition-colors uppercase tracking-widest text-sm"
                        >
                            Siguiente Ronda
                            <ChevronRight size={20} strokeWidth={3} />
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default ChinchonResultsModal;
