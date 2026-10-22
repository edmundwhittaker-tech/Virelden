import fs from 'node:fs';
import {attachments} from './enemy-rig.mjs';

const path=new URL('../../src/assets/enemies-v1/manifest.json',import.meta.url);
const manifest=JSON.parse(fs.readFileSync(path,'utf8'));
const timings={maw_skeleton:[650,140,500,160],headless_skeleton:[300,100,250,110],iron_giant:[950,220,850,240]};
for(const [id,enemy] of Object.entries(manifest.enemies)) {
  const [windup,contact,recovery,step]=timings[id];
  enemy.animations={
    idle:[{pose:0,durationMs:1000}],
    walk:[{pose:1,durationMs:step},{pose:0,durationMs:step*.65},{pose:2,durationMs:step},{pose:0,durationMs:step*.65}],
    attack:[{pose:3,durationMs:windup},{pose:4,durationMs:contact},{pose:5,durationMs:recovery}],
  };
  for(const frame of enemy.frames) {
    frame.equipment=attachments(manifest,id,frame).map(e=>({...e,image:manifest.equipment[e.equipment].image}));
    frame.layerOrder=[...frame.equipment.map(e=>({name:e.equipment,layer:e.layer})),{name:'body',layer:0},{name:'hands-overlay',layer:5}].sort((a,b)=>a.layer-b.layer);
  }
  enemy.timingAuthority='Preview timings only. At integration use simulation phases; first active tick selects contact pose.';
}
manifest.animations={poseColumns:{idle:0,'step-a':1,'step-b':2,windup:3,contact:4,recovery:5},
  loop:['idle','walk'],clamp:['attack'],
  limits:'Three body attack poses; low-frame-count walk uses two step extremes and idle as a passing pose. No authored hurt/fall/death/roll or shield-bash cycle in this pack.'};
manifest.layerContract={worldDepth:'All local layers share the same world foot depth; use small local depth offsets or a depth-sorted container.',
  behindBody:'Rear-facing equipment and far knife',body:0,foregroundEquipment:'Front-facing held weapon/shield',fingerOcclusion:5,
  integration:'Use ONLY this equipment set with these bodies. Do not also render KnightSprite weapons or baked equipment reference sheets.'};
manifest.handAnnotations='Visible fist centres manually checked. Occluded hands are explicit anatomical targets; inspect visibility per frame. Hand patches occlude grips after held equipment.';
fs.writeFileSync(path,JSON.stringify(manifest,null,2)+'\n');
console.log('Prepared per-frame equipment grips, two-hand axe constraints, timings and local layer orders.');
