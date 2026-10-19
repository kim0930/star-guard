import {
  enemyDefs,
  itemDefs,
  maxBoughtPets,
  maxTowerLevel,
  petDefs,
  petRespawn,
  towerDefs,
  towerStats,
  upgradeCost,
  type EnemyKind,
  type ItemKind,
  type PetKind,
  type TowerKind,
} from './data'
import { makePath, nearestOnPath, pointAt, type Path, type Vec } from './path'
import { makeSlots } from './slots'

export type SpawnGroup = { kind: EnemyKind; count: number; gap: number; delay: number }
export type WaveDef = { groups: SpawnGroup[] }

export type LevelDef = {
  id: string
  worldId: string
  index: number
  name: string
  points: Vec[]
  waves: WaveDef[]
  hpScale: number
  castleHp: number
  boss: boolean
}

export type Phase = 'prep' | 'wave' | 'won' | 'lost'

export type Enemy = {
  id: number
  kind: EnemyKind
  d: number
  hp: number
  maxHp: number
  speed: number
  slowUntil: number
  slowFactor: number
  frozenUntil: number
  blockerId: number | null
  alive: boolean
  quizReadyAt: number
  bossHits: number
}

export type Tower = {
  id: number
  slot: number
  kind: TowerKind
  level: number
  cooldown: number
  beamTarget: number | null
}

export type Pet = {
  id: number
  kind: PetKind
  d: number
  hp: number
  maxHp: number
  alive: boolean
  respawnAt: number
  blocking: number[]
  bought: boolean
}

export type SimEvent =
  | { type: 'shot'; tower: number; enemy: number; kind: TowerKind }
  | { type: 'freeze'; x: number; y: number; radius: number }
  | { type: 'kill'; enemy: number; x: number; y: number; kind: EnemyKind }
  | { type: 'leak'; amount: number }
  | { type: 'waveCleared'; wave: number }
  | { type: 'won' }
  | { type: 'lost' }
  | { type: 'petDown'; pet: number }
  | { type: 'quizSpawn'; enemy: number; boss: boolean }

export type BattleState = {
  level: LevelDef
  path: Path
  slots: Vec[]
  time: number
  phase: Phase
  wave: number
  queue: { at: number; kind: EnemyKind }[]
  enemies: Enemy[]
  towers: Tower[]
  pets: Pet[]
  castleHp: number
  castleMax: number
  stars: number
  starsEarned: number
  starsSpent: number
  powerUntil: number
  score: number
  nextId: number
  events: SimEvent[]
}

export const blockGap = 14
export const quizShield = 0.35

export function createBattle(level: LevelDef): BattleState {
  const path = makePath(level.points)
  const castle = level.points[level.points.length - 1]
  return {
    level,
    path,
    slots: makeSlots(path, castle),
    time: 0,
    phase: 'prep',
    wave: 0,
    queue: [],
    enemies: [],
    towers: [],
    pets: [],
    castleHp: level.castleHp,
    castleMax: level.castleHp,
    stars: 0,
    starsEarned: 0,
    starsSpent: 0,
    powerUntil: 0,
    score: 0,
    nextId: 1,
    events: [],
  }
}

export function enemyPos(s: BattleState, e: Enemy) {
  return pointAt(s.path, e.d)
}

export function petPos(s: BattleState, p: Pet) {
  return pointAt(s.path, p.d)
}

export function towerPos(s: BattleState, t: Tower) {
  return s.slots[t.slot]
}

export function addStars(s: BattleState, amount: number) {
  if (amount <= 0) return
  s.stars += amount
  s.starsEarned += amount
}

function spend(s: BattleState, cost: number) {
  if (s.stars < cost) return false
  s.stars -= cost
  s.starsSpent += cost
  return true
}

