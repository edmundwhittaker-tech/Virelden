"""Validate alpha/frame bounds and export exact game-size animated previews."""
from pathlib import Path
import json
import numpy as np
from PIL import Image,ImageDraw
root=Path(__file__).resolve().parents[2]
base=root/'src/assets/lore-characters-v1';out=base/'previews';out.mkdir(exist_ok=True)
index=json.loads((base/'manifest.json').read_text())
chars=[json.loads((base/c['manifest']).read_text()) for c in index['characters']]
for ch in chars:
 for view,v in ch['views'].items():
  for kind in ['sprite','body','hands']:
   im=Image.open(base/ch['id']/v[kind]).convert('RGBA');assert im.size==(3072,3072)
   for f in v['frames']:
    x,y,w,h=f['rect'];a=np.array(im.crop((x,y,x+w,y+h)))[:,:,3]
    assert a.max()>0,(ch['id'],view,kind,f['index'],'empty')
    assert not np.any(np.concatenate([a[:2].flatten(),a[-2:].flatten(),a[:,:2].flatten(),a[:,-2:].flatten()])>32),(ch['id'],view,kind,f['index'],'clipped')
    assert f['foot']==ch['foot']
    for e in f['equipment']:
     h=f['hands'][e['hand']];assert abs(h['x']-e['position']['x'])<1e-7 and abs(h['y']-e['position']['y'])<1e-7
   assert np.array(im.crop((7*384,7*384,8*384,8*384)))[:,:,3].max()==0
 print(ch['id'],'126 complete frames, alpha, bounds and grip anchors passed')
def frame_at(ch,view,animation,t):
 v=ch['views'][view];a=v['animations'][animation];total=sum(a['durationsMs']);t=t%total if a['loop'] else min(t,total-.001)
 for frame,ms in zip(a['frames'],a['durationsMs']):
  if t<ms:return frame
  t-=ms
 return a['frames'][-1]
cache={(ch['id'],v):Image.open(base/ch['id']/d['sprite']).convert('RGBA') for ch in chars for v,d in ch['views'].items()}
for animation,duration in [('walk',3200),('attack',2100),('death',1200)]:
 images=[]
 for t in range(0,duration,50):
  im=Image.new('RGB',(1000,360),'#202b2f');draw=ImageDraw.Draw(im)
  draw.text((18,12),f'{animation.upper()}  |  Actual game size: 88px bodies  |  Front + rear',fill='#e2e1d7')
  for row,view in enumerate(['front','rear']):
   for i,ch in enumerate(chars):
    f=frame_at(ch,view,animation,t);x,y,w,h=ch['views'][view]['frames'][f]['rect'];tile=cache[ch['id'],view].crop((x,y,x+w,y+h)).resize((192,192),Image.Resampling.LANCZOS)
    footx=125+i*250;footy=150+row*165
    draw.ellipse((footx-22,footy-3,footx+22,footy+5),fill='#152024')
    im.paste(tile,(footx-88,footy-152),tile)
    draw.text((i*250+16,footy+22),ch['name'],fill='#b8c3c3')
  images.append(im)
 images[0].save(out/f'{animation}-game-size.gif',save_all=True,append_images=images[1:],duration=50,loop=0,optimize=True)
images[0].save(out/'death-game-size.png')
print('Game-size previews exported.')
