import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createServer} from 'node:http';
import {chromium} from '@playwright/test';
import ts from 'typescript';
const root=fileURLToPath(new URL('../../',import.meta.url)),work=path.resolve(root,'../lore-art-work');
const source=await fs.readFile(path.join(root,'src/core/modularRig.ts'),'utf8');
await fs.writeFile(path.join(work,'rig.mjs'),ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText);
const server=createServer(async(req,res)=>{try{
 const url=decodeURIComponent(new URL(req.url,'http://localhost').pathname),base=url.startsWith('/__work/')?work:root;
 const file=path.resolve(base,'.'+(base===work?url.slice(7):url));if(!file.startsWith(base))throw new Error('outside root');
 const data=await fs.readFile(file),mime={'.html':'text/html','.mjs':'text/javascript','.json':'application/json','.png':'image/png','.webp':'image/webp'}[path.extname(file)];res.writeHead(200,{'Content-Type':mime||'application/octet-stream'});res.end(data);
}catch{res.writeHead(404);res.end('Not found');}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true,args:['--disable-gpu']});
try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`http://127.0.0.1:${server.address().port}/tools/art/lore-sprite-baker.html`);await page.waitForFunction(()=>window.loreBake?.ready);
 if(process.argv.includes('--draft')){
  const data=await page.evaluate(()=>window.loreBake.preview());await fs.writeFile(path.join(work,'draft.png'),Buffer.from(data.split(',')[1],'base64'));console.log('Wrote offline draft assembly preview.');
 }else{
  const config=await page.evaluate(()=>window.loreBake.config),index={version:1,type:'pre-rendered-enemy-sprites',runtimeRigRequired:false,characters:[]};
  for(const ch of config.characters){
   const folder=path.join(root,'src/assets/lore-characters-v1',ch.id);await fs.mkdir(folder,{recursive:true});
   const character={version:1,id:ch.id,name:ch.name,action:ch.action,type:'complete-sprite-frames',runtimeRigRequired:false,
    layerOrder:{"composition": ["back-equipment (layer < 8)", "body", "foreground-equipment (ascending layer)", "hands overlay"], "equipmentIncludedInSprite": true, "coordinateSpace": "source cell pixels, radians; apply sprite origin/scale/flip to attachments"},
    humanHeightScreen:88,runtimeScale:.5,foot:{x:176,y:304},frameSize:[384,384],views:{},equipment:ch.equipment,
    directionMap:{'south-east':{view:'front',flipX:false},'south-west':{view:'front',flipX:true},'north-east':{view:'rear',flipX:false},'north-west':{view:'rear',flipX:true},east:{view:'front',flipX:false},west:{view:'front',flipX:true},north:{view:'rear',flipX:false},south:{view:'front',flipX:false}},
    directionLimit:'Two authored isometric views plus mirroring; exact east/west use the front three-quarter source, matching the active player rig. North/south may retain last horizontal side.',
    use:'Prefer sprite-*.webp: body AND equipment already baked in. Optional body/hands/equipment are for custom attachments only; never draw equipment twice.',
    timingAuthority:'Suggested playback only. Caller simulation chooses phase/progress; active progress zero selects the first contact frame. No combat stats, AI or magic mechanics are supplied.'};
   for(const view of ['front','rear']){
    if(!ch.views[view])throw new Error(`Missing ${ch.id} ${view}`);
    const result=await page.evaluate(({id,view})=>window.loreBake.bake(id,view),{id:ch.id,view});
    for(const [kind,data]of Object.entries(result.images))await fs.writeFile(path.join(folder,`${kind==='full'?'sprite':kind}-${view}.webp`),Buffer.from(data.split(',')[1],'base64'));
    const {images,...meta}=result;character.views[view]={sprite:`sprite-${view}.webp`,body:`body-${view}.webp`,hands:`hands-${view}.webp`,...meta};
    console.log(`Baked ${ch.id} ${view}: ${result.frames.length} complete sprite frames.`);
   }
   await fs.writeFile(path.join(folder,'manifest.json'),JSON.stringify(character,null,2)+'\n');
   index.characters.push({id:ch.id,name:ch.name,manifest:`${ch.id}/manifest.json`,humanHeightScreen:88});
  }
  await fs.writeFile(path.join(root,'src/assets/lore-characters-v1/manifest.json'),JSON.stringify(index,null,2)+'\n');
 }
 if(errors.length)throw new Error(errors.join('\n'));
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
