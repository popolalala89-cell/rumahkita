#!/usr/bin/env python3
"""Olah logo RumahKita: ikon app dari Logo2 (rumah+hati), banner OG dari Logo1 (3 rumah)."""
from PIL import Image
import os

HERE = os.path.dirname(os.path.abspath(__file__))
PUBLIC = os.path.normpath(os.path.join(HERE, '..', 'public'))
TMP = os.path.join(HERE, '..', '.tmp_assets')

def is_white(r, g, b):
    return r >= 238 and g >= 238 and b >= 238

def trim_bbox(path):
    im = Image.open(path).convert('RGBA')
    data = im.load(); w, h = im.size; xs, ys = [], []
    for y in range(0, h, 2):
        for x in range(0, w, 2):
            r, g, b, a = data[x, y]
            if a > 30 and not is_white(r, g, b):
                xs.append(x); ys.append(y)
    if not xs:
        return im
    box = (max(0, min(xs)), max(0, min(ys)), min(w, max(xs)), min(h, max(ys)))
    return im.crop(box)

def to_icon(src, size, bg=(255, 255, 255), pad_ratio=0.06):
    im = trim_bbox(src).convert('RGBA')
    pad = int(size * pad_ratio)
    avail = size - 2 * pad
    im.thumbnail((avail, avail), Image.LANCZOS)
    canvas = Image.new('RGB', (size, size), bg)
    canvas.paste(im, ((size - im.width)//2, (size - im.height)//2), im)
    return canvas

ICONS = [
    ('logo2_icon.png', 'app-192.png', 192),
    ('logo2_icon.png', 'app-512.png', 512),
    ('logo2_icon.png', 'apple-touch-icon.png', 180),
    ('logo2_icon.png', 'favicon.png', 96),
]
icons_dir = os.path.join(PUBLIC, 'icons')
os.makedirs(icons_dir, exist_ok=True)
for src, name, size in ICONS:
    out = os.path.join(icons_dir, name)
    to_icon(os.path.join(TMP, src), size).save(out, optimize=True)
    print('ikon %s -> %d pixels -> %s (%d bytes)' % (name, size, os.path.relpath(out, PUBLIC), os.path.getsize(out)))

# Banner OG 1200x630 dari Logo1
im = trim_bbox(os.path.join(TMP, 'logo1_banner.png')).convert('RGBA')
W, H = 1200, 630
im.thumbnail((int(W*0.72), int(H*0.6)), Image.LANCZOS)
canvas = Image.new('RGB', (W, H), (255, 255, 255))
canvas.paste(im, ((W - im.width)//2, (H - im.height)//2), im)
ban = os.path.join(PUBLIC, 'og-cover.png')
canvas.save(ban, optimize=True)
print('OK banner -> %s (%d x %d, %d bytes)' % (ban, W, H, os.path.getsize(ban)))