import React from 'react';
import clsx from 'clsx';

const Card = ({ card, onClick, isSelected, isPlayable, hidden }) => {
    const { suit, value } = card;

    // Sprite Configuration
    const spritePath = '/assets/cartas/sprite_corregido.png';

    // Nueva lógica simplificada para la baraja diseñada a medida
    // El sprite es una cuadrícula perfecta de 10 columnas x 4 filas (sin etiquetas laterales)

    // Config
    const ZOOM = 1.02; // Zoom mínimo para asegurar que no se vean líneas de rejilla
    const NUM_CARDS = 10;
    const NUM_ROWS = 4;

    // Orden de palos según el nuevo diseño (Oros, Bastos, Espadas, Copas)
    const suitOrder = ['oros', 'bastos', 'espadas', 'copas'];
    const valueOrder = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12];

    const rowIndex = suitOrder.indexOf(suit);
    const valIndex = valueOrder.indexOf(value);

    const rIdx = rowIndex === -1 ? 0 : rowIndex;
    const cIdx = valIndex === -1 ? 0 : valIndex;

    // Geometría perfecta
    const totalUnitsW = NUM_CARDS;
    const imgWidth = totalUnitsW * 100 * ZOOM;
    const imgHeight = NUM_ROWS * 100 * ZOOM;

    // Centro de la carta (cIdx va de 0 a 9)
    const centerUnitX = cIdx + 0.5;
    const centerUnitY = rIdx + 0.5;

    // Posicionamiento
    const leftPos = 50 - (centerUnitX * 100 * ZOOM);
    const topPos = 50 - (centerUnitY * 100 * ZOOM);

    const backStyle = {
        backgroundColor: '#1e3a8a',
        backgroundImage: `
          repeating-linear-gradient(45deg, transparent, transparent 9px, rgba(255,255,255,0.2) 10px, transparent 11px),
          repeating-linear-gradient(-45deg, transparent, transparent 9px, rgba(255,255,255,0.2) 10px, transparent 11px)
      `,
    };

    return (
        <div
            onClick={() => onClick && onClick(card)}
            className={`relative w-20 h-28 sm:w-20 sm:h-28 md:w-24 md:h-36 rounded-lg shadow-xl ${isSelected ? 'ring-4 ring-yellow-400' : ''
                } bg-white overflow-hidden border-2 border-white/10 select-none group pointer-events-auto transition-all`}
        >
            {/* Hidden internal label */}
            <div className="sr-only">{value} of {suit}</div>

            {/* Card Face */}
            {!hidden && (
                <div className="absolute inset-0 overflow-hidden rounded-lg bg-white">
                    <img
                        src={spritePath}
                        alt=""
                        className="max-w-none absolute select-none pointer-events-none"
                        style={{
                            width: `${imgWidth}%`,
                            height: `${imgHeight}%`,
                            left: `${leftPos}%`,
                            top: `${topPos}%`,
                            imageRendering: 'high-quality'
                        }}
                    />
                </div>
            )}

            {/* Back Decoration */}
            {hidden && (
                <div className="w-full h-full relative" style={backStyle}>
                    <div className="absolute inset-2 border-2 border-white/20 rounded-md"></div>
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 border-2 border-white/40 rotate-45 bg-white/10 shadow-sm"></div>
                </div>
            )}
        </div>
    );
};

export default Card;
