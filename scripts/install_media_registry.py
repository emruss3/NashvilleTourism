from pathlib import Path

root = Path(__file__).resolve().parents[1]
gen = (root / "NashvilleTourism-media-repository/integration/media-library.generated.ts").read_text(
    encoding="utf-8"
)
lines = gen.splitlines()
while lines and lines[0].startswith("//"):
    lines.pop(0)
body = "\n".join(lines).strip() + "\n"

preamble = r'''/**
 * Media system.
 *
 * Real photography and video are referenced here by a stable key. Components
 * never hardcode a path. Drop the licensed files into `public/media/` using the
 * filenames below and every surface that uses the key picks them up.
 *
 * Until a file exists, `SmartImage` renders a typographic fallback rather than
 * a broken image or a stock photo that misrepresents a specific business.
 * See `public/media/README.md` and `docs/media/MEDIA-MAP.md`.
 */

export interface MediaAsset {
  /** Path under /public. */
  src: string;
  /** Required alt text. Describes the photo, not the page. */
  alt: string;
  /** Photographer or agency. Displayed where the licence requires it. */
  credit?: string;
  /** Licence note kept for the record, e.g. "Unsplash Licence", "Licensed 2026". */
  licence?: string;
  /** Intrinsic size, used to reserve layout space and avoid CLS. */
  width: number;
  height: number;
  /** Tiny blurred placeholder (data URI) if one has been generated. */
  blurDataURL?: string;
  /** Focal point for art direction on tight crops. */
  focal?: 'center' | 'top' | 'bottom';
}

/**
 * Hero video. A short, muted, looping clip. Keep it under ~4 MB and provide
 * both formats; browsers pick the first they can play.
 */
export interface VideoAsset {
  webm?: string;
  mp4?: string;
  /** Still frame shown before the video loads, and to anyone who prefers reduced motion. */
  poster?: string;
  alt: string;
  credit?: string;
  licence?: string;
}

'''

footer = '''
export function getImage(key: ImageKey | undefined): MediaAsset | undefined {
  return key ? images[key] : undefined;
}

export function hasMedia(key: string): boolean {
  return AVAILABLE_MEDIA.has(key);
}
'''

out = root / "src/lib/media.ts"
out.write_text(preamble + body + footer, encoding="utf-8", newline="\n")
text = out.read_text(encoding="utf-8")
assert "neighborhood/sylvan-park" not in text.split("AVAILABLE_MEDIA")[1]
assert "nashville-hero-poster.jpg" in text
assert "/media/hero/nashville-hero.mp4" in text
print(f"wrote {out} ({out.stat().st_size} bytes)")
