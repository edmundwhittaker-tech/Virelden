"""Mechanical sprite export: component crop, uniform resize, alpha PNG packing.

Requires Pillow, numpy, scipy. Original imagegen PNGs are supplied with --source-dir.
No generation API, credentials, runtime dependencies or gameplay changes.
"""
import argparse
import json
import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'src/assets/enemies-v1'
QA = ROOT / 'docs/qa/enemies-v1'
SOURCES = {
    'maw_skeleton': 'exec-dd977f6b-3bba-488d-8420-6cd09514e695.png',
    'headless_skeleton': 'exec-c31636bd-69c1-457d-8e3a-92c69ad6a0bc.png',
    'iron_giant': 'exec-5a37497f-cbf1-4a12-b820-ef214db73fda.png',
}
# Manually annotated fist/grip centres in the ORIGINAL 1448x1086 source.
# Each row is east / southeast / northeast. Each pair is anatomical right / left.
HANDS = {
 'maw_skeleton': [
  [(133,224),(179,216)],[(344,245),(438,206)],[(582,245),(683,209)],[(836,65),(839,25)],[(1185,237),(1199,241)],[(1398,232),(1415,226)],
  [(128,574),(183,565)],[(307,580),(429,556)],[(591,584),(674,562)],[(839,418),(874,381)],[(1170,595),(1189,588)],[(1377,579),(1408,579)],
  [(169,897),(155,886)],[(438,895),(415,881)],[(676,908),(650,893)],[(905,772),(858,726)],[(1195,899),(1179,888)],[(1400,909),(1382,897)],
 ],
 'headless_skeleton': [
  [(146,167),(198,138)],[(361,199),(440,139)],[(700,135),(656,170)],[(813,137),(934,135)],[(1260,115),(1115,166)],[(1381,178),(1419,128)],
  [(102,516),(201,479)],[(322,545),(440,479)],[(590,527),(678,481)],[(798,487),(928,497)],[(1257,463),(1086,521)],[(1351,514),(1412,481)],
  [(190,813),(86,823)],[(450,829),(334,834)],[(692,829),(571,835)],[(938,831),(801,809)],[(1255,786),(1065,839)],[(1414,812),(1301,833)],
 ],
 'iron_giant': [
  [(94,219),(187,174)],[(340,224),(443,193)],[(588,225),(680,191)],[(780,90),(917,151)],[(1227,123),(1106,195)],[(1349,174),(1415,176)],
  [(87,558),(206,518)],[(337,562),(460,537)],[(580,555),(700,530)],[(785,427),(879,515)],[(1195,492),(1126,531)],[(1343,524),(1419,523)],
  [(217,860),(82,853)],[(461,880),(330,856)],[(694,883),(569,858)],[(921,830),(790,808)],[(1233,782),(1098,856)],[(1427,860),(1303,848)],
 ],
}
DIRECTIONS = ['east', 'south-east', 'north-east']
POSES = ['idle', 'step-a', 'step-b', 'windup', 'contact', 'recovery']
CELL = (256, 320)
FOOT = (128, 300)


def components(im):
    a = np.asarray(im)[:, :, 3] > 64
    labels, _ = ndimage.label(ndimage.binary_dilation(a, iterations=2))
    found = {}
    for label, sl in enumerate(ndimage.find_objects(labels), 1):
        mask = labels[sl] == label
        if mask.sum() < 1500:
            continue
        cy, cx = ndimage.center_of_mass(mask)
        cx += sl[1].start
        cy += sl[0].start
        row = min(2, max(0, round((cy - 208) / 345)))
        col = min(5, max(0, int(cx / (im.width / 6))))
        index = row * 6 + col
        assert index not in found, ('merged/duplicate component', index)
        bounds = (sl[1].start, sl[0].start, sl[1].stop, sl[0].stop)
        crop = im.crop(bounds)
        arr = np.array(crop)
        arr[:, :, 3] *= mask
        arr[arr[:, :, 3] == 0, :3] = 0
        found[index] = (Image.fromarray(arr), bounds)
    assert len(found) == 18, ('expected 18 isolated complete figures', len(found))
    return found


