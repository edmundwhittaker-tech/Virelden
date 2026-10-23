import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {WHOLE_CHARACTER_WALK,wholeCharacterCoverage,wholeCharacterWalkFrame,wholeCharacterHand,wholeCharacterOriginX,wholeCharacterEffectPoint} from '../.test-build/core/wholeCharacterSprite.js';
const manifest=JSON.parse(fs.readFileSync(new URL('../src/assets/player-whole/manifest.json',import.meta.url),'utf8'));
test('the approved eight front walk PNGs retain exact source provenance and approved root registration',()=>{
 assert.equal(manifest.frontWalk.length,8);assert.deepEqual(manifest.frameOrder,[1,2,3,4,5,6,7,8]);
 assert.deepEqual(WHOLE_CHARACTER_WALK.root,[288,480]);assert.equal(WHOLE_CHARACTER_WALK.scale,.25);assert.equal(WHOLE_CHARACTER_WALK.fps,8);
 for(const row of manifest.frontWalk){const bytes=fs.readFileSync(new URL(`../src/assets/player-whole/${row.runtime}`,import.meta.url));assert.equal(createHash('sha256').update(bytes).digest('hex'),row.runtimeSHA256);assert.equal(bytes.readUInt32BE(16),576);assert.equal(bytes.readUInt32BE(20),576);assert.equal(row.sourceToGuide.rotationDegrees,0);assert.ok(row.sourceToGuide.positiveUniformScale>0);}
 const idle=fs.readFileSync(new URL('../src/assets/player-whole/approved-front/idle.png',import.meta.url));assert.equal(createHash('sha256').update(idle).digest('hex'),manifest.idle.sha256);
});
test('off-centre idle root and hand remain registered under Phaser centre-based UV mirroring and whole-actor effects',()=>{
 // These source-coordinate equations match pinned Phaser 3.90.0 CanvasRenderer
 // batchSprite and WebGL MultiPipeline. This is not native screenshot evidence.
 const width=1145,root=610,sourceHand=385,scale=.075;
 for(const flipped of [false,true]){
  const origin=wholeCharacterOriginX(width,root,flipped)*width;
  const renderedSourceX=x=>((flipped?width-x:x)-origin)*scale;
  assert.ok(Math.abs(renderedSourceX(root))<1e-12);
  assert.ok(Math.abs(renderedSourceX(sourceHand)-(sourceHand-root)*scale*(flipped?-1:1))<1e-12);
 }
 // Rotation and uniform scale are applied to the complete body and carry socket
 // around the same foot root, never separately stretched source artwork.
 const p={x:13,y:-38},q=wholeCharacterEffectPoint(p,Math.PI/2,1.2);
 assert.ok(Math.abs(q.x-45.6)<1e-10);assert.ok(Math.abs(q.y-15.6)<1e-10);
});
test('missing rear and every action choose explicit existing renderer rather than front-facing backwards walking',()=>{
 for(const motion of ['idle','walk'])assert.deepEqual(wholeCharacterCoverage({view:'front',motion}),{kind:'whole-character'});
 for(const motion of ['idle','walk'])assert.deepEqual(wholeCharacterCoverage({view:'rear',motion}),{kind:'legacy-action-fallback',reason:'missing-rear-art'});
 for(const view of ['front','rear'])for(const motion of ['attack','roll','interact'])assert.deepEqual(wholeCharacterCoverage({view,motion}),{kind:'legacy-action-fallback',reason:'missing-action-art'});
});
test('approved cadence is eight frames at eight fps and one-handed carry sockets mirror without body warping',()=>{
 for(let frame=0;frame<8;frame++){assert.equal(wholeCharacterWalkFrame((frame+.01)/8),frame);const right=wholeCharacterHand(frame,false),left=wholeCharacterHand(frame,true);assert.equal(left.x,-right.x);assert.equal(left.y,right.y);assert.ok(Number.isFinite(right.x)&&Number.isFinite(right.y));}
 assert.equal(wholeCharacterWalkFrame(1),0);assert.equal(wholeCharacterWalkFrame(NaN),0);
 const source=fs.readFileSync(new URL('../src/game/WholeCharacterPlayerSprite.ts',import.meta.url),'utf8');assert.ok(source.includes("attachment:'one-handed-carry-only',supportGripHeld:false"));assert.ok(!source.includes('bones.get('));
});
