import { int, pick, shuffle, type Rng } from './rng'
import type { SkillId } from './skills'
import type { Choice, CoinKind, CountItem, Question, ShapeKind, Visual } from './types'

const items: { item: CountItem; one: string; many: string }[] = [
  { item: 'apple', one: 'apple', many: 'apples' },
  { item: 'star', one: 'star', many: 'stars' },
  { item: 'fish', one: 'fish', many: 'fish' },
  { item: 'flower', one: 'flower', many: 'flowers' },
  { item: 'shell', one: 'shell', many: 'shells' },
  { item: 'gem', one: 'gem', many: 'gems' },
]

export const coinValue: Record<CoinKind, number> = { penny: 1, nickel: 5, dime: 10, quarter: 25 }

function numberChoices(rng: Rng, answer: number, min: number, max: number, near: number[] = [], format = (n: number) => String(n)): Choice[] {
  const set = new Set<number>([answer])
  for (const n of shuffle(rng, near)) {
    if (set.size >= 4) break
    if (n >= min && n <= max) set.add(n)
  }
  let spread = 1
  while (set.size < 4 && spread < 200) {
    const n = answer + (rng() < 0.5 ? -spread : spread)
    if (n >= min && n <= max) set.add(n)
    spread += rng() < 0.6 ? 1 : 2
  }
  return shuffle(rng, [...set]).map((n) => ({ id: `n${n}`, label: format(n) }))
}

function q(skill: SkillId, key: string, rest: Omit<Question, 'id' | 'skill'>): Question {
  return { id: `${skill}:${key}`, skill, ...rest }
}

function count20(rng: Rng) {
  const n = int(rng, 3, 20)
  const it = pick(rng, items)
  return q('count20', `${it.item}${n}`, {
    prompt: `How many ${it.many}?`,
    speak: `How many ${it.many} do you see?`,
    stem: { kind: 'count', item: it.item, n },
    choices: numberChoices(rng, n, 1, 20, [n - 1, n + 1, n + 2, n - 2]),
    answer: `n${n}`,
    hint: 'Touch each one with your finger as you count. Each row has 5.',
    reveal: `There are ${n} ${n === 1 ? it.one : it.many}.`,
  })
}

function compare(rng: Rng) {
  const a = int(rng, 1, 10)
  let b = int(rng, 1, 10)
  while (b === a) b = int(rng, 1, 10)
  const more = rng() < 0.6
  const it = pick(rng, items)
  const target = more ? (a > b ? 'A' : 'B') : a < b ? 'A' : 'B'
  const word = more ? 'more' : 'fewer'
  return q('compare', `${a}-${b}-${word}`, {
    prompt: `Which group has ${word} ${it.many}?`,
    speak: `Which group has ${word} ${it.many}?`,
    choices: [
      { id: 'A', visual: { kind: 'count', item: it.item, n: a } },
      { id: 'B', visual: { kind: 'count', item: it.item, n: b } },
    ],
    answer: target,
    hint: `Count each group. The group with ${word} has the ${more ? 'bigger' : 'smaller'} number.`,
    reveal: `One group has ${a} and the other has ${b}. ${Math.max(a, b)} is more than ${Math.min(a, b)}.`,
  })
}

function add10(rng: Rng) {
  const a = int(rng, 1, 8)
  const b = int(rng, 1, 10 - a)
  const it = pick(rng, items)
  return q('add10', `${a}+${b}`, {
    prompt: `${a} + ${b} = ?`,
    speak: `What is ${a} plus ${b}?`,
    stem: { kind: 'sum', item: it.item, a, b, op: '+' },
    choices: numberChoices(rng, a + b, 0, 12, [a + b - 1, a + b + 1, a]),
    answer: `n${a + b}`,
    hint: `Start at ${a}. Count on ${b} more.`,
    reveal: `${a} + ${b} = ${a + b}`,
  })
}

function sub10(rng: Rng) {
  const a = int(rng, 3, 10)
  const b = int(rng, 1, a - 1)
  const it = pick(rng, items)
  return q('sub10', `${a}-${b}`, {
    prompt: `${a} − ${b} = ?`,
    speak: `What is ${a} take away ${b}?`,
    stem: { kind: 'sum', item: it.item, a, b, op: '-' },
    choices: numberChoices(rng, a - b, 0, 10, [a - b + 1, a - b - 1, a + b]),
    answer: `n${a - b}`,
    hint: `Start with ${a}. Take away ${b}. Count what is left.`,
    reveal: `${a} − ${b} = ${a - b}`,
  })
}

