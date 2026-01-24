import { useState, useEffect, useCallback, useRef } from 'react';
import { createChinchonDeck, shuffleDeck, findBestCombination, calculateScore, canClose, tryToAppendCards } from '../game/chinchonEngine';
import { executeBotTurn } from '../game/chinchonAI';

export const useChinchonGame = (gameMode = 'single', playerCount = 2, difficulty = 'normal', playerName = 'Tú') => {
    const [gameState, setGameState] = useState({
        deck: [],
        discardPile: [],
        players: [],
        currentPlayerIdx: 0,
        gamePhase: 'setup',
        round: 1,
        closingPlayerIdx: null,
        turnAction: 'draw',
        gameLog: []
    });

    const [selectedCards, setSelectedCards] = useState([]);
    const processingAction = useRef(false);

    const { deck, discardPile, players, currentPlayerIdx, gamePhase, round, closingPlayerIdx, turnAction, gameLog } = gameState;

    // Inicializar jugadores con el nombre elegido
    const createPlayers = useCallback(() => {
        const p = [];
        for (let i = 0; i < playerCount; i++) {
            p.push({
                id: `p${i + 1}`,
                name: i === 0 ? playerName : `Jugador ${i + 1}`,
                hand: [],
                games: [],
                looseCards: [],
                totalScore: 0,
                roundScore: 0,
                isBot: gameMode === 'single' && i > 0,
                isEliminated: false
            });
        }
        return p;
    }, [playerCount, gameMode, playerName]);

    // Función atómica para iniciar ronda con IDs blindados
    const startRound = useCallback(() => {
        setGameState(prev => {
            const activePlayers = prev.players.filter(p => !p.isEliminated);
            if (activePlayers.length === 1 && prev.players.length > 0) {
                return { ...prev, gamePhase: 'gameEnd' };
            }

            // Generar mazo con IDs únicos por ronda para evitar colisiones residuales (ej: r1-5, r2-5)
            let baseDeck = createChinchonDeck();
            let newDeck = shuffleDeck(baseDeck).map(c => ({
                ...c,
                id: `r${prev.round}-${c.id}`
            }));

            const updatedPlayers = prev.players.map(p => {
                if (p.isEliminated) return p;
                return {
                    ...p,
                    hand: newDeck.splice(0, 7),
                    games: [],
                    looseCards: [],
                    roundScore: 0
                };
            });

            const firstDiscard = newDeck.shift();

            return {
                ...prev,
                deck: newDeck,
                discardPile: [firstDiscard],
                players: updatedPlayers,
                currentPlayerIdx: 0,
                gamePhase: (gameMode === 'local') ? 'turnTransition' : 'playing',
                turnAction: 'draw',
                closingPlayerIdx: null,
                gameLog: [`Ronda ${prev.round} iniciada.`, ...prev.gameLog]
            };
        });
        processingAction.current = false;
    }, [gameMode]);

    useEffect(() => {
        if (gamePhase === 'setup') {
            setGameState(prev => ({
                ...prev,
                players: createPlayers(),
                gamePhase: 'readyToStart'
            }));
        }
    }, [gamePhase, createPlayers]);

    const startTurn = () => {
        setGameState(prev => ({ ...prev, gamePhase: 'playing' }));
    };

    // Robar carta con limpieza global exhaustiva
    const drawCard = useCallback((fromDeck = true) => {
        if (turnAction !== 'draw' || gamePhase !== 'playing' || processingAction.current) return;
        processingAction.current = true;

        setGameState(prev => {
            let updatedDeck = [...prev.deck];
            let updatedDiscard = [...prev.discardPile];
            let drawnCard;

            if (fromDeck) {
                if (updatedDeck.length === 0) {
                    const lastCard = updatedDiscard.pop();
                    updatedDeck = shuffleDeck(updatedDiscard);
                    updatedDiscard = [lastCard];
                }
                drawnCard = updatedDeck.shift();
            } else {
                drawnCard = updatedDiscard.pop();
            }

            if (!drawnCard) {
                processingAction.current = false;
                return prev;
            }

            // LIMPIEZA GLOBAL: Asegurar que esta carta NO esté en ningún otro sitio antes de añadirla
            const finalDeck = updatedDeck.filter(c => c.id !== drawnCard.id);
            const finalDiscard = updatedDiscard.filter(c => c.id !== drawnCard.id);

            const newPlayers = prev.players.map((p, i) => {
                // Quitamos la carta de cualquier mano (por si el estado estaba desincronizado)
                const cleanHand = p.hand.filter(c => c.id !== drawnCard.id);
                if (i === prev.currentPlayerIdx) {
                    return { ...p, hand: [...cleanHand, drawnCard] };
                }
                return { ...p, hand: cleanHand };
            });

            return {
                ...prev,
                deck: finalDeck,
                discardPile: finalDiscard,
                players: newPlayers,
                turnAction: 'discard',
                gameLog: [`${newPlayers[prev.currentPlayerIdx].name} tomó una carta.`, ...prev.gameLog]
            };
        });

        setTimeout(() => { processingAction.current = false; }, 400); // Pequeño cool-down
    }, [turnAction, gamePhase]);

    // Descartar con limpieza global exhaustiva
    const discardCard = useCallback((card) => {
        if (turnAction !== 'discard' || gamePhase !== 'playing' || processingAction.current) return;
        processingAction.current = true;

        setGameState(prev => {
            // Aseguramos que la carta se quite de TODAS las manos y el mazo antes de ir al descarte
            const newPlayers = prev.players.map((p) => ({
                ...p,
                hand: p.hand.filter(c => c.id !== card.id)
            }));

            const cleanDeck = prev.deck.filter(c => c.id !== card.id);
            const cleanDiscard = prev.discardPile.filter(c => c.id !== card.id);

            // Logica de turno
            let nextIdx = (prev.currentPlayerIdx + 1) % playerCount;
            let guard = 0;
            while (newPlayers[nextIdx]?.isEliminated && guard < playerCount) {
                nextIdx = (nextIdx + 1) % playerCount;
                guard++;
            }

            const isNextBot = newPlayers[nextIdx].isBot;
            const nextPhase = (gameMode === 'local' && !isNextBot) ? 'turnTransition' : 'playing';

            setTimeout(() => { processingAction.current = false; }, 600);

            return {
                ...prev,
                deck: cleanDeck,
                players: newPlayers,
                discardPile: [...cleanDiscard, card],
                currentPlayerIdx: nextIdx,
                turnAction: 'draw',
                gamePhase: nextPhase,
                gameLog: [`${newPlayers[prev.currentPlayerIdx].name} descartó el ${card.value} de ${card.suit}.`, ...prev.gameLog]
            };
        });
        setSelectedCards([]);
    }, [turnAction, gamePhase, gameMode, playerCount]);

    const closeHand = useCallback((discardCard) => {
        if (turnAction !== 'discard' || gamePhase !== 'playing' || processingAction.current) return;

        const currentHand = players[currentPlayerIdx].hand;
        const handAfterDiscard = currentHand.filter(c => c.id !== discardCard.id);
        const analysis = findBestCombination(handAfterDiscard);

        if (!canClose(handAfterDiscard, analysis.games, analysis.looseCards)) {
            if (currentPlayerIdx === 0) {
                alert('No podés cerrar con esta combinación. Necesitás que las 7 cartas restantes formen juegos o máximo 1 carta suelta menor a 3.');
            }
            return;
        }

        processingAction.current = true;
        setGameState(prev => {
            const updatedPlayers = prev.players.map((p, i) => {
                if (i === prev.currentPlayerIdx) return { ...p, hand: handAfterDiscard };
                return p;
            });

            return {
                ...prev,
                players: updatedPlayers,
                discardPile: [...prev.discardPile.filter(c => c.id !== discardCard.id), discardCard],
                closingPlayerIdx: prev.currentPlayerIdx,
                gamePhase: 'showing',
                gameLog: [`${prev.players[prev.currentPlayerIdx].name} cerró la mano descartando el ${discardCard.value} de ${discardCard.suit}.`, ...prev.gameLog]
            };
        });

        setTimeout(() => calculateRoundScores(), 1500);
    }, [turnAction, gamePhase, players, currentPlayerIdx]);

    const calculateRoundScores = useCallback(() => {
        setGameState(prev => {
            const winnerIdx = prev.closingPlayerIdx;
            const winner = prev.players[winnerIdx];
            if (!winner) return prev;

            const winnerAnalysis = findBestCombination(winner.hand);
            const winnerGames = winnerAnalysis.games;

            let nextPhase = 'roundEnd';
            let updatedLog = [...prev.gameLog];

            const updatedPlayers = prev.players.map((p, idx) => {
                if (p.isEliminated) return p;

                let analysis = findBestCombination(p.hand);
                let currentLoose = analysis.looseCards;
                let currentGames = analysis.games;

                if (idx !== winnerIdx && winnerGames.length > 0) {
                    const winnerGamesCopy = winnerGames.map(g => [...g]);
                    const { newLooseCards } = tryToAppendCards([...currentLoose], winnerGamesCopy);
                    currentLoose = newLooseCards;
                }

                const score = calculateScore(currentGames, currentLoose, idx === winnerIdx);
                if (score === -1000) {
                    nextPhase = 'gameEnd';
                    return { ...p, games: currentGames, looseCards: currentLoose, roundScore: 0, totalScore: 0, wonGame: true };
                }

                const newTotal = p.totalScore + score;
                return {
                    ...p,
                    games: currentGames,
                    looseCards: currentLoose,
                    roundScore: score,
                    totalScore: newTotal,
                    isEliminated: newTotal >= 100
                };
            });

            if (nextPhase === 'gameEnd') {
                const winnerPlayer = updatedPlayers.find(p => p.wonGame);
                updatedLog = [`¡${winnerPlayer.name} hizo CHINCHÓN y ganó!`, ...updatedLog];
            }

            return {
                ...prev,
                players: updatedPlayers,
                gamePhase: nextPhase,
                gameLog: updatedLog
            };
        });
    }, []);

    // IA Turn Logic
    useEffect(() => {
        if (gamePhase !== 'playing') return;
        const currentPlayer = players[currentPlayerIdx];
        if (currentPlayer?.isBot && !currentPlayer.isEliminated) {
            const botThinking = setTimeout(() => {
                const botDecision = executeBotTurn({ players, deck, discardPile }, currentPlayerIdx, difficulty);
                if (turnAction === 'draw') drawCard(botDecision.draw === 'deck');
                else if (turnAction === 'discard') {
                    if (botDecision.close) closeHand(botDecision.discard);
                    else discardCard(botDecision.discard);
                }
            }, 1000);
            return () => clearTimeout(botThinking);
        }
    }, [currentPlayerIdx, gamePhase, turnAction, players, deck, discardPile, difficulty, drawCard, discardCard, closeHand]);

    return {
        ...gameState,
        deckSize: deck.length,
        selectedCards,
        setSelectedCards,
        startRound,
        drawCard,
        discardCard,
        closeHand,
        startTurn,
        reorderHand: (newHand) => setGameState(prev => ({
            ...prev,
            players: prev.players.map((p, i) => i === prev.currentPlayerIdx ? { ...p, hand: newHand } : p)
        })),
        nextRound: () => {
            setGameState(prev => ({ ...prev, round: prev.round + 1 }));
            startRound();
        },
        toggleCardSelection: (card) => setSelectedCards(prev => {
            const isSelected = prev.some(c => c.id === card.id);
            return isSelected ? prev.filter(c => c.id !== card.id) : [...prev, card];
        })
    };
};
