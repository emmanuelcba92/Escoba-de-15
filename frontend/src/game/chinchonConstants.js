export const SUITS = ['oros', 'copas', 'espadas', 'bastos'];
export const VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]; // Incluye 8 y 9

export const JOKER_VALUE = 25; // Valor si queda suelto
export const CHINCHON_WIN = -1000; // Marcador especial para victoria instantánea
export const CHINCHON_SCORE = -10; // Chinchón con comodín
export const NO_LOOSE_CARDS_SCORE = -10; // Sin cartas sueltas

// Crear baraja de 50 cartas (48 españolas + 2 comodines)
export const createChinchonDeck = () => {
    const deck = [];

    // Cartas normales (48)
    SUITS.forEach(suit => {
        VALUES.forEach(value => {
            deck.push({
                suit,
                value,
                id: `${suit}_${value}`,
                numericValue: value,
                isJoker: false
            });
        });
    });

    // Comodines (2)
    deck.push({
        suit: 'joker',
        value: 1,
        id: 'joker_1',
        numericValue: JOKER_VALUE,
        isJoker: true
    });

    deck.push({
        suit: 'joker',
        value: 2,
        id: 'joker_2',
        numericValue: JOKER_VALUE,
        isJoker: true
    });

    return deck;
};

export const shuffleDeck = (deck) => {
    const newDeck = [...deck];
    for (let i = newDeck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
    }
    return newDeck;
};
