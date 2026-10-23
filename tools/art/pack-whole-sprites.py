"""Crop/register whole-character artwork. Never evaluates a rig or assembles body parts.
Requires Pillow, numpy, scipy. Inputs and measurements are in whole-sprite-sources.json.
"""
from pathlib import Path
import json, math
import numpy as np
from scipy import ndimage
from PIL import Image
ROOT=Path(__file__).resolve().parents[2]
BASE=ROOT/'src/assets/npc-enemy-sprites'
SOURCES=ROOT/'tools/art/sources/whole-character-sprites-v2'
CELL=384; FOOT={'x':176,'y':304}

def extract(im):
    a=np.asarray(im)[:,:,3]
    labels,_=ndimage.label(ndimage.binary_dilation(a>64,iterations=1))
    groups={i:[] for i in range(24)}; boxes={}
    for label,sl in enumerate(ndimage.find_objects(labels),1):
        mask=labels[sl]==label
        if mask.sum()<20:continue
        x0,y0,x1,y1=sl[1].start,sl[0].start,sl[1].stop,sl[0].stop
        col=min(3,int((x0+x1)/2/(im.width/4)));row=min(5,int((y0+y1)/2/(im.height/6)))
        groups[row*4+col].append(label);boxes[label]=(x0,y0,x1,y1,int(mask.sum()))
    result=[]
    for i,ids in groups.items():
        assert ids,('Missing sprite',i)
        x0=min(boxes[k][0] for k in ids);y0=min(boxes[k][1] for k in ids)
        x1=max(boxes[k][2] for k in ids);y1=max(boxes[k][3] for k in ids)
        x0=max(0,x0-2);y0=max(0,y0-2);x1=min(im.width,x1+2);y1=min(im.height,y1+2)
        mask=ndimage.binary_dilation(np.isin(labels[y0:y1,x0:x1],ids),iterations=1)
        arr=np.array(im.crop((x0,y0,x1,y1)))
        arr[:,:,3]=np.where(mask&(arr[:,:,3]>8),arr[:,:,3],0);arr[arr[:,:,3]==0,:3]=0
        result.append({'image':Image.fromarray(arr),'bounds':[x0,y0,x1,y1]})
    return result

def foot_root(piece):
    a=np.asarray(piece['image'])[:,:,3]>96
    h,w=a.shape;start=max(0,h-50);labels,_=ndimage.label(a[start:])
    boxes=[]
    for k,sl in enumerate(ndimage.find_objects(labels),1):
        if np.count_nonzero(labels[sl]==k)>=30 and sl[1].stop-sl[1].start>=8:
            boxes.append((sl[1].start,sl[0].start+start,sl[1].stop,sl[0].stop+start))
    if not boxes:return (piece['bounds'][0]+piece['bounds'][2])/2
    return piece['bounds'][0]+(min(b[0] for b in boxes)+max(b[2] for b in boxes))/2

def animations(ch):
    w,a,r=ch['timing']
    return {
      'idle':{'frames':list(range(4)),'durationsMs':[250]*4,'loop':True},
      'walk':{'frames':list(range(4,12)),'durationsMs':[ch['walkMs']/8]*8,'loop':True},
      'attack':{'frames':list(range(12,18)),'durationsMs':[w/3]*3+[a]+[r/2]*2,'loop':False},
      'hurt':{'frames':[18,19],'durationsMs':[120,180],'loop':False},
      'death':{'frames':[20,21,22,23],'durationsMs':[160,180,180,200],'loop':False},
      'dead':{'frames':[23],'durationsMs':[1000],'loop':False}}

