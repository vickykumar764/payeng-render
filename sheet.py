#!/usr/bin/env python3
"""Contact sheet: python3 sheet.py <dir> <out.jpg> [cols] -> labelled thumbnails of every jpg in dir."""
import sys, os, glob
from PIL import Image, ImageDraw
d, out = sys.argv[1], sys.argv[2]
cols = int(sys.argv[3]) if len(sys.argv) > 3 else 6
files = sorted(glob.glob(os.path.join(d, "*.jpg")))
tw, th = 270, 480
rows = (len(files) + cols - 1) // cols
sheet = Image.new("RGB", (cols * tw, rows * (th + 22)), (20, 20, 24))
dr = ImageDraw.Draw(sheet)
for i, f in enumerate(files):
    im = Image.open(f).convert("RGB").resize((tw, th), Image.LANCZOS)
    x, y = (i % cols) * tw, (i // cols) * (th + 22)
    sheet.paste(im, (x, y + 22))
    dr.text((x + 6, y + 4), os.path.basename(f)[:-4], fill=(240, 240, 240))
sheet.save(out, quality=88)
print("wrote", out, len(files))