export function startWave(s: BattleState) {
  if (s.phase !== 'prep' || s.wave >= s.level.waves.length) return false
  const def = s.level.waves[s.wave]
  for (const group of def.groups) {
    for (let i = 0; i < group.count; i++) {
      s.queue.push({ at: s.time + group.delay + i * group.gap, kind: group.kind })
    }
  }
  s.queue.sort((a, b) => a.at - b.at)
  s.wave += 1
  s.phase = 'wave'
  return true
}

function spawn(s: BattleState, kind: EnemyKind) {
  const def = enemyDefs[kind]
  const hp = Math.round(def.hp * s.level.hpScale)
  const enemy: Enemy = {
    id: s.nextId++,
    kind,
    d: 0,
    hp,
    maxHp: hp,
    speed: def.speed,
    slowUntil: 0,
    slowFactor: 1,
    frozenUntil: 0,
    blockerId: null,
    alive: true,
    quizReadyAt: 0,
    bossHits: 0,
  }
  s.enemies.push(enemy)
  if (def.quiz) s.events.push({ type: 'quizSpawn', enemy: enemy.id, boss: def.quiz === 'boss' })
}

export function canBuild(s: BattleState, slot: number, kind: TowerKind) {
  return slot >= 0 && slot < s.slots.length && !s.towers.some((t) => t.slot === slot) && s.stars >= towerDefs[kind].cost
}

export function buildTower(s: BattleState, slot: number, kind: TowerKind) {
  if (s.phase === 'won' || s.phase === 'lost') return false
  if (!canBuild(s, slot, kind)) return false
  if (!spend(s, towerDefs[kind].cost)) return false
  s.towers.push({ id: s.nextId++, slot, kind, level: 1, cooldown: 0, beamTarget: null })
  return true
}

export function upgradeTower(s: BattleState, towerId: number) {
  const tower = s.towers.find((t) => t.id === towerId)
  if (!tower || tower.level >= maxTowerLevel) return false
  if (!spend(s, upgradeCost(tower.kind, tower.level))) return false
  tower.level += 1
  return true
}

export function boughtPetCount(s: BattleState) {
  return s.pets.filter((p) => p.bought).length
}

export function placePet(s: BattleState, kind: PetKind, at: Vec) {
  if (s.phase === 'won' || s.phase === 'lost') return false
  if (boughtPetCount(s) >= maxBoughtPets) return false
  const near = nearestOnPath(s.path, at)
  if (near.gap > 70) return false
  const d = Math.max(60, Math.min(s.path.total - 50, near.distance))
  if (!spend(s, petDefs[kind].cost)) return false
  addPet(s, kind, d, true)
  return true
}

function addPet(s: BattleState, kind: PetKind, d: number, bought: boolean) {
  const def = petDefs[kind]
  s.pets.push({ id: s.nextId++, kind, d, hp: def.hp, maxHp: def.hp, alive: true, respawnAt: 0, blocking: [], bought })
}

export function applyItem(s: BattleState, kind: ItemKind) {
  if (s.phase === 'won' || s.phase === 'lost') return false
  if (kind === 'repair' && s.castleHp >= s.castleMax) return false
  if (!spend(s, itemDefs[kind].cost)) return false
  if (kind === 'freeze') {
    for (const e of s.enemies) e.frozenUntil = Math.max(e.frozenUntil, s.time + (enemyDefs[e.kind].quiz === 'boss' ? 2 : 4))
  } else if (kind === 'repair') {
    s.castleHp = Math.min(s.castleMax, s.castleHp + 5)
  } else {
    s.powerUntil = s.time + 10
  }
  return true
}

export function quizTarget(s: BattleState, enemyId: number) {
  const e = s.enemies.find((x) => x.id === enemyId && x.alive)
  if (!e || !enemyDefs[e.kind].quiz || e.quizReadyAt > s.time) return null
  return e
}

