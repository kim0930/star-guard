import Phaser from 'phaser'
import type { WorldDef } from '../../content/levels'
import { enemyDefs, towerStats } from '../../sim/data'
import { enemyPos, petPos, towerPos, type SimEvent } from '../../sim/engine'
import { mulberry32 } from '../../quiz/rng'
import { worldHeight, worldWidth } from '../../sim/slots'
import type { BattleController } from '../BattleController'
import { buildTextures, enemyTextureSize, towerTint } from '../textures'

type EnemyView = { body: Phaser.GameObjects.Image; shield?: Phaser.GameObjects.Container; bar: Phaser.GameObjects.Graphics }
type PetView = { body: Phaser.GameObjects.Image; bar: Phaser.GameObjects.Graphics }
type TowerView = { body: Phaser.GameObjects.Image; pips: Phaser.GameObjects.Graphics; level: number }
type Fx = { kind: 'shot' | 'ring'; from: Phaser.Math.Vector2; to: Phaser.Math.Vector2; color: number; ttl: number; life: number; radius?: number }

export type BattleSceneData = { controller: BattleController; world: WorldDef }

export class BattleScene extends Phaser.Scene {
  private controller!: BattleController
  private world!: WorldDef
  private enemies = new Map<number, EnemyView>()
  private pets = new Map<number, PetView>()
  private towers = new Map<number, TowerView>()
  private slotImages: Phaser.GameObjects.Image[] = []
  private fx: Fx[] = []
  private fxLayer!: Phaser.GameObjects.Graphics
  private placeLayer!: Phaser.GameObjects.Graphics
  private offEvent?: () => void

  constructor() {
    super('battle')
  }

  init(data: BattleSceneData) {
    this.controller = data.controller
    this.world = data.world
  }

