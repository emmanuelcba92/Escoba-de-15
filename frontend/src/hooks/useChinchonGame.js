import { useState, useEffect, useCallback, useRef } from 'react';
import { createChinchonDeck, shuffleDeck } from '../game/chinchonConstants';
import {
    findBestCombination,
    canClose,
    calculateScore,
    isChinchon,
    canAddToGame,
    tryToAppendCards
} from '../game/chinchonEngine';
import { executeBotTurn } from '../game/chinchonAI';

export const useChinchonGame = (gameMode = 'single', playerCount = 2, difficulty = 'normal') => {
    const [deck, setDeck] = useState([]);
    const [discardPile, setDiscardPile] = useState([]);
    const [players, setPlayers] = useState([]);
    const [currentPlayerIdx, setCurrentPlayerIdx] = useState(0);
    const [gamePhase, setGamePhase] = useState('setup'); // setup, playing, showing, roundEnd, gameEnd
    const [selectedCards, setSelectedCards] = useState([]);
    const [turnAction, setTurnAction] = useState('draw'); // draw, discard
    const [gameLog, setGameLog] = useState([]);
    const [round, setRound] = useState(1);
    const [closingPlayerIdx, setClosingPlayerIdx] = useState(null);
    const processingAction = useRef(false);

    // Inicializar jugadores
    const createPlayers = useCallback(() => {
        const p = [];
        for (let i = 0; i < playerCount; i++) {
            p.push({
                id: `p${i + 1}`,
                name: i === 0 ? 'Tú' : `Jugador ${i + 1}`,
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
    }, [playerCount, gameMode]);

    // Función para pasar al siguiente jugador
    const nextPlayer = useCallback(() => {
        setCurrentPlayerIdx(prev => {
            let nextIdx = (prev + 1) % playerCount;
            // Buscar el siguiente no eliminado
            // Evitar bucle infinito si todos eliminados (no debería pasar)
            let guard = 0;
            while (players[nextIdx]?.isEliminated && guard < playerCount) {
                nextIdx = (nextIdx + 1) % playerCount;
                guard++;
            }
            return nextIdx;
        });
        setTurnAction('draw');
        processingAction.current = false; // Unlock next turn
    }, [playerCount, players]);

    // Iniciar nueva ronda
    const startRound = useCallback(() => {
        const activePlayers = players.filter(p => !p.isEliminated);
        if (activePlayers.length === 1 && players.length > 0) {
            setGamePhase('gameEnd');
            setGameLog(prev => [`¡${activePlayers[0].name} ganó la partida!`, ...prev]);
            return;
        }

        let newDeck = shuffleDeck(createChinchonDeck());

        const updatedPlayers = players.map(p => {
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

        setDeck(newDeck);
        setDiscardPile([firstDiscard]);
        setPlayers(updatedPlayers);
        setCurrentPlayerIdx(0);
        setGamePhase('playing');
        setTurnAction('draw');
        setClosingPlayerIdx(null);
        setGameLog(prev => [`Ronda ${round} iniciada.`, ...prev]);
        processingAction.current = false; // Unlock start
    }, [players, round]);

    // Inicializar juego base
    useEffect(() => {
        if (gamePhase === 'setup') {
            const initialPlayers = createPlayers();
            setPlayers(initialPlayers);
            setGamePhase('readyToStart');
        }
    }, [gamePhase, createPlayers]);

    // Tomar carta
    const drawCard = useCallback((fromDeck = true) => {
        if (turnAction !== 'draw' || gamePhase !== 'playing' || processingAction.current) return;
        processingAction.current = true; // Lock

        setPlayers(currentPlayers => {
            let drawnCard;
            let updatedDeck = [...deck];
            let updatedDiscard = [...discardPile];

            if (fromDeck) {
                if (updatedDeck.length === 0) {
                    const lastCard = updatedDiscard.pop();
                    updatedDeck = shuffleDeck(updatedDiscard);
                    updatedDiscard = [lastCard];
                }
                drawnCard = updatedDeck.shift();
                setDeck(updatedDeck);
                setDiscardPile(updatedDiscard);
            } else {
                drawnCard = updatedDiscard.pop();
                setDiscardPile(updatedDiscard);
            }

            const newPlayers = currentPlayers.map((p, i) => {
                if (i === currentPlayerIdx) {
                    return { ...p, hand: [...p.hand, drawnCard] };
                }
                return p;
            });

            setTurnAction('discard');
            setGameLog(prev => [`${newPlayers[currentPlayerIdx].name} tomó una carta.`, ...prev]);

            // Unlock immediately for discard phase, but small delay to prevent double clicks bridging phases?
            // Actually discard is next phase, separate action.
            setTimeout(() => { processingAction.current = false; }, 300);

            return newPlayers;
        });
    }, [currentPlayerIdx, deck, discardPile, turnAction, gamePhase]);

    // Descartar carta
    const discardCard = useCallback((card) => {
        if (turnAction !== 'discard' || gamePhase !== 'playing' || processingAction.current) return;
        processingAction.current = true; // Lock

        setPlayers(currentPlayers => {
            const newPlayers = currentPlayers.map((p, i) => {
                if (i === currentPlayerIdx) {
                    return { ...p, hand: p.hand.filter(c => c.id !== card.id) };
                }
                return p;
            });

            setDiscardPile(prev => [...prev, card]);
            setSelectedCards([]); // Limpiar selección al descartar

            // Log logic
            setGameLog(prev => [`${newPlayers[currentPlayerIdx].name} descartó.`, ...prev]);

            // Move to next player
            setTimeout(() => nextPlayer(), 500);

            return newPlayers;
        });
    }, [currentPlayerIdx, turnAction, gamePhase, nextPlayer]);

    // Reordenar mano
    const reorderHand = useCallback((newHand) => {
        setPlayers(prev => prev.map((p, i) => {
            if (i === 0) return { ...p, hand: newHand };
            return p;
        }));
    }, []);

    // Cerrar la mano
    const closeHand = useCallback(() => {
        if (turnAction !== 'discard' || gamePhase !== 'playing' || processingAction.current) return;

        const currentPlayer = players[currentPlayerIdx];
        const analysis = findBestCombination(currentPlayer.hand);

        if (!canClose(currentPlayer.hand, analysis.games, analysis.looseCards)) {
            if (currentPlayerIdx === 0) {
                alert('No podés cerrar con esta combinación. Necesitás todas tus cartas en juegos o máximo 1 carta suelta menor a 3.');
            }
            return;
        }

        processingAction.current = true; // Lock
        setClosingPlayerIdx(currentPlayerIdx);
        setGamePhase('showing');
        setGameLog(prev => [`${currentPlayer.name} cerró la mano.`, ...prev]);

        // Calcular puntajes después de un Delay para mostrar
        setTimeout(() => calculateRoundScores(), 1500);
    }, [currentPlayerIdx, players, turnAction, gamePhase]);

    // Calcular puntajes
    const calculateRoundScores = useCallback(() => {
        setPlayers(currentPlayers => {
            const winnerIdx = closingPlayerIdx;
            const winner = currentPlayers[winnerIdx];
            if (!winner) return currentPlayers;

            const winnerAnalysis = findBestCombination(winner.hand);
            const winnerGames = winnerAnalysis.games;

            const updatedPlayers = currentPlayers.map((p, idx) => {
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

                // Victoria instantánea (Chinchón sin comodín)
                if (score === -1000) {
                    return {
                        ...p,
                        games: currentGames,
                        looseCards: currentLoose,
                        roundScore: 0,
                        totalScore: 0,
                        wonGame: true
                    };
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

            setGamePhase('roundEnd');
            const winnerPlayer = updatedPlayers.find(p => p.wonGame);
            if (winnerPlayer) {
                setGamePhase('gameEnd');
                setGameLog(prev => [`¡${winnerPlayer.name} hizo CHINCHÓN y ganó!`, ...prev]);
            }

            return updatedPlayers;
        });
    }, [closingPlayerIdx]);

    // Bot Turn Logic
    useEffect(() => {
        if (gamePhase !== 'playing') return;

        const currentPlayer = players[currentPlayerIdx];
        if (currentPlayer?.isBot && !currentPlayer.isEliminated) {
            const botThinking = setTimeout(() => {
                const botDecision = executeBotTurn({
                    players,
                    deck,
                    discardPile
                }, currentPlayerIdx, difficulty);

                if (turnAction === 'draw') {
                    drawCard(botDecision.draw === 'deck');
                } else if (turnAction === 'discard') {
                    if (botDecision.close) {
                        closeHand();
                    } else {
                        discardCard(botDecision.discard);
                    }
                }
            }, 1500);

            return () => clearTimeout(botThinking);
        }
    }, [currentPlayerIdx, gamePhase, turnAction, players, deck, discardPile, difficulty, drawCard, discardCard, closeHand]);

    const nextRound = useCallback(() => {
        setRound(prev => prev + 1);
        startRound();
    }, [startRound]);

    const toggleCardSelection = useCallback((card) => {
        setSelectedCards(prev => {
            const isSelected = prev.some(c => c.id === card.id);
            return isSelected ? prev.filter(c => c.id !== card.id) : [...prev, card];
        });
    }, []);

    return {
        deck, discardPile, players, currentPlayerIdx, gamePhase,
        selectedCards, turnAction, gameLog, round, closingPlayerIdx,
        startRound, drawCard, discardCard, closeHand, nextRound,
        toggleCardSelection, reorderHand, deckSize: deck.length
    };
};
