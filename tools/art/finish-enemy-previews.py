"""Package deterministic Chromium captures at one preview pixel per game pixel."""
from pathlib import Path
import json
from PIL import Image

ROOT=Path(__file__).resolve().parents[2]
QA=ROOT/'docs/qa/enemies-v1'
frames=[Image.open(p).convert('RGB') for p in sorted((ROOT/'.enemy-preview-frames').glob('*.png'))]
assert len(frames)==90
palette=frames[0].quantize(colors=256)
indexed=[im.quantize(palette=palette,dither=Image.Dither.NONE) for im in frames]
for filename,indices in [('animation-game-size.gif',list(range(90))),('walk-game-size.gif',[i for i in range(90) if i%30<8]),('attack-game-size.gif',[i for i in range(90) if i%30>=8])]:
 selected=[indexed[i] for i in indices]
 selected[0].save(QA/filename,save_all=True,append_images=selected[1:],duration=100,loop=0,optimize=True,disposal=2)
manifest=json.loads((ROOT/'src/assets/enemies-v1/manifest.json').read_text())
for enemy in manifest['enemies'].values():
 atlas=Image.open(ROOT/'src/assets/enemies-v1'/enemy['body']).convert('RGBA')
 assert atlas.size==(1536,960)
 assert atlas.getchannel('A').getextrema()==(0,255)
 for frame in enemy['frames']:
  x,y,w,h=frame['rect']
  region=atlas.crop((x,y,x+w,y+h))
  assert region.getchannel('A').getbbox()
  # A fist annotation must land on visible body artwork. Occluded anatomical
  # targets are separately labelled and deliberately excluded from this check.
  for hand in frame['hands'].values():
   if hand['visible']:
    px,py=round(hand['x']),round(hand['y'])
    assert region.getchannel('A').crop((px-3,py-3,px+4,py+4)).getextrema()[1]>=100
for equipment in manifest['equipment'].values():
 im=Image.open(ROOT/'src/assets/enemies-v1'/equipment['image']).convert('RGBA')
 assert list(im.size)==equipment['size']
 assert im.getchannel('A').getextrema()[0]==0
 assert im.getchannel('A').getextrema()[1]>200
print('PNG alpha/atlas/visible-fist checks passed. Exported three GIF previews at native game pixels, 100ms capture cadence.')
