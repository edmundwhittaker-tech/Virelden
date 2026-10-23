/** Local game adaptations inspired by the public Virelden archive; not campaign canon.
 * Stable reward IDs and budgets are persistence contracts. Geometry uses unprojected ground units.
 */
import type {Point} from './game.js';
import type {WeaponId} from './weaponCatalog.js';
import type {ArmorId} from './equipment.js';
export type AreaId='station'|'cistern-viaduct'|'record-annex';
export type ExpeditionId=Exclude<AreaId,'station'>;
export interface Region {readonly id:string;readonly x:number;readonly y:number;readonly width:number;readonly height:number}
export interface FloorRegion extends Region {readonly polygon:readonly Point[];readonly requires?:string}
export interface AreaWall extends Region {readonly disabledWhen?:string}
export interface AreaProp extends Point {readonly id:string;readonly radius:number;readonly art:string;readonly width:number;readonly originY:number;readonly footprint?:{readonly width:number;readonly height:number}}
export interface AreaEnemy {readonly id:string;readonly kind:'raider'|'watcher'|'captain';readonly position:Point;readonly home:Point;readonly maxHp:number;readonly reward:number;readonly activationRange:number;readonly leashRange:number;readonly maxAttackRange:number;readonly minimumWindupSeconds:number}
export interface AreaLoot {readonly id:string;readonly position:Point;readonly stance:Point;readonly interactionRadiusProjected:number;readonly reward:{readonly weapon?:WeaponId;readonly armor:readonly ArmorId[];readonly currency:number;readonly xp?:number;readonly xpRewardId?:string;readonly requiresDefeated:readonly string[]};readonly rewardOnce:boolean}
export interface AreaShortcut {readonly id:string;readonly kind:'add-floor'|'disable-wall';readonly floorId?:string;readonly wallId?:string;readonly lever:Point;readonly stance:Point;readonly requiresDefeated:readonly string[];readonly animationSeconds:number}
export interface AreaExit {readonly id:string;readonly position:Point;readonly stance:Point;readonly target:AreaId|null;readonly targetArrival?:Point;readonly requiresDefeated?:readonly string[];readonly secureObjective?:{readonly id:string;readonly xp:number;readonly currency:number;readonly oneTime:boolean}}
export interface ExpeditionDefinition {readonly id:ExpeditionId;readonly name:string;readonly bounds:Region;readonly camera:{readonly projectedWorldBounds:{readonly x:number;readonly y:number;readonly width:number;readonly height:number}};readonly safety:{readonly checkpointSanctuaryProjectedRadius:number;readonly arrivalGraceSeconds:number};readonly entry:{readonly from:AreaId;readonly arrival:Point;readonly requiresExternalDefeated:{readonly expeditionId:AreaId;readonly enemyId:string}};readonly checkpoints:readonly {readonly id:string;readonly position:Point;readonly safeRadiusProjected:number}[];readonly floors:readonly FloorRegion[];readonly hazardRegions:readonly (Region&{readonly excludeActiveFloorIds:readonly string[]})[];readonly walls:readonly AreaWall[];readonly props:readonly AreaProp[];readonly enemies:readonly AreaEnemy[];readonly loot:readonly AreaLoot[];readonly shortcuts:readonly AreaShortcut[];readonly exits:readonly AreaExit[];readonly routeWaypoints:readonly Point[]}
const DATA=[
 {
  "id": "cistern-viaduct",
  "name": "Cistern Viaduct",
  "bounds": {
   "id": "bounds",
   "x": 0,
   "y": 0,
   "width": 960,
   "height": 960
  },
  "camera": {
   "projection": {
    "offsetX": 640,
    "offsetY": 180,
    "scaleX": 0.8,
    "scaleY": 0.4
   },
   "projectedWorldBounds": {
    "x": -288,
    "y": -40,
    "width": 1856,
    "height": 1120
   },
   "visualApronGroundUnits": 100,
   "maxPropRiseProjected": 120,
   "clampToVisualApron": true,
   "neverClampPlayerToCamera": true
  },
  "safety": {
   "checkpointSanctuaryProjectedRadius": 60,
   "arrivalGraceSeconds": 1.5,
   "clearProjectilesOnRestTransitionRetry": true,
   "watchersRespectSanctuary": true,
   "noEnemyRespawnsOnRest": true,
   "voidEdges": "solid; no fall damage or hidden traversal",
   "interactionLineOfSight": true,
   "shortcutNeverRequiredForExit": true
  },
  "entry": {
   "from": "station",
   "port": "station:upper-watch-exit",
   "arrival": {
    "x": 120,
    "y": 800
   },
   "physicalConnection": "Short screened stair from the Upper Watch down to the same station reservoir; not Plate travel.",
   "requiresExternalDefeated": {
    "expeditionId": "station",
    "enemyId": "upper-captain"
   }
  },
  "checkpoints": [
   {
    "id": "entry-beacon",
    "position": {
     "x": 120,
     "y": 800
    },
    "arrival": true,
    "safeRadiusProjected": 60
   }
  ],
  "floors": [
   {
    "id": "west-bank",
    "x": 40,
    "y": 80,
    "width": 240,
    "height": 800,
    "polygon": [
     {
      "x": 40,
      "y": 80
     },
     {
      "x": 280,
      "y": 80
     },
     {
      "x": 280,
      "y": 880
     },
     {
      "x": 40,
      "y": 880
     }
    ]
   },
   {
    "id": "upper-viaduct",
    "x": 240,
    "y": 80,
    "width": 520,
    "height": 200,
    "polygon": [
     {
      "x": 240,
      "y": 80
     },
     {
      "x": 760,
      "y": 80
     },
     {
      "x": 760,
      "y": 280
     },
     {
      "x": 240,
      "y": 280
     }
    ]
   },
   {
    "id": "east-bank",
    "x": 720,
    "y": 80,
    "width": 200,
    "height": 800,
    "polygon": [
     {
      "x": 720,
      "y": 80
     },
     {
      "x": 920,
      "y": 80
     },
     {
      "x": 920,
      "y": 880
     },
     {
      "x": 720,
      "y": 880
     }
    ]
   },
   {
    "id": "lower-service-spur",
    "x": 240,
    "y": 720,
    "width": 400,
    "height": 160,
    "polygon": [
     {
      "x": 240,
      "y": 720
     },
     {
      "x": 640,
      "y": 720
     },
     {
      "x": 640,
      "y": 880
     },
     {
      "x": 240,
      "y": 880
     }
    ]
   },
   {
    "id": "return-bridge",
    "x": 240,
    "y": 520,
    "width": 520,
    "height": 120,
    "polygon": [
     {
      "x": 240,
      "y": 520
     },
     {
      "x": 760,
      "y": 520
     },
     {
      "x": 760,
      "y": 640
     },
     {
      "x": 240,
      "y": 640
     }
    ],
    "requires": "return-bridge-open"
   }
  ],
  "hazardRegions": [
   {
    "id": "reservoir-water",
    "x": 280,
    "y": 280,
    "width": 440,
    "height": 440,
    "walkable": false,
    "damage": false,
    "excludeActiveFloorIds": [
     "return-bridge"
    ]
   }
  ],
  "walls": [
   {
    "id": "lower-span-collapse",
    "x": 600,
    "y": 720,
    "width": 40,
    "height": 160
   }
  ],
  "props": [
   {
    "id": "west-pier",
    "x": 80,
    "y": 120,
    "radius": 23,
    "art": "ward-pillar",
    "width": 60,
    "originY": 0.94
   },
   {
    "id": "upper-pier",
    "x": 620,
    "y": 110,
    "radius": 23,
    "art": "ward-pillar",
    "width": 60,
    "originY": 0.94
   },
   {
    "id": "east-pier",
    "x": 880,
    "y": 320,
    "radius": 23,
    "art": "ward-pillar",
    "width": 60,
    "originY": 0.94
   },
   {
    "id": "entry-lantern",
    "x": 85,
    "y": 765,
    "radius": 9,
    "art": "ward-lantern",
    "width": 22,
    "originY": 0.92
   },
   {
    "id": "bridge-lantern",
    "x": 760,
    "y": 540,
    "radius": 8,
    "art": "ward-lantern",
    "width": 22,
    "originY": 0.92
   },
   {
    "id": "north-cache",
    "x": 500,
    "y": 140,
    "radius": 20,
    "art": "ward-coffer",
    "width": 45,
    "originY": 0.9
   },
   {
    "id": "spur-cache",
    "x": 500,
    "y": 800,
    "radius": 20,
    "art": "ward-coffer",
    "width": 45,
    "originY": 0.9
   },
   {
    "id": "span-rubble",
    "x": 570,
    "y": 760,
    "radius": 30,
    "art": "ward-rubble",
    "width": 70,
    "originY": 0.82
   }
  ],
  "enemies": [
   {
    "id": "west-sentinel",
    "kind": "raider",
    "position": {
     "x": 130,
     "y": 450
    },
    "home": {
     "x": 130,
     "y": 450
    },
    "maxHp": 105,
    "reward": 35,
    "activationRange": 250,
    "leashRange": 280,
    "maxAttackRange": 60,
    "minimumWindupSeconds": 0.7
   },
   {
    "id": "bridge-guard",
    "kind": "raider",
    "position": {
     "x": 420,
     "y": 180
    },
    "home": {
     "x": 420,
     "y": 180
    },
    "maxHp": 130,
    "reward": 40,
    "activationRange": 250,
    "leashRange": 280,
    "maxAttackRange": 60,
    "minimumWindupSeconds": 0.7
   },
   {
    "id": "bow-lookout",
    "kind": "watcher",
    "position": {
     "x": 800,
     "y": 180
    },
    "home": {
     "x": 800,
     "y": 180
    },
    "maxHp": 80,
    "reward": 35,
    "activationRange": 220,
    "leashRange": 280,
    "maxAttackRange": 180,
    "minimumWindupSeconds": 1.05
   },
   {
    "id": "east-patrol",
    "kind": "raider",
    "position": {
     "x": 800,
     "y": 450
    },
    "home": {
     "x": 800,
     "y": 450
    },
    "maxHp": 120,
    "reward": 40,
    "activationRange": 250,
    "leashRange": 280,
    "maxAttackRange": 60,
    "minimumWindupSeconds": 0.7
   },
   {
    "id": "cache-guard",
    "kind": "raider",
    "position": {
     "x": 420,
     "y": 800
    },
    "home": {
     "x": 420,
     "y": 800
    },
    "maxHp": 120,
    "reward": 40,
    "activationRange": 250,
    "leashRange": 280,
    "maxAttackRange": 60,
    "minimumWindupSeconds": 0.7
   },
   {
    "id": "sluice-warden",
    "kind": "captain",
    "position": {
     "x": 800,
     "y": 740
    },
    "home": {
     "x": 800,
     "y": 740
    },
    "maxHp": 340,
    "reward": 120,
    "activationRange": 250,
    "leashRange": 280,
    "maxAttackRange": 78,
    "minimumWindupSeconds": 0.95
   }
  ],
  "loot": [
   {
    "id": "north-cache",
    "position": {
     "x": 500,
     "y": 140
    },
    "stance": {
     "x": 540,
     "y": 140
    },
    "interactionRadiusProjected": 38,
    "reward": {
     "weapon": "falchion",
     "armor": [
      "marcher-gauntlets"
     ],
     "currency": 35,
     "requiresDefeated": [
      "bridge-guard"
     ]
    },
    "rewardOnce": true
   },
   {
    "id": "spur-cache",
    "position": {
     "x": 500,
     "y": 800
    },
    "stance": {
     "x": 540,
     "y": 800
    },
    "interactionRadiusProjected": 38,
    "reward": {
     "armor": [
      "marcher-legs"
     ],
     "currency": 45,
     "xp": 30,
     "xpRewardId": "optional-cache",
     "requiresDefeated": [
      "cache-guard"
     ]
    },
    "rewardOnce": true
   }
  ],
  "shortcuts": [
   {
    "id": "return-bridge-open",
    "kind": "add-floor",
    "floorId": "return-bridge",
    "lever": {
     "x": 790,
     "y": 580
    },
    "stance": {
     "x": 801.25,
     "y": 618.75
    },
    "requiresDefeated": [
     "east-patrol"
    ],
    "animationSeconds": 2.2,
    "collisionRelease": "only after completed animation",
    "oneWayOperation": true,
    "traversal": "bidirectional after opening",
    "noRewardOnRepeat": true
   }
  ],
  "exits": [
   {
    "id": "return-station",
    "position": {
     "x": 120,
     "y": 860
    },
    "stance": {
     "x": 160,
     "y": 860
    },
    "target": "station",
    "targetPort": "station:upper-watch-return",
    "targetArrival": {
     "x": 320,
     "y": -1800
    },
    "requires": []
   },
   {
    "id": "annex-stair",
    "position": {
     "x": 840,
     "y": 840
    },
    "stance": {
     "x": 800,
     "y": 840
    },
    "target": "record-annex",
    "targetPort": "cistern-stair",
    "targetArrival": {
     "x": 120,
     "y": 800
    },
    "requiresDefeated": [
     "sluice-warden"
    ],
    "secureObjective": {
     "id": "secure",
     "xp": 40,
     "currency": 25,
     "oneTime": true
    }
   }
  ],
  "routeWaypoints": {
   "main": [
    {
     "x": 120,
     "y": 800
    },
    {
     "x": 120,
     "y": 580
    },
    {
     "x": 120,
     "y": 180
    },
    {
     "x": 450,
     "y": 180
    },
    {
     "x": 800,
     "y": 180
    },
    {
     "x": 800,
     "y": 450
    },
    {
     "x": 800,
     "y": 650
    },
    {
     "x": 800,
     "y": 800
    },
    {
     "x": 800,
     "y": 840
    }
   ],
   "optional": [
    {
     "x": 120,
     "y": 800
    },
    {
     "x": 420,
     "y": 800
    },
    {
     "x": 450,
     "y": 840
    },
    {
     "x": 540,
     "y": 840
    },
    {
     "x": 540,
     "y": 800
    }
   ],
   "shortcutReturn": [
    {
     "x": 796.25,
     "y": 623.75
    },
    {
     "x": 700,
     "y": 580
    },
    {
     "x": 300,
     "y": 580
    },
    {
     "x": 180,
     "y": 580
    },
    {
     "x": 120,
     "y": 800
    }
   ]
  }
 },
 {
  "id": "record-annex",
  "name": "Record Annex",
  "bounds": {
   "id": "bounds",
   "x": 0,
   "y": 0,
   "width": 960,
   "height": 960
  },
  "camera": {
   "projection": {
    "offsetX": 640,
    "offsetY": 180,
    "scaleX": 0.8,
    "scaleY": 0.4
   },
   "projectedWorldBounds": {
    "x": -288,
    "y": -40,
    "width": 1856,
    "height": 1120
   },
   "visualApronGroundUnits": 100,
   "maxPropRiseProjected": 120,
   "clampToVisualApron": true,
   "neverClampPlayerToCamera": true
  },
  "safety": {
   "checkpointSanctuaryProjectedRadius": 60,
   "arrivalGraceSeconds": 1.5,
   "clearProjectilesOnRestTransitionRetry": true,
   "watchersRespectSanctuary": true,
   "noEnemyRespawnsOnRest": true,
   "voidEdges": "solid; no fall damage or hidden traversal",
   "interactionLineOfSight": true,
   "shortcutNeverRequiredForExit": true
  },
  "entry": {
   "from": "cistern-viaduct",
   "port": "cistern-stair",
   "arrival": {
    "x": 120,
    "y": 800
   },
   "physicalConnection": "Ordinary enclosed service stair from reservoir landing into an adjacent station annex.",
   "requiresExternalDefeated": {
    "expeditionId": "cistern-viaduct",
    "enemyId": "sluice-warden"
   }
  },
  "checkpoints": [
   {
    "id": "entry-beacon",
    "position": {
     "x": 120,
     "y": 800
    },
    "arrival": true,
    "safeRadiusProjected": 60
   }
  ],
  "floors": [
   {
    "id": "annex-foundation",
    "x": 40,
    "y": 40,
    "width": 880,
    "height": 880,
    "polygon": [
     {
      "x": 40,
      "y": 40
     },
     {
      "x": 920,
      "y": 40
     },
     {
      "x": 920,
      "y": 920
     },
     {
      "x": 40,
      "y": 920
     }
    ]
   }
  ],
  "hazardRegions": [],
  "walls": [
   {
    "id": "lower-partition",
    "x": 40,
    "y": 680,
    "width": 660,
    "height": 24
   },
   {
    "id": "middle-partition",
    "x": 300,
    "y": 480,
    "width": 480,
    "height": 24
   },
   {
    "id": "middle-east-tail",
    "x": 900,
    "y": 480,
    "width": 20,
    "height": 24
   },
   {
    "id": "return-shutter",
    "x": 780,
    "y": 480,
    "width": 120,
    "height": 24,
    "disabledWhen": "return-shutter-open"
   },
   {
    "id": "store-wall-west",
    "x": 40,
    "y": 280,
    "width": 140,
    "height": 24
   },
   {
    "id": "store-wall-east",
    "x": 300,
    "y": 280,
    "width": 260,
    "height": 24
   },
   {
    "id": "north-dividing-wall",
    "x": 560,
    "y": 40,
    "width": 24,
    "height": 264
   }
  ],
  "props": [
   {
    "id": "entry-lantern",
    "x": 85,
    "y": 765,
    "radius": 9,
    "art": "ward-lantern",
    "width": 22,
    "originY": 0.92
   },
   {
    "id": "lower-pier",
    "x": 80,
    "y": 720,
    "radius": 23,
    "art": "ward-pillar",
    "width": 60,
    "originY": 0.94
   },
   {
    "id": "corner-rubble",
    "x": 350,
    "y": 550,
    "radius": 30,
    "art": "ward-rubble",
    "width": 70,
    "originY": 0.82
   },
   {
    "id": "gallery-cover",
    "x": 500,
    "y": 350,
    "radius": 30,
    "art": "ward-rubble",
    "width": 70,
    "originY": 0.82
   },
   {
    "id": "east-pier",
    "x": 900,
    "y": 560,
    "radius": 23,
    "art": "ward-pillar",
    "width": 60,
    "originY": 0.94
   },
   {
    "id": "store-pier",
    "x": 80,
    "y": 80,
    "radius": 23,
    "art": "ward-pillar",
    "width": 60,
    "originY": 0.94
   },
   {
    "id": "keeper-pier",
    "x": 880,
    "y": 120,
    "radius": 23,
    "art": "ward-pillar",
    "width": 60,
    "originY": 0.94
   },
   {
    "id": "store-cache",
    "x": 160,
    "y": 160,
    "radius": 20,
    "art": "ward-coffer",
    "width": 45,
    "originY": 0.9
   },
   {
    "id": "keeper-cache",
    "x": 600,
    "y": 400,
    "radius": 20,
    "art": "ward-coffer",
    "width": 45,
    "originY": 0.9
   },
   {
    "id": "shutter-lantern",
    "x": 875,
    "y": 375,
    "radius": 8,
    "art": "ward-lantern",
    "width": 22,
    "originY": 0.92
   },
   {
    "id": "record-shelf-0",
    "x": 430,
    "y": 532,
    "radius": 0,
    "footprint": {
     "width": 46,
     "height": 20
    },
    "art": "expedition-shelf",
    "width": 52,
    "originY": 0.879905
   },
   {
    "id": "record-shelf-1",
    "x": 550,
    "y": 532,
    "radius": 0,
    "footprint": {
     "width": 46,
     "height": 20
    },
    "art": "expedition-shelf",
    "width": 52,
    "originY": 0.879905
   },
   {
    "id": "record-shelf-2",
    "x": 670,
    "y": 532,
    "radius": 0,
    "footprint": {
     "width": 46,
     "height": 20
    },
    "art": "expedition-shelf",
    "width": 52,
    "originY": 0.879905
   },
   {
    "id": "record-shelf-3",
    "x": 350,
    "y": 332,
    "radius": 0,
    "footprint": {
     "width": 46,
     "height": 20
    },
    "art": "expedition-shelf",
    "width": 52,
    "originY": 0.879905
   },
   {
    "id": "record-shelf-4",
    "x": 430,
    "y": 332,
    "radius": 0,
    "footprint": {
     "width": 46,
     "height": 20
    },
    "art": "expedition-shelf",
    "width": 52,
    "originY": 0.879905
   }
  ],
  "enemies": [
   {
    "id": "shutter-sentry",
    "kind": "raider",
    "position": {
     "x": 450,
     "y": 750
    },
    "home": {
     "x": 450,
     "y": 750
    },
    "maxHp": 130,
    "reward": 40,
    "activationRange": 250,
    "leashRange": 280,
    "maxAttackRange": 60,
    "minimumWindupSeconds": 0.7
   },
   {
    "id": "corner-raider",
    "kind": "raider",
    "position": {
     "x": 130,
     "y": 500
    },
    "home": {
     "x": 130,
     "y": 500
    },
    "maxHp": 125,
    "reward": 40,
    "activationRange": 250,
    "leashRange": 280,
    "maxAttackRange": 60,
    "minimumWindupSeconds": 0.7
   },
   {
    "id": "gallery-lookout",
    "kind": "watcher",
    "position": {
     "x": 460,
     "y": 400
    },
    "home": {
     "x": 460,
     "y": 400
    },
    "maxHp": 90,
    "reward": 40,
    "activationRange": 220,
    "leashRange": 280,
    "maxAttackRange": 180,
    "minimumWindupSeconds": 1.05
   },
   {
    "id": "stair-guard",
    "kind": "raider",
    "position": {
     "x": 650,
     "y": 310
    },
    "home": {
     "x": 650,
     "y": 310
    },
    "maxHp": 145,
    "reward": 45,
    "activationRange": 250,
    "leashRange": 280,
    "maxAttackRange": 60,
    "minimumWindupSeconds": 0.7
   },
   {
    "id": "records-guard",
    "kind": "raider",
    "position": {
     "x": 340,
     "y": 160
    },
    "home": {
     "x": 340,
     "y": 160
    },
    "maxHp": 145,
    "reward": 50,
    "activationRange": 250,
    "leashRange": 280,
    "maxAttackRange": 60,
    "minimumWindupSeconds": 0.7
   },
   {
    "id": "annex-keeper",
    "kind": "captain",
    "position": {
     "x": 800,
     "y": 180
    },
    "home": {
     "x": 800,
     "y": 180
    },
    "maxHp": 380,
    "reward": 140,
    "activationRange": 250,
    "leashRange": 280,
    "maxAttackRange": 78,
    "minimumWindupSeconds": 0.95
   }
  ],
  "loot": [
   {
    "id": "store-cache",
    "position": {
     "x": 160,
     "y": 160
    },
    "stance": {
     "x": 200,
     "y": 160
    },
    "interactionRadiusProjected": 38,
    "reward": {
     "armor": [
      "marcher-helmet"
     ],
     "currency": 50,
     "xp": 30,
     "xpRewardId": "optional-cache",
     "requiresDefeated": [
      "records-guard"
     ]
    },
    "rewardOnce": true
   },
   {
    "id": "keeper-cache",
    "position": {
     "x": 600,
     "y": 400
    },
    "stance": {
     "x": 640,
     "y": 400
    },
    "interactionRadiusProjected": 38,
    "reward": {
     "weapon": "poleaxe",
     "armor": [
      "marcher-chest"
     ],
     "currency": 65,
     "requiresDefeated": [
      "stair-guard"
     ]
    },
    "rewardOnce": true
   }
  ],
  "shortcuts": [
   {
    "id": "return-shutter-open",
    "kind": "disable-wall",
    "wallId": "return-shutter",
    "lever": {
     "x": 840,
     "y": 360
    },
    "stance": {
     "x": 851.25,
     "y": 398.75
    },
    "requiresDefeated": [
     "gallery-lookout"
    ],
    "animationSeconds": 1.4,
    "collisionRelease": "only after completed animation",
    "oneWayOperation": true,
    "traversal": "bidirectional after opening",
    "noRewardOnRepeat": true
   }
  ],
  "exits": [
   {
    "id": "return-cistern",
    "position": {
     "x": 120,
     "y": 860
    },
    "stance": {
     "x": 160,
     "y": 860
    },
    "target": "cistern-viaduct",
    "targetPort": "annex-return",
    "targetArrival": {
     "x": 800,
     "y": 840
    },
    "requires": []
   },
   {
    "id": "secure-annex",
    "position": {
     "x": 800,
     "y": 130
    },
    "stance": {
     "x": 760,
     "y": 130
    },
    "target": null,
    "requiresDefeated": [
     "annex-keeper"
    ],
    "secureObjective": {
     "id": "secure",
     "xp": 40,
     "currency": 35,
     "oneTime": true
    },
    "afterCompletion": "Continue exploring or walk back through opened shutter; no forced teleport."
   }
  ],
  "routeWaypoints": {
   "main": [
    {
     "x": 120,
     "y": 800
    },
    {
     "x": 750,
     "y": 800
    },
    {
     "x": 750,
     "y": 600
    },
    {
     "x": 120,
     "y": 600
    },
    {
     "x": 120,
     "y": 400
    },
    {
     "x": 650,
     "y": 400
    },
    {
     "x": 650,
     "y": 180
    },
    {
     "x": 760,
     "y": 180
    },
    {
     "x": 760,
     "y": 130
    }
   ],
   "optional": [
    {
     "x": 240,
     "y": 400
    },
    {
     "x": 240,
     "y": 220
    },
    {
     "x": 240,
     "y": 160
    },
    {
     "x": 200,
     "y": 160
    }
   ],
   "shortcutReturn": [
    {
     "x": 846.25,
     "y": 403.75
    },
    {
     "x": 840,
     "y": 400
    },
    {
     "x": 840,
     "y": 780
    },
    {
     "x": 430,
     "y": 800
    },
    {
     "x": 160,
     "y": 800
    }
   ]
  }
 }
] as const;
export const EXPEDITIONS:Readonly<Record<ExpeditionId,ExpeditionDefinition>>=Object.freeze(Object.fromEntries(DATA.map(area=>[area.id,area]))) as unknown as Readonly<Record<ExpeditionId,ExpeditionDefinition>>;
export const SERVICE_STAIR_GROUND={left:-28,right:28,back:-29,front:18} as const;
export const AREA_IDS:readonly AreaId[]=['station','cistern-viaduct','record-annex'];
export const STATION_EXPEDITION_PORT={id:'upper-watch-stair',position:{x:380,y:-1840},stance:{x:380,y:-1800},target:'cistern-viaduct' as const,targetArrival:{x:120,y:800},requiresDefeated:['upper-captain']};
export const AREA_NAMES:Readonly<Record<AreaId,string>>={station:'Station Underworks','cistern-viaduct':'Cistern Viaduct','record-annex':'Record Annex'};

