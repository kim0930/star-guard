import { describe, expect, it } from 'vitest'
import { levels } from '../src/content/levels'
import { maxBoughtPets } from '../src/sim/data'
import {
  addStars,
  applyItem,
  buildTower,
  createBattle,
  hitBoss,
  levelStars,
  placePet,
  resolveQuizMonster,
  startWave,
  step,
  takeEvents,
  upgradeTower,
  type LevelDef,
} from '../src/sim/engine'
import { makePath, pointAt } from '../src/sim/path'
import { autoplay } from './autoplay'

const dt = 1 / 30

function run(s: ReturnType<typeof createBattle>, seconds: number) {
  for (let i = 0; i < seconds * 30; i++) step(s, dt)
}

const tiny: LevelDef = {
  id: 'test',
  worldId: 'meadow',
  index: 0,
  name: 'Test',
  points: [
    { x: 0, y: 360 },
    { x: 1200, y: 360 },
  ],
  waves: [{ groups: [{ kind: 'blob', count: 1, gap: 1, delay: 0 }] }],
  hpScale: 1,
  castleHp: 5,
  boss: false,
}

describe('path', () => {
  it('walks along segments', () => {
    const path = makePath([
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
    ])
    expect(path.total).toBe(200)
    expect(pointAt(path, 150)).toEqual({ x: 100, y: 50 })
  })
})

describe('levels', () => {
  it('has 15 levels across 3 worlds with a boss each', () => {
    expect(levels).toHaveLength(15)
    expect(levels.filter((l) => l.boss)).toHaveLength(3)
    for (const level of levels) {
      const s = createBattle(level)
      expect(s.slots.length, level.id).toBeGreaterThanOrEqual(7)
      expect(level.waves.length).toBeGreaterThanOrEqual(5)
      expect(level.waves.length).toBeLessThanOrEqual(8)
      const quizWaves = level.waves.map((w) => w.groups.some((g) => g.kind === 'quizzer'))
      expect(quizWaves[0]).toBe(false)
      expect(quizWaves.slice(1).every(Boolean)).toBe(true)
      const bossInLast = level.waves[level.waves.length - 1].groups.some((g) => g.kind === 'boss')
      expect(bossInLast).toBe(level.boss)
    }
  })
})

