import { photos as allPhotos, tagValues, type Photo } from '../content/photos'
import { pick, shuffle, type Rng } from './rng'
import type { SkillId } from './skills'
import type { Choice, Question } from './types'

type Gen = (rng: Rng, pool: Photo[]) => Question | undefined

const has = (p: Photo, category: string, value?: string) =>
  p.tags.some((t) => (value === undefined ? t.startsWith(`${category}:`) : t === `${category}:${value}`))

function withTag(pool: Photo[], category: string, value?: string) {
  return pool.filter((p) => has(p, category, value))
}

function take(rng: Rng, list: Photo[], n: number, not: Photo[] = []) {
  const ids = new Set(not.map((p) => p.id))
  const unique = [...new Map(list.map((p) => [p.id, p])).values()]
  return shuffle(
    rng,
    unique.filter((p) => !ids.has(p.id))
  ).slice(0, n)
}

const photoChoice = (p: Photo): Choice => ({ id: p.id, visual: { kind: 'photo', photo: p.id } })
const textChoice = (value: string, label = value): Choice => ({ id: `t:${value}`, label })

function photoPick(
  skill: SkillId,
  rng: Rng,
  right: Photo[],
  wrong: Photo[],
  text: { prompt: string; speak?: string; hint: string; reveal: (p: Photo) => string },
  wrongCount = 2
): Question | undefined {
  if (right.length === 0 || wrong.length < wrongCount) return undefined
  const answer = pick(rng, right)
  const others = take(rng, wrong, wrongCount, [answer])
  if (others.length < wrongCount) return undefined
  const helper = take(rng, right, 1, [answer])[0]
  return {
    id: `${skill}:${answer.id}:${text.prompt}`,
    skill,
    prompt: text.prompt,
    speak: text.speak ?? text.prompt,
    choices: shuffle(rng, [answer, ...others]).map(photoChoice),
    answer: answer.id,
    hint: text.hint,
    hintVisual: helper ? { kind: 'photo', photo: helper.id } : undefined,
    reveal: text.reveal(answer),
  }
}

