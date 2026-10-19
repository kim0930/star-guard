import { rewardFor, type QuizResult, type StarReward } from '../economy/stars'
import { getSave, updateSave } from '../save'
import { recordAnswer } from './mastery'
import { QuizPicker } from './picker'
import type { WorldId } from './skills'
import type { Question } from './types'

export class QuizSession {
  streak = 0
  private picker: QuizPicker

  constructor(world: WorldId, seed?: number) {
    this.picker = new QuizPicker(world, () => getSave().mastery, seed)
  }

  next(): Question {
    return this.picker.next()
  }

  answer(q: Question, result: QuizResult, countsForStreak = true): StarReward {
    updateSave((s) => ({
      ...s,
      mastery: recordAnswer(s.mastery, q.skill, result === 'firstTry'),
      quizzesAnswered: s.quizzesAnswered + 1,
    }))
    if (!countsForStreak) return { stars: 0, streak: this.streak, bonus: false }
    const reward = rewardFor(result, this.streak)
    this.streak = reward.streak
    return reward
  }
}
