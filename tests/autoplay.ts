import { towerDefs, upgradeCost, type TowerKind } from '../src/sim/data'
import {
  addStars,
  buildTower,
  createBattle,
  hitBoss,
  resolveQuizMonster,
  startWave,
  step,
  takeEvents,
  upgradeTower,
  type BattleState,
  type LevelDef,
} from '../src/sim/engine'

export type AutoplayOptions = {
  starsPerWave: number
  answerQuizMonsters: boolean
  build: boolean
}

const plan: TowerKind[] = ['pebble', 'bubble', 'sun', 'pebble', 'magnet', 'ice', 'sun', 'pebble', 'bubble', 'sun']

function spendAll(s: BattleState) {
  for (let guard = 0; guard < 30; guard++) {
    const next = plan[s.towers.length]
    if (next && s.slots.length > s.towers.length && s.stars >= towerDefs[next].cost) {
      buildTower(s, s.towers.length, next)
      continue
    }
    const upgradable = s.towers
      .filter((t) => t.level < 3)
      .sort((a, b) => upgradeCost(a.kind, a.level) - upgradeCost(b.kind, b.level))[0]
    if (upgradable && s.stars >= upgradeCost(upgradable.kind, upgradable.level) && (!next || s.towers.length >= 6)) {
      upgradeTower(s, upgradable.id)
      continue
    }
    break
  }
}

export function autoplay(level: LevelDef, opts: AutoplayOptions) {
  const s = createBattle(level)
  const pendingQuiz: { id: number; at: number; boss: boolean }[] = []
  const dt = 1 / 30
  let guard = 0
  while (s.phase !== 'won' && s.phase !== 'lost' && guard < 30 * 60 * 40) {
    guard++
    if (s.phase === 'prep') {
      addStars(s, opts.starsPerWave)
      if (opts.build) spendAll(s)
      startWave(s)
    }
    step(s, dt)
    for (const ev of takeEvents(s)) {
      if (ev.type === 'quizSpawn' && opts.answerQuizMonsters) pendingQuiz.push({ id: ev.enemy, at: s.time + 2, boss: ev.boss })
    }
    for (const q of pendingQuiz.splice(0)) {
      if (q.at > s.time) {
        pendingQuiz.push(q)
        continue
      }
      if (q.boss) {
        for (let i = 0; i < 2; i++) {
          if (hitBoss(s, q.id)) addStars(s, 2)
        }
      } else if (resolveQuizMonster(s, q.id, true)) {
        addStars(s, 3)
      }
    }
    if (opts.build && s.phase === 'wave') spendAll(s)
  }
  return s
}
