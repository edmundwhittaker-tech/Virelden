// Test-side read-only geometry planning. The browser still performs every move,
// roll and attack through ordinary native keys; this module cannot mutate game state.
export const NATIVE_ROLL_TRAVEL_PIXELS = 138; // ceil(.38 / (1/60)) ticks ×150px/s ×2.4.
const DIRECTIONS=[['KeyA'],['KeyD'],['KeyW'],['KeyS'],['KeyA','KeyW'],['KeyA','KeyS'],['KeyD','KeyW'],['KeyD','KeyS']];
const screenDelta=(a,b)=>({x:(b.x-b.y-a.x+a.y)*.8,y:(b.x+b.y-a.x-a.y)*.4});
const distance=(a,b)=>{const d=screenDelta(a,b);return Math.hypot(d.x,d.y);};
export function nativeCombatDestination(hero,keys,pixels){
 const x=Number(keys.includes('KeyD'))-Number(keys.includes('KeyA')),y=Number(keys.includes('KeyS'))-Number(keys.includes('KeyW')),n=Math.hypot(x,y)||1;
 const sx=x/n*pixels,sy=y/n*pixels;
 return {x:hero.x+sx/1.6+sy/.8,y:hero.y+sy/.8-sx/1.6};
}
/** Prefer the established driver directions, but reject a complete movement
 * path that hits a solid, breaks target sight or leaves the visible-threat band.
 * The former roll preflight checked45px although the real fixed-step roll travels138px. */
export function visibleNativeCombatKeys({hero,target,preferred,pixels,clearSegment,retreat=false,maxRange=220}){
 const before=distance(hero,target),seen=new Set();
 const candidates=[...preferred,...DIRECTIONS].filter(keys=>{const id=[...keys].sort().join(',');if(seen.has(id))return false;seen.add(id);return true;});
 const safe=keys=>{
  const end=nativeCombatDestination(hero,keys,pixels),range=distance(end,target);
  if(!keys.length||range>=maxRange||retreat&&range<=before||!clearSegment(hero,end))return false;
  const count=Math.max(1,Math.ceil(pixels/6));
  for(let i=1;i<=count;i++)if(!clearSegment(nativeCombatDestination(hero,keys,pixels*i/count),target))return false;
  return true;
 };
 for(const keys of preferred)if(safe(keys))return keys;
 return candidates.filter(safe).sort((a,b)=>distance(nativeCombatDestination(hero,b,pixels),target)-distance(nativeCombatDestination(hero,a,pixels),target))[0]??null;
}
