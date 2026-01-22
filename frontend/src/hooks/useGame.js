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
    const [deck, setDeck] = useState([]);
    const [table, setTable] = useState([]);
    const [players, setPlayers] = useState([]);
    const [currentPlayerIdx, setCurrentPlayerIdx] = useState(0);
    const [selectedHandCard, setSelectedHandCard] = useState(null);
    const [selectedTableCards, setSelectedTableCards] = useState([]);
    const [gameLog, setGameLog] = useState([]);
    const [lastCapturerIdx, setLastCapturerIdx] = useState(null);
    const [round, setRound] = useState(1);
    const [dealerIdx, setDealerIdx] = useState(0);
    const [timeLeft, setTimeLeft] = useState(30);
    const [stats, setStats] = useState(() => {
        const saved = localStorage.getItem('escoba_stats');
        return saved ? JSON.parse(saved) : { wins: 0, losses: 0, totalEscobas: 0 };
    });

    const channelRef = useRef(null);
    const [playerRole, setPlayerRole] = useState(null); // 'host', 'guest'
    const [myPlayerIdx, setMyPlayerIdx] = useState(0);
    const myPlayerIdxRef = useRef(0);
    const [waitingForOpponent, setWaitingForOpponent] = useState(gameMode === 'multi');
    const gameInitializedRef = useRef(false);
    const playersRef = useRef([]);

    // Timer Logic
    useEffect(() => {
        if (waitingForOpponent) return;
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
    }, [currentPlayerIdx, waitingForOpponent, gameMode, myPlayerIdx, players]);

    useEffect(() => {
        setTimeLeft(30);
    }, [currentPlayerIdx]);

    const createPlayersArr = useCallback(() => {
        const p = [];
        for (let i = 0; i < playerCount; i++) {
            let name = `Jugador ${i + 1}`;
            if (i === 0) name = playerName;
            else if (gameMode === 'single') name = `Jugador ${i + 1} (CPU)`;

            p.push({
                id: `p${i + 1}`,
                name: name,
                hand: [],
                capturedCards: [],
                escobas: 0,
                score: 0,
                isBot: gameMode === 'single' && i > 0
            });
        }
        return p;
    }, [playerCount, gameMode, playerName]);

    useEffect(() => {
        setPlayers(createPlayersArr());
    }, [playerCount, gameMode, playerName]);

    // Supabase Multiplayer Setup
    useEffect(() => {
        if (gameMode === 'multi' && roomId) {
            const channel = supabase.channel(`room_${roomId}`, {
                config: { presence: { key: playerName } }
            });

            channel
                .on('presence', { event: 'sync' }, () => {
                    const state = channel.presenceState();
                    const playersInRoom = Object.keys(state);
                    console.log('Players in room:', playersInRoom);

                    if (playersInRoom.length === 0) return;

                    // First player alphabetically is the host
                    const sortedPlayers = [...playersInRoom].sort();
                    const isHost = sortedPlayers[0] === playerName;
                    const myIdx = sortedPlayers.indexOf(playerName);

                    setPlayerRole(isHost ? 'host' : 'guest');
                    setMyPlayerIdx(myIdx);
                    myPlayerIdxRef.current = myIdx; // Update ref immediately
                    console.log('My player index set to:', myIdx);

                    // When we have 2 players, the host starts the game
                    if (playersInRoom.length >= 2) {
                        setWaitingForOpponent(false);

                        // Only host initializes the game, and only once
                        if (isHost && !gameInitializedRef.current) {
                            gameInitializedRef.current = true;
                            console.log('Host starting game with players:', sortedPlayers);
                            setTimeout(() => startRoundMulti(sortedPlayers, channel), 500);
                        }
                    } else {
                        setWaitingForOpponent(true);
                    }
                })
                .on('broadcast', { event: 'init_game' }, ({ payload }) => {
                    console.log('Received init_game:', payload);
                    setDeck(payload.deck);
                    setTable(payload.table);
                    setPlayers(payload.players);
                    playersRef.current = payload.players; // Update ref immediately
                    setCurrentPlayerIdx(payload.currentPlayerIdx);
                    setDealerIdx(payload.dealerIdx);
                    setGameLog(prev => ["Partida sincronizada.", ...prev]);
                    setWaitingForOpponent(false);
                })
                .on('broadcast', { event: 'play_move' }, ({ payload }) => {
                    console.log('Received play_move from remote:', payload);
                    processMove(payload.playerIdx, payload.move.cardPlayed, payload.move.cardsCaptured, payload.move.isDiscard, true);
                })
                .on('broadcast', { event: 'soplo_made' }, ({ payload }) => {
                    processSoplo(payload.playerIdx, payload.cardsCaptured, true);
                })
                .subscribe(async (status) => {
                    console.log('Channel status:', status);
                    if (status === 'SUBSCRIBED') {
                        await channel.track({ online_at: new Date().toISOString() });
                    }
                });

            channelRef.current = channel;

            return () => {
                channel.unsubscribe();
            };
        }
    }, [gameMode, roomId, playerName]);

    const startRoundMulti = (playerNames, channel) => {
        console.log('startRoundMulti called with:', playerNames);

        // Create players with real names from Supabase presence
        const realPlayers = playerNames.map((name, i) => ({
            id: `p${i + 1}`,
            name: name,
            hand: [],
            capturedCards: [],
            escobas: 0,
            score: 0,
            isBot: false
        }));

        let newDeck = shuffleDeck(createDeck());
        const initialTableCards = newDeck.splice(0, 4);

        // Give each player 3 cards
        realPlayers.forEach(p => {
            p.hand = newDeck.splice(0, 3);
        });

        const { escobas, remaining } = findInitialEscobas(initialTableCards);
        let currentTable = remaining;
        let pIdx = 0; // First player starts
        let initialMsgs = [`Ronda ${round} iniciada.`];

        if (escobas.length > 0) {
            realPlayers[0].capturedCards = [...escobas.flat()];
            realPlayers[0].escobas += escobas.length;
            setLastCapturerIdx(0);
            initialMsgs.push(`¡Escoba de Mano! ${realPlayers[0].name} hizo ${escobas.length}.`);
        }

        // Broadcast to all players
        console.log('Broadcasting init_game with players:', realPlayers);
        channel.send({
            type: 'broadcast',
            event: 'init_game',
            payload: {
                deck: newDeck,
                table: currentTable,
                players: realPlayers,
                currentPlayerIdx: pIdx,
                dealerIdx: 0
            }
        });

        // Also set locally for host
        setDeck(newDeck);
        setTable(currentTable);
        setPlayers(realPlayers);
        playersRef.current = realPlayers; // Update ref immediately
        setCurrentPlayerIdx(pIdx);
        setDealerIdx(0);
        setGameLog(prev => [...initialMsgs, ...prev]);
    };

    const startRound = useCallback(() => {
        if (gameMode === 'multi') return;

        setPlayers(currentPlayers => {
            if (currentPlayers.length === 0) return currentPlayers;

            let newDeck = shuffleDeck(createDeck());
            const initialTableCards = newDeck.splice(0, 4);

            const nextPlayers = currentPlayers.map(p => ({
                ...p,
                hand: newDeck.splice(0, 3),
                capturedCards: [],
                escobas: 0
            }));

            const { escobas, remaining } = findInitialEscobas(initialTableCards);
            let currentTable = remaining;
            let initialMsgs = [`Ronda ${round} iniciada.`];

            if (escobas.length > 0) {
                const dealer = nextPlayers[dealerIdx];
                if (dealer) {
                    dealer.capturedCards = [...escobas.flat()];
                    dealer.escobas += escobas.length;
                    setLastCapturerIdx(dealerIdx);
                    initialMsgs.push(`¡Escoba de Mano! ${dealer.name} hizo ${escobas.length}.`);
                    playSound('escoba');
                    speak(escobas.length > 1 ? "Escobas de mano" : "Escoba de mano");
                }
            }

            setTable(currentTable);
            setDeck(newDeck);
            setCurrentPlayerIdx((dealerIdx + 1) % playerCount);
            setGameLog(prev => [...initialMsgs, ...prev]);
            return nextPlayers;
        });
    }, [round, dealerIdx, playerCount, gameMode]);

    useEffect(() => {
        if (gameMode !== 'multi') startRound();
    }, [round]);

    useEffect(() => {
        if (gameMode === 'multi') return; // Strictly no AI moves in multi mode
        const currentPlayer = players[currentPlayerIdx];
        if (currentPlayer?.isBot && !waitingForOpponent) {
            const timer = setTimeout(() => {
                const move = findBestMove(currentPlayer.hand, table, difficulty);
                if (move.type === 'capture') processMove(currentPlayerIdx, move.card, move.captured);
                else processMove(currentPlayerIdx, move.card, [], true);
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [currentPlayerIdx, players, table, waitingForOpponent, difficulty]);

    const processMove = (playerIdx, cardPlayed, cardsCaptured, isDiscard = false, isRemote = false) => {
        // Use ref for myPlayerIdx to avoid stale closure
        const currentMyPlayerIdx = myPlayerIdxRef.current;
        console.log('processMove called:', { playerIdx, currentMyPlayerIdx, isRemote, gameMode, hasChannel: !!channelRef.current });

        if (gameMode === 'multi' && playerIdx === currentMyPlayerIdx && !isRemote) {
            console.log('Broadcasting play_move...');
            if (channelRef.current) {
                channelRef.current.send({
                    type: 'broadcast',
                    event: 'play_move',
                    payload: {
                        playerIdx: currentMyPlayerIdx,
                        move: { cardPlayed, cardsCaptured, isDiscard }
                    }
                });
                console.log('play_move broadcasted successfully');
            } else {
                console.error('Channel not available for broadcast!');
            }
        }

        // Use ref for players in remote moves to get the latest data
        const currentPlayers = isRemote && playersRef.current.length > 0 ? playersRef.current : players;
        const player = currentPlayers[playerIdx];
        if (!player) {
            console.error('Player not found:', playerIdx, currentPlayers);
            return;
        }

        const newHand = player.hand.filter(c => c.id !== cardPlayed.id);
        let newTable = [...table];
        let newCaptured = [...player.capturedCards];
        let escobaMade = false;
        let logMsg = '';

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
                const velos = [...cardsCaptured, cardPlayed].filter(c => c.suit === 'oros' && [1, 7, 12].includes(c.value));
                if (velos.length > 0) speak("Velo levantado");
            }
            setLastCapturerIdx(playerIdx);
        }

        // Use currentPlayers (from ref for remote) to create new array
        const newPlayers = currentPlayers.map((p, i) => {
            if (i === playerIdx) {
                return {
                    ...player,
                    hand: newHand,
                    capturedCards: newCaptured,
                    escobas: player.escobas + (escobaMade ? 1 : 0)
                };
            }
            return { ...p }; // Keep other players intact
        });

        setPlayers(newPlayers);
        playersRef.current = newPlayers; // Update ref too
        setTable(newTable);
        setGameLog(prev => [logMsg, ...prev]);
        setSelectedHandCard(null);
        setSelectedTableCards([]);

        const allEmpty = newPlayers.every(p => p.hand.length === 0);
        if (allEmpty) {
            if (deck.length > 0) {
                const nextDeck = [...deck];
                const nextPlayersArr = newPlayers.map(p => ({ ...p, hand: nextDeck.splice(0, 3) }));
                setDeck(nextDeck);
                setPlayers(nextPlayersArr);
                playersRef.current = nextPlayersArr; // Update ref too
                setGameLog(prev => ["Nuevas cartas repartidas.", ...prev]);
                setCurrentPlayerIdx((dealerIdx + 1) % playerCount);
            } else {
                endRound(newPlayers, newTable, lastCapturerIdx);
            }
        } else {
            setCurrentPlayerIdx((playerIdx + 1) % playerCount);
        }
    };

    const processSoplo = (playerIdx, cardsCaptured, isRemote = false) => {
        if (gameMode === 'multi' && !isRemote) {
            channelRef.current.send({
                type: 'broadcast',
                event: 'soplo_made',
                payload: { playerIdx, cardsCaptured }
            });
        }

        setPlayers(prev => {
            const next = [...prev];
            const p = next[playerIdx];
            if (!p) return prev;

            p.capturedCards = [...p.capturedCards, ...cardsCaptured];
            p.escobas = (p.escobas || 0) + 1;
            return next;
        });

        setTable(prev => prev.filter(c => !cardsCaptured.some(cap => cap.id === c.id)));
        setGameLog(prev => [`¡SOPLO! ${players[playerIdx]?.name || 'Alguien'} sopló cartas de la mesa.`, ...prev]);
        setSelectedTableCards([]);
        playSound('escoba');
        speak("Soplo");
    };

    const endRound = (currentPlayers, remainingTable, lastCapturer) => {
        let finalPlayers = [...currentPlayers];
        if (lastCapturer !== null && remainingTable.length > 0) {
            finalPlayers[lastCapturer].capturedCards.push(...remainingTable);
            setGameLog(prev => [`${finalPlayers[lastCapturer].name} se lleva las sobras.`, ...prev]);
        }
        setTable([]);

        const results = calculateMatchPoints(finalPlayers, playMode);

        let summaryMsgs = [];
        if (playMode === 'teams' && finalPlayers.length === 4) {
            finalPlayers[0].score += results[0].score;
            finalPlayers[2].score += results[0].score;
            finalPlayers[1].score += results[1].score;
            finalPlayers[3].score += results[1].score;
            summaryMsgs.push(`Eq. A: +${results[0].score} pts`, `Eq. B: +${results[1].score} pts`);
        } else {
            results.forEach((res, i) => {
                if (finalPlayers[i]) {
                    finalPlayers[i].score += res.score;
                    summaryMsgs.push(`${finalPlayers[i].name}: +${res.score} pts`);
                }
            });
        }

        setPlayers(finalPlayers);
        setGameLog(prev => [...summaryMsgs, ...prev]);

        const hasWinner = finalPlayers.some(p => p.score >= 15);
        if (hasWinner) {
            const winner = [...finalPlayers].sort((a, b) => b.score - a.score)[0];
            setGameLog(prev => [`¡PARTIDA FINALIZADA! Ganador: ${winner.name}`, ...prev]);
            speak(`Partida finalizada. Ganador ${winner.name}`);
        } else {
            setTimeout(() => {
                setDealerIdx(prev => (prev + 1) % playerCount);
                setRound(prev => prev + 1);
            }, 3000);
        }
    };

    const onHandCardClick = (card) => {
        if (gameMode === 'multi' && currentPlayerIdx !== myPlayerIdx) return;
        if (players[currentPlayerIdx]?.isBot) return;
        setSelectedHandCard(card.id === selectedHandCard?.id ? null : card);
    };

    const onTableCardClick = (card) => {
        const exists = selectedTableCards.find(c => c.id === card.id);
        if (exists) setSelectedTableCards(prev => prev.filter(c => c.id !== card.id));
        else setSelectedTableCards(prev => [...prev, card]);
    };

    const onPlayMove = () => {
        if (!selectedHandCard) return;
        if (checkSum15(selectedHandCard, selectedTableCards)) processMove(currentPlayerIdx, selectedHandCard, selectedTableCards, false);
        else if (selectedTableCards.length === 0) processMove(currentPlayerIdx, selectedHandCard, [], true);
        else alert("La suma no es 15. Para descartar, no selecciones cartas de la mesa.");
    };

    const onSoplo = () => {
        if (checkTableSum15(selectedTableCards)) {
            const sopladorIdx = gameMode === 'multi' ? myPlayerIdx : currentPlayerIdx;
            processSoplo(sopladorIdx, selectedTableCards);
        }
    };

    return {
        players,
        table,
        currentPlayerIdx,
        selectedHandCard,
        selectedTableCards,
        gameLog,
        onHandCardClick,
        onTableCardClick,
        onPlayMove,
        onSoplo,
        deckSize: deck.length,
        timeLeft,
        stats,
        dealerIdx,
        gameMode,
        waitingForOpponent,
        myPlayerIdx,
        roomId
    };
};
