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
 * Encuentra todos los juegos posibles en una mano
 * @param {Array} hand - Cartas en la mano
 * @returns {Object} { games: [], looseCards: [], score: number }
 */
export const findBestCombination = (hand) => {
    // TODO: Implementar algoritmo de búsqueda de mejor combinación
    // Por ahora devolvemos estructura básica

    const allCards = [...hand];
    const games = [];
    const looseCards = [...hand];

    // Calcular puntos de cartas sueltas
    const score = looseCards.reduce((sum, card) => {
        return sum + (card.isJoker ? JOKER_VALUE : card.value);
    }, 0);

    return { games, looseCards, score };
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
 * Verifica si una carta puede agregarse a un juego existente
 * @param {Object} card - Carta a agregar
 * @param {Array} game - Juego existente
 * @returns {boolean}
 */
export const canAddToGame = (card, game) => {
    const testGame = [...game, card];
    return isValidRun(testGame) || isValidSet(testGame);
};
