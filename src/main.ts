import Phaser from 'phaser';
import './style.css';
import { CourtyardScene } from './game/CourtyardScene.js';
window.addEventListener('error',()=>{
  const loading=document.getElementById('loading');
  if(loading){loading.hidden=false;loading.textContent='The prototype could not start. Open the browser console for the error, then reload.';}
});
// Canvas avoids software-WebGL stalls on modest machines; no shader-only effects are used.
const game=new Phaser.Game({
  type:Phaser.CANVAS,parent:'game',backgroundColor:'#050608',banner:false,
  width:1280,height:800,scene:[CourtyardScene],fps:{target:60,smoothStep:false},
  scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},
  render:{antialias:true,roundPixels:false},audio:{noAudio:true}
});
if(import.meta.hot)import.meta.hot.dispose(()=>game.destroy(true));
