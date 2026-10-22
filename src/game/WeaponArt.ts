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
