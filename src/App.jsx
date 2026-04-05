import { useState } from 'react'
import Lobby from './components/Lobby'
import PaperBlackHoleGame from './components/PaperBlackHoleGame'
import Radar from './component/Radar'
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
      <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none bg-[#000000]">
        <Radar
          speed={0.08}
          scale={0.8}
          ringCount={5}
          spokeCount={7}
          ringThickness={0.05}
          spokeThickness={0.01}
          sweepSpeed={1.4}
          sweepWidth={2}
          sweepLobes={1}
          color="#00c896"
          backgroundColor="#000000"
          falloff={2}
          brightness={0.7}
          enableMouseInteraction={false}
          mouseInfluence={0.1}
        />
      </div>
      <div className="relative z-10">
        {currentView === 'lobby' ? (
          <Lobby onStartGame={handleStartGame} />
        ) : (
          <PaperBlackHoleGame gameSettings={gameSettings} onBackToLobby={handleBackToLobby} />
        )}
      </div>
    </>
  )
}

export default App
