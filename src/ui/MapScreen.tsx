import { levels, levelsOf, worlds } from '../content/levels'
import { worldOrder } from '../quiz/skills'
import { useSave } from '../save'
import { StarIcon } from './icons'

function isUnlocked(levelId: string, done: Record<string, { stars: number }>) {
  const i = levels.findIndex((l) => l.id === levelId)
  return i === 0 || (done[levels[i - 1].id]?.stars ?? 0) > 0
}

export function MapScreen({ onPick, onBack }: { onPick: (levelId: string) => void; onBack: () => void }) {
  const save = useSave()
  const total = Object.values(save.levels).reduce((a, l) => a + l.stars, 0)
  return (
    <div className="map-screen">
      <header>
        <button onClick={onBack}>◀ Home</button>
        <h1>Choose a level</h1>
        <div className="map-total">
          <StarIcon size={26} /> {total}/{levels.length * 3}
        </div>
      </header>
      <div className="worlds">
        {worldOrder.map((id) => {
          const w = worlds[id]
          const list = levelsOf(id)
          const open = isUnlocked(list[0].id, save.levels)
          return (
            <section key={id} className={`world world-${id}${open ? '' : ' locked'}`}>
              <h2>{w.name}</h2>
              <p>{w.blurb}</p>
              <div className="level-path">
                {list.map((l) => {
                  const rec = save.levels[l.id]
                  const unlocked = isUnlocked(l.id, save.levels)
                  return (
                    <button
                      key={l.id}
                      className={`level-dot${l.boss ? ' boss' : ''}${rec?.stars ? ' cleared' : ''}`}
                      disabled={!unlocked}
                      onClick={() => onPick(l.id)}
                      aria-label={`${l.name}${unlocked ? '' : ' (locked)'}`}
                    >
                      <span className="num">{l.boss ? '?' : l.index + 1}</span>
                      <span className="dot-stars">
                        {[1, 2, 3].map((n) => (
                          <StarIcon key={n} size={14} filled={(rec?.stars ?? 0) >= n} />
                        ))}
                      </span>
                      <span className="dot-name">{unlocked ? l.name : '🔒'}</span>
                    </button>
                  )
                })}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
