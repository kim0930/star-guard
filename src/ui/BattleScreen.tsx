import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { worlds } from '../content/levels'
import { starRules, isCorrect, type QuizResult } from '../economy/stars'
import { BattleController } from '../game/BattleController'
import { PhaserGame } from '../game/PhaserGame'
import { QuizSession } from '../quiz/session'
import type { WorldId } from '../quiz/skills'
import type { Question } from '../quiz/types'
import { recordLevel, updateSave, useSave } from '../save'
import {
  itemDefs,
  itemOrder,
  maxTowerLevel,
  petDefs,
  petShop,
  towerDefs,
  towerOrder,
  towerStats,
  upgradeCost,
  type ItemKind,
  type PetKind,
} from '../sim/data'
import type { LevelDef } from '../sim/engine'
import { ItemIcon, PetIcon, StarIcon, TowerIcon } from './icons'
import { QuizCard } from './QuizCard'

type Overlay =
  | { kind: 'quiz'; q: Question; n: number }
  | { kind: 'slot'; slot: number }
  | { kind: 'pets' }
  | { kind: 'items' }
  | { kind: 'monster'; enemy: number; q: Question }
  | { kind: 'boss'; enemy: number; q: Question; round: number }
  | { kind: 'pause' }

type Props = {
  level: LevelDef
  nextLevel?: LevelDef
  onExit: (to: 'map' | 'retry' | 'next') => void
}

