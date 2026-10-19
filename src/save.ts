import { useSyncExternalStore } from 'react'
import type { Mastery } from './quiz/mastery'

export type LevelRecord = { stars: number; bestScore: number; wins: number }

export type SaveData = {
  version: 1
  levels: Record<string, LevelRecord>
  mastery: Mastery
  playSeconds: number
  quizzesAnswered: number
  settings: { autoRead: boolean }
}

const key = 'star-guard-v1'

const fresh = (): SaveData => ({
  version: 1,
  levels: {},
  mastery: {},
  playSeconds: 0,
  quizzesAnswered: 0,
  settings: { autoRead: true },
})

function load(): SaveData {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null
    if (!raw) return fresh()
    const data = JSON.parse(raw) as Partial<SaveData>
    if (data.version !== 1) return fresh()
    return { ...fresh(), ...data, settings: { ...fresh().settings, ...data.settings } }
  } catch {
    return fresh()
  }
}

let current = load()
const listeners = new Set<() => void>()

function persist() {
  try {
    localStorage.setItem(key, JSON.stringify(current))
  } catch {
    // Storage can be full or blocked (private mode); the game keeps working in memory.
  }
}

export function getSave() {
  return current
}

export function updateSave(fn: (s: SaveData) => SaveData) {
  current = fn(current)
  persist()
  for (const l of listeners) l()
}

export function resetSave() {
  current = fresh()
  persist()
  for (const l of listeners) l()
}

function subscribe(fn: () => void) {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

export function useSave() {
  return useSyncExternalStore(subscribe, getSave, getSave)
}

export function recordLevel(id: string, stars: number, score: number) {
  updateSave((s) => {
    const prev = s.levels[id] ?? { stars: 0, bestScore: 0, wins: 0 }
    return {
      ...s,
      levels: {
        ...s.levels,
        [id]: {
          stars: Math.max(prev.stars, stars),
          bestScore: Math.max(prev.bestScore, score),
          wins: prev.wins + (stars > 0 ? 1 : 0),
        },
      },
    }
  })
}
