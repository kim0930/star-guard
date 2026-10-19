import { useRef, useState } from 'react'
import { PetIcon, StarIcon, TowerIcon } from './icons'

const holdMs = 1500

export function TitleScreen({ onPlay, onGrownUps, onCredits }: { onPlay: () => void; onGrownUps: () => void; onCredits: () => void }) {
  const [holding, setHolding] = useState(false)
  const timer = useRef<number | undefined>(undefined)

  const start = () => {
    setHolding(true)
    timer.current = window.setTimeout(() => {
      setHolding(false)
      onGrownUps()
    }, holdMs)
  }
  const stop = () => {
    setHolding(false)
    window.clearTimeout(timer.current)
  }

  return (
    <div className="title-screen">
      <div className="title-art" aria-hidden>
        <TowerIcon kind="sun" size={96} />
        <PetIcon kind="frog" size={80} />
        <TowerIcon kind="bubble" size={96} />
      </div>
      <h1>
        <StarIcon size={56} /> Star Guard <StarIcon size={56} />
      </h1>
      <p className="tagline">Answer quizzes. Earn stars. Build towers. Save the castle!</p>
      <button className="big play" onClick={onPlay}>
        ▶ Play
      </button>
      <div className="title-links">
        <button
          className={`hold${holding ? ' holding' : ''}`}
          onPointerDown={start}
          onPointerUp={stop}
          onPointerLeave={stop}
          onPointerCancel={stop}
          onContextMenu={(e) => e.preventDefault()}
        >
          <span className="hold-fill" style={{ transitionDuration: holding ? `${holdMs}ms` : '0ms' }} />
          <span className="hold-text">Grown-ups: press and hold</span>
        </button>
        <button className="link" onClick={onCredits}>
          Photo credits
        </button>
      </div>
    </div>
  )
}