function addsub20(rng: Rng) {
  if (rng() < 0.55) {
    const a = int(rng, 4, 9)
    const b = int(rng, 11 - a, 9)
    const toTen = 10 - a
    return q('addsub20', `${a}+${b}`, {
      prompt: `${a} + ${b} = ?`,
      speak: `What is ${a} plus ${b}?`,
      stem: { kind: 'text', text: `${a} + ${b} = ?` },
      choices: numberChoices(rng, a + b, 0, 20, [a + b - 1, a + b + 1, a + b - 10]),
      answer: `n${a + b}`,
      hint: `Make a ten first: ${a} + ${toTen} = 10. Then add ${b - toTen} more.`,
      hintVisual: { kind: 'blocks', tens: 1, ones: b - toTen },
      reveal: `${a} + ${b} = ${a + b}`,
    })
  }
  const a = int(rng, 11, 18)
  const b = int(rng, a - 9, 9)
  return q('addsub20', `${a}-${b}`, {
    prompt: `${a} − ${b} = ?`,
    speak: `What is ${a} minus ${b}?`,
    stem: { kind: 'text', text: `${a} − ${b} = ?` },
    choices: numberChoices(rng, a - b, 0, 20, [a - b + 1, a - b - 1, a - b + 10]),
    answer: `n${a - b}`,
    hint: `Think addition: ${b} + what = ${a}? Count up from ${b} to ${a}.`,
    reveal: `${a} − ${b} = ${a - b}, because ${b} + ${a - b} = ${a}.`,
  })
}

function missing(rng: Rng) {
  const form = int(rng, 0, 2)
  if (form < 2) {
    const c = int(rng, 8, 20)
    const known = int(rng, 2, c - 2)
    const unknown = c - known
    const text = form === 0 ? `${known} + ? = ${c}` : `? + ${known} = ${c}`
    return q('missing', text, {
      prompt: text,
      speak: form === 0 ? `${known} plus what number makes ${c}?` : `What number plus ${known} makes ${c}?`,
      stem: { kind: 'text', text },
      choices: numberChoices(rng, unknown, 0, 20, [unknown + 1, unknown - 1, c]),
      answer: `n${unknown}`,
      hint: `Count up from ${known} until you get to ${c}. How many did you count?`,
      reveal: `${known} + ${unknown} = ${c}`,
    })
  }
  const a = int(rng, 8, 20)
  const unknown = int(rng, 1, a - 1)
  const c = a - unknown
  const text = `${a} − ? = ${c}`
  return q('missing', text, {
    prompt: text,
    speak: `${a} take away what number leaves ${c}?`,
    stem: { kind: 'text', text },
    choices: numberChoices(rng, unknown, 0, 20, [unknown + 1, unknown - 1, c]),
    answer: `n${unknown}`,
    hint: `Count up from ${c} to ${a}. That is how many were taken away.`,
    reveal: `${a} − ${unknown} = ${c}`,
  })
}

function placevalue(rng: Rng) {
  const tens = int(rng, 1, 9)
  const ones = int(rng, 0, 9)
  const n = tens * 10 + ones
  const near = [ones * 10 + tens, n + 10, n - 10, n + 1, n - 1].filter((x) => x !== n)
  if (rng() < 0.5) {
    return q('placevalue', `blocks${n}`, {
      prompt: 'What number do the blocks show?',
      speak: 'Count the tens and the ones. What number is it?',
      stem: { kind: 'blocks', tens, ones },
      choices: numberChoices(rng, n, 1, 99, near),
      answer: `n${n}`,
      hint: `Each long stick is 10. Count the sticks by tens, then add the little cubes.`,
      reveal: `${tens} tens and ${ones} ones make ${n}.`,
    })
  }
  return q('placevalue', `words${n}`, {
    prompt: `${tens} tens and ${ones} ones`,
    speak: `What number has ${tens} tens and ${ones} ones?`,
    stem: { kind: 'text', text: `${tens} tens + ${ones} ones` },
    choices: numberChoices(rng, n, 1, 99, near),
    answer: `n${n}`,
    hint: 'The tens digit comes first. The ones digit comes second.',
    hintVisual: { kind: 'blocks', tens, ones },
    reveal: `${tens} tens and ${ones} ones make ${n}.`,
  })
}

const barColors = ['#ef476f', '#118ab2', '#06d6a0', '#ffd166']

