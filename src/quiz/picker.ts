import { photos } from '../content/photos'
import { mathGenerators } from './math'
import { isWeak, weakness, type Mastery } from './mastery'
import { mulberry32, pick, type Rng } from './rng'
import { scienceQuestion } from './science'
import { getSkill, skillsForWorld, skillsUpTo, type SkillId, type WorldId } from './skills'
import type { Question } from './types'

export function makeQuestion(skill: SkillId, rng: Rng): Question | undefined {
  const math = mathGenerators[skill]
  if (math) return math(rng)
  return scienceQuestion(skill, rng, photos)
}

function weighted(rng: Rng, list: SkillId[], weight: (s: SkillId) => number) {
  const total = list.reduce((a, s) => a + weight(s), 0)
  let r = rng() * total
  for (const s of list) {
    r -= weight(s)
    if (r <= 0) return s
  }
  return list[list.length - 1]
}

export class QuizPicker {
  private rng: Rng
  private recentIds: string[] = []
  private lastSkill?: SkillId
  private lastSubject?: 'math' | 'science'
  private world: WorldId
  private getMastery: () => Mastery

  constructor(world: WorldId, getMastery: () => Mastery, seed = Date.now()) {
    this.world = world
    this.getMastery = getMastery
    this.rng = mulberry32(seed >>> 0)
  }

  private chooseSkill(): SkillId {
    const mastery = this.getMastery()
    const pool = skillsUpTo(this.world)
    const weak = pool.filter((s) => isWeak(mastery, s) && s !== this.lastSkill)
    const current = skillsForWorld(this.world)
    let candidates: SkillId[]
    if (weak.length > 0 && this.rng() < 0.7) candidates = weak
    else candidates = this.rng() < 0.85 ? current : pool
    const notLast = candidates.filter((s) => s !== this.lastSkill)
    if (notLast.length > 0) candidates = notLast
    const otherSubject = candidates.filter((s) => getSkill(s).subject !== this.lastSubject)
    if (otherSubject.length > 0 && this.rng() < 0.6) candidates = otherSubject
    return weighted(this.rng, candidates, (s) => 0.4 + weakness(mastery, s))
  }

  next(): Question {
    for (let attempt = 0; attempt < 30; attempt++) {
      const skill = this.chooseSkill()
      const q = makeQuestion(skill, this.rng)
      if (!q || this.recentIds.includes(q.id)) continue
      this.remember(q)
      return q
    }
    const fallback = mathGenerators[pick(this.rng, ['count20', 'add10', 'sub10'] as SkillId[])]!(this.rng)
    this.remember(fallback)
    return fallback
  }

  private remember(q: Question) {
    this.recentIds = [...this.recentIds, q.id].slice(-12)
    this.lastSkill = q.skill
    this.lastSubject = getSkill(q.skill).subject
  }
}
