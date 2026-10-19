import { describe, expect, it } from 'vitest'
import { levels } from '../src/content/levels'
import { rewardFor, starRules } from '../src/economy/stars'
import { BattleController } from '../src/game/BattleController'
import { QuizSession } from '../src/quiz/session'
import { getSave } from '../src/save'

describe('star rewards', () => {
  it('gives 2 stars per correct answer and a bonus every 3 in a row', () => {
    let streak = 0
    const got: number[] = []
    for (let i = 0; i < 6; i++) {
      const r = rewardFor('firstTry', streak)
      streak = r.streak
      got.push(r.stars)
    }
    expect(got).toEqual([2, 2, 3, 2, 2, 3])
  })

  it('still rewards answers after a hint and after a reveal, but resets the streak', () => {
    expect(rewardFor('afterHint', 2)).toEqual({ stars: starRules.correct, streak: 0, bonus: false })
    expect(rewardFor('revealed', 2)).toEqual({ stars: starRules.revealed, streak: 0, bonus: false })
  })

  it('never takes stars away', () => {
    for (const r of ['firstTry', 'afterHint', 'revealed'] as const) for (let s = 0; s < 5; s++) expect(rewardFor(r, s).stars).toBeGreaterThan(0)
  })
})

describe('quiz session', () => {
  it('records mastery and keeps the streak', () => {
    const session = new QuizSession('meadow', 9)
    const q1 = session.next()
    const before = getSave().quizzesAnswered
    expect(session.answer(q1, 'firstTry').stars).toBe(2)
    session.answer(session.next(), 'firstTry')
    expect(session.answer(session.next(), 'firstTry').stars).toBe(3)
    expect(getSave().quizzesAnswered).toBe(before + 3)
    expect(getSave().mastery[q1.skill]?.seen).toBeGreaterThan(0)
  })

  it('does not pay streak stars for monster and boss questions', () => {
    const session = new QuizSession('meadow', 4)
    expect(session.answer(session.next(), 'firstTry', false).stars).toBe(0)
  })
})

describe('battle controller', () => {
  it('pauses the game while a quiz or menu is open', () => {
    const c = new BattleController(levels[0])
    c.startWave()
    c.setPause('overlay', true)
    const t = c.state.time
    c.tick(500)
    expect(c.state.time).toBe(t)
    c.setPause('overlay', false)
    c.tick(500)
    expect(c.state.time).toBeGreaterThan(t)
  })

  it('freezes time while placing a pet', () => {
    const c = new BattleController(levels[0])
    c.earn(10)
    c.startWave()
    c.beginPlacing('frog')
    const t = c.state.time
    c.tick(500)
    expect(c.state.time).toBe(t)
  })
})
