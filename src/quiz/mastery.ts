import type { SkillId } from './skills'

export type SkillRecord = { seen: number; correct: number; recent: number[] }
export type Mastery = Partial<Record<SkillId, SkillRecord>>

const recentSize = 8

export function recordAnswer(m: Mastery, skill: SkillId, firstTry: boolean): Mastery {
  const prev = m[skill] ?? { seen: 0, correct: 0, recent: [] }
  return {
    ...m,
    [skill]: {
      seen: prev.seen + 1,
      correct: prev.correct + (firstTry ? 1 : 0),
      recent: [...prev.recent, firstTry ? 1 : 0].slice(-recentSize),
    },
  }
}

export function weakness(m: Mastery, skill: SkillId) {
  const r = m[skill]
  if (!r) return 0.5
  const right = r.recent.reduce((a, b) => a + b, 0)
  return 1 - (right + 1) / (r.recent.length + 2)
}

export function accuracy(m: Mastery, skill: SkillId) {
  const r = m[skill]
  if (!r || r.seen === 0) return undefined
  return r.correct / r.seen
}

export function isWeak(m: Mastery, skill: SkillId) {
  const r = m[skill]
  return !!r && r.recent.length >= 2 && weakness(m, skill) > 0.35
}
