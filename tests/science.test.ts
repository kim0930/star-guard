import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { getPhoto, photos, tagValues } from '../src/content/photos'
import { recordAnswer, type Mastery } from '../src/quiz/mastery'
import { QuizPicker } from '../src/quiz/picker'
import { mulberry32 } from '../src/quiz/rng'
import { scienceQuestion, scienceSkills } from '../src/quiz/science'
import { getSkill, skillsUpTo } from '../src/quiz/skills'

const allowed = /^(public domain|pd\b|pd-|cc0|cc by(-sa)? \d)/i

describe('photo manifest', () => {
  it('has around 120 freely licensed photos on disk', () => {
    expect(photos.length).toBeGreaterThanOrEqual(110)
    const ids = new Set<string>()
    for (const p of photos) {
      expect(ids.has(p.id), p.id).toBe(false)
      ids.add(p.id)
      expect(p.license, p.id).toMatch(allowed)
      expect(p.source, p.id).toMatch(/^https:\/\/commons\.wikimedia\.org\//)
      expect(p.author.length, p.id).toBeGreaterThan(0)
      expect(existsSync(join(__dirname, '../public/photos', p.file)), p.file).toBe(true)
    }
  })

  it('has coin photos for the money questions', () => {
    for (const c of ['penny', 'nickel', 'dime', 'quarter']) expect(getPhoto(`coin-${c}`), c).toBeDefined()
  })
})

describe('science questions', () => {
  it.each(scienceSkills)('%s builds valid photo questions', (skill) => {
    let built = 0
    for (let seed = 1; seed <= 250; seed++) {
      const q = scienceQuestion(skill, mulberry32(seed))
      if (!q) continue
      built++
      expect(q.skill).toBe(skill)
      expect(q.choices.length).toBeGreaterThanOrEqual(2)
      expect(q.choices.length).toBeLessThanOrEqual(4)
      const ids = q.choices.map((c) => c.id)
      expect(new Set(ids).size).toBe(ids.length)
      expect(ids).toContain(q.answer)
      const shown = [q.stem, q.hintVisual, ...q.choices.map((c) => c.visual)]
      for (const v of shown) if (v?.kind === 'photo') expect(getPhoto(v.photo), v.photo).toBeDefined()
      const photoChoices = q.choices.filter((c) => c.visual?.kind === 'photo')
      expect(photoChoices.length === 0 || photoChoices.length === q.choices.length).toBe(true)
      for (const c of q.choices) expect(c.label || c.visual).toBeTruthy()
      if (q.stem?.kind === 'photo') expect(ids).not.toContain(q.stem.photo)
      expect(q.prompt.length).toBeGreaterThan(5)
      expect(q.hint.length).toBeGreaterThan(5)
      expect(q.reveal.length).toBeGreaterThan(5)
    }
    expect(built).toBeGreaterThan(240)
  })

  it('never offers Arctic animals as wrong answers for the ocean (or the reverse)', () => {
    for (let seed = 1; seed <= 600; seed++) {
      const q = scienceQuestion('sci-habitats', mulberry32(seed))!
      const homeOf = (id: string) => {
        const p = getPhoto(id)!
        return tagValues(p, 'habitat')[0] ?? tagValues(p, 'scene')[0]
      }
      const answerHome = homeOf(q.answer)
      for (const c of q.choices) {
        if (c.id === q.answer) continue
        const home = homeOf(c.id)
        expect(home).not.toBe(answerHome)
        if (answerHome === 'ocean') expect(home).not.toBe('arctic')
        if (answerHome === 'arctic') expect(home).not.toBe('ocean')
      }
    }
  })

  it('matches babies with their own kind of grown-up', () => {
    for (let seed = 1; seed <= 300; seed++) {
      const q = scienceQuestion('sci-babies', mulberry32(seed))!
      const stem = getPhoto((q.stem as { photo: string }).photo)!
      const answer = getPhoto(q.answer)!
      const kindOf = (p: typeof stem) => tagValues(p, 'baby')[0] ?? tagValues(p, 'adult')[0]
      expect(kindOf(answer)).toBe(kindOf(stem))
      for (const c of q.choices) if (c.id !== q.answer) expect(kindOf(getPhoto(c.id)!)).not.toBe(kindOf(stem))
    }
  })
})

describe('adaptive picker', () => {
  it('never repeats a question right away', () => {
    const picker = new QuizPicker('volcano', () => ({}), 7)
    let last = ''
    let lastSkill = ''
    for (let i = 0; i < 400; i++) {
      const q = picker.next()
      expect(q.id).not.toBe(last)
      expect(q.skill).not.toBe(lastSkill)
      last = q.id
      lastSkill = q.skill
    }
  })

  it('only asks skills unlocked up to the current world', () => {
    const allowedSkills = new Set(skillsUpTo('meadow'))
    const picker = new QuizPicker('meadow', () => ({}), 3)
    for (let i = 0; i < 200; i++) expect(allowedSkills.has(picker.next().skill)).toBe(true)
  })

  it('serves weak skills about 70% of the time', () => {
    let m: Mastery = {}
    for (let i = 0; i < 6; i++) {
      m = recordAnswer(m, 'sub10', false)
      m = recordAnswer(m, 'sci-weather', false)
    }
    for (const s of skillsUpTo('coast')) if (s !== 'sub10' && s !== 'sci-weather') for (let i = 0; i < 5; i++) m = recordAnswer(m, s, true)
    const picker = new QuizPicker('coast', () => m, 11)
    let weak = 0
    const n = 1000
    for (let i = 0; i < n; i++) {
      const s = picker.next().skill
      if (s === 'sub10' || s === 'sci-weather') weak++
    }
    expect(weak / n).toBeGreaterThan(0.5)
    expect(weak / n).toBeLessThan(0.85)
  })

  it('mixes math and science', () => {
    const picker = new QuizPicker('coast', () => ({}), 5)
    let science = 0
    for (let i = 0; i < 400; i++) if (getSkill(picker.next().skill).subject === 'science') science++
    expect(science).toBeGreaterThan(120)
    expect(science).toBeLessThan(280)
  })
})