def export_bodies(source_dir):
    enemies = {}
    for enemy_id, filename in SOURCES.items():
        source = Image.open(source_dir / filename).convert('RGBA')
        figures = components(source)
        atlas = Image.new('RGBA', (6 * CELL[0], 3 * CELL[1]))
        overlay = Image.new('RGBA', atlas.size)
        debug = Image.new('RGB', atlas.size, '#20282a')
        annotations = []
        target = 158 if enemy_id == 'headless_skeleton' else 176
        for index in range(18):
            crop, bounds = figures[index]
            row, col = divmod(index, 6)
            idle, _ = figures[row * 6]
            # One uniform scale for all six poses of a view; never resize a raised
            # arm to the idle bounding-box height or stretch the headless body.
            factor = target / idle.height
            alpha = np.asarray(crop)[:, :, 3]
            bottom = np.nonzero(alpha > 64)[0].max()
            foot_band = alpha[max(0, bottom - 26):bottom + 1] > 64
            foot_x = np.nonzero(foot_band)[1]
            foot_centre = (int(foot_x.min()) + int(foot_x.max())) / 2
            local_foot = (foot_centre, bottom + 1)
            resized = crop.resize((round(crop.width * factor), round(crop.height * factor)), Image.Resampling.LANCZOS)
            offset = (round(FOOT[0] - local_foot[0] * factor), round(FOOT[1] - local_foot[1] * factor))
            assert offset[0] >= 0 and offset[1] >= 0
            assert offset[0] + resized.width <= CELL[0] and offset[1] + resized.height <= CELL[1]
            frame = Image.new('RGBA', CELL)
            frame.alpha_composite(resized, offset)
            hands = {}
            for hand, point in zip(['right', 'left'], HANDS[enemy_id][index]):
                x = round((point[0] - bounds[0]) * factor + offset[0], 2)
                y = round((point[1] - bounds[1]) * factor + offset[1], 2)
                visible = not (hand == 'left' and (row == 2 or (enemy_id == 'headless_skeleton' and index == 2) or (enemy_id in ['headless_skeleton', 'iron_giant'] and col == 4)))
                hands[hand] = {'x': x, 'y': y, 'visible': visible,
                    'annotation': 'visible fist centre' if visible else 'occluded anatomical hand target'}
            hand_mask = Image.new('L', CELL)
            draw_mask = ImageDraw.Draw(hand_mask)
            for hand in hands.values():
                if hand['visible']:
                    x, y = hand['x'], hand['y']
                    draw_mask.ellipse((x-5, y-5, x+5, y+5), fill=255)
            hand_frame = frame.copy()
            hand_frame.putalpha(Image.fromarray(np.minimum(np.asarray(frame.getchannel('A')), np.asarray(hand_mask))))
            at = (col * CELL[0], row * CELL[1])
            atlas.alpha_composite(frame, at)
            overlay.alpha_composite(hand_frame, at)
            debug.paste(frame, at, frame)
            d = ImageDraw.Draw(debug)
            d.text((at[0]+8, at[1]+8), f'{index}: {DIRECTIONS[row]} {POSES[col]}', fill='white')
            for hand, p in hands.items():
                x, y = at[0]+p['x'], at[1]+p['y']
                d.ellipse((x-3,y-3,x+3,y+3), outline='#ff7066' if hand=='right' else '#55ddff', width=2)
            d.line((at[0], at[1]+300, at[0]+256, at[1]+300), fill='#657378')
            annotations.append({'index':index,'direction':DIRECTIONS[row],'pose':POSES[col],
                'rect':[at[0],at[1],*CELL], 'foot':{'x':128,'y':300},'hands':hands,
                'sourceBounds':list(bounds),'sourceScale':factor,
                'sourceFoot':[round(bounds[0]+local_foot[0],2),int(bounds[1]+local_foot[1])],
                'bodyTop':round(offset[1],2) if col==0 else None})
        atlas.save(OUT / f'{enemy_id}-body.png', optimize=True)
        overlay.save(OUT / f'{enemy_id}-hands.png', optimize=True)
        debug.save(QA / f'{enemy_id}-sockets.png', optimize=True)
        enemies[enemy_id] = {'id':enemy_id,'role':'mini-boss' if enemy_id=='iron_giant' else 'basic enemy',
            'body':f'{enemy_id}-body.png','handsOverlay':f'{enemy_id}-hands.png',
            'frameSize':list(CELL),'columns':6,'rows':3,'runtimeScale':1 if enemy_id=='iron_giant' else .5,
            'idleBodyHeightScreen':target if enemy_id=='iron_giant' else target*.5,
            'humanReferenceHeightScreen':88,'frames':annotations,'sourceFile':filename,
            'proportions':'Normal human torso and limbs; missing skull is not compensated by stretching.' if enemy_id=='headless_skeleton' else 'Uniform scale within each direction.'}
    return enemies


