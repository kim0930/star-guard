export type QuizResult = 'firstTry' | 'afterHint' | 'revealed'

export const starRules = {
  correct: 2,
  revealed: 1,
  streakEvery: 3,
  streakBonus: 1,
  quizMonster: 3,
  bossHit: 2,
}

export type StarReward = { stars: number; streak: number; bonus: boolean }

export function rewardFor(result: QuizResult, streak: number): StarReward {
  if (result === 'revealed') return { stars: starRules.revealed, streak: 0, bonus: false }
  if (result === 'afterHint') return { stars: starRules.correct, streak: 0, bonus: false }
  const next = streak + 1
  const bonus = next % starRules.streakEvery === 0
  return { stars: starRules.correct + (bonus ? starRules.streakBonus : 0), streak: next, bonus }
}

export const isCorrect = (r: QuizResult) => r !== 'revealed'
