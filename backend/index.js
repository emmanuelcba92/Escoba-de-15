const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3001;
const rooms = {};

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join_room', (roomId) => {
        socket.join(roomId);

        if (!rooms[roomId]) {
            rooms[roomId] = {
                players: [socket.id],
                host: socket.id
            };
            console.log(`Room ${roomId} created by ${socket.id}`);
            socket.emit('room_info', { role: 'host', players: 1 });
        } else {
            if (rooms[roomId].players.length >= 4) {
                socket.emit('error_msg', 'La sala está llena');
                return;
            }
            rooms[roomId].players.push(socket.id);
            console.log(`User ${socket.id} joined room ${roomId}`);

            const playerCount = rooms[roomId].players.length;
            io.to(roomId).emit('player_joined', {
                playerCount,
                players: rooms[roomId].players
            });

            socket.emit('room_info', {
                role: 'guest',
                playerIndex: playerCount - 1
            });
        }
    });

    // Relay for initial state (Sync Deck/Table)
    socket.on('sync_game_state', (data) => {
        // data: { roomId, deck, table, players }
        socket.to(data.roomId).emit('init_game_state', data);
    });

    // Relay moves
    socket.on('play_move', (data) => {
        // data: { roomId, playerIdx, move }
        socket.to(data.roomId).emit('opponent_move', data);
    });

    // Relay round start
    socket.on('start_new_round', (data) => {
        socket.to(data.roomId).emit('new_round_started', data);
    });

    socket.on('disconnect', () => {
        for (const roomId in rooms) {
            const index = rooms[roomId].players.indexOf(socket.id);
            if (index !== -1) {
                rooms[roomId].players.splice(index, 1);
                io.to(roomId).emit('player_left', { id: socket.id });
                if (rooms[roomId].players.length === 0) {
                    delete rooms[roomId];
                }
                break;
            }
        }
    });
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`SERVER RUNNING ON PORT ${PORT}`);
});
