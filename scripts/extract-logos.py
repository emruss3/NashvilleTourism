"""Crop logo variants from the brand logo sheet and knock out the black background."""

from pathlib import Path

from PIL import Image

SRC = Path(__file__).resolve().parents[1] / "public" / "brand" / "nashville-logo-sheet.png"
OUT = Path(__file__).resolve().parents[1] / "public" / "brand"


def knock_black(img: Image.Image, threshold: int = 40) -> Image.Image:
    t = img.convert("RGBA")
    px = t.load()
    for y in range(t.size[1]):
        for x in range(t.size[0]):
            r, g, b, a = px[x, y]
            if r <= threshold and g <= threshold and b <= threshold:
                px[x, y] = (0, 0, 0, 0)
            elif r < threshold + 25 and g < threshold + 25 and b < threshold + 25:
                alpha = max(0, min(255, int((max(r, g, b) - threshold) * (255 / 25))))
                px[x, y] = (r, g, b, alpha)
    return t


def content_bbox(img: Image.Image, threshold: int = 35):
    px = img.load()
    w, h = img.size
    minx, miny, maxx, maxy = w, h, 0, 0
    found = False
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if max(r, g, b) > threshold:
                found = True
                minx = min(minx, x)
                miny = min(miny, y)
                maxx = max(maxx, x)
                maxy = max(maxy, y)
    if not found:
        return (0, 0, w, h)
    return (minx, miny, maxx + 1, maxy + 1)


def extract(name: str, box, pad: int = 12):
    crop = im.crop(box)
    x0, y0, x1, y1 = content_bbox(crop)
    tight = crop.crop(
        (
            max(0, x0 - pad),
            max(0, y0 - pad),
            min(crop.size[0], x1 + pad),
            min(crop.size[1], y1 + pad),
        )
    )
    out = knock_black(tight)
    # 2× for crisp retina display
    out2 = out.resize((out.width * 2, out.height * 2), Image.Resampling.LANCZOS)
    path = OUT / f"{name}.png"
    out2.save(path, optimize=True)
    print(f"{name}: {out.size} -> {out2.size} ({path.name})")
    return out2


im = Image.open(SRC).convert("RGBA")
w, h = im.size
print("sheet", w, h)
mid_x, mid_y = w // 2, h // 2

quads = {
    "lockup-horizontal": (0, 0, mid_x, mid_y),
    "lockup-stacked": (mid_x, 0, w, mid_y),
    "wordmark": (0, mid_y, mid_x, h),
    "nsh": (mid_x, mid_y, int(mid_x + (w - mid_x) * 0.62), h),
}

for name, box in quads.items():
    extract(name, box)

star_box = (
    int(mid_x + (w - mid_x) * 0.72),
    int(mid_y + h * 0.08),
    w - 20,
    h - 20,
)
extract("star", star_box, pad=8)
print("done")
