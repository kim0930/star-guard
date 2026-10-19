import { useEffect, useState, type ReactNode } from 'react'
import type { QuizResult } from '../economy/stars'
import { speak, stopSpeaking } from '../quiz/speech'
import type { Question } from '../quiz/types'
import { getSave } from '../save'
import { QuizVisual } from './QuizVisual'

const cheers = ['Great job!', 'You got it!', 'Super smart!', 'Awesome!', 'Way to go!']
let cheerIndex = 0
const nextCheer = () => cheers[cheerIndex++ % cheers.length]

type Props = {
  question: Question
  title: string
  tone?: 'shop' | 'monster' | 'boss'
  onResult: (result: QuizResult) => string
  children?: (done: boolean) => ReactNode
}

export function QuizCard({ question, title, tone = 'shop', onResult, children }: Props) {
  const [wrong, setWrong] = useState<string[]>([])
  const [done, setDone] = useState<{ result: QuizResult; message: string } | null>(null)

  useEffect(() => {
    if (getSave().settings.autoRead) speak(question.speak)
    return () => stopSpeaking()
  }, [question])

  const finish = (result: QuizResult) => {
    const message = onResult(result)
    setDone({ result, message })
  }

  const choose = (id: string) => {
    if (done || wrong.includes(id)) return
    if (id === question.answer) {
      speak(nextCheer())
      finish(wrong.length === 0 ? 'firstTry' : 'afterHint')
      return
    }
    const next = [...wrong, id]
    setWrong(next)
    if (next.length === 1) speak(`Not quite. Here is a hint. ${question.hint}`)
    else {
      speak(question.reveal)
      finish('revealed')
    }
  }

  const photoChoices = question.choices.every((c) => c.visual?.kind === 'photo')
  const visualChoices = question.choices.some((c) => c.visual)
  const showHint = wrong.length >= 1 && done?.result !== 'firstTry'
  const revealed = done?.result === 'revealed'

  return (
    <div className={`quiz-card tone-${tone}`} role="dialog" aria-label={title}>
      <div className="quiz-head">
        <span className="quiz-title">{title}</span>
        <button className="listen" onClick={() => speak(question.speak)} aria-label="Listen">
          <span aria-hidden>🔊</span> Listen
        </button>
      </div>
      <div className={question.stem ? 'quiz-body has-stem' : 'quiz-body'}>
        <div className="quiz-left">
          <h2 className="quiz-prompt">{question.prompt}</h2>
          {question.stem && (
            <div className="quiz-stem">
              <QuizVisual visual={question.stem} />
            </div>
          )}
          {showHint && !revealed && (
            <div className="quiz-hint">
              {question.hintVisual && (
                <div className="hint-pic">
                  <QuizVisual visual={question.hintVisual} />
                </div>
              )}
              <p>
                <b>Hint:</b> {question.hint}
              </p>
            </div>
          )}
          {revealed && (
            <div className="quiz-hint reveal">
              <p>{question.reveal}</p>
            </div>
          )}
        </div>
        <div
          className={`quiz-choices ${photoChoices ? 'photos' : visualChoices ? 'visuals' : 'words'} n${question.choices.length}`}
        >
          {question.choices.map((c) => {
            const isWrong = wrong.includes(c.id)
            const isRight = !!done && c.id === question.answer
            return (
              <button
                key={c.id}
                className={`choice${isWrong ? ' wrong' : ''}${isRight ? ' right' : ''}`}
                disabled={isWrong || (!!done && !isRight)}
                onClick={() => choose(c.id)}
              >
                {c.visual && <QuizVisual visual={c.visual} big />}
                {c.label && <span className="choice-label">{c.label}</span>}
                {isWrong && <span className="mark" aria-hidden>✗</span>}
                {isRight && <span className="mark" aria-hidden>✓</span>}
              </button>
            )
          })}
        </div>
      </div>
      {done && (
        <div className={`quiz-done ${done.result}`}>
          <span className="quiz-reward">{done.message}</span>
          {children?.(true)}
        </div>
      )}
      {!done && children?.(false)}
    </div>
  )
}