export function resolveQuizMonster(s: BattleState, enemyId: number, correct: boolean) {
  const e = s.enemies.find((x) => x.id === enemyId && x.alive)
  if (!e || enemyDefs[e.kind].quiz !== 'monster') return false
  if (!correct) {
    e.frozenUntil = s.time + 3
    e.quizReadyAt = s.time + 3
    return false
  }
  releaseBlock(s, e)
  e.alive = false
  s.score += enemyDefs[e.kind].score
  s.events.push({ type: 'kill', enemy: e.id, ...enemyPos(s, e), kind: e.kind })
  addPet(s, 'quizling', Math.max(60, Math.min(s.path.total - 50, e.d)), false)
  s.enemies = s.enemies.filter((x) => x.alive)
  return true
}

export function hitBoss(s: BattleState, enemyId: number) {
  const e = s.enemies.find((x) => x.id === enemyId && x.alive)
  if (!e || enemyDefs[e.kind].quiz !== 'boss') return false
  e.bossHits += 1
  damage(s, e, Math.ceil(e.maxHp / 3), true)
  s.enemies = s.enemies.filter((x) => x.alive)
  return true
}

export function finishBossQuiz(s: BattleState, enemyId: number) {
  const e = s.enemies.find((x) => x.id === enemyId && x.alive)
  if (e) e.quizReadyAt = s.time + 3
}

function releaseBlock(s: BattleState, e: Enemy) {
  if (e.blockerId == null) return
  const pet = s.pets.find((p) => p.id === e.blockerId)
  if (pet) pet.blocking = pet.blocking.filter((id) => id !== e.id)
  e.blockerId = null
}

function damage(s: BattleState, e: Enemy, amount: number, raw = false) {
  if (!e.alive) return
  let dealt = amount
  if (!raw && s.powerUntil > s.time) dealt *= 2
  if (!raw && enemyDefs[e.kind].quiz) dealt *= quizShield
  e.hp -= dealt
  if (e.hp <= 0) {
    e.alive = false
    releaseBlock(s, e)
    s.score += enemyDefs[e.kind].score
    s.events.push({ type: 'kill', enemy: e.id, ...enemyPos(s, e), kind: e.kind })
  }
}

function inRange(s: BattleState, tower: Tower, range: number) {
  const tp = towerPos(s, tower)
  return s.enemies.filter((e) => {
    if (!e.alive) return false
    const p = enemyPos(s, e)
    return Math.hypot(p.x - tp.x, p.y - tp.y) <= range
  })
}

function firstOf(list: Enemy[]) {
  let best: Enemy | null = null
  for (const e of list) if (!best || e.d > best.d) best = e
  return best
}

function stepTowers(s: BattleState, dt: number) {
  for (const tower of s.towers) {
    const def = towerDefs[tower.kind]
    const stats = towerStats(tower.kind, tower.level)
    tower.cooldown -= dt
    const targets = inRange(s, tower, stats.range)
    if (def.beam) {
      const target = firstOf(targets)
      tower.beamTarget = target?.id ?? null
      if (target) damage(s, target, stats.damage * dt * (enemyDefs[target.kind].metal ? 0.5 : 1))
      continue
    }
    if (tower.cooldown > 0 || targets.length === 0) continue
    tower.cooldown = 1 / stats.rate
    if (def.freezeTime) {
      const tp = towerPos(s, tower)
      for (const e of targets) {
        const time = enemyDefs[e.kind].quiz ? def.freezeTime / 2 : def.freezeTime
        e.frozenUntil = Math.max(e.frozenUntil, s.time + time)
        damage(s, e, stats.damage * (enemyDefs[e.kind].metal ? 0.5 : 1))
      }
      s.events.push({ type: 'freeze', x: tp.x, y: tp.y, radius: stats.range })
      continue
    }
    const target = firstOf(targets)!
    const metal = enemyDefs[target.kind].metal
    let amount = stats.damage
    if (metal) amount *= def.metalBonus ?? 0.5
    if (def.slow) {
      target.slowFactor = def.slow
      target.slowUntil = s.time + (def.slowTime ?? 1)
    }
    if (def.pull && metal && enemyDefs[target.kind].quiz == null) {
      releaseBlock(s, target)
      target.d = Math.max(0, target.d - def.pull)
    }
    s.events.push({ type: 'shot', tower: tower.id, enemy: target.id, kind: tower.kind })
    damage(s, target, amount)
  }
}

