import type { ItemKind, PetKind, TowerKind } from '../sim/data'

const ink = '#1d2b3a'

export function TowerIcon({ kind, size = 56 }: { kind: TowerKind; size?: number }) {
  const top = {
    pebble: <circle cx={32} cy={20} r={11} fill="#adb5bd" stroke={ink} strokeWidth={3} />,
    bubble: (
      <g stroke={ink} strokeWidth={3}>
        <circle cx={28} cy={20} r={11} fill="#a0e7ff" />
        <circle cx={42} cy={12} r={6} fill="#caf0f8" />
      </g>
    ),
    sun: (
      <g stroke={ink} strokeWidth={3}>
        <circle cx={32} cy={20} r={12} fill="#ffd23f" />
        <circle cx={32} cy={20} r={5} fill="#fff8d6" />
      </g>
    ),
    magnet: <path d="M20 10 v12 a12 12 0 0 0 24 0 v-12 h-7 v12 a5 5 0 0 1 -10 0 v-12 z" fill="#e63946" stroke={ink} strokeWidth={3} />,
    ice: <polygon points="32,6 44,20 32,34 20,20" fill="#bde0fe" stroke={ink} strokeWidth={3} />,
  }[kind]
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden>
      <rect x={18} y={30} width={28} height={26} rx={5} fill="#c9a26b" stroke={ink} strokeWidth={3} />
      <rect x={14} y={52} width={36} height={8} rx={3} fill="#8d6e4a" stroke={ink} strokeWidth={3} />
      {top}
    </svg>
  )
}

export function PetIcon({ kind, size = 56 }: { kind: PetKind; size?: number }) {
  const body = {
    frog: (
      <g stroke={ink} strokeWidth={3}>
        <ellipse cx={32} cy={38} rx={22} ry={16} fill="#52b788" />
        <circle cx={22} cy={22} r={8} fill="#52b788" />
        <circle cx={42} cy={22} r={8} fill="#52b788" />
        <circle cx={22} cy={22} r={3} fill={ink} />
        <circle cx={42} cy={22} r={3} fill={ink} />
        <path d="M22 42 q10 8 20 0" fill="none" />
      </g>
    ),
    crab: (
      <g stroke={ink} strokeWidth={3}>
        <ellipse cx={32} cy={38} rx={20} ry={14} fill="#f3722c" />
        <circle cx={12} cy={22} r={7} fill="#f3722c" />
        <circle cx={52} cy={22} r={7} fill="#f3722c" />
        <circle cx={26} cy={32} r={3} fill={ink} />
        <circle cx={38} cy={32} r={3} fill={ink} />
      </g>
    ),
    owl: (
      <g stroke={ink} strokeWidth={3}>
        <ellipse cx={32} cy={36} rx={18} ry={22} fill="#9c6644" />
        <circle cx={25} cy={28} r={7} fill="#fff" />
        <circle cx={39} cy={28} r={7} fill="#fff" />
        <circle cx={25} cy={28} r={3} fill={ink} />
        <circle cx={39} cy={28} r={3} fill={ink} />
        <polygon points="32,34 28,40 36,40" fill="#ffd23f" />
      </g>
    ),
    quizling: (
      <g stroke={ink} strokeWidth={3}>
        <circle cx={32} cy={36} r={20} fill="#b388eb" />
        <text x={32} y={44} textAnchor="middle" fontSize={24} fontWeight={700} fill="#fff" stroke="none">
          ?
        </text>
      </g>
    ),
  }[kind]
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden>
      {body}
    </svg>
  )
}

export function ItemIcon({ kind, size = 56 }: { kind: ItemKind; size?: number }) {
  const body = {
    freeze: (
      <g stroke={ink} strokeWidth={3}>
        <circle cx={32} cy={36} r={20} fill="#90e0ef" />
        <path d="M32 22 v28 M20 29 l24 14 M44 29 l-24 14" stroke="#fff" />
        <rect x={28} y={8} width={8} height={9} fill="#6c757d" />
      </g>
    ),
    repair: (
      <g stroke={ink} strokeWidth={3}>
        <path d="M32 54 C10 40 8 22 20 16 C27 13 31 18 32 22 C33 18 37 13 44 16 C56 22 54 40 32 54 Z" fill="#ef476f" />
        <path d="M32 26 v16 M24 34 h16" stroke="#fff" strokeWidth={5} />
      </g>
    ),
    power: (
      <g stroke={ink} strokeWidth={3}>
        <polygon points="36,6 16,36 30,36 26,58 48,26 34,26" fill="#ffd23f" />
      </g>
    ),
  }[kind]
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden>
      {body}
    </svg>
  )
}

export function StarIcon({ size = 24, filled = true }: { size?: number; filled?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden className="star-icon">
      <polygon
        points="12,2 15,9 22,9.5 16.5,14 18.5,21 12,17 5.5,21 7.5,14 2,9.5 9,9"
        fill={filled ? '#ffd23f' : '#ffffff33'}
        stroke={ink}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
    </svg>
  )
}
