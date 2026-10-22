/** Sprite-only handoff. No rig, body parts, equipment assembly or gameplay rules. */
export function resolveFacing(manifest,direction='south-east') {
  return manifest.directionMap[direction] || manifest.directionMap['south-east'];
}
export function sampleFrame(manifest,view,animation,elapsedMs=0,phase=null,progress=0) {
  const data=manifest.views[view];
  if(phase && data.phaseFrames[phase]) {
    const frames=data.phaseFrames[phase];
    return frames[Math.min(frames.length-1,Math.floor(Math.max(0,Math.min(1,progress))*frames.length))];
  }
  const a=data.animations[animation] || data.animations.idle;
  const total=a.durationsMs.reduce((s,n)=>s+n,0);
  let t=a.loop?Math.max(0,elapsedMs)%total:Math.min(Math.max(0,elapsedMs),total-0.0001);
  for(let i=0;i<a.frames.length;i++){if(t<a.durationsMs[i])return a.frames[i];t-=a.durationsMs[i];}
  return a.frames.at(-1);
}
export function preloadCharacter(scene,manifest,baseUrl) {
  for(const [view,data] of Object.entries(manifest.views)) {
    scene.load.spritesheet(`${manifest.id}:${view}`,`${baseUrl}/${data.sprite}`,{
      frameWidth:manifest.frameSize[0],frameHeight:manifest.frameSize[1],endFrame:data.frames.length-1
    });
  }
}
export function createCharacter(scene,manifest,x,y) {
  const sprite=scene.add.sprite(x,y,`${manifest.id}:front`,0).setScale(manifest.runtimeScale);
  return {sprite,update({direction='south-east',animation='idle',elapsedMs=0,phase=null,progress=0}={}) {
    const facing=resolveFacing(manifest,direction),frame=sampleFrame(manifest,facing.view,animation,elapsedMs,phase,progress);
    // flipX mirrors the image inside its cell: mirror the origin as well to keep feet fixed.
    const ox=manifest.foot.x/manifest.frameSize[0];
    sprite.setTexture(`${manifest.id}:${facing.view}`,frame).setFlipX(facing.flipX)
      .setOrigin(facing.flipX?1-ox:ox,manifest.foot.y/manifest.frameSize[1]);
    return frame;
  }};
}
