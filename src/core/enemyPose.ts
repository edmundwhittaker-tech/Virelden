/** Fresh optional reconstruction from public PR7. Not recovered R5 and not activated. */
export interface EnemyPoint {readonly x:number;readonly y:number}
export type EnemyFacing='east'|'west'|'north-east'|'north-west'|'south-east'|'south-west';
export type EnemyArtId='maw_skeleton'|'headless_skeleton'|'iron_giant';
export type EnemyPhase='idle'|'windup'|'active'|'recovery'|'stagger';
export interface EnemyAttachment {readonly equipment:string;readonly image:string;readonly hand:string;readonly position:EnemyPoint;readonly grip:EnemyPoint;readonly rotation:number;readonly scale:EnemyPoint;readonly layer:number}
export interface EnemyArtFrame {readonly index:number;readonly direction:string;readonly pose:string;readonly rect:readonly number[];readonly foot:EnemyPoint;readonly hands:{readonly right:EnemyPoint;readonly left:EnemyPoint};readonly equipment:readonly EnemyAttachment[]}
export interface EnemyArtDefinition {readonly runtimeScale:number;readonly frames:readonly EnemyArtFrame[];readonly animations:Readonly<Record<string,readonly {readonly pose:number;readonly durationMs:number}[]>>}
export interface EnemyArtManifest {readonly enemies:Readonly<Record<EnemyArtId,EnemyArtDefinition>>}
export interface EnemyPose {readonly id:EnemyArtId;readonly facing:EnemyFacing;readonly phase:EnemyPhase;readonly frame:EnemyArtFrame;readonly foot:EnemyPoint;readonly scale:number;readonly mirror:1|-1}
const FACING:readonly string[]=['east','west','north-east','north-west','south-east','south-west'];
export const finitePoint=(p:EnemyPoint)=>Number.isFinite(p.x)&&Number.isFinite(p.y);
/** Contact, simulation and eventual renderer consume this exact result; no visual clock. */
export function enemyPose(manifest:EnemyArtManifest,id:EnemyArtId,facing:EnemyFacing,phase:EnemyPhase,foot:EnemyPoint,walkTimeMs=0):EnemyPose{
 if(!FACING.includes(facing)||!['idle','windup','active','recovery','stagger'].includes(phase)||!finitePoint(foot)||!Number.isFinite(walkTimeMs)||walkTimeMs<0)throw new Error('Invalid enemy pose input');
 const enemy=manifest.enemies[id];if(!enemy||!Number.isFinite(enemy.runtimeScale)||enemy.runtimeScale<=0)throw new Error('Invalid enemy definition');
 let column=phase==='windup'?3:phase==='active'?4:phase==='recovery'?5:0;
 if(phase==='idle'&&walkTimeMs>0){const seq=enemy.animations.walk,total=seq.reduce((n,f)=>n+f.durationMs,0);let t=walkTimeMs%total;for(const f of seq){column=f.pose;if(t<f.durationMs)break;t-=f.durationMs;}}
 const row=facing.startsWith('north')?2:facing.startsWith('south')?1:0,frame=enemy.frames[row*6+column];
 if(!frame||frame.rect.length!==4||!finitePoint(frame.foot))throw new Error('Missing enemy frame');
 return {id,facing,phase,frame,foot:{...foot},scale:enemy.runtimeScale,mirror:facing.endsWith('west')?-1:1};
}
export function enemySourcePoint(pose:EnemyPose,point:EnemyPoint):EnemyPoint{return {x:pose.foot.x+(point.x-pose.frame.foot.x)*pose.scale*pose.mirror,y:pose.foot.y+(point.y-pose.frame.foot.y)*pose.scale};}
/** Reflect the entire local transform once; anatomical hand names stay unchanged. */
export function enemyEquipmentPoint(pose:EnemyPose,item:EnemyAttachment,p:EnemyPoint):EnemyPoint{
 if(!finitePoint(p)||!finitePoint(item.grip)||!finitePoint(item.position)||!finitePoint(item.scale)||!Number.isFinite(item.rotation)||!item.scale.x||!item.scale.y)throw new Error('Invalid equipment transform');
 const x=(p.x-item.grip.x)*item.scale.x,y=(p.y-item.grip.y)*item.scale.y,c=Math.cos(item.rotation),s=Math.sin(item.rotation);
 return enemySourcePoint(pose,{x:item.position.x+x*c-y*s,y:item.position.y+x*s+y*c});
}
