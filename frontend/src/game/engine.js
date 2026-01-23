import { SUITS, VALUES, getCardValue } from './constants';

export const createDeck = () => {
    const deck = [];
    SUITS.forEach(suit => {
        VALUES.forEach(value => {
            deck.push({
                suit,
                value,
                id: `${suit}_${value}`,
                numericValue: getCardValue(value)
            });
        });
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

export const checkSum15 = (cardPlayed, tableCardsSelected) => {
    const sum = cardPlayed.numericValue + tableCardsSelected.reduce((acc, card) => acc + card.numericValue, 0);
    return sum === 15;
};

export const checkTableSum15 = (tableCardsSelected) => {
    if (tableCardsSelected.length < 2) return false;
    const sum = tableCardsSelected.reduce((acc, card) => acc + card.numericValue, 0);
    return sum === 15;
};

export const calculateMatchPoints = (players, playMode = 'individual') => {
    const isTeams = playMode === 'teams' && players.length === 4;
    let groups = [];

    if (isTeams) {
        groups = [
            {
                name: 'Equipo A (P1+P3)',
                cards: [...players[0].capturedCards, ...players[2].capturedCards],
                escobas: (players[0].escobas || 0) + (players[2].escobas || 0),
                originalIndices: [0, 2]
            },
            {
                name: 'Equipo B (P2+P4)',
                cards: [...players[1].capturedCards, ...players[3].capturedCards],
                escobas: (players[1].escobas || 0) + (players[3].escobas || 0),
                originalIndices: [1, 3]
            }
        ];
    } else {
        groups = players.map((p, i) => ({
            name: p.name,
            cards: p.capturedCards,
            escobas: p.escobas,
            originalIndices: [i]
        }));
    }

    const results = groups.map(() => ({ score: 0, details: [] }));

    // 1. Escobas
    groups.forEach((g, i) => {
        if (g.escobas > 0) {
            results[i].score += g.escobas;
            results[i].details.push(`${g.escobas} Escobas (+${g.escobas})`);
        }
    });

    // 2. Velos (As, 7, 12 of Oros) -> 1 point EACH
    const velosCards = [
        { suit: 'oros', value: 1, name: 'As de Oros' },
        { suit: 'oros', value: 7, name: '7 de Oros' },
        { suit: 'oros', value: 12, name: 'Rey de Oros' }
    ];

    velosCards.forEach(velo => {
        groups.forEach((g, i) => {
            if (g.cards.some(c => c.suit === velo.suit && c.value === velo.value)) {
                results[i].score += 1;
                results[i].details.push(`Velo: ${velo.name} (+1)`);
            }
        });
    });

    // 3. Cantidad de Cartas
    const cardCounts = groups.map(g => g.cards.length);
    const maxCards = Math.max(...cardCounts);
    const winnersCards = groups.filter((g, i) => cardCounts[i] === maxCards && maxCards > 0);
    if (winnersCards.length === 1) { // Tie-break: Usually no point if tie in some rules, but 1vs1 tie = no point.
        const idx = groups.findIndex((g, i) => cardCounts[i] === maxCards);
        results[idx].score += 1;
        results[idx].details.push(`Más Cartas (${maxCards}) (+1)`);
    }

    // 4. Cantidad de Oros
    const orosCounts = groups.map(g => g.cards.filter(c => c.suit === 'oros').length);
    const maxOros = Math.max(...orosCounts);
    const winnersOros = groups.filter((g, i) => orosCounts[i] === maxOros && maxOros > 0);
    if (winnersOros.length === 1) {
        const idx = groups.findIndex((g, i) => orosCounts[i] === maxOros);
        results[idx].score += 1;
        results[idx].details.push(`Más Oros (${maxOros}) (+1)`);
    }

    // 5. Setentas
    const getSetentaValue = (v) => {
        const values = {
            7: 21,
            6: 18,
            1: 16,
            5: 15,
            4: 14,
            3: 13,
            2: 12,
            10: 10,
            11: 10,
            12: 10
        };
        return values[v] || 0;
    };

    const calcSetentaSum = (cards) => {
        const suits = ['oros', 'copas', 'espadas', 'bastos'];
        return suits.reduce((total, suit) => {
            const suitCards = cards.filter(c => c.suit === suit);
            return total + (suitCards.length > 0 ? Math.max(...suitCards.map(c => getSetentaValue(c.value))) : 0);
        }, 0);
    };

    const setentasSums = groups.map(g => calcSetentaSum(g.cards));
    const maxSetentas = Math.max(...setentasSums);
    const winnersSetentas = groups.filter((g, i) => setentasSums[i] === maxSetentas && maxSetentas > 0);
    if (winnersSetentas.length === 1) {
        const idx = groups.findIndex((g, i) => setentasSums[i] === maxSetentas);
        results[idx].score += 1;
        results[idx].details.push(`Setentas (${maxSetentas} pts) (+1)`);
    }

    return results;
};

export const findInitialEscobas = (cards) => {
    let escobas = [];
    let remaining = [...cards];

    const checkAndConsume = () => {
        // Buscamos combinaciones de 2, 3 o 4 cartas que sumen 15
        for (let size = 2; size <= remaining.length; size++) {
            if (size === 2) {
                for (let i = 0; i < remaining.length; i++) {
                    for (let j = i + 1; j < remaining.length; j++) {
                        if (remaining[i].numericValue + remaining[j].numericValue === 15) {
                            const found = [remaining[i], remaining[j]];
                            remaining = remaining.filter((_, idx) => idx !== i && idx !== j);
                            return found;
                        }
                    }
                }
            }
            if (size === 3 && remaining.length >= 3) {
                for (let i = 0; i < remaining.length; i++) {
                    for (let j = i + 1; j < remaining.length; j++) {
                        for (let k = j + 1; k < remaining.length; k++) {
                            if (remaining[i].numericValue + remaining[j].numericValue + remaining[k].numericValue === 15) {
                                const found = [remaining[i], remaining[j], remaining[k]];
                                remaining = remaining.filter((_, idx) => idx !== i && idx !== j && idx !== k);
                                return found;
                            }
                        }
                    }
                }
            }
            if (size === 4 && remaining.length === 4) {
                const total = remaining.reduce((acc, c) => acc + c.numericValue, 0);
                if (total === 15) {
                    const found = [...remaining];
                    remaining = [];
                    return found;
                }
            }
        }
        return null;
    };

    let result;
    while ((result = checkAndConsume())) {
        escobas.push(result);
    }

    return { escobas, remaining };
};
