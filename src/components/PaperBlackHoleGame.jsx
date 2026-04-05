import { useState, useEffect } from 'react'
import io from 'socket.io-client'

const PaperBlackHoleGame = ({ gameSettings, onBackToLobby }) => {
  // Socket.IO connection
  const [socket, setSocket] = useState(null)
  const [isConnected, setIsConnected] = useState(false)
  
  // Pyramid structure: rows of 1, 2, 3, 4, 5, 6 circles
  const pyramidStructure = [1, 2, 3, 4, 5, 6]
  const totalCircles = pyramidStructure.reduce((sum, count) => sum + count, 0) // 21
  
  const [board, setBoard] = useState(Array(totalCircles).fill(null))
  const [activeRoomCode, setActiveRoomCode] = useState(gameSettings.roomCode)
  const [currentPlayer, setCurrentPlayer] = useState(1)
  const [currentNumber, setCurrentNumber] = useState(1)
  const [gamePhase, setGamePhase] = useState('playing') // playing, finished
  const [blackHolePosition, setBlackHolePosition] = useState(null)
  const [scores, setScores] = useState({ player1: 0, player2: 0 })
  const [winner, setWinner] = useState(null)
  const [moveHistory, setMoveHistory] = useState([])
  const [selectedCircle, setSelectedCircle] = useState(null)
  const [connectionError, setConnectionError] = useState(null)

  // Determine whose turn it is based on mode and creation type
  const myPlayerNumber = gameSettings.type === 'create' ? 1 : 2;
  const isMyTurn = gameSettings.isLocalMultiplayer || currentPlayer === myPlayerNumber;

  // Initialize Socket.IO connection for multiplayer
  useEffect(() => {
    if (gameSettings.mode === 'multiplayer' && !gameSettings.isLocalMultiplayer) {
      // Connect to your Render server for online multiplayer
      const serverUrl = import.meta.env.MODE === 'production' 
        ? 'https://your-server-name.onrender.com'  // Replace with your Render URL
        : 'http://localhost:3002'
      
      const newSocket = io(serverUrl)
      
      newSocket.on('connect', () => {
        console.log('🔗 Connected to server!')
        setIsConnected(true)
        setConnectionError(null)
        setSocket(newSocket)

        // Join or create the room upon connection
        if (gameSettings.type === 'create') {
          newSocket.emit('createRoom', { 
            playerName: gameSettings.playerName 
          })
        } else if (gameSettings.type === 'join') {
          newSocket.emit('joinRoom', { 
            roomCode: gameSettings.roomCode,
            playerName: gameSettings.playerName 
          })
        }
      })

      newSocket.on('disconnect', () => {
        console.log('❌ Disconnected from server')
        setIsConnected(false)
        setConnectionError('Lost connection to server')
      })

      newSocket.on('connect_error', (error) => {
        console.error('Connection error:', error)
        setConnectionError('Failed to connect to server')
        setIsConnected(false)
      })

      // Handle room events
      newSocket.on('roomCreated', (data) => {
        console.log('🏠 Room created:', data)
        // Update game settings with room info
        if (gameSettings.onRoomCreated) {
          gameSettings.onRoomCreated(data)
        }
        
        setActiveRoomCode(data.roomCode)
        
        // Initialize game state if provided
        if (data.gameState) {
          console.log('🎮 Initializing game state:', data.gameState)
          setBoard(data.gameState.board || Array(totalCircles).fill(null))
          setCurrentPlayer(data.gameState.currentPlayer || 1)
          setCurrentNumber(data.gameState.currentNumber || 1)
          setGamePhase('playing')
          setScores(data.gameState.scores || { player1: 0, player2: 0 })
          setMoveHistory(data.gameState.moveHistory || [])
        }
      })

      newSocket.on('roomJoined', (data) => {
        console.log('👤 Room joined:', data)
        setActiveRoomCode(data.roomCode)
      })

      newSocket.on('roomError', (data) => {
        console.error('🚫 Room error:', data)
        setConnectionError(data.message)
      })

      // Handle game events
      newSocket.on('gameStarted', (data) => {
        console.log('🎮 Game started:', data)
        setGamePhase('playing')
        setCurrentPlayer(data.currentPlayer || 1)
        setBlackHolePosition(data.blackHolePosition)
      })

      newSocket.on('moveMade', (data) => {
        console.log('� Move made:', data)
        setBoard(data.board)
        setCurrentPlayer(data.nextPlayer)
        setCurrentNumber(data.nextNumber)
        setScores(data.scores)
        setMoveHistory(data.moveHistory)
      })

      newSocket.on('gameOver', (data) => {
        console.log('🏁 Game over:', data)
        setGamePhase('finished')
        setScores(data.scores)
        
        // Extract the calculated black hole position from the server state
        if (data.gameState && data.gameState.blackHolePosition !== null) {
          setBlackHolePosition(data.gameState.blackHolePosition)
        }
        
        // Determine winner
        if (data.scores.player1 < data.scores.player2) {
          setWinner(1)
        } else if (data.scores.player2 < data.scores.player1) {
          setWinner(2)
        } else {
          setWinner(0) // Tie
        }
      })

      newSocket.on('playerLeft', (data) => {
        console.log('👋 Player left:', data)
        if (data.message) {
          setConnectionError(data.message)
        }
      })

      newSocket.on('moveError', (error) => {
        console.error('❌ Move error:', error)
        setConnectionError(error.message)
      })

      newSocket.on('gameRestarted', (data) => {
        console.log('🔄 Game restarted:', data)
        setBoard(data.gameState.board || Array(totalCircles).fill(null))
        setCurrentPlayer(data.gameState.currentPlayer || 1)
        setCurrentNumber(data.gameState.currentNumber || 1)
        setGamePhase('playing')
        setBlackHolePosition(null)
        setScores(data.gameState.scores || { player1: 0, player2: 0 })
        setMoveHistory(data.gameState.moveHistory || [])
        setWinner(null)
        setSelectedCircle(null)
        setConnectionError(null)
      })

      return () => {
        newSocket.close()
      }
    } else if (gameSettings.mode === 'multiplayer' && gameSettings.isLocalMultiplayer) {
      // Local multiplayer - no Socket.IO needed
      console.log('🎮 Local multiplayer mode')
      setConnectionError(null)
    }
  }, [gameSettings.mode, gameSettings.isLocalMultiplayer])

  // Get row and position for a circle index
  const getCirclePosition = (index) => {
    let currentRow = 0
    let circlesBefore = 0
    
    for (let row = 0; row < pyramidStructure.length; row++) {
      if (index < circlesBefore + pyramidStructure[row]) {
        currentRow = row
        break
      }
      circlesBefore += pyramidStructure[row]
    }
    
    const positionInRow = index - circlesBefore
    return { row: currentRow, position: positionInRow }
  }

  // Get all adjacent circles (including diagonals)
  const getAdjacentCircles = (index) => {
    const { row, position } = getCirclePosition(index)
    const adjacent = []
    
    // Check all possible adjacent positions
    const adjacentPositions = [
      { row: row - 1, position: position - 1 }, // top-left
      { row: row - 1, position: position },     // top-right
      { row: row, position: position - 1 },       // left
      { row: row, position: position + 1 },       // right
      { row: row + 1, position: position },       // bottom-left
      { row: row + 1, position: position + 1 },   // bottom-right
    ]
    
    for (const adj of adjacentPositions) {
      if (adj.row >= 0 && adj.row < pyramidStructure.length &&
          adj.position >= 0 && adj.position < pyramidStructure[adj.row]) {
        
        // Calculate the index of this adjacent circle
        let circlesBefore = 0
        for (let r = 0; r < adj.row; r++) {
          circlesBefore += pyramidStructure[r]
        }
        const adjIndex = circlesBefore + adj.position
        adjacent.push(adjIndex)
      }
    }
    
    return adjacent
  }

  // Handle circle click
  const handleCircleClick = (index) => {
    if (gamePhase !== 'playing' || board[index] !== null || !isMyTurn) return
    
    if (gameSettings.mode === 'multiplayer' && !gameSettings.isLocalMultiplayer && socket && isConnected) {
      // Send move to server for online multiplayer
      socket.emit('makeMove', {
        roomCode: activeRoomCode,
        move: {
          player: currentPlayer,
          number: currentNumber,
          position: index
        }
      })
    } else if (gameSettings.mode === 'multiplayer' && gameSettings.isLocalMultiplayer) {
      // Local multiplayer - handle both players on same device
      const newBoard = [...board]
      newBoard[index] = {
        player: currentPlayer,
        number: currentNumber
      }
      
      setBoard(newBoard)
      setMoveHistory([...moveHistory, {
        player: currentPlayer,
        number: currentNumber,
        position: index
      }])
      
      // Check if game is finished (all numbers 1-10 placed by both players)
      if (currentNumber === 10 && currentPlayer === 2) {
        finishGame(newBoard)
      } else {
        // Switch player and/or advance number
        if (currentPlayer === 1) {
          setCurrentPlayer(2)
        } else {
          setCurrentPlayer(1)
          setCurrentNumber(currentNumber + 1)
        }
      }
      
      setSelectedCircle(null)
    }
  }

  // Finish the game and calculate scores (for local games)
  const finishGame = (finalBoard) => {
    // Find the black hole (empty circle)
    const emptyIndex = finalBoard.findIndex(cell => cell === null)
    setBlackHolePosition(emptyIndex)
    
    // Get adjacent circles to black hole
    const adjacentIndices = getAdjacentCircles(emptyIndex)
    
    // Calculate scores
    let player1Score = 0
    let player2Score = 0
    
    adjacentIndices.forEach(index => {
      const cell = finalBoard[index]
      if (cell) {
        if (cell.player === 1) {
          player1Score += cell.number
        } else {
          player2Score += cell.number
        }
      }
    })
    
    setScores({ player1: player1Score, player2: player2Score })
    
    // Determine winner (lowest score wins)
    if (player1Score < player2Score) {
      setWinner(1)
    } else if (player2Score < player1Score) {
      setWinner(2)
    } else {
      setWinner(0) // tie
    }
    
    setGamePhase('finished')
  }

  // Reset game
  const resetGame = () => {
    if (gameSettings.mode === 'multiplayer' && !gameSettings.isLocalMultiplayer && socket && isConnected) {
      // Tell server to restart the game state for the whole room
      socket.emit('restartGame', { roomCode: activeRoomCode })
    } else {
      // Local manual restart
      setBoard(Array(totalCircles).fill(null))
      setCurrentPlayer(1)
      setCurrentNumber(1)
      setGamePhase('playing')
      setBlackHolePosition(null)
      setScores({ player1: 0, player2: 0 })
      setWinner(null)
      setMoveHistory([])
      setSelectedCircle(null)
      setConnectionError(null)
    }
  }

  // Render pyramid row
  const renderRow = (rowIndex, circleCount) => {
    const circles = []
    let startIndex = 0
    
    // Calculate start index for this row
    for (let r = 0; r < rowIndex; r++) {
      startIndex += pyramidStructure[r]
    }
    
    for (let i = 0; i < circleCount; i++) {
      const circleIndex = startIndex + i
      const cell = board[circleIndex]
      const isBlackHole = blackHolePosition === circleIndex
      const isAdjacent = blackHolePosition !== null && getAdjacentCircles(blackHolePosition).includes(circleIndex)
      const isSelected = selectedCircle === circleIndex
      
      let circleClass = 'w-12 h-12 rounded-full border-2 flex items-center justify-center font-bold text-sm transition-all '
      let content = ''
      
      if (isBlackHole) {
        circleClass += 'bg-purple-900 border-purple-400 cursor-default '
        content = '🕳️'
      } else if (cell) {
        if (cell.player === 1) {
          circleClass += 'bg-[#00c896] text-[#040404] border-[#00a67c] cursor-default '
        } else {
          circleClass += 'bg-red-600 text-white border-red-400 cursor-default '
        }
        content = cell.number.toString()
      } else if (gamePhase === 'playing' && isMyTurn) {
        circleClass += 'bg-gray-800 border-gray-600 hover:bg-gray-700 hover:border-[#00c896] cursor-pointer '
        if (isSelected) {
          circleClass += 'ring-2 ring-[#00c896] '
        }
      } else {
        circleClass += 'bg-gray-800 border-gray-600 cursor-not-allowed opacity-60 '
      }
      
      if (isAdjacent && gamePhase === 'finished') {
        circleClass += 'ring-2 ring-yellow-400 '
      }
      
      circles.push(
        <div
          key={circleIndex}
          className={circleClass}
          onClick={() => gamePhase === 'playing' && handleCircleClick(circleIndex)}
          onMouseEnter={() => gamePhase === 'playing' && setSelectedCircle(circleIndex)}
          onMouseLeave={() => setSelectedCircle(null)}
        >
          {content}
        </div>
      )
    }
    
    return (
      <div key={`row-${rowIndex}`} className="flex justify-center gap-2 mb-2">
        {circles}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#040404] to-[#1f1f1f] p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={onBackToLobby}
            className="bg-[#1f1f1f] text-[#00c896] px-4 py-2 rounded-lg font-semibold hover:bg-[#00c896] hover:text-[#040404] transition-colors border border-[#00c896]"
          >
            ← Back to Lobby
          </button>
          <h1 className="text-3xl font-bold text-[#00c896]">Black Hole</h1>
          <div className="text-[#00c896]">
            <span className="font-semibold">Player:</span> {gameSettings.playerName}
            {gameSettings.mode === 'multiplayer' && (
              <span className="ml-2 text-sm">
                {isConnected ? '🟢 Online' : '🔴 Offline'}
              </span>
            )}
          </div>
        </div>

        {/* Connection Status */}
        {gameSettings.mode === 'multiplayer' && connectionError && (
          <div className="mb-4 p-3 bg-red-900 border border-red-600 rounded-lg text-red-200">
            ⚠️ {connectionError}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Game Info */}
          <div className="bg-[#1f1f1f] rounded-lg shadow-lg p-4 border border-[#00c896]">
            <h2 className="text-xl font-bold mb-4 text-[#00c896]">Game Info</h2>
            <div className="space-y-3 text-sm text-gray-300">
              {/* Accordion for Instructions */}
              <details className="group">
                <summary className="font-semibold text-white cursor-pointer outline-none list-none flex justify-between items-center hover:text-[#00c896] transition-colors [&::-webkit-details-marker]:hidden border-b border-gray-700 pb-2 mb-3">
                  <span>📖 Instructions</span>
                  <span className="transition-transform duration-300 group-open:rotate-180">▼</span>
                </summary>
                <div className="space-y-3 mb-4 overflow-hidden">
                  <div className="border-l-4 border-[#00c896] pl-3">
                    <p className="font-semibold text-white">Objective:</p>
                    <p>Place numbers 1-10. The final empty circle becomes the Black Hole.</p>
                    <p className="mt-1">Lowest score (numbers touching Black Hole) wins!</p>
                  </div>
                  <div className="border-l-4 border-[#00c896] pl-3">
                    <p className="font-semibold text-white">How to Play:</p>
                    <p>• Players alternate placing numbers 1-10 in sequence</p>
                    <p>• Click any empty circle to place your number</p>
                    <p>• No adjacency requirements</p>
                  </div>
                </div>
              </details>
              {gamePhase === 'playing' && (
                <div className="border-l-4 border-[#00c896] pl-3">
                  <p className="font-semibold text-white">Current Turn:</p>
                  <p>
                    {gameSettings.mode === 'multiplayer' 
                      ? `Player ${currentPlayer} places number ${currentNumber}`
                      : `Player ${currentPlayer} (${currentPlayer === 1 ? gameSettings.playerName : 'Computer'}) places number ${currentNumber}`
                    }
                  </p>
                  {gameSettings.mode === 'multiplayer' && !gameSettings.isLocalMultiplayer && (
                    <p className="text-sm text-gray-400 mt-1">
                      {isConnected ? '🟢 Connected' : '🔴 Waiting for connection...'}
                    </p>
                  )}
                </div>
              )}
              {gameSettings.mode === 'multiplayer' && (
                <div className="border-l-4 border-[#00c896] pl-3">
                  <p className="font-semibold text-white">Room:</p>
                  <p>Code: {activeRoomCode}</p>
                  <p>Mode: {gameSettings.isLocalMultiplayer ? 'Local' : 'Online'} Multiplayer</p>
                  {!gameSettings.isLocalMultiplayer && (
                    <p className="text-sm mt-1">
                      You are: Player {gameSettings.type === 'create' ? '1 (Host)' : '2 (Guest)'}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Game Board */}
          <div className="bg-[#1f1f1f] rounded-lg shadow-lg p-6 border border-[#00c896]">
            <h2 className="text-xl font-bold mb-4 text-[#00c896] text-center">Pyramid Board</h2>
            <div className="flex flex-col items-center justify-center">
              {pyramidStructure.map((count, index) => renderRow(index, count))}
            </div>
            
            {gamePhase === 'finished' && (
              <div className="mt-6 text-center">
                <div className="text-lg font-bold text-[#00c896] mb-2">
                  Black Hole: 🕳️
                </div>
                <div className="text-sm text-gray-400">
                  Yellow rings show circles touching the Black Hole
                </div>
              </div>
            )}
          </div>

          {/* Score & History */}
          <div className="space-y-4">
            {gamePhase === 'finished' && (
              <div className="bg-[#1f1f1f] rounded-lg shadow-lg p-4 border border-[#00c896]">
                <h2 className="text-xl font-bold mb-4 text-[#00c896]">Final Score</h2>
                <div className="space-y-3">
                  <div className="flex justify-between text-white">
                    <span>👤 Player 1 ({gameSettings.playerName}):</span>
                    <span className="font-bold text-[#00c896]">{scores.player1}</span>
                  </div>
                  <div className="flex justify-between text-white">
                    <span>👤 Player 2:</span>
                    <span className="font-bold text-red-400">{scores.player2}</span>
                  </div>
                  <div className="border-t border-gray-600 pt-3">
                    <div className="text-center text-lg font-bold">
                      {winner === 1 && '🏆 You Win!'}
                      {winner === 2 && '😔 Player 2 Wins!'}
                      {winner === 0 && '🤝 It\'s a Tie!'}
                    </div>
                  </div>
                </div>
                <button
                  onClick={resetGame}
                  className="w-full mt-4 bg-[#00c896] text-[#040404] py-2 px-4 rounded-lg font-semibold hover:bg-[#00a67c] transition-colors"
                >
                  Play Again
                </button>
              </div>
            )}

            <div className="bg-[#1f1f1f] rounded-lg shadow-lg p-4 border border-[#00c896]">
              <h2 className="text-xl font-bold mb-4 text-[#00c896]">Move History</h2>
              <div className="space-y-1 text-xs text-gray-300 max-h-64 overflow-y-auto">
                {moveHistory.length === 0 ? (
                  <div className="text-gray-500">No moves yet</div>
                ) : (
                  moveHistory.slice(-10).reverse().map((move, index) => (
                    <div key={index} className="flex justify-between">
                      <span>P{move.player}: {move.number}</span>
                      <span className="text-gray-500">Pos {move.position + 1}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-[#1f1f1f] rounded-lg shadow-lg p-4 border border-[#00c896]">
              <h2 className="text-xl font-bold mb-4 text-[#00c896]">Progress</h2>
              <div className="space-y-2">
                <div className="text-white text-sm">
                  Numbers placed: {moveHistory.length}/20
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-[#00c896] h-2 rounded-full transition-all"
                    style={{ width: `${(moveHistory.length / 20) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PaperBlackHoleGame
