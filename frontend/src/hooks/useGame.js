import { useState, useEffect, useCallback, useRef } from 'react';
import { createDeck, shuffleDeck, checkSum15, calculateMatchPoints, findInitialEscobas, checkTableSum15 } from '../game/engine';
import { findBestMove } from '../game/ai';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const SOUNDS = {
    play: 'https://assets.mixkit.co/active_storage/sfx/2021/2021-preview.mp3', // Vuelta de página rápida (libro)
    capture: 'https://assets.mixkit.co/active_storage/sfx/2004/2004-preview.mp3', // Tomar carta / Alce normal
    escoba: 'https://assets.mixkit.co/active_storage/sfx/2001/2001-preview.mp3'
};

const playSound = (type) => {
    if (!SOUNDS[type]) return;
    const audio = new Audio(SOUNDS[type]);
    audio.volume = 0.15;
    audio.play().catch(e => console.log("Audio play blocked"));
};

const speak = (text) => {
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'es-ES';
        utterance.pitch = 1.2;
        utterance.rate = 1;
        const voices = speechSynthesis.getVoices();
        const femaleVoice = voices.find(v => v.lang.startsWith('es') && (v.name.includes('Google') || v.name.includes('Monica') || v.name.includes('Lucia')));
        if (femaleVoice) utterance.voice = femaleVoice;
        speechSynthesis.speak(utterance);
    }
};