export function BattleScreen({ level, nextLevel, onExit }: Props) {
  const world = worlds[level.worldId as WorldId]
  const controller = useMemo(() => new BattleController(level), [level])
  const session = useMemo(() => new QuizSession(world.id), [world.id])
  const hud = useSyncExternalStore(controller.subscribeHud, controller.getHud)
  const save = useSave()
  const [overlay, setOverlay] = useState<Overlay | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [streak, setStreak] = useState(0)
  const recorded = useRef(false)
  const toastTimer = useRef<number | undefined>(undefined)

  const say = (text: string) => {
    setToast(text)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 2200)
  }

  useEffect(() => () => window.clearTimeout(toastTimer.current), [])

  useEffect(() => {
    controller.setPause('overlay', overlay !== null)
  }, [controller, overlay])

  useEffect(() => {
    if (import.meta.env.DEV) (window as unknown as { battle?: BattleController }).battle = controller
  }, [controller])

  useEffect(() => {
    return controller.onRequest((r) => {
      if (r.type === 'slot') setOverlay({ kind: 'slot', slot: r.slot })
      else if (r.type === 'quizMonster') setOverlay({ kind: 'monster', enemy: r.enemy, q: session.next() })
      else if (r.type === 'boss') setOverlay({ kind: 'boss', enemy: r.enemy, q: session.next(), round: 0 })
      else if (r.type === 'petPlaced') say(r.ok ? 'Pet placed!' : 'Tap right on the path to place your pet.')
    })
  }, [controller, session])

  const over = hud.phase === 'won' || hud.phase === 'lost'
  useEffect(() => {
    if (!over || recorded.current) return
    recorded.current = true
    controller.beginPlacing(null)
    if (hud.phase === 'won') recordLevel(level.id, hud.levelStars, hud.score)
  }, [over, hud.phase, hud.levelStars, hud.score, controller, level.id])

  const close = () => setOverlay(null)
  const quizCount = useRef(0)
  const openQuiz = () => setOverlay({ kind: 'quiz', q: session.next(), n: ++quizCount.current })

  const shopResult = (q: Question) => (result: QuizResult) => {
    const reward = session.answer(q, result)
    controller.earn(reward.stars)
    setStreak(reward.streak)
    if (result === 'revealed') return `Now you know! +${reward.stars} ★`
    return reward.bonus ? `+${reward.stars} ★  Streak bonus!` : `+${reward.stars} ★`
  }

  const monsterResult = (o: Extract<Overlay, { kind: 'monster' }>) => (result: QuizResult) => {
    session.answer(o.q, result, false)
    if (isCorrect(result)) {
      controller.answerQuizMonster(o.enemy, true)
      controller.earn(starRules.quizMonster)
      return `The Quizzer joined your team! +${starRules.quizMonster} ★`
    }
    controller.answerQuizMonster(o.enemy, false)
    return 'The Quizzer is frozen for a moment. Try again soon!'
  }

  const bossResult = (o: Extract<Overlay, { kind: 'boss' }>) => (result: QuizResult) => {
    session.answer(o.q, result, false)
    if (isCorrect(result)) {
      controller.answerBoss(o.enemy)
      controller.earn(starRules.bossHit)
      return controller.bossAlive(o.enemy) ? `Big hit! +${starRules.bossHit} ★` : `Big Brain is defeated! +${starRules.bossHit} ★`
    }
    return 'Big Brain blocked that one!'
  }

  const endBoss = (enemy: number) => {
    controller.endBossQuiz(enemy)
    close()
  }

  const tower = overlay?.kind === 'slot' ? controller.state.towers.find((t) => t.slot === overlay.slot) : undefined
  const coach = coachLine(hud, level.index === 0 && level.worldId === 'meadow')

  return (
    <div className="battle">
      <div className="battle-stage" style={{ background: world.css }}>
        <PhaserGame controller={controller} world={world} />
        {coach && !overlay && !over && <div className="coach">{coach}</div>}
        {hud.placing && (
          <div className="placing-bar">
            <PetIcon kind={hud.placing} size={36} />
            <span>Tap the glowing path to place your {petDefs[hud.placing].name}.</span>
            <button onClick={() => controller.beginPlacing(null)}>Cancel</button>
          </div>
        )}
        {toast && <div className="toast">{toast}</div>}
      </div>

      <aside className="sidebar">
        <div className="side-top">
          <div className="stat stars" aria-label={`${hud.stars} stars`}>
            <StarIcon size={30} />
            <b>{hud.stars}</b>
          </div>
          <div className="stat hearts" aria-label={`${hud.castleHp} castle hearts`}>
            <span aria-hidden>❤️</span>
            <b>
              {hud.castleHp}
              <small>/{hud.castleMax}</small>
            </b>
          </div>
          <div className="stat wave">
            Wave <b>{Math.max(1, hud.wave)}</b>/{hud.waves}
          </div>
          {streak > 0 && <div className="streak">🔥 {streak} in a row</div>}
        </div>
        <button className="big quiz-btn" onClick={openQuiz} disabled={over}>
          <span className="q-mark">?</span>
          <span>
            Quiz
            <small>
              +{starRules.correct} <StarIcon size={14} />
            </small>
          </span>
        </button>
        {hud.phase === 'prep' ? (
          <button className="big go-btn" onClick={() => controller.startWave()}>
            ▶ {hud.wave === 0 ? 'Start' : 'Next wave'}
          </button>
        ) : (
          <button className="big speed-btn" onClick={() => controller.toggleSpeed()} disabled={over}>
            {hud.speed === 1 ? '▶ 1x' : '⏩ 2x'}
          </button>
        )}
        <div className="side-row">
          <button onClick={() => setOverlay({ kind: 'pets' })} disabled={over}>
            <PetIcon kind="frog" size={30} />
            Pets
          </button>
          <button onClick={() => setOverlay({ kind: 'items' })} disabled={over}>
            <ItemIcon kind="freeze" size={30} />
            Items
          </button>
        </div>
        <button className="pause-btn" onClick={() => setOverlay({ kind: 'pause' })} aria-label="Pause">
          ❚❚ Pause
        </button>
      </aside>

      {overlay && (
        <div className="overlay" onClick={(e) => e.target === e.currentTarget && overlay.kind !== 'monster' && overlay.kind !== 'boss' && close()}>
          {overlay.kind === 'quiz' && (
            <QuizCard key={overlay.n} question={overlay.q} title="Earn stars!" onResult={shopResult(overlay.q)}>
              {(done) =>
                done ? (
                  <div className="quiz-actions">
                    <button className="primary" onClick={openQuiz}>
                      Another quiz
                    </button>
                    <button onClick={close}>Back to battle</button>
                  </div>
                ) : (
                  <div className="quiz-actions quiet">
                    <button onClick={close}>Back to battle</button>
                  </div>
                )
              }
            </QuizCard>
          )}

          {overlay.kind === 'monster' && (
            <QuizCard key={overlay.q.id} question={overlay.q} title="Quiz Monster!" tone="monster" onResult={monsterResult(overlay)}>
              {(done) =>
                done && (
                  <div className="quiz-actions">
                    <button className="primary" onClick={close}>
                      Back to battle
                    </button>
                  </div>
                )
              }
            </QuizCard>
          )}

          {overlay.kind === 'boss' && (
            <QuizCard
              key={overlay.q.id + overlay.round}
              question={overlay.q}
              title={`Big Brain · Question ${overlay.round + 1} of 3`}
              tone="boss"
              onResult={bossResult(overlay)}
            >
              {(done) =>
                done && (
                  <div className="quiz-actions">
                    {overlay.round < 2 && controller.bossAlive(overlay.enemy) ? (
                      <button className="primary" onClick={() => setOverlay({ ...overlay, round: overlay.round + 1, q: session.next() })}>
                        Next question
                      </button>
                    ) : (
                      <button className="primary" onClick={() => endBoss(overlay.enemy)}>
                        Back to battle
                      </button>
                    )}
                  </div>
                )
              }
            </QuizCard>
          )}

          {overlay.kind === 'slot' && (
            <div className="panel shop">
              {tower ? (
                <>
                  <h2>
                    {towerDefs[tower.kind].name} <span className="lvl">Level {tower.level}</span>
                  </h2>
                  <div className="upgrade">
                    <TowerIcon kind={tower.kind} size={90} />
                    <div>
                      <p>{towerDefs[tower.kind].blurb}</p>
                      {tower.level < maxTowerLevel ? (
                        <>
                          <p className="stat-line">
                            Power {Math.round(towerStats(tower.kind, tower.level).damage)} →{' '}
                            <b>{Math.round(towerStats(tower.kind, tower.level + 1).damage)}</b>
                          </p>
                          <BuyButton
                            cost={upgradeCost(tower.kind, tower.level)}
                            stars={hud.stars}
                            label="Upgrade"
                            onBuy={() => {
                              controller.upgrade(tower.id)
                              close()
                            }}
                            onQuiz={openQuiz}
                          />
                        </>
                      ) : (
                        <p className="stat-line">Max level! ⭐⭐⭐</p>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <h2>Build a tower</h2>
                  <div className="cards">
                    {towerOrder.map((k) => {
                      const def = towerDefs[k]
                      const can = hud.stars >= def.cost
                      return (
                        <button
                          key={k}
                          className={`card${can ? '' : ' locked'}`}
                          onClick={() => {
                            if (!can) return openQuiz()
                            controller.build(overlay.slot, k)
                            close()
                          }}
                        >
                          <TowerIcon kind={k} />
                          <b>{def.name}</b>
                          <small>{def.blurb}</small>
                          <span className="cost">
                            {def.cost} <StarIcon size={16} />
                          </span>
                        </button>
                      )
                    })}
                  </div>
                  {hud.stars < 4 && (
                    <button className="primary wide" onClick={openQuiz}>
                      Need more ★? Do a quiz!
                    </button>
                  )}
                </>
              )}
              <button className="close" onClick={close} aria-label="Close">
                ✕
              </button>
            </div>
          )}

          {overlay.kind === 'pets' && (
            <div className="panel shop">
              <h2>
                Call a pet helper <span className="lvl">{hud.boughtPets}/{hud.maxPets}</span>
              </h2>
              <p className="sub">Pets stand on the path and stop monsters. If one gets tired, it comes back soon.</p>
              <div className="cards">
                {petShop.map((k: PetKind) => {
                  const def = petDefs[k]
                  const can = hud.stars >= def.cost && hud.boughtPets < hud.maxPets
                  return (
                    <button
                      key={k}
                      className={`card${can ? '' : ' locked'}`}
                      onClick={() => {
                        if (hud.boughtPets >= hud.maxPets) return say('You already have 3 pets!')
                        if (!can) return openQuiz()
                        controller.beginPlacing(k)
                        close()
                      }}
                    >
                      <PetIcon kind={k} />
                      <b>{def.name}</b>
                      <small>{def.blurb}</small>
                      <span className="cost">
                        {def.cost} <StarIcon size={16} />
                      </span>
                    </button>
                  )
                })}
              </div>
              <button className="close" onClick={close} aria-label="Close">
                ✕
              </button>
            </div>
          )}

          {overlay.kind === 'items' && (
            <div className="panel shop">
              <h2>Use an item</h2>
              <div className="cards">
                {itemOrder.map((k: ItemKind) => {
                  const def = itemDefs[k]
                  const can = hud.stars >= def.cost
                  return (
                    <button
                      key={k}
                      className={`card${can ? '' : ' locked'}`}
                      onClick={() => {
                        if (!can) return openQuiz()
                        if (k === 'repair' && hud.castleHp >= hud.castleMax) return say('Your castle is already full of hearts!')
                        if (k !== 'repair' && hud.phase !== 'wave') return say('Save this for when monsters are coming!')
                        if (controller.item(k)) {
                          say(`${def.name}!`)
                          close()
                        }
                      }}
                    >
                      <ItemIcon kind={k} />
                      <b>{def.name}</b>
                      <small>{def.blurb}</small>
                      <span className="cost">
                        {def.cost} <StarIcon size={16} />
                      </span>
                    </button>
                  )
                })}
              </div>
              <button className="close" onClick={close} aria-label="Close">
                ✕
              </button>
            </div>
          )}

          {overlay.kind === 'pause' && (
            <div className="panel pause">
              <h2>Paused</h2>
              <button className="primary wide" onClick={close}>
                ▶ Keep playing
              </button>
              <button className="wide" onClick={() => onExit('retry')}>
                ↻ Start level again
              </button>
              <button className="wide" onClick={() => onExit('map')}>
                🗺 Back to map
              </button>
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={save.settings.autoRead}
                  onChange={(e) => updateSave((s) => ({ ...s, settings: { ...s.settings, autoRead: e.target.checked } }))}
                />
                Read quizzes out loud
              </label>
            </div>
          )}
        </div>
      )}

      {over && (
        <div className="overlay">
          <div className={`panel result ${hud.phase}`}>
            {hud.phase === 'won' ? (
              <>
                <h2>You saved the castle!</h2>
                <div className="result-stars">
                  {[1, 2, 3].map((n) => (
                    <StarIcon key={n} size={64} filled={n <= hud.levelStars} />
                  ))}
                </div>
                <p>Score {hud.score}</p>
                <div className="quiz-actions">
                  {nextLevel && (
                    <button className="primary" onClick={() => onExit('next')}>
                      Next level ▶
                    </button>
                  )}
                  <button onClick={() => onExit('retry')}>Play again</button>
                  <button onClick={() => onExit('map')}>Map</button>
                </div>
              </>
            ) : (
              <>
                <h2>Oh no! The monsters got in.</h2>
                <p>Tip: do quizzes between waves to buy more towers and pets.</p>
                <div className="quiz-actions">
                  <button className="primary" onClick={() => onExit('retry')}>
                    Try again
                  </button>
                  <button onClick={() => onExit('map')}>Map</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function BuyButton({ cost, stars, label, onBuy, onQuiz }: { cost: number; stars: number; label: string; onBuy: () => void; onQuiz: () => void }) {
  if (stars >= cost)
    return (
      <button className="primary" onClick={onBuy}>
        {label} · {cost} <StarIcon size={16} />
      </button>
    )
  return (
    <button className="primary" onClick={onQuiz}>
      Need {cost - stars} more ★ · Quiz!
    </button>
  )
}

function coachLine(hud: ReturnType<BattleController['getHud']>, firstLevel: boolean) {
  if (hud.placing) return null
  if (hud.quizReady) return 'A ? monster is here! Tap it for a quiz.'
  if (hud.phase !== 'prep') return null
  if (hud.towers === 0 && hud.stars < towerDefs.pebble.cost) return 'Tap Quiz to earn ★ stars.'
  if (hud.towers === 0) return 'Tap a glowing circle to build a tower.'
  if (firstLevel && hud.wave === 0) return 'Ready? Press Start!'
  return null
}
