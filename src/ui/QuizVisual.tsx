import { getPhoto, photoUrl } from '../content/photos'
import { coinValue } from '../quiz/math'
import type { CoinKind, CountItem, ShapeKind, Visual } from '../quiz/types'

const ink = '#1d2b3a'

function Item({ item, x, y, s, faded }: { item: CountItem; x: number; y: number; s: number; faded?: boolean }) {
  const o = faded ? 0.35 : 1
  const c = { x: x + s / 2, y: y + s / 2 }
  const r = s * 0.38
  switch (item) {
    case 'apple':
      return (
        <g opacity={o}>
          <circle cx={c.x} cy={c.y + 2} r={r} fill="#e63946" stroke={ink} strokeWidth={2} />
          <ellipse cx={c.x + 5} cy={c.y - r} rx={5} ry={3} fill="#52b788" />
        </g>
      )
    case 'star': {
      const pts = Array.from({ length: 10 }, (_, i) => {
        const rr = i % 2 === 0 ? r * 1.15 : r * 0.5
        const a = -Math.PI / 2 + (i * Math.PI) / 5
        return `${c.x + Math.cos(a) * rr},${c.y + Math.sin(a) * rr}`
      }).join(' ')
      return <polygon points={pts} fill="#ffd23f" stroke={ink} strokeWidth={2} opacity={o} />
    }
    case 'fish':
      return (
        <g opacity={o}>
          <polygon points={`${c.x + r * 0.6},${c.y} ${c.x + r * 1.2},${c.y - r * 0.6} ${c.x + r * 1.2},${c.y + r * 0.6}`} fill="#f3722c" stroke={ink} strokeWidth={2} />
          <ellipse cx={c.x - 2} cy={c.y} rx={r * 0.9} ry={r * 0.6} fill="#f9844a" stroke={ink} strokeWidth={2} />
          <circle cx={c.x - r * 0.4} cy={c.y - 2} r={2.5} fill={ink} />
        </g>
      )
    case 'flower':
      return (
        <g opacity={o}>
          {[0, 1, 2, 3, 4].map((i) => {
            const a = (i / 5) * Math.PI * 2
            return <circle key={i} cx={c.x + Math.cos(a) * r * 0.6} cy={c.y + Math.sin(a) * r * 0.6} r={r * 0.45} fill="#ff8fab" stroke={ink} strokeWidth={1.5} />
          })}
          <circle cx={c.x} cy={c.y} r={r * 0.35} fill="#ffd23f" stroke={ink} strokeWidth={1.5} />
        </g>
      )
    case 'shell':
      return (
        <g opacity={o}>
          <path d={`M ${c.x - r} ${c.y + r * 0.6} Q ${c.x} ${c.y - r * 1.6} ${c.x + r} ${c.y + r * 0.6} Z`} fill="#ffcad4" stroke={ink} strokeWidth={2} />
          <line x1={c.x} y1={c.y + r * 0.6} x2={c.x} y2={c.y - r * 0.5} stroke={ink} strokeWidth={1.5} />
        </g>
      )
    case 'gem':
      return (
        <polygon
          points={`${c.x},${c.y - r} ${c.x + r},${c.y - r * 0.2} ${c.x},${c.y + r} ${c.x - r},${c.y - r * 0.2}`}
          fill="#4cc9f0"
          stroke={ink}
          strokeWidth={2}
          opacity={o}
        />
      )
  }
}

function CountGrid({ item, n, crossed = 0, max = 5 }: { item: CountItem; n: number; crossed?: number; max?: number }) {
  const s = 36
  const cols = Math.min(max, Math.max(1, n))
  const rows = Math.ceil(n / max) || 1
  const w = cols * s + (cols > 5 ? 8 : 0)
  return (
    <svg viewBox={`0 0 ${w} ${rows * s}`} className="vis-count" style={{ width: w * 1.7, aspectRatio: `${w} / ${rows * s}` }}>
      {Array.from({ length: n }, (_, i) => {
        const col = i % max
        const row = Math.floor(i / max)
        const x = col * s + (col >= 5 ? 8 : 0)
        const faded = i >= n - crossed
        return (
          <g key={i}>
            <Item item={item} x={x} y={row * s} s={s} faded={faded} />
            {faded && <line x1={x + 4} y1={row * s + 4} x2={x + s - 4} y2={row * s + s - 4} stroke="#e63946" strokeWidth={4} strokeLinecap="round" />}
          </g>
        )
      })}
    </svg>
  )
}