describe('engine', () => {
  it('only gains stars through addStars', () => {
    const s = createBattle(levels[0])
    addStars(s, 20)
    buildTower(s, 0, 'pebble')
    const before = s.stars
    startWave(s)
    run(s, 60)
    expect(s.stars).toBe(before)
    expect(s.starsEarned).toBe(20)
  })

  it('a monster reaching the castle costs hearts and the level can be lost', () => {
    const s = createBattle(tiny)
    startWave(s)
    run(s, 30)
    expect(s.castleHp).toBe(4)
    expect(s.phase).toBe('won')
    expect(levelStars(s)).toBe(2)
  })

  it('towers kill monsters', () => {
    const s = createBattle(tiny)
    addStars(s, 4)
    expect(buildTower(s, 0, 'pebble')).toBe(true)
    expect(s.stars).toBe(0)
    expect(buildTower(s, 1, 'pebble')).toBe(false)
    startWave(s)
    run(s, 30)
    expect(s.castleHp).toBe(5)
    expect(levelStars(s)).toBe(3)
  })

  it('pets block monsters until they fall', () => {
    const s = createBattle(tiny)
    addStars(s, 5)
    expect(placePet(s, 'crab', { x: 600, y: 370 })).toBe(true)
    startWave(s)
    run(s, 12)
    expect(s.enemies[0]?.blockerId ?? null).toBe(s.pets[0].id)
    expect(s.enemies[0].d).toBeLessThan(600)
  })

  it('caps bought pets and rejects pets far from the path', () => {
    const s = createBattle(tiny)
    addStars(s, 40)
    expect(placePet(s, 'frog', { x: 600, y: 600 })).toBe(false)
    for (let i = 0; i < maxBoughtPets; i++) expect(placePet(s, 'frog', { x: 200 + i * 200, y: 360 })).toBe(true)
    expect(placePet(s, 'frog', { x: 900, y: 360 })).toBe(false)
  })

  it('a correct answer turns a quiz monster into a free pet', () => {
    const level: LevelDef = { ...tiny, waves: [{ groups: [{ kind: 'quizzer', count: 1, gap: 1, delay: 0 }] }] }
    const s = createBattle(level)
    startWave(s)
    run(s, 2)
    const events = takeEvents(s)
    const spawn = events.find((e) => e.type === 'quizSpawn')
    expect(spawn).toBeTruthy()
    const id = s.enemies[0].id
    expect(resolveQuizMonster(s, id, false)).toBe(false)
    expect(s.enemies[0].frozenUntil).toBeGreaterThan(s.time)
    run(s, 4)
    expect(resolveQuizMonster(s, id, true)).toBe(true)
    expect(s.enemies).toHaveLength(0)
    expect(s.pets[0].kind).toBe('quizling')
    expect(s.pets[0].bought).toBe(false)
    run(s, 1)
    expect(s.phase).toBe('won')
  })

  it('quiz monsters are shielded against towers', () => {
    const hpLeft = (kind: 'quizzer' | 'rocko') => {
      const level: LevelDef = { ...tiny, castleHp: 50, waves: [{ groups: [{ kind, count: 1, gap: 1, delay: 0 }] }] }
      const s = createBattle(level)
      addStars(s, 20)
      expect(buildTower(s, 0, 'pebble')).toBe(true)
      startWave(s)
      run(s, 8)
      const e = s.enemies[0]
      return e ? 1 - e.hp / e.maxHp : 1
    }
    expect(hpLeft('quizzer')).toBeLessThan(hpLeft('rocko') * 0.5)
  })

  it('three boss answers defeat the boss', () => {
    const level: LevelDef = { ...tiny, waves: [{ groups: [{ kind: 'boss', count: 1, gap: 1, delay: 0 }] }] }
    const s = createBattle(level)
    startWave(s)
    run(s, 1)
    const id = s.enemies[0].id
    hitBoss(s, id)
    hitBoss(s, id)
    expect(s.enemies).toHaveLength(1)
    hitBoss(s, id)
    expect(s.enemies).toHaveLength(0)
  })

  it('items cost stars and do their job', () => {
    const s = createBattle(tiny)
    addStars(s, 12)
    expect(applyItem(s, 'repair')).toBe(false)
    s.castleHp = 1
    expect(applyItem(s, 'repair')).toBe(true)
    expect(s.castleHp).toBe(5)
    startWave(s)
    run(s, 1)
    expect(applyItem(s, 'freeze')).toBe(true)
    const d = s.enemies[0].d
    run(s, 2)
    expect(s.enemies[0].d).toBe(d)
    expect(applyItem(s, 'power')).toBe(true)
    expect(s.stars).toBe(0)
  })

  it('upgrades raise tower level up to 3', () => {
    const s = createBattle(tiny)
    addStars(s, 50)
    buildTower(s, 0, 'pebble')
    const id = s.towers[0].id
    expect(upgradeTower(s, id)).toBe(true)
    expect(upgradeTower(s, id)).toBe(true)
    expect(upgradeTower(s, id)).toBe(false)
    expect(s.towers[0].level).toBe(3)
  })
})

describe('balance', () => {
  it('doing nothing loses every level', () => {
    for (const level of levels) {
      const s = autoplay(level, { starsPerWave: 0, answerQuizMonsters: false, build: false })
      expect(s.phase, level.id).toBe('lost')
    }
  })

  it('a kid who answers a few quizzes per wave can win every level', () => {
    for (const level of levels) {
      const s = autoplay(level, { starsPerWave: 8, answerQuizMonsters: true, build: true })
      expect(s.phase, `${level.id} hp ${s.castleHp}`).toBe('won')
    }
  })

  it('answering only one quiz per wave is not enough on the bosses', () => {
    for (const level of levels.filter((l) => l.boss)) {
      const s = autoplay(level, { starsPerWave: 2, answerQuizMonsters: false, build: true })
      expect(s.phase, level.id).toBe('lost')
    }
  })
})
