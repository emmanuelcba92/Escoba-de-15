import { useState, useEffect, useCallback, useRef } from 'react';
import { createChinchonDeck, shuffleDeck, findBestCombination, calculateScore, canClose, tryToAppendCards } from '../game/chinchonEngine';
import { executeBotTurn } from '../game/chinchonAI';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const useChinchonGame = (gameMode = 'single', playerCount = 2, difficulty = 'normal', playerName = 'Tú', roomId = '') => {
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
    const [waitingForOpponent, setWaitingForOpponent] = useState(gameMode === 'multi');
    const [playerRole, setPlayerRole] = useState(null); // 'host', 'guest'
    const [myPlayerIdx, setMyPlayerIdx] = useState(0);

    const processingAction = useRef(false);
    const channelRef = useRef(null);
    const myPlayerIdxRef = useRef(0);
    const gameStateRef = useRef(gameState);

    // Sincronizar ref con estado para callbacks de Supabase
    useEffect(() => {
        gameStateRef.current = gameState;
    }, [gameState]);

    const { deck, discardPile, players, currentPlayerIdx, gamePhase, round, closingPlayerIdx, turnAction, gameLog } = gameState;

    // Inicializar jugadores
    const createPlayers = useCallback((names = null) => {
        const p = [];
        for (let i = 0; i < playerCount; i++) {
            let name = `Jugador ${i + 1}`;
            if (names && names[i]) name = names[i];
            else if (i === 0) name = playerName;

            p.push({
                id: `p${i + 1}`,
                name: name,
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

    const startRoundMulti = (playerNames, channel) => {
        const initialPlayers = createPlayers(playerNames);

        let baseDeck = createChinchonDeck();
        let newDeck = shuffleDeck(baseDeck).map(c => ({
            ...c,
            id: `r${gameStateRef.current.round}-${c.id}`
        }));

        const updatedPlayers = initialPlayers.map(p => ({
            ...p,
            hand: newDeck.splice(0, 7),
            games: [],
            looseCards: [],
            roundScore: 0
        }));

        const firstDiscard = newDeck.shift();

        const payload = {
            deck: newDeck,
            discardPile: [firstDiscard],
            players: updatedPlayers,
            currentPlayerIdx: 0,
            round: gameStateRef.current.round,
            gamePhase: 'playing',
            turnAction: 'draw'
        };

        channel.send({
            type: 'broadcast',
            event: 'init_game',
            payload
        });

        setGameState(prev => ({
            ...prev,
            ...payload,
            gameLog: [`Ronda ${prev.round} iniciada.`, ...prev.gameLog]
        }));
    };

    // Supabase Multiplayer Setup
    useEffect(() => {
        if (gameMode === 'multi' && roomId) {
            const channel = supabase.channel(`chinchon_${roomId}`, {
                config: { presence: { key: playerName } }
            });

            channel
                .on('presence', { event: 'sync' }, () => {
                    const state = channel.presenceState();
                    const presenceEntries = Object.entries(state);
                    if (presenceEntries.length === 0) return;

                    const roomPlayers = presenceEntries.map(([key, presences]) => ({
                        id: key,
                        name: presences[0].name || key.split('_')[0],
                        joinedAt: presences[0].joined_at
                    })).sort((a, b) => new Date(a.joinedAt) - new Date(b.joinedAt));

                    const myEntry = roomPlayers.find(p => p.id.startsWith(playerName + '_'));
                    const isHost = roomPlayers[0]?.id === myEntry?.id;
                    const myIdx = roomPlayers.findIndex(p => p.id === myEntry?.id);

                    setPlayerRole(isHost ? 'host' : 'guest');
                    setMyPlayerIdx(myIdx);
                    myPlayerIdxRef.current = myIdx;

                    if (roomPlayers.length >= playerCount) {
                        setWaitingForOpponent(false);
                        if (isHost && gameStateRef.current.gamePhase === 'setup') {
                            const playerNames = roomPlayers.map(p => p.name);
                            setTimeout(() => startRoundMulti(playerNames, channel), 1000);
                        }
                    } else {
                        setWaitingForOpponent(true);
                    }
                })
                .on('broadcast', { event: 'init_game' }, ({ payload }) => {
                    setGameState(prev => ({ ...prev, ...payload }));
                    setWaitingForOpponent(false);
                })
                .on('broadcast', { event: 'draw_card' }, ({ payload }) => {
                    if (payload.playerIdx !== myPlayerIdxRef.current) {
                        executeDraw(payload.fromDeck, true);
                    }
                })
                .on('broadcast', { event: 'discard_card' }, ({ payload }) => {
                    if (payload.playerIdx !== myPlayerIdxRef.current) {
                        executeDiscard(payload.card, true);
                    }
                })
                .on('broadcast', { event: 'close_hand' }, ({ payload }) => {
                    if (payload.playerIdx !== myPlayerIdxRef.current) {
                        executeClose(payload.discardCard, true);
                    }
                })
                .subscribe(async (status) => {
                    if (status === 'SUBSCRIBED') {
                        await channel.track({
                            name: playerName,
                            joined_at: new Date().toISOString()
                        });
                    }
                });

            channelRef.current = channel;
            return () => { channel.unsubscribe(); };
        }
    }, [gameMode, roomId, playerName, playerCount]);

    // Función atómica para iniciar ronda con IDs blindados
    const startRound = useCallback(() => {
        if (gameMode === 'multi') return;
        setGameState(prev => {
            // SEGURO DE VIDA: Si no hay jugadores, los creamos ahora mismo
            const basePlayers = prev.players.length > 0 ? prev.players : createPlayers();
            const activePlayers = basePlayers.filter(p => !p.isEliminated);

            if (activePlayers.length === 1 && basePlayers.length > 0) {
                return { ...prev, gamePhase: 'gameEnd' };
            }

            // Generar mazo con IDs únicos por ronda para evitar colisiones residuales (ej: r1-5, r2-5)
            let baseDeck = createChinchonDeck();
            let newDeck = shuffleDeck(baseDeck).map(c => ({
                ...c,
                id: `r${prev.round}-${c.id}`
            }));

            const updatedPlayers = basePlayers.map(p => {
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
    }, [gameMode, createPlayers]);

    useEffect(() => {
        if ((gamePhase === 'setup' || (gamePhase === 'playing' && players.length === 0)) && gameMode !== 'multi') {
            // Al montar o si detectamos estado vacío, iniciamos
            startRound();
        }
    }, [gamePhase, gameMode, startRound, players.length]);

    const startTurn = () => setGameState(prev => ({ ...prev, gamePhase: 'playing' }));

    // Safety trigger: if somehow in playing phase but players array is empty, force re-initialization
    useEffect(() => {
        if (gamePhase === 'playing' && players.length === 0 && gameMode !== 'multi') {
            console.warn("Safety trigger: Repopulating players...");
            startRound();
        }
    }, [gamePhase, players.length, gameMode, startRound]);

    const executeDraw = (fromDeck, isRemote = false) => {
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
    };

    const drawCard = useCallback((fromDeck = true) => {
        if (turnAction !== 'draw' || gamePhase !== 'playing' || processingAction.current) return;
        if (gameMode === 'multi' && currentPlayerIdx !== myPlayerIdx) return;

        processingAction.current = true;
        executeDraw(fromDeck);

        if (gameMode === 'multi') {
            channelRef.current.send({
                type: 'broadcast',
                event: 'draw_card',
                payload: { playerIdx: myPlayerIdx, fromDeck }
            });
        }
        setTimeout(() => { processingAction.current = false; }, 400);
    }, [turnAction, gamePhase, gameMode, currentPlayerIdx, myPlayerIdx]);

    const executeDiscard = (card, isRemote = false) => {
        setGameState(prev => {
            // Aseguramos que la carta se quite de TODAS las manos y el mazo antes de ir al descarte
            const newPlayers = prev.players.map((p) => ({
                ...p,
                hand: p.hand.filter(c => c.id !== card.id)
            }));

            const cleanDeck = prev.deck.filter(c => c.id !== card.id);
            const cleanDiscard = prev.discardPile.filter(c => c.id !== card.id);

            // Turn logic
            let nextIdx = (prev.currentPlayerIdx + 1) % playerCount;
            let guard = 0;
            while (newPlayers[nextIdx]?.isEliminated && guard < playerCount) {
                nextIdx = (nextIdx + 1) % playerCount;
                guard++;
            }

            const isNextBot = newPlayers[nextIdx]?.isBot;
            const nextPhase = (gameMode === 'local' && !isNextBot) ? 'turnTransition' : 'playing';

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
    };

    const discardCard = useCallback((card) => {
        if (turnAction !== 'discard' || gamePhase !== 'playing' || processingAction.current) return;
        if (gameMode === 'multi' && currentPlayerIdx !== myPlayerIdx) return;

        processingAction.current = true;
        executeDiscard(card);

        if (gameMode === 'multi') {
            channelRef.current.send({
                type: 'broadcast',
                event: 'discard_card',
                payload: { playerIdx: myPlayerIdx, card }
            });
        }
        setSelectedCards([]);
        setTimeout(() => { processingAction.current = false; }, 600);
    }, [turnAction, gamePhase, gameMode, currentPlayerIdx, myPlayerIdx, playerCount]);

    const executeClose = (discardCard, isRemote = false) => {
        setGameState(prev => {
            const pIdx = prev.currentPlayerIdx;
            const updatedPlayers = prev.players.map((p, i) => {
                if (i === pIdx) return { ...p, hand: p.hand.filter(c => c.id !== discardCard.id) };
                return p;
            });

            return {
                ...prev,
                players: updatedPlayers,
                discardPile: [...prev.discardPile.filter(c => c.id !== discardCard.id), discardCard],
                closingPlayerIdx: pIdx,
                gamePhase: 'showing',
                gameLog: [`¡${prev.players[pIdx].name} CERRÓ!`, ...prev.gameLog]
            };
        });
        setTimeout(() => calculateRoundScores(), 2000);
    };

    const closeHand = useCallback((discardCard) => {
        if (turnAction !== 'discard' || gamePhase !== 'playing' || processingAction.current) return;
        if (gameMode === 'multi' && currentPlayerIdx !== myPlayerIdx) return;

        const currentHand = players[currentPlayerIdx].hand;
        const handAfterDiscard = currentHand.filter(c => c.id !== discardCard.id);
        const analysis = findBestCombination(handAfterDiscard);

        if (!canClose(handAfterDiscard, analysis.games, analysis.looseCards)) {
            setGameState(prev => ({ ...prev, gameLog: ['No podés cerrar con esa mano.', ...prev.gameLog] }));
            return;
        }

        processingAction.current = true;
        executeClose(discardCard);

        if (gameMode === 'multi') {
            channelRef.current.send({
                type: 'broadcast',
                event: 'close_hand',
                payload: { playerIdx: myPlayerIdx, discardCard }
            });
        }
    }, [turnAction, gamePhase, players, currentPlayerIdx, gameMode, myPlayerIdx]);

    const calculateRoundScores = useCallback(() => {
        setGameState(prev => {
            const winnerIdx = prev.closingPlayerIdx;
            const winner = prev.players[winnerIdx];
            if (!winner) return prev;
            const winnerAnalysis = findBestCombination(winner.hand);
            const winnerGames = winnerAnalysis.games;

            let nextPhase = 'roundEnd';
            const updatedPlayers = prev.players.map((p, idx) => {
                if (p.isEliminated) return p;
                let analysis = findBestCombination(p.hand);
                let currentLoose = analysis.looseCards;
                let currentGames = analysis.games;

                if (idx !== winnerIdx && winnerGames.length > 0) {
                    const { newLooseCards } = tryToAppendCards([...currentLoose], winnerGames.map(g => [...g]));
                    currentLoose = newLooseCards;
                }

                const score = calculateScore(currentGames, currentLoose, idx === winnerIdx);
                if (score === -1000) {
                    nextPhase = 'gameEnd';
                    return { ...p, wonGame: true, roundScore: -100, totalScore: -100 };
                }

                const newTotal = p.totalScore + score;
                return { ...p, games: currentGames, looseCards: currentLoose, roundScore: score, totalScore: newTotal, isEliminated: newTotal >= 100 };
            });

            if (updatedPlayers.filter(p => !p.isEliminated).length <= 1) nextPhase = 'gameEnd';
            return { ...prev, players: updatedPlayers, gamePhase: nextPhase, gameLog: [`Puntajes actualizados.`, ...prev.gameLog] };
        });
    }, []);

    const autoSortHand = useCallback(() => {
        setGameState(prev => {
            const player = prev.players[myPlayerIdx];
            if (!player) return prev;
            const analysis = findBestCombination(player.hand);
            const newHand = [...analysis.games.flat(), ...analysis.looseCards];
            return { ...prev, players: prev.players.map((p, i) => i === myPlayerIdx ? { ...p, hand: newHand } : p) };
        });
    }, [myPlayerIdx]);

    // IA Logic (solo en modo single)
    useEffect(() => {
        if (gameMode !== 'single' || gamePhase !== 'playing') return;
        const currentPlayer = players[currentPlayerIdx];
        if (currentPlayer?.isBot && !currentPlayer.isEliminated) {
            const botThinking = setTimeout(() => {
                const botDecision = executeBotTurn({ players, deck, discardPile }, currentPlayerIdx, difficulty);
                if (turnAction === 'draw') drawCard(botDecision.draw === 'deck');
                else if (turnAction === 'discard') botDecision.close ? closeHand(botDecision.discard) : discardCard(botDecision.discard);
            }, 1000);
            return () => clearTimeout(botThinking);
        }
    }, [currentPlayerIdx, gamePhase, turnAction, players, deck, discardPile, difficulty, gameMode]);

    return {
        ...gameState,
        deckSize: deck.length,
        selectedCards,
        setSelectedCards,
        startRound,
        drawCard,
        discardCard,
        closeHand,
        autoSortHand,
        startTurn,
        waitingForOpponent,
        myPlayerIdx,
        reorderHand: (newHand) => setGameState(prev => ({
            ...prev,
            players: prev.players.map((p, i) => i === myPlayerIdx ? { ...p, hand: newHand } : p)
        })),
        nextRound: () => {
            setGameState(prev => ({ ...prev, round: prev.round + 1 }));
            if (gameMode === 'multi' && playerRole === 'host') {
                const playerNames = players.map(p => p.name);
                startRoundMulti(playerNames, channelRef.current);
            } else {
                startRound();
            }
        },
        toggleCardSelection: (card) => setSelectedCards(prev => {
            const isSelected = prev.some(c => c.id === card.id);
            return isSelected ? prev.filter(c => c.id !== card.id) : [...prev, card];
        })
    };
};
