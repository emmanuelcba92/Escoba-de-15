import React from 'react';
import { motion } from 'framer-motion';
import { Heart, ArrowLeft, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

const ComingSoon = ({ gameName, gameIcon: Icon, gradientFrom, gradientTo }) => {
    return (
        <div className="min-h-screen bg-green-900 felt-bg flex items-center justify-center p-4">
            {/* Background Effects */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className={`absolute top-1/4 left-1/4 w-96 h-96 bg-${gradientFrom}/20 rounded-full blur-[150px]`} />
                <div className={`absolute bottom-1/4 right-1/4 w-96 h-96 bg-${gradientTo}/20 rounded-full blur-[150px]`} />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative z-10 max-w-lg w-full text-center"
            >
                {/* Back Button */}
                <Link
                    to="/"
                    className="absolute top-0 left-0 -translate-y-16 text-white/40 hover:text-white transition-colors flex items-center gap-2 text-sm font-bold"
                >
                    <ArrowLeft size={16} /> Volver al menú
                </Link>

                {/* Card */}
                <div className="glass-panel border border-white/10 rounded-[40px] p-12 backdrop-blur-2xl">
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', delay: 0.2 }}
                        className={`mx-auto w-24 h-24 rounded-3xl bg-gradient-to-br from-${gradientFrom} to-${gradientTo} flex items-center justify-center mb-8 shadow-2xl`}
                    >
                        <Icon size={48} className="text-white" />
                    </motion.div>

                    <h1 className="text-4xl sm:text-5xl font-black text-white italic tracking-tighter mb-4">
                        {gameName}
                    </h1>

                    <div className="flex items-center justify-center gap-2 text-yellow-500 mb-6">
                        <Clock size={20} className="animate-pulse" />
                        <span className="font-bold uppercase tracking-widest text-sm">Próximamente</span>
                    </div>

                    <p className="text-white/50 text-lg mb-8 leading-relaxed">
                        Estamos trabajando en este juego. <br />
                        ¡Volvé pronto para probarlo!
                    </p>

                    <div className="space-y-3">
                        <Link
                            to="/escoba"
                            className="block w-full py-4 rounded-2xl font-bold uppercase tracking-widest bg-yellow-500 text-green-950 hover:bg-yellow-400 transition-all shadow-lg"
                        >
                            Jugar Escoba de 15
                        </Link>
                        <Link
                            to="/"
                            className="block w-full py-4 rounded-2xl font-bold uppercase tracking-widest bg-white/10 text-white hover:bg-white/20 transition-all"
                        >
                            Ver todos los juegos
                        </Link>
                    </div>
                </div>

                <p className="text-white/20 text-xs font-medium uppercase tracking-widest mt-8">
                    Hecho con ❤️ en Argentina
                </p>
            </motion.div>
        </div>
    );
};

export const JodetePage = () => (
    <ComingSoon
        gameName="150 (Jodete)"
        gameIcon={({ size, className }) => (
            <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="currentColor">
                <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-1 15v-4H8l5-7v4h3l-5 7z" />
            </svg>
        )}
        gradientFrom="green-500"
        gradientTo="emerald-600"
    />
);

export const TrucoPage = () => (
    <ComingSoon
        gameName="Truco"
        gameIcon={({ size, className }) => (
            <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="currentColor">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
        )}
        gradientFrom="blue-500"
        gradientTo="indigo-600"
    />
);

export default ComingSoon;