function length(rng: Rng) {
  const lengths = shuffle(rng, [int(rng, 25, 40), int(rng, 52, 68), int(rng, 80, 100)])
  const longest = rng() < 0.5
  const target = longest ? Math.max(...lengths) : Math.min(...lengths)
  const colors = shuffle(rng, barColors)
  const word = longest ? 'longest' : 'shortest'
  return q('length', `${word}-${lengths.join('-')}`, {
    prompt: `Which ribbon is the ${word}?`,
    speak: `Which ribbon is the ${word}?`,
    choices: lengths.map((len, i) => ({ id: `L${len}`, visual: { kind: 'bar', length: len, color: colors[i] } })),
    answer: `L${target}`,
    hint: 'All the ribbons start at the same line. Look at where each one ends.',
    reveal: `This ribbon is the ${word}.`,
  })
}

function addsub100(rng: Rng) {
  if (rng() < 0.5) {
    const a = int(rng, 12, 68)
    const b = int(rng, 11, Math.min(31, 99 - a))
    const t = Math.floor(a / 10) * 10 + Math.floor(b / 10) * 10
    return q('addsub100', `${a}+${b}`, {
      prompt: `${a} + ${b} = ?`,
      speak: `What is ${a} plus ${b}?`,
      stem: { kind: 'text', text: `${a} + ${b} = ?` },
      choices: numberChoices(rng, a + b, 0, 100, [a + b + 10, a + b - 10, a + b + 1, a + b - 1]),
      answer: `n${a + b}`,
      hint: `Add the tens: ${Math.floor(a / 10) * 10} + ${Math.floor(b / 10) * 10} = ${t}. Then add the ones: ${a % 10} + ${b % 10}.`,
      reveal: `${a} + ${b} = ${a + b}`,
    })
  }
  const a = int(rng, 30, 99)
  const b = int(rng, 11, a - 10)
  return q('addsub100', `${a}-${b}`, {
    prompt: `${a} − ${b} = ?`,
    speak: `What is ${a} minus ${b}?`,
    stem: { kind: 'text', text: `${a} − ${b} = ?` },
    choices: numberChoices(rng, a - b, 0, 100, [a - b + 10, a - b - 10, a - b + 1, a - b - 1]),
    answer: `n${a - b}`,
    hint: `Take away the tens first: ${a} − ${Math.floor(b / 10) * 10} = ${a - Math.floor(b / 10) * 10}. Then take away ${b % 10} more.`,
    reveal: `${a} − ${b} = ${a - b}`,
  })
}

function skipcount(rng: Rng) {
  const by = pick(rng, [2, 5, 10])
  const start = by * int(rng, 0, by === 10 ? 6 : by === 5 ? 12 : 20)
  const seq = [0, 1, 2, 3].map((i) => start + by * i)
  const hole = rng() < 0.6 ? 3 : int(rng, 1, 2)
  const answer = seq[hole]
  const text = seq.map((n, i) => (i === hole ? '?' : String(n))).join(', ')
  return q('skipcount', `${by}-${text}`, {
    prompt: `Count by ${by}s: ${text}`,
    speak: `Count by ${by}s. ${seq.map((n, i) => (i === hole ? 'what number' : String(n))).join(', ')}?`,
    stem: { kind: 'text', text },
    choices: numberChoices(rng, answer, 0, 200, [answer + 1, answer - 1, answer + by, answer - by]),
    answer: `n${answer}`,
    hint: `Each number is ${by} more than the one before it.`,
    reveal: `${seq.join(', ')}`,
  })
}

const shapeInfo: Record<ShapeKind, string> = {
  circle: 'A circle is round. It has no sides and no corners.',
  square: 'A square has 4 sides that are all the same length.',
  triangle: 'A triangle has 3 sides and 3 corners.',
  rectangle: 'A rectangle has 4 sides. Two are long and two are short.',
  hexagon: 'A hexagon has 6 sides and 6 corners.',
  pentagon: 'A pentagon has 5 sides and 5 corners.',
}

function shapes(rng: Rng) {
  const all = Object.keys(shapeInfo) as ShapeKind[]
  const target = pick(rng, all)
  const others = shuffle(
    rng,
    all.filter((s) => s !== target && !(target === 'square' && s === 'rectangle') && !(target === 'rectangle' && s === 'square')),
  ).slice(0, 3)
  return q('shapes', `${target}-${others.join('-')}`, {
    prompt: `Which one is a ${target}?`,
    speak: `Which one is a ${target}?`,
    choices: shuffle(rng, [target, ...others]).map((s) => ({
      id: s,
      visual: { kind: 'shape', shape: s, rotate: s === 'circle' ? 0 : pick(rng, [0, 15, 30, 45, 90]) },
    })),
    answer: target,
    hint: shapeInfo[target],
    reveal: shapeInfo[target],
  })
}

