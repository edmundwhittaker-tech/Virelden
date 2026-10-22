"""Offline production inputs for complete enemy SPRITES, not a runtime rig.

Mechanically crop generated alpha-separated parts/equipment. The generated
parts stay in a scratch build directory; only finished sprite atlases ship.
Requires Pillow, numpy and scipy. See LORE_CHARACTER_SPRITES.md.
"""
from pathlib import Path
import argparse,json,math
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT=Path(__file__).resolve().parents[2]
WORK=ROOT.parent/'lore-art-work'
OUT=ROOT/'src/assets/lore-characters-v1'
PARTS=['helmet','torso','pelvis','upperarm_near','upperarm_far','forearm_near','forearm_far','hand_near','hand_far','thigh_near','thigh_far','greave_near','greave_far','foot_near','foot_far']
NOMINAL={'helmet':17,'torso':31,'pelvis':12.4,'upperarm_near':13,'upperarm_far':13,'forearm_near':12,'forearm_far':12,'hand_near':4,'hand_far':4,'thigh_near':18,'thigh_far':18,'greave_near':20,'greave_far':20,'foot_near':7.616,'foot_far':7.616}
LAYERS={'upperarm_far':1,'forearm_far':2,'hand_far':3,'thigh_far':4,'greave_far':5,'foot_far':6,'pelvis':7,'torso':8,'thigh_near':9,'greave_near':10,'foot_near':11,'helmet':12,'upperarm_near':13,'forearm_near':15,'hand_near':16}

def isolated(im,min_area=600):
 a=np.asarray(im)[:,:,3]>64
 labels,_=ndimage.label(ndimage.binary_dilation(a,iterations=2))
 result=[]
 for label,sl in enumerate(ndimage.find_objects(labels),1):
  mask=labels[sl]==label
  if mask.sum()<min_area:continue
  bounds=[sl[1].start,sl[0].start,sl[1].stop,sl[0].stop]
  arr=np.array(im.crop(bounds));arr[:,:,3]*=mask;arr[arr[:,:,3]==0,:3]=0
  result.append((Image.fromarray(arr),bounds))
 return result

def axis(part,im,view):
 w,h=im.size
 if part=='helmet':return [.5*w,.92*h],[.5*w,.06*h]
 if part=='torso':return [.5*w,.10*h],[.5*w,.91*h]
 if part=='pelvis':return [(.30 if view=='rear' else .70)*w,.22*h],[(.70 if view=='rear' else .30)*w,.22*h]
 if part.startswith('foot'):return [.29*w,.18*h],[.87*w,.79*h]
 if part.startswith('hand'):
  # Glove/hand wrist to palm grip, not the end of a fingertip.
  return [.47*w,.12*h],[.55*w,.67*h]
 alpha=np.asarray(im)[:,:,3]
 def centre(y):
  band=alpha[max(0,int(y)-3):min(h,int(y)+4)]
  xs=np.nonzero(band>64)[1]
  return (float(xs.min()+xs.max())/2 if len(xs) else w/2)
 y1=.12*h;y2=.89*h
 return [centre(y1),y1],[centre(y2),y2]

def export_parts(source_dir,char,view,filename):
 im=Image.open(source_dir/filename).convert('RGBA');objects=isolated(im)
 assigned={}
 for crop,bounds in objects:
  cx=(bounds[0]+bounds[2])/2;cy=(bounds[1]+bounds[3])/2
  index=min(3,int(cy/(im.height/4)))*4+min(3,int(cx/(im.width/4)))
  if index==15:continue
  assert index not in assigned,(char['id'],view,'duplicate cell',index)
  assigned[index]=(crop,bounds)
 assert set(assigned)==set(range(15)),(char['id'],view,'missing parts',set(range(15))-set(assigned))
 atlas=Image.new('RGBA',(1024,1024));entries={}
 for index,part in enumerate(PARTS):
  crop,bounds=assigned[index];p,d=axis(part,crop,view)
  length=math.dist(p,d)
  factor=min(230/crop.width,230/crop.height)
  resized=crop.resize((round(crop.width*factor),round(crop.height*factor)),Image.Resampling.LANCZOS)
  offset=[round((256-resized.width)/2),round((256-resized.height)/2)]
  pos=(index%4*256+offset[0],index//4*256+offset[1]);atlas.alpha_composite(resized,pos)
  entries[part]={'frame':index,'pivot':[p[0]*factor+offset[0],p[1]*factor+offset[1]],'distal':[d[0]*factor+offset[0],d[1]*factor+offset[1]],'nominalLength':NOMINAL[part],'layer':LAYERS[part],'sourceBounds':bounds}
 folder=WORK/char['id'];folder.mkdir(parents=True,exist_ok=True)
 atlas.save(folder/f'{view}.png',optimize=True)
 return {'image':f'{char["id"]}/{view}.png','cellSize':256,'columns':4,'parts':entries,'original':filename}

def export_gear(source_dir,char,filename):
 im=Image.open(source_dir/filename).convert('RGBA')
 objects=sorted(isolated(im,min_area=700),key=lambda item:(item[1][0]+item[1][2])/2)
 names=char['equipmentNames'];assert len(objects)==len(names),(char['id'],'equipment count',len(objects),names)
 definitions={
  'sword':(128,None,.14,.50),'mace':(92,None,.16,.50),
  'shield-front':(66,116,.47,.35),'shield-back':(66,116,.47,.35),
  'staff':(230,None,.34,.50),'folio-front':(38,50,.85,.60),'folio-back':(38,50,.85,.60),
  'crook':(240,None,.33,.50),'lantern':(None,46,.50,.07),
 }
 folder=OUT/char['id']/'equipment';folder.mkdir(parents=True,exist_ok=True)
 result={}
 for name,(crop,bounds) in zip(names,objects):
  w,h,gx,gy=definitions[name]
  if w is None:w=round(crop.width*h/crop.height)
  if h is None:h=round(crop.height*w/crop.width)
  crop=crop.resize((w,h),Image.Resampling.LANCZOS)
  crop.save(folder/f'{name}.png',optimize=True)
  result[name]={'image':f'equipment/{name}.png','size':[w,h],'grip':{'x':round(w*gx,3),'y':round(h*gy,3)},'sourceBounds':bounds,'source':filename,'axis':'upright' if name.startswith(('shield','folio','lantern')) else 'right'}
 return result

def main():
 parser=argparse.ArgumentParser();parser.add_argument('--source-dir',type=Path,required=True);args=parser.parse_args()
 source=json.loads((ROOT/'tools/art/lore-sprite-sources.json').read_text())
 WORK.mkdir(parents=True,exist_ok=True);config={'characters':[],'output':str(OUT)}
 for char in source['characters']:
  item={**char,'views':{},'equipment':{}}
  for view,filename in char['sources'].items():
   if view in ['front','rear'] and filename:item['views'][view]=export_parts(args.source_dir,char,view,filename)
  if char.get('equipmentSource'):item['equipment']=export_gear(args.source_dir,char,char['equipmentSource'])
  config['characters'].append(item)
 (WORK/'config.json').write_text(json.dumps(config,indent=2)+'\n')
 print('Prepared offline production sources for',len(config['characters']),'enemy sprite sets.')

if __name__=='__main__':main()
