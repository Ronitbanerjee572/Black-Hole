class GameManager {
  constructor() {
    this.games = new Map(); // roomCode -> gameState
    this.pyramidStructure = [1, 2, 3, 4, 5, 6]; // Black Hole pyramid
  }

  initializeGame(roomData, roomCode) {
    const totalCircles = this.pyramidStructure.reduce((sum, count) => sum + count, 0);
    
    const gameState = {
      roomCode: roomCode,
      players: roomData.players,
      board: Array(totalCircles).fill(null),
      currentPlayer: 1,
      currentNumber: 1,
      phase: 'playing', // playing, finished
      moveHistory: [],
      blackHolePosition: null,
      scores: { player1: 0, player2: 0 }
    };

    this.games.set(roomCode, gameState);
    return gameState;
  }

  validateMove(roomCode, move) {
    const game = this.games.get(roomCode);
    if (!game) {
      return { valid: false, message: 'Game not found' };
    }

    if (game.phase !== 'playing') {
      return { valid: false, message: 'Game is not in playing phase' };
    }

    if (move.player !== game.currentPlayer) {
      return { valid: false, message: 'Not your turn' };
    }

    if (move.number !== game.currentNumber) {
      return { valid: false, message: 'Invalid number' };
    }

    if (move.position < 0 || move.position >= game.board.length) {
      return { valid: false, message: 'Invalid position' };
    }

    if (game.board[move.position] !== null) {
      return { valid: false, message: 'Position already occupied' };
    }

    return { valid: true };
  }

  makeMove(roomCode, move) {
    const game = this.games.get(roomCode);
    
    // Place number
    game.board[move.position] = {
      player: move.player,
      number: move.number
    };

    // Add to move history
    game.moveHistory.push({
      player: move.player,
      number: move.number,
      position: move.position,
      timestamp: new Date()
    });

    // Update turn
    if (game.currentPlayer === 1) {
      game.currentPlayer = 2;
    } else {
      game.currentPlayer = 1;
      game.currentNumber++;
    }

    // Check if game is finished
    if (game.currentNumber > 10 && game.currentPlayer === 1) {
      this.finishGame(roomCode);
    }

    return game;
  }

  finishGame(roomCode) {
    const game = this.games.get(roomCode);
    
    // Find black hole (empty circle)
    const emptyIndex = game.board.findIndex(cell => cell === null);
    game.blackHolePosition = emptyIndex;

    // Calculate scores
    game.scores = this.calculateScores(game);
    game.phase = 'finished';
  }

  getCirclePosition(index) {
    let currentRow = 0;
    let circlesBefore = 0;
    
    for (let row = 0; row < this.pyramidStructure.length; row++) {
      if (index < circlesBefore + this.pyramidStructure[row]) {
        currentRow = row;
        break;
      }
      circlesBefore += this.pyramidStructure[row];
    }
    
    const positionInRow = index - circlesBefore;
    return { row: currentRow, position: positionInRow };
  }

  getAdjacentCircles(index) {
    const { row, position } = this.getCirclePosition(index);
    const adjacent = [];
    
    const adjacentPositions = [
      { row: row - 1, position: position - 1 },
      { row: row - 1, position: position },
      { row: row, position: position - 1 },
      { row: row, position: position + 1 },
      { row: row + 1, position: position },
      { row: row + 1, position: position + 1 },
    ];
    
    for (const adj of adjacentPositions) {
      if (adj.row >= 0 && adj.row < this.pyramidStructure.length &&
          adj.position >= 0 && adj.position < this.pyramidStructure[adj.row]) {
        
        let circlesBefore = 0;
        for (let r = 0; r < adj.row; r++) {
          circlesBefore += this.pyramidStructure[r];
        }
        const adjIndex = circlesBefore + adj.position;
        adjacent.push(adjIndex);
      }
    }
    
    return adjacent;
  }

  calculateScores(gameState) {
    if (gameState.blackHolePosition === null) {
      return { player1: 0, player2: 0 };
    }

    const adjacentIndices = this.getAdjacentCircles(gameState.blackHolePosition);
    
    let player1Score = 0;
    let player2Score = 0;
    
    adjacentIndices.forEach(index => {
      const cell = gameState.board[index];
      if (cell) {
        if (cell.player === 1) {
          player1Score += cell.number;
        } else {
          player2Score += cell.number;
        }
      }
    });
    
    return { player1: player1Score, player2: player2Score };
  }

  getGameState(roomCode) {
    return this.games.get(roomCode);
  }

  resetGame(roomCode) {
    const game = this.games.get(roomCode);
    if (!game) return null;

    game.board = Array(game.board.length).fill(null);
    game.currentPlayer = 1;
    game.currentNumber = 1;
    game.phase = 'playing';
    game.moveHistory = [];
    game.blackHolePosition = null;
    game.scores = { player1: 0, player2: 0 };
    
    return game;
  }
}

module.exports = GameManager;