/** Connected prototype station route; local names are adaptations, not campaign canon. */
export const LEVEL_SECTIONS=[
 {id:'ward',name:'Lower Ward',x:0,y:0,width:640,height:640},
 {id:'ascent',name:'Lamp Ascent',x:0,y:-640,width:640,height:640},
 {id:'transfer',name:'Transfer Court',x:0,y:-1280,width:640,height:640},
 {id:'watch',name:'Upper Watch',x:0,y:-1920,width:640,height:640},
] as const;
export const STATION_GATE={x:485,y:0,left:425,right:545,lever:{x:550,y:70},stance:{x:557,y:126.1},pullSeconds:.8,openSeconds:2.2};
export const CHECKPOINTS=[{x:320,y:320},{x:480,y:-1000}] as const;
export const FINISH={x:320,y:-1840};
export const LEVEL_WALLS=[
 {x:0,y:-16,width:425,height:32},{x:545,y:-16,width:95,height:32},
 {x:0,y:-330,width:420,height:24},
 {x:210,y:-650,width:430,height:24},
 {x:0,y:-930,width:330,height:24},
 {x:0,y:-1290,width:430,height:24},
 {x:210,y:-1570,width:430,height:24},
] as const;
// Surveyed centre-line through every encounter section, measured in projected pixels.
export const BASELINE_ROUTE=[{x:320,y:320},{x:320,y:250},{x:220,y:160},{x:170,y:300},{x:110,y:350},{x:110,y:460},{x:400,y:460},{x:480,y:450}];
export const ROUTE=[...BASELINE_ROUTE,{x:450,y:300},{x:470,y:180},{x:470,y:70},{x:530,y:70},{x:485,y:-110},{x:485,y:-400},{x:130,y:-550},{x:130,y:-770},{x:470,y:-850},{x:480,y:-1000},{x:500,y:-1380},{x:125,y:-1480},{x:125,y:-1670},{x:320,y:-1840}];
const routeLength=(points:readonly {x:number;y:number}[])=>points.slice(1).reduce((n,p,i)=>{const a=points[i];return n+Math.hypot((p.x-p.y-a.x+a.y)*.8,(p.x+p.y-a.x-a.y)*.4);},0);
export const LEVEL_METRICS={baselineRoute:routeLength(BASELINE_ROUTE),expandedRoute:routeLength(ROUTE),baselineEncounters:3,expandedEncounters:12,baselineArea:640*640,expandedArea:640*640*4};
export const EXPANDED_SCENERY=[
 {id:'ascent-pier-west',x:80,y:-120,radius:23,art:'ward-pillar',width:60,originY:.94},
 {id:'ascent-pier-east',x:590,y:-540,radius:23,art:'ward-pillar',width:60,originY:.94},
 {id:'ascent-lamp-turn',x:60,y:-560,radius:8,art:'ward-lantern',width:22,originY:.92},
 {id:'ascent-rubble-bend',x:310,y:-410,radius:30,art:'ward-rubble',width:70,originY:.82},
 {id:'transfer-pier-west',x:60,y:-720,radius:23,art:'ward-pillar',width:60,originY:.94},
 {id:'transfer-pier-east',x:590,y:-1120,radius:23,art:'ward-pillar',width:60,originY:.94},
 {id:'transfer-lamp-entry',x:200,y:-730,radius:8,art:'ward-lantern',width:22,originY:.92},
 {id:'transfer-lamp-exit',x:570,y:-1220,radius:8,art:'ward-lantern',width:22,originY:.92},
 {id:'watch-pier-west',x:60,y:-1380,radius:23,art:'ward-pillar',width:60,originY:.94},
 {id:'watch-pier-east',x:540,y:-1680,radius:23,art:'ward-pillar',width:60,originY:.94},
 {id:'watch-lamp-exit',x:250,y:-1860,radius:8,art:'ward-lantern',width:22,originY:.92},
 {id:'watch-rubble-cover',x:300,y:-1500,radius:30,art:'ward-rubble',width:70,originY:.82},
 {id:'station-lever',x:550,y:70,radius:7,art:'lever',width:14,originY:1},
 {id:'ascent-lamp',x:590,y:-220,radius:8,art:'ward-lantern',width:22,originY:.92},
 {id:'ascent-rubble',x:60,y:-200,radius:32,art:'ward-rubble',width:80,originY:.82},
 {id:'transfer-cache',x:570,y:-750,radius:20,art:'ward-coffer',width:45,originY:.9},
 {id:'transfer-beacon',x:445,y:-1035,radius:9,art:'ward-lantern',width:22,originY:.92},
 {id:'transfer-rubble',x:70,y:-1150,radius:32,art:'ward-rubble',width:80,originY:.82},
 {id:'watch-lamp',x:580,y:-1420,radius:8,art:'ward-lantern',width:22,originY:.92},
 {id:'watch-rubble',x:570,y:-1790,radius:32,art:'ward-rubble',width:80,originY:.82},
] as const;
