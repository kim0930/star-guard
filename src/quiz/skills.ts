export type WorldId = 'meadow' | 'coast' | 'volcano'

export type SkillId =
  | 'count20'
  | 'compare'
  | 'add10'
  | 'sub10'
  | 'addsub20'
  | 'missing'
  | 'placevalue'
  | 'addsub100'
  | 'skipcount'
  | 'shapes'
  | 'fractions'
  | 'length'
  | 'time'
  | 'coins'
  | 'sci-living'
  | 'sci-plantneeds'
  | 'sci-weather'
  | 'sci-sunwarm'
  | 'sci-sky'
  | 'sci-seasons'
  | 'sci-body'
  | 'sci-babies'
  | 'sci-habitats'
  | 'sci-materials'
  | 'sci-pollinators'
  | 'sci-landforms'

export type Skill = {
  id: SkillId
  subject: 'math' | 'science'
  label: string
  standards: string[]
  world: WorldId
}

export const skills: Skill[] = [
  { id: 'count20', subject: 'math', label: 'Count up to 20', standards: ['K.CC.B.5'], world: 'meadow' },
  { id: 'compare', subject: 'math', label: 'More and fewer', standards: ['K.CC.C.6'], world: 'meadow' },
  { id: 'add10', subject: 'math', label: 'Add within 10', standards: ['K.OA.A.2'], world: 'meadow' },
  { id: 'sub10', subject: 'math', label: 'Subtract within 10', standards: ['K.OA.A.2'], world: 'meadow' },
  { id: 'addsub20', subject: 'math', label: 'Add and subtract within 20', standards: ['1.OA.C.6'], world: 'coast' },
  { id: 'missing', subject: 'math', label: 'Find the missing number', standards: ['1.OA.D.8'], world: 'coast' },
  { id: 'placevalue', subject: 'math', label: 'Tens and ones', standards: ['1.NBT.B.2'], world: 'coast' },
  { id: 'length', subject: 'math', label: 'Compare lengths', standards: ['1.MD.A.1'], world: 'coast' },
  { id: 'addsub100', subject: 'math', label: 'Add and subtract within 100', standards: ['2.NBT.B.5'], world: 'volcano' },
  { id: 'skipcount', subject: 'math', label: 'Skip count by 2, 5, 10', standards: ['2.NBT.A.2'], world: 'volcano' },
  { id: 'shapes', subject: 'math', label: 'Name shapes', standards: ['K.G.A.2'], world: 'volcano' },
  { id: 'fractions', subject: 'math', label: 'Halves and fourths', standards: ['1.G.A.3'], world: 'volcano' },
  { id: 'time', subject: 'math', label: 'Tell time to the hour and half hour', standards: ['1.MD.B.3'], world: 'volcano' },
  { id: 'coins', subject: 'math', label: 'Count coins', standards: ['2.MD.C.8'], world: 'volcano' },
  { id: 'sci-living', subject: 'science', label: 'Living and nonliving', standards: ['K-LS1-1'], world: 'meadow' },
  { id: 'sci-plantneeds', subject: 'science', label: 'What plants need', standards: ['K-LS1-1'], world: 'meadow' },
  { id: 'sci-weather', subject: 'science', label: 'Weather', standards: ['K-ESS2-1'], world: 'meadow' },
  { id: 'sci-sunwarm', subject: 'science', label: 'Sunlight warms the Earth', standards: ['K-PS3-1'], world: 'meadow' },
  { id: 'sci-sky', subject: 'science', label: 'Day and night sky', standards: ['1-ESS1-1'], world: 'meadow' },
  { id: 'sci-habitats', subject: 'science', label: 'Habitats', standards: ['2-LS4-1'], world: 'coast' },
  { id: 'sci-babies', subject: 'science', label: 'Babies and parents', standards: ['1-LS3-1'], world: 'coast' },
  { id: 'sci-body', subject: 'science', label: 'Animal body parts', standards: ['1-LS1-1'], world: 'coast' },
  { id: 'sci-seasons', subject: 'science', label: 'Seasons', standards: ['1-ESS1-2'], world: 'coast' },
  { id: 'sci-materials', subject: 'science', label: 'Materials and states of matter', standards: ['2-PS1-1'], world: 'volcano' },
  { id: 'sci-landforms', subject: 'science', label: 'Landforms and water', standards: ['2-ESS2-2', '2-ESS2-3'], world: 'volcano' },
  { id: 'sci-pollinators', subject: 'science', label: 'Seeds and pollinators', standards: ['2-LS2-2'], world: 'volcano' },
]

export const worldOrder: WorldId[] = ['meadow', 'coast', 'volcano']

export function getSkill(id: SkillId) {
  return skills.find((s) => s.id === id)!
}

export function skillsForWorld(world: WorldId) {
  return skills.filter((s) => s.world === world).map((s) => s.id)
}

export function skillsUpTo(world: WorldId) {
  const last = worldOrder.indexOf(world)
  return skills.filter((s) => worldOrder.indexOf(s.world) <= last).map((s) => s.id)
}
