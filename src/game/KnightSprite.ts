import Phaser from 'phaser';
import sideUrl from '../assets/plate-knight-v1.webp';
import northUrl from '../assets/plate-knight-ne-v1.webp';
import southUrl from '../assets/plate-knight-se-v1.webp';
import { project, type Point } from '../core/game.js';
import type { Facing } from '../core/facing.js';

type Registration = readonly [headCentre: number, top: number, ground: number];
const SOURCES = {
  side: { key: 'plate-knight-v1', url: sideUrl, registration: null },
  north: {
    key: 'plate-knight-ne-v1', url: northUrl,
    registration: [[104,7,253],[105,7,253],[105,7,251],[105.5,7,253],[103.5,5,251],[111,4,250],[104.5,5,251],[105,5,250]] as readonly Registration[],
  },
  south: {
    key: 'plate-knight-se-v1', url: southUrl,
    registration: [[110,9,253],[106,9,251],[93,10,251],[85.5,9,246],[102.5,5,240],[103.5,4,241],[101,4,240],[90.5,4,249]] as readonly Registration[],
  },
};
const sourceFor = (facing: Facing) => facing.startsWith('north') ? SOURCES.north : facing.startsWith('south') ? SOURCES.south : SOURCES.side;

/** Front/rear isometric views and the original side view; west mirrors east. */
export class KnightSprite {
  private sprite: Phaser.GameObjects.Sprite;
  private shadow: Phaser.GameObjects.Ellipse;
  private direction: Facing = 'east';

  static preload(scene: Phaser.Scene) {
    for (const source of Object.values(SOURCES))
      scene.load.spritesheet(source.key, source.url, { frameWidth: 192, frameHeight: 256 });
  }

  constructor(scene: Phaser.Scene) {
    for (const source of Object.values(SOURCES)) {
      if (!scene.textures.exists(source.key)) throw new Error('The knight artwork could not load. Please reload.');
      const key = source.key + '-walk';
      if (!scene.anims.exists(key))
        scene.anims.create({ key, frames: scene.anims.generateFrameNumbers(source.key, { start: 1, end: 6 }), frameRate: 12, repeat: -1 });
    }
    this.shadow = scene.add.ellipse(0, 0, 36, 15, 0x02070a, .5);
    this.sprite = scene.add.sprite(0, 0, SOURCES.side.key, 0).setOrigin(.5, .93).setScale(.38);
  }

  draw(position: Point, moving: boolean, facing: Facing) {
    const p = project(position), source = sourceFor(facing), flipped = facing.endsWith('west');
    this.direction = facing;
    const changed = this.sprite.texture.key !== source.key;
    const phase = this.sprite.anims.isPlaying ? Math.max(0, (this.sprite.anims.currentFrame?.index ?? 1) - 1) : 0;
    if (changed) this.sprite.stop().setTexture(source.key, 0);
    if (moving) {
      if (changed) this.sprite.play({key: source.key + '-walk', startFrame: phase});
      else this.sprite.play(source.key + '-walk', true);
    } else this.sprite.stop().setFrame(0);

    // Register the generated cells to the same head/ground anchors and height.
    // This corrects small layout differences in the art without moving collision.
    const registration = source.registration?.[Number(this.sprite.frame.name)];
    let scale = .38, originY = .93, offsetX = 0;
    if (registration) {
      const [head, top, ground] = registration;
      scale = 88 / (ground - top);
      originY = ground / 256;
      offsetX = ((96 - head) * scale + 3) * (flipped ? -1 : 1);
    }
    this.shadow.setPosition(p.x, p.y + 1).setDepth(p.y - .1);
    this.sprite.setPosition(p.x + offsetX, p.y).setDepth(p.y).setFlipX(flipped).setOrigin(.5, originY).setScale(scale);
  }

  effects(tint=0xffffff, angle=0, alpha=1, size=1) {
    this.sprite.setTint(tint).setAngle(angle).setAlpha(alpha);
    this.sprite.setScale(this.sprite.scaleX*size, this.sprite.scaleY*size);
  }

  snapshot() {
    return {
      texture: this.sprite.texture.key,
      frame: Number(this.sprite.frame.name),
      walking: this.sprite.anims.isPlaying,
      flipped: this.sprite.flipX,
      direction: this.direction,
    };
  }
}
