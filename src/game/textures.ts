import Phaser from 'phaser'
import type { EnemyKind, PetKind, TowerKind } from '../sim/data'

const ink = 0x1d2b3a

type Draw = (g: Phaser.GameObjects.Graphics) => void

function make(scene: Phaser.Scene, key: string, w: number, h: number, draw: Draw) {
  if (scene.textures.exists(key)) return
  const g = scene.make.graphics({ x: 0, y: 0 }, false)
  draw(g)
  g.generateTexture(key, w, h)
  g.destroy()
}

function eyes(g: Phaser.GameObjects.Graphics, cx: number, cy: number, gap: number, r = 6) {
  g.fillStyle(0xffffff, 1)
  g.fillCircle(cx - gap, cy, r)
  g.fillCircle(cx + gap, cy, r)
  g.fillStyle(ink, 1)
  g.fillCircle(cx - gap + 1.5, cy + 1, r * 0.5)
  g.fillCircle(cx + gap + 1.5, cy + 1, r * 0.5)
}

const enemyArt: Record<EnemyKind, { size: number; draw: Draw }> = {
  blob: {
    size: 56,
    draw: (g) => {
      g.fillStyle(0x7bd36b, 1)
      g.lineStyle(3, ink, 1)
      g.fillEllipse(28, 34, 48, 38)
      g.strokeEllipse(28, 34, 48, 38)
      eyes(g, 28, 30, 9)
    },
  },
  zip: {
    size: 52,
    draw: (g) => {
      g.fillStyle(0xffd23f, 1)
      g.lineStyle(3, ink, 1)
      g.fillEllipse(26, 28, 40, 30)
      g.strokeEllipse(26, 28, 40, 30)
      g.fillStyle(ink, 1)
      g.fillRect(16, 16, 4, 24)
      g.fillRect(28, 15, 4, 26)
      eyes(g, 36, 24, 4, 4)
    },
  },
  rocko: {
    size: 72,
    draw: (g) => {
      g.fillStyle(0x8d8d99, 1)
      g.lineStyle(3, ink, 1)
      g.fillRoundedRect(6, 12, 60, 54, 18)
      g.strokeRoundedRect(6, 12, 60, 54, 18)
      g.fillStyle(0x6c6c78, 1)
      g.fillCircle(22, 50, 6)
      g.fillCircle(50, 24, 5)
      eyes(g, 36, 34, 11, 7)
    },
  },
  bolt: {
    size: 60,
    draw: (g) => {
      g.fillStyle(0xb7c4d6, 1)
      g.lineStyle(3, ink, 1)
      g.fillRect(10, 16, 40, 36)
      g.strokeRect(10, 16, 40, 36)
      g.fillStyle(0xe4572e, 1)
      g.fillCircle(30, 8, 5)
      g.lineStyle(3, ink, 1)
      g.lineBetween(30, 12, 30, 16)
      g.fillStyle(0x3ae0ff, 1)
      g.fillRect(17, 26, 9, 8)
      g.fillRect(34, 26, 9, 8)
      g.fillStyle(ink, 1)
      g.fillRect(20, 42, 20, 4)
    },
  },
  bat: {
    size: 64,
    draw: (g) => {
      g.fillStyle(0x6a4c93, 1)
      g.lineStyle(3, ink, 1)
      g.fillTriangle(4, 22, 26, 30, 18, 46)
      g.fillTriangle(60, 22, 38, 30, 46, 46)
      g.strokeTriangle(4, 22, 26, 30, 18, 46)
      g.strokeTriangle(60, 22, 38, 30, 46, 46)
      g.fillCircle(32, 34, 14)
      g.strokeCircle(32, 34, 14)
      eyes(g, 32, 32, 6, 4)
    },
  },
  quizzer: {
    size: 84,
    draw: (g) => {
      g.fillStyle(0x9b5de5, 1)
      g.lineStyle(4, ink, 1)
      g.fillCircle(42, 46, 30)
      g.strokeCircle(42, 46, 30)
      eyes(g, 42, 40, 11, 7)
      g.fillStyle(ink, 1)
      g.fillRect(32, 58, 20, 5)
    },
  },
  boss: {
    size: 140,
    draw: (g) => {
      g.fillStyle(0xf15bb5, 1)
      g.lineStyle(5, ink, 1)
      g.fillCircle(70, 78, 54)
      g.strokeCircle(70, 78, 54)
      g.fillStyle(0xfee440, 1)
      g.fillTriangle(30, 34, 46, 6, 58, 30)
      g.fillTriangle(56, 28, 70, 0, 84, 28)
      g.fillTriangle(82, 30, 94, 6, 110, 34)
      g.lineStyle(3, ink, 1)
      g.strokeTriangle(30, 34, 46, 6, 58, 30)
      g.strokeTriangle(56, 28, 70, 0, 84, 28)
      g.strokeTriangle(82, 30, 94, 6, 110, 34)
      eyes(g, 70, 70, 20, 12)
      g.fillStyle(ink, 1)
      g.fillRoundedRect(48, 100, 44, 10, 5)
    },
  },
}

