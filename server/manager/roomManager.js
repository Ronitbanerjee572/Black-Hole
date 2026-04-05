class RoomManager {
  constructor() {
    this.rooms = new Map(); // roomCode -> roomData
    this.playerRooms = new Map(); // playerId -> roomCode
  }

  generateRoomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  createRoom(playerId, playerName) {
    let roomCode;
    do {
      roomCode = this.generateRoomCode();
    } while (this.rooms.has(roomCode));

    const roomData = {
      code: roomCode,
      players: [
        { id: playerId, name: playerName, number: 1 }
      ],
      maxPlayers: 2,
      createdAt: new Date()
    };

    this.rooms.set(roomCode, roomData);
    this.playerRooms.set(playerId, roomCode);
    
    return roomCode;
  }

  joinRoom(roomCode, playerId, playerName) {
    const room = this.rooms.get(roomCode);
    if (!room || room.players.length >= room.maxPlayers) {
      return false;
    }

    const playerNumber = room.players.length + 1;
    room.players.push({
      id: playerId,
      name: playerName,
      number: playerNumber
    });

    this.playerRooms.set(playerId, roomCode);
    return true;
  }

  leaveRoom(roomCode, playerId) {
    const room = this.rooms.get(roomCode);
    if (!room) return;

    room.players = room.players.filter(p => p.id !== playerId);
    this.playerRooms.delete(playerId);

    // Delete room if empty
    if (room.players.length === 0) {
      this.rooms.delete(roomCode);
    }
  }

  roomExists(roomCode) {
    return this.rooms.has(roomCode);
  }

  isRoomFull(roomCode) {
    const room = this.rooms.get(roomCode);
    return room && room.players.length >= room.maxPlayers;
  }

  getRoomData(roomCode) {
    return this.rooms.get(roomCode);
  }

  getPlayerRoom(playerId) {
    return this.playerRooms.get(playerId);
  }

  getPlayerName(playerId) {
    const roomCode = this.playerRooms.get(playerId);
    if (!roomCode) return null;
    
    const room = this.rooms.get(roomCode);
    if (!room) return null;
    
    const player = room.players.find(p => p.id === playerId);
    return player ? player.name : null;
  }
}

module.exports = RoomManager;