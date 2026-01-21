import { checkSum15 } from './engine';

// Helper to get all combinations of an array
const getCombinations = (arr) => {
    const result = [];
    const f = (prefix, arr) => {
        for (let i = 0; i < arr.length; i++) {
            const newPrefix = [...prefix, arr[i]];
            result.push(newPrefix);
            f(newPrefix, arr.slice(i + 1));
        }
    };
    f([], arr);
    return result;
};

export const findBestMove = (hand, table, difficulty = 'normal') => {
    const possibleMoves = [];

    // 1. Find all valid captures
    hand.forEach(card => {
        const tableCombinations = getCombinations(table);
        tableCombinations.forEach(combo => {
            if (checkSum15(card, combo)) {
                possibleMoves.push({
                    card,
                    captured: combo,
                    type: 'capture'
                });
            }
        });
    });

    if (possibleMoves.length > 0) {
        // Prioritize moves
        // Sort logic: 
        // 1. Is Escoba? (Remaining table empty)
        // 2. Has 7 Oros?
        // 3. Count of 7s
        // 4. Count of Oros
        // 5. Total cards captured

        possibleMoves.sort((a, b) => {
            const aResidual = table.length - a.captured.length;
            const bResidual = table.length - b.captured.length;
            const aIsEscoba = aResidual === 0;
            const bIsEscoba = bResidual === 0;

            if (aIsEscoba && !bIsEscoba) return -1;
            if (!aIsEscoba && bIsEscoba) return 1;

            // Check for 7 Oros in captured + played card
            const aHas7Oros = a.card.id === 'oros_7' || a.captured.some(c => c.id === 'oros_7');
            const bHas7Oros = b.card.id === 'oros_7' || b.captured.some(c => c.id === 'oros_7');
            if (aHas7Oros && !bHas7Oros) return -1;
            if (!aHas7Oros && bHas7Oros) return 1;

            // Count 7s
            const a7s = (a.card.value === 7 ? 1 : 0) + a.captured.filter(c => c.value === 7).length;
            const b7s = (b.card.value === 7 ? 1 : 0) + b.captured.filter(c => c.value === 7).length;
            if (a7s !== b7s) return b7s - a7s;

            // Count Oros
            const aOros = (a.card.suit === 'oros' ? 1 : 0) + a.captured.filter(c => c.suit === 'oros').length;
            const bOros = (b.card.suit === 'oros' ? 1 : 0) + b.captured.filter(c => c.suit === 'oros').length;
            if (aOros !== bOros) return bOros - aOros;

            // Count Cards
            return (b.captured.length + 1) - (a.captured.length + 1);
        });

        // Return best move
        if (difficulty === 'hard') return possibleMoves[0];

        // For 'easy', maybe pick random or less optimal?
        // User asked for "adjustable"
        if (difficulty === 'easy') {
            const rand = Math.floor(Math.random() * possibleMoves.length);
            return possibleMoves[rand];
        }

        return possibleMoves[0];
    }

    // No capture possible, must discard
    // Simple logic: Discard card that is NOT a 7 or Oro if possible.
    // Or lowest value.

    const sortedHand = [...hand].sort((a, b) => {
        // Penalize discarding 7s or Oros
        const aRisk = (a.suit === 'oros' ? 2 : 0) + (a.value === 7 ? 5 : 0) + a.value / 10;
        const bRisk = (b.suit === 'oros' ? 2 : 0) + (b.value === 7 ? 5 : 0) + b.value / 10;
        return aRisk - bRisk; // Ascending risk (lowest risk first)
    });

    return {
        card: sortedHand[0],
        captured: [],
        type: 'discard'
    };
};