const towerColors: Record<TowerKind, number> = {
  pebble: 0xa0785a,
  bubble: 0x4cc9f0,
  sun: 0xffc300,
  magnet: 0xe63946,
  ice: 0xbde0fe,
}

function towerBase(g: Phaser.GameObjects.Graphics, color: number) {
  g.fillStyle(0x6b4f3a, 1)
  g.lineStyle(3, ink, 1)
  g.fillRoundedRect(10, 40, 60, 30, 8)
  g.strokeRoundedRect(10, 40, 60, 30, 8)
  g.fillStyle(color, 1)
}

const towerArt: Record<TowerKind, Draw> = {
  pebble: (g) => {
    towerBase(g, towerColors.pebble)
    g.fillCircle(40, 32, 22)
    g.strokeCircle(40, 32, 22)
    g.fillStyle(0x5c4033, 1)
    g.fillCircle(40, 30, 9)
  },
  bubble: (g) => {
    towerBase(g, towerColors.bubble)
    g.fillCircle(40, 32, 22)
    g.strokeCircle(40, 32, 22)
    g.fillStyle(0xffffff, 0.9)
    g.fillCircle(33, 24, 6)
    g.fillCircle(48, 36, 4)
  },
  sun: (g) => {
    towerBase(g, towerColors.sun)
    g.fillStyle(0xffc300, 1)
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2
      g.fillTriangle(
        40 + Math.cos(a) * 18,
        32 + Math.sin(a) * 18,
        40 + Math.cos(a + 0.3) * 30,
        32 + Math.sin(a + 0.3) * 30,
        40 + Math.cos(a + 0.6) * 18,
        32 + Math.sin(a + 0.6) * 18,
      )
    }
    g.fillCircle(40, 32, 18)
    g.strokeCircle(40, 32, 18)
  },
  magnet: (g) => {
    towerBase(g, towerColors.magnet)
    g.lineStyle(14, towerColors.magnet, 1)
    g.beginPath()
    g.arc(40, 30, 16, Math.PI, 0, false)
    g.strokePath()
    g.fillStyle(0xdddddd, 1)
    g.fillRect(17, 30, 14, 10)
    g.fillRect(49, 30, 14, 10)
    g.lineStyle(3, ink, 1)
    g.strokeRect(17, 30, 14, 10)
    g.strokeRect(49, 30, 14, 10)
  },
  ice: (g) => {
    towerBase(g, towerColors.ice)
    g.fillStyle(0xffffff, 1)
    g.fillCircle(28, 30, 14)
    g.fillCircle(44, 24, 17)
    g.fillCircle(56, 32, 12)
    g.lineStyle(3, ink, 1)
    g.strokeCircle(44, 24, 17)
    g.fillStyle(0x4cc9f0, 1)
    g.fillRect(30, 46, 4, 10)
    g.fillRect(44, 46, 4, 12)
  },
}

