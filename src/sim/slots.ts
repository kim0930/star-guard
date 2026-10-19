import { nearestOnPath, pointAt, directionAt, type Path, type Vec } from './path'

export const worldWidth = 1280
export const worldHeight = 720

export function makeSlots(path: Path, castle: Vec, limit = 10): Vec[] {
  const slots: Vec[] = []
  const step = 110
  for (let d = 90; d < path.total - 40 && slots.length < limit; d += step) {
    const p = pointAt(path, d)
    const dir = directionAt(path, d)
    const normal = { x: -dir.y, y: dir.x }
    for (const side of [1, -1]) {
      const c = { x: p.x + normal.x * 88 * side, y: p.y + normal.y * 88 * side }
      if (c.x < 60 || c.x > worldWidth - 60 || c.y < 60 || c.y > worldHeight - 60) continue
      if (nearestOnPath(path, c).gap < 72) continue
      if (Math.hypot(c.x - castle.x, c.y - castle.y) < 110) continue
      if (slots.some((s) => Math.hypot(s.x - c.x, s.y - c.y) < 112)) continue
      slots.push({ x: Math.round(c.x), y: Math.round(c.y) })
      if (slots.length >= limit) break
    }
  }
  return slots
}
