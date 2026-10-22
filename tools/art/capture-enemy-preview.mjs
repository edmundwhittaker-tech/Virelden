import {createServer} from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
const root=fileURLToPath(new URL('../../',import.meta.url));
const qa=path.join(root,'docs/qa/enemies-v1');
const frames=path.join(root,'.enemy-preview-frames');await fs.mkdir(frames,{recursive:true});
const server=createServer(async(req,res)=>{
  try{
    const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
    if(!file.startsWith(root))throw new Error('Outside preview');
    const data=await fs.readFile(file);
    const mime={'.html':'text/html','.mjs':'text/javascript','.json':'application/json','.png':'image/png','.webp':'image/webp'}[path.extname(file)]||'application/octet-stream';
    res.writeHead(200,{'Content-Type':mime});res.end(data);
  }catch{res.writeHead(404);res.end('Not found');}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true,args:['--disable-gpu']});
try{
 const page=await browser.newPage({viewport:{width:1100,height:800},deviceScaleFactor:1});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`http://127.0.0.1:${server.address().port}/docs/enemy-art-preview.html`);
 await page.waitForFunction(()=>window.enemyArt?.ready);await page.locator('#pause').click();
 for(const facing of ['east','south-east','north-east','west','south-west','north-west']){
   for(const state of ['idle','attack']){
     const result=await page.evaluate(({facing,state})=>window.enemyArt.render({facing,state,time:state==='attack'?1050:0}),{facing,state});
     assert.equal(result.length,3);assert.ok(result.every(r=>r.flipped===facing.endsWith('west')));
     if(!facing.endsWith('west'))await page.locator('#stage').screenshot({path:path.join(qa,`${facing}-${state}.png`)});
   }
 }
 for(let i=0;i<90;i++){
   const facing=['east','south-east','north-east'][Math.floor(i/30)];
   const local=i%30,state=local<8?'walk':'attack',time=local<8?local*100:(local-8)*100;
   await page.evaluate(p=>window.enemyArt.render(p),{facing,state,time});
   await page.locator('#stage').screenshot({path:path.join(frames,`${String(i).padStart(3,'0')}.png`)});
 }
 assert.deepEqual(errors,[]);console.log('Browser art QA passed: all 12 assets decoded; 6 directions; idle/attack poses; 90 game-size animation frames; no page errors.');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
