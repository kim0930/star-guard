import { maxBoughtPets, type ItemKind, type PetKind, type TowerKind } from '../sim/data'
import {
  addStars,
  applyItem,
  boughtPetCount,
  buildTower,
  createBattle,
  finishBossQuiz,
  hitBoss,
  levelStars,
  placePet,
  quizTarget,
  resolveQuizMonster,
  startWave,
  step,
  takeEvents,
  upgradeTower,
  type BattleState,
  type LevelDef,
  type Phase,
  type SimEvent,
} from '../sim/engine'
import { enemyDefs } from '../sim/data'
import type { Vec } from '../sim/path'

export const simDt = 1 / 30

export type Hud = {
  stars: number
  castleHp: number
  castleMax: number
  wave: number
  waves: number
  phase: Phase
  paused: boolean
  placing: PetKind | null
  speed: 1 | 2
  powerOn: boolean
  boughtPets: number
  maxPets: number
  levelStars: number
  towers: number
  quizReady: boolean
  score: number
}

export type UiRequest =
  | { type: 'slot'; slot: number }
  | { type: 'quizMonster'; enemy: number }
  | { type: 'boss'; enemy: number }
  | { type: 'petPlaced'; ok: boolean }

export class BattleController {
  state: BattleState
  speed: 1 | 2 = 1
  placing: PetKind | null = null
  private pauses = new Set<string>()
  private acc = 0
  private hud: Hud
  private hudListeners = new Set<() => void>()
  private eventListeners = new Set<(e: SimEvent) => void>()
  private requestListeners = new Set<(r: UiRequest) => void>()

  constructor(level: LevelDef) {
    this.state = createBattle(level)
    this.hud = this.makeHud()
  }

  get paused() {
    return this.pauses.size > 0
  }

  setPause(reason: string, on: boolean) {
    if (on) this.pauses.add(reason)
    else this.pauses.delete(reason)
    this.refresh()
  }

  tick(deltaMs: number) {
    if (this.paused || this.placing) return
    this.acc += Math.min(deltaMs, 100) / 1000 * this.speed
    while (this.acc >= simDt) {
      step(this.state, simDt)
      this.acc -= simDt
    }
    this.flush()
  }

  private flush() {
    const events = takeEvents(this.state)
    for (const ev of events) for (const fn of this.eventListeners) fn(ev)
    this.refresh()
  }

  private makeHud(): Hud {
    const s = this.state
    return {
      stars: s.stars,
      castleHp: Math.ceil(s.castleHp),
      castleMax: s.castleMax,
      wave: s.wave,
      waves: s.level.waves.length,
      phase: s.phase,
      paused: this.paused,
      placing: this.placing,
      speed: this.speed,
      powerOn: s.powerUntil > s.time,
      boughtPets: boughtPetCount(s),
      maxPets: maxBoughtPets,
      levelStars: levelStars(s),
      towers: s.towers.length,
      quizReady: s.enemies.some((e) => quizTarget(s, e.id)),
      score: s.score,
    }
  }

  refresh() {
    const next = this.makeHud()
    const prev = this.hud
    const changed = (Object.keys(next) as (keyof Hud)[]).some((k) => next[k] !== prev[k])
    if (!changed) return
    this.hud = next
    for (const fn of this.hudListeners) fn()
  }

  getHud = () => this.hud

  subscribeHud = (fn: () => void) => {
    this.hudListeners.add(fn)
    return () => {
      this.hudListeners.delete(fn)
    }
  }

  onEvent(fn: (e: SimEvent) => void) {
    this.eventListeners.add(fn)
    return () => {
      this.eventListeners.delete(fn)
    }
  }

  onRequest(fn: (r: UiRequest) => void) {
    this.requestListeners.add(fn)
    return () => {
      this.requestListeners.delete(fn)
    }
  }

  private request(r: UiRequest) {
    for (const fn of this.requestListeners) fn(r)
  }

  tapSlot(slot: number) {
    if (this.paused || this.isOver()) return
    this.request({ type: 'slot', slot })
  }

  tapEnemy(enemyId: number) {
    if (this.paused || this.isOver()) return false
    const e = quizTarget(this.state, enemyId)
    if (!e) return false
    this.request({ type: enemyDefs[e.kind].quiz === 'boss' ? 'boss' : 'quizMonster', enemy: e.id })
    return true
  }

  tapPath(point: Vec) {
    if (!this.placing) return
    const ok = placePet(this.state, this.placing, point)
    if (ok) this.placing = null
    this.refresh()
    this.request({ type: 'petPlaced', ok })
  }

  isOver() {
    return this.state.phase === 'won' || this.state.phase === 'lost'
  }

  startWave() {
    const ok = startWave(this.state)
    this.refresh()
    return ok
  }

  toggleSpeed() {
    this.speed = this.speed === 1 ? 2 : 1
    this.refresh()
  }

  earn(amount: number) {
    addStars(this.state, amount)
    this.refresh()
  }

  build(slot: number, kind: TowerKind) {
    const ok = buildTower(this.state, slot, kind)
    this.refresh()
    return ok
  }

  upgrade(towerId: number) {
    const ok = upgradeTower(this.state, towerId)
    this.refresh()
    return ok
  }

  beginPlacing(kind: PetKind | null) {
    this.placing = kind
    this.refresh()
  }

  item(kind: ItemKind) {
    const ok = applyItem(this.state, kind)
    this.refresh()
    return ok
  }

  answerQuizMonster(enemyId: number, correct: boolean) {
    const ok = resolveQuizMonster(this.state, enemyId, correct)
    this.flush()
    return ok
  }

  answerBoss(enemyId: number) {
    const ok = hitBoss(this.state, enemyId)
    this.flush()
    return ok
  }

  endBossQuiz(enemyId: number) {
    finishBossQuiz(this.state, enemyId)
    this.refresh()
  }

  bossAlive(enemyId: number) {
    return this.state.enemies.some((e) => e.id === enemyId && e.alive)
  }
}