export const useGame = (gameMode = 'single', difficulty = 'normal', playerCount = 2, playMode = 'individual', roomId = '', playerName = 'Jugador 1') => {
    const [gameState, setGameState] = useState({
        deck: [],
        table: [],
        players: [],
        currentPlayerIdx: 0,
        gameLog: [],
        lastCapturerIdx: null,
        round: 1,
        dealerIdx: 0,
        gamePhase: 'setup', // setup -> playing -> roundEnd -> gameEnd
        waitingForOpponent: gameMode === 'multi'
    });

    const [selectedHandCard, setSelectedHandCard] = useState(null);
    const [selectedTableCards, setSelectedTableCards] = useState([]);
    const [timeLeft, setTimeLeft] = useState(30);
    const [stats, setStats] = useState(() => {
        const saved = localStorage.getItem('escoba_stats');
        return saved ? JSON.parse(saved) : { wins: 0, losses: 0, totalEscobas: 0 };
    });

    const channelRef = useRef(null);
    const [playerRole, setPlayerRole] = useState(null);
    const [myPlayerIdx, setMyPlayerIdx] = useState(0);
    const myPlayerIdxRef = useRef(0);
    const gameInitializedRef = useRef(false);
    const myPresenceIdRef = useRef(null); // NEW: Stable Presence ID

    // Ref para acceso síncrono en callbacks de Supabase
    const gameStateRef = useRef(gameState);
    useEffect(() => { gameStateRef.current = gameState; }, [gameState]);

    const { deck, table, players, currentPlayerIdx, gameLog, lastCapturerIdx, round, dealerIdx, gamePhase, waitingForOpponent } = gameState;

    // Timer Logic
    useEffect(() => {
        if (waitingForOpponent || gamePhase !== 'playing') return;
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    if (gameMode !== 'multi' || currentPlayerIdx === myPlayerIdx) {
                        const player = players[currentPlayerIdx];
                        if (player && player.hand.length > 0) {
                            processMove(currentPlayerIdx, player.hand[0], [], true);
                        }
                    }
                    return 30;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [currentPlayerIdx, waitingForOpponent, gameMode, myPlayerIdx, players, gamePhase]);

    useEffect(() => {
        setTimeLeft(30);
    }, [currentPlayerIdx]);

    const createPlayersArr = useCallback(() => {
        const p = [];
        for (let i = 0; i < playerCount; i++) {
            let name = (i === 0) ? playerName : (gameMode === 'single' ? `CPU ${i}` : `Jugador ${i + 1}`);
            p.push({
                id: `p${i + 1}`,
                name,
                hand: [],
                capturedCards: [],
                escobas: 0,
                score: 0,
                isBot: gameMode === 'single' && i > 0
            });
        }
        return p;
    }, [playerCount, gameMode, playerName]);

    const startRound = useCallback(() => {
        if (gameMode === 'multi') return;

        setGameState(prev => {
            const activePlayers = prev.players.length > 0 ? prev.players : createPlayersArr();
            let newDeck = shuffleDeck(createDeck());
            const tableCards = newDeck.splice(0, 4);

            const nextPlayers = activePlayers.map(p => ({
                ...p,
                hand: newDeck.splice(0, 3),
                capturedCards: [],
                escobas: 0
            }));

            const { escobas, remaining } = findInitialEscobas(tableCards);
            let currentTable = remaining;
            let initialMsgs = [`Ronda ${prev.round} iniciada.`];
            let nextLastCapturerIdx = prev.lastCapturerIdx;

            if (escobas.length > 0) {
                const dealer = nextPlayers[prev.dealerIdx];
                if (dealer) {
                    dealer.capturedCards = [...escobas.flat()];
                    dealer.escobas += escobas.length;
                    nextLastCapturerIdx = prev.dealerIdx;
                    initialMsgs.push(`¡Escoba de Mano! ${dealer.name} hizo ${escobas.length}.`);
                    playSound('escoba');
                    speak(escobas.length > 1 ? "Escobas de mano" : "Escoba de mano");
                }
            }

            return {
                ...prev,
                deck: newDeck,
                table: currentTable,
                players: nextPlayers,
                currentPlayerIdx: (prev.dealerIdx + 1) % playerCount,
                gameLog: [...initialMsgs, ...prev.gameLog],
                lastCapturerIdx: nextLastCapturerIdx,
                gamePhase: 'playing'
            };
        });
    }, [playerCount, gameMode, createPlayersArr]);

    useEffect(() => {
        if (gamePhase === 'setup' && gameMode !== 'multi') {
            startRound();
        }
    }, [gamePhase, gameMode, startRound]);

    // Safety Trigger: if playing but no players, force initialize
    useEffect(() => {
        if (gamePhase === 'playing' && players.length === 0 && gameMode !== 'multi') {
            console.warn("Escoba Safety Trigger: Initializing missing players...");
            startRound();
        }
    }, [gamePhase, players.length, gameMode, startRound]);

    // Supabase Multiplayer Setup
    useEffect(() => {
        if (gameMode === 'multi' && roomId) {
            const uniqueId = `${playerName}_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
            myPresenceIdRef.current = uniqueId;

            const channel = supabase.channel(`room_${roomId}`, {
                config: { presence: { key: uniqueId } }
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

                    // Stable matching using generated ID
                    const myEntry = roomPlayers.find(p => p.id === myPresenceIdRef.current);
                    const isHost = roomPlayers[0]?.id === myEntry?.id;
                    const myIdx = roomPlayers.findIndex(p => p.id === myEntry?.id);

                    console.log('[Escoba] Presence sync:', { roomPlayers: roomPlayers.length, myIdx, isHost, myId: myPresenceIdRef.current });

                    setPlayerRole(isHost ? 'host' : 'guest');
                    setMyPlayerIdx(myIdx >= 0 ? myIdx : 0);
                    myPlayerIdxRef.current = myIdx >= 0 ? myIdx : 0;

                    if (roomPlayers.length >= playerCount) {
                        setGameState(prev => ({ ...prev, waitingForOpponent: false }));
                        if (isHost && !gameInitializedRef.current) {
                            gameInitializedRef.current = true;
                            const playerNames = roomPlayers.map(p => p.name);
                            console.log('[Escoba] Host starting game with players:', playerNames);
                            setTimeout(() => startRoundMulti(playerNames, channel), 500);
                        }
                    } else {
                        setGameState(prev => ({ ...prev, waitingForOpponent: true }));
                    }
                })
                .on('broadcast', { event: 'init_game' }, ({ payload }) => {
                    setGameState(prev => ({ ...prev, ...payload, waitingForOpponent: false, gamePhase: 'playing' }));
                })
                .on('broadcast', { event: 'play_move' }, ({ payload }) => {
                    if (payload.playerIdx !== myPlayerIdxRef.current) {
                        processMove(payload.playerIdx, payload.move.cardPlayed, payload.move.cardsCaptured, payload.move.isDiscard, true);
                    }
                })
                .on('broadcast', { event: 'deal_next_hands' }, ({ payload }) => {
                    setGameState(prev => ({ ...prev, ...payload }));
                })
                .on('broadcast', { event: 'soplo_made' }, ({ payload }) => {
                    processSoplo(payload.playerIdx, payload.cardsCaptured, true);
                })
                .subscribe(async (status) => {
                    if (status === 'SUBSCRIBED') {
                        console.log('[Escoba] Subscribed with ID:', myPresenceIdRef.current);
                        await channel.track({
                            id: myPresenceIdRef.current,
                            name: playerName,
                            joined_at: new Date().toISOString()
                        });
                    }
                });

            channelRef.current = channel;
            return () => { channel.unsubscribe(); };
        }
    }, [gameMode, roomId, playerName, playerCount]);

    const startRoundMulti = (playerNames, channel, forcedRound = null) => {
        const currentRound = forcedRound || gameStateRef.current.round;
        const realPlayers = playerNames.map((name, i) => ({
            id: `p${i + 1}`, name, hand: [], capturedCards: [], escobas: 0, score: 0, isBot: false
        }));

        let newDeck = shuffleDeck(createDeck());
        const initialTableCards = newDeck.splice(0, 4);
        realPlayers.forEach(p => { p.hand = newDeck.splice(0, 3); });

        const { escobas, remaining } = findInitialEscobas(initialTableCards);
        let initialMsgs = [`Ronda ${currentRound} iniciada.`];
        let lastCap = null;

        if (escobas.length > 0) {
            realPlayers[0].capturedCards = [...escobas.flat()];
            realPlayers[0].escobas += escobas.length;
            lastCap = 0;
            initialMsgs.push(`¡Escoba de Mano! ${realPlayers[0].name} hizo ${escobas.length}.`);
        }

        const payload = {
            deck: newDeck,
            table: remaining,
            players: realPlayers,
            currentPlayerIdx: 0,
            dealerIdx: (gameStateRef.current.dealerIdx + 1) % playerCount,
            lastCapturerIdx: lastCap,
            round: currentRound
        };

        channel.send({ type: 'broadcast', event: 'init_game', payload });
        setGameState(prev => ({ ...prev, ...payload, gamePhase: 'playing' }));
    };

    const processMove = (playerIdx, cardPlayed, cardsCaptured, isDiscard = false, isRemote = false) => {
        if (gameMode === 'multi' && playerIdx === myPlayerIdxRef.current && !isRemote) {
            channelRef.current?.send({
                type: 'broadcast',
                event: 'play_move',
                payload: { playerIdx, move: { cardPlayed, cardsCaptured, isDiscard } }
            });
        }

        setGameState(prev => {
            const player = prev.players[playerIdx];
            if (!player) return prev;

            const newHand = player.hand.filter(c => c.id !== cardPlayed.id);
            let newTable = [...prev.table];
            let newCaptured = [...player.capturedCards];
            let escobaMade = false;
            let logMsg = '';
            let nextLastCap = prev.lastCapturerIdx;

            if (isDiscard) {
                newTable.push(cardPlayed);
                logMsg = `${player.name} tiró ${cardPlayed.value} de ${cardPlayed.suit}.`;
                playSound('play');
            } else {
                newTable = newTable.filter(c => !cardsCaptured.some(cap => cap.id === c.id));
                newCaptured = [...newCaptured, cardPlayed, ...cardsCaptured];
                if (newTable.length === 0) {
                    escobaMade = true;
                    logMsg = `¡${player.name} hizo Escoba!`;
                    playSound('escoba');
                    speak("Escoba");
                } else {
                    logMsg = `${player.name} levantó cartas.`;
                    playSound('capture');
                }
                nextLastCap = playerIdx;
            }

            const newPlayers = prev.players.map((p, i) => i === playerIdx ? {
                ...p, hand: newHand, capturedCards: newCaptured, escobas: p.escobas + (escobaMade ? 1 : 0)
            } : p);

            const allEmpty = newPlayers.every(p => p.hand.length === 0);
            if (allEmpty) {
                if (prev.deck.length > 0) {
                    // Deal next 3 cards
                    const nextDeck = [...prev.deck];
                    const playersWithNewHands = newPlayers.map(p => ({ ...p, hand: nextDeck.splice(0, 3) }));

                    if (gameMode === 'multi' && playerRole === 'host') {
                        channelRef.current.send({
                            type: 'broadcast', event: 'deal_next_hands',
                            payload: { deck: nextDeck, players: playersWithNewHands, currentPlayerIdx: (prev.dealerIdx + 1) % playerCount }
                        });
                    }

                    return {
                        ...prev,
                        deck: nextDeck,
                        table: newTable,
                        players: playersWithNewHands,
                        currentPlayerIdx: (prev.dealerIdx + 1) % playerCount,
                        gameLog: [logMsg, ...prev.gameLog],
                        lastCapturerIdx: nextLastCap
                    };
                } else {
                    // End round
                    return finalizeRound(prev, newPlayers, newTable, nextLastCap);
                }
            }

            return {
                ...prev,
                table: newTable,
                players: newPlayers,
                currentPlayerIdx: (playerIdx + 1) % playerCount,
                gameLog: [logMsg, ...prev.gameLog],
                lastCapturerIdx: nextLastCap
            };
        });
    };

    const finalizeRound = (state, players, table, lastCap) => {
        let finalPlayers = [...players];
        if (lastCap !== null && table.length > 0) {
            finalPlayers[lastCap] = { ...finalPlayers[lastCap], capturedCards: [...finalPlayers[lastCap].capturedCards, ...table] };
        }

        const results = calculateMatchPoints(finalPlayers, playMode);
        finalPlayers = finalPlayers.map((p, i) => ({ ...p, score: p.score + results[i].score }));

        const hasWinner = finalPlayers.some(p => p.score >= 15);
        if (hasWinner) {
            return { ...state, players: finalPlayers, table: [], gamePhase: 'gameEnd', gameLog: ["Partida finalizada.", ...state.gameLog] };
        }

        setTimeout(() => {
            setGameState(prev => ({
                ...prev, round: prev.round + 1, dealerIdx: (prev.dealerIdx + 1) % playerCount, gamePhase: 'setup'
            }));
        }, 3000);

        return { ...state, players: finalPlayers, table: [], gamePhase: 'roundEnd' };
    };

    const processSoplo = (playerIdx, cardsCaptured, isRemote = false) => {
        if (gameMode === 'multi' && !isRemote) {
            channelRef.current?.send({ type: 'broadcast', event: 'soplo_made', payload: { playerIdx, cardsCaptured } });
        }
        setGameState(prev => ({
            ...prev,
            players: prev.players.map((p, i) => i === playerIdx ? { ...p, capturedCards: [...p.capturedCards, ...cardsCaptured], escobas: p.escobas + 1 } : p),
            table: prev.table.filter(c => !cardsCaptured.some(cap => cap.id === c.id)),
            gameLog: [`¡SOPLO! ${prev.players[playerIdx]?.name} sopló cartas.`, ...prev.gameLog]
        }));
        playSound('escoba');
    };

    // AI logic
    useEffect(() => {
        if (gameMode !== 'single' || gamePhase !== 'playing' || waitingForOpponent) return;
        const player = players[currentPlayerIdx];
        if (player?.isBot) {
            const timer = setTimeout(() => {
                const move = findBestMove(player.hand, table, difficulty);
                processMove(currentPlayerIdx, move.card, move.captured, move.type === 'discard');
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [currentPlayerIdx, gamePhase, waitingForOpponent]);

    return {
        ...gameState,
        selectedHandCard,
        setSelectedHandCard,
        selectedTableCards,
        setSelectedTableCards,
        timeLeft,
        stats,
        onHandCardClick: (card) => {
            if (gamePhase !== 'playing' || (gameMode === 'multi' && currentPlayerIdx !== myPlayerIdx)) return;
            setSelectedHandCard(prev => prev?.id === card.id ? null : card);
        },
        onTableCardClick: (card) => {
            if (gamePhase !== 'playing') return;
            setSelectedTableCards(prev => prev.some(c => c.id === card.id) ? prev.filter(c => c.id !== card.id) : [...prev, card]);
        },
        onPlayMove: () => {
            if (!selectedHandCard) return;
            if (checkSum15(selectedHandCard, selectedTableCards)) processMove(currentPlayerIdx, selectedHandCard, selectedTableCards, false);
            else if (selectedTableCards.length === 0) processMove(currentPlayerIdx, selectedHandCard, [], true);
        },
        onSoplo: () => {
            if (checkTableSum15(selectedTableCards)) processSoplo(gameMode === 'multi' ? myPlayerIdx : currentPlayerIdx, selectedTableCards);
        },
        nextRound: () => {
            const nextR = round + 1;
            if (gameMode === 'multi' && playerRole === 'host') {
                const pNames = players.map(p => p.name);
                startRoundMulti(pNames, channelRef.current, nextR);
            } else {
                setGameState(prev => ({ ...prev, round: nextR, gamePhase: 'setup' }));
            }
        },
        deckSize: deck.length,
        myPlayerIdx
    };
};
