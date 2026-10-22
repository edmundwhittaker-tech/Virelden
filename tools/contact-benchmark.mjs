/** Reproducible LOCAL synthetic projected-geometry timings; not map/native acceptance. */
import {readFileSync,writeFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {enemyPose} from '../.test-build/core/enemyPose.js';
import {enemyEquipmentGeometry} from '../.test-build/core/enemyGeometry.js';
import {resolveEnemyContact} from '../.test-build/core/enemyContact.js';
const manifest=JSON.parse(readFileSync(new URL('../src/assets/enemies-v1/manifest.json',import.meta.url))),alpha=JSON.parse(readFileSync(new URL('../src/assets/enemies-v1/contact-alpha.json',import.meta.url)));
const pose=enemyPose(manifest,'iron_giant','east','active',{x:0,y:0}),gear=enemyEquipmentGeometry(pose,alpha),weapons=gear.filter(p=>!p.equipment.startsWith('shield')),shield=gear.filter(p=>p.equipment.startsWith('shield'));
const rect=(x,y,w=8,h=2)=>({equipment:'player-weapon',layer:0,points:[{x,y},{x:x+w,y},{x:x+w,y:y+h},{x,y:y+h}]});
const blade=(x,y,angle)=>({equipment:'player-blade',layer:0,points:[[0,-1],[40,-1],[40,1],[0,1]].map(([a,b])=>({x:x+a*Math.cos(angle)-b*Math.sin(angle),y:y+a*Math.sin(angle)+b*Math.cos(angle)}))});
const capsule=(x,y,r=7,half=30)=>[{a:{x,y:y-half},b:{x,y:y+half},radius:r}];
const target=(body,shield=[])=>({body,shield}),interval={kind:'active-step',fromTick:0,toTick:1,endExclusive:false};
const cases={
 '51quad-enemy-far-miss':{previousWeaponPolygons:weapons,weaponPolygons:weapons,previousTarget:target(capsule(999,999)),currentTarget:target(capsule(999,999))},
 '51quad-enemy-start-overlap':{previousWeaponPolygons:weapons,weaponPolygons:weapons,previousTarget:target(capsule(250,-130)),currentTarget:target(capsule(250,-128))},
 '51quad-enemy-2px-body-crossing':{previousWeaponPolygons:weapons,weaponPolygons:weapons,previousTarget:target(capsule(250,-185)),currentTarget:target(capsule(250,-183))},
 '51quad-enemy-100px-tunnelling':{previousWeaponPolygons:weapons,weaponPolygons:weapons,previousTarget:target(capsule(250,-180,.5,0)),currentTarget:target(capsule(250,-80,.5,0))},
 'player-tip-15px-translation-to-shield':{previousWeaponPolygons:[rect(-60,-60,20,2)],weaponPolygons:[rect(-45,-60,20,2)],previousTarget:target(capsule(15,-70,8,50),shield),currentTarget:target(capsule(15,-70,8,50),shield)},
 'player-tip-20px-rotation-chord-to-shield':{previousWeaponPolygons:[blade(-68,-40,-.5)],weaponPolygons:[blade(-68,-40,0)],previousTarget:target(capsule(15,-70,8,50),shield),currentTarget:target(capsule(15,-70,8,50),shield)},
 'player-to-41quad-giant-shield':{previousWeaponPolygons:[rect(-100,-60)],weaponPolygons:[rect(100,-60)],previousTarget:target(capsule(15,-70,8,50),shield),currentTarget:target(capsule(15,-70,8,50),shield)},
};
const report={node:process.version,platform:process.platform,description:'Local Node microbenchmark, 20 warmups +100 measured; 4-actor sum is arithmetic estimate, not native parallel/world-frame proof.',results:[]};
for(const [name,c] of Object.entries(cases)){const input={tick:1,attack:1,interval,...c};for(let i=0;i<20;i++)resolveEnemyContact(input);const samples=[];let result;for(let i=0;i<100;i++){const start=performance.now();result=resolveEnemyContact(input);samples.push(performance.now()-start);}samples.sort((a,b)=>a-b);report.results.push({name,weaponPolygons:c.weaponPolygons.length,shieldPolygons:c.currentTarget.shield.length,medianMs:samples[50],p95Ms:samples[94],maxMs:samples.at(-1),fourActorMedianMs:4*samples[50],result});}
const json=JSON.stringify(report,null,2)+'\n';if(process.argv[2])writeFileSync(process.argv[2],json);process.stdout.write(json);
