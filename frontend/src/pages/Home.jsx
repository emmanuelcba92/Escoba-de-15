import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock } from 'lucide-react';

// Iconos de baraja española
const OrosIcon = ({ size = 24, className = '' }) => (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className}>
        <circle cx="12" cy="12" r="9" fill="currentColor" />
        <circle cx="12" cy="12" r="5" fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth="1.5" />
    </svg>
);

const CopasIcon = ({ size = 24, className = '' }) => (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className}>
        <path d="M12 3C8 3 5 6 5 9c0 3 2 5 4 6v3H8v2h8v-2h-1v-3c2-1 4-3 4-6 0-3-3-6-7-6z" fill="currentColor" />
    </svg>
);

const EspadasIcon = ({ size = 24, className = '' }) => (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className}>
        <path d="M12 2L10 10H8l4 10 4-10h-2L12 2z" fill="currentColor" />
        <rect x="11" y="18" width="2" height="4" fill="currentColor" />
        <rect x="9" y="20" width="6" height="2" rx="1" fill="currentColor" />
    </svg>
);

const BastosIcon = ({ size = 24, className = '' }) => (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className}>
        <rect x="10.5" y="4" width="3" height="16" rx="1.5" fill="currentColor" />
        <circle cx="12" cy="5" r="3" fill="currentColor" />
        <ellipse cx="8" cy="10" rx="2.5" ry="3" fill="currentColor" transform="rotate(-30 8 10)" />
        <ellipse cx="16" cy="10" rx="2.5" ry="3" fill="currentColor" transform="rotate(30 16 10)" />
    </svg>
);

const games = [
    {
        id: 'escoba',
        name: 'Escoba de 15',
        description: 'El clásico juego de levantar cartas que sumen 15',
        icon: OrosIcon,
        color: 'from-yellow-500 to-orange-600',
        available: true,
        path: '/escoba',
        players: '2-4 jugadores'
    },
    {
        id: 'chinchon',
        name: 'Chinchón',
        description: 'Arma combinaciones y cierra la mano primero',
        icon: CopasIcon,
        color: 'from-red-500 to-pink-600',
        available: true,
        path: '/chinchon',
        players: '2-4 jugadores'
    },
    {
        id: 'jodete',
        name: '150 (Jodete)',
        description: 'Evitá llegar a 150 puntos y sobreviví',
        icon: BastosIcon,
        color: 'from-green-500 to-emerald-600',
        available: false,
        path: '/jodete',
        players: '2-6 jugadores'
    },
    {
        id: 'truco',
        name: 'Truco',
        description: 'Engaño, estrategia y el clásico argentino',
        icon: EspadasIcon,
        color: 'from-blue-500 to-indigo-600',
        available: false,
        path: '/truco',
        players: '2-6 jugadores'
    }
];

const GameCard = ({ game, onClick }) => {
    const Icon = game.icon;

    return (
        <motion.div
            whileHover={{ scale: game.available ? 1.03 : 1, y: game.available ? -5 : 0 }}
            whileTap={{ scale: game.available ? 0.98 : 1 }}
            onClick={() => !game.available && onClick(game)}
            className={`relative overflow-hidden rounded-3xl border transition-all duration-300 ${game.available
                ? 'cursor-pointer border-white/20 hover:border-white/40 shadow-xl hover:shadow-2xl'
                : 'cursor-pointer border-white/10 opacity-70 hover:opacity-90'
                }`}
        >
            {/* Gradient Background */}
            <div className={`absolute inset-0 bg-gradient-to-br ${game.color} opacity-20`} />

            {/* Content */}
            <div className="relative p-6 sm:p-8 flex flex-col h-full backdrop-blur-sm bg-white/5">
                <div className="flex items-start justify-between mb-4">
                    <div className={`p-3 rounded-2xl bg-gradient-to-br ${game.color} shadow-lg`}>
                        <Icon size={28} className="text-white" />
                    </div>
                    {!game.available && (
                        <span className="bg-white/10 text-white/60 text-[9px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full flex items-center gap-1">
                            <Clock size={10} /> Próximamente
                        </span>
                    )}
                    {game.available && (
                        <span className="bg-green-500/20 text-green-400 text-[9px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full flex items-center gap-1">
                            <Sparkles size={10} /> Disponible
                        </span>
                    )}
                </div>

                <h3 className="text-xl sm:text-2xl font-black text-white mb-2">{game.name}</h3>
                <p className="text-white/50 text-sm mb-4 flex-1">{game.description}</p>

                <div className="flex items-center justify-between">
                    <span className="text-white/30 text-xs font-medium">{game.players}</span>
                    {game.available ? (
                        <Link
                            to={game.path}
                            className={`px-6 py-2.5 rounded-xl font-bold text-sm uppercase tracking-wide bg-gradient-to-r ${game.color} text-white shadow-lg hover:shadow-xl transition-all`}
                        >
                            Jugar
                        </Link>
                    ) : (
                        <span className="px-6 py-2.5 rounded-xl font-bold text-sm uppercase tracking-wide bg-white/10 text-white/40">
                            Pronto
                        </span>
                    )}
                </div>
            </div>
        </motion.div>
    );
};

