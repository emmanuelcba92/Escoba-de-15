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
    const [waitingForOpponent, setWaitingForOpponent] = useState(gameMode === 'multi');

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

                    // First player to join is the host
                    if (playersInRoom[0] === playerName) {
                        setPlayerRole('host');
                        setMyPlayerIdx(0);
                    } else {
                        setPlayerRole('guest');
                        setMyPlayerIdx(1); // Simple 2-player logic for now
                        setWaitingForOpponent(false);
                    }
                })
                .on('presence', { event: 'join' }, ({ key }) => {
                    if (key !== playerName) {
                        setWaitingForOpponent(false);
                        // If I'm host and someone joined, I start the round
                        // Using a ref-like check to avoid state stale closure
                    }
                })
                .on('broadcast', { event: 'init_game' }, ({ payload }) => {
                    setDeck(payload.deck);
                    setTable(payload.table);
                    setPlayers(payload.players);
                    setCurrentPlayerIdx(payload.currentPlayerIdx);
                    setDealerIdx(payload.dealerIdx);
                    setGameLog(prev => ["Partida sincronizada (Supabase).", ...prev]);
                    setWaitingForOpponent(false);
                })
                .on('broadcast', { event: 'play_move' }, ({ payload }) => {
                    processMove(payload.playerIdx, payload.move.cardPlayed, payload.move.cardsCaptured, payload.move.isDiscard, true);
                })
                .on('broadcast', { event: 'soplo_made' }, ({ payload }) => {
                    processSoplo(payload.playerIdx, payload.cardsCaptured, true);
                })
                .subscribe(async (status) => {
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

    // Host starting round effect
    useEffect(() => {
        if (gameMode === 'multi' && playerRole === 'host' && !waitingForOpponent && deck.length === 0) {
            // Only start if we haven't started yet
            setTimeout(() => startRoundMulti(), 500);
        }
    }, [playerRole, waitingForOpponent, gameMode]);

    const startRoundMulti = () => {
        if (playerRole !== 'host') return;

        let newDeck = shuffleDeck(createDeck());
        const initialTableCards = newDeck.splice(0, 4);

        setPlayers(currentPlayers => {
            const basePlayers = currentPlayers.length > 0 ? currentPlayers : createPlayersArr();
            const nextPlayers = basePlayers.map((p, i) => ({
                ...p,
                hand: newDeck.splice(0, 3),
                capturedCards: [],
                escobas: 0
            }));

            const { escobas, remaining } = findInitialEscobas(initialTableCards);
            let currentTable = remaining;
            let pIdx = (dealerIdx + 1) % playerCount;
            let initialMsgs = [`Ronda ${round} iniciada.`];

            if (escobas.length > 0) {
                nextPlayers[dealerIdx].capturedCards = [...escobas.flat()];
                nextPlayers[dealerIdx].escobas += escobas.length;
                setLastCapturerIdx(dealerIdx);
                initialMsgs.push(`¡Escoba de Mano! ${nextPlayers[dealerIdx].name} hizo ${escobas.length}.`);
            }

            channelRef.current.send({
                type: 'broadcast',
                event: 'init_game',
                payload: {
                    deck: newDeck,
                    table: currentTable,
                    players: nextPlayers,
                    currentPlayerIdx: pIdx,
                    dealerIdx
                }
            });

            setDeck(newDeck);
            setTable(currentTable);
            setCurrentPlayerIdx(pIdx);
            setGameLog(prev => [...initialMsgs, ...prev]);
            return nextPlayers;
        });
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
        if (gameMode === 'multi' && playerIdx === myPlayerIdx && !isRemote) {
            channelRef.current.send({
                type: 'broadcast',
                event: 'play_move',
                payload: {
                    playerIdx: myPlayerIdx,
                    move: { cardPlayed, cardsCaptured, isDiscard }
                }
            });
        }

        const player = players[playerIdx];
        if (!player) return;

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

        const newPlayers = [...players];
        newPlayers[playerIdx] = {
            ...player,
            hand: newHand,
            capturedCards: newCaptured,
            escobas: player.escobas + (escobaMade ? 1 : 0)
        };

        setPlayers(newPlayers);
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
        myPlayerIdx
    };
};
