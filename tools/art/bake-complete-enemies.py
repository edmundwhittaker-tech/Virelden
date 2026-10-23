#!/usr/bin/env python3
"""Bake supplied PR7 complete body poses with the selected per-enemy layers.

Usage: python tools/art/bake-complete-enemies.py --source /path/to/enemies-v1
Requires Python 3, Pillow. There is no generated pose, limb rig or runtime assembly.
Skeleton gear/hands are statically composited; the giant is its basic body only.
The original body/hands sheets and gear can be obtained from Virelden PR7 commit
88339ff21808d812b46607ab50643764990dfc06, src/assets/enemies-v1/.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import math
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
CELL = (448, 384)
OFFSET = (32, 52)
FOOT = {"x": 160, "y": 352}
COMMIT = "88339ff21808d812b46607ab50643764990dfc06"
IDS = ("maw_skeleton", "headless_skeleton", "iron_giant")

def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()

def read_json(path: Path):
    return json.loads(path.read_text())

def gear_layer(image: Image.Image, command: dict) -> Image.Image:
    """Canvas T(position) R(clockwise) S(scale) T(-grip), in fixed cell space."""
    theta = command["rotation"]
    c, s = math.cos(theta), math.sin(theta)
    sx, sy = command["scale"]["x"], command["scale"]["y"]
    px = OFFSET[0] + command["position"]["x"]
    py = OFFSET[1] + command["position"]["y"]
    gx, gy = command["grip"]["x"], command["grip"]["y"]
    inverse = (c/sx, s/sx, gx-(c*px+s*py)/sx,
               -s/sy, c/sy, gy-(-s*px+c*py)/sy)
    # Premultiplied resampling prevents black fringe from transparent RGB pixels.
    return image.convert("RGBa").transform(CELL, Image.Transform.AFFINE, inverse,
            resample=Image.Resampling.BICUBIC).convert("RGBA")

def layer_alpha_audit(images: dict, enemy: dict, frame: dict) -> list[dict]:
    """Prove every source-alpha extent fits BEFORE a destination canvas exists.

    Rotated source-alpha rectangles conservatively contain all transformed ink.
    These bounds are computed from the source, never measured after clipping.
    """
    audits = []
    body_layers = [("body", enemy["body"], 0)]
    if enemy.get("handsOverlay"):
        body_layers.append(("hands", enemy["handsOverlay"], 5))
    for kind, name, layer in body_layers:
        x, y, w, h = frame["rect"]
        source_image = images[name]
        if x < 0 or y < 0 or x+w > source_image.width or y+h > source_image.height:
            raise ValueError(f"Body/hands source crop is outside source sheet: {name}/{frame['index']}")
        raw = source_image.crop((x,y,x+w,y+h)).getchannel("A").getbbox()
        if not raw:
            # An entirely occluded hand overlay is valid; it contributes no ink.
            audits.append({"kind": kind, "image": name, "layer": layer,
                           "sourceRect": [x,y,w,h], "sourceAlphaBounds": None,
                           "transformedAlphaBounds": None})
            continue
        bounds = [raw[0]+OFFSET[0],raw[1]+OFFSET[1],raw[2]+OFFSET[0],raw[3]+OFFSET[1]]
        audits.append({"kind": kind, "image": name, "layer": layer,
                       "sourceRect": [x,y,w,h], "sourceAlphaBounds": list(raw),
                       "sourceSheetAlphaBounds": [raw[0]+x,raw[1]+y,raw[2]+x,raw[3]+y],
                       "transformedAlphaBounds": bounds})
    for item in frame["equipment"]:
        raw = images[item["image"]].getchannel("A").getbbox()
        if not raw:
            raise ValueError(f"Empty equipment source alpha: {item['image']}")
        c, s = math.cos(item["rotation"]), math.sin(item["rotation"])
        corners = []
        for x,y in ((raw[0],raw[1]),(raw[2],raw[1]),(raw[2],raw[3]),(raw[0],raw[3])):
            dx = (x-item["grip"]["x"])*item["scale"]["x"]
            dy = (y-item["grip"]["y"])*item["scale"]["y"]
            corners.append([OFFSET[0]+item["position"]["x"]+c*dx-s*dy,
                            OFFSET[1]+item["position"]["y"]+s*dx+c*dy])
        bounds = [min(p[0] for p in corners),min(p[1] for p in corners),
                  max(p[0] for p in corners),max(p[1] for p in corners)]
        audits.append({"kind": "equipment", "image": item["image"], "layer": item["layer"],
                       "sourceAlphaBounds": list(raw), "transformedAlphaCorners": corners,
                       "transformedAlphaBounds": bounds,
                       "transform": {"position": item["position"], "grip": item["grip"],
                                     "rotation": item["rotation"], "scale": item["scale"],
                                     "bodyOffset": list(OFFSET)}})
    for audit in audits:
        if audit["transformedAlphaBounds"] is None:
            continue
        x1,y1,x2,y2 = audit["transformedAlphaBounds"]
        padding = [x1,y1,CELL[0]-x2,CELL[1]-y2]
        audit["paddingPixels"] = padding
        audit["minimumPaddingPixels"] = min(padding)
        # Two pixels are retained outside conservative transformed alpha bounds.
        # This also leaves room for bicubic's small resampling filter footprint.
        if min(padding) < 2:
            raise ValueError(f"Pre-clipping alpha bounds fail: {enemy['id']}/{frame['index']}/{audit['image']}: {padding}")
    return sorted(audits, key=lambda item:item["layer"])

def composite(images: dict, enemy: dict, frame: dict) -> Image.Image:
    result = Image.new("RGBA", CELL)
    commands = [{"kind": "body", "layer": 0},
                *[{"kind": "equipment", **item} for item in frame["equipment"]]]
    if enemy.get("handsOverlay"):
        commands.append({"kind": "hands", "layer": 5})
    for item in sorted(commands, key=lambda command: command["layer"]):
        if item["kind"] in ("body", "hands"):
            filename = enemy["body"] if item["kind"] == "body" else enemy["handsOverlay"]
            x, y, w, h = frame["rect"]
            layer = Image.new("RGBA", CELL)
            layer.alpha_composite(images[filename].crop((x, y, x+w, y+h)), OFFSET)
        else:
            layer = gear_layer(images[item["image"]], item)
        result.alpha_composite(layer)
    return result

def save_json(path: Path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2)+"\n")

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--output", type=Path, default=ROOT/"src/assets/enemies-whole-v1")
    parser.add_argument("--review", type=Path, default=ROOT/"qa-local/enemy-bake")
    args = parser.parse_args()
    source, output, review = args.source.resolve(), args.output.resolve(), args.review.resolve()
    original = read_json(source/"manifest.json")
    selected = {id: {**original["enemies"][id]} for id in IDS}
    # Literal supplied giant body: no shield, trident, hands patch or other overlay.
    selected["iron_giant"]["handsOverlay"] = None
    selected["iron_giant"]["frames"] = [{**frame, "equipment": [],
        "layerOrder": [{"name": "body", "layer": 0}]}
        for frame in original["enemies"]["iron_giant"]["frames"]]
    names = sorted({"manifest.json", *[selected[id][key] for id in IDS for key in ("body", "handsOverlay") if selected[id].get(key)],
                    *[item["image"] for id in IDS for frame in selected[id]["frames"] for item in frame["equipment"]]})
    source_files = [{"name": name, "bytes": (source/name).stat().st_size, "sha256": sha((source/name).read_bytes())} for name in names]
    images = {name: Image.open(source/name).convert("RGBA") for name in names if name.endswith(".png")}
    output.mkdir(parents=True, exist_ok=True)
    review.mkdir(parents=True, exist_ok=True)
    manifest = {
        "version": 1, "representation": "offline-composited-complete-body-pose-sprites",
        "runtimeRigRequired": False, "equipmentBaked": "per-enemy",
        "equipmentPolicy": "Skeleton gear is statically composited; the iron giant is the supplied basic body only, with no equipment or hands overlays.",
        "frameSize": list(CELL), "columns": 6, "rows": 3, "frameCount": 18,
        "foot": FOOT, "sourceBodyOffset": list(OFFSET),
        "directions": original["directions"], "enemies": {},
        "limitations": ["Six existing complete-body poses per view, not a newly painted animation cycle.",
                         "No authored hurt, fall, death, roll or shield-bash drawings.",
                         "Walk uses two step extremes with idle as a passing pose; no interpolated body rig.",
                         "Skeleton equipment was composited offline from supplied transform/layer records; runtime draws one frame.",
                         "The iron giant intentionally uses only its supplied basic body; no shield, weapon or hands overlay is added."],
        "timingAuthority": "Simulation timers own phases. Damage edge selects contact column4; no animation event changes combat.",
    }
    evidence = {"sourceCommit": COMMIT, "sheets": [], "validatedFrames": 0, "frameSize": list(CELL), "foot": FOOT}
    preclip_summary = {}
    for id in IDS:
        enemy = selected[id]
        atlas = Image.new("RGBA", (CELL[0]*6, CELL[1]*3))
        entry = {"id": id, "sprite": f"{id}.webp", "runtimeScale": enemy["runtimeScale"],
                 "equipmentBaked": id != "iron_giant",
                 "idleBodyHeightScreen": enemy["idleBodyHeightScreen"], "humanReferenceHeightScreen": enemy["humanReferenceHeightScreen"],
                 "animations": enemy["animations"], "frames": []}
        audited_frames = []
        # A readable 6-pose x 3-view contact sheet at the actual body scale.
        display_scale = enemy["runtimeScale"]
        review_cell = (int(CELL[0]*display_scale), int(CELL[1]*display_scale)+22)
        contact = Image.new("RGB", (review_cell[0]*6, review_cell[1]*3), "#242b2d")
        pen = ImageDraw.Draw(contact)
        for frame in enemy["frames"]:
            if frame["foot"] != {"x": 128, "y": 300}:
                raise ValueError(f"Unexpected foot: {id}/{frame['index']}")
            # Audit source-alpha geometry before composite() can clip any layer.
            layer_bounds = layer_alpha_audit(images, enemy, frame)
            cell = composite(images, enemy, frame)
            box = cell.getchannel("A").getbbox()
            if not box or min(box[0], box[1], CELL[0]-box[2], CELL[1]-box[3]) < 2:
                raise ValueError(f"Clipped/empty alpha: {id}/{frame['index']} {box}")
            col, row = frame["index"]%6, frame["index"]//6
            atlas.alpha_composite(cell, (col*CELL[0], row*CELL[1]))
            record = {"index": frame["index"], "direction": frame["direction"], "pose": frame["pose"],
                      "rect": [col*CELL[0], row*CELL[1], *CELL], "foot": FOOT,
                      "alphaBounds": list(box), "rgbaSha256": sha(cell.tobytes()), "equipmentIncluded": bool(frame["equipment"]),
                      "equipment": [item["equipment"] for item in frame["equipment"]],
                      "layerOrder": [item["name"] for item in sorted(frame["layerOrder"], key=lambda item:item["layer"])]}
            entry["frames"].append(record)
            audited_frames.append({**record, "preClippingLayerAlphaBounds": layer_bounds})
            scaled = cell.resize((review_cell[0], review_cell[1]-22), Image.Resampling.LANCZOS)
            origin = (col*review_cell[0], row*review_cell[1]+22)
            contact.paste(scaled, origin, scaled)
            fx = origin[0]+FOOT["x"]*display_scale
            fy = origin[1]+FOOT["y"]*display_scale
            pen.line((fx-3,fy,fx+3,fy), fill="#6c8990")
            pen.line((fx,fy-3,fx,fy+3), fill="#6c8990")
            pen.text((col*review_cell[0]+5,row*review_cell[1]+4), f"{frame['direction']} / {frame['pose']}", fill="#d7d5bd")
            evidence["validatedFrames"] += 1
        path = output/f"{id}.webp"
        atlas.save(path, format="WEBP", lossless=True, method=6, exact=True)
        decoded = Image.open(path).convert("RGBA")
        if decoded.tobytes() != atlas.tobytes():
            raise ValueError(f"WebP is not byte-exact RGBA: {id}")
        contact.save(review/f"{id}-complete-poses.jpg", quality=93)
        sheet = {"id": id, "path": path.name, "bytes": path.stat().st_size, "sha256": sha(path.read_bytes()),
                 "dimensions": list(atlas.size), "decodedRgbaBytes": atlas.width*atlas.height*4,
                 "frames": audited_frames}
        evidence["sheets"].append(sheet)
        manifest["enemies"][id] = entry
        preclip_summary[id] = {
            "frames": len(audited_frames),
            "layers": sum(len(frame["preClippingLayerAlphaBounds"]) for frame in audited_frames),
            "minimumPaddingPixels": min(layer["minimumPaddingPixels"] for frame in audited_frames
                                        for layer in frame["preClippingLayerAlphaBounds"] if "minimumPaddingPixels" in layer),
        }
    evidence["decodedRgbaBytes"] = sum(sheet["decodedRgbaBytes"] for sheet in evidence["sheets"])
    evidence["compressedBytes"] = sum(sheet["bytes"] for sheet in evidence["sheets"])
    save_json(output/"manifest.json", manifest)
    save_json(output/"provenance.json", {
        "sourceRepository": "edmundwhittaker-tech/Virelden", "sourceCommit": COMMIT,
        "sourceRoot": "src/assets/enemies-v1", "sourceFiles": source_files,
        "operation": "Static offline composition of supplied complete-body poses. Skeletons retain their recorded equipment and hands layers; the iron giant uses only the original body cell, without equipment or hands overlays.",
        "layerSelection": {"maw_skeleton": ["body", "axe", "hands-overlay"],
                           "headless_skeleton": ["body", "two-knives", "hands-overlay"],
                           "iron_giant": ["body"]},
        "generatedArtwork": False, "runtimeAssembly": False,
        "outputFrameSize": list(CELL), "sourceBodyOffset": list(OFFSET), "fixedFoot": FOOT,
        "preClippingAlphaValidation": {"method": "Transform all four source-alpha-bbox corners before creating the destination canvas; separately translate body/hands crop alpha bounds. Assert every conservative layer bound has at least two pixels of export padding.",
                                       "byEnemy": preclip_summary,
                                       "detailedAudit": "qa-local/enemy-bake/pixel-evidence.json, sheets[].frames[].preClippingLayerAlphaBounds"},
        "tool": "tools/art/bake-complete-enemies.py", "resampling": "Pillow bicubic premultiplied RGBA for equipment transforms only; body/hands copied without resizing.",
        "limits": manifest["limitations"],
    })
    save_json(review/"pixel-evidence.json", evidence)
    print(json.dumps({key:evidence[key] for key in ("validatedFrames", "decodedRgbaBytes", "compressedBytes")}))

if __name__ == "__main__":
    main()