  create() {
    buildTextures(this)
    this.drawGround()
    this.drawPath()
    const s = this.controller.state
    s.slots.forEach((slot, i) => {
      const img = this.add.image(slot.x, slot.y, 'slot').setDepth(2)
      img.setData('slot', i)
      this.slotImages.push(img)
    })
    const start = s.path.points[0]
    this.add.image(Math.max(40, start.x + 40), start.y, 'portal').setDepth(3)
    const end = s.path.points[s.path.points.length - 1]
    this.add.image(end.x + 20, end.y - 30, 'castle').setDepth(3)
    this.placeLayer = this.add.graphics().setDepth(4)
    this.fxLayer = this.add.graphics().setDepth(20)

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => this.handleTap(pointer.worldX, pointer.worldY))
    this.offEvent = this.controller.onEvent((e) => this.onSimEvent(e))
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.offEvent?.())
    this.events.once(Phaser.Scenes.Events.DESTROY, () => this.offEvent?.())
  }

  private drawGround() {
    const g = this.add.graphics().setDepth(0)
    g.fillStyle(this.world.ground, 1)
    g.fillRect(0, 0, worldWidth, worldHeight)
    const rng = mulberry32(this.world.id.length * 97 + 7)
    for (let i = 0; i < 70; i++) {
      const x = rng() * worldWidth
      const y = rng() * worldHeight
      const r = 4 + rng() * 10
      if (this.world.id === 'meadow') {
        g.fillStyle([0xffffff, 0xffd6e0, 0xfff3b0][i % 3], 0.9)
        g.fillCircle(x, y, r * 0.5)
        g.fillStyle(0x6fbf4b, 1)
        g.fillCircle(x + r, y + r, r * 0.7)
      } else if (this.world.id === 'coast') {
        g.fillStyle([0xffffff, 0xf4a261, 0xe9c46a][i % 3], 0.8)
        g.fillEllipse(x, y, r * 1.6, r)
      } else {
        g.fillStyle([0x6d597a, 0x7d6b5d, 0xb56576][i % 3], 0.8)
        g.fillCircle(x, y, r)
      }
    }
  }

  private drawPath() {
    const pts = this.controller.state.path.points
    const g = this.add.graphics().setDepth(1)
    for (const [width, color] of [
      [78, 0x1d2b3a],
      [66, this.world.path],
    ] as const) {
      g.lineStyle(width, color, 1)
      for (let i = 0; i < pts.length - 1; i++) g.lineBetween(pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y)
      g.fillStyle(color, 1)
      for (const p of pts) g.fillCircle(p.x, p.y, width / 2)
    }
  }

  private handleTap(x: number, y: number) {
    const c = this.controller
    const s = c.state
    let best: { id: number; dist: number } | null = null
    for (const e of s.enemies) {
      if (!enemyDefs[e.kind].quiz) continue
      const p = enemyPos(s, e)
      const reach = e.kind === 'boss' ? 80 : 60
      const dist = Math.hypot(p.x - x, p.y - y)
      if (dist < reach && (!best || dist < best.dist)) best = { id: e.id, dist }
    }
    if (best && c.tapEnemy(best.id)) return
    if (c.placing) {
      c.tapPath({ x, y })
      return
    }
    const slot = s.slots.findIndex((p) => Math.hypot(p.x - x, p.y - y) < 46)
    if (slot >= 0) c.tapSlot(slot)
  }

  private onSimEvent(e: SimEvent) {
    const s = this.controller.state
    if (e.type === 'shot') {
      const tower = s.towers.find((t) => t.id === e.tower)
      const enemy = s.enemies.find((x) => x.id === e.enemy)
      if (!tower || !enemy) return
      const a = towerPos(s, tower)
      const b = enemyPos(s, enemy)
      this.fx.push({ kind: 'shot', from: new Phaser.Math.Vector2(a.x, a.y - 14), to: new Phaser.Math.Vector2(b.x, b.y), color: towerTint[e.kind], ttl: 0.15, life: 0.15 })
    } else if (e.type === 'freeze') {
      this.fx.push({ kind: 'ring', from: new Phaser.Math.Vector2(e.x, e.y), to: new Phaser.Math.Vector2(e.x, e.y), color: 0xbde0fe, ttl: 0.5, life: 0.5, radius: e.radius })
    } else if (e.type === 'kill') {
      for (let i = 0; i < 6; i++) {
        const puff = this.add.image(e.x, e.y, 'puff').setDepth(15).setScale(0.6)
        const a = (i / 6) * Math.PI * 2
        this.tweens.add({ targets: puff, x: e.x + Math.cos(a) * 34, y: e.y + Math.sin(a) * 34, alpha: 0, scale: 0.1, duration: 380, onComplete: () => puff.destroy() })
      }
    } else if (e.type === 'leak') {
      this.cameras.main.shake(180, 0.006)
    } else if (e.type === 'quizSpawn') {
      const view = this.enemies.get(e.enemy)
      if (view) this.tweens.add({ targets: view.body, scale: 1.25, yoyo: true, duration: 220, repeat: 2 })
    }
  }

  update(_time: number, delta: number) {
    const c = this.controller
    c.tick(delta)
    const s = c.state
    const now = this.time.now / 1000

    const seen = new Set<number>()
    for (const e of s.enemies) {
      seen.add(e.id)
      let view = this.enemies.get(e.id)
      if (!view) {
        const body = this.add.image(0, 0, `enemy-${e.kind}`).setDepth(enemyDefs[e.kind].flying ? 12 : 10)
        const bar = this.add.graphics().setDepth(13)
        view = { body, bar }
        if (enemyDefs[e.kind].quiz) {
          const r = enemyTextureSize(e.kind) / 2 + 10
          const ring = this.add.circle(0, 0, r, 0x4cc9f0, 0.18).setStrokeStyle(4, 0x4cc9f0, 0.9)
          const label = this.add
            .text(0, -r - 18, '?', { fontFamily: 'Fredoka, sans-serif', fontSize: e.kind === 'boss' ? '44px' : '34px', color: '#ffffff', stroke: '#1d2b3a', strokeThickness: 6 })
            .setOrigin(0.5)
          view.shield = this.add.container(0, 0, [ring, label]).setDepth(14)
          this.tweens.add({ targets: label, y: label.y - 8, yoyo: true, repeat: -1, duration: 500 })
        }
        this.enemies.set(e.id, view)
      }
      const p = enemyPos(s, e)
      const bob = Math.sin(now * 8 + e.id) * 3
      const fly = enemyDefs[e.kind].flying ? -18 : 0
      view.body.setPosition(p.x, p.y + bob + fly)
      const frozen = e.frozenUntil > s.time
      const slowed = e.slowUntil > s.time
      view.body.setTint(frozen ? 0xa8dadc : slowed ? 0xcaf0f8 : 0xffffff)
      view.shield?.setPosition(p.x, p.y + fly)
      view.shield?.setAlpha(e.quizReadyAt > s.time ? 0.35 : 1)
      const w = enemyTextureSize(e.kind) * 0.9
      view.bar.clear()
      view.bar.fillStyle(0x1d2b3a, 0.8)
      view.bar.fillRect(p.x - w / 2, p.y + fly - enemyTextureSize(e.kind) / 2 - 10, w, 7)
      view.bar.fillStyle(0xef476f, 1)
      view.bar.fillRect(p.x - w / 2 + 1, p.y + fly - enemyTextureSize(e.kind) / 2 - 9, (w - 2) * Math.max(0, e.hp / e.maxHp), 5)
    }
    for (const [id, view] of this.enemies) {
      if (seen.has(id)) continue
      view.body.destroy()
      view.bar.destroy()
      view.shield?.destroy()
      this.enemies.delete(id)
    }

    for (const t of s.towers) {
      let view = this.towers.get(t.id)
      const p = towerPos(s, t)
      if (!view) {
        const body = this.add.image(p.x, p.y - 8, `tower-${t.kind}`).setDepth(6)
        view = { body, pips: this.add.graphics().setDepth(7), level: 0 }
        this.towers.set(t.id, view)
        this.slotImages[t.slot]?.setVisible(false)
        this.tweens.add({ targets: body, scale: { from: 0.4, to: 1 }, duration: 260, ease: 'Back.Out' })
      }
      if (view.level !== t.level) {
        view.level = t.level
        view.pips.clear()
        for (let i = 0; i < t.level; i++) {
          view.pips.fillStyle(0xffd23f, 1)
          view.pips.lineStyle(2, 0x1d2b3a, 1)
          view.pips.fillCircle(p.x - 14 + i * 14, p.y + 34, 6)
          view.pips.strokeCircle(p.x - 14 + i * 14, p.y + 34, 6)
        }
        view.body.setScale(1 + (t.level - 1) * 0.08)
      }
    }

    const petSeen = new Set<number>()
    for (const pet of s.pets) {
      petSeen.add(pet.id)
      let view = this.pets.get(pet.id)
      if (!view) {
        view = { body: this.add.image(0, 0, `pet-${pet.kind}`).setDepth(9), bar: this.add.graphics().setDepth(13) }
        this.pets.set(pet.id, view)
      }
      const p = petPos(s, pet)
      view.body.setPosition(p.x, p.y + Math.sin(now * 5 + pet.id) * 2)
      view.body.setAlpha(pet.alive ? 1 : 0.25)
      view.bar.clear()
      if (pet.alive) {
        view.bar.fillStyle(0x1d2b3a, 0.8)
        view.bar.fillRect(p.x - 24, p.y + 30, 48, 7)
        view.bar.fillStyle(0x06d6a0, 1)
        view.bar.fillRect(p.x - 23, p.y + 31, 46 * Math.max(0, pet.hp / pet.maxHp), 5)
      }
    }
    for (const [id, view] of this.pets) {
      if (petSeen.has(id)) continue
      view.body.destroy()
      view.bar.destroy()
      this.pets.delete(id)
    }

    this.placeLayer.clear()
    if (c.placing) {
      const pulse = 0.35 + Math.sin(now * 6) * 0.15
      const pts = s.path.points
      this.placeLayer.lineStyle(70, 0x06d6a0, pulse)
      for (let i = 0; i < pts.length - 1; i++) this.placeLayer.lineBetween(pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y)
    }
    if (s.phase === 'prep') {
      const pulse = 0.5 + Math.sin(now * 4) * 0.3
      for (const img of this.slotImages) if (img.visible) img.setAlpha(pulse + 0.2)
    } else {
      for (const img of this.slotImages) img.setAlpha(0.8)
    }

    const dt = delta / 1000
    this.fxLayer.clear()
    for (const t of s.towers) {
      if (t.kind !== 'sun' || t.beamTarget == null) continue
      const target = s.enemies.find((e) => e.id === t.beamTarget)
      if (!target) continue
      const a = towerPos(s, t)
      const b = enemyPos(s, target)
      this.fxLayer.lineStyle(10, 0xffe066, 0.45)
      this.fxLayer.lineBetween(a.x, a.y - 18, b.x, b.y)
      this.fxLayer.lineStyle(4, 0xffffff, 0.9)
      this.fxLayer.lineBetween(a.x, a.y - 18, b.x, b.y)
    }
    this.fx = this.fx.filter((f) => (f.ttl -= c.paused ? 0 : dt) > 0)
    for (const f of this.fx) {
      const k = f.ttl / f.life
      if (f.kind === 'shot') {
        this.fxLayer.fillStyle(f.color, 1)
        const x = Phaser.Math.Linear(f.to.x, f.from.x, k)
        const y = Phaser.Math.Linear(f.to.y, f.from.y, k)
        this.fxLayer.lineStyle(2, 0x1d2b3a, 1)
        this.fxLayer.fillCircle(x, y, 7)
        this.fxLayer.strokeCircle(x, y, 7)
      } else {
        this.fxLayer.lineStyle(6, f.color, k)
        this.fxLayer.strokeCircle(f.from.x, f.from.y, (f.radius ?? 100) * (1.1 - k * 0.3))
      }
    }
    if (s.phase === 'prep') {
      for (const t of s.towers) {
        const p = towerPos(s, t)
        this.fxLayer.lineStyle(2, 0xffffff, 0.25)
        this.fxLayer.strokeCircle(p.x, p.y, towerStats(t.kind, t.level).range)
      }
    }
  }
}
