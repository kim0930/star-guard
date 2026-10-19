export type EnemyKind = 'blob' | 'zip' | 'rocko' | 'bolt' | 'bat' | 'quizzer' | 'boss'
export type TowerKind = 'pebble' | 'bubble' | 'sun' | 'magnet' | 'ice'
export type PetKind = 'frog' | 'crab' | 'owl' | 'quizling'
export type ItemKind = 'freeze' | 'repair' | 'power'

export type EnemyDef = {
  kind: EnemyKind
  name: string
  hp: number
  speed: number
  leak: number
  attack: number
  flying?: boolean
  metal?: boolean
  quiz?: 'monster' | 'boss'
  score: number
}

export const enemyDefs: Record<EnemyKind, EnemyDef> = {
  blob: { kind: 'blob', name: 'Goo Blob', hp: 40, speed: 55, leak: 1, attack: 6, score: 10 },
  zip: { kind: 'zip', name: 'Zip Bug', hp: 26, speed: 96, leak: 1, attack: 4, score: 12 },
  rocko: { kind: 'rocko', name: 'Rocko', hp: 170, speed: 34, leak: 2, attack: 12, score: 30 },
  bolt: { kind: 'bolt', name: 'Bolt Bot', hp: 90, speed: 50, leak: 1, attack: 8, metal: true, score: 20 },
  bat: { kind: 'bat', name: 'Dusk Bat', hp: 34, speed: 74, leak: 1, attack: 5, flying: true, score: 14 },
  quizzer: { kind: 'quizzer', name: 'Quizzer', hp: 520, speed: 26, leak: 3, attack: 10, quiz: 'monster', score: 50 },
  boss: { kind: 'boss', name: 'Big Brain', hp: 2600, speed: 18, leak: 10, attack: 30, quiz: 'boss', score: 300 },
}

export type TowerDef = {
  kind: TowerKind
  name: string
  blurb: string
  cost: number
  range: number
  rate: number
  damage: number
  slow?: number
  slowTime?: number
  metalBonus?: number
  pull?: number
  beam?: boolean
  freezeTime?: number
}

export const towerDefs: Record<TowerKind, TowerDef> = {
  pebble: {
    kind: 'pebble',
    name: 'Pebble Slinger',
    blurb: 'Throws rocks fast.',
    cost: 4,
    range: 165,
    rate: 1.3,
    damage: 14,
  },
  bubble: {
    kind: 'bubble',
    name: 'Bubble Blower',
    blurb: 'Bubbles slow monsters down.',
    cost: 5,
    range: 150,
    rate: 1.1,
    damage: 6,
    slow: 0.45,
    slowTime: 1.6,
  },
  sun: {
    kind: 'sun',
    name: 'Sun Lens',
    blurb: 'Focuses sunlight into a hot beam.',
    cost: 7,
    range: 145,
    rate: 1,
    damage: 30,
    beam: true,
  },
  magnet: {
    kind: 'magnet',
    name: 'Magnet Coil',
    blurb: 'Pulls metal bots back. Big hits on metal.',
    cost: 6,
    range: 155,
    rate: 0.85,
    damage: 12,
    metalBonus: 4,
    pull: 28,
  },
  ice: {
    kind: 'ice',
    name: 'Ice Cloud',
    blurb: 'Freezes every monster near it.',
    cost: 8,
    range: 135,
    rate: 0.3,
    damage: 10,
    freezeTime: 1.3,
  },
}

export const towerOrder: TowerKind[] = ['pebble', 'bubble', 'sun', 'magnet', 'ice']
export const maxTowerLevel = 3

export function upgradeCost(kind: TowerKind, level: number) {
  const base = towerDefs[kind].cost
  return level === 1 ? base : Math.round(base * 1.5)
}

export function towerStats(kind: TowerKind, level: number) {
  const def = towerDefs[kind]
  const boost = Math.pow(1.6, level - 1)
  return {
    range: def.range + (level - 1) * 15,
    rate: def.rate * Math.pow(1.1, level - 1),
    damage: def.damage * boost,
  }
}

export type PetDef = {
  kind: PetKind
  name: string
  blurb: string
  cost: number
  hp: number
  dps: number
  cap: number
  blocksFlyers?: boolean
}

export const petDefs: Record<PetKind, PetDef> = {
  frog: { kind: 'frog', name: 'Frog', blurb: 'Quick tongue. Blocks 1 monster.', cost: 4, hp: 90, dps: 15, cap: 1 },
  crab: { kind: 'crab', name: 'Rock Crab', blurb: 'Tough shell. Blocks 2 monsters.', cost: 5, hp: 180, dps: 9, cap: 2 },
  owl: {
    kind: 'owl',
    name: 'Owl',
    blurb: 'Can catch flying bats too.',
    cost: 6,
    hp: 100,
    dps: 13,
    cap: 1,
    blocksFlyers: true,
  },
  quizling: {
    kind: 'quizling',
    name: 'Quizling',
    blurb: 'A Quizzer that joined your team.',
    cost: 0,
    hp: 150,
    dps: 15,
    cap: 2,
    blocksFlyers: true,
  },
}

export const petShop: PetKind[] = ['frog', 'crab', 'owl']
export const maxBoughtPets = 3
export const petRespawn = 8

export type ItemDef = { kind: ItemKind; name: string; blurb: string; cost: number }

export const itemDefs: Record<ItemKind, ItemDef> = {
  freeze: { kind: 'freeze', name: 'Freeze Bomb', blurb: 'Freezes every monster for 4 seconds.', cost: 4 },
  repair: { kind: 'repair', name: 'Castle Repair', blurb: 'Fixes 5 castle hearts.', cost: 3 },
  power: { kind: 'power', name: '2x Power', blurb: 'Towers hit twice as hard for 10 seconds.', cost: 5 },
}

export const itemOrder: ItemKind[] = ['freeze', 'repair', 'power']