const petArt: Record<PetKind, Draw> = {
  frog: (g) => {
    g.fillStyle(0x52b788, 1)
    g.lineStyle(3, ink, 1)
    g.fillEllipse(30, 36, 50, 34)
    g.strokeEllipse(30, 36, 50, 34)
    eyes(g, 30, 20, 11, 7)
    g.lineStyle(3, ink, 1)
    g.beginPath()
    g.arc(30, 38, 10, 0.2, Math.PI - 0.2)
    g.strokePath()
  },
  crab: (g) => {
    g.fillStyle(0xf3722c, 1)
    g.lineStyle(3, ink, 1)
    g.fillEllipse(30, 36, 44, 30)
    g.strokeEllipse(30, 36, 44, 30)
    g.fillCircle(8, 20, 8)
    g.fillCircle(52, 20, 8)
    g.strokeCircle(8, 20, 8)
    g.strokeCircle(52, 20, 8)
    eyes(g, 30, 30, 8, 5)
  },
  owl: (g) => {
    g.fillStyle(0x9c6644, 1)
    g.lineStyle(3, ink, 1)
    g.fillEllipse(30, 34, 42, 48)
    g.strokeEllipse(30, 34, 42, 48)
    g.fillStyle(0xffffff, 1)
    g.fillCircle(21, 28, 9)
    g.fillCircle(39, 28, 9)
    g.fillStyle(ink, 1)
    g.fillCircle(21, 28, 4)
    g.fillCircle(39, 28, 4)
    g.fillStyle(0xffb703, 1)
    g.fillTriangle(26, 36, 34, 36, 30, 44)
  },
  quizling: (g) => {
    g.fillStyle(0xc77dff, 1)
    g.lineStyle(3, ink, 1)
    g.fillCircle(30, 32, 24)
    g.strokeCircle(30, 32, 24)
    eyes(g, 30, 28, 8, 6)
    g.lineStyle(3, ink, 1)
    g.beginPath()
    g.arc(30, 34, 9, 0.2, Math.PI - 0.2)
    g.strokePath()
  },
}

export function enemyTextureSize(kind: EnemyKind) {
  return enemyArt[kind].size
}

export function buildTextures(scene: Phaser.Scene) {
  for (const [kind, art] of Object.entries(enemyArt)) make(scene, `enemy-${kind}`, art.size, art.size, art.draw)
  for (const [kind, draw] of Object.entries(towerArt)) make(scene, `tower-${kind}`, 80, 76, draw)
  for (const [kind, draw] of Object.entries(petArt)) make(scene, `pet-${kind}`, 60, 60, draw)
  make(scene, 'slot', 76, 76, (g) => {
    g.fillStyle(0xffffff, 0.55)
    g.lineStyle(4, 0xffffff, 1)
    g.fillCircle(38, 38, 32)
    g.strokeCircle(38, 38, 32)
    g.fillStyle(0x1d3557, 0.8)
    g.fillRect(35, 22, 6, 32)
    g.fillRect(22, 35, 32, 6)
  })
  make(scene, 'castle', 120, 130, (g) => {
    g.fillStyle(0xf1faee, 1)
    g.lineStyle(4, ink, 1)
    g.fillRect(20, 40, 80, 80)
    g.strokeRect(20, 40, 80, 80)
    for (const x of [14, 46, 78]) {
      g.fillRect(x, 20, 28, 26)
      g.strokeRect(x, 20, 28, 26)
    }
    g.fillStyle(0x457b9d, 1)
    g.fillRoundedRect(46, 80, 28, 40, { tl: 14, tr: 14, bl: 0, br: 0 })
    g.fillStyle(0xffd23f, 1)
    g.fillTriangle(56, 0, 56, 18, 76, 9)
    g.lineStyle(3, ink, 1)
    g.lineBetween(56, 0, 56, 20)
  })
  make(scene, 'portal', 90, 90, (g) => {
    g.fillStyle(0x3c096c, 0.85)
    g.fillCircle(45, 45, 40)
    g.fillStyle(0x7b2cbf, 1)
    g.fillCircle(45, 45, 26)
    g.fillStyle(0xc77dff, 1)
    g.fillCircle(45, 45, 12)
  })
  make(scene, 'puff', 24, 24, (g) => {
    g.fillStyle(0xffffff, 1)
    g.fillCircle(12, 12, 12)
  })
  make(scene, 'star', 40, 40, (g) => {
    g.fillStyle(0xffd23f, 1)
    g.lineStyle(3, ink, 1)
    const pts: Phaser.Types.Math.Vector2Like[] = []
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? 18 : 8
      const a = -Math.PI / 2 + (i * Math.PI) / 5
      pts.push({ x: 20 + Math.cos(a) * r, y: 20 + Math.sin(a) * r })
    }
    g.fillPoints(pts, true)
    g.strokePoints(pts, true)
  })
}

export const towerTint = towerColors