def export_equipment(source_dir):
    filename = 'exec-8a9b396c-0a3c-41e7-90d0-00e816e1f184.png'
    im = Image.open(source_dir / filename).convert('RGBA')
    # Transparent object rectangles, deliberately not the equal grid implied by
    # the generation prompt. Export checks operate on the actual alpha.
    definitions = {
      'axe': ((20,105,571,319), (176,None), (31,26)),
      'knife': ((588,174,889,244), (40,None), (8,4)),
      'trident': ((899,145,1522,239), (272,None), (70,21)),
      'shield-front': ((125,366,459,935), (96,152), (64,54)),
      'shield-back': ((601,369,938,935), (96,152), (64,54)),
      'shield-side': ((1125,337,1390,969), (64,152), (42,54)),
    }
    equipment = {}
    for name,(bounds,size,grip) in definitions.items():
        crop = im.crop(bounds)
        # Transparent fringes are retained; hidden RGB is cleared for clean
        # filtering in engines that sample transparent edge texels.
        arr = np.array(crop)
        arr[arr[:,:,3]==0,:3] = 0
        crop = Image.fromarray(arr)
        width,height = size
        if height is None:
            height = round(crop.height * width / crop.width)
        crop = crop.resize((width,height),Image.Resampling.LANCZOS)
        crop.save(OUT / f'{name}.png',optimize=True)
        equipment[name] = {'image':f'{name}.png','size':[width,height],
            'grip':{'x':grip[0],'y':grip[1]},'sourceBounds':list(bounds),
            'axis':'right' if name in ['axe','knife','trident'] else 'upright',
            'secondaryGripRail':{'start':{'x':38,'y':26},'end':{'x':137,'y':26}} if name=='axe' else None}
    return equipment,filename


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--source-dir',type=Path,required=True)
    args=parser.parse_args()
    OUT.mkdir(parents=True,exist_ok=True)
    QA.mkdir(parents=True,exist_ok=True)
    enemies=export_bodies(args.source_dir)
    equipment,source=export_equipment(args.source_dir)
    manifest={'version':1,'status':'art-only integration kit; no gameplay changes',
        'coordinates':{'units':'exported image pixels','origin':'top-left','x':'right','y':'down',
            'rotation':'radians, clockwise on screen','worldFootRule':'worldFoot + (sourcePoint - frame.foot) * runtimeScale'},
        'camera':{'projection':'elevated orthographic isometric, approximately 30 degrees','light':'upper-left'},
        'directions':{'authored':DIRECTIONS,'mirrored':{'west':'east','south-west':'south-east','north-west':'north-east'},
            'northSouth':'Use rear/front view retaining last horizontal side, matching existing knight.',
            'mirrorRule':'Reflect the whole local rig about the world foot, including sockets/equipment; anatomical hand names stay unchanged.',
            'limit':'Mirrored west views also mirror lighting and equipment handedness visually; no independent west art.'},
        'enemies':enemies,'equipment':equipment,'equipmentSource':source,
        'animations':{},'provenance':'Built-in imagegen artwork; mechanical connected-component crop, uniform per-view resize, alpha PNG packing; manually annotated hand targets. No mesh/Spine binary or gameplay code.'}
    (OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    print('Exported 3 unarmed body atlases, 3 hand overlays, 6 independent equipment PNGs.')


if __name__=='__main__':
    main()
