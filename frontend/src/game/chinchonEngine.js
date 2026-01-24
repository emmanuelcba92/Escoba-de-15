import { JOKER_VALUE, CHINCHON_WIN, CHINCHON_SCORE, NO_LOOSE_CARDS_SCORE } from './chinchonConstants';

/**
 * Detecta si un grupo de cartas forma una ESCALERA válida
 * @param {Array} cards - Cartas a verificar
 * @returns {boolean}
 */
export const isValidRun = (cards) => {
    if (cards.length < 3) return false;

    // Separar comodines de cartas normales
    const jokers = cards.filter(c => c.isJoker);
    const normal = cards.filter(c => !c.isJoker).sort((a, b) => a.value - b.value);

    // Todas las cartas normales deben ser del mismo palo
    if (normal.length > 0) {
        const suit = normal[0].suit;
        if (!normal.every(c => c.suit === suit)) return false;
    }

    // Verificar secuencia con comodines
    let jokersUsed = 0;
    for (let i = 0; i < normal.length - 1; i++) {
        const gap = normal[i + 1].value - normal[i].value - 1;
        if (gap < 0) return false; // Duplicados
        if (gap > 0) {
            jokersUsed += gap;
            if (jokersUsed > jokers.length) return false;
        }
    }

    return jokersUsed <= jokers.length;
};

/**
 * Detecta si un grupo de cartas forma un TRÍO/CUARTETO válido
 * @param {Array} cards - Cartas a verificar
 * @returns {boolean}
 */
export const isValidSet = (cards) => {
    if (cards.length < 3) return false;

    const jokers = cards.filter(c => c.isJoker);
    const normal = cards.filter(c => !c.isJoker);

    // Todas las cartas normales deben tener el mismo valor
    if (normal.length > 0) {
        const value = normal[0].value;
        if (!normal.every(c => c.value === value)) return false;
    }

    // Verificar que no haya más de 4 cartas del mismo valor (máximo 4 palos)
    return cards.length <= 4;
};

/**
 * Detecta si es un CHINCHÓN (7 cartas escalera mismo palo)
 * @param {Array} cards - Cartas a verificar
 * @returns {Object} { isChinchon: boolean, hasJoker: boolean }
 */
export const isChinchon = (cards) => {
    if (cards.length !== 7) return { isChinchon: false, hasJoker: false };

    const hasJoker = cards.some(c => c.isJoker);
    const isRun = isValidRun(cards);

    if (!isRun) return { isChinchon: false, hasJoker: false };

    // Es chinchón si es escalera de 7 cartas
    return { isChinchon: true, hasJoker };
};

/**
 * Genera todas las combinaciones de k elementos de un array
 */
const getCombinations = (arr, k) => {
    if (k === 0) return [[]];
    if (arr.length === 0) return [];

    const [first, ...rest] = arr;
    const withFirst = getCombinations(rest, k - 1).map(combo => [first, ...combo]);
    const withoutFirst = getCombinations(rest, k);

    return [...withFirst, ...withoutFirst];
};

/**
 * Encuentra todas las escaleras posibles en un conjunto de cartas
 */
const findAllRuns = (cards) => {
    const runs = [];
    const suits = ['oros', 'copas', 'espadas', 'bastos'];

    for (const suit of suits) {
        const suitCards = cards.filter(c => c.suit === suit || c.isJoker);
        const jokers = suitCards.filter(c => c.isJoker);
        const normal = suitCards.filter(c => !c.isJoker).sort((a, b) => a.value - b.value);

        // Probar todas las combinaciones de longitud 3+
        for (let start = 0; start < normal.length; start++) {
            for (let end = start + 1; end <= normal.length; end++) {
                const subset = normal.slice(start, end);

                // Intentar con diferentes cantidades de comodines
                for (let jokerCount = 0; jokerCount <= jokers.length; jokerCount++) {
                    const testRun = [...subset, ...jokers.slice(0, jokerCount)];
                    if (testRun.length >= 3 && isValidRun(testRun)) {
                        runs.push(testRun);
                    }
                }
            }
        }
    }

    return runs;
};

/**
 * Encuentra todos los tríos/cuartetos posibles en un conjunto de cartas
 */
const findAllSets = (cards) => {
    const sets = [];
    const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

    for (const value of values) {
        const valueCards = cards.filter(c => c.value === value || c.isJoker);

        // Probar combinaciones de 3 y 4 cartas
        for (let size = 3; size <= Math.min(4, valueCards.length); size++) {
            const combinations = getCombinations(valueCards, size);
            for (const combo of combinations) {
                if (isValidSet(combo)) {
                    sets.push(combo);
                }
            }
        }
    }

    return sets;
};

/**
 * Encuentra todos los juegos válidos posibles (escaleras y tríos) en un conjunto de cartas
 */
const findAllPossibleGames = (cards) => {
    const games = [];
    games.push(...findAllRuns(cards));
    games.push(...findAllSets(cards));
    return games;
};

/**
 * Encuentra todos los juegos posibles en una mano
 * @param {Array} hand - Cartas en la mano
 * @returns {Object} { games: [], looseCards: [], score: number }
 */
