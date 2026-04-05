import { useState } from 'react'

const Lobby = ({ onStartGame }) => {
  const [activeTab, setActiveTab] = useState('localMultiplayer')
  const [roomCode, setRoomCode] = useState('')
  const [playerName, setPlayerName] = useState('Ronit')

  const handleCreateRoom = () => {
    if (!playerName.trim()) {
      alert('Please enter your name')
      return
    }
    const newRoomCode = Math.random().toString(36).substring(2, 8).toUpperCase()
    onStartGame({ 
      mode: 'multiplayer', 
      type: 'create', 
      roomCode: newRoomCode, 
      playerName,
      isLocalMultiplayer: false 
    })
  }

  const handleJoinRoom = () => {
    if (!playerName.trim()) {
      alert('Please enter your name')
      return
    }
    if (!roomCode.trim()) {
      alert('Please enter a room code')
      return
    }
    onStartGame({ 
      mode: 'multiplayer', 
      type: 'join', 
      roomCode: roomCode.toUpperCase(), 
      playerName,
      isLocalMultiplayer: false 
    })
  }

  const handleLocalMultiplayer = () => {
    if (!playerName.trim()) {
      alert('Please enter your name')
      return
    }
    // For local multiplayer, create a room and auto-join as second player
    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase()
    onStartGame({ 
      mode: 'multiplayer', 
      type: 'local', 
      roomCode: roomCode, 
      playerName: playerName,
      isLocalMultiplayer: true 
    })
  }

  return (
    <div className="min-h-screen bg-transparent flex items-center justify-center p-4">
      <div className="bg-[#00c89602] bg-opacity-10 backdrop-blur-md bg-clip-padding rounded-2xl shadow-2xl p-8 w-full max-w-md border border-[#00c896]/30">
        <h1 className="text-4xl font-bold text-center mb-8 text-[#00c896] flex items-center justify-center gap-3">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 1 }}><path d="M20.5 5a1.5 1.5 0 1 0 0-3a1.5 1.5 0 0 0 0 3m-17 17a1.5 1.5 0 1 0 0-3a1.5 1.5 0 0 0 0 3m17.539-8.938c.569-.135.961-.569.961-1.062s-.392-.927-.962-1.062l-4.517-1.076a5 5 0 0 0-9.042 0l-4.517 1.076C2.392 11.073 2 11.507 2 12s.392.927.962 1.062l4.517 1.076a5 5 0 0 0 9.042 0z"/><path d="M12 14a2 2 0 1 0 0-4a2 2 0 0 0 0 4m3-11.542A10 10 0 0 0 12 2a9.99 9.99 0 0 0-8 4m5 15.542A10 10 0 0 0 12 22a9.99 9.99 0 0 0 8-3.999"/></svg> BlackHole
        </h1>
        
        <div className="mb-6">
          <input
            type="text"
            placeholder="Enter your name"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            className="w-full px-4 py-3 border border-[#00c896] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00c896] bg-[#040404] text-white placeholder-gray-400"
            maxLength={20}
          />
        </div>

        <div className="flex mb-6 bg-[#040404] rounded-lg p-1">
          <button
            onClick={() => setActiveTab('localMultiplayer')}
            className={`flex-1 py-2 px-4 rounded-md transition-all duration-300 ${
              activeTab === 'localMultiplayer'
                ? 'bg-[#00c896] text-[#040404] shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Local 2P
          </button>
          <button
            onClick={() => setActiveTab('multiplayer')}
            className={`flex-1 py-2 px-4 rounded-md transition-all duration-300 ${
              activeTab === 'multiplayer'
                ? 'bg-[#00c896] text-[#040404] shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Online Multiplayer
          </button>
        </div>

        {activeTab === 'localMultiplayer' ? (
          <div className="space-y-4">
            <div className="text-center text-gray-400 mb-4">
              <p>Play with a friend on the same device!</p>
              <p className="text-sm mt-2">👥 Both players take turns on this screen</p>
            </div>
            <button
              onClick={handleLocalMultiplayer}
              className="w-full bg-gradient-to-r from-[#00c896] to-[#00a67c] text-[#040404] py-3 px-6 rounded-lg font-semibold hover:from-[#00a67c] hover:to-[#008566] transition-all duration-300 transform hover:scale-105"
            >
              Start Local Game
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Room Code</label>
                <input
                  type="text"
                  placeholder="Enter room code"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  className="w-full px-4 py-3 border border-[#00c896] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00c896] bg-[#040404] text-white placeholder-gray-400"
                  maxLength={6}
                />
              </div>
              
              <button
                onClick={handleJoinRoom}
                className="w-full bg-[#00c896] text-[#040404] py-3 px-6 rounded-lg font-semibold hover:bg-[#00a67c] transition-all duration-300"
              >
                Join Room
              </button>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-600"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-[#1f1f1f] text-gray-400">OR</span>
                </div>
              </div>
              
              <button
                onClick={handleCreateRoom}
                className="w-full bg-[#00c896] text-[#040404] py-3 px-6 rounded-lg font-semibold hover:bg-[#00a67c] transition-all duration-300"
              >
                Create Room
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Lobby
