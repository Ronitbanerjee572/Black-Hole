const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Import managers
const RoomManager = require('./manager/roomManager');
const GameManager = require('./manager/gameManager');

const app = express();
const server = http.createServer(app);

// Environment variables for deployment
const PORT = process.env.PORT || 3002;
const NODE_ENV = process.env.NODE_ENV || 'development';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

const io = socketIo(server, {
  cors: {
    origin: NODE_ENV === 'production' 
      ? [/\.netlify\.app$/, /vercel\.app$/, /localhost:\d+/]  // Allow Netlify, Vercel, and localhost
      : CLIENT_URL,
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Middleware
app.use(cors({
  origin: NODE_ENV === 'production' 
    ? [/\.netlify\.app$/, /vercel\.app$/, /localhost:\d+/]
    : CLIENT_URL,
  credentials: true
}));
app.use(express.json());

// Health check endpoint for Render
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: NODE_ENV 
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Black Hole Game Server API',
    version: '1.0.0',
    status: 'running',
    environment: NODE_ENV
  });
});

// Initialize managers
const roomManager = new RoomManager();
const gameManager = new GameManager();

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`🔗 User connected: ${socket.id}`);

  // Create a new room
  socket.on('createRoom', (data) => {
    try {
      const { playerName } = data;
      if (!playerName || playerName.trim() === '') {
        socket.emit('roomError', { message: 'Player name is required' });
        return;
      }

      const roomCode = roomManager.createRoom(socket.id, playerName.trim());
      
      socket.join(roomCode);
      
      // Initialize game immediately when room is created
      const roomData = roomManager.getRoomData(roomCode);
      const gameState = gameManager.initializeGame(roomData, roomCode);
      
      socket.emit('roomCreated', { roomCode, playerId: socket.id, gameState });
      
      console.log(`🏠 Room ${roomCode} created by ${playerName}`);
      console.log('🎮 Game initialized for room:', roomCode);
    } catch (error) {
      console.error('Error creating room:', error);
      socket.emit('roomError', { message: 'Failed to create room' });
    }
  });

  // Join an existing room
  socket.on('joinRoom', (data) => {
    try {
      const { roomCode, playerName } = data;
      
      if (!roomCode || roomCode.trim() === '') {
        socket.emit('roomError', { message: 'Room code is required' });
        return;
      }

      if (!playerName || playerName.trim() === '') {
        socket.emit('roomError', { message: 'Player name is required' });
        return;
      }
      
      const normalizedRoomCode = roomCode.trim().toUpperCase();
      
      if (!roomManager.roomExists(normalizedRoomCode)) {
        socket.emit('roomError', { message: 'Room does not exist' });
        return;
      }
      
      if (roomManager.isRoomFull(normalizedRoomCode)) {
        socket.emit('roomError', { message: 'Room is full' });
        return;
      }
      
      const success = roomManager.joinRoom(normalizedRoomCode, socket.id, playerName.trim());
      
      if (success) {
        socket.join(normalizedRoomCode);
        const roomData = roomManager.getRoomData(normalizedRoomCode);
        
        // Notify all players in the room
        io.to(normalizedRoomCode).emit('playerJoined', { roomData });
        
        // Start game if room is full
        if (roomManager.isRoomFull(normalizedRoomCode)) {
          const gameState = gameManager.initializeGame(roomData, normalizedRoomCode);
          io.to(normalizedRoomCode).emit('gameStarted', { gameState });
        }
        
        socket.emit('roomJoined', { roomCode: normalizedRoomCode, playerId: socket.id });
        console.log(`👤 ${playerName} joined room ${normalizedRoomCode}`);
      } else {
        socket.emit('roomError', { message: 'Failed to join room' });
      }
    } catch (error) {
      console.error('Error joining room:', error);
      socket.emit('roomError', { message: 'Failed to join room' });
    }
  });

  // Handle game moves
  socket.on('makeMove', (data) => {
    try {
      const { roomCode, move } = data;
      
      if (!roomCode || !move) {
        socket.emit('moveError', { message: 'Invalid move data' });
        return;
      }
      
      // Validate the move
      const validationResult = gameManager.validateMove(roomCode, move);
      
      if (!validationResult.valid) {
        socket.emit('moveError', { message: validationResult.message });
        return;
      }
      
      // Apply the move
      const gameState = gameManager.makeMove(roomCode, move);
      
      // Broadcast new game state to all players
      io.to(roomCode).emit('moveMade', { 
        board: gameState.board,
        nextPlayer: gameState.currentPlayer,
        nextNumber: gameState.currentNumber,
        scores: gameState.scores || { player1: 0, player2: 0 },
        moveHistory: gameState.moveHistory || []
      });
      
      // Check if game is finished
      if (gameState.phase === 'finished') {
        const scores = gameManager.calculateScores(gameState);
        io.to(roomCode).emit('gameOver', { scores, gameState });
      }
    } catch (error) {
      console.error('Error making move:', error);
      socket.emit('moveError', { message: 'Failed to make move' });
    }
  });

  // Handle game restart
  socket.on('restartGame', (data) => {
    try {
      const { roomCode } = data;
      const game = gameManager.resetGame(roomCode);
      if (game) {
        io.to(roomCode).emit('gameRestarted', { gameState: game });
      }
    } catch (error) {
      console.error('Error restarting game:', error);
    }
  });

  // Get room status
  socket.on('getRoomStatus', (data) => {
    try {
      const { roomCode } = data;
      const roomData = roomManager.getRoomData(roomCode);
      
      if (roomData) {
        socket.emit('roomStatus', { roomData });
      } else {
        socket.emit('roomError', { message: 'Room not found' });
      }
    } catch (error) {
      console.error('Error getting room status:', error);
      socket.emit('roomError', { message: 'Failed to get room status' });
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`❌ User disconnected: ${socket.id}`);
    
    // Remove player from any room they were in
    const roomCode = roomManager.getPlayerRoom(socket.id);
    if (roomCode) {
      const playerName = roomManager.getPlayerName(socket.id);
      roomManager.leaveRoom(roomCode, socket.id);
      
      // Notify other players
      const roomData = roomManager.getRoomData(roomCode);
      if (roomData && roomData.players.length > 0) {
        io.to(roomCode).emit('playerLeft', { 
          roomData, 
          message: `${playerName} left the game` 
        });
      }
    }
  });
});

// Error handling
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Black Hole server running on port ${PORT}`);
  console.log(`🌍 Environment: ${NODE_ENV}`);
  console.log(`🕳️ Ready for multiplayer games!`);
  console.log(`📡 Health check: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});