function Blocks({ tens, ones }: { tens: number; ones: number }) {
  const u = 14
  const w = tens * (u + 8) + (ones > 0 ? 16 + Math.ceil(ones / 5) * (u + 4) : 0)
  return (
    <svg viewBox={`0 0 ${Math.max(w, 40)} ${u * 10 + 4}`} className="vis-blocks">
      {Array.from({ length: tens }, (_, t) => (
        <g key={t}>
          {Array.from({ length: 10 }, (_, k) => (
            <rect key={k} x={t * (u + 8) + 2} y={k * u + 2} width={u} height={u} fill="#4cc9f0" stroke={ink} strokeWidth={1.5} />
          ))}
        </g>
      ))}
      {Array.from({ length: ones }, (_, k) => (
        <rect
          key={`o${k}`}
          x={tens * (u + 8) + 16 + Math.floor(k / 5) * (u + 4)}
          y={u * 10 + 2 - ((k % 5) + 1) * (u + 2)}
          width={u}
          height={u}
          fill="#ffd166"
          stroke={ink}
          strokeWidth={1.5}
        />
      ))}
    </svg>
  )
}

function Clock({ hour, minute }: { hour: number; minute: number }) {
  const hourAngle = (((hour % 12) + minute / 60) * 30 * Math.PI) / 180
  const minAngle = (minute * 6 * Math.PI) / 180
  return (
    <svg viewBox="0 0 200 200" className="vis-clock">
      <circle cx={100} cy={100} r={92} fill="#fff" stroke={ink} strokeWidth={6} />
      {Array.from({ length: 12 }, (_, i) => {
        const n = i + 1
        const a = (n * 30 * Math.PI) / 180
        return (
          <text key={n} x={100 + Math.sin(a) * 72} y={100 - Math.cos(a) * 72 + 8} textAnchor="middle" fontSize={22} fontWeight={700} fill={ink}>
            {n}
          </text>
        )
      })}
      <line x1={100} y1={100} x2={100 + Math.sin(hourAngle) * 44} y2={100 - Math.cos(hourAngle) * 44} stroke="#e63946" strokeWidth={9} strokeLinecap="round" />
      <line x1={100} y1={100} x2={100 + Math.sin(minAngle) * 70} y2={100 - Math.cos(minAngle) * 70} stroke={ink} strokeWidth={5} strokeLinecap="round" />
      <circle cx={100} cy={100} r={7} fill={ink} />
    </svg>
  )
}

const coinSize: Record<CoinKind, number> = { penny: 58, nickel: 64, dime: 54, quarter: 72 }
const coinFill: Record<CoinKind, string> = { penny: '#c46b3a', nickel: '#c0c4c9', dime: '#d7dbe0', quarter: '#cfd3d8' }

function Coins({ coins }: { coins: CoinKind[] }) {
  return (
    <div className="vis-coins">
      {coins.map((c, i) => {
        const photo = getPhoto(`coin-${c}`)
        const size = coinSize[c]
        return (
          <div key={i} className="coin" style={{ width: size, height: size }}>
            {photo ? (
              <img src={photoUrl(photo)} alt={c} draggable={false} />
            ) : (
              <svg viewBox="0 0 64 64">
                <circle cx={32} cy={32} r={30} fill={coinFill[c]} stroke={ink} strokeWidth={3} />
                <text x={32} y={39} textAnchor="middle" fontSize={20} fontWeight={700} fill={ink}>
                  {coinValue[c]}¢
                </text>
              </svg>
            )}
            <span className="coin-name">{c}</span>
          </div>
        )
      })}
    </div>
  )
}

function polygon(sides: number, r: number, rotate: number, squashY = 1) {
  return Array.from({ length: sides }, (_, i) => {
    const a = ((rotate - 90) * Math.PI) / 180 + (i * Math.PI * 2) / sides
    return `${50 + Math.cos(a) * r},${50 + Math.sin(a) * r * squashY}`
  }).join(' ')
}

