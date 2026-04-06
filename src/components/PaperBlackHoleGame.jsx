import { useState, useEffect, useRef } from 'react'
import io from 'socket.io-client'
import toast from 'react-hot-toast'

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
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const [lineCoords, setLineCoords] = useState([])
  const circleRefs = useRef([])
  const boardRef = useRef(null)

  // Determine whose turn it is based on mode and creation type
  const myPlayerNumber = gameSettings.type === 'create' ? 1 : 2;
  const isMyTurn = gameSettings.isLocalMultiplayer || currentPlayer === myPlayerNumber;

  // Initialize Socket.IO connection for multiplayer
  useEffect(() => {
    if (gameSettings.mode === 'multiplayer' && !gameSettings.isLocalMultiplayer) {
      // Connect to server using absolute VITE env var (defaults to localhost)
      const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:3002'

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

  // Draw SVG lines calculating DOM positions
  useEffect(() => {
    if (gamePhase === 'finished' && blackHolePosition !== null && boardRef.current) {
      const boardRect = boardRef.current.getBoundingClientRect()
      const bhRef = circleRefs.current[blackHolePosition]
      if (!bhRef) return
      const bhRect = bhRef.getBoundingClientRect()
      
      const bhX = bhRect.left - boardRect.left + bhRect.width / 2
      const bhY = bhRect.top - boardRect.top + bhRect.height / 2
      
      const newCoords = []
      const adjacentCircles = getAdjacentCircles(blackHolePosition)
      
      adjacentCircles.forEach(index => {
        const el = circleRefs.current[index]
        if (el) {
          const rect = el.getBoundingClientRect()
          const adjX = rect.left - boardRect.left + rect.width / 2
          const adjY = rect.top - boardRect.top + rect.height / 2
          const length = Math.sqrt(Math.pow(adjX - bhX, 2) + Math.pow(adjY - bhY, 2))
          
          newCoords.push({
            x1: bhX,
            y1: bhY,
            x2: adjX,
            y2: adjY,
            length
          })
        }
      })
      setLineCoords(newCoords)
    } else {
      setLineCoords([])
    }
  }, [gamePhase, blackHolePosition, board])

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

      let circleClass = 'w-12 h-12 rounded-full border-2 flex items-center justify-center font-bold text-sm transition-all relative z-10 '
      let content = ''
      let circleStyle = {}

      if (isBlackHole) {
        circleClass += 'bg-[#00c896] border-[#00c896] cursor-default '
        content = <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 1 }}><path d="M20.5 5a1.5 1.5 0 1 0 0-3a1.5 1.5 0 0 0 0 3m-17 17a1.5 1.5 0 1 0 0-3a1.5 1.5 0 0 0 0 3m17.539-8.938c.569-.135.961-.569.961-1.062s-.392-.927-.962-1.062l-4.517-1.076a5 5 0 0 0-9.042 0l-4.517 1.076C2.392 11.073 2 11.507 2 12s.392.927.962 1.062l4.517 1.076a5 5 0 0 0 9.042 0z" /><path d="M12 14a2 2 0 1 0 0-4a2 2 0 0 0 0 4m3-11.542A10 10 0 0 0 12 2a9.99 9.99 0 0 0-8 4m5 15.542A10 10 0 0 0 12 22a9.99 9.99 0 0 0 8-3.999" /></svg>
      } else if (cell) {
        if (cell.player === 1) {
          circleClass += 'bg-[#00c896] text-[#040404] border-[#00a67c] cursor-default '
        } else {
          circleClass += 'bg-red-600 text-white border-red-400 cursor-default '
        }
        content = cell.number.toString()
      } else if (gamePhase === 'playing' && isMyTurn) {
        circleClass += 'bg-[#00c896]/5 border-[#00c896]/30 hover:border-[#00c896] cursor-pointer '
        if (isSelected) {
          circleClass += 'ring-2 ring-[#00c896] '
        }
      } else {
        circleClass += 'bg-[#00c896]/5 border-[#00c896]/20 cursor-not-allowed opacity-60 '
      }

      // Animate background and text precisely when the corresponding laser touches it
      if (isAdjacent && gamePhase === 'finished') {
        const orderIndex = getAdjacentCircles(blackHolePosition).indexOf(circleIndex)
        // SVG laser takes 0.8s duration, delayed by index * 0.15s
        const DelaySync = 0.8 + (orderIndex * 0.15)
        circleStyle = {
          animation: `absorb-node 0.4s ease-out forwards ${DelaySync}s`
        }
      }

      circles.push(
        <div
          key={circleIndex}
          ref={(el) => circleRefs.current[circleIndex] = el}
          className={circleClass}
          style={circleStyle}
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
    <div className="min-h-screen bg-transparent p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={onBackToLobby}
            className="bg-[#00c896]/5 text-[#00c896] px-4 py-2 rounded-lg font-semibold hover:bg-[#00c896] hover:text-[#040404] transition-all duration-300 border border-[#00c896]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" fill="currentColor" className="transition-colors duration-300" height="14px" width="14px" version="1.1" id="Capa_1" viewBox="0 0 26.676 26.676" xml:space="preserve">
              <g>
                <path d="M26.105,21.891c-0.229,0-0.439-0.131-0.529-0.346l0,0c-0.066-0.156-1.716-3.857-7.885-4.59   c-1.285-0.156-2.824-0.236-4.693-0.25v4.613c0,0.213-0.115,0.406-0.304,0.508c-0.188,0.098-0.413,0.084-0.588-0.033L0.254,13.815   C0.094,13.708,0,13.528,0,13.339c0-0.191,0.094-0.365,0.254-0.477l11.857-7.979c0.175-0.121,0.398-0.129,0.588-0.029   c0.19,0.102,0.303,0.295,0.303,0.502v4.293c2.578,0.336,13.674,2.33,13.674,11.674c0,0.271-0.191,0.508-0.459,0.562   C26.18,21.891,26.141,21.891,26.105,21.891z" />
              </g>
            </svg>
          </button>
          <h1 className="text-3xl font-bold text-[#00c896] flex">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 1 }}><path d="M20.5 5a1.5 1.5 0 1 0 0-3a1.5 1.5 0 0 0 0 3m-17 17a1.5 1.5 0 1 0 0-3a1.5 1.5 0 0 0 0 3m17.539-8.938c.569-.135.961-.569.961-1.062s-.392-.927-.962-1.062l-4.517-1.076a5 5 0 0 0-9.042 0l-4.517 1.076C2.392 11.073 2 11.507 2 12s.392.927.962 1.062l4.517 1.076a5 5 0 0 0 9.042 0z" /><path d="M12 14a2 2 0 1 0 0-4a2 2 0 0 0 0 4m3-11.542A10 10 0 0 0 12 2a9.99 9.99 0 0 0-8 4m5 15.542A10 10 0 0 0 12 22a9.99 9.99 0 0 0 8-3.999" /></svg> BlackHole
          </h1>

          <button onClick={() => setIsMenuOpen(true)} className="p-2 rounded-lg bg-[#00c896]/10 text-[#00c896] hover:bg-[#00c896] hover:text-[#040404] transition-all duration-300 border border-[#00c896]/30">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
          </button>
        </div>

        {/* Connection Status */}
        {gameSettings.mode === 'multiplayer' && connectionError && (
          <div className="mb-4 p-3 bg-red-900 border border-red-600 rounded-lg text-red-200">
            ⚠️ {connectionError}
          </div>
        )}

        {/* Sidebar Overlay */}
        {isMenuOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={() => setIsMenuOpen(false)}></div>
        )}

        {/* Slide Menu Drawer */}
        <div className={`fixed top-0 right-0 h-full w-80 sm:w-96 bg-[#040404]/90 backdrop-blur-md border-l border-[#00c896]/30 shadow-2xl z-50 transform transition-transform duration-300 overflow-y-auto p-6 ${isMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-[#00c896]">Game Info</h2>
            <button onClick={() => setIsMenuOpen(false)} className="text-gray-400 hover:text-white transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
          
          <div className="space-y-4 text-sm text-gray-300">
            <div className="text-[#00c896] p-3 rounded-lg bg-[#00c896]/5 border border-[#00c896]/20">
              <span className="font-semibold">Player:</span> {gameSettings.playerName}
              {gameSettings.mode === 'multiplayer' && (
                <span className="ml-2 text-sm">
                  {isConnected ? '🟢Online' : '🔴Offline'}
                </span>
              )}
            </div>

            {gamePhase === 'playing' && (
              <div className="border-l-4 border-[#00c896] pl-3 py-1">
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
              <div className="border-l-4 border-[#00c896] pl-3 py-1">
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

            <details className="group border border-[#00c896]/40 rounded-lg bg-[#00c896]/5 overflow-hidden transition-all duration-500 open:bg-[#00c896]/10 mt-5 shadow-inner" open>
              <summary className="font-semibold text-white cursor-pointer outline-none list-none flex justify-between items-center hover:text-[#00c896] transition-colors duration-300 [&::-webkit-details-marker]:hidden p-3 bg-black/30">
                <span className="flex items-center gap-2">Instructions</span>
                <span className="transition-transform duration-300 group-open:rotate-180 text-[#00c896]">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16px" height="16px" viewBox="0 0 24 24" fill="#00c896">
                    <path fillRule="evenodd" clipRule="evenodd" d="M12.7071 14.7071C12.3166 15.0976 11.6834 15.0976 11.2929 14.7071L6.29289 9.70711C5.90237 9.31658 5.90237 8.68342 6.29289 8.29289C6.68342 7.90237 7.31658 7.90237 7.70711 8.29289L12 12.5858L16.2929 8.29289C16.6834 7.90237 17.3166 7.90237 17.7071 8.29289C18.0976 8.68342 18.0976 9.31658 17.7071 9.70711L12.7071 14.7071Z" fill="#00c896" />
                  </svg>
                </span>
              </summary>
              <div className="space-y-3 p-4 border-t border-[#00c896]/20 opacity-0 group-open:opacity-100 group-open:animate-in group-open:slide-in-from-top-2 group-open:fade-in duration-300">
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
          </div>
        </div>

        <div className="max-w-xl mx-auto w-full items-start">
          {/* Game Board */}
          <div className="bg-[#00c89602] bg-opacity-10 backdrop-blur-md bg-clip-padding rounded-xl shadow-2xl p-6 border border-[#00c896]/30 transition-all relative">

            <h2 className="text-xl font-bold mb-4 text-[#00c896] text-center">Pyramid Board</h2>

            <div className="flex flex-col items-center justify-center relative w-full h-full" ref={boardRef}>
              {pyramidStructure.map((count, index) => renderRow(index, count))}
              {lineCoords.length > 0 && (
                <svg className="absolute inset-0 pointer-events-none w-full h-full z-0">
                  {lineCoords.map((coord, i) => (
                    <line 
                      key={i} 
                      x1={coord.x1} y1={coord.y1} x2={coord.x2} y2={coord.y2} 
                      stroke="#00c896" 
                      strokeWidth="4" 
                      strokeLinecap="round" 
                      style={{ 
                        filter: 'drop-shadow(0 0 8px #00c896)',
                        strokeDasharray: coord.length,
                        strokeDashoffset: coord.length,
                        animation: `draw-line 0.8s ease-out forwards ${i * 0.15}s`
                      }} 
                    />
                  ))}
                </svg>
              )}
            </div>

            {gamePhase === 'finished' && (
              <div className="mt-6 text-center">
                <div className="text-lg font-bold text-[#00c896] mb-2 flex items-center justify-center gap-2">
                  Black Hole: <svg className="text-[#00c896]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 1 }}><path d="M20.5 5a1.5 1.5 0 1 0 0-3a1.5 1.5 0 0 0 0 3m-17 17a1.5 1.5 0 1 0 0-3a1.5 1.5 0 0 0 0 3m17.539-8.938c.569-.135.961-.569.961-1.062s-.392-.927-.962-1.062l-4.517-1.076a5 5 0 0 0-9.042 0l-4.517 1.076C2.392 11.073 2 11.507 2 12s.392.927.962 1.062l4.517 1.076a5 5 0 0 0 9.042 0z" /><path d="M12 14a2 2 0 1 0 0-4a2 2 0 0 0 0 4m3-11.542A10 10 0 0 0 12 2a9.99 9.99 0 0 0-8 4m5 15.542A10 10 0 0 0 12 22a9.99 9.99 0 0 0 8-3.999" /></svg>
                </div>
                <div className="text-sm text-gray-400">
                  Glowing lines indicate circles falling into the Black Hole
                </div>
              </div>
            )}

            {gamePhase === 'finished' && (
              <div className="bg-[#00c89602] bg-opacity-10 backdrop-blur-md bg-clip-padding rounded-xl shadow-2xl p-4 mb-5 mt-5 border border-[#00c896]/30">
                <h2 className="text-xl font-bold mb-4 text-[#00c896]">Final Score</h2>
                <div className="space-y-3">
                  <div className="flex justify-between text-white">
                    <span>👤 Player 1 {gameSettings.type !== 'join' ? `(${gameSettings.playerName})` : ''}:</span>
                    <span className="font-bold text-[#00c896]">{scores.player1}</span>
                  </div>
                  <div className="flex justify-between text-white">
                    <span>👤 Player 2 {gameSettings.type === 'join' ? `(${gameSettings.playerName})` : ''}:</span>
                    <span className="font-bold text-red-400">{scores.player2}</span>
                  </div>
                  <div className="border-t border-gray-600 pt-3">
                    <div className="text-center text-white text-lg font-bold">
                      {winner === 1 && (gameSettings.type === 'join' ? '😔 Player 1 Wins!' : `🏆 ${gameSettings.playerName} Wins!`)}
                      {winner === 2 && (gameSettings.type === 'join' ? `🏆 ${gameSettings.playerName} Wins!` : '😔 Player 2 Wins!')}
                      {winner === 0 && '🤝 It\'s a Tie!'}
                    </div>
                  </div>
                </div>
                <button
                  onClick={resetGame}
                  className="w-full mt-4 bg-[#00c896] text-[#040404] py-2 px-4 rounded-lg font-semibold hover:bg-[#00a67c] transition-all duration-300"
                >
                  Play Again
                </button>
              </div>
            )}
{/* bg-[#00c896]/10 shadow-lg border border-[#00c896]/30 px-3 py-1.5 rounded-full */}
            <div className="text-white text-sm mt-10 mb-2 flex items-center gap-1 ">
              <span>Moves:</span>
              <div className="inline-flex h-[1em] overflow-hidden leading-none items-start font-bold text-[#00c896] min-w-[1.2rem] justify-center">
                <div 
                  className="transition-transform duration-500 ease-[cubic-bezier(0.175,0.885,0.32,1.275)] flex flex-col"
                  style={{ transform: `translateY(-${moveHistory.length * 1}em)` }}
                >
                  {Array.from({ length: 21 }, (_, i) => (
                    <span key={i} className="h-[1em] flex-shrink-0 flex items-center justify-center">
                      {i}
                    </span>
                  ))}
                </div>
              </div>
              <span className="text-gray-400">/ 20</span>
            </div>
            {gameSettings.mode === 'multiplayer' && (
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(activeRoomCode)
                  toast.success('Room code copied!')
                }}
                title="Copy Room Code"
                className="absolute bottom-10 right-6 bg-[#00c896]/10 shadow-lg border border-[#00c896]/30 px-3 py-1.5 rounded-full text-[#00c896] text-xs font-mono tracking-wider flex items-center gap-2 transition-all hover:bg-[#00c896]/20 hover:scale-105 cursor-pointer group"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#00c896] animate-pulse"></span>
                ROOM: {activeRoomCode}
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-1 opacity-70 group-hover:opacity-100 transition-opacity"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
              </button>
            )}
            <div className="w-full bg-[#00c896]/5 rounded-full h-2.4 border border-[#00c896]/30">
              <div className="bg-[#00c896]  h-2 rounded-full transition-all" style={{ width: `${(moveHistory.length / 20) * 100}%` }} />
            </div>

          </div>

          {/* Score & History */}
          {/* <div className="space-y-4">
            {gamePhase === 'finished' && (
              <div className="bg-[#00c89602] bg-opacity-10 backdrop-blur-md bg-clip-padding rounded-xl shadow-2xl p-4 border border-[#00c896]/30">
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
                    <div className="text-center text-white text-lg font-bold">
                      {winner === 1 && '🏆 You Win!'}
                      {winner === 2 && '😔 Player 2 Wins!'}
                      {winner === 0 && '🤝 It\'s a Tie!'}
                    </div>
                  </div>
                </div>
                <button
                  onClick={resetGame}
                  className="w-full mt-4 bg-[#00c896] text-[#040404] py-2 px-4 rounded-lg font-semibold hover:bg-[#00a67c] transition-all duration-300"
                >
                  Play Again
                </button>
              </div>
            )}

            <div className="bg-[#00c89602] bg-opacity-10 backdrop-blur-md bg-clip-padding rounded-xl shadow-2xl p-4 border border-[#00c896]/30">
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

            <div className="bg-[#00c89602] bg-opacity-10 backdrop-blur-md bg-clip-padding rounded-xl shadow-2xl p-4 border border-[#00c896]/30">
              <h2 className="text-xl font-bold mb-4 text-[#00c896]">Progress</h2>
              <div className="space-y-2">
                <div className="text-white text-sm">
                  Numbers placed: {moveHistory.length}/20
                </div>
                <div className="w-full bg-gray-900 rounded-full h-2">
                  <div 
                    className="bg-[#00c896] h-2 rounded-full transition-all"
                    style={{ width: `${(moveHistory.length / 20) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div> */}
        </div>
      </div>
    </div>
  )
}

export default PaperBlackHoleGame