function stepPets(s: BattleState, dt: number) {
  for (const pet of s.pets) {
    if (!pet.alive) {
      if (s.time >= pet.respawnAt) {
        pet.alive = true
        pet.hp = pet.maxHp
      }
      continue
    }
    const def = petDefs[pet.kind]
    pet.blocking = pet.blocking.filter((id) => s.enemies.some((e) => e.id === id && e.alive))
    for (const id of pet.blocking) {
      const e = s.enemies.find((x) => x.id === id)!
      damage(s, e, (def.dps * dt) / pet.blocking.length)
      if (e.frozenUntil <= s.time) pet.hp -= enemyDefs[e.kind].attack * dt
    }
    if (pet.hp <= 0) {
      pet.alive = false
      pet.respawnAt = s.time + petRespawn
      for (const id of pet.blocking) {
        const e = s.enemies.find((x) => x.id === id)
        if (e) e.blockerId = null
      }
      pet.blocking = []
      s.events.push({ type: 'petDown', pet: pet.id })
    }
  }
}

function stepEnemies(s: BattleState, dt: number) {
  for (const e of s.enemies) {
    if (!e.alive) continue
    if (e.blockerId != null) {
      const pet = s.pets.find((p) => p.id === e.blockerId)
      if (pet?.alive) continue
      e.blockerId = null
    }
    if (e.frozenUntil > s.time) continue
    const factor = e.slowUntil > s.time ? e.slowFactor : 1
    const next = e.d + e.speed * factor * dt
    const def = enemyDefs[e.kind]
    let blocked = false
    for (const pet of s.pets) {
      if (!pet.alive) continue
      const pdef = petDefs[pet.kind]
      if (def.flying && !pdef.blocksFlyers) continue
      if (pet.blocking.length >= pdef.cap) continue
      const stop = pet.d - blockGap
      if (e.d <= stop && next >= stop) {
        e.d = stop
        e.blockerId = pet.id
        pet.blocking.push(e.id)
        blocked = true
        break
      }
    }
    if (blocked) continue
    e.d = next
    if (e.d >= s.path.total) {
      e.alive = false
      releaseBlock(s, e)
      s.castleHp = Math.max(0, s.castleHp - def.leak)
      s.events.push({ type: 'leak', amount: def.leak })
    }
  }
}

export function step(s: BattleState, dt: number) {
  if (s.phase === 'won' || s.phase === 'lost') return
  s.time += dt
  while (s.queue.length && s.queue[0].at <= s.time) spawn(s, s.queue.shift()!.kind)
  stepEnemies(s, dt)
  stepPets(s, dt)
  stepTowers(s, dt)
  s.enemies = s.enemies.filter((e) => e.alive)
  if (s.castleHp <= 0) {
    s.phase = 'lost'
    s.events.push({ type: 'lost' })
    return
  }
  if (s.phase === 'wave' && s.queue.length === 0 && s.enemies.length === 0) {
    if (s.wave >= s.level.waves.length) {
      s.phase = 'won'
      s.events.push({ type: 'won' })
    } else {
      s.phase = 'prep'
      s.events.push({ type: 'waveCleared', wave: s.wave })
    }
  }
}

export function levelStars(s: BattleState) {
  if (s.phase !== 'won') return 0
  const ratio = s.castleHp / s.castleMax
  if (ratio >= 0.9) return 3
  if (ratio >= 0.5) return 2
  return 1
}

export function takeEvents(s: BattleState) {
  const out = s.events
  s.events = []
  return out
}
