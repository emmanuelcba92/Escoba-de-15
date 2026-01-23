import { useState, useEffect, useCallback, useRef } from 'react';
import { createChinchonDeck, shuffleDeck } from '../game/chinchonConstants';
import {
    findBestCombination,
    canClose,
    calculateScore,
    isChinchon,
    canAddToGame
} from '../game/chinchonEngine';

export const useChinchonGame = (gameMode = 'single', playerCount = 2) => {
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

    // Inicializar jugadores
    const createPlayers = useCallback(() => {
        const p = [];
        for (let i = 0; i < playerCount; i++) {
            p.push({
                id: `p${i + 1}`,
                name: i === 0 ? 'Tú' : `Jugador ${i + 1}`,
                hand: [],
                games: [], // Juegos formados
                looseCards: [], // Cartas sueltas
                totalScore: 0,
                roundScore: 0,
                isBot: gameMode === 'single' && i > 0,
                isEliminated: false
            });
        }
        return p;
    }, [playerCount, gameMode]);

    // Iniciar nueva ronda
    const startRound = useCallback(() => {
        const activePlayers = players.filter(p => !p.isEliminated);
        if (activePlayers.length === 1) {
            setGamePhase('gameEnd');
            setGameLog(prev => [`¡${activePlayers[0].name} ganó la partida!`, ...prev]);
            return;
        }

        let newDeck = shuffleDeck(createChinchonDeck());

        // Repartir 7 cartas a cada jugador
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

        // Primera carta al descarte
        const firstDiscard = newDeck.shift();

        setDeck(newDeck);
        setDiscardPile([firstDiscard]);
        setPlayers(updatedPlayers);
        setCurrentPlayerIdx(0);
        setGamePhase('playing');
        setTurnAction('draw');
        setClosingPlayerIdx(null);
        setGameLog(prev => [`Ronda ${round} iniciada.`, ...prev]);
    }, [players, round]);

    // Inicializar juego
    useEffect(() => {
        if (gamePhase === 'setup') {
            const initialPlayers = createPlayers();
            setPlayers(initialPlayers);
            setGamePhase('readyToStart');
        }
    }, [gamePhase, createPlayers]);

    // Función para tomar carta
    const drawCard = (fromDeck = true) => {
        if (turnAction !== 'draw') return;

        const currentPlayer = players[currentPlayerIdx];
        let drawnCard;
        let newDeck = [...deck];
        let newDiscard = [...discardPile];

        if (fromDeck) {
            if (newDeck.length === 0) {
                // Mezclar descarte (excepto última carta)
                const lastCard = newDiscard.pop();
                newDeck = shuffleDeck(newDiscard);
                newDiscard = [lastCard];
            }
            drawnCard = newDeck.shift();
        } else {
            drawnCard = newDiscard.pop();
        }

        const updatedPlayers = players.map((p, i) => {
            if (i === currentPlayerIdx) {
                return { ...p, hand: [...p.hand, drawnCard] };
            }
            return p;
        });

        setDeck(newDeck);
        setDiscardPile(newDiscard);
        setPlayers(updatedPlayers);
        setTurnAction('discard');
        setGameLog(prev => [`${currentPlayer.name} tomó una carta.`, ...prev]);
    };

    // Función para descartar carta
    const discardCard = (card) => {
        if (turnAction !== 'discard') return;

        const currentPlayer = players[currentPlayerIdx];
        const newHand = currentPlayer.hand.filter(c => c.id !== card.id);

        const updatedPlayers = players.map((p, i) => {
            if (i === currentPlayerIdx) {
                return { ...p, hand: newHand };
            }
            return p;
        });

        setPlayers(updatedPlayers);
        setDiscardPile(prev => [...prev, card]);
        setTurnAction('draw');

        // Siguiente jugador
        nextPlayer();
    };

    // Siguiente jugador
    const nextPlayer = () => {
        let nextIdx = (currentPlayerIdx + 1) % playerCount;
        while (players[nextIdx].isEliminated) {
            nextIdx = (nextIdx + 1) % playerCount;
        }
        setCurrentPlayerIdx(nextIdx);
    };

    // Cerrar la mano
    const closeHand = () => {
        const currentPlayer = players[currentPlayerIdx];
        const analysis = findBestCombination(currentPlayer.hand);

        if (!canClose(currentPlayer.hand, analysis.games, analysis.looseCards)) {
            alert('No podés cerrar con esta combinación. Necesitás todas tus cartas en juegos o máximo 1 carta suelta menor a 3.');
            return;
        }

        setClosingPlayerIdx(currentPlayerIdx);
        setGamePhase('showing');
        setGameLog(prev => [`${currentPlayer.name} cerró la mano.`, ...prev]);

        // Calcular puntajes
        setTimeout(() => calculateRoundScores(), 1000);
    };

    // Calcular puntajes de la ronda
    const calculateRoundScores = () => {
        const updatedPlayers = players.map((p, idx) => {
            if (p.isEliminated) return p;

            const analysis = findBestCombination(p.hand);
            const score = calculateScore(analysis.games, analysis.looseCards, idx === closingPlayerIdx);

            // Verificar chinchón sin comodín (victoria instantánea)
            if (score === -1000) {
                return {
                    ...p,
                    games: analysis.games,
                    looseCards: analysis.looseCards,
                    roundScore: 0,
                    totalScore: 0,
                    wonGame: true
                };
            }

            const newTotal = p.totalScore + score;

            return {
                ...p,
                games: analysis.games,
                looseCards: analysis.looseCards,
                roundScore: score,
                totalScore: newTotal,
                isEliminated: newTotal >= 100
            };
        });

        setPlayers(updatedPlayers);
        setGamePhase('roundEnd');

        // Verificar si alguien ganó con chinchón
        const winner = updatedPlayers.find(p => p.wonGame);
        if (winner) {
            setGamePhase('gameEnd');
            setGameLog(prev => [`¡${winner.name} hizo CHINCHÓN sin comodín y ganó la partida!`, ...prev]);
        }
    };

    // Siguiente ronda
    const nextRound = () => {
        setRound(prev => prev + 1);
        startRound();
    };

    // Toggle selección de carta
    const toggleCardSelection = (card) => {
        const isSelected = selectedCards.some(c => c.id === card.id);
        if (isSelected) {
            setSelectedCards(prev => prev.filter(c => c.id !== card.id));
        } else {
            setSelectedCards(prev => [...prev, card]);
        }
    };

    return {
        // Estado
        deck,
        discardPile,
        players,
        currentPlayerIdx,
        gamePhase,
        selectedCards,
        turnAction,
        gameLog,
        round,
        closingPlayerIdx,

        // Acciones
        startRound,
        drawCard,
        discardCard,
        closeHand,
        nextRound,
        toggleCardSelection,

        // Utilidades
        deckSize: deck.length
    };
};
