import { useEffect, useState } from 'react'
import { getLevel, levels } from './content/levels'
import { updateSave } from './save'
import { BattleScreen } from './ui/BattleScreen'
import { CreditsScreen } from './ui/CreditsScreen'
import { GrownUpScreen } from './ui/GrownUpScreen'
import { MapScreen } from './ui/MapScreen'
import { TitleScreen } from './ui/TitleScreen'

type Screen =
  | { name: 'title' }
  | { name: 'map' }
  | { name: 'battle'; levelId: string; attempt: number }
  | { name: 'grownup' }
  | { name: 'credits'; back: 'title' | 'grownup' }

function usePlayClock() {
  useEffect(() => {
    let pending = 0
    const tick = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return
      pending += 1
      if (pending >= 10) {
        const add = pending
        pending = 0
        updateSave((s) => ({ ...s, playSeconds: s.playSeconds + add }))
      }
    }, 1000)
    return () => {
      window.clearInterval(tick)
      if (pending > 0) updateSave((s) => ({ ...s, playSeconds: s.playSeconds + pending }))
    }
  }, [])
}

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'title' })
  usePlayClock()

  if (screen.name === 'battle') {
    const level = getLevel(screen.levelId)!
    const next = levels[levels.indexOf(level) + 1]
    return (
      <BattleScreen
        key={`${screen.levelId}-${screen.attempt}`}
        level={level}
        nextLevel={next}
        onExit={(to) => {
          if (to === 'map') setScreen({ name: 'map' })
          else if (to === 'retry') setScreen({ ...screen, attempt: screen.attempt + 1 })
          else if (next) setScreen({ name: 'battle', levelId: next.id, attempt: 0 })
        }}
      />
    )
  }
  if (screen.name === 'map')
    return <MapScreen onPick={(levelId) => setScreen({ name: 'battle', levelId, attempt: 0 })} onBack={() => setScreen({ name: 'title' })} />
  if (screen.name === 'grownup')
    return <GrownUpScreen onBack={() => setScreen({ name: 'title' })} onCredits={() => setScreen({ name: 'credits', back: 'grownup' })} />
  if (screen.name === 'credits') {
    const back = screen.back
    return <CreditsScreen onBack={() => setScreen(back === 'title' ? { name: 'title' } : { name: 'grownup' })} />
  }
  return (
    <TitleScreen
      onPlay={() => setScreen({ name: 'map' })}
      onGrownUps={() => setScreen({ name: 'grownup' })}
      onCredits={() => setScreen({ name: 'credits', back: 'title' })}
    />
  )
}
