import Phaser from 'phaser'
import { useEffect, useRef } from 'react'
import type { WorldDef } from '../content/levels'
import { worldHeight, worldWidth } from '../sim/slots'
import type { BattleController } from './BattleController'
import { BattleScene } from './scenes/BattleScene'

export function PhaserGame({ controller, world }: { controller: BattleController; world: WorldDef }) {
  const host = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!host.current) return
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: host.current,
      width: worldWidth,
      height: worldHeight,
      backgroundColor: '#000000',
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      input: { activePointers: 2 },
      banner: false,
      audio: { noAudio: true },
      render: { antialias: true, roundPixels: false },
    })
    game.scene.add('battle', BattleScene, true, { controller, world })
    return () => {
      game.destroy(true)
    }
  }, [controller, world])

  return <div className="phaser-host" ref={host} />
}
