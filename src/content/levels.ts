import type { EnemyKind } from '../sim/data'
import type { LevelDef, SpawnGroup, WaveDef } from '../sim/engine'
import type { Vec } from '../sim/path'
import { worldOrder, type WorldId } from '../quiz/skills'

export type WorldDef = {
  id: WorldId
  name: string
  blurb: string
  ground: number
  path: number
  accent: number
  css: string
}

export const worlds: Record<WorldId, WorldDef> = {
  meadow: {
    id: 'meadow',
    name: 'Sunny Meadow',
    blurb: 'Counting, adding, living things, and weather.',
    ground: 0x8fd16a,
    path: 0xe9d29a,
    accent: 0x5aa83c,
    css: '#8fd16a',
  },
  coast: {
    id: 'coast',
    name: 'Splash Coast',
    blurb: 'Numbers to 20, tens and ones, habitats, and animal babies.',
    ground: 0xf1dca0,
    path: 0x9ad6e8,
    accent: 0x3ba7c9,
    css: '#f1dca0',
  },
  volcano: {
    id: 'volcano',
    name: 'Rumble Volcano',
    blurb: 'Numbers to 100, shapes, time, coins, materials, and landforms.',
    ground: 0x9b7d6a,
    path: 0xd9a066,
    accent: 0xe4572e,
    css: '#9b7d6a',
  },
}

const layouts: Vec[][] = [
  [
    { x: -40, y: 140 },
    { x: 420, y: 140 },
    { x: 420, y: 540 },
    { x: 860, y: 540 },
    { x: 860, y: 260 },
    { x: 1190, y: 260 },
  ],
  [
    { x: -40, y: 600 },
    { x: 300, y: 600 },
    { x: 300, y: 160 },
    { x: 650, y: 160 },
    { x: 650, y: 580 },
    { x: 990, y: 580 },
    { x: 990, y: 300 },
    { x: 1190, y: 300 },
  ],
  [
    { x: -40, y: 360 },
    { x: 250, y: 360 },
    { x: 250, y: 120 },
    { x: 1010, y: 120 },
    { x: 1010, y: 600 },
    { x: 520, y: 600 },
    { x: 520, y: 380 },
    { x: 770, y: 380 },
  ],
  [
    { x: -40, y: 110 },
    { x: 1090, y: 110 },
    { x: 1090, y: 320 },
    { x: 190, y: 320 },
    { x: 190, y: 560 },
    { x: 1190, y: 560 },
  ],
  [
    { x: -40, y: 620 },
    { x: 210, y: 620 },
    { x: 210, y: 200 },
    { x: 570, y: 200 },
    { x: 570, y: 470 },
    { x: 910, y: 470 },
    { x: 910, y: 170 },
    { x: 1190, y: 170 },
  ],
]

const levelNames: Record<WorldId, string[]> = {
  meadow: ['Daisy Path', 'Bumble Hill', 'Rainy Lane', 'Rainbow Bend', 'Big Brain Barn'],
  coast: ['Shell Beach', 'Tide Pools', 'Dune Trail', 'Coral Cove', 'Big Brain Bay'],
  volcano: ['Ash Road', 'Crystal Cave', 'Lava Loop', 'Steam Vents', 'Big Brain Peak'],
}

function group(kind: EnemyKind, count: number, gap: number, delay = 0): SpawnGroup {
  return { kind, count, gap, delay }
}

function makeWaves(world: number, index: number): WaveDef[] {
  const boss = index === 4
  const count = boss ? 8 : 5 + Math.floor(index / 2)
  const waves: WaveDef[] = []
  for (let w = 0; w < count; w++) {
    const groups: SpawnGroup[] = []
    const size = 5 + w * 2 + index
    groups.push(group('blob', size, 1.3))
    if (w >= 1) groups.push(group('zip', 2 + w, 1.1, 3))
    if (w >= 1) groups.push(group('quizzer', 1, 1, 6))
    if (w >= 2 && (world >= 1 || index >= 2)) groups.push(group('rocko', 1 + Math.floor(w / 3), 3, 5))
    if (world >= 1 && w >= 2) groups.push(group('bolt', 1 + Math.floor(w / 2), 1.6, 8))
    if ((world >= 1 && w >= 1) || (world === 0 && w >= 3)) groups.push(group('bat', 1 + Math.floor(w / 2), 1.4, 10))
    if (boss && w === count - 1) groups.push(group('boss', 1, 1, 12))
    waves.push({ groups })
  }
  return waves
}

export const levels: LevelDef[] = worldOrder.flatMap((worldId, world) =>
  levelNames[worldId].map((name, index) => ({
    id: `${worldId}-${index + 1}`,
    worldId,
    index,
    name,
    points: layouts[(index + world * 2) % layouts.length].map((p) => ({ ...p })),
    waves: makeWaves(world, index),
    hpScale: 1 + (world * 5 + index) * 0.06,
    castleHp: 20,
    boss: index === 4,
  })),
)

export function getLevel(id: string) {
  return levels.find((l) => l.id === id)
}

export function levelsOf(world: WorldId) {
  return levels.filter((l) => l.worldId === world)
}
