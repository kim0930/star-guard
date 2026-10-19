import { describe, expect, it } from 'vitest'
import { coinValue, mathGenerators } from '../src/quiz/math'
import { mulberry32 } from '../src/quiz/rng'
import { skills } from '../src/quiz/skills'
import type { Question, Visual } from '../src/quiz/types'

function evalEquation(text: string, fill: string) {
  const expr = text.replace('?', fill).replace(/−/g, '-')
  const [left, right] = expr.split('=').map((s) => s.trim())
  const calc = (s: string) => {
    const m = s.match(/^(\d+)\s*([+-])\s*(\d+)$/)
    if (!m) return Number(s)
    return m[2] === '+' ? Number(m[1]) + Number(m[3]) : Number(m[1]) - Number(m[3])
  }
  return calc(left) === calc(right)
}

function answerChoice(q: Question) {
  return q.choices.find((c) => c.id === q.answer)!
}

function check(q: Question) {
  const right = answerChoice(q)
  expect(right, q.id).toBeTruthy()
  expect(new Set(q.choices.map((c) => c.id)).size).toBe(q.choices.length)
  expect(q.choices.length).toBeGreaterThanOrEqual(2)
  expect(q.choices.length).toBeLessThanOrEqual(4)
  expect(q.prompt.length).toBeGreaterThan(3)
  expect(q.hint.length).toBeGreaterThan(10)
  const labels = q.choices.map((c) => c.label).filter(Boolean)
  expect(new Set(labels).size).toBe(labels.length)
  const stem = q.stem as Visual | undefined
  const num = Number(right.label?.replace('¢', ''))
  switch (q.skill) {
    case 'count20':
      expect(stem?.kind === 'count' && stem.n).toBe(num)
      break
    case 'add10':
    case 'sub10':
      if (stem?.kind !== 'sum') throw new Error('sum stem')
      expect(stem.op === '+' ? stem.a + stem.b : stem.a - stem.b).toBe(num)
      expect(num).toBeGreaterThanOrEqual(0)
      expect(num).toBeLessThanOrEqual(10)
      break
    case 'addsub20':
    case 'addsub100':
    case 'missing':
      if (stem?.kind !== 'text') throw new Error('text stem')
      expect(evalEquation(stem.text, right.label!), q.id).toBe(true)
      for (const c of q.choices) if (c !== right) expect(evalEquation(stem.text, c.label!), q.id).toBe(false)
      expect(num).toBeLessThanOrEqual(q.skill === 'addsub100' ? 100 : 20)
      break
    case 'placevalue': {
      const tens = stem?.kind === 'blocks' ? stem.tens : Number(q.prompt.split(' ')[0])
      const ones = stem?.kind === 'blocks' ? stem.ones : Number(q.prompt.split(' ')[3])
      expect(tens * 10 + ones).toBe(num)
      break
    }
    case 'skipcount': {
      const parts = q.prompt.split(': ')[1].split(', ')
      const filled = parts.map((p) => (p === '?' ? num : Number(p)))
      const by = Number(q.prompt.match(/by (\d+)s/)![1])
      for (let i = 1; i < filled.length; i++) expect(filled[i] - filled[i - 1]).toBe(by)
      break
    }
    case 'coins':
      if (stem?.kind !== 'coins') throw new Error('coins stem')
      expect(stem.coins.reduce((s, c) => s + coinValue[c], 0)).toBe(num)
      break
    case 'time':
      if (stem?.kind !== 'clock') throw new Error('clock stem')
      expect(right.label).toBe(`${stem.hour}:${stem.minute === 0 ? '00' : '30'}`)
      break
    case 'compare': {
      const counts = q.choices.map((c) => (c.visual?.kind === 'count' ? c.visual.n : -1))
      const n = right.visual?.kind === 'count' ? right.visual.n : -1
      expect(n).toBe(q.prompt.includes('more') ? Math.max(...counts) : Math.min(...counts))
      break
    }
    case 'length': {
      const lens = q.choices.map((c) => (c.visual?.kind === 'bar' ? c.visual.length : -1))
      const n = right.visual?.kind === 'bar' ? right.visual.length : -1
      expect(n).toBe(q.prompt.includes('longest') ? Math.max(...lens) : Math.min(...lens))
      break
    }
    case 'shapes':
      expect(right.visual?.kind === 'shape' && q.prompt.includes(right.visual.shape)).toBe(true)
      break
    case 'fractions': {
      const v = right.visual
      if (v?.kind !== 'split') throw new Error('split')
      expect(v.equal).toBe(true)
      expect(v.parts).toBe(q.prompt.includes('halves') ? 2 : 4)
      const others = q.choices.filter((c) => c !== right)
      for (const c of others) {
        const o = c.visual
        if (o?.kind !== 'split') throw new Error('split')
        expect(o.equal && o.parts === v.parts).toBe(false)
      }
      break
    }
    default:
      throw new Error(`unchecked skill ${q.skill}`)
  }
}

describe('math generators', () => {
  it('covers every math skill', () => {
    for (const s of skills.filter((x) => x.subject === 'math')) expect(mathGenerators[s.id], s.id).toBeTypeOf('function')
  })

  it('makes valid questions for 300 seeds per skill', () => {
    for (const [skill, gen] of Object.entries(mathGenerators)) {
      for (let seed = 1; seed <= 300; seed++) {
        const q = gen!(mulberry32(seed * 31 + skill.length))
        expect(q.skill).toBe(skill)
        check(q)
      }
    }
  })
})