function Shape({ shape, rotate = 0 }: { shape: ShapeKind; rotate?: number }) {
  const fill = '#90e0ef'
  let el
  if (shape === 'circle') el = <circle cx={50} cy={50} r={38} />
  else if (shape === 'square') el = <rect x={18} y={18} width={64} height={64} transform={`rotate(${rotate} 50 50)`} />
  else if (shape === 'rectangle') el = <rect x={8} y={28} width={84} height={44} transform={`rotate(${rotate} 50 50)`} />
  else if (shape === 'triangle') el = <polygon points={polygon(3, 42, rotate)} />
  else if (shape === 'pentagon') el = <polygon points={polygon(5, 40, rotate)} />
  else el = <polygon points={polygon(6, 40, rotate)} />
  return (
    <svg viewBox="0 0 100 100" className="vis-shape">
      <g fill={fill} stroke={ink} strokeWidth={4} strokeLinejoin="round">
        {el}
      </g>
    </svg>
  )
}

function Split({ shape, parts, equal }: { shape: 'circle' | 'rectangle'; parts: number; equal: boolean }) {
  const lines: string[] = []
  if (shape === 'circle') {
    if (equal) {
      for (let i = 0; i < parts; i++) {
        const a = (i / parts) * Math.PI * 2 - Math.PI / 2
        lines.push(`M50 50 L${50 + Math.cos(a) * 40} ${50 + Math.sin(a) * 40}`)
      }
    } else if (parts === 2) {
      lines.push('M26 18 L26 82')
    } else {
      lines.push('M30 13 L30 87', 'M10 62 L90 62')
    }
  } else if (equal) {
    if (parts === 4) lines.push('M50 20 L50 80', 'M10 50 L90 50')
    else for (let i = 1; i < parts; i++) lines.push(`M${10 + (80 * i) / parts} 20 L${10 + (80 * i) / parts} 80`)
  } else if (parts === 2) {
    lines.push('M32 20 L32 80')
  } else {
    lines.push('M28 20 L28 80', 'M28 38 L90 38', 'M60 38 L60 80')
  }
  return (
    <svg viewBox="0 0 100 100" className="vis-shape">
      {shape === 'circle' ? (
        <circle cx={50} cy={50} r={40} fill="#ffd6a5" stroke={ink} strokeWidth={4} />
      ) : (
        <rect x={10} y={20} width={80} height={60} fill="#ffd6a5" stroke={ink} strokeWidth={4} />
      )}
      {lines.map((d, i) => (
        <path key={i} d={d} stroke={ink} strokeWidth={4} />
      ))}
    </svg>
  )
}

function Bar({ length, color }: { length: number; color: string }) {
  return (
    <svg viewBox="0 0 120 30" className="vis-bar">
      <line x1={4} y1={0} x2={4} y2={30} stroke={ink} strokeWidth={3} />
      <rect x={6} y={7} width={length * 1.1} height={16} rx={6} fill={color} stroke={ink} strokeWidth={2} />
    </svg>
  )
}

export function QuizVisual({ visual, big = false }: { visual: Visual; big?: boolean }) {
  switch (visual.kind) {
    case 'count':
      return <CountGrid item={visual.item} n={visual.n} />
    case 'sum':
      return (
        <div className="vis-sum">
          {visual.op === '+' ? (
            <>
              <CountGrid item={visual.item} n={visual.a} />
              <span className="vis-op">+</span>
              <CountGrid item={visual.item} n={visual.b} />
            </>
          ) : (
            <CountGrid item={visual.item} n={visual.a} crossed={visual.b} />
          )}
        </div>
      )
    case 'blocks':
      return <Blocks tens={visual.tens} ones={visual.ones} />
    case 'clock':
      return <Clock hour={visual.hour} minute={visual.minute} />
    case 'coins':
      return <Coins coins={visual.coins} />
    case 'shape':
      return <Shape shape={visual.shape} rotate={visual.rotate} />
    case 'split':
      return <Split shape={visual.shape} parts={visual.parts} equal={visual.equal} />
    case 'bar':
      return <Bar length={visual.length} color={visual.color} />
    case 'text':
      return <div className={big ? 'vis-text big' : 'vis-text'}>{visual.text}</div>
    case 'photo': {
      const photo = getPhoto(visual.photo)
      if (!photo) return <div className="vis-photo missing">?</div>
      return <img className="vis-photo" src={photoUrl(photo)} alt={photo.title} draggable={false} />
    }
  }
}
