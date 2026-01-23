import React, { useState, useEffect } from 'react';
import Card from './components/Card';

const CardPreview = () => {
    const suits = ['oros', 'bastos', 'espadas', 'copas'];
    const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

    const allCards = [];

    // Generar todas las cartas de palo
    suits.forEach(suit => {
        values.forEach(value => {
            allCards.push({ id: `${suit}-${value}`, suit, value });
        });
    });

    // Añadir Comodines
    allCards.push({ id: 'joker-1', suit: 'joker', value: 1 });
    allCards.push({ id: 'joker-2', suit: 'joker', value: 2 });

    return (
        <div className="min-h-screen bg-green-900 p-8">
            <h1 className="text-white text-3xl font-black mb-8 text-center uppercase tracking-tighter italic">
                Vista Previa de Baraja (50 cartas)
            </h1>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-10 gap-4 max-w-7xl mx-auto">
                {allCards.map(card => (
                    <div key={card.id} className="flex flex-col items-center gap-2">
                        <Card card={card} />
                        <span className="text-white/50 text-[10px] font-bold uppercase">
                            {card.suit === 'joker' ? 'Comodín' : `${card.value} ${card.suit}`}
                        </span>
                    </div>
                ))}
            </div>
            <div className="mt-12 text-center text-white/40 text-xs">
                Mazo completo: 48 cartas + 2 comodines
            </div>
        </div>
    );
};

export default CardPreview;
