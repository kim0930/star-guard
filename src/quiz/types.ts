import type { SkillId } from './skills'

export type CountItem = 'apple' | 'star' | 'fish' | 'flower' | 'shell' | 'gem'
export type ShapeKind = 'circle' | 'square' | 'triangle' | 'rectangle' | 'hexagon' | 'pentagon'
export type CoinKind = 'penny' | 'nickel' | 'dime' | 'quarter'

export type Visual =
  | { kind: 'count'; item: CountItem; n: number }
  | { kind: 'sum'; item: CountItem; a: number; b: number; op: '+' | '-' }
  | { kind: 'blocks'; tens: number; ones: number }
  | { kind: 'clock'; hour: number; minute: 0 | 30 }
  | { kind: 'coins'; coins: CoinKind[] }
  | { kind: 'shape'; shape: ShapeKind; rotate?: number }
  | { kind: 'split'; shape: 'circle' | 'rectangle'; parts: number; equal: boolean }
  | { kind: 'bar'; length: number; color: string }
  | { kind: 'text'; text: string }
  | { kind: 'photo'; photo: string }

export type Choice = {
  id: string
  label?: string
  visual?: Visual
}

export type Question = {
  id: string
  skill: SkillId
  prompt: string
  speak: string
  stem?: Visual
  choices: Choice[]
  answer: string
  hint: string
  hintVisual?: Visual
  reveal: string
}
