import { useState } from 'react'
import { Toaster } from 'react-hot-toast'
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
      <Toaster 
        position="top-center"
        toastOptions={{
          style: {
            background: '#040404',
            color: '#fff',
            border: '1px solid #00c896',
            boxShadow: '0 4px 6px -1px rgba(0, 200, 150, 0.2)'
          }
        }}
      />
      <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none bg-[#000000]">
        <Radar
          speed={0.08}
          scale={0.9}
          ringCount={5}
          spokeCount={7}
          ringThickness={0.05}
          spokeThickness={0.01}
          sweepSpeed={1.4}
          sweepWidth={2}
          sweepLobes={1}
          color="#00c896"
          backgroundColor="#000000"
          falloff={1}
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
