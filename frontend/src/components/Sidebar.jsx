import React from 'react';
import { Trophy, History, Timer, User } from 'lucide-react';

const Sidebar = ({ players, currentPlayerId, gameLog, timeLeft = 30, stats = { wins: 0, losses: 0 } }) => {
    return (
        <div className="w-80 h-full glass-panel border-l border-white/10 p-6 flex flex-col space-y-8 overflow-hidden relative z-30">
            {/* Timer Section */}
            <div className="space-y-2">
                <div className="flex items-center justify-between text-white/60 text-sm font-semibold uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                        <Timer size={16} />
                        <span>Turno actual</span>
                    </div>
                    <span className={timeLeft < 10 ? 'text-red-400' : 'text-yellow-400'}>{timeLeft}s</span>
                </div>
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <div
                        className={`h-full transition-all duration-1000 ${timeLeft < 10 ? 'bg-red-500' : 'bg-yellow-500'}`}
                        style={{ width: `${(timeLeft / 30) * 100}%` }}
                    ></div>
                </div>
            </div>

            {/* Stats Section */}
            <div className="grid grid-cols-2 gap-3">
                <div className="glass-card rounded-xl p-3 flex flex-col items-center">
                    <span className="text-xs text-white/40 font-bold uppercase">Victorias</span>
                    <span className="text-2xl font-black text-green-400">{stats.wins}</span>
                </div>
                <div className="glass-card rounded-xl p-3 flex flex-col items-center">
                    <span className="text-xs text-white/40 font-bold uppercase">Derrotas</span>
                    <span className="text-2xl font-black text-red-400">{stats.losses}</span>
                </div>
            </div>

            {/* Players Section */}
            <div className="space-y-4 flex-1 overflow-y-auto pr-1">
                <h3 className="text-white/40 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                    <User size={14} /> Puntuación
                </h3>
                <div className="space-y-3">
                    {players.map((p) => (
                        <div
                            key={p.id}
                            className={`p-4 rounded-2xl transition-all duration-300 border-2 ${currentPlayerId === p.id
                                    ? 'glass-card border-yellow-500/50 shadow-lg shadow-yellow-500/10'
                                    : 'bg-white/5 border-transparent opacity-80'
                                }`}
                        >
                            <div className="flex justify-between items-center mb-1">
                                <span className="font-bold text-white/90">{p.name}</span>
                                <span className="text-2xl font-black text-white">{p.score} <span className="text-sm font-normal text-white/40">pts</span></span>
                            </div>
                            <div className="flex gap-4 text-xs font-medium text-white/50">
                                <span>🎴 {p.capturedCards?.length || 0} cartas</span>
                                <span>✨ {p.escobas} escobas</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Game Log */}
            <div className="h-1/3 flex flex-col space-y-3">
                <h3 className="text-white/40 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                    <History size={14} /> Historial
                </h3>
                <div className="flex-1 overflow-y-auto space-y-2 pr-2 scrollbar-style pb-4">
                    {gameLog.map((log, i) => (
                        <div key={i} className={`text-sm p-3 rounded-xl border ${i === 0 ? 'bg-white/10 border-white/20 text-white font-medium scale-100' : 'border-transparent text-white/30 scale-95 opacity-50'}`}>
                            {log}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Sidebar;
