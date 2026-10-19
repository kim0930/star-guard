export type Vec = { x: number; y: number }

export type Path = {
  points: Vec[]
  lengths: number[]
  total: number
}

export function makePath(points: Vec[]): Path {
  const lengths: number[] = []
  let total = 0
  for (let i = 0; i < points.length - 1; i++) {
    const len = Math.hypot(points[i + 1].x - points[i].x, points[i + 1].y - points[i].y)
    lengths.push(len)
    total += len
  }
  return { points, lengths, total }
}

export function pointAt(path: Path, distance: number): Vec {
  let d = Math.max(0, Math.min(path.total, distance))
  for (let i = 0; i < path.lengths.length; i++) {
    const len = path.lengths[i]
    if (d <= len || i === path.lengths.length - 1) {
      const t = len === 0 ? 0 : Math.min(1, d / len)
      const a = path.points[i]
      const b = path.points[i + 1]
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }
    }
    d -= len
  }
  return { ...path.points[path.points.length - 1] }
}

export function nearestOnPath(path: Path, p: Vec): { distance: number; gap: number } {
  let best = { distance: 0, gap: Infinity }
  let walked = 0
  for (let i = 0; i < path.lengths.length; i++) {
    const a = path.points[i]
    const b = path.points[i + 1]
    const len = path.lengths[i]
    const t = len === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / (len * len)))
    const x = a.x + (b.x - a.x) * t
    const y = a.y + (b.y - a.y) * t
    const gap = Math.hypot(p.x - x, p.y - y)
    if (gap < best.gap) best = { distance: walked + t * len, gap }
    walked += len
  }
  return best
}

export function directionAt(path: Path, distance: number): Vec {
  const a = pointAt(path, distance - 2)
  const b = pointAt(path, distance + 2)
  const len = Math.hypot(b.x - a.x, b.y - a.y) || 1
  return { x: (b.x - a.x) / len, y: (b.y - a.y) / len }
}