export const findBestCombination = (hand) => {
    if (hand.length === 0) {
        return { games: [], looseCards: [], score: 0 };
    }

    const allPossibleGames = findAllPossibleGames(hand);

    if (allPossibleGames.length === 0) {
        const score = hand.reduce((sum, card) => sum + (card.isJoker ? JOKER_VALUE : card.value), 0);
        return { games: [], looseCards: hand, score };
    }

    let bestCombination = {
        games: [],
        looseCards: hand,
        score: hand.reduce((sum, card) => sum + (card.isJoker ? JOKER_VALUE : card.value), 0)
    };

    const tryAllCombinations = (remainingCards, selectedGames) => {
        const usedCards = selectedGames.flat();
        const unusedCards = remainingCards.filter(c =>
            !usedCards.some(used => used.id === c.id)
        );

        const looseScore = unusedCards.reduce((sum, card) => {
            return sum + (card.isJoker ? JOKER_VALUE : card.value);
        }, 0);

        if (looseScore < bestCombination.score ||
            (looseScore === bestCombination.score && selectedGames.length > bestCombination.games.length)) {
            bestCombination = {
                games: selectedGames,
                looseCards: unusedCards,
                score: looseScore
            };
        }

        const possibleNextGames = findAllPossibleGames(unusedCards);
        for (const game of possibleNextGames) {
            const gameKey = game.map(c => c.id).sort().join(',');
            const alreadyUsed = selectedGames.some(g =>
                g.map(c => c.id).sort().join(',') === gameKey
            );
            if (!alreadyUsed) {
                tryAllCombinations(remainingCards, [...selectedGames, game]);
            }
        }
    };

    tryAllCombinations(hand, []);

    return bestCombination;
};

/**
 * Verifica si el jugador puede cerrar legalmente
 * @param {Array} hand - Cartas en la mano
 * @param {Array} games - Juegos formados
 * @param {Array} looseCards - Cartas sueltas
 * @returns {boolean}
 */
export const canClose = (hand, games, looseCards) => {
    // Puede cerrar si:
    // 1. No tiene cartas sueltas (cierre perfecto)
    if (looseCards.length === 0) return true;

    // 2. Tiene 1 carta suelta menor a 3
    if (looseCards.length === 1) {
        const card = looseCards[0];
        const cardValue = card.isJoker ? JOKER_VALUE : card.value;
        return cardValue < 3;
    }

    return false;
};

/**
 * Calcula el puntaje final de un jugador
 * @param {Array} games - Juegos del jugador
 * @param {Array} looseCards - Cartas sueltas
 * @param {boolean} isClosed - Si el jugador cerró
 * @returns {number}
 */
export const calculateScore = (games, looseCards, isClosed = false) => {
    // Verificar chinchón
    if (games.length === 1 && games[0].length === 7) {
        const chinchonCheck = isChinchon(games[0]);
        if (chinchonCheck.isChinchon) {
            if (!chinchonCheck.hasJoker) {
                return CHINCHON_WIN; // Victoria instantánea
            } else {
                return CHINCHON_SCORE; // -10 puntos
            }
        }
    }

    // Sin cartas sueltas = -10
    if (looseCards.length === 0) {
        return NO_LOOSE_CARDS_SCORE;
    }

    // Sumar cartas sueltas
    const score = looseCards.reduce((sum, card) => {
        return sum + (card.isJoker ? JOKER_VALUE : card.value);
    }, 0);

    return score;
};

/**
 * Intenta acomodar cartas sueltas en juegos de otros jugadores
 * @param {Array} looseCards - Cartas sueltas del jugador
 * @param {Array} otherGames - Juegos de otros jugadores (especialmente del que cerró)
 * @returns {Object} { newLooseCards: [], appendedCards: [] }
 */
export const tryToAppendCards = (looseCards, otherGames) => {
    let currentLoose = [...looseCards];
    const appended = [];

    // Intentar acomodar cada carta suelta
    let changed = true;
    while (changed) {
        changed = false;
        for (let i = 0; i < currentLoose.length; i++) {
            const card = currentLoose[i];
            for (let j = 0; j < otherGames.length; j++) {
                const game = otherGames[j];
                if (canAddToGame(card, game)) {
                    // Se puede agregar!
                    appended.push({ card, gameIndex: j });
                    game.push(card); // Modificar el juego para siguientes iteraciones
                    currentLoose.splice(i, 1);
                    changed = true;
                    break;
                }
            }
            if (changed) break;
        }
    }

    return { newLooseCards: currentLoose, appendedCards: appended };
};

/**
 * Verifica si una carta puede agregarse a un juego existente
 * @param {Object} card - Carta a agregar
 * @param {Array} game - Juego existente
 * @returns {boolean}
 */
export const canAddToGame = (card, game) => {
    const testGame = [...game, card];
    return isValidRun(testGame) || isValidSet(testGame);
};

/**
 * Crea un mazo de Chinchón (40 cartas españolas + 2 comodines)
 */
export const createChinchonDeck = () => {
    const suits = ['oros', 'copas', 'espadas', 'bastos'];
    const values = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12, 8, 9]; // Incluimos 8 y 9 para Chinchón (aunque a veces se juega sin ellos, usaremos el estándar de 48 si es necesario o 40+2)
    // El chinchón estándar usa 48 cartas o 40+2. Usaremos 48 cartas (12 por palo) + 2 comodines.

    const deck = [];
    let id = 1;
    for (const suit of suits) {
        for (const value of values) {
            deck.push({ id: id++, suit, value, isJoker: false });
        }
    }
    // Comodines
    deck.push({ id: id++, suit: 'joker', value: 1, isJoker: true });
    deck.push({ id: id++, suit: 'joker', value: 2, isJoker: true });

    return deck;
};

/**
 * Mezcla un mazo usando el algoritmo Fisher-Yates
 */
export const shuffleDeck = (deck) => {
    const newDeck = [...deck];
    for (let i = newDeck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
    }
    return newDeck;
};
