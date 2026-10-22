import type Phaser from 'phaser';
import swordUrl from '../assets/weapons/sprites/sword.webp';
import spearUrl from '../assets/weapons/sprites/spear.webp';
import hammerUrl from '../assets/weapons/sprites/hammer.webp';
import axeUrl from '../assets/weapons/sprites/axe.webp';
import falchionUrl from '../assets/weapons/sprites/falchion.webp';
import poleaxeUrl from '../assets/weapons/sprites/poleaxe.webp';
import manifest from '../assets/weapons/manifest.json';
import {isWeaponId,type WeaponId} from '../core/weaponCatalog.js';
import {placeWeaponArt} from '../core/weaponPlacement.js';
export const WEAPON_ART_URLS={sword:swordUrl,spear:spearUrl,hammer:hammerUrl,axe:axeUrl,falchion:falchionUrl,poleaxe:poleaxeUrl};
export const WEAPON_ART=manifest.weapons;
export const weaponTexture=(id:WeaponId)=>`ordinary-weapon-${id}`;
export function preloadWeaponArt(scene:Phaser.Scene){for(const [id,url]of Object.entries(WEAPON_ART_URLS))scene.load.image(weaponTexture(id as WeaponId),url);}
export function weaponArtReady(scene:Phaser.Scene,id:unknown):boolean{
 if(!isWeaponId(id)||!scene.textures.exists(weaponTexture(id)))return false;
 const asset=WEAPON_ART[id],frame=scene.textures.getFrame(weaponTexture(id));
 return !!frame&&frame.width===asset.sourceSize[0]&&frame.height===asset.sourceSize[1]&&placeWeaponArt(asset,{x:0,y:0},0,asset.nominalLength,false)!==null;
}

/** UI-only blade/head detail. Runtime source, grip, length and collision are untouched. */
export function createWeaponThumbnail(scene:Phaser.Scene,id:WeaponId):string|null{
 if(!weaponArtReady(scene,id))return null;
 const asset=WEAPON_ART[id],source=scene.textures.get(weaponTexture(id)).getSourceImage() as HTMLImageElement;
 const fractions:Record<WeaponId,number>={sword:.5,spear:.2,hammer:.35,axe:.45,falchion:.55,poleaxe:.32};
 const cut=Math.round(asset.axisTip[0]-(asset.axisTip[0]-asset.grip[0])*fractions[id]);
 const measure=document.createElement('canvas');measure.width=asset.sourceSize[0];measure.height=asset.sourceSize[1];const scan=measure.getContext('2d');if(!scan)return null;
 scan.drawImage(source,0,0);const pixels=scan.getImageData(0,0,measure.width,measure.height).data;
 let left=measure.width,top=measure.height,right=0,bottom=0;
 for(let y=0;y<measure.height;y++)for(let x=cut;x<measure.width;x++)if(pixels[(y*measure.width+x)*4+3]>16){left=Math.min(left,x);right=Math.max(right,x+1);top=Math.min(top,y);bottom=Math.max(bottom,y+1);}
 if(right<=left||bottom<=top)return null;
 const width=right-left,height=bottom-top,angle=-Math.PI/4,c=Math.abs(Math.cos(angle)),s=Math.abs(Math.sin(angle)),scale=Math.min(56/(width*c+height*s),64/(width*s+height*c));
 const canvas=document.createElement('canvas');canvas.width=64;canvas.height=72;const context=canvas.getContext('2d');if(!context)return null;
 context.translate(32,36);context.rotate(angle);context.drawImage(source,left,top,width,height,-width*scale/2,-height*scale/2,width*scale,height*scale);return canvas.toDataURL();
}