function photoStem(
  skill: SkillId,
  rng: Rng,
  stems: Photo[],
  category: string,
  values: string[],
  text: { prompt: string; speak?: string; hint: (v: string) => string; reveal: (p: Photo, v: string) => string; label?: (v: string) => string },
  choiceCount = 3
): Question | undefined {
  if (stems.length === 0) return undefined
  const stem = pick(rng, stems)
  const value = tagValues(stem, category)[0]
  if (!value) return undefined
  const others = shuffle(
    rng,
    values.filter((v) => v !== value)
  ).slice(0, choiceCount - 1)
  if (others.length < choiceCount - 1) return undefined
  const label = text.label ?? ((v: string) => v)
  return {
    id: `${skill}:${stem.id}`,
    skill,
    prompt: text.prompt,
    speak: text.speak ?? text.prompt,
    stem: { kind: 'photo', photo: stem.id },
    choices: shuffle(rng, [value, ...others]).map((v) => textChoice(v, label(v))),
    answer: `t:${value}`,
    hint: text.hint(value),
    reveal: text.reveal(stem, value),
  }
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

const living: Gen = (rng, pool) => {
  if (rng() < 0.65) {
    return photoPick('sci-living', rng, withTag(pool, 'living', 'yes'), withTag(pool, 'living', 'no'), {
      prompt: 'Which one is alive?',
      hint: 'Living things grow, need food and water, and can make more of their own kind.',
      reveal: (p) => `The ${p.label} is alive. It grows and needs food and water.`,
    })
  }
  return photoPick('sci-living', rng, withTag(pool, 'living', 'no'), withTag(pool, 'living', 'yes'), {
    prompt: 'Which one is NOT alive?',
    speak: 'Which one is not alive?',
    hint: 'Something that is not alive does not eat, drink, or grow.',
    reveal: (p) => `The ${p.label} is not alive. It does not eat or grow.`,
  })
}

const plantNeeds: Gen = (rng, pool) =>
  photoPick('sci-plantneeds', rng, withTag(pool, 'plantneed', 'yes'), withTag(pool, 'plantneed', 'no'), {
    prompt: 'What does a plant need to grow?',
    hint: 'Plants need water, sunlight, air, and soil.',
    reveal: (p) => `Plants need ${p.label === 'sunlight' ? 'sunlight' : p.label === 'soil' ? 'soil' : 'water'} to grow.`,
  })

const weatherWords: Record<string, string> = {
  sunny: 'sunny',
  rainy: 'rainy',
  snowy: 'snowy',
  stormy: 'stormy',
  cloudy: 'cloudy',
  foggy: 'foggy',
}

const weatherClue: Record<string, string> = {
  sunny: 'Look for bright sunshine and blue sky.',
  rainy: 'Look for water falling, umbrellas, or puddles.',
  snowy: 'Look for white snow on the ground.',
  stormy: 'Look for lightning in dark clouds.',
  cloudy: 'Look for a gray sky full of clouds.',
  foggy: 'Look for a misty, blurry air.',
}

const weather: Gen = (rng, pool) => {
  const stems = withTag(pool, 'weather')
  const values = [...new Set(stems.flatMap((p) => tagValues(p, 'weather')))]
  if (rng() < 0.5 && values.length >= 3) {
    const target = pick(rng, values)
    return photoPick(
      'sci-weather',
      rng,
      withTag(pool, 'weather', target),
      stems.filter((p) => !has(p, 'weather', target)),
      {
        prompt: `Which picture shows ${target === 'stormy' ? 'a stormy' : `a ${target}`} day?`,
        hint: weatherClue[target],
        reveal: () => `This picture shows ${target} weather.`,
      }
    )
  }
  return photoStem('sci-weather', rng, stems, 'weather', values, {
    prompt: 'What is the weather like?',
    hint: (v) => weatherClue[v],
    reveal: (_p, v) => `It is ${weatherWords[v]}.`,
    label: cap,
  })
}

const sunWarm: Gen = (rng, pool) => {
  if (rng() < 0.6) {
    return photoPick('sci-sunwarm', rng, withTag(pool, 'warm', 'sun'), withTag(pool, 'warm', 'shade'), {
      prompt: 'Where would the ground feel warmer?',
      hint: 'Sunlight warms the ground. Shade blocks the sunlight.',
      reveal: () => 'The ground in the sun is warmer. Sunlight warms the Earth.',
    }, 1)
  }
  return photoPick('sci-sunwarm', rng, withTag(pool, 'warmer', 'yes'), withTag(pool, 'warmer', 'no').concat(withTag(pool, 'sky', 'night')), {
    prompt: 'What gives the Earth light and heat?',
    hint: 'It shines in the daytime sky and is very hot.',
    reveal: () => 'The Sun gives the Earth light and heat.',
  })
}

const sky: Gen = (rng, pool) => {
  const roll = rng()
  if (roll < 0.4) {
    return photoStem('sci-sky', rng, withTag(pool, 'sky'), 'sky', ['day', 'night'], {
      prompt: 'Is it day or night?',
      hint: (v) => (v === 'day' ? 'Is the sky bright?' : 'Is the sky dark?'),
      reveal: (_p, v) => (v === 'day' ? 'It is day. The Sun lights up the sky.' : 'It is night. The sky is dark.'),
      label: cap,
    }, 2)
  }
  if (roll < 0.7) {
    return photoPick('sci-sky', rng, withTag(pool, 'sky', 'night'), withTag(pool, 'sky', 'day'), {
      prompt: 'Which picture shows the night sky?',
      hint: 'Stars are easiest to see when the sky is dark.',
      reveal: () => 'At night we can see the Moon and stars.',
    })
  }
  return photoPick('sci-sky', rng, withTag(pool, 'sky', 'day'), withTag(pool, 'sky', 'night'), {
    prompt: 'Which picture shows the daytime sky?',
    hint: 'In the day, the Sun makes the sky bright.',
    reveal: () => 'The bright sky is daytime.',
  })
}

const seasonClue: Record<string, string> = {
  winter: 'Winter is the coldest season. It can snow.',
  spring: 'In spring, flowers bloom and trees get new leaves.',
  summer: 'Summer is the hottest season, with long sunny days.',
  fall: 'In fall, leaves change color and drop from trees.',
}

const seasons: Gen = (rng, pool) => {
  const stems = withTag(pool, 'season')
  if (rng() < 0.6) {
    return photoStem('sci-seasons', rng, stems, 'season', ['winter', 'spring', 'summer', 'fall'], {
      prompt: 'What season is it?',
      hint: (v) => seasonClue[v],
      reveal: (_p, v) => `It is ${v}. ${seasonClue[v]}`,
      label: cap,
    }, 4)
  }
  const target = pick(rng, ['winter', 'spring', 'summer', 'fall'])
  const prompts: Record<string, string> = {
    winter: 'Which season is the coldest?',
    spring: 'In which season do flowers start to bloom?',
    summer: 'Which season is the hottest?',
    fall: 'In which season do leaves turn orange and fall?',
  }
  return photoPick('sci-seasons', rng, withTag(stems, 'season', target), stems.filter((p) => !has(p, 'season', target)), {
    prompt: prompts[target],
    hint: seasonClue[target],
    reveal: () => `${cap(target)}! ${seasonClue[target]}`,
  })
}

const partPrompts: Record<string, { prompt: string; hint: string; reveal: (p: Photo) => string }> = {
  fins: {
    prompt: 'Which animal uses fins to swim?',
    hint: 'Fins are flat parts that push through water.',
    reveal: (p) => `The ${p.label} swims with its fins.`,
  },
  wings: {
    prompt: 'Which animal uses wings to fly?',
    hint: 'Wings flap to lift an animal into the air.',
    reveal: (p) => `The ${p.label} flies with its wings.`,
  },
  shell: {
    prompt: 'Which animal has a hard shell to stay safe?',
    hint: 'A shell is a hard cover. Some animals can hide inside.',
    reveal: (p) => `The ${p.label} hides in its shell to stay safe.`,
  },
  trunk: {
    prompt: 'Which animal uses its trunk to grab food and drink?',
    hint: 'A trunk is a long nose.',
    reveal: (p) => `The ${p.label} uses its long trunk like a hand.`,
  },
  longneck: {
    prompt: 'Which animal has a long neck to reach high leaves?',
    hint: 'Look for the tallest animal.',
    reveal: (p) => `The ${p.label} stretches its long neck up to the treetops.`,
  },
  spines: {
    prompt: 'Which animal has sharp spines to stay safe?',
    hint: 'Spines are pointy, like needles.',
    reveal: (p) => `The ${p.label} has spines that keep it safe.`,
  },
}

const body: Gen = (rng, pool) => {
  const parts = Object.keys(partPrompts).filter((k) => withTag(pool, 'part', k).length > 0)
  if (parts.length < 2) return undefined
  const part = pick(rng, parts)
  const text = partPrompts[part]
  return photoPick('sci-body', rng, withTag(pool, 'part', part), withTag(pool, 'part').filter((p) => !has(p, 'part', part)), text)
}

const babies: Gen = (rng, pool) => {
  const babyPhotos = withTag(pool, 'baby')
  const kinds = babyPhotos
    .map((b) => tagValues(b, 'baby')[0])
    .filter((k) => withTag(pool, 'adult', k).length > 0)
  if (kinds.length === 0) return undefined
  const kind = pick(rng, kinds)
  const baby = pick(rng, withTag(babyPhotos, 'baby', kind))
  const adults = withTag(pool, 'adult')
  if (rng() < 0.55) {
    const right = withTag(adults, 'adult', kind)
    const wrong = adults.filter((p) => !has(p, 'adult', kind))
    const q = photoPick('sci-babies', rng, right, wrong, {
      prompt: `This baby is a ${baby.label}. Who will it grow up to be?`,
      hint: 'Babies look a lot like their parents.',
      reveal: (p) => `A ${baby.label} grows up to be a ${p.label}.`,
    })
    if (!q) return undefined
    return { ...q, id: `${q.id}:${baby.id}`, stem: { kind: 'photo', photo: baby.id }, hintVisual: undefined }
  }
  const adult = pick(rng, withTag(adults, 'adult', kind))
  const q = photoPick('sci-babies', rng, [baby], babyPhotos.filter((p) => !has(p, 'baby', kind)), {
    prompt: `Which one is the baby of this ${adult.label}?`,
    hint: 'Look for a baby with the same body shape, color, or fur.',
    reveal: (p) => `The ${p.label} is the baby. It will grow up to be a ${adult.label}.`,
  })
  if (!q) return undefined
  return { ...q, id: `${q.id}:${adult.id}`, stem: { kind: 'photo', photo: adult.id } }
}

const habitatNames: Record<string, string> = {
  ocean: 'the ocean',
  desert: 'the desert',
  forest: 'the forest',
  arctic: 'the icy Arctic',
  pond: 'a pond',
}

const habitatConflicts: Record<string, string[]> = {
  ocean: ['arctic'],
  arctic: ['ocean'],
  pond: [],
  forest: [],
  desert: [],
}

const habitatClue: Record<string, string> = {
  ocean: 'Ocean animals swim in salty sea water.',
  desert: 'Desert animals can live where it is hot, dry, and sandy.',
  forest: 'Forest animals live among lots of trees.',
  arctic: 'Arctic animals have thick fur or fat to stay warm on the ice.',
  pond: 'Pond animals live in small, calm fresh water.',
}

const habitats: Gen = (rng, pool) => {
  const animals = withTag(pool, 'habitat')
  const kinds = [...new Set(animals.flatMap((p) => tagValues(p, 'habitat')))]
  if (kinds.length < 3) return undefined
  const scenes = withTag(pool, 'scene')
  const sceneKinds = scenes.map((s) => tagValues(s, 'scene')[0])
  const animalsWithScene = animals.filter((a) => sceneKinds.includes(tagValues(a, 'habitat')[0]))
  if (rng() < 0.4 && animalsWithScene.length > 0 && scenes.length >= 3) {
    const animal = pick(rng, animalsWithScene)
    const home = tagValues(animal, 'habitat')[0]
    const conflict = habitatConflicts[home] ?? []
    const q = photoPick(
      'sci-habitats',
      rng,
      withTag(scenes, 'scene', home),
      scenes.filter((s) => {
        const k = tagValues(s, 'scene')[0]
        return k !== home && !conflict.includes(k)
      }),
      {
        prompt: `Where does the ${animal.label} live?`,
        hint: habitatClue[home],
        reveal: () => `The ${animal.label} lives in ${habitatNames[home]}.`,
      }
    )
    if (!q) return undefined
    return { ...q, id: `${q.id}:${animal.id}`, stem: { kind: 'photo', photo: animal.id }, hintVisual: undefined }
  }
  const home = pick(rng, kinds)
  const conflict = habitatConflicts[home] ?? []
  return photoPick(
    'sci-habitats',
    rng,
    withTag(animals, 'habitat', home),
    animals.filter((a) => {
      const k = tagValues(a, 'habitat')[0]
      return k !== home && !conflict.includes(k)
    }),
    {
      prompt: `Which animal lives in ${habitatNames[home]}?`,
      hint: habitatClue[home],
      reveal: (p) => `The ${p.label} lives in ${habitatNames[home]}.`,
    }
  )
}

const materials: Gen = (rng, pool) => {
  const roll = rng()
  if (roll < 0.45) {
    return photoPick('sci-materials', rng, withTag(pool, 'state', 'liquid'), withTag(pool, 'state', 'solid'), {
      prompt: 'Which one is a liquid?',
      hint: 'A liquid can flow and be poured. It takes the shape of its cup.',
      reveal: (p) => `The ${p.label} is a liquid. You can pour it.`,
    })
  }
  if (roll < 0.7) {
    return photoPick('sci-materials', rng, withTag(pool, 'state', 'solid'), withTag(pool, 'state', 'liquid').concat(withTag(pool, 'state', 'gas')), {
      prompt: 'Which one is a solid?',
      hint: 'A solid keeps its own shape.',
      reveal: (p) => `The ${p.label} is a solid. It keeps its shape.`,
    })
  }
  const soft = rng() < 0.5
  const want = soft ? 'soft' : 'hard'
  return photoPick('sci-materials', rng, withTag(pool, 'texture', want), withTag(pool, 'texture', soft ? 'hard' : 'soft'), {
    prompt: `Which one feels ${want}?`,
    hint: soft ? 'Soft things squish when you squeeze them.' : 'Hard things do not squish when you press them.',
    reveal: (p) => `The ${p.label} is ${want}.`,
  })
}

const landNames: Record<string, string> = {
  mountain: 'mountain',
  river: 'river',
  lake: 'lake',
  volcano: 'volcano',
  island: 'island',
  waterfall: 'waterfall',
  glacier: 'glacier',
  ocean: 'ocean',
}

const landClue: Record<string, string> = {
  mountain: 'A mountain is very tall land with a peak.',
  river: 'A river is water that flows across the land.',
  lake: 'A lake is a big pool of water with land all around it.',
  volcano: 'A volcano is a mountain that can erupt with hot lava.',
  island: 'An island is land with water all around it.',
  waterfall: 'A waterfall is a river falling over a cliff.',
  glacier: 'A glacier is a huge, slow river of ice.',
  ocean: 'The ocean is a huge body of salty water.',
}

const landforms: Gen = (rng, pool) => {
  if (rng() < 0.65) {
    const stems = withTag(pool, 'land')
    const values = [...new Set(stems.flatMap((p) => tagValues(p, 'land')))]
    return photoStem('sci-landforms', rng, stems, 'land', values, {
      prompt: 'What is this?',
      speak: 'What do you see in this picture?',
      hint: (v) => landClue[v],
      reveal: (_p, v) => `This is ${/^[aeiou]/.test(v) ? 'an' : 'a'} ${landNames[v]}. ${landClue[v]}`,
      label: (v) => cap(landNames[v] ?? v),
    })
  }
  return photoPick('sci-landforms', rng, withTag(pool, 'water', 'frozen'), withTag(pool, 'water', 'liquid'), {
    prompt: 'Where is the water frozen solid?',
    hint: 'Frozen water is ice. It is white or blue and hard.',
    reveal: (p) => `The water in the ${p.label} is frozen into ice.`,
  })
}

const pollinators: Gen = (rng, pool) => {
  const roll = rng()
  if (roll < 0.45) {
    const pollinatorIds = new Set(withTag(pool, 'pollinator', 'yes').map((p) => p.id))
    const nonPollinators = withTag(pool, 'pollinator', 'no')
      .concat(withTag(pool, 'habitat'))
      .filter((p) => !pollinatorIds.has(p.id))
    return photoPick('sci-pollinators', rng, withTag(pool, 'pollinator', 'yes'), nonPollinators, {
      prompt: 'Which animal helps flowers by carrying pollen?',
      hint: 'Pollen sticks to animals that visit flowers to drink sweet nectar.',
      reveal: (p) => `The ${p.label} visits flowers and carries pollen from one to another.`,
    })
  }
  if (roll < 0.8) {
    return photoPick('sci-pollinators', rng, withTag(pool, 'seed', 'yes'), withTag(pool, 'seed', 'no'), {
      prompt: 'Which one has seeds that can grow into a new plant?',
      hint: 'Seeds come from plants. Some are in cones, nuts, or flowers.',
      reveal: (p) => `The ${p.label} ${p.label.endsWith('s') ? 'are' : 'is'} full of seeds.`,
    })
  }
  return photoPick(
    'sci-pollinators',
    rng,
    withTag(pool, 'seedhelper', 'yes'),
    withTag(pool, 'habitat').filter((p) => !has(p, 'seedhelper')),
    {
      prompt: 'Which animal helps plant trees by burying nuts and acorns?',
      hint: 'This furry animal hides nuts to eat later and forgets some of them.',
      reveal: (p) => `The ${p.label} buries acorns. Forgotten acorns grow into new oak trees!`,
    }
  )
}

const generators: Partial<Record<SkillId, Gen>> = {
  'sci-living': living,
  'sci-plantneeds': plantNeeds,
  'sci-weather': weather,
  'sci-sunwarm': sunWarm,
  'sci-sky': sky,
  'sci-seasons': seasons,
  'sci-body': body,
  'sci-babies': babies,
  'sci-habitats': habitats,
  'sci-materials': materials,
  'sci-landforms': landforms,
  'sci-pollinators': pollinators,
}

export function scienceQuestion(skill: SkillId, rng: Rng, pool: Photo[] = allPhotos): Question | undefined {
  const gen = generators[skill]
  if (!gen) return undefined
  for (let i = 0; i < 6; i++) {
    const q = gen(rng, pool)
    if (q) return q
  }
  return undefined
}

export const scienceSkills = Object.keys(generators) as SkillId[]
