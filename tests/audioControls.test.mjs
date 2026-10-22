import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {soundControlsMarkup,isNativeFormTarget} from '../.test-build/ui/soundControls.js';

test('sound controls are opt-in, accessible, low default and controls-panel only',()=>{
 const markup=soundControlsMarkup(false,.12);
 assert.equal((markup.match(/>Enable sound<\/button>/g)||[]).length,1);
 assert.match(markup,/data-action="audio-enable"/);
 assert.match(markup,/aria-labelledby="sound-title"/);
 assert.match(markup,/<label for="sound-volume">/);
 assert.match(markup,/type="range" min="0" max="35" step="1" value="12"/);
 assert.match(markup,/id="sound-status" role="status" aria-live="polite"/);
 assert.match(markup,/muted on every load/);
 assert.match(soundControlsMarkup(true,.2),/>Mute sound<\/button>/);
 const scene=readFileSync(new URL('../src/game/CourtyardScene.ts',import.meta.url),'utf8');
 assert.equal((scene.match(/soundControlsMarkup\(/g)||[]).length,1);
 assert.match(scene,/else if\(menu==='help'\).*soundControlsMarkup/);
});

test('range and other native editing targets bypass gameplay key prevention',()=>{
 for(const tagName of ['INPUT','TEXTAREA','SELECT'])assert.equal(isNativeFormTarget({tagName,isContentEditable:false}),true);
 assert.equal(isNativeFormTarget({tagName:'DIV',isContentEditable:true}),true);
 assert.equal(isNativeFormTarget({tagName:'BUTTON',isContentEditable:false}),false);
 assert.equal(isNativeFormTarget(null),false);
 const scene=readFileSync(new URL('../src/game/CourtyardScene.ts',import.meta.url),'utf8');
 assert.ok(scene.indexOf("if(isNativeFormTarget(event.target)&&event.code!=='Escape')return;")<scene.indexOf("if([...movement,'Space'"));
 assert.match(scene,/#panel input:not\(:disabled\)/);
});

test('source integration keeps saves and Phaser sound untouched and removes added listeners on shutdown',()=>{
 const scene=readFileSync(new URL('../src/game/CourtyardScene.ts',import.meta.url),'utf8');
 const main=readFileSync(new URL('../src/main.ts',import.meta.url),'utf8');
 assert.match(main,/audio:\{noAudio:true\}/);
 assert.match(scene,/const blur=\(\)=>\{this.stopSound\(\)/);
 assert.match(scene,/pending=this\.atmosphereAudio\.enableFromGesture\(\);this\.refreshSoundControls\(\);void pending\.then/);
 assert.match(scene,/if\(intent!==this\.audioIntent\)return/);
 assert.match(scene,/if\(action==='audio-enable'&&!event\.isTrusted\)return;this\.panelAction\(action\)/);
 assert.match(scene,/this\.atmosphereAudio\.shutdown\(\);this\.soundEvents\.clear\(\)/);
 assert.match(scene,/removeEventListener\('input',soundInput\)/);
 assert.match(scene,/areaChanged=true;this.stopSound\(\)/);
 assert.match(scene,/if\(!areaChanged&&this\.soundAllowed\(\)&&this\.atmosphereAudio\.enabled\)/);
 assert.doesNotMatch(scene,/localStorage\.(setItem|getItem).*sound/i);
});
