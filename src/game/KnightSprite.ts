import Phaser from 'phaser';
import attackUrl from '../assets/knight-rig/attack-v1.webp';
import { ATTACK_RIG, attackPose, weaponMotion, type KnightCombat } from '../core/knightRig.js';
import sideUrl from '../assets/plate-knight-v1.webp';
import northUrl from '../assets/plate-knight-ne-v1.webp';
import southUrl from '../assets/plate-knight-se-v1.webp';
import { project, type Point } from '../core/game.js';
import type { Facing } from '../core/facing.js';
import { STATION_GATE } from '../core/level.js';

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
  private weapon: Phaser.GameObjects.Graphics;
  private rig = {phase:'idle',pose:'idle',weapon:'sword',visible:false,hand:{x:0,y:0},grip:{x:0,y:0},angle:0,depth:0};


  static preload(scene: Phaser.Scene) {
    scene.load.spritesheet(ATTACK_RIG.key, attackUrl, {frameWidth:256,frameHeight:256});
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
    this.weapon = scene.add.graphics();
    this.shadow = scene.add.ellipse(0, 0, 36, 15, 0x02070a, .5);
    this.sprite = scene.add.sprite(0, 0, SOURCES.side.key, 0).setOrigin(.5, .93).setScale(.38);
  }

  draw(position: Point, moving: boolean, facing: Facing, combat?: KnightCombat) {
    const p = project(position), source = sourceFor(facing), flipped = facing.endsWith('west');
    this.direction = facing;
    const attacking = !!combat && combat.phase !== 'idle';
    if(attacking) {
      const frame=attackPose(facing,combat.phase);
      this.sprite.stop().setTexture(ATTACK_RIG.key,frame).setPosition(p.x,p.y).setDepth(p.y)
        .setFlipX(flipped).setOrigin(.5,ATTACK_RIG.ground/256).setScale(ATTACK_RIG.scale);
      this.shadow.setPosition(p.x,p.y+1).setDepth(p.y-.1);
      const socket=ATTACK_RIG.hands[frame];
      this.drawWeapon(combat,{x:(socket.x-128)*ATTACK_RIG.scale*(flipped?-1:1),y:(socket.y-ATTACK_RIG.ground)*ATTACK_RIG.scale},p,flipped,String(frame));
      return;
    }
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
    // Measured per-frame gauntlet centres; the weapon never floats at the old fixed offset.
    const frame=Number(this.sprite.frame.name);
    const hands=source===SOURCES.south?[[72,143],[56,143],[39,143],[47,147],[43,137],[57,137],[34,140],[38,141]]:
      source===SOURCES.north?[[149,137],[160,132],[171,105],[170,105],[147,143],[146,142],[157,138],[157,141]]:
      [[138,124],[149,119],[146,117],[151,115],[149,124],[154,124],[145,123],[146,127]];
    const hand=hands[frame]??hands[0];
    this.drawWeapon(combat,{x:offsetX+(hand[0]-96)*scale*(flipped?-1:1),y:(hand[1]-originY*256)*scale},p,flipped,'idle');

  }

  private drawWeapon(combat:KnightCombat|undefined, hand:Point, foot:Point, flipped:boolean, pose:string) {
    const weaponDepth=foot.y+(combat&&combat.aim.y<-.25?-.02:.02);
    const g=this.weapon;g.clear().setPosition(foot.x,foot.y).setDepth(weaponDepth).setAngle(0).setScale(1).setAlpha(1);
    if(!combat){this.rig.visible=false;return;}
    const m=weaponMotion(combat,flipped),u={x:Math.cos(m.angle),y:Math.sin(m.angle)},n={x:-u.y,y:u.x};
    const pt=(along:number,across=0)=>({x:hand.x+u.x*along+n.x*across,y:hand.y+u.y*along+n.y*across});
    const line=(a:number,b:number,width:number,color:number)=>{const start=pt(a),end=pt(b);g.lineStyle(width,color,1).lineBetween(start.x,start.y,end.x,end.y);};
    // Dark outlines and metal edge catch keep weapons readable at the 88px actor scale.
    line(-7,m.length,5,0x172023);
    if(combat.weapon==='spear'){
      line(-11,m.length-9,3,0x75634a);
      const base=pt(m.length-12),tip=pt(m.length),l={x:base.x+n.x*4,y:base.y+n.y*4},r={x:base.x-n.x*4,y:base.y-n.y*4};
      g.fillStyle(0xbfc9c8).fillTriangle(tip.x,tip.y,l.x,l.y,r.x,r.y);
      line(m.length-11,m.length,1,0xebebe1);
    } else if(combat.weapon==='hammer'){
      line(-6,m.length-2,3,0x796b54);
      const a=pt(m.length-4,-7),b=pt(m.length-4,7);
      g.lineStyle(9,0x1a2427).lineBetween(a.x,a.y,b.x,b.y);
      g.lineStyle(6,0x98a5a5).lineBetween(a.x,a.y,b.x,b.y);
      g.lineStyle(2,0xd1d4c9).lineBetween(a.x-1,a.y-1,b.x-1,b.y-1);
    }else{
      line(5,m.length-3,4,0x9eafb1);line(6,m.length,1,0xe1e4d9);
      const a=pt(4,-6),b=pt(4,6);g.lineStyle(3,0x9b8c64).lineBetween(a.x,a.y,b.x,b.y);
      line(-6,2,3,0x4a4136);
    }
    // Small metal gauntlet seam over the grip conceals the join, not an extra limb.
    g.fillStyle(0x7d8988).fillCircle(hand.x,hand.y,2);
    const world={x:foot.x+hand.x,y:foot.y+hand.y};
    this.rig={phase:combat.phase,pose,weapon:combat.weapon,visible:true,hand:{...world},grip:{...world},angle:m.angle,depth:weaponDepth};
  }

  /** A deliberate reach / pull / settle, with the gauntlet registered to the lever grip. */
  drawLeverPull(position:Point, facing:Facing, progress:number) {
    const p=project(position),lever=project(STATION_GATE.lever),t=Math.max(0,Math.min(1,progress));
    const hand={x:lever.x-13+t*23,y:lever.y-43+t*13};
    const frame=1, socket=ATTACK_RIG.hands[frame],scale=ATTACK_RIG.scale;
    // The reach pose is held at the real mechanism; small lean follows handle travel.
    const x=p.x,y=p.y;
    const gauntlet={x:x+(socket.x-128)*scale,y:y+(socket.y-ATTACK_RIG.ground)*scale};
    this.sprite.stop().setTexture(ATTACK_RIG.key,frame).setFlipX(false).setOrigin(.5,ATTACK_RIG.ground/256).setScale(scale).setPosition(x,y).setDepth(Math.max(p.y,y)+.1);
    this.shadow.setPosition(x,y+1).setDepth(Math.max(p.y,y)-.1);
    this.weapon.clear().setPosition(0,0).setDepth(p.y+.2).setAngle(0).setScale(1).setAlpha(1);
    this.weapon.lineStyle(10,0x172126).lineBetween(gauntlet.x-8,gauntlet.y,hand.x,hand.y);
    this.weapon.lineStyle(7,0x75817f).lineBetween(gauntlet.x-8,gauntlet.y,hand.x,hand.y);
    this.weapon.lineStyle(2,0xb8c2ba).lineBetween(gauntlet.x-8,gauntlet.y-2,hand.x,hand.y-2);
    this.weapon.fillStyle(0x9ba6a0).fillCircle(hand.x,hand.y,4);this.direction=facing;
    this.rig={phase:'pull',pose:'lever-reach',weapon:'none',visible:false,hand,grip:{...hand},angle:0,depth:p.y};
  }

  effects(tint=0xffffff, angle=0, alpha=1, size=1) {
    this.sprite.setTint(tint).setAngle(angle).setAlpha(alpha);
    this.shadow.setAlpha(alpha);
    this.sprite.setScale(this.sprite.scaleX*size, this.sprite.scaleY*size);
    this.weapon.setAngle(angle).setAlpha(alpha).setScale(size);
  }

  snapshot() {
    return {
      texture: this.sprite.texture.key,
      frame: Number(this.sprite.frame.name),
      walking: this.sprite.anims.isPlaying,
      flipped: this.sprite.flipX,
      direction: this.direction,
      rig: {...this.rig,hand:{...this.rig.hand},grip:{...this.rig.grip}},
    };
  }
}
