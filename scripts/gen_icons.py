"""Generate PWA icons PNG (192, 512, apple 180) mirip favicon.svg."""
from PIL import Image, ImageDraw

S = 1024
img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
d = ImageDraw.Draw(img)

# bg rounded square #034BB9
d.rounded_rectangle([0, 0, S, S], radius=224, fill="#034BB9")

# rumah putih (skala 16x dari viewBox 64)
pts = [(32,14),(50,30),(45,30),(45,48),(37,48),(37,38),(27,38),(27,48),(19,48),(19,30),(14,30)]
house = [(x*16, y*16) for x, y in pts]
d.polygon(house, fill="#ffffff")

# titik kuning
cx, cy, r = 32*16, 34*16, 4*16
d.ellipse([cx-r, cy-r, cx+r, cy+r], fill="#FBBF24")

def save(name, size):
    img.resize((size, size), Image.Resampling.LANCZOS).save(name, "PNG")

out = "public/icons"
save(f"{out}/app-192.png", 192)
save(f"{out}/app-512.png", 512)
save(f"{out}/apple-touch-icon.png", 180)
print("ok icons generated", flush=True)