def pack():
    config=json.loads((ROOT/'tools/art/whole-sprite-sources.json').read_text())
    BASE.mkdir(parents=True,exist_ok=True)
    index={'version':2,'representation':'whole-character-frame-sprites','runtimeRigRequired':False,'modularArmour':False,'characters':[]}
    for ch in config['characters']:
        folder=BASE/ch['id'];folder.mkdir(exist_ok=True)
        m={'version':2,'id':ch['id'],'name':ch['name'],'action':ch['action'],'representation':'whole-character-frame-sprites',
           'runtimeRigRequired':False,'modularArmour':False,'equipmentBaked':True,'layerOrder':['complete-character'],
           'humanHeightScreen':88,'runtimeScale':.5,'frameSize':[CELL,CELL],'foot':FOOT,'views':{},
           'attachments':{'supported':False,'reason':'Weapons, hands, armour and clothing are already painted into each frame. No attachment or assembly pass.'},
           'directionMap':{d:{'view':v,'flipX':f} for d,v,f in [('south-east','front',False),('south-west','front',True),('north-east','rear',False),('north-west','rear',True),('east','front',False),('west','front',True),('north','rear',False),('south','front',False)]},
           'directionLimit':'Two authored isometric views plus mirroring. East/west use the front three-quarter view. Mirroring reverses visual handedness.',
           'timingAuthority':'Playback suggestions only. Simulation owns combat phases. Active progress zero selects source contact pose 15. No stats, AI, hitboxes or cast effects supplied.'}
        for view,v in ch['views'].items():
            im=Image.open(SOURCES/v['source']).convert('RGBA');pieces=extract(im)
            root_xs=v.get('rootXs') or [foot_root(p) for p in pieces[:4]]
            first=pieces[0];fa=np.asarray(first['image'])[:,:,3];xx=np.arange(first['bounds'][0],first['bounds'][2]);body=(xx>root_xs[0]-.16*im.width/4)&(xx<root_xs[0]+.16*im.width/4);yy=np.nonzero((fa>128)&body[None,:])[0]
            measured_height=int(yy.max()-yy.min()+1);body_height=v.get('headToGroundPx') or measured_height
            scale=176/body_height;sheet=Image.new('RGBA',(4*CELL,6*CELL));frames=[]
            for i in range(24):
                j=v.get('sourceIndexMap',{}).get(str(i),i);part=pieces[j];crop=part['image'];bounds=part['bounds'];raw=im
                source_cell=[j%4*im.width/4,j//4*im.height/6]
                if str(i) in v.get('overrides',{}):
                    o=v['overrides'][str(i)];raw=Image.open(SOURCES/o['source']).convert('RGBA');a=np.asarray(raw)[:,:,3];sl=ndimage.find_objects(ndimage.label(a>64)[0]);box=Image.fromarray((a>64).astype('uint8')*255).getbbox();crop=raw.crop(box);bounds=list(box);source_cell=[0,0];frame_scale=176/o['standingEquivalentPx'];gx=o['ground'][0];gy=o['ground'][1]
                else:
                    frame_scale=scale;gx=root_xs[j%4]
                    # Ground is measured in the body band, excluding staff/sword tips where possible.
                    a=np.asarray(crop)[:,:,3];xx=np.arange(bounds[0],bounds[2]);band=(xx>gx-.23*im.width/4)&(xx<gx+.23*im.width/4)
                    yy=np.nonzero((a>64)&band[None,:])[0]
                    gy=bounds[1]+(int(yy.max()) if len(yy) else crop.height-1)
                    if i>=20:gy=bounds[3]-3
                    gy=v.get('groundYOverrides',{}).get(str(i),gy)
                resized=crop.resize((round(crop.width*frame_scale),round(crop.height*frame_scale)),Image.Resampling.LANCZOS)
                offset=[round(FOOT['x']+(bounds[0]-gx)*frame_scale),round(FOOT['y']+(bounds[1]-gy)*frame_scale)]
                assert 2<=offset[0] and 2<=offset[1] and offset[0]+resized.width<CELL-2 and offset[1]+resized.height<CELL-2,(ch['id'],view,i,'clipping',offset,resized.size)
                tile=Image.new('RGBA',(CELL,CELL));tile.alpha_composite(resized,tuple(offset));sheet.alpha_composite(tile,(i%4*CELL,i//4*CELL))
                state='idle' if i<4 else 'walk' if i<12 else 'attack' if i<18 else 'hurt' if i<20 else 'death'
                frames.append({'index':i,'rect':[i%4*CELL,i//4*CELL,CELL,CELL],'state':state,'foot':FOOT,'equipmentIncluded':True,'sourceIndex':j,'sourceBounds':bounds,'sourceGround':[gx,gy],'uniformScale':frame_scale})
                if i==0:tile.save(folder/f'stand-{view}.png',optimize=True)
            sheet.save(folder/f'sprite-{view}.png',optimize=True)
            sheet.save(folder/f'sprite-{view}.webp',quality=95,method=6)
            a=animations(ch)
            if ch['action'] in ['cast','invoke']:a['cast']={**a['attack']}
            m['views'][view]={'sprite':f'sprite-{view}.webp','png':f'sprite-{view}.png','source':v['source'],'standingBodyHeightSource':body_height,'sourceRootByColumn':root_xs,'layout':{'columns':4,'rows':6,'frameWidth':CELL,'frameHeight':CELL,'width':4*CELL,'height':6*CELL},'animations':a,'phaseFrames':{'windup':[12,13,14],'active':[15],'recovery':[16,17]},'frames':frames}
            print(ch['id'],view,'24 complete character frames')
        (folder/'manifest.json').write_text(json.dumps(m,indent=2)+'\n');index['characters'].append({'id':ch['id'],'name':ch['name'],'manifest':ch['id']+'/manifest.json'})
    (BASE/'manifest.json').write_text(json.dumps(index,indent=2)+'\n')
if __name__=='__main__':pack()