function fractions(rng: Rng) {
  const parts = pick(rng, [2, 4])
  const shape = pick(rng, ['circle', 'rectangle'] as const)
  const word = parts === 2 ? 'halves' : 'fourths'
  const other = parts === 2 ? 4 : 2
  const options: { id: string; visual: Visual }[] = [
    { id: 'right', visual: { kind: 'split', shape, parts, equal: true } },
    { id: 'unequal', visual: { kind: 'split', shape, parts, equal: false } },
    { id: 'other', visual: { kind: 'split', shape: shape === 'circle' ? 'rectangle' : 'circle', parts: other, equal: true } },
    { id: 'three', visual: { kind: 'split', shape, parts: 3, equal: true } },
  ]
  return q('fractions', `${word}-${shape}`, {
    prompt: `Which shape is cut into ${word}?`,
    speak: `Which shape is cut into ${word}? ${word === 'halves' ? 'Halves means 2 equal parts.' : 'Fourths means 4 equal parts.'}`,
    choices: shuffle(rng, options),
    answer: 'right',
    hint: `${word === 'halves' ? 'Halves' : 'Fourths'} means ${parts} parts that are all the same size.`,
    reveal: `This one has ${parts} equal parts. Each part is one ${parts === 2 ? 'half' : 'fourth'}.`,
  })
}

function fmtTime(h: number, m: number) {
  return `${h}:${m === 0 ? '00' : '30'}`
}

function time(rng: Rng) {
  const hour = int(rng, 1, 12)
  const minute = pick(rng, [0, 30] as const)
  const next = hour === 12 ? 1 : hour + 1
  const prev = hour === 1 ? 12 : hour - 1
  const flip = minute === 0 ? 30 : 0
  const pool = [fmtTime(hour, flip), fmtTime(next, minute), fmtTime(prev, minute), fmtTime(minute === 30 ? next : prev, flip)]
  const right = fmtTime(hour, minute)
  const wrong = shuffle(rng, [...new Set(pool.filter((t) => t !== right))]).slice(0, 3)
  return q('time', right, {
    prompt: 'What time is it?',
    speak: 'What time does the clock show?',
    stem: { kind: 'clock', hour, minute },
    choices: shuffle(rng, [right, ...wrong]).map((t) => ({ id: t, label: t })),
    answer: right,
    hint:
      minute === 0
        ? 'The long hand points straight up to 12. That means o\'clock. The short hand shows the hour.'
        : 'The long hand points down to 6. That means half past. The short hand is between two numbers. Use the smaller one.',
    reveal: `It is ${minute === 0 ? `${hour} o'clock` : `half past ${hour}`}, ${right}.`,
  })
}

function coins(rng: Rng) {
  const kinds: CoinKind[] = ['quarter', 'dime', 'nickel', 'penny']
  for (;;) {
    const n = int(rng, 2, 5)
    const list = Array.from({ length: n }, () => pick(rng, kinds))
    const total = list.reduce((sum, c) => sum + coinValue[c], 0)
    if (total > 99) continue
    const sorted = [...list].sort((a, b) => coinValue[b] - coinValue[a])
    const fmt = (v: number) => `${v}¢`
    return q('coins', sorted.join(','), {
      prompt: 'How many cents?',
      speak: 'How much money is this? Count the cents.',
      stem: { kind: 'coins', coins: sorted },
      choices: numberChoices(rng, total, 1, 99, [total + 5, total - 5, total + 10, total - 1], fmt),
      answer: `n${total}`,
      hint: 'A quarter is 25¢. A dime is 10¢. A nickel is 5¢. A penny is 1¢. Start with the biggest coin.',
      reveal: `${sorted.map((c) => coinValue[c]).join(' + ')} = ${total}¢`,
    })
  }
}

export const mathGenerators: Partial<Record<SkillId, (rng: Rng) => Question>> = {
  count20,
  compare,
  add10,
  sub10,
  addsub20,
  missing,
  placevalue,
  length,
  addsub100,
  skipcount,
  shapes,
  fractions,
  time,
  coins,
}

export function answerValue(q: Question) {
  return q.choices.find((c) => c.id === q.answer)
}
