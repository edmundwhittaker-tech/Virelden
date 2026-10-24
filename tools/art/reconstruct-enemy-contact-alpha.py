#!/usr/bin/env python3
"""Reconstruct text-only opaque collision geometry from exact ORIGINAL PR7 PNGs.
No image generation/editing, alpha dilation, resizing or accepted-R5 recovery.
Requires Pillow. Usage: reconstruct-enemy-contact-alpha.py SOURCE_DIR OUTPUT_JSON
"""
import hashlib,json,sys
from pathlib import Path
from PIL import Image
EXPECTED={'axe': 'e4b0a2dbd85155abab2fd885e1257879961b63bb56c1ad6e94e4ad408009e471', 'knife': '619212df6be8b48b1c62d5a5cbaf4ad1d362193f4d7e664569c1b79d4353bf8e', 'trident': 'f9664f9346723145f267ee7c0b9aaf7dd43e75522ee485b03a66c918bbe83e2c', 'shield-front': '5e0a1ef5aac798249cd9194c2d06cfb20f44d707e7c4cbdc9d284944458311ae', 'shield-back': '2e1021018a0336161cad375f246758b15d755511e64beccd41955dec85ddacd0', 'shield-side': 'bf4d857847fcdba45ad566f9499cd45b57503d526ae9221d59a5f54d420456d2'}
source,output=map(Path,sys.argv[1:3])
out={'version':1,'sourceCommit':'88339ff21808d812b46607ab50643764990dfc06','method':'Exact pixel rectangles whose alpha is >=128; no dilation, no bounding-box reach. Adjacent equal row runs merged vertically. These are fresh collision derivatives of original PR7, not recovered R5.','alphaThreshold':128,'equipment':{}}
for name,expected in EXPECTED.items():
    path=source/(name+'.png'); digest=hashlib.sha256(path.read_bytes()).hexdigest()
    if digest!=expected: raise ValueError('Wrong original PR7 source bytes: '+name)
    im=Image.open(path).convert('RGBA');w,h=im.size;active={};rects=[]
    for y in range(h):
        runs=[];x=0
        while x<w:
            if im.getpixel((x,y))[3]<128:x+=1;continue
            start=x
            while x<w and im.getpixel((x,y))[3]>=128:x+=1
            runs.append((start,x))
        nxt={}
        for run in runs:
            if run in active:r=active[run];r[3]=y+1
            else:r=[run[0],y,run[1],y+1]
            nxt[run]=r
        rects.extend(r for k,r in active.items() if k not in nxt);active=nxt
    rects.extend(active.values())
    # Exact full source-pixel mask readback, including transparent holes/corners.
    reconstructed=set()
    for l,t,r,b in rects:
        reconstructed.update((x,y) for y in range(t,b) for x in range(l,r))
    original={(x,y) for y in range(h) for x in range(w) if im.getpixel((x,y))[3]>=128}
    assert reconstructed==original,name
    out['equipment'][name]={'image':name+'.png','sha256':digest,'size':[w,h],'rects':rects}
output.parent.mkdir(parents=True,exist_ok=True)
output.write_text(json.dumps(out,separators=(',',':'))+'\n')
print('Verified exact opaque-pixel masks for',len(EXPECTED),'original PR7 equipment images')