const ComingSoonModal = ({ game, onClose }) => {
    if (!game) return null;
    const Icon = game.icon;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="relative bg-green-950/90 border border-white/20 rounded-[32px] p-8 sm:p-12 max-w-md w-full text-center shadow-2xl backdrop-blur-xl"
            >
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
                >
                    <X size={24} />
                </button>

                <div className={`mx-auto w-20 h-20 rounded-3xl bg-gradient-to-br ${game.color} flex items-center justify-center mb-6 shadow-xl`}>
                    <Icon size={40} className="text-white" />
                </div>

                <h2 className="text-3xl font-black text-white mb-2">{game.name}</h2>
                <p className="text-white/50 mb-6">{game.description}</p>

                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
                    <div className="flex items-center justify-center gap-2 text-yellow-500 mb-2">
                        <Clock size={20} />
                        <span className="font-bold uppercase tracking-widest text-sm">Próximamente</span>
                    </div>
                    <p className="text-white/40 text-sm">
                        Estamos trabajando en este juego. ¡Volvé pronto para probarlo!
                    </p>
                </div>

                <button
                    onClick={onClose}
                    className="w-full py-4 rounded-2xl font-bold uppercase tracking-widest bg-white/10 text-white hover:bg-white/20 transition-all"
                >
                    Entendido
                </button>
            </motion.div>
        </motion.div>
    );
};

const Home = () => {
    const [selectedGame, setSelectedGame] = useState(null);

    return (
        <div className="min-h-screen bg-green-900 felt-bg overflow-y-auto">
            {/* Background Effects */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-yellow-500/10 rounded-full blur-[150px]" />
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[150px]" />
            </div>

            <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
                {/* Header */}
                <div className="text-center mb-12 sm:mb-16">
                    <motion.h1
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-4xl sm:text-6xl lg:text-7xl font-black text-white italic tracking-tighter mb-4"
                    >
                        Juegos de
                        <span className="block text-yellow-500 text-glow">Naipes</span>
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="text-white/40 text-base sm:text-xl max-w-md mx-auto"
                    >
                        Los clásicos juegos de cartas argentinos, en tu navegador
                    </motion.p>
                </div>

                {/* Games Grid */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6"
                >
                    {games.map((game, index) => (
                        <motion.div
                            key={game.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 * index }}
                        >
                            <GameCard game={game} onClick={setSelectedGame} />
                        </motion.div>
                    ))}
                </motion.div>

                {/* Footer */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="text-center mt-12 sm:mt-16"
                >
                    <p className="text-white/20 text-xs font-medium uppercase tracking-widest">
                        Hecho con ❤️ en Argentina
                    </p>
                </motion.div>
            </div>

            {/* Coming Soon Modal */}
            <AnimatePresence>
                {selectedGame && (
                    <ComingSoonModal game={selectedGame} onClose={() => setSelectedGame(null)} />
                )}
            </AnimatePresence>
        </div>
    );
};

export default Home;
