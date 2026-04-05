import { useState } from 'react'
import Lobby from './components/Lobby'
import PaperBlackHoleGame from './components/PaperBlackHoleGame'
import './App.css'

function App() {
  const [currentView, setCurrentView] = useState('lobby')
  const [gameSettings, setGameSettings] = useState(null)

  const handleStartGame = (settings) => {
    setGameSettings(settings)
    setCurrentView('game')
  }

  const handleBackToLobby = () => {
    setCurrentView('lobby')
    setGameSettings(null)
  }

  return (
    <>
      {currentView === 'lobby' ? (
        <Lobby onStartGame={handleStartGame} />
      ) : (
        <PaperBlackHoleGame gameSettings={gameSettings} onBackToLobby={handleBackToLobby} />
      )}
    </>
  )
}

export default App
