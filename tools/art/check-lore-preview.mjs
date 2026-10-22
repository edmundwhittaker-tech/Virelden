import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createServer} from 'node:http';
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {sampleFrame} from './lore-sprite-player.mjs';
const root=path.resolve(fileURLToPath(new URL('../../',import.meta.url))),base=path.join(root,'src/assets/lore-characters-v1');
const index=JSON.parse(await fs.readFile(path.join(base,'manifest.json'),'utf8'));
for(const c of index.characters){const m=JSON.parse(await fs.readFile(path.join(base,c.manifest),'utf8'));
 for(const [view,d]of Object.entries(m.views)){
  assert.equal(sampleFrame(m,view,'attack',0,'active',0),d.phaseFrames.active[0]);
  assert.equal(sampleFrame(m,view,'death',1e8),d.animations.death.frames.at(-1));
  assert.equal(sampleFrame(m,view,'walk',d.animations.walk.durationsMs.reduce((a,b)=>a+b,0)),d.animations.walk.frames[0]);
 }}
const server=createServer(async(req,res)=>{try{
 const f=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!f.startsWith(root+path.sep))throw Error('outside root');
 const data=await fs.readFile(f),mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.webp':'image/webp'}[path.extname(f)];res.writeHead(200,{'Content-Type':mime||'application/octet-stream'});res.end(data);
}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,args:['--disable-gpu']});
try{const page=await browser.newPage({viewport:{width:1100,height:650}}),errors=[],requests=[];page.on('pageerror',e=>{errors.push(e.message);console.log('PAGE ERROR',e.message)});page.on('console',m=>{if(m.type()==='error')console.log('BROWSER',m.text())});page.on('request',r=>requests.push(r.url()));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
 await page.goto(`http://127.0.0.1:${server.address().port}/docs/lore-character-preview.html`);
 await page.waitForFunction(()=>window.spritePreview?.ready).catch(async e=>{console.log('ERRORS',errors);console.log('STATE',await page.evaluate(()=>({text:document.body.innerText,resources:performance.getEntriesByType('resource').map(r=>r.name)})));await page.screenshot({path:'/workspace/scratch/ef5638e82cc3/lore-preview-error.png'});throw e;});
 for(const direction of ['south-east','south-west','north-east','north-west'])for(const animation of ['idle','walk','attack','hurt','death','dead','guard','interact']){
  await page.evaluate(({animation,direction})=>window.spritePreview.set(animation,direction,300),{animation,direction});await page.waitForTimeout(35);
  const frames=await page.evaluate(()=>window.spritePreview.actors.map(a=>({frame:a.sprite.frame.name,origin:a.sprite.originX,flip:a.sprite.flipX})));
  assert.equal(frames.length,4);assert.ok(frames.every(a=>Number.isInteger(a.frame)));
  for(let i=0;i<4;i++){const m=JSON.parse(await fs.readFile(path.join(base,index.characters[i].manifest),'utf8')),facing=m.directionMap[direction];assert.equal(frames[i].frame,sampleFrame(m,facing.view,animation,300));assert.ok(Math.abs((frames[i].flip?384-176:176)-frames[i].origin*384)<1e-8,'Mirrored foot shifted');}
 }
 for(const [animation,direction,time,name]of [['idle','south-east',0,'idle-front'],['attack','north-west',850,'attack-rear-mirrored'],['death','south-east',1000,'death-front']]){
  await page.evaluate(({animation,direction,time})=>window.spritePreview.set(animation,direction,time),{animation,direction,time});await page.waitForTimeout(40);
  await page.locator('#stage canvas').screenshot({path:path.join(base,'previews',name+'.png')});
 }
 assert.ok(!requests.some(u=>/body-|hands-|equipment\/|__work|rig\.mjs/.test(u)),'Runtime preview loaded modular art');
 assert.deepEqual(errors,[]);console.log('Sprite-only Phaser preview: all 32 animation/facing combinations, first-contact frame, loops and held death passed; no body-part/equipment/rig loads.');
}finally{await browser.close();await new Promise(r=>server.close(r));}
