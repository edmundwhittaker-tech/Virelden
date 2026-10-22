/** Art-only, engine-independent frame selection and attachment contract.
 * Nothing imports this module from the game. Source units are manifest pixels.
 */
export function directionRow(direction) {
  return direction.startsWith('north') ? 2 : direction.startsWith('south') ? 1 : 0;
}

export function sample(manifest, enemyId, direction, animation, elapsedMs = 0, phase) {
  const enemy = manifest.enemies[enemyId];
  if (!enemy) throw new Error(`Unknown enemy: ${enemyId}`);
  const sequence = enemy.animations[animation];
  if (!sequence) throw new Error(`Unknown animation: ${animation}`);
  const total = sequence.reduce((sum, frame) => sum + frame.durationMs, 0);
  let time = Math.max(0, elapsedMs);
  time = animation === 'attack' ? Math.min(time, total - .001) : time % total;
  let chosen = sequence.at(-1);
  for (const frame of sequence) {
    if (time < frame.durationMs) { chosen = frame; break; }
    time -= frame.durationMs;
  }
  // Simulation-owned phases can override the preview clock. In particular the
  // first ACTIVE tick always selects contact; there is no delayed visual hit.
  const column = phase ? ({idle:0,windup:3,active:4,recovery:5}[phase]) : chosen.pose;
  if (column === undefined) throw new Error(`Unknown combat phase: ${phase}`);
  const frame = enemy.frames[directionRow(direction) * 6 + column];
  return {enemy, frame, flipped:direction.endsWith('west')};
}

/** Precomputed attachment records in the manifest are sufficient for Phaser,
 * Pixi, Canvas or another renderer; this builds those records at export time.
 */
export function attachments(manifest, enemyId, frame) {
  const rear = frame.direction === 'north-east';
  const {right, left} = frame.hands;
  const item = (equipment, hand, rotation, layer, extras={}) => ({
    equipment, hand, position:{x:frame.hands[hand].x,y:frame.hands[hand].y},
    grip:{...manifest.equipment[equipment].grip}, rotation, scale:{x:1,y:1},layer,...extras,
  });
  if (enemyId === 'maw_skeleton') {
    const distance = Math.hypot(left.x-right.x,left.y-right.y);
    const angle = Math.atan2(left.y-right.y,left.x-right.x);
    const grip = manifest.equipment.axe.grip;
    return [item('axe','right',angle,rear?-2:2,{
      secondaryHand:'left', secondaryGrip:{x:grip.x+distance,y:grip.y},
      attachmentMode:'two hand points on one rigid shaft; second hand slides along grip rail',
    })];
  }
  const aim = rear ? -.38 : frame.direction === 'south-east' ? .38 : 0;
  if (enemyId === 'headless_skeleton') {
    const rightAngle = frame.pose==='windup' ? -1.4 : frame.pose==='contact' ? aim : frame.pose==='recovery' ? .8 : 1.05;
    return [item('knife','left',frame.pose==='recovery'?aim:.35,-1),item('knife','right',rightAngle,rear?-2:2)];
  }
  const tridentAngle = frame.pose==='windup' ? -2.0 : frame.pose==='contact' ? aim : frame.pose==='recovery' ? -.8 : -Math.PI/2;
  const shield = rear?'shield-back':frame.direction==='east'?'shield-side':'shield-front';
  return [item(shield,'left',0,rear?-3:3),item('trident','right',tridentAngle,rear?-2:2)];
}

export function drawFrame(ctx, images, enemy, frame, flipped, worldFoot, scaleMultiplier=1) {
  const scale=enemy.runtimeScale*scaleMultiplier;
  ctx.save();
  ctx.translate(worldFoot.x,worldFoot.y);
  ctx.scale(flipped?-scale:scale,scale);
  ctx.translate(-frame.foot.x,-frame.foot.y);
  const body={kind:'body',layer:0},hands={kind:'hands',layer:5};
  const commands=[body,...frame.equipment.map(e=>({kind:'equipment',...e})),hands].sort((a,b)=>a.layer-b.layer);
  for(const command of commands) {
    if(command.kind==='body'||command.kind==='hands') {
      const path=command.kind==='body'?enemy.body:enemy.handsOverlay;
      const [x,y,w,h]=frame.rect;
      ctx.drawImage(images[path],x,y,w,h,0,0,w,h);
    } else {
      ctx.save();
      ctx.translate(command.position.x,command.position.y);
      ctx.rotate(command.rotation);
      ctx.scale(command.scale.x,command.scale.y);
      ctx.drawImage(images[command.image],-command.grip.x,-command.grip.y);
      ctx.restore();
    }
  }
  ctx.restore();
}
