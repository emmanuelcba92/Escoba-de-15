import { findBestCombination, canClose, canAddToGame } from './chinchonEngine';

/**
 * IA básica para el Chinchón
 * Niveles: easy, normal, hard
 */

/**
 * Decide qué carta tomar (mazo o descarte)
 * @param {Object} botHand - Mano del bot
 * @param {Object} discardTopCard - Carta superior del descarte
 * @param {string} difficulty - Nivel de dificultad
 * @returns {boolean} true si toma del descarte, false si toma del mazo
 */
export const decideDraw = (botHand, discardTopCard, difficulty = 'normal') => {
    if (!discardTopCard) return true; // Si no hay descarte, tomar del mazo

    // Easy: 30% probabilidad de tomar descarte si mejora
    // Normal: 50% probabilidad de tomar descarte si mejora
    // Hard: 80% probabilidad de tomar descarte si mejora
    const thresholds = { easy: 0.3, normal: 0.5, hard: 0.8 };
    const threshold = thresholds[difficulty] || 0.5;

    // Evaluar si el descarte mejora la mano
    const currentScore = findBestCombination(botHand).score;
    const withDiscardScore = findBestCombination([...botHand, discardTopCard]).score;

    const improves = withDiscardScore < currentScore;

    if (improves && Math.random() < threshold) {
        return false; // Tomar del descarte
    }

    return true; // Tomar del mazo
};

/**
 * Decide qué carta descartar
 * @param {Array} botHand - Mano del bot
 * @param {string} difficulty - Nivel de dificultad
 * @returns {Object} Carta a descartar
 */
export const decideDiscard = (botHand, difficulty = 'normal') => {
    const analysis = findBestCombination(botHand);

    // Si tiene cartas sueltas, descartar la de mayor valor
    if (analysis.looseCards.length > 0) {
        const sorted = [...analysis.looseCards].sort((a, b) => {
            const valueA = a.isJoker ? 25 : a.value;
            const valueB = b.isJoker ? 25 : b.value;
            return valueB - valueA;
        });

        // Easy: descarta carta random de las sueltas
        // Normal: descarta la de mayor valor
        // Hard: descarta considerando estrategia
        if (difficulty === 'easy' && Math.random() < 0.4) {
            return sorted[Math.floor(Math.random() * sorted.length)];
        }

        return sorted[0];
    }

    // Si todas están en juegos, descartar de un juego
    // Buscar la carta de menor valor en juegos
    const allGameCards = analysis.games.flat();
    const sorted = [...allGameCards].sort((a, b) => {
        const valueA = a.isJoker ? 25 : a.value;
        const valueB = b.isJoker ? 25 : b.value;
        return valueA - valueB;
    });

    return sorted[0] || botHand[0];
};

/**
 * Decide si cerrar la mano
 * @param {Array} botHand - Mano del bot
 * @param {string} difficulty - Nivel de dificultad
 * @returns {boolean} true si debe cerrar
 */
export const shouldClose = (botHand, difficulty = 'normal') => {
    const analysis = findBestCombination(botHand);

    const canCloseNow = canClose(botHand, analysis.games, analysis.looseCards);

    if (!canCloseNow) return false;

    // Easy: cierra siempre que puede
    if (difficulty === 'easy') return true;

    // Normal: cierra si tiene buen puntaje (≤ 5)
    if (difficulty === 'normal') {
        return analysis.score <= 5;
    }

    // Hard: cierra solo si tiene muy buen puntaje (≤ 2) o chinchón
    if (difficulty === 'hard') {
        return analysis.score <= 2 || analysis.score === -10 || analysis.score === -1000;
    }

    return false;
};

/**
 * Ejecuta el turno completo del bot
 * @param {Object} gameState - Estado actual del juego
 * @param {number} botIdx - Índice del bot
 * @param {string} difficulty - Nivel de dificultad
 * @returns {Object} Acciones a ejecutar { draw: 'deck'|'discard', discard: card, close: boolean }
 */
export const executeBotTurn = (gameState, botIdx, difficulty = 'normal') => {
    const bot = gameState.players[botIdx];
    const discardTop = gameState.discardPile[gameState.discardPile.length - 1];

    // Decidir de dónde tomar
    const drawFromDiscard = !decideDraw(bot.hand, discardTop, difficulty);

    // Simular tomar carta
    let newHand;
    if (drawFromDiscard) {
        newHand = [...bot.hand, discardTop];
    } else {
        // En la simulación, usamos una carta ficticia del mazo
        const deckCard = gameState.deck[0];
        newHand = [...bot.hand, deckCard];
    }

    // Decidir qué descartar
    const discardCard = decideDiscard(newHand, difficulty);

    // Decidir si cerrar
    const shouldCloseNow = shouldClose(newHand.filter(c => c.id !== discardCard.id), difficulty);

    return {
        draw: drawFromDiscard ? 'discard' : 'deck',
        discard: discardCard,
        close: shouldCloseNow
    };
};
