import Phaser from 'phaser';
import sheetUrl from '../assets/plate-knight-v1.webp';
import { project, type Point } from '../core/game.js';

const TEXTURE = 'plate-knight-v1';
const WALK = 'plate-knight-walk';

/** One consistent full-plate design. The left direction mirrors the right. */
export class KnightSprite {
  private sprite: Phaser.GameObjects.Sprite;
  private shadow: Phaser.GameObjects.Ellipse;

  static preload(scene: Phaser.Scene) {
    scene.load.spritesheet(TEXTURE, sheetUrl, { frameWidth: 192, frameHeight: 256 });
  }

  constructor(scene: Phaser.Scene) {
    if (!scene.textures.exists(TEXTURE)) throw new Error('The knight artwork could not load. Please reload.');
    if (!scene.anims.exists(WALK)) {
      scene.anims.create({
        key: WALK,
        frames: scene.anims.generateFrameNumbers(TEXTURE, { start: 1, end: 6 }),
        frameRate: 12,
        repeat: -1,
      });
    }
    this.shadow = scene.add.ellipse(0, 0, 36, 15, 0x02070a, .5);
    // Feet stay on the collision position; the transparent padding stays above it.
    this.sprite = scene.add.sprite(0, 0, TEXTURE, 0).setOrigin(.5, .93).setScale(.38);
  }

  draw(position: Point, moving: boolean, facing: number) {
    const p = project(position);
    this.shadow.setPosition(p.x, p.y + 1).setDepth(p.y - .1);
    this.sprite.setPosition(p.x, p.y).setDepth(p.y).setFlipX(facing < 0);
    if (moving) this.sprite.play(WALK, true);
    else this.sprite.stop().setFrame(0);
  }

  snapshot() {
    return {
      texture: this.sprite.texture.key,
      frame: Number(this.sprite.frame.name),
      walking: this.sprite.anims.isPlaying,
      flipped: this.sprite.flipX,
    };
  }
}
