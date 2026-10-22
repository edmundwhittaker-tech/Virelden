/** World-space ground registrations shared by collision and rendering. No screen-only props. */
export const SCENERY = [
 {id:'lever',x:560,y:400,radius:7,art:'lever',width:14,originY:1},
 {id:'west-cache',x:150,y:420,radius:20,art:'ward-coffer',width:45,originY:.9},
 {id:'north-cache',x:420,y:100,radius:20,art:'ward-coffer',width:45,originY:.9},
 {id:'south-cache',x:300,y:540,radius:20,art:'ward-coffer',width:45,originY:.9},
 {id:'forge',x:260,y:330,radius:26,art:'ward-forge',width:60,originY:.85},
 {id:'beacon',x:285,y:285,radius:9,art:'ward-lantern',width:22,originY:.92},
 {id:'lamp-west',x:70,y:230,radius:8,art:'ward-lantern',width:20,originY:.92},
 {id:'lamp-east',x:590,y:190,radius:8,art:'ward-lantern',width:20,originY:.92},
 {id:'lamp-south',x:190,y:580,radius:8,art:'ward-lantern',width:20,originY:.92},
 {id:'rubble-west',x:55,y:570,radius:30,art:'ward-rubble',width:70,originY:.82},
 {id:'rubble-east',x:600,y:550,radius:30,art:'ward-rubble',width:70,originY:.82},
 {id:'rubble-north',x:80,y:40,radius:30,art:'ward-rubble',width:70,originY:.82},
] as const;
export const VAULT_FOOTPRINT={x:365,y:-105,width:240,height:95};
/** Ground-foot Y first; bounded tie slots keep equal-Y ordering deterministic. */
export const groundDepth=(screenY:number,slot=0)=>screenY+slot*.001;
